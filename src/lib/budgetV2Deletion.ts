import { createHash } from 'node:crypto';
import type { DocumentReference, DocumentSnapshot, Firestore, Transaction } from 'firebase-admin/firestore';
import { budgetV2OpaqueId, validateBudgetV2 } from './budgetV2';
import { privateBudgetReferenceId } from './budgetV2Persistence';

export const BUDGET_DELETE_LIMIT = 180;
export const budgetDeletionRef = (db: Firestore, id: string) => db.collection('budgetDeletionAuditV2').doc(id);
const hash = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
function validId(id: unknown): asserts id is string {
  if (!budgetV2OpaqueId(id) || String(id).startsWith('_')) throw Error('Identificador de presupuesto inválido.');
}
export interface BudgetDeletionPreview {
  budgetId: string; client: string; products: string[]; versions: number[];
  paths: string[]; blockers: string[]; preservedSource: string; fingerprint: string; allowed: boolean;
}
export const budgetDeletionQueries = (db: Firestore, id: string) => [
  db.collection('productos').where('originBudgetId', '==', id),
  db.collection('contractClientDataRequests').where('budgetId', '==', id),
  db.collection('contractSnapshotsV2').where('sourceDraft.budgetId', '==', id),
  db.collection('contractOriginEvidenceV2').where('source.draft.budgetId', '==', id),
  db.collection('contractInfrastructureFixturesV2').where('source.draft.budgetId', '==', id),
  db.collection('ledger_comisiones_movimientos').where('budgetId', '==', id),
];
/** Enumerate metadata only; never recurse to delete. Unknown/nested structures block deletion. */
export async function inspectBudgetTree(ref: DocumentReference) {
  const refs: DocumentReference[] = [ref], blockers: string[] = [];
  for (let i = 0; i < refs.length; i++) {
    const children = await refs[i].listCollections();
    for (const col of children) {
      if (i > 0 || !['versions', 'commands'].includes(col.id)) blockers.push(col.path);
      const docs = await col.listDocuments(); // Includes missing parents with descendants.
      if (refs.length + docs.length > BUDGET_DELETE_LIMIT) throw Error('La familia supera el límite seguro; requiere un inventario específico.');
      refs.push(...docs);
    }
  }
  return { refs, blockers };
}
export function buildBudgetDeletionInventory(id: string, snapshots: DocumentSnapshot[], structural: string[], external: string[]): BudgetDeletionPreview {
  const family = snapshots[0], blockers = [...structural, ...external];
  if (!family.exists) throw Error('El presupuesto no existe o ya fue eliminado.');
  const versions = snapshots.filter(s => s.ref.parent.path === `${family.ref.path}/versions`);
  const commands = snapshots.filter(s => s.ref.parent.path === `${family.ref.path}/commands`);
  if (!versions.length) blockers.push('Familia sin versiones verificables.');
  for (const snapshot of versions) {
    try { validateBudgetV2(snapshot.data(), privateBudgetReferenceId); if (snapshot.data()!.id !== id || String(snapshot.data()!.version) !== snapshot.id) throw Error(); }
    catch { blockers.push(`Estructura no reconocida: ${snapshot.ref.path}`); }
  }
  for (const snapshot of commands) {
    try { const c = snapshot.data(); if (!c || Object.keys(c).some(k => !['digest','result','actor','createdAt'].includes(k)) || typeof c.digest !== 'string' || typeof c.actor !== 'string') throw Error(); validateBudgetV2(c.result, privateBudgetReferenceId); if (c.result.id !== id) throw Error(); }
    catch { blockers.push(`Comando no reconocido: ${snapshot.ref.path}`); }
  }
  const f = family.data()!;
  if (Object.keys(f).some(k => !['sourceCollection','solicitudId','lastVersion','updatedAt'].includes(k))) blockers.push('La familia contiene campos no reconocidos; requiere revisión.');
  if (!['solicitudes', 'solicitudes_cuenta'].includes(f.sourceCollection) || (typeof f.solicitudId !== 'string' || !f.solicitudId || f.solicitudId.includes('/'))) blockers.push('Origen no verificable.');
  const data = versions.map(s => s.data()!);
  if (data.some(v => v.sourceCollection !== f.sourceCollection || v.solicitudId !== f.solicitudId) || f.lastVersion !== Math.max(...data.map(v => Number(v.version))) || data.map(v => Number(v.version)).sort((a,b)=>a-b).some((v,i)=>v!==i+1)) blockers.push('Vínculos o versiones de familia inconsistentes.');
  const paths = snapshots.filter(s => s.exists).map(s => s.ref.path).sort();
  const fingerprint = hash(snapshots.map(s => [s.ref.path, s.exists, s.updateTime?.toDate().toISOString(), s.updateTime?.nanoseconds]).sort((a, b) => String(a[0]).localeCompare(String(b[0]))));
  return { budgetId: id, client: String(data[0]?.clienteSnapshot?.nombre ?? ''), products: [...new Set(data.flatMap(v => v.options?.map((o: {referenceSnapshot: {nombre: string}}) => o.referenceSnapshot.nombre) ?? []))] as string[], versions: data.map(v => Number(v.version)).sort((a,b) => a-b), paths, blockers: [...new Set(blockers)].sort(), preservedSource: `${f.sourceCollection}/${f.solicitudId}`, fingerprint, allowed: blockers.length === 0 };
}
async function readInventory(db: Firestore, id: string, tx?: Transaction) {
  const tree = await inspectBudgetTree(db.collection('presupuestos_v2').doc(id));
  const [snapshots, external] = await Promise.all([
    tx ? tx.getAll(...tree.refs) : db.getAll(...tree.refs),
    Promise.all(budgetDeletionQueries(db, id).map(q => tx ? tx.get(q.limit(BUDGET_DELETE_LIMIT + 1)) : q.limit(BUDGET_DELETE_LIMIT + 1).get())),
  ]);
  // Query reads protect against concurrent SAVE/REVISE/ISSUE inserts as well as updates.
  if (tx) for (const name of ['versions', 'commands', 'acceptances', 'documentation']) {
    const current = await tx.get(tree.refs[0].collection(name).limit(BUDGET_DELETE_LIMIT + 1));
    if (current.docs.some(d => !tree.refs.some(r => r.path === d.ref.path))) throw Error('El presupuesto cambió. Verificá nuevamente antes de eliminar.');
  }
  const family = snapshots[0].data();
  if (family && ['solicitudes','solicitudes_cuenta'].includes(family.sourceCollection) && typeof family.solicitudId === 'string' && family.solicitudId && !family.solicitudId.includes('/')) {
    const sourceRef = db.collection(family.sourceCollection).doc(family.solicitudId);
    const source = tx ? await tx.get(sourceRef) : await sourceRef.get();
    if (!source.exists) tree.blockers.push('La solicitud de origen no está disponible; requiere revisión.');
  }
  return { preview: buildBudgetDeletionInventory(id, snapshots, tree.blockers, external.flatMap(s => s.docs.map(d => d.ref.path))), snapshots };
}
export async function previewBudgetDeletion(db: Firestore, id: string) {
  validId(id);
  if ((await budgetDeletionRef(db, id).get()).exists) throw Error('El presupuesto ya fue eliminado.');
  return (await readInventory(db, id)).preview;
}
export async function deleteBudgetFamily(db: Firestore, input: unknown, actor: string) {
  const c = input as {budgetId: string; commandId: string; fingerprint: string; confirm: boolean};
  if (!c || Object.keys(c).sort().join(',') !== 'budgetId,commandId,confirm,fingerprint') throw Error('Comando inválido.');
  validId(c.budgetId); validId(c.commandId);
  if (c.confirm !== true || !/^[a-f0-9]{64}$/.test(c.fingerprint)) throw Error('Confirmación inválida.');
  const digest = hash([c.budgetId, c.commandId, c.fingerprint, c.confirm]), audit = budgetDeletionRef(db, c.budgetId);
  return db.runTransaction(async tx => {
    const old = await tx.get(audit);
    if (old.exists) {
      if (old.data()!.digest !== digest || old.data()!.actor !== actor) throw Error('Conflicto: el presupuesto ya fue eliminado por otro comando.');
      return old.data()!.result as {budgetId: string; deletedPaths: string[]; deletedAt: string};
    }
    const {preview, snapshots} = await readInventory(db, c.budgetId, tx);
    if (!preview.allowed) throw Error('El presupuesto tiene dependencias. No se eliminó ningún registro.');
    if (preview.fingerprint !== c.fingerprint) throw Error('El presupuesto cambió. Verificá nuevamente antes de eliminar.');
    const result = {budgetId: c.budgetId, deletedPaths: preview.paths, deletedAt: new Date().toISOString()};
    tx.create(audit, {schemaVersion: 'BUDGET_DELETION_V1', commandId: c.commandId, digest, actor, preservedSource: preview.preservedSource, result});
    for (const snapshot of snapshots) if (snapshot.exists) tx.delete(snapshot.ref);
    return result;
  });
}
