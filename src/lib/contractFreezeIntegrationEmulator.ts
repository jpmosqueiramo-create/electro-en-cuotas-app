// Technical integration only. No route, Server Action or browser import is permitted.
import { createHash } from 'node:crypto';
import { Firestore, type Transaction } from 'firebase-admin/firestore';
import { assertContractInfrastructureEmulator, CONTRACT_INFRASTRUCTURE_PATHS as p, type ContractInfrastructureReceipt } from './contractInfrastructureEmulator';
import { contractRefs } from './contractV2Server';
import { opaque, stable, type ContractDraftV2 } from './contractV2';
import type { BudgetV2 } from './budgetV2';
import type { BudgetAcceptanceV2 } from './budgetAcceptanceV2';
import { verifyReadyEvidence, type ContractReadyEvidenceV1 } from './contractReadyV2';
import { contractValueHash, canonicalizeContract, infrastructureReject as fail } from './contractIntegrityV2';
import { contractIdentity, contractOriginId, contractSnapshotId, contractNumber, validateSequence, validateContractSnapshot, validateContractLegalContext, sealContractSnapshot, type ContractSnapshotV2, type ContractLegalContextV2 } from './contractSnapshotV2';
import { PERSONAL_ADDRESS_VERSION, provinceLabel } from './contractAddress';
export const FREEZE_INTEGRATION_POLICY = 'READY_FREEZE_EMULATOR_V1' as const;
export const FREEZE_DEPENDENCIES_COLLECTION = `${p.counter}/dependencies`;
interface Command { action:'FREEZE_READY_EMULATOR';commandId:string;budgetId:string;budgetVersion:number;expectedRevision:number;dependenciesId:string }
interface FrozenMetadata { executionMode:'EMULATOR_ONLY';integrationPolicyVersion:typeof FREEZE_INTEGRATION_POLICY;receipt:ContractInfrastructureReceipt;readyRevision:number;dependenciesId:string }
type FrozenDraft = Omit<ContractDraftV2,'status'> & { status:'TERMS_FROZEN';emulatorFreeze:FrozenMetadata };
function record(v:unknown,keys:string[]):Record<string,unknown>{
 canonicalizeContract(v);
 if(!v||typeof v!=='object'||Array.isArray(v)||Object.keys(v).length!==keys.length||keys.some(k=>!Object.hasOwn(v,k)))fail('INVALID_FREEZE_INTEGRATION_DATA');
 return v as Record<string,unknown>;
}
function parse(input:unknown):Command{
 const c=record(input,['action','commandId','budgetId','budgetVersion','expectedRevision','dependenciesId']);
 if(c.action!=='FREEZE_READY_EMULATOR')fail('IMMUTABLE_CONTRACT_OPERATION_REJECTED');
 opaque(c.commandId);opaque(c.budgetId);opaque(c.dependenciesId);
 for(const n of [c.budgetVersion,c.expectedRevision])if(!Number.isSafeInteger(n)||Number(n)<1||Number(n)>=Number.MAX_SAFE_INTEGER)fail('INVALID_FREEZE_REVISION');
 return c as unknown as Command;
}
function equal(a:unknown,b:unknown){if(contractValueHash(a)!==contractValueHash(b))fail('STOP_FREEZE_REGISTRY_INTEGRITY');}
function legalOf(s:ContractSnapshotV2):ContractLegalContextV2{return {issuer:s.issuer,documentContext:s.documentContext,documentDefinitions:s.documentDefinitions};}
export function createContractFreezeIntegrationEmulator(){
 assertContractInfrastructureEmulator();
 const db=new Firestore({projectId:'demo-cuenta-hogar',host:'127.0.0.1:8080',ssl:false});
 async function verifyReview(tx:Transaction,b:BudgetV2,a:BudgetAcceptanceV2,d:ContractDraftV2,e:ContractReadyEvidenceV1){
  verifyReadyEvidence(b,a,d,e);
  const refs=contractRefs(db,d.budgetId,d.budgetVersion);
  const [command,event]=await Promise.all([tx.get(refs.draft.collection('commands').doc(opaque(e.commandId))),tx.get(refs.draft.collection('events').doc(e.commandId))]);
  if(!command.exists||!event.exists)fail('CONTRACT_READY_PROVENANCE_REQUIRED');
  const cmd=command.data()!,ev=event.data()!;
  const digest=createHash('sha256').update(stable({actor:e.reviewedBy,input:{action:'MARK_READY_TO_FORMALIZE',commandId:e.commandId,expectedRevision:e.draftRevision-1}})).digest('hex');
  if(cmd.action!=='MARK_READY_TO_FORMALIZE'||cmd.digest!==digest||cmd.by!==e.reviewedBy||cmd.createdAt!==e.reviewedAt||ev.action!=='MARK_READY_TO_FORMALIZE'||ev.to!=='READY_TO_FORMALIZE'||ev.from!=='DRAFT'||ev.by!==e.reviewedBy||ev.at!==e.reviewedAt||ev.afterRevision!==e.draftRevision||ev.beforeRevision!==e.draftRevision-1||ev.readyEvidenceId!==e.commandId)fail('CONTRACT_READY_PROVENANCE_REQUIRED');
  equal(cmd.result,d);
 }
 async function verifyReceipt(tx:Transaction,receipt:ContractInfrastructureReceipt,c:Command):Promise<ContractInfrastructureReceipt>{
  record(receipt,['contractId','snapshotId','contractNumber','snapshotHash']);
  if(!/^CH-[0-9]{6,1000}$/.test(receipt.contractNumber)||!/^[a-f0-9]{64}$/.test(receipt.snapshotHash))fail('STOP_FREEZE_REGISTRY_INTEGRITY');
  const refs=contractRefs(db,c.budgetId,c.budgetVersion);
  const [ss,number,ev,ds,b,a]=await Promise.all([tx.get(db.collection(p.snapshots).doc(opaque(receipt.snapshotId))),tx.get(db.collection(p.numbers).doc(receipt.contractNumber)),tx.get(db.collection(p.evidence).doc(opaque(receipt.contractId))),tx.get(refs.draft),tx.get(refs.budget),tx.get(refs.acceptance)]);
  if(!ss.exists||!number.exists||!ev.exists||!ds.exists||!b.exists||!a.exists)fail('STOP_FREEZE_REGISTRY_INTEGRITY');
  const s=ss.data();validateContractSnapshot(s);
  if(s.freeze.readinessPolicyVersion!=='CONTRACT_TECHNICAL_REVIEW_V1')fail('STOP_FREEZE_REGISTRY_INTEGRITY');
  const frozen=ds.data() as FrozenDraft;
  if(frozen.status!=='TERMS_FROZEN'||frozen.emulatorFreeze?.executionMode!=='EMULATOR_ONLY'||frozen.emulatorFreeze.integrationPolicyVersion!==FREEZE_INTEGRATION_POLICY||frozen.emulatorFreeze.readyRevision!==c.expectedRevision||frozen.emulatorFreeze.dependenciesId!==c.dependenciesId||frozen.revision!==c.expectedRevision+1||frozen.activeClientDataRequestId!==null)fail('STOP_FREEZE_REGISTRY_INTEGRITY');
  if(frozen.updatedAt!==s.freeze.termsFrozenAt||frozen.updatedBy!==s.freeze.termsFrozenBy||s.sourceDraft.revision!==c.expectedRevision)fail('STOP_FREEZE_REGISTRY_INTEGRITY');
  const {emulatorFreeze:_metadata,...rest}=frozen;void _metadata;
  const ready:ContractDraftV2={...rest,status:'READY_TO_FORMALIZE',revision:c.expectedRevision,updatedAt:s.freeze.readyAt,updatedBy:s.freeze.readyBy};
  const review=await tx.get(refs.draft.collection('readyReviews').doc(opaque(s.freeze.readyEvidenceId)));
  if(!review.exists)fail('STOP_FREEZE_REGISTRY_INTEGRITY');
  const e=review.data() as ContractReadyEvidenceV1;
  await verifyReview(tx,b.data() as BudgetV2,a.data() as BudgetAcceptanceV2,ready,e);
  const identity={budgetId:c.budgetId,budgetVersion:c.budgetVersion,contractDraftId:ready.contractDraftId,acceptedOptionId:ready.acceptedOptionId};
  const origin=await tx.get(db.collection(p.origins).doc(contractOriginId(identity)));
  if(!origin.exists)fail('STOP_FREEZE_REGISTRY_INTEGRITY');
  const expected={contractId:s.contractId,snapshotId:s.contractSnapshotId,contractNumber:s.contractNumber,snapshotHash:s.integrity.payloadHash};
  equal(expected,receipt);equal(frozen.emulatorFreeze.receipt,expected);equal(number.data()!.receipt,expected);equal(origin.data()!.receipt,expected);equal(ev.data()!.receipt,expected);
  equal(s.contractId,contractIdentity(identity));equal(s.contractSnapshotId,contractSnapshotId(identity));
  equal(number.data()!.policyId,s.numbering.policyId);equal(number.data()!.sequence,s.numbering.sequence);
  equal(s.origin.budgetHash,contractValueHash(b.data()));equal(s.origin.acceptanceHash,contractValueHash(a.data()));equal(s.origin.draftHash,contractValueHash(ready));
  equal(s.freeze.readyEvidenceHash,contractValueHash(e));equal(s.freeze.dependenciesHash,contractValueHash(legalOf(s)));
  const sourceDigest=contractValueHash({budget:b.data(),acceptance:a.data(),draft:ready,readyEvidence:e,legalContext:legalOf(s)});
  equal(s.freeze.provenanceManifestHash,sourceDigest);equal(origin.data()!.sourceDigest,sourceDigest);equal(ev.data()!.sourceDigest,sourceDigest);
  equal(ev.data()!.readyEvidence,e);equal(ev.data()!.dependenciesHash,s.freeze.dependenciesHash);
  const event=await tx.get(db.collection(p.events).doc(opaque(s.freeze.commandId)));
  if(!event.exists||event.data()!.type!=='EMULATOR_TERMS_FROZEN'||event.data()!.actor!==s.freeze.termsFrozenBy||event.data()!.at!==s.freeze.termsFrozenAt||number.data()!.allocatedAt!==s.freeze.termsFrozenAt||ev.data()!.schemaVersion!=='READY_FREEZE_ORIGIN_EVIDENCE_V1')fail('STOP_FREEZE_REGISTRY_INTEGRITY');equal(event.data()!.receipt,expected);equal(event.data()!.sourceDigest,sourceDigest);
  return expected;
 }
 return {
  async execute(input:unknown,actor:string):Promise<ContractInfrastructureReceipt>{
   assertContractInfrastructureEmulator();const c=parse(input);
   if(!['synthetic-admin-a','synthetic-admin-b'].includes(actor))fail('SYNTHETIC_OPERATOR_REQUIRED');
   const dg=contractValueHash({actor,command:c}),cmd=db.collection(p.commands).doc(c.commandId),refs=contractRefs(db,c.budgetId,c.budgetVersion);
   return db.runTransaction(async tx=>{
    assertContractInfrastructureEmulator();
    const prior=await tx.get(cmd);
    if(prior.exists){if(prior.data()!.schemaVersion!=='READY_FREEZE_RECEIPT_V1'||prior.data()!.digest!==dg)fail('CONTRACT_COMMAND_CONFLICT');return verifyReceipt(tx,prior.data()!.receipt,c);}
    const [ds,b,a]=await Promise.all([tx.get(refs.draft),tx.get(refs.budget),tx.get(refs.acceptance)]);
    if(!ds.exists||!b.exists||!a.exists)fail('CONTRACT_READY_ORIGIN_REQUIRED');
    const raw=ds.data()!;
    if(raw.status==='TERMS_FROZEN'){
     const receipt=await verifyReceipt(tx,raw.emulatorFreeze?.receipt,c);
     tx.create(cmd,{schemaVersion:'READY_FREEZE_RECEIPT_V1',digest:dg,receipt,actor,action:c.action,replayOfExistingSnapshot:true});return receipt;
    }
    const d=raw as ContractDraftV2;
    if(d.status!=='READY_TO_FORMALIZE'||d.revision!==c.expectedRevision||!d.readyEvidenceId||d.activeClientDataRequestId!==null)fail('CONTRACT_READY_REVISION_REQUIRED');
    const [review,counter,deps]=await Promise.all([tx.get(refs.draft.collection('readyReviews').doc(opaque(d.readyEvidenceId))),tx.get(db.doc(p.counter)),tx.get(db.collection(FREEZE_DEPENDENCIES_COLLECTION).doc(c.dependenciesId))]);
    if(!review.exists)fail('CONTRACT_READY_EVIDENCE_REQUIRED');
    const e=review.data() as ContractReadyEvidenceV1;
    await verifyReview(tx,b.data() as BudgetV2,a.data() as BudgetAcceptanceV2,d,e);
    if(!counter.exists)fail('CONTRACT_COUNTER_MISSING');
    const ct=record(counter.data(),['schemaVersion','policyId','executionMode','active','lastAllocatedSequence']);
    if(ct.schemaVersion!=='CONTRACT_NUMBER_COUNTER_V1'||ct.policyId!=='CONTRACT_NUMBERING_V1'||ct.executionMode!=='EMULATOR_ONLY'||ct.active!==true)fail('CONTRACT_COUNTER_INACTIVE');
    validateSequence(ct.lastAllocatedSequence,true);
    if(!deps.exists)fail('SYNTHETIC_DEPENDENCIES_REQUIRED');
    const dep=record(deps.data(),['schemaVersion','executionMode','legalApproval','legalContext']);
    if(dep.schemaVersion!=='CONTRACT_FREEZE_SYNTHETIC_DEPENDENCIES_V1'||dep.executionMode!=='EMULATOR_ONLY'||dep.legalApproval!=='NOT_APPROVED_SYNTHETIC_ONLY')fail('SYNTHETIC_DEPENDENCIES_REQUIRED');
    const legal=dep.legalContext;validateContractLegalContext(legal);
    if(!legal.issuer.profileId.startsWith('synthetic-')||legal.issuer.taxId!=='SYNTHETIC_NOT_A_TAX_ID'||Object.values(legal.documentDefinitions).some(def=>!def.templateId.startsWith('synthetic-')||def.legalApprovalId!=='SYNTHETIC_NOT_A_LEGAL_APPROVAL'))fail('SYNTHETIC_DEPENDENCIES_REQUIRED');
    const identity={budgetId:c.budgetId,budgetVersion:c.budgetVersion,contractDraftId:d.contractDraftId,acceptedOptionId:d.acceptedOptionId};
    const id=contractIdentity(identity),sid=contractSnapshotId(identity),sequence=(BigInt(ct.lastAllocatedSequence)+BigInt(1)).toString(),number=contractNumber(sequence);
    const sr=db.collection(p.snapshots).doc(sid),nr=db.collection(p.numbers).doc(number),or=db.collection(p.origins).doc(contractOriginId(identity)),er=db.collection(p.evidence).doc(id),event=db.collection(p.events).doc(c.commandId);
    const destinations=await Promise.all([tx.get(sr),tx.get(nr),tx.get(or),tx.get(er),tx.get(event)]);
    if(destinations.some(s=>s.exists))fail('STOP_CONTRACT_NUMBER_OR_SNAPSHOT_COLLISION');
    const sourceDigest=contractValueHash({budget:b.data(),acceptance:a.data(),draft:d,readyEvidence:e,legalContext:legal}),now=new Date().toISOString(),acceptance=a.data() as BudgetAcceptanceV2;
    const snapshot=sealContractSnapshot({
     schemaVersion:'CONTRACT_SNAPSHOT_V2',currency:'ARS',contractId:id,contractSnapshotId:sid,snapshotVersion:1,contractNumber:number,numbering:{policyId:'CONTRACT_NUMBERING_V1',sequence},
     sourceDraft:{...identity,revision:d.revision,readyDigest:e.termsDigest},
     origin:{sourceCollection:acceptance.sourceCollection,solicitudId:acceptance.solicitudId,acceptedAt:acceptance.acceptedAt,acceptedBy:acceptance.acceptedBy,budgetHash:contractValueHash(b.data()),acceptanceHash:contractValueHash(a.data()),draftHash:contractValueHash(d),preferredPlanCuotas:acceptance.preferredPlanCuotas,preferredPlanAmountSnapshot:acceptance.preferredPlanAmountSnapshot},
     acceptedReference:d.acceptedReferenceSnapshot,personalDataVersion:PERSONAL_ADDRESS_VERSION,personalData:d.personalData as Required<typeof d.personalData>,
     addressInterpretation:{jurisdictionCatalogVersion:PERSONAL_ADDRESS_VERSION,provinceDisplayName:provinceLabel(d.personalData.province!),postalPolicyVersion:'AR_POSTAL_STRUCTURE_V1'},
     employmentData:d.employmentData,economicTerms:d.economicTerms!,calculationPolicyVersion:'P5C_SHARED_C1_V1',roundingPolicy:'NEXT_90_V1',
     paymentSchedule:{calendarPolicyVersion:'P5C_EXPLICIT_MONTH_CLAMP_V1',firstInstallmentDueDate:d.firstInstallmentDueDate!,preferredMonthlyDueDay:d.preferredMonthlyDueDay!,installments:d.paymentScheduleDraft},...legal,
     freeze:{state:'TERMS_FROZEN',preparedAt:d.preparedAt,readyAt:e.reviewedAt,readyBy:e.reviewedBy,termsFrozenAt:now,termsFrozenBy:actor,commandId:c.commandId,readinessPolicyVersion:'CONTRACT_TECHNICAL_REVIEW_V1',integrationPolicyVersion:FREEZE_INTEGRATION_POLICY,executionMode:'EMULATOR_ONLY',readyEvidenceId:d.readyEvidenceId,readyEvidenceHash:contractValueHash(e),dependenciesHash:contractValueHash(legal),legalTemplateReviewRequired:true,provenanceManifestHash:sourceDigest},
    });
    const receipt={contractId:id,snapshotId:sid,contractNumber:number,snapshotHash:snapshot.integrity.payloadHash};
    // All reads above, all writes below. READY already revoked active public capabilities.
    tx.create(sr,snapshot);tx.create(nr,{policyId:'CONTRACT_NUMBERING_V1',sequence,receipt,allocatedAt:now});
    tx.create(er,{schemaVersion:'READY_FREEZE_ORIGIN_EVIDENCE_V1',readyEvidence:e,dependenciesHash:contractValueHash(legal),sourceDigest,receipt});
    tx.create(or,{sourceDigest,receipt});tx.create(cmd,{schemaVersion:'READY_FREEZE_RECEIPT_V1',digest:dg,receipt,actor,action:c.action,replayOfExistingSnapshot:false});
    tx.create(event,{type:'EMULATOR_TERMS_FROZEN',actor,at:now,receipt,sourceDigest});
    tx.update(refs.draft,{status:'TERMS_FROZEN',revision:d.revision+1,updatedAt:now,updatedBy:actor,emulatorFreeze:{executionMode:'EMULATOR_ONLY',integrationPolicyVersion:FREEZE_INTEGRATION_POLICY,receipt,readyRevision:d.revision,dependenciesId:c.dependenciesId}});
    tx.update(db.doc(p.counter),{lastAllocatedSequence:sequence});return receipt;
   });
  },
  async getSnapshot(snapshotId:string):Promise<ContractSnapshotV2|null>{assertContractInfrastructureEmulator();const s=await db.collection(p.snapshots).doc(opaque(snapshotId)).get();if(!s.exists)return null;const data=s.data();validateContractSnapshot(data);return data;},
  async close(){await db.terminate();},
 };
}
