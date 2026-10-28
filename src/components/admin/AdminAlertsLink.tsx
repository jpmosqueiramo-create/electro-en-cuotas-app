'use client';
import Link from 'next/link';
import {Bell} from 'lucide-react';
import {useEffect,useState} from 'react';
import {collection,onSnapshot,query,where} from 'firebase/firestore';
import {db} from '@/lib/firebase';
import {useAuth} from '@/components/AuthProvider';
export function AdminAlertsLink(){const {user,isAdmin}=useAuth();return <AlertsSession key={user?.uid??'anonymous'} enabled={!!user&&isAdmin}/>;}
function AlertsSession({enabled}:{enabled:boolean}){
 const [count,setCount]=useState<number|null>(null),[error,setError]=useState(false);
 useEffect(()=>{if(!enabled)return;return onSnapshot(query(collection(db,'alertas_admin'),where('leida','==',false)),snapshot=>{setCount(snapshot.size);setError(false);},()=>{setCount(null);setError(true);});},[enabled]);
 return <Link data-testid="admin-alerts-link" href="/admin#alertas" aria-label={error?'Alertas: no se pudo consultar el contador':count===null?'Alertas':`Alertas: ${count} sin leer`} className="admin-control inline-flex min-h-11 items-center gap-1.5 rounded-xl px-3 text-xs font-semibold"><Bell aria-hidden="true" className="size-4"/>Alertas<span aria-live="polite" aria-atomic="true">{count!==null&&count>0&&<span className="inline-flex min-w-6 items-center justify-center rounded-full bg-brand-secondary px-1.5 py-1 font-bold text-white">{count>99?'99+':count}</span>}{error&&<span title="No se pudo consultar el contador">!</span>}</span></Link>;
}
