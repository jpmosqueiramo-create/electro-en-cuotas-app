// Synthetic test fixtures only. Never imported from application modules.
import { buildBudgetOptionV2 } from '../../src/lib/budgetReferenceV2';
import { referenceSnapshotToDraft } from '../../src/lib/budgetV2';
import { budgetFixture } from './budgetV2Fixtures';
import { buildAcceptance } from '../../src/lib/budgetAcceptanceV2';
import { newContractDraft, contractEconomics, contractSchedule } from '../../src/lib/contractV2';
import { PERSONAL_ADDRESS_VERSION, provinceLabel } from '../../src/lib/contractAddress';
import { contractValueHash } from '../../src/lib/contractIntegrityV2';
import { contractIdentity, contractSnapshotId, contractNumber, sealContractSnapshot, type ContractIdentityV2 } from '../../src/lib/contractSnapshotV2';
import type { EmulatorContractFixtureV1 } from '../../src/lib/contractInfrastructureEmulator';
export function infrastructureFixture(id: string): EmulatorContractFixtureV1 {
  const b = budgetFixture(id); b.estado = 'EMITIDO'; b.issuedAt = '2026-10-18T13:00:00.000Z';
  const selected=b.options.findIndex(o=>o.optionId==='option-1');
  const original=b.options[selected].referenceSnapshot;
  b.options[selected]=buildBudgetOptionV2('option-1',{draft:{...referenceSnapshotToDraft(original),descripcion:'Gestión de compra\nDescripción sintética'},fechaCotizacion:original.fechaCotizacion,source:'NEW_REFERENCE',referenceId:null});
  const a = buildAcceptance(b,{ budgetId:id, version:1, acceptedOptionId:'option-1', preferredPlanCuotas:12, commandId:'accept' },'synthetic-admin','2026-10-18T14:00:00.000Z');
  const d = newContractDraft(b,a,'synthetic-admin','2026-10-18T15:00:00.000Z');
  d.personalData = { fullName:'Persona sintética',dni:'12345678',address:'Domicilio ficticio',locality:'Localidad ficticia',province:'02',postalCode:'C1425ABC',email:'synthetic@example.test',whatsapp:'5491100000000' };
  d.economicTerms = contractEconomics(a.optionSnapshot.referenceSnapshot,8);
  d.firstInstallmentDueDate = '2026-12-15'; d.preferredMonthlyDueDay = 30;
  d.paymentScheduleDraft = contractSchedule(d.economicTerms,d.firstInstallmentDueDate,30);
  const h = contractValueHash('synthetic-package-not-legally-approved');
  const template = { templateId:'synthetic-template',templateVersion:'TEST_ONLY_V1',templateHash:h,rendererBundleId:'synthetic-renderer',rendererBundleHash:h,resourcesManifestHash:h,legalApprovalId:'SYNTHETIC_NOT_A_LEGAL_APPROVAL' };
  return {
    schemaVersion:'EMULATOR_CONTRACT_FIXTURE_V1',executionMode:'EMULATOR_ONLY',state:'EDITABLE',revision:d.revision,
    source:{ budget:b,acceptance:a,draft:d },
    legalContext:{
      issuer:{ profileId:'synthetic-profile',profileVersion:'TEST_ONLY_V1',profileHash:h,legalName:'ENTIDAD SINTÉTICA NO PRODUCTIVA',tradeName:'PRUEBA',taxId:'SYNTHETIC_NOT_A_TAX_ID',legalAddress:'Domicilio ficticio',representative:{ fullName:'Representante sintético',capacity:'SYNTHETIC_ROLE' } },
      documentContext:{ policyVersion:'TEST_ONLY_V1',contractIssueDate:'2026-10-19',contractIssuePlace:'Lugar sintético',promissoryNoteIssueDate:'2026-10-19',promissoryNoteIssuePlace:'Lugar sintético',parameterSchemaId:'SYNTHETIC_PARAMETERS_V1',parameters:{} },
      documentDefinitions:{ contract:{...template},promissoryNote:{...template,templateId:'synthetic-note'} },
    },
  };
}
export function fixtureIdentity(f: EmulatorContractFixtureV1): ContractIdentityV2 {
  const d = f.source.draft; return { budgetId:d.budgetId,budgetVersion:d.budgetVersion,contractDraftId:d.contractDraftId,acceptedOptionId:d.acceptedOptionId };
}
export function syntheticSnapshot(f = infrastructureFixture('snapshot-fixture'), sequence = '1') {
  const { budget:b,acceptance:a,draft:d } = f.source, identity = fixtureIdentity(f);
  const sourceDigest = contractValueHash({ source:f.source,legalContext:f.legalContext });
  return sealContractSnapshot({
    schemaVersion:'CONTRACT_SNAPSHOT_V2',currency:'ARS',contractId:contractIdentity(identity),contractSnapshotId:contractSnapshotId(identity),snapshotVersion:1,
    contractNumber:contractNumber(sequence),numbering:{ policyId:'CONTRACT_NUMBERING_V1',sequence },
    sourceDraft:{ ...identity,revision:d.revision,readyDigest:sourceDigest },
    origin:{ sourceCollection:a.sourceCollection,solicitudId:a.solicitudId,acceptedAt:a.acceptedAt,acceptedBy:a.acceptedBy,budgetHash:contractValueHash(b),acceptanceHash:contractValueHash(a),draftHash:contractValueHash(d),preferredPlanCuotas:a.preferredPlanCuotas,preferredPlanAmountSnapshot:a.preferredPlanAmountSnapshot },
    acceptedReference:d.acceptedReferenceSnapshot,personalDataVersion:PERSONAL_ADDRESS_VERSION,personalData:d.personalData as Required<typeof d.personalData>,
    addressInterpretation:{ jurisdictionCatalogVersion:PERSONAL_ADDRESS_VERSION,provinceDisplayName:provinceLabel(d.personalData.province!),postalPolicyVersion:'AR_POSTAL_STRUCTURE_V1' },
    employmentData:d.employmentData,economicTerms:d.economicTerms!,calculationPolicyVersion:'P5C_SHARED_C1_V1',roundingPolicy:'NEXT_90_V1',
    paymentSchedule:{ calendarPolicyVersion:'P5C_EXPLICIT_MONTH_CLAMP_V1',firstInstallmentDueDate:d.firstInstallmentDueDate!,preferredMonthlyDueDay:d.preferredMonthlyDueDay!,installments:d.paymentScheduleDraft },
    ...f.legalContext,
    freeze:{ state:'TERMS_FROZEN',preparedAt:d.preparedAt,readyAt:d.updatedAt,readyBy:d.updatedBy,termsFrozenAt:'2026-10-19T15:00:00.000Z',termsFrozenBy:'synthetic-admin',commandId:'freeze-test',readinessPolicyVersion:'EMULATOR_FIXTURE_ONLY_V1',provenanceManifestHash:sourceDigest },
  });
}
