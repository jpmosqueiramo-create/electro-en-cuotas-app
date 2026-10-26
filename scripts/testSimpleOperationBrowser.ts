import './helpers/requireSafeEmulatorEnvironment';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdirSync,writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import { randomUUID } from 'node:crypto';
import { admin } from '../src/lib/firebaseAdmin';
import { fixture,addressPayload } from './testContractV2';
import { acceptBudgetV2 } from '../src/lib/budgetAcceptanceV2Server';
import { contractRefs,publicContractData } from '../src/lib/contractV2Server';
import { CatalogBrowser } from './helpers/catalogBrowser';
import { adminEmail,adminPassword } from './helpers/adminSolicitudesFixtures';

async function main(){
 assert.equal(process.env.GCLOUD_PROJECT,'demo-cuenta-hogar');
 await new Promise<void>((resolve,reject)=>{const probe=createServer();probe.once('error',reject);probe.listen(3000,'localhost',()=>probe.close(()=>resolve()));});
 const id='simple-'+randomUUID(),{b}=fixture(id),refs=contractRefs(admin.firestore(),id,1);
 b.clienteSnapshot.nombre=addressPayload.personalData.fullName;b.clienteSnapshot.dni=addressPayload.personalData.dni;
 await refs.family.create({sourceCollection:b.sourceCollection,solicitudId:b.solicitudId,lastVersion:1});await refs.budget.create(b);await acceptBudgetV2(admin.firestore(),{budgetId:id,version:1,acceptedOptionId:'option-1',preferredPlanCuotas:12,commandId:'accept'},'synthetic-admin');
 try{const u=await admin.auth().getUserByEmail(adminEmail);await admin.auth().updateUser(u.uid,{password:adminPassword,emailVerified:true});}catch{await admin.auth().createUser({email:adminEmail,password:adminPassword,emailVerified:true});}
 const env:NodeJS.ProcessEnv={...process.env,NODE_ENV:'development',NEXT_PUBLIC_ADMIN_EMAIL:adminEmail,NEXT_PUBLIC_FIREBASE_PROJECT_ID:'demo-cuenta-hogar',NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN:'demo-cuenta-hogar.firebaseapp.com',NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET:'demo-cuenta-hogar.appspot.com',NEXT_PUBLIC_FIREBASE_API_KEY:'demo-key',NEXT_PUBLIC_FIREBASE_APP_ID:'demo-app',NEXT_PUBLIC_E2E_TEST_MODE:'1',NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST:'127.0.0.1:9099'};
 const server=spawn(process.execPath,['node_modules/next/dist/bin/next','dev','--webpack','--hostname','localhost','--port','3000'],{env,stdio:'inherit'});
 let browser:CatalogBrowser|undefined;const dir='/tmp/cuenta-hogar-simple-operation';mkdirSync(dir,{recursive:true});
 try{
  let ready=false;for(let i=0;i<120;i++){if(server.exitCode!==null)throw Error('NEXT_EXITED');try{if((await fetch('http://localhost:3000/login',{signal:AbortSignal.timeout(3000)})).ok){ready=true;break;}}catch{/* Next is still starting. */}await new Promise(r=>setTimeout(r,500));}assert.ok(ready);
  browser=await CatalogBrowser.open();const page=browser;
  await page.navigate('/login');await page.until("typeof window.__FIREBASE_SIGN_IN__==='function'",'Auth');await page.evaluate(`window.__FIREBASE_SIGN_IN__(${JSON.stringify(adminEmail)},${JSON.stringify(adminPassword)}).then(()=>true)`);
  const path=`/admin/operaciones/${id}/1`;
  async function step(key:string){await page.click(`[data-testid=operation-step-${key}]`);await page.until(`document.querySelector('[data-testid=operation-step-${key}]')?.getAttribute('aria-current')==='step'`,'selected '+key);}
  async function capture(name:string){await page.evaluate("document.querySelector('[data-testid=operation-unified-workspace]').scrollIntoView({block:'start'})");await page.evaluate('document.fonts.ready.then(()=>true)');const shot=await page.command('Page.captureScreenshot',{format:'png'});writeFileSync(`${dir}/${name}.png`,Buffer.from(shot.data as string,'base64'));}
  await page.navigate(path);await page.until("!!document.querySelector('[data-testid=operation-unified-workspace]')",'first navigation');
  assert.equal((await refs.draft.get()).exists,false,'Opening performs no draft creation');
  assert.equal(await page.evaluate("document.querySelector('[data-testid=operation-step-documents]').getAttribute('aria-current')"),'step');
  await step('client');await page.clickText('Preparar borrador contractual');await page.until("!!document.querySelector('[data-testid=contract-composer]')",'explicit preparation');
  const original=JSON.stringify((await refs.budget.get()).data());
  await page.until("document.querySelector('[data-testid=contract-request]')?.disabled===false",'draft creation completed');
  await page.clickText('Solicitar datos personales y laborales');await page.until("!!document.querySelector('[data-testid=client-open-link]')",'private link');
  const link=new URL(await page.evaluate<string>("document.querySelector('[data-testid=client-open-link]').href"));
  const before=await refs.draft.get();
  await publicContractData(admin.firestore(),link.pathname.split('/').pop()!,link.hash.slice(1),{personalData:addressPayload.personalData,employmentData:addressPayload.employmentData});
  await page.until("document.querySelector('[data-testid=contract-request]')?.disabled===false",'request completed');
  await page.clickText('Actualizar datos recibidos');await page.until("!!document.querySelector('[data-testid=client-data-review]')",'received data');
  await page.until("document.querySelector('[data-testid=contract-request]')?.disabled===false",'refresh completed');
  const applying=page.clickText('Aplicar datos recibidos');await page.delay(200);await page.command('Page.handleJavaScriptDialog',{accept:true});await applying;
  await page.until("document.querySelector('[data-testid=contract-personal] input[name=address]')?.value==='"+addressPayload.personalData.address+"'",'applied correct operation');
  await page.until("document.querySelector('[data-testid=contract-request]')?.disabled===false",'apply completed');
  assert.ok((await refs.draft.get()).data()!.revision>before.data()!.revision);
  const persisted=JSON.stringify((await refs.draft.get()).data());
  // Unsaved local data survives navigation but does not leak into persisted documents.
  await page.evaluate("document.querySelector('[data-testid=contract-personal]').open=true");await page.change('[data-testid=contract-personal] input[name=address]','BORRADOR LOCAL SIN GUARDAR');
  await step('contract');await page.until("document.querySelector('[data-testid=contract-economics]')!==null",'terms');
  await page.evaluate("document.querySelector('[data-testid=contract-economics]').open=true");
  await page.until("document.querySelector('[data-testid=contract-credit-gate]')?.innerText.includes('Pendiente')",'credit gate');
  assert.equal(await page.evaluate("document.querySelector('[aria-label=\"Plan contractual definitivo\"]')"),null,'No definitive terms before approval');
  const pendingData=await page.evaluate<boolean>("document.querySelector('[data-testid=contract-credit-gate]')?.innerText.includes('Revisar datos pendientes')===true");
  await page.clickText(pendingData?'Revisar datos pendientes':'Ir a documentación y evaluación');await page.until("document.querySelector('[data-testid=operation-step-"+(pendingData?'client':'documents')+"]').getAttribute('aria-current')==='step'",'cross-step pending link matches missing data');
  await step('client');
  assert.equal(await page.evaluate("document.querySelector('[data-testid=contract-personal] input[name=address]').value"),'BORRADOR LOCAL SIN GUARDAR');
  for(const width of [1280,390]){
   await page.command('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:width===390});
   for(const key of ['documents','client','contract','logistics']){
    await step(key);
    if(key==='documents')await page.until("!!document.querySelector('[data-testid=credit-review] [role=status]')&&!!document.querySelector('[data-testid=documentation-panel]')",'documentation loaded');
    if(key==='logistics')await page.until("!!document.querySelector('[data-testid=fulfillment-status]')&&!!document.querySelector('[data-testid=delivery-v2-state]')",'logistics loaded');
    await page.overflow(`${key}-${width}`);await capture(`${key}-${width}`);
    await page.evaluate("document.querySelector('[data-testid=operation-unified-workspace] > section').scrollIntoView({block:'start'})");const panelShot=await page.command('Page.captureScreenshot',{format:'png'});writeFileSync(`${dir}/${key}-panel-${width}.png`,Buffer.from(panelShot.data as string,'base64'));
    assert.equal(await page.evaluate("document.querySelectorAll('[aria-label=\"Pasos de la operación\"] button').length"),4);
    assert.equal(await page.evaluate("document.querySelectorAll('[data-testid=operation-header-actions] > button.btn-primary').length"),1,'single primary header action');
    if(key==='client')assert.equal(await page.evaluate("[...document.querySelectorAll('[data-testid=contract-request]')].filter(e=>e.getClientRects().length).length"),1);
    if(key==='contract')assert.equal(await page.evaluate("[...document.querySelectorAll('details')].find(e=>e.querySelector('summary')?.textContent==='Autorizaciones y preparación para emisión').open"),false);
   }
  }
  assert.equal(JSON.stringify((await refs.draft.get()).data()),persisted,'Navigation creates no writes');assert.equal(JSON.stringify((await refs.budget.get()).data()),original,'Accepted budget unchanged');
  await step('client');assert.equal(await page.evaluate("document.querySelector('[data-testid=contract-personal] input[name=address]').value"),'BORRADOR LOCAL SIN GUARDAR');
  await page.navigate(path+'?section=contract');await page.until("document.querySelector('[data-testid=operation-step-contract]')?.getAttribute('aria-current')==='step'",'old contract link');
  await page.clickText('Revisar sección',"document.querySelector('[data-testid=contract-document-preparation]')");await page.until("document.querySelector('[data-testid=operation-step-client]').getAttribute('aria-current')==='step'",'preparation link to client');
  await page.navigate(path+'?section=logistics');await page.until("document.querySelector('[data-testid=operation-step-logistics]')?.getAttribute('aria-current')==='step'",'old logistics link');
  assert.equal(await page.evaluate("[...document.querySelectorAll('a')].find(a=>a.textContent==='Volver a solicitud').getAttribute('href')"),`/admin/solicitudes/${b.sourceCollection}/${b.solicitudId}`);
  await page.evaluate("[...document.querySelectorAll('details')].find(e=>e.querySelector('summary')?.textContent==='Más opciones de la operación').open=true");
  await page.clickText('Vendedor afiliado');await page.until("!!document.querySelector('[data-testid=custody-admin]')",'affiliate retained');
  await page.clickText('Cuotas y pagos');await page.until("!!document.querySelector('[data-testid=financial-v2]')",'payments retained');
  await page.clickText('Presupuesto aceptado');await page.until("document.body.innerText.includes('Opción aceptada')",'budget retained');
  assert.equal(JSON.stringify((await refs.draft.get()).data()),persisted,'Secondary navigation creates no writes');
  assert.deepEqual(page.externalFirebase,[]);
  writeFileSync(`${dir}/results.json`,JSON.stringify({result:'PASS',project:'demo-cuenta-hogar',widths:[1280,390],operation:id,cases:['first load without write','explicit draft','private form link','received submission applied','four steps','single primary action','unsaved data retained','credit gate','cross-step links','legacy URLs','secondary budget/affiliate/payments','no navigation writes','accepted snapshot unchanged','no external Firebase']},null,2));console.log('SIMPLE_OPERATION_BROWSER = PASS');
 }finally{await browser?.close();server.kill('SIGTERM');if(server.exitCode===null&&server.signalCode===null)await new Promise<void>(r=>server.once('close',()=>r()));await admin.app().delete();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
