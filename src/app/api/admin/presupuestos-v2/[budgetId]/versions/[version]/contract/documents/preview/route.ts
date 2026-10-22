import { NextRequest,NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/adminAuth';
import { admin } from '@/lib/firebaseAdmin';
import { contractHeaders } from '@/lib/contractV2Http';
import { readOperationDraftDocuments } from '@/lib/contractDocuments/operationDraftServer';
import { DocumentPreviewError,previewFailure } from '@/lib/contractDocuments/previewErrors';
export const runtime='nodejs';
export async function GET(req:NextRequest,ctx:{params:Promise<{budgetId:string;version:string}>}){
 const auth=await verifyAdminAuth(req);
 if(!auth.authorized)return NextResponse.json({error:'Acceso Admin requerido.'},{status:auth.errorResponse?.status===403?403:401,headers:contractHeaders});
 try{
  const {budgetId,version}=await ctx.params;if(req.nextUrl.search||!/^([1-9]\d*)$/.test(version))throw new DocumentPreviewError('DOCUMENT_ORIGIN_INCONSISTENT','READ','INVALID_VERSION');
  return NextResponse.json(await readOperationDraftDocuments(admin.firestore(),budgetId,Number(version)),{headers:contractHeaders});
 }catch(error){const failure=previewFailure(error);console.error('CONTRACT_DOCUMENT_PREVIEW_FAILED',failure.diagnostic);return NextResponse.json(failure.body,{status:failure.status,headers:contractHeaders});}
}
