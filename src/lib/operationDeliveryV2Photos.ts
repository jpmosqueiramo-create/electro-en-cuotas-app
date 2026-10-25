import { externalDeliveryPolicy } from './externalDeliveryDocumentV2';
import {operationRuntime,productionWriter,productionDeliveryAccess} from './productionV2/gates';
import type { Firestore } from 'firebase-admin/firestore';
import type { Bucket } from '@google-cloud/storage';
import { createHash } from 'node:crypto';
import { opaque } from './contractV2';
import { validateDocumentBytes } from './budgetDocumentationStorage';
import type { CustodyActor } from './operationCustodyV2Server';
import { deliveryLoad,deliveryRef } from './operationDeliveryV2Server';
import { deliverySlots,deliveryFail,requireDeliveryEmulator,type DeliverySlot,type DeliveryDocumentKind } from './operationDeliveryV2';
import { readVerifiedEvidenceObject,type EvidenceMetadata } from './operationEvidenceV2';
import { recoverPhotoReservation,withPhotoUploadLease } from './operationPhotoRecoveryV2';
const sha=(bytes:Uint8Array)=>createHash('sha256').update(bytes).digest('hex');
function privateDocuments(view:Awaited<ReturnType<typeof deliveryLoad>>,actor:CustodyActor){const d=view.delivery;if(!actor.admin&&view.state.current?.uid!==actor.uid&&d.originals?.holder.uid!==actor.uid&&d.originalsTransfer?.from.uid!==actor.uid&&d.originalsTransfer?.to.uid!==actor.uid)deliveryFail('Documentos no disponibles para este participante.');}
export async function saveDeliveryPhoto(db:Firestore,bucket:Bucket,id:string,v:number,photoId:string,slot:DeliverySlot,relatedId:string,bytes:Buffer,mime:string,actor:CustodyActor){
 const runtime=await db.runTransaction(tx=>operationRuntime(db,tx,id,v));if(runtime)await productionWriter(runtime,actor);else requireDeliveryEmulator();opaque(photoId);if(!deliverySlots.includes(slot))deliveryFail();
 if(runtime&&slot.endsWith('_PREPARED'))deliveryFail('Los originales preparados proceden exclusivamente de la emisión autorizada.');
 if(slot!=='EXTERNAL_TRANSFER'&&!slot.endsWith('_PREPARED')&&!['image/jpeg','image/png','image/webp'].includes(mime))deliveryFail('La evidencia firmada y daños requiere fotografía JPEG, PNG o WebP.');validateDocumentBytes(bytes,mime);
 const ref=deliveryRef(db,id,v).collection('photos').doc(photoId),path=`operation-delivery-v2/${id}/v${v}/${photoId}`,hash=sha(bytes);
 async function allowed(tx:FirebaseFirestore.Transaction){if(runtime)await productionDeliveryAccess(runtime,tx,id,v);const view=await deliveryLoad(db,tx,id,v,actor);privateDocuments(view,actor);if(view.delivery.status!=='PREPARING')deliveryFail('Entrega cerrada.');
  if(slot==='EXTERNAL_TRANSFER'||slot==='DELIVERY_RECEIPT'){if(!actor.admin||view.delivery.documentPolicy!==externalDeliveryPolicy||!runtime)deliveryFail('Documento externo exclusivamente administrativo.');const proof=await productionDeliveryAccess(runtime,tx,id,v);if(relatedId!==(slot==='EXTERNAL_TRANSFER'?proof.snapshot.integrity.payloadHash:view.delivery.externalTransfer?.photoId))deliveryFail('Documento externo de otra operación o versión.');}
  else if(slot.endsWith('_PREPARED')){if(!actor.admin||relatedId!=='')deliveryFail('Preparación exclusivamente administrativa.');}
  else if(slot.endsWith('_SIGNED')){const kind=slot.replace('_SIGNED','') as DeliveryDocumentKind;if(!view.delivery.documents[kind].prepared||view.delivery.documents[kind].prepared!.photoId!==relatedId)deliveryFail('Firma de otra versión preparada.');}
  else if(!view.state.incidents.some(i=>i.id===relatedId&&i.damage))deliveryFail('Incidencia de daños no disponible.');return view;
 }
 await db.runTransaction(async tx=>{await allowed(tx);const old=await tx.get(ref),all=await tx.get(ref.parent.limit(100));if(old.exists&&(old.data()!.sha256!==hash||old.data()!.path!==path||old.data()!.mime!==mime||old.data()!.size!==bytes.length||old.data()!.slot!==slot||old.data()!.relatedId!==relatedId||old.data()!.actor!==actor.uid))deliveryFail('Conflicto de fotografía.');if(!old.exists&&all.size>=100)deliveryFail('Límite de archivos alcanzado.');if(!old.exists)tx.create(ref,{photoId,slot,relatedId,path,sha256:hash,size:bytes.length,mime,state:'PENDING',actor:actor.uid,createdAt:new Date().toISOString()});});
 await withPhotoUploadLease(db,ref,allowed,async mayCreate=>{const file=bucket.file(path);let exists=false;try{await file.getMetadata();exists=true;}catch(e){if((e as {code?:number}).code!==404)throw e;}if(!exists&&!mayCreate)deliveryFail('El archivo confirmado ya no está disponible; no se recrea.');try{if(!exists)await file.save(bytes,{resumable:false,preconditionOpts:{ifGenerationMatch:0},metadata:{contentType:mime,cacheControl:'private, no-store'}});}catch(e){if((e as {code?:number}).code!==412)throw e;}
 await recoverPhotoReservation(db,bucket,ref,actor.uid,allowed);});return {photoId,slot,relatedId};
}
export async function readDeliveryPhoto(db:Firestore,bucket:Bucket,id:string,v:number,photoId:string,actor:CustodyActor){
 opaque(photoId);await db.runTransaction(async tx=>privateDocuments(await deliveryLoad(db,tx,id,v,actor),actor));
 const p=(await deliveryRef(db,id,v).collection('photos').doc(photoId).get()).data();if(!p||p.state!=='COMMITTED'||p.path!==`operation-delivery-v2/${id}/v${v}/${photoId}`)deliveryFail('Archivo no disponible.');const {bytes}=await readVerifiedEvidenceObject(bucket,p as EvidenceMetadata);if(bytes.length!==p.size||sha(bytes)!==p.sha256)deliveryFail('Integridad inválida.');return {bytes,mime:p.mime as string};
}

