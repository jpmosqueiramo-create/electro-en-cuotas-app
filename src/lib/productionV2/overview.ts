import { contractRefs } from '../contractV2Server';
import { operationFromAcceptance, operationRef, verifyOperation } from '../operationV2';
import type { BudgetAcceptanceV2 } from '../budgetAcceptanceV2';
import { legalRegistryRef } from '../legalApprovalV2Server';
import { runtimeData, type ProductionRuntime } from './runtime';
import { productionRef, approvedPackage, type OperationAuthorization } from './authorization';
import { readySource } from './source';
import { productionPaths, frozenOperation } from './freeze';
import { issuedOperation } from './documents';
export async function productionOverview(runtime: ProductionRuntime, id: string, v: number, actor: string) {
    const { db, test, administrators, packages, auth } = runtimeData(runtime), user = await auth.getUser(actor);
    const administratorAuthorized = !user.disabled && user.emailVerified && administrators.includes(actor), deploymentEnabled = test || process.env.PRODUCTION_OPERATIONS_ENABLED === 'true';
    return db.runTransaction(async (tx) => {
        const r = contractRefs(db, id, v), ref = productionRef(db, id, v);
        const [ds, ac, op, counter, approvals, grants, docs] = await Promise.all([tx.get(r.draft), tx.get(r.acceptance), tx.get(operationRef(db, id, v)), tx.get(db.doc(productionPaths.counter)), tx.get(legalRegistryRef(db).collection('finalPackageApprovals').limit(50)), tx.get(ref.collection('authorizations').orderBy('at', 'desc').limit(20)), tx.get(ref.collection('documents').doc('issued'))]);
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
        for (const a of approvals.docs) {
            try {
                await approvedPackage(runtime, tx, a.data().packageId, a.id);
                validApprovals.push({ id: a.id, packageId: a.data().packageId, at: a.data().at });
            }
            catch { /* Unrelated, revoked and stale approvals never authorize a package. */ }
        }
        if (!validApprovals.length)
            blockers.push('Falta registrar la aprobación profesional identificada del paquete final exacto.');
        const counterReady = counter.data()?.executionMode === 'PRODUCTION' && counter.data()?.active === true && !!counter.data()?.initializationAuthorizationReference;
        if (!counterReady)
            blockers.push('La numeración requiere inicialización expresamente autorizada después de inventariar los números existentes.');
        if (!administratorAuthorized)
            blockers.push('La cuenta administrativa no está habilitada expresamente para operaciones reales.');
        if (!deploymentEnabled)
            blockers.push('La ejecución productiva permanece deshabilitada por configuración del servidor.');
        const authorizations = [];
        for (const g of grants.docs) {
            const a = g.data() as OperationAuthorization, revoked = await tx.get(g.ref.collection('revocations').doc('current'));
            authorizations.push({ id: g.id, hash: a.hash, at: a.at, expiresAt: a.expiresAt, scopes: a.scopes, readyRevision: a.readyRevision, available: !revoked.exists && Date.parse(a.expiresAt) > Date.now() && a.readyRevision === ds.data()?.revision });
        }
        let frozen: null | {
            contractNumber: string;
            snapshotHash: string;
            authorizationId: string;
        } = null, issued: null | {
            hash: string;
            documents: {
                kind: string;
                templateVersion: string;
            }[];
        } = null;
        if (ds.data()?.productionFreeze) {
            const proof = await frozenOperation(runtime, tx, id, v, 'ISSUANCE', false);
            frozen = { contractNumber: proof.snapshot.contractNumber, snapshotHash: proof.snapshot.integrity.payloadHash, authorizationId: proof.authorization.id };
            if (docs.exists) {
                const d = await issuedOperation(runtime, tx, id, v, 'ISSUANCE', false);
                issued = { hash: d.manifest.hash, documents: Object.values(d.manifest.documents).map(doc => ({ kind: doc.kind, templateVersion: doc.templateVersion })) };
            }
        }
        return { operationId: identity.operationId, revision: ds.data()?.revision ?? 0, administratorAuthorized, deploymentEnabled, test, counterReady, readyValid, blockers, packages: packages.map(p => ({ id: p.id, version: p.version, hash: p.sha256, templates: Object.values(p.templates).map(t => ({ kind: t.kind, title: t.title, version: t.version, hash: t.sha256 })) })), approvals: validApprovals, authorizations, frozen, issued, arcaEnabled: false as const };
    });
}
export type ProductionOverview = Awaited<ReturnType<typeof productionOverview>>;
