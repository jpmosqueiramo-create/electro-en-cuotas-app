import type { Firestore } from "firebase-admin/firestore";
import {
  assertCatalogReferenceId,
  CatalogPublicationError,
  isCurrentCatalogProjection,
  prepareCatalogPublication,
} from "./catalogPublicationContent";

type PublicationStore = Pick<Firestore, "doc" | "runTransaction">;

/** Infraestructura servidor; callers HTTP deben autorizar mediante verifyAdminAuth. */
export async function previewCatalogReferencePublication(db: PublicationStore, id: string) {
  assertCatalogReferenceId(id);
  return db.runTransaction(async transaction => {
    const privateSnapshot = await transaction.get(db.doc(`productos/${id}`));
    if (!privateSnapshot.exists) throw new CatalogPublicationError(404, "REFERENCE_NOT_FOUND");
    const current = await transaction.get(db.doc(`catalogo_publico/${id}`));
    const prepared = prepareCatalogPublication(id, privateSnapshot.data()!);
    return {
      referenciaId: id,
      ...prepared,
      hasPublicProjection: current.exists,
      hasUnpublishedChanges: !prepared.dto || !isCurrentCatalogProjection(current.data(), prepared.dto),
    };
  });
}

export async function publishCatalogReference(
  db: PublicationStore, id: string, expectedFingerprint: string,
) {
  assertCatalogReferenceId(id);
  if (typeof expectedFingerprint !== "string" || !/^[a-f0-9]{64}$/.test(expectedFingerprint)) {
    throw new CatalogPublicationError(400, "INVALID_EXPECTED_FINGERPRINT");
  }
  return db.runTransaction(async transaction => {
    const privateSnapshot = await transaction.get(db.doc(`productos/${id}`));
    if (!privateSnapshot.exists) throw new CatalogPublicationError(404, "REFERENCE_NOT_FOUND");
    const prepared = prepareCatalogPublication(id, privateSnapshot.data()!);
    if (!prepared.dto || !prepared.fingerprint) {
      throw new CatalogPublicationError(400, "INVALID_REFERENCE_FOR_PUBLICATION");
    }
    if (prepared.fingerprint !== expectedFingerprint) {
      throw new CatalogPublicationError(409, "REFERENCE_CHANGED_SINCE_PREVIEW");
    }
    const publicRef = db.doc(`catalogo_publico/${id}`);
    const current = await transaction.get(publicRef);
    if (isCurrentCatalogProjection(current.data(), prepared.dto)) {
      return { status: "ALREADY_CURRENT" as const, referenciaId: id, fingerprint: prepared.fingerprint };
    }
    // Reemplazo completo: sin merge, versiones paralelas ni metadata adicional.
    transaction.set(publicRef, prepared.dto);
    return { status: "PUBLISHED" as const, referenciaId: id, fingerprint: prepared.fingerprint };
  });
}

export async function unpublishCatalogReference(db: PublicationStore, id: string) {
  assertCatalogReferenceId(id);
  return db.runTransaction(async transaction => {
    const privateSnapshot = await transaction.get(db.doc(`productos/${id}`));
    if (!privateSnapshot.exists) throw new CatalogPublicationError(404, "REFERENCE_NOT_FOUND");
    const publicRef = db.doc(`catalogo_publico/${id}`);
    const current = await transaction.get(publicRef);
    if (!current.exists) return { status: "ALREADY_UNPUBLISHED" as const, referenciaId: id };
    transaction.delete(publicRef);
    return { status: "UNPUBLISHED" as const, referenciaId: id };
  });
}
