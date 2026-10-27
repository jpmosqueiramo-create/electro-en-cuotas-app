import { admin } from '@/lib/firebaseAdmin';
import { readCatalogVisibility } from '@/lib/catalogVisibility';
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export async function GET() {
  const headers = { 'Cache-Control': 'no-store' };
  try { return Response.json({ homeVisible: (await readCatalogVisibility(admin.firestore())).homeVisible }, { headers }); }
  catch { return Response.json({ error: 'No se pudo consultar la visibilidad.' }, { status: 503, headers }); }
}
