import './helpers/requireSafeEmulatorEnvironment';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {admin} from '../src/lib/firebaseAdmin';
import {productionRuntimeForEmulator} from '../src/lib/productionV2/runtime';
import {saveAffiliateProfile} from '../src/lib/affiliateRegistryServer';
import {affiliateSettlementCommand} from '../src/lib/affiliateSettlementAdmin';
import {readAffiliateCommissions} from '../src/lib/affiliateCommissionPortal';
import {obtenerLedgerCustodiaEfectivo,obtenerCuentaCorrienteVendedor} from '../src/lib/settlementsEngine';
import {p1Token} from './testPortalP1Emulator';
import {POST} from '../src/app/api/admin/vendedores/[id]/liquidaciones/route';
import {GET} from '../src/app/api/admin/vendedores/[id]/route';
import {ADMIN_DESTINATIONS,activeAdminDestination} from '../src/components/admin/navigation';
import {startProductionBrowserServer} from './helpers/productionAdapterBrowserServer';
import {CatalogBrowser} from './helpers/catalogBrowser';
const pass=(s:string)=>console.log(s+' = PASS');
async function main(){
 const db=admin.firestore(),email=process.env.NEXT_PUBLIC_ADMIN_EMAIL!,password='Emulator-only-123',actor=(await admin.auth().createUser({email,password,emailVerified:true})).uid;
 const uid=(await admin.auth().createUser({email:'cash-affiliate@example.test',password,emailVerified:true})).uid,vendorId=randomUUID(),other=randomUUID();
 const runtime=productionRuntimeForEmulator(db,admin.auth(),[],[actor]);
 const profile={id:vendorId,commandId:randomUUID(),expectedRevision:0,nombre:'Vendedor Sintético Efectivo',email:'cash-affiliate@example.test',localidad:'Ciudad sintética',telefono:'',authUid:uid,activo:true,porcentajeComision:10,reason:'Alta sintética'};
 await saveAffiliateProfile(db,profile,actor);await saveAffiliateProfile(db,{...profile,id:other,authUid:'',nombre:'Otro vendedor sintético',email:'other-cash@example.test',commandId:randomUUID()},actor);
 // Opening fixture represents an already identified cash collection. Collection creation itself is covered by the unchanged settlement-engine suite.
 await db.collection('ledger_custodia_efectivo').doc('cash-opening').create({id:'cash-opening',vendedorAfiliadoId:vendorId,tipo:'COBRO_EFECTIVO_VENDEDOR',montoCentavos:100000,moneda:'ARS',createdAt:new Date().toISOString()});
 await db.collection('ledger_custodia_efectivo').doc('other-opening').create({id:'other-opening',vendedorAfiliadoId:other,tipo:'COBRO_EFECTIVO_VENDEDOR',montoCentavos:800000,moneda:'ARS',createdAt:new Date().toISOString()});
 const body=(n:number)=>({action:'REMIT',commandId:randomUUID(),data:{amountCents:n,method:'EFECTIVO_EN_MANO',reference:'Entrega sintética',notes:''}});
 const token=await p1Token({uid:actor}),foreign=await p1Token({uid}),req=(b:unknown,t=token)=>new Request('http://localhost/api/admin/vendedores/'+vendorId+'/liquidaciones',{method:'POST',headers:{Authorization:'Bearer '+t,'Content-Type':'application/json'},body:JSON.stringify(b)}),ctx={params:Promise.resolve({id:vendorId})};
 assert.equal((await POST(req(body(100),foreign),ctx)).status,403);
 await assert.rejects(affiliateSettlementCommand(db,vendorId,uid,body(100)));
 for(const n of [0,-1,0.5,100001,Number.MAX_SAFE_INTEGER+1])assert.equal((await POST(req(body(n)),ctx)).status,409);
 const beforeCommission=await obtenerCuentaCorrienteVendedor(db,vendorId);
 const first=body(20000),r=await Promise.all([POST(req(first),ctx),POST(req(first),ctx)]);assert(r.every(v=>v.status===200));assert.equal((await r[0].json()).settlement.id,(await r[1].json()).settlement.id);
 assert.equal((await POST(req({...first,data:{...first.data,reference:'ALTERED'}}),ctx)).status,409);assert.equal((await db.collection('rendiciones_efectivo').get()).size,1);
 const race=await Promise.all([POST(req(body(50000)),ctx),POST(req(body(50000)),ctx)]);assert.deepEqual(race.map(r=>r.status).sort(),[200,409]);
 assert.equal((await obtenerLedgerCustodiaEfectivo(db,vendorId)).efectivoPendienteRendicionCentavos,30000);assert.equal((await obtenerLedgerCustodiaEfectivo(db,other)).efectivoPendienteRendicionCentavos,800000);assert.deepEqual(await obtenerCuentaCorrienteVendedor(db,vendorId),beforeCommission);
 const own=()=>readAffiliateCommissions(db,{uid,email:profile.email,emailVerified:true});let portal=await own();assert.equal(portal.cashHeldCents,30000);assert.equal(portal.remittances.length,2);assert(!portal.remittances.some(r=>r.amountCents===800000));
 const read=await GET(new Request('http://localhost/api/admin/vendedores/'+vendorId,{headers:{Authorization:'Bearer '+token}}),ctx);assert.equal(read.status,200);assert.equal((await read.json()).custodiaEfectivo.efectivoPendienteRendicionCentavos,portal.cashHeldCents);
 assert.equal(ADMIN_DESTINATIONS.filter(x=>x.href==='/admin/comisiones').length,1);assert(!ADMIN_DESTINATIONS.some(x=>String(x.href)==='/admin/rendiciones'));assert.equal(activeAdminDestination('/admin/rendiciones'),'sellers');
 pass('CASH_GUARDED_HTTP_IDEMPOTENCY_CONCURRENT_OVERDRAW_ISOLATION_AND_SEPARATE_COMMISSION');
 if(process.env.AFFILIATE_BROWSER==='1'){
 const server=await startProductionBrowserServer(runtime),browser=await CatalogBrowser.open();
 try{
  await browser.command('Emulation.setDeviceMetricsOverride',{width:1280,height:900,deviceScaleFactor:1,mobile:false});await browser.navigate('/login');await browser.until("typeof window.__FIREBASE_SIGN_IN__==='function'",'login');await browser.evaluate(`window.__FIREBASE_SIGN_IN__(${JSON.stringify(email)},${JSON.stringify(password)}).then(()=>true)`);await browser.navigate('/admin/rendiciones');await browser.until("document.body.innerText.includes('Vendedor Sintético Efectivo')",'unified redirect');
  assert.equal(await browser.evaluate("!!document.querySelector('nav[aria-label=\"Secciones de administración\"] a[href=\"/admin/rendiciones\"]')"),false);
  await browser.evaluate("[...document.querySelectorAll('label')].find(l=>l.textContent.includes('Sólo vendedores afiliados con efectivo')).querySelector('input').click()");await browser.until("document.querySelectorAll('[data-testid=affiliate-registry] article').length===2",'cash filter only positive balances');await browser.evaluate("[...document.querySelectorAll('label')].find(l=>l.textContent.includes('Sólo vendedores afiliados con efectivo')).querySelector('input').click()");

  await browser.evaluate(`(()=>{const e=document.querySelector('[data-testid=affiliate-admin-commissions] > label select');Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set.call(e,${JSON.stringify(vendorId)});e.dispatchEvent(new Event('change',{bubbles:true}));})()`);await browser.until("!!document.querySelector('[data-testid=affiliate-balances]')",'balances');await browser.clickText('Efectivo y rendiciones');await browser.until("!!document.querySelector('[data-testid=affiliate-remittance]')",'cash form');
  await browser.change('[data-testid=affiliate-remittance] input[name=amount]','100');await browser.change('[data-testid=affiliate-remittance] input[name=reference]','SYNTHETIC-CASH-BROWSER');
  await browser.evaluate(`(()=>{window.confirm=()=>true;const original=window.fetch.bind(window);let lost=false;window.fetch=async(...args)=>{const r=await original(...args);if(!lost&&String(args[0]).endsWith('/liquidaciones')&&args[1]?.body&&JSON.parse(args[1].body).action==='REMIT'&&r.ok){lost=true;throw Error('SYNTHETIC_LOST_CASH_RESPONSE');}return r;};const form=document.querySelector('[data-testid=affiliate-remittance]');form.requestSubmit();form.requestSubmit();})()`);
  await browser.until("document.body.innerText.includes('SYNTHETIC_LOST_CASH_RESPONSE')",'response loss');await browser.clickText('Confirmar efectivo recibido');await browser.until("document.body.innerText.includes('Rendición registrada.')",'retry cash');assert.equal((await db.collection('rendiciones_efectivo').get()).size,3);assert.equal((await own()).cashHeldCents,20000);assert.equal(await browser.evaluate("document.querySelector('[data-testid=affiliate-remittance] input[name=amount]').value"),'');
  for(const width of [1280,768,390,320]){await browser.command('Emulation.setDeviceMetricsOverride',{width,height:width>=768?900:844,deviceScaleFactor:1,mobile:width<768});await browser.evaluate("document.querySelector('[data-testid=affiliate-cash]').scrollIntoView({block:'start'})");await browser.overflow('cash '+width);await browser.screenshot('affiliate-unified-cash-'+width+'.png');}
  await browser.evaluate("document.querySelector('[data-testid=affiliate-registry]').scrollIntoView({block:'start'})");await browser.overflow('registry narrow mobile');await browser.screenshot('affiliate-unified-registry-mobile.png');
  // A deactivation is explicit and keeps cash/account history available to administration.
  await browser.command('Emulation.setDeviceMetricsOverride',{width:1280,height:900,deviceScaleFactor:1,mobile:false});await browser.evaluate("document.querySelector('[data-testid=affiliate-registry]').scrollIntoView({block:'start'})");await browser.clickText('Dar de baja',`[...document.querySelectorAll('[data-testid=affiliate-registry] article')].find(e=>e.innerText.includes('Vendedor Sintético Efectivo'))`);await browser.field('Observación del registro','Baja sintética');await browser.clickText('Guardar vendedor afiliado');await browser.until("document.body.innerText.includes('Registro guardado')",'deactivation');assert.equal((await db.collection('vendedores').doc(vendorId).get()).data()!.activo,false);assert.equal((await obtenerLedgerCustodiaEfectivo(db,vendorId)).efectivoPendienteRendicionCentavos,20000);await assert.rejects(own());
  await browser.clickText('Reactivar',`[...document.querySelectorAll('[data-testid=affiliate-registry] article')].find(e=>e.innerText.includes('Vendedor Sintético Efectivo'))`);await browser.field('Comisión sobre pagos acreditados (%)','12');await browser.field('Observación del registro','Reactivación sintética y cambio de porcentaje');await browser.clickText('Guardar vendedor afiliado');await browser.until("document.body.innerText.includes('Comisión vigente: 12%')",'reactivation percentage');assert.equal((await own()).cashHeldCents,20000);
  await browser.navigate('/');await browser.until("typeof window.__FIREBASE_SIGN_IN__==='function'",'switch identity');await browser.evaluate(`window.__FIREBASE_SIGN_IN__('cash-affiliate@example.test',${JSON.stringify(password)}).then(()=>true)`);await browser.navigate('/afiliado');await browser.until("document.querySelector('[data-testid=affiliate-commissions]')?.innerText.includes('Efectivo de cuotas en tu poder:')",'own cash');
  await browser.command('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});await browser.evaluate("document.querySelector('[data-testid=affiliate-commissions]').scrollIntoView({block:'start'})");await browser.overflow('affiliate cash own portal');await browser.screenshot('affiliate-unified-own-cash-mobile.png');assert.deepEqual(browser.externalFirebase,[]);assert(!server.calls.some(c=>c.status>=500));
  pass('UNIFIED_REDIRECT_BROWSER_REMIT_DOUBLE_CLICK_LOST_RESPONSE_RETRY_DEACTIVATE_REACTIVATE_PERCENTAGE_RESPONSIVE_OWN_PORTAL');
 }finally{await browser.close();await server.stop();}
 }
 await admin.auth().updateUser(actor,{disabled:true});assert.equal((await POST(req(body(100)),ctx)).status,403);await admin.auth().updateUser(actor,{disabled:false});
 portal=await own();assert.equal(portal.cashHeldCents,process.env.AFFILIATE_BROWSER==='1'?20000:30000);pass('UNIFIED_AFFILIATE_CASH_COMPLETE');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
