export interface CashCollectionOption {
 id:string;client:string;date:string;reference:string;originalCents:number;remainingCents:number;
 commissionCents:number;percentages:number[];netEnabled:boolean;warning:string|null;
}
export interface RemittanceSelection {collectionIds:string[];deductCommission:boolean}
export interface RemittancePreview extends RemittanceSelection {
 schemaVersion:'REMITTANCE_PREVIEW_V1';receivedCents:number;commissionRetainedCents:number;grossCents:number;
 cashBalanceCents:number;availableCommissionCents:number;hash:string;
 commissionSources:{id:string;amountCents:number;percentage:number;client:string;installment:number|null}[];
}
export interface RemittanceCashAllocation {cashMovementId:string;paymentId:string|null;grossCents:number;commissionCents:number}
export const remittanceMethodLabel=(method:string)=>method==='TRANSFERENCIA'?'Transferencia bancaria':method==='EFECTIVO_EN_MANO'?'Entrega de efectivo':method==='EFECTIVO_DEPOSITO'?'Depósito bancario':'Medio sin verificar';

export function remittanceDateLabel(value:string){
 if(/^\d{4}-\d{2}-\d{2}$/.test(value))return value.split('-').reverse().join('/');
 const date=new Date(value);return Number.isFinite(date.getTime())?new Intl.DateTimeFormat('es-AR',{timeZone:'America/Argentina/Buenos_Aires',year:'numeric',month:'2-digit',day:'2-digit'}).format(date):'Fecha sin verificar';
}
