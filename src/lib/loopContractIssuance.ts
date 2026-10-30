import {calendarDate,stable,type ContractDraftV2} from './contractV2';
import {validateContractCommercial} from './contractCommercialPreparation';
export function assertLoopContractForIssuance(d:Pick<ContractDraftV2,'commercialPreparation'|'economicTerms'|'paymentScheduleDraft'|'acceptedReferenceSnapshot'>,asOf=Date.now()){
 if(!d.economicTerms||!d.commercialPreparation?.loop)throw Error('Guardá la categoría y el desglose del nuevo contrato.');
 const x=validateContractCommercial(d.commercialPreparation,d.economicTerms).loop!;
 if(stable(x.amortization.map(r=>({installmentNumber:r.installmentNumber,dueDate:r.dueDate,amount:r.paymentCents/100})))!==stable(d.paymentScheduleDraft))throw Error('El desglose no coincide con las fechas guardadas. Guardá nuevamente el panel.');
 if(!d.acceptedReferenceSnapshot.proveedorSnapshot.trim()||!/^\d{2}-?\d{8}-?\d$/.test(x.supplierTaxId))throw Error('Completá el proveedor y su CUIT para el Anexo I.');
 if(x.cftAnnualPercent===null||!x.cftBasis.trim())throw Error('Completá el CFT y su criterio informado para el Anexo II.');
 calendarDate(x.noteDueDate);
 if(x.noteDueDate<x.originalFinalDate||!x.notePaymentPlace.trim())throw Error('Revisá el vencimiento único y lugar de pago del pagaré.');
 if(!['WHATSAPP','EMAIL'].includes(x.acceptanceChannel))throw Error('Indicá el canal de aceptación del cliente.');
 const dates=[x.proposalSentAt,x.clientAcceptedAt].map(s=>{if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(s))return NaN;calendarDate(s.slice(0,10));return Date.parse(s+'-03:00');});
 if(dates.some(t=>!Number.isFinite(t)||t>asOf)||dates[0]>dates[1]||dates[0]<Date.parse(d.acceptedReferenceSnapshot.fechaCotizacion))throw Error('Revisá las fechas reales de envío y aceptación de la propuesta.');
 return x;
}
