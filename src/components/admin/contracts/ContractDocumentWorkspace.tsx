'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ContractOperationsPanel } from './ContractOperationsPanel';
import { useAuth } from '@/components/AuthProvider';
import { DOCUMENT_LABELS, type DocumentType } from '@/lib/budgetAcceptanceV2';
import { documentStages, pendingLegalRequirements, type ContractDocumentDossier } from '@/lib/contractDocuments/workflow';
import { btn } from './ContractDataFields';
type SampleManifest={contractNumber:string;snapshotId:string;snapshotHash:string;projectionHash:string;definitions:{contract:{templateVersion:string};promissoryNote:{templateVersion:string}};artifacts:{mandate:{sha256:string;pages:number};promissoryNote:{sha256:string;pages:number}};proposedPromissoryNoteAmount:{amount:number;status:string;enforceableAmount:null}};
const stageLabels={DRAFT:'Borrador',TECHNICAL_REVIEW:'Revisión técnica · READY',TERMS_FROZEN:'Términos congelados · sólo Emulator',FORMALIZED:'Formalización · requiere firmas físicas y aprobación legal'};
export function ContractDocumentWorkspace({budgetId,version,revision}:{budgetId:string;version:number;revision:number}){
  const {user}=useAuth(),[loadedDossier,setDossier]=useState<ContractDocumentDossier|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[attempt,setAttempt]=useState(0),[sample,setSample]=useState<{manifest:SampleManifest;mandate:string;promissoryNote:string}|null>(null);
  const urls=useRef<string[]>([]),sampleRequest=useRef<AbortController|null>(null);
  const endpoint=`/api/admin/presupuestos-v2/${encodeURIComponent(budgetId)}/versions/${version}/contract/documents`;
  const request=useCallback(async(url:string,signal?:AbortSignal)=>{
    if(!user)throw Error('Ingresá nuevamente.');
    const response=await fetch(url,{headers:{Authorization:`Bearer ${await user.getIdToken()}`},cache:'no-store',signal});
    if(!response.ok)throw Error('No se pudo verificar la documentación contractual.');return response;
  },[user]);
  useEffect(()=>{const controller=new AbortController();void request(endpoint,controller.signal).then(r=>r.json()).then((data:ContractDocumentDossier)=>{setDossier(data);setError('');}).catch(()=>{if(!controller.signal.aborted)setError('No se pudo verificar el expediente. Reintentá la consulta del expediente.');});return()=>controller.abort();},[endpoint,revision,request,attempt]);
  useEffect(()=>()=>{sampleRequest.current?.abort();urls.current.forEach(url=>URL.revokeObjectURL(url));},[]);
  async function loadSample(){
    if(busy)return;setBusy(true);setError('');const controller=new AbortController();sampleRequest.current=controller;
    try{
      const responses=await Promise.all(['manifest','mandate','promissoryNote'].map(kind=>request(`/api/admin/contract-document-samples/${kind}`,controller.signal)));
      const manifest=await responses[0].json() as SampleManifest,mandate=await responses[1].arrayBuffer(),note=await responses[2].arrayBuffer();
      for(const [bytes,hash] of [[mandate,manifest.artifacts.mandate.sha256],[note,manifest.artifacts.promissoryNote.sha256]] as const){
        const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))).map(v=>v.toString(16).padStart(2,'0')).join('');if(digest!==hash)throw Error('PDF_INTEGRITY');
      }
      if(controller.signal.aborted)return;
      urls.current.forEach(url=>URL.revokeObjectURL(url));urls.current=[URL.createObjectURL(new Blob([mandate],{type:'application/pdf'})),URL.createObjectURL(new Blob([note],{type:'application/pdf'}))];
      setSample({manifest,mandate:urls.current[0],promissoryNote:urls.current[1]});
    }catch(error){if(!controller.signal.aborted)setError(error instanceof Error&&error.message==='PDF_INTEGRITY'?'La integridad de los PDF no coincide. No se mostraron los documentos recibidos.':'Muestras no disponibles. Sólo pueden visualizarse en Emulator local; no se emitieron documentos.');}finally{if(!controller.signal.aborted)setBusy(false);}
  }
  const dossier=loadedDossier?.draftRevision===revision?loadedDossier:null;
  const panel='min-w-0 space-y-3 rounded-xl border border-border-color bg-surface p-4';
  return <section className={`${panel} space-y-5`} data-testid="contract-document-workspace"><h2 className="font-heading text-2xl font-bold">Documentación contractual</h2>
    <p>Emisión: sólo revisión. Aprobación jurídica pendiente. Congelamiento productivo y formalización deshabilitados.</p>
    {error&&<div><p role="alert">{error}</p>{!dossier&&<button className={btn} onClick={()=>setAttempt(v=>v+1)}>Reintentar expediente</button>}</div>}
    {!dossier?<p>Consultando expediente documental…</p>:<>
      <ol className="grid gap-2 sm:grid-cols-2" aria-label="Estados documentales">{documentStages.map(stage=><li key={stage} className="rounded-lg border border-border-color p-3" aria-current={dossier.stage===stage?'step':undefined}>{stageLabels[stage]}{dossier.stage===stage?' · Estado actual':''}</li>)}</ol>
      <section className={panel}><h3 className="font-bold">Expediente y presupuesto aceptado</h3><p className="break-all">{dossier.budgetId} · Versión {dossier.budgetVersion} · Opción {dossier.acceptedOptionId}</p><p>{dossier.referenceName}</p><p>Aceptado: {dossier.acceptedAt} · Borrador revisión {dossier.draftRevision}</p><p>Planes ofrecidos: {dossier.offeredPlans.join(', ')} cuotas</p>
        <p>Documentación asociada, opcional:</p>{dossier.documentation.length?dossier.documentation.map(slot=><p key={slot.type}>{DOCUMENT_LABELS[slot.type as DocumentType]}: {{SIN_CARGAR:'Sin cargar',CARGADO:'Cargado',OBSERVADO:'Observado'}[slot.status]??'Estado no reconocido'} · {slot.count} archivo(s)</p>):<p>Sin documentación asociada registrada.</p>}
      </section>
      <section className={panel}><h3 className="font-bold">Evidencia técnica disponible</h3>{dossier.readiness?<><p>Revisión READY verificada: {dossier.readiness.reviewedAt}</p><p className="break-all">Responsable: {dossier.readiness.reviewedBy}</p><p className="break-all">Hash de evidencia: {dossier.readiness.evidenceHash}</p><p className="break-all">Digest de términos: {dossier.readiness.termsDigest}</p></>:<p>Sin evidencia READY vigente. Guardar datos no equivale a revisión ni a congelamiento.</p>}
        {dossier.snapshot?<><p>Número: {dossier.snapshot.contractNumber}</p><p className="break-all">Snapshot: {dossier.snapshot.snapshotId} · SHA-256 {dossier.snapshot.snapshotHash}</p><p>Plantillas congeladas: {dossier.snapshot.templateVersions.join(' / ')}</p></>:<p>Sin snapshot congelado. No se asigna número desde esta vista.</p>}
        <p>Conservación privada: adaptador exclusivo de Emulator.</p>{dossier.archives.map(record=><div key={record.documentSetId} className="space-y-1 break-all"><p>{record.state==='COMPLETE'?'Conservación completa registrada':'Conservación pendiente de reconciliación'} · {record.documentSetId}</p>{record.artifacts.map(a=><p key={a.kind}>{a.kind==='mandate'?'Mandato':'Pagaré'} · {a.templateVersion} · {a.pages} página(s) · SHA-256 {a.sha256}</p>)}</div>)}
      </section>
      <section className={panel}><h3 className="font-bold">Requisitos pendientes</h3><ul className="list-disc pl-5">{pendingLegalRequirements.map(item=><li key={item}>{item}</li>)}</ul><p>READY y términos congelados no acreditan firma física. No existe una acción para marcar FORMALIZED en esta etapa.</p></section>
      <section className={panel} data-testid="contract-document-samples"><h3 className="font-bold">Vista previa — muestras sintéticas</h3><p>Los ejemplos no corresponden al cliente ni al presupuesto de este expediente. No se guardan en su legajo. BORRADOR — NO VÁLIDO PARA FIRMA.</p>
        <button className={btn} disabled={busy||!dossier.sampleAvailable} onClick={()=>void loadSample()}>{busy?'Verificando PDF…':'Visualizar PDFs sintéticos'}</button>{!dossier.sampleAvailable&&<p>Disponible exclusivamente en el entorno Emulator local. Emisión productiva deshabilitada.</p>}
        {sample&&<div className="min-w-0 space-y-4" data-testid="contract-sample-loaded"><p>Muestra: {sample.manifest.contractNumber} · Mandato 2 páginas / pagaré 1 página</p><p>Importe del pagaré (decisión comercial): {new Intl.NumberFormat('es-AR',{style:'currency',currency:'ARS'}).format(sample.manifest.proposedPromissoryNoteAmount.amount)} · Pendiente de aprobación jurídica. Validez y exigibilidad sujetas a revisión profesional.</p><p className="break-all">Snapshot sintético SHA-256: {sample.manifest.snapshotHash}</p><p>Plantillas: {sample.manifest.definitions.contract.templateVersion} / {sample.manifest.definitions.promissoryNote.templateVersion}</p>{(['mandate','promissoryNote'] as const).map(kind=><div key={kind}><h4 className="font-bold">{kind==='mandate'?'Contrato de mandato':'Pagaré'}</h4><a className={`${btn} inline-flex items-center`} href={sample[kind]} target="_blank" rel="noreferrer">Abrir PDF de muestra</a><iframe title={kind==='mandate'?'Muestra sintética de mandato':'Muestra sintética de pagaré'} src={sample[kind]} className="mt-2 h-[560px] w-full rounded border border-border-color"/></div>)}</div>}
      </section>
      <ContractOperationsPanel budgetId={budgetId} version={version}/>
    </>}
  </section>;
}
