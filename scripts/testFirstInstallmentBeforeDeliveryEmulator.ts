import './helpers/requireSafeEmulatorEnvironment';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {writeFileSync,mkdirSync} from 'node:fs';
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
import {clientBindingCommand,readClientBinding,readClientService,prepareClientActivationAtFirstPayment} from '../src/lib/operationClientV2Server';
import {deliveryCommand,readDelivery} from '../src/lib/operationDeliveryV2Server';
import {reopenBeforeSignature} from '../src/lib/productionV2/documentRevision';
import {revokeAuthorization} from '../src/lib/productionV2/authorization';
import {issuedOperation} from '../src/lib/productionV2/documents';
import {startProductionBrowserServer} from './helpers/productionAdapterBrowserServer';
import {CatalogBrowser} from './helpers/catalogBrowser';
const results:string[]=[];const pass=(name:string)=>{results.push(name);console.log(name+' = PASS');};
async function main(){
 const db=admin.firestore(),password='Emulator-only-123',actor=(await admin.auth().createUser({email:process.env.NEXT_PUBLIC_ADMIN_EMAIL,password,emailVerified:true})).uid;
 const p=approvedFinalPackages[0],runtime=productionRuntimeForEmulator(db,admin.auth(),[p],[actor]),bucket=await getBudgetDocumentationBucket(),f=await productionReadyFixture(actor,true,true);
 await db.doc(productionPaths.counter).create({schemaVersion:'CONTRACT_NUMBER_COUNTER_V1',policyId:'CONTRACT_NUMBERING_V1',executionMode:'PRODUCTION',active:true,lastAllocatedSequence:'0',initializationAuthorizationReference:'SYNTHETIC_ONLY'});
 const input=(action:string,data:Record<string,unknown>,rev=0)=>({action,data,commandId:randomUUID(),expectedRevision:rev,operationId:f.identity.operationId});
 const payment={paymentId:randomUUID(),amountCents:14500000,effectiveDate:argentinaBusinessDate(),method:'TRANSFERENCIA',reference:'SYNTHETIC-FIRST-INSTALLMENT'};
 await assert.rejects(financialCommand(db,f.id,1,input('ACTIVATE_WITH_FIRST_PAYMENT',payment),f.root));assert.equal((await financialRef(db,f.id,1).get()).exists,false);pass('UNISSUED_OPERATION_CANNOT_ACTIVATE');
 const d=(await f.r.draft.get()).data()!;
 await issuePreparedOperation(runtime,bucket,f.id,1,{commandId:randomUUID(),expectedRevision:d.revision,packageId:p.id,packageHash:p.sha256,formal:{contractIssueDate:argentinaBusinessDate(),contractIssuePlace:'Localidad sintética',promissoryNoteIssueDate:argentinaBusinessDate(),promissoryNoteIssuePlace:'Localidad sintética',...syntheticOriginalFormal},confirmed:true},actor);
 const client=(await admin.auth().createUser({email:'first-payment-client@example.test',password,emailVerified:true})).uid;
 const unlinked=await db.runTransaction(tx=>prepareClientActivationAtFirstPayment(db,tx,f.id,1,actor,randomUUID(),new Date().toISOString()));assert.equal(unlinked.status,'ACCOUNT_LINK_REQUIRED');
 const binding=await readClientBinding(db,f.id,1,actor);await clientBindingCommand(db,f.id,1,{commandId:randomUUID(),operationId:f.identity.operationId,expectedRevision:binding.state.revision,action:'LINK',data:{uid:client,reason:'Cuenta sintética independiente'}},actor);
 await assert.rejects(financialCommand(db,f.id,1,input('ACTIVATE_WITH_FIRST_PAYMENT',payment),{uid:client,admin:false}));await assert.rejects(financialCommand(db,f.id,1,input('ACTIVATE_WITH_FIRST_PAYMENT',payment),{uid:f.uid,admin:false}));
 await assert.rejects(financialCommand(db,f.id,1,{...input('ACTIVATE_WITH_FIRST_PAYMENT',payment),operationId:'op_'+'0'.repeat(64)},f.root));
 await assert.rejects(financialCommand(db,f.id,1,input('ACTIVATE_WITH_FIRST_PAYMENT',{...payment,amountCents:1}),f.root));
 await assert.rejects(financialCommand(db,f.id,1,input('ACTIVATE_WITH_FIRST_PAYMENT',{...payment,effectiveDate:'2020-01-01'}),f.root));
 assert.equal((await financialRef(db,f.id,1).get()).exists,false);pass('ADMIN_ONLY_CORRECT_OPERATION_AMOUNT_AND_DATE_ATOMIC_REJECTION');
 const server=await startProductionBrowserServer(runtime),browser=await CatalogBrowser.open();
 try{
  await browser.command('Emulation.setDeviceMetricsOverride',{width:1280,height:900,deviceScaleFactor:1,mobile:false});
  await browser.navigate('/login');await browser.until("typeof window.__FIREBASE_SIGN_IN__==='function'",'Auth');await browser.evaluate(`window.__FIREBASE_SIGN_IN__(${JSON.stringify(process.env.NEXT_PUBLIC_ADMIN_EMAIL)},${JSON.stringify(password)}).then(()=>true)`);
  await browser.navigate(`/admin/operaciones/${f.id}/1?section=logistics`);await browser.until("!!document.querySelector('[data-testid=first-installment-payment] button:not(:disabled)')",'first payment available before signature');
  await browser.until("!!document.querySelector('[data-testid=delivery-guided-actions]')",'guided delivery controls loaded');
  assert.equal(await browser.evaluate("document.body.innerText.includes('Entrega productiva V2 bloqueada')"),false);
  await browser.clickText('Usar mandato emitido y registrar firma');
  await browser.until("document.body.innerText.includes('Registrar firma del mandato')",'issued mandate prepared by guided action');
  await browser.evaluate("document.querySelector('[data-testid=delivery-guided-actions]').scrollIntoView({block:'start'})");await browser.screenshot('delivery-guided-desktop.png');
  await browser.command('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});await browser.screenshot('delivery-guided-mobile.png');await browser.overflow('guided delivery mobile');
  await browser.command('Emulation.setDeviceMetricsOverride',{width:1280,height:900,deviceScaleFactor:1,mobile:false});

  await browser.evaluate("document.querySelector('[data-testid=first-installment-payment]').scrollIntoView({block:'start'})");await browser.screenshot('first-payment-desktop.png');await browser.overflow('first payment desktop');
  await browser.command('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});await browser.screenshot('first-payment-mobile.png');await browser.overflow('first payment mobile');
  await browser.change('[aria-label="Referencia primera cuota"]','SYNTHETIC-BROWSER-FIRST-PAYMENT');
  await browser.evaluate('window.confirm=()=>true');await browser.clickText('Confirmar primera cuota recibida');
  await browser.until("!!document.querySelector('[data-testid=financial-v2-status]')",'atomic first payment');
  assert.equal((await readClientBinding(db,f.id,1,actor)).state.state,'ACTIVE');
  const event=(await financialRef(db,f.id,1).collection('events').get()).docs[0].data(),replayCommand={action:event.action,data:event.data,commandId:event.commandId,expectedRevision:event.expectedRevision,operationId:f.identity.operationId};
  const retry=await Promise.all([financialCommand(db,f.id,1,replayCommand,f.root),financialCommand(db,f.id,1,replayCommand,f.root)]);assert(retry.every(r=>r.replay));assert.equal((await financialRef(db,f.id,1).collection('payments').get()).size,1);pass('FIRST_PAYMENT_RETRY_AFTER_RESPONSE_LOSS_NO_SECOND_PLAN_PAYMENT_OR_PORTAL_ACTIVATION');
  await browser.evaluate("document.querySelector('[data-testid=financial-v2]').scrollIntoView({block:'start'})");await browser.screenshot('first-payment-active-mobile.png');
  assert.deepEqual(browser.externalFirebase,[]);pass('BROWSER_DESKTOP_MOBILE_FIRST_PAYMENT_BEFORE_SIGNATURE_AND_PORTAL_ACTIVATION');
  for(const [uid,role] of [[actor,'ADMIN'],[f.uid,'AFFILIATE'],[client,'CLIENT']] as const){const view=await readFinancial(db,f.id,1,{uid,admin:role==='ADMIN'},role);assert(view.active);assert.equal(view.totalCents,174000000);assert.equal(view.paidCents,14500000);assert.equal(view.balanceCents,159500000);assert.equal(view.installments.length,12);assert.equal(view.installments[0].status,'PAGADA');assert.equal(view.pendingInstallmentCount,11);}
  // The two independent accounts use the actual portal routes, never role simulation.
  for(const [email,path,label] of [[(await admin.auth().getUser(f.uid)).email!,'/afiliado','affiliate'],['first-payment-client@example.test','/cliente','client']] as const){
   await browser.evaluate(`window.__FIREBASE_SIGN_IN__(${JSON.stringify(email)},${JSON.stringify(password)}).then(()=>true)`);
   await browser.navigate(path);await browser.until("!!document.querySelector('[data-testid=financial-v2-status]')",label+' financial portal');
   assert.equal(await browser.evaluate("document.querySelector('[data-testid=financial-v2]').innerText.includes('1.595.000')"),true);
   assert.equal(await browser.evaluate("document.querySelector('[data-testid=first-installment-payment]')===null"),true);
   await browser.command('Emulation.setDeviceMetricsOverride',{width:1280,height:900,deviceScaleFactor:1,mobile:false});await browser.evaluate("document.querySelector('[data-testid=financial-v2]').scrollIntoView({block:'start'})");await browser.screenshot('first-payment-'+label+'-desktop.png');
   await browser.command('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});await browser.screenshot('first-payment-'+label+'-mobile.png');await browser.overflow(label+' financial mobile');
  }
  pass('REAL_INDEPENDENT_CLIENT_AND_AFFILIATE_BROWSER_SESSIONS');
 }finally{await browser.close();await server.stop();}
 pass('THREE_ROLES_SAME_SNAPSHOT_12_INSTALLMENTS_AND_BALANCE');
 const state=(await financialRef(db,f.id,1).get()).data()!,payments=await financialRef(db,f.id,1).collection('payments').get();assert.equal(payments.size,1);assert.equal(state.deliveryCommandId,null);assert.equal(state.activationBasis.policy,'FIRST_PAYMENT_BEFORE_DELIVERY_V1');
 assert.equal((await readDelivery(db,f.id,1,f.root)).state.status,'PREPARING');assert.equal((await readDelivery(db,f.id,1,f.root)).state.documents.MANDATE.signature,null);assert(!(await readDelivery(db,f.id,1,f.root)).state.externalReceipt);
 await assert.rejects(deliveryCommand(db,f.id,1,{commandId:randomUUID(),action:'CONFIRM_DELIVERY',expectedRevision:(await readDelivery(db,f.id,1,f.root)).state.revision,operationId:f.identity.operationId,data:{occurredAt:new Date().toISOString()}},f.root));
 const proof=await db.runTransaction(tx=>issuedOperation(runtime,tx,f.id,1,'FINANCE',false));await assert.rejects(reopenBeforeSignature(runtime,f.id,1,{commandId:randomUUID(),expectedRevision:(await f.r.draft.get()).data()!.revision,snapshotHash:proof.snapshot.integrity.payloadHash,reason:'No reemplazar con pagos',confirmed:true},actor));pass('PAYMENT_DOES_NOT_FAKE_SIGNATURE_DELIVERY_OR_ALLOW_DOCUMENT_REPLACEMENT');
 await assert.rejects(financialCommand(db,f.id,1,input('ACTIVATE_WITH_FIRST_PAYMENT',{...payment,paymentId:randomUUID()},state.revision),f.root));assert.equal((await financialRef(db,f.id,1).collection('payments').get()).size,1);
 const paid=payments.docs[0].data(),reverse=input('REVERSE_PAYMENT',{paymentId:paid.id,reason:'Reversa sintética'},state.revision);const reversed=await Promise.all([financialCommand(db,f.id,1,reverse,f.root),financialCommand(db,f.id,1,reverse,f.root)]);assert.equal(reversed.filter(x=>!x.replay).length,1);
 let view=await readFinancial(db,f.id,1,f.root,'ADMIN');assert(view.active);assert.equal(view.balanceCents,174000000);assert.equal(view.paidCents,0);assert.equal(view.installments.length,12);pass('NO_SECOND_ACTIVATION_AND_CONCURRENT_REVERSAL_RESTORES_ORIGINAL_BALANCE');
 const next=input('CREDIT_PAYMENT',{...payment,paymentId:randomUUID()},view.revision),pair=await Promise.all([financialCommand(db,f.id,1,next,f.root),financialCommand(db,f.id,1,next,f.root)]);assert.equal(pair.filter(x=>!x.replay).length,1);assert.equal((await financialRef(db,f.id,1).collection('payments').get()).size,2);const commissionRows=await db.collection('ledger_comisiones_movimientos').where('operationId','==',f.identity.operationId).get();assert.equal(commissionRows.size,3);assert.equal(commissionRows.docs.reduce((n,d)=>n+Number(d.data().montoComisionCentavos),0),1450000);pass('CONCURRENT_PAYMENT_AND_RETRY_SINGLE_RECEIPT_COMMISSION_LEDGER_UNCHANGED');
 assert.equal((await readClientService(db,f.id,1,client)).financialInformationAvailable,true);await assert.rejects(readFinancial(db,f.id,1,{uid:f.uid2,admin:false},'AFFILIATE'));await assert.rejects(readFinancial(db,f.id,1,{uid:f.uid2,admin:false},'CLIENT'));pass('CLIENT_AND_AFFILIATE_ISOLATION');
 const active=await readClientBinding(db,f.id,1,actor);await clientBindingCommand(db,f.id,1,{commandId:randomUUID(),operationId:f.identity.operationId,expectedRevision:active.state.revision,action:'REVOKE_ACCESS',data:{reason:'Revocación sintética'}},actor);await assert.rejects(readFinancial(db,f.id,1,{uid:client,admin:false},'CLIENT'));const revokedPortal=await db.runTransaction(tx=>prepareClientActivationAtFirstPayment(db,tx,f.id,1,actor,randomUUID(),new Date().toISOString()));assert.equal(revokedPortal.status,'REVOKED');assert.equal((await readClientBinding(db,f.id,1,actor)).state.state,'REVOKED');pass('CLIENT_REVOCATION_EFFECTIVE_NEVER_AUTO_REACTIVATED');
 mkdirSync('/tmp/ch-first-payment',{recursive:true});const receipt=await readFinancialReceipt(db,f.id,1,f.root,'ADMIN','receipt_'+next.data.paymentId);writeFileSync('/tmp/ch-first-payment/recibo.pdf',financialReceiptPdf(receipt));
 await bucket.file(proof.manifest.documents.PAGARE.path).save(Buffer.from('SUSTITUCION SINTETICA'),{resumable:false});view=await readFinancial(db,f.id,1,f.root,'ADMIN');assert(view.active);await assert.rejects(financialCommand(db,f.id,1,input('CREDIT_PAYMENT',{...payment,paymentId:randomUUID()},view.revision),f.root));pass('ALTERED_ISSUED_PDF_BLOCKS_NEW_PAYMENTS');
 await revokeAuthorization(runtime,f.id,1,{commandId:randomUUID(),authorizationId:proof.authorization.id,reason:'Revocación sintética'},actor);await assert.rejects(financialCommand(db,f.id,1,input('CREDIT_PAYMENT',{...payment,paymentId:randomUUID()},view.revision),f.root));pass('AUTHORIZATION_REVOCATION_BLOCKS_PAYMENTS');
 assert.equal((await db.doc(productionPaths.counter).get()).data()!.lastAllocatedSequence,'1');writeFileSync('/tmp/ch-first-payment/results.json',JSON.stringify({results,operationId:f.identity.operationId,productionWrites:0},null,2));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
