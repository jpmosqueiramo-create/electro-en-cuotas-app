import { NextResponse } from 'next/server';
import { admin } from '@/lib/firebaseAdmin';
import { verifyAdminAuth } from '@/lib/adminAuth';
import { clientPortalParams } from '@/lib/operationClientV2Http';
import { ClientPortalError } from '@/lib/operationClientV2';
import { clientBindingCommand, readClientBinding } from '@/lib/operationClientV2Server';
import { contractHeaders, contractJson } from '@/lib/contractV2Http';
export const runtime='nodejs';
async function handle(req:Request,ctx:{params:Promise<{budgetId:string;version:string}>}) {
 const auth=await verifyAdminAuth(req);if(!auth.authorized)return NextResponse.json({error:'Acceso administrativo requerido.'},{status:401,headers:contractHeaders});
 try {const p=await ctx.params,v=clientPortalParams(p.budgetId,p.version);if(new URL(req.url).search)throw new ClientPortalError();
  return NextResponse.json(req.method==='GET'?await readClientBinding(admin.firestore(),p.budgetId,v,auth.uid!):await clientBindingCommand(admin.firestore(),p.budgetId,v,await contractJson(req),auth.uid!),{headers:contractHeaders});
 }catch(e){return NextResponse.json({error:e instanceof ClientPortalError?e.message:'No se pudo verificar el vínculo de cliente.'},{status:409,headers:contractHeaders});}
}
export const GET=handle;export const POST=handle;
