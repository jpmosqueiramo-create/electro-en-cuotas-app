"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Plus, Pencil, Eye, Package, ArrowUpRight } from "lucide-react";
import { addDoc, collection, deleteDoc, doc, getDoc, updateDoc } from "firebase/firestore";
import { useAuth } from "@/components/AuthProvider";
import { PageHeader } from "@/components/PageHeader";
import { db } from "@/lib/firebase";
import { referenceConfiguratorReducer } from "@/lib/referenceConfigurator";
import { ReferenceConfigurator, Field, Section } from "../references/ReferenceConfigurator";
import { buildCatalogReferencePrivatePatch, catalogPublicationLabel, createCatalogReferenceDraft, type CatalogPublicationPreview, type CatalogReferenceDraft } from "@/lib/catalogReferenceEditor";
import { uploadCatalogReferenceImage } from "@/lib/catalogReferenceImages";
import { CatalogReferencePreview, money } from "./CatalogReferencePreview";
import { CatalogDialog, ConfirmDialog } from "./CatalogDialog";
import { LoopServiceTariffsEditor } from "./LoopServiceTariffsEditor";
import { CatalogPriceListExport } from "./CatalogPriceListExport";
import { CatalogBulkImport } from "./CatalogBulkImport";
import { catalogFilterOptions, catalogListRows, filterSortCatalog, type CatalogSort } from "@/lib/catalogAdminList";
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

