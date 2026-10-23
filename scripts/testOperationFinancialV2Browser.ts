import './helpers/requireSafeEmulatorEnvironment';
import { openOperationSection } from './helpers/openOperationSection';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdirSync,writeFileSync } from 'node:fs';
import { admin } from '../src/lib/firebaseAdmin';
import { financialFixture,activateFinancialFixture } from './testOperationFinancialV2Emulator';
import { readFinancial,financialCommand,financialRef } from '../src/lib/operationFinancialV2Server';
import { clientBindingCommand,readClientBinding } from '../src/lib/operationClientV2Server';
import { CatalogBrowser } from './helpers/catalogBrowser';
import { adminEmail,adminPassword } from './helpers/adminSolicitudesFixtures';
export async function testOperationFinancialV2Browser(){
 try{const u=await admin.auth().getUserByEmail(adminEmail);await admin.auth().updateUser(u.uid,{password:adminPassword,emailVerified:true});}catch{await admin.auth().createUser({email:adminEmail,password:adminPassword,emailVerified:true});}
 const f=await financialFixture(),db=admin.firestore(),out='/tmp/cuenta-hogar-financial-v2';mkdirSync(out,{recursive:true});await activateFinancialFixture(f);
 const original={b:(await f.r.budget.get()).data(),a:(await f.r.acceptance.get()).data(),draft:(await f.r.draft.get()).data()},browser=await CatalogBrowser.open(),scope="document.querySelector('[data-testid=financial-v2]')";
 async function capture(name:string){await browser.evaluate(`${scope}.scrollIntoView({block:'start'})`);await browser.overflow(name);const img=await browser.command('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});writeFileSync(`${out}/${name}.png`,Buffer.from(img.data as string,'base64'));}
 async function login(email:string,password:string){await browser.navigate('/login');await browser.until("typeof window.__FIREBASE_SIGN_IN__==='function'",'auth');await browser.evaluate(`window.__FIREBASE_SIGN_IN__(${JSON.stringify(email)},${JSON.stringify(password)}).then(()=>true)`);}
 try{
  await browser.command('Emulation.setDeviceMetricsOverride',{width:1280,height:800,deviceScaleFactor:1,mobile:false});await login(adminEmail,adminPassword);await browser.navigate('/admin/presupuestos');await browser.until("!![...document.querySelectorAll('label')].find(x=>x.textContent.includes('Buscar presupuesto V2'))",'history');await browser.field('Buscar presupuesto V2',f.id);await browser.until("[...document.querySelectorAll('section')].find(s=>s.querySelector(':scope > h2')?.textContent==='Historial V2')?.querySelectorAll('article').length===1",'exact');await browser.clickText('Abrir versión 1',"[...document.querySelectorAll('section')].find(s=>s.querySelector(':scope > h2')?.textContent==='Historial V2')");await browser.until("!!document.querySelector('[data-testid=acceptance-registered]')",'accepted');await openOperationSection(browser,f.id,'Cuotas y pagos');await browser.until(`${scope}?.textContent.includes('Revisión 1')`,'financial activated');
  const amount=f.snapshot.paymentSchedule.installments[0].amount/2;await browser.change('[data-testid=financial-v2] [aria-label="Importe acreditado"]',String(amount));await browser.change('[data-testid=financial-v2] [aria-label="Fecha efectiva"]',new Date().toISOString().slice(0,10));await browser.change('[data-testid=financial-v2] [aria-label="Referencia de acreditación"]','BROWSER-SYNTHETIC-001');await browser.clickText('Acreditar pago demo',scope);await browser.until(`${scope}?.textContent.includes('Revisión 2')`,'payment committed');await browser.until(`document.querySelectorAll('[data-testid=financial-receipt]').length===1`,'receipt');await capture('admin-payment-desktop');
  const view=await readFinancial(db,f.id,1,f.root,'ADMIN');assert(view.active);assert.equal(view.installments[0].status,'PARCIAL');assert.equal(view.receipts.length,1);
  await browser.evaluate('window.__FIREBASE_SIGN_OUT__().then(()=>true)');await login(`${f.uid}@example.test`,'Emulator-only-123');await browser.navigate('/afiliado');await browser.until(`${scope}?.textContent.includes('Revisión 2')`,'affiliate finance');const affiliateHtml=await browser.evaluate<string>(`${scope}.textContent`);for(const forbidden of ['SECRET_PROVIDER','Costo','BROWSER-SYNTHETIC-001','Acreditar pago demo'])assert(!affiliateHtml.includes(forbidden));await capture('affiliate-financial-desktop');
  await browser.evaluate('window.__FIREBASE_SIGN_OUT__().then(()=>true)');await login(`${f.clientUid}@example.test`,'Emulator-only-123');await browser.navigate('/cliente');await browser.until(`${scope}?.textContent.includes('Revisión 2')`,'client finance');await browser.command('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});await capture('client-financial-mobile');const clientHtml=await browser.evaluate<string>(`${scope}.textContent`);for(const forbidden of ['SECRET_PROVIDER','BROWSER-SYNTHETIC-001','Acreditar pago demo','capitalCents'])assert(!clientHtml.includes(forbidden));
  await browser.navigate('/cliente');await browser.until(`${scope}?.textContent.includes('PARCIAL')`,'persist reload');
  // Hold an older successful response, then reconnect after an administrative reversal.
  // Only the newer server revision may remain visible, even if responses arrive out of order.
  await browser.evaluate(`(()=>{const original=window.fetch.bind(window);let held=false;window.__releaseFinancialRead=null;window.fetch=async(...args)=>{const response=await original(...args);if(!held&&String(args[0]).endsWith('/financial')){held=true;return new Promise(resolve=>{window.__releaseFinancialRead=()=>resolve(response);});}return response;};window.__restoreFinancialFetch=()=>{window.fetch=original;};window.dispatchEvent(new Event('focus'));return true;})()`);
  await browser.until("typeof window.__releaseFinancialRead==='function'",'older response completed');
  await browser.command('Network.emulateNetworkConditions',{offline:true,latency:0,downloadThroughput:0,uploadThroughput:0});
  await browser.evaluate("(window.dispatchEvent(new Event('focus')),true)");
  await browser.until(`${scope}?.textContent.includes('No se pudo verificar el acceso financiero')`,'offline read fails closed');
  const beforeReverse=(await financialRef(db,f.id,1).get()).data()!;
  await financialCommand(db,f.id,1,{action:'REVERSE_PAYMENT',operationId:f.identity.operationId,expectedRevision:beforeReverse.revision,commandId:randomUUID(),data:{paymentId:view.history![0].id,reason:'Reversa sintética para verificar reconexión'}},f.root);
  await browser.command('Network.emulateNetworkConditions',{offline:false,latency:0,downloadThroughput:-1,uploadThroughput:-1});
  await browser.evaluate("(window.dispatchEvent(new Event('online')),true)");
  await browser.until(`${scope}?.textContent.includes('Revisión 3')`,'reconnect refresh without reload');
  await browser.evaluate("(window.__releaseFinancialRead(),window.__restoreFinancialFetch(),true)");
  await new Promise(resolve=>setTimeout(resolve,300));
  assert(await browser.evaluate(`${scope}?.textContent.includes('Revisión 3')`),'stale response must not restore revision 2');
  await capture('client-financial-reconnected-mobile');
  const adminSummary=await readFinancial(db,f.id,1,f.root,'ADMIN');
  const affiliateSummary=await readFinancial(db,f.id,1,{uid:f.uid,admin:false},'AFFILIATE');
  const clientSummary=await readFinancial(db,f.id,1,{uid:f.clientUid,admin:false},'CLIENT');
  for(const summary of [adminSummary,affiliateSummary,clientSummary]){
   assert(summary.active);assert.equal(summary.paidInstallmentCount,0);assert.equal(summary.pendingInstallmentCount,summary.installments.length);
   assert.equal(summary.nextDueAmountCents,summary.installments[0].amountCents);assert.equal(summary.balanceCents,summary.totalCents);
  }
  const forbidden=await browser.evaluate<number>(`window.__FIREBASE_AUTH__.currentUser.getIdToken().then(token=>fetch('/api/admin/presupuestos-v2/${f.id}/versions/1/financial',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:'{}'})).then(r=>r.status)`);assert.equal(forbidden,403);
  await browser.evaluate('window.__FIREBASE_SIGN_OUT__().then(()=>true)');await login(`${f.uid2}@example.test`,'Emulator-only-123');const cross=await browser.evaluate<number>(`window.__FIREBASE_AUTH__.currentUser.getIdToken().then(token=>fetch('/api/afiliado/operaciones-v2/${f.id}/1/financial',{headers:{Authorization:'Bearer '+token}})).then(r=>r.status)`);assert.equal(cross,403);
  // Exercise the real pagination control without weakening any role/payment assertions above.
  for(let i=0;i<50;i++){const state=(await financialRef(db,f.id,1).get()).data()!;await financialCommand(db,f.id,1,{action:'CREDIT_PAYMENT',operationId:f.identity.operationId,expectedRevision:state.revision,commandId:randomUUID(),data:{paymentId:randomUUID(),amountCents:1,effectiveDate:new Date().toISOString().slice(0,10),method:'TRANSFERENCIA',reference:'BROWSER-SYNTHETIC-PAGINATION'}},f.root);}
  await browser.evaluate('window.__FIREBASE_SIGN_OUT__().then(()=>true)');await login(adminEmail,adminPassword);await browser.navigate('/admin/operaciones/'+f.id+'/1');await browser.until("!!document.querySelector('[data-testid=operation-unified-workspace]')",'unified after login');await browser.clickText('Cuotas y pagos');await browser.until("document.querySelectorAll('[data-testid=financial-receipt]').length===50",'bounded first page');await browser.clickText('Ver más pagos y recibos',scope);await browser.until("document.querySelectorAll('[data-testid=financial-receipt]').length===51",'second page merged');assert.equal(await browser.evaluate("[...document.querySelectorAll('button')].some(b=>b.textContent==='Ver más pagos y recibos')"),false);await capture('admin-financial-pagination-mobile');
  // A successful response obtained before revocation must never restore private data.
  await browser.evaluate('window.__FIREBASE_SIGN_OUT__().then(()=>true)');await login(`${f.clientUid}@example.test`,'Emulator-only-123');await browser.navigate('/cliente');
  await browser.until(`${scope}?.textContent.includes('Saldo pendiente')`,'client before revocation');
  await browser.evaluate(`(()=>{const original=window.fetch.bind(window);let held=false;window.__releaseFinancialRead=null;window.fetch=async(...args)=>{const response=await original(...args);if(!held&&String(args[0]).endsWith('/financial')){held=true;return new Promise(resolve=>{window.__releaseFinancialRead=()=>resolve(response);});}return response;};window.__restoreFinancialFetch=()=>{window.fetch=original;};document.dispatchEvent(new Event('visibilitychange'));return true;})()`);
  await browser.until("typeof window.__releaseFinancialRead==='function'",'tab visibility refresh held');
  const binding=(await readClientBinding(db,f.id,1)).state;
  await clientBindingCommand(db,f.id,1,{commandId:randomUUID(),operationId:f.identity.operationId,expectedRevision:binding.revision,action:'REVOKE_ACCESS',data:{reason:'Revocación sintética para regresión PR74/77'}},f.root.uid);
  await browser.evaluate("(window.dispatchEvent(new Event('online')),true)");
  await browser.until(`${scope}?.textContent.includes('No se pudo verificar el acceso financiero')`,'revoked reconnection clears data');
  await browser.evaluate("(window.__releaseFinancialRead(),window.__restoreFinancialFetch(),true)");
  await new Promise(resolve=>setTimeout(resolve,300));
  assert.equal(await browser.evaluate(`${scope}?.textContent.includes('Saldo pendiente')`),false,'cached successful response cannot restore revoked data');
  assert.equal(await browser.evaluate("document.querySelectorAll('[data-testid=financial-receipt]').length"),0);
  const revokedHttp=await browser.evaluate<number>(`window.__FIREBASE_AUTH__.currentUser.getIdToken().then(token=>fetch('/api/cliente/servicios-v2/${f.id}/1/financial',{headers:{Authorization:'Bearer '+token}})).then(r=>r.status)`);assert.equal(revokedHttp,403);
  await capture('client-revoked-mobile');
  await browser.navigate('/cliente');await browser.until("document.body.textContent.includes('No hay servicios V2 activados para esta cuenta.')",'revoked service absent after reload');
  assert.equal(await browser.evaluate("document.querySelectorAll('[data-testid=financial-receipt]').length"),0);
  console.log('CLIENT_REVOCATION_DIRECT_HTTP_403_RECONNECT_STALE_RESPONSE_RELOAD=PASS; TAB_VISIBILITY_REFRESH=PASS');
  assert.deepEqual({b:(await f.r.budget.get()).data(),a:(await f.r.acceptance.get()).data(),draft:(await f.r.draft.get()).data()},original);assert.deepEqual(browser.externalFirebase,[]);
  console.log('FINANCIAL_BROWSER_DESKTOP_MOBILE=PASS; PAGINATION_51_RECEIPTS=PASS; ADMIN_PAYMENT_RECEIPT=PASS; AFFILIATE_CLIENT_READ_ONLY=PASS; CROSS_UID=DENIED; RELOAD=PASS; RECONNECT_REVERSAL=PASS; OUT_OF_ORDER_READ=PASS; THREE_ROLE_SUMMARY=PASS; OVERFLOW=0; PRODUCTION_REQUESTS=0');
 }finally{await browser.close();}
}
