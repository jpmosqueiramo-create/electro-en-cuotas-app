import './helpers/requireSafeEmulatorEnvironment';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {admin} from '../src/lib/firebaseAdmin';
import {financialFixture,activateFinancialFixture} from './testOperationFinancialV2Emulator';
import {financialCommand,financialRef,readFinancial} from '../src/lib/operationFinancialV2Server';
import {custodyCommand,custodyRef,readCustody} from '../src/lib/operationCustodyV2Server';
import {saveAffiliateProfile,type AffiliateProfileInput} from '../src/lib/affiliateRegistryServer';
import {readAffiliateCommissions} from '../src/lib/affiliateCommissionPortal';
import {affiliateEngagement} from '../src/lib/affiliateEngagementV2';
import {obtenerCuentaCorrienteVendedor,crearBorradorLiquidacion,confirmarLiquidacion,pagarLiquidacion,obtenerSaldoDisponibleLiquidacion} from '../src/lib/settlementsEngine';
import {commissionRecoveryView} from '../src/lib/operationCommissionV2Server';
import {POST as registryPost} from '../src/app/api/admin/vendedores/registro/route';
import {GET as historyGet} from '../src/app/api/admin/comisiones/historial/route';
const db=admin.firestore();
export async function affiliateIntegrationFixture(){
 const f=await financialFixture();
 for(const [id,uid,pct]of [[f.affiliateId,f.uid,7],[f.affiliateId2,f.uid2,13]] as const)await saveAffiliateProfile(db,{id,commandId:randomUUID(),expectedRevision:0,nombre:'Vendedor afiliado sintético',email:`${uid}@example.test`,localidad:'Localidad sintética',telefono:'',authUid:uid,activo:true,porcentajeComision:pct,reason:'Configuración sintética inicial'},f.root.uid);
 await activateFinancialFixture(f);return f;
}
export async function testAffiliateIntegration(){
 assert.equal((await registryPost(new Request('http://localhost/api/admin/vendedores/registro',{method:'POST',body:'{}',headers:{'Content-Type':'application/json'}}))).status,403);
 assert.equal((await historyGet(new Request('http://localhost/api/admin/comisiones/historial'))).status,403);
 const f=await affiliateIntegrationFixture(),before=JSON.stringify({b:(await f.r.budget.get()).data(),a:(await f.r.acceptance.get()).data(),d:(await f.r.draft.get()).data()}),history=db.collection('solicitudes').doc('untouched-'+randomUUID());await history.set({marker:'HISTORICAL_UNCHANGED'});const historicalTime=(await history.get()).updateTime;
 const command=async(amount:number,commandId=randomUUID(),paymentId=randomUUID())=>({operationId:f.identity.operationId,expectedRevision:(await financialRef(db,f.id,1).get()).data()!.revision,commandId,action:'CREDIT_PAYMENT',data:{paymentId,amountCents:amount,effectiveDate:new Date().toISOString().slice(0,10),method:'TRANSFERENCIA',reference:'SYNTHETIC'}});
 const execute=async(amount:number)=>{const c=await command(amount);await financialCommand(db,f.id,1,c,f.root);return c;};
 const first=await command(10000),result=await Promise.all([financialCommand(db,f.id,1,first,f.root),financialCommand(db,f.id,1,first,f.root)]);assert.equal(result.filter(r=>!r.replay).length,1);
 const ledger=()=>db.collection('ledger_comisiones_movimientos').where('solicitudId','==',f.identity.operationId).get();assert.equal((await ledger()).size,1);assert.equal((await ledger()).docs[0].data().montoComisionCentavos,700);
 await assert.rejects(financialCommand(db,f.id,1,{...first,data:{...first.data,amountCents:10001}},f.root));
 const assign={operationId:f.identity.operationId,expectedRevision:(await custodyRef(db,f.id,1).get()).data()!.revision,commandId:randomUUID(),action:'ASSIGN',data:{affiliateId:f.affiliateId2,uid:f.uid2,reason:'Reasignación sintética durante cobranza demo'}};
 await custodyCommand(db,f.id,1,assign,f.root);await assert.rejects(readCustody(db,f.id,1,{uid:f.uid,admin:false}));assert((await readCustody(db,f.id,1,{uid:f.uid2,admin:false})).operationId);
 const second=await execute(20000);const rows=(await ledger()).docs.map(d=>d.data());assert.equal(rows.find(r=>r.ledgerPagoMovimientoId===second.data.paymentId)!.montoComisionCentavos,2600);assert.equal(rows.find(r=>r.ledgerPagoMovimientoId===first.data.paymentId)!.vendedorAfiliadoId,f.affiliateId);
 const actor={uid:f.uid2,email:`${f.uid2}@example.test`,emailVerified:true};let view=await readAffiliateCommissions(db,actor);assert.equal(view.payableCents,2600);
 const liq=await crearBorradorLiquidacion(db,{vendedorAfiliadoId:f.affiliateId2,vendedorAfiliadoEmail:actor.email,montoSolicitadoCentavos:1300,creadoPorAdminUid:f.root.uid,idempotencyKey:randomUUID()});await confirmarLiquidacion(db,{liquidacionId:liq.id,adminUid:f.root.uid,idempotencyKey:randomUUID()});
 const paid=await pagarLiquidacion(db,{liquidacionId:liq.id,adminUid:f.root.uid,idempotencyKey:randomUUID(),componentesPago:[{formaPago:'TRANSFERENCIA',montoCentavos:1300,referenciaBancaria:'DEMO-TRANSFER'}]});assert.equal(paid.estado,'PAGADA');
 const secondLiq=await crearBorradorLiquidacion(db,{vendedorAfiliadoId:f.affiliateId2,vendedorAfiliadoEmail:actor.email,montoSolicitadoCentavos:1300,creadoPorAdminUid:f.root.uid,idempotencyKey:randomUUID()});await confirmarLiquidacion(db,{liquidacionId:secondLiq.id,adminUid:f.root.uid,idempotencyKey:randomUUID()});await pagarLiquidacion(db,{liquidacionId:secondLiq.id,adminUid:f.root.uid,idempotencyKey:randomUUID(),componentesPago:[{formaPago:'EFECTIVO_EN_MANO',montoCentavos:1300,notas:'Entrega sintética demo'}]});
 const reverse={operationId:f.identity.operationId,expectedRevision:(await financialRef(db,f.id,1).get()).data()!.revision,commandId:randomUUID(),action:'REVERSE_PAYMENT',data:{paymentId:second.data.paymentId,reason:'Reversa sintética'}};await financialCommand(db,f.id,1,reverse,f.root);await financialCommand(db,f.id,1,reverse,f.root);
 view=await readAffiliateCommissions(db,actor);assert.equal(view.recoveryCents,2600);assert.equal(view.availableCents,0);
 await execute(10000);view=await readAffiliateCommissions(db,actor);assert.equal(view.recoveryCents,1300);await execute(20000);view=await readAffiliateCommissions(db,actor);assert.equal(view.recoveryCents,0);assert.equal(view.availableCents,1300);
 await assert.rejects(crearBorradorLiquidacion(db,{vendedorAfiliadoId:f.affiliateId2,vendedorAfiliadoEmail:actor.email,montoSolicitadoCentavos:1301,creadoPorAdminUid:f.root.uid,idempotencyKey:randomUUID()}));
 const note={commandId:randomUUID(),kind:'PROMISE',note:'Llamado sintético; sin pago',promisedDate:new Date().toISOString().slice(0,10)},beforeNotes=(await ledger()).size;await affiliateEngagement(db,f.id,1,{uid:f.uid2,admin:false},note);assert.equal((await affiliateEngagement(db,f.id,1,{uid:f.uid2,admin:false},note)).replay,true);assert.equal((await ledger()).size,beforeNotes);await assert.rejects(affiliateEngagement(db,f.id,1,{uid:f.uid,admin:false},note));
 const profile:AffiliateProfileInput={id:f.affiliateId2,commandId:randomUUID(),expectedRevision:1,nombre:'Afiliado B',email:actor.email,localidad:'Demo',telefono:'',authUid:f.uid2,activo:false,porcentajeComision:0,reason:'Desactivación demo'};await saveAffiliateProfile(db,profile,f.root.uid);const failedBefore=(await financialRef(db,f.id,1).get()).updateTime;await assert.rejects(execute(1));assert.deepEqual((await financialRef(db,f.id,1).get()).updateTime,failedBefore);await assert.rejects(readAffiliateCommissions(db,actor));await assert.rejects(readCustody(db,f.id,1,{uid:f.uid2,admin:false}));await saveAffiliateProfile(db,{...profile,commandId:randomUUID(),expectedRevision:2,activo:true,reason:'Reactivar demo con 0 %'},f.root.uid);const zero=await execute(10000);assert.equal((await ledger()).docs.find(d=>d.data().ledgerPagoMovimientoId===zero.data.paymentId)!.data().montoComisionCentavos,0);

 const aProfile:AffiliateProfileInput={id:f.affiliateId,commandId:randomUUID(),expectedRevision:1,nombre:'Afiliado A',email:`${f.uid}@example.test`,localidad:'Demo',telefono:'',authUid:f.uid,activo:true,porcentajeComision:7,reason:'Auditoría de reintento'};
 await saveAffiliateProfile(db,aProfile,f.root.uid);const profileTime=(await db.collection('vendedores').doc(f.affiliateId).get()).updateTime;await saveAffiliateProfile(db,aProfile,f.root.uid);assert.deepEqual((await db.collection('vendedores').doc(f.affiliateId).get()).updateTime,profileTime);
 await assert.rejects(saveAffiliateProfile(db,{...aProfile,id:'duplicate-'+randomUUID(),expectedRevision:0,commandId:randomUUID()},f.root.uid));
 const profileRace=await Promise.allSettled([5,6].map(pct=>saveAffiliateProfile(db,{...aProfile,expectedRevision:2,commandId:randomUUID(),porcentajeComision:pct},f.root.uid)));assert.equal(profileRace.filter(r=>r.status==='fulfilled').length,1);
 const boundary=await readFinancial(db,f.id,1,f.root,'ADMIN');assert(boundary.active);const cross=await execute(boundary.installments[0].balanceCents+1);const crossRows=(await ledger()).docs.filter(d=>d.data().ledgerPagoMovimientoId===cross.data.paymentId);assert.equal(crossRows.length,2);assert.equal(crossRows.reduce((n,d)=>n+d.data().baseComisionableCentavos,0),cross.data.amountCents);assert(crossRows.every(d=>d.data().montoComisionCentavos===0));
 assert.deepEqual((await history.get()).updateTime,historicalTime);assert.equal(JSON.stringify({b:(await f.r.budget.get()).data(),a:(await f.r.acceptance.get()).data(),d:(await f.r.draft.get()).data()}),before);assert.equal((await readFinancial(db,f.id,1,f.root,'ADMIN')).active,true);assert((await obtenerSaldoDisponibleLiquidacion(db,f.affiliateId2))>=0);assert.deepEqual(commissionRecoveryView((await obtenerCuentaCorrienteVendedor(db,f.affiliateId2)).movimientos),{payableCents:1300,recoveryCents:0});
 console.log('AFFILIATE_INTEGRATION_EMULATOR=PASS; TWO_RATES=PASS; REASSIGNMENT=PASS; ACCESS_REVOCATION=PASS; PARTIAL_PAYMENTS=PASS; REVERSAL_RECOVERY=PASS; CASH_TRANSFER=PASS; ZERO_RATE=PASS; IDEMPOTENCY=PASS; PROMISE_NO_ACCRUAL=PASS; HISTORY_UNCHANGED=PASS');
}
if(process.argv[1]?.endsWith('testAffiliateIntegrationV2Emulator.ts'))testAffiliateIntegration().then(()=>admin.app().delete()).catch(e=>{console.error(e);process.exitCode=1;});
