import { FieldPath, type CollectionReference } from 'firebase-admin/firestore';
import { opaque } from '../contractV2';
import { isAdminEmail } from '../adminIdentity';
import { argentinaBusinessDate, ISSUE_DATE_TIME_ZONE } from './businessDate';
import type { IssuanceRecovery } from './issuanceRecovery';
import { contractRefs } from '../contractV2Server';
import { operationFromAcceptance, operationRef, verifyOperation } from '../operationV2';
import type { BudgetAcceptanceV2 } from '../budgetAcceptanceV2';
import { legalRegistryRef } from '../legalApprovalV2Server';
import { runtimeData, type ProductionRuntime } from './runtime';
import { productionRef, approvedPackage, type OperationAuthorization } from './authorization';
import { readySource } from './source';
import { productionPaths, frozenOperation } from './freeze';
import { issuedOperation } from './documents';
export const productionHistoryKeys = ['approvalAfter', 'authorizationAfter', 'recoveryAfter'] as const;
export type ProductionHistoryPage = Partial<Record<typeof productionHistoryKeys[number], string>>;
function pageQuery(ref: CollectionReference, after?: string) {
    const q = ref.orderBy(FieldPath.documentId()).limit(21);
    return after ? q.startAfter(opaque(after)) : q;
}
export async function productionOverview(runtime: ProductionRuntime, id: string, v: number, actor: string, page: ProductionHistoryPage = {}) {
    if (Object.keys(page).some(k => !productionHistoryKeys.includes(k as typeof productionHistoryKeys[number]))) throw Error('INVALID_HISTORY_PAGE');
    for (const cursor of Object.values(page)) opaque(cursor);
    const { db, test, administrators, packages, auth } = runtimeData(runtime), user = await auth.getUser(actor);
    if (user.disabled || !user.emailVerified || !isAdminEmail(user.email)) throw Error('PRODUCTION_ADMIN_REQUIRED');
    const administratorAuthorized = !user.disabled && user.emailVerified && administrators.includes(actor), deploymentEnabled = test || process.env.PRODUCTION_OPERATIONS_ENABLED === 'true';
    return db.runTransaction(async (tx) => {
        const r = contractRefs(db, id, v), ref = productionRef(db, id, v);
        const [ds, ac, op, counter, approvals, grants, docs, recoveries] = await Promise.all([tx.get(r.draft), tx.get(r.acceptance), tx.get(operationRef(db, id, v)), tx.get(db.doc(productionPaths.counter)), tx.get(pageQuery(legalRegistryRef(db).collection('finalPackageApprovals'), page.approvalAfter)), tx.get(pageQuery(ref.collection('authorizations'), page.authorizationAfter)), tx.get(ref.collection('documents').doc('issued')), tx.get(pageQuery(ref.collection('issuanceRecoveries'), page.recoveryAfter))]);
        if (!ac.exists || !op.exists)
            throw Error('PRODUCTION_ORIGIN_REQUIRED');
        const identity = operationFromAcceptance(ac.data() as BudgetAcceptanceV2);
        verifyOperation(op.data(), identity);
        let readyValid = false;
        const blockers: string[] = [];
        if (ds.data()?.status === 'READY_TO_FORMALIZE') {
            try {
                await readySource(db, tx, id, v, Number(ds.data()!.revision));
                readyValid = true;
            }
            catch {
                blockers.push('Revisar identidad, crédito, conformidad y evidencia READY vigentes.');
            }
        }
        else if (!ds.data()?.productionFreeze)
            blockers.push('Completar y confirmar la revisión contractual READY.');
        if (!packages.length)
            blockers.push('Falta instalar la versión final del mandato, pagaré y remito aprobada por hash. La declaración sobre los originales no aprueba una plantilla derivada.');
        const validApprovals: {
            id: string;
            packageId: string;
            at: string;
        }[] = [];
        const approvalHistory = [];
        for (const a of approvals.docs.slice(0, 20)) {
            let valid = false;
            try {
                await approvedPackage(runtime, tx, a.data().packageId, a.id);
                valid = true;
                validApprovals.push({ id: a.id, packageId: a.data().packageId, at: a.data().at });
            }
            catch { /* Unrelated, revoked and stale approvals never authorize a package. */ }
            approvalHistory.push({ id: a.id, packageId: String(a.data().packageId ?? ''), at: String(a.data().at ?? ''), valid });
        }
        if (!validApprovals.length)
            blockers.push('No hay aprobaciones vigentes en esta página del historial. Revisá las otras páginas o registrá la aprobación exacta faltante.');
        const counterReady = counter.data()?.executionMode === 'PRODUCTION' && counter.data()?.active === true && !!counter.data()?.initializationAuthorizationReference;
        if (!counterReady)
            blockers.push('La numeración requiere inicialización expresamente autorizada después de inventariar los números existentes.');
        if (!administratorAuthorized)
            blockers.push('La cuenta administrativa no está habilitada expresamente para operaciones reales.');
        if (!deploymentEnabled)
            blockers.push('La ejecución productiva permanece deshabilitada por configuración del servidor.');
        const authorizations = [];
        for (const g of grants.docs.slice(0, 20)) {
            const a = g.data() as OperationAuthorization, revoked = await tx.get(g.ref.collection('revocations').doc('current'));
            authorizations.push({ id: g.id, hash: a.hash, at: a.at, expiresAt: a.expiresAt, scopes: a.scopes, readyRevision: a.readyRevision, revoked: revoked.exists, available: !revoked.exists && Date.parse(a.expiresAt) > Date.now() && a.readyRevision === ds.data()?.revision });
        }
        let frozen: null | {
            contractNumber: string;
            snapshotHash: string;
            authorizationId: string;
            issuanceExpired: boolean;
            issuanceRevoked: boolean;
            issueDate: string;
        } = null, issued: null | {
            hash: string;
            documents: {
                kind: string;
                templateVersion: string;
            }[];
        } = null;
        if (ds.data()?.productionFreeze) {
            const proof = await frozenOperation(runtime, tx, id, v, 'ISSUANCE', false);
            frozen = { contractNumber: proof.snapshot.contractNumber, snapshotHash: proof.snapshot.integrity.payloadHash, authorizationId: proof.authorization.id, issuanceExpired: Date.parse(proof.authorization.expiresAt) <= Date.now(),
                issuanceRevoked: (await tx.get(ref.collection('authorizations').doc(proof.authorization.id).collection('revocations').doc('current'))).exists,
                issueDate: proof.snapshot.documentContext.contractIssueDate };
            if (docs.exists) {
                const d = await issuedOperation(runtime, tx, id, v, 'ISSUANCE', false);
                issued = { hash: d.manifest.hash, documents: Object.values(d.manifest.documents).map(doc => ({ kind: doc.kind, templateVersion: doc.templateVersion })) };
            }
        }
        const recoveryAuthorizations = [];
        for (const g of recoveries.docs.slice(0, 20)) {
            const a = g.data() as IssuanceRecovery, revoked = await tx.get(g.ref.collection('revocations').doc('current'));
            recoveryAuthorizations.push({ id: g.id, at: a.at, expiresAt: a.expiresAt, snapshotHash: a.snapshotHash, revoked: revoked.exists,
                available: !revoked.exists && Date.parse(a.expiresAt) > Date.now() && a.snapshotHash === frozen?.snapshotHash && !frozen?.issuanceRevoked && !issued });
        }
        const cursor = (s: typeof approvals) => s.size > 20 ? s.docs[19].id : null;
        const pagination = { approvalAfter: cursor(approvals), authorizationAfter: cursor(grants), recoveryAfter: cursor(recoveries) };
        return { approvalHistory, recoveryAuthorizations, pagination, issueDate: argentinaBusinessDate(), issueTimeZone: ISSUE_DATE_TIME_ZONE, operationId: identity.operationId, revision: ds.data()?.revision ?? 0, administratorAuthorized, deploymentEnabled, test, counterReady, readyValid, blockers, packages: packages.map(p => ({ id: p.id, version: p.version, hash: p.sha256, templates: Object.values(p.templates).map(t => ({ kind: t.kind, title: t.title, version: t.version, hash: t.sha256 })) })), approvals: validApprovals, authorizations, frozen, issued, arcaEnabled: false as const };
    });
}
export type ProductionOverview = Awaited<ReturnType<typeof productionOverview>>;
