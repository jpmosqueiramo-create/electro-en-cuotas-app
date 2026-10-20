import './helpers/requireSafeEmulatorEnvironment';
import assert from 'node:assert/strict';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, signInWithCustomToken } from 'firebase/auth';
import { getStorage, connectStorageEmulator, ref, getBytes, uploadBytes, deleteObject, listAll } from 'firebase/storage';
import { randomUUID } from 'node:crypto';
import { NextRequest } from 'next/server';
import { admin } from '../src/lib/firebaseAdmin';
import { ADMIN_EMAIL } from '../src/lib/adminAuth';
import { custodyTimestamp } from '../src/lib/operationCustodyV2';
import { fixture } from './testContractV2';
import { contractRefs } from '../src/lib/contractV2Server';
import { acceptBudgetV2 } from '../src/lib/budgetAcceptanceV2Server';
import { fulfillmentCommand, readFulfillment } from '../src/lib/operationFulfillmentV2Server';
import { authorizeCustody, custodyCommand, custodyRef, readCustody, listAffiliateOperations, affiliateIndex, readTransferConfirmation } from '../src/lib/operationCustodyV2Server';
import { saveCustodyPhoto, readCustodyPhoto } from '../src/lib/operationCustodyV2Photos';
import { getBudgetDocumentationBucket } from '../src/lib/budgetDocumentationStorage';
import * as affiliateApi from '../src/app/api/afiliado/operaciones-v2/[budgetId]/[version]/route';
import * as adminApi from '../src/app/api/admin/presupuestos-v2/[budgetId]/versions/[version]/custody/route';
const db=admin.firestore();
export async function custodyFixture() {
 const id=`custody-${randomUUID()}`,r=contractRefs(db,id,1),{b}=fixture(id);
 await r.family.set({sourceCollection:b.sourceCollection,solicitudId:b.solicitudId,lastVersion:1});await r.budget.set(b);
 await acceptBudgetV2(db,{budgetId:id,version:1,acceptedOptionId:'option-1',preferredPlanCuotas:12,commandId:'accept'},'admin-demo');
 const uid=`aff-${randomUUID()}`,uid2=`aff-${randomUUID()}`,driver=`driver-${randomUUID()}`,adminUid=`admin-${randomUUID()}`;
 for(const u of [uid,uid2,driver,adminUid])await admin.auth().createUser({uid:u,email:`${u}@example.test`,password:'Emulator-only-123',emailVerified:true});
 const affiliateId=`seller-${randomUUID()}`,affiliateId2=`seller-${randomUUID()}`;
 await db.collection('vendedores').doc(affiliateId).set({authUid:uid,activo:true,nombre:'Afiliado sintético A'});
 await db.collection('vendedores').doc(affiliateId2).set({authUid:uid2,activo:true,nombre:'Afiliado sintético B'});
 const identity=(await readFulfillment(db,id,1)).identity;
 return {id,r,b,identity,uid,uid2,driver,adminUid,affiliateId,affiliateId2};
}
async function main() {
 if(process.env.FIREBASE_STORAGE_EMULATOR_HOST!=='127.0.0.1:9199')throw Error('STORAGE_EMULATOR_REQUIRED');
 for(const invalid of ['2026-02-30T12:00:00Z','2026-01-01T24:00:00Z','2026-01-01T12:00:00','2099-01-01T12:00:00Z'])assert.throws(()=>custodyTimestamp(invalid,'2026-10-20T12:00:00Z'));
 const f=await custodyFixture(),{id,r,uid,uid2,driver,adminUid,affiliateId,affiliateId2,identity}=f;
 const root={uid:adminUid,admin:true},seller={uid,admin:false},other={uid:uid2,admin:false};
 const before=JSON.stringify({b:(await r.budget.get()).data(),a:(await r.acceptance.get()).data()});
 let revision=0;
 const cmd=(action:string,data:Record<string,unknown>)=>({commandId:randomUUID(),operationId:identity.operationId,expectedRevision:revision,action,data});
 async function exec(action:string,data:Record<string,unknown>,actor=root){const c=cmd(action,data),res=await custodyCommand(db,id,1,c,actor);revision=res.revision;return c;}
 await assert.rejects(readCustody(db,id,1,seller));
 const assign=cmd('ASSIGN',{affiliateId,uid,reason:'Primera asignación'});
 const repeated=await Promise.all(Array.from({length:5},()=>custodyCommand(db,id,1,assign,root)));assert.equal(repeated.filter(x=>!x.replay).length,1);revision=1;
 await assert.rejects(custodyCommand(db,id,1,{...assign,data:{...assign.data,reason:'Alteración'}},root));
 assert.equal((await listAffiliateOperations(db,seller)).length,1);assert.equal((await listAffiliateOperations(db,other)).length,0);
 await assert.rejects(readCustody(db,id,1,other));
 await assert.rejects(custodyCommand(db,id,1,cmd('ASSIGN',{affiliateId:affiliateId2,uid:uid2,reason:'No admin'}),seller));
 const race=await Promise.allSettled([1,2].map(n=>custodyCommand(db,id,1,cmd('ASSIGN',{affiliateId:affiliateId2,uid:uid2,reason:`reassign-${n}`}),root)));
 assert.equal(race.filter(x=>x.status==='fulfilled').length,1);revision=2;
 await assert.rejects(readCustody(db,id,1,seller));assert.equal((await affiliateIndex(db,uid).get()).size,0);
 await exec('ASSIGN',{affiliateId,uid,reason:'Restablecer asignación'});
 const from={uid:driver,role:'DRIVER',affiliateId:null},to={uid,role:'AFFILIATE',affiliateId};
 await assert.rejects(custodyCommand(db,id,1,cmd('AUTHORIZE_TRANSFER',{from,to,occurredAt:'2026-01-05T12:00:00Z',location:'Depósito demo',reason:'Sin retiro'}),root));
 let fs=(await readFulfillment(db,id,1)).state;
 for(const [action,data] of [['UPDATE_ORDER',{providerName:'SECRET_PROVIDER',providerReference:'SECRET_REF',estimatedAvailabilityDate:'2026-01-01',notes:'SECRET_NOTES'}],['PLACE_ORDER',{orderDate:'2026-01-01'}],['CONFIRM_ORDER',{actualCost:610000,confirmedAvailabilityDate:'2026-01-01'}],['READY_FOR_PICKUP',{}],['RECORD_PICKUP',{actualPickupDate:'2026-01-02',pickupResponsible:'Driver demo'}]] as const){fs=(await fulfillmentCommand(db,id,1,{commandId:randomUUID(),operationId:identity.operationId,expectedRevision:fs.revision,action,data},adminUid)).state;}
 await exec('AUTHORIZE_TRANSFER',{from,to,occurredAt:'2026-01-05T12:00:00Z',location:'Custodia demo',reason:'Entrega física autorizada'});
 let state=(await authorizeCustody(db,id,1,root)).state;assert.equal(state.location,'');const transferId=state.pending!.id;
 await assert.rejects(custodyCommand(db,id,1,cmd('CONFIRM_DELIVERY',{transferId}),seller));
 assert.equal((await readTransferConfirmation(db,id,1,{uid:driver,admin:false})).canDeliver,true);
 await assert.rejects(readTransferConfirmation(db,id,1,other));
 await exec('CONFIRM_RECEIPT',{transferId},seller);state=(await authorizeCustody(db,id,1,root)).state;assert.equal(state.current,null);
 await assert.rejects(custodyCommand(db,id,1,cmd('CANCEL_TRANSFER',{transferId,reason:'No cancelar parcial'}),root));
 const regularize=await exec('REGULARIZE',{transferId,reason:'Conductor sin conectividad',evidence:'Constancia sintética WA-001 de entrega y recepción'});
 state=(await authorizeCustody(db,id,1,root)).state;assert.equal(state.current!.uid,uid);assert.equal(state.pending,null);
 assert.equal((await custodyRef(db,id,1).collection('events').doc(regularize.commandId).get()).data()!.transfer.regularization.evidence,'Constancia sintética WA-001 de entrega y recepción');
 // Same person may act as affiliate and depot, but two explicit confirmations remain necessary.
 await exec('AUTHORIZE_TRANSFER',{from:to,to:{uid,role:'DEPOT',affiliateId:null},occurredAt:'2026-01-06T12:00:00Z',location:'Depósito demo',reason:'Cambio de rol físico'});
 state=(await authorizeCustody(db,id,1,root)).state;const sameId=state.pending!.id;
 await exec('CONFIRM_DELIVERY',{transferId:sameId},seller);assert.equal((await authorizeCustody(db,id,1,root)).state.current!.role,'AFFILIATE');
 await exec('CONFIRM_RECEIPT',{transferId:sameId},seller);assert.equal((await authorizeCustody(db,id,1,root)).state.current!.role,'DEPOT');
 const incident=await exec('INCIDENT',{reason:'Daño visible sintético',damage:true,rejection:true,location:'Custodia temporal demo',occurredAt:'2026-01-07T12:00:00Z'},seller);
 await assert.rejects(custodyCommand(db,id,1,cmd('DECIDE_INCIDENT',{incidentId:incident.commandId,decision:'REPLACE',resolution:'Sin permiso'}),seller));
 await assert.rejects(custodyCommand(db,id,1,cmd('COMPLETE_DELIVERY',{}),root));
 await assert.rejects(custodyCommand(db,id,1,cmd('ASSIGN',{affiliateId:affiliateId2,uid:uid2,reason:'Otra asignación'}),root));
 const bucket=await getBudgetDocumentationBucket(),png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6+QAAAABJRU5ErkJggg==','base64');
 const photoId=randomUUID();await saveCustodyPhoto(db,bucket,id,1,incident.commandId,photoId,png,'image/png',seller);
 await saveCustodyPhoto(db,bucket,id,1,incident.commandId,photoId,png,'image/png',seller);
 assert.deepEqual((await readCustodyPhoto(db,bucket,id,1,photoId,seller)).bytes,png);await assert.rejects(readCustodyPhoto(db,bucket,id,1,photoId,other));
 const metadata=(await bucket.file(`operation-custody-v2/${id}/v1/${incident.commandId}/${photoId}`).getMetadata())[0];assert.equal(metadata.metadata?.firebaseStorageDownloadTokens,undefined);
 // Even an authenticated browser (including admin) cannot bypass server-mediated photo access.
 let sdkAdminUid:string;try{sdkAdminUid=(await admin.auth().getUserByEmail(ADMIN_EMAIL)).uid;}catch{sdkAdminUid=(await admin.auth().createUser({email:ADMIN_EMAIL,emailVerified:true})).uid;}
 for(const role of ['anonymous',uid,sdkAdminUid]) {
  const app=initializeApp({projectId:'demo-cuenta-hogar',apiKey:'demo-key',storageBucket:'demo-cuenta-hogar.appspot.com'},`custody-sdk-${randomUUID()}`);
  try {
   const auth=getAuth(app);connectAuthEmulator(auth,'http://127.0.0.1:9099',{disableWarnings:true});
   if(role!=='anonymous')await signInWithCustomToken(auth,await admin.auth().createCustomToken(role));
   const storage=getStorage(app);connectStorageEmulator(storage,'127.0.0.1',9199);storage.maxOperationRetryTime=1000;storage.maxUploadRetryTime=1000;
   const photo=ref(storage,`operation-custody-v2/${id}/v1/${incident.commandId}/${photoId}`);
   for(const action of [()=>getBytes(photo),()=>uploadBytes(photo,png),()=>deleteObject(photo),()=>listAll(ref(storage,`operation-custody-v2/${id}/v1`))])await assert.rejects(action,e=>(e as {code:string}).code==='storage/unauthorized');
  }finally{await deleteApp(app);}
 }
 const projection=JSON.stringify(await readCustody(db,id,1,seller));for(const forbidden of ['610000','580000','SECRET_PROVIDER','SECRET_REF','SECRET_NOTES','dni','whatsapp','snapshot','storagePath',driver,uid2])assert(!projection.includes(forbidden),forbidden);
 await exec('DECIDE_INCIDENT',{incidentId:incident.commandId,decision:'RETURN',resolution:'Retorno autorizado al conductor'});
 await exec('AUTHORIZE_TRANSFER',{from:{uid,role:'DEPOT',affiliateId:null},to:from,occurredAt:'2026-01-08T12:00:00Z',location:'Recorrido posterior demo',reason:'Retorno por rechazo'});
 state=(await authorizeCustody(db,id,1,root)).state;
 await exec('CONFIRM_DELIVERY',{transferId:state.pending!.id},seller);
 await exec('CONFIRM_RECEIPT',{transferId:state.pending!.id},{uid:driver,admin:false});
 assert.equal((await authorizeCustody(db,id,1,root)).state.current!.uid,driver);
 assert.equal((await authorizeCustody(db,id,1,root)).state.deliveryClosure,'BLOCKED_PHYSICAL_SIGNATURES_REQUIRED');
 await db.collection('vendedores').doc(affiliateId).update({activo:false});await assert.rejects(readCustody(db,id,1,seller));await db.collection('vendedores').doc(affiliateId).update({activo:true});
 const context={params:Promise.resolve({budgetId:id,version:'1'})};
 assert.equal((await affiliateApi.GET(new NextRequest('http://localhost/api'),context)).status,401);
 assert.equal((await adminApi.GET(new NextRequest('http://localhost/api'),context)).status,401);
 const custom=await admin.auth().createCustomToken(uid2),login=await fetch('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=demo-key',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token:custom,returnSecureToken:true})}),token=(await login.json()).idToken;
 assert.equal((await affiliateApi.GET(new NextRequest('http://localhost/api',{headers:{Authorization:`Bearer ${token}`}}),context)).status,403);
 const otherFixture=await custodyFixture();
 await assert.rejects(custodyCommand(db,otherFixture.id,1,cmd('ASSIGN',{affiliateId,uid,reason:'Otro expediente'}),root));
 const savedRevision=revision,originalRun=db.runTransaction.bind(db);
 // The callback stages all writes, then aborts: none may commit.
 db.runTransaction=((callback:Parameters<typeof db.runTransaction>[0])=>originalRun(async tx=>{await callback(tx);throw Error('INJECTED_TRANSACTION_ABORT');})) as typeof db.runTransaction;
 try{await assert.rejects(custodyCommand(db,id,1,cmd('ASSIGN',{affiliateId:affiliateId2,uid:uid2,reason:'Debe abortar'}),root),/INJECTED/);}finally{db.runTransaction=originalRun;}
 assert.equal((await authorizeCustody(db,id,1,root)).state.revision,savedRevision);
 assert.equal(JSON.stringify({b:(await r.budget.get()).data(),a:(await r.acceptance.get()).data()}),before);
 console.log('CUSTODY_EMULATOR=PASS; ASSIGNMENT_CONCURRENCY=PASS; AFFILIATE_ISOLATION=PASS; CUSTODY_CONFIRMATIONS=PASS; PRIVATE_PHOTOS=PASS; DELIVERY_CLOSURE=BLOCKED; HISTORICAL_MUTATIONS=0; PRODUCTION_WRITES=0');
}
if(process.argv[1]?.endsWith('testOperationCustodyV2Emulator.ts'))main().then(()=>admin.app().delete()).catch(e=>{console.error(e);process.exitCode=1;});
