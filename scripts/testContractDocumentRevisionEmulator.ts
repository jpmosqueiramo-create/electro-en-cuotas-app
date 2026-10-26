import './helpers/requireSafeEmulatorEnvironment';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {admin} from '../src/lib/firebaseAdmin';
import {productionReadyFixture,syntheticFinalPackage} from './helpers/productionAdapterFixtures';
import {productionRuntimeForEmulator} from '../src/lib/productionV2/runtime';
import {recordFinalPackageApproval,authorizeOperation,scopes,productionRef} from '../src/lib/productionV2/authorization';
import {argentinaBusinessDate} from '../src/lib/productionV2/businessDate';
import {freezeOperation,frozenOperation,productionPaths} from '../src/lib/productionV2/freeze';
import {issueDocuments,issuedOperation,readIssuedDocument} from '../src/lib/productionV2/documents';
import {reopenBeforeSignature} from '../src/lib/productionV2/documentRevision';
import {editionRef,revisionStateRef} from '../src/lib/productionV2/documentRevisionState';
import {contractCommand} from '../src/lib/contractV2Server';
import {operationRef} from '../src/lib/operationV2';
import {getBudgetDocumentationBucket} from '../src/lib/budgetDocumentationStorage';
import {readOperationDraftDocuments} from '../src/lib/contractDocuments/operationDraftServer';
import {createCreditCase} from './testCreditReviewV2Emulator';
async function main(){
 const db=admin.firestore(),actor=(await admin.auth().createUser({email:process.env.NEXT_PUBLIC_ADMIN_EMAIL,emailVerified:true})).uid,p=syntheticFinalPackage(),runtime=productionRuntimeForEmulator(db,admin.auth(),[p],[actor]),bucket=await getBudgetDocumentationBucket();
 // The new preparation policy persists draft terms before credit; current conformity remains required.
 const pending=await createCreditCase();let draft=(await contractCommand(db,pending.id,1,{action:'SET_CONTRACT_PLAN',contractPlanCuotas:12,commandId:randomUUID(),expectedRevision:pending.d.revision},actor)).draft;
 draft=(await contractCommand(db,pending.id,1,{action:'SET_PAYMENT_DATES',firstInstallmentDueDate:'2027-01-31',preferredMonthlyDueDay:31,commandId:randomUUID(),expectedRevision:draft.revision},actor)).draft;
 assert.equal(draft.paymentScheduleDraft.length,12);assert.equal(draft.paymentScheduleDraft[1].dueDate,'2027-02-28');
 await assert.rejects(contractCommand(db,pending.id,1,{action:'MARK_READY_TO_FORMALIZE',commandId:randomUUID(),expectedRevision:draft.revision},actor),/conformidad/);
 draft=(await contractCommand(db,pending.id,1,{action:'UPDATE_PERSONAL_DATA',personalData:{...draft.personalData,fullName:pending.b.clienteSnapshot.nombre},commandId:randomUUID(),expectedRevision:draft.revision},actor)).draft;
 const preview=await readOperationDraftDocuments(db,pending.id,1);assert.equal(preview.available,false);assert.equal(preview.code,'DOCUMENT_IDENTITY_REVIEW_REQUIRED');assert.equal((await db.collection('contractNumbersV2').get()).size,0);
 const approvalId=randomUUID();await recordFinalPackageApproval(runtime,{commandId:approvalId,packageId:p.id,packageHash:p.sha256,approvalBasis:'OWNER_AUTHORIZATION',reason:'Aprobación sintética para pruebas sin efectos reales',confirmed:true},actor);
 const f=await productionReadyFixture(actor),id=f.id,v=1;
 await db.doc(productionPaths.counter).create({schemaVersion:'CONTRACT_NUMBER_COUNTER_V1',policyId:'CONTRACT_NUMBERING_V1',executionMode:'PRODUCTION',active:true,lastAllocatedSequence:'0',initializationAuthorizationReference:'SYNTHETIC_ONLY'});
 async function authorizeAndFreeze(){const d=(await f.r.draft.get()).data()!;const a=await authorizeOperation(runtime,id,v,{commandId:randomUUID(),operationId:f.identity.operationId,expectedRevision:d.revision,packageId:p.id,approvalId,formal:{contractIssueDate:argentinaBusinessDate(),contractIssuePlace:'Localidad sintética',promissoryNoteIssueDate:argentinaBusinessDate(),promissoryNoteIssuePlace:'Localidad sintética'},scopes:[...scopes],expiresAt:new Date(Date.now()+3600000).toISOString(),reason:'Emisión sintética sin efectos reales',confirmed:true},actor);return freezeOperation(runtime,id,v,{commandId:randomUUID(),authorizationId:a.id,expectedRevision:d.revision,confirmed:true},actor);}
 const first=await authorizeAndFreeze();await issueDocuments(runtime,bucket,id,v,actor);
 const original=await db.doc(productionPaths.snapshots+'/'+first.snapshotId).get(),counter=await db.doc(productionPaths.counter).get(),number=await db.doc(productionPaths.numbers+'/'+first.contractNumber).get(),manifest=await productionRef(db,id,v).collection('documents').doc('issued').get();
 const firstPdf=await readIssuedDocument(runtime,bucket,id,v,'MANDATE',actor);
 for(const edition of [2,3]){
  const current=await db.runTransaction(tx=>frozenOperation(runtime,tx,id,v,'ISSUANCE',false)),before=await f.r.draft.get();
  const payload={commandId:randomUUID(),expectedRevision:before.data()!.revision,snapshotHash:current.receipt.snapshotHash,reason:'Corrección sintética previa a firma',confirmed:true};
  const pair=await Promise.all([reopenBeforeSignature(runtime,id,v,payload,actor),reopenBeforeSignature(runtime,id,v,payload,actor)]);assert.equal(pair.filter(x=>!x.replay).length,1);assert.equal(pair[0].snapshotVersion,edition);
  await assert.rejects(reopenBeforeSignature(runtime,id,v,{...payload,reason:'Otro'},actor),/CONFLICT/);
  await assert.rejects(readIssuedDocument(runtime,bucket,id,v,'MANDATE',actor),/SNAPSHOT_REQUIRED/);
  async function cmd(action:string,extra:Record<string,unknown>={}){const d=(await f.r.draft.get()).data()!;return contractCommand(db,id,v,{action,commandId:randomUUID(),expectedRevision:d.revision,...extra},actor);}
  await cmd('SET_CONTRACT_PLAN',{contractPlanCuotas:edition===2?8:12});await cmd('SET_PAYMENT_DATES',{firstInstallmentDueDate:'2027-02-05',preferredMonthlyDueDay:5});
  await assert.rejects(cmd('MARK_READY_TO_FORMALIZE'),/conformidad/);assert.equal((await readOperationDraftDocuments(db,id,v)).available,true);
  await cmd('RECORD_CLIENT_CONFORMITY',{evidence:'Conformidad de prueba sintética para la nueva edición'});await cmd('MARK_READY_TO_FORMALIZE');
  const frozen=await authorizeAndFreeze();assert.equal(frozen.contractNumber,first.contractNumber);assert.notEqual(frozen.snapshotId,first.snapshotId);assert.notEqual(frozen.snapshotHash,first.snapshotHash);
  await Promise.all([issueDocuments(runtime,bucket,id,v,actor),issueDocuments(runtime,bucket,id,v,actor)]);
  const proof=await db.runTransaction(tx=>issuedOperation(runtime,tx,id,v,'ISSUANCE',false));assert.equal(proof.snapshot.snapshotVersion,edition);assert.equal(proof.manifest.snapshotHash,frozen.snapshotHash);assert.equal(proof.snapshot.economicTerms.contractTotal,proof.snapshot.paymentSchedule.installments.reduce((n,r)=>n+r.amount,0));
  assert.notDeepEqual(await readIssuedDocument(runtime,bucket,id,v,'MANDATE',actor),firstPdf);
  assert((await db.doc(productionPaths.counter).get()).updateTime!.isEqual(counter.updateTime!),'No second CH allocation');assert((await original.ref.get()).updateTime!.isEqual(original.updateTime!),'Original snapshot unchanged');assert((await number.ref.get()).updateTime!.isEqual(number.updateTime!));assert((await manifest.ref.get()).updateTime!.isEqual(manifest.updateTime!));
  assert.equal((await editionRef(db,id,v,edition).collection('documents').get()).size,1);
 }
 const active=await db.runTransaction(tx=>frozenOperation(runtime,tx,id,v,'ISSUANCE',false)),d=await f.r.draft.get();
 const request=()=>({commandId:randomUUID(),expectedRevision:d.data()!.revision,snapshotHash:active.receipt.snapshotHash,reason:'No debe permitir con firma o finanzas',confirmed:true});
 const photos=operationRef(db,id,v).parent.doc('delivery').collection('photos');const signature=photos.doc('synthetic-pending-signature');await signature.create({slot:'MANDATE_SIGNED',state:'PENDING'});await assert.rejects(reopenBeforeSignature(runtime,id,v,request(),actor),/POST_SIGNATURE/);await signature.delete();
 const delivery=operationRef(db,id,v).parent.doc('delivery');await delivery.set({status:'DELIVERED',event:{synthetic:true}});await assert.rejects(reopenBeforeSignature(runtime,id,v,request(),actor),/POST_SIGNATURE/);await delivery.delete();
 const finance=operationRef(db,id,v).parent.doc('financial');await finance.create({synthetic:true});await assert.rejects(reopenBeforeSignature(runtime,id,v,request(),actor),/POST_SIGNATURE/);await finance.delete();
 const outsider=(await admin.auth().createUser({email:'outsider-'+randomUUID()+'@example.test',emailVerified:true})).uid;await assert.rejects(reopenBeforeSignature(runtime,id,v,request(),outsider),/NOT_AUTHORIZED/);
 const state=await revisionStateRef(db,id,v).get(),body=state.data()!;await state.ref.update({snapshotVersion:500});await assert.rejects(db.runTransaction(tx=>frozenOperation(runtime,tx,id,v,'ISSUANCE',false)),/REVISION/);await state.ref.set(body);
 assert.equal((await db.collection('contractNumbersV2').get()).size,1);assert.equal((await db.collection('contractSnapshotsV2').get()).size,3);assert.equal((await db.doc(productionPaths.counter).get()).data()!.lastAllocatedSequence,'1');
 console.log('CONTRACT_DRAFT_PRE_CREDIT_PDF_REVISIONS_SAME_CH_CONCURRENCY_IDEMPOTENCY_IMMUTABLE_HISTORY_SIGNATURE_DELIVERY_FINANCE_ROLE_TAMPER = PASS; PRODUCTION_WRITES=0');
}
main().then(()=>admin.app().delete()).catch(e=>{console.error(e);process.exitCode=1;});
