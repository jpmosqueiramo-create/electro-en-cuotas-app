'use client';
import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import { OperationIdentityNotice } from './OperationIdentityNotice';
import type { OperationIdentityReview } from '@/lib/operationIdentityReview';
import type { BudgetV2 } from '@/lib/budgetV2';
import type { ContractDraftV2 } from '@/lib/contractV2';
import type { OperationViewV2 } from '@/lib/operationV2';
import type { FulfillmentV2 } from '@/lib/operationFulfillmentV2';
import type { CreditState } from '@/lib/creditReviewV2';
import { operationNextAction, type OperationSection } from '@/lib/operationWorkspaceV2';
import { btn } from './ContractDataFields';
const sections: Record<OperationSection, string> = { documents: 'Documentación', client: 'Datos del cliente', budget: 'Presupuesto aceptado', contract: 'Contrato y pagaré', logistics: 'Logística', affiliate: 'Vendedor afiliado', payments: 'Cuotas y pagos' };
const steps:OperationSection[]=['documents','client','contract','logistics'];
const descriptions:Partial<Record<OperationSection,string>>={documents:'Cargá las imágenes y revisá la documentación del cliente.',client:'Enviá el formulario privado y revisá los datos recibidos.',contract:'Completá las condiciones y prepará el mandato y el pagaré.',logistics:'Seguí el pedido, los documentos de traslado y la entrega.'};
const money = (value: number) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(value);
export function OperationUnifiedFrame({ budget, draft, operation, section, onSection, pendingSubmissions, conformityPending, panels,headerActions,headerContent,identityReview,refreshKey=0 }: {refreshKey?:number;identityReview?:OperationIdentityReview|null;
  budget?: BudgetV2; draft: ContractDraftV2 | null; operation: OperationViewV2 | null; section: OperationSection;
  onSection: (value: OperationSection) => void; pendingSubmissions: boolean; conformityPending: boolean;
  panels: Partial<Record<OperationSection, ReactNode>>; headerActions?: ReactNode; headerContent?: ReactNode;
}) {
  const { user } = useAuth(); const prefix = useId();
  const [focusRequest,setFocusRequest]=useState(0); const handledFocus=useRef(0);
  useEffect(()=>{
    if(focusRequest===handledFocus.current)return;
    handledFocus.current=focusRequest;
    const panel=document.getElementById(`${prefix}-panel`);
    const target=(section==='contract'&&conformityPending?panel?.querySelector('[data-testid="contract-review"]'):section==='client'?panel?.querySelector(pendingSubmissions?'[data-testid="client-data-review"][open]':'[data-testid="contract-personal"]'):null)??panel;
    if(target instanceof HTMLDetailsElement)target.open=true;
    target?.scrollIntoView({block:'start'});
    (target?.querySelector('summary,button,input') as HTMLElement|null)?.focus();
  },[focusRequest,conformityPending,pendingSubmissions,prefix,section]);
  const [creditState,setCreditState]=useState<CreditState|undefined>();
  const [tracking, setTracking] = useState<FulfillmentV2 | null>(null), [trackingError, setTrackingError] = useState('');
  const budgetId = budget?.id ?? draft?.budgetId; const version = budget?.version ?? draft?.budgetVersion;
  const load = useCallback(async (signal?: AbortSignal) => {
    if (!user || !budgetId || !version) return;
    try {
      const response = await fetch(`/api/admin/presupuestos-v2/${encodeURIComponent(budgetId)}/versions/${version}/fulfillment`, { signal, cache: 'no-store', headers: { Authorization: `Bearer ${await user.getIdToken()}` } });
      const credit=await fetch(`/api/admin/presupuestos-v2/${encodeURIComponent(budgetId)}/versions/${version}/credit-review`,{signal,cache:'no-store',headers:{Authorization:`Bearer ${await user.getIdToken()}`}});if(!credit.ok)throw Error();const evaluation=await credit.json();if(!signal?.aborted)setCreditState(evaluation.review?evaluation.state:undefined);
      if (!response.ok) throw Error(); const data = await response.json();
      if (!signal?.aborted) { setTracking(data.state); setTrackingError(''); }
    } catch { if (!signal?.aborted) setTrackingError('No se pudo consultar el seguimiento. Reintentá antes de decidir el próximo paso logístico.'); }
  }, [user, budgetId, version]);
  useEffect(() => { const controller = new AbortController(); void load(controller.signal); return () => controller.abort(); }, [load, section,refreshKey]);
  const next = identityReview?.requiresClarification ? { status: 'Identidad pendiente de aclaración', label: 'Revisar identidad del cliente', responsible: 'Administración', section: 'contract' as const } : operationNextAction({ draft, tracking, pendingSubmissions, conformityPending,creditState });
  const nextSection:OperationSection=next.section!=='contract'?next.section:identityReview?.requiresClarification?'documents':pendingSubmissions||creditState==='PENDING_DATA'?'client':creditState&&creditState!=='APPROVED'?'documents':'contract';
  const stepIndex=steps.indexOf(section);
  const accepted = draft?.acceptedReferenceSnapshot ?? budget?.options.find(o => o.optionId === operation?.identity.acceptedOptionId)?.referenceSnapshot;
  return <section data-testid="operation-unified-workspace" className="min-w-0 space-y-5 border-t border-border-color pt-5">
    <header className="min-w-0 space-y-3 rounded-2xl border border-border-color bg-surface p-4 sm:p-6">
      {operation&&<Link className="admin-control inline-flex min-h-11 items-center font-semibold text-brand-primary" href={`/admin/solicitudes/${operation.identity.sourceCollection}/${encodeURIComponent(operation.identity.solicitudId)}`}>Volver a solicitud</Link>}
      <h2 className="break-words font-heading text-2xl font-bold">{budget?.clienteSnapshot.nombre || 'Cliente del presupuesto'}</h2>
      {draft?.personalData.fullName&&draft.personalData.fullName!==budget?.clienteSnapshot.nombre&&<p className="break-words text-sm">Nombre en el borrador: {draft.personalData.fullName}</p>}
      {identityReview&&(identityReview.requiresClarification?<OperationIdentityNotice review={identityReview}/>:<details className="text-sm"><summary className="min-h-11 cursor-pointer text-text-secondary">Identidad y origen de los datos</summary><p>Nombre del encabezado según el presupuesto aceptado.</p><OperationIdentityNotice review={identityReview}/></details>)}
      <p className="break-words">{accepted?.nombre || 'Propuesta aceptada'} · {budget?.clienteSnapshot.localidad || 'Localidad pendiente'}</p>
      <p className="font-semibold">{next.status}</p>
      <div className="space-y-2 border-t border-border-color pt-3" role="status"><p>Próxima acción: <strong>{next.label}</strong></p><p className="text-sm">Responsable: {next.responsible}</p></div>
      <div data-testid="operation-header-actions" className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center"><button className="btn-primary min-h-11 whitespace-normal" onClick={() => {onSection(nextSection);setFocusRequest(value=>value+1);}}>{next.label}</button>{headerActions}</div>{headerContent}
      {trackingError && <div role="alert"><p>{trackingError}</p><button className={btn} onClick={() => void load()}>Reintentar seguimiento</button></div>}
      {!!tracking?.incidents.filter(i => !i.resolvedAt).length && <p role="alert">Hay incidencias sin resolver. Revisá proveedor y logística antes de continuar.</p>}
    </header>
    <nav aria-label="Pasos de la operación" className="grid min-w-0 grid-cols-2 gap-2 lg:grid-cols-4">{steps.map((key,index)=><button key={key} data-testid={`operation-step-${key}`} id={`${prefix}-${key}`} aria-controls={`${prefix}-panel`} aria-current={section===key?'step':undefined} className={`${btn} flex min-h-16 items-center gap-3 text-left whitespace-normal ${section===key?'border-brand-primary bg-surface text-brand-primary':''}`} onClick={()=>onSection(key)}><span aria-hidden="true" className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-current font-bold">{index+1}</span><span>{sections[key]}</span></button>)}</nav>
    <details className="rounded-xl border border-border-color p-3" open={stepIndex<0?true:undefined}><summary className="min-h-11 cursor-pointer font-semibold">Más opciones de la operación</summary><nav aria-label="Consultas y seguimiento" className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">{(['budget','affiliate','payments'] as const).map(key=><button key={key} id={`${prefix}-${key}`} className={btn} aria-current={section===key?'page':undefined} onClick={()=>onSection(key)}>{sections[key]}</button>)}</nav></details>
    <section id={`${prefix}-panel`} aria-labelledby={`${prefix}-${section}`} className="min-w-0 space-y-4">
      <h3 className="font-heading text-xl font-bold">{stepIndex>=0?`Paso ${stepIndex+1} de 4 · `:''}{sections[section]}</h3>{descriptions[section]&&<p className="text-text-secondary">{descriptions[section]}</p>}
      {section === 'budget' ? <><p>Se conserva la propuesta aceptada y todos sus planes originales. La preferencia no define por sí sola el plan contractual.</p>{budget?.options.map((option, index) => <article className="min-w-0 space-y-2 rounded-xl border border-border-color p-4" key={option.optionId}><h4 className="break-words font-semibold">Opción {index + 1} · {option.referenceSnapshot.nombre}</h4><p>{operation?.identity.acceptedOptionId === option.optionId ? 'Opción aceptada' : 'Alternativa ofrecida'}</p><p className="whitespace-pre-wrap break-words">{option.referenceSnapshot.descripcion}</p>{option.referenceSnapshot.planesOfrecidos.map(plan => <p key={plan.cuotas}>{plan.cuotas} cuotas estimadas de {money(plan.cuotaEstimada)}</p>)}</article>)}{panels.budget}</> : (draft&&['documents','client','contract'].includes(section)?panels.contract:panels[section])}
      {stepIndex>=0&&stepIndex<3&&<div className="border-t border-border-color pt-4"><button className={btn} onClick={()=>onSection(steps[stepIndex+1])}>Ir al paso {stepIndex+2}: {sections[steps[stepIndex+1]]}</button><p className="mt-2 text-sm text-text-secondary">Cambiar de paso no guarda cambios ni aprueba la operación.</p></div>}
    </section>
    <details className="min-w-0 rounded-xl border border-border-color p-4"><summary className="min-h-11 cursor-pointer font-semibold">Historial y detalles de la operación</summary><p>La preparación no acredita firmas ni entrega. Cada paso conserva sus controles y autorizaciones. La facturación ARCA permanece deshabilitada.</p>{operation ? <dl className="space-y-2 break-all text-sm"><dt>Operación</dt><dd>{operation.identity.operationId}</dd><dt>Solicitud de origen</dt><dd>{operation.identity.sourceCollection}/{operation.identity.solicitudId}</dd><dt>Presupuesto y versión</dt><dd>{budgetId} · {version}</dd><dt>Opción aceptada</dt><dd>{operation.identity.acceptedOptionId}</dd></dl> : <p>Consultando el vínculo con la propuesta aceptada.</p>}</details>
  </section>;
}
