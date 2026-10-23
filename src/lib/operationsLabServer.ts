import { createHash } from 'node:crypto';
import { FieldValue, type Firestore } from 'firebase-admin/firestore';
import { LAB_SCHEMA, LabError, labCommand, requireLabAccess } from './operationsLabPolicy';

// Session root for the isolated repository. Never pass a normal operation ID here.
function sessions(db: Firestore, uid: string) {
  const owner = createHash('sha256').update(uid).digest('hex');
  return db.collection('operationsLabV1').doc(owner).collection('sessions');
}
export async function listLabSessions(db: Firestore, uid: string, env: Record<string, string | undefined>) {
  requireLabAccess(uid, env);
  const result = await sessions(db, uid).orderBy('createdAt', 'desc').limit(20).get();
  return result.docs.map(doc => {
    const data = doc.data();
    if (data.schemaVersion !== LAB_SCHEMA || data.ownerUid !== uid || data.mode !== 'SYNTHETIC_ONLY') throw new LabError(409, 'LAB_SESSION_INVALID');
    return { id: doc.id, createdAt: data.createdAt.toDate().toISOString(), state: 'CIRCUIT_PENDING' as const };
  });
}
export async function createLabSession(db: Firestore, uid: string, input: unknown, env: Record<string, string | undefined>) {
  requireLabAccess(uid, env);
  const { commandId } = labCommand(input), ref = sessions(db, uid).doc(commandId);
  const digest = createHash('sha256').update(JSON.stringify({ action: 'START_SESSION', commandId, uid, schema: LAB_SCHEMA })).digest('hex');
  return db.runTransaction(async tx => {
    requireLabAccess(uid, env);
    const command = ref.collection('commands').doc(commandId), event = ref.collection('events').doc(commandId);
    const [session, receipt, audit] = await tx.getAll(ref, command, event);
    const result = { id: commandId, state: 'CIRCUIT_PENDING' as const };
    if (session.exists || receipt.exists || audit.exists) {
      if (!session.exists || session.data()?.ownerUid !== uid || session.data()?.schemaVersion !== LAB_SCHEMA || session.data()?.mode !== 'SYNTHETIC_ONLY' || receipt.data()?.digest !== digest || audit.data()?.digest !== digest || JSON.stringify(receipt.data()?.result) !== JSON.stringify(result)) throw new LabError(409, 'LAB_COMMAND_CONFLICT');
      return result;
    }
    const at = FieldValue.serverTimestamp();
    tx.create(ref, { schemaVersion: LAB_SCHEMA, mode: 'SYNTHETIC_ONLY', ownerUid: uid, createdAt: at, state: result.state });
    tx.create(command, { digest, result, actorUid: uid, at });
    tx.create(event, { digest, action: 'START_SESSION', actorUid: uid, at });
    return result;
  });
}
