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
   await browser.navigate('/admin');await browser.until("document.body.innerText.includes('Acciones operativas')",'today');
   const expected=['/admin/solicitudes','/admin/presupuestos','/admin/documentacion','/admin/cobranzas','/admin/logistica'];
   for(const path of expected)assert.ok(await browser.evaluate(`!!document.querySelector('a[href="${path}"]')`));
   assert.equal(await browser.evaluate("document.querySelectorAll('a[href*=\"/admin/validaciones\"],a[href*=\"/admin/cartera\"],a[href*=\"/admin/remitos\"]').length"),0);
   await browser.until(`!!document.querySelector('a[href="/admin/solicitudes/solicitudes/${duplicateId}"]')`,'exact alert');await browser.overflow('today');
   const shot=await browser.command('Page.captureScreenshot',{format:'png'});writeFileSync(`${dir}/today-${width}.png`,Buffer.from(shot.data as string,'base64'));
   for(const [route,destination] of [['cartera','cobranzas'],['remitos','logistica']]){
    await browser.navigate(`/admin/${route}`);await browser.until(`location.pathname==='/admin/${destination}'`,'redirect');await browser.until("document.querySelector('[data-testid=canonical-operations]')?.innerText.includes('Cliente demo')",'operation index');
    await browser.evaluate("document.querySelector('[data-testid=historical-read-only]').open=true");
    await browser.until(`document.querySelector('[data-testid=historical-read-only]').innerText.includes('${route==='cartera'?'12345':'DEMO-1'}')`,'historical preserved');
    assert.equal(await browser.evaluate("document.querySelector('[data-testid=historical-read-only]').querySelectorAll('button,input,form').length"),0);await browser.overflow(route);
    const image=await browser.command('Page.captureScreenshot',{format:'png'});writeFileSync(`${dir}/${destination}-${width}.png`,Buffer.from(image.data as string,'base64'));
    const href=await browser.evaluate<string>("document.querySelector('[data-testid=canonical-operations] a[href*=\"/admin/operaciones/\"]').getAttribute('href')");assert.ok(href.endsWith(`section=${route==='cartera'?'payments':'logistics'}`));
    await browser.navigate(href);await browser.until("!!document.querySelector('[data-testid=operation-unified-workspace]')",'real workspace');
    await browser.until(`!!document.querySelector('nav[aria-label="Secciones de la operación"] button[aria-current="page"]')`,'active section');
    assert.equal(await browser.evaluate("document.querySelector('nav[aria-label=\"Secciones de la operación\"] button[aria-current=page]').textContent"),route==='cartera'?'Cuotas y pagos':'Proveedor y logística');
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
  console.log('ADMIN_CANONICAL_BROWSER_DESKTOP_MOBILE_ALERTS_HISTORY_SECTIONS_ROLES_NO_WRITES = PASS');
 }finally{await browser?.close();}
}
