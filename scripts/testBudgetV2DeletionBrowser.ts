import './helpers/requireSafeEmulatorEnvironment';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {mkdirSync,writeFileSync} from 'node:fs';
import {admin} from '../src/lib/firebaseAdmin';
import {CatalogBrowser} from './helpers/catalogBrowser';
import {budgetFixture} from './helpers/budgetV2Fixtures';
import {persistBudgetV2} from '../src/lib/budgetV2Persistence';
export async function testBudgetV2DeletionBrowser(){
 const email=process.env.NEXT_PUBLIC_ADMIN_EMAIL!,password='Emulator-only-123';assert(email,'Explicit emulator administrator required');
 try{const u=await admin.auth().getUserByEmail(email);await admin.auth().updateUser(u.uid,{password});}catch{await admin.auth().createUser({email,password,emailVerified:true});}
 const db=admin.firestore(),browser=await CatalogBrowser.open(),out='/tmp/cuenta-hogar-budget-deletion';mkdirSync(out,{recursive:true});
 async function seed(label:string,blocked=false){const b=budgetFixture('delete-browser-'+randomUUID());b.clienteSnapshot.nombre=label;b.solicitudId='delete-browser-source-'+randomUUID();await db.doc('solicitudes/'+b.solicitudId).set({nombre:label,estado:'PENDIENTE'});await persistBudgetV2(db,{action:'SAVE',commandId:randomUUID(),budget:b,expectedRevision:0,privateOptionIds:[]},'browser-admin');if(blocked)await db.doc(`presupuestos_v2/${b.id}/contracts/v1/creditReview/current`).set({state:'PENDING_DATA'});return b;}
 const allowed=await seed('BORRADO DESKTOP SINTÉTICO'),mobile=await seed('BORRADO MOBILE SINTÉTICO'),blocked=await seed('BLOQUEADO SINTÉTICO',true);
 async function capture(name:string){await browser.overflow(name);const shot=await browser.command('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});writeFileSync(`${out}/${name}.png`,Buffer.from(shot.data as string,'base64'));}
 async function select(name:string){await browser.field('Buscar presupuesto V2',name);await browser.until("document.querySelectorAll('button').length>0",'history');await browser.clickText('Eliminar presupuesto');await browser.until("!!document.querySelector('[data-testid=budget-delete-dialog]')",'delete dialog');await browser.clickText('Verificar dependencias');await browser.until("!!document.querySelector('[data-testid=budget-delete-preview]')",'dependency preview');}
 try{
 await browser.command('Emulation.setDeviceMetricsOverride',{width:1280,height:900,deviceScaleFactor:1,mobile:false});await browser.navigate('/login');await browser.until("typeof window.__FIREBASE_SIGN_IN__==='function'",'emulator auth');await browser.evaluate(`window.__FIREBASE_SIGN_IN__(${JSON.stringify(email)},${JSON.stringify(password)}).then(()=>true)`);await browser.navigate('/admin/presupuestos');await browser.until("document.body.innerText.includes('BORRADO DESKTOP SINTÉTICO')",'history loaded');await capture('history-desktop');
 await select(allowed.clienteSnapshot.nombre);assert.equal(await browser.evaluate("document.querySelector('[data-testid=confirm-budget-delete]').disabled"),true);await capture('confirmation-desktop');await browser.click('[data-testid=budget-delete-dialog] input[type=checkbox]');await browser.click('[data-testid=confirm-budget-delete]');await browser.until("!document.querySelector('[data-testid=budget-delete-dialog]')",'deleted');assert.equal((await db.doc(`presupuestos_v2/${allowed.id}`).get()).exists,false);assert.equal((await db.doc('solicitudes/'+allowed.solicitudId).get()).exists,true);await browser.navigate('/admin/presupuestos');await browser.until("document.body.innerText.includes('BLOQUEADO SINTÉTICO')",'reload history');assert.equal(await browser.evaluate("document.body.innerText.includes('BORRADO DESKTOP SINTÉTICO')"),false);
 await browser.command('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});await select(mobile.clienteSnapshot.nombre);await capture('confirmation-mobile');await browser.click('[data-testid=budget-delete-dialog] input[type=checkbox]');await browser.click('[data-testid=confirm-budget-delete]');await browser.until("!document.querySelector('[data-testid=budget-delete-dialog]')",'mobile deleted');assert.equal((await db.doc(`presupuestos_v2/${mobile.id}`).get()).exists,false);
 await select(blocked.clienteSnapshot.nombre);assert.equal(await browser.evaluate("!!document.querySelector('[data-testid=confirm-budget-delete]')"),false);await capture('blocked-mobile');assert.equal((await db.doc(`presupuestos_v2/${blocked.id}`).get()).exists,true);assert.deepEqual(browser.externalFirebase,[]);
 console.log('BUDGET_DELETE_BROWSER=PASS; DESKTOP_MOBILE=PASS; EXPLICIT_CONFIRMATION=PASS; HISTORY_REFRESH_RELOAD=PASS; SOURCE_PRESERVED=PASS; DEPENDENCY_BLOCK=PASS; OVERFLOW=0; PRODUCTION_REQUESTS=0');
 }finally{await browser.close();}
}
