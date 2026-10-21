import { exact, opaque, calendarDate } from './contractV2';
import { deliveryEnabled } from './operationDeliveryV2';
export class FinancialV2Error extends Error {}
export function financialFail(message='Estado financiero V2 no disponible.'):never{throw new FinancialV2Error(message);}
export const FINANCIAL_POLICY='OPERATION_LEDGER_V2_FIFO_1' as const;
export const financialEnabled=deliveryEnabled;
export function requireFinancialEmulator(){if(!financialEnabled())financialFail('Cobranza V2 productiva deshabilitada. Sólo Emulator.');}
export function cents(value:number){const n=Math.round(value*100);if(!Number.isFinite(value)||value<0||!Number.isSafeInteger(n)||Math.abs(n/100-value)>0.0000001)financialFail('Importe contractual no representable en centavos.');return n;}
export interface FinancialInstallment {number:number;dueDate:string;amountCents:number}
export interface FinancialAllocation {installmentNumber:number;amountCents:number}
export interface FinancialPayment {id:string;amountCents:number;effectiveDate:string;recordedAt:string;actor:string;method:'TRANSFERENCIA'|'EFECTIVO';reference:string;allocations:FinancialAllocation[];reversedAt:string|null;reversedBy:string|null;reversalReason:string|null;receiptId:string}
export interface FinancialState {schemaVersion:'OPERATION_FINANCIAL_V2';policy:typeof FINANCIAL_POLICY;executionMode:'EMULATOR_ONLY';operationId:string;revision:number;snapshotId:string;snapshotHash:string;contractNumber:string;capitalCents:number;serviceCents:number;totalCents:number;installments:FinancialInstallment[];activatedAt:string;activatedBy:string;deliveryCommandId:string;approvalFixtureId:string}
export function parseFinancialCommand(input:unknown){const c=exact(input,['operationId','expectedRevision','commandId','action','data']);opaque(c.commandId);if(!/^op_[a-f0-9]{64}$/.test(String(c.operationId))||!Number.isSafeInteger(c.expectedRevision)||Number(c.expectedRevision)<0||!['ACTIVATE','CREDIT_PAYMENT','REVERSE_PAYMENT'].includes(String(c.action))||!c.data||typeof c.data!=='object'||Array.isArray(c.data))financialFail('Comando financiero inválido.');return c as unknown as {operationId:string;expectedRevision:number;commandId:string;action:string;data:Record<string,unknown>};}
export function financialDate(value:unknown){calendarDate(value);const s=String(value);if(s>new Date().toISOString().slice(0,10))financialFail('Fecha efectiva futura.');return s;}
export function financialSummary(s:FinancialState,payments:FinancialPayment[],asOf=new Date().toISOString().slice(0,10)){
 calendarDate(asOf);const active=payments.filter(p=>!p.reversedAt);
 const installments=s.installments.map(i=>{const paidCents=active.flatMap(p=>p.allocations).filter(a=>a.installmentNumber===i.number).reduce((n,a)=>n+a.amountCents,0);if(paidCents<0||paidCents>i.amountCents)financialFail('Imputación inconsistente.');const balanceCents=i.amountCents-paidCents;const daysPastDue=balanceCents&&i.dueDate<asOf?Math.floor((Date.parse(asOf+'T00:00:00Z')-Date.parse(i.dueDate+'T00:00:00Z'))/86400000):0;return {...i,paidCents,balanceCents,status:balanceCents===0?'PAGADA' as const:paidCents?'PARCIAL' as const:'PENDIENTE' as const,daysPastDue,overdue:daysPastDue>0};});
 const paidCents=installments.reduce((n,i)=>n+i.paidCents,0);return {totalCents:s.totalCents,paidCents,balanceCents:s.totalCents-paidCents,installments,overdueCount:installments.filter(i=>i.overdue).length,nextDueDate:installments.find(i=>i.balanceCents>0)?.dueDate||null,status:paidCents===s.totalCents?'PAGADA':paidCents?'PARCIAL':'PENDIENTE',lateChargesCents:0};
}
