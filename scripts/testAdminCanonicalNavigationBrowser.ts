import './helpers/requireSafeEmulatorEnvironment';
import assert from 'node:assert/strict';
import { mkdirSync,writeFileSync } from 'node:fs';
import { admin } from '../src/lib/firebaseAdmin';
import { infrastructureFixture } from './helpers/contractInfrastructureFixtures';
import { setupAdminSolicitudesFixtures,databaseSnapshot,adminEmail,adminPassword,duplicateId } from './helpers/adminSolicitudesFixtures';
import { CatalogBrowser } from './helpers/catalogBrowser';
export async function testAdminCanonicalNavigationBrowser(){
 await setupAdminSolicitudesFixtures();const db=admin.firestore();
 const {budget,acceptance}=infrastructureFixture('canonical-operation').source;
 budget.sourceCollection='solicitudes';budget.solicitudId=duplicateId;acceptance.sourceCollection=budget.sourceCollection;acceptance.solicitudId=budget.solicitudId;
 const family=db.collection('presupuestos_v2').doc(budget.id);await family.set({sourceCollection:budget.sourceCollection,solicitudId:budget.solicitudId,lastVersion:1});await family.collection('versions').doc('1').set(budget);await family.collection('acceptances').doc('1').set(acceptance);
 await db.doc(`solicitudes/${duplicateId}`).update({planPagos:[{numero:1,vencimiento:'2026-01-15',montoOriginal:12345,estado:'PENDIENTE'}]});
 await db.doc('remitos/canonical-history').set({clienteNombre:'Cliente histórico sintético',productoDescripcion:'Producto histórico',nroRemito:'DEMO-1',fechaEmision:'2026-01-01'});
 await db.doc('alertas_admin/canonical-alert').set({tipo:'APERTURA_CUENTA',sourceCollection:'solicitudes',solicitudId:duplicateId,leida:false,mensaje:'Revisar solicitud sintética'});
 for(const email of ['client-canonical@example.test','affiliate-canonical@example.test'])await admin.auth().createUser({email,password:adminPassword,emailVerified:true});
 const before=await databaseSnapshot(),dir='/tmp/cuenta-hogar-admin-canonical';mkdirSync(dir,{recursive:true});
 let browser:CatalogBrowser|null=null;
 try{
  for(const [width,height] of [[1280,800],[390,844]]){
   if(browser){assert.deepEqual(browser.externalFirebase,[]);await browser.close();}browser=await CatalogBrowser.open();
   await browser.command('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width===390});
   await browser.navigate('/login');await browser.until("typeof window.__FIREBASE_SIGN_IN__==='function'",'auth');await browser.evaluate(`window.__FIREBASE_SIGN_IN__(${JSON.stringify(adminEmail)},${JSON.stringify(adminPassword)}).then(()=>true)`);
   await browser.navigate('/admin');await browser.until("!!document.querySelector('[data-testid=admin-module-cards]')",'today');
   assert.equal(await browser.evaluate("document.querySelectorAll('aside,nav[aria-label=\"Navegación móvil de administración\"]').length"),0,'Original layout has no lateral or bottom navigation');
   assert.equal(await browser.evaluate("document.querySelectorAll('[data-testid=admin-module-cards] article').length"),10,'All current modules have visible original-style cards');
   const expected=['/admin/solicitudes','/admin/presupuestos','/admin/documentacion','/admin/cobranzas','/admin/logistica'];
   for(const path of [...expected,'/admin/clientes','/admin/rendiciones','/admin/comisiones','/admin/productos','/admin/reportes']) {
    assert.ok(await browser.evaluate(`!!document.querySelector('[data-testid=admin-module-cards] a[href="${path}"]')`),'Home card '+path);
    assert.ok(await browser.evaluate(`!!document.querySelector('nav[aria-label="Secciones de administración"] a[href="${path}"]')`),'Horizontal access '+path);
   }
   assert.equal(await browser.evaluate("document.querySelector('nav[aria-label=\"Secciones de administración\"] a[aria-current=page]').textContent"),'Inicio');
   await browser.evaluate("document.querySelector('nav[aria-label=\"Secciones de administración\"] a[href=\"/admin/reportes\"]').scrollIntoView({block:'nearest',inline:'nearest'})");
   await browser.overflow('horizontal navigation is contained');
   assert.deepEqual(await browser.evaluate("[...document.querySelectorAll('nav[aria-label=\"Secciones de administración\"] a')].slice(0,4).map(a=>a.textContent)"),['Inicio','Solicitudes','Catálogo','Cobranzas'],'Original module order');
   assert.equal(await browser.evaluate("document.querySelectorAll('a[href*=\"/admin/validaciones\"],a[href*=\"/admin/cartera\"],a[href*=\"/admin/remitos\"]').length"),0);
   await browser.until(`!!document.querySelector('a[href="/admin/solicitudes/solicitudes/${duplicateId}"]')`,'exact alert');await browser.overflow('today');
   await browser.evaluate("document.querySelector('nav[aria-label=\"Secciones de administración\"] > div').scrollLeft=0");
   await browser.evaluate('window.scrollTo(0,0)');
   const shot=await browser.command('Page.captureScreenshot',{format:'png'});writeFileSync(`${dir}/today-${width}.png`,Buffer.from(shot.data as string,'base64'));
   await browser.evaluate("document.querySelector('[data-testid=admin-module-cards]').scrollIntoView({block:'start'})");
   const cardsShot=await browser.command('Page.captureScreenshot',{format:'png'});writeFileSync(`${dir}/cards-${width}.png`,Buffer.from(cardsShot.data as string,'base64'));
   await browser.evaluate("document.querySelector('[data-testid=admin-module-cards] a[href=\"/admin/solicitudes\"]').click()");
   await browser.until("!!document.querySelector('[data-testid=solicitudes-inbox]')",'Home card opens current inbox');
   await browser.until(`!!document.querySelector('li[data-record-key]')`,'inbox data');
   assert.equal(await browser.evaluate("document.querySelector('nav[aria-label=\"Secciones de administración\"] a[aria-current=page]').getAttribute('href')"),'/admin/solicitudes');
   await browser.until("(()=>{const link=document.querySelector('nav[aria-label=\"Secciones de administración\"] a[aria-current=page]'), parent=link.parentElement,a=link.getBoundingClientRect(),b=parent.getBoundingClientRect();return a.left>=b.left-1&&a.right<=b.right+1})()",'Selected module remains visible after navigation');
   await browser.overflow('inbox cards');await browser.evaluate('window.scrollTo(0,0)');
   const inboxShot=await browser.command('Page.captureScreenshot',{format:'png'});writeFileSync(`${dir}/requests-${width}.png`,Buffer.from(inboxShot.data as string,'base64'));
   await browser.evaluate(`document.querySelector('a[href^="/admin/solicitudes/solicitudes/${duplicateId}?"]').click()`);
   await browser.until("!!document.querySelector('[data-testid=solicitud-detail]')",'request detail');
   await browser.until("[...document.querySelectorAll('a')].some(a=>a.textContent==='Abrir ficha de operación')",'linked operation available');
   await browser.evaluate("[...document.querySelectorAll('a')].find(a=>a.textContent==='Abrir ficha de operación').click()");
   await browser.until("!!document.querySelector('[data-testid=operation-unified-workspace]')",'request to current operation');
   await browser.until("[...document.querySelectorAll('a')].some(a=>a.textContent==='Volver a solicitud')",'origin link');
   await browser.evaluate("[...document.querySelectorAll('a')].find(a=>a.textContent==='Volver a solicitud').click()");
   await browser.until(`location.pathname==='/admin/solicitudes/solicitudes/${duplicateId}'`,'back to same request');
   await browser.until("!!document.querySelector('[data-testid=solicitud-detail]')",'returned detail');
   for(const [route,destination] of [['cartera','cobranzas'],['remitos','logistica']]){
    await browser.navigate(`/admin/${route}`);await browser.until(`location.pathname==='/admin/${destination}'`,'redirect');await browser.until("document.querySelector('[data-testid=canonical-operations]')?.innerText.includes('Cliente demo')",'operation index');
    await browser.evaluate("document.querySelector('[data-testid=historical-read-only]').open=true");
    await browser.until(`document.querySelector('[data-testid=historical-read-only]').innerText.includes('${route==='cartera'?'12345':'DEMO-1'}')`,'historical preserved');
    assert.equal(await browser.evaluate("document.querySelector('[data-testid=historical-read-only]').querySelectorAll('button,input,form').length"),0);await browser.overflow(route);
    const image=await browser.command('Page.captureScreenshot',{format:'png'});writeFileSync(`${dir}/${destination}-${width}.png`,Buffer.from(image.data as string,'base64'));
    const href=await browser.evaluate<string>("document.querySelector('[data-testid=canonical-operations] a[href*=\"/admin/operaciones/\"]').getAttribute('href')");assert.ok(href.endsWith(`section=${route==='cartera'?'payments':'logistics'}`));
    await browser.navigate(href);await browser.until("!!document.querySelector('[data-testid=operation-unified-workspace]')",'real workspace');
    if(route==='cartera'){
     await browser.until("!!document.querySelector('nav[aria-label=\"Consultas y seguimiento\"] button[aria-current=page]')",'active payments');
     assert.equal(await browser.evaluate("document.querySelector('nav[aria-label=\"Consultas y seguimiento\"] button[aria-current=page]').textContent"),'Cuotas y pagos');
    }else{
     await browser.until("document.querySelector('[data-testid=operation-step-logistics]')?.getAttribute('aria-current')==='step'",'active logistics');
     assert.ok(await browser.evaluate("document.querySelector('[data-testid=operation-step-logistics]').textContent.includes('Logística')"));
    }
    await browser.overflow('workspace '+route);
    assert.equal(await browser.evaluate("document.querySelector('a[href*=\"/admin/solicitudes/solicitudes/\"]').getAttribute('href')"),`/admin/solicitudes/solicitudes/${duplicateId}`,'Origin preserved');
    if(route==='remitos') {await browser.evaluate('window.scrollTo(0,0)');const opShot=await browser.command('Page.captureScreenshot',{format:'png'});writeFileSync(`${dir}/operation-${width}.png`,Buffer.from(opShot.data as string,'base64'));}
   }
   await browser.navigate(`/admin/validaciones?sourceCollection=solicitudes&solicitudId=${duplicateId}`);await browser.until(`location.pathname==='/admin/solicitudes/solicitudes/${duplicateId}'`,'saved link identity');await browser.until("!!document.querySelector('[data-testid=solicitud-detail]')",'detail');
   assert.equal(await browser.evaluate("document.querySelectorAll('a[href*=\"/admin/validaciones\"]').length"),0);
   await browser.navigate('/admin/documentacion');await browser.until("!!document.querySelector('[data-testid=canonical-operations]')",'documents canonical');await browser.overflow('documents');
  }
  for(const email of ['client-canonical@example.test','affiliate-canonical@example.test']){
   await browser!.navigate('/login');await browser!.until("typeof window.__FIREBASE_SIGN_IN__==='function'",'role auth');await browser!.evaluate(`window.__FIREBASE_SIGN_IN__(${JSON.stringify(email)},${JSON.stringify(adminPassword)}).then(()=>true)`);
   await browser!.navigate('/admin/cobranzas');await browser!.until("location.pathname==='/login'",'role denied');assert.equal(await browser!.evaluate("!!document.querySelector('[data-testid=canonical-operations]')"),false);
  }
  assert.deepEqual(await databaseSnapshot(),before);assert.deepEqual(browser!.externalFirebase,[]);
  writeFileSync(`${dir}/results.json`,JSON.stringify({result:'PASS',project:'demo-cuenta-hogar',widths:[1280,390],cases:['original header and horizontal navigation','ten current module cards','home to requests','current operation and origin','legacy redirects','history read only','client and affiliate denied admin','no navigation writes','no external Firebase']},null,2));
  console.log('ADMIN_ORIGINAL_INTERFACE_CANONICAL_BROWSER_DESKTOP_MOBILE_ALERTS_HISTORY_SECTIONS_ROLES_NO_WRITES = PASS');
 }finally{await browser?.close();}
}
