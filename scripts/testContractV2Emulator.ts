import './helpers/requireSafeEmulatorEnvironment';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { NextRequest } from 'next/server';
import { admin } from '../src/lib/firebaseAdmin';
import { contractCommand,contractRefs,getContract,publicContractData,unavailable } from '../src/lib/contractV2Server';
import { fixture,addressPayload as clientPayload } from './testContractV2';
import * as pub from '../src/app/api/public/contract-data/[requestId]/route';
import * as api from '../src/app/api/admin/presupuestos-v2/[budgetId]/versions/[version]/contract/route';
import { PERSONAL_ADDRESS_VERSION } from '../src/lib/contractAddress';
import { addressCompatibilityTests } from './testContractAddressCompatibility';
import { ADMIN_EMAIL } from '../src/lib/adminAuth';
async function main(){
 const db=admin.firestore(),id=`p5c-${Date.now()}`,r=contractRefs(db,id,1),{b,a}=fixture(id);
 await assert.rejects(()=>contractCommand(db,id,1,{action:'OPEN_OR_CREATE',commandId:'missing'},'admin'));
 await r.budget.set(b);await r.acceptance.set(a);
 const docs=db.doc(`presupuestos_v2/${id}/documentation/1`);await docs.set({marker:'PRIVATE_P4'});
 const original=JSON.stringify((await r.budget.get()).data()),accept=JSON.stringify((await r.acceptance.get()).data());
 const [result,concurrentOpen]=await Promise.all(['open','open-second'].map(commandId=>contractCommand(db,id,1,{action:'OPEN_OR_CREATE',commandId},'admin')));let d=result.draft;
 assert.equal(concurrentOpen.draft.contractDraftId,d.contractDraftId);assert.equal((await r.family.collection('contracts').get()).size,1);console.log('P5C_CONCURRENT_OPEN_OR_CREATE = PASS');
 assert.deepEqual((await contractCommand(db,id,1,{action:'OPEN_OR_CREATE',commandId:'open'},'admin')).draft,d);
 await Promise.all([contractCommand(db,id,1,{action:'OPEN_OR_CREATE',commandId:'parallel1'},'admin'),contractCommand(db,id,1,{action:'OPEN_OR_CREATE',commandId:'parallel2'},'admin')]);assert.equal((await r.family.collection('contracts').get()).size,1);
 const update=async(action:string,extra:Record<string,unknown>={})=>{const out=await contractCommand(db,id,1,{action,commandId:crypto.randomUUID(),expectedRevision:d.revision,...extra},'admin');d=out.draft;return out;};
 await assert.rejects(()=>contractCommand(db,id,1,{action:'SET_CONTRACT_PLAN',contractPlanCuotas:8,expectedRevision:0,commandId:'stale'},'admin'));
 await assert.rejects(()=>contractCommand(db,id,2,{action:'OPEN_OR_CREATE',commandId:'wrongversion'},'admin'));
 for(const extra of [{factor:2.5},{capitalAmount:1},{contractTotal:1}])await assert.rejects(()=>contractCommand(db,id,1,{action:'SET_CONTRACT_PLAN',contractPlanCuotas:8,expectedRevision:d.revision,commandId:'override',...extra},'admin'));
 const casRevision=d.revision;
 const cas=await Promise.allSettled([8,12].map(n=>contractCommand(db,id,1,{action:'SET_CONTRACT_PLAN',contractPlanCuotas:n,expectedRevision:casRevision,commandId:`cas-${n}`},'admin')));
 assert.equal(cas.filter(x=>x.status==='fulfilled').length,1);assert.equal(cas.filter(x=>x.status==='rejected').length,1);
 d=(await r.draft.get()).data() as typeof d;assert.equal(d.revision,casRevision+1);console.log('P5C_CONCURRENT_DRAFT_CAS = PASS');
 await update('SET_CONTRACT_PLAN',{contractPlanCuotas:8});assert.equal(d.economicTerms!.factorSnapshot,2.31);
 await update('UPDATE_PERSONAL_DATA',{personalData:clientPayload.personalData});await update('UPDATE_EMPLOYMENT_DATA',{employmentData:clientPayload.employmentData});
 await update('SET_PAYMENT_DATES',{firstInstallmentDueDate:'2026-12-15',preferredMonthlyDueDay:30});assert.equal(d.paymentScheduleDraft[2].dueDate,'2027-02-28');
 console.log('P5C_PERSISTENCE_EMULATOR = PASS');
 const first=await update('CREATE_CLIENT_DATA_REQUEST');assert.ok('secret' in first&&first.secret);const firstId=d.activeClientDataRequestId!;
 const second=await update('CREATE_CLIENT_DATA_REQUEST');assert.ok('secret' in second&&second.secret);const token=second.secret!,reqId=d.activeClientDataRequestId!,rr=r.draft.collection('requests').doc(reqId);
 assert.equal(Buffer.from(token,'base64url').length,32);assert.equal((await r.draft.collection('requests').doc(firstId).get()).data()!.status,'REVOKED');
 const record=(await rr.get()).data()!;assert.equal(Date.parse(record.expiresAt)-Date.parse(record.createdAt),7*86400000);assert.equal(record.tokenHash.length,64);assert.ok(record.tokenHash!==token);assert.ok(record.tokenHash===createHash('sha256').update(token).digest('hex'),'SHA256 mismatch');console.log('TOKEN_HASH_STORED = YES; TOKEN_HASH_MATCHES_SHA256 = YES');assert.ok(!JSON.stringify((await r.draft.get()).data()).includes(token));assert.ok(!JSON.stringify((await r.draft.collection('commands').get()).docs.map(x=>x.data())).includes(token));
 assert.equal((await r.draft.collection('requests').where('status','==','ACTIVE').get()).size,1);
 await assert.rejects(()=>publicContractData(db,reqId,'x'.repeat(43)),{message:unavailable});await assert.rejects(()=>publicContractData(db,firstId,first.secret!),{message:unavailable});
 const before=(await r.draft.get()).data();
 const wrong=[{...clientPayload,extra:true},{...clientPayload,personalData:{...clientPayload.personalData,dni:''}},{...clientPayload,preferredMonthlyDueDay:0},{...clientPayload,preferredMonthlyDueDay:32}];for(const p of wrong)await assert.rejects(()=>publicContractData(db,reqId,token,p));
 const racePayloads=[clientPayload,{...clientPayload,preferredMonthlyDueDay:29}];
 const submitRace=await Promise.allSettled(racePayloads.map(p=>publicContractData(db,reqId,token,p)));
 assert.equal(submitRace.filter(x=>x.status==='fulfilled').length,1);assert.equal(submitRace.filter(x=>x.status==='rejected').length,1);
 const winner=submitRace.findIndex(x=>x.status==='fulfilled');await publicContractData(db,reqId,token,racePayloads[winner]);
 await assert.rejects(()=>publicContractData(db,reqId,token,racePayloads[1-winner]));
 assert.equal((await r.draft.collection('submissions').get()).size,1);assert.deepEqual((await r.draft.get()).data(),before);
 console.log('P5C_CONCURRENT_PUBLIC_SUBMISSION = PASS; CONCURRENT_SUBMISSIONS_CREATED = 1');
 const frozen=(await r.draft.collection('submissions').doc(reqId).get()).data();await update('APPLY_CLIENT_SUBMISSION',{submissionId:reqId});assert.equal(d.lastClientSubmissionId,reqId);assert.deepEqual(d.personalData,clientPayload.personalData);
 await update('UPDATE_PERSONAL_DATA',{personalData:{...clientPayload.personalData,address:'Corregido por Admin'}});assert.deepEqual((await r.draft.collection('submissions').doc(reqId).get()).data(),frozen);
 const otherId=`${id}-cross`,other=contractRefs(db,otherId,1),of=fixture(otherId);
 await other.budget.set(of.b);await other.acceptance.set(of.a);
 const od=(await contractCommand(db,otherId,1,{action:'OPEN_OR_CREATE',commandId:'open-cross'},'admin')).draft;
 await assert.rejects(()=>contractCommand(db,otherId,1,{action:'APPLY_CLIENT_SUBMISSION',commandId:'cross',expectedRevision:od.revision,submissionId:reqId},'admin'));
 // Adversarial copied records must still fail budget ownership checks.
 await other.draft.collection('submissions').doc(reqId).set(frozen!);await other.draft.collection('requests').doc(reqId).set((await rr.get()).data()!);
 await assert.rejects(()=>contractCommand(db,otherId,1,{action:'APPLY_CLIENT_SUBMISSION',commandId:'cross-forged',expectedRevision:od.revision,submissionId:reqId},'admin'));
 assert.deepEqual((await other.draft.get()).data(),od);console.log('P5C_CROSS_DRAFT_SUBMISSION_REJECT = PASS');
 const exp=await update('CREATE_CLIENT_DATA_REQUEST');const expId=d.activeClientDataRequestId!;await r.draft.collection('requests').doc(expId).update({expiresAt:'2000-01-01T00:00:00.000Z'});await assert.rejects(()=>publicContractData(db,expId,exp.secret!),{message:unavailable});
 const rev=await update('CREATE_CLIENT_DATA_REQUEST');const revId=d.activeClientDataRequestId!;await update('REVOKE_CLIENT_DATA_REQUEST');assert.equal(d.activeClientDataRequestId,null);await assert.rejects(()=>publicContractData(db,revId,rev.secret!),{message:unavailable});

 const raceBase=d.revision;
 const race=await Promise.allSettled(['race1','race2'].map(commandId=>contractCommand(db,id,1,{action:'CREATE_CLIENT_DATA_REQUEST',commandId,expectedRevision:raceBase},'admin')));
 assert.equal(race.filter(x=>x.status==='fulfilled').length,1);
 d=(await r.draft.get()).data() as typeof d;
 assert.equal((await r.draft.collection('requests').where('status','==','ACTIVE').get()).size,1);
 assert.equal((await r.draft.collection('requests').doc(d.activeClientDataRequestId!).get()).data()!.status,'ACTIVE');
 console.log('P5C_CONCURRENT_CLIENT_REQUEST = PASS');
 for(const deniedPath of [`presupuestos_v2/${id}/contracts/v1`,`contractClientDataRequests/${d.activeClientDataRequestId}`]){
   const res=await fetch(`http://127.0.0.1:8080/v1/projects/demo-cuenta-hogar/databases/(default)/documents/${deniedPath}`);assert.equal(res.status,403);
 }
 console.log('P5C_CLIENT_REQUEST_EMULATOR = PASS');
 const active=await update('CREATE_CLIENT_DATA_REQUEST'),activeId=d.activeClientDataRequestId!,ctx={params:Promise.resolve({requestId:activeId})};
 const req=(method:string,body?:unknown,secret=active.secret!,query='')=>new NextRequest(`http://localhost:3000/api/public/contract-data/${activeId}${query}`,{method,headers:{'X-Client-Data-Token':secret,'Origin':'http://localhost:3000','Content-Type':'application/json'},...(body!==undefined?{body:JSON.stringify(body)}:{})});
 const get=await pub.GET(req('GET'),ctx);assert.equal(get.status,200);const bootstrap=await get.text();assert.deepEqual(JSON.parse(bootstrap),{available:true,personalDataVersion:PERSONAL_ADDRESS_VERSION});for(const key of ['capitalAmount','factor','service','budgetId','storagePath'])assert.ok(!bootstrap.includes(key));
 assert.equal((await pub.GET(req('GET',undefined,'x'.repeat(43)),ctx)).status,400);assert.equal((await pub.GET(req('GET',undefined,active.secret!,'?token=bad'),ctx)).status,400);
 for(const payload of [...wrong,{...clientPayload,personalData:{...clientPayload.personalData,address:'x'.repeat(20000)}}])assert.equal((await pub.POST(req('POST',payload),ctx)).status,400);
 assert.equal((await pub.POST(new NextRequest(`http://localhost:3000/api/public/contract-data/${activeId}`,{method:'POST',headers:{Origin:'https://evil.test','Content-Type':'application/json','X-Client-Data-Token':active.secret!},body:JSON.stringify(clientPayload)}),ctx)).status,400);
 assert.equal((await pub.POST(req('POST',clientPayload),ctx)).status,200);
 const adminCtx={params:Promise.resolve({budgetId:id,version:'1'})};assert.equal((await api.GET(new NextRequest('http://localhost:3000/api/admin/test'),adminCtx)).status,401);
 let u;try{u=await admin.auth().getUserByEmail(ADMIN_EMAIL);}catch{u=await admin.auth().createUser({email:ADMIN_EMAIL,password:'Demo-only-1234!'});}await admin.auth().updateUser(u.uid,{password:'Demo-only-1234!'});
 const login=await(await fetch('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=demo',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:ADMIN_EMAIL,password:'Demo-only-1234!',returnSecureToken:true})})).json() as {idToken:string};assert.ok(login.idToken);
 const ar=await api.GET(new NextRequest('http://localhost:3000/api/admin/test',{headers:{Authorization:`Bearer ${login.idToken}`}}),adminCtx);assert.equal(ar.status,200);assert.ok(!(await ar.text()).includes(active.secret!));
 assert.deepEqual((await docs.get()).data(),{marker:'PRIVATE_P4'});assert.equal(JSON.stringify((await r.budget.get()).data()),original);assert.equal(JSON.stringify((await r.acceptance.get()).data()),accept);
 const secrets=[first.secret!,token,exp.secret!,rev.secret!,active.secret!,...race.flatMap(x=>x.status==='fulfilled'&&'secret' in x.value?[x.value.secret!]:[])];
 const inspected=new Set<string>();
 function inspect(data:FirebaseFirestore.DocumentData,path:string){
   const text=JSON.stringify(data);
   for(const secret of secrets)if(text.includes(secret))throw new Error(`RAW_TOKEN_DETECTED_AT ${secrets.reduce((p,s)=>p.replaceAll(s,'[REDACTED]'),path)}`);
   inspected.add(path);
 }
 async function scan(ref:FirebaseFirestore.DocumentReference):Promise<void>{
   const snap=await ref.get();
   if(snap.exists){const data=snap.data();assert.ok(data,'Existing snapshot must contain data');inspect(data,ref.path);}
   // Missing parent documents may still have persisted subcollections.
   for(const col of await ref.listCollections())for(const doc of (await col.get()).docs)await scan(doc.ref);
 }
 await scan(r.family);await scan(other.family);
 for(const col of ['contractClientDataRequests','contractClientDataLimits'])for(const doc of (await db.collection(col).get()).docs)inspect(doc.data(),doc.ref.path);
 for(const path of [r.draft.path,rr.path,r.draft.collection('submissions').doc(reqId).path])assert.ok(inspected.has(path),`Persisted entity not scanned: ${path}`);
 for(const part of ['/commands/','/events/','contractClientDataRequests/','contractClientDataLimits/'])assert.ok([...inspected].some(p=>p.includes(part)),`Entity class not scanned: ${part}`);
 assert.ok(inspected.size>0);
 console.log('RAW_TOKEN_FIRESTORE_OCCURRENCES = 0');
 const state=await getContract(db,id,1);assert.ok(!JSON.stringify(state).includes('tokenHash'));
 console.log('P5C_PUBLIC_API_ADVERSARIAL = PASS');console.log('DOCUMENTATION_CLIENT_LEAKS = 0; PUBLIC_CONTRACT_DATA_LEAKS = 0');
 await addressCompatibilityTests(db);
 await admin.app().delete();
}
main().catch(error=>{console.error('P5C_EMULATOR_FAILED',error instanceof Error&&error.message.startsWith('RAW_TOKEN_DETECTED_AT ')?error.message:error instanceof Error?error.stack?.split('\n').slice(1,3).join('\n'):'unexpected error');process.exitCode=1;});
