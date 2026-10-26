import {snapshotCommercial} from './contractCommercialPreparation';
import { PERSONAL_ADDRESS_VERSION, provinceLabel } from './contractAddress';
import { productDetails, contractEconomics, contractSchedule, dataFields, personalFields, employmentFields, calendarDate, opaque, newContractDraft, type ContractDraftV2, type ContractEconomicTermsV2, type ContractEmploymentDataV2, type ContractPersonalDataV2 } from './contractV2';
import { validateBudgetV2, referenceSnapshotToDraft, type BudgetV2 } from './budgetV2';
import type { BudgetAcceptanceV2 } from './budgetAcceptanceV2';
import { buildBudgetOptionV2 } from './budgetReferenceV2';
import { privateBudgetReferenceId } from './budgetV2Persistence';
import { CONTRACT_CANONICALIZATION, canonicalizeContract, contractValueHash, infrastructureReject as fail } from './contractIntegrityV2';

export const CONTRACT_NUMBERING_POLICY = 'CONTRACT_NUMBERING_V1' as const;
export interface ContractIdentityV2 {
  budgetId: string; budgetVersion: number; contractDraftId: string; acceptedOptionId: string;
}
export interface ContractDocumentDefinitionV2 {
  templateId: string; templateVersion: string; templateHash: string;
  rendererBundleId: string; rendererBundleHash: string; resourcesManifestHash: string; legalApprovalId: string;
}
export interface ContractLegalContextV2 {
  issuer: {
    profileId: string; profileVersion: string; profileHash: string; legalName: string;
    tradeName: string; taxId: string; legalAddress: string;
    representative: { fullName: string; capacity: string };
  };
  documentContext: {
    policyVersion: string; contractIssueDate: string; contractIssuePlace: string;
    promissoryNoteIssueDate: string; promissoryNoteIssuePlace: string;
    parameterSchemaId: string; parameters: Readonly<Record<string, string | number | boolean | null>>;
  };
  documentDefinitions: { contract: ContractDocumentDefinitionV2; promissoryNote: ContractDocumentDefinitionV2 };
}
export interface ContractSnapshotV2 extends ContractLegalContextV2 {
  schemaVersion: 'CONTRACT_SNAPSHOT_V2'; currency: 'ARS'; contractId: string; contractSnapshotId: string; snapshotVersion: number;
  contractNumber: string; numbering: { policyId: typeof CONTRACT_NUMBERING_POLICY; sequence: string };
  sourceDraft: ContractIdentityV2 & { revision: number; readyDigest: string };
  origin: {
    sourceCollection: BudgetV2['sourceCollection']; solicitudId: string; acceptedAt: string; acceptedBy: string;
    budgetHash: string; acceptanceHash: string; draftHash: string;
    preferredPlanCuotas: number | null; preferredPlanAmountSnapshot: number | null;
  };
  acceptedReference: ContractDraftV2['acceptedReferenceSnapshot'];
  // Optional only for new technical-review Emulator snapshots; omitted historical
  // records retain their exact canonical payload and digest.
  productDetails?: NonNullable<ContractDraftV2['productDetails']>;
  personalDataVersion: typeof PERSONAL_ADDRESS_VERSION;
  personalData: Required<ContractPersonalDataV2>;
  addressInterpretation: { jurisdictionCatalogVersion: typeof PERSONAL_ADDRESS_VERSION; provinceDisplayName: string; postalPolicyVersion: 'AR_POSTAL_STRUCTURE_V1' };
  employmentData: ContractEmploymentDataV2;
  economicTerms: ContractEconomicTermsV2;
  calculationPolicyVersion: 'P5C_SHARED_C1_V1'; roundingPolicy: 'NEXT_90_V1';
  paymentSchedule: {
    calendarPolicyVersion: 'P5C_EXPLICIT_MONTH_CLAMP_V1'; firstInstallmentDueDate: string;
    preferredMonthlyDueDay: number; installments: ContractDraftV2['paymentScheduleDraft'];
  };
  freeze: {
    state: 'TERMS_FROZEN'; preparedAt: string; readyAt: string; readyBy: string;
    termsFrozenAt: string; termsFrozenBy: string; commandId: string;
    provenanceManifestHash: string;
  } & ({ readinessPolicyVersion: 'EMULATOR_FIXTURE_ONLY_V1' } | {
    readinessPolicyVersion: 'CONTRACT_TECHNICAL_REVIEW_V1';
    integrationPolicyVersion: 'READY_FREEZE_EMULATOR_V1'; executionMode: 'EMULATOR_ONLY';
    readyEvidenceId: string; readyEvidenceHash: string; dependenciesHash: string;
    legalTemplateReviewRequired: true;
  } | {
    readinessPolicyVersion: 'CONTRACT_PRODUCTION_APPROVAL_V1';
    integrationPolicyVersion: 'READY_FREEZE_PRODUCTION_V1'; executionMode: 'PRODUCTION';
    readyEvidenceId: string; readyEvidenceHash: string; dependenciesHash: string;
    legalTemplateReviewRequired: true;
    authorizationId: string; authorizationHash: string; legalPackageHash: string;
    legalApprovalsHash: string;
  });
  integrity: { canonicalizationVersion: typeof CONTRACT_CANONICALIZATION; hashAlgorithm: 'SHA-256'; payloadHash: string };
}

