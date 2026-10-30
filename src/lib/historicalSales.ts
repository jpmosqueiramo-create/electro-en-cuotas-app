import {calendarDate} from './contractV2';
import {financialSummary,type FinancialInstallment} from './operationFinancialV2';
import {argentinaBusinessDate} from './productionV2/businessDate';
export const HISTORICAL_SALES_VERSION='HISTORICAL_SALE_V1' as const;
export interface HistoricalSaleInput {clientName:string;clientDocument:string;phone:string;product:string;saleDate:string;originalReference:string;notes:string;installments:(FinancialInstallment&{paidCents:number;paidOn:string|null})[];}
export interface HistoricalSale {schemaVersion:typeof HISTORICAL_SALES_VERSION;id:string;revision:number;clientName:string;clientDocument:string;phone:string;product:string;saleDate:string;originalReference:string;notes:string;installments:FinancialInstallment[];paidByInstallment:number[];lastPaidOnByInstallment:(string|null)[];createdAt:string;createdBy:string;updatedAt:string;updatedBy:string;}
export interface HistoricalPayment {id:string;installmentNumber:number;amountCents:number;paidOn:string;kind:'HISTORICAL'|'FOLLOW_UP';reference:string;recordedAt:string;recordedBy:string;reversedAt:string|null;reversedBy:string|null;reversalReason:string|null;}
export class HistoricalSaleError extends Error{}
export function historicalFail(message='Revisá los datos de la venta anterior.'):never{throw new HistoricalSaleError(message);}
export function historicalObject(value:unknown,keys:string[]){if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).sort().join('|')!==[...keys].sort().join('|'))historicalFail();return value as Record<string,unknown>;}
export function historicalId(value:unknown){if(typeof value!=='string'||!/^[-a-zA-Z0-9_]{1,100}$/.test(value))historicalFail();return value;}
export function historicalText(value:unknown,max:number,required=false){if(typeof value!=='string'||value.length>max||/[\x00-\x08\x0b\x0c\x0e-\x1f<>]/.test(value)||required&&!value.trim())historicalFail();return value.trim().normalize('NFC');}
export function historicalAmount(value:unknown,positive=true){if(typeof value!=='number'||!Number.isSafeInteger(value)||(positive?value<=0:value<0)||value>1_000_000_000_000)historicalFail('Revisá el importe ingresado.');return value;}
export function historicalDate(value:unknown,today=argentinaBusinessDate()){try{calendarDate(value);}catch{historicalFail('Indicá una fecha válida.');}if(String(value)>today)historicalFail('La fecha de venta o pago no puede ser futura.');return String(value);}
export function parseHistoricalSale(value:unknown,today=argentinaBusinessDate()):HistoricalSaleInput{
 const o=historicalObject(value,['clientName','clientDocument','phone','product','saleDate','originalReference','notes','installments']);
 const saleDate=historicalDate(o.saleDate,today);
 if(!Array.isArray(o.installments)||!o.installments.length||o.installments.length>120)historicalFail('Cargá entre 1 y 120 cuotas.');
 const installments=o.installments.map((raw,i)=>{const row=historicalObject(raw,['number','dueDate','amountCents','paidCents','paidOn']);if(row.number!==i+1)historicalFail('La numeración de cuotas debe ser consecutiva.');try{calendarDate(row.dueDate);}catch{historicalFail('Revisá los vencimientos.');}const dueDate=String(row.dueDate),amountCents=historicalAmount(row.amountCents),paidCents=historicalAmount(row.paidCents,false);if(dueDate<saleDate||paidCents>amountCents)historicalFail('Revisá vencimiento e importe pagado de cada cuota.');const paidOn=paidCents?historicalDate(row.paidOn,today):null;if(!paidCents&&row.paidOn!==null||paidOn&&paidOn<saleDate)historicalFail('La fecha del pago debe corresponder a la venta.');return {number:i+1,dueDate,amountCents,paidCents,paidOn};});
 if(installments.some((q,i)=>i>0&&q.dueDate<installments[i-1].dueDate))historicalFail('Ordená los vencimientos desde la primera cuota.');
 return {clientName:historicalText(o.clientName,200,true),clientDocument:historicalText(o.clientDocument,50),phone:historicalText(o.phone,50),product:historicalText(o.product,300,true),saleDate,originalReference:historicalText(o.originalReference,100),notes:historicalText(o.notes,1000),installments};
}
/** Calendar suggestion only; imported monetary amounts are never repriced. Rows remain editable. */
export function historicalMonthlySchedule(first:string,count:number,amountCents:number){calendarDate(first);if(!Number.isInteger(count)||count<1||count>120)historicalFail('Elegí entre 1 y 120 cuotas.');historicalAmount(amountCents);const [y,m,d]=first.split('-').map(Number);return Array.from({length:count},(_,i)=>{const month=y*12+m-1+i,year=Math.floor(month/12),mm=month%12+1;if(year>9998)historicalFail('Fecha fuera de rango.');const day=Math.min(d,new Date(Date.UTC(year,mm,0)).getUTCDate());return {number:i+1,dueDate:`${year}-${String(mm).padStart(2,'0')}-${String(day).padStart(2,'0')}`,amountCents,paidCents:0,paidOn:null as string|null};});}
/** Reuse the existing installment balance engine; no factors, rates, taxes or new financial engine. */
export function historicalSummary(s:Pick<HistoricalSale,'installments'|'paidByInstallment'>,asOf=argentinaBusinessDate()){
 if(s.installments.length!==s.paidByInstallment.length)historicalFail('Saldo histórico inconsistente.');
 return financialSummary({installments:s.installments,totalCents:s.installments.reduce((n,q)=>n+q.amountCents,0)},[{allocations:s.paidByInstallment.flatMap((amountCents,i)=>amountCents?[{installmentNumber:i+1,amountCents}]:[]),reversedAt:null}],asOf);
}
export const historicalSearch=(value:string)=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('es').trim();
