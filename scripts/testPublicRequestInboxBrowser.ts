import './helpers/requireSafeEmulatorEnvironment';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {spawn} from 'node:child_process';
import {mkdirSync,writeFileSync} from 'node:fs';
import {admin} from '../src/lib/firebaseAdmin';
import type {QuerySnapshot} from 'firebase-admin/firestore';
import {CatalogBrowser} from './helpers/catalogBrowser';
import {adminEmail,adminPassword} from './helpers/adminSolicitudesFixtures';
import {persistPublicSolicitud} from '../src/lib/publicSolicitudService';
import {previewAdministrativeRemoval,manageAdministrativeRecord} from '../src/lib/adminRecordRemovalServer';
import {readAdminRequestPage} from '../src/lib/adminSolicitudesServer';
import {publicFixture} from './helpers/catalogC4Fixtures';
async function main(){
 assert.equal(process.env.GCLOUD_PROJECT,'demo-cuenta-hogar');
 const db=admin.firestore(),prefix='web-inbox-'+randomUUID(),dir='/tmp/ch-public-request-inbox';mkdirSync(dir,{recursive:true});
 try{await admin.auth().createUser({email:adminEmail,password:adminPassword,emailVerified:true});}catch(e){if((e as {code?:string}).code!=='auth/email-already-exists')throw e;}
 const env:NodeJS.ProcessEnv={...process.env,NODE_ENV:'development',NEXT_PUBLIC_ADMIN_EMAIL:adminEmail,NEXT_PUBLIC_FIREBASE_PROJECT_ID:'demo-cuenta-hogar',NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN:'demo-cuenta-hogar.firebaseapp.com',NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET:'demo-cuenta-hogar.appspot.com',NEXT_PUBLIC_FIREBASE_API_KEY:'demo-key',NEXT_PUBLIC_FIREBASE_APP_ID:'demo-app',NEXT_PUBLIC_E2E_TEST_MODE:'1',NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST:'127.0.0.1:9099'};
 const server=spawn(process.execPath,['node_modules/next/dist/bin/next','dev','--webpack','--hostname','localhost','--port','3000'],{env,stdio:'inherit'});let browser:CatalogBrowser|undefined;
 const ids:string[]=[];
 const referenceId='catalog-'+randomUUID(),reference=publicFixture(referenceId,'Lavarropas de catálogo sintético');await db.collection('catalogo_publico').doc(referenceId).create(reference);
 try{
  let ready=false;for(let i=0;i<120;i++){if(server.exitCode!==null)throw Error('NEXT_EXITED');try{if((await fetch('http://localhost:3000/login',{signal:AbortSignal.timeout(3000)})).ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,500));}assert.ok(ready);
  browser=await CatalogBrowser.open();const page=browser;
  await page.command('Network.setBlockedURLs',{urls:['*wa.me/*']});
  async function shot(name:string){await page.evaluate('document.fonts.ready.then(()=>true)');await page.overflow(name);const s=await page.command('Page.captureScreenshot',{format:'png'});writeFileSync(`${dir}/${name}.png`,Buffer.from(String(s.data),'base64'));}
  async function login(){await page.navigate('/login');await page.until("typeof window.__FIREBASE_SIGN_IN__==='function'",'Auth ready');await page.evaluate(`window.__FIREBASE_SIGN_IN__(${JSON.stringify(adminEmail)},${JSON.stringify(adminPassword)}).then(()=>true)`);}
  for(const width of [1280,390]){
   await page.command('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:width===390});
   const name=`${prefix}-${width}`;
   await page.navigate('/');await page.until("!!document.querySelector('[data-testid=home-request-proposal]')",'landing CTA');
   await page.until("(()=>{const f=document.querySelector('#contacto form');return f&&Object.keys(f).some(k=>k.startsWith('__reactProps$')&&typeof f[k]?.onSubmit==='function');})()",'public form hydrated');
   assert.equal(await page.evaluate("document.querySelector('[data-testid=home-request-proposal]').getAttribute('href')"),'#contacto');
   await page.click('[data-testid=home-request-proposal]');await page.until("location.hash==='#contacto'",'CTA opens persisted consultation form');
   for(const [label,value] of [['Nombre y apellido',name],['WhatsApp',width===1280?'000001280':'000000390'],['Localidad','Localidad ficticia'],['Producto o necesidad','Lavarropas sintético']])await page.change(`[aria-label="${label}"]`,value);
   await shot('landing-form-'+width);
   await page.evaluate("(()=>{const form=document.querySelector('#contacto form');form.requestSubmit();form.requestSubmit();return true;})()");
   let saved:QuerySnapshot|undefined;for(let i=0;i<100;i++){saved=await db.collection('solicitudes_cuenta').where('nombreCompleto','==',name).get();if(saved.size)break;await new Promise(r=>setTimeout(r,100));}
   assert.equal(saved!.size,1,'Double submit persists once');const doc=saved!.docs[0];ids.push(doc.id);const before=doc.updateTime!;
   assert.equal(doc.data().tipo,'consulta_v2');assert.equal(doc.data().productoNombre,'Lavarropas sintético');
   let alertExists=false;for(let i=0;i<100;i++){alertExists=(await db.collection('alertas_admin').doc(doc.id).get()).exists;if(alertExists)break;await new Promise(r=>setTimeout(r,100));}
   assert.equal(alertExists,true,'Server completes the secondary alert after request persistence');
   const payload={tipo:'consulta_v2' as const,nombreCompleto:name,whatsapp:width===1280?'000001280':'000000390',localidad:'Localidad ficticia',productoNombre:'Lavarropas sintético'};
   const replay=await persistPublicSolicitud(db,doc.id.slice(4),payload);assert.equal(replay.replay,true);assert((await doc.ref.get()).updateTime!.isEqual(before));
   const projected=(await readAdminRequestPage(db,'solicitudes_cuenta',null)).items.find(i=>i.documentId===doc.id);assert.equal(projected?.nombreCliente,name);assert.equal(projected?.estadoOriginal,'Pendiente');
   await login();await page.navigate('/admin/solicitudes');await page.until(`!!document.querySelector('[data-record-key="solicitudes_cuenta:${doc.id}"]')`,'public request appears pending');
   await shot('inbox-'+width);await page.click(`[data-record-key="solicitudes_cuenta:${doc.id}"] a`);await page.until(`!!document.querySelector('[data-testid=solicitud-detail]')&&document.querySelector('main').innerText.includes(${JSON.stringify(name)})`,'request detail loaded');
   assert.ok(await page.evaluate(`document.querySelector('main').innerText.includes(${JSON.stringify(name)})`));
   await page.navigate('/admin/clientes');await page.until(`document.body.innerText.includes(${JSON.stringify(name)})`,'directory same source');await shot('clients-'+width);
   const subject={kind:'REQUEST',source:'solicitudes_cuenta',id:doc.id} as const,preview=await previewAdministrativeRemoval(db,subject);
   await manageAdministrativeRecord(db,{action:'REMOVE',subject,commandId:randomUUID(),fingerprint:preview.fingerprint,confirmed:true,reason:'Prueba sintética de aislamiento de bandejas'},'synthetic-admin');
   await page.navigate('/admin/clientes');await page.until("!!document.querySelector('[data-testid=clients-directory][data-loaded=true]')",'directory settled');assert.equal(await page.evaluate(`document.body.innerText.includes(${JSON.stringify(name)})`),false,'Removed request never reappears as a customer');
   await page.navigate('/admin/solicitudes');await page.until("!![...document.querySelectorAll('button')].find(b=>b.textContent==='Actualizar bandeja'&&!b.disabled)",'inbox ready');
   const later={...payload,nombreCompleto:name+' segunda',whatsapp:width===1280?'000011280':'000010390'},laterResult=await persistPublicSolicitud(db,randomUUID(),later);
   await page.evaluate("window.dispatchEvent(new Event('focus'))");await page.until(`!!document.querySelector('[data-record-key="solicitudes_cuenta:${laterResult.id}"]')`,'inbox refresh on focus');
   await shot('inbox-updated-'+width);
   await page.navigate(`/solicitar?id=${referenceId}&cuotas=12`);await page.until("!!document.querySelector('select')",'catalog reference');
   await page.until("(()=>{const f=document.querySelector('form');return f&&Object.keys(f).some(k=>k.startsWith('__reactProps$')&&typeof f[k]?.onSubmit==='function');})()",'catalog form hydrated');
   assert.equal(await page.evaluate("document.querySelector('select').value"),'12');
   for(const [selector,value]of [['input[autocomplete=name]',name+' catálogo'],['input[type=tel]',width===1280?'000021280':'000020390'],['input[autocomplete=address-level2]','Localidad ficticia']])await page.change(selector,value);
   await shot('catalog-form-'+width);await page.evaluate("document.querySelector('form').requestSubmit()");
   let catalogRequest:QuerySnapshot|undefined;for(let i=0;i<100;i++){catalogRequest=await db.collection('solicitudes_cuenta').where('nombreCompleto','==',name+' catálogo').get();if(catalogRequest.size)break;await new Promise(r=>setTimeout(r,100));}
   assert.equal(catalogRequest!.size,1);const fromCatalog=catalogRequest!.docs[0];ids.push(fromCatalog.id);assert.equal(fromCatalog.data().productoId,referenceId);assert.equal(fromCatalog.data().planElegido,'12');assert.equal(fromCatalog.data().montoCuota,145000);
   await login();await page.navigate('/admin/solicitudes');await page.until(`!!document.querySelector('[data-record-key="solicitudes_cuenta:${fromCatalog.id}"]')`,'catalog request in same inbox');

   assert((await doc.ref.get()).updateTime!.isEqual(before),'Directory removal does not rewrite original request');
  }
  assert.deepEqual(page.externalFirebase,[]);writeFileSync(dir+'/results.json',JSON.stringify({result:'PASS',project:'demo-cuenta-hogar',widths:[1280,390],requestIds:ids,cases:['hero to persisted form','catalog reference and plan reach same inbox','four fields HTTP persistence','double click single effect','same payload replay unchanged updateTime','alert created','pending inbox and detail','directory authorized same source','removed requests excluded','focus refresh','desktop/mobile overflow','no external Firebase'],productionWrites:0},null,2));
  console.log('PUBLIC_REQUEST_INBOX_BROWSER = PASS');
 }finally{await browser?.close();server.kill('SIGTERM');if(server.exitCode===null&&server.signalCode===null)await new Promise<void>(r=>server.once('close',()=>r()));await admin.app().delete();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
