"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { ArrowLeft, ArrowUpRight, FileText } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { adminSolicitudNextAction, formatAdminSolicitudDate, type AdminSolicitudListItem, type AdminSolicitudSource } from "@/lib/adminSolicitudesReadModel";
import { loadAdminSolicitudBySourceAndId } from "@/lib/adminSolicitudesReader";

import { presentAdminSolicitudStatus } from "./presentation";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return <section aria-label={title} className="min-w-0 rounded-2xl border border-border-color bg-surface p-5 sm:p-6"><h2 className="mb-4 font-heading text-lg font-bold text-brand-primary">{title}</h2>{children}</section>;
}
function Field({ label, value }: { label: string; value: string | null }) {
  return <div className="min-w-0"><dt className="text-xs font-semibold text-text-secondary">{label}</dt><dd className="mt-1 whitespace-pre-wrap break-words text-sm">{value ?? "No registrado"}</dd></div>;
}
export function AdminSolicitudDetail({ source, id, context }: { source: AdminSolicitudSource; id: string; context: string }) {
  const [state, setState] = useState<{ item: AdminSolicitudListItem | null; error: boolean } | null>(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let current = true;
    loadAdminSolicitudBySourceAndId(source, id).then(item => { if (current) setState({ item, error: false }); }).catch(() => { if (current) setState({ item: null, error: true }); });
    return () => { current = false; };
  }, [source, id, attempt]);
  const item = state?.item;
  const back = <Link href={`/admin/solicitudes?${context}`} className="admin-control inline-flex min-h-11 items-center gap-2 rounded-xl px-1 text-sm font-semibold text-brand-primary"><ArrowLeft aria-hidden="true" className="size-4" />Volver a Solicitudes</Link>;
  return <div className="mx-auto max-w-6xl space-y-5 p-4 sm:p-8" data-testid="solicitud-detail">
    {back}
    {!state ? <p role="status" className="py-10 text-text-secondary">Cargando operación…</p> : state.error ? <Section title="No pudimos cargar esta operación"><p role="alert" className="text-sm text-text-secondary">La consulta falló. No se buscó en otra fuente.</p><button type="button" className="admin-control mt-4 min-h-11 rounded-xl border border-border-color px-4 text-sm font-semibold" onClick={() => { setState(null); setAttempt(value => value + 1); }}>Reintentar</button></Section> : !item ? <Section title="Operación no encontrada"><p className="text-sm text-text-secondary">No existe un registro disponible con esta referencia en la fuente indicada.</p></Section> : <>
      <PageHeader title={item.nombreCliente ?? "Operación sin nombre registrado"} subtitle={`${item.tipoPresentacion} · ${presentAdminSolicitudStatus(item.estadoOriginal)}`} actions={<span className="rounded-lg border border-border-color bg-surface px-3 py-2 text-sm font-semibold">Sólo lectura</span>} />
      <Section title="Resumen"><dl className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3"><Field label="Tipo" value={item.tipoPresentacion} /><Field label="Estado" value={presentAdminSolicitudStatus(item.estadoOriginal)} /><Field label="Fecha" value={formatAdminSolicitudDate(item.fechaCreacion)} /><Field label="Necesidad / bien" value={item.productoONecesidad} /><Field label="Referencia de operación" value={item.documentId} /><Field label="Próxima acción" value={adminSolicitudNextAction(item)} /></dl>
        {item.mensajeAdmin && <div className="mt-5 rounded-xl border border-border-color bg-background-main p-4"><p className="text-xs font-semibold text-text-secondary">{item.estadoOriginal === "REQUIERE_INFO" ? "Información solicitada al cliente" : "Mensaje administrativo"}</p><p className="mt-1 whitespace-pre-wrap break-words text-sm">{item.mensajeAdmin}</p></div>}
        <details className="mt-5 border-t border-border-color pt-3 text-sm"><summary className="admin-control min-h-11 cursor-pointer py-3 font-semibold text-text-secondary">Referencia técnica</summary><dl className="mt-3 grid gap-4 sm:grid-cols-2"><Field label="Fuente" value={item.sourceCollection} /><Field label="Identidad completa" value={item.recordKey} /><Field label="Tipo original" value={item.tipoOriginal} /><Field label="Vínculo cliente registrado" value={item.clienteId} /></dl></details>
      </Section>
      <div className="grid items-start gap-5 lg:grid-cols-2">
        <Section title="Datos"><dl className="grid gap-5 sm:grid-cols-2"><Field label="Nombre" value={item.nombreCliente} /><Field label="DNI" value={item.dni} /><Field label="CUIL" value={item.cuil} /><Field label="Email" value={item.email} /><Field label="Teléfono" value={item.telefono} /><Field label="Domicilio" value={item.domicilio} /><Field label="Localidad" value={item.localidad} /></dl></Section>
        <Section title="Documentos"><p className="mb-3 text-sm text-text-secondary">La disponibilidad de un archivo no acredita su revisión.</p><ul className="divide-y divide-border-color">{item.documentos.map(document => <li key={document.label} className="flex min-w-0 flex-wrap items-center justify-between gap-2 py-3"><span className="text-sm">{document.label}<span className="mt-1 block text-xs text-text-secondary">{document.status}</span></span>{document.url && <a href={document.url} target="_blank" rel="noopener noreferrer" className="admin-control inline-flex min-h-11 items-center gap-2 rounded-xl border border-border-color px-3 text-sm font-semibold text-brand-primary"><FileText aria-hidden="true" className="size-4" />Abrir<span className="sr-only"> {document.label} en otra pestaña</span></a>}</li>)}</ul></Section>
      </div>
      <Section title="Propuestas">{!item.propuestas.length ? <p className="text-sm text-text-secondary">Sin propuestas guardadas en este registro.</p> : <ul className="space-y-4">{item.propuestas.map((proposal, index) => <li key={`${proposal.reference ?? 'sin-ref'}:${index}`} className="rounded-xl border border-border-color p-4"><div className="flex flex-wrap justify-between gap-2"><h3 className="break-all text-sm font-semibold">Propuesta {proposal.reference ?? index + 1}</h3><span className="text-sm">{proposal.estado ?? "Sin estado registrado"}</span></div><p className="mt-2 text-sm text-text-secondary">{formatAdminSolicitudDate(proposal.fecha)} · {proposal.itemCount === null ? "Cantidad de opciones no registrada" : `${proposal.itemCount} opciones / ítems`}</p>{proposal.items.map((option, i) => <div key={i} className="mt-3 border-t border-border-color pt-3 text-sm"><p className="break-words font-semibold">{option.producto ?? "Bien no registrado"}</p><p className="mt-1 text-text-secondary">{[option.contado !== null ? `Importe contado guardado: $ ${option.contado.toLocaleString('es-AR')}` : null, option.cuotas !== null ? `${option.cuotas} cuotas` : null, option.valorCuota !== null ? `Importe por cuota guardado: $ ${option.valorCuota.toLocaleString('es-AR')}` : null].filter(Boolean).join(' · ') || "Sin importes comerciales registrados"}</p></div>)}</li>)}</ul>}</Section>
      <Section title="Actividad">{item.actividad.length ? <ul className="space-y-4">{item.actividad.map(event => <li key={event.label} className="border-l-2 border-border-color pl-4"><p className="text-sm font-semibold">{event.label}</p><p className="mt-1 text-sm text-text-secondary">{formatAdminSolicitudDate(event.fecha)}</p></li>)}</ul> : <p className="text-sm text-text-secondary">Sin actividad registrada</p>}</Section>
      <section aria-label="Gestión avanzada" className="rounded-2xl border border-border-color p-5 text-sm"><h2 className="font-heading font-bold text-brand-primary">Gestión avanzada</h2><p className="mt-2 max-w-2xl text-text-secondary">Algunas acciones operativas todavía se realizan en el módulo anterior mientras completamos la migración.</p><p className="mt-1 text-text-secondary">Se abrirá la bandeja general de gestión.</p><Link href="/admin/validaciones" className="admin-control mt-3 inline-flex min-h-11 items-center gap-2 rounded-xl border border-border-color bg-surface px-4 font-semibold text-brand-primary">Abrir gestión avanzada<ArrowUpRight aria-hidden="true" className="size-4" /></Link></section>
    </>}
  </div>;
}
