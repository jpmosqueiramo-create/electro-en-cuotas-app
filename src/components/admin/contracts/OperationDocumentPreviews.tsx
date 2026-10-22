'use client';
import { useEffect,useRef,useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import type { OperationDraftProjection } from '@/lib/contractDocuments/operationDraft';
import { btn } from './ContractDataFields';
import { documentPreviewMessages,type DocumentPreviewCode } from '@/lib/contractDocuments/previewErrors';
type Artifact={base64:string;sha256:string;pages:number};
type Payload={projection:OperationDraftProjection;available:boolean;code?:DocumentPreviewCode|null;templateVersion?:string;mandate?:Artifact;promissoryNote?:Artifact};
export function OperationDocumentPreviews({budgetId,version,revision}:{budgetId:string;version:number;revision:number}){
 const {user}=useAuth(),[loaded,setLoaded]=useState<{key:string;value:Payload}|null>(null),[failure,setFailure]=useState<{key:string;text:string}|null>(null),[attempt,setAttempt]=useState(0),[view,setView]=useState<{key:string;kind:'mandate'|'promissoryNote';url:string}|null>(null);
 const selection=useRef({value:0}),urls=useRef<string[]>([]),key=JSON.stringify([budgetId,version,revision,attempt,user?.uid]);
 useEffect(()=>{
  const controller=new AbortController();
  async function read(){
   try{
    if(!user)throw Error();
    const r=await fetch(`/api/admin/presupuestos-v2/${encodeURIComponent(budgetId)}/versions/${version}/contract/documents/preview`,{headers:{Authorization:`Bearer ${await user.getIdToken()}`},cache:'no-store',signal:controller.signal});
    const response=await r.json();if(!r.ok){const code=response.code as DocumentPreviewCode;if(!controller.signal.aborted)setFailure({key,text:Object.hasOwn(documentPreviewMessages,code)?documentPreviewMessages[code]:documentPreviewMessages.DOCUMENT_SERVER_ERROR});return;}const value=response as Payload;
    if(value.projection.budgetId!==budgetId||value.projection.budgetVersion!==version||value.projection.draftRevision!==revision)throw Error();
    if(!controller.signal.aborted)setLoaded({key,value});
   }catch{if(!controller.signal.aborted)setFailure({key,text:'No se pudo verificar la vista previa. Revisá los datos guardados y volvé a consultar.'});}
  }
  void read();const currentUrls=urls.current,currentSelection=selection.current;
  return()=>{currentSelection.value++;controller.abort();currentUrls.splice(0).forEach(url=>URL.revokeObjectURL(url));};
 },[budgetId,version,revision,user,key]);
 const value=loaded?.key===key?loaded.value:null,error=failure?.key===key?failure.text:'';
 async function open(kind:'mandate'|'promissoryNote'){
  if(!value?.available)return;const artifact=value[kind];if(!artifact)return;const selected=++selection.current.value;
  try{
   const bytes=Uint8Array.from(atob(artifact.base64),c=>c.charCodeAt(0));
   const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))).map(v=>v.toString(16).padStart(2,'0')).join('');
   if(selected!==selection.current.value)return;if(hash!==artifact.sha256)throw Error();
   const url=URL.createObjectURL(new Blob([bytes],{type:'application/pdf'}));urls.current.forEach(u=>URL.revokeObjectURL(u));urls.current.splice(0,urls.current.length,url);setView({key,kind,url});
  }catch{if(selected!==selection.current.value)return;setFailure({key,text:'No se pudo comprobar la integridad del PDF. No se mostró el documento.'});setView(null);}
 }
 function close(){selection.current.value++;urls.current.splice(0).forEach(url=>URL.revokeObjectURL(url));setView(null);}
 function go(section:string){const selector=section==='data'?'[data-testid=contract-personal]':section==='terms'?'[data-testid=contract-economics]':section==='schedule'?'[data-testid=contract-schedule]':'[data-testid=credit-review]';const el=document.querySelector(selector);if(el instanceof HTMLDetailsElement)el.open=true;el?.scrollIntoView({behavior:'smooth',block:'start'});}
 return <section className="min-w-0 space-y-3 rounded-xl border border-border-color bg-surface p-4" data-testid="operation-document-previews"><h3 className="font-heading text-xl font-bold">Documentos de la operación</h3>
  <p className="font-bold text-warning">BORRADOR — NO VÁLIDO PARA FIRMA</p><p>Vistas previas de los datos guardados. No asignan número contractual, no acreditan firmas y no habilitan emisión definitiva. Aprobación jurídica pendiente.</p>
  {error&&<p role="alert">{error}</p>}
  {!value&&!error&&<p>Consultando la versión guardada…</p>}
  <div className="flex flex-col gap-3 sm:flex-row">{(['mandate','promissoryNote'] as const).map(kind=><button key={kind} className={btn} disabled={!value?.available||!!error} onClick={()=>void open(kind)}>{kind==='mandate'?'Contrato de mandato':'Pagaré'} — Ver vista previa</button>)}</div>
  <button className={btn} onClick={()=>setAttempt(n=>n+1)}>Actualizar vistas previas guardadas</button>
  {value&&<>{value.code&&<p role={value.available?'status':'alert'}>{documentPreviewMessages[value.code]}</p>}<p>Versión guardada del borrador: {value.projection.draftRevision}. {value.available?'Ambos documentos usan los mismos datos persistidos.':'Revisá la identidad o la conformidad pendiente antes de generar documentos.'}</p><h4 className="font-bold">Pendientes de revisión</h4><ul className="space-y-2">{value.projection.pending.map(item=><li key={item.label} className="break-words">{item.label}{item.section!=='legal'&&<button className="ml-2 min-h-11 underline" onClick={()=>go(item.section)}>Revisar sección</button>}</li>)}</ul></>}
  {view?.key===key&&!error&&<div className="min-w-0 space-y-2" data-testid="operation-document-open"><button className={btn} onClick={close}>Cerrar vista previa</button><h4 className="font-bold">{view.kind==='mandate'?'Contrato de mandato':'Pagaré'} · Borrador</h4><a className={`${btn} inline-flex`} href={view.url} target="_blank" rel="noreferrer">Abrir PDF para revisión e impresión</a><p className="sm:hidden">En celular, abrí el PDF para verlo completo o imprimirlo con el visor de tu dispositivo.</p><p className="hidden text-sm sm:block">Si el visor no muestra el documento, usá el enlace para abrir el PDF completo.</p><iframe title="Documento de la operación en borrador" src={view.url} className="hidden h-[560px] w-full rounded border border-border-color sm:block"/></div>}
 </section>;
}
