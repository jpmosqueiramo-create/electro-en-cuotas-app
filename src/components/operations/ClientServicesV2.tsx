'use client';
import { useCallback, useEffect, useState } from 'react';
import { OperationFinancialWorkspace } from './OperationFinancialWorkspace';
import { useAuth } from '@/components/AuthProvider';
interface Service {budgetId:string;version:number;operationId:string;service:string;product:string;status:string;activatedAt:string;locality:string;financialInformationAvailable:boolean}
export function ClientServicesV2() {
 const {user}=useAuth(),[services,setServices]=useState<Service[]>([]),[error,setError]=useState(''),[loaded,setLoaded]=useState(false);
 const load=useCallback(async()=>{if(!user)return;try{const r=await fetch('/api/cliente/servicios-v2',{cache:'no-store',headers:{Authorization:`Bearer ${await user.getIdToken()}`}});if(!r.ok)throw Error();setServices((await r.json()).services);setError('');}catch{setServices([]);setError('No se pudo verificar el acceso a tus servicios V2. Reintentá más tarde.');}finally{setLoaded(true);}},[user]);
 useEffect(()=>{void load();},[load]);
 return <section data-testid="client-services-v2" className="min-w-0 space-y-3 rounded-2xl border border-zinc-700 bg-[#1B2027] p-4"><h2 className="text-xl font-bold">Mis servicios V2</h2><button className="min-h-11 rounded border px-3" onClick={()=>void load()}>Actualizar mis servicios</button>{error&&<p role="alert">{error}</p>}{loaded&&!error&&!services.length&&<p>No hay servicios V2 activados para esta cuenta.</p>}{services.map(s=><article data-testid="client-service-v2" key={s.operationId} className="min-w-0 space-y-2 rounded border border-zinc-700 p-3"><h3 className="font-bold">{s.service}</h3><p>{s.product}</p><p>Estado: {s.status}</p><p>{s.locality||'Localidad sin informar'}</p><OperationFinancialWorkspace budgetId={s.budgetId} version={s.version} role="CLIENT"/></article>)}</section>;
}
