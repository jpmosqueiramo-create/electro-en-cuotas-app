import { NextResponse } from 'next/server';
import { admin } from '@/lib/firebaseAdmin';
import {isAdminEmail} from '@/lib/adminIdentity';
import { verifyAdminAuth } from '@/lib/adminAuth';
import { contractHeaders } from '@/lib/contractV2Http';
import { readProductionReadiness } from '@/lib/productionReadinessV2Server';
export const runtime = 'nodejs';
export async function GET(req: Request, {params}: {params: Promise<{budgetId:string;version:string}>}) {
  const auth = await verifyAdminAuth(req);
  if (!auth.authorized) return auth.errorResponse!;
  try {
    // Re-read Auth: a valid cached ID token alone must not admit disabled/revoked admins.
    const decoded = await admin.auth().verifyIdToken(req.headers.get('authorization')!.slice(7), true);
    const user = await admin.auth().getUser(auth.uid!);
    if (decoded.uid !== user.uid || user.disabled || !user.emailVerified || !isAdminEmail(user.email)) return NextResponse.json({error:'Se requiere una cuenta administrativa activa con correo verificado.'},{status:403,headers:contractHeaders});
  } catch {
    return NextResponse.json({error:'Acceso administrativo no vigente.'},{status:403,headers:contractHeaders});
  }
  try {
    const {budgetId,version} = await params;
    if (!/^[1-9][0-9]*$/.test(version)) throw Error('INVALID_VERSION');
    return NextResponse.json(await readProductionReadiness(admin.firestore(),budgetId,Number(version)),{headers:contractHeaders});
  } catch {
    return NextResponse.json({error:'No se pudo verificar la preparación productiva. Revisá el acceso y los vínculos de esta operación. No se habilitó ninguna acción real.'},{status:409,headers:contractHeaders});
  }
}
