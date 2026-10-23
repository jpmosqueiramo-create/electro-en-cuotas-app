import './helpers/requireSafeEmulatorEnvironment';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { admin } from '../src/lib/firebaseAdmin';
import { CatalogBrowser } from './helpers/catalogBrowser';
import { adminEmail, adminPassword } from './helpers/adminSolicitudesFixtures';
export async function testOperationsLabBrowser() {
 assert.equal(process.env.GCLOUD_PROJECT,'demo-cuenta-hogar');
 await admin.auth().createUser({uid:'synthetic-lab-browser',email:adminEmail,password:adminPassword,emailVerified:true});
 const browser=await CatalogBrowser.open(),out='/tmp/ch-lab-browser';mkdirSync(out,{recursive:true});
 try {
  await browser.navigate('/login');await browser.until("typeof window.__FIREBASE_SIGN_IN__==='function'",'auth');
  await browser.evaluate(`window.__FIREBASE_SIGN_IN__(${JSON.stringify(adminEmail)},${JSON.stringify(adminPassword)}).then(()=>true)`);
  await browser.navigate('/admin/laboratorio');await browser.until("document.body.innerText.includes('Acceso verificado')",'lab authorization');
  assert(await browser.evaluate("document.body.innerText.includes('todavía no están disponibles')"));
  await browser.clickText('Registrar sesión sintética');await browser.until("document.body.innerText.includes('Sesión sintética registrada')",'session saved');
  assert(await browser.evaluate("document.body.innerText.includes('Sesión 1')"));
  for(const [width,height,mobile] of [[1280,800,false],[390,844,true]] as const) {
   await browser.command('Emulation.setDeviceMetricsOverride',{width,height,mobile,deviceScaleFactor:1});
   await browser.overflow('lab '+width);
   await browser.evaluate('window.scrollTo(0,0)');
   const image=await browser.command('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
   writeFileSync(`${out}/${width}.png`,Buffer.from(image.data as string,'base64'));
  }
  await browser.navigate('/admin/laboratorio');await browser.until("document.body.innerText.includes('Sesión 1')",'persistent session');
  assert.deepEqual(browser.externalFirebase,[]);assert.equal(browser.storageWrites,0);
  console.log('LAB_BROWSER_DESKTOP_MOBILE_PERSISTENCE_PASS');
 } finally {await browser.close();}
}
