import { collection, doc, runTransaction, Timestamp, type Firestore } from 'firebase/firestore';

export interface CatalogCreateAttempt { id: string; data: Record<string, unknown> }
export class CatalogCreateConflict extends Error {
  constructor(readonly id: string, readonly current: Record<string, unknown>) {
    super('La ficha cambió durante el guardado. Se abrió su versión actual para revisarla; no se creó otro producto.');
  }
}
export function prepareCatalogCreate(db: Firestore, patch: Record<string, unknown>): CatalogCreateAttempt {
  return { id: doc(collection(db, 'productos')).id, data: { ...patch, activo: false, publicado: false, fechaCreacion: Timestamp.now() } };
}
export function sameCatalogCreationValue(expected: unknown, actual: unknown): boolean {
  if (expected instanceof Timestamp) return actual instanceof Timestamp && expected.isEqual(actual);
  if (Array.isArray(expected)) return Array.isArray(actual) && expected.length === actual.length && expected.every((v, i) => sameCatalogCreationValue(v, actual[i]));
  if (expected && typeof expected === 'object') {
    if (!actual || typeof actual !== 'object' || Array.isArray(actual)) return false;
    const a = expected as Record<string, unknown>, b = actual as Record<string, unknown>;
    return Object.keys(a).length === Object.keys(b).length && Object.keys(a).every(k => sameCatalogCreationValue(a[k], b[k]));
  }
  return Object.is(expected, actual);
}
/** One reserved ID per attempt. A lost response cannot create another product or overwrite a concurrent edit. */
export async function saveCatalogCreate(db: Firestore, attempt: CatalogCreateAttempt) {
  const ref = doc(db, 'productos', attempt.id);
  await runTransaction(db, async tx => {
    const current = await tx.get(ref);
    if (current.exists()) {
      const data = current.data();
      if (!Object.keys(attempt.data).every(k => sameCatalogCreationValue(attempt.data[k], data[k]))) throw new CatalogCreateConflict(attempt.id, data);
      return;
    }
    tx.set(ref, attempt.data);
  });
  return attempt.id;
}
