import './helpers/requireSafeEmulatorEnvironment';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {admin} from '../src/lib/firebaseAdmin';
import {persistReadyContract} from './helpers/contractFreezeFixtures';
import {createDocumentationCase} from '../src/lib/budgetAcceptanceV2';
import {operationFromAcceptance,operationRef} from '../src/lib/operationV2';
import {contractCommand} from '../src/lib/contractV2Server';
import {readProductionReadiness} from '../src/lib/productionReadinessV2Server';
import {GET} from '../src/app/api/admin/presupuestos-v2/[budgetId]/versions/[version]/production-readiness/route';
import {legalRegistryRef} from '../src/lib/legalApprovalV2Server';
import {contractValueHash} from '../src/lib/contractIntegrityV2';
const db=admin.firestore(),results:Record<string,string>={};
const pass=(s:string)=>{results[s]='PASS';console.log(s+'=PASS');};
async function main(){
 assert.equal(process.env.GCLOUD_PROJECT,'demo-cuenta-hogar');assert.equal(process.env.NEXT_PUBLIC_ADMIN_EMAIL,'production-review-admin@example.test');
 const f=await persistReadyContract(db,'production-readiness-'+randomUUID(),false,12);
 await operationRef(db,f.id,1).set(operationFromAcceptance(f.a));await f.r.family.collection('documentation').doc('1').set(createDocumentationCase(f.a));
 const refs=[f.r.budget,f.r.acceptance,f.r.draft,...(await f.r.draft.collection('commands').get()).docs.map(d=>d.ref),...(await f.r.draft.collection('readyReviews').get()).docs.map(d=>d.ref)];
 const before=await Promise.all(refs.map(r=>r.get()));
 const first=await readProductionReadiness(db,f.id,1),second=await readProductionReadiness(db,f.id,1);
 assert.equal(first.items.find(i=>i.key==='ORIGIN')?.state,'PENDING');assert.equal(first.digest,second.digest);assert.equal(first.finalIssuanceEnabled,false);assert.equal(first.productionFinancialEnabled,false);
 assert.deepEqual(first.items.map(i=>i.key),['ORIGIN','PERSONAL','EMPLOYMENT','ECONOMICS','SCHEDULE']);assert.equal(f.d.lastClientSubmissionAppliedAt,null);assert.equal(first.items.find(i=>i.key==='PERSONAL')?.state,'READY');assert.equal(first.items.find(i=>i.key==='EMPLOYMENT')?.state,'READY');
 assert.equal(first.items.find(i=>i.key==='SCHEDULE')?.state,'READY');pass('FIVE_STEPS_MANUAL_PERSONAL_DATA_RECOGNIZED_WITHOUT_CLIENT_FORM');
 for(let i=0;i<refs.length;i++){const after=await refs[i].get();assert(after.updateTime!.isEqual(before[i].updateTime!));assert.equal(contractValueHash(after.data()),contractValueHash(before[i].data()));}pass('REPEATED_READ_NO_DOCUMENT_DIGEST_OR_TIMESTAMP_CHANGE');
 const u=await admin.auth().createUser({email:process.env.NEXT_PUBLIC_ADMIN_EMAIL,emailVerified:true});
 const other=await admin.auth().createUser({email:'production-review-outsider@example.test',emailVerified:true});
 async function token(uid:string){const custom=await admin.auth().createCustomToken(uid);const r=await fetch('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=demo-key',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token:custom,returnSecureToken:true})});assert.equal(r.status,200);return (await r.json()).idToken as string;}
 const auth=await token(u.uid),alien=await token(other.uid),params={params:Promise.resolve({budgetId:f.id,version:'1'})};
 const req=(t?:string)=>new Request('http://localhost/api/production-readiness',{headers:t?{Authorization:'Bearer '+t}:{}});
 assert.equal((await GET(req(),params)).status,401);assert.equal((await GET(req(alien),params)).status,403);
 const ok=await GET(req(auth),params);assert.equal(ok.status,200);assert.equal(ok.headers.get('cache-control'),'private, no-store');const body=await ok.text();for(const privateValue of [f.d.personalData.fullName,f.d.personalData.dni,f.d.personalData.address])assert(!body.includes(privateValue));pass('ADMIN_ONLY_NO_PERSONAL_PAYLOAD_PRIVATE_CACHE');
 await admin.auth().updateUser(u.uid,{emailVerified:false});assert.equal((await GET(req(auth),params)).status,403);await admin.auth().updateUser(u.uid,{emailVerified:true,disabled:true});assert.equal((await GET(req(auth),params)).status,401);pass('STALE_TOKEN_CANNOT_BYPASS_UNVERIFIED_OR_DISABLED_AUTH');
 await admin.auth().updateUser(u.uid,{disabled:false});
 await f.r.draft.collection('conformity').doc('current').update({confirmedDigest:'0'.repeat(64)});const stale=await readProductionReadiness(db,f.id,1);assert.equal(stale.items.find(i=>i.key==='ORIGIN')?.state,'PENDING');assert.notEqual(first.digest,stale.digest);pass('CONFORMITY_CHANGE_INVALIDATES_ASSESSMENT');
 const original=structuredClone(f.d.paymentScheduleDraft),changed=structuredClone(original);changed[0].dueDate='2030-01-01';await f.r.draft.update({paymentScheduleDraft:changed});const broken=await readProductionReadiness(db,f.id,1);assert.equal(broken.items.find(i=>i.key==='SCHEDULE')?.state,'PENDING');assert.equal(broken.items.length,5);await f.r.draft.update({paymentScheduleDraft:original});pass('SAME_SUM_WRONG_DATES_DO_NOT_COUNT_AS_VALID_SCHEDULE');
 await operationRef(db,f.id,1).update({operationId:'op_'+'0'.repeat(64)});await assert.rejects(readProductionReadiness(db,f.id,1),/IDENTITY_CONFLICT/);await operationRef(db,f.id,1).set(operationFromAcceptance(f.a));pass('CROSS_OPERATION_IDENTITY_REJECTED');
 const back=await contractCommand(db,f.id,1,{action:'RETURN_TO_DRAFT',commandId:randomUUID(),expectedRevision:f.d.revision,reason:'Corrección sintética de prueba'},'synthetic-admin-a');assert.equal((await readProductionReadiness(db,f.id,1)).revision,back.draft.revision);pass('READ_REVISION_AFTER_RETURN_TO_DRAFT');
 // No immutable infrastructure or legal registry created by any assessment.
 for(const root of ['contractSnapshotsV2','contractNumbersV2','contractInfrastructureCommandsV2'])assert.equal((await db.collection(root).get()).size,0);
 assert.equal((await legalRegistryRef(db).collection('records').get()).size,0);pass('NO_NUMBER_SNAPSHOT_APPROVAL_OR_PAYMENT_SIDE_EFFECTS');
 console.log(JSON.stringify({suite:'PRODUCTION_READINESS_EMULATOR',count:Object.keys(results).length,results,productionWrites:0}));
}
main().then(()=>admin.app().delete()).catch(e=>{console.error(e instanceof Error?e.stack:e);process.exitCode=1;});
