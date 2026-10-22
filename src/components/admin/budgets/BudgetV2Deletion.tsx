'use client';
import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import type { BudgetV2 } from '@/lib/budgetV2';
import type { TestDossierPreview } from '@/lib/budgetTestDossierDeletion';
import type { BudgetDeletionPreview } from '@/lib/budgetV2Deletion';
const button = 'min-h-11 rounded-xl border border-border-color bg-surface px-4 py-2 text-sm font-semibold text-brand-primary disabled:opacity-40';
export function BudgetV2Deletion({budget, onClose, onDeleted}: {budget: BudgetV2; onClose: () => void; onDeleted: () => Promise<void>}) {
  const {user} = useAuth();
  const [preview, setPreview] = useState<BudgetDeletionPreview | null>(null), [confirmed, setConfirmed] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const [testMode,setTestMode]=useState(false),[declared,setDeclared]=useState(false),[reason,setReason]=useState('');
  const pending = useRef<string | null>(null), flight = useRef(false), close = useRef<HTMLButtonElement>(null);
  async function request(body: unknown) {
    if (!user) throw Error('Ingresá nuevamente.');
    const response = await fetch('/api/admin/presupuestos-v2/eliminacion', {method: 'POST', cache: 'no-store', headers: {'Content-Type': 'application/json', Authorization: `Bearer ${await user.getIdToken()}`}, body: typeof body === 'string' ? body : JSON.stringify(body)});
    const data = await response.json();
    if (!response.ok) throw Error(data.error ?? 'No se pudo completar la operación.');
    return data;
  }
  useEffect(() => { close.current?.focus(); }, []);
  async function verify() {
    if (flight.current) return;
    flight.current = true; setBusy(true); setError(''); setConfirmed(false); setDeclared(false); setPreview(null); pending.current = null;
    try { setPreview((await request({mode: testMode ? 'PREVIEW_TEST' : 'PREVIEW', budgetId: budget.id})).preview); }
    catch (e) { setError((e as Error).message); }
    finally { flight.current = false; setBusy(false); }
  }
  async function remove() {
    if (!preview?.allowed || !confirmed || testMode&&(!declared||!reason.trim()) || flight.current) return;
    flight.current = true; setBusy(true); setError('');
    pending.current ??= JSON.stringify({mode: testMode ? 'DELETE_TEST' : 'DELETE', ...(testMode?{testDeclaration:'SYNTHETIC_ONLY_NO_REAL_ACTIVITY',reason:reason.trim()}:{}), budgetId: budget.id, commandId: crypto.randomUUID(), fingerprint: preview.fingerprint, confirm: true});
    try { await request(pending.current); await onDeleted(); }
    catch (e) { setError((e as Error).message); }
    finally { flight.current = false; setBusy(false); }
  }
  return <section role="dialog" aria-modal="true" aria-labelledby="budget-delete-title" data-testid="budget-delete-dialog" className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3" onKeyDown={e => { if (e.key === 'Escape' && !busy) onClose(); if (e.key === 'Tab') { const elements = [...e.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),textarea:not(:disabled),summary')]; const first=elements[0], last=elements.at(-1); if (e.shiftKey && document.activeElement === first) {e.preventDefault();last?.focus();} else if (!e.shiftKey && document.activeElement === last) {e.preventDefault();first?.focus();} } }}>
    <div className="max-h-[90dvh] w-full max-w-2xl space-y-4 overflow-y-auto rounded-2xl border border-border-color bg-surface p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3"><h2 id="budget-delete-title" className="text-xl font-bold">{testMode?'Eliminar expediente de prueba':'Eliminar presupuesto'}</h2><button ref={close} className={button} disabled={busy} onClick={onClose}>Cancelar</button></div>
      <p className="font-semibold">{budget.clienteSnapshot.nombre}</p><p>{budget.options.map(o => o.referenceSnapshot.nombre).join(' · ')}</p><p className="break-all text-sm">Presupuesto {budget.id} · Versión consultada {budget.version}</p>
      <p>Se eliminará la familia completa, {testMode?'incluidos los registros técnicos expresamente identificados en el manifiesto.':'incluidas todas sus versiones y comandos propios.'} La solicitud de origen y los archivos se conservarán. Esta acción no se puede deshacer.</p>
      <button className={button} disabled={busy} onClick={()=>{setTestMode(!testMode);setPreview(null);setConfirmed(false);setDeclared(false);setReason('');setError('');pending.current=null;}}>{testMode?'Volver a eliminación de presupuesto':'Eliminar expediente de prueba'}</button>
      {testMode&&<p className="rounded-xl border border-border-color p-3">Sólo para expedientes íntegramente ficticios. Se incluirán la aceptación y los registros técnicos compatibles. Se bloquearán documentos, firmas, pagos, entregas, movimientos físicos y relaciones no verificables. La auditoría permanecerá.</p>}
      {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-red-800">{error}</p>}
      <button className={button} disabled={busy} onClick={() => void verify()}>{busy ? 'Procesando…' : 'Verificar dependencias'}</button>
      {preview && <div data-testid="budget-delete-preview" className="space-y-3">
        {testMode&&<><p>Declaración administrativa de prueba requerida; el nombre del presupuesto no acredita su origen.</p><details><summary className="min-h-11 cursor-pointer py-2">Registros que se conservarán</summary><ul className="break-all text-sm">{(preview as TestDossierPreview).preservedPaths.map(path=><li key={path}>{path}</li>)}</ul></details></>}
        <p>Versiones: {preview.versions.join(', ')} · Registros identificados: {preview.paths.length}</p><p className="break-all text-sm">Se conserva: {preview.preservedSource}</p>
        {!preview.allowed ? <><p role="alert">No se puede eliminar: tiene registros relacionados o una estructura que requiere revisión. No se borrará ningún registro.</p><ul className="list-inside list-disc break-all text-sm">{preview.blockers.map(path => <li key={path}>{path}</li>)}</ul></> : <><details><summary className="min-h-11 cursor-pointer py-2">Ver registros que se eliminarán</summary><ul className="break-all text-sm">{preview.paths.map(path => <li key={path}>{path}</li>)}</ul></details>{testMode&&<><label className="flex min-h-11 items-start gap-3"><input data-testid="test-declaration" type="checkbox" checked={declared} disabled={busy} onChange={e=>{setDeclared(e.target.checked);pending.current=null;}}/>Verifiqué que todo el expediente es una prueba, sin actividad real ni compromiso comercial.</label><label className="block">Motivo de la limpieza<textarea data-testid="test-reason" className="mt-2 w-full rounded-xl border border-border-color p-3" maxLength={500} value={reason} disabled={busy} onChange={e=>{setReason(e.target.value);setConfirmed(false);pending.current=null;}}/></label></>}<label className="flex min-h-11 items-start gap-3"><input type="checkbox" disabled={busy} checked={confirmed} onChange={e => setConfirmed(e.target.checked)} className="mt-1"/>Confirmo eliminar todas las versiones de este presupuesto.</label><button data-testid="confirm-budget-delete" className={button} disabled={busy || !confirmed || testMode&&(!declared||!reason.trim())} onClick={() => void remove()}>{testMode?'Eliminar expediente de prueba':'Eliminar familia completa'}</button></>}
      </div>}
    </div>
  </section>;
}
