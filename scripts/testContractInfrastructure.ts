import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { canonicalizeContract, contractValueHash, CONTRACT_CANONICALIZATION } from '../src/lib/contractIntegrityV2';
import { contractEconomics,contractSchedule } from '../src/lib/contractV2';
import { buildBudgetOptionV2 } from '../src/lib/budgetReferenceV2';
import { referenceSnapshotToDraft } from '../src/lib/budgetV2';
import { buildAcceptance } from '../src/lib/budgetAcceptanceV2';
import { newContractDraft } from '../src/lib/contractV2';
import { contractIdentity, contractNumber, contractSnapshotId, validateContractSnapshot, validateContractSnapshotSource, snapshotPayloadHash } from '../src/lib/contractSnapshotV2';
import { assertContractInfrastructureEmulator, createContractInfrastructureEmulator } from '../src/lib/contractInfrastructureEmulator';
import { infrastructureFixture, fixtureIdentity, syntheticSnapshot } from './helpers/contractInfrastructureFixtures';
const vector = '{"a":[null,true,2.5],"z":1}';
assert.equal(canonicalizeContract({z:1,a:[null,true,2.5]}),vector);
assert.equal(contractValueHash({z:1,a:[null,true,2.5]}),createHash('sha256').update(CONTRACT_CANONICALIZATION+'\0'+vector).digest('hex'));
assert.equal(contractValueHash({b:2,a:1}),contractValueHash({a:1,b:2}));
assert.notEqual(contractValueHash([1,2]),contractValueHash([2,1]));
assert.notEqual(contractValueHash(1),contractValueHash('1'));
assert.notEqual(contractValueHash({}),contractValueHash({value:null}));
assert.notEqual(contractValueHash('é'),contractValueHash('e\u0301')); // No silent Unicode rewriting.
const cycle:Record<string,unknown>={};cycle.self=cycle;
const sparse:unknown[]=[];sparse.length=1;
let getterInvoked=false;const getter={ get value(){getterInvoked=true;return 1;} };
const hidden=Object.defineProperty({},'hidden',{value:1});
for(const invalid of [undefined,NaN,Infinity,-Infinity,-0,BigInt(1),()=>1,Symbol('x'),new Date(),new Map(),cycle,sparse,getter,hidden,{v:undefined},[undefined],'\ud800',new Proxy({},{})])assert.throws(()=>canonicalizeContract(invalid));
assert.equal(getterInvoked,false);assert.throws(()=>canonicalizeContract({[Symbol('x')]:1}));
const id=fixtureIdentity(infrastructureFixture('budget-a'));
assert.equal(contractIdentity(id),contractIdentity({...id}));
assert.notEqual(contractIdentity(id),contractIdentity({...id,budgetId:'budget-b'}));
assert.notEqual(contractIdentity(id),contractIdentity({...id,acceptedOptionId:'option-2'}));
assert.notEqual(contractIdentity(id),contractIdentity({...id,budgetVersion:2,contractDraftId:'v2'}));
assert.throws(()=>contractIdentity({...id,contractDraftId:'other-v1'}));
assert.match(contractIdentity(id),/^cv2_[a-f0-9]{64}$/);assert.equal(contractSnapshotId(id),contractIdentity(id)+'_s1');
assert.equal(contractNumber('1'),'CH-000001');assert.equal(contractNumber('999999'),'CH-999999');assert.equal(contractNumber('1000000'),'CH-1000000');
for(const bad of ['0','01','-1','1.5','1e6',''])assert.throws(()=>contractNumber(bad));
const fixture=infrastructureFixture('pure-model'),before=canonicalizeContract(fixture),snapshot=syntheticSnapshot(fixture);
assert.ok(snapshot.acceptedReference.descripcion.includes('\n'));
validateContractSnapshotSource(fixture.source);validateContractSnapshot(snapshot);assert.equal(canonicalizeContract(fixture),before);
assert.equal(snapshot.integrity.payloadHash,snapshotPayloadHash(snapshot));
assert.equal(snapshot.origin.acceptedBy,fixture.source.acceptance.acceptedBy);
assert.deepEqual(snapshot.acceptedReference.planesOfrecidos,fixture.source.acceptance.optionSnapshot.referenceSnapshot.planesOfrecidos);
assert.deepEqual(snapshot.employmentData,{cuil:'',employerOrWorkName:'',workAddress:''});
for(const field of ['fullName','dni','address','locality','province','postalCode','email','whatsapp']){
 const s=structuredClone(snapshot);Reflect.deleteProperty(s.personalData,field);assert.throws(()=>validateContractSnapshot(s));
}
for(const mutate of [
 (s:typeof snapshot)=>{s.economicTerms.capitalAmount=1;},
 (s:typeof snapshot)=>{s.economicTerms.contractTotal++;},
 (s:typeof snapshot)=>{s.paymentSchedule.installments[1].dueDate='2027-02-01';},
 (s:typeof snapshot)=>{s.personalData.postalCode='bad';},
 (s:typeof snapshot)=>{s.personalData.province='99';},
 (s:typeof snapshot)=>{s.employmentData.cuil='not-a-cuil';},
 (s:typeof snapshot)=>{s.contractNumber='CH-999999';},
 (s:typeof snapshot)=>{s.documentDefinitions.contract.templateHash='not-a-hash';},
 (s:typeof snapshot)=>{Object.assign(s,{anticipo:1});},
 (s:typeof snapshot)=>{Object.assign(s.personalData,{guarantor:'forbidden'});},
]){const s=structuredClone(snapshot);mutate(s);s.integrity.payloadHash=snapshotPayloadHash(s);assert.throws(()=>validateContractSnapshot(s));}
for(let n=1;n<=18;n++){
 const f=infrastructureFixture('all-plans-'+n),d=f.source.draft;
 d.economicTerms=contractEconomics(f.source.acceptance.optionSnapshot.referenceSnapshot,n);d.paymentScheduleDraft=contractSchedule(d.economicTerms,d.firstInstallmentDueDate!,d.preferredMonthlyDueDay!);
 validateContractSnapshotSource(f.source);validateContractSnapshot(syntheticSnapshot(f));
}
const decimals=infrastructureFixture('decimal-capital');
const option=decimals.source.budget.options[0],ref=option.referenceSnapshot;
decimals.source.budget.options[0]=buildBudgetOptionV2(option.optionId,{draft:{...referenceSnapshotToDraft(ref),costoProveedor:'580000.5'},fechaCotizacion:ref.fechaCotizacion,source:'NEW_REFERENCE',referenceId:null});
decimals.source.acceptance=buildAcceptance(decimals.source.budget,{budgetId:decimals.source.budget.id,version:1,acceptedOptionId:option.optionId,preferredPlanCuotas:12,commandId:'decimal-accept'},'synthetic-admin','2026-10-18T14:00:00.000Z');
const personal=decimals.source.draft.personalData;
const decimalDraft=newContractDraft(decimals.source.budget,decimals.source.acceptance,'synthetic-admin','2026-10-18T15:00:00.000Z');
decimalDraft.personalData=personal;decimalDraft.economicTerms=contractEconomics(decimals.source.acceptance.optionSnapshot.referenceSnapshot,8);decimalDraft.firstInstallmentDueDate='2026-12-15';decimalDraft.preferredMonthlyDueDay=30;decimalDraft.paymentScheduleDraft=contractSchedule(decimalDraft.economicTerms,decimalDraft.firstInstallmentDueDate,30);decimals.source.draft=decimalDraft;
const decimalSnapshot=syntheticSnapshot(decimals);assert.equal(decimalSnapshot.economicTerms.capitalAmount,580000.5);assert.deepEqual(decimalSnapshot.economicTerms,decimalDraft.economicTerms);
validateContractSnapshotSource(decimals.source);validateContractSnapshot(decimalSnapshot);
assert.equal(snapshot.currency,'ARS');
const tampered=structuredClone(snapshot);tampered.personalData.address='Otro domicilio';assert.throws(()=>validateContractSnapshot(tampered));
assert.equal(snapshot.integrity.payloadHash,snapshotPayloadHash({...snapshot,integrity:{...snapshot.integrity,payloadHash:'a'.repeat(64)}}));
const safe:NodeJS.ProcessEnv={NODE_ENV:'test',GCLOUD_PROJECT:'demo-cuenta-hogar',NEXT_PUBLIC_FIREBASE_PROJECT_ID:'demo-cuenta-hogar',FIRESTORE_EMULATOR_HOST:'127.0.0.1:8080',FIREBASE_AUTH_EMULATOR_HOST:'127.0.0.1:9099'};
assertContractInfrastructureEmulator(safe);
for(const override of [{NODE_ENV:'production'},{GCLOUD_PROJECT:'negocio-facil-page'},{NEXT_PUBLIC_FIREBASE_PROJECT_ID:'negocio-facil-page'},{GOOGLE_CLOUD_PROJECT:'other'},{FIRESTORE_EMULATOR_HOST:undefined},{FIRESTORE_EMULATOR_HOST:'firestore.googleapis.com:443'},{FIREBASE_AUTH_EMULATOR_HOST:undefined},{GOOGLE_APPLICATION_CREDENTIALS:'not-read'},{FIREBASE_PRIVATE_KEY:'not-read'},{K_SERVICE:'cloud-runtime'},{FIREBASE_CONFIG:'not-read'}])assert.throws(()=>assertContractInfrastructureEmulator({...safe,...override}));
const original=process.env.NODE_ENV;Object.assign(process.env,{NODE_ENV:'production'});try{assert.throws(()=>createContractInfrastructureEmulator());}finally{if(original===undefined)Reflect.deleteProperty(process.env,'NODE_ENV');else Object.assign(process.env,{NODE_ENV:original});}
// No application entry point wires this technical-only module into routes, actions or UI.
function scan(dir:string){for(const item of readdirSync(dir,{withFileTypes:true})){const path=join(dir,item.name);if(item.isDirectory())scan(path);else if(/\.[cm]?[jt]sx?$/.test(item.name))assert.ok(!/contractInfrastructureEmulator|contractSnapshotV2|contractIntegrityV2/.test(readFileSync(path,'utf8')),`Infrastructure unexpectedly connected: ${path}`);}}
scan('src/app');scan('src/components');
console.log('CONTRACT_INFRASTRUCTURE_MODEL = PASS');
console.log('CONTRACT_CANONICALIZATION_AND_INTEGRITY = PASS');
console.log('PRODUCTIVE_FREEZE_BLOCK = PASS; PUBLIC_OR_ADMIN_INTEGRATIONS = 0');
