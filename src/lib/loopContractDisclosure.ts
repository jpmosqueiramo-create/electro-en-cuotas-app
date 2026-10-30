import {includedVatAmounts} from './includedVat';
import {isLoopCategory,type LoopCategory,type LoopTariff} from './loopServiceTariffs';
export const AUTOMATIC_CFT_POLICY = 'MANDATE_MANAGEMENT_FINANCE_VAT_ACT365_V1' as const;
export const AUTOMATIC_CFT_BASIS = 'Honorarios de gestión de mandato e intereses de financiación, con IVA incluido. Recepción, entrega, asistencia y otros servicios excluidos de cargos financieros. TIR con fechas reales, primera cuota en entrega y año de 365 días.';
export interface LoopServiceSelection {cftPolicy?:typeof AUTOMATIC_CFT_POLICY;supplierTaxId:string;notePaymentPlace:string;noteDueDate:string;acceptanceChannel:string;proposalSentAt:string;clientAcceptedAt:string;category:LoopCategory;tariffRevision:number;tariff:LoopTariff;otherServicesCents:number;cftAnnualPercent:number|null;cftBasis:string}
export interface LoopContractDisclosure extends LoopServiceSelection {
 cftCalculation?:{baseCents:number;chargesCents:number;managementGrossCents:number;financeGrossCents:number};
 version:'LOOP_MANDATE_BREAKDOWN_V2';capitalCents:number;cashPriceCents:number;totalCents:number;
 services:{label:string;grossCents:number;netCents:number;vatCents:number}[];
 serviceGrossCents:number;serviceNetCents:number;serviceVatCents:number;
 financeGrossCents:number;financeNetCents:number;financeVatCents:number;
 effectiveAnnualRate:number|null;monthlyEquivalentRate:number|null;nominalMonthlyAnnualRate:number|null;
 deliveryDate:string;originalFinalDate:string;
 amortization:{installmentNumber:number;dueDate:string;paymentCents:number;interestGrossCents:number;interestNetCents:number;interestVatCents:number;principalCents:number;balanceCents:number}[];
}
const validCents=(v:number)=>Number.isSafeInteger(v)&&v>=0&&v<=10000000000000;
export function loopContractDisclosure(capitalCents:number,totalCents:number,selection:LoopServiceSelection,rows:readonly {installmentNumber:number;dueDate:string;amount:number}[]):LoopContractDisclosure {
 if(!validCents(capitalCents)||capitalCents<=0||!validCents(totalCents)||!isLoopCategory(selection.category)||!Number.isSafeInteger(selection.tariffRevision)||selection.tariffRevision<1)throw Error('LOOP_BREAKDOWN_INPUT_INVALID');
 if(selection.cftPolicy!==undefined&&selection.cftPolicy!==AUTOMATIC_CFT_POLICY)throw Error('LOOP_CFT_POLICY_INVALID');
 const {managementCents,deliveryCents,assistanceCents}=selection.tariff;
 if([managementCents,deliveryCents,assistanceCents,selection.otherServicesCents].some(x=>!validCents(x)))throw Error('LOOP_SERVICE_AMOUNT_INVALID');
 if(selection.cftAnnualPercent!==null&&(!Number.isFinite(selection.cftAnnualPercent)||selection.cftAnnualPercent<0||selection.cftAnnualPercent>1000000))throw Error('LOOP_CFT_INVALID');
 if(typeof selection.cftBasis!=='string'||selection.cftBasis.length>500||/[<>\x00-\x1f]/.test(selection.cftBasis))throw Error('LOOP_CFT_BASIS_INVALID');
 for(const value of [selection.supplierTaxId,selection.notePaymentPlace,selection.noteDueDate,selection.acceptanceChannel,selection.proposalSentAt,selection.clientAcceptedAt])if(typeof value!=='string'||value.length>300||/[<>\x00-\x1f]/.test(value))throw Error('LOOP_LEGAL_DETAILS_INVALID');
 const services=[['Honorarios de gestión de mandato',managementCents],['Recepción, depósito y entrega',deliveryCents],['Asistencia logística técnica CABA ida y vuelta',assistanceCents],['Otros servicios',selection.otherServicesCents]].map(([label,value])=>{const grossCents=Number(value),vat=includedVatAmounts(grossCents,2100);return {label:String(label),grossCents,netCents:vat.baseCents,vatCents:vat.taxCents};});
 const serviceGrossCents=services.reduce((n,s)=>n+s.grossCents,0),cashPriceCents=capitalCents+serviceGrossCents,financeGrossCents=totalCents-cashPriceCents;
 if(financeGrossCents<0)throw Error('Las tarifas superan el total del plan. Revisá las tarifas o prepará una nueva propuesta.');
 if(!rows.length||rows.reduce((n,r)=>n+Math.round(r.amount*100),0)!==totalCents)throw Error('LOOP_SCHEDULE_TOTAL_MISMATCH');
 const times=rows.map((r,i)=>{const t=Date.parse(r.dueDate+'T00:00:00Z');if(!Number.isFinite(t)||new Date(t).toISOString().slice(0,10)!==r.dueDate||r.installmentNumber!==i+1||!validCents(Math.round(r.amount*100))||Math.abs(r.amount*100-Math.round(r.amount*100))>1e-6)throw Error('LOOP_SCHEDULE_DATE_INVALID');return t;});
 if(times.some((t,i)=>i>0&&t<=times[i-1]))throw Error('LOOP_SCHEDULE_DATES_NOT_INCREASING');
 const payments=rows.map(r=>Math.round(r.amount*100)),day=86400000;
 let rate:number|null=null;
 if(rows.length>1){
  if(cashPriceCents<=payments[0])throw Error('LOOP_ADVANCE_EXCEEDS_CASH_PRICE');
  if(financeGrossCents===0)rate=0;
  else{const pv=(x:number)=>payments.reduce((n,p,i)=>n+p*Math.exp(-x*(times[i]-times[0])/day/365),0)-cashPriceCents;
   let low=0,high=1;while(pv(high)>0&&high<128)high*=2;if(pv(high)>0)throw Error('LOOP_RATE_NOT_RESOLVED');
   for(let k=0;k<180;k++){const mid=(low+high)/2;if(pv(mid)>0)low=mid;else high=mid;}rate=Math.expm1((low+high)/2);
  }
 }else if(financeGrossCents!==0)throw Error('Un pago completo en la entrega no permite calcular financiación por tiempo. Revisá el plan y las tarifas.');
 let exactBalance=cashPriceCents,cumulativeInterest=0,roundedInterest=0,paidPrincipal=0;
 const amortization=rows.map((r,i)=>{
  const interest=i===0?0:exactBalance*Math.expm1(Math.log1p(rate??0)*(times[i]-times[i-1])/day/365);
  cumulativeInterest+=interest;const target=Math.round(cumulativeInterest),interestGrossCents=target-roundedInterest;roundedInterest=target;
  const principalCents=payments[i]-interestGrossCents;paidPrincipal+=principalCents;exactBalance-=payments[i]-interest;
  const iva=includedVatAmounts(interestGrossCents,2100);
  return {installmentNumber:r.installmentNumber,dueDate:r.dueDate,paymentCents:payments[i],interestGrossCents,interestNetCents:iva.baseCents,interestVatCents:iva.taxCents,principalCents,balanceCents:cashPriceCents-paidPrincipal};
 });
 if(amortization.at(-1)!.balanceCents!==0||roundedInterest!==financeGrossCents)throw Error('LOOP_AMORTIZATION_NOT_RECONCILED');
 const financeNetCents=amortization.reduce((n,r)=>n+r.interestNetCents,0),financeVatCents=financeGrossCents-financeNetCents;
 let cftAnnualPercent=selection.cftAnnualPercent,cftBasis=selection.cftBasis;
 let automaticCft:Pick<LoopContractDisclosure,'cftPolicy'|'cftCalculation'>={};
 if(selection.cftPolicy===AUTOMATIC_CFT_POLICY){
  // Management is a financing charge; the other service prices remain in the base.
  // Both management and financing already contain VAT: never add it a second time.
  const baseCents=cashPriceCents-managementCents,chargesCents=managementCents+financeGrossCents;
  if(rows.length===1){if(chargesCents!==0)throw Error('No se puede anualizar el CFT con todos los pagos en la entrega.');cftAnnualPercent=0;}
  else{
   if(baseCents<=payments[0])throw Error('La primera cuota debe ser menor que la base del CFT. Revisá el plan.');
   const pv=(logRate:number)=>payments.reduce((n,p,i)=>n+p*Math.exp(-logRate*(times[i]-times[0])/day/365),0)-baseCents;
   let low=0,high=1;while(pv(high)>0&&high<128)high*=2;
   if(pv(high)>0)throw Error('No se pudo resolver el CFT de este plan.');
   for(let k=0;k<180;k++){const mid=(low+high)/2;if(pv(mid)>0)low=mid;else high=mid;}
   cftAnnualPercent=chargesCents===0?0:Math.expm1((low+high)/2)*100;
   if(!Number.isFinite(cftAnnualPercent)||cftAnnualPercent>1000000)throw Error('El CFT excede el rango admitido. Revisá el plan y sus fechas.');
  }
  cftBasis=AUTOMATIC_CFT_BASIS;
  automaticCft={cftPolicy:AUTOMATIC_CFT_POLICY,cftCalculation:{baseCents,chargesCents,managementGrossCents:managementCents,financeGrossCents}};
 }
 return {supplierTaxId:selection.supplierTaxId,notePaymentPlace:selection.notePaymentPlace,noteDueDate:selection.noteDueDate,acceptanceChannel:selection.acceptanceChannel,proposalSentAt:selection.proposalSentAt,clientAcceptedAt:selection.clientAcceptedAt,category:selection.category,tariffRevision:selection.tariffRevision,tariff:{managementCents,deliveryCents,assistanceCents},otherServicesCents:selection.otherServicesCents,cftAnnualPercent,cftBasis,...automaticCft,version:'LOOP_MANDATE_BREAKDOWN_V2',capitalCents,cashPriceCents,totalCents,services,serviceGrossCents,serviceNetCents:services.reduce((n,s)=>n+s.netCents,0),serviceVatCents:services.reduce((n,s)=>n+s.vatCents,0),financeGrossCents,financeNetCents,financeVatCents,effectiveAnnualRate:rate,monthlyEquivalentRate:rate===null?null:Math.expm1(Math.log1p(rate)/12),nominalMonthlyAnnualRate:rate===null?null:12*Math.expm1(Math.log1p(rate)/12),deliveryDate:rows[0].dueDate,originalFinalDate:rows.at(-1)!.dueDate,amortization};
}
