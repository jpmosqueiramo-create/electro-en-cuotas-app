import './helpers/requireSafeEmulatorEnvironment';
import assert from 'node:assert/strict';
import {mkdirSync,readdirSync,readFileSync} from 'node:fs';
import {inflateSync} from 'node:zlib';
import {createServer} from 'node:http';
import {admin} from '../src/lib/firebaseAdmin';
import {productionRuntimeForEmulator} from '../src/lib/productionV2/runtime';
import {startProductionBrowserServer} from './helpers/productionAdapterBrowserServer';
import {CatalogBrowser} from './helpers/catalogBrowser';
async function main(){
 const photo=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAHgAAACgCAIAAABIaz/HAAACkUlEQVR4nO3csU0DQRBA0fPpsqmCSigFiTaIaQOJUqiEKjY+JFLLDsD7Z3b3/xhz46dh7QOLy3mem/VvB65hQnO50VBCQwkNJTSU0FBCQwkNdfznwU+fX9tifb88/+2BbjSU0FBCQwkNJTSU0FBCQwkNJfQId4adbqJy63S760ZDCQ0lNJTQUEJDCQ0lNJTQUEJDCQ0lNJTQUEJDCQ0lNJTQUEJDCQ0lNJTQ4/9xdsEP9d7JjYYSGkpoKKGhhIYSGkpoKKGhhIYSGkpoKKGhhB7/t3cPrH283f+CeH3faneMi3vri2uiH6MT33p4Ne5jGt9b362I+D6lMvOdB9vo1h+iwmGSvNENXLfc1c6EbvgzT7ROg25JzznrujnQLfWnOOXqCdCtwNsAfoZ9QeWUSfY1lfl59mWV4amq3BlO377yOpOz7YsrYxN6dEAJPQt0/XODmdONhuoLPco6A9O60VBCQwk9PvRYB3Tvmd1oKKGhhIYSGkpoKKGhhIYSGkpoKKHHhy7yCfAiM7vRUEJDCT0F9FjHdPSc1o2G6g49ylJH5zndaCihJ4KO8qcHMCG00VHYmpnNowOKg46SS41NhW50FLMm56GPjihjDU+ScEZHAWt+hpwXw0i1Trl62ruOSLLOum7m27vAn3PiT1Ly++gAn3nueZX/r37i9/l3/YxvhZffKneG0c2ignKJjb4Wech2F/GtCP2ow6QacV3oay//NylUlFzSIV8Mp09oKKGhhIYSGkpoKKGhhIYSGkpoKKGhhIYSGkpoKKGhhIYSGkpoKKGhhIYSGkpoKKGhhIYSGkpoKKGhhIYSGkpoKKGhhIYSGkpoqMt5ntS1ls6NhhIaSmgooaGEhhIaSmgooTemH0qSishA51YVAAAAAElFTkSuQmCC','base64');
 const imageServer=createServer((req,res)=>{if(req.url==='/photo.png'){res.setHeader('Access-Control-Allow-Origin','*');res.setHeader('Content-Type','image/png');res.end(photo);}else if(req.url==='/blocked.png'){res.setHeader('Content-Type','image/png');res.end(photo);}else{res.statusCode=404;res.end();}});
 await new Promise<void>(resolve=>imageServer.listen(9931,'127.0.0.1',resolve));
 const photos=[`data:image/png;base64,${photo.toString('base64')}`,'http://127.0.0.1:9931/photo.png','','http://127.0.0.1:9931/missing.png','http://127.0.0.1:9931/blocked.png','data:image/svg+xml;base64,PHN2Zy8+'];
 const db=admin.firestore(),email=process.env.NEXT_PUBLIC_ADMIN_EMAIL!,password='Emulator-only-123';
 const owner=await admin.auth().createUser({email,password,emailVerified:true});
 for(let i=0;i<photos.length;i++)await db.collection('productos').doc(`pdf-${i}`).set({nombre:`Producto PDF ${i}`,costoProveedor:100000,proveedor:'PRIVADO',planesActivos:i===2?{}:{12:true},factoresPlanes:{12:3},imagenUrls:photos[i]?[photos[i]]:[],publicado:false,activo:false,stock:[]});
 const before=await db.collection('productos').get();
 const server=await startProductionBrowserServer(productionRuntimeForEmulator(db,admin.auth(),[],[owner.uid])),browser=await CatalogBrowser.open();
 try{
  await browser.navigate('/login');await browser.until("typeof window.__FIREBASE_SIGN_IN__==='function'",'auth');await browser.evaluate(`window.__FIREBASE_SIGN_IN__(${JSON.stringify(email)},${JSON.stringify(password)}).then(()=>true)`);await browser.navigate('/admin/productos');await browser.until("document.querySelectorAll('[data-reference-row]').length===6",'products');
  await browser.change('input[type=search]','Producto PDF 0');await browser.until("document.querySelectorAll('[data-reference-row]').length===1",'filter');
  const dir='/tmp/catalog-price-list/browser-'+Date.now();mkdirSync(dir,{recursive:true});
  await browser.command('Browser.setDownloadBehavior',{behavior:'allow',downloadPath:dir});await browser.click('[data-testid=catalog-price-list-export]');
  await browser.until("document.body.textContent.includes('PDF preparado: 6 productos.')",'full catalog PDF download');
  for(let tries=0;tries<50 && !readdirSync(dir).some(name=>name.endsWith('.pdf'));tries++)await new Promise(resolve=>setTimeout(resolve,100));
  const files=readdirSync(dir).filter(name=>name.endsWith('.pdf'));assert.equal(files.length,1);assert(files[0].endsWith('.pdf'));const pdf=readFileSync(dir+'/'+files[0]);assert(pdf.subarray(0,4).toString()==='%PDF');
  // Assert the downloaded PDF contains both real product photos and brand fallbacks.
  const source=pdf.toString('latin1');
  const objects=[...source.matchAll(/(\d+) 0 obj\n([\s\S]*?)endobj/g)];
  const photoIds=objects.filter(match=>/\/Subtype \/Image/.test(match[2])&&/\/Width 160\b/.test(match[2])).map(match=>match[1]);
  assert(photoIds.length>0,'embedded and HTTP product images must produce a JPEG thumbnail');
  const imageNames=[...source.matchAll(/\/(I\d+) (\d+) 0 R/g)].filter(match=>photoIds.includes(match[2])).map(match=>match[1]);
  const commands=objects.flatMap(match=>{if(!/\/FlateDecode/.test(match[2]))return [];const stream=/stream\r?\n([\s\S]*?)\r?\nendstream/.exec(match[2]);if(!stream)return [];try{return [inflateSync(Buffer.from(stream[1],'latin1')).toString('latin1')];}catch{return [];}}).join('\n');
  const draws=[...commands.matchAll(/\/(I\d+) Do/g)].map(match=>match[1]);
  assert.equal(draws.filter(name=>imageNames.includes(name)).length,2,'two available product photos must render');
  assert.equal(draws.filter(name=>!imageNames.includes(name)).length,5,'four brand fallbacks plus the header logo must render');
  for(const width of [1280,390,320]){await browser.command('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:width<768});await browser.overflow('PDF export '+width);}
  const after=await db.collection('productos').get();assert.equal(after.size,before.size);for(const doc of before.docs)assert(doc.updateTime.isEqual(after.docs.find(d=>d.id===doc.id)!.updateTime));assert.deepEqual(browser.externalFirebase,[]);assert.equal(browser.storageWrites,0);
  console.log('CATALOG_PDF_BROWSER_EMBEDDED_HTTP_MISSING_BROKEN_CORS_UNSUPPORTED_RESPONSIVE_NO_WRITES=PASS file='+dir+'/'+files[0]);
 }finally{await browser.close();await server.stop();await admin.app().delete();await new Promise<void>((resolve,reject)=>imageServer.close(error=>error?reject(error):resolve()));}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
