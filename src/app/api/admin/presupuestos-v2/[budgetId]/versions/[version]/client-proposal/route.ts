import {admin} from '@/lib/firebaseAdmin';
import {verifyAdminAuth} from '@/lib/adminAuth';
import {contractHeaders,contractJson} from '@/lib/contractV2Http';
import {prepareClientProposal} from '@/lib/clientProposalServer';
export const runtime='nodejs';
export async function POST(req:Request,ctx:{params:Promise<{budgetId:string;version:string}>}){
 const actor=await verifyAdminAuth(req);if(!actor.authorized)return actor.errorResponse!;
 try{const p=await ctx.params;return Response.json(await prepareClientProposal(admin.firestore(),p.budgetId,Number(p.version),await contractJson(req),actor.uid!),{headers:contractHeaders});}
 catch(e){return Response.json({error:e instanceof Error?e.message:'No se pudo preparar la propuesta.'},{status:409,headers:contractHeaders});}
}
