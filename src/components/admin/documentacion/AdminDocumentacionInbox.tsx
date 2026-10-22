"use client";

import { AdminOperationsDirectory } from "../operations/AdminOperationsDirectory";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Files, RefreshCw, Search } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { DOCUMENT_KIND_LABELS, filterAdminDocumentacion, visibleDocumentacionDocuments, type AdminDocumentacionFilters, type DocumentKind } from "@/lib/adminDocumentacionReadModel";
import { loadAdminDocumentacion, type AdminDocumentacionLoadResult } from "@/lib/adminDocumentacionReader";
import { presentAdminSolicitudStatus } from "../solicitudes/presentation";
import { DocumentAvailabilityList } from "./DocumentAvailabilityList";

const control = "admin-control min-h-11 w-full min-w-0 rounded-xl border border-border-color bg-surface px-3 text-sm text-text-primary";
const views = [["all", "Todas"], ["available", "Con archivos"], ["not_recorded", "Sin archivos registrados"], ["pending_send", "Pendiente de envío"]] as const;
export function AdminDocumentacionInbox() {
  const [filters, setFilters] = useState<AdminDocumentacionFilters>({ view: "all", type: "", document: "", q: "" });
  const [result, setResult] = useState<AdminDocumentacionLoadResult | null>(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let current = true;
    loadAdminDocumentacion().then(value => { if (current) setResult(value); }).catch(() => {
      if (current) setResult({ items: [], loadedSources: [], errors: { solicitudes: "unknown", solicitudes_cuenta: "unknown" } });
    });
    return () => { current = false; };
  }, [attempt]);
  const partial = result && result.loadedSources.length === 1;
  const totalError = result && result.loadedSources.length === 0;
  const rows = filterAdminDocumentacion(result?.items ?? [], filters);
  const documentKinds = Array.from(new Set(result?.items.flatMap(item => item.documentos.map(doc => doc.kind)) ?? []));
  return <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-8" data-testid="documentacion-inbox">
    <PageHeader title="Documentación" subtitle="Consultá los archivos asociados a cada operación y su disponibilidad." />
    <AdminOperationsDirectory section="contract" />
    <h2 className="font-heading text-xl font-bold">Archivos de solicitudes · consulta histórica</h2>
    <section aria-label="Buscar y filtrar documentación" className="space-y-3 rounded-2xl border border-border-color bg-surface px-4 py-3 sm:space-y-4 sm:p-5">
      <div className="grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)]">
        <label className="col-span-2 min-w-0 text-sm font-semibold md:col-span-1">Buscar operación<span className="relative mt-1.5 block"><Search aria-hidden="true" className="absolute left-3 top-3 size-5 text-text-secondary" /><input aria-label="Buscar operación" type="search" value={filters.q} onChange={event => setFilters({ ...filters, q: event.target.value })} placeholder="Cliente, DNI, bien o referencia" className={`${control} pl-10`} /></span></label>
        <label className="min-w-0 text-sm font-semibold">Tipo de registro<select aria-label="Tipo de registro" className={`${control} mt-1.5`} value={filters.type} onChange={event => setFilters({ ...filters, type: event.target.value })}><option value="">Todos los tipos</option>{["Solicitud", "Consulta inicial", "Contacto rápido"].map(type => <option key={type}>{type}</option>)}</select></label>
        <label className="min-w-0 text-sm font-semibold">Documento<select aria-label="Documento" className={`${control} mt-1.5`} value={filters.document} onChange={event => setFilters({ ...filters, document: event.target.value })}><option value="">Todos</option>{documentKinds.map(kind => <option key={kind} value={kind}>{DOCUMENT_KIND_LABELS[kind as DocumentKind]}</option>)}</select></label>
      </div>
      <label className="block text-sm font-semibold sm:hidden">Vista de archivos<select aria-label="Vista de archivos" value={filters.view} onChange={event => setFilters({ ...filters, view: event.target.value as AdminDocumentacionFilters["view"] })} className={`${control} mt-1.5`}>{views.map(([view, label]) => <option key={view} value={view}>{label}</option>)}</select></label>
      <div role="group" aria-label="Vista de archivos" className="hidden flex-wrap sm:flex gap-1 border-t border-border-color pt-3">{views.map(([view, label]) => <button key={view} type="button" aria-pressed={filters.view === view} onClick={() => setFilters({ ...filters, view })} className={`admin-control min-h-11 rounded-xl px-3 text-sm font-semibold ${filters.view === view ? "bg-brand-primary text-white" : "text-text-secondary hover:bg-background-main"}`}>{label}</button>)}</div>
      {filters.document && <p className="text-xs text-text-secondary">La vista de archivos se aplica al tipo de documento seleccionado.</p>}
    </section>
    <p role="note" className="text-xs font-normal leading-relaxed text-text-secondary">Disponible indica que hay un archivo registrado. No acredita revisión ni aprobación.</p>
    {!result ? <p role="status" className="py-10 text-center text-text-secondary">Cargando documentación…</p> : <>
      {(partial || totalError) && <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border-color bg-surface p-4"><div><p className="font-semibold text-brand-primary">{totalError ? "No pudimos cargar la documentación" : "La bandeja está incompleta"}</p><p className="mt-1 text-sm text-text-secondary">{totalError ? "Falló la consulta de las dos fuentes." : `No pudimos cargar ${result.errors.solicitudes ? "los registros de solicitud" : "los registros de consulta"}. Se muestra sólo la fuente disponible.`}</p></div><button type="button" onClick={() => { setResult(null); setAttempt(value => value + 1); }} className="admin-control inline-flex min-h-11 items-center gap-2 rounded-xl border border-border-color px-4 text-sm font-semibold"><RefreshCw aria-hidden="true" className="size-4" />Reintentar</button></div>}
      {!totalError && <>
        <p role="status" className="text-sm text-text-secondary">{partial ? "Resultados de la fuente disponible" : `${rows.length} ${rows.length === 1 ? "operación visible" : "operaciones visibles"}`}</p>
        {!rows.length ? <section className="rounded-2xl border border-border-color bg-surface px-5 py-10 text-center"><Files aria-hidden="true" className="mx-auto mb-3 size-7 text-text-secondary" /><h2 className="font-heading text-lg font-bold text-brand-primary">{result.items.length === 0 && !partial ? "No hay operaciones registradas" : "No hay resultados para estos filtros"}</h2><p className="mt-2 text-sm text-text-secondary">{partial ? "Reintentá la carga para completar las fuentes." : "Podés cambiar la vista o ajustar la búsqueda."}</p></section> :
        <section aria-label="Operaciones y archivos" className="rounded-2xl xl:overflow-hidden xl:border xl:border-border-color xl:bg-surface">
          <div aria-hidden="true" className="hidden grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.8fr)_9rem] gap-5 border-b border-border-color bg-background-main px-5 py-3 text-xs font-semibold text-text-secondary xl:grid"><span>Cliente</span><span>Operación / bien</span><span>Documentos y disponibilidad</span><span>Acción</span></div>
          <ul className="grid gap-4 xl:block xl:divide-y xl:divide-border-color">{rows.map(item => <li key={item.recordKey} data-record-key={item.recordKey} className="grid min-w-0 gap-5 rounded-2xl border border-border-color bg-surface p-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.8fr)_9rem] xl:rounded-none xl:border-0">
            <div className="min-w-0"><h2 className="break-words font-heading font-bold text-brand-primary">{item.nombreCliente ?? "Nombre no registrado"}</h2><p className="mt-1 text-sm text-text-secondary">{item.dni ? `DNI ${item.dni}` : "DNI no registrado"}</p></div>
            <div className="min-w-0"><p className="break-words text-sm font-semibold">{item.productoONecesidad ?? "Necesidad no registrada"}</p><p className="mt-1 text-sm text-text-secondary">{item.tipoRegistro}</p><p className="mt-2 break-words text-xs text-text-secondary">Estado de operación: {presentAdminSolicitudStatus(item.estadoOperacion)}</p></div>
            <div className="min-w-0"><p className="mb-3 text-xs font-semibold text-text-secondary xl:hidden">Documentación</p><DocumentAvailabilityList documentos={visibleDocumentacionDocuments(item, filters.document)} /></div>
            <Link href={`/admin/solicitudes/${item.sourceCollection}/${encodeURIComponent(item.documentId)}`} aria-label={`Ver solicitud de ${item.nombreCliente ?? "cliente sin nombre"}, ${item.tipoRegistro}`} className="admin-control inline-flex min-h-11 items-center justify-center gap-2 self-start rounded-xl border border-border-color px-3 text-sm font-semibold text-brand-primary hover:bg-background-main">Ver solicitud<ArrowRight aria-hidden="true" className="size-4" /></Link>
          </li>)}</ul>
        </section>}
      </>}
    </>}
  </div>;
}
