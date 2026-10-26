import {issuedManifestRef} from './documentRevisionState';
import type { Transaction } from 'firebase-admin/firestore';
import { exact, opaque } from '../contractV2';
import { contractValueHash } from '../contractIntegrityV2';
import { productionRef, approvedPackage } from './authorization';
import { frozenOperation } from './freeze';
import { assertFinalRenderer } from './pdf';
import { requireProductionActor, runtimeData, type ProductionRuntime } from './runtime';

type Frozen = Awaited<ReturnType<typeof frozenOperation>>;
export const recoveryRef = (runtime: ProductionRuntime, id: string, v: number, commandId: string) => productionRef(runtimeData(runtime).db, id, v).collection('issuanceRecoveries').doc(opaque(commandId));
const binding = (proof: Frozen) => ({ operationId: proof.identity.operationId, budgetId: proof.identity.budgetId, version: proof.identity.budgetVersion,
    snapshotId: proof.snapshot.contractSnapshotId, snapshotHash: proof.snapshot.integrity.payloadHash, contractNumber: proof.snapshot.contractNumber,
    authorizationId: proof.authorization.id, authorizationHash: proof.authorization.hash, packageId: proof.package.id, packageHash: proof.package.sha256,
    approvalId: proof.authorization.approvalId, approvalHash: proof.approvalHash, rendererHash: proof.package.rendererHash, resourcesHash: proof.package.resourcesHash });
