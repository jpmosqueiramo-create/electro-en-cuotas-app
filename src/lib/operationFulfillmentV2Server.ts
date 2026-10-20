import type { Firestore, Transaction } from 'firebase-admin/firestore';
import { createHash } from 'node:crypto';
import { contractRefs } from './contractV2Server';
import { operationFromAcceptance, operationRef, verifyOperation } from './operationV2';
import type { BudgetAcceptanceV2 } from './budgetAcceptanceV2';
import { newContractDraft, stable, opaque } from './contractV2';
import { validateBudgetV2 } from './budgetV2';
import { privateBudgetReferenceId } from './budgetV2Persistence';
import { FulfillmentError, initialFulfillment, nextFulfillment, parseFulfillmentCommand, costDifference, fulfillmentNextStep, providerStates, type FulfillmentV2 } from './operationFulfillmentV2';
export function fulfillmentRef(db:Firestore,id:string,v:number) {return operationRef(db,id,v).parent.doc('fulfillment');}
async function origin(db:Firestore,tx:Transaction,id:string,v:number) {
 const r=contractRefs(db,id,v);
 const [b,a,o]=await Promise.all([tx.get(r.budget),tx.get(r.acceptance),tx.get(operationRef(db,id,v))]);
 if(!b.exists||!a.exists)throw new FulfillmentError('Se requiere Acceptance V2 válida.');
 const budget=b.data();validateBudgetV2(budget,privateBudgetReferenceId);
 const acceptance=a.data() as BudgetAcceptanceV2;newContractDraft(budget,acceptance,'read-only',acceptance.acceptedAt);
 const identity=operationFromAcceptance(acceptance);if(o.exists)verifyOperation(o.data(),identity);
 const ref=acceptance.optionSnapshot.referenceSnapshot;
 return {identity,registered:o.exists,initial:initialFulfillment(identity.operationId,ref.nombre,ref.referenceId,ref.costoProveedorSnapshot)};
}
function stored(raw:unknown,initial:FulfillmentV2):FulfillmentV2 {
 if(!raw||typeof raw!=='object')throw new FulfillmentError('Seguimiento inconsistente.');
 const s=raw as FulfillmentV2;
 if(Object.keys(s).length!==Object.keys(initial).length||s.schemaVersion!==initial.schemaVersion||s.operationId!==initial.operationId||s.productName!==initial.productName||s.referenceId!==initial.referenceId||s.budgetedCost!==initial.budgetedCost||!Number.isSafeInteger(s.revision)||s.revision<1||s.deliveryClosure!==initial.deliveryClosure||!providerStates.includes(s.providerState)||!['PENDIENTE_RETIRO','RETIRADO','RECIBIDO','VIAJE_PROGRAMADO','ENTREGA_PROGRAMADA','EN_CUSTODIA_POR_RECHAZO'].includes(s.logisticsState)||!Array.isArray(s.incidents))throw new FulfillmentError('Seguimiento inconsistente.');
 costDifference(s);return s;
}
export async function readFulfillment(db:Firestore,id:string,v:number,before?:number) {
 const ref=fulfillmentRef(db,id,v);
 return db.runTransaction(async tx=>{
  const source=await origin(db,tx,id,v),snap=await tx.get(ref);
  if(snap.exists&&!source.registered)throw new FulfillmentError('Falta identidad operativa registrada.');
  const state=snap.exists?stored(snap.data(),source.initial):source.initial;
  let query=ref.collection('events').orderBy('revision','desc').limit(30);if(before!==undefined)query=query.startAfter(before);
  const events=await tx.get(query);
  return {available:source.registered,identity:source.identity,state,costDifference:costDifference(state),nextStep:fulfillmentNextStep(state),
   events:events.docs.map(d=>d.data()),before:events.size===30?events.docs.at(-1)!.data().revision as number:null};
 });
}
export async function fulfillmentCommand(db:Firestore,id:string,v:number,input:unknown,actor:string) {
 const c=parseFulfillmentCommand(input);opaque(c.commandId);
 const ref=fulfillmentRef(db,id,v),command=ref.collection('commands').doc(c.commandId);
 const digest=createHash('sha256').update(stable({actor,command:c})).digest('hex');
 return db.runTransaction(async tx=>{
  const source=await origin(db,tx,id,v);
  if(!source.registered)throw new FulfillmentError('Aceptación histórica sin identidad registrada: no se migra automáticamente.');
  if(c.operationId!==source.identity.operationId)throw new FulfillmentError('Operación de otro expediente.');
  const [prior,snap]=await Promise.all([tx.get(command),tx.get(ref)]);
  const current=snap.exists?stored(snap.data(),source.initial):source.initial;
  if(prior.exists) {
   if(prior.data()!.digest!==digest)throw new FulfillmentError('Conflicto de commandId.');
   return {state:stored(prior.data()!.result,source.initial),replay:true};
  }
  const now=new Date().toISOString(),next=nextFulfillment(current,c,actor,now);
  tx.set(ref,next);tx.create(command,{digest,result:next,actor,createdAt:now});
  tx.create(ref.collection('events').doc(c.commandId),{commandId:c.commandId,operationId:c.operationId,action:c.action,actor,at:now,expectedRevision:c.expectedRevision,revision:next.revision,data:c.data,
    from:{provider:current.providerState,logistics:current.logisticsState},to:{provider:next.providerState,logistics:next.logisticsState}});
  return {state:next,replay:false};
 });
}
export type FulfillmentViewV2 = Awaited<ReturnType<typeof readFulfillment>>;
