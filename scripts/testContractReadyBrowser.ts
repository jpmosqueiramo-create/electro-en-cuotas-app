import './helpers/requireSafeEmulatorEnvironment';
import assert from 'node:assert/strict';
import { mkdirSync,writeFileSync } from 'node:fs';
import { admin } from '../src/lib/firebaseAdmin';
import { infrastructureFixture } from './helpers/contractInfrastructureFixtures';
import { contractRefs } from '../src/lib/contractV2Server';
import { CatalogBrowser } from './helpers/catalogBrowser';
import { adminEmail,adminPassword } from './helpers/adminSolicitudesFixtures';
export async function testContractReadyBrowser(){
 const id=`ready-browser-${Date.now()}`,{source:{budget:b,acceptance:a,draft:d}}=infrastructureFixture(id),r=contractRefs(admin.firestore(),id,1);
 await r.family.set({sourceCollection:b.sourceCollection,solicitudId:b.solicitudId,lastVersion:1});await r.budget.set(b);await r.acceptance.set(a);await r.draft.set(d);
 const u=await admin.auth().getUserByEmail(adminEmail);await admin.auth().updateUser(u.uid,{password:adminPassword,emailVerified:true});
 const browser=await CatalogBrowser.open();const dir='/tmp/cuenta-hogar-contract-ready';mkdirSync(dir,{recursive:true});
 async function capture(name:string){await browser.evaluate("document.querySelector('[data-testid=contract-composer]').scrollIntoView({block:'start'})");const shot=await browser.command('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});writeFileSync(`${dir}/${name}.png`,Buffer.from(shot.data as string,'base64'));}
 async function dialogClick(text:string){await browser.until(`[...document.querySelectorAll('button')].some(b=>b.textContent.trim()===${JSON.stringify(text)}&&!b.matches(':disabled')&&b.getClientRects().length>0)`,'enabled action '+text);const clicked=browser.clickText(text);await browser.delay(200);await browser.command('Page.handleJavaScriptDialog',{accept:true});await clicked;}
 try{
  await browser.command('Emulation.setDeviceMetricsOverride',{width:1280,height:800,deviceScaleFactor:1,mobile:false});
  await browser.navigate('/login');await browser.until("typeof window.__FIREBASE_SIGN_IN__==='function'",'auth');await browser.evaluate(`window.__FIREBASE_SIGN_IN__(${JSON.stringify(adminEmail)},${JSON.stringify(adminPassword)}).then(()=>true)`);
  await browser.navigate('/admin/presupuestos');await browser.until("!![...document.querySelectorAll('label')].find(x=>x.textContent.includes('Buscar presupuesto V2'))",'history');await browser.field('Buscar presupuesto V2',id);
  await browser.until("[...document.querySelectorAll('section')].find(s=>s.querySelector('h2')?.textContent==='Historial V2')?.querySelectorAll('article').length===1",'exact budget');
  await browser.clickText('Abrir versión 1',"[...document.querySelectorAll('section')].find(s=>s.querySelector('h2')?.textContent==='Historial V2')");await browser.until("!!document.querySelector('[data-testid=acceptance-registered]')",'acceptance');assert.equal(await browser.evaluate("document.querySelector('a[href=\"/admin/operaciones/"+id+"/1\"]')?.textContent"),'Abrir ficha de operación');await browser.navigate(`/admin/operaciones/${id}/1`);await browser.until("!!document.querySelector('[data-testid=operation-unified-workspace]')",'operation workspace');await browser.clickText('Contrato');await browser.until("!!document.querySelector('[data-testid=contract-composer]')",'contract section');await browser.evaluate("document.querySelectorAll('[data-testid=contract-composer] details').forEach(d=>d.open=true)");
  await browser.until("!!document.querySelector('[data-testid=contract-review]') && !document.querySelector('[data-testid=contract-editable-fields]').disabled",'composer');
  await capture('01-draft-desktop');
  await dialogClick('Confirmar preparación técnica');await browser.until("!!document.querySelector('[data-testid=contract-ready]')",'READY');
  assert.equal(await browser.evaluate("document.querySelector('[data-testid=contract-editable-fields]').disabled"),true);
  const html=await browser.evaluate<string>('document.body.innerText');assert.ok(html.includes('Datos y condiciones revisados. La emisión contractual definitiva continúa pendiente de aprobación.'));
  assert.equal((await r.draft.get()).data()!.status,'READY_TO_FORMALIZE');await capture('02-ready-desktop');await browser.overflow('READY desktop');
  await browser.command('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});await browser.overflow('READY mobile');await capture('03-ready-mobile');
  await dialogClick('Volver a borrador');await browser.until("!document.querySelector('[data-testid=contract-ready]') && !document.querySelector('[data-testid=contract-editable-fields]').disabled",'returned');
  assert.equal((await r.draft.get()).data()!.status,'DRAFT');assert.equal((await r.draft.collection('readyReviews').get()).size,1);
  await browser.change('[data-testid=contract-personal] input[name=address]','Corrección revisada');await browser.clickText('Guardar datos personales');await browser.until("!document.querySelector('[data-testid=contract-editable-fields]').disabled",'saved');
  await dialogClick('Confirmar preparación técnica');await browser.until("!!document.querySelector('[data-testid=contract-ready]')",'new READY');assert.equal((await r.draft.collection('readyReviews').get()).size,2);
  assert.deepEqual((await r.draft.get()).data()!.paymentScheduleDraft,d.paymentScheduleDraft);assert.deepEqual(browser.externalFirebase,[]);
  console.log('READY_BROWSER_ADMIN_DESKTOP_MOBILE_RETURN_REVIEW = PASS');
 }finally{await browser.close();}
}
