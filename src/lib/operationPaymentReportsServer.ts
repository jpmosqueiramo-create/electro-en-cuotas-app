import { FieldPath, FieldValue, type Firestore } from 'firebase-admin/firestore';
import { runFirestoreTransaction } from './firestoreTransaction';
import { exact, opaque, stable, calendarDate } from './contractV2';
import { argentinaBusinessDate } from './productionV2/businessDate';
import { financialFail, type FinancialPayment } from './operationFinancialV2';
import { financialContext, financialCommand, financialRef, readFinancial, validatePayment, customerReceipt, type FinancialRole } from './operationFinancialV2Server';
import { clientBindingRef, clientIndex } from './operationClientV2Server';
import { obtenerLedgerCustodiaEfectivo } from './settlementsEngine';
import type { CustodyActor } from './operationCustodyV2Server';
import { paymentReportRef, reportDigest, storedPaymentReport, prepareReportAlertResolution } from './operationPaymentReportStore';
import type { PaymentReport, PaymentReportPublic } from './operationPaymentReports';

const pageSize = 50;
function text(value: unknown, max = 200) { if (typeof value !== 'string' || !value.trim() || value.length > max || /[\x00-\x1f\x7f]/.test(value)) financialFail('Ingresá una referencia válida.'); return value.trim(); }
function project(r: PaymentReport, actor: CustodyActor, payment?: FinancialPayment): PaymentReportPublic {
  return { id:r.id,operationId:r.operationId,budgetId:r.budgetId,version:r.version,revision:r.revision,status:payment?.reversedAt?'REVERSED':r.status,amountCents:r.amountCents,method:r.method,effectiveDate:r.effectiveDate,cashRecipient:r.cashRecipient,createdAt:r.createdAt,decidedAt:r.decidedAt,paymentId:r.paymentId,reportedBy:r.reporter.role,reference:actor.admin||actor.uid===r.reporter.uid?r.reference:null,decisionNote:r.status==='REJECTED'?r.decisionNote:null,...(actor.admin?{clientName:r.clientName}:{}) };
}
export async function submitPaymentReport(db: Firestore, id: string, v: number, input: unknown, actor: CustodyActor, role: 'AFFILIATE'|'CLIENT') {
  const c=exact(input,['commandId','operationId','amountCents','method','effectiveDate','reference','cashRecipient']);opaque(c.commandId);calendarDate(c.effectiveDate);
  if (!Number.isSafeInteger(c.amountCents)||Number(c.amountCents)<=0||!['TRANSFERENCIA','EFECTIVO'].includes(String(c.method))||String(c.effectiveDate)>argentinaBusinessDate()|| (c.method==='TRANSFERENCIA'?c.cashRecipient!==null:!['ADMIN','AFFILIATE'].includes(String(c.cashRecipient)))||role==='AFFILIATE'&&c.method==='EFECTIVO'&&c.cashRecipient!=='AFFILIATE') financialFail('Revisá importe, fecha, medio de pago y receptor del efectivo.');
  const reference=text(c.reference),digest=reportDigest({actor:actor.uid,role,id,v,...c,reference});
  return runFirestoreTransaction(db,async tx=>{
    const context=await financialContext(db,tx,id,v,actor,role,true),identity=context.source.identity;
    if(c.operationId!==identity.operationId)financialFail('Operación incorrecta.');
    const rid='report_'+reportDigest([identity.operationId,actor.uid,c.commandId]),ref=paymentReportRef(db,rid),saved=await tx.get(ref);
    if(saved.exists){const old=storedPaymentReport(saved.data(),rid);if(old.digest!==digest)financialFail('La referencia de envío corresponde a otro informe.');return {reportId:rid,status:old.status,replayed:true};}
    const binding=(await tx.get(clientBindingRef(db,id,v))).data();
    const assignment=context.state.assignment;
    if(c.cashRecipient==='AFFILIATE'&&!assignment)financialFail('No hay un vendedor afiliado asignado para recibir ese efectivo.');
    const now=new Date().toISOString(),budget=(await tx.get(db.collection('presupuestos_v2').doc(id).collection('versions').doc(String(v)))).data()!;
    const report:PaymentReport={schemaVersion:'OPERATION_PAYMENT_REPORT_V1',id:rid,operationId:identity.operationId,budgetId:id,version:v,sourceCollection:identity.sourceCollection,solicitudId:identity.solicitudId,clientName:String(budget.clienteSnapshot.nombre).slice(0,200),revision:1,status:'PENDING',amountCents:Number(c.amountCents),method:c.method as PaymentReport['method'],effectiveDate:String(c.effectiveDate),reference,cashRecipient:c.cashRecipient as PaymentReport['cashRecipient'],reporter:{uid:actor.uid,role},affiliate:assignment,createdAt:now,digest,paymentId:null,decidedAt:null,decidedBy:null,decisionNote:null};
    const index=binding?.uid&&binding.state==='PREPARED'?clientIndex(db,binding.uid).doc(identity.operationId):null;
    if(index){const old=(await tx.get(index)).data();if(old&&(old.uid!==binding!.uid||old.budgetId!==id||old.version!==v||old.operationId!==identity.operationId))financialFail('Índice de cuenta inconsistente.');}
    tx.create(ref,report);
    tx.create(ref.collection('events').doc(String(c.commandId)),{action:'REPORT',actor:actor.uid,role,at:now,to:'PENDING'});
    tx.create(db.collection('alertas_admin').doc(rid),{schemaVersion:'OPERATION_PAYMENT_REPORT_ALERT_V1',tipo:'PAGO_PENDIENTE_ACREDITACION',mensaje:`${role==='AFFILIATE'?'El vendedor afiliado':'El cliente'} informó un pago de ${(report.amountCents/100).toLocaleString('es-AR')} para ${report.clientName}. Requiere confirmación de Administración.`,fechaCreacion:FieldValue.serverTimestamp(),leida:false,budgetId:id,budgetVersion:v,operationId:identity.operationId,sourceCollection:identity.sourceCollection,solicitudId:identity.solicitudId,reportId:rid});
    if(index)tx.set(index,{operationId:identity.operationId,budgetId:id,version:v,uid:binding!.uid});
    return {reportId:rid,status:'PENDING' as const,replayed:false};
  });
}
export async function readPaymentReports(db: Firestore,id:string,v:number,actor:CustodyActor,role:FinancialRole,before?:string) {
  if(before)opaque(before);
  const result=await runFirestoreTransaction(db,async tx=>{
    const c=await financialContext(db,tx,id,v,actor,role,true),op=c.source.identity.operationId;
    let q=paymentReportRef(db,'_query').parent.where('operationId','==',op).orderBy(FieldPath.documentId()).limit(pageSize+1);if(before)q=q.startAfter(before);
    const saved=await tx.get(q),rows=saved.docs.slice(0,pageSize).map(d=>storedPaymentReport(d.data(),d.id));
    if(rows.some(r=>r.budgetId!==id||r.version!==v||r.sourceCollection!==c.source.identity.sourceCollection||r.solicitudId!==c.source.identity.solicitudId))financialFail('Informe de otra operación.');
    const projected:PaymentReportPublic[]=[];
    for(const row of rows){const payment=row.paymentId?(await tx.get(financialRef(db,id,v).collection('payments').doc(row.paymentId))).data() as FinancialPayment|undefined:undefined;if(row.paymentId&&!payment)financialFail('Acreditación vinculada no disponible.');projected.push(project(row,actor,payment));}
    const cash=role==='AFFILIATE'&&c.state.assignment?await obtenerLedgerCustodiaEfectivo(db,c.state.assignment.affiliateId,tx):null;
    return {operationId:op,affiliateAvailable:!!c.state.assignment,reports:projected,nextCursor:saved.size>pageSize?rows.at(-1)!.id:null,cashHeldCents:cash?.efectivoPendienteRendicionCentavos??null};
  });
  if(role!=='ADMIN')return result;
  const financial=await readFinancial(db,id,v,actor,'ADMIN');
  return {...result,financialRevision:financial.active?financial.revision:0,canConfirm:financial.mutationEnabled,paymentsNextCursor:financial.active?financial.nextCursor:null,recentPayments:financial.active?(financial.history??[]).filter(p=>!p.reversedAt).map(p=>({id:p.id,amountCents:p.amountCents,method:p.method,effectiveDate:p.effectiveDate,reference:p.reference})):[]};
}
/** Global pending queue, private Admin projection. No names/UID search or identity inference. */
export async function pendingPaymentReports(db:Firestore,cursor?:string){
  if(cursor)opaque(cursor);let q=paymentReportRef(db,'_query').parent.where('status','==','PENDING').orderBy(FieldPath.documentId()).limit(pageSize+1);if(cursor)q=q.startAfter(cursor);
  const page=await q.get();return {reports:page.docs.slice(0,pageSize).map(d=>project(storedPaymentReport(d.data(),d.id),{uid:'',admin:true})),nextCursor:page.size>pageSize?page.docs[pageSize-1].id:null};
}
export async function decidePaymentReport(db:Firestore,id:string,v:number,input:unknown,actor:CustodyActor) {
  if(!actor.admin)financialFail('Confirmación exclusiva de Administración.');
  const x=input as Record<string,unknown>,link=x?.action==='LINK',confirm=x?.action==='CONFIRM';
  const c=exact(input,['action','reportId','expectedRevision','commandId',...(confirm?['financialRevision','reference']:link?['paymentId','note']:['note'])]);
  if(!['CONFIRM','REJECT','LINK'].includes(String(c.action))||!Number.isSafeInteger(c.expectedRevision)||Number(c.expectedRevision)<1)financialFail('Decisión inválida.');opaque(c.commandId);opaque(c.reportId);
  if(confirm){
    if(!Number.isSafeInteger(c.financialRevision)||Number(c.financialRevision)<0)financialFail('Revisión financiera inválida.');
    const snapshot=await paymentReportRef(db,String(c.reportId)).get();if(!snapshot.exists)financialFail('Informe no encontrado.');const r=storedPaymentReport(snapshot.data(),snapshot.id);
    if(r.budgetId!==id||r.version!==v)financialFail('Informe de otra operación.');
    return financialCommand(db,id,v,{commandId:'report_confirm_'+reportDigest([c.commandId,c.reportId]),operationId:r.operationId,expectedRevision:c.financialRevision,action:c.financialRevision===0?'ACTIVATE_WITH_FIRST_PAYMENT':'CREDIT_PAYMENT',data:{paymentId:'reported_'+r.id,amountCents:r.amountCents,effectiveDate:r.effectiveDate,method:r.method,reference:text(c.reference),...(r.method==='EFECTIVO'?{cashCustody:r.cashRecipient}:{})}},actor,'ADMIN',{reportId:r.id,expectedReportRevision:Number(c.expectedRevision)});
  }
  const note=text(c.note,500),digest=reportDigest({actor:actor.uid,id,v,c,note});
  return runFirestoreTransaction(db,async tx=>{
    const context=await financialContext(db,tx,id,v,actor,'ADMIN'),ref=paymentReportRef(db,String(c.reportId)),event=ref.collection('events').doc(String(c.commandId)),previous=await tx.get(event);
    if(previous.exists){if(previous.data()!.digest!==digest)financialFail('Conflicto de referencia de decisión.');return {replayed:true};}
    const row=await tx.get(ref);if(!row.exists)financialFail('Informe no encontrado.');const r=storedPaymentReport(row.data(),row.id);
    if(r.budgetId!==id||r.version!==v||r.operationId!==context.source.identity.operationId||r.sourceCollection!==context.source.identity.sourceCollection||r.solicitudId!==context.source.identity.solicitudId||r.revision!==c.expectedRevision||r.status!=='PENDING')financialFail('El informe cambió. Actualizá antes de decidir.');
    let paymentId:string|null=null;
    if(link){opaque(c.paymentId);paymentId=String(c.paymentId);const p=(await tx.get(financialRef(db,id,v).collection('payments').doc(paymentId))).data() as FinancialPayment|undefined;const receipt=p?(await tx.get(financialRef(db,id,v).collection('receipts').doc(p.receiptId))).data():null;
      if(!context.financial||!p||p.reversedAt||p.amountCents!==r.amountCents||p.method!==r.method||(r.method==='EFECTIVO'&&(p.cashCustody?.role!==r.cashRecipient||r.cashRecipient==='AFFILIATE'&&(p.cashCustody?.role!=='AFFILIATE'||p.cashCustody.uid!==r.affiliate?.uid||p.cashCustody.affiliateId!==r.affiliate?.affiliateId)))||stable(receipt)!==stable(customerReceipt(validatePayment(p,paymentId,context.financial),context.financial)))financialFail('Elegí un pago acreditado de esta operación, con el mismo importe, medio y receptor de efectivo.');
    }
    const at=new Date().toISOString(),status=link?'LINKED':'REJECTED',alertWrite=await prepareReportAlertResolution(db,tx,r,at);
    alertWrite();
    tx.update(ref,{status,revision:r.revision+1,paymentId,decidedAt:at,decidedBy:actor.uid,decisionNote:note});tx.create(event,{action:c.action,from:'PENDING',to:status,actor:actor.uid,at,paymentId,note,digest});
    return {replayed:false};
  });
}
