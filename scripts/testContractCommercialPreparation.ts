import assert from 'node:assert/strict';
import {prepareContractCommercial,validateContractCommercial,contractServiceInstallmentParts} from '../src/lib/contractCommercialPreparation';
import {includedVatAmounts} from '../src/lib/includedVat';
import type {ContractEconomicTermsV2} from '../src/lib/contractV2';
const e:ContractEconomicTermsV2={capitalAmount:400000,serviceAmount:800000,contractTotal:1200000,contractPlanCuotas:12,contractInstallmentAmount:100000,factorSnapshot:3,factorComputedTotal:1200000,roundingAdjustment:0},before=JSON.stringify(e);
const p=prepareContractCommercial(e,'Lincoln');
assert.equal(p.capitalCents,40000000);assert.equal(p.serviceGrossCents,32000000);assert.equal(p.financeGrossCents,48000000);
assert.equal(p.serviceNetCents,26446281);assert.equal(p.serviceVatCents,5553719);assert.equal(p.financeNetCents,39669421);assert.equal(p.financeVatCents,8330579);
assert.equal(p.capitalCents+p.serviceNetCents+p.serviceVatCents+p.financeNetCents+p.financeVatCents,120000000);
assert.deepEqual(validateContractCommercial(structuredClone(p),e),p);assert.equal(JSON.stringify(e),before);
const rows=Array.from({length:12},()=>({amount:100000})),parts=contractServiceInstallmentParts(p,rows);assert.equal(parts.reduce((s,n)=>s+n,0),32000000);assert(parts.every(n=>n===2666667||n===2666666));
assert.throws(()=>validateContractCommercial({...p,financeGrossCents:p.financeGrossCents+1},e));assert.throws(()=>validateContractCommercial({...p,policy:{...p.policy,serviceShareBps:5000} as never},e));assert.throws(()=>validateContractCommercial(p,{...e,contractTotal:1200001}));assert.throws(()=>prepareContractCommercial(e,''));assert.throws(()=>contractServiceInstallmentParts(p,[{amount:10}]));
for(let gross=0;gross<100000;gross+=137){const x=includedVatAmounts(gross,2100);assert.equal(x.baseCents+x.taxCents,gross);assert.equal(x.totalCents,gross);}
assert.throws(()=>includedVatAmounts(-1,2100));assert.throws(()=>includedVatAmounts(10,2100.1));
console.log('COMMERCIAL_BREAKDOWN_40_60_INCLUDED_VAT21_EXACT_SUM_ROUNDING_SCHEDULE_NO_MUTATION_TAMPER = PASS');
