// Administrative read model: transactional reads only, no migration or writes.
import type { Firestore } from 'firebase-admin/firestore';
import type { BudgetV2 } from '../budgetV2';
import type { BudgetAcceptanceV2, BudgetDocumentationCaseV2 } from '../budgetAcceptanceV2';
import { DOCUMENT_TYPES } from '../budgetAcceptanceV2';
import { contractRefs } from '../contractV2Server';
import { opaque, type ContractDraftV2 } from '../contractV2';
import { contractValueHash } from '../contractIntegrityV2';
import { verifyReadyEvidence, type ContractReadyEvidenceV1 } from '../contractReadyV2';
import { contractSnapshotId, validateContractSnapshot } from '../contractSnapshotV2';
import { assertContractInfrastructureEmulator } from '../contractInfrastructureEmulator';
import { validateArchiveRecord } from './archiveRecord';
import { documentPolicy, type ContractDocumentDossier, type DocumentArchiveRecord } from './workflow';
const fail = (): never => {throw new Error('CONTRACT_DOCUMENT_DOSSIER_INCONSISTENT');};
export async function readContractDocumentDossier(db:Firestore,id:string,version:number):Promise<ContractDocumentDossier> {
  const refs=contractRefs(db,id,version);
  return db.runTransaction(async tx=>{
    const [bs,as,ds,ps]=await Promise.all([tx.get(refs.budget),tx.get(refs.acceptance),tx.get(refs.draft),tx.get(refs.family.collection('documentation').doc(String(version)))]);
    if(!bs.exists||!as.exists||!ds.exists)fail();
    const b=bs.data() as BudgetV2,a=as.data() as BudgetAcceptanceV2;
    const d=ds.data() as ContractDraftV2 & {emulatorFreeze?:{executionMode:string;readyRevision:number;receipt:{snapshotId:string;snapshotHash:string;contractId:string;contractNumber:string}}};
    const status=String(d.status);
    if(b.schemaVersion!=='BUDGET_V2'||a.schemaVersion!=='BUDGET_ACCEPTANCE_V2'||d.schemaVersion!=='CONTRACT_DRAFT_V2'||b.id!==id||b.version!==version||a.budgetId!==id||a.budgetVersion!==version||d.budgetId!==id||d.budgetVersion!==version||d.acceptedOptionId!==a.acceptedOptionId||!['DRAFT','READY_TO_FORMALIZE','TERMS_FROZEN'].includes(status))fail();
    const selected=b.options.filter(o=>o.optionId===a.acceptedOptionId);
    if(selected.length!==1||contractValueHash(selected[0])!==contractValueHash(a.optionSnapshot)||contractValueHash(d.acceptedReferenceSnapshot)!==contractValueHash((({imagenUrls:_images,...ref})=>{void _images;return ref;})(a.optionSnapshot.referenceSnapshot)))fail();
    let evidence:ContractReadyEvidenceV1|null=null,snapshot:ContractDocumentDossier['snapshot']=null,archives:ContractDocumentDossier['archives']=[];
    if(status!=='DRAFT'){
      const review=await tx.get(refs.draft.collection('readyReviews').doc(opaque(d.readyEvidenceId)));if(!review.exists)fail();evidence=review.data() as ContractReadyEvidenceV1;
      if(status==='READY_TO_FORMALIZE')verifyReadyEvidence(b,a,d,evidence);
      else {
        // C1 is still a demo-only technical freeze. Never treat a raw status as proof.
        assertContractInfrastructureEmulator();const meta=d.emulatorFreeze;
        if(!meta)throw new Error('CONTRACT_DOCUMENT_DOSSIER_INCONSISTENT');
        if(meta.executionMode!=='EMULATOR_ONLY'||meta.readyRevision!==evidence.draftRevision||d.revision!==meta.readyRevision+1)fail();
        const {emulatorFreeze:_freeze,...readyDraft}=d;void _freeze;
        verifyReadyEvidence(b,a,{...readyDraft,status:'READY_TO_FORMALIZE',revision:meta.readyRevision,updatedAt:evidence.reviewedAt,updatedBy:evidence.reviewedBy},evidence);
        const sid=contractSnapshotId({budgetId:id,budgetVersion:version,contractDraftId:d.contractDraftId,acceptedOptionId:d.acceptedOptionId});
        const sr=db.collection('contractSnapshotsV2').doc(sid),saved=await tx.get(sr);if(!saved.exists)fail();const s=saved.data();validateContractSnapshot(s);
        if(s.contractSnapshotId!==sid||s.sourceDraft.readyDigest!==evidence.termsDigest||s.origin.budgetHash!==contractValueHash(b)||s.origin.acceptanceHash!==contractValueHash(a)||s.freeze.readinessPolicyVersion!=='CONTRACT_TECHNICAL_REVIEW_V1'||s.freeze.readyEvidenceHash!==contractValueHash(evidence)||contractValueHash(meta.receipt)!==contractValueHash({contractId:s.contractId,snapshotId:sid,snapshotHash:s.integrity.payloadHash,contractNumber:s.contractNumber}))fail();
        snapshot={snapshotId:sid,snapshotHash:s.integrity.payloadHash,contractNumber:s.contractNumber,templateVersions:Object.values(s.documentDefinitions).map(def=>def.templateVersion)};
        const records=await tx.get(sr.collection('documents'));
        archives=records.docs.map(record=>{const r=record.data() as DocumentArchiveRecord;validateArchiveRecord(r,s);if(r.schemaVersion!=='CONTRACT_DOCUMENT_ARCHIVE_V1'||r.snapshotId!==sid||r.snapshotHash!==s.integrity.payloadHash||r.documentSetId!==record.id||r.issuance!=='REVIEW_ONLY'||r.legalApproval!=='PENDING'||!['PENDING','COMPLETE'].includes(r.state))fail();return {documentSetId:r.documentSetId,state:r.state,manifestHash:r.manifestHash,snapshotHash:r.snapshotHash,artifacts:r.artifacts.map(({kind,sha256,pages,templateVersion})=>({kind,sha256,pages,templateVersion}))};});
      }
    }
    let documentation:ContractDocumentDossier['documentation']=[];
    if(ps.exists){const p=ps.data() as BudgetDocumentationCaseV2;if(p.schemaVersion==='BUDGET_DOCUMENTATION_CASE_V2'){
      if(p.budgetId!==id||p.budgetVersion!==version||p.acceptedOptionId!==a.acceptedOptionId)fail();
      documentation=DOCUMENT_TYPES.map(type=>({type,status:p.slots[type].status,count:p.slots[type].attachments.length,required:false}));
    }else fail();}
    let sampleAvailable=false;try{assertContractInfrastructureEmulator();sampleAvailable=true;}catch{/* Informational preview is deliberately unavailable in production. */}
    return {budgetId:id,budgetVersion:version,acceptedOptionId:a.acceptedOptionId,acceptedAt:a.acceptedAt,referenceName:a.optionSnapshot.referenceSnapshot.nombre,offeredPlans:a.optionSnapshot.referenceSnapshot.planesOfrecidos.map(p=>p.cuotas),draftRevision:d.revision,stage:status==='DRAFT'?'DRAFT':status==='READY_TO_FORMALIZE'?'TECHNICAL_REVIEW':'TERMS_FROZEN',readiness:evidence?{reviewedAt:evidence.reviewedAt,reviewedBy:evidence.reviewedBy,termsDigest:evidence.termsDigest,evidenceHash:contractValueHash(evidence)}:null,documentation,snapshot,archives,sampleAvailable,policy:documentPolicy};
  });
}