export interface IssuanceRecovery extends ReturnType<typeof binding> {
    schemaVersion: 'PRODUCTION_ISSUANCE_RECOVERY_V1'; id: string; reason: string; actor: string; at: string; expiresAt: string; digest: string; hash: string;
}
const reasonText = (x: unknown) => { if (typeof x !== 'string' || !x.trim() || x.length > 500 || /[\x00-\x1f\x7f]/.test(x)) throw Error('RECOVERY_REASON_REQUIRED'); return x.trim(); };
async function unrevokedOrigin(runtime: ProductionRuntime, tx: Transaction, proof: Frozen) {
    const { db } = runtimeData(runtime), a = proof.authorization;
    const revoked = await tx.get(productionRef(db, a.budgetId, a.version).collection('authorizations').doc(a.id).collection('revocations').doc('current'));
    if (revoked.exists) throw Error('ORIGINAL_AUTHORIZATION_REVOKED');
    await approvedPackage(runtime, tx, a.packageId, a.approvalId);
}
/** Recovery never renews delivery/finance/client scopes or changes the original authorization. */
export async function authorizeIssuanceRecovery(runtime: ProductionRuntime, id: string, v: number, input: unknown, actor: string) {
    const { db } = await requireProductionActor(runtime, actor), c = exact(input, ['commandId', 'snapshotHash', 'authorizationId', 'expiresAt', 'reason', 'confirmed']);
    const cid = opaque(c.commandId), ref = recoveryRef(runtime, id, v, cid), reason = reasonText(c.reason), expiresAt = String(c.expiresAt);
    opaque(c.authorizationId);
    if (c.confirmed !== true || typeof c.snapshotHash !== 'string' || !/^[a-f0-9]{64}$/.test(c.snapshotHash)) throw Error('EXPLICIT_RECOVERY_REQUIRED');
    if (!Number.isFinite(Date.parse(expiresAt)) || new Date(expiresAt).toISOString() !== expiresAt) throw Error('RECOVERY_EXPIRY_REQUIRED');
    const digest = contractValueHash({ actor, id, v, input: c });
    return db.runTransaction(async tx => {
        const prior = await tx.get(ref);
        if (prior.exists) {
            if (prior.data()!.digest !== digest) throw Error('PRODUCTION_COMMAND_CONFLICT');
            return { id: cid, hash: prior.data()!.hash as string, replay: true };
        }
        if (Date.parse(expiresAt) <= Date.now() || Date.parse(expiresAt) > Date.now() + 86400000) throw Error('RECOVERY_EXPIRY_INVALID');
        const proof = await frozenOperation(runtime, tx, id, v, 'ISSUANCE', false);
        await unrevokedOrigin(runtime, tx, proof);
        assertFinalRenderer(proof.package);
        if (Date.parse(proof.authorization.expiresAt) > Date.now()) throw Error('ORIGINAL_AUTHORIZATION_STILL_VALID');
        if (proof.authorization.id !== c.authorizationId || proof.snapshot.integrity.payloadHash !== c.snapshotHash) throw Error('RECOVERY_CONTEXT_CHANGED');
        if ((await tx.get(issuedManifestRef(runtimeData(runtime).db,id,v,proof.snapshot.snapshotVersion))).exists) throw Error('DOCUMENTS_ALREADY_ISSUED');
        const data = { schemaVersion: 'PRODUCTION_ISSUANCE_RECOVERY_V1' as const, id: cid, ...binding(proof), reason, actor, at: new Date().toISOString(), expiresAt, digest }, hash = contractValueHash(data);
        tx.create(ref, { ...data, hash });
        tx.create(productionRef(db, id, v).collection('events').doc('recovery_' + cid), { action: 'ISSUANCE_RECOVERY_AUTHORIZED', recoveryId: cid, recoveryHash: hash, snapshotHash: c.snapshotHash, actor, at: data.at });
        return { id: cid, hash, replay: false };
    });
}
export async function issuanceProof(runtime: ProductionRuntime, tx: Transaction, id: string, v: number, recoveryId?: string, forWrite = true) {
    if (recoveryId !== undefined) opaque(recoveryId);
    if (recoveryId === undefined) return { ...await frozenOperation(runtime, tx, id, v, 'ISSUANCE', forWrite), recovery: null };
    const proof = await frozenOperation(runtime, tx, id, v, 'ISSUANCE', false), ref = recoveryRef(runtime, id, v, recoveryId);
    const [saved, revoked] = await Promise.all([tx.get(ref), tx.get(ref.collection('revocations').doc('current'))]), r = saved.data() as IssuanceRecovery | undefined;
    if (!r || r.schemaVersion !== 'PRODUCTION_ISSUANCE_RECOVERY_V1' || r.id !== recoveryId) throw Error('ISSUANCE_RECOVERY_REQUIRED');
    const { hash, ...payload } = r;
    if (hash !== contractValueHash(payload) || Object.entries(binding(proof)).some(([k, value]) => r[k as keyof IssuanceRecovery] !== value)) throw Error('RECOVERY_CONTEXT_CHANGED');
    if (forWrite) {
        if (revoked.exists || Date.parse(r.expiresAt) <= Date.now()) throw Error('RECOVERY_EXPIRED_OR_REVOKED');
        await unrevokedOrigin(runtime, tx, proof);
        assertFinalRenderer(proof.package);
    }
    return { ...proof, recovery: r };
}
export async function revokeIssuanceRecovery(runtime: ProductionRuntime, id: string, v: number, input: unknown, actor: string) {
    const { db } = await requireProductionActor(runtime, actor), c = exact(input, ['recoveryId', 'commandId', 'reason']);
    opaque(c.commandId);
    const reason = reasonText(c.reason), ref = recoveryRef(runtime, id, v, opaque(c.recoveryId)), digest = contractValueHash({ actor, id, v, input: c });
    return db.runTransaction(async tx => {
        const [grant, prior] = await Promise.all([tx.get(ref), tx.get(ref.collection('revocations').doc('current'))]);
        if (!grant.exists) throw Error('ISSUANCE_RECOVERY_REQUIRED');
        if (prior.exists) { if (prior.data()!.digest !== digest) throw Error('PRODUCTION_COMMAND_CONFLICT'); return { replay: true }; }
        tx.create(ref.collection('revocations').doc('current'), { commandId: c.commandId, reason, actor, at: new Date().toISOString(), digest });
        return { replay: false };
    });
}
