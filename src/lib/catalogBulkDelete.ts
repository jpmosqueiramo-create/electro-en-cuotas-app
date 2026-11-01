import { createHash } from 'node:crypto';
import type { DocumentSnapshot, Firestore } from 'firebase-admin/firestore';
import { assertCatalogReferenceId } from './catalogPublicationContent';

export class CatalogDeleteError extends Error { constructor(public status:number,message:string){super(message);} }
export function catalogDeleteIds(value:unknown):string[]{
 if(!Array.isArray(value)||value.length<1||value.length>100||value.some(id=>typeof id!=='string'))throw new CatalogDeleteError(400,'Seleccioná entre 1 y 100 productos.');
 try{value.forEach(assertCatalogReferenceId);}catch{throw new CatalogDeleteError(400,'Identificador de producto inválido.');}
 if(new Set(value).size!==value.length)throw new CatalogDeleteError(400,'Hay productos repetidos en la selección.');
 return [...value].sort();
}
function deletionPlan(ids:string[],docs:DocumentSnapshot[]){
 const products=docs.slice(0,ids.length),published=docs.slice(ids.length);
 const rows=products.map((p,i)=>({id:ids[i],name:String(p.data()?.nombre||ids[i])}));
 const version=(d:DocumentSnapshot)=>d.updateTime?`${d.updateTime.seconds}:${d.updateTime.nanoseconds}`:null;
 const digest=createHash('sha256').update(JSON.stringify(ids.map((id,i)=>({id,privateVersion:version(products[i]),publicVersion:version(published[i])})))).digest('hex');
 return {rows,digest,missing:products.some(p=>!p.exists),allGone:docs.every(d=>!d.exists),blocked:products.some((p,i)=>published[i].exists||p.data()?.publicado===true||p.data()?.activo===true||(p.data()?.stock!=null&&(!Array.isArray(p.data()!.stock)||p.data()!.stock.length>0)))};
}
export async function previewCatalogDelete(db:Firestore,ids:string[]){
 const refs=[...ids.map(id=>db.collection('productos').doc(id)),...ids.map(id=>db.collection('catalogo_publico').doc(id))];
 const plan=deletionPlan(ids,await db.getAll(...refs));
 if(plan.missing)throw new CatalogDeleteError(409,'Un producto ya no existe. Actualizá el catálogo y la selección.');
 if(plan.blocked)throw new CatalogDeleteError(409,'La selección contiene productos publicados o con unidades registradas. Sólo se eliminan fichas sin publicar y sin unidades.');
 return {rows:plan.rows,digest:plan.digest};
}
export async function applyCatalogDelete(db:Firestore,ids:string[],digest:string){
 if(!/^[a-f0-9]{64}$/.test(digest))throw new CatalogDeleteError(400,'Revisá la selección antes de confirmar.');
 const refs=[...ids.map(id=>db.collection('productos').doc(id)),...ids.map(id=>db.collection('catalogo_publico').doc(id))];
 return db.runTransaction(async tx=>{
  const plan=deletionPlan(ids,await tx.getAll(...refs));
  if(plan.allGone)return {count:0,alreadyDeleted:true};
  if(plan.blocked||plan.missing||plan.digest!==digest)throw new CatalogDeleteError(409,'Un producto cambió o no se puede eliminar. Revisá la selección nuevamente; no se eliminó ningún producto.');
  refs.slice(0,ids.length).forEach(ref=>tx.delete(ref));
  return {count:ids.length,alreadyDeleted:false};
 });
}
