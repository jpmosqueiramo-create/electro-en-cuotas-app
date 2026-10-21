import type { Firestore } from 'firebase-admin/firestore';
import { activePortalAffiliate,type PortalIdentity } from './legacyPortalServer';
import { obtenerCuentaCorrienteVendedor,obtenerSaldoDisponibleLiquidacion } from './settlementsEngine';
import { commissionRecoveryView } from './operationCommissionV2Server';
/** Beneficiary access survives reassignment only for their own accrued movements, never the operation dossier. */
export async function readAffiliateCommissions(db:Firestore,actor:PortalIdentity){return db.runTransaction(async tx=>{
 const affiliate=await activePortalAffiliate(db,actor,tx),account=await obtenerCuentaCorrienteVendedor(db,affiliate.id,tx),available=await obtenerSaldoDisponibleLiquidacion(db,affiliate.id,tx);
 const liqs=await tx.get(db.collection('liquidaciones_comision').where('vendedorAfiliadoId','==',affiliate.id));
 return {...commissionRecoveryView(account.movimientos),availableCents:available,
 accruedCents:account.totalDevengadoCentavos,reversedCents:Math.abs(account.totalReversadoCentavos),paidCents:account.totalPagadoCentavos,
 movements:account.movimientos.slice(-50).reverse().map(m=>({id:m.id,operationId:m.solicitudId,installmentNumber:m.cuotaNumero??null,client:m.clienteNombre??'Cliente sin informar',product:m.productoResumen??'',paymentId:m.ledgerPagoMovimientoId??null,type:m.tipo,amountCents:m.montoComisionCentavos,baseCents:m.baseComisionableCentavos,percentage:m.porcentajeAplicadoBasisPoints/100,at:m.createdAt})),
 historyTruncated:account.movimientos.length>50,
 settlements:liqs.docs.map(d=>d.data()).sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt))).slice(0,50).map(l=>({id:l.id,amountCents:l.montoTotalLiquidadoCentavos,state:l.estado,at:l.createdAt,paymentDate:l.fechaPago??null})),
 productiveSettlementsEnabled:false};
 });}
