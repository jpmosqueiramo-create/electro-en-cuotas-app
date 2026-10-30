import {LOOP_PACKAGE_ID} from './loopDocuments';
import {assertLoopContractForIssuance} from '../loopContractIssuance';
import {validateContractCommercial} from '../contractCommercialPreparation';
import {argentinaBusinessDate} from './businessDate';
import {OWNER_FINAL_PACKAGE_ID} from './ownerFinalDocuments';
/** Server-only orchestration of existing engines; no parallel numbering or debt. */
import type {Bucket} from '@google-cloud/storage';
import {exact,opaque,type ContractDraftV2} from '../contractV2';
import {contractCommand,contractRefs,clientConformityIsCurrent} from '../contractV2Server';
import {validateReadySource} from '../contractReadyV2';
import {contractValueHash} from '../contractIntegrityV2';
import {readOperationIdentity} from '../operationIdentityReviewServer';
import type {BudgetV2} from '../budgetV2';
import type {BudgetAcceptanceV2} from '../budgetAcceptanceV2';
import {operationFromAcceptance,operationRef,verifyOperation} from '../operationV2';
import {requireProductionActor,exactPackage,type ProductionRuntime} from './runtime';
import {assertFinalRenderer} from './pdf';
import {assertCurrentIssueDates} from './businessDate';
import {legalContext,productionRef,recordFinalPackageApproval,authorizeOperation,scopes} from './authorization';
import {freezeOperation} from './freeze';
import {readVerifiedEvidenceObject} from '../operationEvidenceV2';
import {issueDocuments,issuedOperation} from './documents';
import {assertAdministrativeRecordActive} from '../adminRecordRemovalServer';

export async function issuePreparedOperation(runtime:ProductionRuntime,bucket:Bucket,id:string,v:number,input:unknown,actor:string){
 const {db}=await requireProductionActor(runtime,actor);
 const c=exact(input,['commandId','expectedRevision','packageId','packageHash','formal','confirmed']);
 const cid=opaque(c.commandId);if(cid.length>64||c.confirmed!==true||!Number.isSafeInteger(c.expectedRevision)||Number(c.expectedRevision)<1)throw Error('EXPLICIT_ISSUANCE_CONFIRMATION_REQUIRED');
 const p=exactPackage(runtime,opaque(c.packageId));assertFinalRenderer(p);if(c.packageHash!==p.sha256)throw Error('EXACT_FINAL_PACKAGE_CONFIRMATION_REQUIRED');
 const ref=productionRef(db,id,v).collection('simpleIssuanceCommands').doc(cid),digest=contractValueHash({actor,id,v,input:c});
 // Reserve stable intent/time/step IDs before any phase. Every resume uses the same
 // command payload; concurrent retries converge through existing command receipts.
 const intent=await db.runTransaction(async tx=>{
  const old=await tx.get(ref);if(old.exists){if(old.data()!.digest!==digest)throw Error('PRODUCTION_COMMAND_CONFLICT');return old.data()!;}
  await assertAdministrativeRecordActive(db,tx,{kind:'CONTRACT',id,version:v});
  const r=contractRefs(db,id,v),[bs,as,ds,os,consent,identity]=await Promise.all([tx.get(r.budget),tx.get(r.acceptance),tx.get(r.draft),tx.get(operationRef(db,id,v)),tx.get(r.draft.collection('conformity').doc('current')),readOperationIdentity(db,tx,id,v)]);
  if(!bs.exists||!as.exists||!ds.exists||!os.exists)throw Error('PRODUCTION_ORIGIN_REQUIRED');
  const draft=ds.data() as ContractDraftV2,acceptance=as.data() as BudgetAcceptanceV2,operation=operationFromAcceptance(acceptance);
  verifyOperation(os.data(),operation);
  if(draft.revision!==c.expectedRevision||!['DRAFT','READY_TO_FORMALIZE'].includes(draft.status))throw Error('PRODUCTION_READY_REVISION_REQUIRED');
  validateReadySource(bs.data() as BudgetV2,acceptance,draft);
  if(!draft.productDetails?.quantity||!draft.productDetails.condition)throw Error('PRODUCTION_PRODUCT_REQUIRED');
  if(identity.requiresClarification||identity.originalUnavailable)throw Error('PRODUCTION_IDENTITY_REQUIRED');
  const approval=consent.data();if(!approval||!clientConformityIsCurrent(draft,approval)||!approval.confirmedAt||!approval.confirmedBy||!approval.evidence)throw Error('PRODUCTION_CONFORMITY_REQUIRED');
  if(p.templates.MANDATE.layout==='LOOP_CONSOLIDATED_V2'&&(c.formal as Record<string,unknown>)?.loopConformityEvidence!==approval.evidence)throw Error('LOOP_CONFORMITY_EVIDENCE_MISMATCH');
  const context=legalContext(p,cid+'-package',c.formal,draft);assertCurrentIssueDates(context.documentContext,new Date());
  const at=new Date().toISOString(),value={schemaVersion:'SIMPLE_ISSUANCE_COMMAND_V1',digest,actor,at,expectedRevision:c.expectedRevision,operationId:operation.operationId,needsReady:draft.status==='DRAFT',readyRevision:draft.revision+(draft.status==='DRAFT'?1:0),formal:c.formal,packageId:p.id,packageHash:p.sha256,expiresAt:new Date(Date.parse(at)+86400000).toISOString(),status:'STARTED'};
  tx.create(ref,value);return value;
 });
 if('result' in intent&&intent.result)return {...intent.result,replay:true};
 if(intent.needsReady)await contractCommand(db,id,v,{action:'MARK_READY_TO_FORMALIZE',expectedRevision:intent.expectedRevision,commandId:cid+'-ready'},actor);
 await recordFinalPackageApproval(runtime,{commandId:cid+'-package',packageId:p.id,packageHash:p.sha256,approvalBasis:'OWNER_AUTHORIZATION',reason:'Aprobación expresa del titular al confirmar la emisión de esta operación',confirmed:true},actor);
 const grant=await authorizeOperation(runtime,id,v,{commandId:cid+'-authorization',operationId:intent.operationId,expectedRevision:intent.readyRevision,packageId:p.id,approvalId:cid+'-package',formal:intent.formal,scopes:[...scopes],expiresAt:intent.expiresAt,reason:'Confirmación administrativa integrada de emisión y continuidad del circuito de la operación',confirmed:true},actor);
 const receipt=await freezeOperation(runtime,id,v,{commandId:cid+'-freeze',authorizationId:grant.id,expectedRevision:intent.readyRevision,confirmed:true},actor);
 const documents=await issueDocuments(runtime,bucket,id,v,actor);
 const result={contractNumber:receipt.contractNumber,snapshotHash:receipt.snapshotHash,snapshotId:receipt.snapshotId,manifestHash:documents.manifestHash};
 const replay=await db.runTransaction(async tx=>{const saved=await tx.get(ref);if(saved.data()?.digest!==digest)throw Error('PRODUCTION_COMMAND_CONFLICT');if(saved.data()?.result&&contractValueHash(saved.data()!.result)!==contractValueHash(result))throw Error('SIMPLE_ISSUANCE_RESULT_CONFLICT');if(saved.data()?.result)return true;tx.update(ref,{status:'COMPLETED',result,completedAt:new Date().toISOString()});return false;});
 return {...result,replay};
}

