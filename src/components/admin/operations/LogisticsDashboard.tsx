'use client';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Package, Store, Warehouse, CheckCircle2, RefreshCw, ArrowUpRight } from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import { loadLogistics, logisticsLabels, logisticsStage, guidedLogisticsAction, guidedLogisticsLabels, matchesLogistics, selectLogistics, type LogisticsRow, type LogisticsFilter } from '@/lib/logisticsOverview';
const date = (value: string | null | undefined) => value ? value.split('-').reverse().join('/') : 'Sin registrar';
const control = 'admin-control min-h-11 w-full min-w-0 rounded-xl border border-border-color bg-surface px-3 py-2 text-text-primary';
export function LogisticsDashboard() { const { user } = useAuth(); return <LogisticsSession key={user?.uid ?? 'anonymous'} />; }
function LogisticsSession() {
  const { user } = useAuth();
  const [rows, setRows] = useState<LogisticsRow[] | null>(null), [error, setError] = useState(false), [loading, setLoading] = useState(false);
  const [query, setQuery] = useState(''), [filter, setFilter] = useState<LogisticsFilter>('ACTIVE');
  const sequence = useRef(0), controller = useRef<AbortController | null>(null);
  const invalidate = useCallback(() => { ++sequence.current; controller.current?.abort(); }, []);
  const refresh = useCallback(async () => {
    if (!user) return;
    invalidate(); const current = sequence.current, abort = new AbortController(); controller.current = abort;
    setLoading(true); setError(false);
    try {
      const token = await user.getIdToken();
      const next = await loadLogistics(async url => {
        const r = await fetch(url, { cache: 'no-store', signal: abort.signal, headers: { Authorization: `Bearer ${token}` } });
        if (!r.ok) throw Error(); return r.json();
      });
      if (current === sequence.current && !abort.signal.aborted) setRows(next);
    } catch { if (current === sequence.current && !abort.signal.aborted) { setRows(null); setError(true); } }
    finally { if (current === sequence.current && !abort.signal.aborted) setLoading(false); }
  }, [user, invalidate]);
  useEffect(() => {
    const visible = () => { if (!document.hidden) void refresh(); };
    void refresh(); const timer = window.setInterval(visible, 60000);
    window.addEventListener('focus', visible); window.addEventListener('online', visible); window.addEventListener('operation-logistics-updated', visible); document.addEventListener('visibilitychange', visible);
    return () => { invalidate(); clearInterval(timer); window.removeEventListener('focus', visible); window.removeEventListener('online', visible); window.removeEventListener('operation-logistics-updated', visible); document.removeEventListener('visibilitychange', visible); };
  }, [refresh, invalidate]);
  const filtered = selectLogistics(rows ?? [], query, filter), count = (state: LogisticsFilter) => (rows ?? []).filter(row => matchesLogistics(row, state)).length;
  const unknown = count('UNKNOWN');
  const quantity = (rows ?? []).reduce((n, row) => n + (row.quantity ?? 0), 0), missingQuantity = (rows ?? []).filter(row => row.quantity === null).length;
  return <section data-testid="logistics-dashboard" aria-busy={loading} className="min-w-0 space-y-5">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-xl font-bold text-brand-primary">Todos los productos en un solo lugar</h2><p className="text-sm text-text-secondary">Seguimiento de las compras por mandato, desde el pedido hasta la recepción del cliente.</p></div><button type="button" className="admin-control inline-flex min-h-11 items-center gap-2 rounded-xl border border-border-color bg-surface px-4 font-semibold text-brand-primary disabled:opacity-50" disabled={loading || !user} onClick={() => void refresh()}><RefreshCw size={18} aria-hidden="true" />Actualizar logística</button></div>
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {([{ value: 'ACTIVE', label: 'En seguimiento', icon: Package }, { value: 'SUPPLIER', label: 'Con el proveedor', icon: Store }, { value: 'IN_HAND', label: 'En mi poder / por entregar', icon: Warehouse }, { value: 'DELIVERED', label: 'Entregados', icon: CheckCircle2 }] as const).map(item => <button key={item.value} type="button" aria-pressed={filter === item.value} onClick={() => setFilter(item.value)} className={`admin-control min-w-0 rounded-2xl border p-4 text-left ${item.value === 'DELIVERED' ? 'border-emerald-200 bg-emerald-50 text-emerald-950' : item.value === 'SUPPLIER' ? 'border-amber-200 bg-amber-50 text-amber-950' : item.value === 'ACTIVE' ? 'border-brand-primary bg-brand-primary text-white' : 'border-border-color bg-surface text-brand-primary'} ${filter === item.value ? 'ring-2 ring-brand-primary ring-offset-2' : ''}`}><item.icon size={20} aria-hidden="true" /><span className="mt-2 block text-sm font-semibold">{item.label}</span><span className="block text-3xl font-bold tabular-nums">{rows ? count(item.value) : '—'}</span><span className="text-xs">operaciones</span></button>)}
    </div>
    <div className="grid min-w-0 gap-4 rounded-2xl border border-border-color bg-surface p-4 md:grid-cols-2"><label className="min-w-0 space-y-1"><span className="font-semibold">Buscar cliente, producto o proveedor</span><input type="search" aria-label="Buscar en logística" placeholder="Nombre, apellido o producto" className={control} value={query} onChange={e => setQuery(e.target.value)} /></label><label className="min-w-0 space-y-1"><span className="font-semibold">Estado del producto</span><select aria-label="Estado del producto" className={control} value={filter} onChange={e => setFilter(e.target.value as LogisticsFilter)}><option value="ACTIVE">Pendientes de completar</option><option value="ALL">Todos, incluidos entregados</option><option value="SUPPLIER">Con el proveedor</option><option value="IN_HAND">En mi poder / por entregar</option>{Object.entries(logisticsLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><button type="button" className="admin-control min-h-11 justify-self-start rounded-xl border border-border-color px-4 font-semibold text-brand-primary" onClick={() => { setQuery(''); setFilter('ALL'); }}>Ver todos y limpiar filtros</button></div>
    {loading && <p role="status">Consultando productos y fechas…</p>}
    {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-900">No se pudo consultar Logística. Actualizá para reintentar.</p>}
    {!!unknown && <p role="alert" className="rounded-xl border border-orange-200 bg-orange-50 p-4 text-orange-950">{unknown} operaciones sin verificar. No se presentan como entregadas ni se ocultan de la vista general.</p>}
    {rows && <p role="status" className="text-sm text-text-secondary">{filtered.length} de {rows.length} operaciones · {quantity} unidades con cantidad registrada{missingQuantity ? ` · ${missingQuantity} operaciones con cantidad pendiente` : ''}.</p>}
    {rows && !filtered.length && <div className="rounded-2xl border border-dashed border-border-color p-8 text-center"><h3 className="font-semibold">{rows.length ? 'No hay productos con estos filtros' : 'Todavía no hay compras aceptadas'}</h3><p className="text-sm text-text-secondary">{rows.length ? 'Elegí otro estado o limpiá la búsqueda.' : 'El producto aparecerá cuando se acepte el presupuesto.'}</p></div>}
    <div className="grid min-w-0 gap-4 lg:grid-cols-2">{filtered.map(row => <LogisticsCard key={row.key} row={row} />)}</div>
  </section>;
}
function LogisticsCard({ row }: { row: LogisticsRow }) {
  const view = row.view, s = view?.state, stage = logisticsStage(s ?? null), action = s ? guidedLogisticsAction(s) : null;
  const tone = stage === 'INCIDENT' || stage === 'UNKNOWN' ? 'border-red-200 bg-red-50 text-red-900' : stage === 'DELIVERED' ? 'border-emerald-200 bg-emerald-50 text-emerald-950' : ['ORDERED', 'CONFIRMED', 'READY'].includes(stage) ? 'border-amber-200 bg-amber-50 text-amber-950' : 'border-border-color bg-background-main text-brand-primary';
  return <article data-testid="logistics-row" className="min-w-0 space-y-4 rounded-2xl border border-border-color bg-surface p-4 sm:p-5"><div className="flex flex-wrap items-start justify-between gap-2"><h3 className="min-w-0 break-words font-bold text-brand-primary">{row.product}</h3><span className={`rounded-full border px-3 py-1 text-xs font-bold ${tone}`}>{logisticsLabels[stage]}</span></div><p className="break-words text-lg font-semibold">{row.client}</p><p className="text-sm text-text-secondary">Cantidad: {row.quantity ?? 'Sin registrar'} · Proveedor: {s?.providerName || 'Por seleccionar'}</p>
    <dl className="grid min-w-0 grid-cols-2 gap-3 text-sm">{[['Encargado al proveedor', s?.orderDate], ['Retirado', s?.actualPickupDate], ['En mi poder desde', s?.actualReceiptDate], ['Entrega prevista', s?.estimatedDeliveryDate]].map(([label, value]) => <div className="min-w-0" key={label}><dt className="text-text-secondary">{label}</dt><dd className="font-semibold">{date(value)}</dd></div>)}{view?.deliveredAt && <div><dt className="text-text-secondary">Entrega real</dt><dd className="font-semibold">{new Date(view.deliveredAt).toLocaleDateString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' })}</dd></div>}</dl>
    <p className="rounded-xl bg-background-main p-3 text-sm">{!s ? 'El seguimiento no pudo verificarse. Actualizá antes de continuar.' : action ? `Próximo paso: ${guidedLogisticsLabels[action] || 'Revisar seguimiento'}` : stage === 'DELIVERED' ? 'Producto entregado al cliente.' : 'Próximo paso: registrar recepción del cliente en Firmas y entrega.'}</p>
    <Link className="btn-primary admin-control w-full whitespace-normal text-center" href={`/admin/operaciones/${encodeURIComponent(row.budgetId)}/${row.version}?section=logistics`}>Abrir seguimiento<ArrowUpRight size={18} aria-hidden="true" /></Link>
  </article>;
}
