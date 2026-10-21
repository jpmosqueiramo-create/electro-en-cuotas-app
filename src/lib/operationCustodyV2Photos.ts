import type { Firestore } from 'firebase-admin/firestore';
import type { Bucket } from '@google-cloud/storage';
import { createHash } from 'node:crypto';
import { opaque } from './contractV2';
import { validateDocumentBytes } from './budgetDocumentationStorage';
import { authorizeCustody, custodyLoad, custodyRef, type CustodyActor } from './operationCustodyV2Server';
import { custodyFail } from './operationCustodyV2';
import { readVerifiedEvidenceObject,type EvidenceMetadata } from './operationEvidenceV2';
import { recoverPhotoReservation,withPhotoUploadLease } from './operationPhotoRecoveryV2';
const sha=(b:Uint8Array)=>createHash('sha256').update(b).digest('hex');
export async function saveCustodyPhoto(db:Firestore,bucket:Bucket,id:string,v:number,incidentId:string,photoId:string,bytes:Buffer,mime:string,actor:CustodyActor) {
 opaque(incidentId);opaque(photoId);
 if(!['image/jpeg','image/png','image/webp'].includes(mime))custodyFail('Sólo fotografías JPEG, PNG o WebP de hasta 10 MiB.');
 validateDocumentBytes(bytes,mime);const hash=sha(bytes),ref=custodyRef(db,id,v).collection('photos').doc(photoId);
 const path=`operation-custody-v2/${id}/v${v}/${incidentId}/${photoId}`;
 const authorize=async()=>{const view=await authorizeCustody(db,id,v,actor);if(!view.state.incidents.some(i=>i.id===incidentId))custodyFail('Incidencia no disponible.');};
 await authorize();
 // Durable reservation precedes Storage. No tokens, public ACLs, original names or compensating deletion.
 await db.runTransaction(async tx=>{
  const view=await custodyLoad(db,tx,id,v,actor);if(!view.state.incidents.some(i=>i.id===incidentId))custodyFail();
  const prior=await tx.get(ref),all=await tx.get(ref.parent.limit(101));
  if(prior.exists&&(prior.data()!.sha256!==hash||prior.data()!.path!==path||prior.data()!.mime!==mime||prior.data()!.size!==bytes.length||prior.data()!.incidentId!==incidentId||prior.data()!.actor!==actor.uid))custodyFail('Conflicto de fotografía.');
  if(!prior.exists&&all.size>=100)custodyFail('Límite de fotografías alcanzado.');
  if(!prior.exists)tx.create(ref,{photoId,incidentId,path,sha256:hash,mime,size:bytes.length,actor:actor.uid,state:'PENDING',createdAt:new Date().toISOString()});
 });
 await authorize();
 await withPhotoUploadLease(db,ref,async tx=>{const view=await custodyLoad(db,tx,id,v,actor);if(!view.state.incidents.some(i=>i.id===incidentId))custodyFail();},async mayCreate=>{const file=bucket.file(path);let exists=false;try{await file.getMetadata();exists=true;}catch(e){if((e as {code?:number}).code!==404)throw e;}if(!exists&&!mayCreate)custodyFail('El archivo confirmado ya no está disponible; no se recrea.');
 try {if(!exists)await file.save(bytes,{resumable:false,preconditionOpts:{ifGenerationMatch:0},metadata:{contentType:mime,cacheControl:'private, no-store'}});}
 catch(e){if((e as {code?:number}).code!==412)throw e;}
 await recoverCustodyPhoto(db,bucket,id,v,photoId,actor);});
 return {photoId,incidentId};
}
export async function readCustodyPhoto(db:Firestore,bucket:Bucket,id:string,v:number,photoId:string,actor:CustodyActor) {
 opaque(photoId);await authorizeCustody(db,id,v,actor);
 const snap=await custodyRef(db,id,v).collection('photos').doc(photoId).get(),p=snap.data();
 if(!p||p.state!=='COMMITTED'||p.path!==`operation-custody-v2/${id}/v${v}/${p.incidentId}/${photoId}`)custodyFail('Fotografía no disponible.');
 const {bytes}=await readVerifiedEvidenceObject(bucket,p as EvidenceMetadata);if(bytes.length!==p.size||sha(bytes)!==p.sha256)custodyFail('Integridad de fotografía inválida.');
 return {bytes,mime:p.mime as string};
}

export async function recoverCustodyPhoto(db:Firestore,bucket:Bucket,id:string,v:number,photoId:string,actor:CustodyActor){
 opaque(photoId);const ref=custodyRef(db,id,v).collection('photos').doc(photoId);
 return recoverPhotoReservation(db,bucket,ref,actor.uid,async tx=>{const view=await custodyLoad(db,tx,id,v,actor),p=(await tx.get(ref)).data();if(!p||p.path!==`operation-custody-v2/${id}/v${v}/${p.incidentId}/${photoId}`||!view.state.incidents.some(i=>i.id===p.incidentId)||!actor.admin&&p.actor!==actor.uid)custodyFail('Reserva no autorizada.');});
}
