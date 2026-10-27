import { NextResponse } from 'next/server';
import { admin } from '@/lib/firebaseAdmin';
import { custodyAuth } from '@/lib/operationCustodyV2Http';
import { contractHeaders, contractJson } from '@/lib/contractV2Http';
import { exact } from '@/lib/contractV2';
import { inviteAffiliate } from '@/lib/affiliateInvitations';
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
 let actor;
 try { actor = await custodyAuth(req, true); } catch { return NextResponse.json({ error: 'Acceso administrativo requerido.' }, { status: 403, headers: contractHeaders }); }
 try {
  const { id } = await ctx.params, body = exact(await contractJson(req), ['commandId']);
  const result = await inviteAffiliate(admin.firestore(), id, String(body.commandId), actor.uid);
  return NextResponse.json(result, { headers: contractHeaders });
 } catch (e) { return NextResponse.json({ error: e instanceof Error ? e.message : 'No se confirmó la invitación.' }, { status: 409, headers: contractHeaders }); }
}
