'use client';
import Image from 'next/image';
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { parsePublicCatalogReference } from '@/lib/publicCatalogContract';
import type { CatalogReferencePublic } from '@/lib/catalogReference';
const normalize = (v: string) => v.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const money = (v: number) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(v);
export function AffiliateCatalog() {
  const { user } = useAuth();
  return <CatalogSession key={user?.uid ?? 'anonymous'} />;
}
function CatalogSession() {
  const { user } = useAuth();
  const [items, setItems] = useState<CatalogReferencePublic[]>([]), [search, setSearch] = useState(''), [error, setError] = useState(''), [loaded, setLoaded] = useState(false), [busy, setBusy] = useState(false);
  const [plans, setPlans] = useState<Record<string, string>>({});
  const load = useCallback(async (signal?: AbortSignal) => {
    if (!user) return; setBusy(true); setError('');
    try {
      const r = await fetch('/api/afiliado/catalogo', { cache: 'no-store', signal, headers: { Authorization: `Bearer ${await user.getIdToken()}` } });
      if (!r.ok) throw Error(r.status === 403 ? 'Tu cuenta debe estar activa y tener el correo verificado. Consultá a Administración.' : 'No pudimos cargar el catálogo. Reintentá.');
      const body = await r.json(); if (!Array.isArray(body.items)) throw Error('Respuesta de catálogo inválida.');
      const parsed = body.items.map((raw: CatalogReferencePublic) => parsePublicCatalogReference(raw.referenciaId, raw));
      if (parsed.some((p: CatalogReferencePublic | null) => !p)) throw Error('Respuesta de catálogo inválida.');
      if (!signal?.aborted) setItems(parsed as CatalogReferencePublic[]);
    } catch (e) { if (!signal?.aborted) { setItems([]); setError(e instanceof Error ? e.message : 'No pudimos cargar el catálogo.'); } }
    finally { if (!signal?.aborted) { setLoaded(true); setBusy(false); } }
  }, [user]);
  useEffect(() => { const controller = new AbortController(); void load(controller.signal); return () => controller.abort(); }, [load]);
  const words = normalize(search).trim().split(/\s+/).filter(Boolean), filtered = items.filter(p => words.every(w => normalize(p.nombre + ' ' + p.descripcion).includes(w)));
  return <section data-testid="affiliate-catalog" className="min-w-0 space-y-4 rounded-2xl border border-border-color bg-surface p-4 text-text-primary sm:p-5"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-bold text-brand-primary">Catálogo para mis clientes</h2><button type="button" disabled={busy} onClick={() => void load()} className="min-h-11 rounded-xl border border-border-color px-4 font-semibold text-brand-primary disabled:opacity-50">Actualizar catálogo</button></div><p>Consultá los productos y planes publicados para el servicio de gestión de compra. Los importes son estimados y están sujetos al presupuesto aceptado.</p><label className="block space-y-1"><span>Buscar producto</span><input type="search" value={search} onChange={e => setSearch(e.target.value)} className="admin-control min-h-11 w-full min-w-0 rounded-xl border border-border-color bg-surface p-3 text-text-primary" placeholder="Nombre, marca o modelo" /></label>{error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-red-900">{error}</p>}{!loaded && <p role="status">Cargando catálogo…</p>}{loaded && !error && <p role="status">{filtered.length} {filtered.length === 1 ? 'producto disponible' : 'productos disponibles'}</p>}<div className="grid min-w-0 gap-4 sm:grid-cols-2 lg:grid-cols-3">{filtered.map(p => {
    const plan = p.planesPublicados.find(option => String(option.cuotas) === plans[p.referenciaId]) ?? p.planesPublicados.find(option => option.cuotas === 12) ?? p.planesPublicados[0];
    return <article key={p.referenciaId} data-affiliate-reference={p.referenciaId} className="min-w-0 space-y-3 rounded-xl border border-border-color p-4"><div className="relative h-40 w-full rounded-lg bg-white"><Image unoptimized fill sizes="(max-width: 640px) 100vw, 320px" src={p.imagenUrls[0]} alt={p.nombre} className="rounded-lg object-contain" /></div><h3 className="break-words font-bold">{p.nombre}</h3><p className="break-words text-sm text-text-secondary">{p.descripcion}</p><label className="block space-y-1"><span>Plan de cuotas</span><select aria-label={`Plan de ${p.nombre}`} value={String(plan.cuotas)} onChange={e => setPlans(old => ({ ...old, [p.referenciaId]: e.target.value }))} className="admin-control min-h-11 w-full min-w-0 rounded-xl border border-border-color bg-surface p-2 text-text-primary">{p.planesPublicados.map(option => <option key={option.cuotas} value={option.cuotas}>{option.cuotas} cuotas</option>)}</select></label><p className="text-lg font-bold text-brand-primary">{plan.cuotas} cuotas de {money(plan.cuotaEstimada)}</p></article>;
  })}</div>{loaded && !error && !filtered.length && <p>{items.length ? 'No hay coincidencias. Probá con otra búsqueda.' : 'Todavía no hay productos publicados. Consultá a Administración.'}</p>}</section>;
}
