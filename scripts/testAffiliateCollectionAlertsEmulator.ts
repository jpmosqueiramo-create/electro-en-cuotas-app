import './helpers/requireSafeEmulatorEnvironment';
import assert from 'node:assert/strict';
import {createHash,randomUUID} from 'node:crypto';
import {admin} from '../src/lib/firebaseAdmin';
import {approvedFinalPackages} from '../src/lib/productionV2/catalog';
import {productionRuntimeForEmulator} from '../src/lib/productionV2/runtime';
import {productionReadyFixture,syntheticOriginalFormal} from './helpers/productionAdapterFixtures';
import {productionPaths} from '../src/lib/productionV2/freeze';
import {issuePreparedOperation} from '../src/lib/productionV2/simpleIssuance';
import {argentinaBusinessDate} from '../src/lib/productionV2/businessDate';
import {getBudgetDocumentationBucket} from '../src/lib/budgetDocumentationStorage';
import {financialCommand,financialRef} from '../src/lib/operationFinancialV2Server';
import {affiliateEngagement} from '../src/lib/affiliateEngagementV2';
import {custodyRef} from '../src/lib/operationCustodyV2Server';
import {resolveAlertAction} from '../src/lib/budgetAlertRouting';
import {startProductionBrowserServer} from './helpers/productionAdapterBrowserServer';
import {CatalogBrowser} from './helpers/catalogBrowser';
import {initializeApp,deleteApp} from 'firebase/app';
import {getAuth,connectAuthEmulator,signInWithCustomToken} from 'firebase/auth';
import {getFirestore,connectFirestoreEmulator,doc,getDoc,setDoc,Timestamp} from 'firebase/firestore';
async function main(){
 const db=admin.firestore(),password='Emulator-only-123',actor=(await admin.auth().createUser({email:process.env.NEXT_PUBLIC_ADMIN_EMAIL,password,emailVerified:true})).uid;
 const p=approvedFinalPackages[0],runtime=productionRuntimeForEmulator(db,admin.auth(),[p],[actor]),bucket=await getBudgetDocumentationBucket(),f=await productionReadyFixture(actor,true,true),seller={uid:f.uid,admin:false};
 await db.doc(productionPaths.counter).create({schemaVersion:'CONTRACT_NUMBER_COUNTER_V1',policyId:'CONTRACT_NUMBERING_V1',executionMode:'PRODUCTION',active:true,lastAllocatedSequence:'0',initializationAuthorizationReference:'SYNTHETIC_ONLY'});
 await issuePreparedOperation(runtime,bucket,f.id,1,{commandId:randomUUID(),expectedRevision:(await f.r.draft.get()).data()!.revision,packageId:p.id,packageHash:p.sha256,formal:{contractIssueDate:argentinaBusinessDate(),contractIssuePlace:'Localidad sintética',promissoryNoteIssueDate:argentinaBusinessDate(),promissoryNoteIssuePlace:'Localidad sintética',...syntheticOriginalFormal},confirmed:true},actor);
 const alerts=db.collection('alertas_admin').where('operationId','==',f.identity.operationId),alertId=(kind:string,id:string)=>'affiliate_collection_'+createHash('sha256').update(JSON.stringify([f.identity.operationId,kind,id])).digest('hex');
 const command=async(action:string,amountCents:number)=>({action,commandId:randomUUID(),expectedRevision:(await financialRef(db,f.id,1).get()).data()?.revision||0,operationId:f.identity.operationId,data:{paymentId:randomUUID(),amountCents,effectiveDate:argentinaBusinessDate(),method:'EFECTIVO',cashCustody:'AFFILIATE',reference:'SYNTHETIC-ALERT'}});
 const first=await command('ACTIVATE_WITH_FIRST_PAYMENT',14500000);
 await assert.rejects(financialCommand(db,f.id,1,first,{uid:f.uid2,admin:false},'AFFILIATE'));assert.equal((await alerts.get()).size,0);
 const replies=await Promise.all([1,2,3].map(()=>financialCommand(db,f.id,1,first,seller,'AFFILIATE')));assert.equal(replies.filter(r=>!r.replay).length,1);
 const firstAlert=db.collection('alertas_admin').doc(alertId('PAYMENT',first.commandId)),saved=(await firstAlert.get()).data()!;
 assert.equal((await alerts.get()).size,1);assert.equal(saved.tipo,'COBRO_EFECTIVO_AFILIADO');assert.equal(saved.affiliateId,f.affiliateId);assert.equal(saved.event.amountCents,14500000);assert.equal(saved.event.paymentId,first.data.paymentId);assert(saved.fechaCreacion.toMillis()>0);assert(saved.mensaje.includes('145.000'));assert(saved.mensaje.includes('Afiliado sintético A'));assert.equal(resolveAlertAction(saved)?.href,`/admin/operaciones/${f.id}/1?section=payments`);
 await firstAlert.update({leida:true});await financialCommand(db,f.id,1,first,seller,'AFFILIATE');assert.equal((await firstAlert.get()).data()!.leida,true);
 const promise={commandId:randomUUID(),kind:'PROMISE',note:'Abonará el día acordado',promisedDate:'2099-02-03'};
 const promises=await Promise.all([1,2,3].map(()=>affiliateEngagement(db,f.id,1,seller,promise)));assert.equal(promises.filter(r=>!r.replay).length,1);
 const promiseAlert=db.collection('alertas_admin').doc(alertId('PROMISE',promise.commandId)),ps=(await promiseAlert.get()).data()!;assert.equal((await alerts.get()).size,2);assert.equal(ps.tipo,'PROMESA_PAGO_AFILIADO');assert.equal(ps.event.promisedDate,'2099-02-03');assert(ps.mensaje.includes('03/02/2099'));assert(ps.mensaje.includes(promise.note));
 await promiseAlert.update({leida:true});await affiliateEngagement(db,f.id,1,seller,promise);assert.equal((await promiseAlert.get()).data()!.leida,true);
 await affiliateEngagement(db,f.id,1,seller,{commandId:randomUUID(),kind:'CONTACT',note:'Contacto sin promesa'});await affiliateEngagement(db,f.id,1,f.root,{...promise,commandId:randomUUID()});await financialCommand(db,f.id,1,await command('CREDIT_PAYMENT',10000),f.root);assert.equal((await alerts.get()).size,2);
 await assert.rejects(affiliateEngagement(db,f.id,1,{uid:f.uid2,admin:false},{...promise,commandId:randomUUID()}));await assert.rejects(affiliateEngagement(db,f.id,1,seller,{...promise,commandId:randomUUID(),promisedDate:'2000-01-01'}));assert.equal((await alerts.get()).size,2);
 // A failed alert insert must roll back the corresponding payment and promise too.
 const blockedPayment=await command('CREDIT_PAYMENT',10000),collision=db.collection('alertas_admin').doc(alertId('PAYMENT',blockedPayment.commandId));await collision.create({syntheticCollision:true});const before=(await financialRef(db,f.id,1).get()).data()!;
 await assert.rejects(financialCommand(db,f.id,1,blockedPayment,seller,'AFFILIATE'));assert.equal((await financialRef(db,f.id,1).get()).data()!.revision,before.revision);assert(!(await financialRef(db,f.id,1).collection('payments').doc(blockedPayment.data.paymentId).get()).exists);await collision.delete();
 const blockedPromise={...promise,commandId:randomUUID()},pcollision=db.collection('alertas_admin').doc(alertId('PROMISE',blockedPromise.commandId));await pcollision.create({syntheticCollision:true});await assert.rejects(affiliateEngagement(db,f.id,1,seller,blockedPromise));assert(!(await custodyRef(db,f.id,1).collection('engagements').doc(blockedPromise.commandId).get()).exists);await pcollision.delete();
 assert.equal(resolveAlertAction({...saved,budgetId:'../private'}),null);assert.equal(resolveAlertAction({...saved,budgetVersion:0}),null);assert.equal(resolveAlertAction({...saved,schemaVersion:'invalid'}),null);
 // Client SDK enforces the real Rules: sellers cannot read or fabricate structured administrative alerts.
 const app=initializeApp({apiKey:'demo-key',projectId:'demo-cuenta-hogar'},randomUUID()),auth=getAuth(app),clientDb=getFirestore(app);connectAuthEmulator(auth,'http://127.0.0.1:9099',{disableWarnings:true});connectFirestoreEmulator(clientDb,'127.0.0.1',8080);await signInWithCustomToken(auth,await admin.auth().createCustomToken(f.uid));
 await assert.rejects(getDoc(doc(clientDb,'alertas_admin',firstAlert.id)));await assert.rejects(setDoc(doc(clientDb,'alertas_admin','forged-alert'),{tipo:saved.tipo,mensaje:'forged',fechaCreacion:Timestamp.now(),leida:false,schemaVersion:saved.schemaVersion,budgetId:f.id,budgetVersion:1}));await deleteApp(app);
 console.log('AFFILIATE_ALERTS_PAYMENT_PROMISE_ATOMIC_REPLAY_READ_STATE_ADMIN_NO_SELF_ALERT_AUTH_RULES_ROUTING=PASS');
 if(process.env.ALERTS_BROWSER==='1'){
  const server=await startProductionBrowserServer(runtime),browser=await CatalogBrowser.open();
  try{
   await browser.navigate('/login');await browser.until("typeof window.__FIREBASE_SIGN_IN__==='function'",'auth');await browser.evaluate(`window.__FIREBASE_SIGN_IN__(${JSON.stringify(process.env.NEXT_PUBLIC_ADMIN_EMAIL)},${JSON.stringify(password)}).then(()=>true)`);await browser.navigate('/admin/cobranzas');await browser.until("!!document.querySelector('[data-testid=admin-alerts-link]')",'header badge');
   const initial=(await db.collection('alertas_admin').where('leida','==',false).get()).size;
   const live=await command('CREDIT_PAYMENT',10000);await financialCommand(db,f.id,1,live,seller,'AFFILIATE');await browser.until(`document.querySelector('[data-testid=admin-alerts-link]').getAttribute('aria-label')==='Alertas: ${initial+1} sin leer'`,'live badge on another admin page');
   await affiliateEngagement(db,f.id,1,seller,{...promise,commandId:randomUUID(),note:'PROMESA VISIBLE EN ALERTAS'});await browser.until(`document.querySelector('[data-testid=admin-alerts-link]').getAttribute('aria-label')==='Alertas: ${initial+2} sin leer'`,'promise badge');await browser.click('[data-testid=admin-alerts-link]');await browser.until("document.body.innerText.includes('PROMESA VISIBLE EN ALERTAS')",'admin alert details');
   assert.equal(await browser.evaluate("[...document.querySelectorAll('[data-testid=admin-alert]')].some(e=>e.innerText.includes('Cobro del vendedor afiliado')&&e.innerText.includes('100,00'))"),true);
   const href=await browser.evaluate<string>("[...document.querySelectorAll('[data-testid=admin-alert]')].find(e=>e.innerText.includes('PROMESA VISIBLE EN ALERTAS')).querySelector('a').getAttribute('href')");assert.equal(href,`/admin/operaciones/${f.id}/1?section=payments`);
   for(const width of [1280,390,320]){await browser.command('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:width<500});await browser.evaluate("document.querySelector('#alertas').scrollIntoView({block:'start'})");await browser.overflow('alerts '+width);await browser.screenshot('affiliate-alerts-'+width+'.png');}
   await browser.evaluate("[...document.querySelectorAll('[data-testid=admin-alert]')].find(e=>e.innerText.includes('PROMESA VISIBLE EN ALERTAS')).querySelector('button').click()");await browser.until("!document.body.innerText.includes('PROMESA VISIBLE EN ALERTAS')",'mark read');await browser.until(`document.querySelector('[data-testid=admin-alerts-link]').getAttribute('aria-label')==='Alertas: ${initial+1} sin leer'`,'badge updates after read');
   assert.deepEqual(browser.externalFirebase,[]);console.log('AFFILIATE_ALERTS_BROWSER_LIVE_BADGE_DETAILS_READ_ACTION_RESPONSIVE_1280_390_320=PASS');
  }finally{await browser.close();await server.stop();}
 }
}
main().catch(e=>{console.error(e);process.exitCode=1;});
