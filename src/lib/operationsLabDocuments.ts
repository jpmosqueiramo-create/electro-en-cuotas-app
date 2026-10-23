import { jsPDF } from 'jspdf';
import { drawCuentaHogarLogo } from './pdfBranding';
import { contractValueHash } from './contractIntegrityV2';
import type { FinancialPayment } from './operationFinancialV2';
import { createHash } from 'node:crypto';
import { projectOperationDraft } from './contractDocuments/operationDraft';
import { generateLabOperationDraftPair } from './contractDocuments/operationDraftPdf';
import { renderRemitoModelo } from './pdfGenerator';
import { validateLabSnapshot } from './operationsLabFreeze';
import { labRepository, type LabExecutionContext } from './operationsLabContext';
import { LAB_WATERMARK, LabError } from './operationsLabPolicy';

export async function renderLabDocuments(context: LabExecutionContext, operationId: string) {
 const record=await labRepository(context).read('snapshots',operationId);
 if(!record)throw new LabError(409,'LAB_SNAPSHOT_REQUIRED');
 const s=record.value;validateLabSnapshot(context,s);
 const {budget,acceptance,draft}=s.source;
 const pair=generateLabOperationDraftPair(projectOperationDraft(budget,acceptance,draft,false,false));
 const remito=renderRemitoModelo({nroRemito:'TEST-'+context.sessionId.slice(0,8),fecha:s.source.readyEvidence.reviewedAt.slice(0,10),clienteNombre:draft.personalData.fullName,clienteDni:draft.personalData.dni,clienteDireccion:draft.personalData.address,clienteTelefono:draft.personalData.whatsapp,productoNombre:draft.acceptedReferenceSnapshot.nombre,nserie:'PRUEBA — SIN BIEN REAL',origen:'Depósito simulado',destino:'Destino simulado'});
 for(let n=1;n<=remito.getNumberOfPages();n++){remito.setPage(n);remito.setFont('helvetica','bold');remito.setFontSize(8);remito.setTextColor(150,35,35);remito.text(LAB_WATERMARK,15,295);}
 const bytes=Buffer.from(remito.output('arraybuffer'));
 return {snapshotHash:s.hash,mandate:pair.mandate,promissoryNote:pair.promissoryNote,remito:{base64:bytes.toString('base64'),sha256:createHash('sha256').update(bytes).digest('hex'),pages:remito.getNumberOfPages()}};
}

export async function renderLabReceipt(context:LabExecutionContext,receiptId:string){
 if(!/^receipt_[a-f0-9-]{36}$/.test(receiptId))throw new LabError(400,'LAB_RECEIPT_INVALID');
 const payment=await labRepository(context).transaction(async tx=>{
  const receipt=await tx.read('receipts',receiptId);
  if(!receipt||receipt.mode!=='SYNTHETIC_ONLY')throw new LabError(404,'LAB_RECEIPT_UNAVAILABLE');
  const [snapshot,ledger]=await Promise.all([tx.read('snapshots',receipt.operationId),tx.read('ledger',receipt.operationId)]);
  if(!snapshot||!ledger)throw new LabError(409,'LAB_RECEIPT_INVALID');
  validateLabSnapshot(context,snapshot.value);
  const match=ledger.value.payments.find((p:FinancialPayment)=>p.receiptId===receiptId);
  if(!match||receipt.snapshotHash!==snapshot.value.hash||ledger.value.snapshotHash!==snapshot.value.hash||contractValueHash(match)!==contractValueHash(receipt.value))throw new LabError(409,'LAB_RECEIPT_INVALID');
  return match as FinancialPayment;
 });
 const doc=new jsPDF();drawCuentaHogarLogo(doc,170,20,24);
 doc.setFont('helvetica','bold');doc.setFontSize(9);doc.setTextColor(150,35,35);doc.text(LAB_WATERMARK,15,12);
 doc.setTextColor(20);doc.setFontSize(18);doc.text('RECIBO DE PRUEBA',15,35);doc.setFontSize(11);
 const money=(n:number)=>new Intl.NumberFormat('es-AR',{minimumFractionDigits:2,maximumFractionDigits:2}).format(n/100);
 doc.text('Estado: '+(payment.reversedAt?'REVERSADO':'ACREDITADO SINTÉTICO'),15,52);
 doc.text('Importe: $ '+money(payment.amountCents),15,63);doc.text('Fecha: '+payment.effectiveDate,15,74);
 doc.text('Imputaciones a cuotas:',15,89);
 payment.allocations.forEach((a,i)=>doc.text('Cuota '+a.installmentNumber+': $ '+money(a.amountCents),15,100+i*8));
 doc.setFontSize(9);doc.text('Sin pago real, CAE ni comunicación con ARCA. No crea otra deuda.',15,250);
 doc.text('Identificador exclusivo de prueba: '+receiptId,15,260);
 return Buffer.from(doc.output('arraybuffer'));
}
