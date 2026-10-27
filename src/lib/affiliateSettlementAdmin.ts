import type { Firestore } from 'firebase-admin/firestore';
import { createHash } from 'node:crypto';
import { withAdminCommissionAccess } from './affiliateCommissionAccess';
import { crearBorradorLiquidacion, confirmarLiquidacion, pagarLiquidacion, anularLiquidacion, registrarRendicionEfectivo } from './settlementsEngine';
import { exact, opaque, stable } from './contractV2';
/** Same settlement engine/FIFO. Command receipt and settlement commit in one transaction. */
export async function affiliateSettlementCommand(db:Firestore,vendorId:string,actor:string,input:unknown){
 opaque(vendorId);
 const body=exact(input,['action','commandId','data']),commandId=opaque(body.commandId);
 if(!['PREPARE','CONFIRM','CANCEL','PAY','REMIT'].includes(String(body.action)))throw Error('Acción de liquidación inválida.');
 const data=exact(body.data,body.action==='REMIT'?['amountCents','method','reference','notes']:body.action==='PREPARE'?['amountCents']:body.action==='PAY'?['settlementId','method','reference']:body.action==='CANCEL'?['settlementId','reason']:['settlementId']);
 if(body.action==='PREPARE'&&(!Number.isSafeInteger(data.amountCents)||Number(data.amountCents)<=0))throw Error('Importe inválido.');
 if(body.action==='REMIT'&&(!Number.isSafeInteger(data.amountCents)||Number(data.amountCents)<=0||!['EFECTIVO_DEPOSITO','EFECTIVO_EN_MANO'].includes(String(data.method))||typeof data.reference!=='string'||!data.reference.trim()||data.reference.length>200||typeof data.notes!=='string'||data.notes.length>500))throw Error('Importe, medio y referencia de rendición requeridos.');
 if(body.action==='PAY'&&(!['TRANSFERENCIA','EFECTIVO_EN_MANO'].includes(String(data.method))||typeof data.reference!=='string'||!data.reference.trim()||data.reference.length>200))throw Error('Medio y referencia de pago requeridos.');
 if(body.action==='CANCEL'&&(typeof data.reason!=='string'||!data.reason.trim()||data.reason.length>500))throw Error('Motivo de cancelación requerido.');
 const digest=createHash('sha256').update(stable({vendorId,actor,action:body.action,data})).digest('hex');
 return withAdminCommissionAccess(db,actor,true,()=>db.runTransaction(async tx=>{
  const vendorRef=db.collection('vendedores').doc(vendorId),receipt=vendorRef.collection('settlementCommands').doc(commandId);
  const previous=await tx.get(receipt),vendor=(await tx.get(vendorRef)).data();
  if(!vendor)throw Error('Vendedor afiliado no disponible.');
  if(previous.exists){if(previous.data()!.digest!==digest)throw Error('Conflicto de comando; no se registró otro pago.');return previous.data()!.result;}
  let result;
  if(body.action==='REMIT')result=await registrarRendicionEfectivo(db,{vendedorAfiliadoId:vendorId,vendedorAfiliadoEmail:String(vendor.email??''),montoRendidoCentavos:data.amountCents,metodoEntrega:data.method,comprobanteReferencia:data.reference,observaciones:data.notes,adminUid:actor,idempotencyKey:createHash('sha256').update(stable({vendorId,commandId,action:'REMIT'})).digest('hex')},tx);
  else if(body.action==='PREPARE')result=await crearBorradorLiquidacion(db,{vendedorAfiliadoId:vendorId,vendedorAfiliadoEmail:vendor.email,montoSolicitadoCentavos:data.amountCents,creadoPorAdminUid:actor,idempotencyKey:createHash('sha256').update(stable({vendorId,commandId})).digest('hex')},tx);
  else{
   const id=opaque(data.settlementId),saved=(await tx.get(db.collection('liquidaciones_comision').doc(id))).data();
   if(!saved||saved.vendedorAfiliadoId!==vendorId)throw Error('Liquidación ajena o inexistente.');
   const common={liquidacionId:id,adminUid:actor,idempotencyKey:commandId};
   if(body.action==='CONFIRM')result=await confirmarLiquidacion(db,common,tx);
   else if(body.action==='CANCEL')result=await anularLiquidacion(db,{...common,motivoAnulacion:data.reason},tx);
   else{
    if(saved.estado==='PAGADA')throw Error('El pago ya fue registrado. Actualizá la cuenta.');
    result=await pagarLiquidacion(db,{...common,componentesPago:[{formaPago:data.method,montoCentavos:saved.montoTotalLiquidadoCentavos,referenciaBancaria:data.reference,notas:data.reference}]},tx);
   }
  }
  tx.create(receipt,{digest,action:body.action,actor,at:new Date().toISOString(),result});
  return result;
 }));
}
