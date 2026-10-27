import { admin } from '@/lib/firebaseAdmin';
import { verifyAdminAuth } from '@/lib/adminAuth';
import { readCatalogVisibility, setCatalogVisibility } from '@/lib/catalogVisibility';
import { contractHeaders, contractJson } from '@/lib/contractV2Http';
import { exact } from '@/lib/contractV2';
export const runtime = 'nodejs';
export async function GET(req: Request) {
  const actor = await verifyAdminAuth(req); if (!actor.authorized) return actor.errorResponse!;
  try { return Response.json(await readCatalogVisibility(admin.firestore()), { headers: contractHeaders }); }
  catch { return Response.json({ error: 'No se pudo consultar la visibilidad.' }, { status: 503, headers: contractHeaders }); }
}
export async function POST(req: Request) {
  const actor = await verifyAdminAuth(req); if (!actor.authorized) return actor.errorResponse!;
  try {
    const body = exact(await contractJson(req), ['homeVisible', 'expectedRevision']);
    if (typeof body.homeVisible !== 'boolean' || typeof body.expectedRevision !== 'number') throw Error('Cambio de visibilidad inválido.');
    return Response.json(await setCatalogVisibility(admin.firestore(), body.homeVisible, body.expectedRevision, actor.uid!), { headers: contractHeaders });
  } catch (e) { return Response.json({ error: e instanceof Error ? e.message : 'No se confirmó el cambio.' }, { status: 409, headers: contractHeaders }); }
}
