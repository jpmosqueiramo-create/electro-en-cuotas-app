"use client";
import { CuentaHogarLogo } from "@/components/CuentaHogarLogo";
import {useEffect,useState} from 'react';
import {useRouter} from 'next/navigation';
import Link from 'next/link';
import {CalendarDays, Wallet, ShoppingBag, LogOut, ArrowUpRight} from 'lucide-react';
import {useAuth} from '@/components/AuthProvider';
import {AffiliateOperationsV2} from '@/components/operations/AffiliateOperationsV2';
import {AffiliateCommissionPanel} from '@/components/operations/AffiliateCommissionPanel';
import {AffiliateCatalog} from '@/components/operations/AffiliateCatalog';
import {AffiliateHistoricalView} from '@/components/operations/AffiliateHistoricalView';
import styles from './portal.module.css';

const links=[
 {id:'operaciones',label:'Cuotas de mis clientes',short:'Cuotas',description:'Vencimientos, cobros y contactos',icon:CalendarDays},
 {id:'comisiones',label:'Mis comisiones y liquidaciones',short:'Comisiones',description:'Tu saldo, pagos y efectivo en custodia',icon:Wallet},
 {id:'catalogo-afiliado',label:'Catálogo',short:'Catálogo',description:'Productos y planes para consultar',icon:ShoppingBag},
];
export default function AffiliatePortal(){
 const {user,loading,logout}=useAuth(),router=useRouter(),[error,setError]=useState(''),[active,setActive]=useState('operaciones');
 useEffect(()=>{if(!loading&&!user)router.replace('/login-afiliado');},[loading,user,router]);
 useEffect(()=>{const sync=()=>setActive(window.location.hash.slice(1)||'operaciones');sync();window.addEventListener('hashchange',sync);return()=>window.removeEventListener('hashchange',sync);},[]);
 if(loading||!user)return <main className="min-h-screen bg-background-main p-6 text-brand-primary"><p role="status">Verificando acceso…</p></main>;
 return <main data-testid="affiliate-portal" className={`${styles.portal} min-h-screen bg-background-main px-3 py-4 text-text-primary sm:px-6 sm:py-8`}>
 <a href="#operaciones" className="admin-skip">Saltar a mis clientes</a>
 <div className="mx-auto max-w-7xl space-y-5 sm:space-y-7">
 <header className="rounded-3xl border border-border-color bg-surface p-5 shadow-sm sm:p-7">
  <div className="flex flex-wrap items-center justify-between gap-4"><Link href="/" className="flex min-w-0 items-center gap-3"><CuentaHogarLogo className="h-12 sm:h-14" priority/><span><span className="block text-xs font-semibold uppercase tracking-wider text-brand-secondary">Vendedor afiliado</span><span className="font-heading text-xl font-bold text-brand-primary">Cuenta Hogar</span></span></Link><button type="button" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-border-color px-3 text-sm font-semibold text-brand-primary hover:bg-background-main" onClick={()=>void logout().catch(()=>setError('No se pudo cerrar la sesión. Reintentá.'))}><LogOut size={17} aria-hidden="true"/>Cerrar sesión</button></div>
  <div className="mt-6 flex flex-wrap items-end justify-between gap-4"><div className="min-w-0"><h1 className="font-heading text-2xl font-bold text-brand-primary sm:text-3xl">Tu gestión, en un solo lugar</h1><p className="mt-2 max-w-2xl text-text-secondary">Seguí las cuotas de tus clientes, registrá contactos y consultá tus comisiones.</p></div><p className="flex min-w-0 items-center gap-2 rounded-xl bg-background-main px-3 py-2 text-sm"><span className="h-2 w-2 shrink-0 rounded-full bg-success" aria-hidden="true"/><span className="min-w-0 break-all">{user.email}</span></p></div>
  {error&&<p role="alert" className="mt-3 rounded-xl bg-red-50 p-3 text-red-900">{error}</p>}{!user.emailVerified&&<p role="alert" className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-amber-950">Verificá tu correo y consultá a Administración para habilitar el acceso.</p>}
 </header>
 <nav aria-label="Mi panel" className="sticky top-0 z-20 grid grid-cols-3 gap-1 rounded-2xl border border-border-color bg-surface p-1.5 shadow-sm sm:gap-2 sm:p-2">{links.map(({id,label,short,description,icon:Icon})=><a key={id} aria-label={label} aria-current={active===id?'location':undefined} href={`#${id}`} className={`flex min-h-11 min-w-0 items-center gap-2 rounded-xl p-2.5 transition-colors sm:gap-3 sm:p-4 ${active===id?'bg-brand-primary text-white':'text-brand-primary hover:bg-background-main'}`}><Icon className="hidden shrink-0 sm:block" size={22} aria-hidden="true"/><span className="min-w-0"><span className="block text-center text-sm font-bold sm:text-left sm:text-base">{short}</span><span className={`mt-0.5 hidden text-xs sm:block ${active===id?'text-white/80':'text-text-secondary'}`}>{description}</span></span><ArrowUpRight size={16} className="ml-auto hidden shrink-0 lg:block" aria-hidden="true"/></a>)}</nav>
 <div id="operaciones" className="scroll-mt-28"><AffiliateOperationsV2/></div>
 <div id="comisiones" className="scroll-mt-28"><AffiliateCommissionPanel/></div>
 <div id="catalogo-afiliado" className="scroll-mt-28"><AffiliateCatalog/></div>
 <AffiliateHistoricalView key={user.uid}/>
 <footer className="px-2 pb-3 text-center text-xs text-text-secondary">Vendedores afiliados independientes · Administración asigna las operaciones y gestiona las liquidaciones.</footer>
 </div></main>;
}
