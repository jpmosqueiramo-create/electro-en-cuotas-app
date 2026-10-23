'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import type { ProductionOverview } from '@/lib/productionV2/overview';
import { btn, control } from './ContractDataFields';
const names: Record<string, string> = { ISSUANCE: 'Emitir mandato, pagaré y remito', DELIVERY: 'Registrar firmas, originales y entrega', FINANCE: 'Activar cuotas y registrar pagos o reversas', CLIENT_ACTIVATION: 'Invitar al cliente vinculado después de la entrega' };
export function ProductionOperationWorkspace({ budgetId, version, revision, onChanged }: {
    budgetId: string;
    version: number;
    revision: number;
    onChanged?: () => Promise<void>;
}) {
    const { user } = useAuth();
    return <ProductionSession key={`${user?.uid}:${budgetId}:${version}`} budgetId={budgetId} version={version} revision={revision} onChanged={onChanged}/>;
}
function ProductionSession({ budgetId, version, revision, onChanged }: {
    budgetId: string;
    version: number;
    revision: number;
    onChanged?: () => Promise<void>;
}) {
    const { user } = useAuth(), [view, setView] = useState<ProductionOverview | null>(null), [error, setError] = useState(''), [busy, setBusy] = useState(false), [confirmed, setConfirmed] = useState(false), [selected, setSelected] = useState('');
    const flight = useRef(false), sequence = useRef(0), pending = useRef<{
        key: string;
        commandId: string;
    } | null>(null), url = `/api/admin/presupuestos-v2/${encodeURIComponent(budgetId)}/versions/${version}/production`;
    const load = useCallback(async () => { if (!user)
        return; const seq = ++sequence.current; try {
        const r = await fetch(url, { headers: { Authorization: `Bearer ${await user.getIdToken()}` }, cache: 'no-store' });
        const next = await r.json();
        if (!r.ok)
            throw Error(next.error);
        if (seq === sequence.current) {
            setView(next);
            setError('');
        }
    }
    catch (e) {
        if (seq === sequence.current) {
            setView(null);
            setError(e instanceof Error ? e.message : 'No se pudo verificar el estado.');
        }
    } }, [url, user]);
    const invalidate = useCallback(() => { ++sequence.current; }, []);
    useEffect(() => { void load(); return invalidate; }, [load, revision, invalidate]);
    async function command(action: string, data: Record<string, unknown>, idempotent = true) { if (!user || flight.current)
        return; flight.current = true; setBusy(true); sequence.current++; setError(''); try {
        const key = JSON.stringify({ action, data });
        if (pending.current?.key !== key)
            pending.current = { key, commandId: crypto.randomUUID() };
        const r = await fetch(url, { method: 'POST', headers: { Authorization: `Bearer ${await user.getIdToken()}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ action, data: { ...data, ...(idempotent ? { commandId: pending.current.commandId } : {}) } }) });
        const response = await r.json();
        if (!r.ok)
            throw Error(response.error);
        pending.current = null;
        setConfirmed(false);
        await load();
        await onChanged?.();
    }
    catch (e) {
        setError(e instanceof Error ? e.message : 'No se confirmó la operación.');
    }
    finally {
        flight.current = false;
        setBusy(false);
    } }
    async function document(kind: string) { if (!user)
        return; const popup = window.open('about:blank', '_blank'); try {
        const r = await fetch(`${url}?document=${kind}`, { headers: { Authorization: `Bearer ${await user.getIdToken()}` }, cache: 'no-store' });
        if (!r.ok)
            throw Error();
        const href = URL.createObjectURL(await r.blob());
        if (popup)
            popup.location.href = href;
        setTimeout(() => URL.revokeObjectURL(href), 60000);
    }
    catch {
        popup?.close();
        setError('No se pudo recuperar el documento privado emitido.');
    } }
    const enabled = !!view?.administratorAuthorized && view.deploymentEnabled, canAuthorize = enabled && view?.readyValid && view.counterReady && view.approvals.length > 0;
    return <section data-testid="production-operation" className="min-w-0 space-y-3 rounded-xl border border-border-color bg-surface p-4"><h2 className="font-heading text-xl font-bold">Autorización y documentos de la operación</h2><p className="text-sm">La emisión requiere textos finales aprobados y autorización explícita de esta operación. Las firmas, la entrega y la activación de cuotas se verifican por separado. ARCA permanece deshabilitada.</p>{error && <p role="alert">{error}</p>}<button type="button" className={btn} disabled={busy} onClick={() => void load()}>Actualizar habilitación</button>{view && <>{view.test && <p className="font-bold text-amber-600">PRUEBA LOCAL — SIN EFECTOS REALES</p>}<ul className="space-y-2" role="status">{view.blockers.map(b => <li key={b}>{b}</li>)}</ul>
 {view.frozen ? <><p>Términos congelados: {view.frozen.contractNumber}. No se permite editar ni emitir otra versión del mismo instrumento.</p>{view.issued ? <div className="flex flex-wrap gap-2">{view.issued.documents.map(d => <button className={btn} key={d.kind} onClick={() => void document(d.kind)}>Abrir {({ MANDATE: 'mandato', PAGARE: 'pagaré', REMITO: 'remito' } as Record<string, string>)[d.kind]} emitido</button>)}</div> : <><label className="flex gap-2"><input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)}/>Confirmo la emisión del paquete aprobado para esta operación. Una interrupción recuperará los mismos documentos.</label><button className={btn} disabled={busy || !enabled || !confirmed} onClick={() => void command('ISSUE_DOCUMENTS', { confirmed: true }, false)}>Emitir o recuperar documentos autorizados</button></>}</> : <>
 <details><summary className="cursor-pointer font-semibold">Autorizar una operación real</summary><form className="mt-3 grid min-w-0 gap-3 sm:grid-cols-2" onChange={() => setConfirmed(false)} onSubmit={e => { e.preventDefault(); if (!view || !confirmed)
                return; const f = new FormData(e.currentTarget), approval = view.approvals.find(a => a.id === f.get('approval')); if (!approval)
                return; void command('AUTHORIZE', { operationId: view.operationId, expectedRevision: view.revision, packageId: approval.packageId, approvalId: approval.id, formal: { contractIssueDate: f.get('issueDate'), contractIssuePlace: f.get('issuePlace'), promissoryNoteIssueDate: f.get('noteDate'), promissoryNoteIssuePlace: f.get('notePlace') }, scopes: ['ISSUANCE', ...f.getAll('scope')], expiresAt: new Date(String(f.get('expires'))).toISOString(), reason: f.get('reason'), confirmed: true }); }}><fieldset className="contents" disabled={busy || !canAuthorize}><label>Paquete con aprobación identificada<select name="approval" className={control} required><option value="">Seleccionar</option>{view.approvals.map(a => <option value={a.id} key={a.id}>{view.packages.find(p => p.id === a.packageId)?.version} · Registro {new Date(a.at).toLocaleDateString('es-AR')}</option>)}</select></label>{[['issueDate', 'Fecha efectiva del mandato', 'date'], ['issuePlace', 'Lugar de emisión del mandato', 'text'], ['noteDate', 'Fecha efectiva del pagaré', 'date'], ['notePlace', 'Lugar de emisión del pagaré', 'text'], ['expires', 'Autorizar emisión hasta', 'datetime-local'], ['reason', 'Motivo y referencia de autorización', 'text']].map(([name, label, type]) => <label key={name}>{label}<input name={name} type={type} className={control} required maxLength={500}/></label>)}<p className="sm:col-span-2">Alcance mínimo: {names.ISSUANCE}. Seleccioná expresamente los pasos posteriores que autorizás.</p>{Object.entries(names).filter(([s]) => s !== 'ISSUANCE').map(([scope, label]) => <label key={scope} className="flex gap-2"><input type="checkbox" name="scope" value={scope}/>{label}</label>)}<label className="flex gap-2 sm:col-span-2" onChange={e => e.stopPropagation()}><input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)}/>Confirmo que cuento con autorización para esta operación y las acciones seleccionadas.</label><button className={btn} disabled={!confirmed}>Registrar autorización de esta operación</button></fieldset></form></details>
 {view.authorizations.some(a => a.available) && <div className="space-y-3"><label>Autorización vigente<select className={control} value={selected} onChange={e => { setSelected(e.target.value); setConfirmed(false); }}><option value="">Seleccionar</option>{view.authorizations.filter(a => a.available).map(a => <option value={a.id} key={a.id}>{new Date(a.at).toLocaleString('es-AR')} · {a.scopes.map(s => names[s]).join(', ')}</option>)}</select></label><label className="flex gap-2"><input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)}/>Confirmo el congelamiento irreversible de estas condiciones y la asignación de un número contractual único.</label><button className={btn} disabled={busy || !enabled || !selected || !confirmed} onClick={() => void command('FREEZE', { authorizationId: selected, expectedRevision: view.revision, confirmed: true })}>Congelar condiciones autorizadas</button></div>}
 </>}
 <details><summary className="cursor-pointer font-semibold">Registro jurídico del paquete final</summary><p>Registrar aquí sólo la aprobación profesional identificada de las versiones exactas. No transfiere aprobación de archivos originales a textos modificados y no autoriza operaciones.</p><form className="mt-3 grid min-w-0 gap-3" onSubmit={e => { e.preventDefault(); const f = new FormData(e.currentTarget), p = view.packages.find(p => p.id === f.get('package')); if (p)
            void command('REGISTER_PACKAGE_APPROVAL', { packageId: p.id, packageHash: p.hash, approvalDate: f.get('date'), professional: f.get('professional'), validationReference: f.get('reference'), sourceReference: f.get('source'), confirmed: f.get('confirmed') === 'on' }); }}><fieldset className="grid min-w-0 gap-3" disabled={busy || !enabled || !view.packages.length}><label>Versión instalada<select className={control} name="package" required><option value="">Seleccionar</option>{view.packages.map(p => <option key={p.id} value={p.id}>{p.version}</option>)}</select></label>{[['date', 'Fecha de aprobación profesional', 'date'], ['professional', 'Profesional que aprobó', 'text'], ['reference', 'Referencia de validación', 'text'], ['source', 'Origen de la evidencia profesional', 'text']].map(([name, label, type]) => <label key={name}>{label}<input required className={control} name={name} type={type} maxLength={500}/></label>)}<label className="flex gap-2"><input type="checkbox" name="confirmed" required/>Confirmo la correspondencia exacta de los tres documentos, sus variables, recursos y versión de presentación.</label><button className={btn}>Registrar aprobación identificada</button></fieldset></form></details>
 <details><summary className="cursor-pointer font-semibold">Auditoría de autorizaciones y versiones</summary><pre className="overflow-x-auto whitespace-pre-wrap break-all text-xs">{JSON.stringify({ packages: view.packages, authorizations: view.authorizations, snapshot: view.frozen, documents: view.issued }, null, 2)}</pre>{view.authorizations.map(a => <form key={a.id} className="grid min-w-0 gap-2" onSubmit={e => { e.preventDefault(); void command('REVOKE_AUTHORIZATION', { authorizationId: a.id, reason: new FormData(e.currentTarget).get('reason') }); }}><label>Motivo para detener nuevos comandos de la autorización del {new Date(a.at).toLocaleString('es-AR')}<input className={control} name="reason" required maxLength={500}/></label><button className={btn} disabled={busy || !enabled}>Revocar autorización futura</button></form>)}</details>
 </>}</section>;
}
