import { NextResponse } from 'next/server';
import { admin } from '@/lib/firebaseAdmin';
import { isAdminEmail } from '@/lib/adminIdentity';
import { contractHeaders, contractJson } from '@/lib/contractV2Http';
import { LabError, requireLabAccess } from '@/lib/operationsLabPolicy';
import { createLabSession, listLabSessions } from '@/lib/operationsLabServer';
export const runtime = 'nodejs';
async function handle(req: Request) {
  try {
    const bearer = req.headers.get('authorization');
    if (!bearer?.startsWith('Bearer ')) throw new LabError(401, 'LAB_AUTH_REQUIRED');
    let uid: string;
    try {
      const decoded = await admin.auth().verifyIdToken(bearer.slice(7), true);
      const user = await admin.auth().getUser(decoded.uid);
      if (user.disabled || !user.emailVerified || !isAdminEmail(user.email)) throw new Error('denied');
      uid = user.uid;
    } catch { throw new LabError(403, 'LAB_ACCESS_DENIED'); }
    requireLabAccess(uid, process.env);
    const body = req.method === 'GET'
      ? { sessions: await listLabSessions(admin.firestore(), uid, process.env), circuitEnabled: false }
      : await createLabSession(admin.firestore(), uid, await contractJson(req), process.env);
    return NextResponse.json(body, { headers: contractHeaders });
  } catch (error) {
    return NextResponse.json({ error: error instanceof LabError ? error.code : 'LAB_UNAVAILABLE' }, { status: error instanceof LabError ? error.status : 503, headers: contractHeaders });
  }
}
export const GET = handle;
export const POST = handle;
