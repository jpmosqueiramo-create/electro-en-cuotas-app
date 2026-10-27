import { NextResponse } from 'next/server';
import { admin } from '@/lib/firebaseAdmin';
import { custodyAuth, custodyParams } from '@/lib/operationCustodyV2Http';
import { contractJson, contractHeaders } from '@/lib/contractV2Http';
import { affiliateEngagement } from '@/lib/affiliateEngagementV2';
export const runtime = 'nodejs';
async function handler(req: Request, context: { params: Promise<{ budgetId: string; version: string }> }) {
  try {
    const actor = await custodyAuth(req, true), p = await context.params;
    const result = await affiliateEngagement(admin.firestore(), p.budgetId, custodyParams(p.budgetId, p.version), actor, req.method === 'GET' ? undefined : await contractJson(req));
    return NextResponse.json(result, { headers: contractHeaders });
  } catch { return NextResponse.json({ error: 'Contacto no disponible para esta operación e identidad.' }, { status: 403, headers: contractHeaders }); }
}
export { handler as GET, handler as POST };
