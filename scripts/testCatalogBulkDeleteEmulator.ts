import './helpers/requireSafeEmulatorEnvironment';
import assert from 'node:assert/strict';
import { admin } from '../src/lib/firebaseAdmin';
import { POST } from '../src/app/api/admin/catalogo/eliminar-masivo/route';
import { p1Token } from './testPortalP1Emulator';
import { productionRuntimeForEmulator } from '../src/lib/productionV2/runtime';
import { startProductionBrowserServer } from './helpers/productionAdapterBrowserServer';
import { CatalogBrowser } from './helpers/catalogBrowser';
import { buildCatalogReferencePrivatePatch, createCatalogReferenceDraft } from '../src/lib/catalogReferenceEditor';
async function main(){
 const db=admin.firestore(),email=process.env.NEXT_PUBLIC_ADMIN_EMAIL!,password='Emulator-only-123';
 const owner=await admin.auth().createUser({email,password,emailVerified:true}),other=await admin.auth().createUser({email:'delete-outsider@example.test',password,emailVerified:true});
 const token=await p1Token(owner),outsider=await p1Token(other);
 const request=(body:unknown,t:string|undefined=token)=>POST(new Request('http://localhost/api/admin/catalogo/eliminar-masivo',{method:'POST',headers:{'Content-Type':'application/json',...(t?{Authorization:'Bearer '+t}:{})},body:JSON.stringify(body)}));
 const draft=createCatalogReferenceDraft();Object.assign(draft,{nombre:'Eliminar prueba',skuInterno:'DELETE-TEST',proveedor:'Proveedor sintético',costoProveedor:'100000'});draft.planesActivos[12]=true;draft.factoresPlanes[12]=3;
 const fixture={...buildCatalogReferencePrivatePatch(draft),activo:false,publicado:false};
 const a=db.collection('productos').doc('delete-a'),b=db.collection('productos').doc('delete-b'),stock=db.collection('productos').doc('delete-stock'),published=db.collection('productos').doc('delete-published');
 await Promise.all([a.set({...fixture,nombre:'Eliminar prueba A'}),b.set({...fixture,nombre:'Eliminar prueba B'}),stock.set({...fixture,nombre:'Con unidades',stock:[{id:'keep-unit',nserie:'TEST'}]}),published.set({...fixture,nombre:'Publicado'})]);
 const projection=db.collection('catalogo_publico').doc(published.id);await projection.set({publicado:true,nombre:'Publicado'});
 const history=db.collection('presupuestos_v2').doc('delete-history');await history.set({snapshot:{referenceId:a.id,nombre:'Histórico'}});const historyBefore=await history.get();
 const body={action:'PREVIEW',ids:[a.id,b.id]};
 assert.equal((await request(body,'')).status,401);assert.equal((await request(body,outsider)).status,403);
 for(const ids of [[],[a.id,a.id],['../escape'],Array.from({length:101},(_,i)=>String(i)),[{}]])assert.equal((await request({action:'PREVIEW',ids})).status,400);
 assert.equal((await request({...body,unexpected:true})).status,400);
 const before=await a.get();const preview=await (await request(body)).json();assert.equal(preview.rows.length,2);assert((await a.get()).updateTime!.isEqual(before.updateTime!));
 for(const id of [stock.id,published.id])assert.equal((await request({action:'PREVIEW',ids:[a.id,id]})).status,409);
 await b.update({nombre:'Cambio concurrente'});assert.equal((await request({...body,action:'APPLY',digest:preview.digest})).status,409);assert((await a.get()).exists);
 const fresh=await (await request(body)).json();await db.collection('catalogo_publico').doc(b.id).set({publicado:true});assert.equal((await request({...body,action:'APPLY',digest:fresh.digest})).status,409);assert((await a.get()).exists);await db.collection('catalogo_publico').doc(b.id).delete();
 const noStock=await (await request(body)).json();await b.update({stock:[{id:'new-unit'}]});assert.equal((await request({...body,action:'APPLY',digest:noStock.digest})).status,409);await b.update({stock:[]});
 const ready=await (await request(body)).json();const applied=await Promise.all([request({...body,action:'APPLY',digest:ready.digest}),request({...body,action:'APPLY',digest:ready.digest})]);assert(applied.every(r=>r.status===200));assert(!(await a.get()).exists&&!(await b.get()).exists);
 await a.set(fixture);assert.equal((await request({...body,action:'APPLY',digest:ready.digest})).status,409);assert((await a.get()).exists);await b.set({...fixture,nombre:'Eliminar prueba B'});
 console.log('BULK_DELETE_AUTH_VALIDATION_PREVIEW_NO_WRITES_ATOMIC_STALE_PUBLICATION_STOCK_RACES_CONCURRENT_RETRY_RECREATED_ID=PASS');
 if(process.env.CATALOG_DELETE_BROWSER==='1'){
  const server=await startProductionBrowserServer(productionRuntimeForEmulator(db,admin.auth(),[],[owner.uid])),browser=await CatalogBrowser.open();
  try{
   await browser.navigate('/login');await browser.until("typeof window.__FIREBASE_SIGN_IN__==='function'",'auth');await browser.evaluate(`window.__FIREBASE_SIGN_IN__(${JSON.stringify(email)},${JSON.stringify(password)}).then(()=>true)`);await browser.navigate('/admin/productos');
   await browser.until("document.querySelector('[data-reference-row=delete-a] input[type=checkbox]')?.disabled===false",'selectable private product');
   assert.equal(await browser.evaluate("document.querySelector('[data-reference-row=delete-stock] input[type=checkbox]').disabled"),true);assert.equal(await browser.evaluate("document.querySelector('[data-reference-row=delete-published] input[type=checkbox]').disabled"),true);
   await browser.change('input[type=search]','Eliminar prueba');await browser.click('[data-testid=catalog-selection] input');await browser.until("document.querySelector('[data-testid=catalog-selection]').innerText.includes('2 seleccionados')",'select visible products');
   await browser.change('input[type=search]','No coincide');assert.equal(await browser.evaluate("document.querySelector('[data-testid=catalog-selection]').innerText.includes('2 seleccionados')"),true);
   await browser.clickText('Eliminar seleccionados');await browser.until("document.querySelector('[role=dialog]')?.innerText.includes('Eliminar prueba B')",'review names before deletion');await browser.clickText('Cancelar');assert((await a.get()).exists&&(await b.get()).exists);
   await browser.clickText('Eliminar seleccionados');await browser.until("!!document.querySelector('[role=dialog]')",'reopen confirmation');
   for(const width of [1280,390,320]){await browser.command('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:width<768});await browser.overflow('bulk-delete-'+width);await browser.screenshot('catalog-bulk-delete-'+width+'.png');}
   await browser.clickText('Confirmar eliminación');await browser.until("document.body.innerText.includes('2 productos eliminados del catálogo.')",'success');assert(!(await a.get()).exists&&!(await b.get()).exists);await browser.change('input[type=search]','');await browser.until("!document.querySelector('[data-reference-row=delete-a]')&&!document.querySelector('[data-reference-row=delete-b]')",'list refreshed');
   assert.deepEqual(browser.externalFirebase,[]);console.log('BULK_DELETE_BROWSER_CHECKBOX_FILTER_RETAIN_CANCEL_CONFIRM_RESPONSIVE_LIST_REFRESH=PASS');
  }finally{await browser.close();await server.stop();}
 }
 assert.equal((await stock.get()).data()!.stock[0].id,'keep-unit');assert((await projection.get()).exists);assert((await history.get()).updateTime!.isEqual(historyBefore.updateTime!));console.log('BULK_DELETE_RELATED_UNITS_PUBLICATIONS_HISTORY_PRESERVED=PASS');await admin.app().delete();
}
main().catch(e=>{console.error(e);process.exitCode=1;});
