import { renderFinalDocument } from './pdf';
import { assertCurrentIssueDates } from './businessDate';
import { issuedDocumentKinds, assertExternalProductionPackage } from './catalog';
import type { Transaction } from 'firebase-admin/firestore';
import { exact, opaque, type ContractDraftV2 } from '../contractV2';
import { contractRefs } from '../contractV2Server';
import { operationRef, verifyOperation, operationFromAcceptance, type OperationV2 } from '../operationV2';
import { contractValueHash } from '../contractIntegrityV2';
import { contractIdentity, contractOriginId, contractSnapshotId, contractNumber, validateSequence, validateContractSnapshot, sealContractSnapshot } from '../contractSnapshotV2';
import { PERSONAL_ADDRESS_VERSION, provinceLabel } from '../contractAddress';
import { verifyReadyEvidence, type ContractReadyEvidenceV1 } from '../contractReadyV2';
import type { BudgetV2 } from '../budgetV2';
import type { BudgetAcceptanceV2 } from '../budgetAcceptanceV2';
import { readySource } from './source';
import { authorization, productionRef, type ProductionScope } from './authorization';
import { requireProductionActor, runtimeData, type ProductionRuntime } from './runtime';
import type { FinalSnapshot } from './catalog';
export const productionPaths = { counter: 'contractNumberingV2/CONTRACT_NUMBERING_V1', numbers: 'contractNumbersV2', snapshots: 'contractSnapshotsV2', origins: 'contractOriginsV2', evidence: 'contractOriginEvidenceV2' } as const;
export interface FreezeReceipt {
    contractId: string;
    snapshotId: string;
    contractNumber: string;
    snapshotHash: string;
}
const contractKey = (i: OperationV2) => ({ budgetId: i.budgetId, budgetVersion: i.budgetVersion, contractDraftId: i.contractDraftId, acceptedOptionId: i.acceptedOptionId });
const same = (a: unknown, b: unknown) => { if (contractValueHash(a) !== contractValueHash(b))
    throw Error('PRODUCTION_FREEZE_INTEGRITY'); };
