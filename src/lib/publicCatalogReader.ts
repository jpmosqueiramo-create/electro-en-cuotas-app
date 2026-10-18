import type { Firestore } from "firebase-admin/firestore";
import { parsePublicCatalogReference, isPublicReferenceId } from "./publicCatalogContract";
import type { CatalogReferencePublic } from "./catalogReference";

// Sólo importado por handlers del servidor; sin SDK runtime en el contrato browser.
type PublicCatalogStore = Pick<Firestore, "collection">;
export async function readPublicCatalog(db: PublicCatalogStore): Promise<CatalogReferencePublic[]> {
  const snapshot = await db.collection("catalogo_publico").where("publicado", "==", true).get();
  const items: CatalogReferencePublic[] = [];
  for (const doc of snapshot.docs) {
    const dto = parsePublicCatalogReference(doc.id, doc.data());
    if (dto) items.push(dto);
    else console.warn("PUBLIC_CATALOG_INVALID_DOCUMENT", { referenciaId: doc.id });
  }
  const normalized = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const compare = (a: string, b: string) => a < b ? -1 : a > b ? 1 : 0;
  return items.sort((a,b) => compare(normalized(a.nombre),normalized(b.nombre)) || compare(a.referenciaId,b.referenciaId));
}
export async function readPublicCatalogReference(db: PublicCatalogStore, id: string): Promise<CatalogReferencePublic | null> {
  if (!isPublicReferenceId(id)) return null;
  const snapshot = await db.collection("catalogo_publico").doc(id).get();
  if (!snapshot.exists) return null;
  const dto = parsePublicCatalogReference(snapshot.id, snapshot.data());
  if (!dto) console.warn("PUBLIC_CATALOG_INVALID_DOCUMENT", { referenciaId: id });
  return dto;
}
