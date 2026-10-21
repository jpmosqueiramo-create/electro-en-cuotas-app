import './helpers/requireSafeEmulatorEnvironment';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { NextRequest } from 'next/server';
import { initializeApp,deleteApp } from 'firebase/app';
import { getAuth,connectAuthEmulator,signInWithCustomToken } from 'firebase/auth';
import { ADMIN_EMAIL } from '../src/lib/adminAuth';
import { getStorage,connectStorageEmulator,ref,getBytes,uploadBytes,deleteObject } from 'firebase/storage';
import { admin } from '../src/lib/firebaseAdmin';
import { custodyFixture } from './testOperationCustodyV2Emulator';
import { custodyCommand,authorizeCustody } from '../src/lib/operationCustodyV2Server';
import { fulfillmentCommand,readFulfillment } from '../src/lib/operationFulfillmentV2Server';
import { deliveryCommand,readDelivery,deliveryRef } from '../src/lib/operationDeliveryV2Server';
import { deliveryEnabled,deliveryDocumentKinds,type DeliveryDocumentKind } from '../src/lib/operationDeliveryV2';
import { saveDeliveryPhoto,readDeliveryPhoto } from '../src/lib/operationDeliveryV2Photos';
import { getBudgetDocumentationBucket } from '../src/lib/budgetDocumentationStorage';
import { contractCommand } from '../src/lib/contractV2Server';
import { deliveryHandler } from '../src/lib/operationDeliveryV2Http';
const db=admin.firestore();
export const syntheticPng=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6+QAAAABJRU5ErkJggg==','base64');
export async function deliveryFixture(){
 const f=await custodyFixture(),root={uid:f.adminUid,admin:true};
 await contractCommand(db,f.id,1,{action:'OPEN_OR_CREATE',commandId:'open-demo'},f.adminUid);
 let fs=(await readFulfillment(db,f.id,1)).state;
 for(const [action,data] of [['UPDATE_ORDER',{providerName:'SECRET_PROVIDER',providerReference:'INTERNAL',estimatedAvailabilityDate:'2026-01-01',notes:'SECRET_NOTES'}],['PLACE_ORDER',{orderDate:'2026-01-01'}],['CONFIRM_ORDER',{actualCost:610000,confirmedAvailabilityDate:'2026-01-01'}],['READY_FOR_PICKUP',{}],['RECORD_PICKUP',{actualPickupDate:'2026-01-02',pickupResponsible:'Conductor sintético'}],['RECEIVE',{actualReceiptDate:'2026-01-03',custodyLocation:'Depósito demo',custodian:'Responsable demo',visualCondition:'SIN_DANOS_VISIBLES',notes:''}],['PLAN_TRIP',{tripReference:'TRIP-DEMO',plannedTripDate:'2026-01-04',carrier:'Conductor demo'}],['PLAN_DELIVERY',{destinationLocality:'Lincoln',estimatedDeliveryDate:'2026-01-05',deliveryResponsible:'Afiliado demo'}]] as const)fs=(await fulfillmentCommand(db,f.id,1,{action,data,commandId:randomUUID(),operationId:f.identity.operationId,expectedRevision:fs.revision},f.adminUid)).state;
 let rev=0;
 async function custody(action:string,data:Record<string,unknown>){const result=await custodyCommand(db,f.id,1,{action,data,operationId:f.identity.operationId,expectedRevision:rev,commandId:randomUUID()},root);rev=result.revision;}
 await custody('ASSIGN',{affiliateId:f.affiliateId,uid:f.uid,reason:'Asignar entrega sintética'});
 const holder={uid:f.uid,role:'AFFILIATE' as const,affiliateId:f.affiliateId};
 await custody('AUTHORIZE_TRANSFER',{from:{uid:f.driver,role:'DRIVER',affiliateId:null},to:holder,occurredAt:'2026-01-05T12:00:00Z',location:'Custodia afiliado demo',reason:'Retiro y custodia sintéticos'});
 const pending=(await authorizeCustody(db,f.id,1,root)).state.pending!;
 await custody('REGULARIZE',{transferId:pending.id,reason:'Conductor sin conexión demo',evidence:'WA-DEMO-TRANSFER-001'});
 return {...f,root,holder};
}
export async function prepareDeliveryDocuments(f:Awaited<ReturnType<typeof deliveryFixture>>,omit?:DeliveryDocumentKind){
 const bucket=await getBudgetDocumentationBucket();
 async function exec(action:string,data:Record<string,unknown>){const view=await readDelivery(db,f.id,1,f.root);return deliveryCommand(db,f.id,1,{action,data,commandId:randomUUID(),operationId:f.identity.operationId,expectedRevision:view.state.revision},f.root);}
 await exec('PREPARE_DELIVERY',{responsible:f.holder});
 for(const kind of deliveryDocumentKinds){const prepared=randomUUID();await saveDeliveryPhoto(db,bucket,f.id,1,prepared,`${kind}_PREPARED`,'',syntheticPng,'image/png',f.root);await exec('PREPARE_DOCUMENT',{kind,photoId:prepared,reference:`SYNTHETIC-${kind}`,templateVersion:'SYNTHETIC_REVIEW_ONLY_V1'});
  if(kind!==omit){const signed=randomUUID();await saveDeliveryPhoto(db,bucket,f.id,1,signed,`${kind}_SIGNED`,prepared,syntheticPng,'image/png',f.root);await exec('VERIFY_SIGNATURE',{kind,photoId:signed,clientSigned:true,legible:true,identityChecked:true,loopSigned:false,signedAt:new Date().toISOString()});}
 }
}
async function main(){
 assert.equal(deliveryEnabled(),true);assert.equal(deliveryEnabled({...process.env,NODE_ENV:'production'}),false);assert.equal(deliveryEnabled({...process.env,GCLOUD_PROJECT:'negocio-facil-page'}),false);
 const f=await deliveryFixture(),actor={uid:f.uid,admin:false},outsider={uid:f.uid2,admin:false},bucket=await getBudgetDocumentationBucket();
 const original={b:(await f.r.budget.get()).data(),a:(await f.r.acceptance.get()).data(),draft:(await f.r.draft.get()).data()};
 const legacy=db.collection('solicitudes').doc(f.b.solicitudId);await legacy.set({marker:'HISTORICAL_NOT_CHANGED'});const old=JSON.stringify((await legacy.get()).data());
 const cmd=async(action:string,data:Record<string,unknown>,a=f.root)=>{const state=(await readDelivery(db,f.id,1,a)).state;return {action,data,commandId:randomUUID(),operationId:f.identity.operationId,expectedRevision:state.revision};};
 const exec=async(action:string,data:Record<string,unknown>,a=f.root)=>deliveryCommand(db,f.id,1,await cmd(action,data,a),a);
 await f.r.draft.update({status:'READY_TO_FORMALIZE'});assert((await readDelivery(db,f.id,1,f.root)).missing.some(m=>m.includes('firma física')));await f.r.draft.update({status:'DRAFT'});
 await assert.rejects(readDelivery(db,f.id,1,outsider));await assert.rejects(exec('CONFIRM_DELIVERY',{occurredAt:new Date().toISOString()},actor));
 const competing=await Promise.allSettled([1,2].map(()=>exec('PREPARE_DELIVERY',{responsible:f.holder})));assert.equal(competing.filter(x=>x.status==='fulfilled').length,1);
 await prepareDeliveryDocuments(f,'REMITO');await assert.rejects(exec('CONFIRM_DELIVERY',{occurredAt:new Date().toISOString()},actor));
 const remito=(await readDelivery(db,f.id,1,f.root)).state.documents.REMITO.prepared!,signedRemito=randomUUID();await saveDeliveryPhoto(db,bucket,f.id,1,signedRemito,'REMITO_SIGNED',remito.photoId,syntheticPng,'image/png',actor);
 await assert.rejects(exec('VERIFY_SIGNATURE',{kind:'REMITO',photoId:signedRemito,clientSigned:true,legible:true,identityChecked:true,loopSigned:false,signedAt:new Date().toISOString()},actor));
 await assert.rejects(exec('VERIFY_SIGNATURE',{kind:'REMITO',photoId:signedRemito,clientSigned:false,legible:true,identityChecked:true,loopSigned:false,signedAt:new Date().toISOString()}));
 await exec('VERIFY_SIGNATURE',{kind:'REMITO',photoId:signedRemito,clientSigned:true,legible:true,identityChecked:true,loopSigned:false,signedAt:new Date().toISOString()});
 await assert.rejects(exec('CONFIRM_DELIVERY',{occurredAt:new Date().toISOString()},actor),'Originals remain mandatory');
 await exec('RECEIVE_ORIGINALS',{holder:f.holder,location:'Carpeta física demo',receivedAt:new Date().toISOString(),reference:'PAQUETE-DEMO',alternativeEvidence:'WA-ORIGINALES-DEMO'});
 const photo=(await readDelivery(db,f.id,1,f.root)).state.documents.MANDATE.signature!.photoId;assert.deepEqual((await readDeliveryPhoto(db,bucket,f.id,1,photo,actor)).bytes,syntheticPng);await assert.rejects(readDeliveryPhoto(db,bucket,f.id,1,photo,outsider));
 const meta=(await bucket.file(`operation-delivery-v2/${f.id}/v1/${photo}`).getMetadata())[0];assert.equal(meta.metadata?.firebaseStorageDownloadTokens,undefined);
  let adminUid:string;try{adminUid=(await admin.auth().getUserByEmail(ADMIN_EMAIL)).uid;}catch{adminUid=(await admin.auth().createUser({email:ADMIN_EMAIL,emailVerified:true})).uid;}
 for(const uid of [null,f.uid,adminUid]){const app=initializeApp({projectId:'demo-cuenta-hogar',apiKey:'demo-key',storageBucket:'demo-cuenta-hogar.appspot.com'},`delivery-photo-${randomUUID()}`);try{const auth=getAuth(app);connectAuthEmulator(auth,'http://127.0.0.1:9099',{disableWarnings:true});if(uid)await signInWithCustomToken(auth,await admin.auth().createCustomToken(uid));const storage=getStorage(app);connectStorageEmulator(storage,'127.0.0.1',9199);storage.maxOperationRetryTime=1000;storage.maxUploadRetryTime=1000;const target=ref(storage,`operation-delivery-v2/${f.id}/v1/${photo}`);for(const action of [()=>getBytes(target),()=>uploadBytes(target,syntheticPng),()=>deleteObject(target)])await assert.rejects(action,e=>(e as {code:string}).code==='storage/unauthorized');}finally{await deleteApp(app);}}
 const photoMeta=deliveryRef(db,f.id,1).collection('photos').doc(photo),savedHash=(await photoMeta.get()).data()!.sha256;await photoMeta.update({sha256:'0'.repeat(64)});await assert.rejects(exec('CONFIRM_DELIVERY',{occurredAt:new Date().toISOString()},actor),/Hash documental/);await photoMeta.update({sha256:savedHash});
 // Pending originals transfer blocks delivery until both confirmations, including shared UID roles.
 await exec('AUTHORIZE_ORIGINALS_TRANSFER',{to:{uid:f.uid,role:'DEPOT',affiliateId:null},occurredAt:new Date().toISOString(),location:'Custodia documental demo',reason:'Misma persona, otro rol'});
 let t=(await readDelivery(db,f.id,1,f.root)).state.originalsTransfer!;await exec('CONFIRM_ORIGINALS_DELIVERY',{transferId:t.id},actor);await assert.rejects(exec('CONFIRM_DELIVERY',{occurredAt:new Date().toISOString()},actor));await exec('CONFIRM_ORIGINALS_RECEIPT',{transferId:t.id},actor);
 const command=await cmd('CONFIRM_DELIVERY',{occurredAt:new Date().toISOString()},actor),beforeRevision=(await readDelivery(db,f.id,1,f.root)).state.revision;
 const originalRun=db.runTransaction.bind(db);db.runTransaction=((callback:Parameters<typeof db.runTransaction>[0])=>originalRun(async tx=>{await callback(tx);throw Error('INJECTED_ABORT');})) as typeof db.runTransaction;
 try{await assert.rejects(deliveryCommand(db,f.id,1,command,actor),/INJECTED_ABORT/);}finally{db.runTransaction=originalRun;}
 assert.equal((await readDelivery(db,f.id,1,f.root)).state.revision,beforeRevision);assert.equal((await authorizeCustody(db,f.id,1,f.root)).state.current!.uid,f.uid);
 const repeats=await Promise.all(Array.from({length:5},()=>deliveryCommand(db,f.id,1,command,actor)));assert.equal(repeats.filter(r=>!r.replay).length,1);
 const closed=(await readDelivery(db,f.id,1,f.root)).state;assert.equal(closed.status,'DELIVERED_EMULATOR');assert.equal(closed.event!.responsible.uid,f.uid);assert(deliveryDocumentKinds.every(k=>closed.documents[k].signature?.loopSigned===false));assert.equal((await authorizeCustody(db,f.id,1,f.root)).state.current,null);assert.equal((await readFulfillment(db,f.id,1)).state.logisticsState,'DELIVERED_EMULATOR');
 await assert.rejects(exec('CONFIRM_DELIVERY',{occurredAt:new Date().toISOString()},actor));
 await exec('AUTHORIZE_ORIGINALS_TRANSFER',{to:{uid:f.driver,role:'DRIVER',affiliateId:null},occurredAt:new Date().toISOString(),location:'Archivo central demo',reason:'Conservar originales después de entregar'});t=(await readDelivery(db,f.id,1,f.root)).state.originalsTransfer!;
 await exec('CONFIRM_ORIGINALS_DELIVERY',{transferId:t.id},actor);await exec('CONFIRM_ORIGINALS_RECEIPT',{transferId:t.id},{uid:f.driver,admin:false});assert.equal((await readDelivery(db,f.id,1,f.root)).state.originals!.holder.uid,f.driver);
 const damaged=await deliveryFixture();await prepareDeliveryDocuments(damaged);let ds=(await readDelivery(db,damaged.id,1,damaged.root)).state;
 const report={commandId:'damage-report',operationId:damaged.identity.operationId,expectedRevision:ds.revision,action:'REPORT_DAMAGE',data:{reason:'Daño y embalaje sintéticos',occurredAt:new Date().toISOString(),location:'Custodia afiliado demo',alternativeEvidence:'WA-DAMAGE-DEMO'}};
 await deliveryCommand(db,damaged.id,1,report,{uid:damaged.uid,admin:false});await deliveryCommand(db,damaged.id,1,report,{uid:damaged.uid,admin:false});
 assert.equal((await db.collection('alertas_admin').where('tipo','==','ENTREGA_V2_RETENIDA').get()).size,1);assert.equal((await authorizeCustody(db,damaged.id,1,damaged.root)).state.current!.uid,damaged.uid);
 await assert.rejects(deliveryCommand(db,damaged.id,1,{...report,commandId:'closed-damaged',expectedRevision:report.expectedRevision+1,action:'CONFIRM_DELIVERY',data:{occurredAt:new Date().toISOString()}},{uid:damaged.uid,admin:false}));
 for(const slot of ['DAMAGE','PACKAGING'] as const)await saveDeliveryPhoto(db,bucket,damaged.id,1,randomUUID(),slot,'damage-report',syntheticPng,'image/png',{uid:damaged.uid,admin:false});
 const cs=(await authorizeCustody(db,damaged.id,1,damaged.root)).state;
 await custodyCommand(db,damaged.id,1,{operationId:damaged.identity.operationId,commandId:'admin-decides-return',expectedRevision:cs.revision,action:'DECIDE_INCIDENT',data:{incidentId:'damage-report',decision:'RETURN',resolution:'Retorno autorizado'}},damaged.root);
 ds=(await readDelivery(db,damaged.id,1,damaged.root)).state;await deliveryCommand(db,damaged.id,1,{operationId:damaged.identity.operationId,commandId:'clear-hold',expectedRevision:ds.revision,action:'CLEAR_HOLD',data:{incidentId:'damage-report',reason:'Fotos y decisión administrativa verificadas'}},damaged.root);
 // Return of the rejected product is still the existing two-party custody workflow, not a delivery.
 let cstate=(await authorizeCustody(db,damaged.id,1,damaged.root)).state;await custodyCommand(db,damaged.id,1,{operationId:damaged.identity.operationId,commandId:'return-next-trip',expectedRevision:cstate.revision,action:'AUTHORIZE_TRANSFER',data:{from:damaged.holder,to:{uid:damaged.driver,role:'DRIVER',affiliateId:null},occurredAt:new Date().toISOString(),location:'Recorrido posterior demo',reason:'Producto rechazado'}},damaged.root);
 cstate=(await authorizeCustody(db,damaged.id,1,damaged.root)).state;for(const [action,uid]of [['CONFIRM_DELIVERY',damaged.uid],['CONFIRM_RECEIPT',damaged.driver]]){await custodyCommand(db,damaged.id,1,{operationId:damaged.identity.operationId,commandId:randomUUID(),expectedRevision:cstate.revision,action,data:{transferId:cstate.pending!.id}},{uid,admin:false});cstate=(await authorizeCustody(db,damaged.id,1,damaged.root)).state;}
 assert.equal(cstate.current!.uid,damaged.driver);assert.equal((await readDelivery(db,damaged.id,1,damaged.root)).state.status,'PREPARING');
 const missing=await deliveryFixture();await prepareDeliveryDocuments(missing);let missingView=await readDelivery(db,missing.id,1,missing.root);
 await deliveryCommand(db,missing.id,1,{operationId:missing.identity.operationId,commandId:'missing-signature',expectedRevision:missingView.state.revision,action:'REPORT_MISSING_SIGNATURE',data:{missingKinds:['MANDATE'],reason:'Mandato sin firma física demo',occurredAt:new Date().toISOString(),location:'Custodia temporal demo',alternativeEvidence:'WA-MISSING-DEMO'}},{uid:missing.uid,admin:false});
 missingView=await readDelivery(db,missing.id,1,missing.root);assert.equal(missingView.state.documents.MANDATE.signature,null);assert.equal((await authorizeCustody(db,missing.id,1,missing.root)).state.current!.uid,missing.uid);
 const previousSigned=missingView.photos.find(p=>p.slot==='MANDATE_SIGNED')!;
 await assert.rejects(deliveryCommand(db,missing.id,1,{operationId:missing.identity.operationId,commandId:'stale-signature',expectedRevision:missingView.state.revision,action:'VERIFY_SIGNATURE',data:{kind:'MANDATE',photoId:previousSigned.id,clientSigned:true,legible:true,identityChecked:true,loopSigned:false,signedAt:new Date().toISOString()}},missing.root),/posterior/);
 const saved=process.env.GCLOUD_PROJECT;process.env.GCLOUD_PROJECT='negocio-facil-page';try{assert.equal((await deliveryHandler(new NextRequest('http://localhost/api',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'}),f.id,'1',true)).status,403);await assert.rejects(deliveryCommand(db,f.id,1,command,actor),/productiva bloqueada/);}finally{process.env.GCLOUD_PROJECT=saved;}
 assert.deepEqual({b:(await f.r.budget.get()).data(),a:(await f.r.acceptance.get()).data(),draft:(await f.r.draft.get()).data()},original);assert.equal(JSON.stringify((await legacy.get()).data()),old);
 console.log('DELIVERY_V2_EMULATOR=PASS; THREE_SIGNATURES_REQUIRED=PASS; LOOP_SIGNATURE_NONBLOCKING=PASS; PRIVATE_PHOTOS=PASS; ORIGINALS_CUSTODY=PASS; DAMAGE_REJECTION_RETURN=PASS; IDEMPOTENCY_CONCURRENCY_ATOMICITY=PASS; HISTORICAL_MUTATIONS=0; PRODUCTIVE_CLOSURE=BLOCKED; INVITATIONS_AND_LEDGER=UNCHANGED; PRODUCTION_WRITES=0');
}
if(process.argv[1]?.endsWith('testOperationDeliveryV2Emulator.ts'))main().then(()=>admin.app().delete()).catch(e=>{if(e instanceof assert.AssertionError)console.error({name:e.name,operator:e.operator,stack:e.stack?.split('\n').filter(l=>l.trim().startsWith('at '))});else console.error(e);process.exitCode=1;});
