import {operationRuntime,productionDeliveryProof,verifiedProductionDelivery,productionWriter} from './productionV2/gates';
import type {VerifiedEvidence} from './operationEvidenceV2';
import type { Firestore, Transaction } from 'firebase-admin/firestore';
import { createHash, timingSafeEqual } from 'node:crypto';
import { admin } from './firebaseAdmin';
import { isAdminEmail } from './adminIdentity';
import { exact, opaque, stable } from './contractV2';
import { operationRef } from './operationV2';
import { fulfillmentOrigin } from './operationFulfillmentV2Server';
import { contractRefs } from './contractV2Server';
import { invitationsEnabled, requireInvitationEmulator, portalFail, portalEmail, portalToken, parseClientCommand, type ClientBindingV2, type ClientInvitationV2 } from './operationClientV2';
const hash=(v:string)=>createHash('sha256').update(v).digest('hex');
export const clientBindingRef=(db:Firestore,id:string,v:number)=>operationRef(db,id,v).parent.doc('client');
export const clientIndex=(db:Firestore,uid:string)=>db.collection('presupuestos_v2').doc('_operation_client_index_v2').collection('contracts').doc(hash(uid)).collection('services');
export const invitationRef=(db:Firestore,invitationId:string)=>{opaque(invitationId);return db.collection('presupuestos_v2').doc('_operation_client_index_v2').collection('contracts').doc('invitations').collection('requests').doc(invitationId);};
export const prerequisitesRef=(db:Firestore,id:string,v:number)=>operationRef(db,id,v).parent.doc('clientActivationFixture');
async function context(db:Firestore,tx:Transaction,id:string,v:number) {
 const origin=await fulfillmentOrigin(db,tx,id,v);if(!origin.registered)portalFail('Operación histórica sin identidad V2. No se migra automáticamente.');
 const ref=clientBindingRef(db,id,v),snap=await tx.get(ref);
 const state=snap.exists?snap.data() as ClientBindingV2:{schemaVersion:'OPERATION_CLIENT_V2' as const,operationId:origin.identity.operationId,revision:0,uid:null,state:'PREPARED' as const,activeInvitationId:null,activatedAt:null};
 if(state.schemaVersion!=='OPERATION_CLIENT_V2'||state.operationId!==origin.identity.operationId||!Number.isSafeInteger(state.revision)||!['PREPARED','ACTIVE','REVOKED'].includes(state.state))portalFail();
 return {origin,state,ref};
}
async function requirePrerequisites(db:Firestore,tx:Transaction,id:string,v:number,forWrite=true,verified?:Map<string,VerifiedEvidence>) {
 const runtime=await operationRuntime(db,tx,id,v);if(runtime){await productionDeliveryProof(runtime,tx,id,v,'CLIENT_ACTIVATION',forWrite,verified);return;}
 requireInvitationEmulator();
 const proof=(await tx.get(prerequisitesRef(db,id,v))).data();
 if(proof?.schemaVersion!=='EMULATOR_CLIENT_ACTIVATION_FIXTURE_V2'||proof.project!=='demo-cuenta-hogar'||proof.delivered!==true||proof.mandateSigned!==true||proof.pagareSigned!==true||proof.remitoSigned!==true)portalFail('Falta entrega efectiva y control documental firmado (fixture aislado de Emulator).');
}
async function authUser(uid:string){
 if(typeof uid!=='string'||!uid.trim()||uid.length>128)portalFail('UID requerido.');
 const u=await admin.auth().getUser(uid).catch(()=>portalFail('UID de Auth no disponible.'));
 if(u.disabled||!u.email||isAdminEmail(u.email))portalFail('Cuenta de cliente no disponible.');
 return u;
}
export async function readClientBinding(db:Firestore,id:string,v:number,actor?:string) {
 return db.runTransaction(async tx=>{const {origin,state}=await context(db,tx,id,v);
  const events=await tx.get(clientBindingRef(db,id,v).collection('events').orderBy('revision','desc').limit(50));
  let invitation:null|{id:string;state:string;expiresAt:string}=null;
  if(state.activeInvitationId){const i=(await tx.get(invitationRef(db,state.activeInvitationId))).data() as ClientInvitationV2;invitation={id:i.invitationId,state:i.state,expiresAt:i.expiresAt};}
  const runtime=await operationRuntime(db,tx,id,v);let productive=false;if(runtime&&actor){try{await productionWriter(runtime,{uid:actor,admin:true});await productionDeliveryProof(runtime,tx,id,v,'CLIENT_ACTIVATION');productive=true;}catch{/* Read-only preparation remains available. */}}
  return {identity:origin.identity,state,invitation,executionMode:runtime?'PRODUCTION' as const:'EMULATOR_ONLY' as const,invitationsEnabled:runtime?productive:invitationsEnabled(),blockReason:productive?'Entrega, firmas y originales comprobados. La invitación requiere una cuenta existente vinculada explícitamente.':'Activación pendiente de entrega efectiva, tres documentos firmados y autorización específica. No se activa al vincular un UID.',events:events.docs.map(d=>d.data())};
 });
}
export async function clientBindingCommand(db:Firestore,id:string,v:number,input:unknown,actor:string) {
 const c=parseClientCommand(input),runtime=await db.runTransaction(tx=>operationRuntime(db,tx,id,v));let verified:Map<string,VerifiedEvidence>|undefined;
 if(c.action==='INVITE'&&runtime){await productionWriter(runtime,{uid:actor,admin:true});verified=await verifiedProductionDelivery(runtime,id,v,'CLIENT_ACTIVATION');}
 const receipt=clientBindingRef(db,id,v).collection('commands').doc(c.commandId);
 // Hash the capability before digesting or persisting commands; no raw link/token in history.
 const safeData=c.action==='INVITE'?{...c.data,token:hash(portalToken(c.data.token))}:c.data;
 const digest=hash(stable({actor,...c,data:safeData}));
 return db.runTransaction(async tx=>{
  const {origin,state:current,ref}=await context(db,tx,id,v),previous=await tx.get(receipt);
  if(c.operationId!==origin.identity.operationId)portalFail('Operación incorrecta.');
  if(c.action==='INVITE'&&!runtime)requireInvitationEmulator();
  if(previous.exists){if(previous.data()!.digest!==digest)portalFail('Conflicto de commandId.');return {...previous.data()!.result,replay:true} as {revision:number;invitationId:string|null;replay:boolean};}
  if(current.revision!==c.expectedRevision)portalFail('Conflicto de revisión. Recargá la operación.');
  const state=structuredClone(current),d=c.data,now=new Date().toISOString();let nextInvitation:ClientInvitationV2|null=null,revoked:ClientInvitationV2|null=null;
  if(c.action==='LINK') {
   exact(d,['uid','reason']);const uid=String(d.uid),u=await authUser(uid);
   if(typeof d.reason!=='string'||!d.reason.trim()||d.reason.length>500)portalFail('Motivo requerido.');
   if(state.uid===u.uid)portalFail('La cuenta ya está vinculada.');
   if(state.state==='ACTIVE'||state.state==='REVOKED'||state.activeInvitationId)portalFail('No se reemplaza una cuenta activa ni con invitación pendiente. Revocá primero o revisá administrativamente.');
   state.uid=u.uid;
  }else if(c.action==='INVITE') {
   exact(d,['email','token']);await requirePrerequisites(db,tx,id,v,true,verified);if(runtime&&!state.uid)portalFail('Vinculá primero un UID existente y autorizado. No se crean cuentas desde este circuito.');if(state.state==='ACTIVE'||state.state==='REVOKED')portalFail('Servicio activo o acceso revocado. Revisión administrativa requerida.');
   const email=portalEmail(d.email);if(isAdminEmail(email))portalFail('Cuenta no disponible.');
   if(state.uid){const u=await authUser(state.uid);if(portalEmail(u.email)!==email)portalFail('Email distinto al de la cuenta vinculada.');}
   else {try{await admin.auth().getUserByEmail(email);portalFail('La cuenta existe. Vinculá primero su UID explícitamente.');}catch(e){if((e as {code?:string}).code!=='auth/user-not-found')throw e;}}
   if(state.activeInvitationId){const old=await tx.get(invitationRef(db,state.activeInvitationId));revoked=old.data() as ClientInvitationV2;}
   const invitationId='invite_'+hash(stable([id,v,c.commandId]));
   nextInvitation={schemaVersion:'CLIENT_INVITATION_V2',invitationId,operationId:state.operationId,budgetId:id,version:v,tokenHash:hash(portalToken(d.token)),email,targetUid:state.uid,state:'PENDING',createdBy:actor,createdAt:now,expiresAt:new Date(Date.parse(now)+86400000).toISOString(),redeemedBy:null,redeemedAt:null,revokedAt:null};
   state.activeInvitationId=invitationId;
  }else if(c.action==='REVOKE_ACCESS') {
   exact(d,['reason']);
   if(typeof d.reason!=='string'||!d.reason.trim()||d.reason.length>500)portalFail('Motivo requerido.');
   if(state.state!=='ACTIVE'||!state.uid||state.activeInvitationId)portalFail('Sólo se revoca un vínculo activo.');
   state.state='REVOKED';
   // Keep UID, activation date, index and financial history as an audit trail.
  }else {
   exact(d,['invitationId']);if(state.activeInvitationId!==d.invitationId)portalFail('Invitación no vigente.');
   revoked=(await tx.get(invitationRef(db,state.activeInvitationId!))).data() as ClientInvitationV2;
   if(revoked.state!=='PENDING')portalFail('Invitación no revocable.');state.activeInvitationId=null;
  }
  state.revision++;const result={revision:state.revision,invitationId:nextInvitation?.invitationId||null,replay:false};
  if(revoked)tx.update(invitationRef(db,revoked.invitationId),{state:'REVOKED',revokedAt:now});
  if(nextInvitation)tx.create(invitationRef(db,nextInvitation.invitationId),nextInvitation);
  tx.set(ref,state);tx.create(receipt,{digest,result,actor,at:now});
  tx.create(ref.collection('events').doc(c.commandId),{commandId:c.commandId,action:c.action,actor,at:now,revision:state.revision,expectedRevision:c.expectedRevision,uid:state.uid,invitationId:nextInvitation?.invitationId||revoked?.invitationId||null,reason:c.action==='LINK'||c.action==='REVOKE_ACCESS'?d.reason:null});
  return result;
 });
}
function verifyToken(i:ClientInvitationV2|undefined,token:unknown) {
 const candidate=hash(portalToken(token));if(!i||i.schemaVersion!=='CLIENT_INVITATION_V2'||!Number.isFinite(Date.parse(i.expiresAt))||! /^[a-f0-9]{64}$/.test(i.tokenHash)||!timingSafeEqual(Buffer.from(i.tokenHash,'hex'),Buffer.from(candidate,'hex')))portalFail('Invitación no disponible.');
}
/** Additional HTTP boundary for the normal adapter. It does not activate anything.
 * The context comes only from the stored invitation and frozen operation.
 * Local invitations keep the original Emulator guard; real invitations also
 * require a fresh verified identity matching the explicitly linked UID.
 */
