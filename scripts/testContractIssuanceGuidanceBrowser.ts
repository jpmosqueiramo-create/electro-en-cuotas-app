import './helpers/requireSafeEmulatorEnvironment';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {admin} from '../src/lib/firebaseAdmin';
import {productionReadyFixture} from './helpers/productionAdapterFixtures';
import {saveLoopTariffs} from '../src/lib/loopServiceTariffsServer';
import {loopReferenceTariffs} from '../src/lib/loopServiceTariffs';
import {approvedFinalPackages} from '../src/lib/productionV2/catalog';
import {LOOP_PACKAGE_ID} from '../src/lib/productionV2/loopDocuments';
import {productionRuntimeForEmulator} from '../src/lib/productionV2/runtime';
import {contractCommand,getContract} from '../src/lib/contractV2Server';
import {productionPaths} from '../src/lib/productionV2/freeze';
import {productionRef} from '../src/lib/productionV2/authorization';
import {startProductionBrowserServer} from './helpers/productionAdapterBrowserServer';
import {CatalogBrowser} from './helpers/catalogBrowser';
async function main(){
 const db=admin.firestore(),email=process.env.NEXT_PUBLIC_ADMIN_EMAIL!,actor=(await admin.auth().createUser({email,emailVerified:true,password:'Synthetic-only-123'})).uid;
 await saveLoopTariffs(db,loopReferenceTariffs,0,actor);const f=await productionReadyFixture(actor,true,true);
 const cmd=async(action:string,data:Record<string,unknown>={})=>contractCommand(db,f.id,1,{action,commandId:randomUUID(),expectedRevision:(await f.r.draft.get()).data()!.revision,...data},actor);
 await cmd('RETURN_TO_DRAFT',{reason:'Escenario sintético de fechas y conformidad'});const d=(await f.r.draft.get()).data()!;
 const fields={personalData:d.personalData,employmentData:d.employmentData,productDetails:d.productDetails,contractPlanCuotas:12,firstInstallmentDueDate:'2026-12-05',preferredMonthlyDueDay:9,issuePlace:'Localidad sintética',loopServices:{category:'C',tariffRevision:1,otherServicesCents:0,cftAnnualPercent:null,cftBasis:'',supplierTaxId:'20123456786',notePaymentPlace:'Domicilio sintético de pago',noteDueDate:'2027-11-09',acceptanceChannel:'WHATSAPP',proposalSentAt:'2099-01-01T12:30',clientAcceptedAt:'2099-01-01T12:30'}};
 await cmd('SAVE_CONTRACT_EDITOR',fields);
 const p=approvedFinalPackages.find(p=>p.id===LOOP_PACKAGE_ID)!;assert(p);const runtime=productionRuntimeForEmulator(db,admin.auth(),[p],[actor]);
 await db.doc(productionPaths.counter).create({schemaVersion:'CONTRACT_NUMBER_COUNTER_V1',policyId:'CONTRACT_NUMBERING_V1',executionMode:'PRODUCTION',active:true,lastAllocatedSequence:'0',initializationAuthorizationReference:'SYNTHETIC_GUIDANCE_ONLY'});
 const server=await startProductionBrowserServer(runtime),browser=await CatalogBrowser.open();
 try{
  await browser.navigate('/login');await browser.until("typeof window.__FIREBASE_SIGN_IN__==='function'",'auth');await browser.evaluate(`window.__FIREBASE_SIGN_IN__(${JSON.stringify(email)},'Synthetic-only-123').then(()=>true)`);
  await browser.navigate(`/admin/operaciones/${f.id}/1?section=contract&editor=1`);
  await browser.until("!!document.querySelector('[data-testid=contract-acceptance] [aria-invalid=true]')",'precise future date warning');
  assert.equal(await browser.evaluate("document.querySelector('[data-testid=contract-acceptance]').open"),true);
  await browser.until("!!document.querySelector('[data-testid=emit-contract-pair]')",'issuance overview loaded');
  assert.equal(await browser.evaluate("document.querySelector('[data-testid=emit-contract-pair]').disabled"),true);
  for(const width of [1280,390]){await browser.command('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:width<500});await browser.evaluate("document.querySelector('[data-testid=contract-acceptance]').scrollIntoView({block:'center'})");await browser.overflow('acceptance dates '+width);await browser.screenshot('issuance-acceptance-'+width+'.png');}
  await browser.change('[aria-label="Referencia de la evidencia de conformidad"]','Respuesta sintética ACEPTO anterior a corregir fechas');await browser.clickText('Registrar conformidad recibida');
  await browser.until("document.querySelector('[data-testid=contract-review]').textContent.includes('Conformidad registrada para las condiciones y el domicilio vigentes.')",'conformity read-back');
  assert.equal((await getContract(db,f.id,1)).clientConformity?.confirmed,true);
  await browser.until("document.querySelector('[data-testid=open-editor-from-issuance]')?.disabled===false",'current issuance requirements');
  assert.equal(await browser.evaluate("document.querySelector('[data-testid=emit-contract-pair]').disabled"),true,'conformity cannot bypass future dates');
  await browser.click('[data-testid=open-editor-from-issuance]');assert.equal(await browser.evaluate("document.querySelector('[data-testid=contract-acceptance]').open"),true);
  assert.equal((await db.doc(productionPaths.counter).get()).data()!.lastAllocatedSequence,'0','navigation never issues');
  await browser.change('[aria-label="Fecha y hora de envío de la propuesta"]','2026-10-19T12:00');await browser.change('[aria-label="Fecha y hora de aceptación del cliente"]','2026-10-19T13:00');
  assert.equal(await browser.evaluate("document.querySelector('[data-testid=emit-contract-pair]').textContent"),'Emitir contrato y pagaré','unsaved is not fake processing');
  await browser.clickText('Guardar datos del contrato');await browser.until("document.querySelector('[data-testid=contract-review]').textContent.includes('Registrá la conformidad recibida')",'edited conditions need fresh conformity');
  assert.equal((await getContract(db,f.id,1)).clientConformity?.confirmed,false);
  await browser.change('[aria-label="Referencia de la evidencia de conformidad"]','Respuesta sintética ACEPTO con fechas corregidas');await browser.clickText('Registrar conformidad recibida');
  await browser.until("document.querySelector('[data-testid=emit-contract-pair]')?.disabled===false",'conformity refresh enables issue without reload');
  assert.equal((await getContract(db,f.id,1)).clientConformity?.confirmed,true);
  await browser.click('[data-testid=emit-contract-pair]');await browser.until("[...document.querySelectorAll('button')].some(b=>b.textContent==='Descargar contrato y anexos')",'issued final documents');
  assert.equal((await db.doc(productionPaths.counter).get()).data()!.lastAllocatedSequence,'1');
  assert.equal((await productionRef(db,f.id,1).collection('simpleIssuanceCommands').get()).size,1);
  assert.deepEqual(browser.externalFirebase,[]);await browser.overflow('issued mobile');await browser.screenshot('issuance-after-conformity-390.png');
  console.log('LOOP_ISSUANCE_BROWSER_FUTURE_DATES_TARGET_SAVE_INVALIDATES_CONSENT_RERECORD_REFRESH_EMIT_SINGLE_NUMBER_1280_390=PASS');
 }finally{await browser.close();await server.stop();await admin.app().delete();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
