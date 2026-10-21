import { verifyAdminAuth } from '@/lib/adminAuth';
import { admin } from '@/lib/firebaseAdmin';
import { NextResponse } from 'next/server';
import { reusableDocumentSource } from '@/lib/creditReviewV2Server';
import { downloadBudgetDocument,getBudgetDocumentationBucket } from '@/lib/budgetDocumentationStorage';
import { budgetV2SafeErrorMessage } from '@/lib/budgetV2';
export const runtime='nodejs';
export async function GET(req:Request,ctx:{params:Promise<{budgetId:string;version:string;type:string}>}){const auth=await verifyAdminAuth(req);if(!auth.authorized)return auth.errorResponse!;try{
const {budgetId,version,type}=await ctx.params;if(!/^[1-9]\d*$/.test(version))throw Error();const entry=await reusableDocumentSource(admin.firestore(),budgetId,Number(version),type);const {bytes,attachment}=await downloadBudgetDocument(admin.firestore(),await getBudgetDocumentationBucket(),entry.sourceBudgetId,entry.sourceVersion,entry.type,entry.attachment.attachmentId);
return new Response(new Uint8Array(bytes),{headers:{'Content-Type':attachment.mimeType,'Cache-Control':'private, no-store','Content-Disposition':'attachment; filename="documento"','X-Content-Type-Options':'nosniff'}});}catch(error){return NextResponse.json({error:budgetV2SafeErrorMessage(error)},{status:409,headers:{'Cache-Control':'private, no-store'}});}}
