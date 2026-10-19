import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/adminAuth";
import { admin } from "@/lib/firebaseAdmin";
import { persistBudgetV2, type BudgetCommandV2 } from "@/lib/budgetV2Persistence";
export async function GET(req:NextRequest){
  const auth=await verifyAdminAuth(req);if(!auth.authorized)return auth.errorResponse!;
  const db=admin.firestore();const families=await db.collection("presupuestos_v2").get();
  const versions=await Promise.all(families.docs.map(f=>f.ref.collection("versions").get()));
  return NextResponse.json({budgets:versions.flatMap(s=>s.docs.map(d=>d.data()))});
}
export async function POST(req:NextRequest){
  const auth=await verifyAdminAuth(req);if(!auth.authorized)return auth.errorResponse!;
  try{return NextResponse.json({budget:await persistBudgetV2(admin.firestore(),await req.json() as BudgetCommandV2,auth.uid!)});}
  catch(error){return NextResponse.json({error:error instanceof Error?error.message:"No se pudo guardar."},{status:409});}
}
