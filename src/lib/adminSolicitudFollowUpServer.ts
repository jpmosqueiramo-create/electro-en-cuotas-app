import { createHash } from 'node:crypto';
import { Timestamp, type Firestore, type Transaction } from 'firebase-admin/firestore';
import { isAdminSolicitudSource, type AdminSolicitudSource } from './adminSolicitudesReadModel';
import { assertAdministrativeRecordActive } from './adminRecordRemovalServer';
import { FollowUpError, isFollowUpState, nextFollowUpState, parseFollowUpCommand, type FollowUpState, type FollowUpEvent, type FollowUpPage, type FollowUpSummary } from './adminSolicitudFollowUp';

const hash = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
export function followUpIdentity(source: string, id: string): { source: AdminSolicitudSource; id: string } {
  if (!isAdminSolicitudSource(source) || !id || id.startsWith('_') || ['.', '..'].includes(id) || id.includes('/') || Buffer.byteLength(id) > 1500) {
    throw new FollowUpError('INVALID', 'Referencia de solicitud inválida.');
  }
  return { source, id };
}
// Existing server-mediated subtree: default client Rules exclude contracts, including Admin.
export function followUpRef(db: Firestore, source: string, id: string) {
  const identity = followUpIdentity(source, id);
  return db.collection('presupuestos_v2').doc('_request_follow_up_v1').collection('contracts').doc(hash([identity.source, identity.id]));
}
function corrupt(): never { throw new FollowUpError('CORRUPT', 'No se pudo validar el historial. Reintentá antes de continuar.'); }
function timestamp(value: unknown): string {
  if (!(value instanceof Timestamp) || !Number.isFinite(value.toMillis())) corrupt();
  return value.toDate().toISOString();
}
function readHead(raw: FirebaseFirestore.DocumentData | undefined, source: string, id: string) {
  if (!raw) return { state: 'OPEN' as FollowUpState, revision: 0, lastCommandId: null };
  if (raw.schemaVersion !== 'REQUEST_FOLLOW_UP_V1' || raw.source !== source || raw.id !== id || !isFollowUpState(raw.state) ||
      !Number.isSafeInteger(raw.revision) || raw.revision < 1 || typeof raw.lastCommandId !== 'string') corrupt();
  timestamp(raw.updatedAt);
  return { state: raw.state, revision: raw.revision as number, lastCommandId: raw.lastCommandId as string };
}
function projectEvent(id: string, raw: FirebaseFirestore.DocumentData, source: string, requestId: string): FollowUpEvent {
  if (raw.schemaVersion !== 'REQUEST_FOLLOW_UP_EVENT_V1' || raw.source !== source || raw.id !== requestId ||
      !Number.isSafeInteger(raw.revision) || raw.revision < 1 || !isFollowUpState(raw.fromState) || !isFollowUpState(raw.toState) ||
      typeof raw.actor?.uid !== 'string' || !raw.actor.uid || typeof raw.actor.email !== 'string' || !raw.actor.email || typeof raw.digest !== 'string') corrupt();
  try {
    const command = parseFollowUpCommand({ commandId: id, action: raw.action, expectedRevision: raw.revision - 1, note: raw.note, toState: raw.action === 'ADD_NOTE' ? null : raw.toState });
    if (nextFollowUpState(raw.fromState, command) !== raw.toState) corrupt();
  } catch { corrupt(); }
  // Explicit allowlist: never return command digests, source payloads or economic data.
  return { id, revision: raw.revision, action: raw.action, fromState: raw.fromState, toState: raw.toState, note: raw.note, at: timestamp(raw.at), actor: { uid: raw.actor.uid, email: raw.actor.email } };
}
async function requireRequest(db: Firestore, tx: Transaction, source: string, id: string) {
  const snapshot = await tx.get(db.collection(source).doc(id));
  if (!snapshot.exists) throw new FollowUpError('NOT_FOUND', 'La solicitud no existe en la fuente indicada.');
}
/** One bounded read per loaded request; no timeline fan-out in the inbox. */
export async function readFollowUpSummaries(db: Firestore, source: string, ids: string[]): Promise<Record<string, FollowUpSummary>> {
  const result: Record<string, FollowUpSummary> = {};
  for (let index = 0; index < ids.length; index += 100) {
    const snapshots = await db.getAll(...ids.slice(index, index + 100).map(id => followUpRef(db, source, id)));
    snapshots.forEach((saved, offset) => {
      const id = ids[index + offset], raw = saved.data(), head = readHead(raw, source, id);
      result[id] = { state: head.state, revision: head.revision, updatedAt: raw ? timestamp(raw.updatedAt) : null };
    });
  }
  return result;
}
export async function readFollowUp(db: Firestore, source: string, id: string, before?: number): Promise<FollowUpPage> {
  const ref = followUpRef(db, source, id);
  if (before !== undefined && (!Number.isSafeInteger(before) || before < 1)) throw new FollowUpError('INVALID', 'Página inválida.');
  return db.runTransaction(async tx => {
    await requireRequest(db, tx, source, id);
    const head = readHead((await tx.get(ref)).data(), source, id);
    if (before !== undefined && before > head.revision) throw new FollowUpError('INVALID', 'Página inválida.');
    let query = ref.collection('events').orderBy('revision', 'desc').limit(31);
    if (before !== undefined) query = query.startAfter(before);
    const saved = await tx.get(query);
    const events = saved.docs.map(d => projectEvent(d.id, d.data(), source, id));
    const expected = before === undefined ? head.revision : before - 1;
    if (events.some((event, index) => event.revision !== expected - index) || events.length !== Math.min(31, expected) ||
        before === undefined && head.revision > 0 && (events[0]?.id !== head.lastCommandId || events[0]?.toState !== head.state) ||
        events.some((event, index) => index > 0 && events[index - 1].fromState !== event.toState)) corrupt();
    return { state: head.state, revision: head.revision, events: events.slice(0, 30), nextBefore: events.length > 30 ? events[29].revision : null };
  });
}
export async function writeFollowUp(db: Firestore, source: string, id: string, input: unknown, actor: { uid: string; email: string }) {
  const ref = followUpRef(db, source, id), command = parseFollowUpCommand(input);
  if (!actor.uid || !actor.email) throw new FollowUpError('INVALID', 'Identidad administrativa requerida.');
  const digest = hash([actor.uid, actor.email, source, id, command]);
  return db.runTransaction(async tx => {
    await requireRequest(db, tx, source, id);
    const eventRef = ref.collection('events').doc(command.commandId);
    const prior = await tx.get(eventRef);
    if (prior.exists) {
      if (prior.data()!.digest !== digest) throw new FollowUpError('CONFLICT', 'La referencia de guardado ya fue usada para otro cambio.');
      const event = projectEvent(prior.id, prior.data()!, source, id);
      return { revision: event.revision, replayed: true };
    }
    try { await assertAdministrativeRecordActive(db, tx, { kind: 'REQUEST', source: followUpIdentity(source, id).source, id }); }
    catch { throw new FollowUpError('INACTIVE', 'Restaurá la solicitud antes de agregar notas o cambiar su seguimiento.'); }
    const head = readHead((await tx.get(ref)).data(), source, id);
    if (head.revision !== command.expectedRevision) throw new FollowUpError('CONFLICT', 'Otra gestión cambió esta solicitud. Actualizá el historial y revisá tu nota antes de guardar.');
    const tail = await tx.get(ref.collection('events').orderBy('revision', 'desc').limit(1));
    if (head.revision === 0 ? !tail.empty : tail.empty) corrupt();
    if (!tail.empty) {
      const last = tail.docs[0], event = projectEvent(last.id, last.data(), source, id);
      if (event.id !== head.lastCommandId || event.revision !== head.revision || event.toState !== head.state) corrupt();
    }
    const state = nextFollowUpState(head.state, command), revision = head.revision + 1, at = Timestamp.now();
    tx.create(eventRef, { schemaVersion: 'REQUEST_FOLLOW_UP_EVENT_V1', source, id, revision, action: command.action, fromState: head.state, toState: state, note: command.note, at, actor, digest });
    tx.set(ref, { schemaVersion: 'REQUEST_FOLLOW_UP_V1', source, id, state, revision, updatedAt: at, lastCommandId: command.commandId });
    return { revision, replayed: false };
  });
}
