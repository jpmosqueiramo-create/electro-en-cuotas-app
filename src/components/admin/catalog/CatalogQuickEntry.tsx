'use client';

import { Field, Section, type ReferenceConfigurator } from '../references/ReferenceConfigurator';
import { calcularPlanReferenciaCatalogo } from '@/lib/catalogReference';
import { catalogEntryMissing } from '@/lib/catalogQuickEntry';
import { loopCategories, loopCategoryLabels, type LoopCategory } from '@/lib/loopServiceTariffs';

type Props = Omit<Parameters<typeof ReferenceConfigurator>[0], 'context' | 'legacyCode'> & { suppliers: string[]; onAdvanced: () => void };
const input = 'admin-control min-h-11 w-full min-w-0 rounded-xl border border-border-color bg-surface px-3 py-2 text-base text-text-primary';
const button = 'admin-control inline-flex min-h-11 items-center justify-center rounded-xl border border-border-color bg-surface px-3 text-sm font-semibold text-brand-primary';
const money = (value: number) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(value);

export function CatalogQuickEntry({ draft, onChange, suppliers, onAdvanced, externalUrl, files, onExternalUrlChange, onAddUrl, onAddFiles, onRemoveFile }: Props) {
  const missing = catalogEntryMissing(draft), plans = Array.from({ length: 18 }, (_, i) => i + 1);
  const active = plans.filter(n => draft.planesActivos[n]);
  return <div data-testid="catalog-quick-entry" className="space-y-4">
    <Section number="01" title="Datos del producto">
      <p className="mb-4 text-sm text-text-secondary">Para guardar un borrador sólo necesitás nombre y costo. Completá lo demás cuando lo tengas.</p>
      <div className="space-y-4"><Field label="Nombre de la referencia"><input className={input} required autoFocus value={draft.nombre} placeholder="Ej.: Lavarropas Kanji 8 kg" onChange={e => onChange({ nombre: e.target.value })} /></Field>
        <div className="grid min-w-0 gap-4 sm:grid-cols-2"><Field label="Costo proveedor"><input className={input} required type="number" inputMode="decimal" min="0.01" step="0.01" value={draft.costoProveedor} onChange={e => onChange({ costoProveedor: e.target.value })} /></Field><Field label="Nombre del proveedor (opcional)"><input className={input} list="quick-catalog-suppliers" value={draft.proveedor} onChange={e => onChange({ proveedor: e.target.value })} /></Field></div>
        <datalist id="quick-catalog-suppliers">{suppliers.map(s => <option key={s} value={s} />)}</datalist>
        <p className="text-xs font-semibold text-brand-secondary">Costo y proveedor: sólo administración.</p>
        <Field label="Categoría de servicios y logística"><select className={input} value={draft.categoriaLogistica ?? ''} onChange={e => onChange({ categoriaLogistica: (e.target.value || null) as LoopCategory | null })}><option value="">Sin asignar</option>{loopCategories.map(c => <option key={c} value={c}>{c} · {loopCategoryLabels[c]}</option>)}</select></Field>
      </div>
    </Section>
    <Section number="02" title="Planes a mostrar">
      <p className="mb-3 text-sm text-text-secondary">Tocá los plazos que quieras habilitar. Las estimaciones usan los factores que ya tiene la ficha.</p>
      <div className="grid min-w-0 grid-cols-3 gap-2 sm:grid-cols-6">{plans.map(n => <label key={n} data-plan-row={n} className={`flex min-h-12 min-w-0 cursor-pointer items-center justify-center gap-2 rounded-xl border px-2 text-sm font-semibold ${draft.planesActivos[n] ? 'border-brand-primary bg-background-main text-brand-primary' : 'border-border-color bg-surface text-text-secondary'}`}><input className="size-4 shrink-0 accent-brand-primary" type="checkbox" aria-label={`Habilitar ${n} cuotas`} checked={draft.planesActivos[n] === true} onChange={e => onChange({ planesActivos: { ...draft.planesActivos, [n]: e.target.checked } })} /><span>{n}</span></label>)}</div>
      <p role="status" className="mt-3 text-sm font-semibold text-brand-primary">{active.length} {active.length === 1 ? 'plan seleccionado' : 'planes seleccionados'}{!active.length ? ' · Podés guardar el borrador sin planes.' : ''}</p>
      <div className="mt-3 grid min-w-0 gap-2 sm:grid-cols-2">{active.map(n => {
        let estimate: number | null = null;
        try { estimate = calcularPlanReferenciaCatalogo({ costoProveedor: Number(draft.costoProveedor), cuotas: n, factor: draft.factoresPlanes[n] }).cuotaExhibidaCatalogo; } catch { /* Keep invalid values visible for review. */ }
        return <p data-estimate={n} key={n} className="min-w-0 break-words rounded-xl bg-background-main p-3 text-sm">{n} {n === 1 ? 'cuota' : 'cuotas'} de <strong>{estimate === null ? 'Revisá costo y factor' : money(estimate)}</strong></p>;
      })}</div>
      <button type="button" className={button + ' mt-3'} onClick={onAdvanced}>Revisar factores y opciones avanzadas</button>
    </Section>
    <details className="min-w-0 space-y-4 rounded-2xl border border-border-color bg-surface p-4 sm:p-5"><summary className="min-h-11 cursor-pointer font-bold text-brand-primary">Fotos y descripción (opcional)</summary>
      <div className="mt-4 space-y-4"><Field label="Descripción pública de la referencia"><textarea className={input} rows={3} value={draft.descripcion} onChange={e => onChange({ descripcion: e.target.value })} /></Field><p className="text-xs text-text-secondary">Usá una descripción comercial. Los costos y datos internos quedan fuera de este texto.</p>
        <div className="grid grid-cols-2 gap-3">{draft.imagenUrls.map((url, i) => <div key={`${url}-${i}`} className="min-w-0 space-y-2 rounded-xl border border-border-color p-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt={`Imagen de referencia ${i + 1}`} className="aspect-square w-full object-contain" onError={e => { if (!e.currentTarget.src.endsWith('/logo-cuenta-hogar-oficial.png')) e.currentTarget.src = '/logo-cuenta-hogar-oficial.png'; }} />
          <button type="button" className={button + ' w-full'} onClick={() => onChange({ imagenUrls: draft.imagenUrls.filter((_, index) => index !== i) })}>Quitar imagen {i + 1}</button>
        </div>)}</div>
        {files.map((f, i) => <p key={i} className="flex min-w-0 flex-wrap items-center gap-2 text-sm"><span className="break-all">{f.name}</span><button type="button" className={button} onClick={() => onRemoveFile(i)}>Quitar archivo</button></p>)}
        <Field label="Agregar archivos de imagen"><input type="file" accept="image/*" multiple className="min-h-11 w-full min-w-0 text-sm" onChange={e => { onAddFiles(Array.from(e.target.files ?? [])); e.target.value = ''; }} /></Field>
        <details><summary className="min-h-11 cursor-pointer py-2 text-sm font-semibold">Usar un enlace de imagen</summary><div className="space-y-2"><Field label="URL de imagen"><input className={input} type="url" value={externalUrl} onChange={e => onExternalUrlChange(e.target.value)} placeholder="https://…" /></Field><button type="button" className={button} onClick={onAddUrl}>Agregar URL</button></div></details>
        <p className="text-xs text-text-secondary">{draft.imagenUrls.length + files.length}/4 imágenes. Quitar una imagen del borrador conserva el archivo original.</p>
      </div>
    </details>
    <p role="status" className="text-sm text-text-secondary">{missing.length ? `Falta completar: ${missing.join(' y ')}.` : 'Listo para guardar la ficha privada.'}</p>
  </div>;
}
