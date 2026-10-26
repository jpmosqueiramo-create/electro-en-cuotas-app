import {administrativeStatuses} from '@/lib/adminRecordRemovalServer';
import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/adminAuth";
import { admin } from "@/lib/firebaseAdmin";
import { persistBudgetV2 } from "@/lib/budgetV2Persistence";
import { budgetV2SafeErrorMessage } from "@/lib/budgetV2";
export async function GET(req:NextRequest){
  const auth=await verifyAdminAuth(req);if(!auth.authorized)return auth.errorResponse!;
  try {
    const db=admin.firestore();const families=await db.collection("presupuestos_v2").get();
    const versions=await Promise.all(families.docs.map(f=>f.ref.collection("versions").get()));
    const administrativeStates=await administrativeStatuses(db,families.docs.filter(f=>!f.id.startsWith('_')).map(f=>({kind:'BUDGET',id:f.id})));
    return NextResponse.json({administrativeStates,budgets:versions.flatMap(s=>s.docs.map(d=>d.data()))});
  } catch { return NextResponse.json({error:"No se pudo completar la operación."},{status:500}); }
}
export async function POST(req:NextRequest){
  const auth=await verifyAdminAuth(req);if(!auth.authorized)return auth.errorResponse!;
  try{return NextResponse.json({budget:await persistBudgetV2(admin.firestore(),await req.json(),auth.uid!)});}
  catch(error){return NextResponse.json({error:budgetV2SafeErrorMessage(error)},{status:409});}
}
