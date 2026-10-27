"use client";
import { CuentaHogarLogo } from "@/components/CuentaHogarLogo";
import {useEffect,useState} from 'react';
import {useRouter} from 'next/navigation';
import Link from 'next/link';
import {useAuth} from '@/components/AuthProvider';
import {AffiliateOperationsV2} from '@/components/operations/AffiliateOperationsV2';
import {AffiliateCommissionPanel} from '@/components/operations/AffiliateCommissionPanel';
import {AffiliateCatalog} from '@/components/operations/AffiliateCatalog';
import {AffiliateHistoricalView} from '@/components/operations/AffiliateHistoricalView';

export default function AffiliatePortal(){
 const {user,loading,logout}=useAuth(),router=useRouter(),[error,setError]=useState('');
 useEffect(()=>{if(!loading&&!user)router.replace('/login-afiliado');},[loading,user,router]);
 if(loading||!user)return <main className="p-6">Verificando acceso…</main>;
 return <main className="mx-auto min-h-screen max-w-5xl space-y-6 bg-zinc-950 p-4 text-zinc-100 sm:p-6">
 <header className="space-y-3"><div className="flex flex-wrap items-center justify-between gap-3"><Link href="/" className="flex items-center gap-2"><CuentaHogarLogo className="h-12" />Cuenta Hogar</Link><button className="min-h-11 rounded border px-3" onClick={()=>void logout().catch(()=>setError('No se pudo cerrar la sesión. Reintentá.'))}>Cerrar sesión</button></div><p className="break-words">{user.email}</p>{error&&<p role="alert">{error}</p>}{!user.emailVerified&&<p role="alert">Verificá tu correo y consultá a Administración para habilitar el acceso.</p>}<h1 className="text-2xl font-bold">Mi panel de vendedor afiliado</h1><p>Colaborador independiente. Administración asigna las operaciones; vos realizás el seguimiento y consultás tu remuneración.</p>
 <nav aria-label="Mi panel" className="flex flex-wrap gap-3"><a className="min-h-11 rounded border p-3" href="#catalogo-afiliado">Catálogo</a><a className="min-h-11 rounded border p-3" href="#operaciones">Mis operaciones</a><a className="min-h-11 rounded border p-3" href="#comisiones">Mis comisiones y liquidaciones</a></nav></header>
 <div id="operaciones"><AffiliateOperationsV2/></div><div id="comisiones"><AffiliateCommissionPanel/></div><div id="catalogo-afiliado"><AffiliateCatalog/></div><AffiliateHistoricalView key={user.uid}/>
 </main>;
}
