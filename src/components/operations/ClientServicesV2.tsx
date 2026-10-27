'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { OperationFinancialWorkspace } from './OperationFinancialWorkspace';
import { useAuth } from '@/components/AuthProvider';
interface Service {budgetId:string;version:number;operationId:string;service:string;product:string;status:string;activatedAt:string;locality:string;financialInformationAvailable:boolean}
export function ClientServicesV2(){const {user}=useAuth();return <ClientServicesSession key={user?.uid??'anonymous'}/>;}
function ClientServicesSession() {
 const {user}=useAuth(),[services,setServices]=useState<Service[]>([]),[error,setError]=useState(''),[loaded,setLoaded]=useState(false);
 const sequence=useRef(0);
 const invalidate=useCallback(()=>{++sequence.current;},[]);
 const load=useCallback(async()=>{const request=++sequence.current;if(!user){setServices([]);setLoaded(true);return;}try{const r=await fetch('/api/cliente/servicios-v2',{cache:'no-store',headers:{Authorization:`Bearer ${await user.getIdToken()}`}});if(!r.ok)throw Error();const data=await r.json();if(request!==sequence.current)return;setServices(data.services);setError('');}catch{if(request!==sequence.current)return;setServices([]);setError('No se pudo verificar el acceso a tus servicios. Reintentá más tarde.');}finally{if(request===sequence.current)setLoaded(true);}},[user]);
 useEffect(()=>{void load();const refresh=()=>{if(document.visibilityState==='visible')void load();};window.addEventListener('online',refresh);window.addEventListener('focus',refresh);document.addEventListener('visibilitychange',refresh);const timer=window.setInterval(refresh,30000);return()=>{invalidate();window.clearInterval(timer);window.removeEventListener('online',refresh);window.removeEventListener('focus',refresh);document.removeEventListener('visibilitychange',refresh);};},[load,invalidate]);

 return <section data-testid="client-services-v2" className="min-w-0 space-y-3 rounded-2xl border border-zinc-700 bg-[#1B2027] p-4"><h2 className="text-xl font-bold">Mi compra / Mi plan de pagos</h2><button className="min-h-11 rounded border px-3" onClick={()=>void load()}>Actualizar mis servicios</button>{error&&<p role="alert">{error}</p>}{loaded&&!error&&!services.length&&<p>No hay servicios V2 activados para esta cuenta.</p>}{services.map(s=><article data-testid="client-service-v2" key={s.operationId} className="min-w-0 space-y-2 rounded border border-zinc-700 p-3"><h3 className="font-bold">{s.service}</h3><p>{s.product}</p><p>Estado: {s.status}</p><p>{s.locality||'Localidad sin informar'}</p><OperationFinancialWorkspace budgetId={s.budgetId} version={s.version} role="CLIENT"/></article>)}</section>;
}
