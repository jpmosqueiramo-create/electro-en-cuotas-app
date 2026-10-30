import './helpers/requireSafeEmulatorEnvironment';
import assert from 'node:assert/strict';
import {AUTOMATIC_CFT_POLICY,AUTOMATIC_CFT_BASIS} from '../src/lib/loopContractDisclosure';
import {randomUUID} from 'node:crypto';
import {mkdirSync,writeFileSync} from 'node:fs';
import {admin} from '../src/lib/firebaseAdmin';
import {productionReadyFixture} from './helpers/productionAdapterFixtures';
import {saveLoopTariffs,readLoopTariffs} from '../src/lib/loopServiceTariffsServer';
import {loopReferenceTariffs} from '../src/lib/loopServiceTariffs';
import {approvedFinalPackages} from '../src/lib/productionV2/catalog';
import {LOOP_PACKAGE_ID} from '../src/lib/productionV2/loopDocuments';
import {productionRuntimeForEmulator} from '../src/lib/productionV2/runtime';
import {contractCommand,getContract} from '../src/lib/contractV2Server';
import {productionPaths} from '../src/lib/productionV2/freeze';
import {issueContractEditor} from '../src/lib/productionV2/simpleIssuance';
import {getBudgetDocumentationBucket} from '../src/lib/budgetDocumentationStorage';
import {startProductionBrowserServer} from './helpers/productionAdapterBrowserServer';
import {CatalogBrowser} from './helpers/catalogBrowser';
import {readIssuedDocument} from '../src/lib/productionV2/documents';
async function main(){
 const db=admin.firestore(),actor=(await admin.auth().createUser({email:process.env.NEXT_PUBLIC_ADMIN_EMAIL!,emailVerified:true,password:'Synthetic-only-123'})).uid;
 const config=await saveLoopTariffs(db,loopReferenceTariffs,0,actor);assert.equal(config.revision,1);await assert.rejects(saveLoopTariffs(db,loopReferenceTariffs,0,actor),/otra sesión/);
 const f=await productionReadyFixture(actor,true,true);
 const cmd=async(action:string,data:Record<string,unknown>={})=>contractCommand(db,f.id,1,{action,commandId:randomUUID(),expectedRevision:(await f.r.draft.get()).data()!.revision,...data},actor);
 await cmd('RETURN_TO_DRAFT',{reason:'Prueba sintética del nuevo paquete'});
 const d=(await f.r.draft.get()).data()!;
 const fields={personalData:d.personalData,employmentData:d.employmentData,productDetails:d.productDetails,contractPlanCuotas:12,firstInstallmentDueDate:'2026-12-05',preferredMonthlyDueDay:9,issuePlace:'Localidad sintética',loopServices:{category:'C',tariffRevision:1,otherServicesCents:0,cftAnnualPercent:321.123,cftBasis:'CFT SINTETICO: no es validación fiscal ni legal',supplierTaxId:'20123456786',notePaymentPlace:'Domicilio sintético de pago',noteDueDate:'2027-11-09',acceptanceChannel:'WHATSAPP',proposalSentAt:'2026-10-19T12:00',clientAcceptedAt:'2026-10-19T13:00'}};
 const saved=await cmd('SAVE_CONTRACT_EDITOR',fields);assert.equal(saved.draft.commercialPreparation!.loop!.serviceGrossCents,19000000);
 const auto=saved.draft.commercialPreparation!.loop!;assert.equal(auto.cftPolicy,AUTOMATIC_CFT_POLICY);assert.equal(auto.cftBasis,AUTOMATIC_CFT_BASIS);assert.notEqual(auto.cftAnnualPercent,321.123);assert.equal(auto.cftCalculation!.baseCents,auto.cashPriceCents-auto.tariff.managementCents);assert.equal(auto.cftCalculation!.chargesCents,auto.financeGrossCents+auto.tariff.managementCents);
 assert.equal((await getContract(db,f.id,1)).clientConformity?.confirmed,false);
 // Concurrent global tariff edits cannot silently change an already prepared operation.
 await saveLoopTariffs(db,{...loopReferenceTariffs,C:{...loopReferenceTariffs.C,deliveryCents:12000000}},1,actor);
 const preserved=await cmd('SAVE_CONTRACT_EDITOR',fields);assert.equal(preserved.draft.commercialPreparation!.loop!.serviceGrossCents,19000000);assert.equal((await readLoopTariffs(db)).revision,2);
 await cmd('RECORD_CLIENT_CONFORMITY',{evidence:'Respuesta WhatsApp sintética conservada. No es aceptación de un cliente real.'});
 const p=approvedFinalPackages.find(x=>x.id===LOOP_PACKAGE_ID)!;assert(p);
 const runtime=productionRuntimeForEmulator(db,admin.auth(),[p],[actor]),bucket=await getBudgetDocumentationBucket();
 await db.doc(productionPaths.counter).create({schemaVersion:'CONTRACT_NUMBER_COUNTER_V1',policyId:'CONTRACT_NUMBERING_V1',executionMode:'PRODUCTION',active:true,lastAllocatedSequence:'0',initializationAuthorizationReference:'SYNTHETIC_ONLY'});
 const request={commandId:randomUUID(),expectedRevision:(await f.r.draft.get()).data()!.revision,confirmed:true};
 const result=await issueContractEditor(runtime,bucket,f.id,1,request,actor);assert.equal(result.contractNumber,'CH-000001');
 assert.equal((await issueContractEditor(runtime,bucket,f.id,1,request,actor)).replay,true);assert.equal((await db.doc(productionPaths.counter).get()).data()!.lastAllocatedSequence,'1');
 mkdirSync('/tmp/loop-v2-review',{recursive:true});for(const kind of ['MANDATE','PAGARE'] as const){const bytes=await readIssuedDocument(runtime,bucket,f.id,1,kind,actor);assert(bytes.length>1000);writeFileSync(`/tmp/loop-v2-review/${kind.toLowerCase()}-synthetic.pdf`,bytes);}
 const isolated=await productionReadyFixture(actor,true,true);await assert.rejects(issueContractEditor(runtime,bucket,isolated.id,1,{commandId:randomUUID(),expectedRevision:isolated.ready.revision,confirmed:true},actor));
 if(process.env.LOOP_BROWSER==='1'){
  const latest=(await isolated.r.draft.get()).data()!;
  await contractCommand(db,isolated.id,1,{action:'RETURN_TO_DRAFT',commandId:randomUUID(),expectedRevision:latest.revision,reason:'Edición sintética UI'},actor);
  await contractCommand(db,isolated.id,1,{action:'SAVE_CONTRACT_EDITOR',commandId:randomUUID(),expectedRevision:(await isolated.r.draft.get()).data()!.revision,...fields,loopServices:{...fields.loopServices,tariffRevision:2}},actor);
  const server=await startProductionBrowserServer(runtime),browser=await CatalogBrowser.open();
  try{
   assert.equal((await fetch('http://localhost:3000/api/admin/catalogo/tarifas-servicios')).status,401);
   await browser.command('Emulation.setDeviceMetricsOverride',{width:1280,height:900,deviceScaleFactor:1,mobile:false});
   await browser.navigate('/login');await browser.until("typeof window.__FIREBASE_SIGN_IN__==='function'",'Emulator auth');
   await browser.evaluate(`window.__FIREBASE_SIGN_IN__(${JSON.stringify(process.env.NEXT_PUBLIC_ADMIN_EMAIL)},'Synthetic-only-123').then(()=>true)`);
   await browser.navigate('/admin/productos');await browser.until("!!document.querySelector('[data-testid=loop-service-tariffs] input')",'Tariff configuration');
   await browser.evaluate("document.querySelector('[data-testid=loop-service-tariffs]').open=true");
   await browser.change('[data-testid=loop-service-tariffs] input','41000');await browser.clickText('Guardar tarifas de categorías');
   await browser.until("document.querySelector('[data-testid=loop-service-tariffs]').innerText.includes('Tarifas guardadas')",'Tariff save response');
   assert.equal((await readLoopTariffs(db)).tariffs!.A.managementCents,4100000);
   await browser.screenshot('loop-tariffs-1280.png');await browser.overflow('catalog tariffs desktop');
   await browser.command('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});await browser.screenshot('loop-tariffs-390.png');await browser.overflow('catalog tariffs mobile');
   await browser.navigate(`/admin/operaciones/${isolated.id}/1?section=contract&editor=1`);await browser.until("!!document.querySelector('[data-testid=contract-unified-editor]')",'Contract editor');
   await browser.until("document.body.innerText.includes('Amortización por fechas reales')",'Live breakdown');
   assert.equal(await browser.evaluate("document.body.innerText.includes('40% del excedente')"),false);
   assert.equal(await browser.evaluate("document.querySelector('[aria-label=\"CFT efectivo anual automático (%)\"]').readOnly"),true);
   const cftBefore=(await isolated.r.draft.get()).data()!.commercialPreparation.loop.cftAnnualPercent;
   await browser.evaluate("document.querySelector('[aria-label=\"CFT efectivo anual automático (%)\"]').scrollIntoView({block:'center'})");await browser.screenshot('automatic-cft-390.png');await browser.overflow('automatic CFT mobile');
   assert.equal(await browser.evaluate("document.querySelector('[aria-label=\"CFT efectivo anual automático (%)\"]').value"),cftBefore.toLocaleString('es-AR',{maximumFractionDigits:6}));
   await browser.evaluate("document.querySelector('[data-testid=contract-editor-economics]').scrollIntoView({block:'start'})");await browser.screenshot('loop-contract-390.png');await browser.overflow('contract mobile');
   const before=(await isolated.r.draft.get()).data()!;
   await browser.change('[aria-label="Lugar de emisión"]','Localidad sintética UI');await browser.clickText('Guardar datos del contrato');await browser.until("document.body.innerText.includes('Cambios guardados.')",'Save complete contract breakdown');
   const after=(await isolated.r.draft.get()).data()!;assert.equal(after.revision,before.revision+1);assert.equal(after.commercialPreparation.loop.serviceGrossCents,21000000);assert.equal(after.commercialPreparation.loop.tariffRevision,2);assert.equal(after.economicTerms.contractTotal,before.economicTerms.contractTotal);
   await browser.command('Emulation.setDeviceMetricsOverride',{width:1280,height:900,deviceScaleFactor:1,mobile:false});await browser.screenshot('loop-contract-1280.png');await browser.overflow('contract desktop');
   assert.equal(browser.externalFirebase.length,0);assert.equal(browser.storageWrites,0);
   console.log('LOOP_BROWSER_ADMIN_TARIFFS_CONTRACT_SAVE_SYNC_1280_390_NO_EXTERNAL_FIREBASE = PASS');
  }finally{await browser.close();await server.stop();}
 }
 console.log('LOOP_EMULATOR_TARIFF_HISTORY_STALE_CONSENT_FINAL_PACKAGE_PRINTABLE_PDF_IDEMPOTENT_CH = PASS');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
