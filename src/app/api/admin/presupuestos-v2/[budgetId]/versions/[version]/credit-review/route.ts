import { NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/adminAuth';
import { admin } from '@/lib/firebaseAdmin';
import { contractJson } from '@/lib/contractV2Http';
import { readCreditReview,creditCommand } from '@/lib/creditReviewV2Server';
import { budgetV2SafeErrorMessage } from '@/lib/budgetV2';
export const runtime='nodejs';
type Context={params:Promise<{budgetId:string;version:string}>};
async function handle(req:Request,ctx:Context){const auth=await verifyAdminAuth(req);if(!auth.authorized)return auth.errorResponse!;
 try{const {budgetId,version}=await ctx.params;if(!/^[1-9]\d*$/.test(version))throw Error();
 const data=req.method==='GET'?await readCreditReview(admin.firestore(),budgetId,Number(version)):await creditCommand(admin.firestore(),budgetId,Number(version),await contractJson(req),auth.uid!);
 return NextResponse.json(data,{headers:{'Cache-Control':'private, no-store'}});
 }catch(error){return NextResponse.json({error:budgetV2SafeErrorMessage(error)},{status:409,headers:{'Cache-Control':'private, no-store'}});}}
export const GET=handle;export const POST=handle;
