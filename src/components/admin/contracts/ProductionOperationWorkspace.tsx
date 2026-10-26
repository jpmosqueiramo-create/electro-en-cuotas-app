'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import type { ProductionHistoryPage, ProductionOverview } from '@/lib/productionV2/overview';
import { SimpleContractIssuanceForm } from './SimpleContractIssuanceForm';
import { OperationClientWorkspace } from '@/components/operations/OperationClientWorkspace';
import { btn, control } from './ContractDataFields';
export function ProductionOperationWorkspace({ budgetId, version, revision, unsaved=false, onPrepare, onChanged }: {
    budgetId: string;
    version: number;
    revision: number;
    unsaved?: boolean;
    onPrepare?: () => Promise<void>;
    onChanged?: () => Promise<void>;
}) {
    const { user } = useAuth();
    return <ProductionSession key={`${user?.uid}:${budgetId}:${version}`} budgetId={budgetId} version={version} revision={revision} unsaved={unsaved} onPrepare={onPrepare} onChanged={onChanged}/>;
}
function ProductionSession({ budgetId, version, revision, unsaved=false, onPrepare, onChanged }: {
    budgetId: string;
    version: number;
    revision: number;
    unsaved?: boolean;
    onPrepare?: () => Promise<void>;
    onChanged?: () => Promise<void>;
}) {
    const [revisionConsent,setRevisionConsent]=useState(false);
    const { user } = useAuth(), [view, setView] = useState<ProductionOverview | null>(null), [error, setError] = useState(''), [busy, setBusy] = useState(false), [confirmed, setConfirmed] = useState(false);
    const [page, setPage] = useState<ProductionHistoryPage>({}), [recoverySelected, setRecoverySelected] = useState(''), [recoveryConsent, setRecoveryConsent] = useState(false), [recoverConfirmed, setRecoverConfirmed] = useState(false);
    const confirmationContext = useRef('');
    const flight = useRef(false), sequence = useRef(0), pending = useRef<{
        key: string;
        commandId: string;
    } | null>(null), url = `/api/admin/presupuestos-v2/${encodeURIComponent(budgetId)}/versions/${version}/production`;
    const load = useCallback(async () => { if (!user)
        return; const seq = ++sequence.current; try {
        const r = await fetch(`${url}?${new URLSearchParams(page).toString()}`, { headers: { Authorization: `Bearer ${await user.getIdToken()}` }, cache: 'no-store' });
        const next = await r.json();
        if (!r.ok)
            throw Error(next.error);
        if (seq === sequence.current) {
            const context = JSON.stringify({ revision: next.revision, frozen: next.frozen, issued: next.issued, enabled: next.deploymentEnabled, authorized: next.administratorAuthorized, issueDate: next.issueDate });
            if (confirmationContext.current !== context) {
                setRevisionConsent(false);setConfirmed(false); setRecoveryConsent(false); setRecoverConfirmed(false);
                confirmationContext.current = context;
            }
            setView(next);
            setError('');
        }
    }
    catch (e) {
        if (seq === sequence.current) {
            setRevisionConsent(false);setConfirmed(false); setRecoveryConsent(false); setRecoverConfirmed(false);
            setView(null);
            setError(e instanceof Error ? e.message : 'No se pudo verificar el estado.');
        }
    } }, [url, user, page]);
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
        setRevisionConsent(false);setConfirmed(false); setRecoveryConsent(false); setRecoverConfirmed(false);
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
    const enabled = !!view?.administratorAuthorized && view.deploymentEnabled;
    return <><section className="space-y-3">{unsaved&&<p role="status">Guardá los cambios antes de emitir; los documentos usan únicamente los datos guardados.</p>}{error && <p role="alert">{error}</p>}{view && !view.frozen && <SimpleContractIssuanceForm key={`${view.revision}:${view.issueDate}:${unsaved}`} view={view} busy={busy||unsaved} onPrepare={onPrepare} onIssue={data=>command('ISSUE_EDITOR',data)}/ >}{view?.issued && <OperationClientWorkspace budgetId={budgetId} version={version}/>}</section><details open={!!view?.frozen}><summary className="min-h-11 cursor-pointer font-semibold">Documentos emitidos e historial</summary><section data-testid="production-operation" className="min-w-0 space-y-3 rounded-xl border border-border-color bg-surface p-4"><h2 className="font-heading text-xl font-bold">Documentos e historial de emisión</h2><p className="text-sm">La emisión normal se realiza con «Emitir contrato y pagaré», arriba. Aquí podés consultar documentos, historial y herramientas de recuperación. Las firmas y la entrega se registran en Logística.</p>{error && <p role="alert">{error}</p>}<button type="button" className={btn} disabled={busy} onClick={() => void load()}>Actualizar documentos</button>{view && <>{view.revisionPreparation&&<p role="status" className="font-semibold">Preparando una nueva edición de {view.revisionPreparation.contractNumber}. Al emitir, se conserva este número y sólo la edición nueva queda vigente. Las anteriores se conservan en auditoría.</p>}{view.frozen&&<details data-testid="reopen-contract-before-signature"><summary className="min-h-11 cursor-pointer font-semibold">Corregir datos antes de la firma y entrega</summary>{view.canReviseBeforeSignature?<form className="space-y-3" onChange={()=>setRevisionConsent(false)} onSubmit={e=>{e.preventDefault();if(!revisionConsent||!view.frozen)return;void command('REOPEN_BEFORE_SIGNATURE',{expectedRevision:view.revision,snapshotHash:view.frozen.snapshotHash,reason:new FormData(e.currentTarget).get('reason'),confirmed:true});}}><p>Se abrirá una nueva edición del mismo contrato. Los PDF anteriores se conservan y dejan de ser la edición vigente; no se consume otro número CH.</p><label className="block">Motivo de la corrección<input required name="reason" maxLength={500} className={control}/></label><label className="flex gap-2" onChange={e=>e.stopPropagation()}><input type="checkbox" checked={revisionConsent} onChange={e=>setRevisionConsent(e.target.checked)}/>Confirmo la corrección antes de firma, recepción y cuotas activadas.</label><button className={btn} disabled={busy||!enabled||!revisionConsent}>Corregir conservando número CH</button></form>:<p role="status">{view.revisionBlocker}</p>}</details>}{view.test && <p className="font-bold text-amber-600">PRUEBA LOCAL — SIN EFECTOS REALES</p>}<ul className="space-y-2" role="status">{view.blockers.map(b => <li key={b}>{b}</li>)}</ul>
 {view.frozen ? <><p>Términos congelados: {view.frozen.contractNumber}. La edición vigente conserva sus documentos; las correcciones previas a la firma utilizan el mismo número CH y conservan auditoría.</p>{view.issued ? <div className="flex flex-wrap gap-2">{view.issued.documents.map(d => <button className={btn} key={d.kind} onClick={() => void document(d.kind)}>Abrir {({ MANDATE: 'mandato', PAGARE: 'pagaré', REMITO: 'remito' } as Record<string, string>)[d.kind]} emitido</button>)}</div> : <>{view.frozen.issuanceRevoked ? <p role="alert">La autorización original fue revocada. No se puede recuperar la emisión desde esta pantalla.</p> : view.frozen.issuanceExpired ? <div className="space-y-3" data-testid="issuance-recovery"><p>La autorización de emisión venció. Una autorización específica permitirá completar únicamente los archivos faltantes del mismo número {view.frozen.contractNumber}, con fecha original {view.frozen.issueDate}. No cambia condiciones ni autoriza otra emisión.</p>
 <form className="grid min-w-0 gap-3 sm:grid-cols-2" onChange={() => setRecoveryConsent(false)} onSubmit={e => { e.preventDefault(); if (!recoveryConsent || !view.frozen) return; const f = new FormData(e.currentTarget); void command('AUTHORIZE_ISSUANCE_RECOVERY', { snapshotHash: view.frozen.snapshotHash, authorizationId: view.frozen.authorizationId, expiresAt: new Date(String(f.get('recoveryExpires'))).toISOString(), reason: f.get('recoveryReason'), confirmed: true }); }}><fieldset className="contents" disabled={busy || !enabled}><label>Recuperación autorizada hasta (máximo 24 horas)<input required type="datetime-local" name="recoveryExpires" className={control}/></label><label>Motivo y referencia de la nueva autorización<input required maxLength={500} name="recoveryReason" className={control}/></label><label className="flex gap-2 sm:col-span-2" onChange={e => e.stopPropagation()}><input type="checkbox" checked={recoveryConsent} onChange={e => setRecoveryConsent(e.target.checked)}/>Confirmo la recuperación específica de los mismos documentos, sin cambiar número, fechas ni paquete jurídico.</label><button className={btn} disabled={!recoveryConsent}>Autorizar recuperación de emisión</button></fieldset></form>
 <label>Autorización de recuperación vigente<select aria-label="Autorización de recuperación vigente" className={control} value={recoverySelected} disabled={busy} onChange={e => { setRecoverySelected(e.target.value); setRecoverConfirmed(false); }}><option value="">Seleccionar</option>{view.recoveryAuthorizations.filter(a => a.available).map(a => <option key={a.id} value={a.id}>{new Date(a.at).toLocaleString('es-AR')} · hasta {new Date(a.expiresAt).toLocaleString('es-AR')}</option>)}</select></label><label className="flex gap-2"><input type="checkbox" checked={recoverConfirmed} onChange={e => setRecoverConfirmed(e.target.checked)}/>Confirmo completar los archivos con esta autorización de recuperación.</label><button className={btn} disabled={busy || !enabled || !recoverConfirmed || !view.recoveryAuthorizations.some(a => a.id === recoverySelected && a.available)} onClick={() => void command('RECOVER_DOCUMENTS', { confirmed: true, recoveryId: recoverySelected }, false)}>Recuperar los mismos documentos</button></div> : <><label className="flex gap-2"><input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)}/>Confirmo la emisión del paquete aprobado para esta operación. Una interrupción recuperará los mismos documentos.</label><button className={btn} disabled={busy || !enabled || !confirmed} onClick={() => void command('ISSUE_DOCUMENTS', { confirmed: true }, false)}>Emitir o recuperar documentos autorizados</button></>}</>}</> : null}
 <details><summary className="cursor-pointer font-semibold">Auditoría de autorizaciones y versiones</summary><pre className="overflow-x-auto whitespace-pre-wrap break-all text-xs">{JSON.stringify({ packages: view.packages, authorizations: view.authorizations, approvals: view.approvalHistory, recoveries: view.recoveryAuthorizations, snapshot: view.frozen, documents: view.issued }, null, 2)}</pre><p>Historial en páginas de hasta 20 registros por tipo, ordenados por identificador estable. Los registros revocados se conservan.</p>{([['approvalAfter', 'aprobaciones'], ['authorizationAfter', 'autorizaciones'], ['recoveryAfter', 'recuperaciones']] as const).map(([key, label]) => <div key={key} className="flex flex-wrap gap-2"><button type="button" className={btn} disabled={busy || !page[key]} onClick={() => { setRecoverySelected(''); setConfirmed(false); setPage(p => { const next = { ...p }; delete next[key]; return next; }); }}>Primeras {label}</button><button type="button" className={btn} disabled={busy || !view.pagination[key]} onClick={() => { setRecoverySelected(''); setConfirmed(false); setPage(p => ({ ...p, [key]: view.pagination[key]! })); }}>Siguientes {label}</button></div>)}{view.recoveryAuthorizations.filter(a => !a.revoked).map(a => <form key={a.id} className="grid min-w-0 gap-2" onSubmit={e => { e.preventDefault(); void command('REVOKE_ISSUANCE_RECOVERY', { recoveryId: a.id, reason: new FormData(e.currentTarget).get('reason') }); }}><label>Motivo de revocación de recuperación del {new Date(a.at).toLocaleString('es-AR')}<input className={control} name="reason" required maxLength={500}/></label><button className={btn} disabled={busy || !enabled}>Revocar recuperación</button></form>)}{view.authorizations.filter(a => !a.revoked).map(a => <form key={a.id} className="grid min-w-0 gap-2" onSubmit={e => { e.preventDefault(); void command('REVOKE_AUTHORIZATION', { authorizationId: a.id, reason: new FormData(e.currentTarget).get('reason') }); }}><label>Motivo para detener nuevos comandos de la autorización del {new Date(a.at).toLocaleString('es-AR')}<input className={control} name="reason" required maxLength={500}/></label><button className={btn} disabled={busy || !enabled}>Revocar autorización futura</button></form>)}</details>
 </>}</section></details></>;
}
