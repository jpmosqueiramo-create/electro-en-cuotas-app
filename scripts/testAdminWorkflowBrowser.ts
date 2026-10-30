import './helpers/requireSafeEmulatorEnvironment';
import assert from 'node:assert/strict';
import {admin} from '../src/lib/firebaseAdmin';
import {fixture} from './testContractV2';
import {workflowFixtures} from './testAdminWorkflowEmulator';
import {contractRefs} from '../src/lib/contractV2Server';
import {CatalogBrowser} from './helpers/catalogBrowser';
import {adminEmail,adminPassword} from './helpers/adminSolicitudesFixtures';
export async function testAdminWorkflowBrowser(){
 await workflowFixtures();const db=admin.firestore();try{await admin.auth().createUser({email:adminEmail,password:adminPassword,emailVerified:true});}catch{await admin.auth().updateUser((await admin.auth().getUserByEmail(adminEmail)).uid,{password:adminPassword,emailVerified:true});}
 const {b}=fixture('workflow-browser-budget');b.sourceCollection='solicitudes_cuenta';b.solicitudId='workflow-browser-source';b.clienteSnapshot.nombre='Cliente presupuesto aceptado';
 const refs=contractRefs(db,b.id,1);await refs.family.set({sourceCollection:b.sourceCollection,solicitudId:b.solicitudId,lastVersion:1});await refs.budget.set(b);await db.doc('solicitudes_cuenta/'+b.solicitudId).set({nombre:b.clienteSnapshot.nombre,estado:'Pendiente',fecha:'2026-10-30T12:00:00Z',necesidad:'Producto del presupuesto'});
 const browser=await CatalogBrowser.open();
 const select=async(selector:string,value:string)=>browser.evaluate(`(()=>{const el=document.querySelector(${JSON.stringify(selector)});if(!el)throw Error('Missing select');Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set.call(el,${JSON.stringify(value)});el.dispatchEvent(new Event('change',{bubbles:true}));})()`);
 try{
  await browser.navigate('/login');await browser.until("typeof window.__FIREBASE_SIGN_IN__==='function'",'Emulator auth');await browser.evaluate(`window.__FIREBASE_SIGN_IN__(${JSON.stringify(adminEmail)},${JSON.stringify(adminPassword)}).then(()=>true)`);
  await browser.navigate(`/admin/presupuestos?sourceCollection=${b.sourceCollection}&solicitudId=${b.solicitudId}&budgetId=${b.id}&version=1`);
  await browser.until("!!document.querySelector('[data-testid=budget-v2-editor]')",'issued budget');await browser.until("[...document.querySelectorAll('button')].some(b=>b.textContent==='Registrar aceptación'&&!b.disabled)",'acceptance button');
  await browser.clickText('Registrar aceptación');await browser.evaluate("document.querySelector('[data-testid=acceptance-panel] input[type=radio]').click()");await browser.clickText('Revisar aceptación');await browser.clickText('Registrar aceptación',"document.querySelector('[data-testid=acceptance-confirm]')");
  await browser.until("document.querySelector('[data-testid=budget-v2-editor] h2').textContent.includes('ACEPTADO')",'acceptance reflected immediately');
  await browser.clickText('Cerrar presupuesto');
  for(const width of [1280,390]){
   await browser.command('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:width<500});
   await browser.navigate('/admin/presupuestos');await browser.until("document.body.innerText.includes('Presupuesto aceptado')",'accepted history');
   const nav=await browser.evaluate<string[]>("[...document.querySelectorAll('nav[aria-label=\"Secciones de administración\"] > div a')].slice(0,3).map(a=>a.textContent.trim())");assert.deepEqual(nav,['Inicio','Presupuestos','Solicitudes']);
   await select('label:has(select) select','ACEPTADO');await browser.until("document.querySelectorAll('article').length>=1",'accepted filter');assert.equal(await browser.evaluate("[...document.querySelectorAll('article')].every(a=>a.textContent.includes('Presupuesto aceptado'))"),true);await browser.overflow('accepted budgets '+width);await browser.screenshot('workflow-budgets-'+width+'.png');
   await browser.navigate('/admin/solicitudes?view=all');await browser.until("!!document.querySelector('[data-record-key=\"solicitudes_cuenta:workflow-browser-source\"]')",'accepted request row');
   await select('[aria-label="Estado"]','PENDING_APPROVAL');await browser.until("!!document.querySelector('[data-record-key=\"solicitudes_cuenta:workflow-browser-source\"]')",'pending approval filter');assert.ok(await browser.evaluate("document.querySelector('[data-record-key=\"solicitudes_cuenta:workflow-browser-source\"]').textContent.includes('Pendiente de aprobación')"));await browser.overflow('requests pending '+width);await browser.screenshot('workflow-requests-'+width+'.png');
   await select('[aria-label="Estado"]','PENDING_PERSONAL_DATA');await browser.until("document.querySelectorAll('[data-record-key]').length>0",'personal data filter');assert.equal(await browser.evaluate("!!document.querySelector('[data-record-key=\"solicitudes_cuenta:workflow-browser-source\"]')"),false);
  }
  assert.equal(browser.externalFirebase.length,0);assert.equal(browser.storageWrites,0);
  console.log('ADMIN_WORKFLOW_BROWSER_ACCEPTANCE_IMMEDIATE_MENU_FILTERS_1280_390=PASS');
 }finally{await browser.close();}
}
