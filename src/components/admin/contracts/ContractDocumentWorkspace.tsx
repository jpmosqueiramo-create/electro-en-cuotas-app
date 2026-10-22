'use client';
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { DOCUMENT_LABELS, type DocumentType } from '@/lib/budgetAcceptanceV2';
import { documentStages, pendingLegalRequirements, type ContractDocumentDossier } from '@/lib/contractDocuments/workflow';
import { btn } from './ContractDataFields';
const stageLabels={DRAFT:'Borrador',TECHNICAL_REVIEW:'Revisión técnica · READY',TERMS_FROZEN:'Términos congelados · sólo Emulator',FORMALIZED:'Formalización · requiere firmas físicas y aprobación legal'};
export function ContractDocumentWorkspace({budgetId,version,revision}:{budgetId:string;version:number;revision:number}){
  const {user}=useAuth(),[loadedDossier,setDossier]=useState<ContractDocumentDossier|null>(null),[error,setError]=useState(''),[attempt,setAttempt]=useState(0);
  const endpoint=`/api/admin/presupuestos-v2/${encodeURIComponent(budgetId)}/versions/${version}/contract/documents`;
  const request=useCallback(async(url:string,signal?:AbortSignal)=>{
    if(!user)throw Error('Ingresá nuevamente.');
    const response=await fetch(url,{headers:{Authorization:`Bearer ${await user.getIdToken()}`},cache:'no-store',signal});
    if(!response.ok)throw Error('No se pudo verificar la documentación contractual.');return response;
  },[user]);
  useEffect(()=>{const controller=new AbortController();void request(endpoint,controller.signal).then(r=>r.json()).then((data:ContractDocumentDossier)=>{setDossier(data);setError('');}).catch(()=>{if(!controller.signal.aborted)setError('No se pudo verificar el expediente. Reintentá la consulta del expediente.');});return()=>controller.abort();},[endpoint,revision,request,attempt]);
  const dossier=loadedDossier?.draftRevision===revision?loadedDossier:null;
  const panel='min-w-0 space-y-3 rounded-xl border border-border-color bg-surface p-4';
  return <section className={`${panel} space-y-5`} data-testid="contract-document-workspace"><h2 className="font-heading text-2xl font-bold">Documentación contractual</h2>
    <p>Emisión: sólo revisión. Aprobación jurídica pendiente. Congelamiento productivo y formalización deshabilitados.</p>
    {error&&<div><p role="alert">{error}</p>{!dossier&&<button className={btn} onClick={()=>setAttempt(v=>v+1)}>Reintentar expediente</button>}</div>}
    {!dossier?<p>Consultando expediente documental…</p>:<>
      <ol className="grid gap-2 sm:grid-cols-2" aria-label="Estados documentales">{documentStages.map(stage=><li key={stage} className="rounded-lg border border-border-color p-3" aria-current={dossier.stage===stage?'step':undefined}>{stageLabels[stage]}{dossier.stage===stage?' · Estado actual':''}</li>)}</ol>
      <section className={panel}><h3 className="font-bold">Expediente y presupuesto aceptado</h3><p>{dossier.referenceName}</p><p>Aceptado: {dossier.acceptedAt}</p><p>Planes ofrecidos: {dossier.offeredPlans.join(', ')} cuotas</p>
        <p>Archivos locales de este expediente. Los requisitos vigentes y documentos reutilizados se consultan en Documentación y evaluación crediticia:</p>{dossier.documentation.length?dossier.documentation.map(slot=><p key={slot.type}>{DOCUMENT_LABELS[slot.type as DocumentType]}: {{SIN_CARGAR:'Sin cargar',CARGADO:'Cargado',OBSERVADO:'Observado'}[slot.status]??'Estado no reconocido'} · {slot.count} archivo(s)</p>):<p>Sin documentación asociada registrada.</p>}
      </section>
      <section className={panel} data-testid="contract-review-status"><h3 className="font-bold">Estado de revisión del contrato</h3>
        {dossier.readiness?<><p>La revisión del contrato se completó correctamente. Los datos y las condiciones fueron verificados por Administración.</p><p>Fecha de revisión: {dossier.readiness.reviewedAt}</p><p className="break-all">Responsable: {dossier.readiness.reviewedBy}</p></>:<p>Este contrato todavía está en preparación. Cuando Administración complete y confirme la revisión de datos, condiciones económicas y plan de pagos, el sistema registrará automáticamente esa revisión.</p>}
        <p>Esta revisión no significa que el contrato esté firmado o formalizado.</p>
      </section>
      <details className={panel} data-testid="contract-review-audit"><summary className="cursor-pointer font-bold">Detalles de auditoría</summary>
        <p className="break-all">Presupuesto: {dossier.budgetId} · Versión: {dossier.budgetVersion} · Opción: {dossier.acceptedOptionId}</p>
        <p>Versión del borrador: {dossier.draftRevision}</p>
        {dossier.readiness&&<><p className="break-all">Hash de evidencia: {dossier.readiness.evidenceHash}</p><p className="break-all">Digest de condiciones económicas: {dossier.readiness.termsDigest}</p></>}
        {dossier.snapshot?<><p>Número: {dossier.snapshot.contractNumber}</p><p className="break-all">Snapshot: {dossier.snapshot.snapshotId} · SHA-256 {dossier.snapshot.snapshotHash}</p><p>Plantillas congeladas: {dossier.snapshot.templateVersions.join(' / ')}</p></>:<p>Sin snapshot congelado. No se asigna número desde esta vista.</p>}
        <p>Conservación privada: adaptador exclusivo de Emulator.</p>{dossier.archives.map(record=><div key={record.documentSetId} className="space-y-1 break-all"><p>{record.state==='COMPLETE'?'Conservación completa registrada':'Conservación pendiente de reconciliación'} · {record.documentSetId}</p>{record.artifacts.map(a=><p key={a.kind}>{a.kind==='mandate'?'Mandato':'Pagaré'} · {a.templateVersion} · {a.pages} página(s) · SHA-256 {a.sha256}</p>)}</div>)}
      </details>
      <section className={panel}><h3 className="font-bold">Requisitos pendientes</h3><ul className="list-disc pl-5">{pendingLegalRequirements.map(item=><li key={item}>{item}</li>)}</ul><p>READY y términos congelados no acreditan firma física. No existe una acción para marcar FORMALIZED en esta etapa.</p></section>

    </>}
  </section>;
}
