import './helpers/requireSafeEmulatorEnvironment';
import assert from 'node:assert/strict';
import {argentinaBusinessDate} from '../src/lib/productionV2/businessDate';
import { randomUUID } from 'node:crypto';
import { admin } from '../src/lib/firebaseAdmin';
import { custodyFixture } from './testOperationCustodyV2Emulator';
import { contractCommand } from '../src/lib/contractV2Server';
import { fulfillmentRef, readFulfillment } from '../src/lib/operationFulfillmentV2Server';
import { custodyCommand, authorizeCustody } from '../src/lib/operationCustodyV2Server';
import { prepareDeliveryDocuments } from './testOperationDeliveryV2Emulator';
import { deliveryCommand, readDelivery } from '../src/lib/operationDeliveryV2Server';
import { productionRuntimeForEmulator } from '../src/lib/productionV2/runtime';
import { startProductionBrowserServer } from './helpers/productionAdapterBrowserServer';
import { CatalogBrowser } from './helpers/catalogBrowser';
import { approvedFinalPackages } from '../src/lib/productionV2/catalog';
import { GET as readRoute, POST as writeRoute } from '../src/app/api/admin/presupuestos-v2/[budgetId]/versions/[version]/fulfillment/route';
import { p1Token } from './testPortalP1Emulator';
import { NextRequest } from 'next/server';
async function main() {
 const day=argentinaBusinessDate(),db=admin.firestore(),password='Emulator-only-123',actor=(await admin.auth().createUser({email:process.env.NEXT_PUBLIC_ADMIN_EMAIL,password,emailVerified:true})).uid;
 const f=await custodyFixture(),root={uid:actor,admin:true},runtime=productionRuntimeForEmulator(db,admin.auth(),approvedFinalPackages,[actor]);
 await db.collection(f.b.sourceCollection).doc(f.b.solicitudId).create({nombre:f.b.clienteSnapshot.nombre,localidad:'Localidad sintética'});
 await contractCommand(db,f.id,1,{action:'OPEN_OR_CREATE',commandId:randomUUID()},actor);
 const original=JSON.stringify({budget:(await f.r.budget.get()).data(),acceptance:(await f.r.acceptance.get()).data()});
 const ctx={params:Promise.resolve({budgetId:f.id,version:'1'})},api=`http://localhost/api/admin/presupuestos-v2/${f.id}/versions/1/fulfillment`;
 assert.equal((await readRoute(new NextRequest(api),ctx)).status,401);
 const token=await p1Token({uid:f.uid});assert.equal((await readRoute(new NextRequest(api,{headers:{Authorization:'Bearer '+token}}),ctx)).status,403);
 assert.equal((await writeRoute(new NextRequest(api,{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:'{}'}),ctx)).status,403);
 const server=await startProductionBrowserServer(runtime),browser=await CatalogBrowser.open();
 async function select(selector:string,value:string){await browser.evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set.call(e,${JSON.stringify(value)});e.dispatchEvent(new Event('change',{bubbles:true}));})()`);}
 async function step(button:string,fields:Record<string,string>,revision:number){for(const [label,value]of Object.entries(fields)){if(label==='Cómo llegó el producto')await select('[aria-label="Cómo llegó el producto"]',value);else await browser.change(`[aria-label=${JSON.stringify(label)}]`,value);}await browser.clickText(button,"document.querySelector('[data-testid=fulfillment]')");await browser.until(`document.querySelector('[data-testid=fulfillment-status]')?.textContent.includes('Revisión ${revision}')`,'saved logistics step');}
 try{
  await browser.command('Emulation.setDeviceMetricsOverride',{width:1280,height:900,deviceScaleFactor:1,mobile:false});await browser.navigate('/login');await browser.until("typeof window.__FIREBASE_SIGN_IN__==='function'",'Auth');await browser.evaluate(`window.__FIREBASE_SIGN_IN__(${JSON.stringify(process.env.NEXT_PUBLIC_ADMIN_EMAIL)},${JSON.stringify(password)}).then(()=>true)`);
  await browser.navigate('/admin/logistica');await browser.until("!!document.querySelector('[data-testid=logistics-row]')",'general list');assert.equal(await browser.evaluate("document.querySelector('[data-testid=logistics-row]').innerText.includes('Por encargar')"),true);
  await browser.screenshot('logistics-general-desktop.png');await browser.overflow('general desktop');
  await browser.navigate(`/admin/operaciones/${f.id}/1?section=logistics`);await browser.until("!!document.querySelector('[aria-label=Proveedor]')",'guided supplier');
  assert.equal(await browser.evaluate("document.querySelector('[aria-label=\"Acción administrativa\"]').closest('details').open===false"),true);
  await step('Guardar proveedor',{'Proveedor':'Proveedor sintético','Número de pedido / referencia del proveedor':'TEST-PEDIDO'},1);
  await step('Registrar pedido realizado',{'Fecha real del pedido':day},2);
  await step('Confirmar costo y disponibilidad',{'Costo confirmado al proveedor':'600000','Fecha disponible para retirar':day},3);
  await step('Confirmar listo para retirar',{},4);
  await step('Registrar retiro real',{'Fecha real de retiro':day,'Quién lo retiró':'Persona sintética'},5);
  await step('Registrar producto en mi poder',{'Fecha real de recepción':day,'Dónde guardaste el producto':'Depósito sintético','Quién lo recibió':'Persona sintética','Cómo llegó el producto':'SIN_DANOS_VISIBLES'},6);
  await step('Programar viaje',{'Referencia del traslado':'TEST-TRASLADO','Fecha prevista del traslado':day,'Quién lo traslada':'Persona sintética'},7);
  await step('Programar entrega',{'Localidad de destino':'Localidad sintética','Fecha prevista de entrega':day,'Quién lo entrega':'Persona sintética'},8);
  const state=(await fulfillmentRef(db,f.id,1).get()).data()!;assert.equal(state.logisticsState,'ENTREGA_PROGRAMADA');assert.equal(state.orderDate,day);assert.equal(state.actualPickupDate,day);assert.equal(state.actualReceiptDate,day);assert.equal((await readFulfillment(db,f.id,1)).deliveredAt,null);
  await browser.evaluate("document.querySelector('[data-testid=fulfillment]').scrollIntoView({block:'start'})");await browser.screenshot('logistics-timeline-desktop.png');await browser.command('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});await browser.screenshot('logistics-timeline-mobile.png');await browser.overflow('timeline mobile');
  await browser.navigate('/admin/logistica');await browser.until("document.querySelector('[data-testid=logistics-row]')?.innerText.includes('Entrega programada')",'updated general state');await browser.change('[aria-label="Buscar en logística"]','NO-EXISTE');await browser.until("document.body.innerText.includes('No hay productos con estos filtros')",'search empty');await browser.clickText('Ver todos y limpiar filtros');await browser.until("!!document.querySelector('[data-testid=logistics-row]')",'clear filters');
  await browser.screenshot('logistics-general-mobile.png');await browser.overflow('general mobile');
  assert.equal(original,JSON.stringify({budget:(await f.r.budget.get()).data(),acceptance:(await f.r.acceptance.get()).data()}));assert.deepEqual(browser.externalFirebase,[]);
  // The existing delivery motor remains the only writer of actual delivery.
  await assert.rejects(deliveryCommand(db,f.id,1,{action:'CONFIRM_DELIVERY',data:{occurredAt:new Date().toISOString()},expectedRevision:0,commandId:randomUUID(),operationId:f.identity.operationId},root));
  let revision=0;const custody=async(action:string,data:Record<string,unknown>)=>{const r=await custodyCommand(db,f.id,1,{action,data,expectedRevision:revision,commandId:randomUUID(),operationId:f.identity.operationId},root);revision=r.revision;};
  const holder={uid:f.uid,role:'AFFILIATE' as const,affiliateId:f.affiliateId};await custody('ASSIGN',{affiliateId:f.affiliateId,uid:f.uid,reason:'Asignación sintética'});await custody('AUTHORIZE_TRANSFER',{from:{uid:f.driver,role:'DRIVER',affiliateId:null},to:holder,occurredAt:new Date().toISOString(),location:'Ubicación sintética',reason:'Traslado sintético'});await custody('REGULARIZE',{transferId:(await authorizeCustody(db,f.id,1,root)).state.pending!.id,reason:'Prueba sintética',evidence:'TEST-ONLY'});
  await prepareDeliveryDocuments({...f,root,holder});
  let delivery=await readDelivery(db,f.id,1,root);await deliveryCommand(db,f.id,1,{action:'RECEIVE_ORIGINALS',data:{holder,location:'Carpeta sintética',receivedAt:new Date().toISOString(),reference:'TEST-ONLY',alternativeEvidence:'TEST-ONLY'},expectedRevision:delivery.state.revision,commandId:randomUUID(),operationId:f.identity.operationId},root);
  delivery=await readDelivery(db,f.id,1,root);await deliveryCommand(db,f.id,1,{action:'CONFIRM_DELIVERY',data:{occurredAt:new Date().toISOString()},expectedRevision:delivery.state.revision,commandId:randomUUID(),operationId:f.identity.operationId},{uid:f.uid,admin:false});
  const final=await readFulfillment(db,f.id,1);assert(final.deliveredAt);assert.equal(final.state.logisticsState,'DELIVERED_EMULATOR');
  await browser.navigate('/admin/logistica');await browser.until("document.querySelector('[data-testid=logistics-dashboard]')?.getAttribute('aria-busy')==='false'",'final summary');await select('[aria-label="Estado del producto"]','DELIVERED');await browser.until("document.querySelector('[data-testid=logistics-row]')?.innerText.includes('Entrega real')",'actual delivery date');await browser.screenshot('logistics-delivered-mobile.png');
  console.log('GUIDED_LOGISTICS_BROWSER_DESKTOP_MOBILE=PASS; REAL_ROUTES=PASS; EIGHT_STEPS=PASS; GENERAL_FILTERS=PASS; DELIVERY_WITHOUT_EVIDENCE=DENIED; VERIFIED_DELIVERY_DATE=PASS; BUDGET_ACCEPTANCE_UNCHANGED=PASS; PRODUCTION_WRITES=0');
 }finally{await browser.close();await server.stop();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
