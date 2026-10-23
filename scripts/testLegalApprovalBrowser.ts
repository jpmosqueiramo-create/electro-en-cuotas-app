import './helpers/requireSafeEmulatorEnvironment';
import assert from 'node:assert/strict';
import { mkdirSync,writeFileSync } from 'node:fs';
import { admin } from '../src/lib/firebaseAdmin';
import { CatalogBrowser } from './helpers/catalogBrowser';
import { adminEmail,adminPassword } from './helpers/adminSolicitudesFixtures';
export async function testLegalApprovalBrowser(){
 await admin.auth().createUser({email:adminEmail,password:adminPassword,emailVerified:true});
 const browser=await CatalogBrowser.open(),out='/tmp/ch-legal-browser';mkdirSync(out,{recursive:true});
 try{await browser.navigate('/login');await browser.until("typeof window.__FIREBASE_SIGN_IN__==='function'",'auth');await browser.evaluate(`window.__FIREBASE_SIGN_IN__(${JSON.stringify(adminEmail)},${JSON.stringify(adminPassword)}).then(()=>true)`);await browser.navigate('/admin/aprobacion-documental');await browser.until("document.body.innerText.includes('Identificación de auditoría')",'legal registry');
 for(const [width,height,mobile]of [[1280,800,false],[390,844,true]] as const){await browser.command('Emulation.setDeviceMetricsOverride',{width,height,mobile,deviceScaleFactor:1});await browser.overflow('legal '+width);const img=await browser.command('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});writeFileSync(`${out}/${width}.png`,Buffer.from(img.data as string,'base64'));}
 assert(await browser.evaluate("document.body.innerText.includes('no heredan la aprobación')"));assert.equal(await browser.evaluate("document.querySelector('select[name=document]').options.length"),4);await browser.click('input[type=checkbox]');await browser.clickText('Registrar validación');await browser.until("document.body.innerText.includes('Registro guardado.')",'declaration saved');assert(await browser.evaluate("document.body.innerText.includes('Declaración pendiente de verificación')"));assert.deepEqual(browser.externalFirebase,[]);console.log('LEGAL_ADMIN_BROWSER_DESKTOP_MOBILE_DECLARATION=PASS');
 }finally{await browser.close();}
}
