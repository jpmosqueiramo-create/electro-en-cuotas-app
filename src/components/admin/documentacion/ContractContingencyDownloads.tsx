"use client";
import {useRef,useState} from 'react';
import {useAuth} from '@/components/AuthProvider';
import {contractContingencyModels} from '@/lib/contractContingencyModels';

export function ContractContingencyDownloads(){
 const {user}=useAuth(),[busy,setBusy]=useState<string|null>(null),[error,setError]=useState('');
 const flight=useRef(false);
 async function download(model:typeof contractContingencyModels[number]){
  if(!user||flight.current)return;
  flight.current=true;setBusy(model.id);setError('');
  try{
   const response=await fetch(`/api/admin/documentacion/modelos-contingencia?modelo=${model.id}`,{cache:'no-store',headers:{Authorization:`Bearer ${await user.getIdToken()}`}});
   if(!response.ok)throw Error('No se pudo descargar el modelo. Volvé a ingresar o intentá nuevamente.');
   const blob=await response.blob();if(!blob.type.startsWith('application/pdf'))throw Error('La respuesta no contiene un PDF.');
   const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=model.filename;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }catch(e){setError(e instanceof Error?e.message:'No se pudo descargar el modelo.');}
  finally{flight.current=false;setBusy(null);}
 }
 return <section id="modelos-contingencia" data-testid="contract-contingency" aria-labelledby="contingency-title" className="scroll-mt-6 space-y-4 rounded-2xl border border-border-color bg-surface p-4 sm:p-5">
  <div><h2 id="contingency-title" className="font-heading text-xl font-bold text-brand-primary">Modelos para contingencia</h2><p className="mt-2 text-sm text-text-secondary">Descargá y guardá estos PDF para imprimir y completar manualmente si el sistema no está disponible.</p></div>
  <div className="grid gap-3 md:grid-cols-2">{contractContingencyModels.map(model=><article key={model.id} className="min-w-0 space-y-3 rounded-xl border border-border-color bg-background-main p-4"><h3 className="font-semibold">{model.label}</h3><p className="text-sm text-text-secondary">{model.description}</p><p className="text-sm">PDF · {model.pages} {model.pages===1?'página':'páginas'} · Sin completar</p><button type="button" disabled={!user||busy!==null} aria-busy={busy===model.id} onClick={()=>void download(model)} className="min-h-11 w-full rounded-xl bg-brand-primary px-4 py-3 text-sm font-semibold text-white disabled:opacity-50 sm:w-auto">{busy===model.id?'Descargando…':`Descargar ${model.id==='contrato-anexos'?'contrato y anexos':'pagaré en pesos'}`}</button></article>)}</div>
  <p className="text-sm text-text-secondary">Son los modelos originales aprobados, con sus espacios en blanco y notas de modelo. Descargar no asigna número CH ni registra una emisión, firma o entrega. Completá todos los datos antes de firmar y conservá la propuesta aceptada y la documentación para incorporarlas después al expediente.</p>
  {error&&<p role="alert" className="rounded-xl bg-red-50 p-3 text-red-900">{error}</p>}
 </section>;
}
