import type { Firestore, Transaction } from 'firebase-admin/firestore';
import { createHash } from 'node:crypto';
import { admin } from './firebaseAdmin';
import { exact, opaque, stable } from './contractV2';
import { clientBindingRef, prepareClientEmailAccess } from './operationClientV2Server';
import { portalEmail } from './operationClientV2';
import { productionClientAccessProof, verifiedProductionClientDocuments, productionWriter } from './productionV2/gates';
import { requireProductionActor, runtimeForDatabase } from './productionV2/runtime';
import { isAdminEmail } from './adminIdentity';
import { deliverAccountEmail } from './accountEmailDelivery';
import type { PortalIdentity } from './legacyPortalServer';
export type ClientEmailTarget = { kind:'OPERATION'; budgetId:string; version:number } | { kind:'REQUEST'; collection:'solicitudes'|'solicitudes_cuenta'; id:string };
const fail=()=>Error('No se pudo vincular esta invitación. Revisá el correo y la cuenta del cliente; no se modificaron sus planes.');
const hash=(v:unknown)=>createHash('sha256').update(stable(v)).digest('hex');
export function clientEmailAccount(db:Firestore,key:string){opaque(key);return db.collection('presupuestos_v2').doc('_operation_client_index_v2').collection('contracts').doc('emailAccounts').collection('records').doc(key);}
export function clientEmailTarget(input:unknown):ClientEmailTarget{
 const b=input as Record<string,unknown>;
 if(b?.kind==='OPERATION'){exact(b,['kind','budgetId','version']);opaque(b.budgetId);if(!Number.isSafeInteger(b.version)||Number(b.version)<1)throw fail();return b as ClientEmailTarget;}
 exact(b,['kind','collection','id']);if(b.kind!=='REQUEST'||!['solicitudes','solicitudes_cuenta'].includes(String(b.collection)))throw fail();opaque(b.id);return b as ClientEmailTarget;
}
/** Resolve authoritative stored sources. Never grant access from posted email, name or DNI. */
async function resolveTarget(db:Firestore,tx:Transaction,target:ClientEmailTarget){
 const runtime=runtimeForDatabase(db,admin.auth()),plans:{budgetId:string;version:number;operationId:string;snapshotHash:string;email:string;uid:string|null}[]=[];
 let sourceEmail='',sourceUid='';
 const candidates:{budgetId:string;version:number}[]=[];
 if(target.kind==='OPERATION')candidates.push(target);
 else{
  const source=(await tx.get(db.collection(target.collection).doc(target.id))).data();if(!source)throw fail();
  const emails=[source.clienteEmail,source.email,source.datosPersonales?.email].filter(v=>typeof v==='string'&&v.trim()).map(v=>portalEmail(v.trim()));
  if(new Set(emails).size>1)throw Error('La solicitud tiene correos diferentes. Corregí el correo del cliente antes de invitar.');
  sourceEmail=emails[0]||'';sourceUid=typeof source.clienteAuthUid==='string'?source.clienteAuthUid:'';
  // Historical clienteId can be a DNI. Only an actual Auth identity is authoritative.
  if(!sourceUid&&typeof source.clienteId==='string'){try{sourceUid=(await admin.auth().getUser(source.clienteId)).uid;}catch(e){if(!['auth/user-not-found','auth/invalid-uid'].includes(String((e as {code?:string}).code)))throw e;}}
  const families=await tx.get(db.collection('presupuestos_v2').where('solicitudId','==',target.id).limit(51));
  if(families.size>50)throw Error('Hay más de 50 planes: enviá la invitación desde la ficha del plan.');
  for(const family of families.docs){if(family.data().sourceCollection!==target.collection)continue;const drafts=await tx.get(family.ref.collection('contracts').limit(101));if(drafts.size>100)throw fail();for(const d of drafts.docs){if(/^v[1-9]\d*$/.test(d.id)&&d.data().productionFreeze)candidates.push({budgetId:family.id,version:Number(d.id.slice(1))});}}
 }
 if(candidates.length>20)throw Error('Enviá la invitación desde la ficha de cada plan.');
 for(const c of candidates){
  const issued=await productionClientAccessProof(runtime,tx,c.budgetId,c.version);
  const email=portalEmail(issued.snapshot.personalData.email),binding=(await tx.get(clientBindingRef(db,c.budgetId,c.version))).data();
  if(binding?.state==='REVOKED')throw Error('Hay un plan con acceso revocado. No se rehabilita con una invitación.');
  plans.push({...c,operationId:issued.identity.operationId,snapshotHash:issued.snapshot.integrity.payloadHash,email,uid:binding?.uid||null});
 }
 const emails=[sourceEmail,...plans.map(p=>p.email)].filter(Boolean);if(!emails.length||new Set(emails).size!==1||isAdminEmail(emails[0]))throw Error('Falta un correo único del cliente en los datos guardados.');
 const uids=[sourceUid,...plans.map(p=>p.uid)].filter(Boolean);if(new Set(uids).size>1)throw fail();
 const email=emails[0],uid=uids[0]||null;
 if(uid){const bound=await admin.auth().getUser(uid);if(bound.disabled||bound.email?.toLowerCase()!==email)throw Error('El correo no coincide con la cuenta vinculada. Revisá los datos del cliente.');}
 return {email,uid,plans,digest:hash({target,email,sourceUid,plans:plans.map(({budgetId,version,operationId,snapshotHash})=>({budgetId,version,operationId,snapshotHash})).sort((a,b)=>a.operationId.localeCompare(b.operationId))})};
}
export async function sendClientEmailInvitation(db:Firestore,input:unknown,commandId:string,actor:string){
 const target=clientEmailTarget(input),runtime=await requireProductionActor(runtimeForDatabase(db,admin.auth()),actor),key='client_'+hash(target),ref=clientEmailAccount(db,key),request=ref.collection('invitations').doc(opaque(commandId));
 const result=await db.runTransaction(async tx=>{
  const context=await resolveTarget(db,tx,target),current=await tx.get(ref),old=await tx.get(request);
  if(old.exists){if(old.data()!.contextDigest!==context.digest)throw fail();return {email:context.email,state:String(old.data()!.state),duplicate:true};}
  if(Date.now()-Date.parse(current.data()?.lastSentAt||'')<60000)throw Error('Esperá un minuto antes de reenviar la invitación.');
  const at=new Date().toISOString();tx.create(request,{target,contextDigest:context.digest,email:context.email,targetUid:context.uid,createdBy:actor,createdAt:at,expiresAt:new Date(Date.now()+48*3600000).toISOString(),state:'SENDING'});tx.set(ref,{activeInvitationId:commandId,lastSentAt:at,state:'SENDING',email:context.email},{merge:true});return {email:context.email,state:'SENDING',duplicate:false};
 });
 if(result.duplicate)return {state:result.state,accountKey:key,duplicate:true};
 let state='SENT';try{await deliverAccountEmail(db,result.email,`${runtime.test?'http://localhost:3000':'https://www.cuentahogar.com.ar'}/activar-cliente/${key}/${commandId}`);}catch{state='UNCONFIRMED';}
 await db.runTransaction(async tx=>{const account=await tx.get(ref),saved=await tx.get(request);if(saved.data()?.state!=='SENDING')return;tx.update(request,{state,attemptFinishedAt:new Date().toISOString()});if(account.data()?.activeInvitationId===commandId)tx.update(ref,{state});});
 return {state,accountKey:key,duplicate:false};
}
export async function acceptClientEmailInvitation(db:Firestore,key:string,invitationId:string,actor:PortalIdentity){
 const user=await admin.auth().getUser(actor.uid);if(user.disabled||!user.emailVerified||!actor.emailVerified||user.email?.toLowerCase()!==actor.email.toLowerCase()||isAdminEmail(actor.email))throw fail();
 const ref=clientEmailAccount(db,key),request=ref.collection('invitations').doc(opaque(invitationId)),initial=(await request.get()).data();if(!initial||initial.email!==actor.email.toLowerCase())throw fail();
 const runtime=runtimeForDatabase(db,admin.auth());await productionWriter(runtime,{uid:actor.uid,admin:false});
 const context=await db.runTransaction(tx=>resolveTarget(db,tx,clientEmailTarget(initial.target)));
 const evidence=await Promise.all(context.plans.map(p=>verifiedProductionClientDocuments(runtime,p.budgetId,p.version)));
 return db.runTransaction(async tx=>{
  const account=await tx.get(ref),saved=(await tx.get(request)).data(),current=await resolveTarget(db,tx,clientEmailTarget(initial.target));
  if(!saved||account.data()?.activeInvitationId!==invitationId||saved.contextDigest!==current.digest||saved.email!==actor.email.toLowerCase()||current.uid&&current.uid!==actor.uid||saved.targetUid&&saved.targetUid!==actor.uid)throw fail();
  if(saved.state==='ACCEPTED'){if(saved.acceptedBy!==actor.uid)throw fail();return {ok:true,plans:current.plans.length};}
  if(!['SENT','UNCONFIRMED'].includes(saved.state)||!Number.isFinite(Date.parse(saved.expiresAt))||Date.parse(saved.expiresAt)<=Date.now())throw fail();
  if(current.plans.length!==context.plans.length||current.plans.some((p,i)=>p.operationId!==context.plans[i].operationId))throw fail();
  const writes=[];for(let i=0;i<current.plans.length;i++){const p=current.plans[i];writes.push(await prepareClientEmailAccess(db,tx,p.budgetId,p.version,actor.uid,current.email,invitationId,evidence[i]));}
  const at=new Date().toISOString();for(const write of writes)write();tx.update(request,{state:'ACCEPTED',acceptedBy:actor.uid,acceptedAt:at});tx.update(ref,{state:'ACCEPTED',activatedUid:actor.uid,activatedAt:at});return {ok:true,plans:current.plans.length};
 });
}
