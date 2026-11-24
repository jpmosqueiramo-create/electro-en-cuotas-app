"use client";

import {WorkflowBadges} from "../WorkflowBadges";
import {workflowLabels} from "@/lib/adminWorkflow";
import Link from "next/link";
import {AdminRecordRemoval} from "../AdminRecordRemoval";
import { useEffect, useState, type ReactNode } from "react";
import { ArrowLeft, FileText } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { adminSolicitudNextAction, formatAdminSolicitudDate, type AdminSolicitudListItem, type AdminSolicitudSource } from "@/lib/adminSolicitudesReadModel";
import { useAuth } from "@/components/AuthProvider";
import { authenticatedSolicitudDetail } from "@/lib/adminSolicitudDetailClient";

import { SolicitudOperationLinks } from "./SolicitudOperationLinks";
import { SolicitudFollowUp } from "./SolicitudFollowUp";
import { presentAdminSolicitudStatus } from "./presentation";

function Section({ title, children, id }: { title: string; children: ReactNode; id?: string }) {
  return <section id={id} aria-label={title} className="min-w-0 scroll-mt-6 rounded-2xl border border-border-color bg-surface p-5 sm:p-6"><h2 className="mb-4 font-heading text-lg font-bold text-brand-primary">{title}</h2>{children}</section>;
}
function Field({ label, value }: { label: string; value: string | null }) {
  return <div className="min-w-0"><dt className="text-xs font-semibold text-text-secondary">{label}</dt><dd className="mt-1 whitespace-pre-wrap break-words text-sm">{value ?? "No registrado"}</dd></div>;
}
export function AdminSolicitudDetail({ source, id, context }: { source: AdminSolicitudSource; id: string; context: string }) {
  const { user, loading, isAdmin } = useAuth();
  const [state, setState] = useState<{ item: AdminSolicitudListItem | null; error: boolean; refreshError?: boolean } | null>(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (loading || !user || !isAdmin) return;
    const controller = new AbortController();
    authenticatedSolicitudDetail(user, source, id, controller.signal).then(item => { if (!controller.signal.aborted) setState({ item, error: false }); }).catch(() => { if (!controller.signal.aborted) setState(previous => previous?.item ? { ...previous, refreshError: true } : { item: null, error: true }); });
    return () => controller.abort();
  }, [source, id, attempt, user, loading, isAdmin]);
  const item = state?.item;
  const back = <Link href={`/admin/solicitudes?${context}`} className="admin-control inline-flex min-h-11 items-center gap-2 rounded-xl px-1 text-sm font-semibold text-brand-primary"><ArrowLeft aria-hidden="true" className="size-4" />Volver a Solicitudes</Link>;
  return <div className="mx-auto max-w-6xl space-y-5 p-4 sm:p-8" data-testid="solicitud-detail">
    <div className="flex flex-wrap items-center justify-between gap-3">{back}{item&&<AdminRecordRemoval subject={{kind:'REQUEST',source,id}} removed={!!item.administrativeState&&item.administrativeState.state!=='ACTIVE'} onChanged={()=>setAttempt(v=>v+1)}/>}</div>
    {!state ? <p role="status" className="py-10 text-text-secondary">Cargando operación…</p> : state.error ? <Section title="No pudimos cargar esta operación"><p role="alert" className="text-sm text-text-secondary">No pudimos completar la consulta. Reintentá sin recargar la página; no se buscó en otra fuente.</p><button type="button" className="admin-control mt-4 min-h-11 rounded-xl border border-border-color px-4 text-sm font-semibold" onClick={() => { setState(null); setAttempt(value => value + 1); }}>Reintentar</button></Section> : !item ? <Section title="Operación no encontrada"><p className="text-sm text-text-secondary">No existe un registro disponible con esta referencia en la fuente indicada.</p></Section> : <>
      {item?.administrativeState&&item.administrativeState.state!=='ACTIVE'&&<p role="status">Solicitud {item.administrativeState.state==='ARCHIVED'?'archivada':'eliminada'}. Los registros vinculados y el historial se conservan.</p>}
      <PageHeader title={item.nombreCliente ?? "Operación sin nombre registrado"} subtitle={`${item.tipoPresentacion} · ${(item.workflow?.length===1?workflowLabels[item.workflow[0].stage]:item.workflow?.length?'Varias operaciones vinculadas':presentAdminSolicitudStatus(item.estadoOriginal))}`} />
      {state.refreshError && <p role="alert" className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">No pudimos actualizar la ficha. Se muestran los últimos datos consultados y se conserva tu nota. Reintentá con “Actualizar solicitud”.</p>}
      <section aria-label="Seguimiento de la solicitud" className="space-y-4 rounded-2xl border border-border-color bg-surface p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="font-heading text-lg font-bold text-brand-primary">Próximo paso</h2>
            <p className="mt-2 text-sm">{adminSolicitudNextAction(item)}</p>
          </div>
          <button type="button" onClick={() => { setAttempt(value => value + 1); }}
            className="admin-control min-h-11 rounded-xl border border-border-color px-4 text-sm font-semibold">
            Actualizar solicitud
          </button>
        </div>
        {!!item.workflow?.length && <WorkflowBadges rows={item.workflow} links />}
        {item.actividad[0] && <p className="text-sm text-text-secondary">Última actividad registrada · {item.actividad[0].label} · {formatAdminSolicitudDate(item.actividad[0].fecha)}</p>}
        <nav aria-label="Secciones de la solicitud" className="flex flex-wrap gap-2 border-t border-border-color pt-3">
          {[["seguimiento", "Notas y seguimiento"], ["resumen", "Resumen"], ["datos", "Datos de contacto"], ["documentos", "Documentos"], ["actividad", "Hitos registrados"]].map(([anchor, label]) => (
            <a key={anchor} href={`#solicitud-${anchor}`} className="admin-control inline-flex min-h-11 items-center rounded-lg px-3 text-sm font-semibold text-brand-primary underline underline-offset-4">{label}</a>
          ))}
        </nav>
      </section>
      <SolicitudFollowUp key={`${source}:${id}:${user?.uid}`} source={source} id={id} inactive={!!item.administrativeState && item.administrativeState.state !== 'ACTIVE'} />
      <SolicitudOperationLinks key={`${source}:${id}:${attempt}`} source={source} id={id} />
      <Section id="solicitud-resumen" title="Resumen"><dl className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3"><Field label="Necesidad / bien" value={item.productoONecesidad} /><Field label="Tipo" value={item.tipoPresentacion} /><Field label="Origen" value={item.origenPresentacion} /><Field label="Referencia de catálogo" value={item.referenciaCatalogo} /><Field label="Plan preferido" value={item.planPreferido ? `${item.planPreferido} cuotas` : null} /><Field label="Cuota estimada al solicitar" value={item.cuotaCapturada !== null ? `$ ${item.cuotaCapturada.toLocaleString("es-AR")}` : null} /><Field label="Estado" value={(item.workflow?.length===1?workflowLabels[item.workflow[0].stage]:item.workflow?.length?'Varias operaciones vinculadas':presentAdminSolicitudStatus(item.estadoOriginal))} /><Field label="Fecha" value={formatAdminSolicitudDate(item.fechaCreacion)} /><Field label="Referencia de operación" value={item.documentId} /><Field label="Próxima acción" value={adminSolicitudNextAction(item)} /></dl>
        {item.mensajeAdmin && <div className="mt-5 rounded-xl border border-border-color bg-background-main p-4"><p className="text-xs font-semibold text-text-secondary">{item.estadoOriginal === "REQUIERE_INFO" ? "Información solicitada al cliente" : "Mensaje administrativo"}</p><p className="mt-1 whitespace-pre-wrap break-words text-sm">{item.mensajeAdmin}</p></div>}
        <p className="mt-4 text-sm text-text-secondary">La preferencia de plan no equivale a aceptación de presupuesto ni constituye obligación contractual.</p>
        <Link className="admin-control mt-4 inline-flex min-h-11 items-center rounded-xl border border-border-color px-3 text-sm font-semibold" href={`/admin/presupuestos?sourceCollection=${item.sourceCollection}&solicitudId=${encodeURIComponent(item.documentId)}`}>Confeccionar presupuesto V2</Link>
        <details className="mt-5 border-t border-border-color pt-3 text-sm"><summary className="admin-control min-h-11 cursor-pointer py-3 font-semibold text-text-secondary">Referencia técnica</summary><dl className="mt-3 grid gap-4 sm:grid-cols-2"><Field label="Fuente" value={item.sourceCollection} /><Field label="Identidad completa" value={item.recordKey} /><Field label="Tipo original" value={item.tipoOriginal} /><Field label="Vínculo cliente registrado" value={item.clienteId} /></dl></details>
      </Section>
      <div className="grid items-start gap-5 lg:grid-cols-2">
        <Section id="solicitud-datos" title="Datos"><dl className="grid gap-5 sm:grid-cols-2"><Field label="Nombre informado en la solicitud original" value={item.nombreCliente} /><Field label="DNI" value={item.dni} /><Field label="CUIL" value={item.cuil} /><Field label="Email" value={item.email} /><Field label="Teléfono" value={item.telefono} /><Field label="Domicilio" value={item.domicilio} /><Field label="Localidad" value={item.localidad} /></dl></Section>
        <Section id="solicitud-documentos" title="Documentos"><p className="mb-3 text-sm text-text-secondary">La disponibilidad de un archivo no acredita su revisión.</p><ul className="divide-y divide-border-color">{item.documentos.map(document => <li key={document.label} className="flex min-w-0 flex-wrap items-center justify-between gap-2 py-3"><span className="text-sm">{document.label}<span className="mt-1 block text-xs text-text-secondary">{document.status}</span></span>{document.url && <a href={document.url} target="_blank" rel="noopener noreferrer" className="admin-control inline-flex min-h-11 items-center gap-2 rounded-xl border border-border-color px-3 text-sm font-semibold text-brand-primary"><FileText aria-hidden="true" className="size-4" />Abrir<span className="sr-only"> {document.label} en otra pestaña</span></a>}</li>)}</ul></Section>
      </div>
      <Section title="Presupuestos V2"><p className="text-sm text-text-secondary">La confección y el historial se consultan en el módulo único de Presupuestos V2.</p><Link className="admin-control mt-3 inline-flex min-h-11 items-center rounded-xl border border-border-color px-4 font-semibold text-brand-primary" href={`/admin/presupuestos?sourceCollection=${item.sourceCollection}&solicitudId=${encodeURIComponent(item.documentId)}`}>Abrir Presupuestos V2</Link></Section>
      <Section id="solicitud-actividad" title="Hitos registrados">{item.actividad.length ? <ul className="space-y-4">{item.actividad.map(event => <li key={event.label} className="border-l-2 border-border-color pl-4"><p className="text-sm font-semibold">{event.label}</p><p className="mt-1 text-sm text-text-secondary">{formatAdminSolicitudDate(event.fecha)}</p></li>)}</ul> : <p className="text-sm text-text-secondary">Sin hitos registrados</p>}</Section>
    </>}
  </div>;
}