export async function recoverDeliveryPhoto(db:Firestore,bucket:Bucket,id:string,v:number,photoId:string,actor:CustodyActor){
 const runtime=await db.runTransaction(tx=>operationRuntime(db,tx,id,v));if(runtime)await productionWriter(runtime,actor);else requireDeliveryEmulator();opaque(photoId);const ref=deliveryRef(db,id,v).collection('photos').doc(photoId);
 return recoverPhotoReservation(db,bucket,ref,actor.uid,async tx=>{if(runtime)await productionDeliveryAccess(runtime,tx,id,v);const view=await deliveryLoad(db,tx,id,v,actor);privateDocuments(view,actor);const p=(await tx.get(ref)).data();if(!p||p.path!==`operation-delivery-v2/${id}/v${v}/${photoId}`||!actor.admin&&p.actor!==actor.uid)deliveryFail();if(p.state==='PENDING'&&view.delivery.status!=='PREPARING')deliveryFail('Entrega cerrada.');
 if(p.slot==='EXTERNAL_TRANSFER'||p.slot==='DELIVERY_RECEIPT'){if(!actor.admin||view.delivery.documentPolicy!==externalDeliveryPolicy||!runtime)deliveryFail();const proof=await productionDeliveryAccess(runtime,tx,id,v);if(p.relatedId!==(p.slot==='EXTERNAL_TRANSFER'?proof.snapshot.integrity.payloadHash:view.delivery.externalTransfer?.photoId))deliveryFail('Documento externo de otra operación o versión.');}
 else if(p.slot.endsWith('_PREPARED')){if(runtime)deliveryFail('Usá recuperación de la emisión original.');if(!actor.admin||p.relatedId!=='')deliveryFail('Preparación exclusivamente administrativa.');}
 else if(p.slot.endsWith('_SIGNED')){if(view.delivery.documents[p.slot.replace('_SIGNED','') as DeliveryDocumentKind]?.prepared?.photoId!==p.relatedId)deliveryFail('La versión preparada cambió.');}
 else if(!view.state.incidents.some(i=>i.id===p.relatedId&&i.damage))deliveryFail('Incidencia de daños no disponible.');});
}
