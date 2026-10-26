import './helpers/requireSafeEmulatorEnvironment';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdirSync,writeFileSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
import {admin} from '../src/lib/firebaseAdmin';
import {fixture} from './testContractV2';
import {acceptBudgetV2} from '../src/lib/budgetAcceptanceV2Server';
import {contractCommand,contractRefs} from '../src/lib/contractV2Server';
import {administrativeRecordRef} from '../src/lib/adminRecordRemovalServer';
import {CatalogBrowser} from './helpers/catalogBrowser';
import {adminEmail,adminPassword} from './helpers/adminSolicitudesFixtures';
async function main(){
 assert.equal(process.env.GCLOUD_PROJECT,'demo-cuenta-hogar');
 const db=admin.firestore(),id='removal-browser-'+randomUUID(),{b}=fixture(id),refs=contractRefs(db,id,1),request=db.doc('solicitudes/'+b.solicitudId);
 b.clienteSnapshot.nombre='Cliente sintético eliminación';
 await request.set({estado:'PENDIENTE',fechaCreacion:admin.firestore.Timestamp.now(),productoDeseado:'Lavarropas sintético',datosPersonales:{nombreCompleto:b.clienteSnapshot.nombre,telefono:'5550100',localidad:'Lincoln'}});
 await refs.family.create({sourceCollection:b.sourceCollection,solicitudId:b.solicitudId,lastVersion:1});await refs.budget.create(b);
 await acceptBudgetV2(db,{budgetId:id,version:1,acceptedOptionId:'option-1',preferredPlanCuotas:12,commandId:'accept'},'synthetic-admin');await contractCommand(db,id,1,{action:'OPEN_OR_CREATE',commandId:'open'},'synthetic-admin');
 const original=await Promise.all([request.get(),refs.budget.get(),refs.draft.get()]);
 try{const user=await admin.auth().getUserByEmail(adminEmail);await admin.auth().updateUser(user.uid,{password:adminPassword,emailVerified:true});}catch{await admin.auth().createUser({email:adminEmail,password:adminPassword,emailVerified:true});}
 const env:NodeJS.ProcessEnv={...process.env,NODE_ENV:'development',NEXT_PUBLIC_ADMIN_EMAIL:adminEmail,NEXT_PUBLIC_FIREBASE_PROJECT_ID:'demo-cuenta-hogar',NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN:'demo-cuenta-hogar.firebaseapp.com',NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET:'demo-cuenta-hogar.appspot.com',NEXT_PUBLIC_FIREBASE_API_KEY:'demo-key',NEXT_PUBLIC_FIREBASE_APP_ID:'demo-app',NEXT_PUBLIC_E2E_TEST_MODE:'1',NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST:'127.0.0.1:9099'};
 const server=spawn(process.execPath,['node_modules/next/dist/bin/next','dev','--webpack','--hostname','localhost','--port','3000'],{env,stdio:'inherit'});let browser:CatalogBrowser|undefined;
 const dir='/tmp/ch-admin-removal/browser';mkdirSync(dir,{recursive:true});
 try{
  let ready=false;for(let i=0;i<120;i++){if(server.exitCode!==null)throw Error('NEXT_EXITED');try{if((await fetch('http://localhost:3000/login',{signal:AbortSignal.timeout(3000)})).ok){ready=true;break;}}catch{/* Wait for local Next. */}await new Promise(r=>setTimeout(r,500));}assert.ok(ready);
  browser=await CatalogBrowser.open();const page=browser;
  await page.navigate('/login');await page.until("typeof window.__FIREBASE_SIGN_IN__==='function'",'Auth');await page.evaluate(`window.__FIREBASE_SIGN_IN__(${JSON.stringify(adminEmail)},${JSON.stringify(adminPassword)}).then(()=>true)`);
  async function capture(name:string){await page.evaluate('document.fonts.ready.then(()=>true)');await page.overflow(name);const shot=await page.command('Page.captureScreenshot',{format:'png'});writeFileSync(`${dir}/${name}.png`,Buffer.from(shot.data as string,'base64'));}
  async function confirm(name:string){await page.until("!!document.querySelector('[data-testid=removal-reason]')",'preview');await page.change('[data-testid=removal-reason]','Prueba sintética de interfaz');await page.click('[data-testid=removal-confirm]');await capture(name);await page.evaluate("(()=>{const b=document.querySelector('[data-testid=confirm-admin-removal]');b.click();b.click();return true})()");await page.until("!document.querySelector('[data-testid=admin-removal-dialog]')",'confirmed once');}
  for(const width of [1280,390]){
   await page.command('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:width===390});
   await page.navigate('/admin/solicitudes?view=all');await page.until(`!!document.querySelector('[data-record-key="solicitudes:${b.solicitudId}"] [data-testid=remove-request]')`,'request');
   await page.click(`[data-record-key="solicitudes:${b.solicitudId}"] [data-testid=remove-request]`);await confirm(`request-${width}`);
   await page.until(`!document.querySelector('[data-record-key="solicitudes:${b.solicitudId}"]')`,'request hidden');
   await page.evaluate("[...document.querySelectorAll('label')].find(e=>e.textContent.includes('Mostrar eliminadas y archivadas')).querySelector('input').click()");await page.until(`!!document.querySelector('[data-record-key="solicitudes:${b.solicitudId}"]')`,'show removed');
   await page.click(`[data-record-key="solicitudes:${b.solicitudId}"] [data-testid=remove-request]`);await confirm(`request-restore-${width}`);
   await page.navigate('/admin/presupuestos');await page.until("!!document.querySelector('[data-testid=budget-history-delete]')",'history');await page.click('[data-testid=budget-history-delete]');await page.click('[data-testid=remove-budget]');await confirm(`budget-${width}`);
   await page.evaluate("[...document.querySelectorAll('label')].find(e=>e.textContent.includes('Mostrar eliminados y archivados')).querySelector('input').click()");await page.until("!!document.querySelector('[data-testid=remove-budget]')",'budget restore');await page.click('[data-testid=remove-budget]');await confirm(`budget-restore-${width}`);
   await page.navigate(`/admin/operaciones/${id}/1?section=contract`);await page.until("!!document.querySelector('[data-testid=remove-contract]')",'contract');await page.click('[data-testid=remove-contract]');await confirm(`contract-${width}`);
   await page.until("!document.querySelector('[data-testid=contract-composer]')",'contract unavailable');await capture(`contract-removed-${width}`);await page.click('[data-testid=remove-contract]');await confirm(`contract-restore-${width}`);await page.until("!!document.querySelector('[data-testid=contract-composer]')",'contract restored');await capture(`contract-restored-${width}`);
   await page.until("!!document.querySelector('[data-testid=production-operation]')",'definitive issuance access');assert.equal(await page.evaluate("document.querySelector('[data-testid=production-operation] h2').textContent"),'Emisión definitiva del contrato y pagaré');assert.equal(await page.evaluate("document.querySelector('[data-testid=production-operation]').getClientRects().length>0"),true,'Issuance is visible without opening advanced details');await page.evaluate("document.querySelector('[data-testid=production-operation]').scrollIntoView({block:'center'})");await capture(`issuance-${width}`);
   assert.equal((await administrativeRecordRef(db,{kind:'CONTRACT',id,version:1}).get()).data()!.state,'ACTIVE');
  }
  for(const snapshot of original)assert((await snapshot.ref.get()).updateTime!.isEqual(snapshot.updateTime!),'Canonical original unchanged');
  for(const subject of [{kind:'REQUEST',source:'solicitudes',id:b.solicitudId},{kind:'BUDGET',id},{kind:'CONTRACT',id,version:1}] as const){const ref=administrativeRecordRef(db,subject);assert.equal((await ref.get()).data()!.revision,4);assert.equal((await ref.collection('commands').get()).size,4,'Double clicks create one command');}
  assert.deepEqual(page.externalFirebase,[]);writeFileSync(dir+'/results.json',JSON.stringify({result:'PASS',project:'demo-cuenta-hogar',widths:[1280,390],cases:['requests remove and restore','budget shared deletion dialog','contract remove and restore','double click','canonical updateTimes unchanged','no external Firebase'],operation:id},null,2));console.log('ADMIN_RECORD_REMOVAL_BROWSER = PASS');
 }finally{await browser?.close();server.kill('SIGTERM');if(server.exitCode===null&&server.signalCode===null)await new Promise<void>(r=>server.once('close',()=>r()));await admin.app().delete();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
