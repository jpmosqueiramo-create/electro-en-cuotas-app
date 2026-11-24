import { NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/adminAuth';
import { admin } from '@/lib/firebaseAdmin';
import { contractHeaders, contractJson } from '@/lib/contractV2Http';
import { FollowUpError } from '@/lib/adminSolicitudFollowUp';
import { readFollowUp, writeFollowUp } from '@/lib/adminSolicitudFollowUpServer';
export const runtime = 'nodejs';
async function handler(req: Request, context: { params: Promise<{ source: string; id: string }> }) {
  const auth = await verifyAdminAuth(req);
  if (!auth.authorized) return NextResponse.json({ error: 'Acceso Admin requerido.' }, { status: auth.errorResponse?.status === 403 ? 403 : 401, headers: contractHeaders });
  try {
    const { source, id } = await context.params;
    if (req.method === 'GET') {
      const query = new URL(req.url).searchParams;
      const raw = query.get('before');
      if ([...query.keys()].some(k => k !== 'before') || query.getAll('before').length > 1 || raw !== null && !/^[1-9][0-9]{0,15}$/.test(raw)) throw new FollowUpError('INVALID', 'Página inválida.');
      return NextResponse.json(await readFollowUp(admin.firestore(), source, id, raw === null ? undefined : Number(raw)), { headers: contractHeaders });
    }
    let input: unknown;
    try { input = await contractJson(req); } catch { throw new FollowUpError('INVALID', 'Solicitud inválida o demasiado grande.'); }
    const result = await writeFollowUp(admin.firestore(), source, id, input, { uid: auth.uid!, email: auth.email! });
    return NextResponse.json(result, { headers: contractHeaders });
  } catch (error) {
    const known = error instanceof FollowUpError;
    const status = known ? { INVALID: 400, CONFLICT: 409, NOT_FOUND: 404, INACTIVE: 409, CORRUPT: 503 }[error.code] : 503;
    return NextResponse.json({ error: known ? error.message : 'No se pudo confirmar la operación. Reintentá con la misma referencia de guardado.', code: known ? error.code : 'UNAVAILABLE' }, { status, headers: contractHeaders });
  }
}
export { handler as GET, handler as POST };
