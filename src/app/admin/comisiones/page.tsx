'use client';
import {useRef,useState} from 'react';
import {AdminProtectedRoute} from '@/components/AdminProtectedRoute';
import {AffiliateRegistryWorkspace} from '@/components/admin/AffiliateRegistryWorkspace';
import {AffiliateCommissionWorkspace} from '@/components/admin/AffiliateCommissionWorkspace';
import {AffiliateAdminHistory} from '@/components/admin/AffiliateAdminHistory';
import {useAuth} from '@/components/AuthProvider';
export default function AdminComisionesPage(){const {user}=useAuth();return <AdminProtectedRoute><Management key={user?.uid??'anonymous'}/></AdminProtectedRoute>;}
function Management(){const [selected,setSelected]=useState(''),account=useRef<HTMLDivElement>(null);return <main className="mx-auto max-w-6xl space-y-6 p-4 text-text-primary sm:p-6"><header><h1 className="text-2xl font-bold text-brand-primary sm:text-3xl">Vendedores afiliados y comisiones</h1><p className="mt-2 text-text-secondary">Administrá vendedores afiliados, asigná operaciones y registrá sus pagos desde un mismo lugar.</p></header><AffiliateRegistryWorkspace onSelect={id=>{setSelected(id);requestAnimationFrame(()=>account.current?.scrollIntoView({behavior:'smooth',block:'start'}));}}/><div ref={account} className="scroll-mt-4"><AffiliateCommissionWorkspace selectedId={selected} onSelect={setSelected}/></div><AffiliateAdminHistory/></main>;}
