import { NextResponse } from 'next/server';
import { admin } from '@/lib/firebaseAdmin';
import { custodyAuth } from '@/lib/operationCustodyV2Http';
import { contractHeaders,contractJson } from '@/lib/contractV2Http';
import { saveAffiliateProfile,type AffiliateProfileInput } from '@/lib/affiliateRegistryServer';
export async function POST(req:Request){let actor;try{actor=await custodyAuth(req,true);}catch{return NextResponse.json({error:'Acceso administrativo requerido.'},{status:403,headers:contractHeaders});}try{return NextResponse.json(await saveAffiliateProfile(admin.firestore(),await contractJson(req) as AffiliateProfileInput,actor.uid),{headers:contractHeaders});}catch{return NextResponse.json({error:'No se confirmó el registro. Verificá datos, UID y revisión; reintentá el mismo envío si perdiste la respuesta.'},{status:409,headers:contractHeaders});}}
