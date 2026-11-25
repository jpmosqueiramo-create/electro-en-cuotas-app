'use client';

import Link from 'next/link';
import { useState } from 'react';
import { AlertCircle, ArrowUpRight, Banknote, ClipboardCheck, Search } from 'lucide-react';
import { collectionInboxCases, selectInboxCases, type CollectionsInboxData, type InboxFilter } from '@/lib/collectionsInbox';
import type { CollectionRow } from '@/lib/collectionsOverview';

const money = (cents: number) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(cents / 100);
const date = (value: string) => value.slice(0, 10).split('-').reverse().join('/');
const button = 'admin-control inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border-color bg-surface px-4 py-2 font-semibold text-brand-primary';
const tones = { OVERDUE: 'border-red-200 bg-red-50 text-red-900', REPORTS: 'border-amber-300 bg-amber-50 text-amber-950', CASH: 'border-blue-200 bg-blue-50 text-blue-950' };
const sum = (values: number[]) => { const result = values.reduce((n, v) => n + v, 0); return Number.isSafeInteger(result) ? result : null; };

export function CollectionsInbox({ data, loading, onManage, onRemittance }: { data: CollectionsInboxData | null; loading: boolean; onManage: (row: CollectionRow) => void; onRemittance: (id: string) => void }) {
  const [filter, setFilter] = useState<InboxFilter>('ALL'), [query, setQuery] = useState(''), [limit, setLimit] = useState(20);
  const cases = data ? collectionInboxCases(data) : [];
  const visible = selectInboxCases(cases, filter, query);
  const overdue = cases.filter(c => c.kind === 'OPERATION' && c.overdueCount > 0);
  const cash = cases.filter(c => c.kind === 'CASH');
  const unknownCollections = data?.collections?.filter(r => !r.financial).length ?? 0;
  const unknownVendors = data?.vendors?.filter(v => v.cashCents === null).length ?? 0;
  const partial = !!data && (data.collections === null || data.reports === null || data.vendors === null || unknownCollections > 0 || unknownVendors > 0);
  const summaries = [
    { id: 'OVERDUE', title: 'Cuotas vencidas', count: data?.collections ? overdue.reduce((n, c) => n + (c.kind === 'OPERATION' ? c.overdueCount : 0), 0) : null, amount: data?.collections ? sum(overdue.map(c => c.kind === 'OPERATION' ? c.overdueCents : 0)) : null, partial: unknownCollections > 0, hint: `${overdue.length} ${overdue.length === 1 ? 'operación' : 'operaciones'} · saldo vencido`, icon: AlertCircle },
    { id: 'REPORTS', title: 'Pagos por confirmar', count: data?.reports?.length ?? null, amount: data?.reports ? sum(data.reports.map(r => r.amountCents)) : null, partial: false, hint: 'Avisos aún sin acreditar', icon: ClipboardCheck },
    { id: 'CASH', title: 'Rendiciones pendientes', count: data?.vendors ? cash.length : null, amount: data?.vendors ? sum(cash.map(c => c.kind === 'CASH' ? c.vendor.cashCents! : 0)) : null, partial: unknownVendors > 0, hint: 'Vendedores afiliados · efectivo en custodia', icon: Banknote },
  ] as const;
  const choose = (value: InboxFilter) => { setFilter(value); setLimit(20); };

  return <section data-testid="collections-inbox" className="min-w-0 space-y-4" aria-labelledby="collections-inbox-title">
    <div><h2 id="collections-inbox-title" tabIndex={-1} className="text-xl font-bold text-brand-primary">Pendientes para resolver</h2><p className="mt-1 text-sm text-text-secondary">Cuotas, avisos de pago y efectivo de vendedores afiliados, reunidos por caso. Operaciones del circuito actual.</p></div>
    <div className="grid min-w-0 gap-3 md:grid-cols-3" aria-label="Pendientes de cobranzas">
      {summaries.map(s => <button type="button" key={s.id} aria-pressed={filter === s.id} onClick={() => choose(filter === s.id ? 'ALL' : s.id)} className={`admin-control min-w-0 rounded-2xl border p-4 text-left ${tones[s.id]} ${filter === s.id ? 'ring-2 ring-brand-primary ring-offset-2' : ''}`}>
        <span className="flex items-center gap-2 text-sm font-bold"><s.icon size={20} aria-hidden="true" />{s.title}</span>
        <span className="mt-2 block text-3xl font-bold tabular-nums">{s.count === null ? '—' : `${s.count}${s.partial ? '+' : ''}`}</span>
        <span className="mt-1 block break-words text-lg font-bold tabular-nums">{s.amount === null ? 'Importe sin verificar' : `${money(s.amount)}${s.partial ? ' verificados' : ''}`}</span>
        <span className="mt-1 block text-xs">{s.hint}</span>
      </button>)}
    </div>
    <p className="text-sm text-text-secondary">Los importes representan etapas distintas y pueden coincidir en un mismo caso. No se suman como una deuda total. El efectivo en custodia ya fue acreditado al cliente; la comisión retenida se revisa al rendir.</p>
    {data && <div className="space-y-2" data-testid="collections-source-status">
      {data.collections === null && <p role="alert" className="rounded-xl bg-red-50 p-3 text-red-900">No se pudieron consultar las cuotas. Su cantidad e importe están sin verificar.</p>}
      {data.reports === null && <p role="alert" className="rounded-xl bg-amber-50 p-3 text-amber-950">No se pudieron consultar todos los pagos por confirmar. Revisá el pago informado de cada caso antes de registrar otro cobro o contactar al cliente.</p>}
      {data.vendors === null && <p role="alert" className="rounded-xl bg-red-50 p-3 text-red-900">No se pudieron consultar las rendiciones de los vendedores afiliados.</p>}
      {(unknownCollections > 0 || unknownVendors > 0) && <p role="alert" className="rounded-xl bg-amber-50 p-3 text-amber-950">Consulta parcial: {unknownCollections} operaciones y {unknownVendors} cuentas de vendedores afiliados sin verificar. Sus saldos no se consideran cero. Actualizá para reintentar.</p>}
    </div>}
    <div className="flex min-w-0 flex-wrap items-end gap-3">
      <button type="button" className={button} aria-pressed={filter === 'ALL'} onClick={() => choose('ALL')}>Todos los pendientes</button>
      <label className="min-w-0 flex-1 space-y-1"><span className="flex items-center gap-2 text-sm font-semibold"><Search size={16} aria-hidden="true" />Buscar en los pendientes</span><input className="admin-control min-h-11 w-full min-w-0 rounded-xl border border-border-color bg-surface px-3 text-text-primary" type="search" aria-label="Buscar en los pendientes" placeholder="Cliente, contrato o vendedor afiliado" value={query} onChange={e => { setQuery(e.target.value); setLimit(20); }} /></label>
    </div>
    {loading && <p role="status">Consultando los tres pendientes…</p>}
    {data && <p role="status" className="text-sm text-text-secondary">{visible.length} {visible.length === 1 ? 'caso' : 'casos'}{filter !== 'ALL' || query ? ' con estos filtros' : ' para revisar'}{partial ? ' · Consulta incompleta.' : '.'}{filter !== 'CASH' && data.reports && data.reports.length > 0 ? ' Primero, revisá los avisos de pago.' : ''}</p>}
    {data && !visible.length && <p className="rounded-xl border border-dashed border-border-color p-5">{partial ? 'No hay pendientes verificados con esta selección. Completá la consulta antes de darla por cerrada.' : filter === 'ALL' && !query ? 'No hay pendientes en las tres fuentes consultadas.' : 'No hay coincidencias. Probá otra búsqueda o Todos los pendientes.'}</p>}
    <div className="grid min-w-0 gap-3 lg:grid-cols-2">
      {visible.slice(0, limit).map(item => item.kind === 'CASH' ? <article key={item.key} data-testid="collections-cash-case" className="min-w-0 space-y-3 rounded-2xl border border-blue-200 bg-surface p-4">
        <span className="inline-block rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-950">Rendición pendiente{item.vendor.active ? '' : ' · Vendedor afiliado inactivo'}</span>
        <h3 className="break-words text-lg font-bold text-brand-primary">{item.name}</h3>
        <p className="text-sm text-text-secondary">Efectivo pendiente de entrega</p><p className="break-words text-2xl font-bold tabular-nums">{money(item.vendor.cashCents!)}</p>
        <button type="button" className={button + ' w-full'} onClick={() => onRemittance(item.vendor.id)}>Revisar rendición<ArrowUpRight size={18} aria-hidden="true" /></button>
      </article> : <article key={item.key} data-testid="collections-operation-case" className="min-w-0 space-y-3 rounded-2xl border border-border-color bg-surface p-4">
        <div className="flex flex-wrap gap-2">{item.reports.length > 0 && <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-950">{item.reports.length} {item.reports.length === 1 ? 'pago por confirmar' : 'pagos por confirmar'}</span>}{item.overdueCount > 0 && <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-bold text-red-900">{item.overdueCount} {item.overdueCount === 1 ? 'cuota vencida' : 'cuotas vencidas'}</span>}</div>
        <h3 className="break-words text-lg font-bold text-brand-primary">{item.name}</h3>
        {item.row?.financial?.active && <p className="break-words text-sm text-text-secondary">{item.row.financial.contractNumber}</p>}
        {item.overdueCount > 0 && <p className="text-sm">Saldo vencido: <strong className="break-words text-lg tabular-nums text-red-800">{money(item.overdueCents)}</strong><span className="block text-text-secondary">Primer vencimiento: {date(item.oldestDue!)}</span></p>}
        {item.reports.length > 0 && <div className="space-y-2 rounded-xl bg-amber-50 p-3 text-amber-950"><p className="text-sm font-semibold">Revisá estos avisos antes de reclamar o cargar otro pago.</p>{item.reports.map(r => <p className="break-words text-sm" key={r.id}><strong className="tabular-nums">{money(r.amountCents)}</strong> · {r.method === 'EFECTIVO' ? 'Efectivo' : 'Transferencia'} · {date(r.effectiveDate)}<span className="block">Informó: {r.reportedBy === 'AFFILIATE' ? 'vendedor afiliado' : 'cliente'} · Pendiente de acreditación</span></p>)}</div>}
        {data?.reports === null && <p className="text-sm text-amber-950">Pagos informados sin verificar.</p>}
        {item.row ? <button type="button" className={button + ' w-full'} onClick={() => onManage(item.row!)}>{item.reports.length ? 'Revisar pago informado' : 'Gestionar cuota vencida'}<ArrowUpRight size={18} aria-hidden="true" /></button> : <Link className={button + ' w-full'} href={`/admin/operaciones/${encodeURIComponent(item.budgetId)}/${item.version}?section=payments`}>Revisar pago informado<ArrowUpRight size={18} aria-hidden="true" /></Link>}
      </article>)}
    </div>
    {visible.length > limit && <button type="button" className={button} onClick={() => setLimit(n => n + 20)}>Ver más casos · {visible.length - limit} restantes</button>}
  </section>;
}
