import { NextResponse } from 'next/server';
import { admin } from '@/lib/firebaseAdmin';
import { custodyAuth, custodyParams } from '@/lib/operationCustodyV2Http';
import { custodyCommand, readTransferConfirmation } from '@/lib/operationCustodyV2Server';
import { custodyCommandInput, custodyFail } from '@/lib/operationCustodyV2';
import { contractHeaders, contractJson } from '@/lib/contractV2Http';
export const runtime='nodejs';
async function handle(req:Request,ctx:{params:Promise<{budgetId:string;version:string}>}) {
 try {
  const actor=await custodyAuth(req,false),p=await ctx.params,v=custodyParams(p.budgetId,p.version);
  if(new URL(req.url).search)custodyFail();
  if(req.method==='GET')return NextResponse.json(await readTransferConfirmation(admin.firestore(),p.budgetId,v,actor),{headers:contractHeaders});
  const c=custodyCommandInput(await contractJson(req));if(!['CONFIRM_DELIVERY','CONFIRM_RECEIPT'].includes(c.action))custodyFail();
  return NextResponse.json(await custodyCommand(admin.firestore(),p.budgetId,v,c,actor),{headers:contractHeaders});
 }catch{return NextResponse.json({error:'Transferencia no disponible para esta identidad.'},{status:403,headers:contractHeaders});}
}
export const GET=handle;export const POST=handle;
