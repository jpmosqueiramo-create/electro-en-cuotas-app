import type { Firestore } from 'firebase-admin/firestore';
import { createHash } from 'node:crypto';
import { admin } from './firebaseAdmin';
import { porcentajeAPuntosBasicos } from './commissionsEngine';
import { stable, opaque } from './contractV2';

export interface AffiliateProfileInput {
 commandId:string; id:string; expectedRevision:number; nombre:string; email:string;
 localidad:string; telefono:string; authUid:string; activo:boolean; porcentajeComision:number; reason:string;
}
function text(value:unknown,max:number,required=true){if(typeof value!=='string'||value.length>max||required&&!value.trim())throw Error('Datos del vendedor afiliado incompletos.');return value.trim();}
/** One registry; append-only percentage history uses the existing commission engine collection. */
export async function saveAffiliateProfile(db:Firestore,input:AffiliateProfileInput,actor:string){
 const id=opaque(input.id),commandId=opaque(input.commandId),uid=text(input.authUid,128,false);
 const data={nombre:text(input.nombre,200),email:text(input.email,254).toLowerCase(),localidad:text(input.localidad,200),telefono:text(input.telefono,100,false),authUid:uid,activo:input.activo,porcentajeComision:porcentajeAPuntosBasicos(input.porcentajeComision)/100};
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)||typeof data.activo!=='boolean'||!Number.isSafeInteger(input.expectedRevision)||input.expectedRevision<0)throw Error('Datos del vendedor afiliado inválidos.');
 const reason=text(input.reason,500),digest=createHash('sha256').update(stable({id,data,reason,expectedRevision:input.expectedRevision,actor})).digest('hex');
 if(uid){const user=await admin.auth().getUser(uid);if(user.disabled&&data.activo)throw Error('El UID está deshabilitado en Authentication.');}
 return db.runTransaction(async tx=>{
  const ref=db.collection('vendedores').doc(id),receipt=ref.collection('registryCommands').doc(commandId),prior=await tx.get(receipt),saved=await tx.get(ref);
  if(prior.exists){if(prior.data()!.digest!==digest)throw Error('Conflicto de comando.');return prior.data()!.result as {id:string;revision:number};}
  const before=saved.data(),revision=before?.revision??0;if(before?.authUid&&before.authUid!==uid)throw Error('Un UID ya vinculado requiere un procedimiento explícito de recuperación de identidad.');if(revision!==input.expectedRevision)throw Error('El registro cambió; actualizá antes de guardar.');
  if(uid){const matches=await tx.get(db.collection('vendedores').where('authUid','==',uid).limit(2));if(matches.docs.some(d=>d.id!==id))throw Error('El UID ya pertenece a otro vendedor afiliado.');}
  const configs=await tx.get(db.collection('vendedores_configuraciones_comision').where('vendedorAfiliadoId','==',id));
  const now=new Date().toISOString(),latest=configs.docs.map(d=>d.data()).filter(d=>typeof d.vigenteDesde==='string'&&d.vigenteDesde<=now).sort((a,b)=>String(b.vigenteDesde).localeCompare(String(a.vigenteDesde)))[0];
  const result={id,revision:revision+1},configId=`registry_${id}_${commandId}`;
  tx.set(ref,{...data,revision:result.revision,updatedAt:now,updatedBy:actor,...(!saved.exists?{createdAt:now}:{})},{merge:true});
  if(!latest||latest.porcentajeComisionBasisPoints!==Math.round(data.porcentajeComision*100))tx.create(db.collection('vendedores_configuraciones_comision').doc(configId),{id:configId,vendedorAfiliadoId:id,vendedorAfiliadoEmail:data.email,porcentajeComisionBasisPoints:Math.round(data.porcentajeComision*100),vigenteDesde:now,motivoCambio:reason,actualizadoPorAdminUid:actor,referenciaConfiguracionAnteriorId:latest?.id??null,createdAt:now});
  tx.create(ref.collection('registryHistory').doc(commandId),{actor,at:now,reason,before:before?{nombre:before.nombre??'',authUid:before.authUid??'',activo:before.activo??false,porcentajeComision:before.porcentajeComision??null}:null,after:data,revision:result.revision});
  tx.create(receipt,{digest,result,at:now,actor});return result;
 });
}
