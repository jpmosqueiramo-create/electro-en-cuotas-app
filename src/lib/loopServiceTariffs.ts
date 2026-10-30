/** Private administrative tariffs. Prices include VAT; never added to factor totals. */
export const loopCategories = ['A','B','C','D'] as const;
export type LoopCategory = typeof loopCategories[number];
export const loopCategoryLabels = {A:'Pequeño',B:'Mediano',C:'Grande',D:'Extra grande'} as const;
export interface LoopTariff { managementCents:number; deliveryCents:number; assistanceCents:number }
export type LoopTariffs = Record<LoopCategory,LoopTariff>;
/** Workbook references only. Activation requires an explicit administrative save. */
export const loopReferenceTariffs:LoopTariffs = {
 A:{managementCents:4000000,deliveryCents:2500000,assistanceCents:1500000},
 B:{managementCents:4000000,deliveryCents:5000000,assistanceCents:2500000},
 C:{managementCents:4000000,deliveryCents:10000000,assistanceCents:5000000},
 D:{managementCents:4000000,deliveryCents:15000000,assistanceCents:8000000},
};
export const isLoopCategory=(x:unknown):x is LoopCategory=>loopCategories.includes(x as LoopCategory);
export function validateLoopTariffs(value:unknown):LoopTariffs {
 if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).sort().join(',')!=='A,B,C,D')throw Error('Completá las cuatro categorías.');
 const result={} as LoopTariffs;
 for(const key of loopCategories){
  const row=(value as LoopTariffs)[key];
  if(!row||Object.keys(row).sort().join(',')!=='assistanceCents,deliveryCents,managementCents'||Object.values(row).some(x=>!Number.isSafeInteger(x)||x<0||x>100000000000))throw Error('Revisá los importes de las tarifas.');
  result[key]={managementCents:row.managementCents,deliveryCents:row.deliveryCents,assistanceCents:row.assistanceCents};
 }
 return result;
}
export interface LoopTariffConfiguration {revision:number;tariffs:LoopTariffs|null}
