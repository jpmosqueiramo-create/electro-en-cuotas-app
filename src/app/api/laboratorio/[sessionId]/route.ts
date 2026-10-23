import { NextResponse } from 'next/server';
import { admin } from '@/lib/firebaseAdmin';
import { requireLabIdentity } from '@/lib/operationsLabAuth';
import { resolveLabViewerContext } from '@/lib/operationsLabContext';
import { readLabCircuit } from '@/lib/operationsLabCircuit';
import { LabError } from '@/lib/operationsLabPolicy';
import { contractHeaders } from '@/lib/contractV2Http';
export const runtime='nodejs';
export async function GET(req:Request,{params}:{params:Promise<{sessionId:string}>}){
 try{
  const uid=await requireLabIdentity(req),{sessionId}=await params;
  const context=await resolveLabViewerContext(admin.firestore(),uid,new URL(req.url).searchParams.get('owner')??'',sessionId,process.env);
  const view=await readLabCircuit(context),f=view.financial;
  // Explicit public projection: no source contracts, personal IDs, costs, actor IDs or references.
  return NextResponse.json({stage:view.workflow?.stage??'EMPTY',financial:f?{totalCents:f.totalCents,paidCents:f.paidCents,balanceCents:f.balanceCents,installments:f.installments,receipts:f.payments.map(p=>({receiptId:p.receiptId,amountCents:p.amountCents,effectiveDate:p.effectiveDate,reversed:!!p.reversedAt,allocations:p.allocations}))}:null},{headers:contractHeaders});
 }catch(error){return NextResponse.json({error:error instanceof LabError?error.code:'LAB_ACCESS_DENIED'},{status:error instanceof LabError?error.status:403,headers:contractHeaders});}
}
