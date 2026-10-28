'use client';
import type { ReactNode } from 'react';
import { emptyFollowupFilters, followupAge, followupDate, followupLabels, followupMoney, followupStatus, matchesFollowup, selectAffiliateFollowup, type AffiliateFollowup, type FollowupFilters, type FollowupStatus } from '@/lib/affiliateFollowup';
import { useState } from 'react';
interface Row { client: string; locality: string; product: string; operationId: string; saleDate?: string | null; followup?: AffiliateFollowup }
const field = 'min-h-11 w-full min-w-0 rounded-lg border border-stone-300 bg-white px-3 text-stone-900';
export function FollowupDetails({children}: {children: ReactNode}) {
  const [opened, setOpened] = useState(false);
  return <details className="rounded-lg border border-stone-300" onToggle={event => {if(event.currentTarget.open)setOpened(true);}}><summary className="min-h-11 cursor-pointer p-3 font-semibold text-teal-950">Ver cuotas, contactos y operación</summary>{opened ? children : null}</details>;
}
export function AffiliateFollowupOverview<T extends Row>({ rows, children }: { rows: T[]; children: (row: T) => ReactNode }) {
  const [filters, setFilters] = useState<FollowupFilters>(emptyFollowupFilters);
  const update = (key: keyof FollowupFilters, value: string) => setFilters(old => ({ ...old, [key]: value }));
  const selected = selectAffiliateFollowup(rows, filters);
  return <div className="min-w-0 space-y-4 rounded-xl bg-stone-50 p-3 text-stone-900 sm:p-5">
    <div><h3 className="text-xl font-bold text-teal-950">Cuotas de mis clientes</h3><p className="text-sm text-stone-600">Vencimientos, saldos y contactos de tus operaciones asignadas. Los pagos se acreditan desde Administración.</p></div>
    <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">{(['ALL', 'OVERDUE', 'TODAY', 'SOON'] as FollowupStatus[]).map(status => <button key={status} aria-label={followupLabels[status]} aria-pressed={filters.status === status} onClick={() => update('status', status)} className={`min-h-20 rounded-xl border p-3 text-left ${filters.status === status ? 'border-teal-800 bg-teal-50 ring-1 ring-teal-800' : 'border-stone-300 bg-white'}`}><span className="block text-sm">{followupLabels[status]}</span><strong className={`text-2xl ${status === 'OVERDUE' ? 'text-red-800' : 'text-teal-950'}`}>{rows.filter(r => matchesFollowup(r.followup, status)).length}</strong><span className="block text-xs text-stone-600">clientes / planes</span></button>)}</div>
    <div className="grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <label className="min-w-0 text-sm">Buscar cliente o contrato<input className={field} value={filters.query} onChange={e => update('query', e.target.value)} placeholder="Nombre, apellido, localidad o CH" type="search"/></label>
      <label className="text-sm">Estado de cuotas<select className={field} value={filters.status} onChange={e => update('status', e.target.value)}>{Object.entries(followupLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
      <label className="text-sm">Antigüedad del atraso<select className={field} value={filters.age} onChange={e => update('age', e.target.value)}><option value="">Cualquier antigüedad</option><option value="1:7">1 a 7 días</option><option value="8:30">8 a 30 días</option><option value="31:60">31 a 60 días</option><option value="61:90">61 a 90 días</option><option value="91:999999">Más de 90 días</option></select></label>
      <label className="text-sm">Fecha de venta desde<input className={field} type="date" value={filters.from} onChange={e => update('from', e.target.value)}/></label>
      <label className="text-sm">Fecha de venta hasta<input className={field} type="date" value={filters.to} onChange={e => update('to', e.target.value)}/></label>
      <label className="text-sm">Ordenar por<select className={field} value={filters.sort} onChange={e => update('sort', e.target.value)}><option value="PRIORITY">Requieren atención primero</option><option value="AGE">Mayor atraso</option><option value="DUE">Vencimiento más antiguo</option><option value="SALE">Ventas más recientes</option><option value="NAME">Nombre del cliente</option></select></label>
    </div>
    <div className="flex flex-wrap items-center justify-between gap-2"><p role="status">{selected.length} de {rows.length} planes</p><button className="min-h-11 rounded-lg border border-stone-300 bg-white px-3" onClick={() => setFilters(emptyFollowupFilters)}>Limpiar filtros</button></div>
    {filters.from && filters.to && filters.from > filters.to && <p role="alert" className="text-red-800">La fecha desde debe ser anterior o igual a la fecha hasta.</p>}
    {!selected.length && <p className="rounded-lg bg-white p-4">{rows.length ? 'No hay clientes que coincidan con estos filtros.' : 'Todavía no tenés operaciones asignadas.'}</p>}
    {selected.map(row => {
      const f = row.followup, status = followupStatus(f), unpaid = f?.installments.filter(i => i.balanceCents > 0) ?? [], next = unpaid[0];
      const overdue = unpaid.filter(i => i.overdue), overdueCents = overdue.reduce((sum, i) => sum + i.balanceCents, 0);
      return <article key={row.operationId} data-testid="affiliate-followup-card" className="min-w-0 space-y-3 rounded-xl border border-stone-300 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap justify-between gap-2"><h4 className="min-w-0 break-words text-lg font-bold text-teal-950">{row.client}</h4><span className={`rounded-full px-3 py-1 text-sm font-semibold ${status === 'OVERDUE' ? 'bg-red-100 text-red-900' : status === 'TODAY' ? 'bg-amber-100 text-amber-900' : status === 'CURRENT' || status === 'PAID' ? 'bg-emerald-100 text-emerald-900' : 'bg-stone-100 text-stone-800'}`}>{followupLabels[status]}</span></div>
        <p className="break-words text-sm text-stone-600">{row.product} · {row.locality || 'Sin localidad'}</p>
        <p className="text-sm">Venta: {followupDate(row.saleDate)} · Contrato: {f?.contractNumber ?? 'Sin emisión verificada'}</p>
        <div className="grid gap-3 sm:grid-cols-3"><div><p className="text-sm text-stone-600">Saldo del plan</p><strong>{f?.state === 'ACTIVE' ? followupMoney(f.balanceCents) : 'Sin saldo verificado'}</strong></div><div><p className="text-sm text-stone-600">{next?.overdue ? 'Cuota pendiente más antigua' : 'Próximo vencimiento'}</p><strong>{next ? `${followupDate(next.dueDate)} · ${followupMoney(next.balanceCents)}` : status === 'PAID' ? 'Sin cuotas pendientes' : 'Sin vencimiento verificado'}</strong>{next && <p className="text-sm">Cuota {next.number}</p>}</div><div><p className="text-sm text-stone-600">Cuotas vencidas</p><strong>{f?.state === 'ACTIVE' ? `${overdue.length} · ${followupMoney(overdueCents)}` : 'Sin verificar'}</strong>{overdue.length > 0 && <p className="text-sm text-red-800">Mayor atraso: {followupAge(f)} días</p>}</div></div>
        {f?.state === 'UNKNOWN' && <p role="alert" className="text-amber-900">No se pudo verificar esta cuenta. Actualizá antes de gestionar el cobro.</p>}
        {f && <p className="text-xs text-stone-500">Actualizado al {followupDate(f.asOfDate)} · Calendario de Argentina</p>}
        {children(row)}
      </article>;
    })}
  </div>;
}
