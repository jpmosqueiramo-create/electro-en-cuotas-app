import './helpers/requireSafeEmulatorEnvironment';
import assert from 'node:assert/strict';
import { mkdirSync,writeFileSync } from 'node:fs';
import { admin } from '../src/lib/firebaseAdmin';
import { pendingBulletPreviewFixture } from './helpers/operationPreviewFixtures';
import { contractRefs } from '../src/lib/contractV2Server';
import { CatalogBrowser } from './helpers/catalogBrowser';
import { adminEmail,adminPassword } from './helpers/adminSolicitudesFixtures';
import { createDocumentationCase } from '../src/lib/budgetAcceptanceV2';
export async function testOperationDraftDocumentsBrowser(){
 const email=adminEmail,password=adminPassword;
 try{await admin.auth().getUserByEmail(email);}catch{await admin.auth().createUser({email,password,emailVerified:true});}
 const id='document-browser-'+Date.now(),{budget:b,acceptance:a,draft:d}=pendingBulletPreviewFixture(id);
 d.personalData.fullName=b.clienteSnapshot.nombre;d.personalData.dni=b.clienteSnapshot.dni||'12345678';d.employmentData.cuil='20-12345678-6';
 const db=admin.firestore(),r=contractRefs(db,id,1);await r.family.create({lastVersion:1,sourceCollection:b.sourceCollection,solicitudId:b.solicitudId});await r.budget.create(b);await r.acceptance.create(a);await r.draft.create(d);await r.family.collection('documentation').doc('1').create(createDocumentationCase(a));
 const infrastructureBefore={numbering:(await db.collection('contractNumberingV2').get()).size,snapshots:(await db.collection('contractSnapshotsV2').get()).size};
 const before=await Promise.all([r.budget.get(),r.acceptance.get(),r.draft.get()]);
 const browser=await CatalogBrowser.open(),dir='/tmp/cuenta-hogar-operation-documents';mkdirSync(dir,{recursive:true});const root="document.querySelector('[data-testid=operation-document-previews]')";
 try{
  await browser.command('Page.addScriptToEvaluateOnNewDocument',{source:`const original=window.fetch;window.fetch=async(...args)=>{const r=await original(...args);if(String(args[0]).endsWith('/contract/documents/preview')&&r.ok)r.clone().json().then(v=>{window.__DOCUMENT_PREVIEW__=v.projection});return r;};`});
  await browser.navigate('/login');await browser.until("typeof window.__FIREBASE_SIGN_IN__==='function'",'auth');await browser.evaluate(`window.__FIREBASE_SIGN_IN__(${JSON.stringify(email)},${JSON.stringify(password)}).then(()=>true)`);
  await browser.navigate(`/admin/operaciones/${id}/1`);await browser.until("!!document.querySelector('[data-testid=operation-unified-workspace]')",'operation');await browser.clickText('Contrato');await browser.until("!!document.querySelector('[data-testid=contract-composer]')",'composer');await browser.evaluate("[...document.querySelectorAll('details')].find(d=>d.querySelector('summary')?.textContent==='Documentación contractual').open=true");
  await browser.until(`${root}?.innerText.includes('Ambos documentos usan los mismos datos persistidos.')`,'persisted preview');
  assert.ok(await browser.evaluate(`${root}.innerText.includes('Los datos faltantes se muestran como pendientes')`));
  // Unsaved edits must never appear in the server-generated documents.
  await browser.evaluate("document.querySelector('[data-testid=contract-personal]').open=true");await browser.field('Dirección','NO GUARDADO — sólo pantalla');
  await browser.clickText('Actualizar vistas previas guardadas',root);await browser.until(`${root}?.innerText.includes('Ambos documentos usan los mismos datos persistidos.')`,'refreshed persisted preview');
  await browser.until("!!window.__DOCUMENT_PREVIEW__",'recorded projection');assert.equal(await browser.evaluate('window.__DOCUMENT_PREVIEW__.customer.address'),d.personalData.address);
  for(const [width,height] of [[1280,900],[390,844]]){
   await browser.command('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width===390});
   const fontStatus=await browser.evaluate<boolean>(`Promise.all(['--font-manrope','--font-source-sans'].map(name=>document.fonts.load('600 16px '+getComputedStyle(document.documentElement).getPropertyValue(name)))).then(groups=>groups.every(fonts=>fonts.length>0&&fonts.every(font=>font.status==='loaded')))`);assert.equal(fontStatus,true,'Both institutional fonts loaded locally');
   assert.deepEqual(await browser.evaluate(`performance.getEntriesByType('resource').filter(entry=>/fonts[.](googleapis|gstatic)[.]com/.test(entry.name)).map(entry=>entry.name)`),[]);
   await browser.evaluate(`${root}.scrollIntoView({block:'start'})`);await browser.overflow('operation documents');
   const shot=await browser.command('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});writeFileSync(`${dir}/workspace-${width}.png`,Buffer.from(shot.data as string,'base64'));
   for(const label of ['Contrato de mandato','Pagaré']){
    await browser.clickText(label+' — Ver vista previa',root);await browser.until(`document.querySelector('[data-testid=operation-document-open] h4')?.textContent.startsWith(${JSON.stringify(label)})`,'selected PDF preview');
    assert.ok((await browser.evaluate<string>(`${root}.querySelector('iframe').src`)).startsWith('blob:'));
    if(width===390)assert.equal(await browser.evaluate(`${root}.querySelector('iframe').getClientRects().length`),0);
    assert.equal(await browser.evaluate(`fetch(${root}.querySelector('[data-testid=operation-document-open] a').href).then(r=>r.arrayBuffer()).then(b=>new TextDecoder().decode(b.slice(0,5)))`),'%PDF-');
    await browser.evaluate("document.querySelector('[data-testid=operation-document-open]').scrollIntoView({block:'start'})");await browser.overflow('PDF preview');
    const image=await browser.command('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});writeFileSync(`${dir}/${label==='Pagaré'?'note':'mandate'}-${width}.png`,Buffer.from(image.data as string,'base64'));
   }
  }
  assert.deepEqual((await Promise.all([r.budget.get(),r.acceptance.get(),r.draft.get()])).map(s=>s.updateTime),before.map(s=>s.updateTime));
  const saved={...d,revision:d.revision+1,updatedAt:'2026-10-22T12:00:00.000Z',personalData:{...d.personalData,address:'Cambio guardado sintético'}};await r.draft.set(saved);
  await browser.clickText('Recargar borrador y datos recibidos');await browser.until(`${root}?.innerText.includes('Versión guardada del borrador: 2')`,'revision refreshed');assert.equal(await browser.evaluate(`${root}.querySelectorAll('iframe').length`),0);await browser.until("window.__DOCUMENT_PREVIEW__?.draftRevision===2",'new persisted projection');assert.equal(await browser.evaluate('window.__DOCUMENT_PREVIEW__.customer.address'),saved.personalData.address);
  await r.draft.update({'personalData.fullName':'Identidad incompatible sintética',revision:3});await browser.clickText('Recargar borrador y datos recibidos');await browser.until(`${root}?.innerText.includes('Discrepancia de identidad')`,'identity warning');assert.equal(await browser.evaluate(`${root}.querySelector('button').disabled`),true);
  await r.draft.update({personalData:{...d.personalData,address:'Domicilio sintético 🧪'},revision:4});await browser.clickText('Recargar borrador y datos recibidos');
  await browser.until(`${root}?.innerText.includes('No se pudo generar el PDF')`,'typed render failure');
  assert.equal(await browser.evaluate(`${root}.querySelector('button').disabled`),true);assert.equal(await browser.evaluate(`${root}.querySelectorAll('iframe').length`),0);
  await r.draft.update({personalData:d.personalData,revision:5});await browser.clickText('Recargar borrador y datos recibidos');
  await browser.until(`${root}?.innerText.includes('Ambos documentos usan los mismos datos persistidos.')`,'recovered preview');
  await r.draft.collection('conformity').doc('current').create({confirmedDigest:null});await browser.clickText('Actualizar vistas previas guardadas',root);
  await browser.until(`${root}?.innerText.includes('Falta registrar la nueva conformidad')`,'conformity block');assert.equal(await browser.evaluate(`${root}.querySelector('button').disabled`),true);
  assert.equal((await db.collection('contractNumberingV2').get()).size,infrastructureBefore.numbering);assert.equal((await db.collection('contractSnapshotsV2').get()).size,infrastructureBefore.snapshots);assert.deepEqual(browser.externalFirebase,[]);assert.equal(browser.storageWrites,0);
  console.log('OPERATION_DOCUMENT_BROWSER=PASS; DESKTOP_MOBILE; TWO_PDFS; UNSAVED_FIELDS_NOT_PERSISTED; REFRESH_AFTER_SAVED_REVISION; IDENTITY_BLOCK; ZERO_PRODUCTION_REQUESTS; NO_DOCUMENT_WRITES');
 }finally{await browser.close();}
}
