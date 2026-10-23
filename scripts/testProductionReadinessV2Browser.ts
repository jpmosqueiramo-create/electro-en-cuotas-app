import './helpers/requireSafeEmulatorEnvironment';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {spawn} from 'node:child_process';
import {createServer} from 'node:net';
import {mkdirSync,writeFileSync} from 'node:fs';
import {admin} from '../src/lib/firebaseAdmin';
import {persistReadyContract} from './helpers/contractFreezeFixtures';
import {createDocumentationCase} from '../src/lib/budgetAcceptanceV2';
import {operationRef,operationFromAcceptance} from '../src/lib/operationV2';
import {CatalogBrowser} from './helpers/catalogBrowser';
import {adminEmail,adminPassword} from './helpers/adminSolicitudesFixtures';
import {contractValueHash} from '../src/lib/contractIntegrityV2';
const out='/tmp/cuenta-hogar-production-readiness',scope="document.querySelector('[data-testid=production-readiness]')";
async function run(){
 assert.equal(process.env.GCLOUD_PROJECT,'demo-cuenta-hogar');assert.equal(adminEmail,'production-review-admin@example.test');
 const db=admin.firestore(),f=await persistReadyContract(db,'production-browser-'+randomUUID(),false,12);
 await f.r.family.collection('documentation').doc('1').set(createDocumentationCase(f.a));await operationRef(db,f.id,1).set(operationFromAcceptance(f.a));
 await admin.auth().createUser({email:adminEmail,password:adminPassword,emailVerified:true});
 const before=await f.r.draft.get(),browser=await CatalogBrowser.open();mkdirSync(out,{recursive:true});
 try{
  await browser.navigate('/login');await browser.until("typeof window.__FIREBASE_SIGN_IN__==='function'",'auth emulator ready');
  await browser.evaluate(`window.__FIREBASE_SIGN_IN__(${JSON.stringify(adminEmail)},${JSON.stringify(adminPassword)}).then(()=>true)`);
  await browser.navigate(`/admin/operaciones/${f.id}/1?section=contract`);
  await browser.until(`${scope}?.textContent.includes('Próximo paso:')`,'readiness returned by actual API');
  await browser.click('[data-testid=production-readiness] summary');
  for(const [width,height,mobile]of [[1280,900,false],[390,844,true]] as const){
   await browser.command('Emulation.setDeviceMetricsOverride',{width,height,mobile,deviceScaleFactor:1});
   await browser.evaluate(`${scope}.scrollIntoView({block:'start'})`);await browser.overflow('production-readiness-'+width);
   await browser.until(`${scope}?.textContent.includes('Emisión definitiva, entrega, cobranza y facturación ARCA permanecen bloqueadas')`,'complete readiness panel');
   const text=await browser.evaluate<string>(`${scope}.innerText`);writeFileSync(`${out}/readiness-${width}.txt`,text);assert(text.includes('Emisión definitiva, entrega, cobranza y facturación ARCA permanecen bloqueadas'));assert(text.includes('aprobación')||text.includes('validación'));
   const shot=await browser.command('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});writeFileSync(`${out}/readiness-${width}.png`,Buffer.from(shot.data as string,'base64'));
  }
  await browser.clickText('Actualizar comprobación',scope);await browser.until(`${scope}?.textContent.includes('Próximo paso:')`,'refresh remains read only');
  const hrefs=await browser.evaluate<string[]>(`[...${scope}.querySelectorAll('a')].map(a=>a.getAttribute('href'))`);assert(hrefs.includes('/admin/aprobacion-documental'));assert(!hrefs.some(h=>h.includes('laboratorio')));
  const post=await browser.evaluate<number>(`window.__FIREBASE_AUTH__.currentUser.getIdToken().then(token=>fetch('/api/admin/presupuestos-v2/${f.id}/versions/1/production-readiness',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({action:'FREEZE',enabled:true})})).then(r=>r.status)`);assert.equal(post,405);
  assert.equal(browser.externalFirebase.length,0);
  const after=await f.r.draft.get();assert(after.updateTime!.isEqual(before.updateTime!));assert.equal(contractValueHash(after.data()),contractValueHash(before.data()));
  writeFileSync(`${out}/browser-results.json`,JSON.stringify({desktop:'PASS',mobile:'PASS',overflow:'PASS',httpGet:'PASS',post:405,readOnly:'PASS',externalFirebaseRequests:0,productionWrites:0},null,2));
  console.log('PRODUCTION_READINESS_BROWSER_DESKTOP_MOBILE_HTTP_READ_ONLY=PASS');
 }finally{await browser.close();}
}
async function main(){
 await new Promise<void>((resolve,reject)=>{const probe=createServer();probe.once('error',reject);probe.listen(3000,'localhost',()=>probe.close(()=>resolve()));});
 const server=spawn(process.execPath,['node_modules/next/dist/bin/next','dev','--hostname','localhost','--port','3000'],{env:{...process.env,NODE_ENV:'development',NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN:'demo-cuenta-hogar.firebaseapp.com',NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET:'demo-cuenta-hogar.appspot.com',NEXT_PUBLIC_FIREBASE_API_KEY:'demo-key',NEXT_PUBLIC_FIREBASE_APP_ID:'demo-app',NEXT_PUBLIC_E2E_TEST_MODE:'1',NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST:'127.0.0.1:9099'},stdio:'inherit'});
 try{
  let ready=false;for(let i=0;i<120;i++){try{if((await fetch('http://localhost:3000/login',{signal:AbortSignal.timeout(3000)})).ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,500));}
  assert(ready,'Local Next ready');await run();
 }finally{server.kill('SIGTERM');await new Promise<void>(resolve=>{if(server.exitCode!==null||server.signalCode!==null)resolve();else server.once('close',()=>resolve());});await admin.app().delete();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
