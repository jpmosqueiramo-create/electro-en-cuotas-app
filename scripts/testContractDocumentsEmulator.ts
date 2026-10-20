import './helpers/requireSafeEmulatorEnvironment';
import assert from 'node:assert/strict';
import { Firestore } from 'firebase-admin/firestore';
import { mkdirSync,writeFileSync } from 'node:fs';
import { persistReadyContract } from './helpers/contractFreezeFixtures';
import { createContractFreezeIntegrationEmulator,FREEZE_DEPENDENCIES_COLLECTION } from '../src/lib/contractFreezeIntegrationEmulator';
import { CONTRACT_INFRASTRUCTURE_PATHS as paths,assertContractInfrastructureEmulator } from '../src/lib/contractInfrastructureEmulator';
import { generateContractReviewPair,reviewDocumentDefinitions } from '../src/lib/contractDocuments/pdf';
import { projectContractReview } from '../src/lib/contractDocuments/projection';
import { contractValueHash } from '../src/lib/contractIntegrityV2';
async function main(){
 assertContractInfrastructureEmulator();const db=new Firestore({projectId:'demo-cuenta-hogar',host:'127.0.0.1:8080',ssl:false}),service=createContractFreezeIntegrationEmulator();
 try{
  const f=await persistReadyContract(db,`synthetic-pdf-${Date.now()}`,true,18);f.legal.documentDefinitions=reviewDocumentDefinitions();
  if(!(await db.doc(paths.counter).get()).exists)await db.doc(paths.counter).create({schemaVersion:'CONTRACT_NUMBER_COUNTER_V1',policyId:'CONTRACT_NUMBERING_V1',executionMode:'EMULATOR_ONLY',active:true,lastAllocatedSequence:'0'});
  await db.collection(FREEZE_DEPENDENCIES_COLLECTION).doc('synthetic-pdf-review').create({schemaVersion:'CONTRACT_FREEZE_SYNTHETIC_DEPENDENCIES_V1',executionMode:'EMULATOR_ONLY',legalApproval:'NOT_APPROVED_SYNTHETIC_ONLY',legalContext:f.legal});
  const receipt=await service.execute({action:'FREEZE_READY_EMULATOR',commandId:`pdf-${Date.now()}`,budgetId:f.id,budgetVersion:1,expectedRevision:f.d.revision,dependenciesId:'synthetic-pdf-review'},'synthetic-admin-a');
  const snapshot=await service.getSnapshot(receipt.snapshotId);assert.ok(snapshot);
  const before=contractValueHash(snapshot),counterBefore=(await db.doc(paths.counter).get()).data();
  const docs=generateContractReviewPair(snapshot);assert.equal(docs.manifest.snapshotHash,receipt.snapshotHash);assert.equal(docs.manifest.contractNumber,receipt.contractNumber);
  assert.deepEqual(projectContractReview(snapshot).schedule,f.d.paymentScheduleDraft.map(r=>({number:r.installmentNumber,date:r.dueDate,amount:r.amount})));assert.equal(projectContractReview(snapshot).economics.capital,580000.5);
  assert.equal(contractValueHash(await service.getSnapshot(receipt.snapshotId)),before);assert.deepEqual((await db.doc(paths.counter).get()).data(),counterBefore);
  const folder='/tmp/cuenta-hogar-contract-documents/c1-integration';mkdirSync(folder,{recursive:true});writeFileSync(`${folder}/mandato.pdf`,docs.mandate.bytes);writeFileSync(`${folder}/pagare.pdf`,docs.promissoryNote.bytes);writeFileSync(`${folder}/manifest.json`,JSON.stringify(docs.manifest,null,2));
  console.log('DOCUMENTS_REAL_READY_C1_SNAPSHOT_INTEGRATION = PASS; GENERATOR_FIREBASE_WRITES = 0');
 }finally{await service.close();await db.terminate();}
}
main().catch(error=>{console.error('DOCUMENTS_EMULATOR = FAIL',error instanceof Error?error.stack?.split('\n').filter(line=>line.trim().startsWith('at ')).slice(0,4).join('\n'):'unexpected');process.exitCode=1;});
