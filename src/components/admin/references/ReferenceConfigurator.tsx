"use client";

import type { ReactNode } from "react";
import { ImagePlus, ShieldCheck } from "lucide-react";
import type { CatalogReferenceDraft } from "@/lib/catalogReferenceEditor";
import { CATALOGO_REFERENCIA_FACTORES_DEFAULT, calcularPlanReferenciaCatalogo } from "@/lib/catalogReference";

const secondary = "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border-color bg-surface px-3 text-sm font-semibold text-brand-primary hover:bg-background-main disabled:opacity-50";
const input = "min-h-11 w-full min-w-0 rounded-xl border border-border-color bg-surface px-3 py-2 text-base text-text-primary focus:outline-2 focus:outline-brand-primary";
function money(value: number) { return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(value); }

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="block min-w-0 space-y-2 text-sm font-semibold text-text-primary"><span>{label}</span>{children}</label>;
}
export function Section({ number, title, children, id }: { number: string; title: string; children: ReactNode; id?: string }) {
  return <section id={id} data-editor-section={title} className="min-w-0 rounded-2xl border border-border-color bg-surface p-4 sm:p-5">
    <h3 className="mb-4 flex items-center gap-3 font-heading text-base font-bold text-brand-primary"><span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-background-main text-xs text-text-secondary">{number}</span>{title}</h3>{children}
  </section>;
}

