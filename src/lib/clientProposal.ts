import type {ContractDraftV2} from './contractV2';
import {completeness,stable,calendarDate} from './contractV2';
import {validateContractCommercial} from './contractCommercialPreparation';
import {contractPaymentAddress} from './contractPaymentAddress';
export const CLIENT_PROPOSAL_VERSION='LOOP_CLIENT_PROPOSAL_20261030_V1';
export const proposalMoney=(n:number)=>new Intl.NumberFormat('es-AR',{style:'currency',currency:'ARS'}).format(n);
export const proposalDate=(n:string)=>n.split('-').reverse().join('/');
/** Only the expressly approved contractual disclosure; no internal factors, margins or administrative notes. */
export function clientProposal(d:ContractDraftV2){
 if(completeness(d).length||!d.productDetails||!d.economicTerms||!d.commercialPreparation?.loop)throw Error('Completá y guardá el panel con las tarifas de servicios del mandato.');
 const x=validateContractCommercial(d.commercialPreparation,d.economicTerms).loop!;
 if(x.cftAnnualPercent===null||!x.cftBasis.trim()||!x.supplierTaxId.trim()||!x.noteDueDate||!x.notePaymentPlace.trim())throw Error('Completá el CUIT del proveedor, el CFT informado y las condiciones del pagaré antes de compartir la propuesta.');
 calendarDate(x.noteDueDate);
 if(!d.acceptedReferenceSnapshot.proveedorSnapshot.trim()||!/^\d{2}-?\d{8}-?\d$/.test(x.supplierTaxId)||x.noteDueDate<x.originalFinalDate)throw Error('Revisá el proveedor, su CUIT y el vencimiento único del pagaré.');
 if(stable(x.amortization.map(p=>({installmentNumber:p.installmentNumber,dueDate:p.dueDate,amount:p.paymentCents/100})))!==stable(d.paymentScheduleDraft))throw Error('Guardá el cronograma vigente antes de compartir.');
 return {version:CLIENT_PROPOSAL_VERSION,budgetId:d.budgetId,budgetVersion:d.budgetVersion,name:d.personalData.fullName,address:contractPaymentAddress(d.personalData).display,locality:d.personalData.locality,product:d.acceptedReferenceSnapshot.nombre,quantity:d.productDetails.quantity,condition:d.productDetails.condition==='NEW'?'Nuevo':'Usado',provider:d.acceptedReferenceSnapshot.proveedorSnapshot,supplierTaxId:x.supplierTaxId,installments:d.economicTerms.contractPlanCuotas,installmentAmount:d.economicTerms.contractInstallmentAmount,total:d.economicTerms.contractTotal,firstDueDate:d.firstInstallmentDueDate!,noteDueDate:x.noteDueDate,notePaymentPlace:x.notePaymentPlace,issuePlace:d.commercialPreparation.issuePlace,capitalCents:x.capitalCents,cashPriceCents:x.cashPriceCents,services:x.services,financeNetCents:x.financeNetCents,financeVatCents:x.financeVatCents,financeGrossCents:x.financeGrossCents,effectiveAnnualRate:x.effectiveAnnualRate,nominalMonthlyAnnualRate:x.nominalMonthlyAnnualRate,cftAnnualPercent:x.cftAnnualPercent,cftBasis:x.cftBasis,amortization:x.amortization};
}
export type ClientProposal=ReturnType<typeof clientProposal>;
export function clientProposalAcceptance(reference:string){return `ACEPTO la propuesta de Cuenta Hogar identificada como ${reference}, recibida en este chat, y autorizo a Loop Gestión Integral S.R.L. a realizar la compra indicada en mi nombre y por mi cuenta, conforme a sus condiciones`;}
export function clientProposalMessage(p:ClientProposal,reference:string){return `Hola, ${p.name}.

Te enviamos la propuesta de Cuenta Hogar correspondiente a tu solicitud de compra.

Producto: ${p.product}
Precio total de la operación: ${proposalMoney(p.total)}
Plan de pago: ${p.installments} cuotas de ${proposalMoney(p.installmentAmount)}
Primera cuota: al momento de la entrega (${proposalDate(p.firstDueDate)})
Localidad de entrega: ${p.locality}

En el documento adjunto se detallan el precio de adquisición, nuestros servicios, las tasas, el cronograma de pagos y las demás condiciones.

Si estás de acuerdo, por favor respondé:

«${clientProposalAcceptance(reference)}».

La firma física de la documentación se realizará al momento de la entrega.

La aceptación no limita tus derechos legales como consumidor.`;}