export function CatalogReferenceWorkspace({ productos, fetching, loadError, onRefresh, onStock, onTransfer }: {
  productos: Producto[]; fetching: boolean; loadError: string; onRefresh: () => Promise<void>;
  onStock: (product: Producto) => void; onTransfer: () => void;
}) {
  const { user } = useAuth();
  const [editing, setEditing] = useState<{ id: string | null; original: CatalogReferenceOriginal | null } | null>(null);
  const [draft, setDraft] = useState(createCatalogReferenceDraft);
  const [dirty, setDirty] = useState(false);
  const [editorBusy, setBusy] = useState("");
  const [bulkBusy, setBulkBusy] = useState(false);
  const busy = editorBusy || (bulkBusy ? "bulk" : "");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [statuses, setStatuses] = useState<Record<string, CatalogPublicationPreview>>({});
  const [preview, setPreview] = useState<CatalogPublicationPreview | null>(null);
  const [confirm, setConfirm] = useState<{ kind: "unpublish" | "delete"; product: Producto } | null>(null);
  const [externalUrl, setExternalUrl] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [search, setSearch] = useState("");
  const [brandFilter,setBrandFilter]=useState(''),[kindFilter,setKindFilter]=useState('');
  const [sort,setSort]=useState<CatalogSort>('name'),[descending,setDescending]=useState(false);
  const listRows=useMemo(()=>catalogListRows(productos),[productos]);
  const brands=useMemo(()=>catalogFilterOptions(listRows,'brand'),[listRows]);
  const kinds=useMemo(()=>catalogFilterOptions(listRows,'kind'),[listRows]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [deletePreview, setDeletePreview] = useState<{rows:{id:string;name:string}[];digest:string}|null>(null);
  const deleteFlight = useRef(false);
  const closeDelete = useCallback(() => { if (!deleteFlight.current) setDeletePreview(null); }, []);
  async function deleteSelected(apply=false){
    if(!user||busy||editing||deleteFlight.current)return;
    const ids=apply?deletePreview?.rows.map(row=>row.id):selectedIds.filter(id=>productos.some(p=>p.id===id));
    if(!ids?.length)return;
    deleteFlight.current=true;setBusy("deleteBulk");setError("");setMessage("");
    try{
      const response=await fetch('/api/admin/catalogo/eliminar-masivo',{method:'POST',cache:'no-store',headers:{Authorization:`Bearer ${await user.getIdToken()}`,'Content-Type':'application/json'},body:JSON.stringify({action:apply?'APPLY':'PREVIEW',ids,...(apply?{digest:deletePreview!.digest}:{})})});
      const data=await response.json();if(!response.ok)throw Error(data.error||'No se pudo eliminar la selección.');
      if(!apply)setDeletePreview(data);
      else{setDeletePreview(null);setSelectedIds([]);setMessage(data.alreadyDeleted?'Los productos seleccionados ya no están en el catálogo.':`${data.count} productos eliminados del catálogo.`);await onRefresh();}
    }catch(failure){setDeletePreview(null);setError(failure instanceof Error?failure.message:'No se pudo eliminar la selección.');}
    finally{deleteFlight.current=false;setBusy("");}
  }


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

  function change(patch: Partial<CatalogReferenceDraft>) { setDraft(value => referenceConfiguratorReducer(value, { type: "patch", patch })); setDirty(true); }
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
  const selected = selectedIds.filter(id=>productos.some(p=>p.id===id));
  const selectionDisabled = !!busy || !!editing || fetching || !!loadError;
  const canDelete = (p:Producto) => !!statuses[p.id] && !statuses[p.id].hasPublicProjection && p.publicado!==true && p.activo!==true && (!p.stock || (Array.isArray(p.stock)&&p.stock.length===0));
  const visibleRows = filterSortCatalog(listRows,{search,brand:brandFilter,kind:kindFilter,sort,descending});
  const visible = visibleRows.map(row=>row.product);
  const selectableVisible = visible.filter(canDelete).slice(0,100);
  return <div className="mx-auto max-w-[1500px] space-y-6 px-4 py-6 sm:px-7 sm:py-8">
    <PageHeader title="Catálogo de referencias" subtitle="Gestioná las referencias de bienes utilizadas para preparar propuestas de gestión de compra." actions={<div className="flex flex-wrap items-start gap-2"><CatalogPriceListExport products={productos} disabled={!!busy || !!editing || fetching || !!loadError} onBusyChange={setBulkBusy} /><button type="button" disabled={!!busy} className={primary} onClick={() => edit()}><Plus size={18} aria-hidden="true" />Nueva referencia</button></div>} />
    <p className="text-sm text-text-secondary">Referencias para gestión de compra mediante mandato. La disponibilidad se confirma durante la cotización.</p>
    <LoopServiceTariffsEditor />
    <CatalogBulkImport products={productos} onSaved={onRefresh} onBusyChange={setBulkBusy} editingOpen={!!editing} disabled={!!busy || !!editing || fetching || !!loadError} />
    {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-[#B42318]">{error}</div>}
    {message && <p role="status" className="rounded-xl border border-border-color bg-surface p-4 text-sm text-brand-primary">{message}</p>}
    <div className={editing ? "grid min-w-0 items-start gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(260px,1fr)]" : "min-w-0"}>
      {editing && <form id="reference-editor" data-testid="reference-editor" onSubmit={save} className="min-w-0 space-y-4 scroll-mt-5">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wider text-text-secondary">Editor de referencia</p><h2 className="mt-1 font-heading text-xl font-bold text-brand-primary">{editing.id ? "Editar referencia" : "Nueva referencia"}</h2></div><button type="button" disabled={!!busy} onClick={closeEditor} className={secondary}>Cerrar editor</button></div>
        <fieldset disabled={!!busy} className="min-w-0 space-y-4 disabled:opacity-70">
          <ReferenceConfigurator draft={draft} onChange={change} legacyCode={editing.original?.codigoProducto}
            externalUrl={externalUrl} files={files} onAddUrl={addUrl}
            onExternalUrlChange={value => { setExternalUrl(value); setDirty(true); }}
            onRemoveFile={index => { setFiles(values => values.filter((_, i) => i !== index)); setDirty(true); }}
            onAddFiles={selected => {
              const pendingUrl = externalUrl.trim() && !draft.imagenUrls.includes(externalUrl.trim()) ? 1 : 0;
              if (draft.imagenUrls.length + files.length + selected.length + pendingUrl > 4) setError("Usá hasta 4 imágenes por referencia.");
              else { setFiles(previous => [...previous, ...selected]); setDirty(true); }
            }} />
          <Section number="06" title="Publicación"><p className="text-sm font-semibold text-brand-primary">{dirty ? "Cambios locales sin guardar" : editing.id ? catalogPublicationLabel(statuses[editing.id]) : "Borrador / No publicada"}</p>
            <p className="mt-2 text-sm text-text-secondary">Guardar actualiza únicamente la ficha privada. Previsualizá el contenido guardado antes de publicarlo.</p>
            <div className="mt-4 flex flex-wrap gap-3"><button type="submit" className={primary}>{busy === "save" ? "Guardando…" : editing.id ? "Guardar cambios" : "Guardar referencia"}</button><button type="button" className={secondary} disabled={!editing.id || dirty} onClick={() => editing.id && void openPreview(editing.id)}><Eye size={16} aria-hidden="true" />{publicationPreviewLabel(editing.id ? statuses[editing.id] : undefined)}</button></div>
          </Section>
        </fieldset>
      </form>}
      <section className="min-w-0 space-y-4" aria-label="Listado de referencias">
        <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-heading text-lg font-bold text-brand-primary">Referencias <span className="text-sm font-normal text-text-secondary">({visible.length} visibles)</span></h2><button type="button" className={secondary} onClick={onTransfer}><Package size={16} aria-hidden="true" />Traslado interno</button></div>
        <div data-testid="catalog-filters" className="grid min-w-0 gap-3 rounded-2xl border border-border-color bg-surface p-3 sm:grid-cols-2 xl:grid-cols-3">
          <Field label="Buscar referencia"><input type="search" className={input} value={search} onChange={e => setSearch(e.target.value)} placeholder="Nombre, marca, tipo o SKU" /></Field>
          <Field label="Tipo de producto"><select className={input} value={kindFilter} onChange={e=>setKindFilter(e.target.value)}><option value="">Todos los tipos</option><option value="missing">Sin clasificar</option>{kinds.map(value=><option key={value} value={JSON.stringify(value)}>{value}</option>)}</select></Field>
          <Field label="Marca"><select className={input} value={brandFilter} onChange={e=>setBrandFilter(e.target.value)}><option value="">Todas las marcas</option><option value="missing">Sin marca</option>{brands.map(value=><option key={value} value={JSON.stringify(value)}>{value}</option>)}</select></Field>
          <Field label="Ordenar por"><select className={input} value={sort} onChange={e=>setSort(e.target.value as CatalogSort)}><option value="name">Nombre</option><option value="brand">Marca</option><option value="kind">Tipo de producto</option><option value="cost">Costo del producto</option><option value="installment12">Valor de la cuota en 12 pagos</option></select></Field>
          <div className="flex flex-wrap items-end gap-2"><button type="button" className={secondary} aria-label="Invertir orden del catálogo" onClick={()=>setDescending(value=>!value)}>{sort==='cost'||sort==='installment12'?(descending?'Mayor a menor ↓':'Menor a mayor ↑'):(descending?'Z → A':'A → Z')}</button><button type="button" className={secondary} onClick={()=>{setSearch('');setBrandFilter('');setKindFilter('');setSort('name');setDescending(false);}}>Restablecer filtros</button></div>
          <p className="self-end text-xs text-text-secondary">Cuotas estimadas con el costo y los factores guardados. Los productos sin plan de 12 cuotas habilitado se muestran al final de ese orden.</p>
        </div>
        <div data-testid="catalog-selection" className="flex min-w-0 flex-wrap items-center gap-3 rounded-xl border border-border-color bg-surface p-3">
          <label className="flex min-h-11 items-center gap-2 text-sm font-semibold"><input type="checkbox" className="size-5 shrink-0" disabled={selectionDisabled||!selectableVisible.length} checked={!!selectableVisible.length&&selectableVisible.every(p=>selected.includes(p.id))} onChange={e=>setSelectedIds(e.target.checked?selectableVisible.map(p=>p.id):selected.filter(id=>!selectableVisible.some(p=>p.id===id)))}/>Seleccionar visibles aptos (hasta 100)</label>
          <span role="status" className="text-sm">{selected.length} seleccionados</span>
          <button type="button" className={secondary} disabled={selectionDisabled||!selected.length} onClick={()=>setSelectedIds([])}>Limpiar selección</button>
          <button type="button" className="min-h-11 rounded-xl bg-red-700 px-4 text-sm font-semibold text-white disabled:opacity-40" disabled={selectionDisabled||!selected.length} onClick={()=>void deleteSelected()}>Eliminar seleccionados</button>
          <p className="w-full text-xs text-text-secondary">Sólo fichas sin publicar y sin unidades registradas. La selección se conserva al buscar; revisá la lista antes de eliminar.</p>
          {!!editing&&<p className="w-full text-xs text-text-secondary">Cerrá el editor para seleccionar y eliminar productos.</p>}
        </div>
        {loadError && <div role="alert" className="rounded-xl border border-border-color bg-surface p-4 text-sm"><p>{loadError}</p><button type="button" className={`${secondary} mt-3`} onClick={() => void onRefresh()}>Reintentar carga</button></div>}
        {fetching && <p role="status" className="p-4 text-sm text-text-secondary">Cargando referencias…</p>}
        {!fetching && !loadError && !visible.length && <div className="rounded-2xl border border-border-color bg-surface p-6"><p className="font-heading font-semibold text-brand-primary">{search ? "No hay coincidencias" : "Tu catálogo de referencias empieza acá"}</p><p className="mt-2 text-sm text-text-secondary">{search ? "Probá con otro nombre." : "Creá una ficha privada, configurá sus planes y publicala cuando esté lista."}</p></div>}
        <div role="list" aria-label="Productos del catálogo" className="space-y-2">{visibleRows.map(row => {
          const product=row.product,state=statuses[product.id],saved=createCatalogReferenceDraft(product);
          const plans=Object.entries(saved.planesActivos).filter(([,active])=>active).map(([n])=>n);
          return <article role="listitem" key={product.id} data-reference-row={product.id} className={`grid min-w-0 grid-cols-[24px_minmax(0,1fr)] items-start gap-3 rounded-xl border border-border-color bg-surface p-3 sm:p-4 ${editing?'':'lg:grid-cols-[24px_minmax(180px,1.5fr)_minmax(100px,.6fr)_minmax(100px,.6fr)_minmax(220px,1fr)]'}`}>
            <input type="checkbox" className="mt-2 size-5 shrink-0 accent-brand-primary" aria-label={`Seleccionar ${product.nombre}`} title={canDelete(product)?'Seleccionar producto':state?.hasPublicProjection||product.publicado||product.activo?'Despublicá antes de seleccionar':product.stock?.length?'Tiene unidades registradas':'Verificando disponibilidad'} disabled={selectionDisabled||!canDelete(product)||(!selected.includes(product.id)&&selected.length>=100)} checked={selected.includes(product.id)} onChange={e=>setSelectedIds(previous=>e.target.checked?[...new Set([...previous,product.id])].slice(0,100):previous.filter(id=>id!==product.id))}/>
            <div className="flex min-w-0 items-start gap-3"><div className="size-14 shrink-0 rounded-lg bg-background-main p-1">{/* eslint-disable-next-line @next/next/no-img-element */}
              <img loading="lazy" onError={event=>{if(!event.currentTarget.src.endsWith('/logo-cuenta-hogar-oficial.png'))event.currentTarget.src='/logo-cuenta-hogar-oficial.png';}} src={saved.imagenUrls[0]||'/logo-cuenta-hogar-oficial.png'} alt="" className="h-full w-full object-contain" /></div>
              <div className="min-w-0"><h3 className="break-words text-sm font-bold text-brand-primary">{product.nombre}</h3><p data-product-classification className="mt-1 break-words text-xs text-text-secondary">{row.brand||'Sin marca'} · {row.kind||'Sin clasificar'}</p><p data-publication-status className="mt-1 text-xs font-semibold text-text-secondary">{catalogPublicationLabel(state)}</p><p className="mt-1 text-xs text-text-secondary">Categoría de servicios: {saved.categoriaLogistica||'Sin asignar'} · Planes: {plans.join(', ')||'Ninguno habilitado'}</p></div>
            </div>
            <div className={`col-start-2 grid min-w-0 grid-cols-2 gap-3 ${editing?'':'lg:contents'}`}><dl className="min-w-0 text-sm"><dt className="text-xs text-text-secondary">Costo producto · Admin</dt><dd data-catalog-cost className="mt-1 break-words font-semibold tabular-nums">{row.cost===null?'Sin configurar':money(row.cost)}</dd><dt className="mt-2 text-xs text-text-secondary">Proveedor</dt><dd className="break-words text-xs">{saved.proveedor||'Sin registrar'}</dd></dl>
            <div className="min-w-0 text-sm"><p className="text-xs text-text-secondary">Cuota estimada × 12</p><p data-catalog-installment12 className="mt-1 break-words font-bold tabular-nums text-brand-primary">{row.installment12===null?'No disponible':money(row.installment12)}</p>{row.installment12===null&&<p className="mt-1 text-xs text-text-secondary">{saved.planesActivos[12]?'Revisá costo y factor':'Plan no habilitado'}</p>}</div></div>
            <div className={`col-start-2 min-w-0 ${editing?'':'lg:col-start-auto'}`}><div className="flex flex-wrap gap-2"><button type="button" className={secondary} disabled={!!busy} onClick={()=>edit(product)}><Pencil size={15} aria-hidden="true"/>Editar</button><button type="button" className={secondary} disabled={!!busy} onClick={()=>void openPreview(product.id)}><Eye size={15} aria-hidden="true"/>{publicationPreviewLabel(state)}</button>
              {state?.hasPublicProjection&&<button type="button" className={secondary} disabled={!!busy} onClick={()=>setConfirm({kind:'unpublish',product})}>Despublicar</button>}
              <button type="button" className={secondary} onClick={()=>onStock(product)}>Stock / unidades</button><button type="button" className="min-h-11 px-2 text-sm text-[#B42318] disabled:opacity-40" disabled={!!busy||!state||state.hasPublicProjection} onClick={()=>setConfirm({kind:'delete',product})}>Eliminar</button>
            </div>{state?.hasPublicProjection&&<p className="mt-2 text-xs text-text-secondary">Despublicá antes de eliminar o seleccionar.</p>}</div>
          </article>;
        })}</div>
      </section>
    </div>
    {busy === "preview" && <p role="status" className="text-sm text-text-secondary">Preparando vista previa…</p>}
    {preview && <CatalogDialog title="Vista previa de publicación" onClose={closePreview}>
      {preview.dto ? <><p className="mb-4 text-sm font-semibold text-brand-primary">{preview.hasPublicProjection && !preview.hasUnpublishedChanges ? "Publicación actual" : "Lista para publicar"}</p><CatalogReferencePreview reference={preview.dto} />{(!preview.hasPublicProjection || preview.hasUnpublishedChanges) && <button type="button" disabled={!!busy} className={`${primary} mt-5 w-full`} onClick={() => void publish()}><ArrowUpRight size={18} aria-hidden="true" />{busy === "publish" ? "Publicando…" : preview.hasPublicProjection ? "Publicar cambios" : "Publicar"}</button>}</> : <div><p className="font-semibold">No válida para publicar</p><ul className="mt-3 list-inside list-disc space-y-2 text-sm text-text-secondary">{preview.validation.errors.map(value => <li key={value}>{value}</li>)}</ul></div>}
    </CatalogDialog>}
    {deletePreview && <CatalogDialog title={`Eliminar ${deletePreview.rows.length} productos`} onClose={closeDelete}>
      <p className="text-sm text-text-secondary">Se eliminarán permanentemente estas fichas del catálogo. Se verificó que no estén publicadas y que no tengan unidades registradas. Los presupuestos, las operaciones anteriores y los archivos de imágenes se conservan.</p>
      <ul className="my-4 max-h-64 space-y-2 overflow-y-auto rounded-xl bg-background-main p-3 text-sm">{deletePreview.rows.map(row=><li key={row.id} className="break-words"><strong>{row.name}</strong></li>)}</ul>
      <div className="flex flex-wrap justify-end gap-3"><button type="button" className={secondary} disabled={!!busy} onClick={closeDelete}>Cancelar</button><button type="button" className="min-h-11 rounded-xl bg-red-700 px-4 text-sm font-semibold text-white disabled:opacity-50" disabled={!!busy} onClick={()=>void deleteSelected(true)}>{busy==='deleteBulk'?'Eliminando…':'Confirmar eliminación'}</button></div>
    </CatalogDialog>}
    {confirm && <ConfirmDialog title={confirm.kind === "unpublish" ? "Despublicar referencia" : "Eliminar referencia"} message={confirm.kind === "unpublish" ? "Se retirará la proyección pública. La ficha privada y sus unidades se conservan." : "La ficha privada se eliminará permanentemente, incluido su registro de unidades. Esta acción legacy no elimina archivos de Storage ni otras operaciones."} onClose={closeConfirm} onConfirm={() => void confirmAction()} busy={!!busy} />}
  </div>;
}
