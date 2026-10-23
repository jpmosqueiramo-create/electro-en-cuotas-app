import './helpers/requireSafeEmulatorEnvironment';
import assert from 'node:assert/strict';
import { randomUUID, createHash } from 'node:crypto';
import { admin } from '../src/lib/firebaseAdmin';
import { createLabSession } from '../src/lib/operationsLabServer';
import { labRepository, resolveLabExecutionContext, labSessionReference } from '../src/lib/operationsLabContext';
import { freezeLabContract, validateLabSnapshot, type LabReadySource } from '../src/lib/operationsLabFreeze';
import { persistReadyContract } from './helpers/contractFreezeFixtures';
import { operationFromAcceptance } from '../src/lib/operationV2';
import { stable } from '../src/lib/contractV2';
import { validateContractSnapshot } from '../src/lib/contractSnapshotV2';
import { requiredDocuments } from '../src/lib/creditReviewV2';
import { contractValueHash } from '../src/lib/contractIntegrityV2';
async function main() {
 assert.equal(process.env.GCLOUD_PROJECT,'demo-cuenta-hogar');
 const db=admin.firestore(),uid='synthetic-lab-freeze-admin',id=randomUUID();
 const env={OPERATIONS_LAB_ENABLED:'true',OPERATIONS_LAB_ADMIN_UIDS:JSON.stringify([uid])};
 await createLabSession(db,uid,{commandId:id},env);
 const ctx=await resolveLabExecutionContext(db,uid,id,env),repo=labRepository(ctx);
 const f=await persistReadyContract(db,'synthetic-lab-freeze-'+id,false,12);
 const operationId=operationFromAcceptance(f.a).operationId;
 const hash=(value:unknown)=>createHash('sha256').update(stable(value)).digest('hex');
 // Refresh READY provenance after applying synthetic personal data. No production data is copied.
 f.d.lastClientSubmissionAppliedAt=f.d.updatedAt;f.d.updatedBy=uid;
 const {buildReadyEvidence}=await import('../src/lib/contractReadyV2');
 const evidence=buildReadyEvidence(f.b,f.a,{...f.d,revision:f.d.revision-1},f.d.updatedBy,f.d.updatedAt,f.d.readyEvidenceId!);
 const source:LabReadySource={budget:f.b,acceptance:f.a,draft:f.d,readyEvidence:evidence,
  reviewCommand:{...(await f.r.draft.collection('commands').doc('ready').get()).data(),digest:hash({actor:uid,input:{action:'MARK_READY_TO_FORMALIZE',commandId:f.d.readyEvidenceId,expectedRevision:f.d.revision-1}}),by:uid,result:f.d},
  reviewEvent:{...(await f.r.draft.collection('events').doc('ready').get()).data()!,by:uid},
  conformity:(await f.r.draft.collection('conformity').doc('current').get()).data() as LabReadySource['conformity'],
  profile:{schemaVersion:'CLIENT_DOCUMENT_PROFILE_V2',profileId:operationId,originBudgetId:f.id,originVersion:1,identityHash:hash({dni:f.d.personalData.dni,fullName:f.d.personalData.fullName.trim().normalize('NFKC').toLocaleUpperCase('es-AR')}),verifiedBy:uid,verifiedAt:f.d.updatedAt,verificationEvidence:'SYNTHETIC ONLY',revision:1,documents:{}},
  credit:{policy:'MANUAL_CREDIT_REVIEW_V1',operationId,revision:1,state:'APPROVED',profileOrigin:{budgetId:f.id,version:1},resolution:'SYNTHETIC ONLY',notes:'Not a real credit decision',reviewedBy:uid,reviewedAt:f.d.updatedAt,draftDataHash:hash({personalData:f.d.personalData,employmentData:f.d.employmentData}),documentsHash:null}};
 for(const type of requiredDocuments)source.profile.documents[type]={type,sourceBudgetId:f.id,sourceVersion:1,attachment:{attachmentId:'synthetic-'+type,storagePath:'synthetic-only/'+id+'/'+type,originalName:'synthetic.txt',mimeType:'text/plain',size:4,uploadedAt:f.d.updatedAt,uploadedBy:uid,sha256:hash(type)},status:'VERIFIED',validUntil:'2099-12-31',reviewedAt:f.d.updatedAt,reviewedBy:uid,note:'Synthetic review, no real documents'};
 source.credit.documentsHash=hash(source.profile.documents);
 const input={commandId:randomUUID(),operationId,expectedRevision:f.d.revision};
 await assert.rejects(freezeLabContract(ctx,input),/LAB_READY_REQUIRED/);
 const save=async(s:LabReadySource)=>repo.transaction(async tx=>{tx.replace('contracts',operationId,{state:'READY',source:s});});
 for(const change of [
  (s:LabReadySource)=>{s.draft.status='DRAFT';},
  (s:LabReadySource)=>{s.conformity.confirmedDigest='0'.repeat(64);},
  (s:LabReadySource)=>{s.profile.identityHash='0'.repeat(64);},
  (s:LabReadySource)=>{s.credit.state='REJECTED';},
  (s:LabReadySource)=>{s.profile.documents.DNI_FRONT!.validUntil='2000-01-01';},
  (s:LabReadySource)=>{s.reviewEvent.to='DRAFT';},
  (s:LabReadySource)=>{s.draft.paymentScheduleDraft[0].amount++;},
 ]){const bad=structuredClone(source);change(bad);await save(bad);await assert.rejects(freezeLabContract(ctx,input));assert.equal(await repo.read('contracts','numbering'),null);assert.equal(await repo.read('snapshots',operationId),null);}
 await save(source);
 await assert.rejects(freezeLabContract(ctx,input),/LAB_READY_AUDIT_REQUIRED/);
 await repo.transaction(async tx=>{tx.create('commands',source.readyEvidence.commandId,{action:'READY',actor:uid,at:source.readyEvidence.reviewedAt,technicalReview:source.reviewCommand,technicalEvent:source.reviewEvent});tx.create('events',source.readyEvidence.commandId,{action:'READY',actor:uid,at:source.readyEvidence.reviewedAt});});
 const normalBefore=await f.r.draft.get();
 const results=await Promise.all(Array.from({length:5},()=>freezeLabContract(ctx,input)));
 assert(results.every(s=>s.hash===results[0].hash));
 const snapshot=results[0];validateLabSnapshot(ctx,snapshot);
 assert.throws(()=>validateContractSnapshot(snapshot));
 assert.throws(()=>validateLabSnapshot(ctx,{...snapshot,number:'CH-000001'}));
 assert.throws(()=>validateLabSnapshot(ctx,{...snapshot,source:{...snapshot.source,draft:{...snapshot.source.draft,revision:999}}}));
 const ref=labSessionReference(db,uid,id).collection('snapshots').doc(operationId),before=await ref.get();
 assert.deepEqual(await freezeLabContract(ctx,input),snapshot);
 assert((await ref.get()).updateTime!.isEqual(before.updateTime!));
 await assert.rejects(freezeLabContract(ctx,{...input,expectedRevision:999}));
 await assert.rejects(freezeLabContract(ctx,{...input,commandId:randomUUID()}));
 assert.equal((await repo.read('contracts','numbering'))!.lastSequence,1);
 assert((await f.r.draft.get()).updateTime!.isEqual(normalBefore.updateTime!));
 assert.equal(contractValueHash(snapshot.source.draft.economicTerms),contractValueHash(f.d.economicTerms));
 assert.equal((await db.doc('contractNumberingV2/CONTRACT_NUMBERING_V1').get()).exists,false);
 console.log('LAB_FREEZE_PASS: READY, review provenance, identity, credit, conformity, schedule, atomic snapshot/TEST, concurrency, replay, tamper rejection, normal validator rejection, unchanged normal draft and CH counter');
}
main().then(()=>admin.app().delete()).catch(e=>{console.error(e.message);process.exitCode=1;});
