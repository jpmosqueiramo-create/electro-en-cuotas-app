"use client";
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import type { BudgetV2 } from '@/lib/budgetV2';
import { ALLOWED_MIME_TYPES, DOCUMENT_LABELS, DOCUMENT_TYPES, MAX_ATTACHMENT_SIZE_BYTES, type BudgetAcceptanceV2, type BudgetDocumentationCaseV2, type DocumentType } from '@/lib/budgetAcceptanceV2';

const button = 'min-h-11 rounded-xl border border-border-color bg-surface px-4 py-2 text-sm font-semibold text-brand-primary disabled:opacity-40';
const input = 'min-h-11 w-full min-w-0 rounded-xl border border-border-color bg-surface px-3 py-2';
const money = (n: number) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n);
export function BudgetAcceptanceDocumentation({ budget, documentationOnly=false,onChanged }: { budget: BudgetV2; documentationOnly?:boolean;onChanged?:()=>Promise<void> }) {
  const { user } = useAuth();
  const [acceptance, setAcceptance] = useState<BudgetAcceptanceV2 | null>(null);
  const [documentation, setDocumentation] = useState<BudgetDocumentationCaseV2 | null>(null);
  const [loaded, setLoaded] = useState(false), [error, setError] = useState(''), [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false), [confirm, setConfirm] = useState(false), [manage, setManage] = useState(false);
  const [selected, setSelected] = useState(''), [preferred, setPreferred] = useState('');
  const [notes, setNotes] = useState<Partial<Record<DocumentType, string>>>({});
  const flight = useRef(false), command = useRef<{ key: string; id: string } | null>(null);
  const deleteCommands = useRef(new Map<string, string>());
  const uploadCommands = useRef(new Map<string, string>());
  const base = `/api/admin/presupuestos-v2/${encodeURIComponent(budget.id)}/versions/${budget.version}`;
  const request = useCallback(async (path: string, options: RequestInit = {}) => {
    if (!user) throw new Error('Ingresá nuevamente.');
    const headers = new Headers(options.headers); headers.set('Authorization', `Bearer ${await user.getIdToken()}`);
    const response = await fetch(`${base}/${path}`, { ...options, headers, cache: 'no-store' });
    if (!response.ok) { const data = await response.json(); throw new Error(data.error ?? 'No se pudo completar la operación.'); }
    return response;
  }, [base, user]);
  useEffect(() => {
    let current = true;
    void request('acceptance').then(r => r.json()).then(data => { if (current) { setAcceptance(data.acceptance); setLoaded(true); } }).catch(() => { if (current) setError('No se pudo consultar la aceptación.'); });
    return () => { current = false; };
  }, [request]);
  async function act(work: () => Promise<void>) {
    if (flight.current) return;
    flight.current = true; setBusy(true); setError('');
    try { await work(); } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo completar la operación.'); }
    finally { flight.current = false; setBusy(false); }
  }
  async function reloadDocumentation() { const data = await (await request('documentation')).json(); setDocumentation(data.documentation); await onChanged?.(); }
  async function accept() {
    const payload = { budgetId: budget.id, version: budget.version, acceptedOptionId: selected, preferredPlanCuotas: preferred ? Number(preferred) : null };
    const key = JSON.stringify(payload);
    if (command.current?.key !== key) command.current = { key, id: crypto.randomUUID() };
    const data = await (await request('acceptance', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...payload, commandId: command.current.id }) })).json();
    setAcceptance(data.acceptance); setOpen(false); await reloadDocumentation(); setManage(true);
  }
  async function upload(type: DocumentType, file: File) {
    if (!ALLOWED_MIME_TYPES.includes(file.type as typeof ALLOWED_MIME_TYPES[number]) || file.size > MAX_ATTACHMENT_SIZE_BYTES) throw new Error('Usá JPEG, PNG, WEBP o PDF de hasta 10 MiB.');
    const digest = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', await file.arrayBuffer())), n => n.toString(16).padStart(2, '0')).join('');
    const key = JSON.stringify([type, file.name, file.type, digest]);
    let id = uploadCommands.current.get(key); if (!id) { id = crypto.randomUUID(); uploadCommands.current.set(key, id); }
    const form = new FormData(); form.append('commandId', id); form.append('file', file);
    await request(`documentation/${type}/attachments`, { method: 'POST', body: form }); await reloadDocumentation(); uploadCommands.current.delete(key);
  }
  useEffect(()=>{if(!documentationOnly)return;let active=true;void request('documentation').then(r=>r.json()).then(data=>{if(active){setDocumentation(data.documentation);setManage(true);}}).catch(()=>{if(active)setError('No se pudo consultar la documentación.');});return()=>{active=false;};},[documentationOnly,request]);
  const option = budget.options.find(o => o.optionId === selected);
  return <section data-testid="budget-acceptance" className="min-w-0 space-y-4 rounded-xl border border-border-color p-4">
    <h3 className="font-heading text-lg font-bold">{documentationOnly?'Archivos de esta operación':'Aceptación y documentación'}</h3>
    {error && <p role="alert" className="break-words text-red-700">{error}</p>}
    {!loaded && !error && <p>Consultando aceptación…</p>}
    {!documentationOnly && loaded && !acceptance && <button className={button} disabled={busy} onClick={() => { setOpen(!open); setConfirm(false); }}>Registrar aceptación</button>}
    {open && !acceptance && <fieldset disabled={busy} data-testid="acceptance-panel" className="min-w-0 space-y-4">
      <legend className="font-semibold">Elegir una opción</legend>
      <p className="break-words">Presupuesto {budget.id} · Versión {budget.version} · {budget.clienteSnapshot.nombre}</p>
      {!confirm ? <>
        <div className="grid min-w-0 gap-3 sm:grid-cols-2">{budget.options.map((o, i) => <label key={o.optionId} className="flex min-w-0 cursor-pointer items-start gap-3 rounded-xl border border-border-color p-4">
          <input className="mt-1 size-5 shrink-0" type="radio" name="accepted-option" value={o.optionId} checked={selected === o.optionId} onChange={() => { setSelected(o.optionId); setPreferred(''); }} />
          <span className="min-w-0 space-y-2"><strong className="block">Opción {i + 1} · {o.referenceSnapshot.nombre}</strong>
            {o.referenceSnapshot.imagenUrls[0] && <>{/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={o.referenceSnapshot.imagenUrls[0]} alt="Referencia propuesta" className="size-20 rounded-lg object-contain" /></>}
            <span className="block whitespace-pre-wrap break-words text-sm">{o.referenceSnapshot.descripcion}</span>
            {o.referenceSnapshot.planesOfrecidos.map(p => <span className="block text-sm" key={p.cuotas}>{p.cuotas} cuotas estimadas de {money(p.cuotaEstimada)}</span>)}
          </span>
        </label>)}</div>
        <label className="block space-y-2"><span>Plan preferido informado por el cliente</span><select data-testid="preferred-plan" className={input} value={preferred} disabled={!option || busy} onChange={e => setPreferred(e.target.value)}>
          <option value="">Sin preferencia definida</option>{option?.referenceSnapshot.planesOfrecidos.map(p => <option key={p.cuotas} value={p.cuotas}>{p.cuotas} cuotas — {money(p.cuotaEstimada)}</option>)}
        </select></label>
        <p className="text-sm text-text-secondary">El plan definitivo se confirma al confeccionar el contrato.</p>
        <button className={button} disabled={!option || busy} onClick={() => setConfirm(true)}>Revisar aceptación</button>
      </> : <div data-testid="acceptance-confirm" className="space-y-3 rounded-xl bg-background-main p-4">
        <h4 className="font-semibold">Confirmar aceptación</h4><p>Versión {budget.version} · {budget.clienteSnapshot.nombre}</p><p>Opción elegida: {option?.referenceSnapshot.nombre}</p>
        <p>{preferred ? `Plan preferido: ${preferred} cuotas — ${money(option!.referenceSnapshot.planesOfrecidos.find(p => p.cuotas === Number(preferred))!.cuotaEstimada)}` : 'Sin preferencia definida'}</p>
        <div className="flex flex-wrap gap-2"><button className={button} onClick={() => void act(accept)}>Registrar aceptación</button><button className={button} onClick={() => setConfirm(false)}>Volver a opciones</button></div>
      </div>}
      <button className={button} onClick={() => setOpen(false)}>Cancelar aceptación</button>
    </fieldset>}
    {!documentationOnly && acceptance && <div data-testid="acceptance-registered" className="space-y-2">
      <h4 className="font-semibold">ACEPTACIÓN REGISTRADA</h4><p>Opción aceptada: {acceptance.optionSnapshot.referenceSnapshot.nombre}</p>
      <p>Planes originalmente ofrecidos:</p><ul>{acceptance.optionSnapshot.referenceSnapshot.planesOfrecidos.map(p => <li key={p.cuotas}>{p.cuotas} cuotas estimadas de {money(p.cuotaEstimada)}</li>)}</ul>
      <p>{acceptance.preferredPlanCuotas === null ? 'Sin preferencia definida' : `Plan preferido: ${acceptance.preferredPlanCuotas} cuotas — ${money(acceptance.preferredPlanAmountSnapshot!)}`}</p>
      <Link className={`${button} inline-flex items-center`} href={`/admin/operaciones/${encodeURIComponent(budget.id)}/${budget.version}`}>Abrir ficha de operación</Link>
      <p>Fecha: {new Date(acceptance.acceptedAt).toLocaleString('es-AR')}</p><p>Etapa actual: DOCUMENTACIÓN</p>
      <button className={button} disabled={busy} onClick={() => void act(async () => { await reloadDocumentation(); setManage(!manage); })}>Gestionar documentación</button>
    </div>}
    {manage && documentation && <div data-testid="documentation-panel" className="space-y-4">
      <h4 className="font-heading text-lg font-bold">Documentación privada</h4><p className="text-sm text-text-secondary">{documentationOnly?'Para evaluación: DNI frente, dorso y comprobante de domicilio vigentes. Ingresos opcionales. La carpeta verificada puede reutilizar archivos anteriores.':'La carga conserva el expediente histórico; los requisitos de evaluación se revisan en la Ficha de operación.'} Archivos JPEG, PNG, WEBP o PDF de hasta 10 MiB.</p>
      <div className="grid min-w-0 gap-4 lg:grid-cols-2">{DOCUMENT_TYPES.map(type => { const slot = documentation.slots[type]; return <article key={type} data-document-type={type} className="min-w-0 space-y-3 rounded-xl border border-border-color p-4">
        <div className="flex flex-wrap items-center justify-between gap-2"><h5 className="font-semibold">{DOCUMENT_LABELS[type]}</h5><span className="text-xs font-semibold text-text-secondary">{documentationOnly&&type!=='PAYSLIP'?'PARA EVALUACIÓN':'OPCIONAL'}</span></div>
        <p data-slot-status className="text-sm font-semibold">{slot.status.replaceAll('_', ' ')}</p>
        {slot.observation && <p className="whitespace-pre-wrap break-words text-sm">Observación: {slot.observation}</p>}
        <label className="block space-y-2"><span className="text-sm">Agregar archivo</span><input aria-label={`Agregar archivo ${DOCUMENT_LABELS[type]}`} className={`${input} text-sm`} type="file" accept={ALLOWED_MIME_TYPES.join(',')} disabled={busy} onChange={e => { const file = e.target.files?.[0]; e.currentTarget.value = ''; if (file) void act(() => upload(type, file)); }} /></label>
        {slot.attachments.map(a => <div key={a.attachmentId} className="min-w-0 space-y-2 border-t border-border-color pt-3"><p className="break-all text-sm">{a.originalName}</p><div className="flex flex-wrap gap-2">
          <button className={button} disabled={busy} onClick={() => void act(async () => {
            const response = await request(`documentation/${type}/attachments/${a.attachmentId}`); const url = URL.createObjectURL(await response.blob());
            const link = document.createElement('a'); link.href = url; link.download = a.originalName; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
          })}>Descargar</button>
          <button className={button} disabled={busy} onClick={() => { if (window.confirm('¿Eliminar este archivo? Se conservará el evento de auditoría.')) void act(async () => { const key = `${type}:${a.attachmentId}`; let commandId = deleteCommands.current.get(key); if (!commandId) { commandId = crypto.randomUUID(); deleteCommands.current.set(key, commandId); }
            await request(`documentation/${type}/attachments/${a.attachmentId}`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ commandId }) }); await reloadDocumentation(); deleteCommands.current.delete(key); }); }}>Eliminar</button>
        </div></div>)}
        {!!slot.attachments.length && <div className="space-y-2"><label className="block space-y-2"><span className="text-sm">Observación administrativa</span><textarea className={input} maxLength={1000} value={notes[type] ?? ''} onChange={e => setNotes({ ...notes, [type]: e.target.value })} /></label>
          <button className={button} disabled={busy || !notes[type]?.trim()} onClick={() => void act(async () => { await request(`documentation/${type}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ observation: notes[type] }) }); await reloadDocumentation(); })}>Marcar observado</button>
        </div>}
      </article>; })}</div>
    </div>}
  </section>;
}
