import { NextResponse } from 'next/server';
import { admin } from '@/lib/firebaseAdmin';
import { custodyAuth } from '@/lib/operationCustodyV2Http';
import { contractHeaders, contractJson } from '@/lib/contractV2Http';
import { affiliateSettlementCommand } from '@/lib/affiliateSettlementAdmin';
export async function POST(req:Request,ctx:{params:Promise<{id:string}>}){
 let actor;try{actor=await custodyAuth(req,true);}catch{return NextResponse.json({error:'Acceso administrativo requerido.'},{status:403,headers:contractHeaders});}
 try{const {id}=await ctx.params;const result=await affiliateSettlementCommand(admin.firestore(),id,actor.uid,await contractJson(req));return NextResponse.json({settlement:result},{headers:contractHeaders});}catch(e){return NextResponse.json({error:e instanceof Error?e.message:'No se confirmó la liquidación.'},{status:409,headers:contractHeaders});}
}
