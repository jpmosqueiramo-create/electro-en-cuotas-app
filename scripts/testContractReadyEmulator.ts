import './helpers/requireSafeEmulatorEnvironment';
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';
import { admin } from '../src/lib/firebaseAdmin';
import { contractCommand,contractRefs,getContract,publicContractData } from '../src/lib/contractV2Server';
import { reviewedTerms,verifyReadyEvidence,type ContractReadyEvidenceV1 } from '../src/lib/contractReadyV2';
import { infrastructureFixture } from './helpers/contractInfrastructureFixtures';
import type { ContractDraftV2 } from '../src/lib/contractV2';
import * as api from '../src/app/api/admin/presupuestos-v2/[budgetId]/versions/[version]/contract/route';
async function main(){
 const db=admin.firestore(),prefix=`ready-${Date.now()}`;
 async function fixture(suffix:string){
  const id=`${prefix}-${suffix}`,f=infrastructureFixture(id),r=contractRefs(db,id,1);
  await r.family.set({lastVersion:1});await r.budget.set(f.source.budget);await r.acceptance.set(f.source.acceptance);await r.draft.set(f.source.draft);await r.family.collection('documentation').doc('1').set({marker:'PRIVATE_P4'});
  return {id,r,f};
 }
 const x=await fixture('main');let d=x.f.source.draft;
 const initial=reviewedTerms(d),origin=JSON.stringify({b:(await x.r.budget.get()).data(),a:(await x.r.acceptance.get()).data(),p4:(await x.r.family.collection('documentation').doc('1').get()).data()});
 const command=(action:string,revision:number,commandId:string,extra:Record<string,unknown>={})=>({action,expectedRevision:revision,commandId,...extra});
 const send=(c:unknown,actor='admin-a')=>contractCommand(db,x.id,1,c,actor);
 const link=await send(command('CREATE_CLIENT_DATA_REQUEST',d.revision,'link'));d=link.draft;
 assert.ok(link.secret);const requestId=d.activeClientDataRequestId!;
 const mark=command('MARK_READY_TO_FORMALIZE',d.revision,'ready-first');
 // Simulate lost response after a successful commit, then retry the exact command.
 await assert.rejects(async()=>{await send(mark);throw Error('SIMULATED_RESPONSE_LOST');},/SIMULATED_RESPONSE_LOST/);
 const result=await send(mark);assert.equal(result.replayed,true);d=result.draft;
 assert.equal(d.status,'READY_TO_FORMALIZE');assert.equal(d.revision,3);assert.deepEqual(reviewedTerms(d),initial);
 assert.equal((await x.r.draft.collection('requests').doc(requestId).get()).data()!.status,'REVOKED');assert.equal(d.activeClientDataRequestId,null);
 await assert.rejects(()=>publicContractData(db,requestId,link.secret!));
 const e=(await x.r.draft.collection('readyReviews').doc('ready-first').get()).data() as ContractReadyEvidenceV1;
 verifyReadyEvidence(x.f.source.budget,x.f.source.acceptance,d,e);
 assert.deepEqual((await getContract(db,x.id,1)).readiness,e);
 const event=(await x.r.draft.collection('events').doc('ready-first').get()).data()!;
 for(const forbidden of [d.personalData.fullName,d.personalData.address,link.secret!,'PRIVATE_P4'])assert.ok(!JSON.stringify({event,e}).includes(forbidden));
 for(const action of ['UPDATE_PERSONAL_DATA','UPDATE_EMPLOYMENT_DATA','SET_CONTRACT_PLAN','SET_PAYMENT_DATES','CREATE_CLIENT_DATA_REQUEST','APPLY_CLIENT_SUBMISSION','REVOKE_CLIENT_DATA_REQUEST']){
  const extra=action==='UPDATE_PERSONAL_DATA'?{personalData:d.personalData}:action==='UPDATE_EMPLOYMENT_DATA'?{employmentData:d.employmentData}:action==='SET_CONTRACT_PLAN'?{contractPlanCuotas:8}:action==='SET_PAYMENT_DATES'?{firstInstallmentDueDate:d.firstInstallmentDueDate,preferredMonthlyDueDay:30}:action==='APPLY_CLIENT_SUBMISSION'?{submissionId:'missing'}:{};
  await assert.rejects(()=>send(command(action,d.revision,`blocked-${action}`,extra)));
 }
 await assert.rejects(()=>send({...mark,expectedRevision:999}));await assert.rejects(()=>send(mark,'admin-b'));
 for(const action of ['TERMS_FROZEN','FREEZE_EMULATOR_FIXTURE','FORMALIZED'])await assert.rejects(()=>send(command(action,d.revision,`blocked-${action}`)));
 await assert.rejects(()=>send(command('RETURN_TO_DRAFT',d.revision,'empty',{reason:''})));
 const returnCommand=command('RETURN_TO_DRAFT',d.revision,'return',{reason:'Corrección administrativa'});
 const returns=await Promise.allSettled([send(returnCommand),send(command('RETURN_TO_DRAFT',d.revision,'return-other',{reason:'Revisar'}),'admin-b')]);
 assert.equal(returns.filter(r=>r.status==='fulfilled').length,1);d=(await x.r.draft.get()).data() as ContractDraftV2;
 assert.equal(d.status,'DRAFT');assert.equal(d.readyEvidenceId,null);assert.deepEqual(reviewedTerms(d),initial);
 assert.deepEqual((await x.r.draft.collection('readyReviews').doc('ready-first').get()).data(),e);
 // Revoked capability does not revive after RETURN_TO_DRAFT.
 await assert.rejects(()=>publicContractData(db,requestId,link.secret!));
 const savedSchedule=d.paymentScheduleDraft;
 d=(await send(command('UPDATE_PERSONAL_DATA',d.revision,'edit',{personalData:{...d.personalData,address:'Cambio administrativo'}}))).draft;
 assert.deepEqual(d.paymentScheduleDraft,savedSchedule);
 d=(await send(command('MARK_READY_TO_FORMALIZE',d.revision,'ready-second'))).draft;
 const e2=(await x.r.draft.collection('readyReviews').doc('ready-second').get()).data() as ContractReadyEvidenceV1;
 assert.notEqual(e.termsDigest,e2.termsDigest);assert.equal((await x.r.draft.collection('readyReviews').get()).size,2);
 assert.equal(JSON.stringify({b:(await x.r.budget.get()).data(),a:(await x.r.acceptance.get()).data(),p4:(await x.r.family.collection('documentation').doc('1').get()).data()}),origin);
 // Direct corruption is a synthetic Admin-SDK adversarial fixture, not an app command.
 await x.r.draft.update({'personalData.address':'Tampered'});await assert.rejects(()=>getContract(db,x.id,1));
 await assert.rejects(()=>send(command('RETURN_TO_DRAFT',d.revision,'tampered-return',{reason:'Revisar'})));
 await x.r.draft.set(d);
 for(const kind of ['double','admins','edit-race','apply-race']){
  const y=await fixture(kind),draft=y.f.source.draft;
  let revision=draft.revision;
  let subId='';
  if(kind==='apply-race'){
   const req=await contractCommand(db,y.id,1,command('CREATE_CLIENT_DATA_REQUEST',revision,'request'),'admin-a');revision=req.draft.revision;subId=req.draft.activeClientDataRequestId!;
   const payload={personalData:{...draft.personalData,address:'Recibido'},employmentData:draft.employmentData,preferredMonthlyDueDay:30};
   await publicContractData(db,subId,req.secret!,payload);
  }
  const first=command('MARK_READY_TO_FORMALIZE',revision,'mark');
  const second=kind==='double'?first:kind==='admins'?command('MARK_READY_TO_FORMALIZE',revision,'mark-b'):kind==='edit-race'?command('UPDATE_PERSONAL_DATA',revision,'edit',{personalData:{...draft.personalData,address:'Concurrente'}}):command('APPLY_CLIENT_SUBMISSION',revision,'apply',{submissionId:subId});
  const settled=await Promise.allSettled([contractCommand(db,y.id,1,first,'admin-a'),contractCommand(db,y.id,1,second,kind==='double'?'admin-a':'admin-b')]);
  assert.equal(settled.filter(s=>s.status==='fulfilled').length,kind==='double'?2:1);
  const actual=(await y.r.draft.get()).data() as ContractDraftV2;
  assert.equal(actual.revision,revision+1);
  assert.equal((await y.r.draft.collection('readyReviews').get()).size,actual.status==='READY_TO_FORMALIZE'?1:0);
  if(kind==='apply-race'){
   const sub=await y.r.draft.collection('submissions').doc(subId).get();assert.equal(sub.data()!.personalData.address,'Recibido');
   if(actual.status==='READY_TO_FORMALIZE'){
    assert.notEqual(actual.personalData.address,'Recibido');
    const returned=await contractCommand(db,y.id,1,command('RETURN_TO_DRAFT',actual.revision,'return',{reason:'Aplicar datos recibidos'}),'admin-a');
    await contractCommand(db,y.id,1,command('APPLY_CLIENT_SUBMISSION',returned.draft.revision,'apply-after',{submissionId:subId}),'admin-a');
    assert.deepEqual((await y.r.draft.collection('submissions').doc(subId).get()).data(),sub.data());
   }
  }
 }
 // Deterministic received-submission lifecycle, independent of race winner.
 const historical=await fixture('received-history');
 const receivedRequest=await contractCommand(db,historical.id,1,command('CREATE_CLIENT_DATA_REQUEST',1,'request'),'admin-a');
 const receivedId=receivedRequest.draft.activeClientDataRequestId!;
 await publicContractData(db,receivedId,receivedRequest.secret!,{personalData:{...historical.f.source.draft.personalData,address:'Datos recibidos preservados'},employmentData:historical.f.source.draft.employmentData,preferredMonthlyDueDay:30});
 const immutableSubmission=(await historical.r.draft.collection('submissions').doc(receivedId).get()).data();
 const markedHistory=await contractCommand(db,historical.id,1,command('MARK_READY_TO_FORMALIZE',receivedRequest.draft.revision,'mark'),'admin-a');
 await assert.rejects(()=>contractCommand(db,historical.id,1,command('APPLY_CLIENT_SUBMISSION',markedHistory.draft.revision,'blocked',{submissionId:receivedId}),'admin-a'));
 const returnedHistory=await contractCommand(db,historical.id,1,command('RETURN_TO_DRAFT',markedHistory.draft.revision,'return',{reason:'Aplicar datos recibidos'}),'admin-a');
 assert.equal((await contractCommand(db,historical.id,1,command('RETURN_TO_DRAFT',markedHistory.draft.revision,'return',{reason:'Aplicar datos recibidos'}),'admin-a')).replayed,true);
 const appliedHistory=await contractCommand(db,historical.id,1,command('APPLY_CLIENT_SUBMISSION',returnedHistory.draft.revision,'apply',{submissionId:receivedId}),'admin-a');
 assert.equal(appliedHistory.draft.personalData.address,'Datos recibidos preservados');
 assert.deepEqual((await historical.r.draft.collection('submissions').doc(receivedId).get()).data(),immutableSubmission);
 const receiptRace=await fixture('receipt-race');
 const requestRace=await contractCommand(db,receiptRace.id,1,command('CREATE_CLIENT_DATA_REQUEST',1,'request'),'admin-a');
 const publicPayload={personalData:receiptRace.f.source.draft.personalData,employmentData:receiptRace.f.source.draft.employmentData,preferredMonthlyDueDay:30};
 const received=await Promise.allSettled([
  contractCommand(db,receiptRace.id,1,command('MARK_READY_TO_FORMALIZE',requestRace.draft.revision,'mark'),'admin-a'),
  publicContractData(db,requestRace.draft.activeClientDataRequestId!,requestRace.secret!,publicPayload),
 ]);
 assert.equal(received[0].status,'fulfilled');
 const receivedSub=await receiptRace.r.draft.collection('submissions').doc(requestRace.draft.activeClientDataRequestId!).get();
 assert.equal(receivedSub.exists,received[1].status==='fulfilled');
 assert.equal((await receiptRace.r.draft.get()).data()!.status,'READY_TO_FORMALIZE');
 if(receivedSub.exists)assert.deepEqual(receivedSub.data()!.personalData,publicPayload.personalData);
 const different=await fixture('different-revisions');
 const revisions=await Promise.allSettled([1,2].map(revision=>contractCommand(db,different.id,1,command('MARK_READY_TO_FORMALIZE',revision,`mark-${revision}`),'admin-'+revision)));
 assert.equal(revisions[0].status,'fulfilled');assert.equal(revisions[1].status,'rejected');
 const stale=await fixture('stale');
 await assert.rejects(()=>contractCommand(db,stale.id,1,command('MARK_READY_TO_FORMALIZE',2,'stale'),'admin-b'));
 assert.equal((await stale.r.draft.collection('readyReviews').get()).size,0);
 // Guard failure creates no event, receipt, evidence or state change.
 const bad=await fixture('invalid');await bad.r.draft.update({'economicTerms.contractTotal':1});const badBefore=(await bad.r.draft.get()).data();
 await assert.rejects(()=>contractCommand(db,bad.id,1,command('MARK_READY_TO_FORMALIZE',1,'invalid'),'admin-a'));
 assert.deepEqual((await bad.r.draft.get()).data(),badBefore);
 for(const col of ['events','commands','readyReviews'])assert.equal((await bad.r.draft.collection(col).get()).size,0);
 // Client-supplied reviewer/date overrides are rejected by the exact command schema.
 await assert.rejects(()=>contractCommand(db,stale.id,1,{...command('MARK_READY_TO_FORMALIZE',1,'forged'),reviewedBy:'other',reviewedAt:'fake'},'admin-a'));
 const ctx={params:Promise.resolve({budgetId:stale.id,version:'1'})};
 assert.equal((await api.POST(new NextRequest('http://localhost:3000/api/admin/test',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(command('MARK_READY_TO_FORMALIZE',1,'unauthorized'))}),ctx)).status,401);
 for(const col of ['contractNumbersV2','contractNumberingV2','contractSnapshotsV2'])assert.equal((await db.collection(col).get()).size,0,'READY must not allocate or freeze');
 console.log('READY_EMULATOR_CAS_IDEMPOTENCY_CONCURRENCY = PASS');
 console.log('READY_HISTORY_REQUEST_REVOCATION_SUBMISSIONS_PRIVACY = PASS');
 console.log('READY_NO_NUMBER_OR_SNAPSHOT_WRITES = PASS; ORIGIN_AND_P4_UNCHANGED = PASS');
}
main().catch(error=>{console.error('READY_EMULATOR = FAIL',error instanceof Error?error.message:'unexpected');process.exitCode=1;}).finally(async()=>{await admin.app().delete();});
