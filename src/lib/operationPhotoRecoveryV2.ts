import type { Firestore, DocumentReference, Transaction } from 'firebase-admin/firestore';
import type { Bucket } from '@google-cloud/storage';
import { stable } from './contractV2';
import { verifyEvidenceObject, type EvidenceMetadata } from './operationEvidenceV2';

// Never deletes an object/reservation. Missing uploads remain retryable under the same ID.
export async function recoverPhotoReservation(db:Firestore,bucket:Bucket,ref:DocumentReference,actor:string,authorize:(tx:Transaction)=>Promise<unknown>){
 const saved=await db.runTransaction(async tx=>{await authorize(tx);const p=(await tx.get(ref)).data();if(!p||!['PENDING','COMMITTED'].includes(p.state))throw Error('Reserva no disponible.');return p;});
 const proof=await verifyEvidenceObject(bucket,{...saved,state:'COMMITTED'} as EvidenceMetadata);
 return db.runTransaction(async tx=>{await authorize(tx);const current=(await tx.get(ref)).data();if(stable(current)!==stable(saved)){
  if(current?.state==='COMMITTED'&&current.generation===proof.generation){const original:Record<string,unknown>={...current,state:saved.state};for(const key of ['generation','committedAt','committedBy'])delete original[key];if(stable(original)===stable(saved))return {photoId:ref.id,replay:true};}
  throw Error('La reserva cambió; recargá antes de reintentar.');
 }
 if(saved.state==='COMMITTED')return {photoId:ref.id,replay:true};
 tx.update(ref,{state:'COMMITTED',generation:proof.generation,committedAt:new Date().toISOString(),committedBy:actor});
 return {photoId:ref.id,replay:false};});
}

/** Serialize object creation even when an Emulator does not enforce GCS preconditions. */
export async function withPhotoUploadLease<T>(db:Firestore,ref:DocumentReference,authorize:(tx:Transaction)=>Promise<unknown>,upload:(mayCreate:boolean)=>Promise<T>){
 const {randomUUID}=await import('node:crypto'),owner=randomUUID();
 const claimed=await db.runTransaction(async tx=>{await authorize(tx);const p=(await tx.get(ref)).data();if(!p)throw Error('Reserva no disponible.');if(p.state==='COMMITTED')return false;if(p.state!=='PENDING')throw Error('Reserva inválida.');if(Number(p.uploadLeaseUntil)>Date.now())throw Error('Carga en curso; reintentá el mismo archivo en unos instantes.');tx.update(ref,{uploadLeaseOwner:owner,uploadLeaseUntil:Date.now()+30000});return true;});
 try{return await upload(claimed);}catch(error){
  if(claimed)try{await db.runTransaction(async tx=>{await authorize(tx);const p=(await tx.get(ref)).data();if(p?.state==='PENDING'&&p.uploadLeaseOwner===owner)tx.update(ref,{uploadLeaseUntil:0});});}catch{/* Lease expiry permits recovery without deleting evidence. */}
  throw error;
 }
}
