import {createHash} from 'node:crypto';
import {FieldPath,type Firestore} from 'firebase-admin/firestore';
import {stable} from './contractV2';
import {historicalDate,historicalAmount,historicalFail,historicalId,historicalObject,historicalSummary,historicalText,parseHistoricalSale,HISTORICAL_SALES_VERSION,type HistoricalSale,type HistoricalPayment} from './historicalSales';
export const historicalSalesCollection='ventas_anteriores_v1';
export async function historicalSalesCommand(db:Firestore,input:unknown,actor:string){
 const o=historicalObject(input,['saleId','commandId','expectedRevision','action','data']),id=historicalId(o.saleId),commandId=historicalId(o.commandId);
 if(!Number.isSafeInteger(o.expectedRevision)||Number(o.expectedRevision)<0||!['CREATE','PAY','REVERSE'].includes(String(o.action)))historicalFail();
 const ref=db.collection(historicalSalesCollection).doc(id),command=ref.collection('commands').doc(commandId),digest=createHash('sha256').update(stable({input,actor})).digest('hex');
 return db.runTransaction(async tx=>{
  const [saved,prior]=await Promise.all([tx.get(ref),tx.get(command)]);
  if(prior.exists){if(prior.data()!.digest!==digest)historicalFail('El identificador de este envío ya fue usado con otros datos.');return prior.data()!.result as {id:string;revision:number};}
  const now=new Date().toISOString();let sale:HistoricalSale;
  if(o.action==='CREATE'){
   if(saved.exists||o.expectedRevision!==0)historicalFail('La venta ya existe. Actualizá el listado antes de reintentar.');
   const {installments,...data}=parseHistoricalSale(o.data);sale={...data,schemaVersion:HISTORICAL_SALES_VERSION,id,revision:1,installments:installments.map(({number,dueDate,amountCents})=>({number,dueDate,amountCents})),paidByInstallment:installments.map(q=>q.paidCents),lastPaidOnByInstallment:installments.map(q=>q.paidOn),createdAt:now,createdBy:actor,updatedAt:now,updatedBy:actor};
   for(const q of installments)if(q.paidCents){const paymentId=`initial_${String(q.number).padStart(3,'0')}`;const p:HistoricalPayment={id:paymentId,installmentNumber:q.number,amountCents:q.paidCents,paidOn:q.paidOn!,kind:'HISTORICAL',reference:'Cargado al incorporar la venta anterior',recordedAt:now,recordedBy:actor,reversedAt:null,reversedBy:null,reversalReason:null};tx.create(ref.collection('payments').doc(paymentId),p);}
   tx.create(ref,sale);
  }else{
   if(!saved.exists||saved.data()!.schemaVersion!==HISTORICAL_SALES_VERSION)historicalFail('Venta no disponible.');sale=saved.data() as HistoricalSale;
   if(sale.revision!==o.expectedRevision)historicalFail('Otra sesión actualizó la venta. Actualizá antes de registrar el pago.');
   sale={...sale,paidByInstallment:[...sale.paidByInstallment],lastPaidOnByInstallment:[...sale.lastPaidOnByInstallment],revision:sale.revision+1,updatedAt:now,updatedBy:actor};
   if(o.action==='PAY'){
    const data=historicalObject(o.data,['installmentNumber','amountCents','paidOn','kind','reference']),number=Number(data.installmentNumber),amountCents=historicalAmount(data.amountCents),paidOn=historicalDate(data.paidOn);
    if(!Number.isInteger(data.installmentNumber)||!sale.installments[number-1]||paidOn<sale.saleDate||!['HISTORICAL','FOLLOW_UP'].includes(String(data.kind)))historicalFail('Revisá la cuota y la fecha del pago.');
    if(sale.paidByInstallment[number-1]+amountCents>sale.installments[number-1].amountCents)historicalFail('El pago supera el saldo de esa cuota.');
    sale.paidByInstallment[number-1]+=amountCents;sale.lastPaidOnByInstallment[number-1]=[sale.lastPaidOnByInstallment[number-1]??'',paidOn].sort().at(-1)!;
    const paymentId='payment_'+commandId,p:HistoricalPayment={id:paymentId,installmentNumber:number,amountCents,paidOn,kind:data.kind as HistoricalPayment['kind'],reference:historicalText(data.reference,300),recordedAt:now,recordedBy:actor,reversedAt:null,reversedBy:null,reversalReason:null};tx.create(ref.collection('payments').doc(paymentId),p);
   }else{
    const data=historicalObject(o.data,['paymentId','reason']),paymentId=historicalId(data.paymentId),pRef=ref.collection('payments').doc(paymentId),p=(await tx.get(pRef)).data() as HistoricalPayment|undefined;
    if(!p||p.reversedAt)historicalFail('El pago no está disponible para corregir.');const reason=historicalText(data.reason,500,true);
    if(sale.paidByInstallment[p.installmentNumber-1]<p.amountCents)historicalFail('Saldo inconsistente.');const others=await tx.get(ref.collection('payments').where('installmentNumber','==',p.installmentNumber));sale.paidByInstallment[p.installmentNumber-1]-=p.amountCents;sale.lastPaidOnByInstallment[p.installmentNumber-1]=others.docs.map(d=>d.data() as HistoricalPayment).filter(row=>row.id!==paymentId&&!row.reversedAt).map(row=>row.paidOn).sort().at(-1)??null;tx.update(pRef,{reversedAt:now,reversedBy:actor,reversalReason:reason});
   }
   historicalSummary(sale);tx.set(ref,sale);
  }
  const result={id,revision:sale.revision};tx.create(command,{schemaVersion:'HISTORICAL_SALE_COMMAND_V1',digest,actor,at:now,action:o.action,data:o.data,result});return result;
 });
}
export async function listHistoricalSales(db:Firestore,cursor:string|null){
 let q=db.collection(historicalSalesCollection).orderBy(FieldPath.documentId()).limit(101);if(cursor)q=q.startAfter(historicalId(cursor));const page=await q.get(),docs=page.docs.slice(0,100);
 return {items:docs.map(d=>{const sale=d.data() as HistoricalSale;if(sale.schemaVersion!==HISTORICAL_SALES_VERSION||sale.id!==d.id)historicalFail('Registro histórico incompatible.');return {...sale,summary:historicalSummary(sale)};}),nextCursor:page.size>100?docs.at(-1)!.id:null};
}
export async function historicalSaleDetail(db:Firestore,id:string,cursor:string|null){
 const ref=db.collection(historicalSalesCollection).doc(historicalId(id));
 return db.runTransaction(async tx=>{const saved=await tx.get(ref);if(!saved.exists)return null;const sale=saved.data() as HistoricalSale;if(sale.schemaVersion!==HISTORICAL_SALES_VERSION||sale.id!==id)historicalFail();let q=ref.collection('payments').orderBy('recordedAt','desc').limit(51);if(cursor){const after=await tx.get(ref.collection('payments').doc(historicalId(cursor)));if(!after.exists)historicalFail('Página de pagos no disponible.');q=q.startAfter(after);}const list=await tx.get(q),docs=list.docs.slice(0,50);return {...sale,summary:historicalSummary(sale),payments:docs.map(d=>d.data() as HistoricalPayment),nextPaymentCursor:list.size>50?docs.at(-1)!.id:null};});
}
