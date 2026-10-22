'use client';
import Link from 'next/link';
import { useEffect,useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import type { BudgetV2 } from '@/lib/budgetV2';
import type { OperationViewV2 } from '@/lib/operationV2';
type Section='contract'|'logistics'|'payments';
const actions={contract:'Revisar documentación',logistics:'Abrir proveedor y logística',payments:'Consultar cuotas y pagos'};
export function AdminOperationsDirectory({section}:{section:Section}){
 const {user}=useAuth();const [rows,setRows]=useState<{budget:BudgetV2;operation:OperationViewV2}[]|null>(null),[error,setError]=useState(false),[attempt,setAttempt]=useState(0);
 useEffect(()=>{const controller=new AbortController();if(!user)return()=>controller.abort();
  async function load(){const headers={Authorization:`Bearer ${await user!.getIdToken()}`};const read=async(url:string)=>{const response=await fetch(url,{headers,cache:'no-store',signal:controller.signal});if(!response.ok)throw Error();return response.json();};
   const {budgets}=await read('/api/admin/presupuestos-v2') as {budgets:BudgetV2[]};
   const linked=[]; // Bound fan-out while reusing the existing authorized GETs.
   for(const budget of budgets.filter(b=>b.estado==='EMITIDO')){const {operation}=await read(`/api/admin/presupuestos-v2/${encodeURIComponent(budget.id)}/versions/${budget.version}/contract`) as {operation:OperationViewV2|null};if(operation)linked.push({budget,operation});}
   if(!controller.signal.aborted)setRows(linked);
  }void load().catch(()=>{if(!controller.signal.aborted)setError(true);});return()=>controller.abort();
 },[user,section,attempt]);
 return <section data-testid="canonical-operations" className="min-w-0 space-y-4"><h2 className="font-heading text-xl font-bold">Operaciones aceptadas</h2><p>El seguimiento se realiza en la Ficha de operación. Los bloqueos contractuales, de entrega y de cobranza siguen vigentes.</p>
 {error?<div role="alert"><p>No se pudo completar la consulta. No se muestran resultados parciales como una bandeja completa.</p><button className="admin-control min-h-11" onClick={()=>{setRows(null);setError(false);setAttempt(v=>v+1);}}>Reintentar operaciones</button></div>:rows===null?<p role="status">Consultando operaciones…</p>:rows.length===0?<p>No hay operaciones aceptadas disponibles. <Link className="underline" href="/admin/solicitudes">Revisar solicitudes</Link></p>:<ul className="space-y-3">{rows.map(({budget,operation})=><li key={`${budget.id}:${budget.version}`} className="min-w-0 space-y-2 rounded-xl border border-border-color bg-surface p-4"><h3 className="break-words font-semibold">{budget.clienteSnapshot.nombre||'Cliente'}</h3><p className="break-words">{budget.options.find(o=>o.optionId===operation.identity.acceptedOptionId)?.referenceSnapshot.nombre||'Propuesta aceptada'} · Versión {budget.version}</p><Link className="btn-primary inline-flex min-h-11 max-w-full items-center whitespace-normal" href={`/admin/operaciones/${encodeURIComponent(budget.id)}/${budget.version}?section=${section}`}>{actions[section]}</Link></li>)}</ul>}
 </section>;
}
