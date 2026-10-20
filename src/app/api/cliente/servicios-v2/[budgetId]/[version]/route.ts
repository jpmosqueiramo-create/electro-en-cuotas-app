import { NextResponse } from 'next/server';
import { admin } from '@/lib/firebaseAdmin';
import { clientPortalUid,clientPortalParams } from '@/lib/operationClientV2Http';
import { readClientService } from '@/lib/operationClientV2Server';
import { contractHeaders } from '@/lib/contractV2Http';
export const runtime='nodejs';
export async function GET(req:Request,ctx:{params:Promise<{budgetId:string;version:string}>}) {
 try{const uid=await clientPortalUid(req),p=await ctx.params;return NextResponse.json(await readClientService(admin.firestore(),p.budgetId,clientPortalParams(p.budgetId,p.version),uid),{headers:contractHeaders});}
 catch{return NextResponse.json({error:'Servicio no disponible para esta cuenta.'},{status:403,headers:contractHeaders});}
}
