import { createHash } from 'node:crypto';
import type { Bucket } from '@google-cloud/storage';
import { stable } from './contractV2';

export type EvidenceMetadata = {path:string;sha256:string;size:number;generation?:string;state:string};
export type VerifiedEvidence = { fingerprint:string; generation:string };
// Called only outside Firestore transactions. Pin the generation actually hashed.
// An out-of-band replacement is never accepted merely because its path is unchanged.
export async function readVerifiedEvidenceObject(bucket:Bucket,p:EvidenceMetadata){
 if(p.state!=='COMMITTED'||!Number.isSafeInteger(p.size)||p.size<=0||! /^[a-f0-9]{64}$/.test(p.sha256))throw Error('Evidencia incompleta.');
 const file=bucket.file(p.path),before=(await file.getMetadata())[0],generation=String(before.generation);
 if(!generation||generation==='undefined'||p.generation&&p.generation!==generation)throw Error('Versión de evidencia reemplazada.');
 const bytes=(await bucket.file(p.path,{generation}).download())[0];
 if(bytes.length!==p.size||createHash('sha256').update(bytes).digest('hex')!==p.sha256)throw Error('Integridad de evidencia inválida.');
 if(String((await file.getMetadata())[0].generation)!==generation)throw Error('Evidencia modificada durante verificación.');
 return {proof:{fingerprint:stable(p),generation},bytes};
}
export async function verifyEvidenceObject(bucket:Bucket,p:EvidenceMetadata):Promise<VerifiedEvidence>{return (await readVerifiedEvidenceObject(bucket,p)).proof;}
export function assertVerifiedEvidence(p:EvidenceMetadata,verified:VerifiedEvidence|undefined){
 if(!verified||verified.fingerprint!==stable(p)||p.generation&&p.generation!==verified.generation)throw Error('La evidencia cambió; repetí la verificación.');
}
