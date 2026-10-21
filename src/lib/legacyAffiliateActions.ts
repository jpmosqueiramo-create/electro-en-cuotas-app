import {NextResponse} from 'next/server';
import {admin} from './firebaseAdmin';
import {activePortalAffiliate,ownsAffiliate,portalIdentity} from './legacyPortalServer';
import {contractHeaders,contractJson} from './contractV2Http';
import {isPublicSolicitudOriginAllowed} from './publicSolicitudOrigin';
/** Existing observations/notification endpoints: UID assignment checked in the write transaction. */
export async function legacyAffiliateAction(req:Request,kind:'NOTE'|'READ'){
 try{
 if(!req.headers.get('origin')||!isPublicSolicitudOriginAllowed(req.headers.get('origin')))throw Error('DENIED');
 const actor=await portalIdentity(req),body=await contractJson(req) as Record<string,unknown>;
 const id=kind==='NOTE'?body.solicitudId:body.notificationId;
 if(typeof id!=='string'||!id||id.includes('/')||id.length>200)throw Error('INVALID');
 const command=body.commandId,text=body.texto;
 if(kind==='NOTE'&&(typeof command!=='string'||! /^[0-9a-f-]{36}$/i.test(command)||typeof text!=='string'||!text.trim()||text.length>2000))throw Error('INVALID');
 const source=body.sourceCollection||'solicitudes';if(kind==='NOTE'&&!['solicitudes','solicitudes_cuenta'].includes(String(source)))throw Error('INVALID');
 const db=admin.firestore(),ref=db.collection(kind==='NOTE'?String(source):'notificaciones').doc(id);
 await db.runTransaction(async tx=>{
 const affiliate=await activePortalAffiliate(db,actor,tx),snap=await tx.get(ref),data=snap.data();
 if(!data||!ownsAffiliate(data,actor,affiliate.id))throw Error('DENIED');
 if(kind==='READ'){tx.update(ref,{leida:true});return;}
 if(data.operationId||data.contractSnapshotV2)throw Error('DENIED');
 const note={id:'obs_'+command,texto:String(text).trim(),autor:actor.email,fecha:new Date().toISOString(),actorUid:actor.uid};
 const history=Array.isArray(data.observacionesInternas)?data.observacionesInternas:[];
 const prior=history.find((n:Record<string,unknown>)=>n.id===note.id);
 if(prior){if(prior.actorUid!==actor.uid||prior.texto!==note.texto)throw Error('CONFLICT');return;}
 // Bound document growth; no rewriting financial fields or historical notes.
 if(history.length>=200)throw Error('FULL');
 tx.update(ref,{observacionesInternas:[note,...history]});
 });
 return NextResponse.json({success:true},{headers:contractHeaders});
 }catch(e){const code=e instanceof Error?e.message:'';return NextResponse.json({error:code==='FULL'?'El historial requiere gestión de Administración.':code==='CONFLICT'?'El envío cambió; revisá la gestión.':'No se pudo registrar la gestión autorizada.'},{status:code==='INVALID'?400:code==='CONFLICT'?409:403,headers:contractHeaders});}
}
