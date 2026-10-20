import { NextResponse } from 'next/server';
import { admin } from '@/lib/firebaseAdmin';
import { requireInvitationEmulator } from '@/lib/operationClientV2';
import { clientPortalUid } from '@/lib/operationClientV2Http';
import { inspectClientInvitation,redeemClientInvitation } from '@/lib/operationClientV2Server';
import { contractHeaders,contractJson } from '@/lib/contractV2Http';
import { isPublicSolicitudOriginAllowed } from '@/lib/publicSolicitudOrigin';
import { exact } from '@/lib/contractV2';
export const runtime='nodejs';
export async function POST(req:Request,ctx:{params:Promise<{invitationId:string}>}) {
 try {
  requireInvitationEmulator();if(!isPublicSolicitudOriginAllowed(req.headers.get('origin')))throw Error();
  const {invitationId}=await ctx.params,c=await contractJson(req) as Record<string,unknown>;
  if(c.action==='INSPECT'){exact(c,['action','token']);return NextResponse.json(await inspectClientInvitation(admin.firestore(),invitationId,c.token),{headers:contractHeaders});}
  exact(c,['action','token','commandId']);if(c.action!=='REDEEM'||typeof c.commandId!=='string')throw Error();
  return NextResponse.json(await redeemClientInvitation(admin.firestore(),invitationId,c.token,c.commandId,await clientPortalUid(req)),{headers:contractHeaders});
 }catch{return NextResponse.json({error:'La invitación no está disponible. Verificá tu cuenta y email, o consultá a Administración.'},{status:403,headers:contractHeaders});}
}
