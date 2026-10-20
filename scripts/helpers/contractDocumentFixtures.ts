import { infrastructureFixture,syntheticSnapshot } from './contractInfrastructureFixtures';
import { contractEconomics,contractSchedule } from '../../src/lib/contractV2';
import { reviewDocumentDefinitions } from '../../src/lib/contractDocuments/pdf';
export function documentReviewFixture(plan=18,description='Referencia de compra completamente sintética para revisión. No representa una operación real.'){
 const f=infrastructureFixture('synthetic-document-review');
 f.legalContext.documentDefinitions=reviewDocumentDefinitions();
 // The accepted description remains frozen; use the existing synthetic accepted reference.
 // Optional stress text is set before constructing both Budget and Acceptance copies.
 if(description){
  const selected=f.source.budget.options.find(o=>o.optionId===f.source.acceptance.acceptedOptionId)!;
  const reference={...selected.referenceSnapshot,descripcion:description.trim()};
  f.source.budget.options=f.source.budget.options.map(o=>o.optionId===selected.optionId?{...o,referenceSnapshot:reference}:o);
  f.source.acceptance={...f.source.acceptance,optionSnapshot:{...selected,referenceSnapshot:reference}};
  f.source.draft.acceptedReferenceSnapshot={...f.source.draft.acceptedReferenceSnapshot,descripcion:description.trim()};
 }
 f.source.draft.economicTerms=contractEconomics(f.source.acceptance.optionSnapshot.referenceSnapshot,plan);
 f.source.draft.paymentScheduleDraft=contractSchedule(f.source.draft.economicTerms,f.source.draft.firstInstallmentDueDate!,30);
 return syntheticSnapshot(f);
}
