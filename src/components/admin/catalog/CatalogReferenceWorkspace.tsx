"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Plus, Pencil, Eye, Package, ArrowUpRight, ImagePlus, ShieldCheck } from "lucide-react";
import { addDoc, collection, deleteDoc, doc, getDoc, updateDoc } from "firebase/firestore";
import { useAuth } from "@/components/AuthProvider";
import { PageHeader } from "@/components/PageHeader";
import { db } from "@/lib/firebase";
import { CATALOGO_REFERENCIA_FACTORES_DEFAULT, calcularPlanReferenciaCatalogo } from "@/lib/catalogReference";
import { buildCatalogReferencePrivatePatch, catalogPublicationLabel, createCatalogReferenceDraft, type CatalogPublicationPreview, type CatalogReferenceDraft } from "@/lib/catalogReferenceEditor";
import { uploadCatalogReferenceImage } from "@/lib/catalogReferenceImages";
import { CatalogReferencePreview, money } from "./CatalogReferencePreview";
import { CatalogDialog, ConfirmDialog } from "./CatalogDialog";
import type { Producto } from "./catalogStockTypes";

// El editor conserva datos privados sin exigir campos financieros legacy.
type CatalogReferenceOriginal = Readonly<Record<string, unknown>> & {
  id: string;
  codigoProducto?: string;
};

const secondary = "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border-color bg-surface px-3 text-sm font-semibold text-brand-primary hover:bg-background-main disabled:opacity-50";
const primary = "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-brand-primary px-4 text-sm font-semibold text-white hover:bg-[#123230] disabled:opacity-50";
const input = "min-h-11 w-full min-w-0 rounded-xl border border-border-color bg-surface px-3 py-2 text-base text-text-primary focus:outline-2 focus:outline-brand-primary";

function publicationPreviewLabel(state?: CatalogPublicationPreview): string {
  if (!state?.hasPublicProjection) return "Previsualizar publicación";
  return state.hasUnpublishedChanges ? "Previsualizar cambios" : "Ver publicación";
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="block min-w-0 space-y-2 text-sm font-semibold text-text-primary"><span>{label}</span>{children}</label>;
}
function Section({ number, title, children, id }: { number: string; title: string; children: ReactNode; id?: string }) {
  return <section id={id} data-editor-section={title} className="min-w-0 rounded-2xl border border-border-color bg-surface p-4 sm:p-5">
    <h3 className="mb-4 flex items-center gap-3 font-heading text-base font-bold text-brand-primary"><span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-background-main text-xs text-text-secondary">{number}</span>{title}</h3>{children}
  </section>;
}

