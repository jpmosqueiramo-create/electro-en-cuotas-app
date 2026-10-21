import './helpers/requireSafeEmulatorEnvironment';
import { openOperationSection } from './helpers/openOperationSection';
import assert from 'node:assert/strict';
import { mkdirSync,writeFileSync } from 'node:fs';
import { admin } from '../src/lib/firebaseAdmin';
import { fixture } from './testContractV2';
import { contractRefs } from '../src/lib/contractV2Server';
import { acceptBudgetV2 } from '../src/lib/budgetAcceptanceV2Server';
import { fulfillmentRef } from '../src/lib/operationFulfillmentV2Server';
import { CatalogBrowser } from './helpers/catalogBrowser';
import { adminEmail,adminPassword } from './helpers/adminSolicitudesFixtures';
export async function testOperationFulfillmentV2Browser() {
 const id=`fulfillment-browser-${Date.now()}`,db=admin.firestore(),{b}=fixture(id),r=contractRefs(db,id,1);
 await r.family.set({sourceCollection:b.sourceCollection,solicitudId:b.solicitudId,lastVersion:1});await r.budget.set(b);
 await acceptBudgetV2(db,{budgetId:id,version:1,acceptedOptionId:'option-1',preferredPlanCuotas:12,commandId:'accept'},'admin-demo');
 const before=JSON.stringify({b:(await r.budget.get()).data(),a:(await r.acceptance.get()).data()});
 const browser=await CatalogBrowser.open(),out='/tmp/cuenta-hogar-provider-logistics-v2';mkdirSync(out,{recursive:true});
 async function select(selector:string,value:string){await browser.evaluate(`(()=>{const el=document.querySelector(${JSON.stringify(selector)});Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set.call(el,${JSON.stringify(value)});el.dispatchEvent(new Event('change',{bubbles:true}));})()`);}
 async function command(action:string,data:Record<string,string>,revision:number) {
  await select('[aria-label="Acción administrativa"]',action);
  for(const [label,value]of Object.entries(data)) {
   const selector=`[aria-label=${JSON.stringify(label)}]`;
   if(label==='Estado visual')await select(selector,value);else await browser.change(selector,value);
  }
  await browser.clickText('Confirmar acción operativa',"document.querySelector('[data-testid=fulfillment]')");
  await browser.until(`document.querySelector('[data-testid=fulfillment-status]')?.textContent.includes('Revisión ${revision}')`,'persisted operational revision');
 }
 async function capture(name:string){await browser.evaluate("document.querySelector('[data-testid=fulfillment]').scrollIntoView({block:'start'})");await browser.evaluate('document.fonts.ready.then(()=>true)');const result=await browser.command('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});writeFileSync(`${out}/${name}.png`,Buffer.from(result.data as string,'base64'));}
 try {
  await browser.command('Emulation.setDeviceMetricsOverride',{width:1280,height:800,deviceScaleFactor:1,mobile:false});await browser.navigate('/login');await browser.until("typeof window.__FIREBASE_SIGN_IN__==='function'",'Auth demo');
  await browser.evaluate(`window.__FIREBASE_SIGN_IN__(${JSON.stringify(adminEmail)},${JSON.stringify(adminPassword)}).then(()=>true)`);
  await browser.navigate('/admin/presupuestos');await browser.until("!![...document.querySelectorAll('label')].find(l=>l.textContent.includes('Buscar presupuesto V2'))",'history');await browser.field('Buscar presupuesto V2',id);
  await browser.until("[...document.querySelectorAll('section')].find(s=>s.querySelector('h2')?.textContent==='Historial V2')?.querySelectorAll('article').length===1",'exact budget');await browser.clickText('Abrir versión 1',"[...document.querySelectorAll('section')].find(s=>s.querySelector('h2')?.textContent==='Historial V2')");await browser.until("!!document.querySelector('[data-testid=acceptance-registered]')",'accepted');await openOperationSection(browser,id,'Proveedor y logística');
  await browser.until("!!document.querySelector('[aria-label=\"Acción administrativa\"]')",'fulfillment');
  assert.equal(await browser.evaluate("document.querySelector('[data-testid=fulfillment]').textContent.includes('580.000')"),true);
  await command('UPDATE_ORDER',{'Proveedor seleccionado':'Proveedor sintético','Número de pedido / referencia del proveedor':'DEMO-123','Disponibilidad estimada':'2026-01-02','Observaciones':'Sólo prueba'},1);
  await command('PLACE_ORDER',{'Fecha real del pedido':'2026-01-01'},2);
  await command('CONFIRM_ORDER',{'Costo real confirmado':'600000','Disponibilidad confirmada':'2026-01-02'},3);
  await command('READY_FOR_PICKUP',{},4);
  await command('PLAN_PICKUP',{'Retiro previsto':'2026-01-03','Responsable de retiro':'Retirante demo'},5);
  assert.equal((await fulfillmentRef(db,id,1).get()).data()!.actualPickupDate,null);
  await command('RECORD_PICKUP',{'Retiro real':'2026-01-03','Responsable de retiro':'Retirante demo'},6);
  await command('RECEIVE',{'Recepción real':'2026-01-04','Depósito / ubicación de custodia autorizada':'Depósito demo','Responsable de custodia':'Custodio demo','Estado visual':'SIN_DANOS_VISIBLES','Observaciones de recepción':'Verificado demo'},7);
  await command('PLAN_TRIP',{'Referencia del viaje':'VIAJE-DEMO','Fecha prevista del viaje':'2026-12-10','Transportista / responsable del viaje':'Transporte demo'},8);
  await command('PLAN_DELIVERY',{'Localidad de destino':'Localidad demo','Entrega estimada':'2026-12-11','Responsable de entrega':'Responsable demo'},9);
  const s=(await fulfillmentRef(db,id,1).get()).data()!;assert.equal(s.logisticsState,'ENTREGA_PROGRAMADA');assert.equal(s.actualCost,600000);assert.equal(s.budgetedCost,580000);
  assert.equal(await browser.evaluate("document.querySelector('[data-testid=delivery-blocked]').textContent.includes('mandato, pagaré y remito')"),true);await capture('desktop');
  await browser.command('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});await capture('mobile');
  assert.equal(await browser.evaluate('document.documentElement.scrollWidth<=innerWidth'),true);
  await command('REPORT_INCIDENT',{'Descripción de la incidencia':'Incidencia sintética mobile'},10);
  assert.equal((await fulfillmentRef(db,id,1).get()).data()!.incidents.length,1);
  assert.equal(JSON.stringify({b:(await r.budget.get()).data(),a:(await r.acceptance.get()).data()}),before);
  assert.equal(browser.externalFirebase.length,0);assert.equal(browser.storageWrites,0);
  console.log('FULFILLMENT_V2_BROWSER_DESKTOP_MOBILE=PASS; ESTIMATES_NOT_ACTUAL=PASS; PRIVATE_COST_SNAPSHOT=PASS; DELIVERY_BLOCKED=PASS; MOBILE_OVERFLOW=0; PRODUCTION_REQUESTS=0');
 } finally {await browser.close();}
}
