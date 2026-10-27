'use client';
import Link from 'next/link';
import {ADMIN_DESTINATIONS,activeAdminDestination} from './navigation';
export function AdminHorizontalNav({pathname}:{pathname:string}){
 const active=activeAdminDestination(pathname),items=ADMIN_DESTINATIONS.filter(item=>item.id!=='laboratory');
 const links=items.map(({id,label,href,icon:Icon})=><Link key={id} href={href} aria-current={active===id?'page':undefined} onClick={e=>e.currentTarget.closest('details')?.removeAttribute('open')} className={`admin-control inline-flex min-h-11 min-w-0 items-center gap-2 rounded-xl px-3 py-2 font-heading text-sm font-semibold ${active===id?'bg-brand-primary text-white':'text-text-primary hover:bg-background-main'}`}><Icon aria-hidden="true" className={`size-4 shrink-0 ${active===id?'text-white':'text-brand-secondary'}`}/><span>{id==='today'?'Inicio':label}</span></Link>);
 return <nav aria-label="Secciones de administración" className="min-w-0 rounded-2xl border border-border-color bg-surface p-2 shadow-xs"><div className="hidden flex-wrap gap-1 md:flex">{links}</div><details className="md:hidden"><summary className="admin-control min-h-11 cursor-pointer rounded-xl px-3 py-2 font-semibold text-brand-primary">Menú · {items.find(item=>item.id===active)?.label??'Administración'}</summary><div className="mt-2 grid min-w-0 grid-cols-2 gap-1">{links}</div></details></nav>;
}
