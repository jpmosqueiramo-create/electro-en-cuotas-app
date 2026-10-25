import {assertAdministrativeRecordActive} from '../adminRecordRemovalServer';
import { createHash } from 'node:crypto';
import type { Firestore, Transaction } from 'firebase-admin/firestore';
import { contractRefs, clientConformityIsCurrent } from '../contractV2Server';
import { stable, opaque, type ContractDraftV2 } from '../contractV2';
import type { BudgetV2 } from '../budgetV2';
import type { BudgetAcceptanceV2 } from '../budgetAcceptanceV2';
import { operationFromAcceptance, operationRef, verifyOperation } from '../operationV2';
import { assertCreditPreparation, creditRefs } from '../creditReviewV2Server';
import { readOperationIdentity } from '../operationIdentityReviewServer';
import { verifyReadyEvidence, type ContractReadyEvidenceV1 } from '../contractReadyV2';
import { contractValueHash } from '../contractIntegrityV2';
export async function readySource(db: Firestore, tx: Transaction, id: string, v: number, expectedRevision: number) {
    await assertAdministrativeRecordActive(db,tx,{kind:'CONTRACT',id,version:v});
    const r = contractRefs(db, id, v);
    const [bs, as, ds, os, cr, cs] = await Promise.all([tx.get(r.budget), tx.get(r.acceptance), tx.get(r.draft), tx.get(operationRef(db, id, v)), tx.get(creditRefs(db, id, v).review), tx.get(r.draft.collection('conformity').doc('current'))]);
    if (!bs.exists || !as.exists || !ds.exists || !os.exists)
        throw Error('PRODUCTION_ORIGIN_REQUIRED');
    const budget = bs.data() as BudgetV2, acceptance = as.data() as BudgetAcceptanceV2, draft = ds.data() as ContractDraftV2, identity = operationFromAcceptance(acceptance);
    verifyOperation(os.data(), identity);
    if (draft.status !== 'READY_TO_FORMALIZE' || draft.revision !== expectedRevision || !draft.readyEvidenceId || draft.activeClientDataRequestId !== null)
        throw Error('PRODUCTION_READY_REVISION_REQUIRED');
    if (!draft.productDetails?.quantity || !draft.productDetails.condition)
        throw Error('PRODUCTION_PRODUCT_REQUIRED');
    const identityReview = await readOperationIdentity(db, tx, id, v);
    if (identityReview.requiresClarification || identityReview.originalUnavailable)
        throw Error('PRODUCTION_IDENTITY_REQUIRED');
    // Unlike historical preparation, a missing credit record never authorizes issuance.
    if (!cr.exists || cr.data()!.state !== 'APPROVED' || !cr.data()!.profileOrigin)
        throw Error('PRODUCTION_CREDIT_APPROVAL_REQUIRED');
    await assertCreditPreparation(db, tx, id, v);
    const consent = cs.data();
    if (!consent || !clientConformityIsCurrent(draft,consent) || !consent.confirmedAt || !consent.confirmedBy || !consent.evidence)
        throw Error('PRODUCTION_CONFORMITY_REQUIRED');
    const es = await tx.get(r.draft.collection('readyReviews').doc(opaque(draft.readyEvidenceId)));
    if (!es.exists)
        throw Error('PRODUCTION_READY_EVIDENCE_REQUIRED');
    const evidence = es.data() as ContractReadyEvidenceV1;
    verifyReadyEvidence(budget, acceptance, draft, evidence);
    const [cmd, event] = await Promise.all([tx.get(r.draft.collection('commands').doc(evidence.commandId)), tx.get(r.draft.collection('events').doc(evidence.commandId))]);
    const c = cmd.data(), e = event.data();
    const digest = createHash('sha256').update(stable({ actor: evidence.reviewedBy, input: { action: 'MARK_READY_TO_FORMALIZE', commandId: evidence.commandId, expectedRevision: evidence.draftRevision - 1 } })).digest('hex');
    if (!c || !e || c.action !== 'MARK_READY_TO_FORMALIZE' || c.digest !== digest || c.by !== evidence.reviewedBy || c.createdAt !== evidence.reviewedAt || e.action !== 'MARK_READY_TO_FORMALIZE' || e.to !== 'READY_TO_FORMALIZE' || e.from !== 'DRAFT' || e.by !== evidence.reviewedBy || e.at !== evidence.reviewedAt || e.afterRevision !== evidence.draftRevision || e.beforeRevision !== evidence.draftRevision - 1 || e.readyEvidenceId !== evidence.commandId || contractValueHash(c.result) !== contractValueHash(draft))
        throw Error('PRODUCTION_READY_PROVENANCE_REQUIRED');
    return { budget, acceptance, draft, identity, evidence, consent, credit: cr.data()!, sourceHash: contractValueHash({ budget, acceptance, draft, evidence, consent, credit: cr.data() }) };
}
