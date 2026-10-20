import type { Firestore } from 'firebase-admin/firestore';
import type { Bucket } from '@google-cloud/storage';
import { createHash } from 'node:crypto';
import { opaque } from './contractV2';
import { validateDocumentBytes } from './budgetDocumentationStorage';
import { authorizeCustody, custodyLoad, custodyRef, type CustodyActor } from './operationCustodyV2Server';
import { custodyFail } from './operationCustodyV2';
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
  if(prior.exists&&(prior.data()!.sha256!==hash||prior.data()!.incidentId!==incidentId||prior.data()!.actor!==actor.uid))custodyFail('Conflicto de fotografía.');
  if(!prior.exists&&all.size>=100)custodyFail('Límite de fotografías alcanzado.');
  if(!prior.exists)tx.create(ref,{photoId,incidentId,path,sha256:hash,mime,size:bytes.length,actor:actor.uid,state:'PENDING',createdAt:new Date().toISOString()});
 });
 await authorize();
 const file=bucket.file(path);
 try {await file.save(bytes,{resumable:false,preconditionOpts:{ifGenerationMatch:0},metadata:{contentType:mime,cacheControl:'private, no-store'}});}
 catch(e){if((e as {code?:number}).code!==412)throw e;}
 if(sha((await file.download())[0])!==hash)custodyFail('Fotografía inconsistente.');
 await authorize();
 await db.runTransaction(async tx=>{await custodyLoad(db,tx,id,v,actor);const p=await tx.get(ref);if(p.data()?.sha256!==hash)custodyFail();tx.update(ref,{state:'COMMITTED'});});
 return {photoId,incidentId};
}
export async function readCustodyPhoto(db:Firestore,bucket:Bucket,id:string,v:number,photoId:string,actor:CustodyActor) {
 opaque(photoId);await authorizeCustody(db,id,v,actor);
 const snap=await custodyRef(db,id,v).collection('photos').doc(photoId).get(),p=snap.data();
 if(!p||p.state!=='COMMITTED'||p.path!==`operation-custody-v2/${id}/v${v}/${p.incidentId}/${photoId}`)custodyFail('Fotografía no disponible.');
 const bytes=(await bucket.file(p.path).download())[0];if(bytes.length!==p.size||sha(bytes)!==p.sha256)custodyFail('Integridad de fotografía inválida.');
 return {bytes,mime:p.mime as string};
}
