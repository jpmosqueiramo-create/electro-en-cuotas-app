'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import type { ProductionHistoryPage, ProductionOverview } from '@/lib/productionV2/overview';
import { SimpleContractIssuanceForm } from './SimpleContractIssuanceForm';
import { OperationClientWorkspace } from '@/components/operations/OperationClientWorkspace';
import { btn, control } from './ContractDataFields';
const names: Record<string, string> = { ISSUANCE: 'Emitir contrato de mandato y pagaré', DELIVERY: 'Registrar firmas, originales y entrega', FINANCE: 'Activar cuotas y registrar pagos o reversas', CLIENT_ACTIVATION: 'Invitar al cliente vinculado después de emitir ambos documentos' };
export function ProductionOperationWorkspace({ budgetId, version, revision, unsaved=false, onChanged }: {
    budgetId: string;
    version: number;
    revision: number;
    unsaved?: boolean;
    onChanged?: () => Promise<void>;
}) {
    const { user } = useAuth();
    return <ProductionSession key={`${user?.uid}:${budgetId}:${version}`} budgetId={budgetId} version={version} revision={revision} unsaved={unsaved} onChanged={onChanged}/>;
}
function ProductionSession({ budgetId, version, revision, unsaved=false, onChanged }: {
    budgetId: string;
    version: number;
    revision: number;
    unsaved?: boolean;
    onChanged?: () => Promise<void>;
}) {
    const [revisionConsent,setRevisionConsent]=useState(false);
    const { user } = useAuth(), [view, setView] = useState<ProductionOverview | null>(null), [error, setError] = useState(''), [busy, setBusy] = useState(false), [confirmed, setConfirmed] = useState(false), [selected, setSelected] = useState(''), [approvalSelected, setApprovalSelected] = useState('');
    const [page, setPage] = useState<ProductionHistoryPage>({}), [recoverySelected, setRecoverySelected] = useState(''), [recoveryConsent, setRecoveryConsent] = useState(false), [recoverConfirmed, setRecoverConfirmed] = useState(false);
    const [ownerConfirmed, setOwnerConfirmed] = useState(false);
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
                setRevisionConsent(false);setOwnerConfirmed(false); setConfirmed(false); setRecoveryConsent(false); setRecoverConfirmed(false);
                confirmationContext.current = context;
            }
            setView(next);
            setError('');
        }
    }
    catch (e) {
        if (seq === sequence.current) {
            setRevisionConsent(false);setOwnerConfirmed(false); setConfirmed(false); setRecoveryConsent(false); setRecoverConfirmed(false);
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
        setRevisionConsent(false);setOwnerConfirmed(false); setConfirmed(false); setRecoveryConsent(false); setRecoverConfirmed(false);
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
    return <><section className="space-y-3">{unsaved&&<p role="status">Guardá los cambios antes de emitir; los documentos usan únicamente los datos guardados.</p>}{error && <p role="alert">{error}</p>}{view && !view.frozen && <SimpleContractIssuanceForm key={`${view.revision}:${view.issueDate}:${unsaved}`} view={view} busy={busy||unsaved} onIssue={data=>command('ISSUE_PREPARED',data)}/ >}{view?.issued && <OperationClientWorkspace budgetId={budgetId} version={version}/>}</section><details open={!!view?.frozen}><summary className="min-h-11 cursor-pointer font-semibold">Documentos emitidos, recuperación y auditoría</summary><section data-testid="production-operation" className="min-w-0 space-y-3 rounded-xl border border-border-color bg-surface p-4"><h2 className="font-heading text-xl font-bold">Emisión definitiva del contrato y pagaré</h2><p className="text-sm">La emisión requiere textos finales aprobados y autorización explícita de esta operación. Las firmas, la entrega y la activación de cuotas se verifican por separado. ARCA permanece deshabilitada.</p>{error && <p role="alert">{error}</p>}<button type="button" className={btn} disabled={busy} onClick={() => void load()}>Actualizar habilitación</button>{view && <>{view.revisionPreparation&&<p role="status" className="font-semibold">Preparando una nueva edición de {view.revisionPreparation.contractNumber}. Al emitir, se conserva este número y sólo la edición nueva queda vigente. Las anteriores se conservan en auditoría.</p>}{view.frozen&&<details data-testid="reopen-contract-before-signature"><summary className="min-h-11 cursor-pointer font-semibold">Corregir datos antes de la firma y entrega</summary>{view.canReviseBeforeSignature?<form className="space-y-3" onChange={()=>setRevisionConsent(false)} onSubmit={e=>{e.preventDefault();if(!revisionConsent||!view.frozen)return;void command('REOPEN_BEFORE_SIGNATURE',{expectedRevision:view.revision,snapshotHash:view.frozen.snapshotHash,reason:new FormData(e.currentTarget).get('reason'),confirmed:true});}}><p>Se abrirá una nueva edición del mismo contrato. Los PDF anteriores se conservan y dejan de ser la edición vigente; no se consume otro número CH.</p><label className="block">Motivo de la corrección<input required name="reason" maxLength={500} className={control}/></label><label className="flex gap-2" onChange={e=>e.stopPropagation()}><input type="checkbox" checked={revisionConsent} onChange={e=>setRevisionConsent(e.target.checked)}/>Confirmo la corrección antes de firma, recepción y cuotas activadas.</label><button className={btn} disabled={busy||!enabled||!revisionConsent}>Corregir conservando número CH</button></form>:<p role="status">{view.revisionBlocker}</p>}</details>}{view.test && <p className="font-bold text-amber-600">PRUEBA LOCAL — SIN EFECTOS REALES</p>}<ul className="space-y-2" role="status">{view.blockers.map(b => <li key={b}>{b}</li>)}</ul>
 {view.frozen ? <><p>Términos congelados: {view.frozen.contractNumber}. La edición vigente conserva sus documentos; las correcciones previas a la firma utilizan el mismo número CH y conservan auditoría.</p>{view.issued ? <div className="flex flex-wrap gap-2">{view.issued.documents.map(d => <button className={btn} key={d.kind} onClick={() => void document(d.kind)}>Abrir {({ MANDATE: 'mandato', PAGARE: 'pagaré', REMITO: 'remito' } as Record<string, string>)[d.kind]} emitido</button>)}</div> : <>{view.frozen.issuanceRevoked ? <p role="alert">La autorización original fue revocada. No se puede recuperar la emisión desde esta pantalla.</p> : view.frozen.issuanceExpired ? <div className="space-y-3" data-testid="issuance-recovery"><p>La autorización de emisión venció. Una autorización específica permitirá completar únicamente los archivos faltantes del mismo número {view.frozen.contractNumber}, con fecha original {view.frozen.issueDate}. No cambia condiciones ni autoriza otra emisión.</p>
 <form className="grid min-w-0 gap-3 sm:grid-cols-2" onChange={() => setRecoveryConsent(false)} onSubmit={e => { e.preventDefault(); if (!recoveryConsent || !view.frozen) return; const f = new FormData(e.currentTarget); void command('AUTHORIZE_ISSUANCE_RECOVERY', { snapshotHash: view.frozen.snapshotHash, authorizationId: view.frozen.authorizationId, expiresAt: new Date(String(f.get('recoveryExpires'))).toISOString(), reason: f.get('recoveryReason'), confirmed: true }); }}><fieldset className="contents" disabled={busy || !enabled}><label>Recuperación autorizada hasta (máximo 24 horas)<input required type="datetime-local" name="recoveryExpires" className={control}/></label><label>Motivo y referencia de la nueva autorización<input required maxLength={500} name="recoveryReason" className={control}/></label><label className="flex gap-2 sm:col-span-2" onChange={e => e.stopPropagation()}><input type="checkbox" checked={recoveryConsent} onChange={e => setRecoveryConsent(e.target.checked)}/>Confirmo la recuperación específica de los mismos documentos, sin cambiar número, fechas ni paquete jurídico.</label><button className={btn} disabled={!recoveryConsent}>Autorizar recuperación de emisión</button></fieldset></form>
 <label>Autorización de recuperación vigente<select aria-label="Autorización de recuperación vigente" className={control} value={recoverySelected} disabled={busy} onChange={e => { setRecoverySelected(e.target.value); setRecoverConfirmed(false); }}><option value="">Seleccionar</option>{view.recoveryAuthorizations.filter(a => a.available).map(a => <option key={a.id} value={a.id}>{new Date(a.at).toLocaleString('es-AR')} · hasta {new Date(a.expiresAt).toLocaleString('es-AR')}</option>)}</select></label><label className="flex gap-2"><input type="checkbox" checked={recoverConfirmed} onChange={e => setRecoverConfirmed(e.target.checked)}/>Confirmo completar los archivos con esta autorización de recuperación.</label><button className={btn} disabled={busy || !enabled || !recoverConfirmed || !view.recoveryAuthorizations.some(a => a.id === recoverySelected && a.available)} onClick={() => void command('RECOVER_DOCUMENTS', { confirmed: true, recoveryId: recoverySelected }, false)}>Recuperar los mismos documentos</button></div> : <><label className="flex gap-2"><input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)}/>Confirmo la emisión del paquete aprobado para esta operación. Una interrupción recuperará los mismos documentos.</label><button className={btn} disabled={busy || !enabled || !confirmed} onClick={() => void command('ISSUE_DOCUMENTS', { confirmed: true }, false)}>Emitir o recuperar documentos autorizados</button></>}</>}</> : <>
 <details><summary className="cursor-pointer font-semibold">Autorizar una operación real</summary><form className="mt-3 grid min-w-0 gap-3 sm:grid-cols-2" onChange={() => setConfirmed(false)} onSubmit={e => { e.preventDefault(); if (!view || !confirmed)
                return; const f = new FormData(e.currentTarget), approval = view.approvals.find(a => a.id === f.get('approval')); if (!approval)
                return; void command('AUTHORIZE', { operationId: view.operationId, expectedRevision: view.revision, packageId: approval.packageId, approvalId: approval.id, formal: { contractIssueDate: f.get('issueDate'), contractIssuePlace: f.get('issuePlace'), promissoryNoteIssueDate: f.get('noteDate'), promissoryNoteIssuePlace: f.get('notePlace'), ...(view.packages.find(p=>p.id===approval.packageId)?.originalsBindingsRequired ? { originalNetManagementLogistics:Number(f.get('originalNetManagementLogistics')),originalCft:Number(f.get('originalCft')),originalAllocationConformity:f.get('originalAllocationConformity'),dispatchOrigin:f.get('dispatchOrigin'),productSerial:f.get('productSerial') } : {}) }, scopes: ['ISSUANCE', ...f.getAll('scope')], expiresAt: new Date(String(f.get('expires'))).toISOString(), reason: f.get('reason'), confirmed: true }); }}><fieldset className="contents" disabled={busy || !canAuthorize}><label>Paquete aprobado<select name="approval" className={control} required value={approvalSelected} onChange={e=>setApprovalSelected(e.target.value)}><option value="">Seleccionar</option>{view.approvals.map(a => <option value={a.id} key={a.id}>{view.packages.find(p => p.id === a.packageId)?.version} · {a.basis === 'OWNER_AUTHORIZATION' ? 'Titular' : 'Profesional (histórico)'} · Registro {new Date(a.at).toLocaleDateString('es-AR')}</option>)}</select></label>{[['issueDate', 'Fecha efectiva del mandato', 'date'], ['issuePlace', 'Lugar de emisión del mandato', 'text'], ['noteDate', 'Fecha efectiva del pagaré', 'date'], ['notePlace', 'Lugar de emisión del pagaré', 'text'], ['expires', 'Autorizar emisión hasta', 'datetime-local'], ['reason', 'Motivo y referencia de autorización', 'text']].map(([name, label, type]) => <label key={name}>{label}<input name={name} type={type} className={control} required maxLength={500}/></label>)}{view.packages.find(p=>p.id===view.approvals.find(a=>a.id===approvalSelected)?.packageId)?.originalsBindingsRequired && <><p className="sm:col-span-2">Presentación del original aprobado: la clasificación debe conciliar con el total guardado y contar con conformidad específica. No modifica capital, servicios ni cuotas. El pagaré utiliza su competencia y lugar de pago aprobados por separado.</p>{[['originalNetManagementLogistics','Valor Neto + Gestión y Logística','number'],['originalCft','CFT del desglose aprobado','number'],['originalAllocationConformity','Referencia de conformidad del cliente con el desglose','text'],['dispatchOrigin','Origen del despacho','text'],['productSerial','Serie / IMEI o constancia expresa de no corresponder','text']].map(([name,label,type])=><label key={name}>{label}<input name={name} required type={type} min={type==='number'?0:undefined} step={type==='number'?'0.01':undefined} maxLength={500} className={control}/></label>)}</>}<p className="sm:col-span-2">Fechas efectivas según {view.issueTimeZone}; día actual: {view.issueDate}. Si cambia el día antes de congelar, se requiere otra autorización explícita. Alcance mínimo: {names.ISSUANCE}. Seleccioná expresamente los pasos posteriores que autorizás.</p>{Object.entries(names).filter(([s]) => s !== 'ISSUANCE').map(([scope, label]) => <label key={scope} className="flex gap-2"><input type="checkbox" name="scope" value={scope}/>{label}</label>)}<label className="flex gap-2 sm:col-span-2" onChange={e => e.stopPropagation()}><input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)}/>Confirmo que cuento con autorización para esta operación y las acciones seleccionadas.</label><button className={btn} disabled={!confirmed}>Registrar autorización de esta operación</button></fieldset></form></details>
 {view.authorizations.some(a => a.available) && <div className="space-y-3"><label>Autorización vigente<select className={control} value={selected} onChange={e => { setSelected(e.target.value); setConfirmed(false); }}><option value="">Seleccionar</option>{view.authorizations.filter(a => a.available).map(a => <option value={a.id} key={a.id}>{new Date(a.at).toLocaleString('es-AR')} · {a.scopes.map(s => names[s]).join(', ')}</option>)}</select></label><label className="flex gap-2"><input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)}/>{view.revisionPreparation?'Confirmo la nueva edición con el mismo número CH. Se conserva la edición anterior.':'Confirmo las condiciones para emitir y asignar un único número contractual.'}</label><button className={btn} disabled={busy || !enabled || !selected || !confirmed} onClick={() => void command('FREEZE', { authorizationId: selected, expectedRevision: view.revision, confirmed: true })}>Congelar condiciones autorizadas</button></div>}
 </>}
 <details data-testid="owner-package-approval"><summary className="cursor-pointer font-semibold">Aprobación del paquete por el titular</summary><p>Tu aprobación expresa autoriza esta versión exacta. Se registra con tu sesión administrativa, fecha y hashes; no se presenta como aprobación profesional ni autoriza por sí sola una operación.</p><form className="mt-3 grid min-w-0 gap-3" onChange={()=>setOwnerConfirmed(false)} onSubmit={e => { e.preventDefault(); const f = new FormData(e.currentTarget), p = view.packages.find(p => p.id === f.get('package')); if (p)
            void command('REGISTER_PACKAGE_APPROVAL', { packageId: p.id, packageHash: p.hash, approvalBasis: 'OWNER_AUTHORIZATION', reason: f.get('reason'), confirmed: ownerConfirmed }); }}><fieldset className="grid min-w-0 gap-3" disabled={busy || !enabled || !view.packages.length}><label>Versión instalada<select className={control} name="package" required><option value="">Seleccionar</option>{view.packages.map(p => <option key={p.id} value={p.id}>{p.version}</option>)}</select></label><label>Referencia o motivo de mi aprobación<input required name="reason" maxLength={500} className={control}/></label><label className="flex gap-2"><input type="checkbox" name="confirmed" required checked={ownerConfirmed} onChange={e=>{e.stopPropagation();setOwnerConfirmed(e.target.checked);}}/>Como titular o representante autorizado, apruebo expresamente los documentos exactos de esta versión, sus variables y presentación.</label><button className={btn} disabled={!ownerConfirmed}>Registrar mi aprobación del paquete</button></fieldset></form></details>
 <details><summary className="cursor-pointer font-semibold">Auditoría de autorizaciones y versiones</summary><pre className="overflow-x-auto whitespace-pre-wrap break-all text-xs">{JSON.stringify({ packages: view.packages, authorizations: view.authorizations, approvals: view.approvalHistory, recoveries: view.recoveryAuthorizations, snapshot: view.frozen, documents: view.issued }, null, 2)}</pre><p>Historial en páginas de hasta 20 registros por tipo, ordenados por identificador estable. Los registros revocados se conservan.</p>{([['approvalAfter', 'aprobaciones'], ['authorizationAfter', 'autorizaciones'], ['recoveryAfter', 'recuperaciones']] as const).map(([key, label]) => <div key={key} className="flex flex-wrap gap-2"><button type="button" className={btn} disabled={busy || !page[key]} onClick={() => { setSelected(''); setRecoverySelected(''); setConfirmed(false); setPage(p => { const next = { ...p }; delete next[key]; return next; }); }}>Primeras {label}</button><button type="button" className={btn} disabled={busy || !view.pagination[key]} onClick={() => { setSelected(''); setRecoverySelected(''); setConfirmed(false); setPage(p => ({ ...p, [key]: view.pagination[key]! })); }}>Siguientes {label}</button></div>)}{view.recoveryAuthorizations.filter(a => !a.revoked).map(a => <form key={a.id} className="grid min-w-0 gap-2" onSubmit={e => { e.preventDefault(); void command('REVOKE_ISSUANCE_RECOVERY', { recoveryId: a.id, reason: new FormData(e.currentTarget).get('reason') }); }}><label>Motivo de revocación de recuperación del {new Date(a.at).toLocaleString('es-AR')}<input className={control} name="reason" required maxLength={500}/></label><button className={btn} disabled={busy || !enabled}>Revocar recuperación</button></form>)}{view.authorizations.filter(a => !a.revoked).map(a => <form key={a.id} className="grid min-w-0 gap-2" onSubmit={e => { e.preventDefault(); void command('REVOKE_AUTHORIZATION', { authorizationId: a.id, reason: new FormData(e.currentTarget).get('reason') }); }}><label>Motivo para detener nuevos comandos de la autorización del {new Date(a.at).toLocaleString('es-AR')}<input className={control} name="reason" required maxLength={500}/></label><button className={btn} disabled={busy || !enabled}>Revocar autorización futura</button></form>)}</details>
 </>}</section></details></>;
}
