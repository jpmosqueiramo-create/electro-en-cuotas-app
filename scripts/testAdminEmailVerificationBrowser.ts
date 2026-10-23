import './helpers/requireSafeEmulatorEnvironment';
import assert from 'node:assert/strict';
import { createServer } from 'node:net';
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, applyActionCode } from 'firebase/auth';
import { admin } from '../src/lib/firebaseAdmin';
import { CatalogBrowser } from './helpers/catalogBrowser';

const email = 'admin-verification@example.test', password = 'Synthetic-Only-123', uid = 'synthetic-email-admin';
let phase = 'startup';
const authBase = 'http://127.0.0.1:9099', out = '/tmp/cuenta-hogar-admin-email';
const instrument = `window.__emailTest={send:0,lookup:0,lab:0,labError:null,mode:'normal',failLookup:false,failRefresh:false};
const originalFetch=window.fetch.bind(window);
window.fetch=async(input,init)=>{
 const url=typeof input==='string'?input:input.url||String(input),t=window.__emailTest;
 if(url.includes('accounts:lookup')){t.lookup++;if(t.failLookup){t.failLookup=false;throw new TypeError('Synthetic connection failure');}}
 if(url.includes('/token?')&&t.failRefresh){t.failRefresh=false;throw new TypeError('Synthetic refresh failure');}
 if(url.includes('accounts:sendOobCode')){
  t.send++;await new Promise(r=>setTimeout(r,800));
  if(t.mode==='throttle')return new Response(JSON.stringify({error:{code:400,message:'TOO_MANY_ATTEMPTS_TRY_LATER'}}),{status:400,headers:{'Content-Type':'application/json'}});
  if(t.mode==='lost'){const response=await originalFetch(input,init);await response.clone().text();throw new TypeError('Synthetic lost response after send');}
 }
 const response=await originalFetch(input,init);
 if(url==='/api/admin/laboratorio'){t.lab++;t.labError=(await response.clone().json()).error||null;}
 return response;
};`;

