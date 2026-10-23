// Shared server-side adapter over the existing FIFO engine. No persistence or pricing.
import { calcularImputacionesFIFO, type EstadoCuotaDerivado } from './ledgerEngine';
import { financialFail, type financialSummary } from './operationFinancialV2';
export function allocateOperationPayment(summary:ReturnType<typeof financialSummary>,amountCents:number){
 if(!Number.isSafeInteger(amountCents)||amountCents<=0||amountCents>summary.balanceCents)financialFail('Importe acreditado inválido o superior al saldo.');
 const rows=summary.installments.map(i=>({numero:i.number,saldoCentavos:i.balanceCents,capitalPendienteCentavos:i.balanceCents,servicioNetoPendienteCentavos:0,ivaPendienteCentavos:0} as EstadoCuotaDerivado));
 const allocations=calcularImputacionesFIFO(rows,amountCents).map(a=>({installmentNumber:a.cuotaNumero,amountCents:a.importeAplicadoCentavos}));
 if(allocations.reduce((n,a)=>n+a.amountCents,0)!==amountCents)financialFail('Imputación incompleta.');
 return allocations;
}
