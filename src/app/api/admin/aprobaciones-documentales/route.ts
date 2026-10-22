import { NextResponse } from 'next/server';
import { admin } from '@/lib/firebaseAdmin';
import { verifyAdminAuth } from '@/lib/adminAuth';
import { contractHeaders,contractJson } from '@/lib/contractV2Http';
import { recordLegalApproval,readLegalRegistry } from '@/lib/legalApprovalV2Server';
export const runtime='nodejs';
async function handle(req:Request) {
 const auth=await verifyAdminAuth(req);if(!auth.authorized)return auth.errorResponse!;
 try {return NextResponse.json(req.method==='GET'?await readLegalRegistry(admin.firestore()):await recordLegalApproval(admin.firestore(),await contractJson(req),auth.uid!),{headers:contractHeaders});}
 catch{return NextResponse.json({error:'No se pudo registrar la validación. Revisá versión, referencia profesional y campos requeridos. No se habilitó emisión.'},{status:409,headers:contractHeaders});}
}
export const GET=handle;export const POST=handle;
