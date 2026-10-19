import './helpers/requireSafeEmulatorEnvironment';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import { admin } from '../src/lib/firebaseAdmin';
import { budgetFixture } from './helpers/budgetV2Fixtures';
import { CatalogBrowser } from './helpers/catalogBrowser';
import { adminEmail, adminPassword } from './helpers/adminSolicitudesFixtures';

export async function testBudgetAcceptanceV2Browser() {
  const db=admin.firestore();
  try { const u=await admin.auth().getUserByEmail(adminEmail); await admin.auth().updateUser(u.uid,{password:adminPassword,emailVerified:true}); }
  catch(e) { if((e as {code?:string}).code!=='auth/user-not-found')throw e; await admin.auth().createUser({email:adminEmail,password:adminPassword,emailVerified:true}); }
  mkdirSync('/tmp/cuenta-hogar-p4',{recursive:true});
  writeFileSync('/tmp/cuenta-hogar-p4/synthetic.pdf','%PDF-1.4\nsynthetic document fixture\n%%EOF');
  for(const view of [{width:1280,height:800,name:'desktop'},{width:390,height:844,name:'mobile'}]) {
    const id=`p4-browser-${view.name}-${Date.now()}`;
    const b={...budgetFixture(id),estado:'EMITIDO',issuedAt:new Date().toISOString()};
    b.options=b.options.map(o=>({...o,referenceSnapshot:{...o.referenceSnapshot,imagenUrls:['http://localhost:3000/logo-cuenta-hogar-oficial.png']}}));
    await db.doc('solicitudes/p3-shared-id').set({estado:'PENDIENTE',clienteEmail:'demo@example.test'});
    await db.doc(`presupuestos_v2/${id}`).set({sourceCollection:b.sourceCollection,solicitudId:b.solicitudId,lastVersion:1});
    await db.doc(`presupuestos_v2/${id}/versions/1`).set(b);
    const browser=await CatalogBrowser.open();
    const downloadDir=`/tmp/cuenta-hogar-p4/downloads-${id}`;mkdirSync(downloadDir,{recursive:true});
    async function capture(name:string,selector:string) {
      await browser.evaluate(`document.querySelector(${JSON.stringify(selector)}).scrollIntoView({block:'start'})`);
      await browser.evaluate('document.fonts.ready.then(()=>true)');
      const r=await browser.command('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
      writeFileSync(`/tmp/cuenta-hogar-p4/${name}`,Buffer.from(r.data as string,'base64'));
    }
    try {
      await browser.command('Emulation.setDeviceMetricsOverride',{width:view.width,height:view.height,deviceScaleFactor:1,mobile:view.width===390});
      await browser.command('Browser.setDownloadBehavior',{behavior:'allow',downloadPath:downloadDir,eventsEnabled:true});
      await browser.navigate('/login');await browser.until("typeof window.__FIREBASE_SIGN_IN__==='function'",'auth ready');
      await browser.evaluate(`window.__FIREBASE_SIGN_IN__(${JSON.stringify(adminEmail)},${JSON.stringify(adminPassword)}).then(()=>true)`);
      await browser.navigate('/admin/presupuestos');
      await browser.until(`!![...document.querySelectorAll('article')].find(x=>x.querySelector('h3')?.textContent.includes('Cliente demo')&&x.textContent.includes('EMITIDO'))`,'emitted history');
      // Select exact fixture through its history identity, not a loose latest match.
      await browser.field('Buscar presupuesto V2',id);
      await browser.until("[...document.querySelectorAll('section')].find(s=>s.querySelector('h2')?.textContent==='Historial V2')?.querySelectorAll('article').length===1",'exact fixture filtered');
      await browser.until("document.querySelectorAll('button').length>0",'history controls');
      await browser.clickText('Abrir versión 1',"[...document.querySelectorAll('section')].find(s=>s.querySelector('h2')?.textContent==='Historial V2')");
      await browser.until("[...document.querySelectorAll('[data-testid=budget-acceptance] button')].some(b=>b.textContent==='Registrar aceptación')",'acceptance loaded');
      await browser.clickText('Registrar aceptación');
      await browser.until("document.querySelectorAll('input[name=accepted-option]').length===2",'two options');
      await browser.overflow('acceptance options '+view.name);
      await capture(view.name==='desktop'?'01-acceptance-options-desktop.png':'06-acceptance-mobile.png','[data-testid=acceptance-panel]');
      await browser.click('input[name=accepted-option][value="option-1"]');
      await browser.clickText('Revisar aceptación');
      await browser.until("document.querySelector('[data-testid=acceptance-confirm]')?.textContent.includes('Sin preferencia definida')",'no preference confirmation');
      if(view.name==='desktop')await capture('02-acceptance-confirm-desktop.png','[data-testid=acceptance-confirm]');
      await browser.clickText('Registrar aceptación',"document.querySelector('[data-testid=acceptance-confirm]')");
      await browser.until("!!document.querySelector('[data-testid=documentation-panel]')",'documentation created');
      let a=(await db.doc(`presupuestos_v2/${id}/acceptances/1`).get()).data()!;
      assert.equal(a.acceptedOptionId,'option-1');assert.equal(a.preferredPlanCuotas,null);
      assert.equal(await browser.evaluate("document.querySelectorAll('[data-document-type]').length"),4);
      assert.equal(await browser.evaluate("[...document.querySelectorAll('[data-document-type]')].every(x=>x.textContent.includes('OPCIONAL')&&x.textContent.includes('SIN CARGAR'))"),true);
      await browser.overflow('documentation '+view.name);
      await capture(view.name==='desktop'?'03-documentation-desktop.png':'07-documentation-mobile.png','[data-testid=documentation-panel]');
      const dom=await browser.command('DOM.getDocument');const root=(dom.root as {nodeId:number}).nodeId;
      const node=await browser.command('DOM.querySelector',{nodeId:root,selector:'[data-document-type="DNI_FRONT"] input[type=file]'});
      await browser.command('DOM.setFileInputFiles',{nodeId:node.nodeId,files:['/tmp/cuenta-hogar-p4/synthetic.pdf']});
      await browser.until("document.querySelector('[data-document-type=DNI_FRONT] [data-slot-status]')?.textContent==='CARGADO'",'upload');
      if(view.name==='desktop')await capture('04-document-uploaded-desktop.png','[data-document-type=DNI_FRONT]');
      const scope="document.querySelector('[data-document-type=DNI_FRONT]')";
      await browser.clickText('Descargar',scope);
      await browser.until("[...document.querySelectorAll('[data-document-type=DNI_FRONT] button')].find(x=>x.textContent==='Descargar')?.disabled===false",'download finished');
      for(let i=0;i<100&&!existsSync(`${downloadDir}/synthetic.pdf`);i++)await browser.delay(100);
      assert.equal(readFileSync(`${downloadDir}/synthetic.pdf`,'utf8'),'%PDF-1.4\nsynthetic document fixture\n%%EOF');
      await browser.change('[data-document-type="DNI_FRONT"] textarea','Revisar legibilidad');
      await browser.clickText('Marcar observado',scope);
      await browser.until("document.querySelector('[data-document-type=DNI_FRONT] [data-slot-status]')?.textContent==='OBSERVADO'",'observed');
      if(view.name==='desktop')await capture('05-document-observed-desktop.png','[data-document-type=DNI_FRONT]');
      await browser.evaluate('window.confirm=()=>true');await browser.clickText('Eliminar',scope);
      await browser.until("document.querySelector('[data-document-type=DNI_FRONT] [data-slot-status]')?.textContent==='SIN CARGAR'",'deleted');
      const d=(await db.doc(`presupuestos_v2/${id}/documentation/1`).get()).data()!;
      assert.deepEqual(d.events.map((e:{type:string})=>e.type),['UPLOADED','OBSERVED','DELETED']);
      const deletes=await db.collection('presupuestos_v2').doc(id).collection('documentCommands').where('operation','==','DELETE').get();
      assert.equal(deletes.size,1);const deletion=deletes.docs[0].data();assert.equal(deletion.state,'COMMITTED');assert.ok(deletion.commandId);assert.equal(deletion.storagePath,`budget-documentation-v2/${id}/v1/DNI_FRONT/${deletion.attachmentId}`);
      const repeated=await browser.evaluate<{status:number;body:unknown}>(`(async()=>{const token=await window.__FIREBASE_AUTH__.currentUser.getIdToken();const r=await fetch(${JSON.stringify('/api/admin/presupuestos-v2/'+id+'/versions/1/documentation/DNI_FRONT/attachments/')}+${JSON.stringify(deletion.attachmentId)},{method:'DELETE',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:${JSON.stringify(JSON.stringify({commandId:deletion.commandId}))}});return {status:r.status,body:await r.json()};})()`);
      assert.equal(repeated.status,200);assert.deepEqual(repeated.body,{deletion:deletion.result});
      assert.deepEqual((await db.doc(`presupuestos_v2/${id}/documentation/1`).get()).data(),d);

      assert.deepEqual((await db.doc(`presupuestos_v2/${id}/versions/1`).get()).data(),b);
      // A distinct exact version records an optional preference, with frozen amount.
      const preferredId=`${id}-preferred`;const preferredBudget={...b,id:preferredId};
      await db.doc(`presupuestos_v2/${preferredId}`).set({sourceCollection:b.sourceCollection,solicitudId:b.solicitudId,lastVersion:1});
      await db.doc(`presupuestos_v2/${preferredId}/versions/1`).set(preferredBudget);
      await browser.navigate('/admin/presupuestos');await browser.until("!!document.querySelector('[data-new-budget-v2]')",'preferred history');
      await browser.field('Buscar presupuesto V2',preferredId);
      await browser.until("[...document.querySelectorAll('section')].find(s=>s.querySelector('h2')?.textContent==='Historial V2')?.querySelectorAll('article').length===1",'filtered preferred');
      await browser.clickText('Abrir versión 1',"[...document.querySelectorAll('section')].find(s=>s.querySelector('h2')?.textContent==='Historial V2')");
      await browser.until("[...document.querySelectorAll('[data-testid=budget-acceptance] button')].some(b=>b.textContent==='Registrar aceptación')",'preferred action');
      await browser.clickText('Registrar aceptación');await browser.click('input[name=accepted-option][value="option-1"]');
      await browser.evaluate("(()=>{const el=document.querySelector('[data-testid=preferred-plan]');Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set.call(el,'12');el.dispatchEvent(new Event('change',{bubbles:true}));})()");
      await browser.clickText('Revisar aceptación');await browser.clickText('Registrar aceptación',"document.querySelector('[data-testid=acceptance-confirm]')");
      await browser.until("!!document.querySelector('[data-testid=acceptance-registered]')",'preferred registered');
      a=(await db.doc(`presupuestos_v2/${preferredId}/acceptances/1`).get()).data()!;assert.equal(a.preferredPlanCuotas,12);
      assert.equal(a.preferredPlanAmountSnapshot,b.options[1].referenceSnapshot.planesOfrecidos.find(p=>p.cuotas===12)!.cuotaEstimada);
      assert.ok(await browser.evaluate("document.querySelector('[data-testid=acceptance-registered]').textContent.includes('Plan preferido: 12 cuotas')"));
      await browser.overflow('preferred '+view.name);assert.deepEqual(browser.externalFirebase,[]);assert.equal(browser.storageWrites,0);assert.equal(browser.publishBodies.length,0);
      console.log(`P4_BROWSER_${view.name.toUpperCase()} = PASS`);
    } finally { await browser.close(); }
  }
}
