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
import { contractEconomics,contractSchedule } from '../src/lib/contractV2';
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
 async function select(selector:string,value:string){await browser.evaluate(`(()=>{const el=document.querySelector(${JSON.stringify(selector)});Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set.call(el,${JSON.stringify(value)});el.dispatchEvent(new Event('change',{bubbles:true}));})()`);}
 async function assertDefinitiveDisabled(disabled:boolean){assert.equal(await browser.evaluate(`['Plan de cuotas del borrador','Primera cuota','Día habitual'].every(label=>document.querySelector('[aria-label="'+label+'"]')?.disabled===${disabled})&&[...document.querySelectorAll('[data-testid=contract-schedule] button')].find(b=>b.textContent==='Guardar fechas y revisar cronograma')?.disabled===${disabled}`),true);}
 async function dialog(text:string){await browser.until(`[...document.querySelectorAll('button')].some(b=>b.textContent.trim()===${JSON.stringify(text)}&&!b.matches(':disabled'))`,'ready command idle');const clicked=browser.clickText(text);await browser.delay(200);await browser.command('Page.handleJavaScriptDialog',{accept:true});await clicked;}
 async function termsShot(name:string,section:string){await browser.evaluate(`document.querySelector('[data-testid=${section}]').scrollIntoView({block:'start'})`);await shot(name);}
 async function decide(state:string){await browser.until("![...document.querySelectorAll('[data-testid=credit-review] fieldset')].some(f=>f.disabled)",'credit idle before decision');await browser.evaluate(`(()=>{const a=[...document.querySelectorAll('[data-testid=credit-review] fieldset')].find(f=>f.querySelector('legend')?.textContent==='Resolución crediticia manual');a.closest('details').open=true;const select=a.querySelector('select');Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set.call(select,${JSON.stringify(state)});select.dispatchEvent(new Event('change',{bubbles:true}));for(const [i,value]of ['Resolución sintética '+${JSON.stringify(state)},'Sólo Emulator'].entries()){const t=a.querySelectorAll('textarea')[i];Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set.call(t,value);t.dispatchEvent(new Event('input',{bubbles:true}));}})()`);await browser.until("![...document.querySelectorAll('[data-testid=credit-review] fieldset')].some(f=>f.disabled)",'credit idle');await browser.clickText('Registrar resolución crediticia');await browser.until(`document.querySelector('[data-testid=credit-review] [role=status]')?.textContent===${JSON.stringify(state==='APPROVED'?'Aprobado':'En evaluación')}`,'credit decision '+state);}
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
 await browser.evaluate("(()=>{document.querySelector('[data-testid=contract-economics]').open=true;document.querySelector('[data-testid=contract-schedule]').open=true;return true;})()");
 await browser.until("!!document.querySelector('[aria-label=\"Plan de cuotas del borrador\"]')",'simulation available before data');
 const beforeSimulation=await pendingRefs.draft.get(),beforeCommands=(await pendingRefs.draft.collection('commands').get()).size;
 await select('[aria-label="Plan de cuotas del borrador"]','8');await browser.until("!document.querySelector('[aria-label=\"Plan de cuotas del borrador\"]').disabled",'draft plan saved');await browser.change('[aria-label="Primera cuota"]','2027-01-31');await select('[aria-label="Día habitual"]','31');
 await browser.clickText('Guardar fechas y revisar cronograma');await browser.until("document.querySelector('[data-testid=contract-schedule] tbody').rows.length===8&&!document.querySelector('[data-testid=contract-editable-fields]').disabled",'draft schedule saved before credit');
 const expectedEconomics=contractEconomics({...beforeSimulation.data()!.acceptedReferenceSnapshot,imagenUrls:[]},8),expectedSchedule=contractSchedule(expectedEconomics,'2027-01-31',31);
 assert.equal(await browser.evaluate("document.querySelector('[data-testid=contract-schedule] tbody').rows.length"),8);
 assert.ok(await browser.evaluate("document.querySelector('[data-testid=contract-schedule]').textContent.includes('28/02/2027')"));
 assert.equal(expectedSchedule.reduce((sum,row)=>sum+row.amount,0),expectedEconomics.contractTotal);
 assert.equal((await pendingRefs.draft.get()).data()!.status,'DRAFT');assert.equal((await pendingRefs.draft.collection('commands').get()).size,beforeCommands+2);assert.equal((await db.collection('contractNumbersV2').get()).size,0);
 assert.equal(await browser.evaluate("[...document.querySelectorAll('button')].some(b=>b.textContent==='Guardar fechas y revisar cronograma')"),true);
 await termsShot('simulacion-datos-economia-'+name,'contract-economics');await termsShot('simulacion-datos-cronograma-'+name,'contract-schedule');
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
 for(const [name,width,height,mobile]of [['desktop',1280,800,false],['mobile',390,844,true]] as const){
 await browser.command('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile});
 await browser.navigate('/admin/operaciones/'+returning.id+'/1');await browser.until("!!document.querySelector('[data-testid=operation-unified-workspace]')",'returning workspace');await browser.clickText('Contrato');
 await browser.until("!!document.querySelector('[data-testid=credit-review] fieldset')",'credit controls');await decide('IN_REVIEW');
 await browser.until("!!document.querySelector('[aria-label=\"Plan de cuotas del borrador\"]')",'simulation in review');
 await browser.evaluate("(()=>{document.querySelector('[data-testid=contract-economics]').open=true;document.querySelector('[data-testid=contract-schedule]').open=true;return true;})()");
 await select('[aria-label="Plan de cuotas del borrador"]','12');await browser.change('[aria-label="Primera cuota"]','2027-01-31');await select('[aria-label="Día habitual"]','31');
 await termsShot('antes-aprobar-economia-'+name,'contract-economics');await termsShot('antes-aprobar-cronograma-'+name,'contract-schedule');
 await decide('APPROVED');await browser.until("!!document.querySelector('[aria-label=\"Plan de cuotas del borrador\"]')",'approval enables economics without reload');
 await select('[aria-label="Plan de cuotas del borrador"]','8');await browser.until("document.querySelector('[aria-label=\"Plan de cuotas del borrador\"]')?.value==='8'&&!document.querySelector('[data-testid=contract-editable-fields]').disabled",'saved plan and refreshed credit');
 await browser.until("document.querySelector('[aria-label=\"Plan de cuotas del borrador\"]')?.disabled===false",'editable definitive controls');
 const commandCount=(await returning.r.draft.collection('commands').get()).size;
 await browser.evaluate("(()=>{const original=window.fetch;window.termsPlanPosts=0;window.holdNextTermSave=true;window.fetch=async(...args)=>{const isPlan=args[1]?.method==='POST'&&String(args[0]).endsWith('/contract')&&JSON.parse(args[1].body).action==='SET_CONTRACT_PLAN';if(isPlan){window.termsPlanPosts++;const response=await original(...args);if(window.holdNextTermSave){window.holdNextTermSave=false;await new Promise(resolve=>window.releaseTermSave=resolve);}return response;}return original(...args);};const plan=document.querySelector('[aria-label=\"Plan de cuotas del borrador\"]');for(const value of ['12','8']){Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set.call(plan,value);plan.dispatchEvent(new Event('change',{bubbles:true}));}})()");
 await browser.until("typeof window.releaseTermSave==='function'",'pending real plan save');await assertDefinitiveDisabled(true);
 assert.ok(await browser.evaluate("document.querySelector('[data-testid=contract-economics]').textContent.includes('guardado en curso')"));
 assert.equal(await browser.evaluate('window.termsPlanPosts'),1);assert.equal((await returning.r.draft.collection('commands').get()).size,commandCount+1);
 await browser.evaluate("(()=>{window.releaseTermSave();return true;})()");
 await browser.until("document.querySelector('[aria-label=\"Plan de cuotas del borrador\"]')?.value==='12'&&document.querySelector('[aria-label=\"Plan de cuotas del borrador\"]')?.disabled===false",'save completed and editable');await assertDefinitiveDisabled(false);
 await select('[aria-label="Plan de cuotas del borrador"]','8');await browser.until("document.querySelector('[aria-label=\"Plan de cuotas del borrador\"]')?.value==='8'&&document.querySelector('[aria-label=\"Plan de cuotas del borrador\"]')?.disabled===false",'restore eight installments');
 await browser.change('[aria-label="Primera cuota"]','2027-01-31');await select('[aria-label="Día habitual"]','31');await browser.clickText('Guardar fechas y revisar cronograma');
 await browser.until("document.querySelector('[data-testid=contract-schedule] tbody').rows.length===8&&!!document.querySelector('[aria-label=\"Plan de cuotas del borrador\"]')&&!document.querySelector('[data-testid=contract-editable-fields]').disabled",'saved schedule');
 const saved=(await returning.r.draft.get()).data()!;assert.equal(saved.economicTerms.contractPlanCuotas,8);assert.equal(saved.paymentScheduleDraft[1].dueDate,'2027-02-28');assert.equal(saved.paymentScheduleDraft.reduce((sum:number,row:{amount:number})=>sum+row.amount,0),saved.economicTerms.contractTotal);
 await termsShot('aprobado-economia-'+name,'contract-economics');await termsShot('aprobado-cronograma-'+name,'contract-schedule');await browser.overflow('terms '+name);
 await browser.evaluate("(()=>{document.querySelector('[data-testid=contract-review]').open=true;return true;})()");
 await browser.change('[aria-label="Referencia de la evidencia de conformidad"]','Conformidad sintética para prueba de bloqueo');await browser.clickText('Registrar conformidad recibida');
 await dialog('Confirmar preparación técnica');await browser.until("!!document.querySelector('[data-testid=contract-ready]')&&!!document.querySelector('[aria-label=\"Plan de cuotas del borrador\"]')",'READY with credit still approved');await assertDefinitiveDisabled(true);
 const lockedDraft=await returning.r.draft.get(),lockedCommands=(await returning.r.draft.collection('commands').get()).size;
 assert.ok(await browser.evaluate("document.querySelector('[data-testid=contract-economics]').textContent.includes('Volver a borrador')"));
 await select('[aria-label="Plan de cuotas del borrador"]','12');await browser.delay(100);assert.ok((await returning.r.draft.get()).updateTime!.isEqual(lockedDraft.updateTime!));assert.equal((await returning.r.draft.collection('commands').get()).size,lockedCommands);
 await termsShot('bloqueado-economia-'+name,'contract-economics');
 await dialog('Volver a borrador');await browser.until("!document.querySelector('[data-testid=contract-ready]')&&document.querySelector('[aria-label=\"Plan de cuotas del borrador\"]')?.disabled===false",'returned draft editable');await assertDefinitiveDisabled(false);assert.equal((await readCreditReview(db,returning.id,1)).approved,true);
 await select('[aria-label="Plan de cuotas del borrador"]','12');await browser.until("document.querySelector('[aria-label=\"Plan de cuotas del borrador\"]')?.value==='12'&&document.querySelector('[aria-label=\"Plan de cuotas del borrador\"]')?.disabled===false",'saved after returning');assert.equal((await returning.r.draft.get()).data()!.economicTerms.contractPlanCuotas,12);
 await browser.evaluate("(()=>{[...document.querySelectorAll('[data-testid=contract-composer] details')].find(d=>d.querySelector('summary')?.textContent.includes('Datos laborales')).open=true;return true;})()");
 await browser.change('input[name=employerOrWorkName]','Actualización sintética '+name);await browser.clickText('Guardar datos laborales');
 await browser.until("!!document.querySelector('[aria-label=\"Plan de cuotas del borrador\"]')&&document.querySelector('[data-testid=contract-economics]').textContent.includes('ya no está vigente')",'approval invalidated after draft update without reload');
 assert.equal((await readCreditReview(db,returning.id,1)).approved,false);
 }
 console.log('CONTRACT_TERMS_BUSY_LOCKED_EDITABLE_DUPLICATE_GUARD_RETURN_WITH_CREDIT = PASS');
 console.log('CONTRACT_TERMS_DRAFT_SAVE_APPROVAL_UI_SYNC_INVALIDATION_DESKTOP_MOBILE = PASS');
 assert.deepEqual(browser.externalFirebase,[]);console.log('CREDIT_BROWSER_DESKTOP_MOBILE = PASS; QUICK_FORM = PASS; CATALOG_PLAN = PASS; VERIFIED_REUSE = PASS; MANUAL_REVIEW_UI = PASS; OVERFLOW = 0; EXTERNAL_FIREBASE = 0');
 }catch(error){await shot('terms-failure');console.log('CREDIT_UI_DIAGNOSTIC',await browser.evaluate("JSON.stringify({status:document.querySelector('[data-testid=credit-review] [role=status]')?.textContent,errors:[...document.querySelectorAll('[role=alert]')].map(e=>e.textContent),decision:[...document.querySelectorAll('[data-testid=credit-review] fieldset')].find(f=>f.querySelector('legend')?.textContent==='Resolución crediticia manual')?.querySelector('select')?.value})"));throw error;}finally{await browser.close();}
}
