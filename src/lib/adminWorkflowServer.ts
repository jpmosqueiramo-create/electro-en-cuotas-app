import {FieldPath,type Firestore,type DocumentReference} from 'firebase-admin/firestore';
import {operationFromAcceptance,operationRef,verifyOperation} from './operationV2';
import type {BudgetAcceptanceV2} from './budgetAcceptanceV2';
import {dataFields,personalForEditing,personalFields,type ContractDraftV2} from './contractV2';
import {readCreditReview} from './creditReviewV2Server';
import {readAdministrativeStatus} from './adminRecordRemovalServer';
import type {AdminWorkflow} from './adminWorkflow';
import {workflowKey} from './adminWorkflow';
/** Bounded parallelism for inbox enrichment; no writes or materialized state mirrors. */
async function mapLimited<T,R>(items:T[],fn:(item:T)=>Promise<R>):Promise<R[]>{const results:R[]=[];for(let i=0;i<items.length;i+=6)results.push(...await Promise.all(items.slice(i,i+6).map(fn)));return results;}
export async function readBudgetWorkflows(db:Firestore,family:DocumentReference){
 const state=await readAdministrativeStatus(db,{kind:'BUDGET',id:family.id});
 const [accepted,origin]=await Promise.all([family.collection('acceptances').get(),family.get()]);
 return mapLimited(accepted.docs,async saved=>{
  const a=saved.data() as BudgetAcceptanceV2;
  if(a.schemaVersion!=='BUDGET_ACCEPTANCE_V2'||a.budgetId!==family.id||String(a.budgetVersion)!==saved.id)throw Error('WORKFLOW_ACCEPTANCE_ORIGIN');
  const parent=origin.data();if(parent&&(parent.sourceCollection!==undefined&&parent.sourceCollection!==a.sourceCollection||parent.solicitudId!==undefined&&parent.solicitudId!==a.solicitudId))throw Error('WORKFLOW_FAMILY_ORIGIN');
  const result:AdminWorkflow={budgetId:a.budgetId,version:a.budgetVersion,product:a.optionSnapshot.referenceSnapshot.nombre,acceptedAt:a.acceptedAt,stage:'PENDING_APPROVAL',approval:'PENDING'};
  try{
   const expected=operationFromAcceptance(a),base=family.collection('contracts').doc(`v${a.budgetVersion}`);
   const status=await readAdministrativeStatus(db,{kind:'CONTRACT',id:a.budgetId,version:a.budgetVersion});if(state&&state.state!=='ACTIVE'||status&&status.state!=='ACTIVE'){result.stage='ARCHIVED';return result;}
   const data=await db.runTransaction(async tx=>{
    const refs=[operationRef(db,a.budgetId,a.budgetVersion),family.collection('versions').doc(String(a.budgetVersion)),base,base.collection('creditReview').doc('current'),base.collection('operation').doc('delivery'),base.collection('operation').doc('fulfillment')];
    const [identity,budget,draft,review,delivery,fulfillment]=await Promise.all(refs.map(r=>tx.get(r)));
    verifyOperation(identity.data(),expected);const b=budget.data();if(!b||b.id!==a.budgetId||b.version!==a.budgetVersion||b.sourceCollection!==a.sourceCollection||b.solicitudId!==a.solicitudId||b.estado!=='EMITIDO')throw Error('WORKFLOW_BUDGET_ORIGIN');
    const d=draft.data() as ContractDraftV2|undefined,r=review.data();if(r&&r.operationId!==expected.operationId)throw Error('WORKFLOW_REVIEW_ORIGIN');
    const dl=delivery.data(),f=fulfillment.data();if(dl&&dl.operationId!==expected.operationId||f&&f.operationId!==expected.operationId)throw Error('WORKFLOW_DELIVERY_ORIGIN');
    const production=base.collection('production').doc('current'),revision=(await tx.get(production.collection('documentRevision').doc('current'))).data();
    const issued=(await tx.get(revision&&revision.snapshotVersion>1?production.collection('documentEditions').doc(String(revision.snapshotVersion)).collection('documents').doc('issued'):production.collection('documents').doc('issued'))).data();
    const request=d?.activeClientDataRequestId?(await tx.get(base.collection('requests').doc(d.activeClientDataRequestId))).data():null;
    if(request&&(request.budgetId!==a.budgetId||request.budgetVersion!==a.budgetVersion))throw Error('WORKFLOW_REQUEST_ORIGIN');
    return {waitingData:request?.status==='ACTIVE',receivedData:request?.status==='SUBMITTED'&&d?.lastClientSubmissionId!==d?.activeClientDataRequestId,draft:d,review:r,delivered:dl?.status==='DELIVERED',issued:!!issued&&issued.operationId===expected.operationId&&revision?.status!=='EDITING'};
   });
   if(data.review?.state==='APPROVED'||data.review?.state==='REJECTED'){
    const review=await readCreditReview(db,a.budgetId,a.budgetVersion);result.approval=review.approved?'APPROVED':review.state==='REJECTED'?'REJECTED':'PENDING';
   }
   const d=data.draft;let personalReady=false;if(d)try{dataFields(personalForEditing(d.personalData),personalFields,true);personalReady=true;}catch{/* Invalid/incomplete data remains pending. */}
   result.stage=data.delivered?'DELIVERED':data.issued?'LOGISTICS':result.approval==='REJECTED'?'REJECTED':data.receivedData?'PERSONAL_DATA_RECEIVED':data.waitingData||d&&!personalReady?'PENDING_PERSONAL_DATA':d&&personalReady?'CONTRACT':result.approval==='APPROVED'?'APPROVED':'PENDING_APPROVAL';
  }catch{result.stage='UNAVAILABLE';}
  return result;
 }).then(values=>values.filter((v):v is AdminWorkflow=>v!==null));
}
export async function requestWorkflows(db:Firestore,source:string,ids:string[]){
 const result:Record<string,AdminWorkflow[]>={};
 for(let i=0;i<ids.length;i+=30){
  let cursor:string|undefined;
  do{let q=db.collection('presupuestos_v2').where('solicitudId','in',ids.slice(i,i+30)).orderBy(FieldPath.documentId()).limit(100);if(cursor)q=q.startAfter(cursor);
   const page=await q.get();const families=page.docs.filter(d=>d.data().sourceCollection===source);
   const groups=await mapLimited(families,async family=>({id:family.data().solicitudId as string,rows:await readBudgetWorkflows(db,family.ref)}));
   for(const group of groups)(result[group.id]??=[]).push(...group.rows);
   cursor=page.size===100?page.docs.at(-1)!.id:undefined;
  }while(cursor);
 }
 for(const rows of Object.values(result))rows.sort((a,b)=>b.acceptedAt.localeCompare(a.acceptedAt)||workflowKey(a.budgetId,a.version).localeCompare(workflowKey(b.budgetId,b.version)));
 return result;
}
