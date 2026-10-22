import assert from 'node:assert/strict';
import { readdirSync,readFileSync } from 'node:fs';
import { join } from 'node:path';
import { infrastructureFixture,syntheticSnapshot } from './helpers/contractInfrastructureFixtures';
import { buildReadyEvidence,reviewedTerms } from '../src/lib/contractReadyV2';
import { contractValueHash } from '../src/lib/contractIntegrityV2';
import { sealContractSnapshot,validateContractSnapshot,snapshotPayloadHash } from '../src/lib/contractSnapshotV2';
import { contractEconomics,contractSchedule } from '../src/lib/contractV2';
import { createContractFreezeIntegrationEmulator } from '../src/lib/contractFreezeIntegrationEmulator';
const f=infrastructureFixture('c1-model'),old=syntheticSnapshot(f),{budget:b,acceptance:a,draft:d}=f.source;
validateContractSnapshot(old); // historical variant remains valid, unchanged.
const now='2026-10-19T18:00:00.000Z',ready=buildReadyEvidence(b,a,d,'synthetic-admin-a',now,'ready');
const {integrity:_old,...input}=old;void _old;
const snapshot=sealContractSnapshot({...input,sourceDraft:{...input.sourceDraft,revision:ready.draftRevision,readyDigest:ready.termsDigest},freeze:{...input.freeze,readyAt:ready.reviewedAt,readyBy:ready.reviewedBy,readinessPolicyVersion:'CONTRACT_TECHNICAL_REVIEW_V1',integrationPolicyVersion:'READY_FREEZE_EMULATOR_V1',executionMode:'EMULATOR_ONLY',readyEvidenceId:ready.commandId,readyEvidenceHash:contractValueHash(ready),dependenciesHash:contractValueHash(f.legalContext),legalTemplateReviewRequired:true}});
assert.equal(snapshot.sourceDraft.readyDigest,contractValueHash(reviewedTerms(d)));
assert.deepEqual(snapshot.paymentSchedule.installments,d.paymentScheduleDraft);
for(const mutate of [
 (s:typeof snapshot)=>{s.sourceDraft.readyDigest='0'.repeat(64);},
 (s:typeof snapshot)=>{Object.assign(s.freeze,{executionMode:'PRODUCTION'});},
 (s:typeof snapshot)=>{Object.assign(s.freeze,{integrationPolicyVersion:'unknown'});},
 (s:typeof snapshot)=>{Object.assign(s.freeze,{legalTemplateReviewRequired:false});},
 (s:typeof snapshot)=>{Object.assign(s,{guarantor:{name:'forbidden'}});},
 (s:typeof snapshot)=>{s.personalData.postalCode='bad';},
 (s:typeof snapshot)=>{s.economicTerms.capitalAmount++;},
 (s:typeof snapshot)=>{s.paymentSchedule.installments[0].amount++;},
]){const copy=structuredClone(snapshot);mutate(copy);copy.integrity.payloadHash=snapshotPayloadHash(copy);assert.throws(()=>validateContractSnapshot(copy));}
const c1Freeze=snapshot.freeze;if(c1Freeze.readinessPolicyVersion!=='CONTRACT_TECHNICAL_REVIEW_V1')throw Error('Expected new policy');
for(let n=1;n<=18;n++){
 const f=infrastructureFixture(`c1-plan-${n}`),d=f.source.draft;
 d.economicTerms=contractEconomics(f.source.acceptance.optionSnapshot.referenceSnapshot,n);d.paymentScheduleDraft=contractSchedule(d.economicTerms,d.firstInstallmentDueDate!,d.preferredMonthlyDueDay!);
 const old=syntheticSnapshot(f),review=buildReadyEvidence(f.source.budget,f.source.acceptance,d,'synthetic-admin-a',now,'ready');
 const {integrity:_hash,...payload}=old;void _hash;
 validateContractSnapshot(sealContractSnapshot({...payload,sourceDraft:{...payload.sourceDraft,revision:review.draftRevision,readyDigest:review.termsDigest},freeze:{...c1Freeze,readyEvidenceHash:contractValueHash(review)}}));
}
// Quantity/condition entered in Etapa 1 participate in READY and must survive
// the isolated freeze. Never remove them to force the historical digest to match.
const originalHistorical=JSON.stringify(old),historicalHash=old.integrity.payloadHash;
for(const productDetails of [{quantity:1,condition:'NEW'},{quantity:null,condition:null}] as const){
 const productDraft={...d,productDetails},review=buildReadyEvidence(b,a,productDraft,'synthetic-admin-a',now,'product-ready');
 const {integrity:_hash,...payload}=snapshot;void _hash;
 const withProduct=sealContractSnapshot({...payload,productDetails,sourceDraft:{...payload.sourceDraft,readyDigest:review.termsDigest},freeze:{...c1Freeze,readyEvidenceId:review.commandId,readyEvidenceHash:contractValueHash(review)}});
 assert.deepEqual(withProduct.productDetails,productDetails);assert.equal(withProduct.sourceDraft.readyDigest,contractValueHash(reviewedTerms(productDraft)));
 const {integrity:_integrity,...sealedPayload}=withProduct;void _integrity;
 assert.throws(()=>sealContractSnapshot({...sealedPayload,productDetails:{quantity:2,condition:'USED'}}),/CONTRACT_READY_TERMS_MISMATCH/);
 const {productDetails:_omitted,...withoutProduct}=sealedPayload;void _omitted;
 assert.throws(()=>sealContractSnapshot(withoutProduct),/CONTRACT_READY_TERMS_MISMATCH/);
 assert.throws(()=>sealContractSnapshot({...sealedPayload,productDetails:{quantity:0,condition:'NEW'}}));
 assert.throws(()=>sealContractSnapshot({...sealedPayload,freeze:input.freeze}),/PRODUCT_DETAILS_REQUIRE_TECHNICAL_EMULATOR_REVIEW/);
}
validateContractSnapshot(old);assert.equal(JSON.stringify(old),originalHistorical);assert.equal(old.integrity.payloadHash,historicalHash);
console.log('SNAPSHOT_OPTIONAL_PRODUCT_DETAILS_READY_DIGEST = PASS; HISTORICAL_PAYLOAD_AND_HASH_UNCHANGED = PASS');
const mode=process.env.NODE_ENV;try{Object.assign(process.env,{NODE_ENV:'production'});assert.throws(()=>createContractFreezeIntegrationEmulator());}finally{if(mode===undefined)Reflect.deleteProperty(process.env,'NODE_ENV');else Object.assign(process.env,{NODE_ENV:mode});}
function scan(dir:string){for(const file of readdirSync(dir,{withFileTypes:true})){const path=join(dir,file.name);if(file.isDirectory())scan(path);else if(/\.[jt]sx?$/.test(file.name))assert.ok(!readFileSync(path,'utf8').includes('contractFreezeIntegrationEmulator'),`Productive freeze import: ${path}`);}}
scan('src/app');scan('src/components');
const dispatcher=readFileSync('src/lib/contractV2Server.ts','utf8');assert.ok(!dispatcher.includes('FREEZE_READY_EMULATOR'));assert.ok(!dispatcher.includes('TERMS_FROZEN'));
console.log('C1_SNAPSHOT_COMPATIBILITY_AND_REAL_READY_POLICY = PASS; C1_PRODUCTIVE_PATHS = 0');
