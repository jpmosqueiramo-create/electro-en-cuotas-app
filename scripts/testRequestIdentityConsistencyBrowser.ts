import './helpers/requireSafeEmulatorEnvironment';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { CatalogBrowser } from './helpers/catalogBrowser';
import { adminEmail,adminPassword,setupAdminSolicitudesFixtures,databaseSnapshot } from './helpers/adminSolicitudesFixtures';
import { createCreditCase } from './testCreditReviewV2Emulator';
export async function testRequestIdentityConsistencyBrowser(){
 await setupAdminSolicitudesFixtures();
 const c=await createCreditCase('identity-browser-'+randomUUID()),before=await databaseSnapshot();
 const path=`/admin/solicitudes/solicitudes_cuenta/${c.source.id}`,dir='/tmp/cuenta-hogar-request-identity';mkdirSync(dir,{recursive:true});
 const browser=await CatalogBrowser.open();
 async function capture(name:string){const shot=await browser.command('Page.captureScreenshot',{format:'png'});writeFileSync(`${dir}/${name}.png`,Buffer.from(shot.data as string,'base64'));}
 try{
  await browser.navigate('/login');await browser.until("typeof window.__FIREBASE_SIGN_IN__==='function'",'Auth Emulator bootstrap');
  await browser.evaluate(`window.__FIREBASE_SIGN_IN__(${JSON.stringify(adminEmail)},${JSON.stringify(adminPassword)}).then(()=>true)`);
  for(const [width,height]of [[1280,800],[390,844]]){
   await browser.command('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width===390});
   // Direct first opening after login; no reload, SDK reads or token extraction.
   await browser.navigate(path);await browser.until("!!document.querySelector('[data-testid=solicitud-operation-links] a[href^=\"/admin/operaciones/\"]')",'first request load');
   assert.ok((await browser.evaluate<string>("document.querySelector('[data-testid=solicitud-detail]').innerText")).includes('Cliente sintético'));
   await browser.overflow('request first load');await capture(`detail-${width}`);
   await browser.evaluate("document.querySelector('[data-testid=solicitud-operation-links] a[href^=\"/admin/operaciones/\"]').click()");
   await browser.until("!!document.querySelector('[data-testid=operation-identity]')",'identity provenance');
   let identity=await browser.evaluate<string>("document.querySelector('[data-testid=operation-identity]').innerText");assert.ok(identity.includes('Hay diferencias de identidad'));
   await browser.evaluate("document.querySelector('[data-testid=operation-identity] details').open=true");
   identity=await browser.evaluate<string>("document.querySelector('[data-testid=operation-identity]').innerText");
   for(const label of ['Solicitud original','Presupuesto aceptado','Formulario recibido · aplicado','Borrador contractual','Aceptación','Carpeta documental'])assert.ok(identity.includes(label),label);
   assert.ok(identity.includes('Cliente demo'));assert.ok(identity.includes('Cliente sintético'));
   await browser.overflow('identity provenance');await capture(`operation-${width}`);
   await browser.clickText('Contrato');await browser.until("!!document.querySelector('[data-testid=credit-review] [data-testid=operation-identity]')",'credit identity block');
   assert.ok((await browser.evaluate<string>("document.querySelector('[data-testid=credit-review]').innerText")).includes('Hay diferencias de identidad'));
   await browser.evaluate("[...document.querySelectorAll('a')].find(a=>a.textContent==='Volver a solicitud').click()");
   await browser.until("!!document.querySelector('[data-testid=solicitud-operation-links] a[href^=\"/admin/operaciones/\"]')",'back without reload');
   await browser.evaluate("[...document.querySelectorAll('a')].find(a=>a.textContent==='Volver a Solicitudes').click()");
   await browser.until("!!document.querySelector('[data-testid=solicitudes-inbox]')",'inbox route');
   await browser.navigate('/admin');await browser.until("[...document.querySelectorAll('a')].some(a=>a.textContent==='Revisar bandeja')",'Hoy');
   await browser.evaluate("[...document.querySelectorAll('a')].find(a=>a.textContent==='Revisar bandeja').click()");
   await browser.until(`[...document.querySelectorAll('a')].some(a=>a.getAttribute('href')?.startsWith(${JSON.stringify(path)}))`,'inbox data loaded');
   await browser.evaluate(`[...document.querySelectorAll('a')].find(a=>a.getAttribute('href')?.startsWith(${JSON.stringify(path)})).click()`);
   await browser.until("!!document.querySelector('[data-testid=solicitud-operation-links] a[href^=\"/admin/operaciones/\"]')",'internal first load');
   // A transient failed read becomes an explicit retry, never an indefinite spinner or automatic reload.
   await browser.command('Network.setBlockedURLs',{urls:['*api/admin/solicitudes/*']});
   await browser.navigate(path);await browser.until("[...document.querySelectorAll('button')].some(b=>b.textContent==='Reintentar')",'visible read error');
   await browser.command('Network.setBlockedURLs',{urls:[]});await browser.clickText('Reintentar');
   await browser.until("!!document.querySelector('[data-testid=solicitud-operation-links] a[href^=\"/admin/operaciones/\"]')",'retry without reload');
   await browser.overflow('retry');
  }
  assert.deepEqual(browser.externalFirebase,[]);assert.deepEqual(await databaseSnapshot(),before);
  console.log('REQUEST_FIRST_LOAD_DIRECT_INTERNAL_RETRY_IDENTITY_DESKTOP_MOBILE_NO_WRITES = PASS');
  // Explicit verification is a separate Emulator-only command, never a write-on-read.
  const protectedDocs=await Promise.all([c.r.budget.get(),c.r.acceptance.get(),c.r.draft.get()]);
  await browser.navigate(`/admin/operaciones/${c.id}/1?section=contract`);
  await browser.until("[...document.querySelectorAll('button')].some(b=>b.textContent==='Verificar identidad y crear carpeta')",'explicit verification control');
  await browser.change('[data-testid=credit-review] fieldset textarea','Identidad sintética revisada expresamente en Emulator');
  await browser.clickText('Verificar identidad y crear carpeta');
  await browser.until("document.querySelector('[data-testid=operation-identity]')?.innerText.includes('vinculación documental verificada')",'identity header updated without reload');
  const after=await databaseSnapshot(),indexed=new Map(after);
  for(const [path,value]of before){if(path===c.r.draft.path+'/creditReview/current')assert.equal((indexed.get(path) as {revision:number}).revision,(value as {revision:number}).revision+1);else assert.deepEqual(indexed.get(path),value,`Existing document unchanged: ${path}`);}
  const additions=after.filter(([path])=>!before.some(([old])=>old===path));assert.equal(additions.length,2);
  assert.ok(additions.every(([path])=>path.startsWith(c.r.draft.path+'/creditReview/')||path.startsWith(c.r.draft.path+'/clientProfiles/')||path.startsWith(c.r.draft.path+'/creditCommands/')));
  const protectedAfter=await Promise.all([c.r.budget.get(),c.r.acceptance.get(),c.r.draft.get()]);
  protectedAfter.forEach((doc,i)=>assert.ok(doc.updateTime!.isEqual(protectedDocs[i].updateTime!)));
  for(const width of [1280,390]){await browser.command('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:width===390});await browser.evaluate('window.scrollTo(0,0)');await browser.overflow('identity resolved');await capture(`resolved-${width}`);}
  console.log('EXPLICIT_EMULATOR_VERIFICATION_UPDATES_HEADER_THREE_AUDITED_DOCS_ORIGINS_UNCHANGED = PASS');
 }finally{await browser.close();}
}
