import './helpers/requireSafeEmulatorEnvironment';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {admin} from '../src/lib/firebaseAdmin';
import {fixture,addressPayload} from './testContractV2';
import {acceptBudgetV2} from '../src/lib/budgetAcceptanceV2Server';
import {contractRefs,publicContractData} from '../src/lib/contractV2Server';
import {DATA_AUTHORIZATION_VERSION} from '../src/lib/clientFlowMessages';
import {reviewCommand,addDocuments} from './testCreditReviewV2Emulator';
import {syntheticFinalPackage} from './helpers/productionAdapterFixtures';
import {packageHash} from '../src/lib/productionV2/catalog';
import {productionRuntimeForEmulator} from '../src/lib/productionV2/runtime';
import {productionPaths} from '../src/lib/productionV2/freeze';
import {financialRef} from '../src/lib/operationFinancialV2Server';
import {readDelivery} from '../src/lib/operationDeliveryV2Server';
import {startProductionBrowserServer} from './helpers/productionAdapterBrowserServer';
import {CatalogBrowser} from './helpers/catalogBrowser';
async function main(){
 const db=admin.firestore(),email=process.env.NEXT_PUBLIC_ADMIN_EMAIL!,password='Emulator-only-123',actor=(await admin.auth().createUser({email,password,emailVerified:true})).uid;
 const {sha256:old,...base}=syntheticFinalPackage();void old;const packageBody={...base,deliveryDocumentPolicy:'EXTERNAL_TRANSFER_AND_RECEIPT_V1' as const},p={...packageBody,sha256:packageHash(packageBody)};
 const runtime=productionRuntimeForEmulator(db,admin.auth(),[p],[actor]);
 await db.doc(productionPaths.counter).create({schemaVersion:'CONTRACT_NUMBER_COUNTER_V1',policyId:'CONTRACT_NUMBERING_V1',executionMode:'PRODUCTION',active:true,lastAllocatedSequence:'0',initializationAuthorizationReference:'SYNTHETIC_GUIDE_ONLY'});
 const id='guide-'+randomUUID(),{b}=fixture(id),r=contractRefs(db,id,1);b.clienteSnapshot.nombre=addressPayload.personalData.fullName;b.clienteSnapshot.dni=addressPayload.personalData.dni;
 await db.collection(b.sourceCollection).doc(b.solicitudId).set({nombreCompleto:b.clienteSnapshot.nombre,dni:b.clienteSnapshot.dni,numeroDni:b.clienteSnapshot.dni,localidad:b.clienteSnapshot.localidad});
 await r.family.create({sourceCollection:b.sourceCollection,solicitudId:b.solicitudId,lastVersion:1});await r.budget.create(b);
 await acceptBudgetV2(db,{budgetId:id,version:1,acceptedOptionId:'option-1',preferredPlanCuotas:12,commandId:'accept'},actor);
 const original=JSON.stringify((await r.budget.get()).data());
 const server=await startProductionBrowserServer(runtime),browser=await CatalogBrowser.open();
 const guide="document.querySelector('[data-testid=operation-progress-guide]')";
 const next="document.querySelector('[data-testid=operation-progress-next]')";
 async function waitNext(text:string){await browser.until(`${next}?.textContent.includes(${JSON.stringify(text)})`,text);}
 async function primary(){await browser.click('[data-testid=operation-progress-primary]');}
 async function row(key:string){await browser.evaluate(`${guide}.querySelector('details').open=true`);await browser.click(`[data-progress-step=${key}] button`);}
 async function select(selector:string,value:string){await browser.evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});e.value=${JSON.stringify(value)};e.dispatchEvent(new Event('change',{bubbles:true}));})()`);}
 try{
  await browser.navigate('/login');await browser.until("typeof window.__FIREBASE_SIGN_IN__==='function'",'auth');await browser.evaluate(`window.__FIREBASE_SIGN_IN__(${JSON.stringify(email)},${JSON.stringify(password)}).then(()=>true)`);
  await browser.navigate(`/admin/operaciones/${id}/1`);await waitNext('Preparar ficha');assert.equal((await r.draft.get()).exists,false);
  await primary();assert.equal((await r.draft.get()).exists,false,'guide navigation never creates a draft');
  await browser.clickText('Preparar borrador contractual');await waitNext('Datos personales');await browser.until("document.querySelector('[data-testid=contract-request]')?.disabled===false",'created draft');
  await browser.clickText('Solicitar datos personales y laborales');await browser.until("!!document.querySelector('[data-testid=client-open-link]')",'private link');
  const url=new URL(await browser.evaluate<string>("document.querySelector('[data-testid=client-open-link]').href"));
  await publicContractData(db,url.pathname.split('/').pop()!,url.hash.slice(1),{personalData:addressPayload.personalData,employmentData:addressPayload.employmentData,dataAuthorization:{version:DATA_AUTHORIZATION_VERSION,accepted:true}});
  await browser.clickText('Actualizar datos recibidos');await waitNext('El cliente ya envió datos');await primary();assert.equal(await browser.evaluate("document.querySelector('[data-testid=client-data-review]').open"),true);
  const apply=browser.clickText('Aplicar datos recibidos');await browser.delay(200);await browser.command('Page.handleJavaScriptDialog',{accept:true});await apply;await waitNext('Documentación e identidad');
  await row('personal');await browser.change('[data-testid=contract-personal] input[name=address]','Cambio local sin guardar');await waitNext('guardá los cambios');await primary();assert.equal(await browser.evaluate("document.querySelector('[data-testid=contract-personal]').open"),true);assert.notEqual((await r.draft.get()).data()!.personalData.address,'Cambio local sin guardar');
  await browser.navigate(`/admin/operaciones/${id}/1`);await waitNext('Documentación e identidad');await primary();await browser.until("document.querySelector('[data-testid=operation-step-documents]').getAttribute('aria-current')==='step'",'documentation target');
  await reviewCommand(id,'VERIFY_IDENTITY',{evidence:'Identidad sintética del escenario de guía'});await addDocuments(id);
  await browser.clickText('Actualizar guía');await waitNext('Aprobación de la solicitud');await primary();assert.equal(await browser.evaluate("document.querySelector('[data-testid=credit-advanced]').open"),true);
  await reviewCommand(id,'DECIDE',{state:'IN_REVIEW',resolution:'Revisión sintética',notes:'Sólo Emulator'});await reviewCommand(id,'DECIDE',{state:'APPROVED',resolution:'Aprobación sintética',notes:'Sólo Emulator'});
  await browser.clickText('Actualizar guía');await waitNext('Confeccionar contrato');
  for(const width of [1280,390,320]){await browser.command('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:width<768});await browser.evaluate(`${guide}.scrollIntoView({block:'start'})`);await browser.overflow('progress '+width);await browser.screenshot('operation-guide-'+width+'.png');}
  await primary();await browser.until("!!document.querySelector('[data-testid=contract-unified-editor]')",'contract editor');
  await browser.change('[aria-label=Cantidad]','1');await select('[aria-label=Condición]','NEW');await browser.change('[aria-label="Primera cuota"]','2026-12-05');await browser.change('[aria-label="Día habitual"]','5');await browser.change('[aria-label="Lugar de emisión"]','Localidad sintética');
  await waitNext('guardá los cambios');await browser.clickText('Guardar datos del contrato');await waitNext('Conformidad del cliente');await primary();
  await browser.change('[aria-label="Referencia de la evidencia de conformidad"]','Respuesta sintética ACEPTO, exclusiva de Emulator');await browser.clickText('Registrar conformidad recibida');await waitNext('Emitir contrato');await primary();
  await browser.until("document.querySelector('[data-testid=emit-contract-pair]')?.disabled===false",'explicit issue allowed');await browser.click('[data-testid=emit-contract-pair]');await waitNext('Dejar vigente el plan de cuotas');await primary();
  await browser.until("document.querySelector('[data-testid=first-installment-payment] button')?.disabled===false",'first payment enabled');await browser.change('[aria-label="Referencia primera cuota"]','PAGO SINTÉTICO SOLO EMULATOR');
  const payment=browser.clickText('Confirmar primera cuota recibida');await browser.delay(200);await browser.command('Page.handleJavaScriptDialog',{accept:true});await payment;await waitNext('Plan de cuotas vigente');
  assert.equal((await financialRef(db,id,1).get()).exists,true);assert.equal((await readDelivery(db,id,1,{uid:actor,admin:true})).state.status,'PREPARING','activation never implies signatures or delivery');
  await browser.evaluate(`${guide}.scrollIntoView({block:'start'})`);await browser.screenshot('operation-guide-active-320.png');
  const counter=(await db.doc(productionPaths.counter).get()).data()!.lastAllocatedSequence;assert.equal(counter,'1');
  assert.equal(JSON.stringify((await r.budget.get()).data()),original);assert.deepEqual(browser.externalFirebase,[]);
  console.log('OPERATION_GUIDE_BROWSER_ACCEPTED_INTAKE_APPLY_DOCS_APPROVAL_EDITOR_CONFORMITY_ISSUE_FIRST_PAYMENT_ACTIVE_1280_390_320=PASS');
 }finally{await browser.close();await server.stop();await admin.app().delete();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
