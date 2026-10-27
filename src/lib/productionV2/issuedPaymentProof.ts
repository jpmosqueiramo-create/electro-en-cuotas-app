import type {Transaction} from 'firebase-admin/firestore';
import type {ProductionRuntime} from './runtime';
import {issuedOperation} from './documents';
import {issuedDocumentKinds} from './catalog';
import {assertVerifiedEvidence,type EvidenceMetadata,type VerifiedEvidence} from '../operationEvidenceV2';
/** Payment authority is separate from physical delivery. Never marks signatures or receipt. */
export async function issuedPaymentProof(runtime:ProductionRuntime,tx:Transaction,id:string,v:number,verified?:Map<string,VerifiedEvidence>){
 const issued=await issuedOperation(runtime,tx,id,v,'FINANCE',true),files=new Map<string,EvidenceMetadata>();
 for(const kind of issuedDocumentKinds(issued.package)){
  const doc=issued.manifest.documents[kind];files.set(doc.path,doc);
  if(verified)assertVerifiedEvidence(doc,verified.get(doc.path));
 }
 return {...issued,delivery:null,files};
}
