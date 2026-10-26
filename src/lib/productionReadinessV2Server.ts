import {createHash} from 'node:crypto';
import type { Firestore } from 'firebase-admin/firestore';
import { contractRefs, clientTermsDigest } from './contractV2Server';
import { completeness, contractEconomics, contractSchedule, stable, dataFields, employmentFields, newContractDraft, type ContractDraftV2 } from './contractV2';
import { validateBudgetV2, type BudgetV2 } from './budgetV2';
import { privateBudgetReferenceId } from './budgetV2Persistence';
import type { BudgetAcceptanceV2 } from './budgetAcceptanceV2';
import { operationFromAcceptance, operationRef, verifyOperation } from './operationV2';
import { assertCreditPreparation, creditRefs } from './creditReviewV2Server';
import { readOperationIdentity } from './operationIdentityReviewServer';
import { verifyReadyEvidence, type ContractReadyEvidenceV1 } from './contractReadyV2';
import { contractValueHash } from './contractIntegrityV2';
import { currentLegalArtifacts, type LegalApprovalRecord } from './legalApprovalV2';
import { legalRegistryRef } from './legalApprovalV2Server';
import { assessProductionReadiness, PRODUCTION_READINESS_POLICY, type ProductionReadiness } from './productionReadinessV2';

/** No writes, migrations, numbering or Storage downloads. Only existing private references. */
export async function readProductionReadiness(db: Firestore, id: string, version: number): Promise<ProductionReadiness> {
  const r = contractRefs(db, id, version);
  return db.runTransaction(async tx => {
    const [b, a, d, op, records, credit, consent] = await Promise.all([
      tx.get(r.budget), tx.get(r.acceptance), tx.get(r.draft), tx.get(operationRef(db, id, version)),
      tx.get(legalRegistryRef(db).collection('records').orderBy('recordedAt', 'desc').limit(101)),
      tx.get(creditRefs(db, id, version).review), tx.get(r.draft.collection('conformity').doc('current')),
    ]);
    if (!b.exists || !a.exists || !d.exists || !op.exists) throw Error('PRODUCTION_ORIGIN_UNAVAILABLE');
    const budget = b.data() as BudgetV2, acceptance = a.data() as BudgetAcceptanceV2, draft = d.data() as ContractDraftV2;
    validateBudgetV2(budget, privateBudgetReferenceId);
    // Same origin validation as the normal contract. No identity guessing or synthetic conversion.
    const initial = newContractDraft(budget, acceptance, draft.createdBy, draft.createdAt);
    const identity = operationFromAcceptance(acceptance);
    verifyOperation(op.data(), identity);
    if (draft.budgetId !== id || draft.budgetVersion !== version || draft.contractDraftId !== initial.contractDraftId || draft.acceptedOptionId !== acceptance.acceptedOptionId ||
      contractValueHash(draft.acceptedReferenceSnapshot) !== contractValueHash(initial.acceptedReferenceSnapshot)) throw Error('PRODUCTION_ORIGIN_INCONSISTENT');
    const identityReview = await readOperationIdentity(db, tx, id, version);
    let creditApproved = false;
    // Historical unenrolled read compatibility must NEVER count as approval for a real issue.
    if (credit.exists) {
      try { await assertCreditPreparation(db, tx, id, version); creditApproved = credit.data()?.state === 'APPROVED'; }
      catch { creditApproved = false; }
    }
    let readyReviewValid = false;
    if (draft.status === 'READY_TO_FORMALIZE' && draft.readyEvidenceId) {
      const evidence = await tx.get(r.draft.collection('readyReviews').doc(draft.readyEvidenceId));
      if (evidence.exists) {
        try { verifyReadyEvidence(budget, acceptance, draft, evidence.data() as ContractReadyEvidenceV1); readyReviewValid = true; }
        catch { readyReviewValid = false; }
      }
    }
    const missing = completeness(draft);
    const terms = draft.economicTerms, schedule = draft.paymentScheduleDraft;
    let economicComplete=false,scheduleComplete=false;
    try {
      economicComplete=!!terms&&stable(contractEconomics({...draft.acceptedReferenceSnapshot,imagenUrls:[]},terms.contractPlanCuotas))===stable(terms);
      scheduleComplete=economicComplete&&!!draft.firstInstallmentDueDate&&!!draft.preferredMonthlyDueDay&&
        stable(contractSchedule(terms!,draft.firstInstallmentDueDate,draft.preferredMonthlyDueDay))===stable(schedule);
    } catch { /* An inconsistent saved schedule never counts as ready; no repair writes. */ }
    const profile = credit.data()?.profileOrigin;
    let identityVerified = false;
    if (profile && !identityReview.requiresClarification) {
      const saved = await tx.get(creditRefs(db, profile.budgetId, profile.version).profile);
      identityVerified = saved.exists && saved.data()?.schemaVersion === 'CLIENT_DOCUMENT_PROFILE_V2' &&
        saved.data()?.identityHash === createHash('sha256').update(stable({dni:draft.personalData.dni,fullName:draft.personalData.fullName.trim().normalize('NFKC').toLocaleUpperCase('es-AR')})).digest('hex');
    }
    const items = assessProductionReadiness({sourceValid: !identityReview.originalUnavailable,
      personalComplete: !identityReview.requiresClarification && !missing.some(x => x.startsWith('Datos personales')),
      employmentComplete: (()=>{try{dataFields(draft.employmentData,employmentFields);return true;}catch{return false;}})(),
      productComplete: !!draft.productDetails?.quantity && !!draft.productDetails?.condition,
      economicComplete, scheduleComplete, identityVerified, creditApproved,
      conformityCurrent: consent.exists && consent.data()?.confirmedDigest === clientTermsDigest(draft) &&
        !!consent.data()?.confirmedAt && !!consent.data()?.confirmedBy && !!consent.data()?.evidence,
      readyReviewValid, artifacts: currentLegalArtifacts, approvals: records.docs.slice(0,100).map(doc => doc.data() as LegalApprovalRecord), registryComplete: records.size <= 100,
    });
    const digest = contractValueHash({policy:PRODUCTION_READINESS_POLICY,operationId:identity.operationId,revision:draft.revision,
      sourceHashes:[contractValueHash(budget),contractValueHash(acceptance),contractValueHash(draft)],
      consent:consent.data()??null,credit:credit.data()??null,records:records.docs.map(doc=>({id:doc.id,record:doc.data()})),items});
    return {policy:PRODUCTION_READINESS_POLICY,operationId:identity.operationId,revision:draft.revision,digest,evaluatedAt:new Date().toISOString(),items,
      nextAction:items.find(item=>item.state!=='READY')??{...items[4],label:'Revisar emisión',detail:'Los cinco pasos de preparación están completos. Consultá el estado efectivo de emisión.'},finalIssuanceEnabled:false,productionDeliveryEnabled:false,productionFinancialEnabled:false,arcaEnabled:false};
  });
}
