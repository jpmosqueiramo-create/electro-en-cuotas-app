import { NextResponse } from 'next/server';
import { admin } from '@/lib/firebaseAdmin';
import { portalIdentity } from '@/lib/legacyPortalServer';
import { contractHeaders, contractJson } from '@/lib/contractV2Http';
import { exact } from '@/lib/contractV2';
import { acceptAffiliateInvitation } from '@/lib/affiliateInvitations';
export async function POST(req: Request) {
 let actor;
 try { actor = await portalIdentity(req); } catch { return NextResponse.json({ error: 'Ingresá con el correo verificado que recibió la invitación.' }, { status: 403, headers: contractHeaders }); }
 try { const b = exact(await contractJson(req), ['vendorId', 'invitationId']); return NextResponse.json(await acceptAffiliateInvitation(admin.firestore(), String(b.vendorId), String(b.invitationId), actor), { headers: contractHeaders }); }
 catch { return NextResponse.json({ error: 'La invitación no está disponible para esta cuenta. Pedí a Administración un nuevo enlace.' }, { status: 409, headers: contractHeaders }); }
}
