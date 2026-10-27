import './helpers/requireSafeEmulatorEnvironment';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {writeFileSync} from 'node:fs';
import {admin} from '../src/lib/firebaseAdmin';
import {productionRuntimeForEmulator} from '../src/lib/productionV2/runtime';
import {createCreditCase,reviewCommand,png} from './testCreditReviewV2Emulator';
import {readCreditReview} from '../src/lib/creditReviewV2Server';
import {startProductionBrowserServer} from './helpers/productionAdapterBrowserServer';
import {CatalogBrowser} from './helpers/catalogBrowser';
async function main(){
 const db=admin.firestore(),email=process.env.NEXT_PUBLIC_ADMIN_EMAIL!,password='Emulator-only-123',actor=(await admin.auth().createUser({email,password,emailVerified:true})).uid;
 const runtime=productionRuntimeForEmulator(db,admin.auth(),[],[actor]),f=await createCreditCase('usability-'+randomUUID());await reviewCommand(f.id,'VERIFY_IDENTITY',{evidence:'Verificación sintética para prueba de UI'});
 const before={budget:(await f.r.budget.get()).data(),draft:(await f.r.draft.get()).data()},counter=(await db.collection('contractNumberingV2').get()).size;
 const file='/tmp/ch102-synthetic-document.png';writeFileSync(file,png);
 const server=await startProductionBrowserServer(runtime),browser=await CatalogBrowser.open();
 const card="document.querySelector('[data-document-type=DNI_FRONT]')";
 try{
  await browser.command('Emulation.setDeviceMetricsOverride',{width:1280,height:900,deviceScaleFactor:1,mobile:false});await browser.navigate('/login');await browser.until("typeof window.__FIREBASE_SIGN_IN__==='function'",'auth');await browser.evaluate(`window.__FIREBASE_SIGN_IN__(${JSON.stringify(email)},${JSON.stringify(password)}).then(()=>true)`);await browser.navigate(`/admin/operaciones/${f.id}/1`);
  await browser.until("document.querySelectorAll('[data-testid=credit-review] [data-document-type]').length===4",'four unified cards');
  assert.equal(await browser.evaluate("document.querySelectorAll('[data-testid=credit-review] [data-testid=document-review-controls]').length"),4);
  assert.equal(await browser.evaluate("document.querySelectorAll('[data-testid=credit-review] input[type=file]').length"),4);
  assert.equal(await browser.evaluate("document.querySelector('[data-testid=credit-advanced]').open"),false);assert.notEqual(await browser.evaluate("getComputedStyle(document.querySelector('[data-testid=operation-step-documents]')).backgroundColor"),await browser.evaluate("getComputedStyle(document.querySelector('[data-testid=operation-step-client]')).backgroundColor"));
  assert.equal(await browser.evaluate("document.querySelector('[aria-label=\"Secciones de administración\"]').scrollWidth<=document.querySelector('[aria-label=\"Secciones de administración\"]').clientWidth+2"),true);
  await browser.evaluate("document.querySelector('[data-testid=credit-review]').scrollIntoView({block:'start'})");await browser.screenshot('operation-documents-desktop.png');await browser.overflow('documents desktop');
  await browser.command('DOM.enable');const root=await browser.command('DOM.getDocument'),node=await browser.command('DOM.querySelector',{nodeId:(root.root as {nodeId:number}).nodeId,selector:'[data-document-type=DNI_FRONT] input[type=file]'});await browser.command('DOM.setFileInputFiles',{nodeId:node.nodeId,files:[file]});
  await browser.until(`${card}?.innerText.includes('ch102-synthetic-document.png')`,'uploaded in same card');await browser.until(`${card}?.innerText.includes('Archivo cargado')`,'accurate upload status');await browser.until("!document.querySelector('[data-testid=budget-acceptance]').innerText.includes('Guardando archivo…')",'upload and review refresh finished');
  // The review remains explicit; uploading never verifies or approves it.
  assert.notEqual((await readCreditReview(db,f.id,1)).documents.find(d=>d.type==='DNI_FRONT')!.status,'VERIFIED');
  await browser.evaluate(`${card}.querySelector('details').open=true`);await browser.change('[data-document-type=DNI_FRONT] input[type=date]','2099-12-31');await browser.change('[data-document-type=DNI_FRONT] textarea','Revisión sintética en Emulator');
  await browser.until(`${card}.querySelector('select').value!==''`,'only attachment preselected');await browser.clickText('Guardar revisión documental',card);await browser.until(`${card}.innerText.includes('Verificado y vigente')`,'review saved');assert.equal((await readCreditReview(db,f.id,1)).documents.find(d=>d.type==='DNI_FRONT')!.status,'VERIFIED');assert.equal((await readCreditReview(db,f.id,1)).documents.find(d=>d.type==='DNI_FRONT')!.fromThisOperation,true);
  await browser.evaluate(`${card}.querySelector('details').open=false`);
  const returning=await createCreditCase('returning-usability-'+randomUUID());await reviewCommand(returning.id,'LINK_PROFILE',{originBudgetId:f.id,originVersion:1,evidence:'Misma identidad sintética verificada expresamente'});
  await browser.navigate(`/admin/operaciones/${returning.id}/1`);await browser.until(`${card}?.innerText.includes('Consultar archivo de la carpeta')`,'reused document remains accessible');assert.equal((await readCreditReview(db,returning.id,1)).documents.find(d=>d.type==='DNI_FRONT')!.fromThisOperation,false);await browser.clickText('Consultar archivo de la carpeta',card);await browser.until(`!!${card}?.querySelector('button:not(:disabled)')`,'private download completed');assert(server.calls.some(c=>c.path.endsWith('/credit-document/DNI_FRONT')&&c.status===200));
  await browser.navigate(`/admin/operaciones/${f.id}/1`);await browser.until(`${card}?.innerText.includes('Verificado y vigente')`,'return to original dossier');
  for(const [width,height]of [[320,720],[390,844],[768,900]] as const){await browser.command('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width===390});await browser.evaluate("document.querySelector('[data-testid=credit-review]').scrollIntoView({block:'start'})");await browser.overflow('documents '+width);await browser.screenshot('operation-documents-'+width+'.png');}
  await browser.command('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
  await browser.evaluate("document.querySelector('[aria-label=\"Secciones de administración\"] details').open=true");assert.equal(await browser.evaluate("[...document.querySelectorAll('[aria-label=\"Secciones de administración\"] details a')].filter(e=>e.getClientRects().length>0).length"),11);assert.equal(await browser.evaluate("document.querySelectorAll('[aria-label=\"Secciones de administración\"] details a[href=\"/admin/rendiciones\"]').length"),0);await browser.overflow('mobile menu');await browser.evaluate("document.querySelector('[aria-label=\"Secciones de administración\"] details').open=false");
  const saved=JSON.stringify((await f.r.draft.get()).data());
  await browser.clickText('Continuar al paso 2: Datos del cliente');await browser.until("document.querySelector('[data-testid=operation-step-client]').getAttribute('aria-current')==='step'",'client step');await browser.overflow('client mobile');
  await browser.clickText('Continuar al paso 3: Contrato y pagaré');await browser.until("document.querySelector('[data-testid=operation-step-contract]').getAttribute('aria-current')==='step'",'contract step');
  await browser.clickText('Continuar al paso 4: Logística');await browser.until("document.querySelector('[data-testid=operation-step-logistics]').getAttribute('aria-current')==='step'",'logistics step');
  assert.equal(JSON.stringify((await f.r.draft.get()).data()),saved);assert.deepEqual((await f.r.budget.get()).data(),before.budget);assert.equal((await db.collection('contractNumberingV2').get()).size,counter);assert.equal((await db.collection('contractSnapshotsV2').get()).size,0);
  await browser.click('[data-testid=operation-step-documents]');await browser.until(`${card}?.innerText.includes('Verificado y vigente')`,'persisted review on return');
  await browser.evaluate('window.confirm=()=>true');await browser.clickText('Eliminar',card);await browser.until(`!${card}?.innerText.includes('ch102-synthetic-document.png')`,'removed attachment');await browser.until(`${card}?.innerText.includes('Sin archivo')`,'removed status');
  assert.deepEqual(browser.externalFirebase,[]);assert(!server.calls.some(c=>c.status>=500));
  console.log('OPERATION_DOCUMENT_USABILITY = PASS; SINGLE_CARDS=4; UPLOAD_EXPLICIT_REVIEW_DELETE=PASS; DESKTOP_TABLET_MOBILE=PASS; MENU_NO_OVERFLOW=PASS; FOUR_STEP_NAVIGATION_NO_WRITES=PASS; CH_SNAPSHOT_WRITES=0; EXTERNAL_FIREBASE=0');
 }finally{await browser.close();await server.stop();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
