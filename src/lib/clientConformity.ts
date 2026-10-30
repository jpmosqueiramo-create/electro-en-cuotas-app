export interface ClientConformitySummary {
 version:'CLIENT_CONFORMITY_SUMMARY_V1';name:string;address:string;product:string;quantity:number;condition:string;
 installments:number;installmentAmount:number;total:number;firstDueDate:string;schedule:{number:number;dueDate:string;amount:number}[];
}
export const conformityMoney=(value:number)=>new Intl.NumberFormat('es-AR',{style:'currency',currency:'ARS',maximumFractionDigits:2}).format(value);
export const conformityDate=(value:string)=>value.split('-').reverse().join('/');
export function clientConformityMessage(s:ClientConformitySummary,link:string){return `GESTIONAMOS TU COMPRA — Cuenta Hogar

Hola ${s.name}. Para continuar con la gestión de tu compra, revisá y confirmá las condiciones guardadas:
• Producto: ${s.product} (${s.quantity}, ${s.condition.toLowerCase()}).
• Plan: ${s.installments} cuotas de ${conformityMoney(s.installmentAmount)}.
• Total: ${conformityMoney(s.total)}.
• Primer vencimiento: ${conformityDate(s.firstDueDate)}.

En el enlace vas a ver también tu domicilio y todos los vencimientos. Si los datos son correctos, presioná «Confirmar conformidad». Si necesitás corregir algo, avisános antes de confirmar.
${link}

Esta confirmación no reemplaza la firma del contrato ni del pagaré.`;}
export function clientConformityPhone(raw:string){const n=raw.replace(/\D/g,'');return n.length===10?'549'+n:n.startsWith('54')&&n.length===12?'549'+n.slice(2):n;}
