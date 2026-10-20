import { NextRequest, NextResponse } from 'next/server';
import { admin } from '@/lib/firebaseAdmin';
import { custodyAuth, custodyParams } from '@/lib/operationCustodyV2Http';
import { custodyCommand, readCustody } from '@/lib/operationCustodyV2Server';
import { CustodyError } from '@/lib/operationCustodyV2';
import { contractHeaders, contractJson } from '@/lib/contractV2Http';
export const runtime='nodejs';
type Ctx={params:Promise<{budgetId:string;version:string}>};
async function handle(req:NextRequest,ctx:Ctx) {
 try {
  const actor=await custodyAuth(req,false),{budgetId,version}=await ctx.params,v=custodyParams(budgetId,version);
  if(req.nextUrl.search)throw new CustodyError();
  const result=req.method==='POST'?await custodyCommand(admin.firestore(),budgetId,v,await contractJson(req),actor):await readCustody(admin.firestore(),budgetId,v,actor);
  return NextResponse.json(result,{headers:contractHeaders});
 }catch(e){return NextResponse.json({error:e instanceof CustodyError&&e.message==='AUTH'?'Ingresá nuevamente.':'Operación no disponible o comando incompatible. Recargá y verificá la asignación.'},{status:e instanceof CustodyError&&e.message==='AUTH'?401:403,headers:contractHeaders});}
}
export const GET=handle;export const POST=handle;
