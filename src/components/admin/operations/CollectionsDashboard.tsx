'use client';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Search, MessageCircle, RefreshCw, AlertCircle, CalendarDays, CheckCircle2, ArrowUpRight } from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import { OperationContactPanel } from '@/components/operations/OperationContactPanel';
import { argentinaBusinessDate } from '@/lib/productionV2/businessDate';
import { collectionLabels, collectionStatus, matchesCollectionFilter, loadCollections, installmentWhatsApp, overdueBalance, selectCollections, type CollectionFilter, type CollectionRow } from '@/lib/collectionsOverview';
const money = (cents: number) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 2 }).format(cents / 100);
const date = (value: string | null) => value ? value.split('-').reverse().join('/') : 'Sin registrar';
const input = 'admin-control min-h-11 w-full min-w-0 rounded-xl border border-border-color bg-surface px-3 py-2 text-text-primary';
const tones = { OVERDUE: 'border-red-200 bg-red-50 text-red-900', TODAY: 'border-amber-300 bg-amber-50 text-amber-950', CURRENT: 'border-emerald-200 bg-emerald-50 text-emerald-900', PAID: 'border-emerald-200 bg-emerald-50 text-emerald-900', INACTIVE: 'border-border-color bg-background-main text-text-primary', UNKNOWN: 'border-orange-200 bg-orange-50 text-orange-950' };
export function CollectionsDashboard() {
  const { user } = useAuth();
  return <CollectionsSession key={user?.uid ?? 'anonymous'} />;
}
function CollectionsSession() {
  const { user } = useAuth();
  const [rows, setRows] = useState<CollectionRow[] | null>(null), [error, setError] = useState(false), [loading, setLoading] = useState(false);
  const [query, setQuery] = useState(''), [status, setStatus] = useState<CollectionFilter>('ALL'), [from, setFrom] = useState(''), [to, setTo] = useState(''), [sort, setSort] = useState('DUE');
  const [today, setToday] = useState('');
  const sequence = useRef(0), abort = useRef<AbortController | null>(null);
  const refresh = useCallback(async () => {
    if (!user) return;
    const current = ++sequence.current;
    abort.current?.abort(); const controller = new AbortController(); abort.current = controller;
    setLoading(true); setError(false); setToday(argentinaBusinessDate());
    try {
      const token = await user.getIdToken();
      const next = await loadCollections(async url => {
        const response = await fetch(url, { cache: 'no-store', signal: controller.signal, headers: { Authorization: `Bearer ${token}` } });
        if (!response.ok) throw Error('READ_FAILED');
        return response.json();
      });
      if (current === sequence.current && !controller.signal.aborted) setRows(next);
    } catch { if (current === sequence.current && !controller.signal.aborted) setError(true); setRows(null); }
    finally { if (current === sequence.current && !controller.signal.aborted) setLoading(false); }
  }, [user]);
  const invalidate = useCallback(() => { ++sequence.current; abort.current?.abort(); }, []);
  useEffect(() => {
    const visibleRefresh = () => { if (!document.hidden) void refresh(); };
    void refresh(); const timer = window.setInterval(visibleRefresh, 60000);
    window.addEventListener('focus', visibleRefresh); window.addEventListener('online', visibleRefresh);
    window.addEventListener('operation-financial-updated', visibleRefresh); document.addEventListener('visibilitychange', visibleRefresh);
    return () => { invalidate(); clearInterval(timer); window.removeEventListener('focus', visibleRefresh); window.removeEventListener('online', visibleRefresh); window.removeEventListener('operation-financial-updated', visibleRefresh); document.removeEventListener('visibilitychange', visibleRefresh); };
  }, [refresh, invalidate]);
  const invalidRange = !!from && !!to && from > to;
  const visible = invalidRange ? [] : selectCollections(rows ?? [], { query, status, from, to, sort }, today);
  const count = (filter: CollectionFilter) => rows?.filter(row => matchesCollectionFilter(row, filter, today)).length ?? 0;
  const overdue = (rows ?? []).reduce((sum, row) => sum + overdueBalance(row), 0);
  const unknown = count('UNKNOWN');
  return <section data-testid="collections-dashboard" aria-busy={loading} className="min-w-0 space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><p className="max-w-2xl text-text-secondary">Encontrá a quién contactar y consultá cuotas, pagos y recibos desde su ficha.</p><button type="button" className="admin-control inline-flex min-h-11 items-center gap-2 rounded-xl border border-border-color bg-surface px-4 font-semibold text-brand-primary disabled:opacity-50" disabled={loading || !user} onClick={() => void refresh()}><RefreshCw size={18} aria-hidden="true" />Actualizar cobranzas</button></div>
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Resumen de cobranzas">
      {([{ filter: 'ALL', title: 'Operaciones', icon: Search }, { filter: 'OVERDUE', title: 'Con cuotas vencidas', icon: AlertCircle }, { filter: 'TODAY', title: 'Vencen hoy', icon: CalendarDays }, { filter: 'CURRENT', title: 'Al día', icon: CheckCircle2 }] as const).map(item => <button type="button" key={item.filter} aria-pressed={status === item.filter} onClick={() => setStatus(item.filter)} className={`admin-control min-w-0 rounded-2xl border p-4 text-left ${item.filter === 'ALL' ? 'border-brand-primary bg-brand-primary text-white' : tones[item.filter]} ${status === item.filter ? 'ring-2 ring-brand-primary ring-offset-2' : ''}`}><item.icon size={20} aria-hidden="true" /><span className="mt-2 block text-sm font-semibold">{item.title}</span><span className="block text-3xl font-bold tabular-nums">{rows ? count(item.filter) : '—'}</span>{item.filter === 'OVERDUE' && <span className="mt-1 block break-words text-xs">{rows ? money(overdue) : '—'} pendientes vencidos</span>}</button>)}
    </div>
    <div className="space-y-4 rounded-2xl border border-border-color bg-surface p-4 sm:p-5">
      <div className="grid min-w-0 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <label className="min-w-0 space-y-1 xl:col-span-2"><span className="font-semibold">Buscar cliente o contrato</span><input type="search" aria-label="Buscar cliente o contrato" className={input} placeholder="Nombre, apellido o número CH" value={query} onChange={e => setQuery(e.target.value)} /><span className="block text-xs text-text-secondary">Nombre y apellido en cualquier orden, con o sin tildes.</span></label>
        <label className="min-w-0 space-y-1"><span className="font-semibold">Fecha de venta desde</span><input type="date" className={input} value={from} onChange={e => setFrom(e.target.value)} /></label>
        <label className="min-w-0 space-y-1"><span className="font-semibold">Fecha de venta hasta</span><input type="date" className={input} value={to} onChange={e => setTo(e.target.value)} /></label>
        <label className="min-w-0 space-y-1"><span className="font-semibold">Estado de cuotas</span><select className={input} value={status} onChange={e => setStatus(e.target.value as CollectionFilter)}>{Object.entries(collectionLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label className="min-w-0 space-y-1"><span className="font-semibold">Ordenar por</span><select className={input} value={sort} onChange={e => setSort(e.target.value)}><option value="DUE">Vencimiento más antiguo</option><option value="SALE">Venta más reciente</option><option value="NAME">Nombre y apellido</option></select></label>
        <div className="flex items-end"><button type="button" className="admin-control min-h-11 rounded-xl border border-border-color px-4 font-semibold text-brand-primary" onClick={() => { setQuery(''); setStatus('ALL'); setFrom(''); setTo(''); setSort('DUE'); }}>Limpiar filtros</button></div>
      </div>
      <p className="text-xs text-text-secondary">Fecha de venta: aceptación del presupuesto, según el día de Argentina. Los importes provienen del plan guardado.</p>
      {invalidRange && <p role="alert" className="text-red-800">La fecha desde debe ser anterior o igual a la fecha hasta.</p>}
    </div>
    {loading && <p role="status">Consultando cuotas y saldos…</p>}
    {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-900">No se pudo consultar la bandeja. Usá Actualizar cobranzas para reintentar.</p>}
    {!!unknown && <p role="alert" className="rounded-xl border border-orange-200 bg-orange-50 p-4 text-orange-950">Hay {unknown} operaciones sin verificar. Sus saldos no se cuentan como cero ni como al día. Actualizá la consulta antes de contactar.</p>}
    {rows && <p role="status" className="text-sm text-text-secondary">{visible.length} de {rows.length} operaciones · Rojo: vencidas · Ámbar: vencen hoy · Verde: al día o canceladas.</p>}
    {rows && !visible.length && <div className="rounded-2xl border border-dashed border-border-color p-8 text-center"><h2 className="font-semibold">{rows.length ? 'No hay coincidencias con estos filtros' : 'Todavía no hay operaciones aceptadas'}</h2><p className="mt-1 text-text-secondary">{rows.length ? 'Probá otro nombre, estado o rango de fechas.' : 'Las operaciones aparecerán aquí cuando se acepte un presupuesto.'}</p></div>}
    <div className="grid min-w-0 gap-4 lg:grid-cols-2">{visible.map(row => <CollectionCard key={row.key} row={row} today={today} />)}</div>
  </section>;
}
function CollectionCard({ row, today }: { row: CollectionRow; today: string }) {
  const state = collectionStatus(row, today), f = row.financial, whatsapp = installmentWhatsApp(row, today);
  return <article data-testid="collection-row" className="min-w-0 space-y-4 rounded-2xl border border-border-color bg-surface p-4 sm:p-5">
    <div className="flex flex-wrap items-start justify-between gap-2"><div className="min-w-0"><h2 className="break-words text-lg font-bold text-brand-primary">{row.name}</h2><p className="break-words text-sm text-text-secondary">{row.product}</p></div><span className={`rounded-full border px-3 py-1 text-xs font-bold ${tones[state]}`}>{collectionLabels[state]}</span></div>
    <p className="text-sm">Fecha de venta: <strong>{date(row.saleDate)}</strong>{f?.active && <span className="ml-2 break-words">· {f.contractNumber}</span>}</p>
    {f?.active ? <><dl className="grid grid-cols-2 gap-4"><div><dt className="text-sm text-text-secondary">Saldo pendiente</dt><dd className="break-words text-xl font-bold tabular-nums">{money(f.balanceCents)}</dd></div><div><dt className="text-sm text-text-secondary">Importe vencido</dt><dd className={`break-words text-xl font-bold tabular-nums ${f.overdueCount ? 'text-red-800' : 'text-text-primary'}`}>{money(overdueBalance(row))}</dd></div><div><dt className="text-sm text-text-secondary">Cuotas pagadas / total</dt><dd className="font-semibold">{f.paidInstallmentCount} / {f.installments.length}</dd></div><div><dt className="text-sm text-text-secondary">Cuotas vencidas</dt><dd className="font-semibold">{f.overdueCount}</dd></div></dl><p className="rounded-xl bg-background-main p-3 text-sm">{f.nextDueDate ? <>Próxima cuota pendiente: <strong>{date(f.nextDueDate)} · {money(f.nextDueAmountCents)}</strong></> : 'Sin cuotas pendientes.'}</p></> : <p className="text-sm text-text-secondary">{f ? 'El plan de cuotas todavía no está activo. Consultá la primera cuota desde la ficha.' : 'No se pudo verificar el estado de esta operación.'}</p>}
    <Link className="btn-primary admin-control w-full whitespace-normal text-center" href={`/admin/operaciones/${encodeURIComponent(row.budgetId)}/${row.version}?section=logistics`}>Ver cuotas y registrar pago<ArrowUpRight size={18} aria-hidden="true" /></Link>
    {whatsapp ? <div><a className="admin-control inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-emerald-700 bg-emerald-50 px-3 py-2 text-center font-semibold text-emerald-900" href={whatsapp} target="_blank" rel="noopener noreferrer"><MessageCircle size={18} aria-hidden="true" />Recordar cuota por WhatsApp</a><p className="mt-1 text-xs text-text-secondary">Abre un mensaje para revisar y enviar. No se envía automáticamente.</p></div> : (state === 'OVERDUE' || state === 'TODAY') && <p className="text-sm text-text-secondary">Revisá el WhatsApp del cliente, con código de país, para abrir el recordatorio.</p>}
    <OperationContactPanel budgetId={row.budgetId} version={row.version} role="ADMIN" />
  </article>;
}
