import { NextResponse } from 'next/server';
import { admin } from '@/lib/firebaseAdmin';
import { custodyAuth } from '@/lib/operationCustodyV2Http';
import { listAffiliateOperations } from '@/lib/operationCustodyV2Server';
import { contractHeaders } from '@/lib/contractV2Http';
export const runtime='nodejs';
export async function GET(req:Request) {
 try {return NextResponse.json({operations:await listAffiliateOperations(admin.firestore(),await custodyAuth(req,false))},{headers:contractHeaders});}
 catch{return NextResponse.json({error:'Acceso de vendedor afiliado activo requerido.'},{status:403,headers:contractHeaders});}
}
