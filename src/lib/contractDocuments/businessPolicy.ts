// Versioned commercial policy; never legal approval or authorization to issue.
export const companyProfile = Object.freeze({version:'LOOP_COMMERCIAL_PROFILE_V1',legalName:'LOOP GESTIÓN INTEGRAL S.R.L.',tradeName:'Cuenta Hogar',taxId:'30-71962686-2',legalAddress:'Caracas 1101, Ciudad Autónoma de Buenos Aires',representative:'Juan Pablo Mosqueira Morales',capacity:'Socio gerente',legalApproval:'PENDING'} as const);
export const OVERDUE_SURCHARGE_POLICY_V1 = 'NONE' as const;
/** Pure V2 balance projection, not a ledger. Dates never change the principal. */
export function installmentBalance(original:number,recordedPayments:readonly number[]){
  const cents=(n:number)=>{if(!Number.isFinite(n)||n<0||!Number.isSafeInteger(Math.round(n*100))||Math.abs(n*100-Math.round(n*100))>0.00001)throw Error('INVALID_CURRENCY_AMOUNT');return Math.round(n*100);};
  const due=cents(original),paid=recordedPayments.reduce((sum,n)=>sum+cents(n),0);
  if(!Number.isSafeInteger(paid)||paid>due)throw Error('INVALID_PAYMENT_BALANCE');
  return {policy:OVERDUE_SURCHARGE_POLICY_V1,surcharge:0,outstanding:(due-paid)/100};
}
export function amountInWords(amount:number):string{
  const decimal=amount.toString();
  if(!Number.isFinite(amount)||amount<0||!/^\d+(?:\.\d{1,2})?$/.test(decimal)||amount>999999999999.99)throw Error('UNSUPPORTED_AMOUNT_IN_WORDS');
  const [whole,fraction='']=decimal.split('.');
  const units=['cero','uno','dos','tres','cuatro','cinco','seis','siete','ocho','nueve','diez','once','doce','trece','catorce','quince','dieciséis','diecisiete','dieciocho','diecinueve','veinte','veintiuno','veintidós','veintitrés','veinticuatro','veinticinco','veintiséis','veintisiete','veintiocho','veintinueve'];
  const apocope=(s:string)=>s.replace(/veintiuno$/,'veintiún').replace(/uno$/,'un');
  function words(n:number):string{
    if(n<30)return units[n];
    if(n<100)return ['','','','treinta','cuarenta','cincuenta','sesenta','setenta','ochenta','noventa'][Math.floor(n/10)]+(n%10?' y '+words(n%10):'');
    if(n===100)return 'cien';
    if(n<1000)return ['','ciento','doscientos','trescientos','cuatrocientos','quinientos','seiscientos','setecientos','ochocientos','novecientos'][Math.floor(n/100)]+(n%100?' '+words(n%100):'');
    const base=n<1000000?1000:1000000,major=Math.floor(n/base),rest=n%base;
    return (base===1000?(major===1?'mil':apocope(words(major))+' mil'):(major===1?'un millón':apocope(words(major))+' millones'))+(rest?' '+words(rest):'');
  }
  const n=Number(whole);return (apocope(words(n))+(n!==0&&n%1000000===0?' de':'')+(n===1?' peso argentino con ':' pesos argentinos con ')+fraction.padEnd(2,'0')+'/100').toUpperCase();
}
