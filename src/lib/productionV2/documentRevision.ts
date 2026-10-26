import {exact,opaque,type ContractDraftV2} from '../contractV2';
import {contractRefs} from '../contractV2Server';
import {contractValueHash} from '../contractIntegrityV2';
import {operationRef} from '../operationV2';
import {initialDelivery} from '../operationDeliveryV2';
import {productionRef} from './authorization';
import {frozenOperation} from './freeze';
import {requireProductionActor,type ProductionRuntime} from './runtime';
import {assertBeforeSignature,editionRef,revisionState,revisionStateRef} from './documentRevisionState';
export async function reopenBeforeSignature(runtime:ProductionRuntime,id:string,v:number,input:unknown,actor:string){
 const {db}=await requireProductionActor(runtime,actor),c=exact(input,['commandId','expectedRevision','snapshotHash','reason','confirmed']),cid=opaque(c.commandId);
 if(c.confirmed!==true||!Number.isSafeInteger(c.expectedRevision)||typeof c.snapshotHash!=='string'||!/^[a-f0-9]{64}$/.test(c.snapshotHash)||typeof c.reason!=='string'||!c.reason.trim()||c.reason.length>500||/[\x00-\x1f<>]/.test(c.reason))throw Error('EXPLICIT_DOCUMENT_REVISION_REQUIRED');
 const reason=c.reason.trim();
 const command=productionRef(db,id,v).collection('revisionCommands').doc(cid),digest=contractValueHash({actor,id,v,input});
 return db.runTransaction(async tx=>{
  const prior=await tx.get(command);if(prior.exists){if(prior.data()!.digest!==digest)throw Error('PRODUCTION_COMMAND_CONFLICT');return {...prior.data()!.result,replay:true};}
  const proof=await frozenOperation(runtime,tx,id,v,'ISSUANCE',false),draftRef=contractRefs(db,id,v).draft,current=await tx.get(draftRef),state=await revisionState(db,tx,id,v);
  if(current.data()!.revision!==c.expectedRevision||proof.receipt.snapshotHash!==c.snapshotHash)throw Error('DOCUMENT_REVISION_CHANGED');
  const delivery=await assertBeforeSignature(db,tx,id,v,proof.identity.operationId);
  if(proof.snapshot.snapshotVersion>=10000)throw Error('DOCUMENT_REVISION_LIMIT');
  const body={schemaVersion:'PRODUCTION_DOCUMENT_REVISION_V1' as const,status:'EDITING' as const,snapshotVersion:proof.snapshot.snapshotVersion+1,allocationReceipt:state?.allocationReceipt??proof.receipt,previousReceipt:proof.receipt,receipt:null,commandId:cid};
  const result={...body,hash:contractValueHash(body)},at=new Date().toISOString();
  const {productionFreeze:_frozen,...draft}=current.data()!;void _frozen;
  const next={...draft,status:'DRAFT',revision:Number(draft.revision)+1,readyEvidenceId:null,updatedAt:at,updatedBy:actor} as ContractDraftV2;
  tx.create(command,{schemaVersion:'PRODUCTION_DOCUMENT_REOPEN_COMMAND_V1',digest,reason,actor,at,beforeRevision:c.expectedRevision,afterRevision:next.revision,result});
  tx.create(productionRef(db,id,v).collection('events').doc('reopen_'+cid),{action:'DOCUMENTS_REOPENED_BEFORE_SIGNATURE',actor,at,reason,previousReceipt:proof.receipt,nextSnapshotVersion:body.snapshotVersion});
  tx.set(revisionStateRef(db,id,v),result);tx.set(draftRef,next);
  if(delivery.exists){const d=delivery.data()!;tx.create(editionRef(db,id,v,proof.snapshot.snapshotVersion).collection('preparationHistory').doc(cid),{actor,at,delivery:d});tx.set(operationRef(db,id,v).parent.doc('delivery'),{...initialDelivery(proof.identity.operationId),revision:d.revision+1,holds:d.holds??[],...(d.documentPolicy?{documentPolicy:d.documentPolicy}:{})});}
  return {...result,replay:false};
 });
}
