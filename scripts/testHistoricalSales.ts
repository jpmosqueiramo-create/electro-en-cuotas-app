import assert from 'node:assert/strict';
import {parseHistoricalSale,historicalMonthlySchedule,historicalSummary,historicalSearch} from '../src/lib/historicalSales';
const rows=historicalMonthlySchedule('2024-01-31',3,10000);assert.deepEqual(rows.map(q=>q.dueDate),['2024-01-31','2024-02-29','2024-03-31']);
const input={clientName:'María Pérez',clientDocument:'12345678',phone:'',product:'Producto anterior',saleDate:'2024-01-01',originalReference:'Venta 123',notes:'',installments:rows.map((q,i)=>({...q,paidCents:i===0?10000:i===1?5000:0,paidOn:i<2?'2024-02-15':null}))};
export const historicalFixture=()=>structuredClone(input);
const parsed=parseHistoricalSale(input,'2026-10-30'),summary=historicalSummary({installments:parsed.installments,paidByInstallment:parsed.installments.map(q=>q.paidCents)},'2026-10-30');assert.equal(summary.totalCents,30000);assert.equal(summary.paidCents,15000);assert.equal(summary.balanceCents,15000);assert.equal(summary.overdueCount,2);assert.equal(summary.installments[1].status,'PARCIAL');
for(const patch of [{saleDate:'2027-01-01'}, {clientName:''},{factor:3}, {installments:[{...rows[0],paidCents:10001,paidOn:'2024-02-15'}]},{installments:[{...rows[0],paidCents:100,paidOn:null}]},{installments:[{...rows[0],paidCents:100,paidOn:'2023-12-31'}]},{installments:[{...rows[0],paidCents:100,paidOn:'2027-01-01'}]}])assert.throws(()=>parseHistoricalSale({...input,...patch},'2026-10-30'));
assert.equal(historicalSearch('PÉREZ María'),'perez maria');assert.throws(()=>historicalMonthlySchedule('2026-01-01',121,100));assert.equal(historicalMonthlySchedule('2024-02-29',13,100).at(-1)!.dueDate,'2025-02-28');
console.log('HISTORICAL_SALES_ORIGINAL_AMOUNTS_PARTIAL_PAID_DATES_OVERDUE_CALENDAR_VALIDATION=PASS');
