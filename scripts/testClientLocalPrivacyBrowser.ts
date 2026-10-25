import './helpers/requireSafeEmulatorEnvironment';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import { admin } from '../src/lib/firebaseAdmin';
import { CatalogBrowser } from './helpers/catalogBrowser';

async function main() {
  assert.equal(process.env.GCLOUD_PROJECT, 'demo-cuenta-hogar');
  assert.equal(process.env.FIRESTORE_EMULATOR_HOST, '127.0.0.1:8080');
  assert.equal(process.env.FIREBASE_AUTH_EMULATOR_HOST, '127.0.0.1:9099');
  await new Promise<void>((resolve, reject) => {
    const probe = createServer(); probe.once('error', reject);
    probe.listen(3000, 'localhost', () => probe.close(() => resolve()));
  });
  const password = 'Synthetic-Privacy-Only-2026';
  const accounts = ['privacy-a@example.test', 'privacy-b@example.test'];
  for (const email of accounts) await admin.auth().createUser({ email, password, emailVerified: true });
  const env: NodeJS.ProcessEnv = { ...process.env, NODE_ENV: 'development', NEXT_PUBLIC_FIREBASE_PROJECT_ID: 'demo-cuenta-hogar',
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: 'demo-cuenta-hogar.firebaseapp.com', NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: 'demo-cuenta-hogar.appspot.com',
    NEXT_PUBLIC_FIREBASE_API_KEY: 'demo-key', NEXT_PUBLIC_FIREBASE_APP_ID: 'demo-app', NEXT_PUBLIC_E2E_TEST_MODE: '1',
    NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST: '127.0.0.1:9099' };
  const server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'dev', '--webpack', '--hostname', 'localhost', '--port', '3000'], { env, stdio: 'inherit' });
  let browser: CatalogBrowser | undefined;
  const dir = '/tmp/cuenta-hogar-client-privacy'; mkdirSync(dir, { recursive: true });
  try {
    let ready = false;
    for (let i = 0; i < 120; i++) {
      if (server.exitCode !== null) throw Error('NEXT_EXITED');
      try { if ((await fetch('http://localhost:3000/login', { signal: AbortSignal.timeout(3000) })).ok) { ready = true; break; } } catch { /* startup */ }
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    assert.ok(ready);
    browser = await CatalogBrowser.open();
    const b = browser;
    const seed = `localStorage.setItem('datosPreliminares',JSON.stringify({nombreCompleto:'PRIVATE_A_SENTINEL',numeroDni:'00000000',direccion:'PRIVATE_ADDRESS_SENTINEL',producto:'PRIVATE_PRODUCT_SENTINEL'}));localStorage.setItem('privacy-unrelated','preserve');true`;
    const clean = `!document.body.innerText.includes('PRIVATE_')&&![...document.querySelectorAll('input')].some(e=>e.value.includes('PRIVATE_'))`;
    async function assertClean() { assert.ok(await b.evaluate(clean)); assert.equal(await b.evaluate("localStorage.getItem('datosPreliminares')"), null); assert.equal(await b.evaluate("localStorage.getItem('privacy-unrelated')"), 'preserve'); }
    async function signIn(email: string) {
      await b.until("typeof window.__FIREBASE_SIGN_IN__==='function'", 'Auth bootstrap');
      await b.evaluate(`window.__FIREBASE_SIGN_IN__(${JSON.stringify(email)},${JSON.stringify(password)}).then(()=>true)`);
    }
    for (const width of [1280, 390]) {
      await b.command('Emulation.setDeviceMetricsOverride', { width, height: 844, deviceScaleFactor: 1, mobile: width === 390 });
      await b.navigate('/login'); await signIn(accounts[0]);
      await b.evaluate(`(()=>{${seed}})()`); await b.navigate('/cliente');
      await b.until("document.body.innerText.includes('No hay servicios V2')", 'A portal'); await assertClean();
      // An old tab writes the retired key while A is already logged in.
      await b.evaluate(`(()=>{${seed}})()`);
      await b.clickText('Cerrar sesión'); await b.until("location.pathname==='/login'", 'A logout');
      await signIn(accounts[1]); await b.navigate('/cliente');
      await b.until("document.body.innerText.includes('No hay servicios V2')", 'B portal'); await assertClean();
      await b.evaluate('window.__privacyReloadMarker=true');
      await b.command('Page.reload');
      await b.until("typeof window.__privacyReloadMarker==='undefined'", 'new document after reload');
      await b.until("document.body.innerText.includes('No hay servicios V2')", 'B reload'); await assertClean();
      // Direct Auth switch on the mounted page: the keyed portal must discard local form state.
      await b.until("[...document.querySelectorAll('button')].some(b=>b.textContent.trim()==='QUIERO RECIBIR UNA PROPUESTA'&&!b.disabled)", 'public proposal action ready');
      await b.clickText('QUIERO RECIBIR UNA PROPUESTA');
      await b.until("document.body.innerText.includes('Solicitud de Compra')", 'legacy form explicitly opened');
      await signIn(accounts[0]); await b.until("!document.body.innerText.includes('Solicitud de Compra')", 'UID remount clears form');
      await b.until("document.body.innerText.includes('No hay servicios V2')&&[...document.images].every(i=>i.complete&&i.naturalWidth>0)", 'client settled');
      await b.overflow(`client ${width}`);
      const shot = await b.command('Page.captureScreenshot', { format: 'png' });
      writeFileSync(`${dir}/client-${width}.png`, Buffer.from(shot.data as string, 'base64'));
      await b.clickText('Cerrar sesión'); await b.until("location.pathname==='/login'", 'logout');
      await b.evaluate(`(()=>{${seed}})()`); await b.navigate('/cliente');
      await b.until("location.pathname==='/login'", 'anonymous redirect'); await assertClean();
      // Legitimate public inquiry remains editable and does not inherit retired PII.
      await b.navigate('/solicitar'); await b.until("document.querySelectorAll('input:not(:disabled)').length>=3", 'public form');
      assert.ok(await b.evaluate(clean));
      assert.ok(await b.evaluate("[...document.querySelectorAll('input')].every(e=>!e.value.includes('PRIVATE_'))"));
    }
    assert.deepEqual(b.externalFirebase, []);
    assert.equal((await admin.firestore().listCollections()).length, 0, 'No business records created');
    writeFileSync(`${dir}/results.json`, JSON.stringify({ result: 'PASS', widths: [1280, 390], cases: ['legacy eviction', 'A logout B login', 'reload', 'direct UID switch', 'anonymous', 'unrelated key preserved', 'legitimate public form', 'no external Firebase'], firestoreWrites: 0 }, null, 2));
    console.log('CLIENT_LOCAL_PRIVACY_AUTH_DESKTOP_MOBILE = PASS');
  } finally {
    await browser?.close(); server.kill('SIGTERM');
    if (server.exitCode === null && server.signalCode === null) await new Promise<void>(resolve => server.once('close', () => resolve()));
    await admin.app().delete();
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
