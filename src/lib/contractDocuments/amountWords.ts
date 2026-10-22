// Presentation only: no economic calculation or rounding.
export function amountWords(n:number):string {
 if(!Number.isSafeInteger(n)||n<0)throw Error('AMOUNT_WORDS_OUT_OF_RANGE');
 const small=['CERO','UN','DOS','TRES','CUATRO','CINCO','SEIS','SIETE','OCHO','NUEVE','DIEZ','ONCE','DOCE','TRECE','CATORCE','QUINCE','DIECISEIS','DIECISIETE','DIECIOCHO','DIECINUEVE','VEINTE','VEINTIUN','VEINTIDOS','VEINTITRES','VEINTICUATRO','VEINTICINCO','VEINTISEIS','VEINTISIETE','VEINTIOCHO','VEINTINUEVE'];
 function words(x:number):string {
  if(x<30)return small[x];
  if(x<100)return ['','','','TREINTA','CUARENTA','CINCUENTA','SESENTA','SETENTA','OCHENTA','NOVENTA'][Math.floor(x/10)]+(x%10?' Y '+words(x%10):'');
  if(x===100)return 'CIEN';
  if(x<1000)return ['','CIENTO','DOSCIENTOS','TRESCIENTOS','CUATROCIENTOS','QUINIENTOS','SEISCIENTOS','SETECIENTOS','OCHOCIENTOS','NOVECIENTOS'][Math.floor(x/100)]+(x%100?' '+words(x%100):'');
  if(x<1000000)return (Math.floor(x/1000)===1?'MIL':words(Math.floor(x/1000))+' MIL')+(x%1000?' '+words(x%1000):'');
  if(x>=1000000000000)return (Math.floor(x/1000000000000)===1?'UN BILLÓN':words(Math.floor(x/1000000000000))+' BILLONES')+(x%1000000000000?' '+words(x%1000000000000):'');
  return (Math.floor(x/1000000)===1?'UN MILLÓN':words(Math.floor(x/1000000))+' MILLONES')+(x%1000000?' '+words(x%1000000):'');
 }
 return words(n)+(n&&n%1000000===0?' DE':'')+(n===1?' PESO':' PESOS')+' CON 00/100';
}

// Exact snapshot display policy, kept independent of the historical renderer and its source-file IO.
export function formatDraftAmount(n:number){
 if(!Number.isFinite(n)||n<0)throw Error('INVALID_REVIEW_AMOUNT');
 const [coefficient,exponent='0']=n.toString().split('e'),parts=coefficient.split('.'),digits=parts.join(''),position=parts[0].length+Number(exponent);
 const decimal=position<=0?'0.'+'0'.repeat(-position)+digits:position>=digits.length?digits+'0'.repeat(position-digits.length):digits.slice(0,position)+'.'+digits.slice(position);
 const [integer,fraction='']=decimal.split('.');return '$ '+integer.replace(/\B(?=(\d{3})+(?!\d))/g,'.')+','+fraction.padEnd(2,'0');
}
