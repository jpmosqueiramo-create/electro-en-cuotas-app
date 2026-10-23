import type { Firestore, Transaction } from 'firebase-admin/firestore';
import { admin } from '../firebaseAdmin';
import { contractRefs } from '../contractV2Server';
import { operationRef } from '../operationV2';
import { contractValueHash } from '../contractIntegrityV2';
import type { CustodyActor } from '../operationCustodyV2Server';
import type { DeliveryV2 } from '../operationDeliveryV2';
import { verifyEvidenceObject, assertVerifiedEvidence, type EvidenceMetadata, type VerifiedEvidence } from '../operationEvidenceV2';
import { runtimeForDatabase, runtimeData, requireProductionActor, type ProductionRuntime } from './runtime';
import { issuedOperation } from './documents';
import { finalDocumentKinds } from './catalog';
import type { ProductionScope } from './authorization';
export async function operationRuntime(db: Firestore, tx: Transaction, id: string, v: number): Promise<ProductionRuntime | null> {
    const d = (await tx.get(contractRefs(db, id, v).draft)).data();
    if (!d?.productionFreeze)
        return null;
    if (d.emulatorFreeze || d.productionFreeze.executionMode !== 'PRODUCTION')
        throw Error('PRODUCTION_EXECUTION_MODE_CONFLICT');
    return runtimeForDatabase(db, admin.auth());
}
export async function productionReader(runtime: ProductionRuntime, actor: CustodyActor) {
    const r = runtimeData(runtime), u = await r.auth.getUser(actor.uid);
    if (u.disabled || !u.emailVerified)
        throw Error('PRODUCTION_IDENTITY_NOT_CURRENT');
    return r;
}
export async function productionWriter(runtime: ProductionRuntime, actor: CustodyActor) {
    if (actor.admin)
        return requireProductionActor(runtime, actor.uid);
    const r = runtimeData(runtime), u = await r.auth.getUser(actor.uid);
    if (u.disabled || !u.emailVerified || !r.test && process.env.PRODUCTION_OPERATIONS_ENABLED !== 'true')
        throw Error('PRODUCTION_PARTICIPANT_NOT_AUTHORIZED');
    return r;
}
export async function productionDeliveryAccess(runtime: ProductionRuntime, tx: Transaction, id: string, v: number, forWrite = true) { return issuedOperation(runtime, tx, id, v, 'DELIVERY', forWrite); }
/** Shared immutable proof; custody/permissions remain in the calling domain engines. */
export async function productionDeliveryProof(runtime: ProductionRuntime, tx: Transaction, id: string, v: number, scope: ProductionScope, forWrite = true, verified?: Map<string, VerifiedEvidence>) {
    const { db } = runtimeData(runtime), issued = await issuedOperation(runtime, tx, id, v, scope, forWrite), ref = operationRef(db, id, v).parent.doc('delivery');
    const saved = await tx.get(ref), d = saved.data() as DeliveryV2 | undefined;
    const [cs, fs] = await Promise.all([tx.get(operationRef(db, id, v).parent.doc('custody')), tx.get(operationRef(db, id, v).parent.doc('fulfillment'))]);
    const c = cs.data(), f = fs.data();
    if (!d || d.status !== 'DELIVERED' || d.operationId !== issued.identity.operationId || d.event?.executionMode !== 'PRODUCTION' || d.event.operationId !== issued.identity.operationId || d.event.legalApproval !== 'EXACT_PACKAGE_APPROVED' || d.event.issuedManifestHash !== issued.manifest.hash || !d.originals || d.originalsTransfer || !c || !f || c.current || c.pending || c.deliveryClosure !== 'DELIVERED' || f.deliveryClosure !== 'DELIVERED' || f.logisticsState !== 'DELIVERED' || c.incidents.some((i: {
        resolvedAt: string | null;
    }) => !i.resolvedAt) || f.incidents.some((i: {
        resolvedAt: string | null;
    }) => !i.resolvedAt) || d.holds.some(h => !h.clearedAt))
        throw Error('PRODUCTION_DELIVERY_REQUIRED');
    const files = new Map<string, EvidenceMetadata>();
    for (const k of finalDocumentKinds) {
        const doc = d.documents[k], emitted = issued.manifest.documents[k];
        if (!doc.prepared || !doc.signature?.clientSigned || !doc.signature.legible || !doc.signature.identityChecked || doc.prepared.photoId !== emitted.photoId || doc.prepared.sha256 !== emitted.sha256 || d.originals.documentHashes[k] !== emitted.sha256 || contractValueHash(doc) !== contractValueHash(d.event.documents[k]))
            throw Error('PRODUCTION_SIGNATURES_REQUIRED');
        for (const [pid, sha, slot, related] of [[doc.prepared.photoId, doc.prepared.sha256, `${k}_PREPARED`, ''], [doc.signature.photoId, doc.signature.sha256, `${k}_SIGNED`, doc.prepared.photoId]]) {
            const photo = (await tx.get(ref.collection('photos').doc(pid))).data();
            if (!photo || photo.state !== 'COMMITTED' || photo.sha256 !== sha || photo.slot !== slot || photo.relatedId !== related || photo.path !== `operation-delivery-v2/${id}/v${v}/${pid}` || !photo.generation)
                throw Error('PRODUCTION_SIGNATURE_EVIDENCE_REQUIRED');
            files.set(photo.path, photo as EvidenceMetadata);
            if (verified)
                assertVerifiedEvidence(photo as EvidenceMetadata, verified.get(photo.path));
        }
    }
    return { ...issued, delivery: d, files };
}
export async function verifiedProductionDelivery(runtime: ProductionRuntime, id: string, v: number, scope: ProductionScope) {
    const { db } = runtimeData(runtime), files = (await db.runTransaction(tx => productionDeliveryProof(runtime, tx, id, v, scope))).files;
    const { getBudgetDocumentationBucket } = await import('../budgetDocumentationStorage');
    const bucket = await getBudgetDocumentationBucket(), verified = new Map<string, VerifiedEvidence>();
    for (const [path, p] of files)
        verified.set(path, await verifyEvidenceObject(bucket, p));
    return verified;
}
