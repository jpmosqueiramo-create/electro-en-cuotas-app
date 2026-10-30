import Link from 'next/link';
import {workflowLabels,workflowTone,type AdminWorkflow} from '@/lib/adminWorkflow';
export function WorkflowBadges({rows,links=false}:{rows:AdminWorkflow[];links?:boolean}){
 return <div className="min-w-0 space-y-2">{rows.map(w=><div key={`${w.budgetId}:${w.version}`} className="min-w-0 space-y-1">
  {rows.length>1&&<p className="break-words text-xs font-semibold">{w.product} · Versión {w.version}</p>}
  <div className="flex flex-wrap gap-2"><span className={`inline-block max-w-full break-words rounded-lg border px-2.5 py-1 text-sm font-semibold ${workflowTone(w.stage)}`}>{workflowLabels[w.stage]}</span>{w.approval==='APPROVED'&&w.stage!=='APPROVED'&&<span className={`rounded-lg border px-2.5 py-1 text-xs font-semibold ${workflowTone('APPROVED')}`}>Aprobado</span>}</div>
  {links&&<Link className="inline-flex min-h-11 items-center text-sm font-semibold text-brand-primary underline" href={`/admin/operaciones/${encodeURIComponent(w.budgetId)}/${w.version}?section=${w.stage==='LOGISTICS'||w.stage==='DELIVERED'?'logistics':w.stage==='CONTRACT'?'contract':(w.stage==='PENDING_PERSONAL_DATA'||w.stage==='PERSONAL_DATA_RECEIVED')?'client':'documents'}`}>Continuar solicitud</Link>}
 </div>)}</div>;
}
