import { admin } from "@/lib/firebaseAdmin";
import { readPublicCatalogReference } from "@/lib/publicCatalogReader";
import { isPublicReferenceId } from "@/lib/publicCatalogContract";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const headers = { "Cache-Control": "no-store" };
  if (!isPublicReferenceId(id)) return Response.json({ error: "Referencia inválida." }, { status: 400, headers });
  try {
    const dto = await readPublicCatalogReference(admin.firestore(), id);
    return dto ? Response.json(dto, { headers }) : Response.json({ error: "Referencia no disponible." }, { status: 404, headers });
  } catch { console.error("PUBLIC_CATALOG_DETAIL_FAILED"); return Response.json({ error: "Referencia no disponible." }, { status: 500, headers }); }
}
