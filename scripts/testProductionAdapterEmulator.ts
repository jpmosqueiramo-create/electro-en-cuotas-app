import {approvedFinalPackages} from '../src/lib/productionV2/catalog';
import './helpers/requireSafeEmulatorEnvironment';
import assert from 'node:assert/strict';
import { mock } from 'node:test';
import { argentinaBusinessDate } from '../src/lib/productionV2/businessDate';
import { authorizeIssuanceRecovery, revokeIssuanceRecovery, issuanceProof } from '../src/lib/productionV2/issuanceRecovery';
import { productionOverview, type ProductionHistoryPage } from '../src/lib/productionV2/overview';
import { operationRef } from '../src/lib/operationV2';
import { randomUUID, randomBytes } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { admin } from '../src/lib/firebaseAdmin';
import { productionReadyFixture, syntheticFinalPackage, syntheticOriginalPackage, syntheticOriginalFormal } from './helpers/productionAdapterFixtures';
import { productionRuntimeForEmulator, productionRuntime, runtimeData } from '../src/lib/productionV2/runtime';
import { recordFinalPackageApproval, authorizeOperation, productionRef, scopes, revokeAuthorization, approvedPackage, packageApprovalRef } from '../src/lib/productionV2/authorization';
import { freezeOperation, productionPaths, frozenOperation } from '../src/lib/productionV2/freeze';
import { issueDocuments, issuedOperation, readIssuedDocument } from '../src/lib/productionV2/documents';
import { getBudgetDocumentationBucket } from '../src/lib/budgetDocumentationStorage';
import { contractValueHash } from '../src/lib/contractIntegrityV2';
import { deliveryCommand, readDelivery } from '../src/lib/operationDeliveryV2Server';
import { saveDeliveryPhoto } from '../src/lib/operationDeliveryV2Photos';
import { syntheticPng } from './testOperationDeliveryV2Emulator';
import { financialCommand, financialRef, readFinancial, readFinancialReceipt } from '../src/lib/operationFinancialV2Server';
import { clientBindingCommand, readClientBinding, listClientServices } from '../src/lib/operationClientV2Server';
import { financialReceiptPdf } from '../src/lib/operationFinancialReceiptPdf';
import { issuedDocumentKinds, packageHash } from '../src/lib/productionV2/catalog';
import { assertFinalRenderer } from '../src/lib/productionV2/pdf';
const external = process.env.SYNTHETIC_EXTERNAL_DELIVERY_SUITE === '1';
const db = admin.firestore(), results: Record<string, string> = {}, dir = '/tmp/ch-production-adapter';
function pass(name: string) { results[name] = 'PASS'; console.log(name + ' = PASS'); }
export async function test() {
    assert.equal(process.env.GCLOUD_PROJECT, 'demo-cuenta-hogar');
    assert.equal(process.env.FIREBASE_STORAGE_EMULATOR_HOST, '127.0.0.1:9199');
    assert.equal((await db.collection('contractSnapshotsV2').get()).size, 0, 'Fresh emulator');
    const actor = (await admin.auth().createUser({ email: process.env.NEXT_PUBLIC_ADMIN_EMAIL, emailVerified: true, password: 'Emulator-only-123' })).uid, basePackage = process.env.SYNTHETIC_INSTALLED_OWNER_PACKAGE_SUITE === '1' ? structuredClone(approvedFinalPackages[0]) : process.env.SYNTHETIC_ORIGINALS_SUITE === '1' ? syntheticOriginalPackage() : syntheticFinalPackage(), p = external ? (()=>{const {sha256: old,...b}=basePackage;void old;const next={...b,deliveryDocumentPolicy:'EXTERNAL_TRANSFER_AND_RECEIPT_V1' as const};return {...next,sha256:packageHash(next)};})() : basePackage, runtime = productionRuntimeForEmulator(db, admin.auth(), [p], [actor]), bucket = await getBudgetDocumentationBucket();
    assert.throws(() => productionRuntime(db, admin.auth()), /PRODUCTION_RUNTIME_INVALID/);
    assert.throws(() => runtimeData({} as never), /SERVER_PRODUCTION_CONTEXT_REQUIRED/);
    const original = process.env.GCLOUD_PROJECT;
    process.env.GCLOUD_PROJECT = 'negocio-facil-page';
    assert.throws(() => runtimeData(runtime), /LOCAL_ONLY/);
    process.env.GCLOUD_PROJECT = original;
    pass('OPAQUE_CONTEXT_AND_NO_PRODUCTIVE_TEST_OVERRIDE');
    const ownerApproval = process.env.SYNTHETIC_OWNER_APPROVAL_SUITE === '1';
    const approvalId = randomUUID(), professionalApproval = { commandId: approvalId, packageId: p.id, packageHash: p.sha256, approvalDate: argentinaBusinessDate(), professional: 'Profesional sintético NO REAL', validationReference: 'SYNTHETIC_ONLY', sourceReference: 'scripts/helpers/productionAdapterFixtures.ts', confirmed: true };
    const approval = ownerApproval ? { commandId: approvalId, packageId: p.id, packageHash: p.sha256, approvalBasis: 'OWNER_AUTHORIZATION', reason: 'Autorización de titular SINTÉTICA, sin efectos reales', confirmed: true } : professionalApproval;
    await assert.rejects(recordFinalPackageApproval(runtime, { ...approval, packageHash: '0'.repeat(64) }, actor));
    await recordFinalPackageApproval(runtime, approval, actor);
    assert((await recordFinalPackageApproval(runtime, approval, actor)).replay);
    await assert.rejects(recordFinalPackageApproval(runtime, { ...approval, ...(ownerApproval ? { reason: 'Otro motivo' } : { professional: 'diferente' }) }, actor));
    pass('EXACT_PACKAGE_APPROVAL_IDEMPOTENCY');
    if (ownerApproval) {
        const stored = await packageApprovalRef(db, approvalId).get();
        assert.equal(stored.data()!.schemaVersion, 'EXACT_OWNER_PACKAGE_APPROVAL_V2');
        assert.equal(stored.data()!.status, 'OWNER_AUTHORIZED');
        for (const field of ['professional','validationReference','sourceReference']) assert.equal(field in stored.data()!, false);
        assert.equal(stored.data()!.actor, actor);
        await assert.rejects(recordFinalPackageApproval(runtime, {...approval, confirmed:false}, actor));
        await assert.rejects(recordFinalPackageApproval(runtime, {...approval, professional:'No permitido'}, actor));
        const concurrent = {...approval, commandId:randomUUID()};
        const pair=await Promise.all([recordFinalPackageApproval(runtime,concurrent,actor),recordFinalPackageApproval(runtime,concurrent,actor)]);
        assert.equal(pair.filter(r=>!r.replay).length,1);
        mock.timers.enable({apis:['Date'],now:Date.now()+86400000});
        try { assert((await recordFinalPackageApproval(runtime,approval,actor)).replay); } finally { mock.timers.reset(); }
        assert((await packageApprovalRef(db,approvalId).get()).updateTime!.isEqual(stored.updateTime!));
        const fake=packageApprovalRef(db,randomUUID());await fake.create({...stored.data()!,status:'PROFESSIONAL_VERSION_IDENTIFIED'});
        await assert.rejects(db.runTransaction(tx=>approvedPackage(runtime,tx,p.id,fake.id)),/APPROVAL_REQUIRED/);
        const tampered=packageApprovalRef(db,randomUUID());await tampered.create({...stored.data()!,reason:'Alterado'});
        await assert.rejects(db.runTransaction(tx=>approvedPackage(runtime,tx,p.id,tampered.id)),/INTEGRITY/);
        const outsider=(await admin.auth().createUser({email:'owner-outsider@example.test',emailVerified:true})).uid;
        await assert.rejects(recordFinalPackageApproval(runtime,{...approval,commandId:randomUUID()},outsider),/NOT_AUTHORIZED/);
        pass('OWNER_ONLY_APPROVAL_NO_PROFESSIONAL_REPLAY_NEXT_DAY_CONCURRENT_ROLE_TAMPER_AND_NO_UPGRADE');
    }

    // Simulate a previously installed immutable package, never replace its bytes.
    const oldBody = { ...p, id: 'synthetic-archived-renderer', rendererHash: 'a'.repeat(64) };
    const { sha256: discardedHash, ...oldPayload } = oldBody; void discardedHash;
    const oldPackage = { ...oldPayload, sha256: packageHash(oldPayload) };
    const historicalRuntime = productionRuntimeForEmulator(db, admin.auth(), [p, oldPackage], [actor]);
    const oldApprovalId = randomUUID(), archivedApproval = { ...approval, commandId: oldApprovalId, packageId: oldPackage.id, packageHash: oldPackage.sha256 };
    await assert.rejects(recordFinalPackageApproval(historicalRuntime, archivedApproval, actor), /RENDERER_VERSION_MISMATCH/);
    assert.equal((await packageApprovalRef(db, oldApprovalId).get()).exists, false);
    const priorApproval = (await packageApprovalRef(db, approvalId).get()).data()!;
    const { digest: discardedDigest, schemaVersion, status, at, ...oldApprovalBody } = priorApproval; void discardedDigest;
    const historicalBody = { ...oldApprovalBody, packageId: oldPackage.id, packageHash: oldPackage.sha256, rendererHash: oldPackage.rendererHash };
    // Fixture of a previously valid version. Production APIs cannot create this.
    await packageApprovalRef(db, oldApprovalId).create({ schemaVersion, status, at, ...historicalBody, digest: contractValueHash(historicalBody) });
    const historicalBefore = (await packageApprovalRef(db, oldApprovalId).get()).updateTime!.toMillis();
    assert.equal((await db.runTransaction(tx => approvedPackage(historicalRuntime, tx, oldPackage.id, oldApprovalId, false))).package.sha256, oldPackage.sha256);
    assert.equal((await packageApprovalRef(db, oldApprovalId).get()).updateTime!.toMillis(), historicalBefore);
    assert.throws(() => assertFinalRenderer(oldPackage), /RENDERER_VERSION_MISMATCH/);
    pass('ARCHIVED_PACKAGE_READS_PRESERVE_HASHES_AND_NEW_ISSUANCE_REJECTS_OLD_RENDERER');
    await packageApprovalRef(db, oldApprovalId).collection('revocations').doc('current').create({ reason: 'Synthetic revocation only' });
    await assert.rejects(db.runTransaction(tx => approvedPackage(historicalRuntime, tx, oldPackage.id, oldApprovalId)), /APPROVAL_REVOKED/);
    await db.runTransaction(tx => approvedPackage(historicalRuntime, tx, oldPackage.id, oldApprovalId, false));
    pass('PACKAGE_REVOCATION_BLOCKS_WRITES_PRESERVES_IMMUTABLE_READ');
    productionRuntimeForEmulator(db, admin.auth(), [p], [actor]);

    const f = await productionReadyFixture(actor, process.env.SYNTHETIC_ORIGINALS_SUITE === '1'), id = f.id, v = 1, sourceBefore = contractValueHash({ b: (await f.r.budget.get()).data(), a: (await f.r.acceptance.get()).data() });
    const grant = { commandId: randomUUID(), operationId: f.identity.operationId, expectedRevision: f.ready.revision, packageId: p.id, approvalId, formal: { ...(p.originalsPolicy ? syntheticOriginalFormal : {}), contractIssueDate: argentinaBusinessDate(), contractIssuePlace: 'Lugar ficticio', promissoryNoteIssueDate: argentinaBusinessDate(), promissoryNoteIssuePlace: 'Lugar ficticio' }, scopes: [...scopes], expiresAt: new Date(Date.now() + 86400000).toISOString(), reason: 'Autorización sintética de prueba, sin efectos reales', confirmed: true };
    await assert.rejects(authorizeOperation(runtime, id, v, grant, f.uid));
    await admin.auth().updateUser(actor, { emailVerified: false });
    await assert.rejects(authorizeOperation(runtime, id, v, grant, actor));
    await admin.auth().updateUser(actor, { emailVerified: true });
    const denied = await productionReadyFixture(actor, process.env.SYNTHETIC_ORIGINALS_SUITE === '1');
    const consent = denied.r.draft.collection('conformity').doc('current'), saved = (await consent.get()).data()!;
    await consent.update({ confirmedDigest: '0'.repeat(64) });
    await assert.rejects(authorizeOperation(runtime, denied.id, 1, { ...grant, commandId: randomUUID(), operationId: denied.identity.operationId, expectedRevision: denied.ready.revision }, actor));
    await consent.set(saved);
    pass('ROLE_EMAIL_AND_CURRENT_CONFORMITY_REQUIRED');
    const authorized = await authorizeOperation(runtime, id, v, grant, actor);
    assert((await authorizeOperation(runtime, id, v, grant, actor)).replay);
    await assert.rejects(authorizeOperation(runtime, id, v, { ...grant, reason: 'diferente' }, actor));
    const freeze = { commandId: randomUUID(), authorizationId: authorized.id, expectedRevision: f.ready.revision, confirmed: true };
    await assert.rejects(freezeOperation(runtime, id, v, freeze, actor), /COUNTER_AUTHORIZATION_REQUIRED/);
    assert.equal((await db.collection(productionPaths.snapshots).get()).size, 0);
    await db.doc(productionPaths.counter).create({ schemaVersion: 'CONTRACT_NUMBER_COUNTER_V1', policyId: 'CONTRACT_NUMBERING_V1', executionMode: 'PRODUCTION', active: true, lastAllocatedSequence: '0', initializationAuthorizationReference: 'SYNTHETIC_COUNTER_ONLY' });
    const frozen = await Promise.all([freezeOperation(runtime, id, v, freeze, actor), freezeOperation(runtime, id, v, freeze, actor)]);
    assert.equal(frozen.filter(x => !x.replay).length, 1);
    assert.equal(frozen[0].snapshotHash, frozen[1].snapshotHash);
    assert.equal((await db.collection(productionPaths.snapshots).get()).size, 1);
    assert.equal((await db.doc(productionPaths.counter).get()).data()!.lastAllocatedSequence, '1');
    const stamp = (await f.r.draft.get()).updateTime!.toMillis();
    await freezeOperation(runtime, id, v, freeze, actor);
    assert.equal((await f.r.draft.get()).updateTime!.toMillis(), stamp);
    await assert.rejects(freezeOperation(runtime, id, v, { ...freeze, expectedRevision: 0 }, actor));
    pass('ATOMIC_FREEZE_NUMBERING_CONCURRENT_REPLAY');
    const proof = await db.runTransaction(tx => frozenOperation(runtime, tx, id, v, 'ISSUANCE'));
    assert.equal(proof.snapshot.economicTerms.contractTotal, 1740000);
    assert.equal(proof.snapshot.economicTerms.capitalAmount, 580000);
    assert.equal(proof.snapshot.economicTerms.serviceAmount, 1160000);
    assert.equal(proof.snapshot.paymentSchedule.installments.length, 12);
    assert(proof.snapshot.paymentSchedule.installments.every(x => x.amount === 145000));
    pass('PERSISTED_ECONOMICS_12_INSTALLMENTS_NO_ADDITIONAL_VAT');
    const snapshotRef = db.collection(productionPaths.snapshots).doc(proof.snapshot.contractSnapshotId), originalSnapshot = (await snapshotRef.get()).data()!;
    await snapshotRef.update({ 'economicTerms.contractTotal': 1740001 });
    await assert.rejects(db.runTransaction(tx => frozenOperation(runtime, tx, id, v, 'ISSUANCE')));
    await snapshotRef.set(originalSnapshot);
    await assert.rejects(freezeOperation(runtime, id, v, { ...freeze, commandId: randomUUID() }, actor));
    assert.equal((await db.doc(productionPaths.counter).get()).data()!.lastAllocatedSequence, '1');
    pass('ALTERED_SNAPSHOT_AND_SECOND_FREEZE_REJECTED');
    // A failed object transfer cannot publish a partial document manifest. Keep and recover the reservation.
    const brokenBucket = new Proxy(bucket, { get(target, key) { if (key === 'file')
            return (...args: Parameters<typeof bucket.file>) => { const file = target.file(...args); return new Proxy(file, { get(f, k) { if (k === 'save' && !args[0].endsWith('issued_' + contractValueHash({ snapshot: proof.snapshot.integrity.payloadHash, kind: 'MANDATE' })))
                    return async () => { throw Error('SYNTHETIC_DOWNLOAD_UNAVAILABLE'); }; const value = Reflect.get(f, k); return typeof value === 'function' ? value.bind(f) : value; } }); }; const value = Reflect.get(target, key); return typeof value === 'function' ? value.bind(target) : value; } });
    await assert.rejects(issueDocuments(runtime, brokenBucket, id, v, actor), /SYNTHETIC_DOWNLOAD_UNAVAILABLE/);
    assert.equal((await productionRef(db, id, v).collection('documents').doc('issued').get()).exists, false);
    pass('INTERRUPTED_ISSUANCE_RETAINS_RESERVATION_WITHOUT_PARTIAL_MANIFEST');
    const frozenPaths = [snapshotRef, f.r.draft, db.doc(productionPaths.counter), db.collection(productionPaths.numbers).doc(proof.snapshot.contractNumber), productionRef(db,id,v).collection('authorizations').doc(grant.commandId)];
    const immutableBefore = await Promise.all(frozenPaths.map(async ref => { const d = await ref.get(); return { path:ref.path, data:contractValueHash(d.data()), updateTime:d.updateTime!.toDate().toISOString() }; }));
    const photos = operationRef(db,id,v).parent.doc('delivery').collection('photos');
    const firstPhoto = (await photos.where('kind','==','MANDATE').get()).docs[0];
    assert.equal(firstPhoto.data().state,'COMMITTED');
    const existingFile = bucket.file(firstPhoto.data().path), existingMetadata = (await existingFile.getMetadata())[0], firstPhotoStamp = firstPhoto.updateTime.toMillis();
    const recoveryInput = { commandId:randomUUID(), snapshotHash:proof.snapshot.integrity.payloadHash, authorizationId:grant.commandId, expiresAt:new Date(Date.parse(grant.expiresAt)+60000).toISOString(), reason:'Recuperación sintética autorizada; no nuevos instrumentos', confirmed:true };
    await assert.rejects(authorizeIssuanceRecovery(runtime,id,v,{...recoveryInput,expiresAt:new Date(Date.now()+60000).toISOString()},actor),/STILL_VALID/);
    mock.timers.enable({ apis:['Date'], now:Date.parse(grant.expiresAt)+1000 });
    let recoveryId='';
    try {
        await assert.rejects(issueDocuments(runtime,bucket,id,v,actor),/EXPIRED_OR_REVOKED/);
        await assert.rejects(authorizeIssuanceRecovery(runtime,id,v,recoveryInput,f.uid),/ADMIN_NOT_AUTHORIZED/);
        await assert.rejects(authorizeIssuanceRecovery(runtime,id,v,{...recoveryInput,snapshotHash:'0'.repeat(64)},actor),/CONTEXT_CHANGED/);
        await assert.rejects(authorizeIssuanceRecovery(runtime,id,v,{...recoveryInput,expiresAt:new Date(Date.now()+86400001).toISOString()},actor),/EXPIRY_INVALID/);
        const recoveries = await Promise.all([authorizeIssuanceRecovery(runtime,id,v,recoveryInput,actor),authorizeIssuanceRecovery(runtime,id,v,recoveryInput,actor)]);
        assert.equal(recoveries.filter(x=>!x.replay).length,1);
        recoveryId=recoveries[0].id;
        await assert.rejects(authorizeIssuanceRecovery(runtime,id,v,{...recoveryInput,reason:'otro'},actor),/COMMAND_CONFLICT/);
        await assert.rejects(issueDocuments(runtime,bucket,id,v,actor,randomUUID()),/RECOVERY_REQUIRED/);
        await assert.rejects(db.runTransaction(tx=>issuanceProof(runtime,tx,denied.id,1,recoveryId)),/SNAPSHOT_REQUIRED/);
        pass('P1_EXPIRY_REQUIRES_EXPLICIT_HASH_BOUND_RECOVERY_ADMIN_AND_CONCURRENT_IDEMPOTENCY');
        const rev={commandId:randomUUID(),recoveryId,reason:'Revocación sintética de recuperación'};
        await revokeIssuanceRecovery(runtime,id,v,rev,actor);
        assert((await revokeIssuanceRecovery(runtime,id,v,rev,actor)).replay);
        await assert.rejects(revokeIssuanceRecovery(runtime,id,v,{...rev,reason:'distinto'},actor),/COMMAND_CONFLICT/);
        await assert.rejects(issueDocuments(runtime,bucket,id,v,actor,recoveryId),/RECOVERY_EXPIRED_OR_REVOKED/);
        const renewed={...recoveryInput,commandId:randomUUID()};
        recoveryId=(await authorizeIssuanceRecovery(runtime,id,v,renewed,actor)).id;
        mock.timers.setTime(Date.parse(recoveryInput.expiresAt));
        await assert.rejects(issueDocuments(runtime,bucket,id,v,actor,recoveryId),/RECOVERY_EXPIRED_OR_REVOKED/);
        mock.timers.setTime(Date.parse(grant.expiresAt)+2000);
        pass('P1_RECOVERY_REVOCATION_AND_EXPIRY_FAIL_CLOSED');
        const issued=await Promise.all([issueDocuments(runtime,bucket,id,v,actor,recoveryId),issueDocuments(runtime,bucket,id,v,actor,recoveryId)]);
        assert.equal(issued.filter(x=>!x.replay).length,1);
        assert.equal(issued[0].manifestHash,issued[1].manifestHash);
        const manifestRef=productionRef(db,id,v).collection('documents').doc('issued'), stamp=(await manifestRef.get()).updateTime!.toMillis();
        mock.timers.setTime(Date.parse(recoveryInput.expiresAt)+1000);
        assert((await issueDocuments(runtime,bucket,id,v,actor,recoveryId)).replay);
        assert.equal((await manifestRef.get()).updateTime!.toMillis(),stamp);
        await assert.rejects(authorizeIssuanceRecovery(runtime,id,v,{...renewed,commandId:randomUUID(),expiresAt:new Date(Date.now()+60000).toISOString()},actor),/ALREADY_ISSUED/);
        assert.equal((await manifestRef.get()).data()!.recoveryAuthorization.id,recoveryId);
        assert.equal((await existingFile.getMetadata())[0].generation,existingMetadata.generation);
        assert.equal((await firstPhoto.ref.get()).updateTime!.toMillis(),firstPhotoStamp);
        assert.deepEqual(await Promise.all(frozenPaths.map(async ref=>{const d=await ref.get();return {path:ref.path,data:contractValueHash(d.data()),updateTime:d.updateTime!.toDate().toISOString()};})),immutableBefore);
        assert.equal((await productionRef(db,id,v).collection('documents').get()).size,1);
        assert.equal((await productionRef(db,id,v).collection('events').where('action','==','DOCUMENTS_ISSUED').get()).size,1);
        pass('P1_RECOVERED_CONCURRENT_SINGLE_NOTE_REPLAY_IMMUTABLE_DATES_HASHES_AND_NUMBER');
    } finally { mock.timers.reset(); }

    const manifest = await db.runTransaction(tx => issuedOperation(runtime, tx, id, v, 'ISSUANCE'));
    const fileCount = (await bucket.getFiles({ prefix: `operation-delivery-v2/${id}/v1/issued_` }))[0].length;
    assert.equal(fileCount, external?2:3);
    await issueDocuments(runtime, bucket, id, v, actor);
    assert.equal((await bucket.getFiles({ prefix: `operation-delivery-v2/${id}/v1/issued_` }))[0].length, external?2:3);
    mkdirSync(dir, { recursive: true });
    for (const kind of issuedDocumentKinds(p)) {
        const bytes = await readIssuedDocument(runtime, bucket, id, v, kind, actor);
        writeFileSync(`${dir}/${kind}.pdf`, bytes);
        assert(bytes.subarray(0, 4).toString() === '%PDF');
        const p = manifest.manifest.documents[kind], meta = (await bucket.file(p.path).getMetadata())[0];
        assert.equal(meta.metadata?.firebaseStorageDownloadTokens, undefined);
    }
    pass(external?'TWO_PRIVATE_DOCUMENTS_INTERNAL_REMITO_DISABLED':'THREE_PRIVATE_IMMUTABLE_DOCUMENTS_NO_DUPLICATE_NOTE');
    const delivery = async (action: string, data: Record<string, unknown>, as = f.root) => { const s = (await readDelivery(db, id, v, as)).state; return deliveryCommand(db, id, v, { action, data, operationId: f.identity.operationId, expectedRevision: s.revision, commandId: randomUUID() }, as); };
    await assert.rejects(saveDeliveryPhoto(db, bucket, id, v, randomUUID(), 'MANDATE_PREPARED', '', syntheticPng, 'image/png', f.root));
    await delivery('PREPARE_DELIVERY', { responsible: f.holder });
    for (const k of issuedDocumentKinds(p)) {
        const doc = manifest.manifest.documents[k];
        await delivery('PREPARE_DOCUMENT', { kind: k, photoId: doc.photoId, reference: proof.snapshot.contractNumber, templateVersion: doc.templateVersion });
        if (k !== 'REMITO') {
            const signed = randomUUID();
            await saveDeliveryPhoto(db, bucket, id, v, signed, `${k}_SIGNED`, doc.photoId, syntheticPng, 'image/png', f.root);
            await delivery('VERIFY_SIGNATURE', { kind: k, photoId: signed, clientSigned: true, legible: true, identityChecked: true, loopSigned: false, signedAt: new Date().toISOString() });
        }
    }
    await assert.rejects(delivery('CONFIRM_DELIVERY', { occurredAt: new Date().toISOString() }, { uid: f.uid, admin: false }));
    if(external){
        await assert.rejects(readIssuedDocument(runtime,bucket,id,v,'REMITO',actor),/NOT_ISSUED/);
        const transfer=randomUUID(), receipt=randomUUID();
        await assert.rejects(saveDeliveryPhoto(db,bucket,id,v,transfer,'EXTERNAL_TRANSFER','another-snapshot',syntheticPng,'image/png',f.root));
        await saveDeliveryPhoto(db,bucket,id,v,transfer,'EXTERNAL_TRANSFER',proof.snapshot.integrity.payloadHash,syntheticPng,'image/png',f.root);
        const register={photoId:transfer,number:'TEST-EXTERNAL-001',date:argentinaBusinessDate(),issuer:'Emisor externo sintético',documentType:'REMITO',applicabilityReference:'Documento de traslado sintético, no comprobante fiscal real',customerChecked:true,productChecked:true};
        await assert.rejects(delivery('REGISTER_EXTERNAL_TRANSFER',{...register,customerChecked:false}));
        await assert.rejects(delivery('REGISTER_EXTERNAL_TRANSFER',register,{uid:f.uid,admin:false}));
        await delivery('REGISTER_EXTERNAL_TRANSFER',register);
        await assert.rejects(delivery('CONFIRM_DELIVERY',{occurredAt:new Date().toISOString()},{uid:f.uid,admin:false}));
        await saveDeliveryPhoto(db,bucket,id,v,receipt,'DELIVERY_RECEIPT',transfer,syntheticPng,'image/png',f.root);
        await assert.rejects(delivery('VERIFY_DELIVERY_RECEIPT',{photoId:receipt,receivedAt:new Date().toISOString(),observations:'Sólo prueba',clientSigned:false,identityChecked:true,productChecked:true,legible:true}));
        await delivery('VERIFY_DELIVERY_RECEIPT',{photoId:receipt,receivedAt:new Date().toISOString(),observations:'Recepción sintética, sin efectos reales',clientSigned:true,identityChecked:true,productChecked:true,legible:true});
        pass('EXTERNAL_DOCUMENT_CONTEXT_ROLE_AND_SIGNED_RECEIPT_REQUIRED');
    }else{
    const k = 'REMITO', signed = randomUUID(), doc = manifest.manifest.documents[k];
    await saveDeliveryPhoto(db, bucket, id, v, signed, `${k}_SIGNED`, doc.photoId, syntheticPng, 'image/png', f.root);
    await delivery('VERIFY_SIGNATURE', { kind: k, photoId: signed, clientSigned: true, legible: true, identityChecked: true, loopSigned: false, signedAt: new Date().toISOString() });
    }
    await assert.rejects(delivery('CONFIRM_DELIVERY', { occurredAt: new Date().toISOString() }, { uid: f.uid, admin: false }));
    await delivery('RECEIVE_ORIGINALS', { holder: f.holder, location: 'Archivo físico sintético', receivedAt: new Date().toISOString(), reference: 'TEST', alternativeEvidence: 'SYNTHETIC ONLY' });
    await delivery('CONFIRM_DELIVERY', { occurredAt: new Date().toISOString() }, { uid: f.uid, admin: false });
    assert.equal((await readDelivery(db, id, v, f.root)).state.status, 'DELIVERED');
    pass(external?'TWO_SIGNATURES_EXTERNAL_RECEIPT_ORIGINALS_REQUIRED':'THREE_SIGNATURES_ORIGINALS_CUSTODY_REQUIRED_BEFORE_DELIVERY');
    const deliveredBefore = contractValueHash((await readDelivery(db,id,v,f.root)).state.event);
    await delivery('AUTHORIZE_ORIGINALS_TRANSFER', { to: { role: 'DEPOT', uid: actor, affiliateId: null }, occurredAt: new Date().toISOString(), location: 'Archivo administrativo sintético', reason: 'Retorno sintético de originales después de entrega' });
    const transfer = (await readDelivery(db,id,v,f.root)).state.originalsTransfer!;
    assert(transfer, 'An authorized pending transfer must remain readable');
    await assert.rejects(financialCommand(db,id,v,{action:'ACTIVATE',data:{},commandId:randomUUID(),operationId:f.identity.operationId,expectedRevision:0},f.root), /DELIVERY_REQUIRED/);
    await assert.rejects(delivery('CONFIRM_ORIGINALS_RECEIPT', { transferId: transfer.id }, { uid:f.uid2,admin:false }));
    await delivery('CONFIRM_ORIGINALS_DELIVERY', { transferId: transfer.id }, { uid:f.uid,admin:false });
    await delivery('CONFIRM_ORIGINALS_RECEIPT', { transferId: transfer.id });
    const transferred = (await readDelivery(db,id,v,f.root)).state;
    assert.equal(transferred.originalsTransfer,null);
    assert.equal(transferred.originals!.holder.uid,actor);
    assert.equal(contractValueHash(transferred.event), deliveredBefore, 'Original delivery evidence stays immutable');
    pass('POST_DELIVERY_ORIGINALS_TRANSFER_READABLE_CONFIRMABLE_WITH_FINANCE_GATED');

    const input = async (action: string, data: Record<string, unknown>) => ({ action, data, commandId: randomUUID(), operationId: f.identity.operationId, expectedRevision: (await financialRef(db, id, v).get()).data()?.revision ?? 0 });
    const activate = await input('ACTIVATE', {}), act = await Promise.all([financialCommand(db, id, v, activate, f.root), financialCommand(db, id, v, activate, f.root)]);
    assert.equal(act.filter(x => !x.replay).length, 1);
    await assert.rejects(financialCommand(db, id, v, await input('ACTIVATE', {}), f.root));
    pass('UNIQUE_FINANCIAL_ACTIVATION');
    const client = (await admin.auth().createUser({ email: 'production-adapter-client@example.test', password: 'Emulator-only-123', emailVerified: true })).uid;
    const bind = async (action: string, data: Record<string, unknown>) => clientBindingCommand(db, id, v, { action, data, commandId: randomUUID(), operationId: f.identity.operationId, expectedRevision: (await readClientBinding(db, id, v, actor)).state.revision }, actor);
    await bind('LINK', { uid: client, reason: 'Vínculo sintético explícito' });
    const token = randomBytes(32).toString('base64url'), invite = await bind('INVITE', { email: 'production-adapter-client@example.test', token });
    // Both domain proof and the existing HTTP route must reject unauthorized callers.
    const {assertClientInvitationHttpAccess}=await import('../src/lib/operationClientV2Server');
    await assert.rejects(assertClientInvitationHttpAccess(db,invite.invitationId!,token));
    await assert.rejects(assertClientInvitationHttpAccess(db,invite.invitationId!,token,f.uid));
    await assert.rejects(assertClientInvitationHttpAccess(db,invite.invitationId!,'X'.repeat(43),client));
    await admin.auth().updateUser(client,{emailVerified:false});
    await assert.rejects(assertClientInvitationHttpAccess(db,invite.invitationId!,token,client));
    await admin.auth().updateUser(client,{emailVerified:true,disabled:true});
    await assert.rejects(assertClientInvitationHttpAccess(db,invite.invitationId!,token,client));
    await admin.auth().updateUser(client,{disabled:false});
    await assertClientInvitationHttpAccess(db,invite.invitationId!,token,client);
    pass('INVITATION_HTTP_BOUNDARY_EXPLICIT_UID_VERIFIED_AUTH_AND_DELIVERY');
    const {POST:invitationPost}=await import('../src/app/api/public/client-invitations/[invitationId]/route');
    async function emulatorToken(uid:string){
        const custom=await admin.auth().createCustomToken(uid);
        const response=await fetch('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=demo-key',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token:custom,returnSecureToken:true})});
        assert.equal(response.status,200);return (await response.json()).idToken as string;
    }
    const clientToken=await emulatorToken(client),affiliateToken=await emulatorToken(f.uid);
    const adminToken=await emulatorToken(actor), { POST:productionPost, GET:productionGet }=await import('../src/app/api/admin/presupuestos-v2/[budgetId]/versions/[version]/production/route');
    const params={params:Promise.resolve({budgetId:id,version:'1'})}, endpoint=`http://localhost:3000/api/admin/presupuestos-v2/${id}/versions/1/production`;
    const recoveryHttp=(auth?:string,recovery:unknown=recoveryId)=>productionPost(new Request(endpoint,{method:'POST',headers:{'Content-Type':'application/json',...(auth?{Authorization:'Bearer '+auth}:{})},body:JSON.stringify({action:'RECOVER_DOCUMENTS',data:{confirmed:true,recoveryId:recovery}})}),params);
    assert.equal((await recoveryHttp()).status,403);
    assert.equal((await recoveryHttp(affiliateToken)).status,403);
    assert.equal((await recoveryHttp(clientToken)).status,403);
    assert.equal((await recoveryHttp(adminToken,'')).status,409);
    assert.equal((await recoveryHttp(adminToken,null)).status,409);
    assert.equal((await recoveryHttp(adminToken)).status,200);
    assert.equal((await productionGet(new Request(endpoint+'?approvalAfter=../foreign',{headers:{Authorization:'Bearer '+adminToken}}),params)).status,409);
    assert.equal((await productionGet(new Request(endpoint+'?approvalAfter=a&approvalAfter=b',{headers:{Authorization:'Bearer '+adminToken}}),params)).status,409);
    assert.equal((await productionGet(new Request(endpoint,{headers:{Authorization:'Bearer '+affiliateToken}}),params)).status,403);
    pass('RECOVERY_HTTP_ADMIN_ONLY_STRICT_IDS_AND_HISTORY_QUERY_VALIDATION');

    const invoke=(body:Record<string,unknown>,auth?:string)=>invitationPost(new Request('https://www.cuentahogar.com.ar/api/public/client-invitations/'+invite.invitationId,{method:'POST',headers:{'Content-Type':'application/json',Origin:'https://www.cuentahogar.com.ar',...(auth?{Authorization:'Bearer '+auth}:{})},body:JSON.stringify(body)}),{params:Promise.resolve({invitationId:invite.invitationId!})});
    const inspect={action:'INSPECT',token};
    assert.equal((await invoke(inspect)).status,403);
    assert.equal((await invoke(inspect,affiliateToken)).status,403);
    assert.equal((await invoke({...inspect,token:'X'.repeat(43)},clientToken)).status,403);
    await admin.auth().updateUser(client,{emailVerified:false});assert.equal((await invoke(inspect,clientToken)).status,403);
    await admin.auth().updateUser(client,{emailVerified:true,disabled:true});assert.equal((await invoke(inspect,clientToken)).status,403);
    await admin.auth().updateUser(client,{disabled:false});
    assert.equal((await invoke(inspect,clientToken)).status,200);
    const redeem={action:'REDEEM',token,commandId:randomUUID()};
    assert.equal((await invoke(redeem)).status,403);assert.equal((await invoke(redeem,affiliateToken)).status,403);
    const redeemed=await Promise.all([invoke(redeem,clientToken),invoke(redeem,clientToken)]);
    assert(redeemed.every(r=>r.status===200));const redeemedBodies=await Promise.all(redeemed.map(r=>r.json()));
    assert.equal(redeemedBodies.filter(r=>!r.replay).length,1);
    assert.equal((await invoke(inspect,clientToken)).status,403,'Consumed invitation cannot be inspected');
    assert.equal((await invoke({...redeem,commandId:randomUUID()},clientToken)).status,403,'Different intention cannot activate twice');
    pass('INVITATION_HTTP_AUTH_CONCURRENT_REPLAY_AND_NO_SECOND_ACTIVATION');
    assert.equal((await listClientServices(db, client)).length, 1);
    pass('EXPLICIT_CLIENT_UID_INVITATION_AFTER_DELIVERY');
    // Financial effectiveDate follows the existing ledger UTC calendar, unlike instrument issue dates.
    const payment = await input('CREDIT_PAYMENT', { paymentId: randomUUID(), amountCents: 14500000, effectiveDate: new Date().toISOString().slice(0,10), method: 'TRANSFERENCIA', reference: 'SYNTHETIC TEST PAYMENT' }), pays = await Promise.all([financialCommand(db, id, v, payment, f.root), financialCommand(db, id, v, payment, f.root)]);
    assert.equal(pays.filter(x => !x.replay).length, 1);
    assert.equal((await financialRef(db, id, v).collection('payments').get()).size, 1);
    for (const [role, uid] of [['ADMIN', actor], ['AFFILIATE', f.uid], ['CLIENT', client]] as const) {
        const view = await readFinancial(db, id, v, { uid, admin: role === 'ADMIN' }, role);
        assert(view.active);
        assert.equal(view.balanceCents, 159500000);
        assert.equal(view.paidInstallmentCount, 1);
        if (role !== 'ADMIN')
            assert.equal('capitalCents' in view, false);
    }
    pass('ONE_PAYMENT_SAME_BALANCE_THREE_ROLES');
    for (const [role, uid] of [['ADMIN', actor], ['AFFILIATE', f.uid], ['CLIENT', client]] as const) {
        const source = await readFinancialReceipt(db, id, v, { uid, admin: role === 'ADMIN' }, role, 'receipt_' + payment.data.paymentId);
        assert.equal(source.receipt.amountCents, 14500000);
        assert.equal(source.receipt.status, 'ACREDITADO');
        assert.equal(source.test, true);
        const bytes = financialReceiptPdf(source);
        if (role === 'ADMIN')
            writeFileSync(dir + '/RECIBO.pdf', bytes);
    }
    await assert.rejects(readFinancialReceipt(db, id, v, { uid: f.uid2, admin: false }, 'CLIENT', 'receipt_' + payment.data.paymentId));
    await admin.auth().updateUser(f.uid, { disabled: true });
    await assert.rejects(readFinancial(db, id, v, { uid: f.uid, admin: false }, 'AFFILIATE'));
    await admin.auth().updateUser(f.uid, { disabled: false });
    pass('PRIVATE_RECEIPTS_AND_DISABLED_ACCOUNT_DENIED');
    await assert.rejects(financialCommand(db, id, v, await input('CREDIT_PAYMENT', payment.data), { uid: f.uid, admin: false }));
    await assert.rejects(readFinancial(db, id, v, { uid: f.uid2, admin: false }, 'AFFILIATE'));
    await assert.rejects(readFinancial(db, id, v, { uid: f.uid2, admin: false }, 'CLIENT'));
    pass('CROSS_ROLE_AND_CROSS_ACCOUNT_DENIED');
    const reversal = await input('REVERSE_PAYMENT', { paymentId: payment.data.paymentId, reason: 'Reversa sintética' });
    await financialCommand(db, id, v, reversal, f.root);
    assert((await financialCommand(db, id, v, reversal, f.root)).replay);
    const full = await readFinancial(db, id, v, f.root, 'ADMIN');
    assert(full.active);
    assert.equal(full.balanceCents, 174000000);
    assert.equal(full.receipts[0].status, 'REVERSADO');
    pass('AUDITED_REVERSAL_RESTORES_ORIGINAL_BALANCE');
    const partial = await input('CREDIT_PAYMENT', { ...payment.data, paymentId: randomUUID(), amountCents: 5000000 });
    await financialCommand(db, id, v, partial, f.root);
    const pv = await readFinancial(db, id, v, f.root, 'ADMIN');
    assert(pv.active);
    assert.equal(pv.balanceCents, 169000000);
    assert.equal(pv.installments[0].status, 'PARCIAL');
    assert.equal(pv.installments[0].balanceCents, 9500000);
    const rest = await input('CREDIT_PAYMENT', { ...payment.data, paymentId: randomUUID(), amountCents: 9500000 });
    await financialCommand(db, id, v, rest, f.root);
    const rv = await readFinancial(db, id, v, f.root, 'ADMIN');
    assert(rv.active);
    assert.equal(rv.balanceCents, 159500000);
    assert.equal(rv.installments[0].status, 'PAGADA');
    await financialCommand(db, id, v, await input('REVERSE_PAYMENT', { paymentId: partial.data.paymentId, reason: 'Reversa parcial sintética' }), f.root);
    await financialCommand(db, id, v, await input('REVERSE_PAYMENT', { paymentId: rest.data.paymentId, reason: 'Reversa complemento sintético' }), f.root);
    pass('PARTIAL_PAYMENTS_FIFO_AND_EXACT_REVERSALS');
    await bind('REVOKE_ACCESS', { reason: 'Revocación sintética' });
    await assert.rejects(readFinancial(db, id, v, { uid: client, admin: false }, 'CLIENT'));
    assert.equal((await listClientServices(db, client)).length, 0);
    pass('CLIENT_REVOCATION_RECHECKED');
    await revokeAuthorization(runtime, id, v, { authorizationId: authorized.id, commandId: randomUUID(), reason: 'Pausa sintética' }, actor);
    await assert.rejects(financialCommand(db, id, v, await input('CREDIT_PAYMENT', { ...payment.data, paymentId: randomUUID() }), f.root));
    assert((await readFinancial(db, id, v, f.root, 'ADMIN')).active);
    await assert.rejects(authorizeIssuanceRecovery(runtime,id,v,{...recoveryInput,commandId:randomUUID(),expiresAt:new Date(Date.now()+60000).toISOString()},actor),/ORIGINAL_AUTHORIZATION_REVOKED/);
    pass('REVOKED_WRITE_AUTHORIZATION_PRESERVES_READ_HISTORY');
    assert.equal(sourceBefore, contractValueHash({ b: (await f.r.budget.get()).data(), a: (await f.r.acceptance.get()).data() }));
    assert.equal((await db.collection('operationsLabV1').get()).size, 0);
    assert.equal((await productionRef(db, id, v).collection('freezeCommands').get()).size, 1);
    pass('NO_LAB_MIGRATION_OR_ACCEPTANCE_REWRITE');
    // Exercise beyond both previous caps, with identical timestamps handled by document-ID cursors.
    for(let i=0;i<51;i++) await recordFinalPackageApproval(runtime,{...approval,commandId:randomUUID()},actor);
    for(let i=0;i<22;i++) await authorizeOperation(runtime,denied.id,1,{...grant,commandId:randomUUID(),operationId:denied.identity.operationId,expectedRevision:denied.ready.revision},actor);
    const historyIds=new Set<string>(), authIds=new Set<string>();
    let page:ProductionHistoryPage={};
    do {
        const view=await productionOverview(runtime,denied.id,1,actor,page);
        assert(view.approvalHistory.length<=20 && view.authorizations.length<=20);
        for(const a of view.approvalHistory){assert(!historyIds.has(a.id));historyIds.add(a.id);}
        if(!view.pagination.approvalAfter)break;
        page={approvalAfter:view.pagination.approvalAfter};
    } while(true);
    assert.equal(historyIds.size,(await packageApprovalRef(db,approvalId).parent.get()).size);
    page={};
    do {
        const view=await productionOverview(runtime,denied.id,1,actor,page);
        for(const a of view.authorizations){assert(!authIds.has(a.id));authIds.add(a.id);}
        if(!view.pagination.authorizationAfter)break;
        page={authorizationAfter:view.pagination.authorizationAfter};
    }while(true);
    assert.equal(authIds.size,22);
    await assert.rejects(productionOverview(runtime,id,v,f.uid),/ADMIN_REQUIRED/);
    await assert.rejects(productionOverview(runtime,id,v,actor,{approvalAfter:'../another-operation'}));
    await assert.rejects(productionOverview(runtime,id,v,actor,{unknown:'x'} as never));
    const recoveryView=await productionOverview(runtime,id,v,actor);
    assert.equal(recoveryView.recoveryAuthorizations.length,2);
    assert.equal(recoveryView.recoveryAuthorizations.filter(x=>x.revoked).length,1);
    pass('BOUNDED_HISTORY_ALL_APPROVALS_AND_AUTHORIZATIONS_ACCESSIBLE_NO_DUPLICATES');
    const replaced = manifest.manifest.documents.MANDATE;
    await bucket.file(replaced.path).save(Buffer.from('SYNTHETIC CORRUPTION ONLY'), { resumable: false });
    await assert.rejects(readIssuedDocument(runtime, bucket, id, v, 'MANDATE', actor));
    pass('REPLACED_DOCUMENT_GENERATION_BLOCKED');
    writeFileSync(dir + '/results.json', JSON.stringify({ suite: 'PRODUCTION_ADAPTER_ON_EMULATOR', results, productionWrites: 0, operationId: f.identity.operationId, snapshotHash: proof.snapshot.integrity.payloadHash, manifestHash: manifest.manifest.hash, economics: proof.snapshot.economicTerms, schedule: proof.snapshot.paymentSchedule.installments }, null, 2));
    console.log('PRODUCTION_ADAPTER_EMULATOR = PASS (' + Object.keys(results).length + ' groups)');
}
if (process.argv[1]?.endsWith('testProductionAdapterEmulator.ts'))
    test().then(() => admin.app().delete()).catch(e => { console.error(e); process.exitCode = 1; });
