import { NextRequest,NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/adminAuth';
import { admin } from '@/lib/firebaseAdmin';
import { contractHeaders,contractJson } from '@/lib/contractV2Http';
import { ContractError } from '@/lib/contractV2';
import { FulfillmentError } from '@/lib/operationFulfillmentV2';
import { readFulfillment,fulfillmentCommand } from '@/lib/operationFulfillmentV2Server';
export const runtime='nodejs';
type Ctx={params:Promise<{budgetId:string;version:string}>};
async function handle(req:NextRequest,ctx:Ctx) {
 const auth=await verifyAdminAuth(req);
 if(!auth.authorized)return NextResponse.json({error:'Acceso Admin requerido.'},{status:auth.errorResponse?.status===403?403:401,headers:contractHeaders});
 try {
  const {budgetId,version}=await ctx.params,keys=[...req.nextUrl.searchParams.keys()],before=req.nextUrl.searchParams.get('before');
  if(!/^[1-9]\d*$/.test(version)||keys.some(k=>k!=='before')||(req.method==='POST'&&keys.length)||before!==null&&!/^[1-9]\d*$/.test(before))throw new FulfillmentError();
  const result=req.method==='GET'?await readFulfillment(admin.firestore(),budgetId,Number(version),before===null?undefined:Number(before)):
   await fulfillmentCommand(admin.firestore(),budgetId,Number(version),await contractJson(req),auth.uid!);
  return NextResponse.json(result,{headers:contractHeaders});
 }catch(e){return NextResponse.json({error:e instanceof FulfillmentError||e instanceof ContractError?e.message:'No se pudo verificar o guardar el seguimiento.'},{status:409,headers:contractHeaders});}
}
export const GET=handle;export const POST=handle;
