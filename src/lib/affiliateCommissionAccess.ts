import { AsyncLocalStorage } from 'node:async_hooks';
import { createHash } from 'node:crypto';
import type { Firestore, Transaction, DocumentData } from 'firebase-admin/firestore';
import { admin } from './firebaseAdmin';
import { requireFinancialEmulator } from './operationFinancialV2';
import { runtimeForDatabase, runtimeData, requireProductionActor } from './productionV2/runtime';
import { operationRef } from './operationV2';
import { validateContractSnapshot } from './contractSnapshotV2';
import { activePortalAffiliate, type PortalIdentity } from './legacyPortalServer';
const access = new AsyncLocalStorage<{ db: Firestore; vendor: string | null }>();
const key=(...values:unknown[])=>'v2_'+createHash('sha256').update(JSON.stringify(values)).digest('hex');
/** Server-only scope: never accepts an enabled flag, role or execution mode from a browser. */
export async function withAdminCommissionAccess<T>(db:Firestore,uid:string,write:boolean,work:()=>Promise<T>):Promise<T>{
 await requireProductionActor(runtimeForDatabase(db,admin.auth()),uid,write);
 return access.run({db,vendor:null},work);
}
export async function withAffiliateCommissionAccess<T>(db:Firestore,identity:PortalIdentity,work:()=>Promise<T>):Promise<T>{
 const affiliate=await activePortalAffiliate(db,identity);
 runtimeData(runtimeForDatabase(db,admin.auth()));
 return access.run({db,vendor:affiliate.id},work);
}
/** Verify the immutable origin, frozen percentage and installment allocation, without recalculating historical rates. */
export async function validateCommissionSource(db:Firestore,tx:Transaction|undefined,row:DocumentData){
 if(row.operationSchemaVersion!=='OPERATION_COMMISSION_V2')return;
 if(row.executionMode!=='PRODUCTION'){requireFinancialEmulator();return;}
 const scope=access.getStore();
 if(!scope||scope.db!==db||scope.vendor&&scope.vendor!==row.vendedorAfiliadoId)throw Error('COMMISSION_SERVER_CONTEXT_REQUIRED');
 runtimeData(runtimeForDatabase(db,admin.auth()));
 if(typeof row.budgetId!=='string'||!Number.isSafeInteger(row.budgetVersion)||typeof row.ledgerPagoMovimientoId!=='string'||!['DEVENGAMIENTO_PAGO','REVERSA_COMISION'].includes(row.tipo))throw Error('COMMISSION_SOURCE_INVALID');
 const get=async(ref:ReturnType<Firestore['doc']>)=>(tx?await tx.get(ref):await ref.get()).data();
 const base=operationRef(db,row.budgetId,row.budgetVersion).parent,financial=await get(base.doc('financial'));
 if(!financial||financial.executionMode!=='PRODUCTION'||financial.operationId!==row.operationId||row.solicitudId!==row.operationId)throw Error('COMMISSION_FINANCIAL_ORIGIN_INVALID');
 const snapshot=await get(db.collection('contractSnapshotsV2').doc(financial.snapshotId));validateContractSnapshot(snapshot);
 if(snapshot.integrity.payloadHash!==financial.snapshotHash||snapshot.sourceDraft.budgetId!==row.budgetId||snapshot.sourceDraft.budgetVersion!==row.budgetVersion||'op_'+createHash('sha256').update(JSON.stringify([row.budgetId,row.budgetVersion,snapshot.sourceDraft.acceptedOptionId])).digest('hex')!==row.operationId)throw Error('COMMISSION_SNAPSHOT_INVALID');
 const payment=await get(base.doc('financial').collection('payments').doc(row.ledgerPagoMovimientoId));
 const config=typeof row.snapshotComisionId==='string'?await get(db.collection('vendedores_configuraciones_comision').doc(row.snapshotComisionId)):null;
 const allocation=payment?.allocations?.find((a:{installmentNumber:number})=>a.installmentNumber===row.cuotaNumero),pct=row.porcentajeAplicadoBasisPoints;
 const originalId=key(row.operationId,row.ledgerPagoMovimientoId,row.cuotaNumero),reverse=row.tipo==='REVERSA_COMISION',sign=reverse?-1:1;
 if(!payment||payment.id!==row.ledgerPagoMovimientoId||!allocation||!Number.isSafeInteger(allocation.amountCents)||allocation.amountCents<=0||!Number.isSafeInteger(pct)||pct<0||pct>10000||!config||typeof config.vigenteDesde!=='string'||config.vendedorAfiliadoId!==row.vendedorAfiliadoId||config.porcentajeComisionBasisPoints!==pct||config.vigenteDesde>payment.recordedAt||row.id!==(reverse?key('reverse',originalId):originalId)||row.baseComisionableCentavos!==sign*allocation.amountCents||row.montoComisionCentavos!==sign*Number(BigInt(allocation.amountCents)*BigInt(pct)/BigInt(10000)))throw Error('COMMISSION_ALLOCATION_INVALID');
 if(reverse){const original=await get(db.collection('ledger_comisiones_movimientos').doc(originalId));if(!payment.reversedAt||row.movimientoOriginalId!==originalId||original?.vendedorAfiliadoId!==row.vendedorAfiliadoId||original?.montoComisionCentavos!==-row.montoComisionCentavos)throw Error('COMMISSION_REVERSAL_INVALID');}
}

export async function commissionWritesEnabled(db:Firestore,uid:string){try{await requireProductionActor(runtimeForDatabase(db,admin.auth()),uid,true);return true;}catch{return false;}}
