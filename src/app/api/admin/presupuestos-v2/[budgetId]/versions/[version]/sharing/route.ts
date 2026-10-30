import {NextResponse} from 'next/server';
import {verifyAdminAuth} from '@/lib/adminAuth';
import {admin} from '@/lib/firebaseAdmin';
import {prepareBudgetSharing} from '@/lib/budgetPdfNumbering';
export async function POST(req:Request,{params}:{params:Promise<{budgetId:string;version:string}>}){
 const auth=await verifyAdminAuth(req);if(!auth.authorized)return auth.errorResponse!;
 try{const p=await params;if(!/^[1-9]\d*$/.test(p.version))throw Error();return NextResponse.json({budget:await prepareBudgetSharing(admin.firestore(),p.budgetId,Number(p.version),auth.uid!)},{headers:{'Cache-Control':'private, no-store'}});}
 catch{return NextResponse.json({error:'No se pudo preparar el presupuesto numerado. Reintentá sin crear otro presupuesto.'},{status:409,headers:{'Cache-Control':'private, no-store'}});}
}
