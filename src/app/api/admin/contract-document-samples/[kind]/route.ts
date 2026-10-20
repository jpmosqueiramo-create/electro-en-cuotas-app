import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/adminAuth';
import { contractHeaders } from '@/lib/contractV2Http';
import { syntheticDocumentSample } from '@/lib/contractDocuments/sample';
export const runtime='nodejs';
export async function GET(req:NextRequest,ctx:{params:Promise<{kind:string}>}){
  const auth=await verifyAdminAuth(req);
  if(!auth.authorized)return NextResponse.json({error:'Acceso Admin requerido.'},{status:auth.errorResponse?.status===403?403:401,headers:contractHeaders});
  const {kind}=await ctx.params;
  if(req.nextUrl.search||!['manifest','mandate','promissoryNote'].includes(kind))return NextResponse.json({error:'Muestra desconocida.'},{status:404,headers:contractHeaders});
  try{
    const {snapshot,documents}=syntheticDocumentSample();
    if(kind==='manifest')return NextResponse.json({...documents.manifest,snapshotId:snapshot.contractSnapshotId,proposedPromissoryNoteAmount:{amount:snapshot.economicTerms.contractTotal,currency:'ARS',status:'PENDING_LEGAL_APPROVAL',enforceableAmount:null}},{headers:contractHeaders});
    const artifact=documents[kind as 'mandate'|'promissoryNote'];
    return new NextResponse(Buffer.from(artifact.bytes),{headers:{...contractHeaders,'Content-Type':'application/pdf','Content-Disposition':`inline; filename="synthetic-${kind}.pdf"`,'Content-Security-Policy':"frame-ancestors 'self'; object-src 'none'"}});
  }catch{return NextResponse.json({error:'Las muestras sintéticas requieren el entorno Emulator local. La emisión productiva está deshabilitada.'},{status:503,headers:contractHeaders});}
}
