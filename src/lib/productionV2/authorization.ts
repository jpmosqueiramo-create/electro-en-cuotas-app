import {loopAnnexFields} from './loopAnnexFields';
import {validateContractCommercial} from '../contractCommercialPreparation';
import { originalFormalFields, originalFormalParameters, usesClientPaymentAddress } from './originalBindings';
import { assertPaymentAddressConformity, contractPaymentAddress } from '../contractPaymentAddress';
import type { ContractDraftV2 } from '../contractV2';
import { assertFinalRenderer } from './pdf';
import { argentinaBusinessDate, ISSUE_DATE_POLICY, ISSUE_DATE_TIME_ZONE } from './businessDate';
import type { Transaction } from 'firebase-admin/firestore';
import {assertLoopContractForIssuance} from '../loopContractIssuance';
import {clientTermsDigest} from '../contractV2Server';
import { exact, opaque, calendarDate } from '../contractV2';
import { contractValueHash } from '../contractIntegrityV2';
import { contractRefs } from '../contractV2Server';
import { legalRegistryRef } from '../legalApprovalV2Server';
import { contractLegalEntity } from '../contractDocuments/legalEntity';
import { validateContractLegalContext, type ContractLegalContextV2 } from '../contractSnapshotV2';
import { exactPackage, requireProductionActor, runtimeData, type ProductionRuntime } from './runtime';
import { readySource } from './source';
import { issuedDocumentKinds, type FinalPackage } from './catalog';
export const productionRef = (db: FirebaseFirestore.Firestore, id: string, v: number) => contractRefs(db, id, v).draft.collection('production').doc('current');
export const packageApprovalRef = (db: FirebaseFirestore.Firestore, id: string) => legalRegistryRef(db).collection('finalPackageApprovals').doc(opaque(id));
export const scopes = ['ISSUANCE', 'DELIVERY', 'FINANCE', 'CLIENT_ACTIVATION'] as const;
export type ProductionScope = typeof scopes[number];
export interface OperationAuthorization {
    schemaVersion: 'PRODUCTION_OPERATION_AUTHORIZATION_V1';
    id: string;
    operationId: string;
    budgetId: string;
    version: number;
    readyRevision: number;
    packageId: string;
    packageHash: string;
    approvalId: string;
    approvalHash: string;
    sourceHash: string;
    scopes: ProductionScope[];
    legalContext: ContractLegalContextV2;
    reason: string;
    actor: string;
    at: string;
    expiresAt: string;
    digest: string;
    hash: string;
}
const text = (x: unknown, max = 500) => { if (typeof x !== 'string' || !x.trim() || x.length > max || /[\x00-\x1f\x7f]/.test(x))
    throw Error('PRODUCTION_TEXT_REQUIRED'); return x.trim(); };
export async function recordFinalPackageApproval(runtime: ProductionRuntime, input: unknown, actor: string) {
    const { db } = await requireProductionActor(runtime, actor);
    const owner = !!input && typeof input === 'object' && (input as Record<string, unknown>).approvalBasis === 'OWNER_AUTHORIZATION';
    const c = exact(input, owner ? ['commandId', 'packageId', 'packageHash', 'approvalBasis', 'reason', 'confirmed'] : ['commandId', 'packageId', 'packageHash', 'approvalDate', 'professional', 'validationReference', 'sourceReference', 'confirmed']);
    opaque(c.commandId);
    const p = exactPackage(runtime, opaque(c.packageId));
    assertFinalRenderer(p);
    if (c.packageHash !== p.sha256 || c.confirmed !== true)
        throw Error('EXACT_FINAL_PACKAGE_CONFIRMATION_REQUIRED');
    if (!owner) {
        calendarDate(c.approvalDate);
        if (String(c.approvalDate) > argentinaBusinessDate()) throw Error('APPROVAL_DATE_INVALID');
    }
    const evidence = owner ? { approvalBasis: 'OWNER_AUTHORIZATION', ownerAcknowledged: true, reason: text(c.reason) } : { professional: text(c.professional), validationReference: text(c.validationReference), sourceReference: text(c.sourceReference) };
    const requestDigest = contractValueHash({ actor, input: c });
    const data = { packageId: p.id, packageHash: p.sha256, templateHashes: Object.fromEntries(issuedDocumentKinds(p).map(k => [k, p.templates[k].sha256])), rendererHash: p.rendererHash, resourcesHash: p.resourcesHash,
        approvalDate: owner ? argentinaBusinessDate() : String(c.approvalDate), ...evidence, actor, ...(owner ? { requestDigest } : {}) };
    const digest = contractValueHash(data), ref = packageApprovalRef(db, String(c.commandId));
    return db.runTransaction(async (tx) => {
        const prior = await tx.get(ref);
        if (prior.exists) {
            const previous = prior.data()!;
            if (owner ? previous.schemaVersion !== 'EXACT_OWNER_PACKAGE_APPROVAL_V2' || previous.requestDigest !== requestDigest : previous.schemaVersion !== 'EXACT_FINAL_PACKAGE_APPROVAL_V1' || previous.digest !== digest)
                throw Error('PRODUCTION_COMMAND_CONFLICT');
            return { id: ref.id, replay: true };
        }
        tx.create(ref, { schemaVersion: owner ? 'EXACT_OWNER_PACKAGE_APPROVAL_V2' : 'EXACT_FINAL_PACKAGE_APPROVAL_V1', status: owner ? 'OWNER_AUTHORIZED' : 'PROFESSIONAL_VERSION_IDENTIFIED', ...data, digest, at: new Date().toISOString() });
        return { id: ref.id, replay: false };
    });
}

