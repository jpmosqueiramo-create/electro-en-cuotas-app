import { createHash } from 'node:crypto';
import type { Firestore, QuerySnapshot } from 'firebase-admin/firestore';
import { BULK_LIMIT, normalizeSku, parseBulk, prepareBulkRow, type BulkProduct, type BulkRow } from './catalogBulk';
import { assertCatalogReferenceId, prepareCatalogPublication } from './catalogPublicationContent';
const hash=(s:string)=>createHash('sha256').update(s).digest('hex');
export class BulkError extends Error { constructor(public status:number,message:string){super(message);} }
function products(snapshot:QuerySnapshot):BulkProduct[]{if(snapshot.size>5000)throw new BulkError(400,'El catálogo supera el límite de lectura de esta carga.');return snapshot.docs.map(d=>({id:d.id,data:d.data(),version:`${d.updateTime.seconds}:${d.updateTime.nanoseconds}`}));}
function planBulk(text:string,updatePublished:boolean,items:BulkProduct[],publicItems:BulkProduct[]) {
  const records=parseBulk(text),byId=new Map(items.map(p=>[p.id,p])),publicById=new Map(publicItems.map(p=>[p.id,p]));
  const rows:BulkRow[]=[],writes:{id:string;patch:Record<string,unknown>;create:boolean;publicDto:unknown|null}[]=[],seen=new Set<string>(),skus=new Set<string>(),versions:unknown[]=[];
  for(const record of records){let id=record.cells.id||'',action:'CREATE'|'UPDATE'='CREATE';const errors:string[]=[];
    try{
      const sku=normalizeSku(record.cells.sku||'');
      if(id){assertCatalogReferenceId(id);if(!byId.has(id))throw Error('El id no existe. Exportá nuevamente el catálogo; no se creará un reemplazo.');}
      else {if(!sku)throw Error('Indicá id para actualizar o SKU para identificar el producto.');const matches=items.filter(p=>normalizeSku(String(p.data.skuInterno||''))===sku);if(matches.length>1)throw Error('El SKU coincide con varios productos. Usá su id.');id=matches[0]?.id??`carga_${hash(sku).slice(0,40)}`;}
      if(seen.has(id))throw Error('Producto repetido dentro de la carga. Usá una fila por producto.');seen.add(id);
      const original=byId.get(id);action=original?'UPDATE':'CREATE';
      if(!record.cells.id&&original&&normalizeSku(String(original.data.skuInterno||''))!==sku)throw Error('El identificador reservado ya existe. Usá un id explícito.');
      if(sku){if(skus.has(sku))throw Error('SKU repetido dentro de la carga.');skus.add(sku);if(items.some(p=>p.id!==id&&normalizeSku(String(p.data.skuInterno||''))===sku))throw Error('El SKU ya pertenece a otro producto.');}
      const {patch,plans}=prepareBulkRow(record,original?.data),currentPublic=publicById.get(id);
      const publicDto=updatePublished&&currentPublic?prepareCatalogPublication(id,{...original?.data,...patch}).dto:null;
      if(updatePublished&&currentPublic&&!publicDto)throw Error('La ficha necesita descripción, imágenes y planes válidos para actualizar su publicación.');
      rows.push({row:record.row,id,action,name:patch.nombre,previousCost:Number.isFinite(original?.data.costoProveedor??original?.data.costoProducto)?Number(original?.data.costoProveedor??original?.data.costoProducto):null,cost:patch.costoProveedor,supplier:patch.proveedor,plans,errors});
      versions.push({id,version:original?.version??null,publicVersion:updatePublished?currentPublic?.version??null:null});
      writes.push({id,patch,create:!original,publicDto});
    }catch(e){rows.push({row:record.row,id,action,name:record.cells.nombre||'Producto',previousCost:null,cost:0,supplier:record.cells.proveedor||'',plans:[],errors:[e instanceof Error?e.message:'Fila inválida.']});}
  }
  return {rows,writes,digest:hash(JSON.stringify({schema:1,text,updatePublished,versions})),valid:rows.every(r=>!r.errors.length),publishedUpdates:writes.filter(w=>w.publicDto).length};
}
export async function previewCatalogBulk(db:Firestore,text:string,updatePublished:boolean){
  parseBulk(text);
  const [privateSnapshot,publicSnapshot]=await Promise.all([db.collection('productos').limit(5001).get(),db.collection('catalogo_publico').limit(5001).get()]);
  const {writes:_,...preview}=planBulk(text,updatePublished,products(privateSnapshot),products(publicSnapshot));void _;return preview;
}
export async function applyCatalogBulk(db:Firestore,input:{text:string;updatePublished:boolean;digest:string;commandId:string},actor:string){
  if(!/^[a-f0-9]{64}$/.test(input.digest)||!/^[a-f0-9-]{36}$/.test(input.commandId))throw new BulkError(400,'Revisá nuevamente la planilla antes de guardar.');
  const receipt=db.collection('catalogo_cargas_masivas').doc(input.commandId),payloadHash=hash(JSON.stringify({text:input.text,updatePublished:input.updatePublished,digest:input.digest}));
  return db.runTransaction(async tx=>{
    const previous=await tx.get(receipt);
    if(previous.exists){const data=previous.data()!;if(data.actor!==actor||data.payloadHash!==payloadHash)throw new BulkError(409,'La referencia de carga ya fue utilizada con otros datos.');return{count:data.count as number,publishedUpdates:data.publishedUpdates as number,replay:true};}
    const [privateSnapshot,publicSnapshot]=await Promise.all([tx.get(db.collection('productos').limit(5001)),tx.get(db.collection('catalogo_publico').limit(5001))]);
    const plan=planBulk(input.text,input.updatePublished,products(privateSnapshot),products(publicSnapshot));
    if(!plan.valid)throw new BulkError(400,'Hay filas con errores. Revisá nuevamente la planilla.');
    if(plan.digest!==input.digest)throw new BulkError(409,'Un producto o su publicación cambió desde la revisión. Revisá la carga nuevamente; no se guardó ninguna fila.');
    const now=new Date().toISOString();
    for(const w of plan.writes){const ref=db.collection('productos').doc(w.id);if(w.create)tx.create(ref,{...w.patch,activo:false,publicado:false,fechaCreacion:new Date(now)});else tx.update(ref,w.patch);if(w.publicDto)tx.set(db.collection('catalogo_publico').doc(w.id),w.publicDto as Record<string,unknown>);}
    tx.create(receipt,{schemaVersion:1,actor,at:now,payloadHash,count:plan.writes.length,publishedUpdates:plan.publishedUpdates,productIds:plan.writes.map(w=>w.id),limit:BULK_LIMIT});
    return{count:plan.writes.length,publishedUpdates:plan.publishedUpdates,replay:false};
  });
}
