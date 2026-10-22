import './helpers/requireSafeEmulatorEnvironment';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { admin } from '../src/lib/firebaseAdmin';
import { persistBudgetV2 } from '../src/lib/budgetV2Persistence';
import { acceptBudgetV2 } from '../src/lib/budgetAcceptanceV2Server';
import { contractCommand } from '../src/lib/contractV2Server';
import { custodyCommand, affiliateIndex } from '../src/lib/operationCustodyV2Server';
import { operationFromAcceptance } from '../src/lib/operationV2';
import { deleteTestDossier, previewTestDossierDeletion } from '../src/lib/budgetTestDossierDeletion';
import { infrastructureFixture } from './helpers/contractInfrastructureFixtures';
import { createDocumentationCase } from '../src/lib/budgetAcceptanceV2';
import { contractSnapshotId, contractIdentity, contractOriginId } from '../src/lib/contractSnapshotV2';
import type { Transaction } from 'firebase-admin/firestore';
import type { Bucket } from '@google-cloud/storage';
import { ABSENT_TEST_SOURCE_POLICY, authorizedAbsentTestSources, permitsAbsentTestSource, TEST_DECLARATION } from '../src/lib/budgetTestDossierPolicy';
import { budgetDeletionRef } from '../src/lib/budgetV2Deletion';
import { budgetFixture } from './helpers/budgetV2Fixtures';
import { getBudgetDocumentationBucket } from '../src/lib/budgetDocumentationStorage';
import { POST } from '../src/app/api/admin/presupuestos-v2/eliminacion/route';
import { p1Token, p1User } from './testPortalP1Emulator';
import { ADMIN_EMAIL } from '../src/lib/adminIdentity';
const db = admin.firestore();
async function fixture(accepted = true, open = true, knownId?: string) {
    const budget = budgetFixture(knownId ?? ('dossier-' + randomUUID()));
    budget.solicitudId = 'dossier-source-' + randomUUID();
    if (knownId) {
        budget.sourceCollection = 'solicitudes_cuenta';
        budget.solicitudId = authorizedAbsentTestSources[knownId].split('/')[1];
    }
    await db.doc(budget.sourceCollection + '/' + budget.solicitudId).set({ marker: 'SYNTHETIC_PRESERVE' });
    let b = await persistBudgetV2(db, { action: 'SAVE', commandId: randomUUID(), budget, expectedRevision: 0, privateOptionIds: [] }, 'admin-test');
    if (!accepted)
        return { b, a: null };
    b = await persistBudgetV2(db, { action: 'ISSUE', commandId: randomUUID(), budget: b, expectedRevision: b.revision, privateOptionIds: [] }, 'admin-test');
    const a = await acceptBudgetV2(db, { budgetId: b.id, version: 1, acceptedOptionId: b.options[0].optionId, preferredPlanCuotas: null, commandId: randomUUID() }, 'admin-test');
    if (open)
        await contractCommand(db, b.id, 1, { action: 'OPEN_OR_CREATE', commandId: randomUUID() }, 'admin-test');
    return { b, a };
}
async function main() {
    if (process.env.FIREBASE_STORAGE_EMULATOR_HOST !== '127.0.0.1:9199')
        throw Error('STORAGE_EMULATOR_REQUIRED');
    const bucket = await getBudgetDocumentationBucket();
    const preview = (id: string) => previewTestDossierDeletion(db, bucket, id);
    const command = async (id: string) => ({ budgetId: id, commandId: randomUUID(), fingerprint: (await preview(id)).fingerprint, confirm: true, testDeclaration: TEST_DECLARATION, reason: 'Expediente sintético creado por esta suite.' });
    const remove = (c: Awaited<ReturnType<typeof command>>) => deleteTestDossier(db, bucket, c, 'admin-test');
    const unrelated = await fixture(), protectedBefore = await db.doc(`presupuestos_v2/${unrelated.b.id}/versions/1`).get();
    const f = await fixture(), source = await db.doc('solicitudes/' + f.b.solicitudId).get();
    const p = await preview(f.b.id);
    assert.equal(p.allowed, true, p.blockers.join('\n'));
    const c = await command(f.b.id), r = await remove(c), audit = await budgetDeletionRef(db, f.b.id).get();
    assert.equal(r.deletedPaths.length, p.paths.length);
    for (const path of r.deletedPaths)
        assert.equal((await db.doc(path).get()).exists, false, path);
    assert.deepEqual(await remove(c), r);
    assert((await budgetDeletionRef(db, f.b.id).get()).updateTime!.isEqual(audit.updateTime!));
    assert((await source.ref.get()).updateTime!.isEqual(source.updateTime!));
    await assert.rejects(() => remove({ ...c, commandId: randomUUID() }), /Conflicto/);
    await assert.rejects(() => remove({ ...c, testDeclaration: 'OTHER' }));
    console.log('ACCEPTED_DRAFT_ATOMIC_DELETE=PASS; AUDIT_REPLAY=PASS; SOURCE_PRESERVED=PASS');
    // Historic empty draft parent and pre-operation versions are supported without repairing or migrating them.
    for (const kind of ['missing-draft-parent', 'pre-operation'] as const) {
        const h = await fixture(true, kind !== 'missing-draft-parent');
        if (kind === 'pre-operation') {
            await db.doc(`presupuestos_v2/${h.b.id}/contracts/v1/operation/identity`).delete();
            await db.doc(`presupuestos_v2/${h.b.id}/contracts/v1/creditReview/current`).delete();
        }
        const p = await preview(h.b.id);
        assert.equal(p.allowed, true, p.blockers.join('\n'));
        await remove(await command(h.b.id));
    }
    const assigned = await fixture(), user = await admin.auth().createUser({ email: `affiliate-${randomUUID()}@example.test`, emailVerified: true }), seller = db.collection('vendedores').doc(randomUUID());
    await seller.set({ activo: true, authUid: user.uid, nombre: 'Sintético' });
    const sellerBefore = await seller.get(), op = operationFromAcceptance(assigned.a!);
    await custodyCommand(db, assigned.b.id, 1, { action: 'ASSIGN', commandId: randomUUID(), operationId: op.operationId, expectedRevision: 0, data: { affiliateId: seller.id, uid: user.uid, reason: 'Asignación sintética' } }, { uid: 'admin-test', admin: true });
    const ap = await preview(assigned.b.id);
    assert.equal(ap.allowed, true, ap.blockers.join('\n'));
    assert(ap.paths.includes(affiliateIndex(db, user.uid).doc(op.operationId).path));
    await remove(await command(assigned.b.id));
    assert.equal((await affiliateIndex(db, user.uid).doc(op.operationId).get()).exists, false);
    assert((await seller.get()).updateTime!.isEqual(sellerBefore.updateTime!));
    // Technical READY evidence is not a signed/legal document or a frozen contract.
    const ready = await fixture(), sample = infrastructureFixture(ready.b.id).source.draft;
    // Reproduce a historical pre-credit-review dossier. Modern reviewed/approved cases stay blocked.
    await db.doc(`presupuestos_v2/${ready.b.id}/contracts/v1/creditReview/current`).delete();
    let d = (await contractCommand(db, ready.b.id, 1, { action: 'UPDATE_PERSONAL_DATA', expectedRevision: 1, commandId: randomUUID(), personalData: sample.personalData }, 'admin-test')).draft;
    d = (await contractCommand(db, ready.b.id, 1, { action: 'SET_CONTRACT_PLAN', expectedRevision: d.revision, commandId: randomUUID(), contractPlanCuotas: 8 }, 'admin-test')).draft;
    d = (await contractCommand(db, ready.b.id, 1, { action: 'SET_PAYMENT_DATES', expectedRevision: d.revision, commandId: randomUUID(), firstInstallmentDueDate: '2026-12-15', preferredMonthlyDueDay: 15 }, 'admin-test')).draft;
    // Historical READY predates the conformity register; do not permit deleting modern conformity records.
    await db.doc(`presupuestos_v2/${ready.b.id}/contracts/v1/conformity/current`).delete();
    await contractCommand(db, ready.b.id, 1, { action: 'MARK_READY_TO_FORMALIZE', expectedRevision: d.revision, commandId: randomUUID() }, 'admin-test');
    const rp = await preview(ready.b.id);
    assert.equal(rp.allowed, true, rp.blockers.join('\n'));
    await remove(await command(ready.b.id));
    // Unknown direct registry dependencies remain protected, including missing parents with children.
    for (const kind of ['snapshot', 'origin', 'evidence', 'fixture', 'number']) {
        const f = await fixture(), identity = { budgetId: f.b.id, budgetVersion: 1, contractDraftId: 'v1', acceptedOptionId: f.a!.acceptedOptionId }, cid = contractIdentity(identity), paths = { snapshot: `contractSnapshotsV2/${contractSnapshotId(identity)}`, origin: `contractOriginsV2/${contractOriginId(identity)}`, evidence: `contractOriginEvidenceV2/${cid}`, fixture: `contractInfrastructureFixturesV2/${cid}`, number: `contractNumbersV2/${randomUUID()}` };
        const ref = db.doc(paths[kind as keyof typeof paths]);
        await ref.set(kind === 'number' ? { receipt: { contractId: cid } } : { protected: true });
        assert.equal((await preview(f.b.id)).allowed, false, kind);
        await assert.rejects(async () => remove(awaitCommand(await preview(f.b.id))));
        assert.equal((await ref.get()).exists, true);
    }
    const reviewed = await fixture();
    const docCase = createDocumentationCase(reviewed.a!);
    await db.doc(`presupuestos_v2/${reviewed.b.id}/documentation/1`).set({ ...docCase, events: [{ action: 'REVIEW', at: new Date().toISOString() }] });
    assert.equal((await preview(reviewed.b.id)).allowed, false);
    const corrupt = await fixture();
    await db.doc(`presupuestos_v2/${corrupt.b.id}/contracts/v1/operation/identity`).update({ operationId: 'op_' + '0'.repeat(64) });
    assert.equal((await preview(corrupt.b.id)).allowed, false);
    const orphanIndex = await fixture();
    const stray = affiliateIndex(db, 'unrelated-synthetic-uid').doc(operationFromAcceptance(orphanIndex.a!).operationId);
    await stray.set({ budgetId: orphanIndex.b.id, operationId: operationFromAcceptance(orphanIndex.a!).operationId });
    assert.equal((await preview(orphanIndex.b.id)).allowed, false);
    assert.equal((await stray.get()).exists, true);
    const missingSource = await fixture();
    await db.doc('solicitudes/' + missingSource.b.solicitudId).delete();
    const missingPreview = await preview(missingSource.b.id);
    assert.equal(missingPreview.allowed, false);
    assert(missingPreview.blockers.includes('Solicitud de origen no disponible.'));
    await assert.rejects(() => remove(awaitCommand(missingPreview)));
    assert.equal((await db.doc('presupuestos_v2/' + missingSource.b.id).get()).exists, true);
    for (const [id, path] of Object.entries(authorizedAbsentTestSources)) {
        assert.equal(permitsAbsentTestSource(id, path), true);
        assert.equal(permitsAbsentTestSource(id, path + '-other'), false);
        assert.equal(permitsAbsentTestSource('unknown-' + id, path), false);
        const f = await fixture(true, true, id), origin = db.doc(path);
        await origin.delete();
        const p = await preview(id);
        assert.equal(p.allowed, true, p.blockers.join('\n'));
        assert.deepEqual(p.missingSourcePaths, [path]);
        assert.equal(p.sourceAbsencePolicy, ABSENT_TEST_SOURCE_POLICY);
        const c = await command(id);
        await origin.set({ marker: 'APPEARED_AFTER_PREVIEW' });
        await assert.rejects(() => remove(c), /cambió/);
        await origin.delete();
        if (id === 'aee8966b-5c17-4f7f-b50c-fff959ca0f0d') {
            await db.doc(`presupuestos_v2/${id}/contracts/v1/financial/current/payments/protected`).set({ marker: 'PROTECTED' });
            assert.equal((await preview(id)).allowed, false);
            await assert.rejects(() => remove(c));
            continue;
        }
        const fresh = await command(id), result = await remove(fresh);
        assert.equal((await origin.get()).exists, false);
        const audit = await budgetDeletionRef(db, id).get();
        assert.deepEqual(audit.data()!.missingSourcePaths, [path]);
        assert.equal(audit.data()!.sourceAbsencePolicy, ABSENT_TEST_SOURCE_POLICY);
        assert.deepEqual(await remove(fresh), result);
        assert((await budgetDeletionRef(db, id).get()).updateTime!.isEqual(audit.updateTime!));
        assert.equal((await db.doc('presupuestos_v2/' + f.b.id).get()).exists, false);
    }
    console.log('EXACT_FOUR_SOURCE_EXCEPTION=PASS; UNKNOWN_SOURCE=BLOCKED; SOURCE_APPEARED=STALE; SOURCE_NOT_RECREATED=PASS; ABSENCE_AUDIT_REPLAY=PASS; FINANCIAL_BLOCK_PRESERVED=PASS');
    const activeSource = await fixture();
    await db.doc('solicitudes/' + activeSource.b.solicitudId).update({ planPagos: [{ estado: 'pagada' }] });
    assert.equal((await preview(activeSource.b.id)).allowed, false);
    const failedStorage = { getFiles: async () => { throw Error('STORAGE_UNAVAILABLE'); } } as unknown as Bucket;
    await assert.rejects(() => previewTestDossierDeletion(db, failedStorage, unrelated.b.id), /STORAGE_UNAVAILABLE/);
    assert.equal((await budgetDeletionRef(db, unrelated.b.id).get()).exists, false);
    console.log('TECHNICAL_READY_ONLY=PASS; SNAPSHOT_ORIGIN_NUMBER_LEGAL_REGISTRIES=BLOCKED; REVIEWED_DOCUMENTS=BLOCKED; STORAGE_FAILURE=FAIL_CLOSED');
    console.log('MISSING_PARENT=PASS; HISTORICAL_NO_MIGRATION=PASS; ASSIGNMENT_INDEX_ATOMIC=PASS; SELLER_UNCHANGED=PASS');
    // Every unsupported child, including its missing parent, fails closed. No financial/legal/file record is deleted.
    for (const path of ['unknown/x', 'contracts/v1/requests/r', 'contracts/v1/submissions/s', 'contracts/v1/operation/fulfillment', 'contracts/v1/operation/delivery', 'contracts/v1/financial/current/payments/p', 'contracts/v1/financial/current/receipts/r', 'contracts/v1/operation/custody/photos/p', 'contracts/v1/clientAccount/link', 'contracts/v1/conformity/current']) {
        const f = await fixture(), ref = db.doc(`presupuestos_v2/${f.b.id}/${path}`);
        await ref.set({ marker: 'PROTECTED' });
        const old = await ref.get(), p = await preview(f.b.id);
        assert.equal(p.allowed, false, path);
        await assert.rejects(() => remove(awaitCommand(p)));
        assert((await ref.get()).updateTime!.isEqual(old.updateTime!));
        assert.equal((await budgetDeletionRef(db, f.b.id).get()).exists, false);
    }
    function awaitCommand(p: Awaited<ReturnType<typeof preview>>) { return { budgetId: p.budgetId, commandId: randomUUID(), fingerprint: p.fingerprint, confirm: true, testDeclaration: TEST_DECLARATION, reason: 'Prueba sintética' }; }
    for (const field of ['activeClientDataRequestId', 'lastClientSubmissionId', 'signedAt', 'contractNumber']) {
        const f = await fixture();
        await db.doc(`presupuestos_v2/${f.b.id}/contracts/v1`).update({ [field]: 'protected' });
        assert.equal((await preview(f.b.id)).allowed, false, field);
    }
    for (const collection of ['ledger_movimientos', 'ledger_imputaciones', 'ledger_comisiones_movimientos', 'liquidaciones_comision', 'contractSnapshotsV2', 'contractClientDataRequests']) {
        const f = await fixture(), ref = db.collection(collection).doc(randomUUID());
        await ref.set(collection === 'contractSnapshotsV2' ? { sourceDraft: { budgetId: f.b.id } } : { budgetId: f.b.id });
        const before = await ref.get();
        const p = await preview(f.b.id);
        assert.equal(p.allowed, false, collection);
        await assert.rejects(() => remove(awaitCommand(p)));
        assert((await ref.get()).updateTime!.isEqual(before.updateTime!));
    }
    const withFile = await fixture(), file = bucket.file(`operation-custody-v2/${withFile.b.id}/orphan.jpg`);
    await file.save(Buffer.from('SYNTHETIC_BYTES'), { metadata: { contentType: 'image/jpeg' } });
    const [beforeMetadata] = await file.getMetadata();
    assert.equal((await preview(withFile.b.id)).allowed, false);
    await assert.rejects(async () => remove(await command(withFile.b.id)));
    const [afterMetadata] = await file.getMetadata();
    assert.equal(afterMetadata.generation, beforeMetadata.generation);
    assert.equal((await file.download())[0].toString(), 'SYNTHETIC_BYTES');
    const productCase = await fixture(), product = db.collection('productos').doc(randomUUID());
    await product.set({ originBudgetId: productCase.b.id, marker: 'SHARED_REFERENCE' });
    const productBefore = await product.get();
    const pp = await preview(productCase.b.id);
    assert.equal(pp.allowed, true, pp.blockers.join('\n'));
    assert(pp.preservedPaths.includes(product.path));
    await remove(await command(productCase.b.id));
    assert((await product.get()).updateTime!.isEqual(productBefore.updateTime!));
    console.log('UNKNOWN_ORPHAN_SHARED_FINANCIAL_LEGAL_ACTIVITY=BLOCKED; STORAGE_ORPHAN_PRESERVED=PASS; PRIVATE_REFERENCE_PRESERVED=PASS');
    const stale = await fixture(), sc = await command(stale.b.id);
    await contractCommand(db, stale.b.id, 1, { action: 'UPDATE_EMPLOYMENT_DATA', commandId: randomUUID(), expectedRevision: 1, employmentData: { cuil: '', employerOrWorkName: 'Sintético', workAddress: '' } }, 'admin-test');
    await assert.rejects(() => remove(sc), /cambió/);
    const aborted = await fixture(), abortPreview = await preview(aborted.b.id), abortCommand = await command(aborted.b.id), beforeAbort = await db.getAll(...abortPreview.paths.map(p => db.doc(p)));
    const failingDb = new Proxy(db, { get(target, key) {
            if (key === 'runTransaction')
                return <T>(fn: (tx: Transaction) => Promise<T>) => target.runTransaction(async (tx) => fn(new Proxy(tx, { get(t, k) {
                        if (k === 'delete')
                            return () => { throw Error('SIMULATED_TRANSACTION_ABORT'); };
                        const value = Reflect.get(t, k);
                        return typeof value === 'function' ? value.bind(t) : value;
                    } })));
            const value = Reflect.get(target, key);
            return typeof value === 'function' ? value.bind(target) : value;
        } });
    await assert.rejects(() => deleteTestDossier(failingDb, bucket, abortCommand, 'admin-test'), /SIMULATED_TRANSACTION_ABORT/);
    for (const old of beforeAbort)
        assert((await old.ref.get()).updateTime!.isEqual(old.updateTime!));
    assert.equal((await budgetDeletionRef(db, aborted.b.id).get()).exists, false);
    console.log('TRANSACTION_ABORT_NO_PARTIAL_DELETE=PASS');
    const concurrent = await fixture(), cc = await command(concurrent.b.id), both = await Promise.all([remove(cc), remove(cc)]);
    assert.deepEqual(both[0], both[1]);
    for (const action of ['SAVE', 'ISSUE', 'ACCEPT', 'CONTRACT'] as const) {
        const f = await fixture(action === 'CONTRACT'), c = await command(f.b.id);
        const other = action === 'ACCEPT' ? () => acceptBudgetV2(db, { budgetId: f.b.id, version: 1, acceptedOptionId: f.b.options[0].optionId, preferredPlanCuotas: null, commandId: randomUUID() }, 'admin-test') : action === 'CONTRACT' ? () => contractCommand(db, f.b.id, 1, { action: 'UPDATE_EMPLOYMENT_DATA', commandId: randomUUID(), expectedRevision: 1, employmentData: { cuil: '', employerOrWorkName: 'Otro', workAddress: '' } }, 'admin-test') : () => persistBudgetV2(db, { action, commandId: randomUUID(), budget: f.b, expectedRevision: f.b.revision, privateOptionIds: [] }, 'admin-test');
        const results = await Promise.allSettled([remove(c), other()]);
        assert.equal(results.filter(r => r.status === 'fulfilled').length, 1, action);
    }
    const admins = await fixture(), ac = await command(admins.b.id);
    const adminRace = await Promise.allSettled([remove(ac), deleteTestDossier(db, bucket, { ...ac, commandId: randomUUID() }, 'another-admin')]);
    assert.equal(adminRace.filter(x => x.status === 'fulfilled').length, 1);
    const reservation = await fixture(), rc = await command(reservation.b.id);
    await db.doc(`presupuestos_v2/${reservation.b.id}/documentation/1`).update({ 'slots.DNI_FRENTE.attachments': [{ state: 'RESERVED', id: 'pending' }] });
    await assert.rejects(() => remove(rc));
    const req = (body: unknown, token?: string) => new Request('http://localhost/api/admin/presupuestos-v2/eliminacion', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) }, body: JSON.stringify(body) });
    assert.equal((await POST(req({ mode: 'PREVIEW_TEST', budgetId: unrelated.b.id }))).status, 401);
    for (const role of ['client', 'affiliate']) {
        const t = await p1Token(await p1User(role));
        assert.equal((await POST(req({ mode: 'PREVIEW_TEST', budgetId: unrelated.b.id }, t))).status, 403);
        assert.equal((await POST(req({ mode: 'DELETE_TEST', ...await command(unrelated.b.id) }, t))).status, 403);
    }
    let root;
    try {
        root = await admin.auth().getUserByEmail(ADMIN_EMAIL);
    }
    catch {
        root = await admin.auth().createUser({ email: ADMIN_EMAIL, emailVerified: true });
    }
    const token = await p1Token(root);
    assert.equal((await POST(req({ mode: 'PREVIEW_TEST', budgetId: unrelated.b.id }, token))).status, 200);
    assert((await protectedBefore.ref.get()).updateTime!.isEqual(protectedBefore.updateTime!));
    console.log('STALE_INVENTORY=PASS; CONCURRENT_REPLAY=PASS; SAVE_ISSUE_ACCEPT_CONTRACT_RACES=PASS; UPLOAD_RESERVATION=BLOCKED; ANONYMOUS=401; CLIENT_AFFILIATE=403; ADMIN=200; UNRELATED_HISTORY=UNCHANGED; PRODUCTION_WRITES=0; TEST_DOSSIER_EMULATOR=PASS');
}
main().then(() => admin.app().delete()).catch(e => { console.error(e); process.exitCode = 1; });
