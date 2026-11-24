import { createHash } from 'node:crypto';
import type { Firestore, Transaction } from 'firebase-admin/firestore';
import { stable, opaque, calendarDate } from './contractV2';
import { financialFail, type FinancialPayment } from './operationFinancialV2';
import type { PaymentReport } from './operationPaymentReports';
export const paymentReportRef = (db: Firestore, id: string) => { opaque(id); return db.collection('presupuestos_v2').doc('_payment_reports_v1').collection('contracts').doc(id); };
export const reportDigest = (v: unknown) => createHash('sha256').update(stable(v)).digest('hex');
export function storedPaymentReport(value: unknown, id: string): PaymentReport {
  const r = value as PaymentReport;
  if (!r || r.schemaVersion !== 'OPERATION_PAYMENT_REPORT_V1' || r.id !== id || !/^op_[a-f0-9]{64}$/.test(r.operationId) || !Number.isSafeInteger(r.version) || r.version < 1 || !Number.isSafeInteger(r.revision) || r.revision < 1 || !Number.isSafeInteger(r.amountCents) || r.amountCents <= 0 || !['PENDING','CONFIRMED','REJECTED','LINKED'].includes(r.status) || !['AFFILIATE','CLIENT'].includes(r.reporter?.role) || !r.reporter.uid || !['EFECTIVO','TRANSFERENCIA'].includes(r.method) || (r.method === 'TRANSFERENCIA' ? r.cashRecipient !== null : !['ADMIN','AFFILIATE'].includes(String(r.cashRecipient)))) financialFail('Informe de pago inconsistente.');
  opaque(r.id);opaque(r.budgetId);opaque(r.solicitudId);
  if(!['solicitudes','solicitudes_cuenta'].includes(r.sourceCollection)||typeof r.clientName!=='string'||!r.clientName.trim()||typeof r.reference!=='string'||!r.reference.trim()||r.reference.length>200||! /^[a-f0-9]{64}$/.test(r.digest)||!Number.isFinite(Date.parse(r.createdAt)))financialFail('Datos de origen del informe inconsistentes.');
  calendarDate(r.effectiveDate);
  if(r.affiliate&&(!r.affiliate.uid||!r.affiliate.affiliateId)||r.cashRecipient==='AFFILIATE'&&!r.affiliate||r.reporter.role==='AFFILIATE'&&r.method==='EFECTIVO'&&r.cashRecipient!=='AFFILIATE')financialFail('Receptor informado inconsistente.');
  if(r.status==='PENDING'?(r.revision!==1||r.paymentId!==null||r.decidedAt!==null||r.decidedBy!==null||r.decisionNote!==null):(r.revision!==2||!r.decidedAt||!Number.isFinite(Date.parse(r.decidedAt))||!r.decidedBy||typeof r.decisionNote!=='string'||!r.decisionNote.trim()||(r.status==='REJECTED'?r.paymentId!==null:!r.paymentId)))financialFail('Decisión del informe inconsistente.');
  if(r.paymentId)opaque(r.paymentId);
  return r;
}
export async function prepareReportAlertResolution(db:Firestore,tx:Transaction,r:PaymentReport,at:string){
  const ref=db.collection('alertas_admin').doc(r.id),saved=(await tx.get(ref)).data();
  if(saved&&(saved.schemaVersion!=='OPERATION_PAYMENT_REPORT_ALERT_V1'||saved.operationId!==r.operationId||saved.reportId!==r.id))financialFail('Alerta del informe inconsistente.');
  return ()=>{if(saved)tx.update(ref,{leida:true,resuelta:true,resolvedAt:at});};
}
export type ReportConfirmation = { reportId: string; expectedReportRevision: number };
/** Prepared inside the SAME transaction that writes payment, receipt and cash custody. */
export async function prepareReportConfirmation(db: Firestore, tx: Transaction, p: ReportConfirmation & {
  budgetId: string; version: number; operationId: string; sourceCollection:string; solicitudId:string; payment: FinancialPayment;
  assignment: { uid: string; affiliateId: string } | null; actor: string; commandId: string; at: string;
}) {
  const ref = paymentReportRef(db, p.reportId), snap = await tx.get(ref);
  if (!snap.exists) financialFail('Informe no encontrado.');
  const r = storedPaymentReport(snap.data(), snap.id);
  if (r.operationId !== p.operationId || r.budgetId !== p.budgetId || r.version !== p.version || r.sourceCollection!==p.sourceCollection || r.solicitudId!==p.solicitudId || r.status !== 'PENDING' || r.revision !== p.expectedReportRevision) financialFail('El informe cambió. Actualizá antes de confirmar.');
  if (r.amountCents !== p.payment.amountCents || r.method !== p.payment.method || r.effectiveDate !== p.payment.effectiveDate || (r.method === 'EFECTIVO' && r.cashRecipient !== p.payment.cashCustody?.role)) financialFail('El pago no coincide con el informe revisado.');
  if (r.cashRecipient === 'AFFILIATE' && (stable(r.affiliate) !== stable(p.assignment) || p.payment.cashCustody?.role !== 'AFFILIATE' || p.payment.cashCustody.uid !== r.affiliate?.uid)) financialFail('El vendedor afiliado asignado cambió. Revisá el informe antes de acreditar.');
  const alertWrite=await prepareReportAlertResolution(db,tx,r,p.at);
  return () => {
    alertWrite();
    tx.update(ref, { status: 'CONFIRMED', revision: r.revision + 1, paymentId: p.payment.id, decidedAt: p.at, decidedBy: p.actor, decisionNote: 'Pago confirmado por Administración.' });
    tx.create(ref.collection('events').doc(p.commandId), { action: 'CONFIRM', actor: p.actor, at: p.at, from: 'PENDING', to: 'CONFIRMED', paymentId: p.payment.id });
  };
}
export const bankReferenceKey = (reference: string) => reportDigest(reference.normalize('NFKC').trim().replace(/\s+/g, ' ').toUpperCase());
/** Claims new transfer identifiers globally. Reversal releases a claim with an audit event. */
export async function prepareTransferClaim(db: Firestore, tx: Transaction, p: { created: FinancialPayment | null; reversed: FinancialPayment | null; operationId: string; actor: string; at: string }) {
  const payment = p.created || p.reversed;
  if (payment?.method !== 'TRANSFERENCIA') return () => {};
  if (p.reversed && !payment.bankReferenceKey) return () => {}; // Historical references are not reclassified.
  const key = bankReferenceKey(payment.reference);
  if (payment.bankReferenceKey && payment.bankReferenceKey !== key) financialFail('Identificador bancario inconsistente.');
  const ref = db.collection('presupuestos_v2').doc('_financial_transfer_ids_v1').collection('contracts').doc(key), saved = (await tx.get(ref)).data();
  if(saved&&(saved.schemaVersion!=='FINANCIAL_TRANSFER_ID_V1'||!['ACTIVE','REVERSED'].includes(saved.state)||typeof saved.operationId!=='string'||typeof saved.paymentId!=='string'||!Number.isSafeInteger(saved.amountCents)||saved.amountCents<=0))financialFail('Identificador bancario guardado inconsistente.');
  if (p.created && saved?.state === 'ACTIVE') financialFail('Esta transferencia ya fue acreditada. Vinculá el informe al pago existente; no lo cargues nuevamente.');
  if (p.reversed && (!saved || saved.state !== 'ACTIVE' || saved.operationId !== p.operationId || saved.paymentId !== payment.id)) financialFail('Origen bancario de la reversa inconsistente.');
  if (p.created) payment.bankReferenceKey = key;
  return () => {
    tx.set(ref, { schemaVersion: 'FINANCIAL_TRANSFER_ID_V1', state: p.created ? 'ACTIVE' : 'REVERSED', operationId: p.operationId, paymentId: payment.id, amountCents: payment.amountCents, actor: p.actor, at: p.at });
    tx.create(ref.collection('events').doc(reportDigest([p.operationId, payment.id, !!p.reversed])), { action: p.created ? 'CREDIT' : 'REVERSE', operationId: p.operationId, paymentId: payment.id, actor: p.actor, at: p.at });
  };
}
