import {validateContractCommercial} from './contractCommercialPreparation';
// Server-only technical review. No numbering, freezing or legal approval.
import type { BudgetV2 } from './budgetV2';
import type { BudgetAcceptanceV2 } from './budgetAcceptanceV2';
import { ContractError, productDetails, contractEconomics, contractSchedule, dataFields, employmentFields, personalFields, reject, type ContractDraftV2 } from './contractV2';
import { PERSONAL_ADDRESS_VERSION } from './contractAddress';
import { canonicalizeContract, contractValueHash } from './contractIntegrityV2';
import { contractIdentity, validateContractSnapshotSource } from './contractSnapshotV2';
export const READINESS_POLICY = 'CONTRACT_TECHNICAL_REVIEW_V1' as const;
export interface ContractReadyEvidenceV1 {
  schemaVersion: 'CONTRACT_READY_EVIDENCE_V1'; contractId: string;
  contractDraftId: string; budgetId: string; budgetVersion: number; acceptedOptionId: string;
  draftRevision: number; termsDigest: string; originHashes: { budget: string; acceptance: string };
  readinessPolicyVersion: typeof READINESS_POLICY; reviewedAt: string; reviewedBy: string; commandId: string;
  legalTemplateReviewRequired: true;
}
function same(a: unknown, b: unknown, message: string) { if (canonicalizeContract(a) !== canonicalizeContract(b)) reject(message); }
export function reviewedTerms(d: ContractDraftV2) {
  return {
    contractDraftId:d.contractDraftId,budgetId:d.budgetId,budgetVersion:d.budgetVersion,acceptedOptionId:d.acceptedOptionId,
    acceptedReferenceSnapshot:d.acceptedReferenceSnapshot,acceptedAt:d.acceptedAt,preferredPlanCuotas:d.preferredPlanCuotas,
    personalDataVersion:d.personalDataVersion ?? 'LEGACY_SIX',personalData:d.personalData,employmentData:d.employmentData,
    economicTerms:d.economicTerms,firstInstallmentDueDate:d.firstInstallmentDueDate,preferredMonthlyDueDay:d.preferredMonthlyDueDay,
    paymentScheduleDraft:d.paymentScheduleDraft,preparedAt:d.preparedAt,...(d.commercialPreparation===undefined?{}:{commercialPreparation:d.commercialPreparation}),...(d.productDetails===undefined?{}:{productDetails:d.productDetails}),
  };
}
export function validateReadySource(budget: BudgetV2, acceptance: BudgetAcceptanceV2, draft: ContractDraftV2): void {
  try {
    if (!Number.isSafeInteger(draft.revision) || draft.revision < 1 || draft.revision >= Number.MAX_SAFE_INTEGER) reject('Revisión contractual inválida.');
    if (draft.personalDataVersion !== PERSONAL_ADDRESS_VERSION) reject('Completá y guardá los ocho datos personales.');
    same(dataFields(draft.personalData,personalFields,true),draft.personalData,'Revisá los datos personales.');
    same(dataFields(draft.employmentData,employmentFields),draft.employmentData,'Revisá los datos laborales opcionales.');
    if (!draft.economicTerms) reject('Seleccioná el plan contractual.');
    same(contractEconomics({...draft.acceptedReferenceSnapshot,imagenUrls:[]},draft.economicTerms.contractPlanCuotas),draft.economicTerms,'Las condiciones económicas no coinciden con el origen aceptado.');
    if (!draft.firstInstallmentDueDate || !draft.preferredMonthlyDueDay) reject('Completá primera fecha y día mensual.');
    same(contractSchedule(draft.economicTerms,draft.firstInstallmentDueDate,draft.preferredMonthlyDueDay),draft.paymentScheduleDraft,'El cronograma no coincide con las condiciones revisadas.');
    if (draft.paymentScheduleDraft.reduce((sum,row)=>sum+row.amount,0)!==draft.economicTerms.contractTotal) reject('La suma del cronograma no coincide con el total.');
    if(draft.commercialPreparation)validateContractCommercial(draft.commercialPreparation,draft.economicTerms);
    // Existing exact schema and accepted-origin validator, without changing its Emulator policy.
    const { readyEvidenceId: _review, productDetails: product, commercialPreparation: _commercial, ...source } = draft; void _review;void _commercial;
    // The historical source validator covers the immutable origin and economic/calendar fields.
    // Product details are reviewed separately and included in this revision's evidence above.
    if(product!==undefined)same(productDetails(product),product,'Revisá los datos del producto.');
    validateContractSnapshotSource({budget,acceptance,draft:{...source,status:'DRAFT'}});
  } catch (error) {
    if (error instanceof ContractError) throw error;
    reject('Origen o contenido contractual inconsistente. Revisá el presupuesto y la opción aceptada.');
  }
}
export function buildReadyEvidence(budget:BudgetV2,acceptance:BudgetAcceptanceV2,draft:ContractDraftV2,actor:string,now:string,commandId:string):ContractReadyEvidenceV1 {
  validateReadySource(budget,acceptance,draft);
  const identity={budgetId:draft.budgetId,budgetVersion:draft.budgetVersion,contractDraftId:draft.contractDraftId,acceptedOptionId:draft.acceptedOptionId};
  return {schemaVersion:'CONTRACT_READY_EVIDENCE_V1',contractId:contractIdentity(identity),...identity,draftRevision:draft.revision+1,
    termsDigest:contractValueHash(reviewedTerms(draft)),originHashes:{budget:contractValueHash(budget),acceptance:contractValueHash(acceptance)},
    readinessPolicyVersion:READINESS_POLICY,reviewedAt:now,reviewedBy:actor,commandId,legalTemplateReviewRequired:true};
}
export function verifyReadyEvidence(budget:BudgetV2,acceptance:BudgetAcceptanceV2,draft:ContractDraftV2,evidence:ContractReadyEvidenceV1):void {
  if (draft.status!=='READY_TO_FORMALIZE' || !draft.readyEvidenceId || draft.readyEvidenceId!==evidence.commandId) reject('La evidencia de revisión no está vigente.');
  const expected=buildReadyEvidence(budget,acceptance,{...draft,revision:draft.revision-1},draft.updatedBy,draft.updatedAt,draft.readyEvidenceId);
  same(expected,evidence,'La evidencia de revisión no coincide con el borrador vigente.');
}
