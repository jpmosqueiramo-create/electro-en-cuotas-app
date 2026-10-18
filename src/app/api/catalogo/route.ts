import { admin } from "@/lib/firebaseAdmin";
import { readPublicCatalog } from "@/lib/publicCatalogReader";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export async function GET() {
  try { return Response.json({ items: await readPublicCatalog(admin.firestore()) }, { headers: { "Cache-Control": "no-store" } }); }
  catch { console.error("PUBLIC_CATALOG_READ_FAILED"); return Response.json({ error: "Catálogo no disponible." }, { status: 500, headers: { "Cache-Control": "no-store" } }); }
}
