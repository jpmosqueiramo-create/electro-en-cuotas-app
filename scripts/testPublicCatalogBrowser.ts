import "./helpers/requireSafeEmulatorEnvironment";
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { admin } from "../src/lib/firebaseAdmin";
import { CatalogBrowser } from "./helpers/catalogBrowser";
import { publicFixture } from "./helpers/catalogC4Fixtures";
import { observePublicCatalogNetwork } from "./helpers/publicCatalogNetwork";

export async function testPublicCatalogBrowser(){
  const db=admin.firestore();const password="C4DemoOnly123!";
  for(const email of ["c4-client@example.test","c4-seller@example.test"]){try{await admin.auth().createUser({email,password,emailVerified:true});}catch(error){if((error as {code?:string}).code!=="auth/email-already-exists")throw error;}}
  const ids=Array.from({length:8},(_,index)=>`c4-browser-${index}`);let publicWrites=0;
  for(const [index,id] of ids.entries()){
    const dto=publicFixture(id,`${index===0?"A Heladera":index===1?"B Sin doce":"C Referencia "+index} pública`);
    if(index===1)dto.planesPublicados=[{cuotas:3,cuotaEstimada:42190},{cuotas:18,cuotaEstimada:185090}];
    await db.collection("catalogo_publico").doc(id).set({...dto,costoProveedor:580000,proveedor:"SECRET",stock:[]});publicWrites++;
  }
  const browser=await CatalogBrowser.open();const network=await observePublicCatalogNetwork();
  const root="/tmp/cuenta-hogar-catalogo-c4";mkdirSync(root,{recursive:true});
  async function navigate(path:string){await network.flush();await browser.navigate(path);}
  async function shot(name:string){await browser.evaluate("Promise.all([document.fonts.ready,new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))),...document.getAnimations().filter(a=>a.effect&&a.effect.getComputedTiming().endTime<2000).map(a=>a.finished.catch(()=>{}))]).then(()=>true)");const result=await browser.command("Page.captureScreenshot",{format:"png",captureBeyondViewport:false});writeFileSync(`${root}/${name}.png`,Buffer.from(String(result.data),"base64"));}
  async function choose(selector:string,value:string){await browser.evaluate(`(()=>{const select=document.querySelector(${JSON.stringify(selector)});select.value=${JSON.stringify(value)};select.dispatchEvent(new Event('change',{bubbles:true}));})()`);}
  async function selectedPlan(){return browser.evaluate<string>("document.querySelector('select[aria-label=\"Plan publicado\"]').value");}
  try{
    for(const [name,width,height] of [["desktop",1280,800],["mobile",390,844]] as const){
      await browser.command("Emulation.setDeviceMetricsOverride",{width,height,deviceScaleFactor:1,mobile:width===390});
      await navigate("/");await browser.until("document.querySelectorAll('[data-public-reference]').length===6","home references max6");
      const card=`document.querySelector('[data-public-reference="${ids[0]}"]')`,no12=`document.querySelector('[data-public-reference="${ids[1]}"]')`;
      assert.ok(await browser.evaluate(`${card}.textContent.includes('145.000')`));assert.ok(!(await browser.evaluate(`${no12}.textContent.includes('12 cuotas')`)));
      assert.equal(await browser.evaluate(`${no12}.querySelector('a[href^="/solicitar"]').getAttribute('href')`),`/solicitar?id=${ids[1]}`);
      await browser.evaluate(`${card}.scrollIntoView({block:'center'})`);await browser.overflow(`home ${name}`);await shot(`home-${name}`);
      await navigate("/servicio-de-compra");await browser.until("document.querySelectorAll('[data-public-reference]').length===8","public catalog");
      await browser.evaluate(`${no12}.scrollIntoView({block:'center'})`);await shot(`sin-plan-12-${name}`);
      await browser.change('input[placeholder^="Buscar por"]',"Sin doce");await browser.until("document.querySelectorAll('[data-public-reference]').length===1","search name");
      await browser.change('input[placeholder^="Buscar por"]',"planes publicados");await browser.until("document.querySelectorAll('[data-public-reference]').length===8","search description");
      await browser.change('input[placeholder^="Buscar por"]',"");await choose('select',"12");await browser.until("document.querySelectorAll('[data-public-reference]').length===7","filter only explicit12");
      assert.equal(await browser.evaluate("document.querySelectorAll('option[value=\"24\"]').length"),0);
      await choose('select',"3");await browser.until("document.querySelectorAll('[data-public-reference]').length===8","filter3");
      await browser.evaluate(`${card}.scrollIntoView({block:'center'})`);await browser.overflow(`catalog ${name}`);await shot(`catalogo-${name}`);
      await navigate(`/solicitar?id=${ids[0]}&cuotas=3`);await browser.until("!!document.querySelector('select[aria-label=\"Plan publicado\"]')","request plan");assert.equal(await selectedPlan(),"3");assert.ok(await browser.evaluate("document.body.textContent.includes('42.190')"));await browser.overflow(`solicitar ${name}`);await shot(`solicitar-${name}`);
      await navigate(`/solicitar?id=${ids[0]}&cuotas=24`);await browser.until("!!document.querySelector('select[aria-label=\"Plan publicado\"]')","invalid plan fallback");assert.equal(await selectedPlan(),"12");
      await navigate(`/solicitar?id=${ids[1]}&cuotas=12`);await browser.until("!!document.querySelector('select[aria-label=\"Plan publicado\"]')","no12 explicit selection");assert.equal(await selectedPlan(),"");
      await navigate("/solicitar?id=c4-withdrawn");await browser.until("document.body.textContent.includes('Esta referencia ya no está disponible')","withdrawn");await shot(`retirada-${name}`);
      await navigate("/login");await browser.until("typeof window.__FIREBASE_SIGN_IN__==='function'","client login");await browser.evaluate(`window.__FIREBASE_SIGN_IN__('c4-client@example.test',${JSON.stringify(password)}).then(()=>true)`);
      await browser.evaluate(`(()=>{localStorage.setItem('userRole','cliente');localStorage.setItem('datosPreliminares',JSON.stringify({productoId:'${ids[0]}',productoNombre:'stale label',planElegido:'3',montoCuota:1}));return true;})()`);
      await navigate("/cliente");await browser.until("!!document.querySelector('[data-public-amount]')","client public reference independent of solicitudes");assert.ok(await browser.evaluate("document.querySelector('[data-public-amount]').textContent.includes('42.190')"));
      await choose('select[aria-label="Plan publicado"]',"18");await browser.until("document.querySelector('[data-public-amount]').textContent.includes('185.090')","client exact plan");await browser.evaluate("document.querySelector('[data-public-amount]').scrollIntoView({block:'center'})");await browser.overflow(`client ${name}`);await shot(`cliente-${name}`);
      await navigate("/login");await browser.until("typeof window.__FIREBASE_SIGN_IN__==='function'","seller login");await browser.evaluate(`window.__FIREBASE_SIGN_IN__('c4-seller@example.test',${JSON.stringify(password)}).then(()=>true)`);
      await browser.evaluate("localStorage.setItem('userRole','afiliado')");await navigate("/afiliado");await browser.until("[...document.querySelectorAll('button')].some(b=>b.textContent.includes('Carga de Solicitudes'))","seller tabs");
      await browser.evaluate("[...document.querySelectorAll('button')].find(b=>b.textContent.includes('Carga de Solicitudes')).click()");
      await browser.until("document.querySelector('select[aria-label=\"Referencia pública\"]')?.options.length===9","seller isolated public catalog");
      await choose('select[aria-label="Referencia pública"]',ids[1]);await browser.until("document.querySelectorAll('[data-public-plan]').length===2","seller dynamic plans");assert.equal(await browser.evaluate("document.querySelectorAll('[data-public-plan=\"12\"]').length"),0);
      await browser.click('[data-public-plan="18"]');await browser.evaluate("document.querySelector('[data-public-plan]').scrollIntoView({block:'center'})");await browser.overflow(`affiliate ${name}`);await shot(`afiliado-${name}`);
      await browser.evaluate("(async()=>{localStorage.clear();await window.__FIREBASE_AUTH__.signOut();return true;})()");
    }
    // Estados de error y vacío por separado; no hay fallback privado.
    await browser.command("Network.setBlockedURLs",{urls:["*api/catalogo*"]});await navigate("/servicio-de-compra");await browser.until("!!document.querySelector('[role=alert]')","catalog error");await browser.evaluate("document.querySelector('[role=alert]').scrollIntoView({block:'center'})");await shot("catalogo-error");await browser.command("Network.setBlockedURLs",{urls:[]});
    for(const id of ids){await db.collection("catalogo_publico").doc(id).delete();publicWrites++;}
    await navigate("/");await browser.until("document.body.textContent.includes('Catálogo en actualización')","empty catalog");assert.equal(await browser.evaluate("document.querySelectorAll('[data-public-reference]').length"),0);await browser.evaluate("[...document.querySelectorAll('h3')].find(h=>h.textContent.includes('Catálogo en actualización')).scrollIntoView({block:'center'})");await shot("catalogo-vacio");
    await network.verify();assert.deepEqual(browser.externalFirebase,[]);assert.equal(browser.storageWrites,0);
    console.log(`C4_BROWSER_TESTS = PASS; AFFILIATE_CATALOG_LOAD_ISOLATED = YES; EMULATOR_PUBLIC_CATALOG_WRITES = ${publicWrites}; EMULATOR_PRODUCTS_WRITES = 0; EMULATOR_OTHER_WRITES = 0; UPLOADS = 0`);
  }finally{network.close();await browser.close();}
}