type Check = (v: unknown) => void;
const text = (max = 300, required = true): Check => v => { if (typeof v !== 'string' || v.length > max || (required && !v.trim()) || /[\x00-\x1f\x7f]/.test(v)) fail(); };
// Preserve existing reference text semantics, including multiline descriptions.
const sourceText = (max:number,required=true):Check => v => {if(typeof v !== 'string' || v.length>max || (required&&!v.trim()))fail();};
const literal = (...values: unknown[]): Check => v => { if (!values.includes(v)) fail(); };
const positive: Check = v => { if (typeof v !== 'number' || !Number.isFinite(v) || v <= 0) fail(); };
const integer: Check = v => { positive(v); if (!Number.isSafeInteger(v)) fail(); };
const hash: Check = v => { if (typeof v !== 'string' || !/^[a-f0-9]{64}$/.test(v)) fail(); };
const instant: Check = v => { if (typeof v !== 'string' || !Number.isFinite(Date.parse(v)) || new Date(v).toISOString() !== v) fail(); };
const nullable = (check: Check): Check => v => { if (v !== null) check(v); };
const shape = (fields: Record<string, Check>): Check => v => {
  if (!v || typeof v !== 'object' || Array.isArray(v)) fail();
  const o = v as Record<string, unknown>, keys = Object.keys(fields);
  if (Object.keys(o).length !== keys.length || keys.some(k => !Object.hasOwn(o, k))) fail();
  for (const k of keys) fields[k](o[k]);
};
const identityCheck = shape({ budgetId: opaque, budgetVersion: integer, contractDraftId: opaque, acceptedOptionId: opaque });
export function contractIdentity(identity: ContractIdentityV2): string {
  canonicalizeContract(identity); identityCheck(identity);
  if (identity.contractDraftId !== `v${identity.budgetVersion}`) fail('CONTRACT_DRAFT_ID_MISMATCH');
  return 'cv2_' + contractValueHash(identity);
}
export function contractOriginId(identity: ContractIdentityV2): string {
  contractIdentity(identity);
  return 'bo_' + contractValueHash({ budgetId: identity.budgetId, budgetVersion: identity.budgetVersion });
}
export function contractSnapshotId(identity: ContractIdentityV2, edition=1): string { if(!Number.isSafeInteger(edition)||edition<1)fail('INVALID_SNAPSHOT_EDITION');return contractIdentity(identity) + '_s'+edition; }
export function validateSequence(value: unknown, zeroAllowed = false): asserts value is string {
  if (typeof value !== 'string' || value.length > 1000 || !(zeroAllowed ? /^(0|[1-9][0-9]*)$/ : /^[1-9][0-9]*$/).test(value)) fail('INVALID_CONTRACT_SEQUENCE');
}
export function contractNumber(sequence: string): string { validateSequence(sequence); return 'CH-' + sequence.padStart(6, '0'); }
const documentDefinition = shape({ templateId: text(), templateVersion: text(), templateHash: hash, rendererBundleId: text(), rendererBundleHash: hash, resourcesManifestHash: hash, legalApprovalId: text() });
const issuer = shape({ profileId: text(), profileVersion: text(), profileHash: hash, legalName: text(), tradeName: text(), taxId: text(), legalAddress: text(), representative: shape({ fullName: text(), capacity: text() }) });
const legalContext = shape({ policyVersion: text(), contractIssueDate: calendarDate, contractIssuePlace: text(), promissoryNoteIssueDate: calendarDate, promissoryNoteIssuePlace: text(), parameterSchemaId: text(), parameters: v => {
  if (!v || typeof v !== 'object' || Array.isArray(v) || Object.keys(v).length > 30) fail();
  for (const [k, field] of Object.entries(v)) { if (!/^[a-zA-Z][a-zA-Z0-9_]{0,63}$/.test(k) || (field !== null && !['string','number','boolean'].includes(typeof field))) fail(); if (typeof field === 'string') text(1000, false)(field); }
} });
export function validateContractLegalContext(value: unknown): asserts value is ContractLegalContextV2 {
  canonicalizeContract(value);
  shape({ issuer, documentContext: legalContext, documentDefinitions: shape({ contract: documentDefinition, promissoryNote: documentDefinition }) })(value);
}
const reference: Check = v => {
  shape({ schemaVersion: literal('BUDGET_REFERENCE_V2'), referenceId: nullable(text(1500)), source: literal('EXISTING_REFERENCE','NEW_REFERENCE'), nombre: sourceText(500), descripcion: sourceText(10000, false), skuInternoSnapshot: nullable(sourceText(500, false)), codigoBarrasSnapshot: nullable(sourceText(500, false)), costoProveedorSnapshot: positive, proveedorSnapshot: sourceText(500, false), factoresSnapshot: map('number'), planesActivosSnapshot: map('boolean'), planesOfrecidos: rows(shape({ cuotas: integer, cuotaEstimada: integer }), 18), fechaCotizacion: instant })(v);
};
function map(kind: 'number' | 'boolean'): Check { return v => {
  if (!v || typeof v !== 'object' || Array.isArray(v)) fail();
  for (const [k, field] of Object.entries(v)) if (!/^(?:[1-9]|1[0-8])$/.test(k) || typeof field !== kind) fail();
}; }
function rows(check: Check, max: number): Check { return v => { if (!Array.isArray(v) || !v.length || v.length > max) fail(); v.forEach(check); }; }
const economicCheck = shape({ capitalAmount: positive, contractPlanCuotas: integer, factorSnapshot: positive, factorComputedTotal: positive, roundingAdjustment: v => { if (typeof v !== 'number') fail(); }, serviceAmount: v => { if (typeof v !== 'number' || v < 0) fail(); }, contractInstallmentAmount: integer, contractTotal: integer });
const identityKeys = { budgetId: opaque, budgetVersion: integer, contractDraftId: opaque, acceptedOptionId: opaque };
function equal(a: unknown, b: unknown): void { if (canonicalizeContract(a) !== canonicalizeContract(b)) fail('CONTRACT_SOURCE_OR_TERMS_MISMATCH'); }
export function snapshotPayloadHash(snapshot: ContractSnapshotV2): string {
  canonicalizeContract(snapshot);
  const { payloadHash: _excluded, ...header } = snapshot.integrity; void _excluded;
  return contractValueHash({ ...snapshot, integrity: header });
}
export function validateContractSnapshot(value: unknown): asserts value is ContractSnapshotV2 {
  const bytes = canonicalizeContract(value); if (Buffer.byteLength(bytes) > 600000) fail('CONTRACT_SNAPSHOT_SIZE_LIMIT');
  const productFields: Record<string, Check> = {};
  if (value && typeof value === 'object' && Object.hasOwn(value, 'productDetails')) productFields.productDetails = v => equal(productDetails(v), v);
  shape({
    schemaVersion: literal('CONTRACT_SNAPSHOT_V2'), currency: literal('ARS'), contractId: text(), contractSnapshotId: text(), snapshotVersion: integer, contractNumber: text(1003),
    numbering: shape({ policyId: literal(CONTRACT_NUMBERING_POLICY), sequence: v => validateSequence(v) }),
    sourceDraft: shape({ ...identityKeys, revision: integer, readyDigest: hash }),
    origin: shape({ sourceCollection: literal('solicitudes','solicitudes_cuenta'), solicitudId: text(1500), acceptedAt: instant, acceptedBy: text(), budgetHash: hash, acceptanceHash: hash, draftHash: hash, preferredPlanCuotas: nullable(integer), preferredPlanAmountSnapshot: nullable(positive) }),
    acceptedReference: reference, ...productFields, personalDataVersion: literal(PERSONAL_ADDRESS_VERSION),
    personalData: v => { equal(dataFields(v, personalFields, true), v); },
    employmentData: v => { equal(dataFields(v, employmentFields), v); },
    addressInterpretation: shape({ jurisdictionCatalogVersion: literal(PERSONAL_ADDRESS_VERSION), provinceDisplayName: text(), postalPolicyVersion: literal('AR_POSTAL_STRUCTURE_V1') }),
    economicTerms: economicCheck, calculationPolicyVersion: literal('P5C_SHARED_C1_V1'), roundingPolicy: literal('NEXT_90_V1'),
    paymentSchedule: shape({ calendarPolicyVersion: literal('P5C_EXPLICIT_MONTH_CLAMP_V1'), firstInstallmentDueDate: calendarDate, preferredMonthlyDueDay: integer, installments: rows(shape({ installmentNumber: integer, dueDate: calendarDate, amount: integer }),18) }),
    issuer, documentContext: legalContext, documentDefinitions: shape({ contract: documentDefinition, promissoryNote: documentDefinition }),
    freeze: v => {
      const common = { state: literal('TERMS_FROZEN'), preparedAt: instant, readyAt: instant, readyBy: text(), termsFrozenAt: instant, termsFrozenBy: text(), commandId: opaque, provenanceManifestHash: hash };
      if (v && typeof v === 'object' && (v as Record<string,unknown>).readinessPolicyVersion === 'CONTRACT_TECHNICAL_REVIEW_V1') {
        shape({ ...common, readinessPolicyVersion: literal('CONTRACT_TECHNICAL_REVIEW_V1'), integrationPolicyVersion: literal('READY_FREEZE_EMULATOR_V1'), executionMode: literal('EMULATOR_ONLY'), readyEvidenceId: opaque, readyEvidenceHash: hash, dependenciesHash: hash, legalTemplateReviewRequired: literal(true) })(v);
      } else if (v && typeof v === 'object' && (v as Record<string,unknown>).readinessPolicyVersion === 'CONTRACT_PRODUCTION_APPROVAL_V1') {
        // Shape/integrity only. This does NOT authorize issuance. The separate server
        // adapter verifies the exact catalog, professional records and per-operation grant.
        shape({ ...common, readinessPolicyVersion: literal('CONTRACT_PRODUCTION_APPROVAL_V1'), integrationPolicyVersion: literal('READY_FREEZE_PRODUCTION_V1'), executionMode: literal('PRODUCTION'), readyEvidenceId: opaque, readyEvidenceHash: hash, dependenciesHash: hash, legalTemplateReviewRequired: literal(true), authorizationId: opaque, authorizationHash: hash, legalPackageHash: hash, legalApprovalsHash: hash })(v);
      } else shape({ ...common, readinessPolicyVersion: literal('EMULATOR_FIXTURE_ONLY_V1') })(v);
    },
    integrity: shape({ canonicalizationVersion: literal(CONTRACT_CANONICALIZATION), hashAlgorithm: literal('SHA-256'), payloadHash: hash }),
  })(value);
  const s = value as ContractSnapshotV2, { budgetId, budgetVersion, contractDraftId, acceptedOptionId } = s.sourceDraft;
  const id = { budgetId, budgetVersion, contractDraftId, acceptedOptionId };
  if (s.contractId !== contractIdentity(id) || s.contractSnapshotId !== contractSnapshotId(id,s.snapshotVersion) || s.contractNumber !== contractNumber(s.numbering.sequence)) fail('CONTRACT_IDENTITY_MISMATCH');
  if(s.snapshotVersion!==1&&s.freeze.readinessPolicyVersion!=='CONTRACT_PRODUCTION_APPROVAL_V1')fail('REVISED_SNAPSHOT_REQUIRES_PRODUCTION_PROOF');
  const fullRef = { ...s.acceptedReference, imagenUrls: [] };
  const rebuilt = buildBudgetOptionV2(acceptedOptionId, { draft: referenceSnapshotToDraft(fullRef), fechaCotizacion: fullRef.fechaCotizacion, ...(fullRef.source === 'EXISTING_REFERENCE' ? { source: fullRef.source, referenceId: fullRef.referenceId! } : { source: 'NEW_REFERENCE', referenceId: null }) }).referenceSnapshot;
  equal({ ...rebuilt, referenceId: fullRef.referenceId }, fullRef);
  if (fullRef.source === 'NEW_REFERENCE' && fullRef.referenceId !== null && fullRef.referenceId !== privateBudgetReferenceId(budgetId, acceptedOptionId)) fail();
  equal(contractEconomics(fullRef, s.economicTerms.contractPlanCuotas), s.economicTerms);
  equal(contractSchedule(s.economicTerms, s.paymentSchedule.firstInstallmentDueDate, s.paymentSchedule.preferredMonthlyDueDay), s.paymentSchedule.installments);
  if (s.addressInterpretation.provinceDisplayName !== provinceLabel(s.personalData.province)) fail();
  if (s.origin.preferredPlanCuotas === null) { if (s.origin.preferredPlanAmountSnapshot !== null) fail(); }
  else { const offered = fullRef.planesOfrecidos.find(p => p.cuotas === s.origin.preferredPlanCuotas); if (!offered || offered.cuotaEstimada !== s.origin.preferredPlanAmountSnapshot) fail(); }
  if (Object.hasOwn(s, 'productDetails') && !['CONTRACT_TECHNICAL_REVIEW_V1','CONTRACT_PRODUCTION_APPROVAL_V1'].includes(s.freeze.readinessPolicyVersion)) fail('PRODUCT_DETAILS_REQUIRE_TECHNICAL_REVIEW');
  if (s.freeze.readinessPolicyVersion === 'CONTRACT_TECHNICAL_REVIEW_V1' || s.freeze.readinessPolicyVersion === 'CONTRACT_PRODUCTION_APPROVAL_V1') {
    const terms = { contractDraftId, budgetId, budgetVersion, acceptedOptionId, acceptedReferenceSnapshot:s.acceptedReference, acceptedAt:s.origin.acceptedAt, preferredPlanCuotas:s.origin.preferredPlanCuotas, personalDataVersion:s.personalDataVersion, personalData:s.personalData, employmentData:s.employmentData, economicTerms:s.economicTerms, firstInstallmentDueDate:s.paymentSchedule.firstInstallmentDueDate, preferredMonthlyDueDay:s.paymentSchedule.preferredMonthlyDueDay, paymentScheduleDraft:s.paymentSchedule.installments, preparedAt:s.freeze.preparedAt, ...(snapshotCommercial(s.documentContext.parameters,s.economicTerms)?{commercialPreparation:snapshotCommercial(s.documentContext.parameters,s.economicTerms)}:{}), ...(s.productDetails===undefined?{}:{productDetails:s.productDetails}) };
    if (contractValueHash(terms) !== s.sourceDraft.readyDigest) fail('CONTRACT_READY_TERMS_MISMATCH');
  }
  if (s.integrity.payloadHash !== snapshotPayloadHash(s)) fail('CONTRACT_INTEGRITY_MISMATCH');
}
export function sealContractSnapshot(input: Omit<ContractSnapshotV2, 'integrity'>): ContractSnapshotV2 {
  canonicalizeContract(input); if (Object.hasOwn(input,'integrity')) fail();
  const snapshot: ContractSnapshotV2 = { ...structuredClone(input), integrity: { canonicalizationVersion: CONTRACT_CANONICALIZATION, hashAlgorithm: 'SHA-256', payloadHash: '0'.repeat(64) } };
  snapshot.integrity.payloadHash = snapshotPayloadHash(snapshot); validateContractSnapshot(snapshot); return snapshot;
}
export interface ContractSnapshotSourceV2 { budget: BudgetV2; acceptance: BudgetAcceptanceV2; draft: ContractDraftV2 }
export function validateContractSnapshotSource(source: ContractSnapshotSourceV2): void {
  canonicalizeContract(source); shape({ budget: () => {}, acceptance: () => {}, draft: () => {} })(source);
  validateBudgetV2(source.budget, privateBudgetReferenceId);
  const { budget: b, acceptance: a, draft: d } = source;
  const initial = newContractDraft(b, a, d.createdBy, d.createdAt);
  if (d.personalDataVersion !== PERSONAL_ADDRESS_VERSION) fail('CONTRACT_PERSONAL_VERSION_INCOMPLETE');
  if (Object.keys(d).sort().join(',') !== Object.keys(initial).sort().join(',')) fail('CONTRACT_DRAFT_SCHEMA_MISMATCH');
  for (const at of [d.preparedAt,d.createdAt,d.updatedAt]) instant(at);
  for (const actor of [d.createdBy,d.updatedBy]) text()(actor);
  for (const request of [d.activeClientDataRequestId,d.lastClientSubmissionId]) nullable(opaque)(request);
  nullable(instant)(d.lastClientSubmissionAppliedAt); nullable(text())(d.lastClientSubmissionAppliedBy);
  // Acceptance has an exact persisted P4 schema; no invented actor object or offered total.
  shape({ schemaVersion: literal('BUDGET_ACCEPTANCE_V2'), budgetId: opaque, budgetVersion: integer, sourceCollection: literal('solicitudes','solicitudes_cuenta'), solicitudId: text(1500), acceptedOptionId: opaque, acceptedAt: instant, acceptedBy: text(), preferredPlanCuotas: nullable(integer), preferredPlanAmountSnapshot: nullable(positive), optionSnapshot: () => {}, workflowStage: literal('DOCUMENTACION') })(a);
  if (d.schemaVersion !== 'CONTRACT_DRAFT_V2' || d.status !== 'DRAFT' || d.contractDraftId !== `v${b.version}` || d.budgetId !== b.id || d.budgetVersion !== b.version || d.acceptedOptionId !== a.acceptedOptionId || !Number.isSafeInteger(d.revision) || d.revision < 1 || !d.economicTerms || !d.firstInstallmentDueDate || !d.preferredMonthlyDueDay) fail();
  equal(initial.acceptedReferenceSnapshot, d.acceptedReferenceSnapshot); equal(d.acceptedAt,a.acceptedAt); equal(d.preferredPlanCuotas,a.preferredPlanCuotas);
  equal(dataFields(d.personalData,personalFields,true),d.personalData); equal(dataFields(d.employmentData,employmentFields),d.employmentData);
  equal(contractEconomics({ ...d.acceptedReferenceSnapshot,imagenUrls:[] },d.economicTerms.contractPlanCuotas),d.economicTerms);
  equal(contractSchedule(d.economicTerms,d.firstInstallmentDueDate,d.preferredMonthlyDueDay),d.paymentScheduleDraft);
}
