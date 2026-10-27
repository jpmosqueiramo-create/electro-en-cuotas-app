import type { Firestore } from 'firebase-admin/firestore';

export const catalogVisibilityPath = 'configuracion_general/catalogo_visibilidad';
export interface CatalogVisibility { homeVisible: boolean; revision: number }
function parse(data: Record<string, unknown> | undefined): CatalogVisibility {
  if (!data) return { homeVisible: true, revision: 0 };
  if (data.schemaVersion !== 1 || typeof data.homeVisible !== 'boolean' || !Number.isSafeInteger(data.revision) || Number(data.revision) < 1) throw Error('Configuración de catálogo inválida.');
  return { homeVisible: data.homeVisible, revision: Number(data.revision) };
}
export async function readCatalogVisibility(db: Firestore): Promise<CatalogVisibility> {
  return parse((await db.doc(catalogVisibilityPath).get()).data());
}
/** Explicit desired state + revision: retries never invert the last saved choice. */
export async function setCatalogVisibility(db: Firestore, homeVisible: boolean, expectedRevision: number, actor: string) {
  if (typeof homeVisible !== 'boolean' || !Number.isSafeInteger(expectedRevision) || expectedRevision < 0) throw Error('Cambio de visibilidad inválido.');
  const ref = db.doc(catalogVisibilityPath);
  return db.runTransaction(async tx => {
    const current = parse((await tx.get(ref)).data());
    if (current.homeVisible === homeVisible) return current;
    if (current.revision !== expectedRevision) throw Error('La visibilidad cambió en otra sesión. Actualizá antes de volver a guardar.');
    const next = { homeVisible, revision: current.revision + 1 };
    tx.set(ref, { schemaVersion: 1, ...next, updatedAt: new Date().toISOString(), updatedBy: actor });
    return next;
  });
}
