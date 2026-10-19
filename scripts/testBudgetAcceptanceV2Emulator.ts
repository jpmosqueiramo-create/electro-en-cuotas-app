import './helpers/requireSafeEmulatorEnvironment';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import type { Bucket } from '@google-cloud/storage';
import { budgetV2SafeErrorMessage } from '../src/lib/budgetV2';
import { admin } from '../src/lib/firebaseAdmin';
import { budgetFixture } from './helpers/budgetV2Fixtures';
import { persistBudgetV2 } from '../src/lib/budgetV2Persistence';
import { acceptBudgetV2, loadDocumentation } from '../src/lib/budgetAcceptanceV2Server';
import { getBudgetDocumentationBucket, uploadBudgetDocument, downloadBudgetDocument, deleteBudgetDocument, observeBudgetDocument } from '../src/lib/budgetDocumentationStorage';
import { fixtureFiles, modelTests } from './testBudgetAcceptanceV2';
import { MAX_ATTACHMENT_SIZE_BYTES } from '../src/lib/budgetAcceptanceV2';
import { NextRequest } from 'next/server';
import * as route from '../src/app/api/admin/presupuestos-v2/[budgetId]/versions/[version]/[...operation]/route';
import type { Firestore, Transaction } from 'firebase-admin/firestore';

