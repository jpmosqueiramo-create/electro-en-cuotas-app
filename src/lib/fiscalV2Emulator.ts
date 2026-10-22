import type { Firestore } from 'firebase-admin/firestore';
import { createHash } from 'node:crypto';
import { stable,opaque } from './contractV2';
import { requireInvitationEmulator } from './operationClientV2';
import { validateContractSnapshot } from './contractSnapshotV2';
import { operationRef } from './operationV2';
import { fiscalProjection,type FiscalRequest } from './fiscalV2';
export const fiscalMockRoot=(db:Firestore)=>db.collection('presupuestos_v2').doc('_fiscal_mock_v1').collection('contracts');
/** No ARCA credentials, network, real CAE or productive number. */
export async function mockFiscalIssue(db:Firestore,commandId:string,request:FiscalRequest,actor:string) {
 requireInvitationEmulator();opaque(commandId);if(!actor)throw Error('ADMIN_REQUIRED');
 const projection=fiscalProjection(request),root=fiscalMockRoot(db),command=root.doc('command_'+commandId),document=root.doc('document_'+commandId),counter=root.doc('sequence_'+request.documentClass+'_'+request.kind+'_'+request.pointOfSale);
 const digest=createHash('sha256').update(stable({actor,request})).digest('hex');
 return db.runTransaction(async tx=>{
  const [prior,sequence]=await tx.getAll(command,counter);if(prior.exists){if(prior.data()!.digest!==digest)throw Error('FISCAL_COMMAND_CONFLICT');return {...prior.data()!.result,replay:true};}
  const snapshot=(await tx.get(db.collection('contractSnapshotsV2').doc(request.snapshotId))).data();validateContractSnapshot(snapshot);
  const source=snapshot.sourceDraft,identity=(await tx.get(operationRef(db,source.budgetId,source.budgetVersion))).data();
  if(snapshot.integrity.payloadHash!==request.snapshotHash||snapshot.contractSnapshotId!==request.snapshotId||identity?.operationId!==request.operationId||identity?.acceptedOptionId!==source.acceptedOptionId)throw Error('FISCAL_SNAPSHOT_OR_OPERATION_MISMATCH');
  if(request.associatedId){const ref=root.doc(request.associatedId),creditControl=root.doc('credit_'+request.associatedId),[associated,control]=await tx.getAll(ref,creditControl);const a=associated.data();if(!a||a.kind!=='INVOICE'||a.operationId!==request.operationId||a.snapshotHash!==request.snapshotHash||a.documentClass!==request.documentClass||a.executionMode!=='MOCK_ONLY'||a.receiverStatus!==projection.receiverStatus||a.policyHash!==projection.policyHash||a.date>projection.date)throw Error('FISCAL_ASSOCIATION_INVALID');
   if(request.kind==='CREDIT_NOTE'){const credited=control.data()?.creditedCents||0;if(credited+projection.totalCents>a.totalCents)throw Error('FISCAL_CREDIT_EXCEEDS_ORIGINAL');const previousLines=control.data()?.lines||{};const lineCredits:Record<string,{baseCents:number;taxCents:number}>={...previousLines};
    for(const line of projection.lines){const original=(a.lines as typeof projection.lines).find(l=>l.concept===line.concept);const previous=previousLines[line.concept]||{baseCents:0,taxCents:0};if(!original||previous.baseCents+line.baseCents>original.baseCents||previous.taxCents+line.taxCents>original.taxCents)throw Error('FISCAL_CREDIT_LINE_EXCEEDS_ORIGINAL');lineCredits[line.concept]={baseCents:previous.baseCents+line.baseCents,taxCents:previous.taxCents+line.taxCents};}
    tx.set(creditControl,{creditedCents:credited+projection.totalCents,lines:lineCredits});}}
  const number=(sequence.data()?.number||0)+1;if(!Number.isSafeInteger(number))throw Error('FISCAL_SEQUENCE_LIMIT');
  const result={documentId:document.id,number:'SIM-'+String(number).padStart(8,'0'),authorization:'MOCK-NOT-CAE',replay:false};
  tx.set(counter,{number});tx.create(document,{...projection,number:result.number,authorization:result.authorization,recordedBy:actor,recordedAt:new Date().toISOString()});tx.create(command,{digest,result});return result;
 });
}

/** Immutable reference to a synthetic supplier document; never emits on its behalf. */
export async function mockSupplierInvoice(db:Firestore,commandId:string,input:{operationId:string;snapshotId:string;snapshotHash:string;buyerUid:string;supplierReference:string;documentReference:string;totalCents:number},actor:string){
 requireInvitationEmulator();opaque(commandId);if(!actor||!input.buyerUid||!input.supplierReference||!input.documentReference||!Number.isSafeInteger(input.totalCents)||input.totalCents<=0)throw Error('SUPPLIER_REFERENCE_INVALID');
 const ref=fiscalMockRoot(db).doc('supplier_'+commandId),digest=createHash('sha256').update(stable({input,actor})).digest('hex');
 return db.runTransaction(async tx=>{const old=await tx.get(ref);if(old.exists){if(old.data()!.digest!==digest)throw Error('FISCAL_COMMAND_CONFLICT');return {id:ref.id,replay:true};}
 const snapshot=(await tx.get(db.collection('contractSnapshotsV2').doc(input.snapshotId))).data();validateContractSnapshot(snapshot);const s=snapshot.sourceDraft,op=operationRef(db,s.budgetId,s.budgetVersion);
 const [identity,client]=await tx.getAll(op,op.parent.doc('client'));if(identity.data()?.operationId!==input.operationId||snapshot.integrity.payloadHash!==input.snapshotHash||client.data()?.uid!==input.buyerUid||client.data()?.state!=='ACTIVE')throw Error('SUPPLIER_BUYER_MISMATCH');
 tx.create(ref,{schemaVersion:'SUPPLIER_FISCAL_REFERENCE_V1',executionMode:'MOCK_ONLY',...input,digest,recordedBy:actor,recordedAt:new Date().toISOString()});return {id:ref.id,replay:false};});
}
