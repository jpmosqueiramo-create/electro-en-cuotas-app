import { NextResponse } from 'next/server';
import { admin } from '@/lib/firebaseAdmin';
import { custodyAuth } from '@/lib/operationCustodyV2Http';
import { contractHeaders, contractJson } from '@/lib/contractV2Http';
import { saveAffiliateProfile, type AffiliateProfileInput } from '@/lib/affiliateRegistryServer';

export async function POST(req: Request) {
 let actor;
 try {
  actor = await custodyAuth(req, true);
 } catch {
  return NextResponse.json({ error: 'Acceso administrativo requerido.' }, { status: 403, headers: contractHeaders });
 }
 try {
  const body = await contractJson(req) as AffiliateProfileInput & { mode?: string };
  if (body.mode && body.mode !== 'PREVIEW') throw Error('Modo inválido.');
  const result = await saveAffiliateProfile(admin.firestore(), body, actor.uid, body.mode === 'PREVIEW');
  return NextResponse.json(result, { headers: contractHeaders });
 } catch {
  return NextResponse.json({ error: 'No se confirmó el registro. Verificá datos, UID y revisión; reintentá el mismo envío si perdiste la respuesta.' }, { status: 409, headers: contractHeaders });
 }
}
