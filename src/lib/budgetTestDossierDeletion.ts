import { createHash } from 'node:crypto';
import type { Bucket } from '@google-cloud/storage';
import type { DocumentReference, DocumentSnapshot, Firestore, Transaction } from 'firebase-admin/firestore';
import type { BudgetV2 } from './budgetV2';
import { budgetV2OpaqueId } from './budgetV2';
import { budgetDeletionRef, budgetDeletionQueries, buildBudgetDeletionInventory, inspectBudgetTree, type BudgetDeletionPreview } from './budgetV2Deletion';
import { classifyDossierRecords, TEST_DECLARATION, TEST_DOSSIER_POLICY, equal, keys } from './budgetTestDossierPolicy';
import { stable } from './contractV2';
import { contractIdentity, contractOriginId, contractSnapshotId } from './contractSnapshotV2';
import { operationFromAcceptance } from './operationV2';
import type { BudgetAcceptanceV2 } from './budgetAcceptanceV2';
export interface TestDossierPreview extends BudgetDeletionPreview {
    policy: string;
    preservedPaths: string[];
    testVerification: 'ADMIN_DECLARATION_REQUIRED';
    storagePrefixes: string[];
}
const hash = (x: unknown) => createHash('sha256').update(stable(x)).digest('hex');
function idCheck(id: unknown): asserts id is string {
    if (!budgetV2OpaqueId(id) || id.startsWith('_'))
        throw Error('Identificador de presupuesto inválido.');
}
const metadata = (s: DocumentSnapshot) => [s.ref.path, s.exists, s.updateTime?.seconds ?? null, s.updateTime?.nanoseconds ?? null];
const financialRoots = ['ledger_movimientos', 'ledger_imputaciones', 'ledger_custodia_efectivo', 'ledger_comisiones_movimientos', 'snapshots_comision_operaciones', 'pagos_informados', 'liquidaciones_comision', 'idempotencia_ledger'];
async function graph(db: Firestore, id: string, tx?: Transaction) {
    const tree = await inspectBudgetTree(db.collection('presupuestos_v2').doc(id));
    const snapshots = tx ? await tx.getAll(...tree.refs) : await db.getAll(...tree.refs);
    const base = buildBudgetDeletionInventory(id, snapshots, [], []), versions = snapshots.filter(s => s.exists && s.ref.parent.id === 'versions').map(s => s.data() as BudgetV2);
    if (versions.length > 10)
        throw Error('La familia supera el límite seguro de versiones.');
    const classification = classifyDossierRecords(id, versions, snapshots.map(s => ({ path: s.ref.path, exists: s.exists, data: s.data() ?? {} })));
    const blockers = [...base.blockers, ...classification.blockers], preserved: DocumentSnapshot[] = [], indexes: DocumentSnapshot[] = [], external: DocumentSnapshot[] = [];
    const read = async (ref: DocumentReference) => tx ? tx.get(ref) : ref.get();
    const queries = budgetDeletionQueries(db, id);
    for (const root of financialRoots) {
        queries.push(db.collection(root).where('budgetId', '==', id));
        for (const a of snapshots.filter(s => s.exists && s.ref.parent.id === 'acceptances').map(s => s.data() as BudgetAcceptanceV2))
            queries.push(db.collection(root).where('operationId', '==', operationFromAcceptance(a).operationId));
        queries.push(db.collection(root).where('solicitudId', '==', snapshots[0].data()!.solicitudId));
    }
    for (const q of queries) {
        const found = tx ? await tx.get(q.limit(31)) : await q.limit(31).get();
        if (found.size > 30)
            blockers.push('Dependencias externas superan el límite seguro.');
        for (const s of found.docs) {
            external.push(s);
            if (s.ref.parent.id === 'productos')
                preserved.push(s);
            else
                blockers.push(s.ref.path);
        }
    }
    for (const assignment of classification.assignments) {
        const index = db.doc(`presupuestos_v2/_operation_affiliate_index_v2/contracts/${createHash('sha256').update(assignment.uid).digest('hex')}/assignments/${assignment.operationId}`), s = await read(index);
        try {
            if (!s.exists)
                throw Error();
            const d = s.data()!;
            keys(d, ['schemaVersion', 'budgetId', 'version', 'operationId', 'affiliateId', 'uid']);
            equal(d, { schemaVersion: 'OPERATION_AFFILIATE_ASSIGNMENT_V2', budgetId: id, ...assignment });
            if ((await index.listCollections()).length)
                throw Error();
            indexes.push(s);
        }
        catch {
            blockers.push(`${index.path}: índice de asignación inconsistente`);
        }
    }
    // Inspect the bounded server-maintained indices, including missing parents. Never delete a stray/shared index.
    for (const root of ['_operation_affiliate_index_v2', '_operation_client_index_v2']) {
        const indexTree = await inspectBudgetTree(db.collection('presupuestos_v2').doc(root));
        const indexSnapshots = tx ? await tx.getAll(...indexTree.refs) : await db.getAll(...indexTree.refs);
        const opIds = snapshots.filter(s => s.exists && s.ref.parent.id === 'acceptances').map(s => operationFromAcceptance(s.data() as BudgetAcceptanceV2).operationId);
        for (const s of indexSnapshots) {
            const d = s.data();
            if (!d)
                continue;
            if (d.budgetId === id || opIds.includes(d.operationId)) {
                external.push(s);
                if (!indexes.some(i => i.ref.path === s.ref.path))
                    blockers.push(`${s.ref.path}: vínculo externo no eliminable o índice huérfano`);
            }
        }
    }
    const storagePrefixes = [`budget-documentation-v2/${id}/`, `operation-custody-v2/${id}/`, `operation-delivery-v2/${id}/`];
    for (const a of snapshots.filter(s => s.exists && s.ref.parent.id === 'acceptances').map(s => s.data() as BudgetAcceptanceV2)) {
        const identity = { budgetId: id, budgetVersion: a.budgetVersion, contractDraftId: `v${a.budgetVersion}`, acceptedOptionId: a.acceptedOptionId }, cid = contractIdentity(identity), sid = contractSnapshotId(identity);
        storagePrefixes.push(`contract-documents-v2/${sid}/`);
        for (const path of [`contractSnapshotsV2/${sid}`, `contractOriginsV2/${contractOriginId(identity)}`, `contractOriginEvidenceV2/${cid}`, `contractInfrastructureFixturesV2/${cid}`]) {
            const ref = db.doc(path), s = await read(ref);
            external.push(s);
            if (s.exists || (await ref.listCollections()).length)
                blockers.push(path);
        }
        const q = db.collection('contractNumbersV2').where('receipt.contractId', '==', cid).limit(2), numbers = tx ? await tx.get(q) : await q.get();
        for (const s of numbers.docs) {
            external.push(s);
            blockers.push(s.ref.path);
        }
    }
    const source = await read(db.doc(base.preservedSource));
    preserved.push(source);
    if (!source.exists)
        blockers.push('Solicitud de origen no disponible.');
    const sourceData = source.data() ?? {};
    // Historical source records are preserved. Financial/legal/physical activity still prevents cleaning their dossier.
    const populated = (value: unknown) => value !== undefined && value !== null && value !== false && value !== '' && (!Array.isArray(value) || value.length > 0);
    if (['planPagos', 'contractSnapshotV2', 'contratoFirmado', 'pagareFirmado', 'remitoFirmado', 'fechaEntregaReal', 'fechaEntrega', 'entregado'].some(k => populated(sourceData[k])) || /^(ENTREGAD[OA]|FINALIZAD[OA]|FORMALIZED|EN_COBRANZA)$/i.test(String(sourceData.estado ?? '')))
        blockers.push(`${source.ref.path}: actividad operativa protegida`);
    // Existing writers read Acceptance/identity/draft before writing any child. Those shared reads serialize deletion.
    if (tx)
        for (const name of ['versions', 'commands', 'acceptances', 'acceptanceCommands', 'documentation', 'contracts']) {
            const s = await tx.get(tree.refs[0].collection(name).limit(181));
            if (s.docs.some(d => !tree.refs.some(r => r.path === d.ref.path)))
                blockers.push('La familia cambió durante la verificación.');
        }
    const paths = classification.allowed.concat(indexes.map(s => s.ref.path)).sort();
    const facts = [...snapshots, ...external, ...indexes, ...preserved];
    const unique = new Map(facts.map(s => [s.ref.path, s]));
    const preview: TestDossierPreview = { ...base, policy: TEST_DOSSIER_POLICY, paths, preservedPaths: [...new Set(preserved.map(s => s.ref.path))].sort(), testVerification: 'ADMIN_DECLARATION_REQUIRED', blockers: [...new Set(blockers)].sort(), allowed: blockers.length === 0, storagePrefixes: storagePrefixes.sort(), fingerprint: hash([...unique.values()].map(metadata).sort((a, b) => String(a[0]).localeCompare(String(b[0])))) };
    return { preview, snapshots, indexes };
}
async function storageInspection(bucket: Bucket, prefixes: string[]) {
    const paths: string[] = [];
    for (const prefix of prefixes) {
        const [files, next] = await bucket.getFiles({ prefix, maxResults: 21, autoPaginate: false });
        paths.push(...files.map(f => f.name));
        if (next)
            paths.push(`${prefix}[inventario excedido]`);
    }
    return paths;
}
export async function previewTestDossierDeletion(db: Firestore, bucket: Bucket, id: unknown) {
    idCheck(id);
    if ((await budgetDeletionRef(db, id).get()).exists)
        throw Error('El presupuesto ya fue eliminado.');
    const { preview } = await graph(db, id), files = await storageInspection(bucket, preview.storagePrefixes);
    if (files.length) {
        preview.blockers.push(...files.map(path => `Storage privado protegido: ${path}`));
        preview.allowed = false;
        preview.preservedPaths.push(...files.map(p => `gs://${bucket.name}/${p}`));
    }
    return preview;
}
export async function deleteTestDossier(db: Firestore, bucket: Bucket, input: unknown, actor: string) {
    const c = input as {
        budgetId: string;
        commandId: string;
        fingerprint: string;
        confirm: boolean;
        testDeclaration: string;
        reason: string;
    };
    keys(c as unknown as Record<string, unknown>, ['budgetId', 'commandId', 'fingerprint', 'confirm', 'testDeclaration', 'reason']);
    idCheck(c.budgetId);
    idCheck(c.commandId);
    if (c.confirm !== true || c.testDeclaration !== TEST_DECLARATION || typeof c.reason !== 'string' || !c.reason.trim() || c.reason.length > 500 || !/^[a-f0-9]{64}$/.test(c.fingerprint))
        throw Error('Confirmación de expediente de prueba inválida.');
    const audit = budgetDeletionRef(db, c.budgetId), digest = hash({ policy: TEST_DOSSIER_POLICY, c, actor });
    const replay = (s: DocumentSnapshot) => {
        if (s.data()!.digest !== digest || s.data()!.actor !== actor || s.data()!.policy !== TEST_DOSSIER_POLICY)
            throw Error('Conflicto de comando de eliminación.');
        return s.data()!.result as {
            budgetId: string;
            deletedPaths: string[];
            deletedAt: string;
        };
    };
    const previous = await audit.get();
    if (previous.exists)
        return replay(previous);
    let prepared: TestDossierPreview;
    try {
        prepared = await previewTestDossierDeletion(db, bucket, c.budgetId);
    }
    catch (e) {
        const saved = await audit.get();
        if (saved.exists)
            return replay(saved);
        throw e;
    }
    if (!prepared.allowed)
        throw Error('El presupuesto contiene registros protegidos o relaciones no verificables.');
    if (prepared.fingerprint !== c.fingerprint)
        throw Error('El presupuesto cambió. Volvé a verificar el expediente.');
    return db.runTransaction(async (tx) => {
        const prior = await tx.get(audit);
        if (prior.exists)
            return replay(prior);
        const current = await graph(db, c.budgetId, tx);
        if (!current.preview.allowed || current.preview.fingerprint !== c.fingerprint || stable(current.preview.storagePrefixes) !== stable(prepared.storagePrefixes))
            throw Error('El presupuesto cambió o tiene dependencias protegidas.');
        const result = { budgetId: c.budgetId, deletedPaths: current.preview.paths, deletedAt: new Date().toISOString() };
        tx.create(audit, { schemaVersion: 'BUDGET_DELETION_V1', policy: TEST_DOSSIER_POLICY, commandId: c.commandId, digest, actor, testDeclaration: c.testDeclaration, reason: c.reason.trim(), preservedPaths: current.preview.preservedPaths, manifestHash: c.fingerprint, result });
        const allowed = new Set(current.preview.paths);
        for (const s of [...current.snapshots, ...current.indexes])
            if (s.exists && allowed.has(s.ref.path))
                tx.delete(s.ref);
        return result;
    });
}
