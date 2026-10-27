'use client';
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { useAuth } from '@/components/AuthProvider';
interface Contact { id: string; kind: string; note: string; promisedDate: string | null; nextContactDate?: string | null; at?: string | null; recordedByMe?: boolean }
const control = 'admin-control min-h-11 w-full min-w-0 rounded-xl border border-border-color bg-surface p-3 text-text-primary';
const date = (value?: string | null) => value ? value.split('-').reverse().join('/') : '';
export function OperationContactPanel({ budgetId, version, role = 'AFFILIATE' }: { budgetId: string; version: number; role?: 'ADMIN' | 'AFFILIATE' }) {
  const { user } = useAuth();
  return <ContactSession key={`${user?.uid}-${budgetId}-${version}-${role}`} budgetId={budgetId} version={version} role={role} />;
}
function ContactSession({ budgetId, version, role }: { budgetId: string; version: number; role: 'ADMIN' | 'AFFILIATE' }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false), [records, setRecords] = useState<Contact[] | null>(null), [truncated, setTruncated] = useState(false);
  const [error, setError] = useState(''), [message, setMessage] = useState(''), [busy, setBusy] = useState(false);
  const pending = useRef<{ body: string; id: string } | null>(null), flight = useRef(false), readSequence = useRef(0);
  const url = role === 'ADMIN' ? `/api/admin/presupuestos-v2/${encodeURIComponent(budgetId)}/versions/${version}/gestiones` : `/api/afiliado/operaciones-v2/${encodeURIComponent(budgetId)}/${version}/gestiones`;
  const reload = useCallback(async () => {
    if (!user) return;
    const sequence = ++readSequence.current;
    try {
      const response = await fetch(url, { cache: 'no-store', headers: { Authorization: `Bearer ${await user.getIdToken()}` } });
      if (!response.ok) throw Error();
      const data = await response.json();
      if (sequence !== readSequence.current) return;
      setRecords(data.records); setTruncated(data.historyTruncated); setError('');
    } catch { if (sequence === readSequence.current) { setRecords(null); setError('No se pudo consultar el registro de contactos. Actualizá para reintentar.'); } }
  }, [url, user]);
  const invalidate = useCallback(() => { ++readSequence.current; }, []);
  useEffect(() => {
    if (!open) return;
    const refresh = () => { if (!document.hidden) void reload(); };
    void reload(); const timer = window.setInterval(refresh, 60000);
    window.addEventListener('focus', refresh); window.addEventListener('online', refresh);
    return () => { invalidate(); clearInterval(timer); window.removeEventListener('focus', refresh); window.removeEventListener('online', refresh); };
  }, [open, reload, invalidate]);
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!user || flight.current) return;
    const form = event.currentTarget, data = new FormData(form), promised = String(data.get('promisedDate') || ''), next = String(data.get('nextContactDate') || '');
    const payload = { kind: promised ? 'PROMISE' : 'CONTACT', note: String(data.get('note')), ...(promised ? { promisedDate: promised } : {}), ...(next ? { nextContactDate: next } : {}) }, body = JSON.stringify(payload);
    if (pending.current?.body !== body) pending.current = { body, id: crypto.randomUUID() };
    flight.current = true; setBusy(true); setError(''); setMessage('');
    try {
      const response = await fetch(url, { method: 'POST', headers: { Authorization: `Bearer ${await user.getIdToken()}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ ...payload, commandId: pending.current.id }) });
      if (!response.ok) throw Error();
      pending.current = null; form.reset(); setMessage('Contacto guardado. La promesa no modifica cuotas ni acredita pagos.'); await reload();
    } catch { setError('No se confirmó el contacto. Verificá tu acceso y reintentá; se conserva el identificador para evitar duplicados.'); }
    finally { flight.current = false; setBusy(false); }
  }
  return <details data-testid="operation-contacts" open={open} onToggle={e => setOpen(e.currentTarget.open)} className="min-w-0 rounded-xl border border-border-color bg-surface p-3 text-text-primary">
    <summary className="admin-control min-h-11 cursor-pointer py-2 font-semibold text-brand-primary">Contactos y promesas de pago</summary>
    <div className="space-y-4 pt-3"><p className="text-sm text-text-secondary">Registrá lo conversado con el cliente. Administración y el vendedor afiliado asignado comparten este historial.</p>
      <form onSubmit={save} className="grid min-w-0 gap-3">
        <label className="min-w-0 space-y-1"><span className="font-semibold">Comentario del contacto</span><textarea name="note" required maxLength={1000} rows={3} placeholder="Ej.: avisa que se atrasará y pagará el viernes." className={control} /></label>
        <div className="grid min-w-0 gap-3 sm:grid-cols-2"><label className="min-w-0 space-y-1"><span>Fecha prometida de pago (opcional)</span><input type="date" name="promisedDate" className={control} /></label><label className="min-w-0 space-y-1"><span>Próximo contacto (opcional)</span><input type="date" name="nextContactDate" className={control} /></label></div>
        <button type="submit" disabled={busy || !user} className="admin-control min-h-11 rounded-xl bg-brand-primary px-4 py-2 font-semibold text-white disabled:opacity-50">{busy ? 'Guardando contacto…' : 'Guardar contacto'}</button>
      </form>
      {message && <p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-900">{message}</p>}{error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-900">{error}</p>}
      <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-semibold">Historial de contactos</h3><button type="button" disabled={busy} className="admin-control min-h-11 px-2 text-sm font-semibold text-brand-primary underline" onClick={() => void reload()}>Actualizar contactos</button></div>
      {records === null && !error && <p role="status">Consultando contactos…</p>}{records?.length === 0 && <p className="text-sm text-text-secondary">Todavía no hay contactos registrados.</p>}
      {truncated && <p className="text-sm text-text-secondary">Se muestran los últimos 30 contactos. Los anteriores permanecen guardados.</p>}
      <ol className="space-y-3">{records?.map(record => <li key={record.id} data-testid="contact-record" className="min-w-0 space-y-2 rounded-xl border border-border-color bg-background-main p-3"><p className="text-xs text-text-secondary">{record.at ? new Date(record.at).toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', dateStyle: 'short', timeStyle: 'short' }) : 'Fecha no registrada'} · {record.recordedByMe ? 'Registrado por vos' : 'Contacto del equipo'}</p><p className="whitespace-pre-wrap break-words text-sm">{record.note}</p>{record.promisedDate && <p className="text-sm font-semibold text-brand-primary">Prometió pagar: {date(record.promisedDate)}</p>}{record.nextContactDate && <p className="text-sm">Próximo contacto: {date(record.nextContactDate)}</p>}</li>)}</ol>
    </div>
  </details>;
}