/** Read-only integrity proof shared by document/delivery/ledger adapters. No caller-supplied snapshot. */
export async function frozenOperation(runtime: ProductionRuntime, tx: Transaction, id: string, v: number, scope: ProductionScope, forWrite = true) {
    const { db } = runtimeData(runtime), r = contractRefs(db, id, v);
    const [ds, bs, ac, os] = await Promise.all([tx.get(r.draft), tx.get(r.budget), tx.get(r.acceptance), tx.get(operationRef(db, id, v))]);
    const d = ds.data(), a = ac.data() as BudgetAcceptanceV2 | undefined;
    if (!d || !a || !bs.exists || !os.exists || d.status !== 'TERMS_FROZEN' || d.emulatorFreeze || d.productionFreeze?.executionMode !== 'PRODUCTION')
        throw Error('PRODUCTION_SNAPSHOT_REQUIRED');
    const identity = operationFromAcceptance(a);
    verifyOperation(os.data(), identity);
    const receipt = d.productionFreeze.receipt as FreezeReceipt, ss = await tx.get(db.collection(productionPaths.snapshots).doc(opaque(receipt?.snapshotId)));
    const raw = ss.data();
    validateContractSnapshot(raw);
    if (raw.freeze.readinessPolicyVersion !== 'CONTRACT_PRODUCTION_APPROVAL_V1')
        throw Error('PRODUCTION_SNAPSHOT_REQUIRED');
    const snapshot = raw as FinalSnapshot;
    if (snapshot.sourceDraft.budgetId !== id || snapshot.sourceDraft.budgetVersion !== v || snapshot.sourceDraft.acceptedOptionId !== identity.acceptedOptionId || snapshot.sourceDraft.contractDraftId !== identity.contractDraftId || snapshot.contractSnapshotId !== contractSnapshotId(contractKey(identity)) || snapshot.contractId !== contractIdentity(contractKey(identity)) || d.revision !== snapshot.sourceDraft.revision + 1 || d.activeClientDataRequestId !== null)
        throw Error('PRODUCTION_SNAPSHOT_ORIGIN_MISMATCH');
    const grant = await authorization(runtime, tx, id, v, snapshot.freeze.authorizationId, scope, forWrite);
    if (grant.authorization.operationId !== identity.operationId || grant.authorization.hash !== snapshot.freeze.authorizationHash || grant.authorization.packageHash !== snapshot.freeze.legalPackageHash || grant.authorization.approvalHash !== snapshot.freeze.legalApprovalsHash)
        throw Error('PRODUCTION_AUTHORIZATION_MISMATCH');
    const [number, origin, evidence, ready, command] = await Promise.all([tx.get(db.collection(productionPaths.numbers).doc(snapshot.contractNumber)), tx.get(db.collection(productionPaths.origins).doc(contractOriginId(contractKey(identity)))), tx.get(db.collection(productionPaths.evidence).doc(snapshot.contractId)), tx.get(r.draft.collection('readyReviews').doc(snapshot.freeze.readyEvidenceId)), tx.get(productionRef(db, id, v).collection('freezeCommands').doc(snapshot.freeze.commandId))]);
    const expected = { contractId: snapshot.contractId, snapshotId: snapshot.contractSnapshotId, contractNumber: snapshot.contractNumber, snapshotHash: snapshot.integrity.payloadHash };
    for (const x of [receipt, number.data()?.receipt, origin.data()?.receipt, evidence.data()?.receipt, command.data()?.receipt])
        same(x ?? null, expected);
    same(snapshot.origin.budgetHash, contractValueHash(bs.data()));
    same(snapshot.origin.acceptanceHash, contractValueHash(a));
    const { productionFreeze: _meta, ...rest } = d;
    void _meta;
    const source = { ...rest, status: 'READY_TO_FORMALIZE', revision: snapshot.sourceDraft.revision, updatedAt: snapshot.freeze.readyAt, updatedBy: snapshot.freeze.readyBy } as ContractDraftV2;
    same(snapshot.origin.draftHash, contractValueHash(source));
    const e = ready.data() as ContractReadyEvidenceV1;
    verifyReadyEvidence(bs.data() as BudgetV2, a, source, e);
    same(snapshot.freeze.readyEvidenceHash, contractValueHash(e));
    same(snapshot.freeze.dependenciesHash, contractValueHash(grant.authorization.legalContext));
    same(evidence.data()?.authorizationHash, grant.authorization.hash);
    same(snapshot.freeze.provenanceManifestHash, grant.authorization.sourceHash);
    if (number.data()?.executionMode !== 'PRODUCTION' || number.data()?.sequence !== snapshot.numbering.sequence || d.productionFreeze.authorizationId !== grant.authorization.id || d.updatedAt !== snapshot.freeze.termsFrozenAt || d.updatedBy !== snapshot.freeze.termsFrozenBy)
        throw Error('PRODUCTION_REGISTRY_INCONSISTENT');
    return { snapshot, identity, ...grant, receipt: expected };
}
export async function freezeOperation(runtime: ProductionRuntime, id: string, v: number, input: unknown, actor: string) {
    const { db } = await requireProductionActor(runtime, actor), c = exact(input, ['commandId', 'authorizationId', 'expectedRevision', 'confirmed']);
    const cid = opaque(c.commandId), aid = opaque(c.authorizationId);
    if (c.confirmed !== true || !Number.isSafeInteger(c.expectedRevision))
        throw Error('EXPLICIT_ISSUANCE_CONFIRMATION_REQUIRED');
    const ref = productionRef(db, id, v).collection('freezeCommands').doc(cid), digest = contractValueHash({ actor, input: c, id, v });
    return db.runTransaction(async (tx) => {
        const old = await tx.get(ref);
        if (old.exists) {
            if (old.data()!.digest !== digest)
                throw Error('PRODUCTION_COMMAND_CONFLICT');
            const frozen = await frozenOperation(runtime, tx, id, v, 'ISSUANCE', false);
            same(old.data()!.receipt, frozen.receipt);
            return { ...frozen.receipt, replay: true };
        }
        const source = await readySource(db, tx, id, v, Number(c.expectedRevision)), grant = await authorization(runtime, tx, id, v, aid, 'ISSUANCE');
        const a = grant.authorization;
        if (a.sourceHash !== source.sourceHash || a.readyRevision !== source.draft.revision || a.operationId !== source.identity.operationId)
            throw Error('PRODUCTION_AUTHORIZATION_STALE');
        // Check the authorized dates; never replace accepted dates at a day boundary.
        const issueInstant = new Date();
        assertCurrentIssueDates(a.legalContext.documentContext, issueInstant);
        const counter = await tx.get(db.doc(productionPaths.counter)), ct = counter.data();
        // No lazy initialization, test counter adoption or numbering migration.
        if (!ct || ct.schemaVersion !== 'CONTRACT_NUMBER_COUNTER_V1' || ct.policyId !== 'CONTRACT_NUMBERING_V1' || ct.executionMode !== 'PRODUCTION' || ct.active !== true || typeof ct.initializationAuthorizationReference !== 'string' || !ct.initializationAuthorizationReference.trim())
            throw Error('PRODUCTION_COUNTER_AUTHORIZATION_REQUIRED');
        validateSequence(ct.lastAllocatedSequence, true);
        const sequence = (BigInt(ct.lastAllocatedSequence) + BigInt(1)).toString(), number = contractNumber(sequence), identity = source.identity, idc = contractIdentity(contractKey(identity)), sid = contractSnapshotId(contractKey(identity)), now = issueInstant.toISOString(), d = source.draft, e = source.evidence, ac = source.acceptance;
        const sr = db.collection(productionPaths.snapshots).doc(sid), nr = db.collection(productionPaths.numbers).doc(number), or = db.collection(productionPaths.origins).doc(contractOriginId(contractKey(identity))), er = db.collection(productionPaths.evidence).doc(idc);
        const all = await Promise.all([tx.get(sr), tx.get(nr), tx.get(or), tx.get(er)]);
        if (all.some(x => x.exists))
            throw Error('PRODUCTION_NUMBER_OR_ORIGIN_COLLISION');
        const sourceDraft = { budgetId: id, budgetVersion: v, contractDraftId: d.contractDraftId, acceptedOptionId: d.acceptedOptionId, revision: d.revision, readyDigest: e.termsDigest };
        const snapshot = sealContractSnapshot({ schemaVersion: 'CONTRACT_SNAPSHOT_V2', currency: 'ARS', contractId: idc, contractSnapshotId: sid, snapshotVersion: 1, contractNumber: number, numbering: { policyId: 'CONTRACT_NUMBERING_V1', sequence }, sourceDraft,
            origin: { sourceCollection: ac.sourceCollection, solicitudId: ac.solicitudId, acceptedAt: ac.acceptedAt, acceptedBy: ac.acceptedBy, budgetHash: contractValueHash(source.budget), acceptanceHash: contractValueHash(ac), draftHash: contractValueHash(d), preferredPlanCuotas: ac.preferredPlanCuotas, preferredPlanAmountSnapshot: ac.preferredPlanAmountSnapshot },
            acceptedReference: d.acceptedReferenceSnapshot, productDetails: d.productDetails, personalDataVersion: PERSONAL_ADDRESS_VERSION, personalData: d.personalData as Required<typeof d.personalData>, addressInterpretation: { jurisdictionCatalogVersion: PERSONAL_ADDRESS_VERSION, provinceDisplayName: provinceLabel(d.personalData.province!), postalPolicyVersion: 'AR_POSTAL_STRUCTURE_V1' }, employmentData: d.employmentData, economicTerms: d.economicTerms!, calculationPolicyVersion: 'P5C_SHARED_C1_V1', roundingPolicy: 'NEXT_90_V1', paymentSchedule: { calendarPolicyVersion: 'P5C_EXPLICIT_MONTH_CLAMP_V1', firstInstallmentDueDate: d.firstInstallmentDueDate!, preferredMonthlyDueDay: d.preferredMonthlyDueDay!, installments: d.paymentScheduleDraft }, ...a.legalContext,
            freeze: { state: 'TERMS_FROZEN', preparedAt: d.preparedAt, readyAt: e.reviewedAt, readyBy: e.reviewedBy, termsFrozenAt: now, termsFrozenBy: actor, commandId: cid, readinessPolicyVersion: 'CONTRACT_PRODUCTION_APPROVAL_V1', integrationPolicyVersion: 'READY_FREEZE_PRODUCTION_V1', executionMode: 'PRODUCTION', readyEvidenceId: d.readyEvidenceId!, readyEvidenceHash: contractValueHash(e), dependenciesHash: contractValueHash(a.legalContext), legalTemplateReviewRequired: true, authorizationId: aid, authorizationHash: a.hash, legalPackageHash: a.packageHash, legalApprovalsHash: a.approvalHash, provenanceManifestHash: a.sourceHash } });
        if (!runtimeData(runtime).test) assertExternalProductionPackage(grant.package);
        // Validate all document values before reserving any number. Pure in-memory rendering; no Storage I/O.
        for (const kind of issuedDocumentKinds(grant.package))
            renderFinalDocument(snapshot as FinalSnapshot, grant.package, kind, runtimeData(runtime).test);
        const receipt = { contractId: idc, snapshotId: sid, contractNumber: number, snapshotHash: snapshot.integrity.payloadHash };
        tx.create(sr, snapshot);
        tx.create(nr, { executionMode: 'PRODUCTION', sequence, receipt, allocatedAt: now });
        tx.create(or, { sourceDigest: a.sourceHash, receipt });
        tx.create(er, { schemaVersion: 'PRODUCTION_ORIGIN_EVIDENCE_V1', authorizationHash: a.hash, readyEvidence: e, receipt });
        tx.create(ref, { digest, receipt, actor, at: now, authorizationId: aid });
        tx.create(productionRef(db, id, v).collection('events').doc(cid), { action: 'TERMS_FROZEN', actor, at: now, authorizationId: aid, receipt });
        tx.update(contractRefs(db, id, v).draft, { status: 'TERMS_FROZEN', revision: d.revision + 1, updatedAt: now, updatedBy: actor, productionFreeze: { executionMode: 'PRODUCTION', authorizationId: aid, receipt } });
        tx.update(db.doc(productionPaths.counter), { lastAllocatedSequence: sequence });
        return { ...receipt, replay: false };
    });
}
