import './helpers/requireSafeEmulatorEnvironment';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { admin } from '../src/lib/firebaseAdmin';
import { CatalogBrowser } from './helpers/catalogBrowser';
import { sensitiveCatalogPaths } from './helpers/catalogReferenceC2Fixtures';
import { createCatalogReferenceDraft,buildCatalogReferencePrivatePatch } from '../src/lib/catalogReferenceEditor';
import { adminEmail,adminPassword } from './helpers/adminSolicitudesFixtures';

export async function testCatalogReferenceBrowser(){
  const db=admin.firestore();
  try {const user=await admin.auth().getUserByEmail(adminEmail);await admin.auth().updateUser(user.uid,{password:adminPassword,emailVerified:true});}
  catch(error){if((error as {code?:string}).code!=='auth/user-not-found')throw error;await admin.auth().createUser({email:adminEmail,password:adminPassword,emailVerified:true});}
  const draft=createCatalogReferenceDraft();Object.assign(draft,{nombre:'Heladera · Referencia demo',descripcion:'Referencia de bien para gestión de compra.',costoProveedor:'580000',proveedor:'PROVEEDOR PRIVADO',imagenUrls:['/logo-cuenta-hogar-oficial.png']});draft.planesActivos[12]=true;
  const legacyId='c3-browser-legacy';
  const units=[{id:'c3-unit',localidad:'Lincoln',nserie:'SERIE-LEGACY',estado:'Disponible',fechaIngreso:'2026-01-01T12:00:00.000Z'}];
  await db.doc(`productos/${legacyId}`).set({...buildCatalogReferencePrivatePatch(draft),codigoProducto:'CODIGO-LEGACY',precioContado:777,stock:units,activo:false,publicado:false});
  const browser=await CatalogBrowser.open();
  async function capture(name: string) {
    const directory = '/tmp/cuenta-hogar-catalogo-c3-final';
    mkdirSync(directory, { recursive: true });
    await browser.evaluate('document.fonts.ready.then(()=>true)');
    const result = await browser.command('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    writeFileSync(join(directory, name), Buffer.from(result.data as string, 'base64'));
  }
  try{
    await browser.navigate('/login');await browser.until("typeof window.__FIREBASE_SIGN_IN__==='function'",'auth hook');
    await browser.evaluate(`window.__FIREBASE_SIGN_IN__(${JSON.stringify(adminEmail)},${JSON.stringify(adminPassword)}).then(()=>true)`);
    for(const viewport of [{width:1280,height:800,name:'desktop'},{width:390,height:844,name:'mobile'}]){
      const {name}=viewport;
      await browser.command('Emulation.setDeviceMetricsOverride',{width:viewport.width,height:viewport.height,deviceScaleFactor:1,mobile:viewport.width===390});
      await browser.navigate('/admin/productos');
      await browser.until("document.querySelector('h1')?.textContent==='Catálogo de referencias'&&document.querySelectorAll('[data-reference-row]').length>0",'catalog loaded');
      await browser.until("![...document.querySelectorAll('[data-publication-status]')].some(item=>item.textContent.includes('Estado de publicación no disponible'))",'publication status resolved');
      assert.equal(await browser.evaluate('location.pathname'),'/admin/productos');
      assert.equal(await browser.evaluate('window.__FIREBASE_AUTH__.currentUser.email'),adminEmail);
      await browser.overflow(`${name} listado`);
      await browser.clickText('Nueva referencia');
      await browser.until("document.querySelectorAll('[data-editor-section]').length===6",'six sections');
      assert.equal(await browser.evaluate("document.querySelectorAll('[data-plan-row]').length"),18);
      assert.equal(await browser.evaluate("document.querySelectorAll('[data-plan-row] input[type=checkbox]:checked').length"),0);
      const productName=`Referencia nueva ${name}`;
      await browser.field('Nombre de la referencia',productName);await browser.field('SKU interno','SKU-PRIVADO');await browser.field('Código de barras / EAN','0779000000000');await browser.field('Costo proveedor','580000');await browser.field('Nombre del proveedor','PROVEEDOR PRIVADO');await browser.field('Descripción pública de la referencia','Referencia pública para gestión de compra.');
      await browser.field('URL de imagen','http://localhost:3000/logo-cuenta-hogar-oficial.png');await browser.clickText('Agregar URL');
      await browser.click('input[aria-label="Habilitar 12 cuotas"]');
      await browser.change('input[aria-label="Factor 12 cuotas"]','3.1');
      await browser.until("document.querySelector('[data-estimate=\"12\"]').textContent.includes('149.890')",'custom NEXT90');
      await browser.click('input[aria-label="Habilitar 8 cuotas"]');await browser.click('input[aria-label="Habilitar 8 cuotas"]');
      await browser.change('input[aria-label="Factor 12 cuotas"]','3');
      await browser.until("document.querySelector('[data-estimate=\"12\"]').textContent.includes('145.000')",'exact thousands');
      await browser.evaluate("document.getElementById('reference-editor').scrollIntoView({block:'start'})");await browser.overflow(`${name} editor`);
      await browser.evaluate("document.querySelector('[data-plan-row=\"12\"]').scrollIntoView({block:'center'})");await browser.overflow(`${name} planes`);
      await browser.clickText('Guardar referencia');
      await browser.until("document.querySelector('[role=status]')?.textContent.includes('Cambios guardados')",'private save');
      const found=await db.collection('productos').where('nombre','==',productName).get();assert.equal(found.size,1);
      const id=found.docs[0].id;const privateRef=db.doc(`productos/${id}`),publicRef=db.doc(`catalogo_publico/${id}`);
      assert.equal((await publicRef.get()).exists,false);assert.equal((await privateRef.get()).data()!.skuInterno,'SKU-PRIVADO');
      await privateRef.update({stock:[]});
      const rowScope = `document.querySelector('[data-reference-row="${id}"]')`;
      await browser.until(`${rowScope}.querySelector('[data-publication-status]').textContent==='No publicada'`, 'unpublished status');
      assert.ok(await browser.evaluate(`${rowScope}.textContent.includes('Previsualizar publicación')`));
      await browser.evaluate(`${rowScope}.scrollIntoView({block:'center'})`);
      await capture(`A-no-publicada-${name}.png`);
      await browser.evaluate("document.querySelector('[data-editor-section=Publicación]').scrollIntoView({block:'center'})");
      assert.ok(await browser.evaluate("document.querySelector('#reference-editor').textContent.includes('Guardar cambios')"));
      await capture(`C-guardar-privado-${name}.png`);
      await browser.clickText('Previsualizar publicación', "document.querySelector('#reference-editor')");
      await browser.until("!!document.querySelector('[data-testid=public-preview]')",'public DTO preview');
      const previewText=await browser.evaluate<string>("document.querySelector('[data-testid=public-preview]').textContent");
      for(const secret of ['SKU-PRIVADO','0779000000000','PROVEEDOR PRIVADO','CODIGO-LEGACY','costoProveedor','factoresPlanes','stock'])assert.ok(!previewText.includes(secret));
      await browser.overflow(`${name} preview`);
      assert.equal(await browser.evaluate("[...document.querySelectorAll('[role=dialog] button')].filter(b=>b.textContent.trim()==='Publicar').length"), 1);
      assert.ok(!(await browser.evaluate("document.querySelector('[role=dialog]').textContent.includes('Publicar cambios')")));
      await browser.evaluate("[...document.querySelectorAll('[role=dialog] button')].find(b=>b.textContent.trim()==='Publicar').scrollIntoView({block:'end'})");
      await capture(`A-preview-publicar-${name}.png`);
      // Conflicto real: cambiar datos guardados después de obtener la preview.
      await privateRef.update({descripcion:'Versión externa antes de publicar.'});
      await browser.clickText('Publicar',"document.querySelector('[role=dialog]')");
      await browser.until("document.querySelector('[role=alert]')?.textContent.includes('La referencia cambió desde la vista previa')",'409 conflict');
      assert.equal((await publicRef.get()).exists,false);
      await browser.clickText('Previsualizar publicación');await browser.until("!!document.querySelector('[data-testid=public-preview]')",'new preview');
      await browser.clickText('Publicar',"document.querySelector('[role=dialog]')");await browser.until("document.querySelector('[role=status]')?.textContent.includes('Referencia publicada')",'explicit publish');
      assert.equal((await publicRef.get()).exists,true);assert.deepEqual(sensitiveCatalogPaths((await publicRef.get()).data()),[]);
      assert.equal((await publicRef.get()).data()!.planesPublicados[0].cuotaEstimada,145000);
      const publishedA=(await publicRef.get()).data();
      await browser.field('Descripción pública de la referencia','Versión B guardada sin publicar.');await browser.clickText('Guardar cambios');
      await browser.until(`document.querySelector('[data-reference-row="${id}"] [data-publication-status]')?.textContent==='Cambios sin publicar'`,'draft B status');
      assert.deepEqual((await publicRef.get()).data(),publishedA);
      assert.ok(await browser.evaluate(`${rowScope}.textContent.includes('Previsualizar cambios')`));
      await browser.evaluate(`${rowScope}.scrollIntoView({block:'center'})`);
      await capture(`B-cambios-sin-publicar-${name}.png`);
      await browser.clickText('Previsualizar cambios', "document.querySelector('#reference-editor')");
      await browser.until("!!document.querySelector('[data-testid=public-preview]')",'B preview');
      assert.equal(await browser.evaluate("[...document.querySelectorAll('[role=dialog] button')].filter(b=>b.textContent.trim()==='Publicar cambios').length"), 1);
      await browser.evaluate("[...document.querySelectorAll('[role=dialog] button')].find(b=>b.textContent.trim()==='Publicar cambios').scrollIntoView({block:'end'})");
      await capture(`B-preview-publicar-cambios-${name}.png`);
      await browser.clickText('Publicar cambios',"document.querySelector('[role=dialog]')");await browser.until("document.querySelector('[role=status]')?.textContent.includes('Referencia publicada')",'B published');
      assert.equal((await publicRef.get()).data()!.descripcion,'Versión B guardada sin publicar.');
      await browser.until(`${rowScope}.querySelector('[data-publication-status]').textContent==='Publicada'`, 'published current');
      assert.ok(await browser.evaluate(`${rowScope}.textContent.includes('Ver publicación')`));
      await browser.clickText('Ver publicación', "document.querySelector('#reference-editor')");
      await browser.until("!!document.querySelector('[data-testid=public-preview]')", 'current publication preview');
      assert.equal(await browser.evaluate("[...document.querySelectorAll('[role=dialog] button')].filter(b=>/^Publicar(?: cambios)?$/.test(b.textContent.trim())).length"), 0);
      await browser.clickText('Cerrar', "document.querySelector('[role=dialog]')");
      await browser.click(`[data-reference-row="${id}"] button:nth-of-type(3)`);
      await browser.until("document.querySelector('[role=dialog]')?.textContent.includes('Despublicar referencia')",'confirm unpublish');
      await browser.clickText('Despublicar referencia',"document.querySelector('[role=dialog]')");
      await browser.until("document.querySelector('[role=status]')?.textContent.includes('Referencia despublicada')",'unpublish');
      assert.equal((await publicRef.get()).exists,false);assert.equal((await privateRef.get()).exists,true);assert.deepEqual((await privateRef.get()).data()!.stock,[]);
      await browser.clickText('Cerrar editor');
      const legacyScope=`document.querySelector('[data-reference-row="${legacyId}"]')`;
      await browser.clickText('Editar',legacyScope);await browser.until("!!document.querySelector('[data-testid=legacy-code]')",'legacy code separated');
      assert.equal(await browser.evaluate("[...document.querySelectorAll('label')].find(x=>x.textContent.includes('SKU interno')).querySelector('input').value"),'');
      await browser.clickText('Cerrar editor');
      await browser.clickText('Stock / unidades',legacyScope);await browser.until("!!document.querySelector('[aria-label=\"Stock / unidades\"]')",'stock accessible');
      assert.ok(await browser.evaluate("document.querySelector('[aria-label=\"Stock / unidades\"]').textContent.includes('SERIE-LEGACY')"));
      await browser.clickText('✕ Cerrar',"document.querySelector('[aria-label=\"Stock / unidades\"]')");
      await browser.clickText('Traslado interno');await browser.until("!!document.querySelector('[aria-label=\"Traslado interno\"]')",'transfer accessible');await browser.clickText('✕ Cerrar',"document.querySelector('[aria-label=\"Traslado interno\"]')");
      assert.deepEqual((await db.doc(`productos/${legacyId}`).get()).data()!.stock,units);
      await browser.overflow(`${name} final`);
      await browser.clickText('Salir');await browser.until("location.pathname==='/login'&&!window.__FIREBASE_AUTH__.currentUser",'logout');
      if(name==='desktop'){await browser.until("typeof window.__FIREBASE_SIGN_IN__==='function'",'login hook');await browser.evaluate(`window.__FIREBASE_SIGN_IN__(${JSON.stringify(adminEmail)},${JSON.stringify(adminPassword)}).then(()=>true)`);}
      console.log(`C3_BROWSER_${name.toUpperCase()} = PASS`);
    }
    assert.equal(browser.storageWrites,0);assert.deepEqual(browser.externalFirebase,[]);
    assert.ok(browser.publishBodies.length>=6);
    for(const body of browser.publishBodies)assert.deepEqual(Object.keys(body as object),['expectedFingerprint']);
    console.log('C3_BROWSER_TEST = PASS; PREVIEW_SENSITIVE_FIELDS = 0; STORAGE_UPLOADS = 0; PRODUCTION_PROJECT_USED = NO');
  }finally{await browser.close();}
}
