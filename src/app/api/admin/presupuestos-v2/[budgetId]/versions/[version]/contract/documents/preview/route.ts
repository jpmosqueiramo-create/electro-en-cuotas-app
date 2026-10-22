import { NextRequest,NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/adminAuth';
import { admin } from '@/lib/firebaseAdmin';
import { contractHeaders } from '@/lib/contractV2Http';
import { readOperationDraftDocuments } from '@/lib/contractDocuments/operationDraftServer';
export const runtime='nodejs';
export async function GET(req:NextRequest,ctx:{params:Promise<{budgetId:string;version:string}>}){
 const auth=await verifyAdminAuth(req);
 if(!auth.authorized)return NextResponse.json({error:'Acceso Admin requerido.'},{status:auth.errorResponse?.status===403?403:401,headers:contractHeaders});
 try{
  const {budgetId,version}=await ctx.params;if(req.nextUrl.search||!/^([1-9]\d*)$/.test(version))throw Error();
  return NextResponse.json(await readOperationDraftDocuments(admin.firestore(),budgetId,Number(version)),{headers:contractHeaders});
 }catch{return NextResponse.json({error:'No se pudo preparar la vista previa. Revisá la identidad, las condiciones guardadas y el cronograma. No se emitieron documentos.'},{status:409,headers:contractHeaders});}
}