export async function assertClientInvitationHttpAccess(db:Firestore,invitationId:string,token:unknown,uid?:string) {
 const initial=(await invitationRef(db,invitationId).get()).data() as ClientInvitationV2|undefined;
 verifyToken(initial,token);if(!initial)portalFail();
 const runtime=await db.runTransaction(tx=>operationRuntime(db,tx,initial.budgetId,initial.version));
 if(!runtime){requireInvitationEmulator();return;}
 if(!uid||initial.targetUid!==uid)portalFail('Invitación no disponible para esta identidad.');
 const user=await authUser(uid);await productionWriter(runtime,{uid,admin:false});
 if(portalEmail(user.email)!==initial.email)portalFail();
 await db.runTransaction(async tx=>{
  const current=(await tx.get(invitationRef(db,invitationId))).data() as ClientInvitationV2|undefined;
  verifyToken(current,token);if(!current||current.targetUid!==uid||current.operationId!==initial.operationId||current.budgetId!==initial.budgetId||current.version!==initial.version)portalFail();
  const {state}=await context(db,tx,current.budgetId,current.version);
  if(state.uid!==uid||state.state==='REVOKED'||state.operationId!==current.operationId)portalFail();
  await requirePrerequisites(db,tx,current.budgetId,current.version);
 });
}
export async function inspectClientInvitation(db:Firestore,invitationId:string,token:unknown) {
 return db.runTransaction(async tx=>{const i=(await tx.get(invitationRef(db,invitationId))).data() as ClientInvitationV2|undefined;verifyToken(i,token);
  if(!i||i.state!=='PENDING'||Date.parse(i.expiresAt)<=Date.now())portalFail('Invitación vencida, revocada o utilizada.');
  const {state}=await context(db,tx,i.budgetId,i.version);await requirePrerequisites(db,tx,i.budgetId,i.version);
  if(state.activeInvitationId!==i.invitationId||state.operationId!==i.operationId)portalFail();
  return {email:i.email,existingAccount:!!i.targetUid,expiresAt:i.expiresAt};
 });
}
export async function redeemClientInvitation(db:Firestore,invitationId:string,token:unknown,commandId:string,uid:string) {
 opaque(commandId);const user=await authUser(uid);
 const initial=(await invitationRef(db,invitationId).get()).data() as ClientInvitationV2|undefined;verifyToken(initial,token);if(!initial)portalFail();
 const runtime=await db.runTransaction(tx=>operationRuntime(db,tx,initial.budgetId,initial.version));
 if(!runtime)requireInvitationEmulator();else await productionWriter(runtime,{uid,admin:false});
 const verified=runtime?await verifiedProductionDelivery(runtime,initial.budgetId,initial.version,'CLIENT_ACTIVATION'):undefined;
 if(!user.emailVerified)portalFail('Verificá tu email antes de activar el servicio.');
 return db.runTransaction(async tx=>{
  const ir=invitationRef(db,invitationId),i=(await tx.get(ir)).data() as ClientInvitationV2|undefined;verifyToken(i,token);if(!i)portalFail();
  const {state:current,ref}=await context(db,tx,i.budgetId,i.version);await requirePrerequisites(db,tx,i.budgetId,i.version,true,verified);
  const command=ref.collection('redemptions').doc(commandId),prior=await tx.get(command),digest=hash(stable([invitationId,uid,hash(portalToken(token))]));
  if(prior.exists){if(prior.data()!.digest!==digest||i.state!=='REDEEMED'||i.redeemedBy!==uid||current.uid!==uid||current.state!=='ACTIVE')portalFail();return {activated:true,replay:true};}
  if(i.state!=='PENDING'||Date.parse(i.expiresAt)<=Date.now()||current.activeInvitationId!==invitationId||current.state==='ACTIVE'||current.operationId!==i.operationId||portalEmail(user.email)!==i.email||i.targetUid!==null&&i.targetUid!==uid||current.uid!==null&&current.uid!==uid)portalFail('Invitación no disponible para esta cuenta.');
  const now=new Date().toISOString(),next:ClientBindingV2={...current,uid,state:'ACTIVE',activeInvitationId:null,activatedAt:now,revision:current.revision+1};
  tx.set(ref,next);tx.update(ir,{state:'REDEEMED',redeemedBy:uid,redeemedAt:now});tx.create(command,{digest,uid,at:now});
  tx.set(clientIndex(db,uid).doc(i.operationId),{operationId:i.operationId,budgetId:i.budgetId,version:i.version,uid});
  tx.create(ref.collection('events').doc('activate_'+commandId),{commandId,action:'ACTIVATE',actor:uid,at:now,revision:next.revision,expectedRevision:current.revision,invitationId,uid});
  return {activated:true,replay:false};
 });
}
async function clientService(db:Firestore,id:string,v:number,uid:string,omitRevoked:boolean) {
 await authUser(uid);
 return db.runTransaction(async tx=>{
  const {origin,state}=await context(db,tx,id,v);
  if(omitRevoked&&state.state==='REVOKED'&&state.uid===uid)return null;
  if(state.state!=='ACTIVE'||state.uid!==uid)portalFail('Servicio no disponible.');
  await requirePrerequisites(db,tx,id,v,false);
  const budget=(await tx.get(contractRefs(db,id,v).budget)).data()!;
  const financial=(await tx.get(operationRef(db,id,v).parent.doc('financial'))).data();
  // Explicit localizers and availability only; financial data uses its separately authorized endpoint.
  return {budgetId:id,version:v,operationId:origin.identity.operationId,service:'Gestión de compra por mandato',product:origin.initial.productName,status:'Servicio vinculado',activatedAt:state.activatedAt,locality:budget.clienteSnapshot.localidad as string,financialInformationAvailable:financial?.schemaVersion==='OPERATION_FINANCIAL_V2'&&financial?.operationId===state.operationId};
 });
}
export async function readClientService(db:Firestore,id:string,v:number,uid:string) {
 const service=await clientService(db,id,v,uid,false);if(!service)portalFail('Servicio no disponible.');return service;
}
export async function listClientServices(db:Firestore,uid:string) {
 await authUser(uid);const index=await clientIndex(db,uid).get(),services=[];
 for(const doc of index.docs){const d=doc.data();if(d.uid!==uid||doc.id!==d.operationId)portalFail();const service=await clientService(db,d.budgetId,d.version,uid,true);if(service)services.push(service);}
 return services;
}
