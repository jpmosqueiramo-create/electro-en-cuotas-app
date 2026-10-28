import './helpers/requireSafeEmulatorEnvironment';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { admin } from '../src/lib/firebaseAdmin';
import { POST } from '../src/app/api/admin/catalogo/carga-masiva/route';
import { prepareCatalogPublication } from '../src/lib/catalogPublicationContent';
import { createCatalogReferenceDraft, buildCatalogReferencePrivatePatch } from '../src/lib/catalogReferenceEditor';
import { p1Token } from './testPortalP1Emulator';
import { publicSensitivePaths } from './helpers/catalogC4Fixtures';
import { productionRuntimeForEmulator } from '../src/lib/productionV2/runtime';
import { startProductionBrowserServer } from './helpers/productionAdapterBrowserServer';
import { CatalogBrowser } from './helpers/catalogBrowser';
async function main(){
 const db=admin.firestore(),password='Emulator-only-123',email=process.env.NEXT_PUBLIC_ADMIN_EMAIL!;
 const owner=await admin.auth().createUser({email,password,emailVerified:true}),outsider=await admin.auth().createUser({email:'bulk-client@example.test',password,emailVerified:true});
 const token=await p1Token(owner),other=await p1Token(outsider);
 const request=(body:unknown,t?:string)=>POST(new Request('http://localhost/api/admin/catalogo/carga-masiva',{method:'POST',headers:{'Content-Type':'application/json',...(t?{Authorization:'Bearer '+t}:{})},body:JSON.stringify(body)}));
 const draft=createCatalogReferenceDraft();Object.assign(draft,{skuInterno:'EXISTING-01',nombre:'Producto sintético existente',costoProveedor:'100000',proveedor:'Proveedor privado',descripcion:'Descripción conservada',imagenUrls:['/logo-cuenta-hogar-oficial.png']});draft.planesActivos[12]=true;draft.factoresPlanes[12]=3;
 const ref=db.collection('productos').doc('bulk-existing'),stock=[{id:'unit',at:admin.firestore.Timestamp.now()}],created=admin.firestore.Timestamp.now();
 await ref.set({...buildCatalogReferencePrivatePatch(draft),stock,fechaCreacion:created,custom:{preserve:true}});
 const pub=db.collection('catalogo_publico').doc(ref.id),initialPublic=prepareCatalogPublication(ref.id,(await ref.get()).data()!).dto;await pub.set(initialPublic!);
 const history=db.collection('presupuestos_v2').doc('bulk-history');await history.set({snapshot:{costo:100000,cuotas:12,hash:'UNCHANGED'}});const historyBefore=await history.get();
 const text='id;costo\nbulk-existing;150000';
 for(const t of [undefined,other])assert([401,403].includes((await request({action:'PREVIEW',text,updatePublished:false},t)).status));
 assert.equal((await request({action:'PREVIEW',text:'sku;bad\nx;y',updatePublished:false},token)).status,400);
 const before=await ref.get();
 const preview=await (await request({action:'PREVIEW',text,updatePublished:false},token)).json();assert(preview.valid);assert.equal(preview.rows[0].previousCost,100000);assert.equal(preview.rows[0].plans[0].cuotaEstimada,37590);
 assert.equal((await ref.get()).updateTime!.isEqual(before.updateTime!),true);assert.equal((await db.collection('catalogo_cargas_masivas').get()).size,0);
 const command={action:'APPLY',text,updatePublished:false,digest:preview.digest,commandId:randomUUID()};
 const results=await Promise.all([request(command,token),request(command,token)]);assert(results.every(r=>r.status===200));const data=await Promise.all(results.map(r=>r.json()));assert.equal(data.filter(r=>!r.replay).length,1);
 assert.equal((await ref.get()).data()!.costoProveedor,150000);assert.deepEqual((await ref.get()).data()!.stock,stock);assert((await ref.get()).data()!.fechaCreacion.isEqual(created));assert.deepEqual((await pub.get()).data(),initialPublic);
 assert.equal((await request({...command,text:text+'\n'},token)).status,409);
 const stale=await (await request({action:'PREVIEW',text,updatePublished:true},token)).json();await ref.update({custom:{preserve:'concurrent'}});
 assert.equal((await request({action:'APPLY',text,updatePublished:true,digest:stale.digest,commandId:randomUUID()},token)).status,409);
 const fresh=await (await request({action:'PREVIEW',text,updatePublished:true},token)).json();assert.equal(fresh.publishedUpdates,1);
 assert.equal((await request({action:'APPLY',text,updatePublished:true,digest:fresh.digest,commandId:randomUUID()},token)).status,200);assert.deepEqual(publicSensitivePaths((await pub.get()).data()),[]);assert.equal((await pub.get()).data()!.planesPublicados[0].cuotaEstimada,37590);
 const mixed='id;sku;nombre;costo;proveedor;cuotas;factor_12\nbulk-existing;;;160000;;;\n;NEW-01;Nuevo;200000;Proveedor nuevo;12;3';
 const mixedPreview=await (await request({action:'PREVIEW',text:mixed,updatePublished:true},token)).json();assert(mixedPreview.valid);assert.equal((await request({action:'APPLY',text:mixed,updatePublished:true,digest:mixedPreview.digest,commandId:randomUUID()},token)).status,200);
 assert.equal((await db.collection('productos').get()).size,2);assert.equal((await db.collection('catalogo_publico').get()).size,1);
 const duplicate=await (await request({action:'PREVIEW',text:text+'\nbulk-existing;170000',updatePublished:false},token)).json();assert.equal(duplicate.valid,false);
 const missing=await (await request({action:'PREVIEW',text:'id;costo\nmissing;10',updatePublished:false},token)).json();assert.equal(missing.valid,false);
 const atomic=await (await request({action:'PREVIEW',text:text+'\nmissing;10',updatePublished:false},token)).json();assert.equal((await request({action:'APPLY',text:text+'\nmissing;10',updatePublished:false,digest:atomic.digest,commandId:randomUUID()},token)).status,400);assert.equal((await ref.get()).data()!.costoProveedor,160000);
 assert.equal((await request(command,token)).status,200);assert.equal((await ref.get()).data()!.costoProveedor,160000);
 assert.equal((await history.get()).updateTime!.isEqual(historyBefore.updateTime!),true);
 console.log('BULK_EMULATOR_AUTH_NO_PREVIEW_WRITES_ATOMICITY_CONCURRENCY_REPLAY_PRIVATE_PUBLIC_ALLOWLIST_PRESERVATION=PASS');
 if(process.env.CATALOG_BULK_BROWSER==='1'){
  const server=await startProductionBrowserServer(productionRuntimeForEmulator(db,admin.auth(),[],[owner.uid])),browser=await CatalogBrowser.open();
  try{
   await browser.navigate('/login');await browser.until("typeof window.__FIREBASE_SIGN_IN__==='function'",'auth');await browser.evaluate(`window.__FIREBASE_SIGN_IN__(${JSON.stringify(email)},${JSON.stringify(password)}).then(()=>true)`);
   await browser.navigate('/admin/productos');await browser.until("!!document.querySelector('[data-testid=catalog-bulk] button:not(:disabled)')",'bulk panel');await browser.clickText('Abrir carga masiva');
   await browser.change('[data-testid=catalog-bulk] textarea','id;costo\nbulk-existing;180000');await browser.clickText('Revisar carga');await browser.until("document.querySelectorAll('[data-testid=catalog-bulk-row]').length===1",'row preview');
   for(const width of [1280,390,320]){await browser.command('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:width<768});await browser.evaluate("document.querySelector('[data-testid=catalog-bulk]').scrollIntoView({block:'start'})");await browser.overflow('bulk '+width);await browser.screenshot('catalog-bulk-'+width+'.png');}
   await browser.clickText('Confirmar carga de 1 productos');await browser.until("document.querySelector('[data-testid=catalog-bulk]').innerText.includes('1 productos guardados')",'save confirmation');assert.equal((await ref.get()).data()!.costoProveedor,180000);
   await browser.until("document.querySelector('[data-testid=catalog-bulk] textarea')?.closest('fieldset').disabled===false",'catalog refresh complete');writeFileSync('/tmp/catalog-bulk-upload.csv','id;costo\nbulk-existing;=1+1');const document=await browser.command('DOM.getDocument');const fileInput=await browser.command('DOM.querySelector',{nodeId:(document.root as {nodeId:number}).nodeId,selector:'[data-testid=catalog-bulk] input[type=file]'});await browser.command('DOM.setFileInputFiles',{nodeId:fileInput.nodeId,files:['/tmp/catalog-bulk-upload.csv']});await browser.until("document.querySelector('[data-testid=catalog-bulk] textarea').value.includes('=1+1')&&!document.querySelector('[data-testid=catalog-bulk] textarea').closest('fieldset').disabled",'CSV file read');await browser.clickText('Revisar carga');await browser.until("document.querySelector('[data-testid=catalog-bulk-row]')?.innerText.includes('sin símbolo')",'row error');assert.equal(await browser.evaluate("[...document.querySelectorAll('[data-testid=catalog-bulk] button')].find(b=>b.textContent.includes('Confirmar carga')).disabled"),true);
   await browser.clickText('Editar');await browser.until("!!document.querySelector('#reference-editor')&&document.querySelector('[data-testid=catalog-bulk] textarea').closest('fieldset').disabled",'individual editor protects import');await browser.clickText('Cerrar editor');
   assert.deepEqual(browser.externalFirebase,[]);console.log('BULK_BROWSER_PASTE_CSV_UPLOAD_REVIEW_CONFIRM_ERROR_ROWS_RESPONSIVE_1280_390_320=PASS');
  }finally{await browser.close();await server.stop();}
 }
 await admin.app().delete();
}
main().catch(e=>{console.error(e);process.exitCode=1;});
