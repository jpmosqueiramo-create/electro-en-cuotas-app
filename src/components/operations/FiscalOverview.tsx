'use client';
import { useCallback,useEffect,useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
interface FiscalView {status:string;documents:{id:string;number:string;kind:string;totalCents:number;taxCents:number;authorization:string}[]}
export function FiscalOverview({budgetId,version}:{budgetId:string;version:number}){
 const {user}=useAuth(),[view,setView]=useState<FiscalView|null>(null),[error,setError]=useState('');
 const load=useCallback(async()=>{if(!user)return;try{const r=await fetch(`/api/admin/presupuestos-v2/${encodeURIComponent(budgetId)}/versions/${version}/fiscal`,{cache:'no-store',headers:{Authorization:`Bearer ${await user.getIdToken()}`}});if(!r.ok)throw Error();setView(await r.json());setError('');}catch{setView(null);setError('No se pudo verificar la documentación fiscal.');}},[budgetId,version,user]);
 useEffect(()=>{void load();},[load]);
 return <section className="min-w-0 space-y-2 rounded border p-3" data-testid="fiscal-overview"><h3 className="font-bold">Comprobantes fiscales</h3><p>LOOP: responsable inscripto, según declaración del titular. Falta confirmar tratamiento de conceptos y habilitación fiscal.</p><p>Los recibos acreditan pagos. No sustituyen facturas ni generan IVA nuevamente.</p><button className="min-h-11 rounded border px-3" onClick={()=>void load()}>Actualizar comprobantes</button>{error&&<p role="alert">{error}</p>}{view&&<><p>{view.status}</p>{view.documents.map(d=><article className="break-words rounded border p-2" key={d.id}><p>{d.kind} · {d.number} · {d.authorization}</p><p>Total: {(d.totalCents/100).toLocaleString('es-AR',{style:'currency',currency:'ARS'})} · IVA simulado: {(d.taxCents/100).toLocaleString('es-AR',{style:'currency',currency:'ARS'})}</p></article>)}</>}</section>;
}