/** Controlled Admin fields. All IO and pending image state belong to the caller. */
export function ReferenceConfigurator({ draft, onChange: change, legacyCode, externalUrl, files,
  onExternalUrlChange, onAddUrl, onAddFiles, onRemoveFile,
}: {
  draft: CatalogReferenceDraft;
  onChange: (patch: Partial<CatalogReferenceDraft>) => void;
  legacyCode?: string;
  externalUrl: string;
  files: readonly File[];
  onExternalUrlChange: (value: string) => void;
  onAddUrl: () => void;
  onAddFiles: (files: File[]) => void;
  onRemoveFile: (index: number) => void;
}) {
  return <>
          <Section number="01" title="Identificación"><div className="space-y-4"><Field label="Nombre de la referencia"><input className={input} required value={draft.nombre} onChange={e => change({ nombre: e.target.value })} /></Field>
            <div className="grid gap-4 sm:grid-cols-2"><Field label="SKU interno"><input className={input} value={draft.skuInterno} onChange={e => change({ skuInterno: e.target.value })} /></Field><Field label="Código de barras / EAN"><input className={input} value={draft.codigoBarras} onChange={e => change({ codigoBarras: e.target.value })} /></Field></div><p className="text-xs text-text-secondary">Códigos opcionales de uso interno. No forman parte de la vista pública.</p></div></Section>
          <Section number="02" title="Información interna"><p className="mb-4 flex items-center gap-2 text-xs font-bold tracking-wider text-brand-secondary"><ShieldCheck size={16} aria-hidden="true" />SOLO ADMINISTRACIÓN</p>
            <div className="grid gap-4 sm:grid-cols-2"><Field label="Costo proveedor"><input className={input} required type="number" step="0.01" min="0.01" value={draft.costoProveedor} onChange={e => change({ costoProveedor: e.target.value })} /></Field><Field label="Nombre del proveedor"><input className={input} value={draft.proveedor} onChange={e => change({ proveedor: e.target.value })} /></Field></div>
            {legacyCode && <p data-testid="legacy-code" className="mt-4 rounded-xl bg-background-main p-3 text-sm text-text-secondary">Código legacy: <span className="font-mono">{legacyCode}</span><span className="mt-1 block text-xs">Pendiente de clasificación. No se asigna automáticamente a SKU o EAN.</span></p>}
          </Section>
          <Section number="03" title="Planes" id="catalog-plans"><div className="mb-4 space-y-3"><div><p className="text-sm font-semibold">Planes estimados · 1 a 18 cuotas</p><p className="mt-1 text-xs text-text-secondary">Elegí los planes habilitados. Los factores son internos; las cuotas son una estimación para catálogo.</p></div><button type="button" className={secondary} onClick={() => change({ factoresPlanes: { ...CATALOGO_REFERENCIA_FACTORES_DEFAULT } })}>Restaurar factores de referencia</button></div>
            <div className="space-y-2">{Array.from({ length: 18 }, (_, i) => i + 1).map(n => {
              const active = draft.planesActivos[n] === true;
              let estimated: number | null = null;
              try { estimated = calcularPlanReferenciaCatalogo({ costoProveedor: Number(draft.costoProveedor), cuotas: n, factor: draft.factoresPlanes[n] }).cuotaExhibidaCatalogo; } catch { /* Se informa dato pendiente, sin inventar importes. */ }
              return <div key={n} data-plan-row={n} className={`grid min-w-0 grid-cols-[minmax(90px,1fr)_90px_minmax(85px,1fr)] items-center gap-2 rounded-xl border p-2 sm:gap-3 sm:p-3 ${active ? "border-brand-primary/30 bg-background-main" : "border-border-color"}`}>
                <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm font-semibold"><input aria-label={`Habilitar ${n} cuotas`} type="checkbox" className="size-5 shrink-0 accent-brand-primary" checked={active} onChange={e => change({ planesActivos: { ...draft.planesActivos, [n]: e.target.checked } })} /><span>{n} {n === 1 ? "cuota" : "cuotas"}</span></label>
                <label className="min-w-0 text-xs text-text-secondary">Factor<input aria-label={`Factor ${n} cuotas`} className={`${input} mt-1 px-2 text-sm`} type="number" step="0.01" min="0.01" value={Number.isFinite(draft.factoresPlanes[n]) ? draft.factoresPlanes[n] : ""} onChange={e => change({ factoresPlanes: { ...draft.factoresPlanes, [n]: e.target.value === "" ? NaN : Number(e.target.value) } })} /></label>
                <div data-estimate={n} className="min-w-0 text-right"><span className="block text-[11px] text-text-secondary">{active ? "Cuota estimada" : "No habilitado"}</span><span className={`break-words text-sm font-bold ${active ? "text-brand-primary" : "text-text-secondary"}`}>{active ? estimated === null ? "Revisá los datos" : money(estimated) : "—"}</span></div>
              </div>;
            })}</div>
          </Section>
          <Section number="04" title="Descripción"><Field label="Descripción pública de la referencia"><textarea className={`${input} min-h-32`} rows={4} value={draft.descripcion} onChange={e => change({ descripcion: e.target.value })} /></Field><p className="mt-2 text-xs text-text-secondary">Este texto será visible al público cuando publiques la referencia. No incluyas proveedor, costos, códigos internos ni otra información sensible.</p></Section>
          <Section number="05" title="Imágenes"><p className="mb-3 text-sm text-text-secondary">Hasta 4 imágenes. Quitar del borrador no elimina archivos de Storage.</p>
            <div className="grid grid-cols-2 gap-3">{draft.imagenUrls.map((url, i) => <div key={`${url}-${i}`} className="min-w-0 rounded-xl border border-border-color p-2"><div className="aspect-square bg-background-main p-2">{ /* eslint-disable-next-line @next/next/no-img-element */ }
<img onError={event => { if (!event.currentTarget.src.endsWith("/logo-cuenta-hogar-oficial.png")) event.currentTarget.src = "/logo-cuenta-hogar-oficial.png"; }} src={url} alt={`Imagen de referencia ${i + 1}`} className="h-full w-full object-contain" /></div><button type="button" className={`${secondary} mt-2 w-full`} onClick={() => change({ imagenUrls: draft.imagenUrls.filter((_, index) => index !== i) })}>Quitar imagen {i + 1}</button></div>)}</div>
            {files.map((file, i) => <div key={`${file.name}-${i}`} className="mt-2 flex min-w-0 items-center justify-between gap-2 text-sm"><span className="truncate">{file.name}</span><button type="button" className={secondary} onClick={() => { onRemoveFile(i); }}>Quitar archivo</button></div>)}
            <div className="mt-4 space-y-3"><Field label="URL de imagen"><input className={input} type="url" value={externalUrl} onChange={e => { onExternalUrlChange(e.target.value); }} placeholder="https://…" /></Field><button type="button" className={secondary} onClick={onAddUrl}><ImagePlus size={16} aria-hidden="true" />Agregar URL</button>
              <Field label="Agregar archivos de imagen"><input className="min-h-11 w-full min-w-0 text-sm file:mr-2 file:min-h-11 file:rounded-lg file:border-0 file:bg-background-main file:px-3" type="file" accept="image/*" multiple onChange={e => {
                onAddFiles(Array.from(e.target.files ?? []));
                e.target.value = "";
              }} /></Field><p className="text-xs text-text-secondary">{draft.imagenUrls.length + files.length}/4 imágenes en el borrador</p>
            </div>
          </Section>
  </>;
}
