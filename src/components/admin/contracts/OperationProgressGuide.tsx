'use client';
import {useCallback,useEffect,useState} from 'react';
import {CheckCircle2, Circle, AlertCircle, ArrowRight, RefreshCw} from 'lucide-react';
import {useAuth} from '@/components/AuthProvider';
import type {ContractDraftV2} from '@/lib/contractV2';
import {operationProgress,validProgressFact,type ProgressFacts,type ProgressState} from '@/lib/operationProgress';
import type {ContractSectionTarget} from './contractSectionNavigation';
import {operationStatusLabel} from '@/lib/operationWorkspaceV2';
const initialFacts=():ProgressFacts=>({credit:{status:'loading'},production:{status:'loading'},delivery:{status:'loading'},financial:{status:'loading'},fulfillment:{status:'loading'}});
const labels:Record<ProgressState,string>={READY:'Completo',PENDING:'Pendiente',BLOCKED:'Requiere revisión',UNKNOWN:'Sin verificar',OPTIONAL:'Opcional'};
const button='admin-control inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border-color bg-surface px-3 py-2 text-sm font-semibold text-brand-primary disabled:opacity-50';
export function OperationProgressGuide({budgetId,version,draft,pendingSubmissions,conformity,unsaved,dirtyTarget='editor',refreshKey,retired=false,onNavigate}:{budgetId:string;version:number;draft:ContractDraftV2|null;pendingSubmissions:boolean;conformity:{required:boolean;confirmed:boolean;paymentAddressConfirmed?:boolean}|null;unsaved:boolean;dirtyTarget?:ContractSectionTarget;refreshKey:number;retired?:boolean;onNavigate:(target:ContractSectionTarget)=>void}){
 const {user}=useAuth(),[facts,setFacts]=useState<ProgressFacts>(initialFacts),[attempt,setAttempt]=useState(0),[updated,setUpdated]=useState('');
 const refresh=useCallback(()=>setAttempt(value=>value+1),[]);
 useEffect(()=>{
  if(!user||retired)return;
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),15000);
  let live=true;
  setFacts(initialFacts());setUpdated('');
  async function read(){
   try{
    const token=await user!.getIdToken();
    const base=`/api/admin/presupuestos-v2/${encodeURIComponent(budgetId)}/versions/${version}`;
    const paths={credit:'credit-review',production:'production',delivery:'delivery',financial:'financial',fulfillment:'fulfillment'} as const;
    await Promise.all(Object.entries(paths).map(async([key,path])=>{
     try{const response=await fetch(`${base}/${path}`,{headers:{Authorization:`Bearer ${token}`},cache:'no-store',signal:controller.signal});if(!response.ok)throw Error();const value=await response.json();if(!validProgressFact(key,value))throw Error();if(live)setFacts(old=>({...old,[key]:{status:'ready',value}}));}
     catch{if(live)setFacts(old=>({...old,[key]:{status:'error'}}));}
    }));
    if(live&&!controller.signal.aborted)setUpdated(new Intl.DateTimeFormat('es-AR',{hour:'2-digit',minute:'2-digit',timeZone:'America/Argentina/Buenos_Aires'}).format(new Date()));
   }catch{if(live)setFacts({credit:{status:'error'},production:{status:'error'},delivery:{status:'error'},financial:{status:'error'},fulfillment:{status:'error'}});}
   finally{clearTimeout(timer);}
  }
  void read();return()=>{live=false;clearTimeout(timer);controller.abort();};
 },[user,budgetId,version,draft?.revision,refreshKey,attempt,retired]);
 useEffect(()=>{
  const eventRefresh=(event:Event)=>{const detail=(event as CustomEvent<{budgetId?:string;version?:number}>).detail;if(detail?.budgetId&& (detail.budgetId!==budgetId||detail.version!==version))return;refresh();};
  const focus=()=>{if(!document.hidden)refresh();};
  window.addEventListener('operation-financial-updated',eventRefresh);window.addEventListener('operation-logistics-updated',eventRefresh);window.addEventListener('operation-delivery-updated',eventRefresh);window.addEventListener('focus',focus);
  const timer=setInterval(focus,60000);
  return()=>{clearInterval(timer);window.removeEventListener('operation-financial-updated',eventRefresh);window.removeEventListener('operation-logistics-updated',eventRefresh);window.removeEventListener('operation-delivery-updated',eventRefresh);window.removeEventListener('focus',focus);};
 },[budgetId,version,refresh]);
 if(retired)return <section className="rounded-2xl border border-border-color bg-background-main p-4" data-testid="operation-progress-guide"><h3 className="font-bold">Solicitud fuera del circuito activo</h3><p>Restaurá el contrato desde Administración si corresponde retomarlo. Sus datos e historial se conservan.</p></section>;
 const result=operationProgress({draft,pendingSubmissions,conformity,unsaved,facts}),loading=Object.values(facts).some(f=>f.status==='loading'),errors=Object.values(facts).some(f=>f.status==='error');
 const next=result.next,delivery=facts.delivery.value,tracking=facts.fulfillment.value?.state;
 return <section data-testid="operation-progress-guide" className="min-w-0 space-y-4 rounded-2xl border border-border-color bg-surface p-4 shadow-sm sm:p-5">
  <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wider text-brand-secondary">Guía de la solicitud</p><h3 className="mt-1 text-xl font-bold text-brand-primary">De los datos del cliente a las cuotas vigentes</h3><p className="mt-1 text-sm text-text-secondary">{result.completed} de {result.total} pasos comprobados para activar el plan.</p></div><button type="button" className={button} disabled={loading} onClick={refresh}><RefreshCw size={16} aria-hidden="true"/>Actualizar guía</button></div>
  <progress className="h-2 w-full accent-[#173E3B]" value={result.completed} max={result.total} aria-label="Avance para activar el plan"/>
  <div role="status" data-testid="operation-progress-next" className={`space-y-2 rounded-xl border p-4 ${unsaved?'border-amber-300 bg-amber-50':result.active?'border-emerald-200 bg-emerald-50':'border-brand-primary/20 bg-background-main'}`}>
   <h4 className="font-bold text-brand-primary">{unsaved?'Primero: guardá los cambios pendientes':result.active?'Plan de cuotas vigente':`Próximo paso: ${next.title}`}</h4>
   <ul className="space-y-1 text-sm">{(unsaved?['La guía utiliza la última información guardada. Los cambios del formulario todavía no completan este paso.']:result.active?['El cronograma ya está activo. Podés seguir las cuotas y abrir los recibos. La entrega conserva su registro independiente.']:next.detail).map((detail,index)=><li key={index}>{detail}</li>)}</ul>
   <button type="button" data-testid="operation-progress-primary" className="btn-primary admin-control min-h-11 w-full whitespace-normal sm:w-auto" onClick={()=>onNavigate(unsaved?dirtyTarget:result.active?'payments':next.target)}>{unsaved?'Ir a guardar mis cambios':result.active?'Ver cuotas y pagos':next.action}<ArrowRight size={17} aria-hidden="true"/></button>
  </div>
  {errors&&<p role="alert" className="rounded-xl bg-amber-50 p-3 text-sm text-amber-950">No se pudieron comprobar todos los estados. Los pasos sin verificar no se dan por completos. Actualizá la guía para reintentar.</p>}
  <details className="rounded-xl border border-border-color p-3"><summary className="min-h-11 cursor-pointer py-2 font-semibold text-brand-primary">Qué falta y dónde completarlo ({result.total-result.completed} pendientes)</summary><ol className="grid min-w-0 gap-3 pt-3 lg:grid-cols-2">{result.rows.map((row,index)=><li key={row.key} data-progress-step={row.key} data-progress-state={row.state} className="min-w-0 space-y-2 rounded-xl border border-border-color bg-surface p-3"><div className="flex items-start gap-2">{row.state==='READY'?<CheckCircle2 size={19} className="mt-0.5 shrink-0 text-success" aria-hidden="true"/>:row.state==='BLOCKED'?<AlertCircle size={19} className="mt-0.5 shrink-0 text-amber-800" aria-hidden="true"/>:<Circle size={19} className="mt-0.5 shrink-0 text-text-secondary" aria-hidden="true"/>}<div className="min-w-0"><h4 className="break-words font-semibold">{index+1}. {row.title}</h4><p className={`text-xs font-bold ${row.state==='READY'?'text-success':'text-text-secondary'}`}>{labels[row.state]}</p></div></div><ul className="space-y-1 text-sm text-text-secondary">{row.detail.map((detail,i)=><li key={i} className="break-words">{detail}</li>)}</ul><button type="button" className={button} disabled={unsaved} onClick={()=>onNavigate(row.target)}>{row.state==='READY'?'Revisar este paso':row.action}</button>{row.key==='personal'&&<p className="text-sm text-text-secondary">Los datos laborales son opcionales. <button type="button" className="min-h-11 font-semibold text-brand-primary underline" disabled={unsaved} onClick={()=>onNavigate('employment')}>Revisar datos laborales</button></p>}</li>)}</ol></details>
  <div className="space-y-2 rounded-xl border border-border-color bg-background-main p-3"><h4 className="font-semibold text-brand-primary">Compra, firmas y entrega</h4><p className="text-sm">{delivery?.state.status==='DELIVERED'||delivery?.state.status==='DELIVERED_EMULATOR'?'Entrega registrada.':tracking?`Pedido: ${operationStatusLabel(tracking.providerState)} · Logística: ${operationStatusLabel(tracking.logisticsState)}.`:'Seguimiento todavía sin verificar.'}</p><div className="flex flex-wrap gap-2"><button type="button" className={button} disabled={unsaved} onClick={()=>onNavigate('fulfillment')}>Pedido y fechas de logística</button><button type="button" className={button} disabled={unsaved} onClick={()=>onNavigate('delivery')}>Firmas y entrega</button></div>{delivery&&delivery.state.status==='PREPARING'&&<details><summary className="min-h-11 cursor-pointer py-2 text-sm font-semibold">Pendientes para confirmar la entrega ({delivery.missing.length})</summary><ul className="space-y-1 text-sm">{delivery.missing.map((item,i)=><li key={i}>{item}</li>)}</ul></details>}</div>
  <p className="text-xs text-text-secondary">{loading?'Comprobando estados…':updated?`Consulta actualizada a las ${updated} (Argentina).`:''} La guía no aprueba solicitudes ni registra firmas, entregas o pagos.</p>
 </section>;
}
