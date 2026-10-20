"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Search, ClipboardList, RefreshCw } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { adminSolicitudNextAction, adminSolicitudesContext, EMPTY_STATUS_FILTER, filterAdminSolicitudes, formatAdminSolicitudDate, type AdminSolicitudFilters } from "@/lib/adminSolicitudesReadModel";
import { loadAdminSolicitudes, type AdminSolicitudesLoadResult } from "@/lib/adminSolicitudesReader";

import { presentAdminSolicitudStatus } from "./presentation";

const control = "admin-control min-h-11 w-full rounded-xl border border-border-color bg-surface px-3 text-sm text-text-primary";
export function AdminSolicitudesInbox({ initialFilters }: { initialFilters: AdminSolicitudFilters }) {
  const [filters, setFilters] = useState(initialFilters);
  const [result, setResult] = useState<AdminSolicitudesLoadResult | null>(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let current = true;
    loadAdminSolicitudes().then(value => { if (current) setResult(value); }).catch(() => {
      if (current) setResult({ items: [], loadedSources: [], errors: { solicitudes: "unknown", solicitudes_cuenta: "unknown" } });
    });
    return () => { current = false; };
  }, [attempt]);
  function updateFilters(next: AdminSolicitudFilters) {
    setFilters(next);
    window.history.replaceState(null, "", `/admin/solicitudes?${adminSolicitudesContext(next)}`);
  }
  function retry() { setResult(null); setAttempt(value => value + 1); }
  const failed = result ? Object.keys(result.errors).length : 0;
  const totalError = result?.loadedSources.length === 0;
  const rows = filterAdminSolicitudes(result?.items ?? [], filters);
  const states = Array.from(new Set(result?.items.map(item => item.estadoOriginal) ?? [])).sort((a, b) => (a ?? "").localeCompare(b ?? ""));
  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-8" data-testid="solicitudes-inbox">
      <PageHeader title="Solicitudes" subtitle="Todas las consultas y solicitudes que requieren seguimiento, sin perder su origen ni estado." />
      <section aria-label="Buscar y filtrar solicitudes" className="space-y-4 rounded-2xl border border-border-color bg-surface p-4 sm:p-5">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)]">
          <label className="col-span-2 min-w-0 space-y-1.5 text-sm font-semibold md:col-span-1">Buscar operación
            <span className="relative mt-1.5 block"><Search aria-hidden="true" className="absolute left-3 top-3 size-5 text-text-secondary" /><input aria-label="Buscar operación" type="search" value={filters.q} onChange={event => updateFilters({ ...filters, q: event.target.value })} placeholder="Cliente, DNI, necesidad o referencia" className={`${control} pl-10`} /></span>
          </label>
          <label className="min-w-0 space-y-1.5 text-sm font-semibold">Tipo
            <select aria-label="Tipo" value={filters.type} onChange={event => updateFilters({ ...filters, type: event.target.value })} className={`${control} mt-1.5`}>
              <option value="">Todos los tipos</option>{["Solicitud", "Consulta inicial", "Contacto rápido"].map(type => <option key={type}>{type}</option>)}
            </select>
          </label>
          <label className="min-w-0 space-y-1.5 text-sm font-semibold">Estado
            <select aria-label="Estado" value={filters.status} onChange={event => updateFilters({ ...filters, status: event.target.value })} className={`${control} mt-1.5`}>
              <option value="">Todos los estados</option>
              {filters.status && !states.some(state => (state ?? EMPTY_STATUS_FILTER) === filters.status) && <option value={filters.status}>{filters.status === EMPTY_STATUS_FILTER ? "Sin estado registrado" : presentAdminSolicitudStatus(filters.status)}</option>}
              {states.map(state => <option key={state ?? EMPTY_STATUS_FILTER} value={state ?? EMPTY_STATUS_FILTER}>{presentAdminSolicitudStatus(state)}</option>)}
            </select>
          </label>
        </div>
        <div role="group" aria-label="Vista de solicitudes" className="flex gap-1 border-t border-border-color pt-3">
          {([['pending', 'Pendientes'], ['all', 'Todas']] as const).map(([view, label]) => <button key={view} type="button" aria-pressed={filters.view === view} onClick={() => updateFilters({ ...filters, view })} className={`admin-control min-h-11 rounded-xl px-5 text-sm font-semibold ${filters.view === view ? "bg-brand-primary text-white" : "text-text-secondary hover:bg-background-main"}`}>{label}</button>)}
        </div>
      </section>
      {!result ? <p role="status" className="py-10 text-center text-text-secondary">Cargando solicitudes…</p> : <>
        {failed > 0 && <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border-color bg-surface p-4">
          <div><p className="font-semibold text-brand-primary">{totalError ? "No pudimos cargar solicitudes" : "La bandeja está incompleta"}</p><p className="mt-1 text-sm text-text-secondary">{totalError ? "Falló la carga de las dos fuentes. Intentá nuevamente." : `No pudimos cargar ${result.errors.solicitudes ? "los registros de solicitud" : "los registros de consulta"}. Mostramos sólo la fuente disponible.`}</p></div>
          <button type="button" onClick={retry} className="admin-control flex min-h-11 items-center gap-2 rounded-xl border border-border-color px-4 text-sm font-semibold"><RefreshCw aria-hidden="true" className="size-4" />Reintentar</button>
        </div>}
        {!totalError && <>
          <p role="status" className="text-sm text-text-secondary">{failed ? "Resultados parciales" : "Registros cargados"} · {rows.length} {rows.length === 1 ? "operación visible" : "operaciones visibles"}</p>
          {rows.length === 0 ? <div className="rounded-2xl border border-border-color bg-surface px-5 py-12 text-center"><ClipboardList aria-hidden="true" className="mx-auto mb-3 size-7 text-text-secondary" /><h2 className="font-heading text-lg font-bold text-brand-primary">{result.items.length === 0 && !failed ? "No hay solicitudes" : "No hay coincidencias con estos filtros"}</h2><p className="mt-2 text-sm text-text-secondary">{failed ? "La fuente disponible no tiene coincidencias. Reintentá la carga para completar la bandeja." : "Probá otra vista o ajustá la búsqueda."}</p></div> :
          <section aria-label="Operaciones" className="overflow-hidden rounded-2xl xl:border xl:border-border-color xl:bg-surface">
            <div aria-hidden="true" className="hidden grid-cols-[minmax(0,1.35fr)_minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1fr)] gap-4 border-b border-border-color bg-background-main px-5 py-3 text-xs font-semibold text-text-secondary xl:grid"><span>Cliente / tipo</span><span>Necesidad / bien</span><span>Estado / fecha</span><span>Próxima acción</span></div>
            <ul className="grid gap-3 xl:block xl:divide-y xl:divide-border-color">
              {rows.map(item => <li key={item.recordKey} data-record-key={item.recordKey} className="grid min-w-0 gap-4 rounded-2xl border border-border-color bg-surface p-5 xl:rounded-none xl:border-0 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1fr)] xl:items-center">
                <div className="min-w-0"><h2 className="break-words font-heading font-bold text-brand-primary">{item.nombreCliente ?? "Nombre no registrado"}</h2><p className="mt-1 text-sm text-text-secondary">{item.origenPresentacion}</p><p className="mt-1 text-xs text-text-secondary">Localidad: {item.localidad ?? "No registrada"}</p></div>
                <div className="min-w-0 break-words text-sm"><p>{item.productoONecesidad ?? "Necesidad no registrada"}</p>{item.planPreferido && <p className="mt-1 text-xs text-text-secondary">Preferencia: {item.planPreferido} cuotas · {item.cuotaCapturada !== null ? `$ ${item.cuotaCapturada.toLocaleString("es-AR")} por cuota al solicitar` : "Importe no registrado"}</p>}</div>
                <div className="min-w-0"><span className="inline-block max-w-full break-words rounded-lg border border-border-color bg-background-main px-2.5 py-1 text-xs font-semibold">{presentAdminSolicitudStatus(item.estadoOriginal)}</span><p className="mt-2 text-sm text-text-secondary">{formatAdminSolicitudDate(item.fechaCreacion)}</p></div>
                <div className="min-w-0"><p className="mb-2 text-sm text-text-secondary">{adminSolicitudNextAction(item)}</p><Link aria-label={`Ver detalle de ${item.nombreCliente ?? item.documentId}, ${item.tipoPresentacion}`} href={`/admin/solicitudes/${item.sourceCollection}/${encodeURIComponent(item.documentId)}?${adminSolicitudesContext(filters)}`} className="admin-control inline-flex min-h-11 items-center gap-2 rounded-xl border border-border-color px-3 text-sm font-semibold text-brand-primary hover:bg-background-main">Ver detalle<ArrowRight aria-hidden="true" className="size-4" /></Link></div>
              </li>)}
            </ul>
          </section>}
        </>}
      </>}
    </div>
  );
}
