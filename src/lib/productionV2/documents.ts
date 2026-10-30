import {issuedPdfFilename} from '../documentFilenames';
import {issuedManifestRef} from './documentRevisionState';
import { createHash } from 'node:crypto';
import type { Transaction } from 'firebase-admin/firestore';
import type { Bucket } from '@google-cloud/storage';
import { withPhotoUploadLease, recoverPhotoReservation } from '../operationPhotoRecoveryV2';
import { opaque } from '../contractV2';
import { contractValueHash } from '../contractIntegrityV2';
import { operationRef } from '../operationV2';
import { readVerifiedEvidenceObject, type EvidenceMetadata } from '../operationEvidenceV2';
import { productionRef, type ProductionScope } from './authorization';
import { frozenOperation } from './freeze';
import { issuanceProof } from './issuanceRecovery';
import { requireProductionActor, runtimeData, type ProductionRuntime } from './runtime';
import { finalDocumentKinds, issuedDocumentKinds, assertExternalProductionPackage, type FinalDocumentKind } from './catalog';
import { renderFinalDocument } from './pdf';
export interface IssuedDocument extends EvidenceMetadata {
    photoId: string;
    kind: FinalDocumentKind;
    templateId: string;
    templateVersion: string;
    templateHash: string;
    generation: string;
    state: 'COMMITTED';
    mime: 'application/pdf';
}
export interface IssuedManifest {
    schemaVersion: 'PRODUCTION_DOCUMENT_MANIFEST_V1';
    executionMode: 'PRODUCTION';
    operationId: string;
    snapshotId: string;
    snapshotHash: string;
    packageHash: string;
    documents: Record<FinalDocumentKind, IssuedDocument>;
    issuedAt: string;
    issuedBy: string;
    recoveryAuthorization?: { id: string; hash: string };
    hash: string;
}
export async function issuedOperation(runtime: ProductionRuntime, tx: Transaction, id: string, v: number, scope: ProductionScope, forWrite = true) {
    const { db } = runtimeData(runtime), proof = await frozenOperation(runtime, tx, id, v, scope, forWrite), saved = await tx.get(issuedManifestRef(db,id,v,proof.snapshot.snapshotVersion)), m = saved.data() as IssuedManifest | undefined;
    if (!m || m.schemaVersion !== 'PRODUCTION_DOCUMENT_MANIFEST_V1' || m.executionMode !== 'PRODUCTION' || m.operationId !== proof.identity.operationId || m.snapshotId !== proof.snapshot.contractSnapshotId || m.snapshotHash !== proof.snapshot.integrity.payloadHash || m.packageHash !== proof.package.sha256)
        throw Error('ISSUED_DOCUMENTS_REQUIRED');
    const { hash, ...payload } = m;
    if (Object.keys(m.documents).sort().join(',') !== [...issuedDocumentKinds(proof.package)].sort().join(',')) throw Error('ISSUED_DOCUMENT_SET_MISMATCH');
    if (hash !== contractValueHash(payload))
        throw Error('ISSUED_DOCUMENTS_INTEGRITY');
    if (m.recoveryAuthorization) {
        const recovered = await issuanceProof(runtime, tx, id, v, m.recoveryAuthorization.id, false);
        if (recovered.recovery?.hash !== m.recoveryAuthorization.hash) throw Error('ISSUED_RECOVERY_INTEGRITY');
    }
    for (const k of issuedDocumentKinds(proof.package)) {
        const p = m.documents[k], expectedId = 'issued_' + contractValueHash({ snapshot: m.snapshotHash, kind: k });
        if (!p || p.photoId !== expectedId || p.kind !== k || p.path !== `operation-delivery-v2/${id}/v${v}/${expectedId}` || p.state !== 'COMMITTED' || !p.generation || p.templateHash !== proof.package.templates[k].sha256 || p.templateVersion !== proof.package.templates[k].version || p.templateId !== proof.package.templates[k].id)
            throw Error('ISSUED_DOCUMENT_IDENTITY');
        const photo = (await tx.get(operationRef(db, id, v).parent.doc('delivery').collection('photos').doc(p.photoId))).data();
        if (!photo || photo.state !== 'COMMITTED' || photo.sha256 !== p.sha256 || photo.generation !== p.generation || photo.path !== p.path || photo.size !== p.size || photo.slot !== `${k}_PREPARED` || photo.relatedId !== '' || photo.snapshotHash !== m.snapshotHash)
            throw Error('ISSUED_PHOTO_INCONSISTENT');
    }
    return { ...proof, manifest: m };
}
export async function issueDocuments(runtime: ProductionRuntime, bucket: Bucket, id: string, v: number, actor: string, recoveryId?: string) {
    const { db, test } = await requireProductionActor(runtime, actor);
    // A completed command is a read-only replay, even after expiry. No leases,
    // object regeneration, dates or updateTime changes for an existing issuance.
    const completed = await db.runTransaction(async tx => {
        const proof=await frozenOperation(runtime,tx,id,v,'ISSUANCE',false);
        if (!(await tx.get(issuedManifestRef(db,id,v,proof.snapshot.snapshotVersion))).exists) return null;
        await issuanceProof(runtime, tx, id, v, recoveryId, false);
        return (await issuedOperation(runtime, tx, id, v, 'ISSUANCE', false)).manifest;
    });
    if (completed) {
        for (const doc of Object.values(completed.documents)) await readVerifiedEvidenceObject(bucket, doc);
        return { manifestHash: completed.hash, replay: true };
    }
    const proof = await db.runTransaction(tx => issuanceProof(runtime, tx, id, v, recoveryId));
    if (!test) assertExternalProductionPackage(proof.package);
    // Rendering and all Storage reads/writes occur outside transactions. Deterministic
    // bytes + create-only object paths recover interruptions without issuing a second note.
    const documents = {} as Record<FinalDocumentKind, IssuedDocument>;
    for (const k of issuedDocumentKinds(proof.package)) {
        const pdf = renderFinalDocument(proof.snapshot, proof.package, k, test), photoId = 'issued_' + contractValueHash({ snapshot: proof.snapshot.integrity.payloadHash, kind: k }), path = `operation-delivery-v2/${id}/v${v}/${photoId}`, file = bucket.file(path);
        const ref = operationRef(db, id, v).parent.doc('delivery').collection('photos').doc(photoId), base = { photoId, kind: k, path, sha256: pdf.sha256, size: pdf.bytes.length, mime: 'application/pdf' as const, templateId: proof.package.templates[k].id, templateVersion: proof.package.templates[k].version, templateHash: proof.package.templates[k].sha256, slot: `${k}_PREPARED`, relatedId: '', actor: proof.snapshot.freeze.termsFrozenBy, createdAt: proof.snapshot.freeze.termsFrozenAt, snapshotHash: proof.snapshot.integrity.payloadHash };
        const allowed = async (tx: Transaction) => { const current = await issuanceProof(runtime, tx, id, v, recoveryId); if (current.snapshot.integrity.payloadHash !== proof.snapshot.integrity.payloadHash)
            throw Error('DOCUMENT_CONTEXT_CHANGED'); };
        await db.runTransaction(async (tx) => { await allowed(tx); const prior = await tx.get(ref); if (prior.exists) {
            for (const [key, value] of Object.entries(base))
                if (prior.data()![key] !== value)
                    throw Error('ISSUED_DOCUMENT_COLLISION');
        }
        else
            tx.create(ref, { ...base, state: 'PENDING' }); });
        for (let attempt = 0;; attempt++) {
            try {
                await withPhotoUploadLease(db, ref, allowed, async (mayCreate) => {
                    let exists = false;
                    try {
                        await file.getMetadata();
                        exists = true;
                    }
                    catch (e) {
                        if ((e as {
                            code?: number;
                        }).code !== 404)
                            throw e;
                    }
                    if (!exists && !mayCreate)
                        throw Error('ISSUED_OBJECT_MISSING');
                    if (!exists) {
                        try {
                            await file.save(pdf.bytes, { resumable: false, preconditionOpts: { ifGenerationMatch: 0 }, metadata: { contentType: 'application/pdf', cacheControl: 'private, no-store' } });
                        }
                        catch (e) {
                            if ((e as {
                                code?: number;
                            }).code !== 412)
                                throw e;
                        }
                    }
                    const [m] = await file.getMetadata();
                    if (m.metadata?.firebaseStorageDownloadTokens)
                        throw Error('ISSUED_OBJECT_MUST_BE_PRIVATE');
                    await recoverPhotoReservation(db, bucket, ref, actor, allowed);
                });
                break;
            }
            catch (e) {
                if (!(e instanceof Error) || e.message !== 'Carga en curso; reintentá el mismo archivo en unos instantes.' || attempt >= 120)
                    throw e;
                await new Promise(resolve => setTimeout(resolve, 250));
            }
        }
        const saved = (await ref.get()).data()!, p: IssuedDocument = { photoId, kind: k, path, state: 'COMMITTED', sha256: pdf.sha256, size: pdf.bytes.length, generation: String(saved.generation), mime: 'application/pdf', templateId: base.templateId, templateVersion: base.templateVersion, templateHash: base.templateHash };
        await readVerifiedEvidenceObject(bucket, p);
        documents[k] = p;
    }
    return db.runTransaction(async (tx) => {
        const current = await issuanceProof(runtime, tx, id, v, recoveryId), ref = issuedManifestRef(db,id,v,proof.snapshot.snapshotVersion), old = await tx.get(ref);
        if (current.snapshot.integrity.payloadHash !== proof.snapshot.integrity.payloadHash)
            throw Error('DOCUMENT_CONTEXT_CHANGED');
        if (old.exists) {
            const issued = await issuedOperation(runtime, tx, id, v, 'ISSUANCE', false);
            if (contractValueHash(issued.manifest.documents) !== contractValueHash(documents))
                throw Error('ISSUED_DOCUMENTS_CHANGED');
            return { manifestHash: issued.manifest.hash, replay: true };
        }
        const kinds = issuedDocumentKinds(current.package);
        const refs = kinds.map(k => operationRef(db, id, v).parent.doc('delivery').collection('photos').doc(documents[k].photoId));
        const existing = await Promise.all(refs.map(ref => tx.get(ref)));
        for (let i = 0; i < existing.length; i++) {
            const p = existing[i].data(), expected = documents[kinds[i]];
            if (!p || p.state !== 'COMMITTED' || p.generation !== expected.generation || p.sha256 !== expected.sha256)
                throw Error('ISSUED_DOCUMENT_COLLISION');
        }
        const issuedAt = new Date().toISOString(), data = { schemaVersion: 'PRODUCTION_DOCUMENT_MANIFEST_V1' as const, executionMode: 'PRODUCTION' as const, operationId: current.identity.operationId, snapshotId: current.snapshot.contractSnapshotId, snapshotHash: current.snapshot.integrity.payloadHash, packageHash: current.package.sha256, documents, issuedAt, issuedBy: actor, ...(current.recovery ? { recoveryAuthorization: { id: current.recovery.id, hash: current.recovery.hash } } : {}) }, hash = contractValueHash(data);
        tx.create(ref, { ...data, hash });
        tx.create(productionRef(db, id, v).collection('events').doc(current.snapshot.snapshotVersion===1?'documents_issued':'documents_issued_'+current.snapshot.snapshotVersion), { action: 'DOCUMENTS_ISSUED', manifestHash: hash, actor, at: issuedAt, recoveryAuthorization: current.recovery ? { id: current.recovery.id, hash: current.recovery.hash } : null });
        return { manifestHash: hash, replay: false };
    });
}
export async function readIssuedDocumentDownload(runtime: ProductionRuntime, bucket: Bucket, id: string, v: number, kind: FinalDocumentKind, actor: string) {
    const { db } = await requireProductionActor(runtime, actor, false);
    if (!finalDocumentKinds.includes(kind))
        throw Error('DOCUMENT_KIND_INVALID');
    const proof = await db.runTransaction(async (tx) => issuedOperation(runtime, tx, id, v, 'ISSUANCE', false));
    const p = proof.manifest.documents[kind];
    const filename = issuedPdfFilename(kind, proof.snapshot.contractNumber, proof.snapshot.personalData.fullName, proof.snapshot.acceptedReference.nombre, proof.snapshot.snapshotVersion);
    if (!p) throw Error('DOCUMENT_NOT_ISSUED');
    opaque(p.photoId);
    const result = await readVerifiedEvidenceObject(bucket, p);
    if (createHash('sha256').update(result.bytes).digest('hex') !== p.sha256)
        throw Error('ISSUED_DOCUMENT_CHANGED');
    return {bytes:result.bytes,filename};
}
export async function readIssuedDocument(runtime: ProductionRuntime, bucket: Bucket, id: string, v: number, kind: FinalDocumentKind, actor: string) {
    return (await readIssuedDocumentDownload(runtime,bucket,id,v,kind,actor)).bytes;
}
