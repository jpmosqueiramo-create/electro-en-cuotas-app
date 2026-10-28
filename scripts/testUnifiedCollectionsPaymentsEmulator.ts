import './helpers/requireSafeEmulatorEnvironment';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { admin } from '../src/lib/firebaseAdmin';
import { approvedFinalPackages } from '../src/lib/productionV2/catalog';
import { productionRuntimeForEmulator } from '../src/lib/productionV2/runtime';
import { productionReadyFixture, syntheticOriginalFormal } from './helpers/productionAdapterFixtures';
import { productionPaths } from '../src/lib/productionV2/freeze';
import { issuePreparedOperation } from '../src/lib/productionV2/simpleIssuance';
import { argentinaBusinessDate } from '../src/lib/productionV2/businessDate';
import { getBudgetDocumentationBucket } from '../src/lib/budgetDocumentationStorage';
import { financialRef } from '../src/lib/operationFinancialV2Server';
import { startProductionBrowserServer } from './helpers/productionAdapterBrowserServer';
import { CatalogBrowser } from './helpers/catalogBrowser';
async function main() {
 const db=admin.firestore(),password='Emulator-only-123',actor=(await admin.auth().createUser({email:process.env.NEXT_PUBLIC_ADMIN_EMAIL,password,emailVerified:true})).uid;
 const p=approvedFinalPackages[0],runtime=productionRuntimeForEmulator(db,admin.auth(),[p],[actor]),bucket=await getBudgetDocumentationBucket(),f=await productionReadyFixture(actor,true,true);
 await db.doc(productionPaths.counter).create({schemaVersion:'CONTRACT_NUMBER_COUNTER_V1',policyId:'CONTRACT_NUMBERING_V1',executionMode:'PRODUCTION',active:true,lastAllocatedSequence:'0',initializationAuthorizationReference:'SYNTHETIC_ONLY'});
 await issuePreparedOperation(runtime,bucket,f.id,1,{commandId:randomUUID(),expectedRevision:(await f.r.draft.get()).data()!.revision,packageId:p.id,packageHash:p.sha256,formal:{contractIssueDate:argentinaBusinessDate(),contractIssuePlace:'Localidad sintética',promissoryNoteIssueDate:argentinaBusinessDate(),promissoryNoteIssuePlace:'Localidad sintética',...syntheticOriginalFormal},confirmed:true},actor);
 const server=await startProductionBrowserServer(runtime),browser=await CatalogBrowser.open(),scope="document.querySelector('dialog [data-testid=financial-v2]')";
 try {
  await browser.command('Emulation.setDeviceMetricsOverride',{width:1280,height:900,deviceScaleFactor:1,mobile:false});
  await browser.navigate('/login');await browser.until("typeof window.__FIREBASE_SIGN_IN__==='function'",'auth');await browser.evaluate(`window.__FIREBASE_SIGN_IN__(${JSON.stringify(process.env.NEXT_PUBLIC_ADMIN_EMAIL)},${JSON.stringify(password)}).then(()=>true)`);
  await browser.navigate('/admin/cobranzas');await browser.until("!!document.querySelector('[data-testid=collection-row]')",'row');await browser.clickText('Gestionar cobranza');await browser.until("!!document.querySelector('dialog[open] [data-testid=first-installment-payment]')",'first payment in collections');
  assert.equal(await browser.evaluate("document.activeElement.textContent"),'Cerrar');
  await browser.evaluate('window.confirm=()=>true');await browser.change('dialog [aria-label="Referencia primera cuota"]','SYNTHETIC-FIRST');await browser.clickText('Confirmar primera cuota recibida');
  await browser.until(`${scope}?.textContent.includes('1.595.000')`,'first payment balance');
  await browser.clickText('Registrar pago',scope);await browser.change('dialog [aria-label="Importe acreditado"]','72500');await browser.change('dialog [aria-label="Referencia de acreditación"]','SYNTHETIC-PARTIAL');
  assert.equal(await browser.evaluate("getComputedStyle(document.querySelector('dialog input[name=amount]')).backgroundColor"),'rgb(255, 253, 252)');
  await browser.screenshot('collections-account-desktop.png');await browser.overflow('account desktop');
  // The real handler commits, then its response is lost; retry must reuse the same command/payment IDs.
  await browser.evaluate(`(()=>{const original=window.fetch.bind(window);let lost=false;window.fetch=async(...args)=>{const response=await original(...args);if(!lost&&String(args[0]).endsWith('/financial')&&args[1]?.method==='POST'&&response.ok){lost=true;throw Error('SYNTHETIC_LOST_RESPONSE');}return response;};document.querySelector('dialog [data-testid=payment-form]').requestSubmit();document.querySelector('dialog [data-testid=payment-form]').requestSubmit();return true;})()`);
  await browser.until(`${scope}?.textContent.includes('SYNTHETIC_LOST_RESPONSE')`,'response lost');
  await browser.clickText('Confirmar pago acreditado',scope);await browser.until(`${scope}?.textContent.includes('1.522.500')`,'idempotent retry balance');
  const state=(await financialRef(db,f.id,1).get()).data()!;assert.equal(state.revision,3);assert.equal(state.accounting.paymentCount,2);
  await browser.clickText('Pagos',scope);await browser.until("document.querySelectorAll('dialog [data-testid=payment-record]').length===2",'history');
  assert.equal(await browser.evaluate("document.querySelectorAll('dialog input[name=reason]').length"),0);
  await browser.evaluate("[...document.querySelectorAll('dialog [data-testid=payment-record]')].find(e=>e.innerText.includes('SYNTHETIC-PARTIAL')).querySelector('button').click()");await browser.change('dialog input[name=reason]','Reversa sintética desde Cobranzas');await browser.clickText('Confirmar reversa auditada',scope);
  await browser.until(`${scope}?.textContent.includes('1.595.000')`,'reversal balance');await browser.until(`${scope}?.textContent.includes('Revertido')`,'reversed history');
  await browser.clickText('Recibos',scope);await browser.until("!!document.querySelector('dialog [data-testid=financial-receipt]')",'receipts');
  // Exercise the authenticated PDF route and keep the popup local to this test browser.
  await browser.evaluate("(()=>{window.open=()=>({location:{href:''},close(){}});const original=window.fetch.bind(window);window.__receiptOK=false;window.fetch=async(...args)=>{const r=await original(...args);if(String(args[0]).includes('?receipt='))window.__receiptOK=r.ok&&r.headers.get('content-type').includes('application/pdf');return r;};return true;})()");await browser.clickText('Abrir / imprimir recibo X',scope);await browser.until("window.__receiptOK===true",'authenticated receipt PDF');
  await browser.command('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});await browser.evaluate("document.querySelector('dialog').scrollTop=0");await browser.screenshot('collections-account-mobile.png');await browser.overflow('account mobile');assert.equal(await browser.evaluate("document.querySelector('dialog').scrollWidth<=document.querySelector('dialog').clientWidth+2"),true);
  await browser.command('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});await browser.until("!document.querySelector('dialog[open]')",'escape closes');
  await browser.until("document.querySelector('[data-testid=collection-row]').innerText.includes('1.595.000')",'dashboard refreshed');assert.equal(await browser.evaluate("document.activeElement.textContent.includes('Gestionar cobranza')"),true);
  assert.deepEqual(browser.externalFirebase,[]);
  console.log('COLLECTIONS_MODAL_FIRST_PAYMENT_PARTIAL_DOUBLE_SUBMIT_LOST_RESPONSE_RETRY_REVERSAL_RECEIPTS_FOCUS_MOBILE = PASS');
 }finally{await browser.close();await server.stop();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