/** The explicit Emit button is the owner confirmation; no technical version or extra checkbox. */
export async function issueContractEditor(runtime:ProductionRuntime,bucket:Bucket,id:string,v:number,input:unknown,actor:string){
 const {db,packages,test}=await requireProductionActor(runtime,actor),c=exact(input,['commandId','expectedRevision','confirmed']);
 if(c.confirmed!==true)throw Error('EXPLICIT_ISSUANCE_CONFIRMATION_REQUIRED');
 const candidates=packages.filter(p=>{try{assertFinalRenderer(p);return true;}catch{return false;}});
 const p=candidates.find(p=>p.id===LOOP_PACKAGE_ID)??candidates.find(p=>p.id===OWNER_FINAL_PACKAGE_ID)??(test&&candidates.length===1?candidates[0]:undefined);
 if(!p)throw Error('APPROVED_FINAL_PACKAGE_NOT_INSTALLED');
 const cid=opaque(c.commandId),[ds,consent,prior]=await Promise.all([contractRefs(db,id,v).draft.get(),contractRefs(db,id,v).draft.collection('conformity').doc('current').get(),productionRef(db,id,v).collection('simpleIssuanceCommands').doc(cid).get()]);
 if(prior.data()?.result){
  const previous=prior.data()!;if(previous.actor!==actor||previous.expectedRevision!==c.expectedRevision)throw Error('PRODUCTION_COMMAND_CONFLICT');
  const proof=await db.runTransaction(tx=>issuedOperation(runtime,tx,id,v,'ISSUANCE',false));
  const verified={contractNumber:proof.snapshot.contractNumber,snapshotHash:proof.snapshot.integrity.payloadHash,snapshotId:proof.snapshot.contractSnapshotId,manifestHash:proof.manifest.hash};
  if(contractValueHash(verified)!==contractValueHash(previous.result))throw Error('SIMPLE_ISSUANCE_RESULT_CONFLICT');
  await Promise.all(Object.values(proof.manifest.documents).map(document=>readVerifiedEvidenceObject(bucket,document)));
  return {...verified,replay:true};
 }
 if(prior.exists&&prior.data()!.packageId!==p.id)throw Error('La emisión iniciada utiliza otra versión documental. Revisá su recuperación antes de iniciar otra.');
 const d=ds.data() as ContractDraftV2;if(!d?.economicTerms||!d.commercialPreparation)throw Error('CONTRACT_EDITOR_SAVE_REQUIRED');
 const x=validateContractCommercial(d.commercialPreparation,d.economicTerms),date=argentinaBusinessDate();
 if(p.templates.MANDATE.layout==='LOOP_CONSOLIDATED_V2')assertLoopContractForIssuance(d);
 const formal=prior.exists?prior.data()!.formal:{contractIssueDate:date,contractIssuePlace:x.issuePlace,promissoryNoteIssueDate:date,promissoryNoteIssuePlace:x.issuePlace,...(p.templates.MANDATE.layout==='LOOP_CONSOLIDATED_V2'?{loopConformityEvidence:consent.data()?.evidence??''}:{}),...(p.originalsPolicy?{originalNetManagementLogistics:(x.capitalCents+x.serviceGrossCents)/100,originalCft:x.financeGrossCents/100,originalAllocationConformity:consent.data()?.evidence??'',dispatchOrigin:'NO APLICA: DOCUMENTACION EXTERNA',productSerial:'NO APLICA: DOCUMENTACION EXTERNA'}:{})};
 return issuePreparedOperation(runtime,bucket,id,v,{...c,packageId:p.id,packageHash:p.sha256,formal},actor);
}