async function main() {
  assert.equal(process.env.FIREBASE_STORAGE_EMULATOR_HOST, '127.0.0.1:9199');
  modelTests();
  const db = admin.firestore(), bucket = await getBudgetDocumentationBucket();
  const prefix = `p4-emulator-${Date.now()}`;
  const source = db.doc('solicitudes/p3-shared-id'); await source.set({ estado: 'PENDIENTE', marker: 'legacy unchanged' });
  const legacy = (await source.get()).data();
  const budget = budgetFixture(prefix);
  const saved = await persistBudgetV2(db, { action:'SAVE', commandId:'save', budget, expectedRevision:0, privateOptionIds:[] }, 'admin-fixture');
  const cmd = { budgetId: prefix, version:1, acceptedOptionId:'option-1', preferredPlanCuotas:null, commandId:'accept' };
  await assert.rejects(() => acceptBudgetV2(db, cmd, 'admin-fixture'));
  const emitted = await persistBudgetV2(db, { action:'ISSUE', commandId:'issue', budget:saved, expectedRevision:saved.revision, privateOptionIds:[] }, 'admin-fixture');
  const accepted = await acceptBudgetV2(db, cmd, 'admin-fixture');
  assert.deepEqual(await acceptBudgetV2(db, cmd, 'admin-fixture'), accepted);
  for (const change of [{ acceptedOptionId:'option-0' }, { preferredPlanCuotas:12 }, { commandId:'another' }, { extra:'snapshot' }]) await assert.rejects(() => acceptBudgetV2(db, { ...cmd, ...change }, 'admin-fixture'));
  const revision = await persistBudgetV2(db, { action:'REVISE', commandId:'revise', budget:emitted, expectedRevision:emitted.revision, privateOptionIds:[] }, 'admin-fixture');
  await assert.rejects(() => acceptBudgetV2(db, { ...cmd, version:revision.version, commandId:'accept-v2' }, 'admin-fixture'));
  assert.deepEqual((await loadDocumentation(db,prefix,1)).acceptance, accepted);
  const second = { ...budgetFixture(`${prefix}-preferred`), estado:'EMITIDO', issuedAt:new Date().toISOString() };
  await db.doc(`presupuestos_v2/${second.id}/versions/1`).set(second);
  const preferred = await acceptBudgetV2(db, { ...cmd, budgetId:second.id, preferredPlanCuotas:12 }, 'admin-fixture');
  assert.equal(preferred.preferredPlanAmountSnapshot, second.options[1].referenceSnapshot.planesOfrecidos.find(p=>p.cuotas===12)!.cuotaEstimada);
  await db.doc('productos/p4-live-change').set({ costoProveedor:1 });
  assert.deepEqual(await acceptBudgetV2(db, cmd, 'admin-fixture'), accepted);
  await db.doc('productos/p4-live-change').delete();
  assert.deepEqual((await db.doc(`presupuestos_v2/${prefix}/versions/1`).get()).data(), emitted);
  console.log('P4_ACCEPTANCE_EMULATOR = PASS');
  for (const [i,f] of fixtureFiles.entries()) {
    const fields={commandId:`upload-${i}`,originalName:`../../synthetic-${i}.file`,mimeType:f.mime};
    const a = await uploadBudgetDocument(db,bucket,prefix,1,'DNI_FRONT',fields,f.bytes,'admin-fixture');
    assert.deepEqual(await uploadBudgetDocument(db,bucket,prefix,1,'DNI_FRONT',fields,f.bytes,'admin-fixture'),a);
    await assert.rejects(()=>uploadBudgetDocument(db,bucket,prefix,1,'DNI_FRONT',fields,Buffer.concat([f.bytes,Buffer.from('different')]),'admin-fixture'));
    const current=(await loadDocumentation(db,prefix,1)).documentation;
    assert.equal(current.slots.DNI_FRONT.attachments.filter(item=>item.attachmentId===a.attachmentId).length,1);
    assert.ok(!a.storagePath.includes('synthetic'));assert.ok(!a.storagePath.includes('..'));
    assert.equal((await bucket.file(a.storagePath).getMetadata())[0].metadata?.firebaseStorageDownloadTokens,undefined);
    const downloaded=await downloadBudgetDocument(db,bucket,prefix,1,'DNI_FRONT',a.attachmentId);assert.deepEqual(downloaded.bytes,f.bytes);
    await observeBudgetDocument(db,prefix,1,'DNI_FRONT',{observation:'Revisar legibilidad'},'admin-fixture');
    assert.equal((await loadDocumentation(db,prefix,1)).documentation.slots.DNI_FRONT.status,'OBSERVADO');
    await deleteBudgetDocument(db,bucket,prefix,1,'DNI_FRONT',a.attachmentId,'admin-fixture');
    await deleteBudgetDocument(db,bucket,prefix,1,'DNI_FRONT',a.attachmentId,'admin-fixture');
    assert.equal((await bucket.file(a.storagePath).exists())[0],false);
    await assert.rejects(()=>uploadBudgetDocument(db,bucket,prefix,1,'DNI_FRONT',fields,f.bytes,'admin-fixture'));
  }
  assert.equal((await loadDocumentation(db,prefix,1)).documentation.slots.DNI_FRONT.status,'SIN_CARGAR');
  for(const bad of [{mime:'text/plain',bytes:Buffer.from('text')},{mime:'image/png',bytes:fixtureFiles[0].bytes},{mime:'image/png',bytes:Buffer.alloc(MAX_ATTACHMENT_SIZE_BYTES+1)}]) await assert.rejects(()=>uploadBudgetDocument(db,bucket,prefix,1,'DNI_FRONT',{commandId:'invalid',originalName:'synthetic',mimeType:bad.mime},bad.bytes,'admin-fixture'));
  await assert.rejects(()=>deleteBudgetDocument(db,bucket,prefix,1,'DNI_FRONT','../../arbitrary','admin-fixture'));
  await assert.rejects(()=>observeBudgetDocument(db,prefix,1,'DNI_FRONT',{observation:'no attachment'},'admin-fixture'));
  await assert.rejects(()=>observeBudgetDocument(db,prefix,1,'DNI_FRONT',{observation:'x',storagePath:'arbitrary'},'admin-fixture'));
  const realRunTransaction = db.runTransaction.bind(db);
  function metadataFailureDb(offline = false) {
    let calls = 0;
    const run = <T>(update: (transaction: Transaction) => Promise<T>, options?: Parameters<Firestore['runTransaction']>[1]): Promise<T> => {
      if (++calls === 2 || (offline && calls > 2)) return Promise.reject(new Error('SECRET_RAW_FIRESTORE /internal/path'));
      return realRunTransaction(update, options);
    };
    return new Proxy(db, { get(target, prop) {
      if (prop === 'runTransaction') return run;
      const value = Reflect.get(target, prop); return typeof value === 'function' ? value.bind(target) : value;
    } });
  }
  let saves = 0, deletes = 0;
  const failingDeleteBucket = new Proxy(bucket, { get(target, prop) {
    if (prop === 'file') return (...args: Parameters<Bucket['file']>) => {
      const file = target.file(...args);
      return new Proxy(file, { get(object, key) {
        if (key === 'save') return (...values: Parameters<typeof file.save>) => { saves++; return file.save(...values); };
        if (key === 'delete') return () => { deletes++; return Promise.reject(new Error('SECRET_RAW_STORAGE bucket/internal')); };
        const value = Reflect.get(object, key); return typeof value === 'function' ? value.bind(object) : value;
      } });
    };
    const value = Reflect.get(target, prop); return typeof value === 'function' ? value.bind(target) : value;
  } });
  const reconciliationMessage = 'No se pudo completar la carga y quedó pendiente una reconciliación administrativa.';
  const records = db.collection('presupuestos_v2').doc(prefix).collection('documentCommands');
  const fields = (id: string) => ({ commandId:id, originalName:'synthetic.pdf', mimeType:'application/pdf' });
  const bytes = fixtureFiles[3].bytes;
  const logs: Record<string, unknown>[] = [];
  async function captureLog<T>(work: () => Promise<T>) {
    const original = console.error;
    console.error = (entry: unknown) => { assert.equal(typeof entry,'string'); logs.push(JSON.parse(entry as string)); };
    try { return await work(); } finally { console.error = original; }
  }
  const before=(await bucket.getFiles({prefix:`budget-documentation-v2/${prefix}/`}))[0].length;
  let originalFailure: unknown;
  try { await uploadBudgetDocument(metadataFailureDb(),bucket,prefix,1,'PAYSLIP',fields('compensate'),bytes,'admin-fixture'); }
  catch (error) { originalFailure=error; }
  assert.ok(originalFailure);
  assert.equal(budgetV2SafeErrorMessage(originalFailure),'No se pudo completar la operación.');
  assert.equal((await bucket.getFiles({prefix:`budget-documentation-v2/${prefix}/`}))[0].length,before);
  const compensated=(await records.doc('compensate').get()).data()!;
  assert.equal(compensated.state,'COMPENSATED'); assert.equal(compensated.leaseUntil,0);
  assert.equal((await loadDocumentation(db,prefix,1)).documentation.slots.PAYSLIP.attachments.length,0);
  console.log('UPLOAD_COMPENSATION_SUCCESS_TEST = PASS');

  await captureLog(() => assert.rejects(() => uploadBudgetDocument(metadataFailureDb(),failingDeleteBucket,prefix,1,'PAYSLIP',fields('rollback-failed'),bytes,'admin-fixture'), { message:reconciliationMessage }));
  const pendingRef=records.doc('rollback-failed');
  const pending=(await pendingRef.get()).data()!;
  assert.equal(pending.state,'ROLLBACK_PENDING'); assert.notEqual(pending.leaseUntil,0);
  assert.equal(pending.commandId,'rollback-failed'); assert.equal(pending.budgetId,prefix); assert.equal(pending.budgetVersion,1); assert.equal(pending.documentType,'PAYSLIP');
  assert.match(pending.attachmentId,/^att_[a-f0-9]{64}$/);
  assert.equal(pending.storagePath,`budget-documentation-v2/${prefix}/v1/PAYSLIP/${pending.attachmentId}`);
  assert.equal(pending.sha256,createHash('sha256').update(bytes).digest('hex')); assert.ok(Number.isFinite(Date.parse(pending.failureAt)));
  assert.ok(pending.objectGeneration);
  assert.deepEqual((await bucket.file(pending.storagePath).download())[0],bytes);
  for (const key of Object.keys(pending)) assert.ok(!/bytes|base64|download|token/i.test(key));
  assert.equal(logs.at(-1)?.event,'DOCUMENT_UPLOAD_ROLLBACK_PENDING'); assert.equal(logs.at(-1)?.durableReservationRecorded,true);
  assert.ok(!JSON.stringify(logs).includes('SECRET_RAW'));
  assert.equal((await loadDocumentation(db,prefix,1)).documentation.slots.PAYSLIP.attachments.length,0);
  const createdBeforeRetry=saves,deletedBeforeRetry=deletes;
  // Even an expired lease must not turn ROLLBACK_PENDING into a new upload.
  await pendingRef.update({leaseUntil:1});
  const durableBeforeRetry=(await pendingRef.get()).data();
  await assert.rejects(()=>uploadBudgetDocument(db,failingDeleteBucket,prefix,1,'PAYSLIP',fields('rollback-failed'),bytes,'admin-fixture'),{message:reconciliationMessage});
  assert.equal(saves-createdBeforeRetry,0);assert.equal(deletes-deletedBeforeRetry,0);
  assert.deepEqual((await pendingRef.get()).data(),durableBeforeRetry);
  console.log('UPLOAD_COMPENSATION_FAILURE_TEST = PASS; ROLLBACK_PENDING_DURABLE_SIGNAL = PASS');
  console.log('ROLLBACK_PENDING_RETRY_TEST = PASS; STORAGE_OBJECTS_CREATED_ON_RETRY = 0');

  // A reused object must never be deleted by a compensating execution.
  const reusedId='att_'+createHash('sha256').update(JSON.stringify([prefix,1,'PAYSLIP','reused-object'])).digest('hex');
  const reusedPath=`budget-documentation-v2/${prefix}/v1/PAYSLIP/${reusedId}`;
  await bucket.file(reusedPath).save(bytes,{resumable:false});
  const generation=(await bucket.file(reusedPath).getMetadata())[0].generation;
  const foreignDeleteCount=deletes;
  await captureLog(()=>assert.rejects(()=>uploadBudgetDocument(metadataFailureDb(),failingDeleteBucket,prefix,1,'PAYSLIP',fields('reused-object'),bytes,'admin-fixture'),{message:reconciliationMessage}));
  assert.equal(deletes,foreignDeleteCount); assert.equal((await bucket.file(reusedPath).getMetadata())[0].generation,generation);
  assert.deepEqual((await bucket.file(reusedPath).download())[0],bytes);
  assert.equal((await records.doc('reused-object').get()).data()!.state,'ROLLBACK_PENDING');
  // No claim of a durable mark if Firestore cannot persist the reconciliation state.
  await captureLog(()=>assert.rejects(()=>uploadBudgetDocument(metadataFailureDb(true),failingDeleteBucket,prefix,1,'PAYSLIP',fields('firestore-offline'),bytes,'admin-fixture'),{message:reconciliationMessage}));
  const offline=(await records.doc('firestore-offline').get()).data()!;
  assert.equal(offline.state,'RESERVED'); assert.notEqual(offline.leaseUntil,0); assert.equal(offline.budgetId,prefix);
  assert.equal(logs.at(-1)?.durableReservationRecorded,false); assert.equal(logs.at(-1)?.error,'RESERVATION_MARK_UNAVAILABLE');
  console.log('COMPENSATION_CAN_DELETE_FOREIGN_OBJECT = NO; FIRESTORE_OUTAGE_LIMIT_TEST = PASS');
  assert.deepEqual((await source.get()).data(),legacy);
  console.log('P4_DOCUMENT_STORAGE_EMULATOR = PASS');

  const email='jpmosqueiramo@gmail.com',password='emulator-fixture-password';
  try{await admin.auth().createUser({email,password});}catch(e){if((e as {code?:string}).code!=='auth/email-already-exists')throw e;const u=await admin.auth().getUserByEmail(email);await admin.auth().updateUser(u.uid,{password});}
  const login=await fetch('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=demo-key',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password,returnSecureToken:true})});
  assert.equal(login.status,200);const token=(await login.json()).idToken as string;
  async function api(operation:string[],method:string,body?:unknown,authorized=true,id=prefix,version='1'){
    const req=new NextRequest(`http://localhost:3000/api/admin/presupuestos-v2/${id}/versions/${version}/${operation.join('/')}`,{method,headers:{...(authorized?{Authorization:`Bearer ${token}`} :{}),'Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})});
    return route[method as 'POST'|'GET'|'PATCH'|'DELETE'](req,{params:Promise.resolve({budgetId:id,version,operation})});
  }
  assert.equal((await api(['acceptance'],'GET',undefined,false)).status,401);
  const nonAdminEmail=`non-admin-${Date.now()}@example.test`;
  await admin.auth().createUser({email:nonAdminEmail,password});
  const nonAdminLogin=await fetch('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=demo-key',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:nonAdminEmail,password,returnSecureToken:true})});
  const nonAdminToken=(await nonAdminLogin.json()).idToken as string;
  const forbidden=await route.GET(new NextRequest(`http://localhost/api/admin/presupuestos-v2/${prefix}/versions/1/documentation`,{headers:{Authorization:`Bearer ${nonAdminToken}`}}),{params:Promise.resolve({budgetId:prefix,version:'1',operation:['documentation']})});
  assert.equal(forbidden.status,403);
  assert.equal((await api(['documentation','DNI_FRONT','attachments','att_'+'a'.repeat(64)],'DELETE',{storagePath:'arbitrary'})).status,409);
  const multipart=new FormData();multipart.append('commandId','api-extra');multipart.append('file',new File([new Uint8Array(fixtureFiles[3].bytes)],'synthetic.pdf',{type:'application/pdf'}));multipart.append('storagePath','arbitrary');
  const rejectedForm=await route.POST(new NextRequest(`http://localhost/api/admin/presupuestos-v2/${prefix}/versions/1/documentation/DNI_FRONT/attachments`,{method:'POST',headers:{Authorization:`Bearer ${token}`},body:multipart}),{params:Promise.resolve({budgetId:prefix,version:'1',operation:['documentation','DNI_FRONT','attachments']})});
  assert.equal(rejectedForm.status,409);
  for (const invalid of [{...cmd,optionSnapshot:{}},{...cmd,acceptedOptionId:[]},{...cmd,preferredPlanCuotas:'12'},{...cmd,version:0},{...cmd,commandId:{}}]) assert.equal((await api(['acceptance'],'POST',invalid)).status,409);
  for(const op of [['documentation','INVALID','attachments'],['documentation','DNI_FRONT','attachments','../arbitrary']]) assert.equal((await api(op,'DELETE')).status,409);
  assert.equal((await api(['documentation','DNI_FRONT'],'PATCH',{observation:'note',storagePath:'arbitrary'})).status,409);
  assert.equal((await api(['acceptance'],'GET',undefined,true,prefix,'01')).status,409);
  assert.equal((await api(['acceptance'],'GET',undefined,true,'..')).status,409);
  const error=await api(['documentation','DNI_FRONT','attachments','not-valid'],'GET');assert.equal(error.status,409);assert.ok(!JSON.stringify(await error.json()).includes('Firestore'));
  const storageService=admin.storage(), originalBucket=storageService.bucket;
  const originalTransaction=db.runTransaction;
  const failedApiDb=metadataFailureDb();
  try {
    db.runTransaction=failedApiDb.runTransaction.bind(failedApiDb);
    storageService.bucket=()=>failingDeleteBucket;
    const form=new FormData();form.append('commandId','api-rollback-failed');form.append('file',new File([new Uint8Array(bytes)],'synthetic.pdf',{type:'application/pdf'}));
    const response=await captureLog(()=>route.POST(new NextRequest(`http://localhost/api/admin/presupuestos-v2/${prefix}/versions/1/documentation/PAYSLIP/attachments`,{method:'POST',headers:{Authorization:`Bearer ${token}`},body:form}),{params:Promise.resolve({budgetId:prefix,version:'1',operation:['documentation','PAYSLIP','attachments']})}));
    assert.equal(response.status,409);assert.deepEqual(await response.json(),{error:reconciliationMessage});
  } finally { db.runTransaction=originalTransaction;storageService.bucket=originalBucket; }
  assert.equal((await records.doc('api-rollback-failed').get()).data()!.state,'ROLLBACK_PENDING');
  assert.ok(!JSON.stringify(logs).includes('SECRET_RAW'));
  // Clean only this suite's synthetic objects; retain pending records as evidence.
  for (const id of ['rollback-failed','reused-object','firestore-offline','api-rollback-failed']) {
    const record=(await records.doc(id).get()).data()!;
    await bucket.file(record.storagePath).delete({ignoreNotFound:true});
  }
  console.log('ROLLBACK_FAILURE_API_ERROR_SANITIZED = YES');
  console.log('P4_API_ADVERSARIAL_TESTS = PASS');
  await admin.app().delete();
}
main().catch(error=>{console.error(error);process.exitCode=1;});
