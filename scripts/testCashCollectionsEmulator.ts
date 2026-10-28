import './helpers/requireSafeEmulatorEnvironment';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {mkdirSync,writeFileSync} from 'node:fs';
import {admin} from '../src/lib/firebaseAdmin';
import {approvedFinalPackages} from '../src/lib/productionV2/catalog';
import {productionRuntimeForEmulator} from '../src/lib/productionV2/runtime';
import {productionReadyFixture,syntheticOriginalFormal} from './helpers/productionAdapterFixtures';
import {productionPaths} from '../src/lib/productionV2/freeze';
import {issuePreparedOperation} from '../src/lib/productionV2/simpleIssuance';
import {argentinaBusinessDate} from '../src/lib/productionV2/businessDate';
import {getBudgetDocumentationBucket} from '../src/lib/budgetDocumentationStorage';
import {financialCommand,financialRef,readFinancial,readFinancialReceipt} from '../src/lib/operationFinancialV2Server';
import {financialReceiptPdf} from '../src/lib/operationFinancialReceiptPdf';
import {financialHandler} from '../src/lib/operationFinancialV2Http';
import {obtenerLedgerCustodiaEfectivo} from '../src/lib/settlementsEngine';
import {affiliateSettlementCommand} from '../src/lib/affiliateSettlementAdmin';
import {readDelivery} from '../src/lib/operationDeliveryV2Server';
import {startProductionBrowserServer} from './helpers/productionAdapterBrowserServer';
import {CatalogBrowser} from './helpers/catalogBrowser';
import {initializeApp,deleteApp} from 'firebase/app';
import {getAuth,connectAuthEmulator,signInWithCustomToken} from 'firebase/auth';
async function main(){
 const db=admin.firestore(),password='Emulator-only-123',actor=(await admin.auth().createUser({email:process.env.NEXT_PUBLIC_ADMIN_EMAIL,password,emailVerified:true})).uid;
 const p=approvedFinalPackages[0],runtime=productionRuntimeForEmulator(db,admin.auth(),[p],[actor]),bucket=await getBudgetDocumentationBucket(),f=await productionReadyFixture(actor,true,true),seller={uid:f.uid,admin:false};
 await db.doc(productionPaths.counter).create({schemaVersion:'CONTRACT_NUMBER_COUNTER_V1',policyId:'CONTRACT_NUMBERING_V1',executionMode:'PRODUCTION',active:true,lastAllocatedSequence:'0',initializationAuthorizationReference:'SYNTHETIC_ONLY'});
 await issuePreparedOperation(runtime,bucket,f.id,1,{commandId:randomUUID(),expectedRevision:(await f.r.draft.get()).data()!.revision,packageId:p.id,packageHash:p.sha256,formal:{contractIssueDate:argentinaBusinessDate(),contractIssuePlace:'Localidad sintética',promissoryNoteIssueDate:argentinaBusinessDate(),promissoryNoteIssuePlace:'Localidad sintética',...syntheticOriginalFormal},confirmed:true},actor);
 const make=async(action:string,data:Record<string,unknown>)=>({action,data,commandId:randomUUID(),expectedRevision:(await financialRef(db,f.id,1).get()).data()?.revision||0,operationId:f.identity.operationId});
 const payment={paymentId:randomUUID(),amountCents:14500000,effectiveDate:argentinaBusinessDate(),method:'EFECTIVO',cashCustody:'AFFILIATE',reference:'SYNTHETIC-CASH'};
 const first=await make('ACTIVATE_WITH_FIRST_PAYMENT',payment);
 await assert.rejects(financialCommand(db,f.id,1,{...first,data:{...payment,method:'TRANSFERENCIA'}},seller,'AFFILIATE'));
 await assert.rejects(financialCommand(db,f.id,1,{...first,data:{...payment,cashCustody:'ADMIN'}},seller,'AFFILIATE'));
 await assert.rejects(financialCommand(db,f.id,1,first,{uid:f.uid2,admin:false},'AFFILIATE'));
 await assert.rejects(financialCommand(db,f.id,1,await make('REVERSE_PAYMENT',{paymentId:payment.paymentId,reason:'Forbidden'}),seller,'AFFILIATE'));
 assert(!(await financialRef(db,f.id,1).get()).exists);
 const concurrent=await Promise.all([1,2,3].map(()=>financialCommand(db,f.id,1,first,seller,'AFFILIATE')));assert.equal(concurrent.filter(r=>!r.replay).length,1);
 assert.equal((await obtenerLedgerCustodiaEfectivo(db,f.affiliateId)).efectivoPendienteRendicionCentavos,14500000);
 assert.equal((await financialRef(db,f.id,1).collection('payments').get()).size,1);
 assert.equal((await db.collection('ledger_comisiones_movimientos').where('ledgerPagoMovimientoId','==',payment.paymentId).get()).size,1);
 assert.equal((await readDelivery(db,f.id,1,f.root)).state.documents.MANDATE.signature,null);
 const visible=await readFinancial(db,f.id,1,seller,'AFFILIATE');assert(visible.active&&visible.mutationEnabled);assert(!('history' in visible));
 const pdf=financialReceiptPdf(await readFinancialReceipt(db,f.id,1,seller,'AFFILIATE','receipt_'+payment.paymentId));mkdirSync('/tmp/ch-cash',{recursive:true});writeFileSync('/tmp/ch-cash/recibo-x.pdf',pdf);
 assert(Buffer.from(pdf).includes(Buffer.from('PDF')));
 await assert.rejects(readFinancialReceipt(db,f.id,1,{uid:f.uid2,admin:false},'AFFILIATE','receipt_'+payment.paymentId));
 const adminCash={...payment,paymentId:randomUUID(),cashCustody:'ADMIN',amountCents:100000};await financialCommand(db,f.id,1,await make('CREDIT_PAYMENT',adminCash),f.root);
 assert.equal((await obtenerLedgerCustodiaEfectivo(db,f.affiliateId)).efectivoPendienteRendicionCentavos,14500000);assert.equal((await db.collection('ledger_custodia_efectivo_admin').where('ledgerMovimientoRelacionadoId','==',adminCash.paymentId).get()).size,1);
 const assignedCash={...payment,paymentId:randomUUID(),amountCents:200000};await financialCommand(db,f.id,1,await make('CREDIT_PAYMENT',assignedCash),f.root);
 assert.equal((await obtenerLedgerCustodiaEfectivo(db,f.affiliateId)).efectivoPendienteRendicionCentavos,14700000);
 const reverse=await make('REVERSE_PAYMENT',{paymentId:assignedCash.paymentId,reason:'Devolución de efectivo sintética'});await financialCommand(db,f.id,1,reverse,f.root);await financialCommand(db,f.id,1,reverse,f.root);
 assert.equal((await obtenerLedgerCustodiaEfectivo(db,f.affiliateId)).efectivoPendienteRendicionCentavos,14500000);
 await affiliateSettlementCommand(db,f.affiliateId,actor,{action:'REMIT',commandId:randomUUID(),data:{amountCents:14500000,method:'EFECTIVO_EN_MANO',reference:'SYNTHETIC-REMIT',notes:''}});
 assert.equal((await obtenerLedgerCustodiaEfectivo(db,f.affiliateId)).efectivoPendienteRendicionCentavos,0);
 const before=(await financialRef(db,f.id,1).get()).data()!.revision;
 await assert.rejects(financialCommand(db,f.id,1,await make('REVERSE_PAYMENT',{paymentId:payment.paymentId,reason:'Efectivo ya rendido'}),f.root));assert.equal((await financialRef(db,f.id,1).get()).data()!.revision,before);
 await db.collection('vendedores').doc(f.affiliateId).update({activo:false});await assert.rejects(financialCommand(db,f.id,1,await make('CREDIT_PAYMENT',{...payment,paymentId:randomUUID()}),seller,'AFFILIATE'));await db.collection('vendedores').doc(f.affiliateId).update({activo:true});
 // Actual authenticated HTTP route: no token, wrong seller and transfer forbidden; receipt allowed.
 const app=initializeApp({apiKey:'demo-key',projectId:'demo-cuenta-hogar'},randomUUID()),auth=getAuth(app);connectAuthEmulator(auth,'http://127.0.0.1:9099',{disableWarnings:true});
 await signInWithCustomToken(auth,await admin.auth().createCustomToken(f.uid));const token=await auth.currentUser!.getIdToken();
 const request=(body:unknown,credential=token)=>new Request('http://localhost/financial',{method:'POST',headers:{Authorization:'Bearer '+credential,'Content-Type':'application/json'},body:JSON.stringify(body)});
 assert.equal((await financialHandler(request(await make('CREDIT_PAYMENT',{...payment,paymentId:randomUUID(),method:'TRANSFERENCIA'})),f.id,'1','AFFILIATE')).status,403);
 assert.equal((await financialHandler(request(await make('CREDIT_PAYMENT',payment),'bad'),f.id,'1','AFFILIATE')).status,403);
 const receiptResponse=await financialHandler(new Request('http://localhost/financial?receipt=receipt_'+payment.paymentId,{headers:{Authorization:'Bearer '+token}}),f.id,'1','AFFILIATE');assert.equal(receiptResponse.status,200);assert.match(receiptResponse.headers.get('content-type')!,/pdf/);await deleteApp(app);
 console.log('CASH_PAYMENT_ATOMIC_CUSTODY_ADMIN_AFFILIATE_FIFO_COMMISSIONS_REPLAY_AUTH_RECEIPT_REMIT_REVERSAL=PASS');
 if(process.env.CASH_BROWSER==='1'){
  const server=await startProductionBrowserServer(runtime),browser=await CatalogBrowser.open();
  try{
   await browser.navigate('/login');await browser.until("typeof window.__FIREBASE_SIGN_IN__==='function'",'auth');await browser.evaluate(`window.__FIREBASE_SIGN_IN__(${JSON.stringify((await admin.auth().getUser(f.uid)).email)},${JSON.stringify(password)}).then(()=>true)`);
   await browser.navigate('/afiliado');await browser.until("!!document.querySelector('[data-testid=affiliate-followup-card]')",'assigned client');await browser.click('[data-testid=affiliate-followup-card] summary');await browser.until("!!document.querySelector('[data-testid=financial-v2-status]')",'financial view');
   await browser.clickText('Registrar cobro en efectivo');assert.deepEqual(await browser.evaluate("[...document.querySelector('[data-testid=payment-form] select[name=method]').options].map(o=>o.value)"),['EFECTIVO']);
   for(const width of [1280,390,320]){await browser.command('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:width<500});await browser.evaluate("document.querySelector('[data-testid=payment-form]').scrollIntoView({block:'start'})");await browser.overflow('cash '+width);await browser.screenshot('cash-affiliate-'+width+'.png');}
   await browser.change('[aria-label="Importe acreditado"]','1000');await browser.change('[aria-label="Referencia de acreditación"]','SYNTHETIC-BROWSER-CASH');await browser.evaluate('window.confirm=()=>true');await browser.clickText('Confirmar pago acreditado');await browser.until("!!document.querySelector('[data-testid=financial-receipt]')",'receipt available after payment');assert.equal((await obtenerLedgerCustodiaEfectivo(db,f.affiliateId)).efectivoPendienteRendicionCentavos,100000);
   await browser.evaluate("(()=>{window.__cashPDF=false;window.open=()=>({location:{href:''},close(){}});const original=window.fetch.bind(window);window.fetch=async(...args)=>{const r=await original(...args);if(String(args[0]).includes('?receipt='))window.__cashPDF=r.ok&&r.headers.get('content-type').includes('application/pdf');return r;};return true;})()");await browser.clickText('Abrir / imprimir recibo X');await browser.until('window.__cashPDF===true','affiliate receipt PDF');
   await browser.navigate('/login');await browser.until("typeof window.__FIREBASE_SIGN_IN__==='function'",'admin auth');await browser.evaluate(`window.__FIREBASE_SIGN_IN__(${JSON.stringify(process.env.NEXT_PUBLIC_ADMIN_EMAIL)},${JSON.stringify(password)}).then(()=>true)`);await browser.navigate('/admin/cobranzas');await browser.until("!!document.querySelector('[data-testid=collection-row]')",'collection row');await browser.clickText('Gestionar cobranza');await browser.until("!!document.querySelector('dialog [data-testid=financial-v2-status]')",'admin payments');await browser.clickText('Registrar pago',"document.querySelector('dialog')");await browser.evaluate("(()=>{const select=document.querySelector('dialog select[name=method]');Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set.call(select,'EFECTIVO');select.dispatchEvent(new Event('change',{bubbles:true}));return true;})()");await browser.until("!!document.querySelector('dialog select[name=cashCustody]')",'custody selector');assert.deepEqual(await browser.evaluate("[...document.querySelector('dialog select[name=cashCustody]').options].map(o=>o.value)"),['ADMIN','AFFILIATE']);await browser.screenshot('cash-admin-custody.png');
   assert.deepEqual(browser.externalFirebase,[]);console.log('CASH_BROWSER_AFFILIATE_ONLY_CASH_PAYMENT_RECEIPT_ADMIN_SELECTOR_1280_390_320=PASS');
  }finally{await browser.close();await server.stop();}
 }
}
main().catch(e=>{console.error(e);process.exitCode=1;});
