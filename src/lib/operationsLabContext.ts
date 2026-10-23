// Server-only capability. A serialized context is never an authorization credential.
import { createHash } from 'node:crypto';
import type { Firestore, DocumentReference } from 'firebase-admin/firestore';
import { LAB_SCHEMA, LabError, requireLabAccess } from './operationsLabPolicy';

const capabilities = new WeakMap<object, { db: Firestore; session: DocumentReference; uid: string; viewerUid?: string; viewerRole?: 'CLIENT'|'AFFILIATE'; env: Record<string, string | undefined> }>();
export interface LabExecutionContext {
  readonly kind: 'OPERATIONS_LAB_CONTEXT_V1';
  readonly sessionId: string;
  readonly ownerUid: string;
}
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
export function labSessionReference(db: Firestore, uid: string, sessionId: string) {
  if (!uuid.test(sessionId)) throw new LabError(400, 'LAB_SESSION_INVALID');
  return db.collection('operationsLabV1').doc(createHash('sha256').update(uid).digest('hex')).collection('sessions').doc(sessionId);
}
function validateSession(data: FirebaseFirestore.DocumentData | undefined, uid: string) {
  if (!data || data.schemaVersion !== LAB_SCHEMA || data.ownerUid !== uid || data.mode !== 'SYNTHETIC_ONLY' || data.disabledAt) throw new LabError(403, 'LAB_SESSION_UNAVAILABLE');
}
/** uid must come from the existing verified administrative session, never a request body. */
export async function resolveLabExecutionContext(db: Firestore, uid: string, sessionId: string, env: Record<string, string | undefined>): Promise<LabExecutionContext> {
  if (typeof window !== 'undefined') throw new LabError(403, 'LAB_SERVER_REQUIRED');
  requireLabAccess(uid, env);
  const session = labSessionReference(db, uid, sessionId);
  validateSession((await session.get()).data(), uid);
  const context: LabExecutionContext = Object.freeze({ kind: 'OPERATIONS_LAB_CONTEXT_V1', sessionId, ownerUid: uid });
  capabilities.set(context, { db, session, uid, env });
  return context;
}
export async function resolveLabViewerContext(db: Firestore, viewerUid: string, ownerKey: string, sessionId: string, env: Record<string,string|undefined>): Promise<LabExecutionContext> {
  if(typeof window!=='undefined'||!uuid.test(sessionId)||!/^[a-f0-9]{64}$/.test(ownerKey)||!/^[a-zA-Z0-9_-]{1,128}$/.test(viewerUid))throw new LabError(403,'LAB_ACCESS_DENIED');
  const session=db.collection('operationsLabV1').doc(ownerKey).collection('sessions').doc(sessionId);
  const data=(await session.get()).data();
  if(typeof data?.ownerUid!=='string'||createHash('sha256').update(data.ownerUid).digest('hex')!==ownerKey)throw new LabError(403,'LAB_ACCESS_DENIED');
  const uid=data.ownerUid;requireLabAccess(uid,env);validateSession(data,uid);
  const member=(await session.collection('participants').doc(viewerUid).get()).data();
  if(!member||member.uid!==viewerUid||member.active!==true||!['CLIENT','AFFILIATE'].includes(member.role)||member.labContext?.sessionId!==sessionId||member.labContext?.ownerUid!==uid)throw new LabError(403,'LAB_ACCESS_DENIED');
  const context:LabExecutionContext=Object.freeze({kind:'OPERATIONS_LAB_CONTEXT_V1',sessionId,ownerUid:uid});
  capabilities.set(context,{db,session,uid,viewerUid,viewerRole:member.role,env});
  return context;
}
function capability(context: LabExecutionContext) {
  const value = capabilities.get(context);
  if (!value) throw new LabError(403, 'LAB_CONTEXT_INVALID');
  requireLabAccess(value.uid, value.env);
  return value;
}
/** Domain-specific storage port: no raw Firestore, root collection, batch, or delete escape hatch. */
export function labRepository(context: LabExecutionContext) {
  const cap = capability(context);
  const collectionNames = new Set(['requests', 'budgets', 'contracts', 'snapshots', 'documents', 'delivery', 'ledger', 'payments', 'receipts', 'commands', 'events', 'participants', 'numberReservations']);
  function ref(collection: string, id: string) {
    capability(context);
    if (!collectionNames.has(collection) || !/^[a-zA-Z0-9_-]{1,160}$/.test(id)) throw new LabError(400, 'LAB_REFERENCE_INVALID');
    return cap.session.collection(collection).doc(id);
  }
  async function authorize(tx: FirebaseFirestore.Transaction) {
    capability(context);
    validateSession((await tx.get(cap.session)).data(), cap.uid);
    if(cap.viewerUid){
      const member=(await tx.get(cap.session.collection('participants').doc(cap.viewerUid))).data();
      if(!member||member.uid!==cap.viewerUid||member.active!==true||member.role!==cap.viewerRole)throw new LabError(403,'LAB_ACCESS_DENIED');
      assertLabRecord(context,member);
    }
  }
  return Object.freeze({
    async read(collection: string, id: string) {
      return cap.db.runTransaction(async tx => {
        await authorize(tx);
        const data = (await tx.get(ref(collection, id))).data();
        if (data) assertLabRecord(context, data);
        return data ?? null;
      });
    },
    async transaction<T>(work: (port: LabTransaction) => Promise<T>): Promise<T> {
      return cap.db.runTransaction(async tx => {
        await authorize(tx);
        let writing = false;
        const port: LabTransaction = Object.freeze({
          async read(collection: string, id: string) {
            if (writing) throw new LabError(409, 'LAB_READ_AFTER_WRITE');
            const data = (await tx.get(ref(collection, id))).data();
        if (data) assertLabRecord(context, data);
        return data ?? null;
          },
          create(collection: string, id: string, data: Record<string, unknown>) {
            if(cap.viewerUid)throw new LabError(403,'LAB_READ_ONLY');
            writing = true;
            tx.create(ref(collection, id), envelope(data));
          },
          replace(collection: string, id: string, data: Record<string, unknown>) {
            if(cap.viewerUid)throw new LabError(403,'LAB_READ_ONLY');
            if (['snapshots', 'documents', 'commands', 'events', 'numberReservations'].includes(collection)) throw new LabError(409, 'LAB_IMMUTABLE_RECORD');
            writing = true;
            tx.set(ref(collection, id), envelope(data));
          },
        });
        function envelope(data: Record<string, unknown>) {
          if (Object.hasOwn(data, 'labContext')) throw new LabError(400, 'LAB_CONTEXT_FIELD_RESERVED');
          return { ...data, labContext: { schemaVersion: context.kind, sessionId: context.sessionId, ownerUid: context.ownerUid } };
        }
        return work(port);
      });
    },
  });
}
export interface LabTransaction {
  read(collection: string, id: string): Promise<FirebaseFirestore.DocumentData | null>;
  create(collection: string, id: string, data: Record<string, unknown>): void;
  replace(collection: string, id: string, data: Record<string, unknown>): void;
}
/** Validate provenance before using evidence obtained from any persistence port. */
export function assertLabRecord(context: LabExecutionContext, data: unknown): void {
  capability(context);
  const record = data as { labContext?: { schemaVersion?: string; sessionId?: string; ownerUid?: string } } | null;
  const c = record?.labContext;
  if (!c || c.schemaVersion !== context.kind || c.sessionId !== context.sessionId || c.ownerUid !== context.ownerUid) throw new LabError(409, 'LAB_RECORD_CONTEXT_MISMATCH');
}
