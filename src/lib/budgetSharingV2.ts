import type {BudgetClientV2} from './budgetV2';
const money=(value:number)=>new Intl.NumberFormat('es-AR',{style:'currency',currency:'ARS',maximumFractionDigits:2}).format(value);
function filenamePart(text:string,max:number,fallback:string){return text.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,max).replace(/-+$/,'')||fallback;}
export function budgetPdfFilename(dto:BudgetClientV2){
 const client=filenamePart(dto.cliente.nombre,50,'Cliente'),product=filenamePart(dto.options[0]?.nombre??'',65,'Productos');
 const alternatives=dto.options.length>1?`-y-${dto.options.length-1}-alternativas`:'';
 const date=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Argentina/Buenos_Aires',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(dto.fecha));
 const reference=filenamePart(dto.budgetId,12,'presupuesto');
 return `Presupuesto-${client}-${product}${alternatives}-v${dto.version}-${date}-${reference}.pdf`;
}
/** Commercial message only: no identity documents, contact details, supplier, costs or internal factors. */
export function budgetWhatsappMessage(dto:BudgetClientV2){
 const date=new Intl.DateTimeFormat('es-AR',{timeZone:'America/Argentina/Buenos_Aires',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(dto.fecha));
 return [
 '*CUENTA HOGAR*','*Presupuesto de gestión de compra*','',
 `Hola, ${dto.cliente.nombre}. Te compartimos el presupuesto de tu solicitud.`,
 `Fecha: ${date}`,`Referencia: ${dto.budgetId} · Versión ${dto.version}`,
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
