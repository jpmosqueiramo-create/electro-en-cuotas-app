import { NextResponse } from 'next/server';
import { admin } from '@/lib/firebaseAdmin';
import { portalIdentity } from '@/lib/legacyPortalServer';
import { readAffiliateCommissions } from '@/lib/affiliateCommissionPortal';
import { contractHeaders } from '@/lib/contractV2Http';
export async function GET(req:Request){try{return NextResponse.json(await readAffiliateCommissions(admin.firestore(),await portalIdentity(req)),{headers:contractHeaders});}catch{return NextResponse.json({error:'Comisiones no disponibles para esta identidad.'},{status:403,headers:contractHeaders});}}
