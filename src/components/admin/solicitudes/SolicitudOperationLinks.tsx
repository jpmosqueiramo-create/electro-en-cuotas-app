'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import type { BudgetV2 } from '@/lib/budgetV2';
import type { OperationViewV2 } from '@/lib/operationV2';
import type { AdminSolicitudSource } from '@/lib/adminSolicitudesReadModel';
const primary='btn-primary inline-flex min-h-11 w-full items-center justify-center whitespace-normal break-words text-center sm:w-auto';
const labels:Record<string,string>={NOT_CREATED:'Datos contractuales pendientes',DRAFT:'Contrato en preparación',READY_TO_FORMALIZE:'Preparación revisada',TERMS_FROZEN:'Términos congelados',FORMALIZED:'Formalizado'};
export function SolicitudOperationLinks({source,id}:{source:AdminSolicitudSource;id:string}){
  const {user}=useAuth();
  const [result,setResult]=useState<{budgets:BudgetV2[];operations:{budget:BudgetV2;operation:OperationViewV2}[]}|null>(null),[error,setError]=useState(false),[attempt,setAttempt]=useState(0);
  useEffect(()=>{
    const controller=new AbortController();
    if(!user)return()=>controller.abort();
    async function load(){
      const headers={Authorization:`Bearer ${await user!.getIdToken()}`};
      const read=async(url:string)=>{const response=await fetch(url,{headers,signal:controller.signal,cache:'no-store'});if(!response.ok)throw Error();return response.json();};
      const data=await read('/api/admin/presupuestos-v2');
      const budgets=(data.budgets as BudgetV2[]).filter(b=>b.sourceCollection===source&&b.solicitudId===id);
      const operations=await Promise.all(budgets.filter(b=>b.estado==='EMITIDO').map(async budget=>{
        const {operation}=await read(`/api/admin/presupuestos-v2/${encodeURIComponent(budget.id)}/versions/${budget.version}/contract`) as {operation:OperationViewV2|null};
        if(!operation)return null;
        const identity=operation.identity;
        if(identity.sourceCollection!==source||identity.solicitudId!==id||identity.budgetId!==budget.id||identity.budgetVersion!==budget.version)throw Error();
        return {budget,operation};
      }));
      if(!controller.signal.aborted)setResult({budgets,operations:operations.filter(o=>o!==null)});
    }
    void load().catch(()=>{if(!controller.signal.aborted)setError(true);});return()=>controller.abort();
  },[user,source,id,attempt]);
  const budgetUrl=`/admin/presupuestos?sourceCollection=${source}&solicitudId=${encodeURIComponent(id)}`;
  return <section aria-label="Acceso a la operación" className="min-w-0 space-y-3 rounded-2xl border border-border-color bg-surface p-4" data-testid="solicitud-operation-links">
    {error?<><p role="alert">No se pudo consultar el vínculo de esta solicitud. Reintentá antes de continuar.</p><button className="admin-control min-h-11" onClick={()=>{setResult(null);setError(false);setAttempt(v=>v+1);}}>Reintentar vínculo</button></>:!result?<p role="status">Consultando operaciones vinculadas…</p>:<>
      {result.operations.length===0?<p>Todavía no hay una operación vinculada</p>:result.operations.length>1&&<p className="font-semibold">Elegí la operación que querés abrir</p>}
      {result.operations.map(({budget,operation})=><div className="min-w-0 space-y-2" key={`${budget.id}:${budget.version}`}>
        <p className="break-words">{budget.options.find(o=>o.optionId===operation.identity.acceptedOptionId)?.referenceSnapshot.nombre??'Propuesta aceptada'} · Versión {budget.version} · {labels[operation.contractState]??'Revisar estado en la ficha'}</p>
        <Link className={primary} href={`/admin/operaciones/${encodeURIComponent(budget.id)}/${budget.version}`}>Abrir ficha de operación</Link>
      </div>)}
      {result.budgets.filter(b=>!result.operations.some(o=>o.budget.id===b.id&&o.budget.version===b.version)).map(b=><div key={`${b.id}:${b.version}`} className="min-w-0 space-y-2"><p className="break-words">{b.options.map(o=>o.referenceSnapshot.nombre).join(' / ')||'Propuesta en preparación'} · Versión {b.version} · {b.estado==='EMITIDO'?'Propuesta emitida, pendiente de aceptación':'Presupuesto en preparación'}</p><Link className="admin-control inline-flex min-h-11 items-center font-semibold text-brand-primary" href={`${budgetUrl}&budgetId=${encodeURIComponent(b.id)}&version=${b.version}`}>Abrir presupuesto</Link></div>)}
      {result.budgets.length===0&&<Link className={primary} href={budgetUrl}>Preparar presupuesto V2</Link>}
    </>}
  </section>;
}
