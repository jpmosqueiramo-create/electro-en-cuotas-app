import { admin } from '@/lib/firebaseAdmin';
import { portalIdentity, activePortalAffiliate } from '@/lib/legacyPortalServer';
import { readPublicCatalog } from '@/lib/publicCatalogReader';
import { contractHeaders } from '@/lib/contractV2Http';
export const runtime = 'nodejs';
export async function GET(req: Request) {
  try { await activePortalAffiliate(admin.firestore(), await portalIdentity(req)); }
  catch { return Response.json({ error: 'Se requiere una cuenta activa de vendedor afiliado con correo verificado.' }, { status: 403, headers: contractHeaders }); }
  try { return Response.json({ items: await readPublicCatalog(admin.firestore()) }, { headers: contractHeaders }); }
  catch { return Response.json({ error: 'No pudimos cargar el catálogo. Reintentá.' }, { status: 503, headers: contractHeaders }); }
}
