'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { argentinaBusinessDate } from '@/lib/productionV2/businessDate';
import { paymentAmountCents, paymentReportLabels, type PaymentReportPublic } from '@/lib/operationPaymentReports';

type Role = 'ADMIN' | 'AFFILIATE' | 'CLIENT';
type CreditedPayment = { id: string; amountCents: number; method: string; effectiveDate: string; reference: string };
type View = { operationId: string; reports: PaymentReportPublic[]; affiliateAvailable: boolean; cashHeldCents: number | null; nextCursor: string | null; paymentsNextCursor?:string|null; financialRevision?: number; canConfirm?: boolean; recentPayments?: CreditedPayment[] };
const money = (n: number) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(n / 100);
const date = (s: string) => s.slice(0, 10).split('-').reverse().join('/');
const control = 'admin-control min-h-11 w-full min-w-0 rounded-xl border border-border-color bg-surface px-3 py-2 text-text-primary [color-scheme:light]';
const button = 'admin-control min-h-11 rounded-xl border border-border-color bg-surface px-4 py-2 font-semibold text-brand-primary disabled:opacity-50';
type Props = { budgetId: string; version: number; role: Role; locked?:boolean; onBusyChange?: (busy: boolean) => void };

export function PaymentReportsPanel(props: Props) {
  const { user } = useAuth();
  return <ReportsSession key={`${user?.uid}-${props.budgetId}-${props.version}-${props.role}`} {...props} />;
}
function ReportsSession({ budgetId, version, role, locked=false, onBusyChange }: Props) {
  const { user } = useAuth();
  const [view, setView] = useState<View | null>(null), [error, setError] = useState(''), [message, setMessage] = useState(''), [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false), [method, setMethod] = useState(role === 'AFFILIATE' ? 'EFECTIVO' : 'TRANSFERENCIA');
  const [retry, setRetry] = useState(false);
  const flight = useRef(false), attempt = useRef<string | null>(null), sequence = useRef(0);
  const base = role === 'ADMIN' ? `/api/admin/presupuestos-v2/${encodeURIComponent(budgetId)}/versions/${version}` : `/api/${role === 'CLIENT' ? 'cliente/servicios-v2' : 'afiliado/operaciones-v2'}/${encodeURIComponent(budgetId)}/${version}`;
  const url = base + '/payment-reports';
  useEffect(() => { onBusyChange?.(busy || retry); return () => onBusyChange?.(false); }, [busy, retry, onBusyChange]);
  const load = useCallback(async (cursor?: string) => {
    if (!user || flight.current) return;
    const seq = ++sequence.current;
    try {
      const r = await fetch(url + (cursor ? '?cursor=' + encodeURIComponent(cursor) : ''), { cache: 'no-store', headers: { Authorization: `Bearer ${await user.getIdToken()}` } });
      const next: View = await r.json(); if (!r.ok) throw Error();
      if (seq !== sequence.current) return;
      setView(old => ({ ...next, reports: cursor && old ? [...old.reports.filter(p => !next.reports.some(n => n.id === p.id)), ...next.reports] : next.reports })); setError('');
    } catch { if (seq === sequence.current) { setView(null); setError('No se pudieron verificar los informes. Actualizá antes de continuar.'); } }
  }, [user, url]);
  const invalidate=useCallback(()=>{++sequence.current;},[]);
  useEffect(() => {
    void load(); const refresh = () => { if (!document.hidden) void load(); };
    const timer = window.setInterval(refresh, 30000);
    window.addEventListener('focus', refresh); window.addEventListener('online', refresh); window.addEventListener('operation-financial-updated', refresh);
    return () => { invalidate(); clearInterval(timer); window.removeEventListener('focus', refresh); window.removeEventListener('online', refresh); window.removeEventListener('operation-financial-updated', refresh); };
  }, [load,invalidate]);
  async function send(payload?: Record<string, unknown>) {
    if (!user || flight.current || locked) return;
    if (!attempt.current) { if (!payload) return; attempt.current = JSON.stringify({ ...payload, commandId: crypto.randomUUID() }); }
    flight.current = true; ++sequence.current; setBusy(true); setError(''); setMessage('');
    try {
      const r = await fetch(url, { method: 'POST', headers: { Authorization: `Bearer ${await user.getIdToken()}`, 'Content-Type': 'application/json' }, body: attempt.current, signal: AbortSignal.timeout(30000) });
      const result = await r.json();
      if (!r.ok) { if (r.status >= 400 && r.status < 500) { attempt.current = null; setRetry(false); } throw Error(result.error || 'No se confirmó el cambio.'); }
      attempt.current = null; setRetry(false); setOpen(false);
      setMessage(role === 'ADMIN' ? 'Decisión guardada. Consultá el estado actualizado del informe.' : 'Pago informado. Queda pendiente de acreditación hasta que Administración lo confirme.');
      flight.current = false; await load(); window.dispatchEvent(new CustomEvent('operation-financial-updated', { detail: { budgetId, version } }));
    } catch (e) { setRetry(!!attempt.current); setError(e instanceof Error ? e.message : 'No se recibió la confirmación. Reintentá el mismo envío.'); }
    finally { flight.current = false; setBusy(false); }
  }
  async function morePayments(){
    if(!user||!view?.paymentsNextCursor||flight.current)return;
    flight.current=true;setBusy(true);++sequence.current;
    try{const response=await fetch(base+'/financial?cursor='+encodeURIComponent(view.paymentsNextCursor),{cache:'no-store',headers:{Authorization:`Bearer ${await user.getIdToken()}`}});const next=await response.json();if(!response.ok||!next.active||next.revision!==view.financialRevision)throw Error();setView({...view,recentPayments:[...(view.recentPayments||[]),...next.history.filter((p: {reversedAt:string|null})=>!p.reversedAt)],paymentsNextCursor:next.nextCursor});}
    catch{setError('El historial cambió o no pudo consultarse. Actualizá los informes antes de decidir.');}
    finally{flight.current=false;setBusy(false);}
  }
  return <section data-testid="payment-reports" aria-busy={busy} className="min-w-0 space-y-4 rounded-2xl border border-border-color bg-background-main p-4 text-text-primary">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="text-lg font-bold">{role === 'ADMIN' ? 'Pagos informados para revisar' : 'Pagos informados'}</h3><p className="max-w-2xl text-sm text-text-secondary">El informe queda pendiente hasta la confirmación de Administración. Los saldos y recibos incluyen sólo pagos acreditados.</p></div><button type="button" className={button} disabled={busy || retry || locked} onClick={() => void load()}>Actualizar informes</button></div>
    {role === 'AFFILIATE' && view?.cashHeldCents !== null && view?.cashHeldCents !== undefined && <p className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-amber-950"><strong>Efectivo confirmado pendiente de rendición: {money(view.cashHeldCents)}</strong><span className="mt-1 block text-sm">Total de tu cuenta. Las cuotas correspondientes ya están acreditadas. La entrega a Administración se registra por separado en Rendiciones.</span></p>}
    {message && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-emerald-950">{message}</p>}
    {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-red-900">{error}</p>}
    {retry && <div className="space-y-2"><p className="text-sm">No se recibió una respuesta definitiva. Reintentá este envío para consultar su resultado sin duplicarlo.</p><button type="button" className={button} disabled={busy||locked} onClick={() => void send()}>Reintentar el mismo envío</button></div>}
    {!view && !error && <p role="status">Consultando informes…</p>}
    {view && role !== 'ADMIN' && <><button type="button" className={button} disabled={busy || retry || locked} aria-expanded={open} onClick={() => setOpen(!open)}>{open ? 'Cerrar formulario' : 'Informar un pago'}</button>{open && <form data-testid="report-payment-form" onSubmit={e => {
      e.preventDefault(); if (busy || retry || locked) return;
      try { const f = new FormData(e.currentTarget); void send({ operationId: view.operationId, amountCents: paymentAmountCents(String(f.get('amount'))), effectiveDate: String(f.get('date')), method, reference: String(f.get('reference')), cashRecipient: method === 'TRANSFERENCIA' ? null : role === 'AFFILIATE' ? 'AFFILIATE' : String(f.get('cashRecipient')) }); }
      catch (e) { setError(e instanceof Error ? e.message : 'Revisá el importe.'); }
    }}><fieldset disabled={busy || retry || locked} className="grid min-w-0 gap-3 sm:grid-cols-2">
      <label>Importe pagado en pesos<input name="amount" inputMode="decimal" required className={control} placeholder="Ej.: 12500,50" /></label>
      <label>Fecha del pago<input name="date" type="date" required defaultValue={argentinaBusinessDate()} max={argentinaBusinessDate()} className={control} /></label>
      <label>Medio de pago<select value={method} onChange={e => setMethod(e.target.value)} className={control}><option value="TRANSFERENCIA">Transferencia a Administración</option><option value="EFECTIVO">Efectivo</option></select></label>
      <label>{method === 'TRANSFERENCIA' ? 'Referencia de la transferencia' : 'Referencia del cobro'}<input name="reference" required maxLength={200} className={control} /></label>
      {method === 'EFECTIVO' && (role === 'AFFILIATE' ? <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-950 sm:col-span-2">Informás efectivo recibido por vos. Después de confirmarlo, Administración acredita al cliente y el dinero queda pendiente de tu rendición.</p> : <label className="sm:col-span-2">¿A quién le entregaste el efectivo?<select name="cashRecipient" className={control} required><option value="ADMIN">Administración</option>{view.affiliateAvailable && <option value="AFFILIATE">Mi vendedor afiliado</option>}</select></label>)}
      <button className={button + ' sm:col-span-2'}>{busy ? 'Enviando informe…' : 'Enviar pago para confirmar'}</button>
    </fieldset></form>}</>}
    {view && <><p className="text-sm text-text-secondary">{view.reports.length} informes consultados{view.nextCursor ? ' · Historial parcial: hay más informes.' : '.'}</p>{!view.reports.length && <p>No hay pagos informados en esta operación.</p>}<div className="space-y-3">{view.reports.toSorted((a, b) => b.createdAt.localeCompare(a.createdAt)).map(r => <article key={r.id} data-testid="payment-report" className="min-w-0 space-y-2 rounded-xl border border-border-color bg-surface p-3">
      <div className="flex flex-wrap items-center justify-between gap-2"><strong className="text-xl tabular-nums">{money(r.amountCents)}</strong><span className={`rounded-lg px-3 py-1 text-sm font-semibold ${r.status === 'PENDING' ? 'bg-amber-100 text-amber-950' : r.status === 'CONFIRMED' || r.status === 'LINKED' ? 'bg-emerald-100 text-emerald-950' : 'bg-red-50 text-red-900'}`}>{paymentReportLabels[r.status]}</span></div>
      <p className="text-sm">{date(r.effectiveDate)} · {r.method === 'EFECTIVO' ? 'Efectivo' : 'Transferencia'} · Informó: {r.reportedBy === 'AFFILIATE' ? 'vendedor afiliado' : 'cliente'}</p>
      <p className="text-xs text-text-secondary">Informe del {date(r.createdAt)}{r.decidedAt?` · Revisado por Administración el ${date(r.decidedAt)}`:''}</p>
      {r.reference && <p className="break-words text-sm">Referencia informada: {r.reference}</p>}
      {r.cashRecipient === 'AFFILIATE' && role !== 'CLIENT' && <p className="text-sm">Efectivo recibido por el vendedor afiliado. {r.status === 'PENDING' ? 'Todavía no acreditado.' : 'Consultá Rendiciones para controlar su entrega a Administración.'}</p>}
      {r.decisionNote && <p className="break-words text-sm">Observación: {r.decisionNote}</p>}
      {role === 'ADMIN' && r.status === 'PENDING' && <ReportDecision key={`${r.id}-${r.revision}`} report={r} view={view} disabled={busy || retry || locked} onDecide={send} onMorePayments={morePayments} />}
    </article>)}</div>{view.nextCursor && <button type="button" className={button} disabled={busy || retry || locked} onClick={() => void load(view.nextCursor!)}>Ver más informes</button>}</>}
  </section>;
}
function ReportDecision({ report: r, view, disabled, onDecide, onMorePayments }: { onMorePayments:()=>Promise<void>; report: PaymentReportPublic; view: View; disabled: boolean; onDecide: (p: Record<string, unknown>) => Promise<void> }) {
  const [action, setAction] = useState(''),[financialRevision,setFinancialRevision]=useState(view.financialRevision);
  function choose(next:string){setFinancialRevision(view.financialRevision);setAction(action===next?'':next);}
  const matches = (view.recentPayments || []).filter(p => p.amountCents === r.amountCents && p.method === r.method);
  return <div className="space-y-3 border-t border-border-color pt-3"><div className="flex flex-wrap gap-2">
    <button type="button" className={button} disabled={disabled || !view.canConfirm} aria-expanded={action === 'CONFIRM'} onClick={() => choose('CONFIRM')}>Revisar y acreditar</button>
    <button type="button" className={button} disabled={disabled} aria-expanded={action === 'LINK'} onClick={() => choose('LINK')}>Ya estaba acreditado</button>
    <button type="button" className={button} disabled={disabled} aria-expanded={action === 'REJECT'} onClick={() => choose('REJECT')}>Rechazar informe</button>
  </div>{!view.canConfirm && <p className="text-sm">La acreditación requiere la habilitación y los documentos emitidos de esta operación.</p>}
    {action && <form onSubmit={e => { e.preventDefault(); if (disabled) return; const f = new FormData(e.currentTarget); void onDecide({ action, reportId: r.id, expectedRevision: r.revision, ...(action === 'CONFIRM' ? { financialRevision, reference: String(f.get('reference')) } : action === 'LINK' ? { paymentId: String(f.get('paymentId')), note: 'Aviso vinculado a un pago ya acreditado, sin nuevo movimiento.' } : { note: String(f.get('note')) }) }); }}><fieldset disabled={disabled} className="space-y-3">
      {action === 'CONFIRM' ? <><p className="text-sm">Se acreditarán <strong>{money(r.amountCents)}</strong> del {date(r.effectiveDate)}. {r.cashRecipient === 'AFFILIATE' ? 'El efectivo quedará a cargo del vendedor afiliado, pendiente de rendición.' : 'Confirmá que recibiste el pago en Administración.'}</p><label className="block">{r.method === 'TRANSFERENCIA' ? 'Identificador único de la operación bancaria' : 'Referencia verificada del cobro'}<input name="reference" required maxLength={200} defaultValue={r.reference || ''} className={control} /></label></> : action === 'LINK' ? <><p className="text-sm">Elegí el pago que ya registraste. Este aviso no sumará dinero ni volverá a acreditar cuotas.</p><label className="block">Pago ya acreditado<select name="paymentId" required className={control} defaultValue=""><option value="" disabled>Elegí el pago con el mismo importe y medio</option>{matches.map(p => <option value={p.id} key={p.id}>{date(p.effectiveDate)} · {money(p.amountCents)} · {p.reference}</option>)}</select></label>{view.paymentsNextCursor&&<button type="button" className={button} onClick={()=>void onMorePayments()}>Consultar más pagos acreditados</button>}{!matches.length && <p className="text-sm">No hay coincidencias entre los pagos consultados. Revisá el historial antes de decidir.</p>}</> : <label className="block">Motivo para el cliente y el vendedor afiliado<input name="note" required maxLength={500} className={control} /></label>}
      <button className={button} disabled={disabled || action === 'LINK' && !matches.length}>{action === 'CONFIRM' ? 'Confirmar y acreditar pago' : action === 'LINK' ? 'Vincular sin volver a acreditar' : 'Confirmar rechazo'}</button>
    </fieldset></form>}
  </div>;
}
