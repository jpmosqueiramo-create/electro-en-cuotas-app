import './helpers/requireSafeEmulatorEnvironment';
import assert from 'node:assert/strict';
import {mkdirSync,readdirSync,readFileSync} from 'node:fs';
import {admin} from '../src/lib/firebaseAdmin';
import {productionRuntimeForEmulator} from '../src/lib/productionV2/runtime';
import {startProductionBrowserServer} from './helpers/productionAdapterBrowserServer';
import {CatalogBrowser} from './helpers/catalogBrowser';
async function main(){
 const db=admin.firestore(),email=process.env.NEXT_PUBLIC_ADMIN_EMAIL!,password='Emulator-only-123';
 const owner=await admin.auth().createUser({email,password,emailVerified:true});
 for(let i=0;i<3;i++)await db.collection('productos').doc(`pdf-${i}`).set({nombre:`Producto PDF ${i}`,costoProveedor:100000,proveedor:'PRIVADO',planesActivos:i===2?{}:{12:true},factoresPlanes:{12:3},imagenUrls:i===0?['/logo-cuenta-hogar-oficial.png']:[],publicado:false,activo:false,stock:[]});
 const before=await db.collection('productos').get();
 const server=await startProductionBrowserServer(productionRuntimeForEmulator(db,admin.auth(),[],[owner.uid])),browser=await CatalogBrowser.open();
 try{
  await browser.navigate('/login');await browser.until("typeof window.__FIREBASE_SIGN_IN__==='function'",'auth');await browser.evaluate(`window.__FIREBASE_SIGN_IN__(${JSON.stringify(email)},${JSON.stringify(password)}).then(()=>true)`);await browser.navigate('/admin/productos');await browser.until("document.querySelectorAll('[data-reference-row]').length===3",'products');
  await browser.change('input[type=search]','Producto PDF 0');await browser.until("document.querySelectorAll('[data-reference-row]').length===1",'filter');
  const dir='/tmp/catalog-price-list/browser-'+Date.now();mkdirSync(dir,{recursive:true});
  await browser.command('Browser.setDownloadBehavior',{behavior:'allow',downloadPath:dir});await browser.click('[data-testid=catalog-price-list-export]');
  await browser.until("document.body.textContent.includes('PDF preparado: 3 productos.')",'full catalog PDF download');
  for(let tries=0;tries<50 && !readdirSync(dir).some(name=>name.endsWith('.pdf'));tries++)await new Promise(resolve=>setTimeout(resolve,100));
  const files=readdirSync(dir).filter(name=>name.endsWith('.pdf'));assert.equal(files.length,1);assert(files[0].endsWith('.pdf'));assert(readFileSync(dir+'/'+files[0]).subarray(0,4).toString()==='%PDF');
  for(const width of [1280,390,320]){await browser.command('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:width<768});await browser.overflow('PDF export '+width);}
  const after=await db.collection('productos').get();assert.equal(after.size,before.size);for(const doc of before.docs)assert(doc.updateTime.isEqual(after.docs.find(d=>d.id===doc.id)!.updateTime));assert.deepEqual(browser.externalFirebase,[]);assert.equal(browser.storageWrites,0);
  console.log('CATALOG_PDF_BROWSER_DOWNLOAD_ALL_DESPITE_FILTER_THUMBNAIL_RESPONSIVE_NO_WRITES=PASS file='+dir+'/'+files[0]);
 }finally{await browser.close();await server.stop();await admin.app().delete();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
