import './helpers/requireSafeEmulatorEnvironment';
import assert from 'node:assert/strict';
import { mkdirSync,writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { admin } from '../src/lib/firebaseAdmin';
import { CatalogBrowser } from './helpers/catalogBrowser';
import { createCreditCase,reviewCommand,addDocuments } from './testCreditReviewV2Emulator';
import { publicFixture } from './helpers/catalogC4Fixtures';
import { adminEmail,adminPassword } from './helpers/adminSolicitudesFixtures';
import { fixture } from './testContractV2';
import { acceptBudgetV2 } from '../src/lib/budgetAcceptanceV2Server';
import { contractCommand,contractRefs } from '../src/lib/contractV2Server';
import { readCreditReview } from '../src/lib/creditReviewV2Server';
export async function testCreditReviewBrowser(){
 const db=admin.firestore();
 const pendingId='client-data-header-'+randomUUID(),pending=fixture(pendingId),pendingRefs=contractRefs(db,pendingId,1);
 await pendingRefs.family.create({lastVersion:1});await pendingRefs.budget.create(pending.b);
 await acceptBudgetV2(db,{budgetId:pendingId,version:1,acceptedOptionId:'option-1',preferredPlanCuotas:12,commandId:'accept'},'synthetic-admin');
 await contractCommand(db,pendingId,1,{action:'OPEN_OR_CREATE',commandId:'open'},'synthetic-admin');
 const newClient=await createCreditCase('credit-browser-new-'+randomUUID());
 await reviewCommand(newClient.id,'VERIFY_IDENTITY',{evidence:'Verificación documental sintética'});await addDocuments(newClient.id);
 const returning=await createCreditCase('credit-browser-returning-'+randomUUID());await reviewCommand(returning.id,'LINK_PROFILE',{originBudgetId:newClient.id,originVersion:1,evidence:'Misma identidad sintética verificada'});
 const dto=publicFixture('credit-browser-public','Referencia pública sintética');await db.collection('catalogo_publico').doc(dto.referenciaId).set(dto);
 try{const u=await admin.auth().getUserByEmail(adminEmail);await admin.auth().updateUser(u.uid,{password:adminPassword,emailVerified:true});}catch{await admin.auth().createUser({email:adminEmail,password:adminPassword,emailVerified:true});}
 const browser=await CatalogBrowser.open(),captureDir='/tmp/cuenta-hogar-credit-review-v2';mkdirSync(captureDir,{recursive:true});
 async function shot(name:string){await browser.evaluate('document.fonts.ready.then(()=>true)');const image=await browser.command('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});writeFileSync(captureDir+'/'+name+'.png',Buffer.from(image.data as string,'base64'));}
 try{
 for(const [name,width,height,mobile]of [['desktop',1280,800,false],['mobile',390,844,true]] as const){
 await browser.command('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile});
 await browser.navigate('/solicitar');await browser.until("!!document.querySelector('form input[autocomplete=name]')",'quick form');
 assert.equal(await browser.evaluate("document.querySelectorAll('form input[required]').length"),4);
 assert.equal(await browser.evaluate("/DNI|CUIL|Fecha de Nacimiento|Antigüedad Laboral/.test(document.querySelector('form').innerText)"),false);assert.equal(await browser.evaluate(`document.querySelector('a[aria-label="Consultar por WhatsApp"]')`),null);await browser.overflow('quick '+name);await shot('consulta-'+name);
 await browser.navigate('/solicitar?id='+dto.referenciaId+'&cuotas='+dto.planesPublicados[0].cuotas);await browser.until(`!!document.querySelector(${JSON.stringify(`select[aria-label="Plan publicado"] option[value="${dto.planesPublicados[0].cuotas}"]`)})`,'catalog plan');
 assert.equal(await browser.evaluate("document.querySelectorAll('form input[required]').length"),3);assert.equal(await browser.evaluate(`document.querySelector('select[aria-label="Plan publicado"]').value`),String(dto.planesPublicados[0].cuotas));assert.equal(await browser.evaluate(`document.querySelector('select[aria-label="Plan publicado"]').required`),false);await browser.overflow('catalog '+name);await shot('consulta-catalogo-'+name);
 await browser.navigate('/login');await browser.until("typeof window.__FIREBASE_SIGN_IN__==='function'",'auth emulator');await browser.evaluate(`window.__FIREBASE_SIGN_IN__(${JSON.stringify(adminEmail)},${JSON.stringify(adminPassword)}).then(()=>true)`);
 await browser.navigate('/admin/operaciones/'+pendingId+'/1');
 await browser.until("document.querySelector('[data-testid=operation-header-actions]')?.innerText.includes('Revisar datos del cliente')",'pending data header');
 assert.equal(await browser.evaluate("document.querySelectorAll('[data-testid=contract-request]').length"),1);
 await browser.evaluate("document.querySelector('[data-testid=operation-unified-workspace] header').scrollIntoView({block:'start'})");await browser.overflow('data header '+name);await shot('operation-data-'+name);
 await browser.clickText('Revisar datos del cliente');await browser.until("!!document.querySelector('[data-testid=contract-personal]')",'review correct operation');
 await browser.clickText('Solicitar datos personales y laborales');await browser.until("!!document.querySelector('[data-testid=client-open-link]')",'request from header');
 const requestId=(await pendingRefs.draft.get()).data()!.activeClientDataRequestId;
 assert.equal((await pendingRefs.draft.collection('requests').doc(requestId).get()).data()!.budgetId,pendingId);
 assert.ok(await browser.evaluate("document.querySelector('[data-testid=client-open-link]').href.includes('/completar-datos/')"));
 await browser.navigate('/admin/operaciones/'+returning.id+'/1');await browser.until("!!document.querySelector('[data-testid=operation-unified-workspace]')",'operation');await browser.clickText('Contrato');await browser.until("document.querySelector('[data-testid=credit-review]')?.innerText.includes('Carpeta vinculada')",'credit');
 assert.ok(await browser.evaluate("document.querySelector('[data-testid=credit-review]').innerText.includes('Verificado y vigente')"));await browser.overflow('credit '+name);await browser.evaluate("document.querySelector('[data-testid=credit-review]').scrollIntoView({block:'start'})");await shot('evaluacion-'+name);
 }
 // Exercise a real admin HTTP mutation via its UI in the isolated Emulator.
 const textareas=await browser.evaluate<number>("document.querySelectorAll('[data-testid=credit-review] fieldset textarea').length");assert.ok(textareas>=2);
 await browser.evaluate("(()=>{const a=[...document.querySelectorAll('[data-testid=credit-review] fieldset')].find(f=>f.querySelector('legend')?.textContent==='Resolución crediticia manual');const t=a.querySelectorAll('textarea');for(const [i,value]of ['Revisión manual sintética','No es evaluación real'].entries()){Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set.call(t[i],value);t[i].dispatchEvent(new Event('input',{bubbles:true}));}})()");
 await browser.clickText('Registrar resolución crediticia');await browser.until("document.querySelector('[data-testid=credit-review] [role=status]')?.textContent==='En evaluación'",'manual review saved');assert.equal((await readCreditReview(db,returning.id,1)).review?.state,'IN_REVIEW');
 assert.deepEqual(browser.externalFirebase,[]);console.log('CREDIT_BROWSER_DESKTOP_MOBILE = PASS; QUICK_FORM = PASS; CATALOG_PLAN = PASS; VERIFIED_REUSE = PASS; MANUAL_REVIEW_UI = PASS; OVERFLOW = 0; EXTERNAL_FIREBASE = 0');
 }finally{await browser.close();}
}
