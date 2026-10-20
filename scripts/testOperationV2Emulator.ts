import './helpers/requireSafeEmulatorEnvironment';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { NextRequest } from 'next/server';
import { admin } from '../src/lib/firebaseAdmin';
import { acceptBudgetV2 } from '../src/lib/budgetAcceptanceV2Server';
import { operationFromAcceptance, operationRef } from '../src/lib/operationV2';
import { contractCommand, contractRefs, getContract, publicContractData, unavailable } from '../src/lib/contractV2Server';
import { fixture, addressPayload } from './testContractV2';
import * as publicRoute from '../src/app/api/public/contract-data/[requestId]/route';
import * as adminRoute from '../src/app/api/admin/presupuestos-v2/[budgetId]/versions/[version]/contract/route';

async function run() {
  const db=admin.firestore(), id=`operation-${randomUUID()}`, {b}=fixture(id), refs=contractRefs(db,id,1);
  await refs.budget.set(b);
  const command={budgetId:id,version:1,acceptedOptionId:'option-1',preferredPlanCuotas:12,commandId:'accept'};
  const accepted=await Promise.all(Array.from({length:8},()=>acceptBudgetV2(db,command,'admin-demo')));
  const acceptance=accepted[0], expected=operationFromAcceptance(acceptance), opRef=operationRef(db,id,1);
  assert(accepted.every(a=>JSON.stringify(a)===JSON.stringify(acceptance)));
  assert.deepEqual((await opRef.get()).data(),expected);
  assert.equal((await opRef.parent.get()).size,1);
  await assert.rejects(acceptBudgetV2(db,{...command,commandId:'second-click'},'admin-demo'));
  assert.equal((await opRef.parent.get()).size,1);
  assert.equal((await refs.draft.get()).exists,false,'Acceptance must not create a contract draft');
  const prior=JSON.stringify((await refs.acceptance.get()).data());
  const view=await getContract(db,id,1);assert.equal(view.operation?.registered,true);assert.equal(view.operation?.contractState,'NOT_CREATED');
  assert.deepEqual(view.operation?.identity,expected);
  await contractCommand(db,id,1,{action:'OPEN_OR_CREATE',commandId:'open'},'admin-demo');
  let draft=(await getContract(db,id,1)).draft!;
  const execute=async(action:string,extra:Record<string,unknown>={})=>{
    const result=await contractCommand(db,id,1,{action,commandId:randomUUID(),expectedRevision:draft.revision,...extra},'admin-demo');
    draft=result.draft;return result;
  };
  const link=await execute('CREATE_CLIENT_DATA_REQUEST');assert(link.secret);
  const ctx={params:Promise.resolve({requestId:link.requestId!})};
  const request=(method:string,origin:string|null='https://www.cuentahogar.com.ar',token=link.secret!)=>new NextRequest(
    `http://0.0.0.0:8080/api/public/contract-data/${link.requestId}`,{method,
      headers:{'X-Client-Data-Token':token,'Content-Type':'application/json',...(origin?{Origin:origin}:{})},
      ...(method==='POST'?{body:JSON.stringify(addressPayload)}:{})});
  assert.equal((await publicRoute.GET(request('GET',null),ctx)).status,200);
  assert.equal((await publicRoute.POST(request('POST','https://evil.invalid'),ctx)).status,400);
  assert.equal((await publicRoute.POST(request('POST',null),ctx)).status,400);
  assert.equal((await publicRoute.GET(request('GET',null,'invalid'),ctx)).status,400);
  assert.equal((await publicRoute.POST(request('POST'),ctx)).status,200);
  assert.equal((await publicRoute.POST(request('POST'),ctx)).status,200,'identical submission replay');
  assert.equal((await refs.draft.get()).data()!.personalData.address,'','No silent application');
  await execute('APPLY_CLIENT_SUBMISSION',{submissionId:link.requestId});
  assert.equal(draft.personalData.address,addressPayload.personalData.address);
  const received=await getContract(db,id,1);assert.equal(received.submissions.length,1);
  assert(!JSON.stringify(received).includes(link.secret!));
  assert(!JSON.stringify(received).includes('tokenHash'));
  // A different operation cannot apply a submission from this one.
  const otherId=`other-${randomUUID()}`, other=fixture(otherId), otherRefs=contractRefs(db,otherId,1);
  await otherRefs.budget.set(other.b);await otherRefs.acceptance.set(other.a);
  const historicalBefore=JSON.stringify((await otherRefs.acceptance.get()).data());
  const historical=await getContract(db,otherId,1);
  assert.equal(historical.operation?.registered,false);
  assert.notEqual(historical.operation?.identity.operationId,expected.operationId);
  assert.equal((await operationRef(db,otherId,1).get()).exists,false,'GET never migrates');
  const od=(await contractCommand(db,otherId,1,{action:'OPEN_OR_CREATE',commandId:'open'},'admin-demo')).draft;
  await assert.rejects(contractCommand(db,otherId,1,{action:'APPLY_CLIENT_SUBMISSION',commandId:'cross',expectedRevision:od.revision,submissionId:link.requestId},'admin-demo'));
  assert.equal(JSON.stringify((await otherRefs.acceptance.get()).data()),historicalBefore);
  const revoked=await execute('CREATE_CLIENT_DATA_REQUEST');await execute('REVOKE_CLIENT_DATA_REQUEST');
  await assert.rejects(publicContractData(db,revoked.requestId!,revoked.secret!),{message:unavailable});
  const expired=await execute('CREATE_CLIENT_DATA_REQUEST');
  await refs.draft.collection('requests').doc(expired.requestId!).update({expiresAt:'2000-01-01T00:00:00.000Z'});
  await assert.rejects(publicContractData(db,expired.requestId!,expired.secret!),{message:unavailable});
  // Transaction abort leaves neither Acceptance, documentation nor operation behind.
  const abortId=`abort-${randomUUID()}`, abort=fixture(abortId), ar=contractRefs(db,abortId,1);
  await ar.budget.set(abort.b);const original=db.runTransaction.bind(db);
  db.runTransaction=((fn:Parameters<typeof db.runTransaction>[0])=>original(async tx=>{await fn(tx);throw Error('INJECTED_ABORT');})) as typeof db.runTransaction;
  try {await assert.rejects(acceptBudgetV2(db,{...command,budgetId:abortId},'admin-demo'),/INJECTED_ABORT/);} finally {db.runTransaction=original;}
  assert.equal((await ar.acceptance.get()).exists,false);assert.equal((await operationRef(db,abortId,1).get()).exists,false);
  assert.equal((await ar.family.collection('documentation').doc('1').get()).exists,false);
  assert.equal(JSON.stringify((await refs.acceptance.get()).data()),prior);
  const adminCtx={params:Promise.resolve({budgetId:id,version:'1'})};
  assert.equal((await adminRoute.GET(new NextRequest('http://localhost/api/admin/test'),adminCtx)).status,401);
  // A corrupted link is rejected, never silently adopted.
  await opRef.update({solicitudId:'other-source'});await assert.rejects(getContract(db,id,1),/OPERATION_IDENTITY_CONFLICT/);
  console.log('OPERATION_V2_EMULATOR = PASS; CONCURRENT_ACCEPTANCE = PASS; ATOMIC_ABORT = PASS; HISTORICAL_READ_ONLY = PASS; CROSS_OPERATION = DENIED; CLIENT_ORIGIN = PASS; EXPLICIT_APPLY = PASS; EXPIRED_REVOKED = DENIED; PRODUCTION_WRITES = 0');
}
run().catch(error=>{console.error(error);process.exitCode=1;}).finally(async()=>{await Promise.all(admin.apps.map(app=>app?.delete()));});
