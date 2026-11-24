import './helpers/requireSafeEmulatorEnvironment';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import type { Transaction, ReadWriteTransactionOptions, ReadOnlyTransactionOptions } from 'firebase-admin/firestore';
import { NextRequest } from 'next/server';
import { admin } from '../src/lib/firebaseAdmin';
import { registrarPagoDirectoAdmin, validarPagoInformadoAdmin } from '../src/lib/ledgerEngine';
import { obtenerLedgerCustodiaEfectivo } from '../src/lib/settlementsEngine';
import { argentinaBusinessDate } from '../src/lib/productionV2/businessDate';
import { POST } from '../src/app/api/admin/pagos-informados/validar/route';
import { GET } from '../src/app/api/admin/pagos-informados/route';
async function main(){
 const db=admin.firestore(),suffix=randomUUID(),sol='historical-payment-'+suffix,seller='historical-seller-'+suffix,receiver='historical-receiver-'+suffix,today=argentinaBusinessDate();
 await db.collection('solicitudes').doc(sol).create({nombreCompleto:'Cliente histórico sintético',pricingSchemaVersion:'CANONICAL_V1',monedaPlan:'ARS',vendedorAfiliadoId:seller,cuotasInmutables:[{numero:1,montoTotalCentavos:10000,capitalCentavos:6000,servicioNetoGravadoCentavos:3306,ivaCentavos:694},{numero:2,montoTotalCentavos:10000,capitalCentavos:6000,servicioNetoGravadoCentavos:3306,ivaCentavos:694}]});
 await db.collection('receptores_efectivo_autorizados').doc(receiver).create({activo:true,tipoReceptor:'VENDEDOR_AFILIADO',vendedorAfiliadoId:seller,nombre:'Receptor sintético'});
 async function reported(method='EFECTIVO',amount=5000){const ref=db.collection('pagos_informados').doc('hist-'+randomUUID());await ref.create({id:ref.id,solicitudId:sol,clienteId:'CLIENTE_SINTETICO',montoInformadoCentavos:amount,moneda:'ARS',medioPago:method,fechaInformada:today+'T12:00:00.000Z',fechaCarga:today+'T12:00:00.000Z',estadoValidacion:'PENDIENTE_VALIDACION',referenciaTransferencia:method==='TRANSFERENCIA'?'SYNTHETIC-'+randomUUID():null});return ref;}
 const ref=await reported(),params={pagoInformadoId:ref.id,accion:'CONFIRMAR' as const,adminEmail:process.env.NEXT_PUBLIC_ADMIN_EMAIL!,fechaAcreditacion:today,receptorEfectivoId:receiver};
 const run=db.runTransaction;let transactions=0;
 db.runTransaction=async function<T>(update:(tx:Transaction)=>Promise<T>,options?:ReadWriteTransactionOptions|ReadOnlyTransactionOptions):Promise<T>{const n=++transactions;return (run.bind(db) as typeof db.runTransaction)<T>(async tx=>{const result=await update(tx);if(n===1)throw Error('SYNTHETIC_ABORT_AFTER_WRITES');return result;},options);};
 try{await assert.rejects(validarPagoInformadoAdmin(db,params),/SYNTHETIC_ABORT/);}finally{db.runTransaction=run;}
 assert.equal(transactions,1);assert.equal((await ref.get()).data()!.estadoValidacion,'PENDIENTE_VALIDACION');assert.equal((await db.collection('ledger_movimientos').where('solicitudId','==',sol).get()).size,0);assert.equal((await obtenerLedgerCustodiaEfectivo(db,seller)).efectivoPendienteRendicionCentavos,0);
 const all=await Promise.all([1,2,3].map(()=>validarPagoInformadoAdmin(db,params)));assert(all.every(r=>r.movimientoConfirmed?.id===all[0].movimientoConfirmed?.id));assert.equal((await db.collection('ledger_movimientos').where('solicitudId','==',sol).get()).size,1);assert.equal((await obtenerLedgerCustodiaEfectivo(db,seller)).efectivoPendienteRendicionCentavos,5000);
 await assert.rejects(validarPagoInformadoAdmin(db,{...params,fechaAcreditacion:'2026-02-30'}));
 const direct=await registrarPagoDirectoAdmin(db,{solicitudId:sol,montoRecibidoCentavos:1234,monedaRecibida:'ARS',medioPago:'TRANSFERENCIA',fechaEfectiva:today,fechaAcreditacion:today,registradoPor:params.adminEmail,origenRegistro:'ADMIN',idempotencyKey:randomUUID(),referenciaTransferencia:'TRANSFERENCIA_HISTORICA_SINTETICA'});
 const later=await reported('TRANSFERENCIA',1234),link={pagoInformadoId:later.id,accion:'VINCULAR' as const,adminEmail:params.adminEmail,movimientoExistenteId:direct.movimiento.id};await validarPagoInformadoAdmin(db,link);await validarPagoInformadoAdmin(db,link);assert.equal((await db.collection('ledger_movimientos').where('solicitudId','==',sol).get()).size,2);
 const bad=await reported('TRANSFERENCIA',1235);await assert.rejects(validarPagoInformadoAdmin(db,{...link,pagoInformadoId:bad.id}));assert.equal((await bad.get()).data()!.estadoValidacion,'PENDIENTE_VALIDACION');
 const rejected=await reported(),reject={pagoInformadoId:rejected.id,accion:'RECHAZADO' as const,observacionAdmin:'No corresponde al caso sintético',adminEmail:params.adminEmail};await validarPagoInformadoAdmin(db,reject);await validarPagoInformadoAdmin(db,reject);
 const fractional=await reported('EFECTIVO',1.1);await assert.rejects(validarPagoInformadoAdmin(db,{...params,pagoInformadoId:fractional.id}));
 await db.collection('solicitudes').doc(sol).update({monedaPlan:'USD'});
 const fx=await reported('TRANSFERENCIA',10);await assert.rejects(validarPagoInformadoAdmin(db,{...params,pagoInformadoId:fx.id,receptorEfectivoId:undefined}),/CONCILIACION_MONEDA_REQUERIDA/);assert.equal((await fx.get()).data()!.estadoValidacion,'PENDIENTE_VALIDACION');await db.collection('solicitudes').doc(sol).update({monedaPlan:'ARS'});
 const apiReport=await reported('TRANSFERENCIA',100);
 const authResponse=await fetch('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=demo-key',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:process.env.NEXT_PUBLIC_ADMIN_EMAIL,password:'Emulator-only-123',returnSecureToken:true})});const auth=await authResponse.json();assert(auth.idToken);
 const response=await POST(new NextRequest('http://localhost/api/admin/pagos-informados/validar',{method:'POST',headers:{Authorization:`Bearer ${auth.idToken}`,'Content-Type':'application/json'},body:JSON.stringify({pagoInformadoId:apiReport.id,accion:'CONFIRMAR',fechaAcreditacion:today})}));assert.equal(response.status,200,await response.text());assert.equal((await apiReport.get()).data()!.estadoValidacion,'CONFIRMADO');
 const queue=await GET(new Request('http://localhost/api/admin/pagos-informados',{headers:{Authorization:`Bearer ${auth.idToken}`}}));assert.equal(queue.status,200);const projected=await queue.json();assert(projected.reports.some((r:{id:string})=>r.id===bad.id));assert(!JSON.stringify(projected).includes('capitalCentavos'));assert.equal((await GET(new Request('http://localhost/api/admin/pagos-informados'))).status,401);
 console.log('HISTORICAL_PAYMENT_CONFIRMATION_ATOMIC_ABORT_RETRY_CASH_LINK_CENTS_DATE_HTTP_PRIVATE_QUEUE = PASS');
}
main().then(()=>admin.app().delete()).catch(e=>{console.error(e);process.exitCode=1;});
