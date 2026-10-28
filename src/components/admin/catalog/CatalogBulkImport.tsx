'use client';
import { useRef, useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { BULK_TEMPLATE, exportBulk, type BulkRow } from '@/lib/catalogBulk';
interface Product { id:string; [key:string]:unknown }
interface Preview { rows:BulkRow[];digest:string;valid:boolean;publishedUpdates:number }
const button='min-h-11 rounded-xl border border-border-color bg-surface px-4 py-2 text-sm font-semibold text-brand-primary disabled:opacity-50';
const money=(value:number|null)=>value===null?'Sin costo anterior':new Intl.NumberFormat('es-AR',{style:'currency',currency:'ARS'}).format(value);
function download(text:string,name:string){const url=URL.createObjectURL(new Blob([text],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
export function CatalogBulkImport(props:{products:Product[];onSaved:()=>Promise<void>;disabled?:boolean;onBusyChange:(busy:boolean)=>void;editingOpen?:boolean}){const{user}=useAuth();return <BulkSession key={user?.uid??'anonymous'} {...props}/>;}
function BulkSession({products,onSaved,disabled,onBusyChange,editingOpen}:{products:Product[];onSaved:()=>Promise<void>;disabled?:boolean;onBusyChange:(busy:boolean)=>void;editingOpen?:boolean}){
 const {user}=useAuth(),[open,setOpen]=useState(false),[text,setText]=useState(''),[updatePublished,setPublished]=useState(false),[preview,setPreview]=useState<Preview|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
 const flight=useRef(false),commandId=useRef('');
 const reset=()=>{setPreview(null);commandId.current='';setMessage('');setError('');};
 async function request(action:'PREVIEW'|'APPLY'){
  if(!user||flight.current)return;flight.current=true;setBusy(true);onBusyChange(true);setError('');setMessage('');
  try{
   if(action==='APPLY'&&!preview?.valid)throw Error('Revisá las filas antes de guardar.');
   const r=await fetch('/api/admin/catalogo/carga-masiva',{method:'POST',cache:'no-store',headers:{Authorization:`Bearer ${await user.getIdToken()}`,'Content-Type':'application/json'},body:JSON.stringify({action,text,updatePublished,...(action==='APPLY'?{digest:preview!.digest,commandId:commandId.current}:{})})});
   const data=await r.json();if(!r.ok){if(r.status===409){setPreview(null);commandId.current='';}throw Error(data.error||'No se pudo completar la carga.');}
   if(action==='PREVIEW'){setPreview(data);commandId.current=crypto.randomUUID();}
   else{setPreview(null);setText('');commandId.current='';setMessage(`${data.count} productos guardados. ${data.publishedUpdates} publicaciones actualizadas. Los productos nuevos se publican desde su ficha.`);await onSaved();}
  }catch(e){setError(e instanceof Error?e.message:'No se pudo completar la carga.');}finally{flight.current=false;setBusy(false);onBusyChange(false);}
 }
 return <section data-testid="catalog-bulk" className="min-w-0 space-y-4 rounded-2xl border border-border-color bg-surface p-4 text-text-primary sm:p-5">
  <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-bold text-brand-primary">Carga masiva de precios</h2><p className="text-sm text-text-secondary">Pegá desde Excel o importá CSV. Revisá todos los productos antes de guardar.</p></div><button className={button} disabled={busy||disabled} onClick={()=>setOpen(v=>!v)} aria-expanded={open}>{open?'Cerrar carga masiva':'Abrir carga masiva'}</button></div>
  {editingOpen&&<p className="text-sm text-text-secondary">Cerrá el editor individual para usar la carga masiva.</p>}
  {open&&<div className="min-w-0 space-y-4"><fieldset disabled={busy||disabled} className="min-w-0 space-y-4 disabled:opacity-60">
   <div className="flex flex-wrap gap-2"><button type="button" className={button} onClick={()=>download('\uFEFF'+BULK_TEMPLATE,'plantilla-catalogo.csv')}>Descargar plantilla</button><button type="button" className={button} disabled={!products.length} onClick={()=>download(exportBulk(products),'catalogo-para-actualizar.csv')}>Exportar catálogo para actualizar</button></div>
   <p className="text-sm">Una fila por producto, máximo 100 por carga. <strong>Conservá el ID de los productos existentes.</strong> Para nuevos productos, completá un SKU único. El costo se expresa en pesos; no se agregan impuestos ni recargos al valor ingresado.</p>
   <p className="break-words text-sm text-text-secondary">Columnas: id, sku, nombre, costo, proveedor, cuotas y factor por plazo (factor_8, factor_12, etc.). Cuotas: 8|12. También podés incluir descripción y código de barras. En productos existentes, las celdas opcionales vacías conservan sus datos.</p>
   <label className="block min-w-0 text-sm font-semibold">Importar CSV<input className="mt-2 block min-h-11 w-full min-w-0 rounded-xl border border-border-color p-2 font-normal" type="file" accept=".csv,.tsv,text/csv,text/tab-separated-values" onChange={async e=>{const file=e.target.files?.[0];e.target.value='';if(!file)return;reset();if(file.size>400000){setError('El archivo es demasiado grande. Separalo en cargas de hasta 100 productos.');return;}if(flight.current)return;flight.current=true;setBusy(true);onBusyChange(true);try{setText(await file.text());reset();}catch{setError('No se pudo leer el archivo.');}finally{flight.current=false;setBusy(false);onBusyChange(false);}}}/></label>
   <label className="block text-sm font-semibold">Planilla para importar<textarea className="mt-2 min-h-44 w-full min-w-0 rounded-xl border border-border-color bg-white p-3 font-mono text-sm text-stone-900" value={text} onChange={e=>{setText(e.target.value);reset();}} placeholder="Pegá las columnas con sus encabezados, o seleccioná un archivo CSV." spellCheck={false}/></label>
   <label className="flex min-h-11 items-start gap-3 text-sm"><input className="mt-1 size-5 shrink-0" type="checkbox" checked={updatePublished} onChange={e=>{setPublished(e.target.checked);reset();}}/><span><strong>Actualizar también las publicaciones existentes</strong><span className="block text-text-secondary">Actualiza los precios visibles para visitantes y afiliados. Los productos nuevos no se publican automáticamente.</span></span></label>
   <button className={`${button} bg-brand-primary! text-white!`} disabled={!text.trim()} onClick={()=>void request('PREVIEW')}>{busy?'Procesando…':'Revisar carga'}</button>
  </fieldset>
  {preview&&<div className="space-y-3"><p role="status" className="font-semibold">{preview.rows.length} productos · {preview.rows.filter(r=>r.errors.length).length} filas con errores · {preview.publishedUpdates} publicaciones a actualizar</p>
   {preview.rows.map(r=><article key={r.row} data-testid="catalog-bulk-row" className={`min-w-0 rounded-xl border p-3 ${r.errors.length?'border-red-300 bg-red-50':'border-border-color bg-background-main'}`}><div className="flex flex-wrap justify-between gap-2"><h3 className="min-w-0 break-words font-bold">Fila {r.row}: {r.name}</h3><span className="text-sm">{r.action==='CREATE'?'Nuevo producto':'Actualizar producto'}</span></div>{r.errors.length?<ul className="list-inside list-disc text-red-900">{r.errors.map(e=><li key={e}>{e}</li>)}</ul>:<><p className="break-words text-sm">Proveedor: {r.supplier}</p><p className="text-sm">Costo: {money(r.previousCost)} → <strong>{money(r.cost)}</strong></p><div className="mt-2 flex flex-wrap gap-2">{r.plans.map(p=><span key={p.cuotas} className="rounded-lg bg-white p-2 text-sm">{p.cuotas} cuotas de <strong>{money(p.cuotaEstimada)}</strong> · Factor {p.factor}</span>)}</div></>}</article>)}
   <p className="text-sm text-text-secondary">Se guarda la carga completa. Si hay errores o un producto cambió desde esta revisión, no se guarda ninguna fila. Imágenes, stock y presupuestos anteriores se conservan.</p>
   <button className={`${button} bg-brand-primary! text-white!`} disabled={busy||!preview.valid||disabled} onClick={()=>void request('APPLY')}>{busy?'Guardando…':`Confirmar carga de ${preview.rows.length} productos`}</button>
  </div>}</div>}
  {message&&<p role="status" className="rounded-xl bg-emerald-50 p-3 text-emerald-900">{message}</p>}{error&&<p role="alert" className="rounded-xl bg-red-50 p-3 text-red-900">{error}</p>}
 </section>;
}
