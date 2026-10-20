import assert from 'node:assert/strict';
import { infrastructureFixture } from './helpers/contractInfrastructureFixtures';
import { buildReadyEvidence, validateReadySource, verifyReadyEvidence, reviewedTerms } from '../src/lib/contractReadyV2';
import { contractEconomics, contractSchedule, personalFields } from '../src/lib/contractV2';
import { contractValueHash } from '../src/lib/contractIntegrityV2';
const f=infrastructureFixture('ready-model'),{budget:b,acceptance:a,draft:d}=f.source;
const before=JSON.stringify(f),now='2026-10-19T18:00:00.000Z';
validateReadySource(b,a,d);
const evidence=buildReadyEvidence(b,a,d,'admin-reviewer',now,'ready-1');
const ready={...d,status:'READY_TO_FORMALIZE' as const,revision:d.revision+1,updatedAt:now,updatedBy:'admin-reviewer',readyEvidenceId:'ready-1'};
verifyReadyEvidence(b,a,ready,evidence);
assert.equal(evidence.termsDigest,contractValueHash(reviewedTerms(d)));
assert.equal(evidence.legalTemplateReviewRequired,true);
assert.equal(JSON.stringify(f),before);
assert.ok(!JSON.stringify(evidence).includes(d.personalData.fullName));
assert.ok(!JSON.stringify(evidence).includes(d.personalData.address));
for(const field of personalFields){const bad=structuredClone(d);bad.personalData[field]='';assert.throws(()=>validateReadySource(b,a,bad));}
const mutations:Array<(bad:typeof d)=>void>=[
 x=>{x.employmentData.cuil='bad';},x=>{x.personalData.province='99';},x=>{x.personalData.postalCode='123';},
 x=>{x.acceptedOptionId='other';},x=>{x.acceptedReferenceSnapshot={...x.acceptedReferenceSnapshot,nombre:'Other'};},
 x=>{x.economicTerms!.capitalAmount++;},x=>{x.economicTerms!.factorSnapshot++;},x=>{x.economicTerms!.roundingAdjustment++;},
 x=>{x.economicTerms!.serviceAmount++;},x=>{x.economicTerms!.contractTotal++;},x=>{x.economicTerms!.contractPlanCuotas=19;},
 x=>{x.firstInstallmentDueDate='2027-02-29';},x=>{x.preferredMonthlyDueDay=32;},
 x=>{x.paymentScheduleDraft.pop();},x=>{x.paymentScheduleDraft[1].installmentNumber=1;},
 x=>{x.paymentScheduleDraft[1].dueDate='2027-01-31';},x=>{x.paymentScheduleDraft[0].amount++;},
 x=>{Object.assign(x,{guarantor:{name:'forbidden'}});},x=>{Object.assign(x,{advanceAmount:1});},
];
for(const mutate of mutations){const bad=structuredClone(d);mutate(bad);assert.throws(()=>validateReadySource(b,a,bad));}
assert.throws(()=>validateReadySource({...b,estado:'GENERADO'},a,d));
assert.throws(()=>validateReadySource(b,{...a,budgetId:'different'},d));
for(let n=1;n<=18;n++){const copy=structuredClone(d);copy.economicTerms=contractEconomics(a.optionSnapshot.referenceSnapshot,n);copy.paymentScheduleDraft=contractSchedule(copy.economicTerms,copy.firstInstallmentDueDate!,copy.preferredMonthlyDueDay!);validateReadySource(b,a,copy);}
for(const mutate of [(x:typeof ready)=>{x.personalData.address='Changed';},(x:typeof ready)=>{x.revision++;},(x:typeof ready)=>{x.updatedBy='other';}]){const x=structuredClone(ready);mutate(x);assert.throws(()=>verifyReadyEvidence(b,a,x,evidence));}
assert.throws(()=>verifyReadyEvidence(b,a,ready,{...evidence,readinessPolicyVersion:'EMULATOR_FIXTURE_ONLY_V1'} as unknown as typeof evidence));
console.log('READY_MODEL_INTEGRAL_GUARD = PASS; READY_EVIDENCE_INTEGRITY = PASS; LEGAL_TEMPLATE_REVIEW_REQUIRED = YES');
