import './helpers/requireSafeEmulatorEnvironment';
import assert from 'node:assert/strict';
import { mkdirSync,writeFileSync } from 'node:fs';
import { admin } from '../src/lib/firebaseAdmin';
import { infrastructureFixture } from './helpers/contractInfrastructureFixtures';
import { createDocumentationCase } from '../src/lib/budgetAcceptanceV2';
import { createContractFreezeIntegrationEmulator,FREEZE_DEPENDENCIES_COLLECTION } from '../src/lib/contractFreezeIntegrationEmulator';
import { createPrivateDocumentArchiveEmulator } from '../src/lib/contractDocuments/archiveEmulator';
import { reviewDocumentDefinitions } from '../src/lib/contractDocuments/pdf';
import { contractRefs } from '../src/lib/contractV2Server';
import { CatalogBrowser } from './helpers/catalogBrowser';
import { adminEmail,adminPassword } from './helpers/adminSolicitudesFixtures';
export async function testContractDocumentWorkflowBrowser(){
  const id=`document-workflow-${Date.now()}`,f=infrastructureFixture(id),r=contractRefs(admin.firestore(),id,1),{budget:b,acceptance:a,draft:d}=f.source;
  await r.family.set({sourceCollection:b.sourceCollection,solicitudId:b.solicitudId,lastVersion:1});await r.budget.set(b);await r.acceptance.set(a);await r.draft.set(d);await r.family.collection('documentation').doc('1').set(createDocumentationCase(a));
  const before={budget:(await r.budget.get()).data(),acceptance:(await r.acceptance.get()).data(),p4:(await r.family.collection('documentation').doc('1').get()).data()};
  const user=await admin.auth().getUserByEmail(adminEmail);await admin.auth().updateUser(user.uid,{password:adminPassword,emailVerified:true});
  const browser=await CatalogBrowser.open(),dir='/tmp/cuenta-hogar-contract-document-workflow';mkdirSync(dir,{recursive:true});mkdirSync('/tmp/cuenta-hogar-approved-business-rules',{recursive:true});
  try{
    await browser.command('Emulation.setDeviceMetricsOverride',{width:1280,height:800,deviceScaleFactor:1,mobile:false});
    await browser.navigate('/login');await browser.until("typeof window.__FIREBASE_SIGN_IN__==='function'",'auth');await browser.evaluate(`window.__FIREBASE_SIGN_IN__(${JSON.stringify(adminEmail)},${JSON.stringify(adminPassword)}).then(()=>true)`);
    await browser.navigate('/admin/presupuestos');await browser.until("!![...document.querySelectorAll('label')].find(x=>x.textContent.includes('Buscar presupuesto V2'))",'history');await browser.field('Buscar presupuesto V2',id);
    const history="[...document.querySelectorAll('section')].find(s=>s.querySelector('h2')?.textContent==='Historial V2')";
    await browser.until(`${history}?.querySelectorAll('article').length===1`,'budget');await browser.clickText('Abrir versión 1',history);await browser.until("!!document.querySelector('[data-testid=acceptance-registered]')",'acceptance');await browser.clickText('Confeccionar contrato');
    const root="document.querySelector('[data-testid=contract-document-workspace]')";
    await browser.until(`${root}?.innerText.includes('Sin evidencia READY vigente')`,'dossier DRAFT');
    await browser.clickText('Visualizar PDFs sintéticos',root);await browser.until("!!document.querySelector('[data-testid=contract-sample-loaded]')",'synthetic PDFs');
    assert.equal(await browser.evaluate(`${root}.querySelectorAll('iframe').length`),2);
    const text=await browser.evaluate<string>(`${root}.innerText`);for(const value of ['CH-000001','Importe del pagaré (decisión comercial)','Pendiente de aprobación jurídica','Validez y exigibilidad sujetas a revisión profesional','no corresponden al cliente'])assert.ok(text.includes(value));
    for(const value of ['SECRET_PROVIDER','SECRET_WORKPLACE','tokenHash'])assert.ok(!text.includes(value));
    const src=await browser.evaluate<string[]>(`[...${root}.querySelectorAll('iframe')].map(f=>f.src)`);assert.ok(src.every(url=>url.startsWith('blob:')));
    assert.equal(await browser.evaluate(`${root}.querySelectorAll('[data-testid=contract-document-samples] button').length`),1);
    assert.equal(await browser.evaluate(`${root}.querySelectorAll('button').length`),4);
    assert.ok(await browser.evaluate(`${root}.innerText.includes('Registro operativo disponible sólo en Emulator')`));
    const operations="document.querySelector('[data-testid=contract-operations]')";
    await browser.until(`${operations}?.querySelector('fieldset')?.disabled===false`,'operational Emulator controls');
    await browser.change('[data-testid=contract-operations] input[type=date]','2026-10-19');
    await browser.change('[data-testid=contract-operations] input[maxlength="150"]','Localidad efectiva sintética');
    for(const kind of ['customerMandate','customerNote','deliveryReceipt']){
      await browser.evaluate(`(()=>{const select=${operations}.querySelector('select');Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set.call(select,${JSON.stringify(kind)});select.dispatchEvent(new Event('change',{bubbles:true}));})()`);
      await browser.change('[data-testid=contract-operations] input[maxlength="100"]',`original-${kind}`);
      await browser.clickText('Registrar firma física constatada',operations);
      await browser.until(`${operations}.querySelector('button').disabled===true`,'signature recorded');
      await browser.until(`!${operations}.querySelector('fieldset').disabled`,'operation completed');
    }
    await browser.clickText('Registrar entrega realizada',operations);await browser.until(`${operations}.innerText.includes('Entrega: REALIZADA')`,'delivery without representative');
    assert.ok(await browser.evaluate(`${operations}.innerText.includes('Representante LOOP: PENDIENTE')`));
    assert.ok(await browser.evaluate(`${operations}.innerText.includes('Formalización jurídica: PENDIENTE')`));
    for(const [width,height] of [[1280,800],[390,844]]){
      await browser.command('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width===390});await browser.overflow('document workflow');
      await browser.evaluate(`${root}.scrollIntoView({block:'start'})`);const image=await browser.command('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});writeFileSync(`${dir}/dossier-${width}.png`,Buffer.from(image.data as string,'base64'));
      await browser.evaluate("document.querySelector('[data-testid=contract-operations]').scrollIntoView({block:'start'})");const operationsImage=await browser.command('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});writeFileSync(`/tmp/cuenta-hogar-approved-business-rules/operations-${width}.png`,Buffer.from(operationsImage.data as string,'base64'));

      await browser.evaluate("document.querySelector('[data-testid=contract-document-samples]').scrollIntoView({block:'start'})");const sample=await browser.command('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});writeFileSync(`${dir}/samples-${width}.png`,Buffer.from(sample.data as string,'base64'));
    }
    // Wait for the real confirmation dialog; PDF viewer startup may delay click delivery.
    async function acceptConfirmation(){
      const deadline=Date.now()+8000;
      while(true){try{await browser.command('Page.handleJavaScriptDialog',{accept:true});return;}catch(error){if(Date.now()>=deadline)throw error;await browser.delay(50);}}
    }
    await Promise.all([browser.clickText('Confirmar preparación técnica'),acceptConfirmation()]);
    await browser.until(`${root}?.innerText.includes('Revisión READY verificada')`,'dossier READY');
    const db=admin.firestore(),counter=db.doc('contractNumberingV2/CONTRACT_NUMBERING_V1');
    if(!(await counter.get()).exists)await counter.create({schemaVersion:'CONTRACT_NUMBER_COUNTER_V1',policyId:'CONTRACT_NUMBERING_V1',executionMode:'EMULATOR_ONLY',active:true,lastAllocatedSequence:'0'});
    f.legalContext.documentDefinitions=reviewDocumentDefinitions();await db.collection(FREEZE_DEPENDENCIES_COLLECTION).doc(id).create({schemaVersion:'CONTRACT_FREEZE_SYNTHETIC_DEPENDENCIES_V1',executionMode:'EMULATOR_ONLY',legalApproval:'NOT_APPROVED_SYNTHETIC_ONLY',legalContext:f.legalContext});
    const freeze=createContractFreezeIntegrationEmulator(),archive=createPrivateDocumentArchiveEmulator();
    try{const receipt=await freeze.execute({action:'FREEZE_READY_EMULATOR',commandId:id,budgetId:id,budgetVersion:1,expectedRevision:(await r.draft.get()).data()!.revision,dependenciesId:id},'synthetic-admin-a');const snapshot=await freeze.getSnapshot(receipt.snapshotId);assert.ok(snapshot);await archive.preserve(snapshot);}finally{await freeze.close();await archive.close();}
    await browser.clickText('Recargar borrador y datos recibidos');await browser.until(`${root}?.innerText.includes('Conservación completa registrada')`,'frozen dossier/archive');
    assert.equal(await browser.evaluate("document.querySelector('[data-testid=contract-composer] fieldset').disabled"),true);
    assert.ok((await browser.evaluate<string>(`${root}.innerText`)).includes('Términos congelados'));
    // Reopening a frozen dossier must be a GET, not a rejected OPEN_OR_CREATE command.
    const commandsBefore=(await r.draft.collection('commands').get()).size;
    await browser.navigate('/admin/presupuestos');await browser.until("!![...document.querySelectorAll('label')].find(x=>x.textContent.includes('Buscar presupuesto V2'))",'reopen history');await browser.field('Buscar presupuesto V2',id);await browser.until(`${history}?.querySelectorAll('article').length===1`,'reopen exact budget');await browser.clickText('Abrir versión 1',history);await browser.until("!!document.querySelector('[data-testid=acceptance-registered]')",'reopen acceptance');await browser.clickText('Confeccionar contrato');await browser.until(`${root}?.innerText.includes('Conservación completa registrada')`,'reopened frozen dossier');
    assert.equal(await browser.evaluate("document.querySelector('[data-testid=contract-composer] fieldset').disabled"),true);assert.equal((await r.draft.collection('commands').get()).size,commandsBefore);

    assert.deepEqual(before,{budget:(await r.budget.get()).data(),acceptance:(await r.acceptance.get()).data(),p4:(await r.family.collection('documentation').doc('1').get()).data()});assert.deepEqual(browser.externalFirebase,[]);
    console.log('DOCUMENT_WORKFLOW_BROWSER_ADMIN_DRAFT_READY_FROZEN_ARCHIVE_SAMPLES_DESKTOP_MOBILE = PASS');
  }finally{await browser.close();}
}
