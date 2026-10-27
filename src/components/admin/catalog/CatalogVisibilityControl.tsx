'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import type { CatalogVisibility } from '@/lib/catalogVisibility';
export function CatalogVisibilityControl() {
  const { user } = useAuth();
  return <VisibilitySession key={user?.uid ?? 'anonymous'} />;
}
function VisibilitySession() {
  const { user } = useAuth();
  const [view, setView] = useState<CatalogVisibility | null>(null), [busy, setBusy] = useState(false), [error, setError] = useState(''), [message, setMessage] = useState('');
  const flight = useRef(false);
  const request = useCallback(async (change?: CatalogVisibility) => {
    if (!user) throw Error('Volvé a ingresar para administrar el catálogo.');
    const r = await fetch('/api/admin/catalogo/visibilidad', { method: change ? 'POST' : 'GET', cache: 'no-store', headers: { Authorization: `Bearer ${await user.getIdToken()}`, ...(change ? { 'Content-Type': 'application/json' } : {}) }, ...(change ? { body: JSON.stringify({ homeVisible: change.homeVisible, expectedRevision: change.revision }) } : {}) });
    const body = await r.json(); if (!r.ok) throw Error(body.error || 'No se confirmó la visibilidad.');
    return body as CatalogVisibility;
  }, [user]);
  useEffect(() => { let live = true; if (user) void request().then(v => { if (live) setView(v); }).catch(e => { if (live) setError(e.message); }); return () => { live = false; }; }, [request, user]);
  async function save() {
    if (flight.current || !view) return; flight.current = true; setBusy(true); setError(''); setMessage('');
    try { const next = await request({ ...view, homeVisible: !view.homeVisible }); setView(next); setMessage(next.homeVisible ? 'Catálogo visible en la página principal.' : 'Catálogo oculto en la página principal. Sigue disponible para vendedores afiliados.'); }
    catch (e) { setError(e instanceof Error ? e.message : 'No se confirmó el cambio.'); }
    finally { flight.current = false; setBusy(false); }
  }
  return <section data-testid="catalog-visibility" className="min-w-0 space-y-3 rounded-2xl border border-border-color bg-surface p-4 text-text-primary sm:p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-bold text-brand-primary">Catálogo en la página principal</h2><p className="mt-1">{view ? view.homeVisible ? 'Visible para quienes visitan Cuenta Hogar.' : 'Oculto en la página principal.' : 'Consultando visibilidad…'}</p></div><button type="button" disabled={!view || busy} onClick={() => void save()} className="min-h-11 rounded-xl bg-brand-primary px-4 py-3 font-semibold text-white disabled:opacity-50">{busy ? 'Guardando…' : !view ? 'Consultando…' : view.homeVisible ? 'Ocultar de la página principal' : 'Mostrar en la página principal'}</button></div><p className="text-sm text-text-secondary">Los productos publicados siguen disponibles en el panel del vendedor afiliado. Esta opción sólo controla su presentación en la página principal.</p>{message && <p role="status" className="rounded-xl bg-emerald-50 p-3 text-emerald-900">{message}</p>}{error && <div role="alert" className="space-y-2 rounded-xl bg-red-50 p-3 text-red-900"><p>{error}</p><button type="button" className="min-h-11 underline" onClick={() => void request().then(v => { setView(v); setError(''); }).catch(e => setError(e.message))}>Actualizar visibilidad</button></div>}</section>;
}
