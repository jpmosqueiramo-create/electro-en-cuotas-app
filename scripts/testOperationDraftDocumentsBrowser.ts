import './helpers/requireSafeEmulatorEnvironment';
import { clientPaymentPlaceReviewTemplates } from '../src/lib/productionV2/clientPaymentPlaceProposal';
import { contractValueHash } from '../src/lib/contractIntegrityV2';
import { syntheticPreviewConformity } from './helpers/previewConformityFixture';
import assert from 'node:assert/strict';
import { mkdirSync,writeFileSync } from 'node:fs';
import { admin } from '../src/lib/firebaseAdmin';
import { pendingBulletPreviewFixture } from './helpers/operationPreviewFixtures';
import { contractRefs, contractCommand } from '../src/lib/contractV2Server';
import { productionReadyFixture } from './helpers/productionAdapterFixtures';
import { randomUUID } from 'node:crypto';
import { contractPaymentAddress } from '../src/lib/contractPaymentAddress';
import { CatalogBrowser } from './helpers/catalogBrowser';
import { adminEmail,adminPassword } from './helpers/adminSolicitudesFixtures';
import { createDocumentationCase } from '../src/lib/budgetAcceptanceV2';
export async function testOperationDraftDocumentsBrowser(){
 const email=adminEmail,password=adminPassword;
 try{await admin.auth().getUserByEmail(email);}catch{await admin.auth().createUser({email,password,emailVerified:true});}
 const id='document-browser-'+Date.now(),{budget:b,acceptance:a,draft:d}=pendingBulletPreviewFixture(id);
 d.personalData.fullName=b.clienteSnapshot.nombre;d.personalData.dni=b.clienteSnapshot.dni||'12345678';d.employmentData.cuil='20-12345678-6';d.personalData.province='06';d.personalData.postalCode='6070';
 const db=admin.firestore(),r=contractRefs(db,id,1);await r.family.create({lastVersion:1,sourceCollection:b.sourceCollection,solicitudId:b.solicitudId});await r.budget.create(b);await r.acceptance.create(a);await r.draft.create(d);await r.draft.collection('conformity').doc('current').create(syntheticPreviewConformity(d));await r.family.collection('documentation').doc('1').create(createDocumentationCase(a));
 const infrastructureBefore={numbering:(await db.collection('contractNumberingV2').get()).size,snapshots:(await db.collection('contractSnapshotsV2').get()).size};
 const before=await Promise.all([r.budget.get(),r.acceptance.get(),r.draft.get()]);
 const browser=await CatalogBrowser.open(),dir='/tmp/cuenta-hogar-operation-documents';mkdirSync(dir,{recursive:true});const root="document.querySelector('[data-testid=operation-document-previews]')";
 try{
  await browser.command('Page.addScriptToEvaluateOnNewDocument',{source:`const original=window.fetch;window.fetch=async(...args)=>{const r=await original(...args);if(String(args[0]).endsWith('/contract/documents/preview'))r.clone().json().then(v=>{if(r.ok){window.__DOCUMENT_PREVIEW__=v.projection;window.__DOCUMENT_PAYLOAD__=v;}else window.__DOCUMENT_PREVIEW_ERROR__={status:r.status,code:v.code,error:v.error}});return r;};`});
  await browser.navigate('/login');await browser.until("typeof window.__FIREBASE_SIGN_IN__==='function'",'auth');await browser.evaluate(`window.__FIREBASE_SIGN_IN__(${JSON.stringify(email)},${JSON.stringify(password)}).then(()=>true)`);
  await browser.navigate(`/admin/operaciones/${id}/1`);await browser.until("!!document.querySelector('[data-testid=operation-unified-workspace]')",'operation');await browser.clickText('Contrato');await browser.until("!!document.querySelector('[data-testid=contract-composer]')",'composer');await browser.evaluate("[...document.querySelectorAll('details')].find(d=>d.querySelector('summary')?.textContent==='Documentación contractual').open=true");
  await browser.until(`${root}?.innerText.includes('Los tres documentos usan los mismos datos persistidos.')`,'persisted preview');
  assert.ok(await browser.evaluate(`${root}.innerText.includes('Los datos faltantes se muestran como pendientes')`));
  async function saveHttpPdfs(prefix:string,budgetId:string){
   const payload=await browser.evaluate<{available:boolean;projection:{budgetId:string};templateHash:string;mandate:{base64:string};promissoryNote:{base64:string};remito:{base64:string}}>('window.__DOCUMENT_PAYLOAD__');assert(payload.available);assert.equal(payload.projection.budgetId,budgetId);assert.equal(payload.templateHash,contractValueHash(clientPaymentPlaceReviewTemplates()));
   writeFileSync(`${dir}/${prefix}.json`,JSON.stringify(payload,null,2));
   for(const kind of ['mandate','promissoryNote','remito'] as const)writeFileSync(`${dir}/${prefix}-${kind}.pdf`,Buffer.from(payload[kind].base64,'base64'));
  }
  await saveHttpPdfs('pending-fields',id);
  // Unsaved edits must never appear in the server-generated documents.
  await browser.evaluate("document.querySelector('[data-testid=contract-personal]').open=true");await browser.field('Dirección','NO GUARDADO — sólo pantalla');
  await browser.clickText('Actualizar vistas previas guardadas',root);await browser.until(`${root}?.innerText.includes('Los tres documentos usan los mismos datos persistidos.')`,'refreshed persisted preview');
  await browser.until("!!window.__DOCUMENT_PREVIEW__",'recorded projection');assert.equal(await browser.evaluate('window.__DOCUMENT_PREVIEW__.customer.address'),d.personalData.address);
  for(const [width,height] of [[1280,900],[390,844]]){
   await browser.command('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width===390});
   const fontStatus=await browser.evaluate<boolean>(`Promise.all(['--font-manrope','--font-source-sans'].map(name=>document.fonts.load('600 16px '+getComputedStyle(document.documentElement).getPropertyValue(name)))).then(groups=>groups.every(fonts=>fonts.length>0&&fonts.every(font=>font.status==='loaded')))`);assert.equal(fontStatus,true,'Both institutional fonts loaded locally');
   assert.deepEqual(await browser.evaluate(`performance.getEntriesByType('resource').filter(entry=>/fonts[.](googleapis|gstatic)[.]com/.test(entry.name)).map(entry=>entry.name)`),[]);
   await browser.evaluate(`${root}.scrollIntoView({block:'start'})`);await browser.overflow('operation documents');
   const shot=await browser.command('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});writeFileSync(`${dir}/workspace-${width}.png`,Buffer.from(shot.data as string,'base64'));
   for(const label of ['Contrato de mandato','Pagaré','Remito']){
    await browser.clickText(label+' — Ver vista previa',root);await browser.until(`document.querySelector('[data-testid=operation-document-open] h4')?.textContent.startsWith(${JSON.stringify(label)})`,'selected PDF preview');
    assert.ok((await browser.evaluate<string>(`${root}.querySelector('iframe').src`)).startsWith('blob:'));
    if(width===390)assert.equal(await browser.evaluate(`${root}.querySelector('iframe').getClientRects().length`),0);
    assert.equal(await browser.evaluate(`fetch(${root}.querySelector('[data-testid=operation-document-open] a').href).then(r=>r.arrayBuffer()).then(b=>new TextDecoder().decode(b.slice(0,5)))`),'%PDF-');
    await browser.evaluate("document.querySelector('[data-testid=operation-document-open]').scrollIntoView({block:'start'})");await browser.overflow('PDF preview');
    const image=await browser.command('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});writeFileSync(`${dir}/${label==='Pagaré'?'note':label==='Remito'?'remito':'mandate'}-${width}.png`,Buffer.from(image.data as string,'base64'));
   }
  }
  assert.deepEqual((await Promise.all([r.budget.get(),r.acceptance.get(),r.draft.get()])).map(s=>s.updateTime),before.map(s=>s.updateTime));
  const saved={...d,revision:d.revision+1,updatedAt:'2026-10-22T12:00:00.000Z',personalData:{...d.personalData,address:'Cambio guardado sintético'}};await r.draft.set(saved);
  await browser.clickText('Recargar borrador y datos recibidos');await browser.until(`${root}?.innerText.includes('Versión guardada del borrador: 2')`,'revision refreshed');assert.equal(await browser.evaluate(`${root}.querySelectorAll('iframe').length`),0);await browser.until(`${root}?.innerText.includes('Falta registrar la nueva conformidad')`,'saved address invalidates preview');assert.equal(await browser.evaluate(`${root}.querySelector('button').disabled`),true);
  await r.draft.collection('conformity').doc('current').set(syntheticPreviewConformity(saved));await browser.clickText('Actualizar vistas previas guardadas',root);await browser.until(`${root}?.innerText.includes('Los tres documentos usan los mismos datos persistidos.')`,'explicit reconformity recovers saved preview');
  await browser.until("window.__DOCUMENT_PREVIEW__?.draftRevision===2",'new persisted projection');assert.equal(await browser.evaluate('window.__DOCUMENT_PREVIEW__.customer.address'),saved.personalData.address);
  await r.draft.update({'personalData.fullName':'Identidad incompatible sintética',revision:3});await browser.clickText('Recargar borrador y datos recibidos');await browser.until(`${root}?.innerText.includes('Discrepancia de identidad')`,'identity warning');assert.equal(await browser.evaluate(`${root}.querySelector('button').disabled`),true);
  await r.draft.update({personalData:{...d.personalData,address:'Domicilio sintético 🧪'},revision:4});await r.draft.collection('conformity').doc('current').set(syntheticPreviewConformity({...d,personalData:{...d.personalData,address:'Domicilio sintético 🧪'}}));await browser.clickText('Recargar borrador y datos recibidos');
  await browser.until(`${root}?.innerText.includes('No se pudo generar el PDF')`,'typed render failure');
  assert.equal(await browser.evaluate(`${root}.querySelector('button').disabled`),true);assert.equal(await browser.evaluate(`${root}.querySelectorAll('iframe').length`),0);
  await r.draft.update({personalData:d.personalData,revision:5});await r.draft.collection('conformity').doc('current').set(syntheticPreviewConformity(d));await browser.clickText('Recargar borrador y datos recibidos');
  await browser.until(`${root}?.innerText.includes('Los tres documentos usan los mismos datos persistidos.')`,'recovered preview');
  await r.draft.collection('conformity').doc('current').set({confirmedDigest:null});await browser.clickText('Actualizar vistas previas guardadas',root);
  await browser.until(`${root}?.innerText.includes('Falta registrar la nueva conformidad')`,'conformity block');assert.equal(await browser.evaluate(`${root}.querySelector('button').disabled`),true);
  // New controls use the existing command endpoint; no edits to the immutable accepted origin.
  const prep="document.querySelector('[data-testid=contract-document-preparation]')";
  assert.ok(await browser.evaluate(`${prep}.innerText.includes('Producto')&&${prep}.innerText.includes('Pendiente')`));
  await browser.clickText('Revisar producto',prep);assert.equal(await browser.evaluate("document.querySelector('[data-testid=contract-product]').open"),true);
  await browser.field('Cantidad del producto','2');
  await browser.evaluate("(()=>{const select=document.querySelector('[aria-label=\"Condición del producto\"]');select.value='NEW';select.dispatchEvent(new Event('change',{bubbles:true}));})()");
  await browser.clickText('Guardar datos del producto');await browser.until("document.querySelector('[data-testid=contract-composer]').innerText.includes('Revisión 6')",'saved product revision');
  await browser.until(`[...${prep}.querySelectorAll('li')].find(row=>row.querySelector('p')?.textContent==='Producto')?.innerText.includes('Completo')`,'complete product summary');
  assert.equal((await r.draft.get()).data()!.productDetails.quantity,2);assert.equal((await r.draft.get()).data()!.productDetails.condition,'NEW');
  assert.equal(await browser.evaluate(`${root}.querySelectorAll('iframe').length`),0);
  await browser.until(`${root}?.innerText.includes('Falta registrar la nueva conformidad')`,'product conformity block');
  for(const [width,height] of [[1280,900],[390,844]]){
   await browser.command('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width===390});
   await browser.evaluate(`${prep}.scrollIntoView({block:'start'})`);await browser.overflow('document preparation');
   const image=await browser.command('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});writeFileSync(`${dir}/preparation-${width}.png`,Buffer.from(image.data as string,'base64'));
   await browser.clickText('Revisar producto',prep);await browser.overflow('product fields');
   assert.equal(await browser.evaluate("document.querySelector('[data-testid=contract-product]').open"),true);
   await browser.evaluate("document.querySelector('[data-testid=contract-product]').scrollIntoView({block:'start'})");
   const product=await browser.command('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});writeFileSync(`${dir}/product-${width}.png`,Buffer.from(product.data as string,'base64'));
  }
  assert.deepEqual((await Promise.all([r.budget.get(),r.acceptance.get()])).map(s=>s.updateTime),before.slice(0,2).map(s=>s.updateTime));
  assert.equal((await db.collection('contractNumberingV2').get()).size,infrastructureBefore.numbering);assert.equal((await db.collection('contractSnapshotsV2').get()).size,infrastructureBefore.snapshots);assert.deepEqual(browser.externalFirebase,[]);assert.equal(browser.storageWrites,0);
  const actor=(await admin.auth().getUserByEmail(email)).uid, payment=await productionReadyFixture(actor,true);
  await contractCommand(db,payment.id,1,{action:'RETURN_TO_DRAFT',commandId:randomUUID(),expectedRevision:payment.ready.revision,reason:'Revisar domicilio sintético'},actor);
  const conformityRef=payment.r.draft.collection('conformity').doc('current'),proof=(await conformityRef.get()).data()!;
  const {confirmedPaymentAddressHash:oldAddress,...legacy}=proof;void oldAddress;await conformityRef.set(legacy);
  await browser.navigate(`/admin/operaciones/${payment.id}/1`);await browser.until("!!document.querySelector('[data-testid=operation-unified-workspace]')",'payment operation');await browser.clickText('Contrato');
  const review="document.querySelector('[data-testid=contract-review]')";
  await browser.until(`!!${review}`,'payment review section');await browser.evaluate(`${review}.open=true`);
  await browser.until(`${review}?.innerText.includes('Conformidad histórica conservada')`,'legacy address consent pending');
  await browser.evaluate(`${review}.open=true`);await browser.change('[aria-label="Referencia de la evidencia de conformidad"]','Conformidad sintética con condiciones y domicilio completo, sólo Emulator');
  await browser.evaluate("document.querySelector('[data-testid=contract-personal]').open=true");await browser.field('Dirección','Calle de prueba 456');
  assert.equal(await browser.evaluate(`[...${review}.querySelectorAll('button')].find(b=>b.textContent==='Registrar conformidad recibida').disabled`),true,'Unsaved address cannot be confirmed');
  await browser.clickText('Guardar datos personales');await browser.until("document.body.innerText.includes('Cambios guardados.')",'saved payment address');
  assert.deepEqual((await conformityRef.get()).data(),legacy);
  for(const [width,height] of [[1280,900],[390,844]]){
   await browser.command('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width===390});
   await browser.evaluate(`${review}.scrollIntoView({block:'start'})`);await browser.overflow('payment address conformity');
   const shot=await browser.command('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});writeFileSync(`${dir}/payment-address-pending-${width}.png`,Buffer.from(shot.data as string,'base64'));
  }
  const commandsBefore=(await payment.r.draft.collection('commands').get()).size;
  await browser.evaluate(`(()=>{const b=[...${review}.querySelectorAll('button')].find(b=>b.textContent==='Registrar conformidad recibida');b.click();b.click();})()`);
  await browser.until(`${review}?.innerText.includes('Conformidad registrada para las condiciones y el domicilio vigentes.')`,'explicit address consent');
  assert.equal((await payment.r.draft.collection('commands').get()).size,commandsBefore+1);
  const current=(await payment.r.draft.get()).data()!;assert.equal((await conformityRef.get()).data()!.confirmedPaymentAddressHash,contractPaymentAddress(current.personalData).hash);
  assert.deepEqual(current.economicTerms,payment.ready.economicTerms);assert.deepEqual(current.paymentScheduleDraft,payment.ready.paymentScheduleDraft);
  await browser.evaluate("[...document.querySelectorAll('details')].find(d=>d.querySelector('summary')?.textContent==='Documentación contractual').open=true");
  await browser.until(`${root}?.innerText.includes('Los tres documentos usan los mismos datos persistidos.')`,'current V3 preview');await saveHttpPdfs('conformed',payment.id);
  for(const [width,height] of [[1280,900],[390,844]]){
   await browser.command('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width===390});await browser.evaluate(`${review}.scrollIntoView({block:'start'})`);await browser.overflow('confirmed payment address');
   const shot=await browser.command('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});writeFileSync(`${dir}/payment-address-confirmed-${width}.png`,Buffer.from(shot.data as string,'base64'));
  }
  assert.deepEqual(browser.externalFirebase,[]);assert.equal(browser.storageWrites,0);
  assert.equal((await db.collection('contractNumberingV2').get()).size,infrastructureBefore.numbering);assert.equal((await db.collection('contractSnapshotsV2').get()).size,infrastructureBefore.snapshots);
  console.log('CLIENT_PAYMENT_ADDRESS_BROWSER=PASS; LEGACY_REVIEW; UNSAVED_DISABLED; EXPLICIT_CONFORMITY; DOUBLE_CLICK_ONE_COMMAND; DESKTOP_MOBILE; NO_CH_OR_PRODUCTION_WRITES');
  console.log('OPERATION_DOCUMENT_BROWSER=PASS; V3_HTTP_PDFS; DESKTOP_MOBILE; THREE_PDFS; UNSAVED_FIELDS_NOT_PERSISTED; REFRESH_AFTER_SAVED_REVISION; IDENTITY_BLOCK; ZERO_PRODUCTION_REQUESTS; NO_DOCUMENT_WRITES');
 }catch(error){console.error('SYNTHETIC_PREVIEW_FAILURE',await browser.evaluate('window.__DOCUMENT_PREVIEW_ERROR__??null'));throw error;}finally{await browser.close();}
}
