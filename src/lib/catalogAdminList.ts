import { calcularPlanReferenciaCatalogo } from './catalogReference';
import { createCatalogReferenceDraft } from './catalogReferenceEditor';
export type CatalogSort = 'name'|'brand'|'kind'|'cost'|'installment12';
export interface CatalogListProduct {id:string;[key:string]:unknown}
export interface CatalogListRow<T> {product:T;name:string;brand:string;kind:string;cost:number|null;installment12:number|null}
export const catalogText=(value:string)=>value.trim().normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('es-AR');
const collator=new Intl.Collator('es-AR',{numeric:true,sensitivity:'base'});
export function catalogListRows<T extends CatalogListProduct>(products:readonly T[]):CatalogListRow<T>[] {
 return products.map(product=>{
  const draft=createCatalogReferenceDraft(product),cost=Number(draft.costoProveedor);
  let installment12:number|null=null;
  if(draft.planesActivos[12])try{installment12=calcularPlanReferenciaCatalogo({costoProveedor:cost,cuotas:12,factor:draft.factoresPlanes[12]}).cuotaExhibidaCatalogo;}catch{/* Invalid plans stay without an estimate. */}
  return {product,name:draft.nombre,brand:draft.marca??'',kind:draft.tipoProducto??'',cost:Number.isFinite(cost)&&cost>0?cost:null,installment12};
 });
}
export function catalogFilterOptions(rows:readonly CatalogListRow<unknown>[],key:'brand'|'kind'){
 const values=new Map<string,string>();for(const row of rows){const value=row[key];if(value&&!values.has(catalogText(value)))values.set(catalogText(value),value);}
 return [...values.values()].sort(collator.compare);
}
export function filterSortCatalog<T extends CatalogListProduct>(rows:readonly CatalogListRow<T>[],options:{search:string;brand:string;kind:string;sort:CatalogSort;descending:boolean}){
 const matches=(value:string,filter:string)=>!filter||(filter==='missing'?!value:catalogText(value)===catalogText(JSON.parse(filter) as string));
 const terms=catalogText(options.search).split(/\s+/).filter(Boolean);
 return rows.filter(row=>terms.every(term=>catalogText([row.name,row.brand,row.kind,String(row.product.skuInterno??'')].join(' ')).includes(term))&&matches(row.brand,options.brand)&&matches(row.kind,options.kind)).sort((a,b)=>{
  const key=options.sort==='name'?'name':options.sort,aa=a[key],bb=b[key];
  // Unclassified or unavailable values always follow actual values, in either direction.
  const absent=(x:unknown)=>x===null||x==='';
  if(absent(aa)!==absent(bb))return absent(aa)?1:-1;
  const compare=typeof aa==='number'&&typeof bb==='number'?aa-bb:collator.compare(String(aa??''),String(bb??''));
  return compare*(options.descending?-1:1)||collator.compare(a.name,b.name)||collator.compare(a.product.id,b.product.id);
 });
}
