"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {loadAuthorizedRequestPage, type RequestPageCursors} from "@/lib/adminSolicitudesHttpReader";
import { useAuth } from "@/components/AuthProvider";
import { PageHeader } from "@/components/PageHeader";
import { ReferenceConfigurator, Field } from "../references/ReferenceConfigurator";
import { createCatalogReferenceDraft, type CatalogReferenceDraft } from "@/lib/catalogReferenceEditor";
import { referenceConfiguratorReducer } from "@/lib/referenceConfigurator";
import { buildBudgetOptionV2 } from "@/lib/budgetReferenceV2";
import { uploadCatalogReferenceImage } from "@/lib/catalogReferenceImages";
import { budgetClientLines, duplicateBudgetOption, referenceSnapshotToDraft, replaceBudgetOption, toClientBudgetV2, type BudgetV2 } from "@/lib/budgetV2";
import { downloadBudgetPdfV2 } from "@/lib/budgetV2Pdf";

import {AdminRecordRemoval} from '../AdminRecordRemoval';
import type {AdminRecordStatus} from '@/lib/adminRecordRemoval';
import { BudgetV2Deletion } from "./BudgetV2Deletion";
import { BudgetAcceptanceDocumentation } from "./BudgetAcceptanceDocumentation";

type Source={sourceCollection:BudgetV2["sourceCollection"];id:string;nombre:string;dni:string;cuil:string;whatsapp:string;localidad:string;necesidad:string};
type Reference=Record<string,unknown>&{id:string;nombre:string};
const button="min-h-11 rounded-xl border border-border-color bg-surface px-4 py-2 text-sm font-semibold text-brand-primary disabled:opacity-40";
const input="min-h-11 w-full min-w-0 rounded-xl border border-border-color bg-surface px-3 py-2";
export function BudgetV2Workspace(){
  const {user}=useAuth();const params=useSearchParams();
  const [administrativeStates,setAdministrativeStates]=useState<Record<string,AdminRecordStatus>>({}),[showRemoved,setShowRemoved]=useState(false);
  const [sources,setSources]=useState<Source[]>([]),[references,setReferences]=useState<Reference[]>([]),[budgets,setBudgets]=useState<BudgetV2[]>([]);
  const [budget,setBudget]=useState<BudgetV2|null>(null),[draft,setDraft]=useState<CatalogReferenceDraft|null>(null);
  const [optionId,setOptionId]=useState(""),[referenceId,setReferenceId]=useState<string|null>(null),[optionSource,setOptionSource]=useState<"EXISTING_REFERENCE"|"NEW_REFERENCE">("NEW_REFERENCE");
  const [privateIds,setPrivateIds]=useState<string[]>([]),[savePrivate,setSavePrivate]=useState(false);
  const [files,setFiles]=useState<File[]>([]),[url,setUrl]=useState(""),[busy,setBusy]=useState(false),[error,setError]=useState(""),[message,setMessage]=useState(""),[q,setQ]=useState(""),[stateFilter,setStateFilter]=useState("TODOS"),[whatsapp,setWhatsapp]=useState("");
  const [confirmManualSource,setConfirmManualSource]=useState(false);
  const [deleting,setDeleting]=useState<BudgetV2|null>(null);
  const [loading,setLoading]=useState(true);
  const flight=useRef(false);const pending=useRef<{key:string;body:string}|null>(null);
  const request=useCallback(async(body?:string)=>{
    if(!user)throw new Error("Ingresá nuevamente.");
    const response=await fetch("/api/admin/presupuestos-v2",{method:body?"POST":"GET",cache:"no-store",headers:{Authorization:`Bearer ${await user.getIdToken()}`,"Content-Type":"application/json"},...(body?{body}:{})});
    const data=await response.json();if(!response.ok)throw new Error(data.error??"No se pudo completar la operación.");return data;
  },[user]);
  const refresh=useCallback(async()=>{const data=await request();setBudgets(data.budgets as BudgetV2[]);setAdministrativeStates(data.administrativeStates??{});},[request]);
  useEffect(()=>{
    setSources([]);setReferences([]);setBudgets([]);setAdministrativeStates({});setBudget(null);setDraft(null);setLoading(true);
    if(!user)return;let current=true;const abort=new AbortController();
    const report=(label:string)=>{if(current)setError(previous=>previous?previous+' '+label:label);};setError('');
    async function loadSources(){
      let cursors:RequestPageCursors={};const list:Source[]=[];
      do{
        const page=await loadAuthorizedRequestPage(user!,cursors,abort.signal);
        for(const i of page.items)list.push({sourceCollection:i.sourceCollection,id:i.documentId,nombre:i.nombreCliente??'',dni:i.dni??'',cuil:i.cuil??'',whatsapp:i.telefono??'',localidad:i.localidad??'',necesidad:i.productoONecesidad??''});
        if(current)setSources([...list]);
        if(Object.keys(page.errors).length){report('No se pudieron cargar todas las solicitudes de origen.');break;}
        cursors=page.cursors;
      }while(current&&Object.values(cursors).some(c=>c!==null));
    }
    async function loadReferences(){
      const items:Reference[]=[];let cursor:string|null=null;
      do{
        const response=await fetch('/api/admin/presupuestos-v2/references'+(cursor?'?cursor='+encodeURIComponent(cursor):''),{headers:{Authorization:`Bearer ${await user!.getIdToken()}`},cache:'no-store',signal:abort.signal});
        if(!response.ok)throw Error();const page=await response.json() as {items:Reference[];nextCursor:string|null};
        items.push(...page.items.map(d=>({...d,nombre:String(d.nombre??'')})));cursor=page.nextCursor;
        if(current)setReferences([...items]);
      }while(current&&cursor);
    }
    // A failed optional origin/catalog read cannot erase an authorized budget history.
    void Promise.allSettled([
      loadSources().catch(()=>report('No se pudieron consultar las solicitudes.')),
      loadReferences().catch(()=>report('No se pudieron consultar las referencias del catálogo.')),
      request().then(data=>{if(current){setBudgets(data.budgets);setAdministrativeStates(data.administrativeStates??{});}}).catch(()=>report('No se pudo consultar el historial de presupuestos.')),
    ]).finally(()=>{if(current)setLoading(false);});
    return()=>{current=false;abort.abort();};
  },[user,request]);
  const linkedBudgetOpened=useRef<string|null>(null);
  useEffect(()=>{
    const id=params.get('budgetId'),version=params.get('version');
    const key=JSON.stringify([id,version,params.get('sourceCollection'),params.get('solicitudId')]);
    if(loading||!id||!version||linkedBudgetOpened.current===key)return;
    linkedBudgetOpened.current=key;
    const linked=budgets.find(b=>b.id===id&&String(b.version)===version&&b.sourceCollection===params.get('sourceCollection')&&b.solicitudId===params.get('solicitudId'));
    if(linked)setBudget(structuredClone(linked));else setError('No se encontró el presupuesto vinculado a esta solicitud.');
  },[budgets,loading,params]);
  function selectSource(key:string){if(!budget||budget.revision>0)return;const source=sources.find(s=>`${s.sourceCollection}:${s.id}`===key);if(!source)return;setBudget({...budget,sourceCollection:source.sourceCollection,solicitudId:source.id,clienteSnapshot:{nombre:source.nombre,dni:source.dni,cuil:source.cuil,whatsapp:source.whatsapp,localidad:source.localidad}});}
  function newBudget(){const now=new Date().toISOString();const id=params.get("solicitudId"),collection=params.get("sourceCollection");const matches=sources.filter(s=>s.id===id&&(!collection||s.sourceCollection===collection));const source=matches.length===1?matches[0]:undefined;
    if(id&&!source){setError("La solicitud indicada no está disponible. Reintentá cuando termine la carga; no se creó otro origen.");return;}
    setConfirmManualSource(false);
    setBudget({schemaVersion:"BUDGET_V2",id:crypto.randomUUID(),version:1,sourceCollection:source?.sourceCollection??"solicitudes_cuenta",solicitudId:source?.id??"",clienteSnapshot:{nombre:source?.nombre??params.get("nombre")??"",dni:source?.dni??params.get("dni")??"",cuil:source?.cuil??"",whatsapp:source?.whatsapp??params.get("telefono")??"",localidad:source?.localidad??params.get("localidad")??""},options:[],estado:"GENERADO",createdAt:now,updatedAt:now,issuedAt:null,revision:0,revisionOf:null});setDraft(null);setPrivateIds([]);setError("");setMessage("");setWhatsapp("");pending.current=null;
  }
  function beginOption(reference?:Reference){if(!budget||budget.estado==="EMITIDO")return;setOptionId(crypto.randomUUID());setDraft(createCatalogReferenceDraft(reference));setReferenceId(reference?.id??null);setOptionSource(reference?"EXISTING_REFERENCE":"NEW_REFERENCE");setSavePrivate(false);setFiles([]);setUrl("");setError("");if(!reference){const source=sources.find(s=>s.sourceCollection===budget.sourceCollection&&s.id===budget.solicitudId);setDraft(d=>d?{...d,nombre:source?.necesidad??params.get("producto")??""}:d);}}
  async function incorporate(){if(!draft||!budget||flight.current)return;flight.current=true;setBusy(true);setError("");try{
    const urls=[...draft.imagenUrls];if(url.trim()&&!urls.includes(url.trim()))urls.push(url.trim());if(urls.length+files.length>4)throw new Error("Usá hasta 4 imágenes.");
    buildBudgetOptionV2(optionId,{draft:{...draft,imagenUrls:urls},fechaCotizacion:new Date().toISOString(),...(optionSource==="EXISTING_REFERENCE"?{source:optionSource,referenceId:referenceId!}:{source:"NEW_REFERENCE",referenceId:null})});
    const uploaded:string[]=[];for(const file of files)uploaded.push(await uploadCatalogReferenceImage(file));
    const option=buildBudgetOptionV2(optionId,{draft:{...draft,imagenUrls:[...urls,...uploaded]},fechaCotizacion:new Date().toISOString(),...(optionSource==="EXISTING_REFERENCE"?{source:optionSource,referenceId:referenceId!}:{source:optionSource,referenceId:null})});
    const bound=optionSource==="NEW_REFERENCE"&&referenceId?{...option,referenceSnapshot:{...option.referenceSnapshot,referenceId}}:option;
    setBudget({...budget,options:replaceBudgetOption(budget.options,bound)});setPrivateIds(ids=>[...ids.filter(id=>id!==optionId),...(savePrivate?[optionId]:[])]);setDraft(null);setFiles([]);setUrl("");
  }catch(e){setError((e as Error).message);}finally{flight.current=false;setBusy(false);}}
  async function command(action:"SAVE"|"ISSUE"|"REVISE"){
    if(!budget||flight.current)return;if(draft){setError("Incorporá o descartá la opción antes de guardar.");return;}
    flight.current=true;setBusy(true);setError("");try{
      const createManualSource=!budget.solicitudId;
      if(createManualSource&&(!confirmManualSource||action!=="SAVE"))throw new Error("Confirmá la creación de una solicitud de origen para este presupuesto manual.");
      const payloadBudget=createManualSource?{...budget,sourceCollection:"solicitudes_cuenta" as const,solicitudId:`budget_manual_${budget.id}`}:budget;
      const key=JSON.stringify({action,budget:payloadBudget,privateIds,createManualSource});if(pending.current?.key!==key)pending.current={key,body:JSON.stringify({action,budget:payloadBudget,privateOptionIds:privateIds,expectedRevision:budget.revision,commandId:crypto.randomUUID(),...(createManualSource?{createManualSource:true}:{})})};
      const data=await request(pending.current.body);
      if(createManualSource){const c=payloadBudget.clienteSnapshot;setSources(previous=>previous.some(s=>s.sourceCollection===payloadBudget.sourceCollection&&s.id===payloadBudget.solicitudId)?previous:[...previous,{sourceCollection:payloadBudget.sourceCollection,id:payloadBudget.solicitudId,nombre:c.nombre,dni:c.dni,cuil:c.cuil,whatsapp:c.whatsapp,localidad:c.localidad,necesidad:payloadBudget.options.map(o=>o.referenceSnapshot.nombre).join(" / ")}]);}
      setBudget(data.budget);pending.current=null;setMessage(action==="ISSUE"?"Presupuesto emitido y archivado. Versión inmutable.":action==="REVISE"?"Nueva revisión editable creada.":"Presupuesto V2 guardado.");await refresh();
    }catch(e){setError((e as Error).message);}finally{flight.current=false;setBusy(false);}
  }
  const emitted=budget?.estado==="EMITIDO";
  const visible=budgets.filter(b=>(showRemoved||!administrativeStates[b.id]||administrativeStates[b.id].state==='ACTIVE')&&(stateFilter==="TODOS"||b.estado===stateFilter)&&`${b.id} ${b.clienteSnapshot.nombre} ${b.clienteSnapshot.dni} ${b.options.map(o=>o.referenceSnapshot.nombre).join(" ")}`.toLocaleLowerCase().includes(q.toLocaleLowerCase()));
  return <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-7">
    {deleting&&<BudgetV2Deletion budget={deleting} onClose={()=>setDeleting(null)} onDeleted={async()=>{if(budget?.id===deleting.id){setBudget(null);setDraft(null);pending.current=null;}setDeleting(null);setMessage("Familia de presupuesto eliminada. La solicitud de origen se conservó.");await refresh();}}/>}
    <PageHeader title="Presupuestos" subtitle="Propuestas de gestión de compra · Opciones alternativas y cuotas estimadas" actions={<button data-new-budget-v2 className={button} disabled={busy||loading} onClick={()=>newBudget()}>Nuevo presupuesto V2</button>}/>
    {error&&<p role="alert" className="rounded-xl bg-red-50 p-4 text-red-800">{error}</p>}{message&&<p role="status" className="rounded-xl border border-border-color p-4">{message}</p>}
    {budget&&(!administrativeStates[budget.id]||administrativeStates[budget.id].state==='ACTIVE')&&<section data-testid="budget-v2-editor" className="min-w-0 space-y-4 rounded-2xl border border-border-color bg-surface p-4 sm:p-6">
      <div className="flex flex-wrap justify-between gap-3"><h2 className="font-heading text-xl font-bold">Presupuesto V2 · Versión {budget.version} · {budget.estado}</h2><div className="flex flex-wrap gap-3"><button data-testid="budget-editor-delete" className={button} disabled={busy||budget.revision===0} title={budget.revision===0?"Guardá el presupuesto antes de eliminarlo.":undefined} onClick={()=>setDeleting(budget)}>Eliminar presupuesto</button><button className={button} disabled={busy} onClick={()=>{setBudget(null);setDraft(null);}}>Cerrar presupuesto</button></div></div>
      <p className="break-all text-xs text-text-secondary">{budget.id}</p>
      <fieldset disabled={busy||emitted} className="grid min-w-0 gap-4 sm:grid-cols-2">
        <Field label="Solicitud de origen"><select className={input} value={budget.solicitudId?`${budget.sourceCollection}:${budget.solicitudId}`:""} disabled={budget.revision>0} onChange={e=>selectSource(e.target.value)}><option value="">Seleccioná colección y solicitud</option>{sources.map(s=><option key={`${s.sourceCollection}:${s.id}`} value={`${s.sourceCollection}:${s.id}`}>{s.nombre||s.id} · {s.sourceCollection} · {s.id}</option>)}</select></Field>
        {([['nombre','Nombre del cliente'],['dni','DNI'],['cuil','CUIL'],['whatsapp','WhatsApp'],['localidad','Localidad']] as const).map(([key,label])=><Field key={key} label={label}><input className={input} value={budget.clienteSnapshot[key]} onChange={e=>setBudget({...budget,clienteSnapshot:{...budget.clienteSnapshot,[key]:e.target.value}})}/></Field>)}
      </fieldset>
      {!budget.solicitudId&&<label className="flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" checked={confirmManualSource} onChange={e=>setConfirmManualSource(e.target.checked)}/>Confirmo crear una solicitud de origen para este presupuesto manual al guardar. No se registra aceptación.</label>}
      <div data-testid="budget-v2-options" className="space-y-4">{budget.options.map((o,i)=><article key={o.optionId} data-option-id={o.optionId} className="min-w-0 rounded-xl border border-border-color p-4"><h3 className="font-heading font-bold">Opción {i+1} · {o.referenceSnapshot.nombre}</h3>{o.referenceSnapshot.imagenUrls[0]&&<> {/* eslint-disable-next-line @next/next/no-img-element */}
<img alt="Referencia propuesta" src={o.referenceSnapshot.imagenUrls[0]} className="mt-3 size-24 rounded-lg object-contain"/></>}<p className="mt-2 whitespace-pre-wrap break-words text-sm">{o.referenceSnapshot.descripcion}</p><ul className="my-3 space-y-1">{o.referenceSnapshot.planesOfrecidos.map(p=><li key={p.cuotas}>{p.cuotas} cuotas estimadas de ${p.cuotaEstimada.toLocaleString("es-AR")}</li>)}</ul>
        {!emitted&&<div className="flex flex-wrap gap-2"><button className={button} disabled={busy} onClick={()=>{setOptionId(o.optionId);setDraft(referenceSnapshotToDraft(o.referenceSnapshot));setReferenceId(o.referenceSnapshot.referenceId);setOptionSource(o.referenceSnapshot.source);setSavePrivate(privateIds.includes(o.optionId));setFiles([]);setUrl("");}}>Editar opción {i+1}</button><button className={button} disabled={busy} onClick={()=>setBudget({...budget,options:[...budget.options,duplicateBudgetOption(o,crypto.randomUUID())]})}>Duplicar opción {i+1}</button><button className={button} disabled={busy} onClick={()=>{setBudget({...budget,options:budget.options.filter(x=>x.optionId!==o.optionId)});setPrivateIds(ids=>ids.filter(id=>id!==o.optionId));}}>Eliminar opción {i+1}</button></div>}
      </article>)}</div>
      {!emitted&&<div className="flex flex-wrap items-end gap-3"><Field label="Agregar referencia existente"><select className={input} value="" disabled={busy} onChange={e=>{const reference=references.find(r=>r.id===e.target.value);if(reference)beginOption(reference);}}><option value="">Elegí una referencia privada</option>{references.map(r=><option key={r.id} value={r.id}>{r.nombre}</option>)}</select></Field><button className={button} disabled={busy} onClick={()=>beginOption()}>Nueva referencia para presupuesto</button></div>}
      {draft&&!emitted&&<fieldset disabled={busy} data-testid="budget-reference-configurator" className="min-w-0 space-y-4 rounded-xl bg-background-main p-3"><p className="text-sm">Los cambios de esta opción se aplican sólo a este presupuesto.</p>
        <ReferenceConfigurator context="BUDGET" draft={draft} onChange={patch=>setDraft(d=>d?referenceConfiguratorReducer(d,{type:"patch",patch}):d)} files={files} externalUrl={url} onExternalUrlChange={setUrl} onRemoveFile={i=>setFiles(f=>f.filter((_,n)=>n!==i))} onAddFiles={selected=>{if(draft.imagenUrls.length+files.length+selected.length+(url.trim()?1:0)>4)setError("Usá hasta 4 imágenes.");else setFiles(f=>[...f,...selected]);}} onAddUrl={()=>{if(!url.trim()||draft.imagenUrls.includes(url.trim()))return;if(draft.imagenUrls.length+files.length>=4){setError("Usá hasta 4 imágenes.");return;}setDraft({...draft,imagenUrls:[...draft.imagenUrls,url.trim()]});setUrl("");}}/>
        {optionSource==="NEW_REFERENCE"&&<label className="flex min-h-11 items-center gap-3"><input type="checkbox" checked={savePrivate} onChange={e=>setSavePrivate(e.target.checked)}/>Guardar también como referencia privada</label>}
        <div className="flex flex-wrap gap-3"><button className={button} onClick={()=>void incorporate()}>Incorporar opción</button><button className={button} onClick={()=>setDraft(null)}>Descartar edición de opción</button></div>
      </fieldset>}
      <div className="flex flex-wrap gap-3">{!emitted?<><button className={button} disabled={busy} onClick={()=>void command("SAVE")}>Guardar presupuesto</button><button className={button} disabled={busy||budget.revision===0} onClick={()=>{if(window.confirm("¿Emitir y archivar esta versión? Ya no podrá editarse."))void command("ISSUE");}}>Emitir y archivar presupuesto</button></>:<><p className="w-full text-sm">Versión emitida de sólo lectura. Los importes provienen de sus snapshots.</p><button className={button} disabled={busy} onClick={()=>{setError("");void downloadBudgetPdfV2(toClientBudgetV2(budget)).catch(()=>setError("No se pudo generar el PDF."));}}>PDF V2</button><button className={button} onClick={()=>setWhatsapp(budgetClientLines(toClientBudgetV2(budget)).join("\n"))}>Preparar WhatsApp</button><button className={button} disabled={busy} onClick={()=>void command("REVISE")}>Crear nueva revisión</button></>}</div>
      {emitted&&<BudgetAcceptanceDocumentation key={`${budget.id}:${budget.version}`} budget={budget}/>}
      {whatsapp&&emitted&&<div className="space-y-3"><pre data-testid="budget-whatsapp" className="whitespace-pre-wrap break-words rounded-xl bg-background-main p-4 text-sm">{whatsapp}</pre><a className={button} target="_blank" rel="noopener noreferrer" href={`https://wa.me/${budget.clienteSnapshot.whatsapp.replace(/\D/g,"")}?text=${encodeURIComponent(whatsapp)}`}>Abrir WhatsApp con esta propuesta</a></div>}
    </section>}
    {budget&&administrativeStates[budget.id]&&administrativeStates[budget.id].state!=='ACTIVE'&&<section className="space-y-3 rounded-xl border p-4"><p>Este presupuesto está retirado de la bandeja. Sus registros originales se conservan.</p><AdminRecordRemoval subject={{kind:'BUDGET',id:budget.id}} removed onChanged={refresh}/></section>}
    <label className="flex min-h-11 items-center gap-3"><input type="checkbox" checked={showRemoved} onChange={e=>setShowRemoved(e.target.checked)}/>Mostrar eliminados y archivados</label>
    <section className="space-y-3"><h2 className="font-heading text-xl font-bold">Historial V2</h2><div className="grid gap-3 sm:grid-cols-2"><Field label="Buscar presupuesto V2"><input className={input} value={q} onChange={e=>setQ(e.target.value)}/></Field><Field label="Estado V2"><select className={input} value={stateFilter} onChange={e=>setStateFilter(e.target.value)}><option>TODOS</option><option>GENERADO</option><option>EMITIDO</option></select></Field></div>{visible.map(b=><article className="flex min-w-0 flex-wrap items-center justify-between gap-3 rounded-xl border border-border-color bg-surface p-4" key={`${b.id}:${b.version}`}><div><h3 className="font-semibold">{b.clienteSnapshot.nombre} · V2 · Versión {b.version}</h3><p>{administrativeStates[b.id]?.state&&administrativeStates[b.id].state!=='ACTIVE'?'Retirado · ':''}{b.estado} · {b.options.length} opciones alternativas</p></div><button className={button} disabled={busy||!!administrativeStates[b.id]&&administrativeStates[b.id].state!=='ACTIVE'} onClick={()=>{setBudget(structuredClone(b));setDraft(null);setPrivateIds([]);setWhatsapp("");setMessage("");setError("");pending.current=null;}}>Abrir versión {b.version}</button>{administrativeStates[b.id]&&administrativeStates[b.id].state!=='ACTIVE'?<AdminRecordRemoval subject={{kind:'BUDGET',id:b.id}} removed onChanged={refresh}/>:<button data-testid="budget-history-delete" className={button} disabled={busy} onClick={()=>setDeleting(b)}>Eliminar presupuesto</button>}</article>)}</section>
  </div>;
}
