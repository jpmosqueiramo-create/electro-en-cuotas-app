import './helpers/requireSafeEmulatorEnvironment';
import assert from 'node:assert/strict';
import { admin } from '../src/lib/firebaseAdmin';
import { createCatalogReferenceDraft,buildCatalogReferencePrivatePatch } from '../src/lib/catalogReferenceEditor';
import { productionRuntimeForEmulator } from '../src/lib/productionV2/runtime';
import { startProductionBrowserServer } from './helpers/productionAdapterBrowserServer';
import { CatalogBrowser } from './helpers/catalogBrowser';
async function main(){
 const db=admin.firestore(),email=process.env.NEXT_PUBLIC_ADMIN_EMAIL!,password='Emulator-only-123';
 const owner=await admin.auth().createUser({email,password,emailVerified:true});
 const configs=[{id:'list-a',nombre:'Lavarropas Uno',marca:'Kanji',tipoProducto:'Lavarropas',cost:'400000',factor:1,active:true},{id:'list-b',nombre:'Secarropas Dos',marca:'Wanke',tipoProducto:'Secarropas',cost:'100000',factor:12,active:true},{id:'list-c',nombre:'Heladera Tres',marca:'',tipoProducto:'',cost:'200000',factor:3,active:false}];
 for(const c of configs){const draft=createCatalogReferenceDraft();Object.assign(draft,{nombre:c.nombre,marca:c.marca,tipoProducto:c.tipoProducto,costoProveedor:c.cost,proveedor:'Proveedor sintético',descripcion:'Descripción sintética',imagenUrls:['/logo-cuenta-hogar-oficial.png']});draft.planesActivos[8]=true;draft.planesActivos[12]=c.active;draft.factoresPlanes[12]=c.factor;const patch=buildCatalogReferencePrivatePatch(draft);await db.collection('productos').doc(c.id).set({...patch,activo:false,publicado:false,cuota12:c.active?patch.cuota12:987654,stock:[]});}
 // Legacy products without either new field remain editable without migration.
 await db.collection('productos').doc('list-c').update({marca:admin.firestore.FieldValue.delete(),tipoProducto:admin.firestore.FieldValue.delete()});
 const history=db.collection('presupuestos_v2').doc('list-history');await history.set({snapshot:{referenceId:'list-c',cost:200000}});const original=await history.get();
 const server=await startProductionBrowserServer(productionRuntimeForEmulator(db,admin.auth(),[],[owner.uid])),browser=await CatalogBrowser.open();
 try{
  await browser.navigate('/login');await browser.until("typeof window.__FIREBASE_SIGN_IN__==='function'",'auth');await browser.evaluate(`window.__FIREBASE_SIGN_IN__(${JSON.stringify(email)},${JSON.stringify(password)}).then(()=>true)`);await browser.navigate('/admin/productos');
  await browser.until("document.querySelectorAll('[data-reference-row]').length===3",'list rows');
  const ids=()=>browser.evaluate<string[]>("[...document.querySelectorAll('[data-reference-row]')].map(r=>r.dataset.referenceRow)");
  async function select(label:string,value:string){await browser.evaluate(`(()=>{const l=[...document.querySelectorAll('[data-testid=catalog-filters] label')].find(l=>l.querySelector('span')?.textContent===${JSON.stringify(label)});const s=l.querySelector('select');s.value=${JSON.stringify(value)};s.dispatchEvent(new Event('change',{bubbles:true}));})()`);}
  assert.deepEqual(await ids(),['list-c','list-a','list-b']);assert.equal(await browser.evaluate("document.querySelector('[data-reference-row=list-c] [data-catalog-installment12]').textContent"),'No disponible');
  await select('Ordenar por','cost');assert.deepEqual(await ids(),['list-b','list-c','list-a']);await browser.click('[aria-label="Invertir orden del catálogo"]');assert.deepEqual(await ids(),['list-a','list-c','list-b']);await select('Ordenar por','installment12');assert.deepEqual(await ids(),['list-b','list-a','list-c']);await browser.click('[aria-label="Invertir orden del catálogo"]');assert.deepEqual(await ids(),['list-a','list-b','list-c']);
  await select('Marca',JSON.stringify('Kanji'));assert.deepEqual(await ids(),['list-a']);await select('Tipo de producto',JSON.stringify('Secarropas'));assert.deepEqual(await ids(),[]);await select('Marca','');assert.deepEqual(await ids(),['list-b']);await browser.change('input[type=search]','wánke DOS');assert.deepEqual(await ids(),['list-b']);await browser.clickText('Restablecer filtros');
  for(const width of [1280,390,320]){await browser.command('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:width<768});await browser.evaluate("document.querySelector('[data-testid=catalog-filters]').scrollIntoView({block:'start'})");await browser.overflow('catalog-list-'+width);await browser.screenshot('catalog-list-'+width+'.png');}
  await browser.command('Emulation.setDeviceMetricsOverride',{width:1280,height:900,deviceScaleFactor:1,mobile:false});await browser.click('[data-reference-row=list-c] button');await browser.until("!!document.querySelector('#reference-editor')",'editor');await browser.field('Marca','Samsung');await browser.field('Tipo de producto','Heladeras');await browser.clickText('Guardar cambios');await browser.until("document.querySelector('[data-reference-row=list-c] [data-product-classification]').textContent.includes('Samsung')",'classification saved and refreshed');
  assert.equal((await db.collection('productos').doc('list-c').get()).data()!.marca,'Samsung');assert.equal((await db.collection('productos').doc('list-c').get()).data()!.tipoProducto,'Heladeras');await browser.clickText('Cerrar editor');
  await browser.navigate('/admin/productos');await browser.until("document.querySelector('[data-reference-row=list-c] [data-product-classification]')?.textContent.includes('Samsung')",'classification survives reload');await select('Marca',JSON.stringify('Samsung'));assert.deepEqual(await ids(),['list-c']);
  assert((await history.get()).updateTime!.isEqual(original.updateTime!));assert.deepEqual(browser.externalFirebase,[]);assert.equal(browser.storageWrites,0);
  console.log('CATALOG_LIST_BROWSER_SORT_FILTER_SEARCH_RESPONSIVE_LEGACY_EDIT_PERSIST_RELOAD_HISTORY_PRESERVATION=PASS');
 }finally{await browser.close();await server.stop();await admin.app().delete();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
