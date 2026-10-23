'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import type { ProductionReadiness, ReadinessItem } from '@/lib/productionReadinessV2';
import { btn } from './ContractDataFields';

const stateLabel={READY:'Comprobado',PENDING:'Pendiente',BLOCKED:'Bloqueado'};
function destination(item:ReadinessItem,id:string,version:number){
  if(item.section==='legal')return '/admin/aprobacion-documental';
  return `/admin/operaciones/${encodeURIComponent(id)}/${version}?section=${({fulfillment:'logistics',financial:'payments'} as Record<string,string>)[item.section]??item.section}`;
}
export function ProductionReadinessWorkspace({budgetId,version,revision,refreshKey}:{budgetId:string;version:number;revision:number;refreshKey:number}){
  const {user}=useAuth();
  const [loaded,setLoaded]=useState<{key:string;value:ProductionReadiness}|null>(null);
  const [error,setError]=useState('');
  const [attempt,setAttempt]=useState(0);
  const key=`${user?.uid??''}:${budgetId}:${version}:${revision}:${refreshKey}:${attempt}`;
  useEffect(()=>{
    const controller=new AbortController();
    if(!user)return()=>controller.abort();
    async function read(){
      try{
        const token=await user!.getIdToken();
        if(controller.signal.aborted)return;
        const response=await fetch(`/api/admin/presupuestos-v2/${encodeURIComponent(budgetId)}/versions/${version}/production-readiness`,{headers:{Authorization:`Bearer ${token}`},cache:'no-store',signal:controller.signal});
        const value=await response.json();
        if(!response.ok)throw Error(value.error||'No se pudo consultar la preparación productiva.');
        if(!controller.signal.aborted){setLoaded({key,value});setError('');}
      }catch(e){if(!controller.signal.aborted){setLoaded(null);setError(e instanceof Error?e.message:'No se pudo consultar la preparación productiva.');}}
    }
    void read();return()=>controller.abort();
  },[user,budgetId,version,revision,refreshKey,attempt,key]);
  const view=loaded?.key===key?loaded.value:null;
  return <section className="min-w-0 space-y-3 rounded-xl border border-border-color bg-surface p-4" data-testid="production-readiness">
    <h2 className="font-heading text-xl font-bold">Preparación para operar con clientes reales</h2>
    <p className="text-sm">Consulta de requisitos. Esta revisión no emite documentos, no asigna numeración y no activa cuotas ni pagos.</p>
    {error?<p role="alert">{error}</p>:!view?<p role="status">Comprobando requisitos…</p>:<>
      <div className="rounded-lg border border-amber-400/50 bg-amber-50 p-3 text-slate-900" role="status">
        <p className="font-semibold">Próximo paso: {view.nextAction.label}</p><p>{view.nextAction.detail}</p><p className="text-sm">Responsable: {view.nextAction.owner}</p>
      </div>
      <details><summary className="cursor-pointer font-semibold">Ver todos los requisitos ({view.items.filter(i=>i.state==='READY').length} de {view.items.length} comprobados)</summary>
        <ul className="mt-3 grid gap-3 md:grid-cols-2">{view.items.map(item=><li key={item.key} className="min-w-0 space-y-1 rounded-lg border border-border-color p-3">
          <p className="font-semibold">{item.label}</p><p className="text-sm">{stateLabel[item.state]} · {item.owner}</p><p className="break-words text-sm">{item.detail}</p>
          {item.state!=='READY'&&['PERSONAL','PRODUCT','ECONOMICS','SCHEDULE','IDENTITY','CREDIT','CONFORMITY','READY_REVIEW','MANDATE_LEGAL','PROMISSORY_NOTE_LEGAL'].includes(item.key)&&<Link className="inline-block text-sm font-semibold underline" href={destination(item,budgetId,version)}>Revisar sección</Link>}
        </li>)}</ul>
      </details>
      <p className="text-sm">Esta lista revisa la preparación; no autoriza emitir, entregar ni cobrar. Consultá la habilitación específica de la operación. ARCA sigue bloqueada y la aprobación de un original no se transfiere a textos modificados.</p>
    </>}
    <button type="button" className={btn} onClick={()=>setAttempt(n=>n+1)}>Actualizar comprobación</button>
  </section>;
}
