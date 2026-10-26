import {includedVatAmounts} from './includedVat';
import type {ContractEconomicTermsV2} from './contractV2';
/** Owner-confirmed distribution of the saved excess, NOT an annual interest rate. */
export const CONTRACT_COMMERCIAL_POLICY=Object.freeze({version:'OWNER_SERVICE40_FINANCE60_INCLUDED_VAT21_V1',servicePeriodMonths:12,serviceShareBps:4000,serviceVatRateBps:2100,financeVatRateBps:2100} as const);
export interface ContractCommercialPreparation {
 schemaVersion:'CONTRACT_COMMERCIAL_PREPARATION_V1';policy:typeof CONTRACT_COMMERCIAL_POLICY;issuePlace:string;
 capitalCents:number;serviceGrossCents:number;serviceNetCents:number;serviceVatCents:number;
 financeGrossCents:number;financeNetCents:number;financeVatCents:number;totalCents:number;
}
const cents=(n:number)=>{const x=Math.round(n*100);if(!Number.isFinite(n)||!Number.isSafeInteger(x)||x<0||Math.abs(x/100-n)>1e-7)throw Error('CONTRACT_COMMERCIAL_AMOUNT_INVALID');return x;};
export function prepareContractCommercial(e:ContractEconomicTermsV2,issuePlace:string):ContractCommercialPreparation{
 if(typeof issuePlace!=='string'||!issuePlace.trim()||issuePlace.length>200||/[<>\x00-\x1f\x7f]/.test(issuePlace))throw Error('CONTRACT_ISSUE_PLACE_REQUIRED');
 const capitalCents=cents(e.capitalAmount),totalCents=cents(e.contractTotal),excessCents=totalCents-capitalCents;
 if(capitalCents<=0||totalCents<=0||excessCents<0||excessCents!==cents(e.serviceAmount))throw Error('CONTRACT_COMMERCIAL_ORIGIN_MISMATCH');
 const serviceGrossCents=Number((BigInt(excessCents)*BigInt(4000)+BigInt(5000))/BigInt(10000)),financeGrossCents=excessCents-serviceGrossCents;
 const service=includedVatAmounts(serviceGrossCents,2100),finance=includedVatAmounts(financeGrossCents,2100);
 return {schemaVersion:'CONTRACT_COMMERCIAL_PREPARATION_V1',policy:CONTRACT_COMMERCIAL_POLICY,issuePlace:issuePlace.trim(),capitalCents,serviceGrossCents,serviceNetCents:service.baseCents,serviceVatCents:service.taxCents,financeGrossCents,financeNetCents:finance.baseCents,financeVatCents:finance.taxCents,totalCents};
}
export function validateContractCommercial(value:ContractCommercialPreparation,e:ContractEconomicTermsV2){
 const expected=prepareContractCommercial(e,value?.issuePlace);
 const normalize=(x:unknown):string=>{if(x&&typeof x==='object'&&!Array.isArray(x))return JSON.stringify(Object.fromEntries(Object.entries(x).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>[k,JSON.parse(normalize(v))])));return JSON.stringify(x);};
 if(normalize(value)!==normalize(expected))throw Error('CONTRACT_COMMERCIAL_INTEGRITY');return expected;
}
export function snapshotCommercial(parameters:Readonly<Record<string,string|number|boolean|null>>,e:ContractEconomicTermsV2){
 if(parameters.commercialPreparationJson===undefined)return undefined;
 if(typeof parameters.commercialPreparationJson!=='string')throw Error('CONTRACT_COMMERCIAL_INTEGRITY');
 return validateContractCommercial(JSON.parse(parameters.commercialPreparationJson),e);
}

/** Informative service share inside existing installments. No new debt or fiscal issue. */
export function contractServiceInstallmentParts(p:ContractCommercialPreparation,rows:readonly {amount:number}[]){
 if(rows.reduce((n,r)=>n+cents(r.amount),0)!==p.totalCents)throw Error('CONTRACT_COMMERCIAL_SCHEDULE_MISMATCH');
 let cumulative=0,allocated=0;
 return rows.map(r=>{cumulative+=cents(r.amount);const target=Number((BigInt(cumulative)*BigInt(p.serviceGrossCents)+BigInt(p.totalCents)/BigInt(2))/BigInt(p.totalCents));const amount=target-allocated;allocated=target;return amount;});
}
