/** Shared extraction of VAT already included in a gross amount; never adds debt. */
export function includedVatAmounts(grossCents:number,rateBps:number){
 if(!Number.isSafeInteger(grossCents)||grossCents<0||!Number.isSafeInteger(rateBps)||rateBps<0||rateBps>10000)throw Error('FISCAL_AMOUNT_INVALID');
 const denominator=BigInt(10000+rateBps);
 const baseCents=Number((BigInt(grossCents)*BigInt(10000)+denominator/BigInt(2))/denominator);
 return {baseCents,taxCents:grossCents-baseCents,totalCents:grossCents};
}
