import './helpers/requireSafeEmulatorEnvironment';
import assert from 'node:assert/strict';
import { createHash,randomUUID } from 'node:crypto';
import type { Bucket } from '@google-cloud/storage';
import { admin } from '../src/lib/firebaseAdmin';
import { financialFixture,activateFinancialFixture } from './testOperationFinancialV2Emulator';
import { financialCommand,financialRef,readFinancial } from '../src/lib/operationFinancialV2Server';
import { getBudgetDocumentationBucket } from '../src/lib/budgetDocumentationStorage';
import { verifyEvidenceObject,assertVerifiedEvidence,type EvidenceMetadata } from '../src/lib/operationEvidenceV2';
import { recoverDeliveryPhoto,saveDeliveryPhoto } from '../src/lib/operationDeliveryV2Photos';
import { deliveryRef,deliveryCommand,readDelivery } from '../src/lib/operationDeliveryV2Server';
import { deliveryFixture,syntheticPng,prepareDeliveryDocuments } from './testOperationDeliveryV2Emulator';
const db=admin.firestore();
async function main(){
 assert.equal(process.env.FIREBASE_STORAGE_EMULATOR_HOST,'127.0.0.1:9199');
 const bytes=Buffer.from('synthetic evidence'),p:EvidenceMetadata={path:'synthetic',sha256:createHash('sha256').update(bytes).digest('hex'),size:bytes.length,state:'COMMITTED',generation:'1'};
 let generation='1',missing=false,downloadError=false,replaceDuring=false;
 const fake={file:(_path:string,options?:{generation:string})=>({getMetadata:async()=>{if(missing)throw Error('MISSING');return [{generation}];},download:async()=>{if(downloadError)throw Error('DOWNLOAD');assert.equal(options?.generation,'1');if(replaceDuring)generation='2';return [bytes];}})} as unknown as Bucket;
 const proof=await verifyEvidenceObject(fake,p);assertVerifiedEvidence(p,proof);assert.throws(()=>assertVerifiedEvidence({...p,size:2},proof));
 missing=true;await assert.rejects(verifyEvidenceObject(fake,p),/MISSING/);missing=false;downloadError=true;await assert.rejects(verifyEvidenceObject(fake,p),/DOWNLOAD/);downloadError=false;
 generation='2';await assert.rejects(verifyEvidenceObject(fake,p),/reemplazada/);generation='1';replaceDuring=true;await assert.rejects(verifyEvidenceObject(fake,p),/durante/);replaceDuring=false;generation='1';
 const f=await financialFixture(),bucket=await getBudgetDocumentationBucket();
 // Instrument actual SDK I/O: transaction callbacks must never perform Storage reads.
 const run=db.runTransaction.bind(db),prototype=Object.getPrototypeOf(bucket),file=prototype.file;let inside=false,reads=0;
 db.runTransaction=((callback:Parameters<typeof db.runTransaction>[0])=>run(async tx=>{inside=true;try{return await callback(tx);}finally{inside=false;}})) as typeof db.runTransaction;
 prototype.file=function(this:Bucket,...args:Parameters<Bucket['file']>){assert(!inside,'Storage I/O inside Firestore transaction');reads++;return file.apply(this,args);};
 try{await activateFinancialFixture(f);}finally{db.runTransaction=run;prototype.file=file;}
 assert(reads>0);
 const ref=financialRef(db,f.id,1),before=(await f.r.budget.get()).updateTime!.toMillis();
 async function credit(amount=1){const state=(await ref.get()).data()!;const c={action:'CREDIT_PAYMENT',data:{paymentId:randomUUID(),amountCents:amount,effectiveDate:new Date().toISOString().slice(0,10),method:'TRANSFERENCIA',reference:'SYNTHETIC-SCALE'},operationId:f.identity.operationId,expectedRevision:state.revision,commandId:randomUUID()};return {c,result:await financialCommand(db,f.id,1,c,f.root)};}
 const first=await credit();for(let i=1;i<55;i++)await credit();
 let view=await readFinancial(db,f.id,1,f.root,'ADMIN');assert(view.active);assert.equal(view.paidCents,55);assert.equal(view.receipts.length,50);assert(view.nextCursor);
 const crossCursor=JSON.parse(Buffer.from(view.nextCursor,'base64url').toString());crossCursor.operationId='op_'+'0'.repeat(64);await assert.rejects(readFinancial(db,f.id,1,f.root,'ADMIN',Buffer.from(JSON.stringify(crossCursor)).toString('base64url')));
 const page=await readFinancial(db,f.id,1,f.root,'ADMIN',view.nextCursor);assert(page.active);assert.equal(page.receipts.length,5);assert.equal(page.nextCursor,null);assert.equal(new Set([...view.receipts,...page.receipts].map(r=>r.receiptId)).size,55);
 const unchangedRevision=(await ref.get()).updateTime!.toMillis();
 db.runTransaction=((callback:Parameters<typeof db.runTransaction>[0])=>run(async tx=>{let writes=false;for(const method of ['set','create','update'] as const){const original=tx[method].bind(tx);Object.assign(tx,{[method]:(...args:unknown[])=>{writes=true;return Reflect.apply(original,tx,args);}});}const result=await callback(tx);if(writes)throw Error('INJECTED_WRITE_ABORT');return result;})) as typeof db.runTransaction;
 try{await assert.rejects(credit(),/INJECTED_WRITE_ABORT/);}finally{db.runTransaction=run;}
 assert.equal((await ref.get()).updateTime!.toMillis(),unchangedRevision);assert.equal((await ref.collection('payments').get()).size,55);
 const time=(await ref.get()).updateTime!.toMillis();await financialCommand(db,f.id,1,first.c,f.root);assert.equal((await ref.get()).updateTime!.toMillis(),time);
 const pid=first.c.data.paymentId;await financialCommand(db,f.id,1,{action:'REVERSE_PAYMENT',data:{paymentId:pid,reason:'Synthetic scale reversal'},operationId:f.identity.operationId,expectedRevision:view.revision,commandId:randomUUID()},f.root);
 await assert.rejects(readFinancial(db,f.id,1,f.root,'ADMIN',view.nextCursor));view=await readFinancial(db,f.id,1,f.root,'ADMIN');assert(view.active);assert.equal(view.paidCents,54);
 // Old schema stays readable without a read-time migration or updateTime change.
 const state=(await ref.get()).data()!,legacy={...state};delete legacy.accounting;await ref.set(legacy);const oldTime=(await ref.get()).updateTime!.toMillis();const old=await readFinancial(db,f.id,1,f.root,'ADMIN');assert(old.active);assert.equal(old.paidCents,54);assert.equal((await ref.get()).updateTime!.toMillis(),oldTime);await ref.set(state);
 assert.equal((await f.r.budget.get()).updateTime!.toMillis(),before);
 const d=await deliveryFixture(),photoId=randomUUID(),photos=deliveryRef(db,d.id,1).collection('photos'),r=photos.doc(photoId),path=`operation-delivery-v2/${d.id}/v1/${photoId}`;
 const reservation={photoId,path,sha256:createHash('sha256').update(syntheticPng).digest('hex'),size:syntheticPng.length,mime:'image/png',state:'PENDING',slot:'MANDATE_PREPARED',relatedId:'',actor:d.root.uid,createdAt:new Date().toISOString()};await r.create(reservation);
 await assert.rejects(recoverDeliveryPhoto(db,bucket,d.id,1,photoId,d.root));assert.equal((await r.get()).data()!.state,'PENDING');
 await bucket.file(path).save(syntheticPng,{resumable:false,preconditionOpts:{ifGenerationMatch:0},metadata:{contentType:'image/png'}});
 await assert.rejects(recoverDeliveryPhoto(db,bucket,d.id,1,photoId,{uid:d.uid2,admin:false}));
 const concurrent=await Promise.all([1,2].map(()=>recoverDeliveryPhoto(db,bucket,d.id,1,photoId,d.root)));assert.equal(concurrent.filter(r=>!r.replay).length,1);
 const committed=(await r.get()).updateTime!.toMillis();await recoverDeliveryPhoto(db,bucket,d.id,1,photoId,d.root);assert.equal((await r.get()).updateTime!.toMillis(),committed);
 await saveDeliveryPhoto(db,bucket,d.id,1,photoId,'MANDATE_PREPARED','',syntheticPng,'image/png',d.root);assert.equal((await r.get()).updateTime!.toMillis(),committed);
 // An independently replaced object cannot be accepted under a previously committed generation.
 await bucket.file(path).save(syntheticPng,{resumable:false,metadata:{contentType:'image/png'}});await assert.rejects(recoverDeliveryPhoto(db,bucket,d.id,1,photoId,d.root),/reemplazada/);
 const concurrentId=randomUUID(),uploads=await Promise.allSettled([1,2].map(()=>saveDeliveryPhoto(db,bucket,d.id,1,concurrentId,'MANDATE_PREPARED','',syntheticPng,'image/png',d.root)));assert(uploads.some(r=>r.status==='fulfilled'));const concurrentTime=(await photos.doc(concurrentId).get()).updateTime!.toMillis();await saveDeliveryPhoto(db,bucket,d.id,1,concurrentId,'MANDATE_PREPARED','',syntheticPng,'image/png',d.root);assert.equal((await photos.doc(concurrentId).get()).updateTime!.toMillis(),concurrentTime);
 const expiredId=randomUUID();await photos.doc(expiredId).create({...reservation,photoId:expiredId,path:`operation-delivery-v2/${d.id}/v1/${expiredId}`,uploadLeaseOwner:'interrupted',uploadLeaseUntil:Date.now()-1});await saveDeliveryPhoto(db,bucket,d.id,1,expiredId,'MANDATE_PREPARED','',syntheticPng,'image/png',d.root);assert.equal((await photos.doc(expiredId).get()).data()!.state,'COMMITTED');
 let recreated=0;const unavailable={file:()=>({getMetadata:async()=>{throw Object.assign(Error('missing'),{code:404});},save:async()=>{recreated++;}})} as unknown as Bucket;await assert.rejects(saveDeliveryPhoto(db,unavailable,d.id,1,concurrentId,'MANDATE_PREPARED','',syntheticPng,'image/png',d.root));assert.equal(recreated,0);
 const preparedId=randomUUID(),preparedPath=`operation-delivery-v2/${d.id}/v1/${preparedId}`;
 await photos.doc(preparedId).create({...reservation,photoId:preparedId,path:preparedPath,actor:d.uid});await bucket.file(preparedPath).save(syntheticPng,{resumable:false,metadata:{contentType:'image/png'}});
 await assert.rejects(recoverDeliveryPhoto(db,bucket,d.id,1,preparedId,{uid:d.uid,admin:false}));assert.equal((await photos.doc(preparedId).get()).data()!.state,'PENDING');await recoverDeliveryPhoto(db,bucket,d.id,1,preparedId,d.root);
 await prepareDeliveryDocuments(d);let delivery=(await readDelivery(db,d.id,1,d.root)).state;
 await deliveryCommand(db,d.id,1,{action:'RECEIVE_ORIGINALS',data:{holder:d.holder,location:'Originales sintéticos',receivedAt:new Date().toISOString(),reference:'SYNTHETIC',alternativeEvidence:'SYNTHETIC'},operationId:d.identity.operationId,expectedRevision:delivery.revision,commandId:randomUUID()},d.root);
 delivery=(await readDelivery(db,d.id,1,d.root)).state;inside=false;reads=0;
 db.runTransaction=((callback:Parameters<typeof db.runTransaction>[0])=>run(async tx=>{inside=true;try{return await callback(tx);}finally{inside=false;}})) as typeof db.runTransaction;
 prototype.file=function(this:Bucket,...args:Parameters<Bucket['file']>){assert(!inside,'Storage I/O inside delivery transaction');reads++;return file.apply(this,args);};
 try{await deliveryCommand(db,d.id,1,{action:'CONFIRM_DELIVERY',data:{occurredAt:new Date().toISOString()},operationId:d.identity.operationId,expectedRevision:delivery.revision,commandId:randomUUID()},{uid:d.uid,admin:false});}finally{db.runTransaction=run;prototype.file=file;}assert(reads>0);
 console.log('STORAGE_OUTSIDE_TRANSACTIONS=PASS; MISSING_REPLACED_CONCURRENT_DOWNLOAD_FAILURE=PASS; PAGINATION_55_PAYMENTS=PASS; FIFO_REVERSAL_BALANCES=PASS; LEGACY_READ_NO_WRITE=PASS; PHOTO_RECOVERY_CONCURRENT_REPLAY=PASS; PRODUCTIVE_WRITES=0; DATA_DELETIONS=0');
}
main().then(()=>admin.app().delete()).catch(e=>{console.error(e);process.exitCode=1;});
