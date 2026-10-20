import { NextRequest,NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/adminAuth';
import { admin } from '@/lib/firebaseAdmin';
import { ContractError } from '@/lib/contractV2';
import { contractOperations } from '@/lib/contractDocuments/operationsServer';
import { contractHeaders,contractJson } from '@/lib/contractV2Http';
export const runtime='nodejs';
async function handle(req:NextRequest,ctx:{params:Promise<{budgetId:string;version:string}>}){
 const auth=await verifyAdminAuth(req);if(!auth.authorized)return NextResponse.json({error:'Acceso Admin requerido.'},{status:auth.errorResponse?.status===403?403:401,headers:contractHeaders});
 try{const {budgetId,version}=await ctx.params;if(req.nextUrl.search||!/^[1-9]\d*$/.test(version))throw new ContractError();
 return NextResponse.json(await contractOperations(admin.firestore(),budgetId,Number(version),auth.uid!,req.method==='POST'?await contractJson(req):undefined),{headers:contractHeaders});
 }catch(e){return NextResponse.json({error:e instanceof ContractError?e.message:'No se pudo verificar la evidencia.'},{status:409,headers:contractHeaders});}
}
export const GET=handle;export const POST=handle;