export function CatalogReferenceWorkspace({ productos, fetching, loadError, onRefresh, onStock, onTransfer }: {
  productos: Producto[]; fetching: boolean; loadError: string; onRefresh: () => Promise<void>;
  onStock: (product: Producto) => void; onTransfer: () => void;
}) {
  const { user } = useAuth();
  const [editing, setEditing] = useState<{ id: string | null; original: CatalogReferenceOriginal | null } | null>(null);
  const [draft, setDraft] = useState(createCatalogReferenceDraft);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [statuses, setStatuses] = useState<Record<string, CatalogPublicationPreview>>({});
  const [preview, setPreview] = useState<CatalogPublicationPreview | null>(null);
  const [confirm, setConfirm] = useState<{ kind: "unpublish" | "delete"; product: Producto } | null>(null);
  const [externalUrl, setExternalUrl] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [search, setSearch] = useState("");

  const request = useCallback(async <T,>(id: string, action: string, body?: unknown): Promise<T> => {
    if (!user) throw new Error("Tu sesión no está disponible. Volvé a ingresar.");
    const response = await fetch(`/api/admin/catalogo/referencias/${encodeURIComponent(id)}/${action}`, {
      method: action === "preview" ? "GET" : "POST", cache: "no-store",
      headers: { Authorization: `Bearer ${await user.getIdToken()}`, ...(body === undefined ? {} : { "Content-Type": "application/json" }) },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    const data = await response.json();
    if (!response.ok && !(action === "preview" && response.status === 400 && data.validation)) {
      if (response.status === 409) throw new Error("La referencia cambió desde la vista previa. Revisá nuevamente antes de publicar.");
      throw new Error(response.status === 401 || response.status === 403 ? "No tenés autorización para esta acción." : "No pudimos completar la acción. Reintentá la consulta.");
    }
    return data as T;
  }, [user]);

  useEffect(() => {
    if (!user) return;
    let current = true;
    void Promise.all(productos.map(async product => {
      try { return [product.id, await request<CatalogPublicationPreview>(product.id, "preview")] as const; }
      catch { return [product.id, undefined] as const; }
    })).then(entries => { if (current) setStatuses(Object.fromEntries(entries.filter((entry): entry is readonly [string, CatalogPublicationPreview] => entry[1] !== undefined))); });
    return () => { current = false; };
  }, [productos, request, user]);

  function change(patch: Partial<CatalogReferenceDraft>) { setDraft(value => ({ ...value, ...patch })); setDirty(true); }
  function edit(product?: Producto) {
    if (dirty && !window.confirm("Hay cambios sin guardar. ¿Querés descartarlos?")) return;
    setEditing({ id: product?.id ?? null, original: product ?? null });
    setDraft(createCatalogReferenceDraft(product)); setDirty(false); setFiles([]); setExternalUrl(""); setError(""); setMessage("");
    requestAnimationFrame(() => document.getElementById("reference-editor")?.scrollIntoView({ block: "start" }));
  }
  function closeEditor() {
    if (dirty && !window.confirm("Hay cambios sin guardar. ¿Querés descartarlos?")) return;
    setEditing(null); setDirty(false); setFiles([]);
  }
  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!editing || busy) return;
    setError(""); setMessage(""); setBusy("save");
    try {
      const urls = [...draft.imagenUrls];
      if (externalUrl.trim() && !urls.includes(externalUrl.trim())) urls.push(externalUrl.trim());
      if (urls.length + files.length > 4) throw new Error("Usá hasta 4 imágenes por referencia.");
      // Validar antes de iniciar uploads o escrituras.
      buildCatalogReferencePrivatePatch({ ...draft, imagenUrls: urls }, editing.original ?? {});
      const uploaded: string[] = [];
      for (const file of files) uploaded.push(await uploadCatalogReferenceImage(file));
      const nextDraft = { ...draft, imagenUrls: [...urls, ...uploaded] };
      const patch = buildCatalogReferencePrivatePatch(nextDraft, editing.original ?? {});
      let id = editing.id;
      if (id) await updateDoc(doc(db, "productos", id), patch);
      else {
        const created = await addDoc(collection(db, "productos"), { ...patch, activo: false, publicado: false, fechaCreacion: new Date() });
        id = created.id;
        // Conservar identidad confirmada aunque falle la lectura posterior al alta.
        setEditing({ id, original: { ...patch, id } });
      }
      const saved = await getDoc(doc(db, "productos", id));
      const original: CatalogReferenceOriginal = { ...saved.data(), id };
      setEditing({ id, original }); setDraft(createCatalogReferenceDraft(original)); setDirty(false); setFiles([]); setExternalUrl("");
      setMessage("Cambios guardados. La publicación se realiza por separado.");
      await onRefresh();
    } catch (failure) { setError(failure instanceof Error ? failure.message : "No pudimos guardar la referencia."); }
    finally { setBusy(""); }
  }
  async function openPreview(id: string) {
    if (dirty && editing?.id === id) { setError("Guardá los cambios privados antes de previsualizar su publicación."); return; }
    setError(""); setMessage(""); setBusy("preview");
    try {
      const value = await request<CatalogPublicationPreview>(id, "preview");
      setStatuses(previous => ({ ...previous, [id]: value })); setPreview(value);
    } catch (failure) { setError((failure as Error).message); }
    finally { setBusy(""); }
  }
  const closePreview = useCallback(() => { if (!busy) setPreview(null); }, [busy]);
  async function publish() {
    if (!preview?.fingerprint || !preview.dto || busy) return;
    const id = preview.referenciaId;
    setBusy("publish"); setError("");
    try {
      await request(id, "publicar", { expectedFingerprint: preview.fingerprint });
      const value = await request<CatalogPublicationPreview>(id, "preview");
      setStatuses(previous => ({ ...previous, [id]: value })); setPreview(null); setMessage("Referencia publicada.");
    } catch (failure) {
      setError((failure as Error).message);
      // Una preview obsoleta nunca queda lista para reintentar automáticamente.
      setPreview(null);
    } finally { setBusy(""); }
  }
  const closeConfirm = useCallback(() => { if (!busy) setConfirm(null); }, [busy]);
  async function confirmAction() {
    if (!confirm || busy) return;
    setBusy(confirm.kind); setError("");
    try {
      const id = confirm.product.id;
      if (confirm.kind === "unpublish") {
        await request(id, "despublicar"); setMessage("Referencia despublicada. La ficha privada se conserva.");
      } else {
        const fresh = await request<CatalogPublicationPreview>(id, "preview");
        if (fresh.hasPublicProjection) throw new Error("La referencia está publicada. Despublicá primero antes de eliminar la ficha privada.");
        await deleteDoc(doc(db, "productos", id));
        if (editing?.id === id) { setEditing(null); setDirty(false); }
        setMessage("Ficha privada eliminada.");
      }
      setConfirm(null); await onRefresh();
    } catch (failure) { setError((failure as Error).message); setConfirm(null); }
    finally { setBusy(""); }
  }
  function addUrl() {
    if (!externalUrl.trim()) return;
    if (draft.imagenUrls.includes(externalUrl.trim())) { setExternalUrl(""); return; }
    if (draft.imagenUrls.length + files.length >= 4) { setError("Usá hasta 4 imágenes por referencia."); return; }
    change({ imagenUrls: [...draft.imagenUrls, externalUrl.trim()] }); setExternalUrl("");
  }
  const visible = productos.filter(product => product.nombre.toLocaleLowerCase().includes(search.toLocaleLowerCase()));
  return <div className="mx-auto max-w-[1500px] space-y-6 px-4 py-6 sm:px-7 sm:py-8">
    <PageHeader title="Catálogo de referencias" subtitle="Gestioná las referencias de bienes utilizadas para preparar propuestas de gestión de compra." actions={<button type="button" disabled={!!busy} className={primary} onClick={() => edit()}><Plus size={18} aria-hidden="true" />Nueva referencia</button>} />
    <p className="text-sm text-text-secondary">Referencias para gestión de compra mediante mandato. La disponibilidad se confirma durante la cotización.</p>
    {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-[#B42318]">{error}</div>}
    {message && <p role="status" className="rounded-xl border border-border-color bg-surface p-4 text-sm text-brand-primary">{message}</p>}
    <div className={editing ? "grid min-w-0 items-start gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(260px,1fr)]" : "min-w-0"}>
      {editing && <form id="reference-editor" data-testid="reference-editor" onSubmit={save} className="min-w-0 space-y-4 scroll-mt-5">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wider text-text-secondary">Editor de referencia</p><h2 className="mt-1 font-heading text-xl font-bold text-brand-primary">{editing.id ? "Editar referencia" : "Nueva referencia"}</h2></div><button type="button" disabled={!!busy} onClick={closeEditor} className={secondary}>Cerrar editor</button></div>
        <fieldset disabled={!!busy} className="min-w-0 space-y-4 disabled:opacity-70">
          <Section number="01" title="Identificación"><div className="space-y-4"><Field label="Nombre de la referencia"><input className={input} required value={draft.nombre} onChange={e => change({ nombre: e.target.value })} /></Field>
            <div className="grid gap-4 sm:grid-cols-2"><Field label="SKU interno"><input className={input} value={draft.skuInterno} onChange={e => change({ skuInterno: e.target.value })} /></Field><Field label="Código de barras / EAN"><input className={input} value={draft.codigoBarras} onChange={e => change({ codigoBarras: e.target.value })} /></Field></div><p className="text-xs text-text-secondary">Códigos opcionales de uso interno. No forman parte de la vista pública.</p></div></Section>
          <Section number="02" title="Información interna"><p className="mb-4 flex items-center gap-2 text-xs font-bold tracking-wider text-brand-secondary"><ShieldCheck size={16} aria-hidden="true" />SOLO ADMINISTRACIÓN</p>
            <div className="grid gap-4 sm:grid-cols-2"><Field label="Costo proveedor"><input className={input} required type="number" step="0.01" min="0.01" value={draft.costoProveedor} onChange={e => change({ costoProveedor: e.target.value })} /></Field><Field label="Nombre del proveedor"><input className={input} value={draft.proveedor} onChange={e => change({ proveedor: e.target.value })} /></Field></div>
            {editing.original?.codigoProducto && <p data-testid="legacy-code" className="mt-4 rounded-xl bg-background-main p-3 text-sm text-text-secondary">Código legacy: <span className="font-mono">{editing.original.codigoProducto}</span><span className="mt-1 block text-xs">Pendiente de clasificación. No se asigna automáticamente a SKU o EAN.</span></p>}
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
            {files.map((file, i) => <div key={`${file.name}-${i}`} className="mt-2 flex min-w-0 items-center justify-between gap-2 text-sm"><span className="truncate">{file.name}</span><button type="button" className={secondary} onClick={() => { setFiles(values => values.filter((_, index) => index !== i)); setDirty(true); }}>Quitar archivo</button></div>)}
            <div className="mt-4 space-y-3"><Field label="URL de imagen"><input className={input} type="url" value={externalUrl} onChange={e => { setExternalUrl(e.target.value); setDirty(true); }} placeholder="https://…" /></Field><button type="button" className={secondary} onClick={addUrl}><ImagePlus size={16} aria-hidden="true" />Agregar URL</button>
              <Field label="Agregar archivos de imagen"><input className="min-h-11 w-full min-w-0 text-sm file:mr-2 file:min-h-11 file:rounded-lg file:border-0 file:bg-background-main file:px-3" type="file" accept="image/*" multiple onChange={e => {
                const selected = Array.from(e.target.files ?? []);
                const pendingUrl = externalUrl.trim() && !draft.imagenUrls.includes(externalUrl.trim()) ? 1 : 0;
                if (draft.imagenUrls.length + files.length + selected.length + pendingUrl > 4) setError("Usá hasta 4 imágenes por referencia.");
                else { setFiles(previous => [...previous, ...selected]); setDirty(true); }
                e.target.value = "";
              }} /></Field><p className="text-xs text-text-secondary">{draft.imagenUrls.length + files.length}/4 imágenes en el borrador</p>
            </div>
          </Section>
          <Section number="06" title="Publicación"><p className="text-sm font-semibold text-brand-primary">{dirty ? "Cambios locales sin guardar" : editing.id ? catalogPublicationLabel(statuses[editing.id]) : "Borrador / No publicada"}</p>
            <p className="mt-2 text-sm text-text-secondary">Guardar actualiza únicamente la ficha privada. Previsualizá el contenido guardado antes de publicarlo.</p>
            <div className="mt-4 flex flex-wrap gap-3"><button type="submit" className={primary}>{busy === "save" ? "Guardando…" : editing.id ? "Guardar cambios" : "Guardar referencia"}</button><button type="button" className={secondary} disabled={!editing.id || dirty} onClick={() => editing.id && void openPreview(editing.id)}><Eye size={16} aria-hidden="true" />{publicationPreviewLabel(editing.id ? statuses[editing.id] : undefined)}</button></div>
          </Section>
        </fieldset>
      </form>}
      <section className="min-w-0 space-y-4" aria-label="Listado de referencias">
        <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-heading text-lg font-bold text-brand-primary">Referencias <span className="text-sm font-normal text-text-secondary">({visible.length} visibles)</span></h2><button type="button" className={secondary} onClick={onTransfer}><Package size={16} aria-hidden="true" />Traslado interno</button></div>
        <Field label="Buscar referencia"><input type="search" className={input} value={search} onChange={e => setSearch(e.target.value)} placeholder="Nombre de la referencia" /></Field>
        {loadError && <div role="alert" className="rounded-xl border border-border-color bg-surface p-4 text-sm"><p>{loadError}</p><button type="button" className={`${secondary} mt-3`} onClick={() => void onRefresh()}>Reintentar carga</button></div>}
        {fetching && <p role="status" className="p-4 text-sm text-text-secondary">Cargando referencias…</p>}
        {!fetching && !loadError && !visible.length && <div className="rounded-2xl border border-border-color bg-surface p-6"><p className="font-heading font-semibold text-brand-primary">{search ? "No hay coincidencias" : "Tu catálogo de referencias empieza acá"}</p><p className="mt-2 text-sm text-text-secondary">{search ? "Probá con otro nombre." : "Creá una ficha privada, configurá sus planes y publicala cuando esté lista."}</p></div>}
        <div className={editing ? "space-y-4" : "grid gap-4 md:grid-cols-2 2xl:grid-cols-3"}>{visible.map(product => {
          const state = statuses[product.id];
          const saved = createCatalogReferenceDraft(product);
          const plans = Object.entries(saved.planesActivos).filter(([, active]) => active).map(([n]) => n);
          return <article key={product.id} data-reference-row={product.id} className="min-w-0 rounded-2xl border border-border-color bg-surface p-4 sm:p-5">
            <div className="flex items-start gap-4"><div className="size-20 shrink-0 rounded-xl bg-background-main p-2">{ /* eslint-disable-next-line @next/next/no-img-element */ }
<img onError={event => { if (!event.currentTarget.src.endsWith("/logo-cuenta-hogar-oficial.png")) event.currentTarget.src = "/logo-cuenta-hogar-oficial.png"; }} src={saved.imagenUrls[0] || "/logo-cuenta-hogar-oficial.png"} alt="" className="h-full w-full object-contain" /></div><div className="min-w-0"><h3 className="break-words font-heading font-bold text-brand-primary">{product.nombre}</h3><p data-publication-status className="mt-2 text-sm font-semibold text-text-secondary">{catalogPublicationLabel(state)}</p><p className="mt-1 text-xs text-text-secondary">{saved.imagenUrls.length} imágenes · Planes: {plans.join(", ") || "Ninguno habilitado"}</p></div></div>
            <dl className="my-4 grid grid-cols-2 gap-3 rounded-xl bg-background-main p-3 text-sm"><div><dt className="text-xs text-text-secondary">Costo proveedor · Admin</dt><dd className="mt-1 font-semibold">{Number(saved.costoProveedor) > 0 ? money(Number(saved.costoProveedor)) : "Sin configurar"}</dd></div><div className="min-w-0"><dt className="text-xs text-text-secondary">Proveedor · Admin</dt><dd className="mt-1 break-words">{saved.proveedor || "Sin registrar"}</dd></div></dl>
            <div className="flex flex-wrap gap-2"><button type="button" className={secondary} disabled={!!busy} onClick={() => edit(product)}><Pencil size={15} aria-hidden="true" />Editar</button><button type="button" className={secondary} disabled={!!busy} onClick={() => void openPreview(product.id)}><Eye size={15} aria-hidden="true" />{publicationPreviewLabel(state)}</button>
              {state?.hasPublicProjection && <button type="button" className={secondary} disabled={!!busy} onClick={() => setConfirm({ kind: "unpublish", product })}>Despublicar</button>}
              <button type="button" className={secondary} onClick={() => onStock(product)}>Stock / unidades</button><button type="button" className="min-h-11 px-2 text-sm text-[#B42318] disabled:opacity-40" disabled={!!busy || !state || state.hasPublicProjection} onClick={() => setConfirm({ kind: "delete", product })}>Eliminar</button>
            </div>{state?.hasPublicProjection && <p className="mt-2 text-xs text-text-secondary">Para eliminar la ficha privada, despublicá primero.</p>}
          </article>;
        })}</div>
      </section>
    </div>
    {busy === "preview" && <p role="status" className="text-sm text-text-secondary">Preparando vista previa…</p>}
    {preview && <CatalogDialog title="Vista previa de publicación" onClose={closePreview}>
      {preview.dto ? <><p className="mb-4 text-sm font-semibold text-brand-primary">{preview.hasPublicProjection && !preview.hasUnpublishedChanges ? "Publicación actual" : "Lista para publicar"}</p><CatalogReferencePreview reference={preview.dto} />{(!preview.hasPublicProjection || preview.hasUnpublishedChanges) && <button type="button" disabled={!!busy} className={`${primary} mt-5 w-full`} onClick={() => void publish()}><ArrowUpRight size={18} aria-hidden="true" />{busy === "publish" ? "Publicando…" : preview.hasPublicProjection ? "Publicar cambios" : "Publicar"}</button>}</> : <div><p className="font-semibold">No válida para publicar</p><ul className="mt-3 list-inside list-disc space-y-2 text-sm text-text-secondary">{preview.validation.errors.map(value => <li key={value}>{value}</li>)}</ul></div>}
    </CatalogDialog>}
    {confirm && <ConfirmDialog title={confirm.kind === "unpublish" ? "Despublicar referencia" : "Eliminar referencia"} message={confirm.kind === "unpublish" ? "Se retirará la proyección pública. La ficha privada y sus unidades se conservan." : "La ficha privada se eliminará permanentemente, incluido su registro de unidades. Esta acción legacy no elimina archivos de Storage ni otras operaciones."} onClose={closeConfirm} onConfirm={() => void confirmAction()} busy={!!busy} />}
  </div>;
}
