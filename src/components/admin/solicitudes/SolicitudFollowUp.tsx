'use client';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { followUpLabels, followUpTransitions, formatFollowUpDate, type FollowUpCommand, type FollowUpPage, type FollowUpState } from '@/lib/adminSolicitudFollowUp';
import type { AdminSolicitudSource } from '@/lib/adminSolicitudesReadModel';

type Feedback = { text: string; error: boolean };
const control = 'admin-control min-h-11 rounded-xl border border-border-color bg-background-main px-3 py-2 text-sm';
export function SolicitudFollowUp({ source, id, inactive }: { source: AdminSolicitudSource; id: string; inactive: boolean }) {
  const { user } = useAuth();
  const [page, setPage] = useState<FollowUpPage | null>(null);
  const [note, setNote] = useState('');
  const [target, setTarget] = useState<FollowUpState | ''>('');
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [readError, setReadError] = useState(false);
  // An uncertain response retains the exact command. Retrying cannot create a duplicate.
  const [uncertain, setUncertain] = useState<FollowUpCommand | null>(null);
  const writing = useRef(false);
  const url = `/api/admin/solicitudes/${source}/${encodeURIComponent(id)}/seguimiento`;
  async function request(method: 'GET' | 'POST', suffix = '', command?: FollowUpCommand, signal?: AbortSignal) {
    const controller = new AbortController(), abort = () => controller.abort();
    signal?.addEventListener('abort', abort, { once: true });
    if (signal?.aborted) controller.abort();
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      return await Promise.race([
        (async () => {
          const token = await user!.getIdToken();
          if (controller.signal.aborted) throw Error('cancelled');
          const response = await fetch(url + suffix, { method, cache: 'no-store', signal: controller.signal,
            headers: { Authorization: `Bearer ${token}`, ...(method === 'POST' ? { 'Content-Type': 'application/json' } : {}) },
            ...(command ? { body: JSON.stringify(command) } : {}) });
          const data = await response.json();
          return { response, data };
        })(),
        new Promise<never>((_, reject) => { timer = setTimeout(() => { controller.abort(); reject(Error('timeout')); }, 15000); }),
      ]);
    } finally { clearTimeout(timer); signal?.removeEventListener('abort', abort); }
  }
  useEffect(() => {
    if (!user) return;
    const controller = new AbortController();
    void request('GET', '', undefined, controller.signal).then(({ response, data }) => {
      if (controller.signal.aborted) return;
      if (!response.ok) throw Error('read');
      setPage(data); setReadError(false);
    }).catch(() => { if (!controller.signal.aborted) setReadError(true); });
    return () => controller.abort();
    // Identity is also the component key; preserve drafts during parent refreshes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, source, id]);
  async function reload(older = false) {
    setBusy(true); setFeedback(null);
    try {
      const { response, data } = await request('GET', older && page?.nextBefore ? `?before=${page.nextBefore}` : '');
      if (!response.ok) throw Error('read');
      const next = data as FollowUpPage;
      // Older pages must not silently advance the form's revision past unseen newer changes.
      setPage(old => older && old ? { ...old, nextBefore: next.nextBefore, events: [...old.events, ...next.events.filter(event => !old.events.some(saved => saved.id === event.id))] } : next);
      if (!older) setTarget('');
      const changed = older && page && next.revision !== page.revision;
      setReadError(!!changed);
      if (changed) setFeedback({ text: 'Hay gestiones nuevas. Actualizá el historial antes de guardar.', error: true });
    } catch { setReadError(true); }
    finally { setBusy(false); }
  }
  async function save(event: FormEvent) {
    event.preventDefault();
    if (!page || writing.current || !user) return;
    writing.current = true; setBusy(true); setFeedback(null);
    const command = uncertain ?? { commandId: crypto.randomUUID(), expectedRevision: page.revision, action: target && target !== page.state ? 'CHANGE_STATE' : 'ADD_NOTE', note: note.trim(), toState: target && target !== page.state ? target : null } satisfies FollowUpCommand;
    let confirmed = false;
    try {
      const { response, data } = await request('POST', '', command);
      if (!response.ok) {
        if ([400, 401, 403, 404, 409].includes(response.status)) {
          setUncertain(null);
          if (response.status === 409) setReadError(true);
        } else setUncertain(command);
        setFeedback({ text: data.error ?? 'No se pudo confirmar el guardado. Reintentá.', error: true });
        return;
      }
      confirmed = true;
      setUncertain(null); setNote(''); setTarget('');
      setFeedback({ text: 'Guardado en el historial.', error: false });
      const latest = await request('GET');
      if (!latest.response.ok) throw Error('read');
      setPage(latest.data); setReadError(false);
    } catch {
      if (confirmed) { setReadError(true); setFeedback({ text: 'Guardado confirmado. Actualizá el historial para verlo.', error: false }); }
      else { setUncertain(command); setFeedback({ text: 'No pudimos confirmar la respuesta. Reintentá el guardado; conservamos tu nota y su referencia para evitar duplicados.', error: true }); }
    } finally { writing.current = false; setBusy(false); }
  }
  return <section id="solicitud-seguimiento" aria-label="Notas y seguimiento" className="min-w-0 scroll-mt-6 space-y-4 rounded-2xl border border-border-color bg-surface p-5 sm:p-6">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-heading text-lg font-bold text-brand-primary">Notas y seguimiento</h2>{page && <span className="rounded-lg border border-border-color px-3 py-2 text-sm font-semibold">{followUpLabels[page.state]}</span>}</div>
    <p className="text-sm text-text-secondary">Gestión interna del caso. La aprobación, el contrato y la entrega se actualizan desde cada operación vinculada.</p>
    {readError && <div role="alert" className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">No se pudo actualizar el historial. Conservamos tu nota.<button type="button" disabled={busy} onClick={() => void reload()} className={`${control} ml-2 font-semibold`}>Actualizar historial</button></div>}
    {!page && !readError && <p role="status">Consultando historial…</p>}
    {page && <>
      {inactive ? <p className="text-sm text-text-secondary">El historial se conserva. Restaurá la solicitud para continuar su seguimiento.</p> : <form onSubmit={save} className="space-y-3">
        <label className="block text-sm font-semibold" htmlFor="solicitud-nota">Nota interna</label>
        <textarea id="solicitud-nota" value={note} onChange={event => setNote(event.target.value)} required maxLength={2000} rows={3} disabled={busy || !!uncertain} placeholder="Qué revisaste o qué falta hacer…" className={`${control} w-full resize-y`} aria-describedby="solicitud-nota-ayuda" />
        <p id="solicitud-nota-ayuda" className="text-xs text-text-secondary">La fecha y el autor se guardan automáticamente. Si cambiás el seguimiento, esta nota explica el motivo.</p>
        <div className="flex flex-wrap items-end gap-3">
          <label className="min-w-0 flex-1 text-sm font-semibold">Seguimiento <span className="font-normal text-text-secondary">(opcional)</span><select value={target || page.state} onChange={event => setTarget(event.target.value as FollowUpState)} disabled={busy || !!uncertain || readError} className={`${control} mt-1 block w-full`}><option value={page.state}>{followUpLabels[page.state]} · mantener</option>{followUpTransitions[page.state].map(state => <option key={state} value={state}>{followUpLabels[state]}</option>)}</select></label>
          <button type="submit" disabled={busy || !note.trim() || readError && !uncertain} className="btn-primary min-h-11 w-full sm:w-auto">{busy ? 'Un momento…' : uncertain ? 'Reintentar guardado' : 'Guardar nota'}</button>
        </div>
      </form>}
      {feedback && <p role={feedback.error ? 'alert' : 'status'} className={`whitespace-pre-wrap break-words rounded-xl border p-3 text-sm ${feedback.error ? 'border-amber-300 bg-amber-50 text-amber-950' : 'border-emerald-300 bg-emerald-50 text-emerald-950'}`}>{feedback.text}</p>}
      <div className="border-t border-border-color pt-4"><div className="mb-4 flex flex-wrap items-center justify-between gap-2"><h3 className="text-sm font-semibold">Historial del seguimiento</h3><button type="button" onClick={() => void reload()} disabled={busy} className={`${control} font-semibold`}>Actualizar historial</button></div>
        {page.events.length ? <ol className="space-y-5">{page.events.map(event => <li key={event.id} className="min-w-0 border-l-2 border-border-color pl-4"><p className="text-sm font-semibold">{event.action === 'ADD_NOTE' ? 'Nota interna' : `${followUpLabels[event.fromState]} → ${followUpLabels[event.toState]}`}</p><p className="mt-1 break-words text-xs text-text-secondary">{formatFollowUpDate(event.at)} · {event.actor.email} · Registro {event.revision}</p><p className="mt-2 whitespace-pre-wrap break-words text-sm">{event.note}</p></li>)}</ol> : <p className="text-sm text-text-secondary">Todavía no hay notas ni cambios de seguimiento registrados. Agregá una nota para empezar.</p>}
        <p className="mt-4 text-xs text-text-secondary">Los cambios anteriores a este historial se consultan en los hitos y las operaciones vinculadas.</p>
        {page.nextBefore !== null && <button type="button" disabled={busy} onClick={() => void reload(true)} className={`${control} mt-4 w-full font-semibold`}>Ver registros anteriores</button>}
      </div>
    </>}
  </section>;
}
