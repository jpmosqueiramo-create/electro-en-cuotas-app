import './helpers/requireSafeEmulatorEnvironment';
import assert from 'node:assert/strict';
import { Firestore, type Transaction } from 'firebase-admin/firestore';
import { infrastructureFixture, fixtureIdentity, syntheticSnapshot } from './helpers/contractInfrastructureFixtures';
import { contractIdentity, contractOriginId, validateContractSnapshot } from '../src/lib/contractSnapshotV2';
import { contractValueHash } from '../src/lib/contractIntegrityV2';
import { assertContractInfrastructureEmulator, createContractInfrastructureEmulator, CONTRACT_INFRASTRUCTURE_PATHS as p } from '../src/lib/contractInfrastructureEmulator';
async function main(){
 assertContractInfrastructureEmulator();
 const db=new Firestore({projectId:'demo-cuenta-hogar',host:'127.0.0.1:8080',ssl:false}),service=createContractInfrastructureEmulator();
 const runId=`b1-${Date.now()}`;
 const counter={schemaVersion:'CONTRACT_NUMBER_COUNTER_V1',policyId:'CONTRACT_NUMBERING_V1',executionMode:'EMULATOR_ONLY',active:true,lastAllocatedSequence:'0'};
 async function fixture(name:string){const f=infrastructureFixture(`${runId}-${name}`),id=contractIdentity(fixtureIdentity(f));await db.collection(p.fixtures).doc(id).create(f);return {f,id};}
 function command(id:string,commandId:string,expectedRevision=1){return {action:'FREEZE_EMULATOR_FIXTURE',contractId:id,commandId,expectedRevision};}
 async function totals(){return {counter:(await db.doc(p.counter).get()).data(),snapshots:(await db.collection(p.snapshots).get()).size,numbers:(await db.collection(p.numbers).get()).size,commands:(await db.collection(p.commands).get()).size,events:(await db.collection(p.events).get()).size};}
 try{
  assert.equal((await db.doc(p.counter).get()).exists,false,'Use a fresh Emulator for the allocation suite');
  const first=await fixture('first'),firstCommand=command(first.id,'first');
  await assert.rejects(()=>service.execute(firstCommand,'admin-a'),/CONTRACT_COUNTER_MISSING/);
  assert.equal((await db.collection(p.snapshots).get()).size,0);
  await db.doc(p.counter).create({...counter,active:false});
  await assert.rejects(()=>service.execute(firstCommand,'admin-a'),/CONTRACT_COUNTER_INACTIVE/);
  assert.equal((await db.doc(p.counter).get()).data()!.lastAllocatedSequence,'0');
  await db.doc(p.counter).update({active:true});
  const firstResult=await service.execute(firstCommand,'admin-a');assert.equal(firstResult.contractNumber,'CH-000001');
  assert.deepEqual(await service.execute(firstCommand,'admin-a'),firstResult);
  assert.deepEqual(await service.execute(command(first.id,'same-contract-other-admin'),'admin-b'),firstResult);
  await assert.rejects(()=>service.execute({...firstCommand,expectedRevision:2},'admin-a'),/CONTRACT_COMMAND_CONFLICT/);
  await assert.rejects(()=>service.execute(firstCommand,'admin-b'),/CONTRACT_COMMAND_CONFLICT/);
  await assert.rejects(()=>service.execute(command(first.id,'different-intent',2),'admin-a'),/CONTRACT_ALREADY_FROZEN_CONFLICT/);
  const one=(await db.doc(p.counter).get()).data()!;assert.equal(one.lastAllocatedSequence,'1');
  const next=await fixture('next'),nextResult=await service.execute(command(next.id,'next'),'admin-a');assert.equal(nextResult.contractNumber,'CH-000002');
  const [a,b]=await Promise.all([fixture('concurrent-a'),fixture('concurrent-b')]);
  const parallel=await Promise.all([service.execute(command(a.id,'parallel-a'),'admin-a'),service.execute(command(b.id,'parallel-b'),'admin-b')]);
  assert.deepEqual(parallel.map(x=>x.contractNumber).sort(),['CH-000003','CH-000004']);
  const same=await fixture('two-admins');
  const sameResults=await Promise.all([service.execute(command(same.id,'two-admins-a'),'admin-a'),service.execute(command(same.id,'two-admins-b'),'admin-b')]);
  assert.deepEqual(sameResults[0],sameResults[1]);assert.equal((await db.doc(p.counter).get()).data()!.lastAllocatedSequence,'5');
  const click=await fixture('double-click'),clickCommand=command(click.id,'double-click');
  const clicks=await Promise.all([service.execute(clickCommand,'admin-a'),service.execute(clickCommand,'admin-a')]);assert.deepEqual(clicks[0],clicks[1]);
  const timeout=await fixture('response-lost'),timeoutCommand=command(timeout.id,'response-lost');
  await assert.rejects(async()=>{await service.execute(timeoutCommand,'admin-a');throw Error('SIMULATED_RESPONSE_LOST_AFTER_COMMIT');},/SIMULATED_RESPONSE_LOST/);
  const beforeRetry=await totals(),recovered=await service.execute(timeoutCommand,'admin-a');assert.equal(recovered.contractNumber,'CH-000007');assert.deepEqual(await totals(),beforeRetry);
  // Abort after all writes have been queued; the SDK must persist none of them.
  const abort=await fixture('abort'),beforeAbort=await totals(),original=Firestore.prototype.runTransaction;
  Object.defineProperty(Firestore.prototype,'runTransaction',{configurable:true,writable:true,value:function<T>(this:Firestore,update:(tx:Transaction)=>Promise<T>){
    return original.call(this,async tx=>{await update(tx);throw Error('SIMULATED_ABORT_BEFORE_COMMIT');});
  }});
  try{await assert.rejects(()=>service.execute(command(abort.id,'abort'),'admin-a'),/SIMULATED_ABORT_BEFORE_COMMIT/);}finally{Firestore.prototype.runTransaction=original;}
  assert.deepEqual(await totals(),beforeAbort);assert.equal((await db.collection(p.fixtures).doc(abort.id).get()).data()!.state,'EDITABLE');
  assert.equal((await db.collection(p.commands).doc('abort').get()).exists,false);
  // Invalid source revision also leaves every allocation entity untouched.
  await assert.rejects(()=>service.execute(command(abort.id,'stale',2),'admin-a'),/CONTRACT_REVISION_CONFLICT/);assert.deepEqual(await totals(),beforeAbort);
  const collision=await fixture('collision');await db.collection(p.numbers).doc('CH-000008').create({reserved:'SYNTHETIC_COLLISION'});
  const collisionState=await totals();await assert.rejects(()=>service.execute(command(collision.id,'collision'),'admin-a'),/STOP_CONTRACT_NUMBER_OR_SNAPSHOT_COLLISION/);assert.deepEqual(await totals(),collisionState);
  // Remove only the injected test collision so further independent scenarios can run.
  await db.collection(p.numbers).doc('CH-000008').delete();
  // Cancellation is a fixture lifecycle fact, never a production service operation.
  await db.collection('contractLifecycleFixturesV2').doc(first.id).create({state:'ANNULLED_TEST_ONLY'});
  const later=await fixture('after-annulled'),laterResult=await service.execute(command(later.id,'after-annulled'),'admin-a');assert.equal(laterResult.contractNumber,'CH-000008');assert.equal((await service.getSnapshot(firstResult.snapshotId))!.contractNumber,'CH-000001');
  for(const action of ['UPDATE','DELETE','RESET_COUNTER','ANNUL','FORMALIZED'])await assert.rejects(()=>service.execute({...command(first.id,'forbidden-'+action),action},'admin-a'),/IMMUTABLE_CONTRACT_OPERATION_REJECTED/);
  const originalSnapshot=await service.getSnapshot(firstResult.snapshotId);validateContractSnapshot(originalSnapshot);
  assert.equal(originalSnapshot.origin.budgetHash,contractValueHash(first.f.source.budget));assert.equal(originalSnapshot.origin.acceptanceHash,contractValueHash(first.f.source.acceptance));
  assert.deepEqual((await db.collection(p.evidence).doc(first.id).get()).data()!.source,first.f.source);
  assert.deepEqual((await db.collection(p.fixtures).doc(first.id).get()).data()!.source,first.f.source);
  assert.equal((await db.collection(p.events).get()).size,8);assert.equal((await db.collection(p.snapshots).get()).size,8);
  for(const number of (await db.collection(p.numbers).get()).docs){const snapshot=await db.collection(p.snapshots).doc(number.data().receipt.snapshotId).get();assert.equal(snapshot.exists,true);assert.equal(snapshot.data()!.contractNumber,number.id);}
  for(const snapshot of (await db.collection(p.snapshots).get()).docs){validateContractSnapshot(snapshot.data());const s=snapshot.data();assert.equal((await db.collection(p.numbers).doc(s.contractNumber).get()).data()!.receipt.snapshotId,snapshot.id);const origin=await db.collection(p.origins).doc(contractOriginId({budgetId:s.sourceDraft.budgetId,budgetVersion:s.sourceDraft.budgetVersion,contractDraftId:s.sourceDraft.contractDraftId,acceptedOptionId:s.sourceDraft.acceptedOptionId})).get();assert.equal(origin.exists,true);assert.equal(origin.data()!.receipt.snapshotId,snapshot.id);}
  assert.equal((await db.doc(p.counter).get()).data()!.lastAllocatedSequence,'8');
  // Same counter across calendar years. Only the wall-clock Date constructor is
  // simulated; Date.now (SDK deadlines) and date parsing keep their real behavior.
  const RealDate=globalThis.Date;
  try{
   globalThis.Date=new Proxy(RealDate,{construct(target,args,newTarget){return Reflect.construct(target,args.length?args:[RealDate.UTC(2030,0,1)],newTarget);}});
   const yearA=await fixture('year-2030'),resultA=await service.execute(command(yearA.id,'year-2030'),'admin-a');assert.equal(resultA.contractNumber,'CH-000009');assert.match((await service.getSnapshot(resultA.snapshotId))!.freeze.termsFrozenAt,/^2030-/);
   globalThis.Date=new Proxy(RealDate,{construct(target,args,newTarget){return Reflect.construct(target,args.length?args:[RealDate.UTC(2031,0,1)],newTarget);}});
   const yearB=await fixture('year-2031'),resultB=await service.execute(command(yearB.id,'year-2031'),'admin-a');assert.equal(resultB.contractNumber,'CH-000010');assert.match((await service.getSnapshot(resultB.snapshotId))!.freeze.termsFrozenAt,/^2031-/);
  }finally{globalThis.Date=RealDate;}
  const invalid=await fixture('invalid-terms'),beforeInvalid=await totals();
  await db.collection(p.fixtures).doc(invalid.id).update({'source.draft.economicTerms.capitalAmount':1});
  await assert.rejects(()=>service.execute(command(invalid.id,'invalid-terms'),'admin-a'));assert.deepEqual(await totals(),beforeInvalid);
  // Mutating the synthetic staging input cannot replace an already frozen instrument.
  await db.collection(p.fixtures).doc(first.id).update({'legalContext.issuer.legalName':'OTRA ENTIDAD SINTÉTICA'});
  const afterMutation=await totals();await assert.rejects(()=>service.execute(command(first.id,'replace-frozen'),'admin-a'),/CONTRACT_ALREADY_FROZEN_CONFLICT/);assert.deepEqual(await totals(),afterMutation);
  assert.deepEqual(await service.execute(firstCommand,'admin-a'),firstResult);assert.deepEqual(await service.getSnapshot(firstResult.snapshotId),originalSnapshot);
  console.log('CONTRACT_NO_ANNUAL_RESET = PASS');
  console.log('CONTRACT_TRANSACTION_CONCURRENCY_AND_IDEMPOTENCY = PASS');
  console.log('CONTRACT_ABORT_ROLLBACK_AND_COLLISION_STOP = PASS');
  console.log('CONTRACT_NO_ORPHAN_NUMBER_OR_SNAPSHOT = PASS');
  // Simulate retained high-water history; no production counter initialization occurs.
  const high=await fixture('high-history'),highSnapshot=syntheticSnapshot(high.f,'999999');
  await db.collection(p.snapshots).doc(highSnapshot.contractSnapshotId).create(highSnapshot);
  const highReceipt={contractId:high.id,snapshotId:highSnapshot.contractSnapshotId,contractNumber:highSnapshot.contractNumber,snapshotHash:highSnapshot.integrity.payloadHash};
  await db.collection(p.numbers).doc('CH-999999').create({policyId:'CONTRACT_NUMBERING_V1',sequence:'999999',receipt:highReceipt});
  await db.doc(p.counter).update({lastAllocatedSequence:'999999'});
  const overflow=await fixture('overflow'),overflowResult=await service.execute(command(overflow.id,'overflow'),'admin-a');assert.equal(overflowResult.contractNumber,'CH-1000000');
  const lastSnapshot=await service.getSnapshot(overflowResult.snapshotId);assert.ok(lastSnapshot);assert.equal(lastSnapshot.numbering.sequence,'1000000');
  // Production block is rechecked even after an emulator service has been constructed.
  const mode=process.env.NODE_ENV;Object.assign(process.env,{NODE_ENV:'production'});try{await assert.rejects(()=>service.execute(command(first.id,'blocked-prod'),'admin-a'),/PRODUCTIVE_CONTRACT_FREEZE_DISABLED/);await assert.rejects(()=>service.getSnapshot(firstResult.snapshotId),/PRODUCTIVE_CONTRACT_FREEZE_DISABLED/);}finally{if(mode===undefined)Reflect.deleteProperty(process.env,'NODE_ENV');else Object.assign(process.env,{NODE_ENV:mode});}
  assert.equal((await db.doc(p.counter).get()).data()!.lastAllocatedSequence,'1000000');
  assert.equal((await db.collection(p.commands).doc('blocked-prod').get()).exists,false);
  console.log('CONTRACT_SEQUENCE_OVER_999999 = PASS');
  console.log('CONTRACT_SERVICE_UPDATE_DELETE_REJECTED = PASS');
  console.log('CONTRACT_PRODUCTION_BLOCK_BEFORE_AND_AFTER_FACTORY = PASS');
 }finally{await service.close();await db.terminate();}
}
main().catch(error=>{console.error('CONTRACT_INFRASTRUCTURE_EMULATOR = FAIL', error instanceof Error ? error.stack?.split('\n').slice(1,3).join('\n') : 'sanitized');process.exitCode=1;});
