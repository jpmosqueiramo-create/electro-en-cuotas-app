import './helpers/requireSafeEmulatorEnvironment';
import assert from 'node:assert/strict';
import {createHash,randomUUID} from 'node:crypto';
import {labRepository,resolveLabExecutionContext} from '../src/lib/operationsLabContext';
import {labParticipantCommand} from '../src/lib/operationsLabParticipants';
import { existsSync, readdirSync, mkdirSync, writeFileSync } from 'node:fs';
import { admin } from '../src/lib/firebaseAdmin';
import { CatalogBrowser } from './helpers/catalogBrowser';
const adminEmail='lab-admin@example.test',adminPassword='Synthetic-only-123';
export async function testOperationsLabBrowser() {
 assert.equal(process.env.GCLOUD_PROJECT,'demo-cuenta-hogar');
 await admin.auth().createUser({uid:'synthetic-lab-browser',email:adminEmail,password:adminPassword,emailVerified:true});
 const browser=await CatalogBrowser.open(),out='/tmp/ch-lab-browser';mkdirSync(out,{recursive:true});
 try {
  await browser.command('Page.addScriptToEvaluateOnNewDocument',{source:"window.__LAB_BROWSER_ERRORS__=[];window.addEventListener('error',e=>window.__LAB_BROWSER_ERRORS__.push(String(e.message)));window.addEventListener('unhandledrejection',e=>window.__LAB_BROWSER_ERRORS__.push(String(e.reason?.message||'Unhandled rejection')));"});
  await browser.navigate('/login');await browser.until("typeof window.__FIREBASE_SIGN_IN__==='function'",'auth');
  await browser.evaluate(`window.__FIREBASE_SIGN_IN__(${JSON.stringify(adminEmail)},${JSON.stringify(adminPassword)}).then(()=>true)`);
  await browser.navigate('/admin/laboratorio');await browser.until("document.body.innerText.includes('Acceso verificado')",'lab authorization');
  assert(await browser.evaluate("document.body.innerText.includes('Cada sesión mantiene sus propios datos')"));
  await browser.clickText('Registrar sesión sintética');await browser.until("document.body.innerText.includes('Sesión sintética registrada')",'session saved');
  assert(await browser.evaluate("document.body.innerText.includes('Sesión 1')"));
  await browser.clickText('Abrir circuito');
  const steps=[['Crear consulta ficticia','Emitir presupuesto de prueba'],['Emitir presupuesto de prueba','Registrar aceptación sintética'],['Registrar aceptación sintética','Confirmar revisión sintética de datos, documentos y crédito'],['Confirmar revisión sintética de datos, documentos y crédito','Confirmar conformidad sintética y revisión READY'],['Confirmar conformidad sintética y revisión READY','Congelar snapshot de laboratorio'],['Congelar snapshot de laboratorio','Preparar mandato, pagaré y remito de prueba'],['Preparar mandato, pagaré y remito de prueba','Simular firma del mandato'],['Simular firma del mandato','Simular firma del pagaré'],['Simular firma del pagaré','Simular firma del remito'],['Simular firma del remito','Confirmar custodia sintética de originales'],['Confirmar custodia sintética de originales','Confirmar entrega de prueba'],['Confirmar entrega de prueba','Activar cuotas de prueba'],['Activar cuotas de prueba','Registrar pago sintético de $145.000']] as const;
  for(const [action,next] of steps){
   if(action==='Confirmar conformidad sintética y revisión READY'){
    await browser.change('input[name="firstDate"]','2027-01-15');await browser.change('input[name="dueDay"]','15');
    await browser.clickText('Guardar ajustes del borrador de prueba');await browser.until("Array.from(document.querySelectorAll('button')).some(b=>b.textContent==='Guardar ajustes del borrador de prueba'&&!b.disabled)",'draft settings saved');
    assert.equal(await browser.evaluate("document.querySelector('input[name=firstDate]').value"),'2027-01-15');
    for(const[width,height,mobile]of [[1280,900,false],[390,844,true]]as const){await browser.command('Emulation.setDeviceMetricsOverride',{width,height,mobile,deviceScaleFactor:1});await browser.overflow('draft '+width);await browser.evaluate("document.querySelector('[aria-label=\"Circuito sintético\"] form').scrollIntoView()");const screenshot=await browser.command('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});writeFileSync(`${out}/draft-${width}.png`,Buffer.from(screenshot.data as string,'base64'));}
   }
   await browser.until(`Array.from(document.querySelectorAll('button')).some(b=>b.textContent===${JSON.stringify(action)}&&!b.disabled)`,action);if(action==='Crear consulta ficticia')await browser.evaluate("(()=>{const b=Array.from(document.querySelectorAll('button')).find(b=>b.textContent==='Crear consulta ficticia');b.click();b.click();})()");else await browser.clickText(action);await browser.until(`Array.from(document.querySelectorAll('button')).some(b=>b.textContent===${JSON.stringify(next)}&&!b.disabled)`,next);}
  assert(await browser.evaluate("document.querySelector('[data-testid=lab-balance]').textContent.includes('1.740.000')"));
  await browser.evaluate(`(()=>{const original=window.fetch.bind(window);let lost=false;window.fetch=async(...args)=>{const response=await original(...args);const options=args[1];if(!lost&&String(args[0]).includes('/api/admin/laboratorio/')&&options?.method==='POST'&&JSON.parse(options.body).action==='PAY'&&response.ok){await response.clone().json();lost=true;throw new TypeError('Respuesta perdida sintética después del commit');}return response;};})()`);
  await browser.clickText('Registrar pago sintético de $145.000');
  await browser.until("Array.from(document.querySelectorAll('button')).some(b=>b.textContent==='Recuperar resultado del paso anterior'&&!b.disabled)",'lost response recovery');
  await browser.navigate('/admin/laboratorio');await browser.until("document.body.innerText.includes('Sesión 1')",'reload after lost response');await browser.clickText('Abrir circuito');await browser.until("Array.from(document.querySelectorAll('button')).some(b=>b.textContent==='Recuperar resultado del paso anterior')",'pending command survived reload');
  await browser.clickText('Recuperar resultado del paso anterior');
  await browser.until("document.querySelector('[data-testid=lab-balance]').textContent.includes('1.595.000')",'payment balance');
  for(const role of ['Administración','Vendedor afiliado','Cliente']){
   await browser.evaluate(`Array.from(document.querySelectorAll('[aria-label="Vista de perfil"] button')).find(b=>b.textContent===${JSON.stringify(role)}).click()`);
   assert(await browser.evaluate("document.querySelector('[data-testid=lab-balance]').textContent.includes('1.595.000')"));
   if(role!=='Administración')assert(!(await browser.evaluate("Array.from(document.querySelectorAll('button')).some(b=>b.textContent==='Registrar pago sintético de $145.000')")));
   for(const [width,height,mobile]of [[1280,900,false],[390,844,true]] as const){await browser.command('Emulation.setDeviceMetricsOverride',{width,height,mobile,deviceScaleFactor:1});await browser.overflow(role+' '+width);await browser.evaluate("document.querySelector('[aria-label=\"Circuito sintético\"]').scrollIntoView()");const screenshot=await browser.command('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});writeFileSync(`${out}/${role}-${width}.png`,Buffer.from(screenshot.data as string,'base64'));}
  }
  assert.deepEqual(await browser.evaluate('window.__LAB_BROWSER_ERRORS__'),[]);
  const ownerUid='synthetic-lab-browser',owner=createHash('sha256').update(ownerUid).digest('hex');
  const sessions=await admin.firestore().collection('operationsLabV1').doc(owner).collection('sessions').get();assert.equal(sessions.size,1);const sessionId=sessions.docs[0].id;
  const context=await resolveLabExecutionContext(admin.firestore(),ownerUid,sessionId,{OPERATIONS_LAB_ENABLED:'true',OPERATIONS_LAB_ADMIN_UIDS:JSON.stringify([ownerUid])});
  const workflow=await labRepository(context).read('contracts','workflow');const ledger=await labRepository(context).read('ledger',workflow!.value.operationId);assert.equal(ledger!.value.payments.length,1,'lost response retry did not duplicate payment');assert.equal((await sessions.docs[0].ref.collection('requests').get()).size,1,'double click did not duplicate request');
  process.env.OPERATIONS_LAB_PARTICIPANT_UIDS=JSON.stringify(['lab-browser-client','lab-browser-affiliate']);
  for(const role of ['CLIENT','AFFILIATE'] as const){
   const uid='lab-browser-'+role.toLowerCase(),email=uid+'@example.test';await admin.auth().createUser({uid,email,password:adminPassword,emailVerified:true});
   await labParticipantCommand(context,{commandId:randomUUID(),uid,role,action:'GRANT'});
   await browser.navigate('/login');await browser.until("typeof window.__FIREBASE_SIGN_IN__==='function'",'role sign in');await browser.evaluate(`window.__FIREBASE_SIGN_IN__(${JSON.stringify(email)},${JSON.stringify(adminPassword)}).then(()=>true)`);
   await browser.navigate('/laboratorio/'+sessionId+'?owner='+owner);await browser.until("document.querySelector('[data-testid=lab-reader-balance]')?.textContent.includes('1.595.000')",'authenticated '+role+' balance');
   assert(!(await browser.evaluate("Array.from(document.querySelectorAll('button')).some(b=>/Registrar pago|Revertir/.test(b.textContent))")));assert(!(await browser.evaluate("document.querySelector('a[href*=\"wa.me\"]')")));
   for(const[width,height,mobile]of [[1280,900,false],[390,844,true]]as const){await browser.command('Emulation.setDeviceMetricsOverride',{width,height,mobile,deviceScaleFactor:1});await browser.overflow('authenticated '+role);await browser.evaluate('window.scrollTo(0,0)');const image=await browser.command('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});writeFileSync(`${out}/auth-${role}-${width}.png`,Buffer.from(image.data as string,'base64'));}
   await browser.command('Network.emulateNetworkConditions',{offline:true,latency:0,downloadThroughput:0,uploadThroughput:0});await browser.evaluate("window.dispatchEvent(new Event('focus'))");await browser.until("!document.querySelector('[data-testid=lab-reader-balance]')",'offline clears '+role);
   await browser.command('Network.emulateNetworkConditions',{offline:false,latency:0,downloadThroughput:-1,uploadThroughput:-1});await browser.evaluate("window.dispatchEvent(new Event('online'))");await browser.until("document.querySelector('[data-testid=lab-reader-balance]')?.textContent.includes('1.595.000')",'connection recovered '+role);
   assert.deepEqual(await browser.evaluate('window.__LAB_BROWSER_ERRORS__'),[]);
   await labParticipantCommand(context,{commandId:randomUUID(),uid,role,action:'REVOKE'});await browser.until("!document.querySelector('[data-testid=lab-reader-balance]')&&document.body.innerText.includes('no tiene acceso vigente')",'revocation clears '+role);
   await labParticipantCommand(context,{commandId:randomUUID(),uid,role,action:'GRANT'});await browser.until("document.querySelector('[data-testid=lab-reader-balance]')?.textContent.includes('1.595.000')",'restored explicit grant '+role);
  }
  await browser.navigate('/login');await browser.until("typeof window.__FIREBASE_SIGN_IN__==='function'",'admin sign in');await browser.evaluate(`window.__FIREBASE_SIGN_IN__(${JSON.stringify(adminEmail)},${JSON.stringify(adminPassword)}).then(()=>true)`);
  await browser.navigate('/admin/laboratorio');await browser.until("document.body.innerText.includes('Sesión 1')",'admin session list');await browser.clickText('Abrir circuito');await browser.until("document.querySelector('[data-testid=lab-balance]')?.textContent.includes('1.595.000')",'admin same source');
  const downloads=out+'/downloads-'+Date.now();mkdirSync(downloads,{recursive:true});await browser.command('Browser.setDownloadBehavior',{behavior:'allow',downloadPath:downloads});
  for(const label of ['Descargar mandato de prueba','Descargar pagaré de prueba','Descargar remito de prueba','Descargar recibo de prueba'])await browser.clickText(label);
  for(let n=0;n<100&&!(['TEST-MANDATE.pdf','TEST-PAGARE.pdf','TEST-REMITO.pdf'].every(name=>existsSync(downloads+'/'+name))&&readdirSync(downloads).some(name=>name.startsWith('TEST-receipt_')&&name.endsWith('.pdf')));n++)await browser.delay(100);
  for(const name of ['TEST-MANDATE.pdf','TEST-PAGARE.pdf','TEST-REMITO.pdf'])assert(existsSync(downloads+'/'+name),name);
  assert(readdirSync(downloads).some(name=>name.startsWith('TEST-receipt_')&&name.endsWith('.pdf')),'receipt downloaded');
  await browser.clickText('Revertir último pago sintético');await browser.until("document.querySelector('[data-testid=lab-balance]').textContent.includes('1.740.000')",'reversal balance');
  for(const [width,height,mobile] of [[1280,800,false],[390,844,true]] as const) {
   await browser.command('Emulation.setDeviceMetricsOverride',{width,height,mobile,deviceScaleFactor:1});
   await browser.overflow('lab '+width);
   await browser.evaluate('window.scrollTo(0,0)');
   const image=await browser.command('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
   writeFileSync(`${out}/${width}.png`,Buffer.from(image.data as string,'base64'));
  }
  await browser.navigate('/admin/laboratorio');await browser.until("document.body.innerText.includes('Sesión 1')",'persistent session');
  assert.deepEqual(await browser.evaluate('window.__LAB_BROWSER_ERRORS__'),[]);
  assert.deepEqual(browser.externalFirebase,[]);assert.equal(browser.storageWrites,0);
  console.log('LAB_BROWSER_FULL_JOURNEY_PASS: request to documents, three signatures, custody, delivery, 12 installments, payment/reversal, three simulated views, independent CLIENT/AFFILIATE Auth, live revocation, private PDF downloads, desktop/mobile, reload, zero production network');
 } finally {await browser.close();}
}
