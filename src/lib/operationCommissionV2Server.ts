import type {ProductionRuntime} from './productionV2/runtime';
import {requireProductionActor} from './productionV2/runtime';
import {productionDeliveryProof} from './productionV2/gates';
import type { Firestore,Transaction } from 'firebase-admin/firestore';
import type { FinancialPayment } from './operationFinancialV2';
import { requireFinancialEmulator } from './operationFinancialV2';
import type { LedgerComisionMovimiento,ConfiguracionComisionVendedor } from './commissionsEngine';
import { createHash } from 'node:crypto';
const key=(...values:unknown[])=>'v2_'+createHash('sha256').update(JSON.stringify(values)).digest('hex');
type Assignment={affiliateId:string;uid:string}|null;
/** All reads are prepared before the caller writes payment, receipt and these ledger entries atomically. */
export async function preparePaymentCommissions(db:Firestore,tx:Transaction,params:{operationId:string;budgetId:string;version:number;assignment:Assignment;payment:FinancialPayment;clientName:string;productName:string;reversal:boolean;actor:string;at:string},runtime?:ProductionRuntime){
 if(runtime){const data=await requireProductionActor(runtime,params.actor);if(data.db!==db)throw Error('COMMISSION_CONTEXT_MISMATCH');const proof=await productionDeliveryProof(runtime,tx,params.budgetId,params.version,'FINANCE');if(proof.identity.operationId!==params.operationId)throw Error('COMMISSION_OPERATION_MISMATCH');}else requireFinancialEmulator();const {operationId,payment,reversal,assignment,actor,at}=params,ledger=db.collection('ledger_comisiones_movimientos');
 const ids=payment.allocations.map(a=>key(operationId,payment.id,a.installmentNumber));
 const existing=await Promise.all(ids.map(id=>tx.get(ledger.doc(id))));
 const rows:Record<string,unknown>[]=[];
 if(reversal){
  const reversals=await Promise.all(ids.map(id=>tx.get(ledger.doc(key('reverse',id)))));
  for(let i=0;i<existing.length;i++)if(existing[i].exists&&!reversals[i].exists){const original=existing[i].data()!;rows.push({...original,id:key('reverse',ids[i]),tipo:'REVERSA_COMISION',movimientoOriginalId:ids[i],montoComisionCentavos:-original.montoComisionCentavos,montoComisionDevengadoCentavos:-original.montoComisionCentavos,baseComisionableCentavos:-original.baseComisionableCentavos,idempotencyKey:key('reverse',ids[i]),registradoPor:actor,createdAt:at,motivo:payment.reversalReason});}
 }else if(assignment){
  const vendor=await tx.get(db.collection('vendedores').doc(assignment.affiliateId)),v=vendor.data();
  if(!v||v.activo!==true||v.authUid!==assignment.uid)throw Error('Vendedor afiliado asignado no disponible para devengamiento.');
  const configs=await tx.get(db.collection('vendedores_configuraciones_comision').where('vendedorAfiliadoId','==',assignment.affiliateId));
  const applicable=configs.docs.map(d=>({...d.data(),id:d.id} as ConfiguracionComisionVendedor)).filter(d=>typeof d.vigenteDesde==='string'&&d.vigenteDesde<=at).sort((a,b)=>String(b.vigenteDesde).localeCompare(String(a.vigenteDesde))||String(b.createdAt).localeCompare(String(a.createdAt))||b.id.localeCompare(a.id));
  const cfg=applicable[0],pct=cfg?.porcentajeComisionBasisPoints;if(!Number.isSafeInteger(pct)||pct<0||pct>10000)throw Error('Configuración vigente de comisión requerida.');
  payment.allocations.forEach((allocation,i)=>{
   if(existing[i].exists)throw Error('Devengamiento existente sin comando financiero coincidente.');
   const amount=Number(BigInt(allocation.amountCents)*BigInt(pct)/BigInt(10000));
   rows.push({id:ids[i],solicitudId:operationId,operationId,budgetId:params.budgetId,budgetVersion:params.version,operationSchemaVersion:'OPERATION_COMMISSION_V2',attributionPolicy:'CURRENT_ASSIGNMENT_AT_CREDIT_V1',commissionBasePolicy:'CREDITED_INSTALLMENT_ALLOCATIONS_V1',executionMode:runtime?'PRODUCTION':'EMULATOR_ONLY',vendedorAfiliadoId:assignment.affiliateId,vendedorAfiliadoUid:assignment.uid,vendedorAfiliadoEmail:String(v.email??''),ledgerPagoMovimientoId:payment.id,clienteNombre:params.clientName,productoResumen:params.productName,tipo:'DEVENGAMIENTO_PAGO',montoComisionCentavos:amount,montoComisionDevengadoCentavos:amount,moneda:'ARS',porcentajeAplicadoBasisPoints:pct,baseComisionableCentavos:allocation.amountCents,commissionSchemaVersion:'COMMISSION_V1',snapshotComisionId:cfg.id,cuotaNumero:allocation.installmentNumber,idempotencyKey:ids[i],registradoPor:actor,createdAt:at});
  });
 }
 // Immutable entries in the SAME commission ledger consumed by the existing settlement engine.
 return ()=>{for(const row of rows)tx.create(ledger.doc(String(row.id)),row);};
}
export function commissionRecoveryView(movements:Pick<LedgerComisionMovimiento,'tipo'|'montoComisionCentavos'>[]){
 let net=0;for(const m of movements){if(m.tipo==='PAGO_LIQUIDACION')net-=Math.abs(m.montoComisionCentavos);else if(['DEVENGAMIENTO_PAGO','REVERSA_COMISION','AJUSTE_ADMINISTRATIVO'].includes(m.tipo))net+=m.montoComisionCentavos;}
 return {payableCents:Math.max(0,net),recoveryCents:Math.max(0,-net)};
}
