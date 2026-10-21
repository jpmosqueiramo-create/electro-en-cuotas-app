import type { Firestore } from 'firebase-admin/firestore';
import type { Bucket } from '@google-cloud/storage';
import { createHash } from 'node:crypto';
import { opaque } from './contractV2';
import { validateDocumentBytes } from './budgetDocumentationStorage';
import type { CustodyActor } from './operationCustodyV2Server';
import { deliveryLoad,deliveryRef } from './operationDeliveryV2Server';
import { deliverySlots,deliveryFail,requireDeliveryEmulator,type DeliverySlot,type DeliveryDocumentKind } from './operationDeliveryV2';
const sha=(bytes:Uint8Array)=>createHash('sha256').update(bytes).digest('hex');
function privateDocuments(view:Awaited<ReturnType<typeof deliveryLoad>>,actor:CustodyActor){const d=view.delivery;if(!actor.admin&&view.state.current?.uid!==actor.uid&&d.originals?.holder.uid!==actor.uid&&d.originalsTransfer?.from.uid!==actor.uid&&d.originalsTransfer?.to.uid!==actor.uid)deliveryFail('Documentos no disponibles para este participante.');}
export async function saveDeliveryPhoto(db:Firestore,bucket:Bucket,id:string,v:number,photoId:string,slot:DeliverySlot,relatedId:string,bytes:Buffer,mime:string,actor:CustodyActor){
 requireDeliveryEmulator();opaque(photoId);if(!deliverySlots.includes(slot))deliveryFail();
 if(!slot.endsWith('_PREPARED')&&!['image/jpeg','image/png','image/webp'].includes(mime))deliveryFail('La evidencia firmada y daños requiere fotografía JPEG, PNG o WebP.');validateDocumentBytes(bytes,mime);
 const ref=deliveryRef(db,id,v).collection('photos').doc(photoId),path=`operation-delivery-v2/${id}/v${v}/${photoId}`,hash=sha(bytes);
 async function allowed(tx:FirebaseFirestore.Transaction){const view=await deliveryLoad(db,tx,id,v,actor);privateDocuments(view,actor);if(view.delivery.status!=='PREPARING')deliveryFail('Entrega cerrada.');
  if(slot.endsWith('_PREPARED')){if(!actor.admin||relatedId!=='')deliveryFail('Preparación exclusivamente administrativa.');}
  else if(slot.endsWith('_SIGNED')){const kind=slot.replace('_SIGNED','') as DeliveryDocumentKind;if(!view.delivery.documents[kind].prepared||view.delivery.documents[kind].prepared!.photoId!==relatedId)deliveryFail('Firma de otra versión preparada.');}
  else if(!view.state.incidents.some(i=>i.id===relatedId&&i.damage))deliveryFail('Incidencia de daños no disponible.');return view;
 }
 await db.runTransaction(async tx=>{await allowed(tx);const old=await tx.get(ref),all=await tx.get(ref.parent.limit(100));if(old.exists&&(old.data()!.sha256!==hash||old.data()!.slot!==slot||old.data()!.relatedId!==relatedId||old.data()!.actor!==actor.uid))deliveryFail('Conflicto de fotografía.');if(!old.exists&&all.size>=100)deliveryFail('Límite de archivos alcanzado.');if(!old.exists)tx.create(ref,{photoId,slot,relatedId,path,sha256:hash,size:bytes.length,mime,state:'PENDING',actor:actor.uid,createdAt:new Date().toISOString()});});
 const file=bucket.file(path);try{await file.save(bytes,{resumable:false,preconditionOpts:{ifGenerationMatch:0},metadata:{contentType:mime,cacheControl:'private, no-store'}});}catch(e){if((e as {code?:number}).code!==412)throw e;}
 if(sha((await file.download())[0])!==hash)deliveryFail('Archivo diferente.');
 await db.runTransaction(async tx=>{await allowed(tx);const old=await tx.get(ref);if(old.data()?.sha256!==hash)deliveryFail();tx.update(ref,{state:'COMMITTED'});});return {photoId,slot,relatedId};
}
export async function readDeliveryPhoto(db:Firestore,bucket:Bucket,id:string,v:number,photoId:string,actor:CustodyActor){
 opaque(photoId);await db.runTransaction(async tx=>privateDocuments(await deliveryLoad(db,tx,id,v,actor),actor));
 const p=(await deliveryRef(db,id,v).collection('photos').doc(photoId).get()).data();if(!p||p.state!=='COMMITTED'||p.path!==`operation-delivery-v2/${id}/v${v}/${photoId}`)deliveryFail('Archivo no disponible.');const bytes=(await bucket.file(p.path).download())[0];if(bytes.length!==p.size||sha(bytes)!==p.sha256)deliveryFail('Integridad inválida.');return {bytes,mime:p.mime as string};
}
