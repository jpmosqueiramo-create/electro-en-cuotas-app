import { withAffiliateCommissionAccess } from './affiliateCommissionAccess';
import type { Firestore } from 'firebase-admin/firestore';
import { activePortalAffiliate,type PortalIdentity } from './legacyPortalServer';
import { obtenerCuentaCorrienteVendedor,obtenerSaldoDisponibleLiquidacion } from './settlementsEngine';
import { commissionRecoveryView } from './operationCommissionV2Server';
/** Beneficiary access survives reassignment only for their own accrued movements, never the operation dossier. */
export async function readAffiliateCommissions(db:Firestore,actor:PortalIdentity){return withAffiliateCommissionAccess(db,actor,()=>db.runTransaction(async tx=>{
 const affiliate=await activePortalAffiliate(db,actor,tx),account=await obtenerCuentaCorrienteVendedor(db,affiliate.id,tx),available=await obtenerSaldoDisponibleLiquidacion(db,affiliate.id,tx);
 const liqs=await tx.get(db.collection('liquidaciones_comision').where('vendedorAfiliadoId','==',affiliate.id));
 const allocations=new Map<string,{paid:number;settled:number}>();
 for(const l of liqs.docs){const state=l.data().estado;if(!['CONFIRMADA','PAGADA'].includes(state))continue;const items=await tx.get(l.ref.collection('items'));for(const item of items.docs){const row=item.data(),prior=allocations.get(row.movimientoFuenteId)||{paid:0,settled:0};prior.settled+=row.montoAsignadoCentavos;if(state==='PAGADA')prior.paid+=row.montoAsignadoCentavos;allocations.set(row.movimientoFuenteId,prior);}}
 return {...commissionRecoveryView(account.movimientos),availableCents:available,
 accruedCents:account.totalDevengadoCentavos,reversedCents:Math.abs(account.totalReversadoCentavos),paidCents:account.totalPagadoCentavos,
 movements:account.movimientos.slice(-50).reverse().map(m=>({id:m.id,operationId:m.solicitudId,installmentNumber:m.cuotaNumero??null,client:m.clienteNombre??'Cliente sin informar',product:m.productoResumen??'',paymentId:m.ledgerPagoMovimientoId??null,type:m.tipo,amountCents:m.montoComisionCentavos,baseCents:m.baseComisionableCentavos,percentage:m.porcentajeAplicadoBasisPoints/100,at:m.createdAt,settledCents:allocations.get(m.id)?.settled??0,paidCommissionCents:allocations.get(m.id)?.paid??0})),
 historyTruncated:account.movimientos.length>50,
 settlements:liqs.docs.map(d=>d.data()).sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt))).slice(0,50).map(l=>({id:l.id,amountCents:l.montoTotalLiquidadoCentavos,state:l.estado,at:l.createdAt,paymentDate:l.fechaPago??null,methods:Array.isArray(l.componentesPago)?l.componentesPago.map((c:{formaPago:string;referenciaBancaria?:string;notas?:string})=>({method:c.formaPago,reference:c.referenciaBancaria??null})):[]})),
 productiveSettlementsEnabled:false};
 }));}
