import { NextRequest,NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/adminAuth';
import { admin } from '@/lib/firebaseAdmin';
import { ContractError } from '@/lib/contractV2';
import { contractCommand,getContract } from '@/lib/contractV2Server';
import { contractHeaders,contractJson } from '@/lib/contractV2Http';
export const runtime='nodejs';
type Ctx={params:Promise<{budgetId:string;version:string}>};
async function handle(req:NextRequest,ctx:Ctx){
  const auth=await verifyAdminAuth(req);if(!auth.authorized)return NextResponse.json({error:'Acceso Admin requerido.'},{status:auth.errorResponse?.status===403?403:401,headers:contractHeaders});
  try {
    const {budgetId,version}=await ctx.params;if(req.nextUrl.search||!/^[1-9]\d*$/.test(version))throw new ContractError();
    const result=req.method==='GET'?await getContract(admin.firestore(),budgetId,Number(version)):await contractCommand(admin.firestore(),budgetId,Number(version),await contractJson(req),auth.uid!);
    return NextResponse.json(result,{headers:contractHeaders});
  }catch(e){return NextResponse.json({error:e instanceof ContractError?e.message:'No se pudo completar la operación.'},{status:409,headers:contractHeaders});}
}
export const GET=handle;export const POST=handle;
