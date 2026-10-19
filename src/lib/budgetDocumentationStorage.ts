import type { Bucket } from '@google-cloud/storage';
import type { Firestore } from 'firebase-admin/firestore';
import { createHash, randomUUID } from 'node:crypto';
import { budgetV2ExactObject, budgetV2OpaqueId } from './budgetV2';
import { ALLOWED_MIME_TYPES, MAX_ATTACHMENT_SIZE_BYTES, applyDocumentEvent, documentType, fail, storagePath, type BudgetAttachment, type DocumentType } from './budgetAcceptanceV2';
import { caseRefs, loadDocumentation } from './budgetAcceptanceV2Server';

export function documentationBucketName(env: Record<string, string | undefined> = process.env) {
  const project = env.GCLOUD_PROJECT || env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const name = env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
  if (env.FIREBASE_STORAGE_EMULATOR_HOST || env.STORAGE_EMULATOR_HOST || project?.startsWith('demo-')) {
    if (project !== 'demo-cuenta-hogar' || env.FIREBASE_STORAGE_EMULATOR_HOST !== '127.0.0.1:9199' || (env.STORAGE_EMULATOR_HOST && env.STORAGE_EMULATOR_HOST !== 'http://127.0.0.1:9199') || (name && name !== 'demo-cuenta-hogar.appspot.com')) fail('Configuración Storage demo inválida.');
    return 'demo-cuenta-hogar.appspot.com';
  }
  if (!name || !/^[a-z0-9][a-z0-9._-]{1,220}[a-z0-9]$/.test(name)) fail('Falta un bucket Storage explícito válido.');
  return name;
}
export async function getBudgetDocumentationBucket() {
  const name = documentationBucketName();
  const { admin } = await import('./firebaseAdmin');
  return admin.storage().bucket(name);
}
export function sanitizeOriginalName(value: string) {
  const name = value.replace(/\\/g, '/').split('/').pop()!.replace(/[\x00-\x1f\x7f]/g, '').slice(0, 150).trim();
  return name || 'documento';
}
export function validateDocumentBytes(bytes: Uint8Array, declared: string) {
  if (!bytes.length || bytes.length > MAX_ATTACHMENT_SIZE_BYTES || !ALLOWED_MIME_TYPES.includes(declared as typeof ALLOWED_MIME_TYPES[number])) fail('Archivo no permitido o mayor de 10 MiB.');
  const b = Buffer.from(bytes);
  const mime = b.length >= 3 && b[0] === 255 && b[1] === 216 && b[2] === 255 ? 'image/jpeg'
    : b.length >= 8 && b.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])) ? 'image/png'
    : b.length >= 12 && b.toString('ascii',0,4) === 'RIFF' && b.toString('ascii',8,12) === 'WEBP' ? 'image/webp'
    : b.length >= 5 && b.toString('ascii',0,5) === '%PDF-' ? 'application/pdf' : null;
  if (!mime || mime !== declared) fail('El contenido no coincide con el tipo de archivo declarado.');
  return mime;
}
export function parseUploadFields(value: unknown) {
  const c = budgetV2ExactObject(value, ['commandId', 'originalName', 'mimeType']);
  if (!budgetV2OpaqueId(c.commandId) || typeof c.originalName !== 'string' || c.originalName.length > 1000 || typeof c.mimeType !== 'string') fail();
  return { commandId: c.commandId, originalName: sanitizeOriginalName(c.originalName), mimeType: c.mimeType };
}
const sha = (value: string | Buffer) => createHash('sha256').update(value).digest('hex');
function validAttachmentId(id: unknown): asserts id is string { if (typeof id !== 'string' || !/^att_[a-f0-9]{64}$/.test(id)) fail('Identidad de archivo inválida.'); }
export async function findAttachment(db: Firestore, budgetId: string, version: number, rawType: unknown, id: unknown) {
  const type = documentType(rawType); validAttachmentId(id);
  const { documentation } = await loadDocumentation(db, budgetId, version);
  const attachment = documentation.slots[type].attachments.find(a => a.attachmentId === id);
  if (!attachment || attachment.storagePath !== storagePath(budgetId, version, type, id) || !ALLOWED_MIME_TYPES.includes(attachment.mimeType as typeof ALLOWED_MIME_TYPES[number]) || attachment.size > MAX_ATTACHMENT_SIZE_BYTES) fail('Archivo no disponible.');
  return attachment;
}
/** Reserve command durably, create object conditionally, then commit metadata. A lease serializes retries. */
export async function uploadBudgetDocument(db: Firestore, bucket: Bucket, budgetId: string, version: number, rawType: unknown, input: unknown, bytes: Buffer, actor: string) {
  const type = documentType(rawType), c = parseUploadFields(input);
  validateDocumentBytes(bytes, c.mimeType);
  const refs = caseRefs(db, budgetId, version);
  const attachmentId = `att_${sha(JSON.stringify([budgetId, version, type, c.commandId]))}`;
  const path = storagePath(budgetId, version, type, attachmentId), hash = sha(bytes);
  const digest = sha(JSON.stringify([version, type, c.originalName, c.mimeType, hash]));
  const command = refs.family.collection('documentCommands').doc(c.commandId);
  const owner = randomUUID();
  const reconciliationMessage = 'No se pudo completar la carga y quedó pendiente una reconciliación administrativa.';
  const operation = { commandId: c.commandId, budgetId, budgetVersion: version, documentType: type, attachmentId, storagePath: path, sha256: hash };
  const logPending = (reason: string, durableReservationRecorded: boolean) => console.error(JSON.stringify({
    event: 'DOCUMENT_UPLOAD_ROLLBACK_PENDING', budgetId, version, documentType: type,
    attachmentId, commandId: c.commandId, error: reason, durableReservationRecorded,
  }));
  const replay = await db.runTransaction(async tx => {
    const { documentation } = await loadDocumentation(db, budgetId, version, tx);
    const prior = await tx.get(command);
    if (prior.data()?.state === 'ROLLBACK_PENDING') fail(reconciliationMessage);
    if (prior.exists && prior.data()!.digest !== digest) fail('Conflicto de commandId: archivo diferente.');
    if (prior.data()?.state === 'COMMITTED') {
      const attachment = documentation.slots[type].attachments.find(a => a.attachmentId === attachmentId);
      if (!attachment) fail('El archivo de esta operación fue eliminado.');
      return attachment;
    }
    if (prior.exists && prior.data()!.leaseUntil > Date.now()) fail('Carga en curso; reintentá esta misma operación.');
    if (documentation.events.length >= 250 || documentation.slots[type].attachments.length >= 20) fail('Límite técnico de expediente.');
    tx.set(command, { ...operation, digest, owner, leaseUntil: Date.now() + 120000, state: 'RESERVED', reservedAt: new Date().toISOString() });
    return null;
  });
  if (replay) return replay;
  const file = bucket.file(path);
  let createdGeneration: string | undefined;
  try {
    const [exists] = await file.exists();
    if (exists) {
      if (sha((await file.download())[0]) !== hash) fail('Conflicto de objeto.');
    } else {
      try {
        await file.save(bytes, { resumable: false, preconditionOpts: { ifGenerationMatch: 0 }, metadata: { contentType: c.mimeType, cacheControl: 'private, no-store' } });
        createdGeneration = String((await file.getMetadata())[0].generation);
      } catch (error) {
        if ((error as { code?: number }).code !== 412) throw error;
        if (sha((await file.download())[0]) !== hash) fail('Conflicto de objeto.');
      }
    }
    const at = new Date().toISOString();
    const attachment: BudgetAttachment = { attachmentId, storagePath: path, originalName: c.originalName, mimeType: c.mimeType, size: bytes.length, uploadedAt: at, uploadedBy: actor, sha256: hash };
    return await db.runTransaction(async tx => {
      const { documentation } = await loadDocumentation(db, budgetId, version, tx);
      const current = await tx.get(command);
      if (current.data()?.owner !== owner || current.data()?.state !== 'RESERVED') fail('La operación perdió su reserva; reintentá.');
      const next = applyDocumentEvent(documentation, type, { type: 'UPLOADED', documentType: type, attachmentId, at, by: actor, note: null }, attachment);
      tx.set(refs.documentation, next); tx.update(command, { state: 'COMMITTED', leaseUntil: 0 }); return attachment;
    });
  } catch (error) {
    // Persist a non-expiring reconciliation lock BEFORE deleting. A lease takeover
    // cannot race compensation, and an uncertain commit must never lose its object.
    let disposition: 'COMMITTED' | 'LOST' | 'PENDING';
    try {
      disposition = await db.runTransaction(async tx => {
        const current = await tx.get(command);
        if (current.data()?.state === 'COMMITTED') return 'COMMITTED';
        if (current.data()?.owner !== owner || current.data()?.state !== 'RESERVED') return 'LOST';
        tx.update(command, { ...operation, state: 'ROLLBACK_PENDING', failureAt: new Date().toISOString(),
          objectGeneration: createdGeneration ?? null, rollbackReason: 'METADATA_OR_STORAGE_CONFIRMATION_FAILED' });
        return 'PENDING';
      });
    } catch {
      // Firestore can be entirely unavailable. Keep the original reservation,
      // log the distributed limit, and never pretend that a durable mark succeeded.
      logPending('RESERVATION_MARK_UNAVAILABLE', false);
      fail(reconciliationMessage);
    }
    if (disposition === 'PENDING') {
      // No deletion for reused objects or uncertain creation/generation.
      if (!createdGeneration) {
        logPending('OBJECT_NOT_CONFIRMED_NEW_IN_THIS_EXECUTION', true);
        fail(reconciliationMessage);
      }
      try {
        await file.delete({ ifGenerationMatch: Number(createdGeneration), ignoreNotFound: true });
      } catch {
        // The durable mark already contains the exact identity and generation.
        logPending('STORAGE_COMPENSATION_DELETE_FAILED', true);
        fail(reconciliationMessage);
      }
      try {
        await db.runTransaction(async tx => {
          const current = await tx.get(command);
          if (current.data()?.owner !== owner || current.data()?.state !== 'ROLLBACK_PENDING') fail(reconciliationMessage);
          tx.update(command, { state: 'COMPENSATED', leaseUntil: 0, compensatedAt: new Date().toISOString() });
        });
      } catch {
        logPending('COMPENSATION_CONFIRMATION_UNAVAILABLE', true);
        fail(reconciliationMessage);
      }
    }

    throw error;
  }
}
export async function downloadBudgetDocument(db: Firestore, bucket: Bucket, budgetId: string, version: number, type: DocumentType, id: string) {
  const attachment = await findAttachment(db, budgetId, version, type, id);
  const bytes = (await bucket.file(attachment.storagePath).download())[0];
  if (bytes.length !== attachment.size || sha(bytes) !== attachment.sha256) fail('El archivo no superó la validación de integridad.');
  validateDocumentBytes(bytes, attachment.mimeType); return { attachment, bytes };
}
export async function deleteBudgetDocument(db: Firestore, bucket: Bucket, budgetId: string, version: number, rawType: unknown, id: unknown, actor: string) {
  const type = documentType(rawType); validAttachmentId(id);
  const refs = caseRefs(db, budgetId, version);
  const { documentation } = await loadDocumentation(db, budgetId, version);
  const attachment = documentation.slots[type].attachments.find(a => a.attachmentId === id);
  if (!attachment) return documentation; // Idempotent: never derive a deletion path from an absent attachment.
  if (attachment.storagePath !== storagePath(budgetId, version, type, id)) fail('Identidad de archivo inconsistente.');
  await bucket.file(attachment.storagePath).delete({ ignoreNotFound: true });
  return db.runTransaction(async tx => {
    const { documentation: current } = await loadDocumentation(db, budgetId, version, tx);
    if (!current.slots[type].attachments.some(a => a.attachmentId === id)) return current;
    const next = applyDocumentEvent(current, type, { type: 'DELETED', documentType: type, attachmentId: id, at: new Date().toISOString(), by: actor, note: null });
    tx.set(refs.documentation, next); return next;
  });
}
export async function observeBudgetDocument(db: Firestore, budgetId: string, version: number, rawType: unknown, input: unknown, actor: string) {
  const type = documentType(rawType), c = budgetV2ExactObject(input, ['observation']);
  if (typeof c.observation !== 'string' || !c.observation.trim() || c.observation.length > 1000) fail('Escribí una observación de hasta 1000 caracteres.');
  const note = c.observation;
  return db.runTransaction(async tx => {
    const { documentation } = await loadDocumentation(db, budgetId, version, tx);
    const next = applyDocumentEvent(documentation, type, { type: 'OBSERVED', documentType: type, attachmentId: null, at: new Date().toISOString(), by: actor, note });
    tx.set(caseRefs(db, budgetId, version).documentation, next); return next;
  });
}
