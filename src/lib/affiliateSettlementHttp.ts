import {NextResponse} from 'next/server';
import {admin} from './firebaseAdmin';
import {custodyAuth} from './operationCustodyV2Http';
import {contractHeaders,contractJson} from './contractV2Http';
import {exact,opaque} from './contractV2';
import {affiliateSettlementCommand} from './affiliateSettlementAdmin';
/** Compatibility for the existing confirm/cancel URLs; server derives the beneficiary. */
export async function legacySettlementAction(req:Request,ctx:{params:Promise<{id:string}>},action:'CONFIRM'|'CANCEL'){
 let actor;try{actor=await custodyAuth(req,true);}catch{return NextResponse.json({error:'Acceso administrativo requerido.'},{status:403,headers:contractHeaders});}
 try{const {id}=await ctx.params;opaque(id);const body=exact(await contractJson(req),action==='CONFIRM'?['idempotencyKey']:['idempotencyKey','motivoAnulacion']);const saved=(await admin.firestore().collection('liquidaciones_comision').doc(id).get()).data();if(!saved)throw Error('Liquidación inexistente.');const result=await affiliateSettlementCommand(admin.firestore(),saved.vendedorAfiliadoId,actor.uid,{action,commandId:body.idempotencyKey,data:{settlementId:id,...(action==='CANCEL'?{reason:body.motivoAnulacion}:{})}});return NextResponse.json({ok:true,liquidacion:result},{headers:contractHeaders});}catch(e){return NextResponse.json({error:e instanceof Error?e.message:'No se confirmó la acción.'},{status:409,headers:contractHeaders});}
}
