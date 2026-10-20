import './helpers/requireSafeEmulatorEnvironment';
import assert from 'node:assert/strict';
import {NextRequest} from 'next/server';
import * as operationsApi from '../src/app/api/admin/presupuestos-v2/[budgetId]/versions/[version]/contract/operations/route';
import {Firestore} from 'firebase-admin/firestore';
import {infrastructureFixture} from './helpers/contractInfrastructureFixtures';
import {contractRefs,contractCommand} from '../src/lib/contractV2Server';
import {contractOperations} from '../src/lib/contractDocuments/operationsServer';
import {buildReadyEvidence,reviewedTerms} from '../src/lib/contractReadyV2';
import {createContractFreezeIntegrationEmulator,FREEZE_DEPENDENCIES_COLLECTION} from '../src/lib/contractFreezeIntegrationEmulator';
import {CONTRACT_INFRASTRUCTURE_PATHS} from '../src/lib/contractInfrastructureEmulator';
import {reviewDocumentDefinitions,generateContractReviewPair} from '../src/lib/contractDocuments/pdf';
import {projectContractReview} from '../src/lib/contractDocuments/projection';
import {contractValueHash} from '../src/lib/contractIntegrityV2';
async function main(){
 const db=new Firestore({projectId:'demo-cuenta-hogar',host:'127.0.0.1:8080',ssl:false});
 try{
  const f=infrastructureFixture('synthetic-business-operations'),{budget:b,acceptance:a,draft:d}=f.source,refs=contractRefs(db,b.id,b.version);
  await refs.budget.set(b);await refs.acceptance.set(a);await refs.draft.set(d);
  const legacyDigest=contractValueHash(reviewedTerms(d));
  const result=await contractCommand(db,b.id,b.version,{action:'SET_GOODS_CONDITION',commandId:'condition',expectedRevision:d.revision,goodsCondition:'USADO'},'synthetic-admin');
  assert.equal(result.draft.goodsCondition?.value,'USADO');assert.notEqual(contractValueHash(reviewedTerms(result.draft)),legacyDigest);
  const evidence=buildReadyEvidence(b,a,result.draft,'synthetic-admin','2026-10-19T12:00:00.000Z','ready');assert.ok(evidence.termsDigest);
  const context={params:Promise.resolve({budgetId:b.id,version:String(b.version)})};
  const requestUrl=`http://localhost/api/admin/presupuestos-v2/${b.id}/versions/${b.version}/contract/operations`;
  assert.equal((await operationsApi.GET(new NextRequest(requestUrl),context)).status,401);
  const authResponse=await fetch('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:'synthetic-ops-client@example.test',password:'Synthetic-only-123!',returnSecureToken:true})});
  assert.equal(authResponse.status,200);const credentials=await authResponse.json() as {idToken:string};
  assert.equal((await operationsApi.GET(new NextRequest(requestUrl,{headers:{Authorization:`Bearer ${credentials.idToken}`}}),context)).status,403);
  assert.equal((await operationsApi.POST(new NextRequest(requestUrl,{method:'POST',headers:{Authorization:`Bearer ${credentials.idToken}`,'Content-Type':'application/json'},body:JSON.stringify({action:'FORMALIZED'})}),context)).status,403);
  const initial=await contractOperations(db,b.id,b.version,'synthetic-admin');assert.equal(initial.revision,0);
  assert.equal((await refs.draft.collection('operationalEvidence').get()).size,0,'GET must not write');
  const payload={action:'RECORD_SIGNATURE',commandId:'physical-1',expectedRevision:0,kind:'customerMandate',signedOn:'2026-10-19',actualPlace:'Localidad sintética',originalReference:'original-synthetic',channel:'WHATSAPP'};
  const saved=await contractOperations(db,b.id,b.version,'synthetic-admin',payload),replayed=await contractOperations(db,b.id,b.version,'synthetic-admin',payload);assert.deepEqual(saved,replayed);
  await assert.rejects(()=>contractOperations(db,b.id,b.version,'synthetic-admin',{...payload,actualPlace:'Otro lugar'}));
  await assert.rejects(()=>contractOperations(db,b.id,b.version,'synthetic-admin',{action:'RECORD_DELIVERY',commandId:'blocked',expectedRevision:1}));
  assert.equal((await refs.draft.collection('operationalEvents').get()).size,1);
  const concurrent=await Promise.allSettled(['customerNote','deliveryReceipt'].map(kind=>contractOperations(db,b.id,b.version,'synthetic-admin',{...payload,kind,commandId:kind,expectedRevision:1})));
  assert.equal(concurrent.filter(x=>x.status==='fulfilled').length,1);assert.equal(concurrent.filter(x=>x.status==='rejected').length,1);
  let current=await contractOperations(db,b.id,b.version,'synthetic-admin');
  for(const kind of ['customerNote','deliveryReceipt'])if(!current.signatures[kind as 'customerNote'|'deliveryReceipt'])current=await contractOperations(db,b.id,b.version,'synthetic-admin',{...payload,kind,commandId:'complete-'+kind,expectedRevision:current.revision});
  const delivered=await contractOperations(db,b.id,b.version,'synthetic-admin',{action:'RECORD_DELIVERY',commandId:'deliver',expectedRevision:current.revision});
  assert.equal(delivered.delivery.state,'DELIVERED');assert.equal(delivered.custody,'PENDING');assert.equal(delivered.signatures.representative,undefined);assert.equal(delivered.legalFormalization,'PENDING');
  const originalMode=process.env.NODE_ENV;
  try{Object.assign(process.env,{NODE_ENV:'production'});await assert.rejects(()=>contractOperations(db,b.id,b.version,'synthetic-admin',{action:'RECEIVE_ORIGINALS',commandId:'production-denied',expectedRevision:delivered.revision}));}
  finally{if(originalMode===undefined)Reflect.deleteProperty(process.env,'NODE_ENV');else Object.assign(process.env,{NODE_ENV:originalMode});}
  assert.equal((await contractOperations(db,b.id,b.version,'synthetic-admin')).revision,delivered.revision);

  assert.deepEqual((await refs.budget.get()).data(),b);assert.deepEqual((await refs.acceptance.get()).data(),a);
  const ready=await contractCommand(db,b.id,b.version,{action:'MARK_READY_TO_FORMALIZE',commandId:'ready-condition',expectedRevision:result.draft.revision},'synthetic-admin');
  f.legalContext.documentDefinitions=reviewDocumentDefinitions();
  f.legalContext.documentContext.parameters={goodsConditionVersion:'GOODS_CONDITION_V1',goodsCondition:'USADO'};
  await db.collection(FREEZE_DEPENDENCIES_COLLECTION).doc('synthetic-business').create({schemaVersion:'CONTRACT_FREEZE_SYNTHETIC_DEPENDENCIES_V1',executionMode:'EMULATOR_ONLY',legalApproval:'NOT_APPROVED_SYNTHETIC_ONLY',legalContext:f.legalContext});
  await db.doc(CONTRACT_INFRASTRUCTURE_PATHS.counter).create({schemaVersion:'CONTRACT_NUMBER_COUNTER_V1',policyId:'CONTRACT_NUMBERING_V1',executionMode:'EMULATOR_ONLY',active:true,lastAllocatedSequence:'0'});
  const service=createContractFreezeIntegrationEmulator();
  try{const command={action:'FREEZE_READY_EMULATOR',commandId:'freeze-condition',budgetId:b.id,budgetVersion:b.version,expectedRevision:ready.draft.revision,dependenciesId:'synthetic-business'};
   const frozen=await service.execute(command,'synthetic-admin-a'),snapshot=await service.getSnapshot(frozen.snapshotId);assert.ok(snapshot);
   assert.equal(projectContractReview(snapshot).reference.condition,'USADO');assert.equal(generateContractReviewPair(snapshot).mandate.pages,2);
   assert.deepEqual(await service.execute(command,'synthetic-admin-a'),frozen);
   const signedLater=await contractOperations(db,b.id,b.version,'synthetic-admin',{...payload,kind:'representative',commandId:'representative-later',expectedRevision:delivered.revision});
   const originals=await contractOperations(db,b.id,b.version,'synthetic-admin',{action:'RECEIVE_ORIGINALS',commandId:'originals',expectedRevision:signedLater.revision});
   assert.equal(originals.delivery.state,'DELIVERED');assert.equal(originals.custody,'ORIGINALS_RECEIVED');assert.equal(originals.legalFormalization,'PENDING');
   assert.deepEqual(await service.getSnapshot(frozen.snapshotId),snapshot);

  }finally{await service.close();}
  console.log('BUSINESS_OPERATIONS_EMULATOR_CONDITION_READY_FREEZE_PDF_IDEMPOTENCY_NO_READ_WRITES = PASS');
 }finally{await db.terminate();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
