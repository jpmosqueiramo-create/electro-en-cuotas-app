import type { Firestore,Transaction,Query } from 'firebase-admin/firestore';
import { admin } from './firebaseAdmin';
import { storedDateMillis } from './adminSolicitudesReadModel';
export class LegacyPortalError extends Error {}
function fail():never{throw new LegacyPortalError('No se pudo verificar la autorización del historial.');}
export interface PortalIdentity {uid:string;email:string;emailVerified:boolean}
export async function portalIdentity(req:Request):Promise<PortalIdentity>{
 const h=req.headers.get('authorization');if(!h?.startsWith('Bearer '))fail();
 try{const t=await admin.auth().verifyIdToken(h.slice(7),true),u=await admin.auth().getUser(t.uid);if(u.disabled||!u.emailVerified)fail();return {uid:u.uid,email:u.email||'',emailVerified:u.emailVerified};}catch{fail();}
}
export async function activePortalAffiliate(db:Firestore,actor:PortalIdentity,tx?:Transaction){
 const query=db.collection('vendedores').where('authUid','==',actor.uid).limit(2),found=tx?await tx.get(query):await query.get();
 if(!actor.emailVerified||found.size!==1||found.docs[0].data().activo!==true)fail();return {id:found.docs[0].id,uid:actor.uid,email:actor.email};
}
const record=(v:unknown):Record<string,unknown>=>v&&typeof v==='object'&&!Array.isArray(v)?v as Record<string,unknown>:{};
const text=(v:unknown)=>typeof v==='string'?v.trim():'';
const email=(v:unknown)=>text(v).toLowerCase();
const scalar=(v:unknown)=>typeof v==='string'||typeof v==='boolean'||typeof v==='number'&&Number.isFinite(v);
function pick(input:unknown,keys:string[]){const r=record(input);return Object.fromEntries(keys.filter(k=>scalar(r[k])).map(k=>[k,r[k]]));}
function date(v:unknown){const ms=storedDateMillis(v);return ms===null?null:new Date(ms).toISOString();}
const clientUidFields=['clienteAuthUid'];
const affiliateUidFields=['afiliadoAuthUid','afiliadoUid','vendedorAfiliadoUid'];
const affiliateIdFields=['afiliadoId','vendedorAfiliadoId','vendedorId'];
async function ownsClient(d:Record<string,unknown>,a:PortalIdentity,lookup:(id:string)=>Promise<boolean>){
 const uids=clientUidFields.map(k=>text(d[k])).filter(Boolean);if(uids.length)return uids.every(id=>id===a.uid);
 const historicalId=text(d.clienteId);if(historicalId===a.uid)return true;
 // DNI/manual markers are not identities. Existing Auth UIDs take precedence over an email fallback.
 if(historicalId&&await lookup(historicalId))return false;
 return !!a.email&&a.emailVerified&&[d.clienteEmail,d.email,record(d.datosPersonales).email].some(e=>email(e)===email(a.email));
}
export function ownsAffiliate(d:Record<string,unknown>,a:PortalIdentity,affiliateId:string){
 const uids=affiliateUidFields.map(k=>text(d[k])).filter(Boolean),ids=affiliateIdFields.map(k=>text(d[k])).filter(Boolean);
 if(uids.some(uid=>uid!==a.uid)||ids.some(id=>id!==affiliateId))return false;
 if(uids.length||ids.length)return true;return !!a.email&&a.emailVerified&&email(d.afiliadoEmail)===email(a.email);
}
function projection(source:string,id:string,d:Record<string,unknown>,affiliate:boolean,actor:PortalIdentity){
 const personal=record(d.datosPersonales),raw=pick(d,['estado','estadoEntrega','estadoProducto','estadoRendicion','mensajeAdmin','productoId','planElegido','montoCuota','montoAbonado','metodoPago','numeroSerie','nroContrato','numeroContrato','nombreCompleto','numeroDni','cuil','direccion','localidad','whatsapp']);
 const plans=Array.isArray(d.planPagos)?d.planPagos.map(p=>{const projected=pick(p,['numero','estado','montoOriginal','montoAbonado','montoRealmenteCobrado','montoAbonadoReal','vencimiento','fechaPago','metodoPago','metodoPagoManual','notaAcumulacion']);for(const key of ['vencimiento','fechaPago']){const value=record(p)[key];if(value!==undefined&&!scalar(value)){const iso=date(value);if(iso)projected[key]=iso;}}return projected;}):[];
 return {...raw,id,sourceCollection:source,recordKey:`${source}:${id}`,fechaCreacion:date(d.fechaCreacion)||date(d.fecha)||date(d.fechaIso),productoDeseado:text(d.productoDeseado)||text(d.productoNombre)||text(d.necesidad),
  datosPersonales:{...pick(personal,['nombreCompleto','numeroDni','telefono','direccion','localidad','email','cuil']),nombreCompleto:text(personal.nombreCompleto)||text(d.nombreCompleto)||text(d.nombre),telefono:text(personal.telefono)||text(d.whatsapp),direccion:text(personal.direccion)||text(d.direccion),localidad:text(personal.localidad)||text(d.localidad)},planPagos:plans,
  ...(affiliate?{historialContactos:[...(Array.isArray(d.historialContactos)?d.historialContactos:[]),...(Array.isArray(d.observacionesInternas)?d.observacionesInternas.filter(p=>record(p).actorUid===actor.uid):[])].map(p=>{const r=record(p);return {...pick(p,['id','fecha','usuario','nota','promesaPago']),nota:text(r.nota)||text(r.texto),usuario:text(r.usuario)||text(r.autor)};})}:{}),canReportPayment:source==='solicitudes'&&text(d.clienteAuthUid)!==''&&!d.operationId&&!d.contractSnapshotV2,legacyReadOnly:true};
}
export async function readLegacyPortal(db:Firestore,a:PortalIdentity,role:'CLIENT'|'AFFILIATE',read:(q:Query)=>ReturnType<Query['get']>=q=>q.get()){
 const affiliate=role==='AFFILIATE'?await activePortalAffiliate(db,a):null;
 const emails=[...new Set([a.email,a.email.toLowerCase()].filter(Boolean))],queries:{source:string;field:string;value:string}[]=[];
 for(const source of ['solicitudes','solicitudes_cuenta']){
  for(const field of role==='CLIENT'?['clienteId',...clientUidFields]:affiliateUidFields)queries.push({source,field,value:a.uid});
  if(affiliate)for(const field of affiliateIdFields)queries.push({source,field,value:affiliate.id});
  for(const field of role==='CLIENT'?['clienteEmail','email','datosPersonales.email']:['afiliadoEmail'])for(const value of emails)queries.push({source,field,value});
 }
 const results=await Promise.allSettled(queries.map(q=>read(db.collection(q.source).where(q.field,'==',q.value).limit(201))));const warnings:string[]=[],records=new Map<string,ReturnType<typeof projection>>(),uidCache=new Map<string,boolean>();
 async function authUid(id:string){if(!uidCache.has(id)){try{await admin.auth().getUser(id);uidCache.set(id,true);}catch(e){if((e as {code?:string}).code!=='auth/user-not-found'&&(e as {code?:string}).code!=='auth/invalid-uid')throw e;uidCache.set(id,false);}}return uidCache.get(id)!;}
 for(let n=0;n<results.length;n++){
  const result=results[n],q=queries[n];if(result.status==='rejected'){warnings.push('No se pudo consultar una parte del historial. Reintentá o consultá a Administración.');continue;}
  if(result.value.size>200)warnings.push('Historial parcial: consultá a Administración por los registros adicionales.');
  for(const doc of result.value.docs.slice(0,200)){const d=doc.data();if(role==='CLIENT'?await ownsClient(d,a,authUid):ownsAffiliate(d,a,affiliate!.id))records.set(`${q.source}:${doc.id}`,projection(q.source,doc.id,d,!!affiliate,a));}
 }
 if(results.every(r=>r.status==='rejected'))throw new LegacyPortalError('No se pudo consultar el historial. Reintentá más tarde.');
 const notificaciones:Record<string,unknown>[]=[];
 if(affiliate){const notifQueries=[...affiliateUidFields.map(field=>({field,value:a.uid})),...affiliateIdFields.map(field=>({field,value:affiliate.id})),...emails.map(value=>({field:'afiliadoEmail',value}))];
  const notifications=await Promise.allSettled(notifQueries.map(q=>read(db.collection('notificaciones').where(q.field,'==',q.value).limit(201))));const seen=new Set<string>();
  for(const result of notifications){if(result.status==='rejected'){warnings.push('No se pudo consultar una parte de las notificaciones.');continue;}if(result.value.size>200)warnings.push('Notificaciones parciales: consultá a Administración.');for(const doc of result.value.docs.slice(0,200)){const d=doc.data();if(!seen.has(doc.id)&&ownsAffiliate(d,a,affiliate.id)){seen.add(doc.id);notificaciones.push({id:doc.id,...pick(d,['mensaje','leida','comisionAsociada','estadoPago']),fecha:date(d.fecha)});}}}
 }
 return {solicitudes:[...records.values()].sort((x,y)=>Date.parse(y.fechaCreacion||'')-Date.parse(x.fechaCreacion||'')||x.recordKey.localeCompare(y.recordKey)),notificaciones,warnings:[...new Set(warnings)],legacyWritesEnabled:false};
}
