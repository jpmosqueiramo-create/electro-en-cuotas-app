import { NextResponse } from 'next/server';
import { admin } from '@/lib/firebaseAdmin';
import { custodyAuth } from '@/lib/operationCustodyV2Http';
import { contractHeaders, contractJson } from '@/lib/contractV2Http';
import { affiliateSettlementCommand } from '@/lib/affiliateSettlementAdmin';
export async function POST(req:Request,ctx:{params:Promise<{id:string}>}){
 let actor;try{actor=await custodyAuth(req,true);}catch{return NextResponse.json({error:'Acceso administrativo requerido.'},{status:403,headers:contractHeaders});}
 try{const {id}=await ctx.params;const result=await affiliateSettlementCommand(admin.firestore(),id,actor.uid,await contractJson(req));return NextResponse.json({settlement:result},{headers:contractHeaders});}catch(e){
  // A transport failure may follow a successful commit. Keep the same command for retry.
  const code=(e as {code?:unknown})?.code,uncertain=typeof code==='number'||typeof code==='string';
  return NextResponse.json({error:uncertain?'No se recibió una confirmación definitiva. Reintentá la misma acción para consultar su resultado.':e instanceof Error?e.message:'No se confirmó la liquidación.'},{status:uncertain?503:409,headers:contractHeaders});
 }
}
