import './helpers/requireSafeEmulatorEnvironment';
import assert from 'node:assert/strict';
import { Firestore,type Transaction } from 'firebase-admin/firestore';
import { createContractFreezeIntegrationEmulator,FREEZE_DEPENDENCIES_COLLECTION } from '../src/lib/contractFreezeIntegrationEmulator';
import { CONTRACT_INFRASTRUCTURE_PATHS as p,assertContractInfrastructureEmulator } from '../src/lib/contractInfrastructureEmulator';
import { persistReadyContract } from './helpers/contractFreezeFixtures';
import { contractCommand,getContract,publicContractData } from '../src/lib/contractV2Server';
import { contractValueHash } from '../src/lib/contractIntegrityV2';
import { validateContractSnapshot } from '../src/lib/contractSnapshotV2';
import { NextRequest } from 'next/server';
import * as api from '../src/app/api/admin/presupuestos-v2/[budgetId]/versions/[version]/contract/route';
async function main(){
 assertContractInfrastructureEmulator();
 const db=new Firestore({projectId:'demo-cuenta-hogar',host:'127.0.0.1:8080',ssl:false}),service=createContractFreezeIntegrationEmulator(),prefix=`c1-${Date.now()}`;
 const actor='synthetic-admin-a',other='synthetic-admin-b';
 const fixture=(name:string,decimal=false,plan=8)=>persistReadyContract(db,`${prefix}-${name}`,decimal,plan);
 type Ready=Awaited<ReturnType<typeof fixture>>;
 const command=(x:Ready,name:string,rev=x.d.revision)=>({action:'FREEZE_READY_EMULATOR',commandId:`${prefix}-${name}`,budgetId:x.id,budgetVersion:1,expectedRevision:rev,dependenciesId:'synthetic-documents'});
 const regular=(x:Ready,action:string,name:string,extra:Record<string,unknown>={},revision=x.d.revision)=>contractCommand(db,x.id,1,{action,commandId:`${prefix}-${name}`,expectedRevision:revision,...extra},actor);
 async function totals(){return {counter:(await db.doc(p.counter).get()).data(),snapshots:(await db.collection(p.snapshots).get()).size,numbers:(await db.collection(p.numbers).get()).size,origins:(await db.collection(p.origins).get()).size,evidence:(await db.collection(p.evidence).get()).size,commands:(await db.collection(p.commands).get()).size,events:(await db.collection(p.events).get()).size};}
 try{
  assert.equal((await db.doc(p.counter).get()).exists,false,'Fresh Emulator required');
  const first=await fixture('first'),firstCmd=command(first,'first');
  await db.collection(FREEZE_DEPENDENCIES_COLLECTION).doc('synthetic-documents').create({schemaVersion:'CONTRACT_FREEZE_SYNTHETIC_DEPENDENCIES_V1',executionMode:'EMULATOR_ONLY',legalApproval:'NOT_APPROVED_SYNTHETIC_ONLY',legalContext:first.legal});
  await assert.rejects(()=>service.execute(firstCmd,actor),/CONTRACT_COUNTER_MISSING/);
  const counter={schemaVersion:'CONTRACT_NUMBER_COUNTER_V1',policyId:'CONTRACT_NUMBERING_V1',executionMode:'EMULATOR_ONLY',active:false,lastAllocatedSequence:'0'};
  await db.doc(p.counter).create(counter);await assert.rejects(()=>service.execute(firstCmd,actor),/CONTRACT_COUNTER_INACTIVE/);
  await db.doc(p.counter).update({active:true});
  await assert.rejects(()=>service.execute({...firstCmd,dependenciesId:'absent'},actor),/SYNTHETIC_DEPENDENCIES_REQUIRED/);
  await assert.rejects(()=>service.execute(firstCmd,'real-admin'),/SYNTHETIC_OPERATOR_REQUIRED/);
  const beforeOrigins=contractValueHash({b:(await first.r.budget.get()).data(),a:(await first.r.acceptance.get()).data(),p4:(await first.r.family.collection('documentation').doc('1').get()).data()});
  const result=await service.execute(firstCmd,actor);assert.equal(result.contractNumber,'CH-000001');
  const snapshot=await service.getSnapshot(result.snapshotId);validateContractSnapshot(snapshot);
  assert.equal(snapshot.freeze.readinessPolicyVersion,'CONTRACT_TECHNICAL_REVIEW_V1');
  assert.deepEqual(snapshot.economicTerms,first.d.economicTerms);assert.deepEqual(snapshot.paymentSchedule.installments,first.d.paymentScheduleDraft);assert.deepEqual(snapshot.personalData,first.d.personalData);
  const reviewed=(await first.r.draft.collection('readyReviews').doc('ready').get()).data()!;
  assert.equal(snapshot.sourceDraft.readyDigest,reviewed.termsDigest);
  assert.equal((await first.r.draft.get()).data()!.status,'TERMS_FROZEN');assert.equal((await first.r.draft.get()).data()!.revision,first.d.revision+1);
  const stable=await totals();assert.deepEqual(await service.execute(firstCmd,actor),result);assert.deepEqual(await totals(),stable);
  assert.deepEqual(await service.execute(command(first,'alias'),other),result);assert.equal((await totals()).numbers,1);assert.equal((await totals()).events,1);
  await assert.rejects(()=>service.execute({...firstCmd,expectedRevision:999},actor),/CONTRACT_COMMAND_CONFLICT/);
  await assert.rejects(()=>service.execute(firstCmd,other),/CONTRACT_COMMAND_CONFLICT/);
  await assert.rejects(()=>service.execute(command(first,'wrong-ready-revision',first.d.revision+1),actor));
  for(const action of ['UPDATE_PERSONAL_DATA','RETURN_TO_DRAFT','APPLY_CLIENT_SUBMISSION','SET_CONTRACT_PLAN']){
   const extra=action==='UPDATE_PERSONAL_DATA'?{personalData:{...first.d.personalData,address:'must not change'}}:action==='RETURN_TO_DRAFT'?{reason:'must not reopen'}:action==='APPLY_CLIENT_SUBMISSION'?{submissionId:'missing'}:{contractPlanCuotas:12};
   await assert.rejects(()=>regular(first,action,`frozen-${action}`,extra,first.d.revision+1));
  }
  assert.deepEqual((await getContract(db,first.id,1)).draft?.paymentScheduleDraft,first.d.paymentScheduleDraft);
  assert.equal(contractValueHash({b:(await first.r.budget.get()).data(),a:(await first.r.acceptance.get()).data(),p4:(await first.r.family.collection('documentation').doc('1').get()).data()}),beforeOrigins);
  const next=await fixture('decimal',true);const nextResult=await service.execute(command(next,'decimal'),actor);assert.equal(nextResult.contractNumber,'CH-000002');assert.equal((await service.getSnapshot(nextResult.snapshotId))!.economicTerms.capitalAmount,580000.5);
  const [a,b]=await Promise.all([fixture('parallel-a'),fixture('parallel-b')]);
  const numbers=await Promise.all([service.execute(command(a,'parallel-a'),actor),service.execute(command(b,'parallel-b'),other)]);assert.deepEqual(numbers.map(n=>n.contractNumber).sort(),['CH-000003','CH-000004']);
  const same=await fixture('same');const sameResults=await Promise.all([service.execute(command(same,'same-a'),actor),service.execute(command(same,'same-b'),other)]);assert.deepEqual(sameResults[0],sameResults[1]);
  const click=await fixture('click'),clickCmd=command(click,'click');assert.deepEqual(...await Promise.all([service.execute(clickCmd,actor),service.execute(clickCmd,actor)]));
  const lost=await fixture('lost'),lostCmd=command(lost,'lost');await assert.rejects(async()=>{await service.execute(lostCmd,actor);throw Error('SIMULATED_RESPONSE_LOST');},/SIMULATED_RESPONSE_LOST/);
  const lostTotals=await totals();assert.equal((await service.execute(lostCmd,actor)).contractNumber,'CH-000007');assert.deepEqual(await totals(),lostTotals);
  // Inject a failure after all writes are queued, without exposing hooks in the service.
  const abort=await fixture('abort'),abortTotals=await totals(),original=Firestore.prototype.runTransaction;
  Object.defineProperty(Firestore.prototype,'runTransaction',{configurable:true,writable:true,value:function<T>(this:Firestore,update:(tx:Transaction)=>Promise<T>){return original.call(this,async tx=>{await update(tx);throw Error('SIMULATED_ABORT_BEFORE_COMMIT');});}});
  try{await assert.rejects(()=>service.execute(command(abort,'abort'),actor),/SIMULATED_ABORT_BEFORE_COMMIT/);}finally{Firestore.prototype.runTransaction=original;}
  assert.deepEqual(await totals(),abortTotals);assert.equal((await abort.r.draft.get()).data()!.status,'READY_TO_FORMALIZE');
  const collision=await fixture('collision');await db.collection(p.numbers).doc('CH-000008').create({marker:'SYNTHETIC_COLLISION'});const collisionTotals=await totals();
  await assert.rejects(()=>service.execute(command(collision,'collision'),actor),/STOP_CONTRACT_NUMBER_OR_SNAPSHOT_COLLISION/);assert.deepEqual(await totals(),collisionTotals);
  await db.collection(p.numbers).doc('CH-000008').delete(); // only remove the injected fixture, not an allocated number.
  assert.equal((await service.execute(command(abort,'after-abort'),actor)).contractNumber,'CH-000008');
  // Real command provenance and terms are checked, beyond a READY flag/digest.
  for(const corrupt of ['flag','digest','command','origin','terms','revision']){
   const x=await fixture(`corrupt-${corrupt}`),before=await totals();
   if(corrupt==='flag')await x.r.draft.collection('readyReviews').doc('ready').delete();
   if(corrupt==='digest')await x.r.draft.collection('readyReviews').doc('ready').update({termsDigest:'0'.repeat(64)});
   if(corrupt==='command')await x.r.draft.collection('commands').doc('ready').delete();
   if(corrupt==='origin')await x.r.acceptance.update({solicitudId:'different'});
   if(corrupt==='terms')await x.r.draft.update({'personalData.address':'corrupt'});
   if(corrupt==='revision')await x.r.draft.update({revision:x.d.revision+1});
   await assert.rejects(()=>service.execute(command(x,`corrupt-${corrupt}`),actor));assert.deepEqual(await totals(),before);
  }
  // Return wins: stale freeze has no allocation. Re-review creates fresh usable evidence.
  const returned=await fixture('returned');const back=await regular(returned,'RETURN_TO_DRAFT','return',{reason:'correction'});
  await assert.rejects(()=>service.execute(command(returned,'stale'),actor));
  let edited=await regular(returned,'UPDATE_PERSONAL_DATA','edit',{personalData:{...returned.d.personalData,address:'Revisado nuevamente'}},back.draft.revision);
  edited=await regular(returned,'MARK_READY_TO_FORMALIZE','new-ready',{},edited.draft.revision);
  const renewed=await service.execute(command(returned,'renewed',edited.draft.revision),actor);assert.equal((await service.getSnapshot(renewed.snapshotId))!.personalData.address,'Revisado nuevamente');
  assert.equal((await returned.r.draft.collection('readyReviews').get()).size,2);
  // Actual races use the unchanged productive dispatcher; no weakened state guard.
  for(const action of ['RETURN_TO_DRAFT','UPDATE_PERSONAL_DATA','APPLY_CLIENT_SUBMISSION','MARK_READY_TO_FORMALIZE']){
   const x=await fixture(`race-${action}`),c=command(x,`race-${action}`);
   const extra=action==='RETURN_TO_DRAFT'?{reason:'race'}:action==='UPDATE_PERSONAL_DATA'?{personalData:x.d.personalData}:action==='APPLY_CLIENT_SUBMISSION'?{submissionId:'missing'}:{};
   const settled=await Promise.allSettled([service.execute(c,actor),regular(x,action,`other-${action}`,extra)]);
   const state=(await x.r.draft.get()).data()!;
   if(state.status==='DRAFT'){assert.equal(action,'RETURN_TO_DRAFT');assert.equal(settled[0].status,'rejected');assert.equal(settled[1].status,'fulfilled');}
   else{assert.equal(state.status,'TERMS_FROZEN');assert.equal(settled[0].status,'fulfilled');assert.equal(settled[1].status,'rejected');}
  }
  // DRAFT MARK and freeze race: freeze can only succeed after actual READY commits.
  const marking=await fixture('marking');const draftAgain=await regular(marking,'RETURN_TO_DRAFT','marking-return',{reason:'review again'});
  const markPayload={action:'MARK_READY_TO_FORMALIZE',commandId:`${prefix}-marking-ready`,expectedRevision:draftAgain.draft.revision};
  const markRace=await Promise.allSettled([contractCommand(db,marking.id,1,markPayload,actor),service.execute(command(marking,'marking-freeze',draftAgain.draft.revision+1),actor)]);
  assert.equal(markRace[0].status,'fulfilled');
  if(markRace[1].status==='rejected')await service.execute(command(marking,'marking-freeze',draftAgain.draft.revision+1),actor);
  assert.equal((await marking.r.draft.get()).data()!.status,'TERMS_FROZEN');
  const readRace=await fixture('read-race');const [readFrozen,read]=await Promise.all([service.execute(command(readRace,'read-race'),actor),getContract(db,readRace.id,1)]);assert.ok(readFrozen);assert.deepEqual(read.draft!.paymentScheduleDraft,readRace.d.paymentScheduleDraft);
  // Active link was revoked by real READY; original received submissions remain preserved.
  const links=await fixture('links');let temp=await regular(links,'RETURN_TO_DRAFT','links-return',{reason:'client data'});
  temp=await regular(links,'CREATE_CLIENT_DATA_REQUEST','links-request',{},temp.draft.revision);const link=temp.secret!,requestId=temp.draft.activeClientDataRequestId!;
  await publicContractData(db,requestId,link,{personalData:temp.draft.personalData,employmentData:temp.draft.employmentData});const sub=(await links.r.draft.collection('submissions').doc(requestId).get()).data();
  temp=await regular(links,'MARK_READY_TO_FORMALIZE','links-ready',{},temp.draft.revision);
  await service.execute(command(links,'links-freeze',temp.draft.revision),actor);assert.deepEqual((await links.r.draft.collection('submissions').doc(requestId).get()).data(),sub);await assert.rejects(()=>publicContractData(db,requestId,link));
  // MARK retry returns its historical receipt only; it cannot overwrite frozen state.
  await regular(links,'MARK_READY_TO_FORMALIZE','links-ready',{},temp.draft.revision-1);assert.equal((await links.r.draft.get()).data()!.status,'TERMS_FROZEN');
  for(const doc of (await db.collection(p.evidence).get()).docs){const text=JSON.stringify(doc.data());for(const term of ['Domicilio ficticio','synthetic@example.test','5491100000000',link,'P4_PRIVATE_TEST_UNCHANGED'])assert.ok(!text.includes(term),'PII copied into origin evidence');}
  for(const doc of (await db.collection(p.numbers).get()).docs){const snap=await db.collection(p.snapshots).doc(doc.data().receipt.snapshotId).get();assert.ok(snap.exists);assert.equal(snap.data()!.contractNumber,doc.id);}
  for(const doc of (await db.collection(p.snapshots).get()).docs){validateContractSnapshot(doc.data());assert.equal((await db.collection(p.numbers).doc(doc.data().contractNumber).get()).data()!.receipt.snapshotId,doc.id);}
  // Calendar-year changes affect metadata only, never numbering or the materialized schedule.
  const RealDate=globalThis.Date;
  try{let previous=BigInt((await db.doc(p.counter).get()).data()!.lastAllocatedSequence);
   for(const year of [2030,2031]){globalThis.Date=new Proxy(RealDate,{construct(target,args,newTarget){return Reflect.construct(target,args.length?args:[RealDate.UTC(year,0,1)],newTarget);}});const x=await fixture(`year-${year}`);const r=await service.execute(command(x,`year-${year}`),actor);previous++;assert.equal((await service.getSnapshot(r.snapshotId))!.numbering.sequence,previous.toString());assert.deepEqual((await service.getSnapshot(r.snapshotId))!.paymentSchedule.installments,x.d.paymentScheduleDraft);}
  }finally{globalThis.Date=RealDate;}
  // Synthetic retained high-water mark, never a productive initializer or reset.
  await db.doc(p.counter).update({lastAllocatedSequence:'999999'});const high=await fixture('million');const million=await service.execute(command(high,'million'),actor);assert.equal(million.contractNumber,'CH-1000000');
  const retained=await fixture('retained');const retainedNumber=await service.execute(command(retained,'retained'),actor);assert.equal(retainedNumber.contractNumber,'CH-1000001');assert.deepEqual(await service.getSnapshot(result.snapshotId),snapshot);
  for(const action of ['UPDATE','DELETE','RESET_COUNTER','ANNUL','FORMALIZED'])await assert.rejects(()=>service.execute({...firstCmd,action},actor),/IMMUTABLE_CONTRACT_OPERATION_REJECTED/);
  for(const method of ['execute','getSnapshot'] as const){const mode=process.env.NODE_ENV;try{Object.assign(process.env,{NODE_ENV:'production'});if(method==='execute')await assert.rejects(()=>service.execute(firstCmd,actor));else await assert.rejects(()=>service.getSnapshot(result.snapshotId));}finally{if(mode===undefined)Reflect.deleteProperty(process.env,'NODE_ENV');else Object.assign(process.env,{NODE_ENV:mode});}}
  for(const action of ['FREEZE_READY_EMULATOR','FREEZE_EMULATOR_FIXTURE','TERMS_FROZEN'])await assert.rejects(()=>regular(first,action,`productive-dispatch-${action}`),/operación no permitida/);
  for(const [name,value] of [['GCLOUD_PROJECT','not-a-demo-project'],['FIRESTORE_EMULATOR_HOST','remote.invalid:8080'],['FIREBASE_PRIVATE_KEY','forbidden-test-value']] as const){
   const old=process.env[name];try{process.env[name]=value;assert.throws(()=>createContractFreezeIntegrationEmulator());await assert.rejects(()=>service.execute(firstCmd,actor));await assert.rejects(()=>service.getSnapshot(result.snapshotId));}finally{if(old===undefined)delete process.env[name];else process.env[name]=old;}
  }
  const ctx={params:Promise.resolve({budgetId:first.id,version:'1'})};assert.equal((await api.POST(new NextRequest('http://localhost:3000/api/admin/test',{method:'POST'}),ctx)).status,401);
  console.log('C1_REAL_READY_ATOMIC_FREEZE_AND_SEQUENCE = PASS');console.log('C1_CONCURRENCY_REPLAY_ABORT_COLLISION_NO_ORPHANS = PASS');console.log('C1_YEAR_GROWTH_IMMUTABILITY_PRIVACY_AND_PRODUCTION_BLOCK = PASS');
 }finally{await service.close();await db.terminate();}
}
main().catch(error=>{console.error('C1_EMULATOR = FAIL',error instanceof Error?error.stack?.split('\n').filter(line=>line.trim().startsWith('at ')).slice(0,3).join('\n'):'unexpected');process.exitCode=1;});
