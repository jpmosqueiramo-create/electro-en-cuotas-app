import assert from 'node:assert/strict';
import { mkdirSync,writeFileSync } from 'node:fs';
import { infrastructureFixture } from './helpers/contractInfrastructureFixtures';
import { projectOperationDraft } from '../src/lib/contractDocuments/operationDraft';
import { generateOperationDraftPair } from '../src/lib/contractDocuments/operationDraftPdf';
import { amountWords } from '../src/lib/contractDocuments/amountWords';
import { contractLegalEntity } from '../src/lib/contractDocuments/legalEntity';
import { contractEconomics,contractSchedule } from '../src/lib/contractV2';
import { contractValueHash } from '../src/lib/contractIntegrityV2';
const folder='/tmp/cuenta-hogar-operation-documents';mkdirSync(folder,{recursive:true});
for(let n=1;n<=18;n++){
 const {budget:b,acceptance:a,draft:d}=infrastructureFixture('draft-doc-'+n).source;
 d.employmentData.cuil='20-12345678-6';
 d.economicTerms=contractEconomics(a.optionSnapshot.referenceSnapshot,n);d.paymentScheduleDraft=contractSchedule(d.economicTerms,d.firstInstallmentDueDate!,30);
 const before=contractValueHash({b,a,d}),p=projectOperationDraft(b,a,d,false,false),pair=generateOperationDraftPair(p);
 assert.equal(p.economics!.total,d.economicTerms.contractTotal);assert.deepEqual(p.schedule,d.paymentScheduleDraft);assert.equal(p.number,null);assert.equal(p.issuer.taxId,'30-71962686-2');assert.equal(p.issuer.legalName,'LOOP GESTIÓN INTEGRAL S.R.L.');assert.equal(p.issuer.tradeName,'Cuenta Hogar');assert.equal(p.issuer.legalAddress,'Caracas 1101, Ciudad Autónoma de Buenos Aires, CP 1431');assert.deepEqual(p.issuer,contractLegalEntity);assert.ok(Object.isFrozen(contractLegalEntity));assert.ok(p.pending.some(x=>x.label.includes('Representación societaria y facultades de firma')));assert.ok(p.pending.some(x=>x.label.includes('jurisdicción')));assert.ok(!p.pending.some(x=>x.label.includes('Domicilio legal y representación')));assert.equal(p.legalApproval,'PENDING');assert.equal(pair.promissoryNote.pages,1);
 assert.equal(before,contractValueHash({b,a,d}));assert.equal(pair.mandate.sha256,generateOperationDraftPair(p).mandate.sha256);
 if(n===18){writeFileSync(folder+'/mandato.pdf',Buffer.from(pair.mandate.base64,'base64'));writeFileSync(folder+'/pagare.pdf',Buffer.from(pair.promissoryNote.base64,'base64'));writeFileSync(folder+'/projection.json',JSON.stringify(p,null,2));writeFileSync(folder+'/manifest.json',JSON.stringify({templateVersion:pair.templateVersion,templateHash:pair.templateHash,rendererHash:pair.rendererHash,sourceHash:p.sourceHash,projectionHash:p.projectionHash,artifacts:{mandate:{sha256:pair.mandate.sha256,pages:pair.mandate.pages},promissoryNote:{sha256:pair.promissoryNote.sha256,pages:pair.promissoryNote.pages}}},null,2));}
 const blocked=projectOperationDraft(b,a,d,true,false);assert.equal(blocked.canPreview,false);assert.throws(()=>generateOperationDraftPair(blocked));assert.throws(()=>generateOperationDraftPair(projectOperationDraft(b,a,d,false,true)));
 const invalid=structuredClone(d);invalid.paymentScheduleDraft[0].amount++;assert.throws(()=>projectOperationDraft(b,a,invalid,false,false));
 const missing=structuredClone(d);missing.personalData.province='';missing.economicTerms=null;missing.paymentScheduleDraft=[];const partial=projectOperationDraft(b,a,missing,false,false);assert.ok(partial.pending.some(x=>x.label==='Provincia'));assert.ok(partial.pending.some(x=>x.section==='schedule'));generateOperationDraftPair(partial);
 const different=structuredClone(a);different.budgetId='other';assert.throws(()=>projectOperationDraft(b,different,d,false,false));
 const amended=structuredClone(d);amended.revision++;amended.personalData.address='Otro domicilio ficticio';assert.notEqual(projectOperationDraft(b,a,amended,false,false).sourceHash,p.sourceHash);
}
for(const [n,s] of [[0,'CERO PESOS CON 00/100'],[1,'UN PESO CON 00/100'],[21,'VEINTIUN PESOS CON 00/100'],[1000000,'UN MILLÓN DE PESOS CON 00/100'],[1200100,'UN MILLÓN DOSCIENTOS MIL CIEN PESOS CON 00/100'],[1000000000000,'UN BILLÓN DE PESOS CON 00/100']] as const)assert.equal(amountWords(n),s);
assert.throws(()=>amountWords(1.1));assert.doesNotThrow(()=>amountWords(Number.MAX_SAFE_INTEGER));
const fractional=infrastructureFixture('fractional').source;
const ref={...fractional.acceptance.optionSnapshot.referenceSnapshot,costoProveedorSnapshot:580000.125};
fractional.budget.options=fractional.budget.options.map(o=>o.optionId===fractional.acceptance.acceptedOptionId?{...o,referenceSnapshot:ref}:o);
fractional.acceptance.optionSnapshot={...fractional.acceptance.optionSnapshot,referenceSnapshot:ref};fractional.draft.acceptedReferenceSnapshot={...fractional.draft.acceptedReferenceSnapshot,costoProveedorSnapshot:ref.costoProveedorSnapshot};fractional.draft.economicTerms=contractEconomics(ref,8);fractional.draft.paymentScheduleDraft=contractSchedule(fractional.draft.economicTerms,fractional.draft.firstInstallmentDueDate!,30);
const fractionalProjection=projectOperationDraft(fractional.budget,fractional.acceptance,fractional.draft,false,false);assert.equal(fractionalProjection.economics!.capital,580000.125);
const fractionalPair=generateOperationDraftPair(fractionalProjection);writeFileSync(folder+'/fractional-mandate.pdf',Buffer.from(fractionalPair.mandate.base64,'base64'));
const tampered=structuredClone(fractional.draft);tampered.economicTerms!.capitalAmount++;tampered.economicTerms!.serviceAmount--;assert.throws(()=>projectOperationDraft(fractional.budget,fractional.acceptance,tampered,false,false));
console.log('OPERATION_DRAFT_DOCUMENTS_UNIT=PASS; PLANS=1..18; SAME_PERSISTED_PROJECTION; NO_WRITES; PARTIAL_FIELDS; IDENTITY_CONFORMITY_BLOCK; DETERMINISTIC_PDF');
