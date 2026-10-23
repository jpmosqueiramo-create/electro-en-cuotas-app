import type { Firestore } from 'firebase-admin/firestore';
import { exact,opaque,stable } from './contractV2';
import { createHash } from 'node:crypto';
import { getBudgetDocumentationBucket } from './budgetDocumentationStorage';
import { approvalInput,currentLegalArtifacts,ownerLegalDeclaration,registrableLegalArtifacts,assertRegistrableApproval } from './legalApprovalV2';
// Existing server-only subtree. No Firestore Rules changes or client writes.
export const legalRegistryRef=(db:Firestore)=>db.collection('presupuestos_v2').doc('_legal_registry_v1').collection('contracts').doc('registry');
export async function recordLegalApproval(db:Firestore,input:unknown,actor:string) {
 const c=exact(input,['commandId','approval']);opaque(c.commandId);if(!actor)throw Error('ADMIN_REQUIRED');
 const approval=approvalInput(c.approval),ref=legalRegistryRef(db).collection('records').doc(String(c.commandId));
 const digest=createHash('sha256').update(stable({actor,approval})).digest('hex');
 const existing=await ref.get();if(existing.exists){if(existing.data()!.digest!==digest)throw Error('LEGAL_COMMAND_CONFLICT');return {id:ref.id,replay:true};}
 assertRegistrableApproval(approval);
 // Storage I/O stays outside Firestore retries; the reference pins the verified generation.
 if(approval.evidence){const e=approval.evidence,bucket=await getBudgetDocumentationBucket(),file=bucket.file(e.path),[metadata]=await file.getMetadata();
  if(String(metadata.generation)!==e.generation||Number(metadata.size)>10485760||Number(metadata.size)<1||metadata.metadata?.firebaseStorageDownloadTokens)throw Error('PRIVATE_LEGAL_EVIDENCE_INVALID');
  const [bytes]=await bucket.file(e.path,{generation:e.generation}).download();
  if(createHash('sha256').update(bytes).digest('hex')!==e.sha256)throw Error('PRIVATE_LEGAL_EVIDENCE_INVALID');
  const [after]=await file.getMetadata();if(String(after.generation)!==e.generation||after.metadata?.firebaseStorageDownloadTokens)throw Error('PRIVATE_LEGAL_EVIDENCE_CHANGED');
 }
 return db.runTransaction(async tx=>{const previous=await tx.get(ref);if(previous.exists){if(previous.data()!.digest!==digest)throw Error('LEGAL_COMMAND_CONFLICT');return {id:ref.id,replay:true};}
  tx.create(ref,{...approval,schemaVersion:'LEGAL_APPROVAL_V1',recordedBy:actor,recordedAt:new Date().toISOString(),digest});return {id:ref.id,replay:false};});
}
export async function readLegalRegistry(db:Firestore) {
 const records=await legalRegistryRef(db).collection('records').orderBy('recordedAt','desc').limit(100).get();
 return {artifacts:currentLegalArtifacts,registrableArtifacts:registrableLegalArtifacts,declaration:ownerLegalDeclaration,records:records.docs.map(d=>{const {digest,...record}=d.data();void digest;return {id:d.id,...record};}),productiveIssuanceEnabled:false,limit:100};
}
