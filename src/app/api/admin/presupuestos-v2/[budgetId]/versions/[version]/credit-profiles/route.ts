import { verifyAdminAuth } from '@/lib/adminAuth';
import { admin } from '@/lib/firebaseAdmin';
import { NextResponse } from 'next/server';
import { listVerifiedProfiles } from '@/lib/creditReviewV2Server';
import { budgetV2SafeErrorMessage } from '@/lib/budgetV2';
export const runtime='nodejs';
export async function GET(req:Request,ctx:{params:Promise<{budgetId:string;version:string}>}){const auth=await verifyAdminAuth(req);if(!auth.authorized)return auth.errorResponse!;try{
void ctx;return NextResponse.json({profiles:await listVerifiedProfiles(admin.firestore())},{headers:{'Cache-Control':'private, no-store'}});}catch(error){return NextResponse.json({error:budgetV2SafeErrorMessage(error)},{status:409,headers:{'Cache-Control':'private, no-store'}});}}