export async function approvedPackage(runtime: ProductionRuntime, tx: Transaction, packageId: string, approvalId: string, forWrite = true) {
    const { db, test } = runtimeData(runtime), p = exactPackage(runtime, packageId), saved = await tx.get(packageApprovalRef(db, approvalId)), a = saved.data();
    const professional = a?.schemaVersion === 'EXACT_FINAL_PACKAGE_APPROVAL_V1' && a.status === 'PROFESSIONAL_VERSION_IDENTIFIED' && !!a.professional && !!a.validationReference && !!a.sourceReference;
    const owner = a?.schemaVersion === 'EXACT_OWNER_PACKAGE_APPROVAL_V2' && a.status === 'OWNER_AUTHORIZED' && a.approvalBasis === 'OWNER_AUTHORIZATION' && a.ownerAcknowledged === true && typeof a.reason === 'string' && !!a.reason.trim() && /^[a-f0-9]{64}$/.test(a.requestDigest) && !('professional' in a) && !('validationReference' in a) && !('sourceReference' in a);
    if (!a || (!professional && !owner) || a.packageId !== p.id || a.packageHash !== p.sha256 || a.rendererHash !== p.rendererHash || a.resourcesHash !== p.resourcesHash || !a.actor || !a.at || issuedDocumentKinds(p).some(k => a.templateHashes?.[k] !== p.templates[k].sha256))
        throw Error('EXACT_FINAL_PACKAGE_APPROVAL_REQUIRED');
    // Historical proofs verify the installed immutable package and persisted hashes.
    // They never rerender bytes or require the current renderer. New issuance does.
    const { schemaVersion: _, status: __, at: ___, digest, ...payload } = a;
    void _;
    void __;
    void ___;
    if (digest !== contractValueHash(payload))
        throw Error('FINAL_APPROVAL_INTEGRITY');
    calendarDate(a.approvalDate);
    if (!test && (p.issuer.legalName !== contractLegalEntity.legalName || p.issuer.taxId !== contractLegalEntity.taxId || p.issuer.legalAddress !== contractLegalEntity.legalAddress || p.issuer.tradeName !== contractLegalEntity.tradeName))
        throw Error('LEGAL_ENTITY_MISMATCH');
    const revoked = await tx.get(packageApprovalRef(db, approvalId).collection('revocations').doc('current'));
    if (forWrite && revoked.exists)
        throw Error('FINAL_PACKAGE_APPROVAL_REVOKED');
    return { package: p, approval: a, approvalHash: contractValueHash(a) };
}
export function legalContext(p: FinalPackage, approvalId: string, formal: unknown, draft: ContractDraftV2) {
    const f = exact(formal, ['contractIssueDate', 'contractIssuePlace', 'promissoryNoteIssueDate', 'promissoryNoteIssuePlace', ...(p.originalsPolicy ? originalFormalFields : []),...(p.templates.MANDATE.layout==='LOOP_CONSOLIDATED_V2'?['loopConformityEvidence']:[])]);
    calendarDate(f.contractIssueDate);
    calendarDate(f.promissoryNoteIssueDate);
    const originalParams = originalFormalParameters(p, Object.fromEntries(originalFormalFields.map(k=>[k,f[k]])), draft.economicTerms!.contractTotal, draft.paymentScheduleDraft);
    if (usesClientPaymentAddress(p.templates.PAGARE)) originalParams.notePaymentAddressHash = contractPaymentAddress(draft.personalData).hash;
    const commercial=draft.commercialPreparation?validateContractCommercial(draft.commercialPreparation,draft.economicTerms!):undefined;
    if(commercial&&p.originalsPolicy&&(Number(f.originalNetManagementLogistics)!==(commercial.capitalCents+commercial.serviceGrossCents)/100||Number(f.originalCft)!==commercial.financeGrossCents/100))throw Error('CONTRACT_COMMERCIAL_INTEGRITY');
    const loop=p.templates.MANDATE.layout==='LOOP_CONSOLIDATED_V2'?assertLoopContractForIssuance(draft):null;
    const def = (kind: 'MANDATE' | 'PAGARE') => ({ templateId: p.templates[kind].id, templateVersion: p.templates[kind].version, templateHash: p.templates[kind].sha256, rendererBundleId: p.id, rendererBundleHash: p.rendererHash, resourcesManifestHash: p.resourcesHash, legalApprovalId: approvalId });
    const value = { issuer: p.issuer, documentContext: { policyVersion: 'PRODUCTION_FORMAL_CONTEXT_V1', contractIssueDate: String(f.contractIssueDate), contractIssuePlace: text(f.contractIssuePlace), promissoryNoteIssueDate: String(f.promissoryNoteIssueDate), promissoryNoteIssuePlace: text(f.promissoryNoteIssuePlace), parameterSchemaId: p.id, parameters: { ...originalParams, ...(loop?{loopClientTermsDigest:clientTermsDigest(draft),loopConformityEvidence:text(f.loopConformityEvidence)}:{}), ...(commercial?{commercialPreparationJson:JSON.stringify(commercial)}:{}), jurisdiction: p.jurisdiction, issuanceDatePolicy: ISSUE_DATE_POLICY, issuanceTimeZone: ISSUE_DATE_TIME_ZONE } }, documentDefinitions: { contract: def('MANDATE'), promissoryNote: def('PAGARE') } };
    validateContractLegalContext(value);
    return value;
}
export async function authorizeOperation(runtime: ProductionRuntime, id: string, v: number, input: unknown, actor: string) {
    const { db } = await requireProductionActor(runtime, actor), c = exact(input, ['commandId', 'operationId', 'expectedRevision', 'packageId', 'approvalId', 'formal', 'scopes', 'expiresAt', 'reason', 'confirmed']);
    const commandId = opaque(c.commandId);
    opaque(c.packageId);
    opaque(c.approvalId);
    if (c.confirmed !== true || !Number.isSafeInteger(c.expectedRevision) || !Array.isArray(c.scopes) || !c.scopes.length || new Set(c.scopes).size !== c.scopes.length || c.scopes.some(s => !scopes.includes(s)) || !c.scopes.includes('ISSUANCE'))
        throw Error('EXPLICIT_OPERATION_AUTHORIZATION_REQUIRED');
    const reason = text(c.reason), expiresAt = String(c.expiresAt);
    if (!Number.isFinite(Date.parse(expiresAt)) || new Date(expiresAt).toISOString() !== expiresAt)
        throw Error('AUTHORIZATION_EXPIRY_REQUIRED');
    const digest = contractValueHash({ actor, id, v, input: c }), ref = productionRef(db, id, v).collection('authorizations').doc(commandId);
    return db.runTransaction(async (tx) => {
        const old = await tx.get(ref);
        if (old.exists) {
            if (old.data()!.digest !== digest)
                throw Error('PRODUCTION_COMMAND_CONFLICT');
            return { id: ref.id, hash: old.data()!.hash as string, replay: true };
        }
        if (Date.parse(expiresAt) <= Date.now() || Date.parse(expiresAt) > Date.now() + 30 * 86400000)
            throw Error('AUTHORIZATION_EXPIRY_INVALID');
        const source = await readySource(db, tx, id, v, Number(c.expectedRevision));
        if (c.operationId !== source.identity.operationId)
            throw Error('PRODUCTION_OPERATION_MISMATCH');
        const approved = await approvedPackage(runtime, tx, String(c.packageId), String(c.approvalId));
        assertFinalRenderer(approved.package);
        if (usesClientPaymentAddress(approved.package.templates.PAGARE)) assertPaymentAddressConformity(source.draft.personalData, source.consent);
        const context=legalContext(approved.package,String(c.approvalId),c.formal,source.draft);
        if(approved.package.templates.MANDATE.layout==='LOOP_CONSOLIDATED_V2')Object.assign(context.documentContext.parameters,await loopAnnexFields(db,tx,id,v,source.identity.operationId,source.draft,source.consent));
        const at = new Date().toISOString(), authorization = { schemaVersion: 'PRODUCTION_OPERATION_AUTHORIZATION_V1' as const, id: commandId, operationId: source.identity.operationId, budgetId: id, version: v, readyRevision: Number(c.expectedRevision), packageId: approved.package.id, packageHash: approved.package.sha256, approvalId: String(c.approvalId), approvalHash: approved.approvalHash, sourceHash: source.sourceHash, scopes: [...(c.scopes as ProductionScope[])].sort() as ProductionScope[], legalContext: context, reason, actor, at, expiresAt, digest };
        const hash = contractValueHash(authorization);
        tx.create(ref, { ...authorization, hash });
        return { id: commandId, hash, replay: false };
    });
}
export async function authorization(runtime: ProductionRuntime, tx: Transaction, id: string, v: number, authorizationId: string, scope: ProductionScope, forWrite = true) {
    const { db } = runtimeData(runtime), ref = productionRef(db, id, v).collection('authorizations').doc(opaque(authorizationId));
    const [saved, revoked] = await Promise.all([tx.get(ref), tx.get(ref.collection('revocations').doc('current'))]);
    const a = saved.data() as OperationAuthorization | undefined;
    if (!a || a.schemaVersion !== 'PRODUCTION_OPERATION_AUTHORIZATION_V1' || a.id !== authorizationId || a.budgetId !== id || a.version !== v)
        throw Error('OPERATION_AUTHORIZATION_REQUIRED');
    const { hash, ...body } = a;
    if (hash !== contractValueHash(body) || !a.scopes.includes(scope))
        throw Error('OPERATION_AUTHORIZATION_INCONSISTENT');
    if (forWrite && (revoked.exists || scope === 'ISSUANCE' && Date.parse(a.expiresAt) <= Date.now()))
        throw Error('OPERATION_AUTHORIZATION_EXPIRED_OR_REVOKED');
    const approved = await approvedPackage(runtime, tx, a.packageId, a.approvalId, forWrite);
    if (a.packageHash !== approved.package.sha256 || a.approvalHash !== approved.approvalHash)
        throw Error('OPERATION_APPROVAL_CHANGED');
    return { authorization: a, ...approved };
}
export async function revokeAuthorization(runtime: ProductionRuntime, id: string, v: number, input: unknown, actor: string) {
    const { db } = await requireProductionActor(runtime, actor), c = exact(input, ['authorizationId', 'commandId', 'reason']);
    opaque(c.authorizationId);
    opaque(c.commandId);
    const reason = text(c.reason), digest = contractValueHash({ actor, input: c });
    const ref = productionRef(db, id, v).collection('authorizations').doc(String(c.authorizationId));
    return db.runTransaction(async (tx) => { const [a, prior] = await Promise.all([tx.get(ref), tx.get(ref.collection('revocations').doc('current'))]); if (!a.exists)
        throw Error('OPERATION_AUTHORIZATION_REQUIRED'); if (prior.exists) {
        if (prior.data()!.digest !== digest)
            throw Error('PRODUCTION_COMMAND_CONFLICT');
        return { replay: true };
    } tx.create(ref.collection('revocations').doc('current'), { commandId: c.commandId, reason, actor, at: new Date().toISOString(), digest }); return { replay: false }; });
}
