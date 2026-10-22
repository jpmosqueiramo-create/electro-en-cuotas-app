import './helpers/requireSafeEmulatorEnvironment';
import assert from 'node:assert/strict';
import { mkdirSync,writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { admin } from '../src/lib/firebaseAdmin';
import { fixture } from './testContractV2';
import { contractCommand,contractRefs } from '../src/lib/contractV2Server';
import { acceptBudgetV2 } from '../src/lib/budgetAcceptanceV2Server';
import { fulfillmentCommand,fulfillmentRef,readFulfillment } from '../src/lib/operationFulfillmentV2Server';
import { operationStatusLabel } from '../src/lib/operationWorkspaceV2';
import type { FulfillmentAction } from '../src/lib/operationFulfillmentV2';
import { CatalogBrowser } from './helpers/catalogBrowser';
import { adminEmail,adminPassword } from './helpers/adminSolicitudesFixtures';
export async function testOperationFulfillmentV2Browser() {
 const db=admin.firestore();try{const u=await admin.auth().getUserByEmail(adminEmail);await admin.auth().updateUser(u.uid,{password:adminPassword,emailVerified:true});}catch{await admin.auth().createUser({email:adminEmail,password:adminPassword,emailVerified:true});}
 const persistenceEvidence:Record<string,unknown>[]=[];
 const browser=await CatalogBrowser.open(),out='/tmp/cuenta-hogar-logistics-workflow';mkdirSync(out,{recursive:true});
 async function select(selector:string,value:string){await browser.evaluate(`(()=>{const el=document.querySelector(${JSON.stringify(selector)});if(![...el.options].some(o=>o.value===${JSON.stringify(value)}))throw Error('Action not offered');Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set.call(el,${JSON.stringify(value)});el.dispatchEvent(new Event('change',{bubbles:true}));})()`);}
 async function capture(name:string){await browser.evaluate("document.querySelector('[data-testid=fulfillment]').scrollIntoView({block:'start'})");await browser.evaluate('document.fonts.ready.then(()=>true)');const result=await browser.command('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});writeFileSync(`${out}/${name}.png`,Buffer.from(result.data as string,'base64'));}
 try {
  await browser.navigate('/login');await browser.until("typeof window.__FIREBASE_SIGN_IN__==='function'",'Auth demo');await browser.evaluate(`window.__FIREBASE_SIGN_IN__(${JSON.stringify(adminEmail)},${JSON.stringify(adminPassword)}).then(()=>true)`);
  for(const width of [1280,390]){
   await browser.command('Emulation.setDeviceMetricsOverride',{width,height:width===390?844:900,deviceScaleFactor:1,mobile:width===390});
   const id='logistics-browser-'+randomUUID(),{b}=fixture(id),r=contractRefs(db,id,1),ref=fulfillmentRef(db,id,1);
   await r.family.set({sourceCollection:b.sourceCollection,solicitudId:b.solicitudId,lastVersion:1});await r.budget.set(b);await acceptBudgetV2(db,{budgetId:id,version:1,acceptedOptionId:'option-1',preferredPlanCuotas:12,commandId:'accept'},'synthetic-admin');await contractCommand(db,id,1,{action:'OPEN_OR_CREATE',commandId:'open-synthetic'},'synthetic-admin');
   const before=JSON.stringify({b:(await r.budget.get()).data(),a:(await r.acceptance.get()).data()});
   const operationUrl=`/admin/operaciones/${id}/1?section=logistics`;
   async function reopen(){await browser.navigate('/admin/solicitudes');await browser.until("location.pathname==='/admin/solicitudes'&&!!document.querySelector('[data-testid=solicitudes-inbox]')",'leave operation');await browser.navigate(operationUrl);await browser.until("!!document.querySelector('[data-testid=fulfillment-status]')",'reopened logistics');}
   async function actionForm(a:FulfillmentAction){const form=`[data-testid=fulfillment-action-${a}]`;if(!await browser.evaluate(`!!document.querySelector(${JSON.stringify(form)})`)){await browser.evaluate("document.querySelector('[data-testid=fulfillment-more]').open=true");await select('[aria-label="Otra acción disponible"]',a);}await browser.until(`!!document.querySelector(${JSON.stringify(form)})`,'correct action form');return form;}
   async function fill(a:FulfillmentAction,data:Record<string,string>){const form=await actionForm(a);for(const [label,value]of Object.entries(data)){const selector=`${form} [aria-label=${JSON.stringify(label)}]`;if(label==='Estado visual'||label==='Incidencia pendiente')await select(selector,value);else await browser.change(selector,value);}return form;}
   async function command(a:FulfillmentAction,data:Record<string,string>={},lost?:'POST'|'GET'){
    const before=await readFulfillment(db,id,1),bodies=browser.fulfillmentBodies.length,form=await fill(a,data);
    if(lost)await browser.loseNextFulfillmentResponse(lost);
    // Two immediate submits exercise the in-flight fence. Browser native validation is retained.
    await browser.evaluate(`(()=>{const button=document.querySelector(${JSON.stringify(form+' button[type=submit]')});button.click();button.click();})()`);
    if(lost){await browser.until("[...document.querySelectorAll('button')].some(b=>b.textContent==='Reintentar confirmación')",'lost response recovery');assert.equal((await ref.get()).data()!.revision,before.state.revision+1);assert.equal(browser.lostFulfillmentStatuses.at(-1),200);assert.equal((await ref.collection('events').get()).size,before.state.revision+1);await browser.clickText('Reintentar confirmación');}
    await browser.until(`document.querySelector('[data-testid=fulfillment]')?.getAttribute('data-revision')==='${before.state.revision+1}'&&document.querySelector('[data-testid=fulfillment-saved]')?.textContent==='Cambio guardado correctamente'`,'confirmed saved state');
    const bodiesSent=browser.fulfillmentBodies.slice(bodies);assert.equal(bodiesSent.length,lost?2:1,'one command per intention plus exact recovery');if(lost)assert.deepEqual(bodiesSent[0],bodiesSent[1]);
    const savedDoc=await ref.get(),saved=savedDoc.data()!;assert.equal((await ref.collection('events').get()).size,saved.revision);assert.equal((await ref.collection('commands').get()).size,saved.revision);
    await browser.until(`document.querySelector('[data-testid=operation-logistics-status]')?.textContent.includes(${JSON.stringify(operationStatusLabel(saved.providerState))})&&document.querySelector('[data-testid=operation-logistics-status]')?.textContent.includes(${JSON.stringify(operationStatusLabel(saved.logisticsState))})`,'header refreshed after save');
    await browser.until(`document.querySelector('[data-testid=delivery-v2]')?.innerText.includes(${JSON.stringify('Logística: '+operationStatusLabel(saved.logisticsState))})`,'delivery planning refreshed without remount');
    if(a==='PLACE_ORDER')await capture(`saved-${width}`);
    await reopen();assert.equal(await browser.evaluate("document.querySelector('[data-testid=fulfillment]').getAttribute('data-revision')"),String(saved.revision));const reopened=await ref.get();assert.equal(reopened.data()!.revision,saved.revision);assert.ok(reopened.updateTime!.isEqual(savedDoc.updateTime!));persistenceEvidence.push({budgetId:id,width,action:a,revision:saved.revision,provider:saved.providerState,logistics:saved.logisticsState,eventCount:saved.revision,beforeReopen:savedDoc.updateTime!.toDate().toISOString(),afterReopen:reopened.updateTime!.toDate().toISOString(),lostResponse:lost??null});
    assert.ok((await browser.evaluate<string>("document.querySelector('[data-testid=fulfillment-status]').textContent")).includes(operationStatusLabel(saved.logisticsState)));
    await browser.overflow('logistics '+a);return saved;
   }
   await browser.navigate(operationUrl);await browser.until("!!document.querySelector('[data-testid=fulfillment-status]')",'initial panel');
   assert.equal(await browser.evaluate("!!document.querySelector('option[value=READY_FOR_PICKUP]')"),false,'invalid transition is not offered');await capture(`initial-${width}`);
   await command('UPDATE_ORDER',{'Proveedor seleccionado':'Proveedor sintético','Número de pedido / referencia del proveedor':'DEMO-123','Disponibilidad estimada':'2026-01-02','Observaciones':'Sólo prueba'},'POST');
   await command('CANCEL_ORDER',{'Motivo de cancelación':'Cancelación sintética'});await command('REOPEN_ORDER',{'Motivo de reapertura':'Reapertura sintética'});
   await command('PLACE_ORDER',{'Fecha real del pedido':'2026-01-01'});
   await command('CONFIRM_ORDER',{'Costo real confirmado':'600000','Disponibilidad confirmada':'2026-01-02'});
   // Another administrator changes the persisted revision while this form remains open.
   const costForm=await fill('UPDATE_COST',{'Costo real confirmado':'620000','Motivo del cambio':'Confirmación sintética'}),current=await readFulfillment(db,id,1);
   await fulfillmentCommand(db,id,1,{commandId:randomUUID(),operationId:current.identity.operationId,expectedRevision:current.state.revision,action:'UPDATE_COST',data:{actualCost:610000,reason:'Otro administrador sintético'}},'synthetic-concurrent-admin');
   await browser.click(costForm+' button[type=submit]');await browser.until("document.querySelector('[data-testid=fulfillment] [role=alert]')?.textContent.includes('revisión')",'stale revision explained');
   assert.equal(await browser.evaluate<string>(`document.querySelector(${JSON.stringify(costForm+' [aria-label="Costo real confirmado"]')}).value`),'620000');assert.equal((await ref.get()).data()!.actualCost,610000);
   await command('UPDATE_COST',{'Costo real confirmado':'620000','Motivo del cambio':'Confirmación sintética'});
   await command('READY_FOR_PICKUP');await capture(`pickup-${width}`);
   await command('PLAN_PICKUP',{'Retiro previsto':'2026-01-03','Responsable de retiro':'Retirante demo'},'GET');assert.equal((await ref.get()).data()!.actualPickupDate,null);
   // A future actual date must not produce a command, success or write, and the typed value stays visible.
   const pickupForm=await fill('RECORD_PICKUP',{'Retiro real':'2099-01-03','Responsable de retiro':'Retirante demo'}),count=browser.fulfillmentBodies.length;
   await browser.click(pickupForm+' button[type=submit]');await browser.until("document.querySelector('[data-testid=fulfillment] [role=alert]')?.textContent.includes('futuro')",'future actual date');assert.equal(browser.fulfillmentBodies.length,count);assert.equal(await browser.evaluate(`${JSON.stringify('2099-01-03')}===document.querySelector(${JSON.stringify(pickupForm+' [aria-label="Retiro real"]')}).value`),true);
   await command('RECORD_PICKUP',{'Retiro real':'2026-01-03','Responsable de retiro':'Retirante demo'});
   await command('RECEIVE',{'Recepción real':'2026-01-04','Depósito / ubicación de custodia autorizada':'Depósito demo','Responsable de custodia':'Custodio demo','Estado visual':'SIN_DANOS_VISIBLES','Observaciones de recepción':'Verificado demo'});
   await command('PLAN_TRIP',{'Referencia del viaje':'VIAJE-DEMO','Fecha prevista del viaje':'2026-12-10','Transportista / responsable del viaje':'Transporte demo'});
   await command('PLAN_DELIVERY',{'Localidad de destino':'Localidad demo','Entrega estimada':'2026-12-11','Responsable de entrega':'Responsable demo'});
   const incident=await command('REPORT_INCIDENT',{'Descripción de la incidencia':'Incidencia sintética'});await command('RESOLVE_INCIDENT',{'Incidencia pendiente':incident.incidents[0].id,'Resolución administrativa':'Incidencia revisada y resuelta en Emulator'});
   const s=(await ref.get()).data()!;assert.equal(s.logisticsState,'ENTREGA_PROGRAMADA');assert.equal(s.actualCost,620000);assert.equal(s.budgetedCost,580000);assert.equal(s.custodian,'Custodio demo');assert.equal(s.deliveryClosure,'BLOCKED_PHYSICAL_SIGNATURES_REQUIRED');
   assert.ok((await browser.evaluate<string>("document.querySelector('[data-testid=delivery-blocked]').textContent")).includes('mandato, pagaré y remito'));await capture(`delivery-${width}`);
   assert.equal(JSON.stringify({b:(await r.budget.get()).data(),a:(await r.acceptance.get()).data()}),before);
  }
  assert.equal(browser.lostFulfillmentStatuses.length,4);writeFileSync(out+'/persistence.json',JSON.stringify(persistenceEvidence,null,2));
  assert.equal(browser.externalFirebase.length,0);assert.equal(browser.storageWrites,0);
  console.log('FULFILLMENT_WORKFLOW_DESKTOP_MOBILE_REOPEN_EACH_TRANSITION=PASS; POST_AND_READ_RESPONSE_LOSS_EXACT_REPLAY=PASS; CONFLICT_PRESERVES_FIELDS=PASS; DOUBLE_SUBMIT_SINGLE_EVENT=PASS; HEADER_SYNC=PASS; DELIVERY_BLOCKED=PASS; MOBILE_OVERFLOW=0; PRODUCTION_REQUESTS=0');
 } finally {await browser.close();}
}
