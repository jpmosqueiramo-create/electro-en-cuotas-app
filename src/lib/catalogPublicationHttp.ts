import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth } from "./adminAuth";
import { admin } from "./firebaseAdmin";
import { assertCatalogReferenceId, CatalogPublicationError } from "./catalogPublicationContent";
import {
  previewCatalogReferencePublication, publishCatalogReference, unpublishCatalogReference,
} from "./catalogPublicationService";

export type CatalogPublicationContext = { params: Promise<{ id: string }> };

export async function handleCatalogPublication(
  req: NextRequest, context: CatalogPublicationContext,
  action: "preview" | "publish" | "unpublish",
) {
  const auth = await verifyAdminAuth(req);
  if (!auth.authorized || auth.errorResponse) {
    return auth.errorResponse ?? NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  const headers = { "Cache-Control": "no-store" };
  try {
    const { id } = await context.params;
    assertCatalogReferenceId(id);
    if (action === "preview") {
      const preview = await previewCatalogReferencePublication(admin.firestore(), id);
      return NextResponse.json(preview, { status: preview.validation.valid ? 200 : 400, headers });
    }
    if (action === "unpublish") {
      return NextResponse.json(await unpublishCatalogReference(admin.firestore(), id), { headers });
    }
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      throw new CatalogPublicationError(400, "INVALID_PUBLICATION_COMMAND");
    }
    // El ID viene de ruta; el cliente sólo puede aportar el fingerprint revisado.
    if (!body || typeof body !== "object" || Array.isArray(body) ||
        Object.keys(body).length !== 1 || !("expectedFingerprint" in body) ||
        typeof body.expectedFingerprint !== "string") {
      throw new CatalogPublicationError(400, "INVALID_PUBLICATION_COMMAND");
    }
    return NextResponse.json(await publishCatalogReference(
      admin.firestore(), id, body.expectedFingerprint,
    ), { headers });
  } catch (error) {
    if (error instanceof CatalogPublicationError) {
      return NextResponse.json({ error: error.code }, { status: error.status, headers });
    }
    // No devolver payloads privados, detalles SDK ni credenciales al navegador.
    return NextResponse.json({ error: "CATALOG_PUBLICATION_FAILED" }, { status: 500, headers });
  }
}