async function run() {
  assert.equal(process.env.GCLOUD_PROJECT, 'demo-cuenta-hogar');
  assert.equal(process.env.FIREBASE_AUTH_EMULATOR_HOST, '127.0.0.1:9099');
  await new Promise<void>((resolve, reject) => { const probe = createServer(); probe.once('error', reject); probe.listen(3000, 'localhost', () => probe.close(error => error ? reject(error) : resolve())); });
  await admin.auth().createUser({ uid, email, password, emailVerified: false });
  await admin.auth().createUser({ uid: 'synthetic-email-client', email: 'email-client@example.test', password, emailVerified: true });
  const client = initializeApp({ apiKey: 'demo-key', projectId: 'demo-cuenta-hogar', authDomain: 'demo-cuenta-hogar.firebaseapp.com' }, 'synthetic-verification-action');
  const auth = getAuth(client); connectAuthEmulator(auth, authBase, { disableWarnings: true });
  const server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'dev', '--hostname', 'localhost', '--port', '3000'], { cwd: process.cwd(), env: { ...process.env, NODE_ENV: 'development', NEXT_PUBLIC_ADMIN_EMAIL: email, NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: 'demo-cuenta-hogar.firebaseapp.com', NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: 'demo-cuenta-hogar.appspot.com', NEXT_PUBLIC_FIREBASE_API_KEY: 'demo-key', NEXT_PUBLIC_FIREBASE_APP_ID: 'demo-app', NEXT_PUBLIC_E2E_TEST_MODE: '1', NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST: '127.0.0.1:9099', OPERATIONS_LAB_ENABLED: 'false', OPERATIONS_LAB_ADMIN_UIDS: JSON.stringify([uid]), OPERATIONS_LAB_PARTICIPANT_UIDS: '[]' }, stdio: 'inherit' });
  let browser: CatalogBrowser | undefined;
  async function codes() {
    const response = await fetch(authBase + '/emulator/v1/projects/demo-cuenta-hogar/oobCodes'); assert.equal(response.status, 200);
    // Read synthetic action codes only in memory. Never print codes or verification links.
    const body = await response.json() as { oobCodes: { email: string; requestType: string; oobCode: string }[] };
    return body.oobCodes.filter(code => code.email === email && code.requestType === 'VERIFY_EMAIL');
  }
  try {
    let ready = false; for (let i = 0; i < 120; i++) { try { ready = (await fetch('http://localhost:3000/login')).ok; } catch {} if (ready) break; await new Promise(r => setTimeout(r, 500)); } assert(ready);
    browser = await CatalogBrowser.open(); const b = browser; mkdirSync(out, { recursive: true });
    await b.command('Page.addScriptToEvaluateOnNewDocument', { source: instrument });
    await b.navigate('/login'); await b.until("typeof window.__FIREBASE_SIGN_IN__==='function'", 'local auth');
    await b.evaluate(`window.__FIREBASE_SIGN_IN__(${JSON.stringify(email)},${JSON.stringify(password)}).then(()=>true)`);
    async function open() { await b.navigate('/admin/laboratorio'); await b.until("!!document.querySelector('[data-testid=admin-email-send]')&&window.__emailTest.labError==='LAB_ACCESS_DENIED'", 'unverified administrator'); }
    phase = 'initial administrator and no automatic send';
    await open(); assert.equal((await codes()).length, 0, 'no automatic email');
    for (const [width, height, mobile] of [[1280, 900, false], [390, 844, true]] as const) {
      phase = 'pending layout ' + width;
      await b.command('Emulation.setDeviceMetricsOverride', { width, height, mobile, deviceScaleFactor: 1 }); await b.overflow('admin verification ' + width);
      await b.evaluate("document.querySelector('[data-testid=admin-email-verification]').scrollIntoView({block:'start'})");
      const image = await b.command('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false }); writeFileSync(`${out}/pending-${width}.png`, Buffer.from(image.data as string, 'base64'));
    }
    phase = 'unverified reload and double click';
    const lookupBeforeCheck = await b.evaluate<number>('window.__emailTest.lookup');
    await b.evaluate("(()=>{const button=document.querySelector('[data-testid=admin-email-check]');button.click();button.click();})()");
    await b.until("document.body.innerText.includes('Firebase todavía indica')", 'not yet verified');
    assert.equal(await b.evaluate<number>('window.__emailTest.lookup') - lookupBeforeCheck, 1, 'one additional reload for double click, excluding Auth restoration');
    assert.equal((await admin.auth().getUser(uid)).emailVerified, false);

    phase = 'lost send response';
    await b.evaluate("window.__emailTest.mode='lost'");
    await b.evaluate("(()=>{const button=document.querySelector('[data-testid=admin-email-send]');button.click();button.click();})()");
    await b.until("[...document.querySelectorAll('[data-testid=admin-email-verification] button')].every(b=>b.disabled)", 'busy controls');
    await b.until("document.querySelector('[role=alert]')?.textContent.includes('problema de conexión')", 'lost response is not success');
    assert.equal(await b.evaluate('window.__emailTest.send'), 1); assert.equal((await codes()).length, 1);
    assert(await b.evaluate("document.querySelector('[data-testid=admin-email-send]').disabled"));
    assert(!await b.evaluate("document.body.innerText.includes('Correo de verificación enviado')"));
    console.log('EMAIL_UI_PENDING_DOUBLE_CLICK_LOST_RESPONSE_COOLDOWN_PASS');

    phase = 'provider throttle';
    await open(); await b.evaluate("window.__emailTest.mode='throttle'"); await b.click('[data-testid=admin-email-send]');
    await b.until("document.querySelector('[role=alert]')?.textContent.includes('Firebase limitó')", 'provider rate limit');
    assert(await b.evaluate("document.querySelector('[data-testid=admin-email-send]').disabled")); assert.equal((await codes()).length, 1);
    console.log('EMAIL_UI_PROVIDER_THROTTLE_PASS');

    phase = 'successful send and reload failure';
    await open(); await b.click('[data-testid=admin-email-send]'); await b.until("document.body.innerText.includes('Correo de verificación enviado')", 'confirmed send');
    assert.equal((await codes()).length, 2); assert.equal(await b.evaluate('window.__emailTest.send'), 1);
    await b.evaluate('window.__emailTest.failLookup=true'); await b.click('[data-testid=admin-email-check]');
    await b.until("document.querySelector('[role=alert]')?.textContent.includes('problema de conexión')", 'reload failure');
    assert(!await b.evaluate("!!document.querySelector('[data-testid=admin-email-verified]')"));

    phase = 'official action code';
    const sent = await codes(); await applyActionCode(auth, sent[sent.length - 1].oobCode);
    assert.equal((await admin.auth().getUser(uid)).emailVerified, true, 'official action-code verification, no Admin attribute mutation');
    phase = 'refresh failure';
    await b.evaluate('window.__emailTest.failRefresh=true'); await b.click('[data-testid=admin-email-check]');
    await b.until("document.querySelector('[role=alert]')?.textContent.includes('problema de conexión')", 'token refresh failure');
    assert(!await b.evaluate("!!document.querySelector('[data-testid=admin-email-verified]')"));
    phase = 'confirmed verification and fresh access query';
    const previousLabRequests = await b.evaluate<number>('window.__emailTest.lab');
    await b.click('[data-testid=admin-email-check]'); await b.until("!!document.querySelector('[data-testid=admin-email-verified]')&&window.__emailTest.labError==='LAB_DISABLED'", 'verified state and fresh access query');
    assert.equal(await b.evaluate('window.__emailTest.lab'), previousLabRequests + 1);
    assert(!await b.evaluate("!!document.querySelector('[data-testid=admin-email-send]')"));
    assert(await b.evaluate("[...document.querySelectorAll('button')].find(b=>b.textContent==='Registrar sesión sintética').disabled"));
    for (const [width, height, mobile] of [[1280, 900, false], [390, 844, true]] as const) {
      await b.command('Emulation.setDeviceMetricsOverride', { width, height, mobile, deviceScaleFactor: 1 }); await b.overflow('verified ' + width);
      const image = await b.command('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false }); writeFileSync(`${out}/verified-${width}.png`, Buffer.from(image.data as string, 'base64'));
    }
    console.log('EMAIL_UI_OFFICIAL_VERIFICATION_RELOAD_REFRESH_NO_AUTO_ACTIVATION_PASS');
    await b.navigate('/admin/laboratorio'); await b.until("document.body.innerText.includes('El laboratorio está deshabilitado')", 'disabled after reload');
    assert(!await b.evaluate("!!document.querySelector('[data-testid=admin-email-verification]')"));
    await b.evaluate("window.__FIREBASE_SIGN_IN__('email-client@example.test'," + JSON.stringify(password) + ').then(()=>true)');
    await b.navigate('/admin/laboratorio'); await b.until("!location.pathname.startsWith('/admin')", 'non-admin redirect');
    assert(!await b.evaluate("!!document.querySelector('[data-testid=admin-email-verification]')"));
    await b.evaluate('window.__FIREBASE_SIGN_OUT__().then(()=>true)'); await b.navigate('/admin/laboratorio'); await b.until("location.pathname==='/login'", 'anonymous redirect');
    assert(!await b.evaluate("!!document.querySelector('[data-testid=admin-email-verification]')"));
    assert.equal((await admin.firestore().collection('operationsLabV1').get()).size, 0);
    assert.equal((await admin.firestore().listCollections()).length, 0, 'no Firestore writes');
    assert.deepEqual(b.externalFirebase, []); assert.equal(b.storageWrites, 0);
    console.log('ADMIN_EMAIL_BROWSER_EMULATOR_PASS: verified/unverified, double click, lost response, throttle, reload/refresh failures, actual action code, fresh access query, roles, desktop/mobile, no Firestore or production requests');
  } finally { if (browser) await browser.close(); server.kill('SIGTERM'); await deleteApp(client); await admin.app().delete(); }
}
run().catch(error => { const message = error instanceof Error ? error.message.replace(/https?:[^\s\"']+/g, '[URL REDACTED]') : 'UNKNOWN'; console.error('ADMIN_EMAIL_BROWSER_EMULATOR_FAIL', phase, message); process.exitCode = 1; });
