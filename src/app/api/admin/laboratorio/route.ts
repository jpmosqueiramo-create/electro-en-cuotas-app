import { NextResponse } from 'next/server';
import { admin } from '@/lib/firebaseAdmin';
import { requireLabAdministrator } from '@/lib/operationsLabAuth';
import { contractHeaders, contractJson } from '@/lib/contractV2Http';
import { LabError } from '@/lib/operationsLabPolicy';
import { createLabSession, listLabSessions } from '@/lib/operationsLabServer';
export const runtime = 'nodejs';
async function handle(req: Request) {
  try {
    const uid=await requireLabAdministrator(req);
    const body = req.method === 'GET'
      ? { sessions: await listLabSessions(admin.firestore(), uid, process.env), circuitEnabled: true }
      : await createLabSession(admin.firestore(), uid, await contractJson(req), process.env);
    return NextResponse.json(body, { headers: contractHeaders });
  } catch (error) {
    return NextResponse.json({ error: error instanceof LabError ? error.code : 'LAB_UNAVAILABLE' }, { status: error instanceof LabError ? error.status : 503, headers: contractHeaders });
  }
}
export const GET = handle;
export const POST = handle;
