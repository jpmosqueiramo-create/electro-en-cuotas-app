import { NextResponse } from 'next/server';
import { admin } from '@/lib/firebaseAdmin';
import { custodyAuth,custodyParams } from '@/lib/operationCustodyV2Http';
import { contractJson,contractHeaders } from '@/lib/contractV2Http';
import { affiliateEngagement } from '@/lib/affiliateEngagementV2';
async function handler(req:Request,context:{params:Promise<{budgetId:string;version:string}>}){try{const p=await context.params,actor=await custodyAuth(req,false);return NextResponse.json(await affiliateEngagement(admin.firestore(),p.budgetId,custodyParams(p.budgetId,p.version),actor,req.method==='GET'?undefined:await contractJson(req)),{headers:contractHeaders});}catch{return NextResponse.json({error:'Gestión no disponible para esta operación e identidad.'},{status:403,headers:contractHeaders});}}
export {handler as GET,handler as POST};
