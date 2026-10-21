import './helpers/requireSafeEmulatorEnvironment';
import { openOperationSection } from './helpers/openOperationSection';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdirSync,writeFileSync } from 'node:fs';
import { admin } from '../src/lib/firebaseAdmin';
import { clientFixture,clientPrerequisites,issueClientInvitation } from './testOperationClientV2Emulator';
import { clientBindingRef,readClientBinding } from '../src/lib/operationClientV2Server';
import { CatalogBrowser } from './helpers/catalogBrowser';
import { adminEmail,adminPassword } from './helpers/adminSolicitudesFixtures';
export async function testOperationClientV2Browser() {
 try{const u=await admin.auth().getUserByEmail(adminEmail);await admin.auth().updateUser(u.uid,{password:adminPassword,emailVerified:true});}catch{await admin.auth().createUser({email:adminEmail,password:adminPassword,emailVerified:true});}
 const db=admin.firestore(),f=await clientFixture(),second=await clientFixture(),email=`portal-browser-${randomUUID()}@example.test`,password='Client-own-emulator-123';
 await clientPrerequisites(f.id);await clientPrerequisites(second.id);
 const legacy=db.collection(f.b.sourceCollection).doc(f.b.solicitudId);await legacy.set({marker:'LEGACY_UNCHANGED',clienteEmail:email,clienteId:'HISTORICAL_UID',datosPersonales:{email},productoDeseado:'Histórico sintético'});const historical=JSON.stringify((await legacy.get()).data());
 const original=JSON.stringify({b:(await f.r.budget.get()).data(),a:(await f.r.acceptance.get()).data()});
 const browser=await CatalogBrowser.open(),out='/tmp/cuenta-hogar-client-portal-v2';mkdirSync(out,{recursive:true});
 async function capture(name:string,selector:string){await browser.evaluate(`document.querySelector(${JSON.stringify(selector)}).scrollIntoView({block:'start'})`);await browser.overflow(name);const img=await browser.command('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});writeFileSync(`${out}/${name}.png`,Buffer.from(img.data as string,'base64'));}
 async function login(userEmail:string,pass:string){await browser.navigate('/login');await browser.until("typeof window.__FIREBASE_SIGN_IN__==='function'",'auth');await browser.evaluate(`window.__FIREBASE_SIGN_IN__(${JSON.stringify(userEmail)},${JSON.stringify(pass)}).then(()=>true)`);}
 try {
  await browser.command('Emulation.setDeviceMetricsOverride',{width:1280,height:800,deviceScaleFactor:1,mobile:false});await login(adminEmail,adminPassword);
  await browser.navigate('/admin/presupuestos');await browser.until("!![...document.querySelectorAll('label')].find(x=>x.textContent.includes('Buscar presupuesto V2'))",'history');await browser.field('Buscar presupuesto V2',f.id);await browser.until("[...document.querySelectorAll('section')].find(s=>s.querySelector('h2')?.textContent==='Historial V2')?.querySelectorAll('article').length===1",'exact');await browser.clickText('Abrir versión 1',"[...document.querySelectorAll('section')].find(s=>s.querySelector('h2')?.textContent==='Historial V2')");await browser.until("!!document.querySelector('[data-testid=acceptance-registered]')",'accepted');await openOperationSection(browser,f.id,'Cuotas y pagos');await browser.evaluate("document.querySelector('[data-testid=client-portal-admin]').closest('details').open=true");await browser.until("document.querySelector('[data-testid=client-binding-status]')?.textContent.includes('Revisión 0')",'binding');await capture('admin-desktop','[data-testid=client-portal-admin]');
  await browser.change('[aria-label="Email de activación"]',email);await browser.clickText('Preparar invitación segura (sólo Emulator)');await browser.until("!!document.querySelector('[data-testid=client-activation-link]')",'invitation');
  const link=await browser.evaluate<string>("document.querySelector('[data-testid=client-activation-link]').href"),secondInvite=await issueClientInvitation(second,email);
  assert.equal((await readClientBinding(db,f.id,1)).state.state,'PREPARED');
  await browser.evaluate('window.__FIREBASE_SIGN_OUT__().then(()=>true)');await browser.navigate(new URL(link).pathname+new URL(link).hash);
  await browser.until("!!document.querySelector('[data-testid=client-activation-v2] input[name=password]')",'activation form');assert.equal(await browser.evaluate('location.hash'),'');await browser.change('input[name=password]',password);await browser.clickText('Crear mi cuenta');
  await browser.until("document.querySelector('[data-testid=client-activation-v2]')?.textContent.includes('Verificá tu email')",'verification required');
  assert.equal((await clientBindingRef(db,f.id,1).get()).data()!.state,'PREPARED');
  // Exercise Auth Emulator's real email action without exposing codes in test output.
  const response=await fetch('http://127.0.0.1:9099/emulator/v1/projects/demo-cuenta-hogar/oobCodes'),codes=(await response.json()).oobCodes as {email:string;requestType:string;oobCode:string}[];
  const code=codes.find(c=>c.email===email&&c.requestType==='VERIFY_EMAIL');assert(code);
  assert.equal((await fetch('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:update?key=demo-key',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({oobCode:code.oobCode})})).status,200);
  await browser.clickText('Ya verifiqué mi email');await browser.until("[...document.querySelectorAll('button')].some(b=>b.textContent==='Confirmar activación del servicio'&&!b.disabled)",'verified');await browser.clickText('Confirmar activación del servicio');await browser.until("document.querySelector('[data-testid=client-activation-v2]')?.textContent.includes('Servicio activado para tu cuenta.')",'activated');await capture('activation-desktop','[data-testid=client-activation-v2]');
  await browser.navigate('/cliente');await browser.until("document.querySelectorAll('[data-testid=client-service-v2]').length===1",'first service');await capture('client-desktop','[data-testid=client-services-v2]');
  await browser.navigate(`/activar-cuenta-v2/${secondInvite.id}#${secondInvite.token}`);await browser.until("[...document.querySelectorAll('button')].some(b=>b.textContent==='Confirmar activación del servicio'&&!b.disabled)",'existing verified session');await browser.clickText('Confirmar activación del servicio');await browser.until("document.querySelector('[data-testid=client-activation-v2]')?.textContent.includes('Servicio activado para tu cuenta.')",'second activated');
  await browser.navigate('/cliente');await browser.until("document.querySelectorAll('[data-testid=client-service-v2]').length===2",'multiple services');await browser.command('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});await capture('client-mobile','[data-testid=client-services-v2]');
  const html=await browser.evaluate<string>("document.querySelector('[data-testid=client-services-v2]').textContent");for(const forbidden of ['580000','SECRET_PROVIDER','DNI','Cuota estimada','$','Capital aplicado','snapshot'])assert(!html.includes(forbidden));
  await browser.navigate('/cliente');await browser.until("document.querySelectorAll('[data-testid=client-service-v2]').length===2",'reload persists');assert.equal(JSON.stringify((await legacy.get()).data()),historical);assert.equal(JSON.stringify({b:(await f.r.budget.get()).data(),a:(await f.r.acceptance.get()).data()}),original);
  // Original capability cannot be reused for a second activation.
  await browser.navigate(new URL(link).pathname+new URL(link).hash);await browser.until("document.querySelector('[data-testid=client-activation-v2]')?.textContent.includes('Invitación no disponible')",'single use');
  const otherEmail=`portal-other-${randomUUID()}@example.test`;await admin.auth().createUser({email:otherEmail,password,emailVerified:true});await browser.evaluate('window.__FIREBASE_SIGN_OUT__().then(()=>true)');await login(otherEmail,password);await browser.navigate('/cliente');await browser.until("document.querySelector('[data-testid=client-services-v2]')?.textContent.includes('No hay servicios V2 activados')",'isolated account');
  const status=await browser.evaluate<number>(`window.__FIREBASE_AUTH__.currentUser.getIdToken().then(token=>fetch('/api/cliente/servicios-v2/${f.id}/1',{headers:{Authorization:'Bearer '+token}})).then(r=>r.status)`);assert.equal(status,403);assert.deepEqual(browser.externalFirebase,[]);
  console.log('CLIENT_PORTAL_BROWSER_DESKTOP_MOBILE=PASS; PASSWORD_SELECTED_BY_CUSTOMER=PASS; AUTH_EMAIL_VERIFICATION=PASS; MULTIPLE_SERVICES=PASS; RELOAD=PASS; INVITATION_SINGLE_USE=PASS; CROSS_ACCOUNT=DENIED; HISTORICAL_AUTO_MIGRATION=0; EXTERNAL_FIREBASE_REQUESTS=0');
 }finally{await browser.close();}
}
