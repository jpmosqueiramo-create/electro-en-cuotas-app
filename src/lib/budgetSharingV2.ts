import type {BudgetClientV2} from './budgetV2';
const money=(value:number)=>new Intl.NumberFormat('es-AR',{style:'currency',currency:'ARS',maximumFractionDigits:2}).format(value);
import {documentNamePart} from './documentFilenames';
export type NumberedBudgetClientV2=BudgetClientV2&{documentNumber?:string};
export function budgetPdfFilename(dto:NumberedBudgetClientV2){
 if(!dto.documentNumber||!/^P-\d{6,16}$/.test(dto.documentNumber))throw Error('Prepará el presupuesto numerado antes de descargar.');
 const client=documentNamePart(dto.cliente.nombre,50,'Cliente'),product=documentNamePart(dto.options[0]?.nombre??'',65,'Productos');
 const alternatives=dto.options.length>1?`-y-${dto.options.length-1}-alternativas`:'';
 return `Presupuesto-${dto.documentNumber}-${client}-${product}${alternatives}-v${dto.version}.pdf`;
}
/** Commercial message only: no identity documents, contact details, supplier, costs or internal factors. */
export function budgetWhatsappMessage(dto:NumberedBudgetClientV2){
 const date=new Intl.DateTimeFormat('es-AR',{timeZone:'America/Argentina/Buenos_Aires',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(dto.fecha));
 return [
 '*CUENTA HOGAR*','*Presupuesto de gestión de compra*','',
 `Hola, ${dto.cliente.nombre}. Te compartimos el presupuesto de tu solicitud.`,
 `Fecha: ${date}`,`Referencia: ${dto.documentNumber??dto.budgetId} · Versión ${dto.version}`,
 ...dto.options.flatMap((option,i)=>[
 '',`*Opción ${i+1}: ${option.nombre}*`,...(option.descripcion?[option.descripcion]:[]),
 ...option.planesOfrecidos.map(plan=>`• ${plan.cuotas} ${plan.cuotas===1?'cuota estimada':'cuotas estimadas'} de ${money(plan.cuotaEstimada)}. Total estimado del plan: ${money(Math.round(plan.cuotaEstimada*100)*plan.cuotas/100)}.`),
 ]),
 '', 'Las opciones son alternativas independientes. Disponibilidad a confirmar. El plan contractual definitivo se confirma al confeccionar el contrato.',
 ].join('\n');
}
export function budgetWhatsappPhone(raw:string){
 let phone=raw.trim().replace(/[\s().-]/g,'');
 if(!/^\+?\d+$/.test(phone))return null;
 if(phone.startsWith('+')){phone=phone.slice(1);if(!phone.startsWith('54'))return /^[1-9]\d{7,14}$/.test(phone)?phone:null;}
 if(phone.startsWith('00'))phone=phone.slice(2);
 if(phone.length===11&&phone.startsWith('0'))phone=phone.slice(1);
 if(phone.length===10)phone='549'+phone;
 else if(phone.length===12&&phone.startsWith('54'))phone='549'+phone.slice(2);
 return /^549\d{10}$/.test(phone)?phone:null;
}
export function budgetWhatsappUrl(raw:string,message:string){const phone=budgetWhatsappPhone(raw);return phone?`https://wa.me/${phone}?text=${encodeURIComponent(message)}`:null;}
