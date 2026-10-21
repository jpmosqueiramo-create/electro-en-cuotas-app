import './helpers/requireSafeEmulatorEnvironment';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {mkdirSync,writeFileSync} from 'node:fs';
import {admin} from '../src/lib/firebaseAdmin';
import {CatalogBrowser} from './helpers/catalogBrowser';
export async function testPreparedAffiliateLinkBrowser(){
 const email='admin.prepared@example.test',password='Emulator-only-123';assert.equal(process.env.NEXT_PUBLIC_ADMIN_EMAIL,email);
 let root;try{root=await admin.auth().getUserByEmail(email);await admin.auth().updateUser(root.uid,{password});}catch{root=await admin.auth().createUser({email,password,emailVerified:true});}
 const affiliate=await admin.auth().createUser({email:`prepared-browser-${randomUUID()}@example.test`,password,emailVerified:true}),id=randomUUID(),commandId=randomUUID(),db=admin.firestore(),browser=await CatalogBrowser.open(),scope='[data-testid=prepared-affiliate-link]',out='/tmp/cuenta-hogar-prepared-affiliate';mkdirSync(out,{recursive:true});
 async function capture(name:string){await browser.overflow(name);const shot=await browser.command('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});writeFileSync(`${out}/${name}.png`,Buffer.from(shot.data as string,'base64'));}
 async function login(address:string){await browser.navigate('/login');await browser.until("typeof window.__FIREBASE_SIGN_IN__==='function'",'emulator auth');await browser.evaluate(`window.__FIREBASE_SIGN_IN__(${JSON.stringify(address)},${JSON.stringify(password)}).then(()=>true)`);}
 try{
 await browser.command('Emulation.setDeviceMetricsOverride',{width:1280,height:900,deviceScaleFactor:1,mobile:false});await login(email);await browser.navigate('/admin/comisiones');await browser.until(`!!document.querySelector('${scope}')`,'prepared mode');
 assert.equal(await browser.evaluate(`document.querySelector('${scope}').open`),false);await browser.click(`${scope} summary`);
 const values={id,commandId,authUid:affiliate.uid,nombre:'Afiliado browser sintético',email:affiliate.email!,localidad:'Localidad sintética',porcentajeComision:'10',reason:'Alta preparada de prueba local'};for(const [key,value]of Object.entries(values))await browser.change(`${scope} input[name=${key}]`,value);
 await browser.clickText('Verificar vinculación preparada');await browser.until(`document.querySelector('${scope}').textContent.includes('Identidad y destinos verificados')`,'preflight');assert.equal((await db.collection('vendedores').doc(id).get()).exists,false);
 assert.equal(await browser.evaluate(`([...document.querySelectorAll('${scope} button')].find(b=>b.textContent==='Confirmar vinculación preparada')).disabled`),true);
 await browser.evaluate(`document.querySelector('${scope}').scrollIntoView({block:'start'})`);await capture('prepared-review-desktop');
 await browser.command('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});await capture('prepared-review-mobile');await browser.evaluate("document.querySelector('[data-testid=prepared-affiliate-summary]').scrollIntoView({block:'start'})");await capture('prepared-confirmation-mobile');
 // Any edit invalidates the preflight and requires verification again.
 await browser.change(`${scope} input[name=localidad]`,'Localidad corregida sintética');await browser.until(`!document.querySelector('${scope} input[type=checkbox]')`,'invalidated preview');await browser.clickText('Verificar vinculación preparada');await browser.until(`!!document.querySelector('${scope} input[type=checkbox]')`,'verified again');
 await browser.click(`${scope} input[type=checkbox]`);await browser.clickText('Confirmar vinculación preparada');await browser.until(`document.querySelector('${scope}').textContent.includes('Vinculación confirmada')`,'saved');
 const ref=db.collection('vendedores').doc(id),snapshot=await ref.get();assert.equal(snapshot.data()!.authUid,affiliate.uid);assert.equal(snapshot.data()!.localidad,'Localidad corregida sintética');assert.equal((await ref.collection('registryCommands').get()).size,1);assert.equal((await ref.collection('registryHistory').get()).size,1);assert.equal((await db.collection('vendedores_configuraciones_comision').where('vendedorAfiliadoId','==',id).get()).size,1);
 await capture('prepared-saved-mobile');await browser.evaluate('window.__FIREBASE_SIGN_OUT__().then(()=>true)');await login(affiliate.email!);await browser.navigate('/afiliado');await browser.until("document.body.innerText.includes('Sin operaciones asignadas.')",'no assignments');assert.equal(await browser.evaluate(`!!document.querySelector('${scope}')`),false);assert.equal(await browser.evaluate("document.body.innerText.includes('Cargar nueva solicitud')"),false);await capture('affiliate-mobile');assert.deepEqual(browser.externalFirebase,[]);
 console.log('PREPARED_LINK_BROWSER=PASS; DESKTOP_MOBILE=PASS; PREVIEW_WRITES=0; EXPLICIT_CONFIRMATION=PASS; EDIT_INVALIDATES_PREVIEW=PASS; EXACT_IDS=PASS; FOUR_DOCUMENTS=PASS; AFFILIATE_NO_ADMIN_FORM=PASS; NO_ASSIGNMENTS=PASS; OVERFLOW=0; PRODUCTION_REQUESTS=0');
 }finally{await browser.close();}
}
