import type {Firestore} from 'firebase-admin/firestore';
import {FieldValue} from 'firebase-admin/firestore';
import {assertAdministrativeRecordActive} from './adminRecordRemovalServer';
import {privateBudgetReferenceId} from './budgetV2Persistence';
import {budgetV2OpaqueId,toClientBudgetV2,validateBudgetV2} from './budgetV2';
import type {NumberedBudgetClientV2} from './budgetSharingV2';
const format=(n:number)=>{if(!Number.isSafeInteger(n)||n<1)throw Error('BUDGET_NUMBER_INVALID');return `P-${String(n).padStart(6,'0')}`;};
/** Number the family once, without changing issued snapshots or historical contracts. */
export async function prepareBudgetSharing(db:Firestore,id:string,version:number,actor:string):Promise<NumberedBudgetClientV2>{
 if(!budgetV2OpaqueId(id)||!Number.isSafeInteger(version)||version<1)throw Error('BUDGET_NUMBER_ORIGIN_INVALID');
 return db.runTransaction(async tx=>{
  await assertAdministrativeRecordActive(db,tx,{kind:'BUDGET',id});
  const budgetRef=db.collection('presupuestos_v2').doc(id).collection('versions').doc(String(version)),registry=db.collection('budgetPdfNumberingV1').doc('budget_'+id),counter=db.doc('configuracion_general/budget_pdf_number_counter_v1');
  const [budget,saved]=await Promise.all([tx.get(budgetRef),tx.get(registry)]);
  const value=budget.data();validateBudgetV2(value,privateBudgetReferenceId);
  if(value.id!==id||value.version!==version)throw Error('BUDGET_NUMBER_ORIGIN_INVALID');
  const dto=toClientBudgetV2(value);
  if(saved.exists){
   const entry=saved.data()!,number=format(entry.sequence);
   if(entry.schemaVersion!=='BUDGET_PDF_NUMBER_V1'||entry.budgetId!==id||entry.number!==number)throw Error('BUDGET_NUMBER_REGISTRY_INVALID');
   const reservation=(await tx.get(db.collection('budgetPdfNumberingV1').doc('number_'+number))).data();
   if(reservation?.budgetId!==id||reservation.sequence!==entry.sequence)throw Error('BUDGET_NUMBER_RESERVATION_INVALID');
   return {...dto,documentNumber:number};
  }
  const prior=(await tx.get(counter)).data();
  if(prior&&(prior.schemaVersion!=='BUDGET_PDF_COUNTER_V1'||!Number.isSafeInteger(prior.lastSequence)||prior.lastSequence<0))throw Error('BUDGET_NUMBER_COUNTER_INVALID');
  const sequence=(prior?.lastSequence??0)+1,number=format(sequence),at=FieldValue.serverTimestamp();
  tx.create(db.collection('budgetPdfNumberingV1').doc('number_'+number),{schemaVersion:'BUDGET_PDF_NUMBER_V1',budgetId:id,sequence,number,createdAt:at,createdBy:actor});
  tx.create(registry,{schemaVersion:'BUDGET_PDF_NUMBER_V1',budgetId:id,sequence,number,createdAt:at,createdBy:actor});
  tx.set(counter,{schemaVersion:'BUDGET_PDF_COUNTER_V1',lastSequence:sequence,updatedAt:at});
  return {...dto,documentNumber:number};
 });
}
