import { createHash } from 'node:crypto';
import { PERSONAL_ADDRESS_VERSION } from './contractAddress';
import type { BudgetV2 } from './budgetV2';
import { buildAcceptance, createDocumentationCase, type BudgetAcceptanceV2 } from './budgetAcceptanceV2';
import { contractEconomics, contractSchedule, newContractDraft, stable, type ContractDraftV2 } from './contractV2';
import { verifyReadyEvidence, type ContractReadyEvidenceV1 } from './contractReadyV2';
import { operationFromAcceptance, verifyOperation } from './operationV2';
import { initialCustody } from './operationCustodyV2';
export const TEST_DOSSIER_POLICY = 'TEST_DOSSIER_CLEANUP_V1';
export const TEST_DECLARATION = 'SYNTHETIC_ONLY_NO_REAL_ACTIVITY';
export const testActions = ['OPEN_OR_CREATE', 'SET_CONTRACT_PLAN', 'SET_PAYMENT_DATES', 'UPDATE_PERSONAL_DATA', 'UPDATE_EMPLOYMENT_DATA', 'MARK_READY_TO_FORMALIZE', 'RETURN_TO_DRAFT'] as const;
export function equal(a: unknown, b: unknown) {
    if (stable(a) !== stable(b))
        throw Error('Relación inconsistente.');
}
export function keys(data: Record<string, unknown>, required: string[], optional: string[] = []) {
    if (!data || typeof data !== 'object' || Array.isArray(data) || required.some(k => !Object.hasOwn(data, k)) || Object.keys(data).some(k => ![...required, ...optional].includes(k)))
        throw Error('Estructura desconocida.');
}
export function acceptanceForCleanup(raw: unknown, b: BudgetV2): BudgetAcceptanceV2 {
    const a = raw as BudgetAcceptanceV2;
    if (!a || typeof a.acceptedBy !== 'string' || !a.acceptedBy || typeof a.acceptedAt !== 'string' || !Number.isFinite(Date.parse(a.acceptedAt)))
        throw Error('Aceptación inválida.');
    equal(a, buildAcceptance(b, { budgetId: b.id, version: b.version, acceptedOptionId: a.acceptedOptionId, preferredPlanCuotas: a.preferredPlanCuotas, commandId: 'cleanup-validation' }, a.acceptedBy, a.acceptedAt));
    return a;
}
export function draftForCleanup(raw: unknown, b: BudgetV2, a: BudgetAcceptanceV2): ContractDraftV2 {
    const d = raw as ContractDraftV2, base = newContractDraft(b, a, 'validation', a.acceptedAt);
    keys(d as unknown as Record<string, unknown>, Object.keys(base).filter(k => k !== 'personalDataVersion'), ['personalDataVersion', 'readyEvidenceId']);
    for (const k of ['schemaVersion', 'contractDraftId', 'budgetId', 'budgetVersion', 'acceptedOptionId', 'acceptedAt', 'preferredPlanCuotas', 'acceptedReferenceSnapshot'] as const)
        equal(d[k], base[k]);
    if (!['DRAFT', 'READY_TO_FORMALIZE'].includes(d.status) || !Number.isSafeInteger(d.revision) || d.revision < 1)
        throw Error('Estado contractual protegido.');
    for (const k of ['activeClientDataRequestId', 'lastClientSubmissionId', 'lastClientSubmissionAppliedAt', 'lastClientSubmissionAppliedBy'] as const)
        if (d[k] !== null)
            throw Error('Formulario o datos documentales vinculados.');
    for (const k of ['preparedAt', 'createdAt', 'updatedAt'] as const)
        if (typeof d[k] !== 'string' || !Number.isFinite(Date.parse(d[k])))
            throw Error('Fecha inválida.');
    for (const k of ['createdBy', 'updatedBy'] as const)
        if (typeof d[k] !== 'string' || !d[k])
            throw Error('Responsable inválido.');
    const personal = d.personalData as unknown as Record<string, unknown>, employment = d.employmentData as unknown as Record<string, unknown>;
    keys(personal, ['fullName', 'dni', 'address', 'locality', 'email', 'whatsapp'], ['province', 'postalCode']);
    keys(employment, ['cuil', 'employerOrWorkName', 'workAddress']);
    if ([...Object.values(personal), ...Object.values(employment)].some(v => typeof v !== 'string'))
        throw Error('Datos no reconocidos.');
    if (d.personalDataVersion !== undefined && !['LEGACY_SIX', PERSONAL_ADDRESS_VERSION].includes(d.personalDataVersion))
        throw Error('Versión personal desconocida.');
    if (d.economicTerms !== null)
        equal(d.economicTerms, contractEconomics(a.optionSnapshot.referenceSnapshot, d.economicTerms.contractPlanCuotas));
    if (d.firstInstallmentDueDate !== null && !/^\d{4}-\d{2}-\d{2}$/.test(d.firstInstallmentDueDate))
        throw Error('Fecha contractual inválida.');
    if (d.preferredMonthlyDueDay !== null && (!Number.isInteger(d.preferredMonthlyDueDay) || d.preferredMonthlyDueDay < 1 || d.preferredMonthlyDueDay > 31))
        throw Error('Día inválido.');
    equal(d.paymentScheduleDraft, d.economicTerms && d.firstInstallmentDueDate && d.preferredMonthlyDueDay ? contractSchedule(d.economicTerms, d.firstInstallmentDueDate, d.preferredMonthlyDueDay) : []);
    return d;
}
export interface DossierRecord {
    path: string;
    data: Record<string, unknown>;
    exists: boolean;
}
/** Closed path/schema policy. No financial, legal, file, client or physical movement record is deletable. */
export function classifyDossierRecords(id: string, versions: BudgetV2[], records: DossierRecord[]) {
    const blockers: string[] = [], allowed: string[] = [], assignments: {
        version: number;
        operationId: string;
        uid: string;
        affiliateId: string;
    }[] = [];
    const map = new Map(records.filter(r => r.exists).map(r => [r.path, r.data])), base = `presupuestos_v2/${id}`;
    const budgets = new Map(versions.map(b => [b.version, b])), accepted = new Map<number, BudgetAcceptanceV2>();
    for (const b of versions) {
        const raw = map.get(`${base}/acceptances/${b.version}`);
        if (raw)
            try {
                accepted.set(b.version, acceptanceForCleanup(raw, b));
            }
            catch {
                blockers.push(`${base}/acceptances/${b.version}: aceptación inconsistente`);
            }
    }
    for (const r of records) {
        if (!r.exists)
            continue;
        const p = r.path.slice(base.length + 1), d = r.data;
        if (r.path === base || /^(versions|commands)\/[^/]+$/.test(p)) {
            allowed.push(r.path);
            continue;
        }
        try {
            let m: RegExpMatchArray | null;
            if ((m = p.match(/^acceptances\/(\d+)$/))) {
                if (!accepted.has(Number(m[1])))
                    throw Error();
            }
            else if ((m = p.match(/^acceptanceCommands\/([^/]+)$/))) {
                const a = accepted.get(Number(d.version));
                if (!a)
                    throw Error();
                keys(d, ['digest', 'version', 'by', 'createdAt']);
                if (d.by !== a.acceptedBy || d.createdAt !== a.acceptedAt)
                    throw Error();
                equal(d.digest, createHash('sha256').update(JSON.stringify({ budgetId: id, version: a.budgetVersion, acceptedOptionId: a.acceptedOptionId, preferredPlanCuotas: a.preferredPlanCuotas, commandId: m[1] })).digest('hex'));
            }
            else if ((m = p.match(/^documentation\/(\d+)$/))) {
                const a = accepted.get(Number(m[1]));
                if (!a)
                    throw Error();
                equal(d, createDocumentationCase(a));
            }
            else if ((m = p.match(/^contracts\/v(\d+)(?:\/(.*))?$/))) {
                const v = Number(m[1]), b = budgets.get(v), a = accepted.get(v), tail = m[2];
                if (!b || !a)
                    throw Error();
                const expected = operationFromAcceptance(a), draft = map.get(`${base}/contracts/v${v}`);
                if (!tail)
                    draftForCleanup(d, b, a);
                else if (tail === 'operation/identity')
                    verifyOperation(d, expected);
                else if (tail === 'creditReview/current') {
                    keys(d, ['policy', 'operationId', 'revision', 'state', 'profileOrigin', 'resolution', 'notes', 'reviewedBy', 'reviewedAt', 'draftDataHash', 'documentsHash']);
                    if (d.policy !== 'MANUAL_CREDIT_REVIEW_V1' || d.operationId !== expected.operationId || d.revision !== 0 || d.state !== 'PENDING_DATA' || d.profileOrigin !== null || d.resolution !== '' || d.notes !== '' || d.draftDataHash !== null || d.documentsHash !== null || d.reviewedBy !== a.acceptedBy || d.reviewedAt !== a.acceptedAt)
                        throw Error();
                }
                else if (tail === 'operation/affiliate') {
                    keys(d, ['schemaVersion', 'budgetId', 'version', 'operationId', 'affiliateId', 'uid']);
                    if (d.schemaVersion !== 'OPERATION_AFFILIATE_ASSIGNMENT_V2' || d.budgetId !== id || d.version !== v || d.operationId !== expected.operationId || typeof d.uid !== 'string' || !d.uid || typeof d.affiliateId !== 'string' || !d.affiliateId)
                        throw Error();
                    assignments.push({ version: v, operationId: expected.operationId, uid: d.uid, affiliateId: d.affiliateId });
                }
                else if (tail === 'operation/custody') {
                    const initial = initialCustody(expected.operationId);
                    keys(d, Object.keys(initial));
                    const assignment = map.get(`${base}/contracts/v${v}/operation/affiliate`);
                    equal({ ...d, revision: 0, assignment: null }, initial);
                    equal(d.assignment, assignment ? { uid: assignment.uid, affiliateId: assignment.affiliateId } : null);
                    if (!Number.isSafeInteger(d.revision) || Number(d.revision) < 0 || Number(d.revision) > 1)
                        throw Error();
                }
                else if (/^operation\/custody\/(commands|events)\/[^/]+$/.test(tail)) {
                    const eventPath = r.path.replace('/commands/', '/events/'), event = map.get(eventPath);
                    if (!event)
                        throw Error();
                    keys(event, ['operationId', 'action', 'product', 'nextAssignment', 'commandId', 'data', 'previousAssignment', 'actor', 'transfer', 'expectedRevision', 'at', 'revision']);
                    if (event.previousAssignment !== null || event.expectedRevision !== 0 || event.revision !== 1 || event.action !== 'ASSIGN' || event.operationId !== expected.operationId || event.transfer !== null || event.commandId !== eventPath.split('/').at(-1))
                        throw Error();
                    const data = event.data as Record<string, unknown>;
                    keys(data, ['affiliateId', 'uid', 'reason']);
                    if (typeof data.reason !== 'string' || !data.reason.trim())
                        throw Error();
                    equal(event.nextAssignment, { affiliateId: data.affiliateId, uid: data.uid });
                    equal(event.product, { name: a.optionSnapshot.referenceSnapshot.nombre, referenceId: a.optionSnapshot.referenceSnapshot.referenceId });
                    if (typeof event.actor !== 'string' || typeof event.at !== 'string' || !Number.isFinite(Date.parse(event.at)))
                        throw Error();
                    const receipt = map.get(eventPath.replace('/events/', '/commands/'));
                    if (!receipt)
                        throw Error();
                    const state = map.get(`${base}/contracts/v${v}/operation/custody`);
                    if (!state || state.revision !== 1)
                        throw Error();
                    equal(state.assignment, event.nextAssignment);
                    if (tail.includes('/commands/')) {
                        equal(d.digest, createHash('sha256').update(stable({ c: { commandId: event.commandId, operationId: event.operationId, expectedRevision: event.expectedRevision, action: event.action, data: event.data }, actor: { uid: event.actor, admin: true } })).digest('hex'));
                        keys(d, ['actor', 'at', 'revision', 'digest']);
                        if (d.actor !== event.actor || d.at !== event.at || d.revision !== event.revision || !/^([a-f0-9]{64})$/.test(String(d.digest)))
                            throw Error();
                    }
                }
                else if (/^commands\/[^/]+$/.test(tail)) {
                    keys(d, ['digest', 'result', 'createdAt', 'by', 'action']);
                    if (!testActions.includes(d.action as typeof testActions[number]) || typeof d.digest !== 'string' || typeof d.by !== 'string')
                        throw Error();
                    draftForCleanup(d.result, b, a);
                    if (d.action !== 'OPEN_OR_CREATE') {
                        const event = map.get(r.path.replace('/commands/', '/events/'));
                        if (!event || event.action !== d.action || event.by !== d.by || event.at !== d.createdAt)
                            throw Error();
                    }
                }
                else if (/^events\/[^/]+$/.test(tail)) {
                    if (!testActions.includes(d.action as typeof testActions[number]) || d.action === 'OPEN_OR_CREATE')
                        throw Error();
                    const cmd = map.get(r.path.replace('/events/', '/commands/'));
                    if (!cmd || cmd.action !== d.action)
                        throw Error();
                    if (d.action === 'MARK_READY_TO_FORMALIZE' || d.action === 'RETURN_TO_DRAFT')
                        keys(d, ['action', 'by', 'at', 'from', 'to', 'beforeRevision', 'afterRevision', 'readyEvidenceId'], ['reason']);
                    else {
                        keys(d, ['action', 'by', 'at', 'before', 'after', 'clientSubmissionId']);
                        if (d.clientSubmissionId !== null)
                            throw Error();
                        draftForCleanup(d.before, b, a);
                        draftForCleanup(d.after, b, a);
                        equal(d.after, cmd.result);
                    }
                }
                else if (/^readyReviews\/[^/]+$/.test(tail)) {
                    if (!draft)
                        throw Error();
                    keys(d, ['schemaVersion', 'contractId', 'contractDraftId', 'budgetId', 'budgetVersion', 'acceptedOptionId', 'draftRevision', 'termsDigest', 'originHashes', 'readinessPolicyVersion', 'reviewedAt', 'reviewedBy', 'commandId', 'legalTemplateReviewRequired']);
                    verifyReadyEvidence(b, a, draftForCleanup(draft, b, a), d as unknown as ContractReadyEvidenceV1);
                }
                else
                    throw Error();
            }
            else
                throw Error();
            allowed.push(r.path);
        }
        catch {
            blockers.push(`${r.path}: estructura, actividad o relación no permitida para limpieza de prueba`);
        }
    }
    // A real movement, a missing identity or an assignment without its custody state is never inferred or repaired.
    for (const [v, a] of accepted) {
        const op = operationFromAcceptance(a);
        if (!map.has(`${base}/documentation/${v}`) || (!map.has(`${base}/contracts/v${v}/operation/identity`) && records.some(r => r.path.startsWith(`${base}/contracts/v${v}/operation/`))))
            blockers.push(`${base}/contracts/v${v}: expediente incompleto`);
        for (const assignment of assignments.filter(x => x.version === v))
            if (assignment.operationId !== op.operationId || !map.has(`${base}/contracts/v${v}/operation/custody`))
                blockers.push('Asignación sin custodia coherente.');
    }
    for (const v of accepted.keys()) {
        const root = `${base}/contracts/v${v}`, d = map.get(root), custody = map.get(root + '/operation/custody');
        const events = records.filter(r => r.exists && r.path.startsWith(root + '/operation/custody/events/'));
        if (custody && (events.length !== custody.revision || Number(custody.revision) > 0 && !assignments.some(a => a.version === v)))
            blockers.push(root + ': historial de asignación incompleto');
        const commands = records.filter(r => r.exists && r.path.startsWith(root + '/commands/'));
        if (d) {
            try {
                if (!commands.length)
                    throw Error();
                const latest = commands.map(r => r.data.result as ContractDraftV2).sort((a, b) => b.revision - a.revision)[0];
                equal(d, latest);
                if (d.status === 'READY_TO_FORMALIZE' && !map.has(root + '/readyReviews/' + d.readyEvidenceId))
                    throw Error();
            }
            catch {
                blockers.push(root + ': historial contractual incompleto');
            }
        }
        if (records.filter(r => r.exists && r.path.startsWith(`${base}/acceptanceCommands/`) && r.data.version === v).length !== 1)
            blockers.push(root + ': comprobante de aceptación ausente o duplicado');
    }
    return { allowed, blockers, assignments };
}
