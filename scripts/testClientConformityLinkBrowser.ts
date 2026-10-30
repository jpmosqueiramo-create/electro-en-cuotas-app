import './helpers/requireSafeEmulatorEnvironment';
import assert from 'node:assert/strict';
import {admin} from '../src/lib/firebaseAdmin';
import {conformityFixture} from './testClientConformityLinkEmulator';
import {productionRuntimeForEmulator} from '../src/lib/productionV2/runtime';
import {syntheticFinalPackage} from './helpers/productionAdapterFixtures';
import {startProductionBrowserServer} from './helpers/productionAdapterBrowserServer';
import {CatalogBrowser} from './helpers/catalogBrowser';
import {getContract} from '../src/lib/contractV2Server';
async function main(){
 const password='Synthetic-only-114!',actor=await admin.auth().createUser({email:process.env.NEXT_PUBLIC_ADMIN_EMAIL,emailVerified:true,password});
 const runtime=productionRuntimeForEmulator(admin.firestore(),admin.auth(),[syntheticFinalPackage()],[actor.uid]);
 const server=await startProductionBrowserServer(runtime),browser=await CatalogBrowser.open();
 try{
 await browser.navigate('/login');await browser.until("typeof window.__FIREBASE_SIGN_IN__==='function'",'auth');await browser.evaluate(`window.__FIREBASE_SIGN_IN__(${JSON.stringify(process.env.NEXT_PUBLIC_ADMIN_EMAIL)},${JSON.stringify(password)}).then(()=>true)`);
 for(const view of [{width:1280,height:900,mobile:false},{width:390,height:844,mobile:true}]){
  const f=await conformityFixture();await browser.command('Emulation.setDeviceMetricsOverride',{...view,deviceScaleFactor:1});
  await browser.navigate(`/admin/operaciones/${f.id}/1?section=contract&editor=1`);
  await browser.until("!!document.querySelector('[data-testid=client-conformity-link]')",'conformity panel');
  await browser.clickText('Generar mensaje de conformidad');await browser.until("!!document.querySelector('[aria-label=\"Mensaje de conformidad para el cliente\"]')",'message generated');
  const message=await browser.evaluate<string>("document.querySelector('[aria-label=\"Mensaje de conformidad para el cliente\"]').value");assert.ok(message.includes('GESTIONAMOS TU COMPRA'));
  assert.ok(!message.includes('SECRET_PROVIDER'));assert.ok(!message.includes(f.draft.personalData.dni));
  let link=await browser.evaluate<string>("[...document.querySelectorAll('[data-testid=client-conformity-link] a')].find(a=>a.textContent==='Ver enlace').href");
  assert.equal((await f.r.draft.collection('conformity').doc('current').get()).exists,false);
  if(!view.mobile){const other=await conformityFixture();await browser.navigate(`/admin/operaciones/${other.id}/1?section=contract&editor=1`);await browser.until("!!document.querySelector('[data-testid=client-conformity-link]')",'other operation');assert.equal(await browser.evaluate("!!document.querySelector('[aria-label=\"Mensaje de conformidad para el cliente\"]')"),false);await browser.navigate(`/admin/operaciones/${f.id}/1?section=contract&editor=1`);await browser.until("!!document.querySelector('[data-testid=client-conformity-link]')",'return operation');await browser.clickText('Generar mensaje de conformidad');await browser.until("!!document.querySelector('[aria-label=\"Mensaje de conformidad para el cliente\"]')",'fresh message');link=await browser.evaluate<string>("[...document.querySelectorAll('[data-testid=client-conformity-link] a')].find(a=>a.textContent==='Ver enlace').href");}
  await browser.evaluate("document.querySelector('[data-testid=client-conformity-link]').scrollIntoView({block:'start'})");await browser.overflow('admin '+view.width);await browser.screenshot(`client-conformity-admin-${view.width}.png`);
  const url=new URL(link);await browser.navigate(url.pathname+url.hash);
  await browser.until("!!document.querySelector('[data-testid=confirm-client-conformity]')",'public summary');assert.equal(await browser.evaluate('location.hash'),'');assert.equal(await browser.evaluate("!!document.querySelector('[aria-label=\"Consultar por WhatsApp\"]')"),false);
  assert.equal(await browser.evaluate("document.querySelector('[data-testid=confirm-client-conformity]').disabled"),true);
  assert.equal((await f.r.draft.collection('conformity').doc('current').get()).exists,false);
  await browser.evaluate("document.querySelector('[data-testid=public-conformity]').scrollIntoView({block:'start'})");await browser.overflow('public '+view.width);await browser.screenshot(`client-conformity-public-${view.width}.png`);
  await browser.click('input[aria-label="Confirmo las condiciones y el domicilio"]');await browser.click('[data-testid=confirm-client-conformity]');
  await browser.until("!!document.querySelector('[data-testid=conformity-success]')",'explicit acceptance');assert.equal((await getContract(admin.firestore(),f.id,1)).clientConformity?.confirmed,true);
  await browser.navigate(`/admin/operaciones/${f.id}/1?section=contract&editor=1`);await browser.until("document.body.innerText.includes('Conformidad registrada para las condiciones y el domicilio vigentes.')",'admin receives confirmation');
  assert.equal(await browser.evaluate("!!document.querySelector('[data-testid=client-conformity-link]')"),false);
 }
 assert.deepEqual(browser.externalFirebase,[]);assert.equal(browser.storageWrites,0);assert.equal(browser.publishBodies.length,0);
 console.log('CLIENT_CONFORMITY_ADMIN_MESSAGE_PUBLIC_EXPLICIT_ACCEPTANCE_SYNC_1280_390=PASS');
 }finally{await browser.close();await server.stop();await admin.app().delete();}
}
void main().catch(e=>{console.error(e);process.exitCode=1;});
