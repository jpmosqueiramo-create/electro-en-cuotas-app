import "./helpers/requireSafeEmulatorEnvironment";
import assert from "node:assert/strict";
import { mkdirSync,writeFileSync } from "node:fs";
import { admin } from "../src/lib/firebaseAdmin";
import { budgetFixture } from "./helpers/budgetV2Fixtures";
import { CatalogBrowser } from "./helpers/catalogBrowser";
import { adminEmail,adminPassword } from "./helpers/adminSolicitudesFixtures";
import { createCatalogReferenceDraft,buildCatalogReferencePrivatePatch } from "../src/lib/catalogReferenceEditor";
export async function testBudgetV2Browser(){
 const db=admin.firestore();try{const u=await admin.auth().getUserByEmail(adminEmail);await admin.auth().updateUser(u.uid,{password:adminPassword,emailVerified:true});}catch(e){if((e as {code?:string}).code!=="auth/user-not-found")throw e;await admin.auth().createUser({email:adminEmail,password:adminPassword,emailVerified:true});}
 const draft=createCatalogReferenceDraft();Object.assign(draft,{nombre:"Referencia existente P3",descripcion:"Gestión de compra",costoProveedor:"580000",proveedor:"SECRET_PROVIDER",imagenUrls:["http://localhost:3000/logo-cuenta-hogar-oficial.png"]});draft.planesActivos[12]=true;
 await db.doc("productos/p3-browser-existing").set({...buildCatalogReferencePrivatePatch(draft),activo:false,publicado:false,stock:[{id:"unit"}]});const original=(await db.doc("productos/p3-browser-existing").get()).data();
 let browser=await CatalogBrowser.open();mkdirSync("/tmp/cuenta-hogar-p3",{recursive:true});
 async function capture(name:string){await browser.evaluate("document.fonts.ready.then(()=>true)");const r=await browser.command("Page.captureScreenshot",{format:"png",captureBeyondViewport:false});writeFileSync(`/tmp/cuenta-hogar-p3/${name}`,Buffer.from(r.data as string,"base64"));}
 async function clickReady(text:string,scope='document'){
  await browser.until(`(()=>{const b=[...${scope}.querySelectorAll('button')].find(el=>el.textContent.trim()===${JSON.stringify(text)}&&el.getClientRects().length>0);return !!b&&!b.disabled;})()`, `ready ${text}`);
  await browser.clickText(text,scope);
 }
 async function select(label:string,value:string){await browser.evaluate(`(()=>{const el=[...document.querySelectorAll('label')].find(x=>x.querySelector(':scope > span')?.textContent===${JSON.stringify(label)})?.querySelector('select');if(!el)throw Error('Select missing');Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set.call(el,${JSON.stringify(value)});el.dispatchEvent(new Event('change',{bubbles:true}));})()`);}
 try{
 await browser.navigate("/login");await browser.until("typeof window.__FIREBASE_SIGN_IN__==='function'","auth hook");await browser.evaluate(`window.__FIREBASE_SIGN_IN__(${JSON.stringify(adminEmail)},${JSON.stringify(adminPassword)}).then(()=>true)`);
 const apiInvalid={action:"SAVE",commandId:"api-adversarial",budget:budgetFixture("api-adversarial"),expectedRevision:0,privateOptionIds:[],extra:"reject"};
 const response=await browser.evaluate<{status:number;body:{error:string}}>(`(async()=>{const token=await window.__FIREBASE_AUTH__.currentUser.getIdToken();const r=await fetch('/api/admin/presupuestos-v2',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:${JSON.stringify(JSON.stringify(apiInvalid))}});return {status:r.status,body:await r.json()};})()`);
 assert.equal(response.status,409);assert.equal(typeof response.body.error,"string");assert.ok(!response.body.error.includes("Firestore"));assert.equal((await db.doc("presupuestos_v2/api-adversarial").get()).exists,false);
 for(const view of [{width:1280,height:800,name:"desktop"},{width:390,height:844,name:"mobile"}]){
  if(view.name==="mobile"){
   assert.equal(browser.storageWrites,0);assert.deepEqual(browser.externalFirebase,[]);assert.equal(browser.publishBodies.length,0);
   await browser.close();browser=await CatalogBrowser.open();await browser.navigate("/login");await browser.until("typeof window.__FIREBASE_SIGN_IN__==='function'","mobile isolated auth hook");await browser.evaluate(`window.__FIREBASE_SIGN_IN__(${JSON.stringify(adminEmail)},${JSON.stringify(adminPassword)}).then(()=>true)`);
  }

  const id=`p3-browser-${view.name}`;
  const legacyBudget={id:`pres_legacy_${view.name}`,fecha:new Date().toISOString(),estado:"Enviado",pricingSchemaVersion:"MANUAL_FACTOR_V1",items:[{itemId:"legacy-option",nombre:"Histórico conservado",producto:"Histórico conservado",cuotas:8,valorCuota:1234,costoProveedor:777,proveedor:"SECRET_PROVIDER"}]};
  await db.doc(`solicitudes/${id}`).set({whatsapp:"5491100000000",estado:"PENDIENTE",clienteEmail:"client@example.invalid",datosPersonales:{nombreCompleto:`Cliente ${view.name}`,numeroDni:"12345678",telefono:"5491100000000",localidad:"Lincoln"},productoDeseado:"Heladera",presupuestos:[legacyBudget]});await db.doc(`solicitudes_cuenta/${id}`).set({estado:"Pendiente",nombre:"Solicitud pendiente",nombreCompleto:"Solicitud pendiente",necesidad:"Nueva referencia pendiente",whatsapp:"5491100000000"});
  await browser.command("Emulation.setDeviceMetricsOverride",{...view,deviceScaleFactor:1,mobile:view.width===390});await browser.navigate(`/admin/presupuestos?sourceCollection=solicitudes&solicitudId=${id}`);
  await browser.until("!!document.querySelector('[data-new-budget-v2]')&&!document.querySelector('[data-new-budget-v2]').disabled","budget entry");
  await browser.until("!!document.querySelector('[data-new-budget-v2]')&&!document.querySelector('[data-new-budget-v2]').disabled","V2 only entry");
  assert.equal(await browser.evaluate("document.body.textContent.includes('Histórico conservado')"),false);
  assert.equal(await browser.evaluate("!!document.querySelector('[data-legacy-budget-id]')"),false);
  await clickReady("Nuevo presupuesto V2");
  await browser.until("!!document.querySelector('[data-testid=budget-v2-editor]')","editor");
  await browser.until("[...document.querySelectorAll('label')].find(l=>l.querySelector(':scope > span')?.textContent==='Solicitud de origen')?.querySelectorAll('option').length>=3","source options");await select("Solicitud de origen",`solicitudes:${id}`);assert.ok(await browser.evaluate("document.querySelector('[data-testid=budget-v2-editor]').textContent.includes('GENERADO')"));
  await select("Agregar referencia existente","p3-browser-existing");await browser.until("!!document.querySelector('[data-testid=budget-reference-configurator]')","shared fields");assert.equal(await browser.evaluate("document.querySelectorAll('[data-testid=budget-reference-configurator] [data-plan-row]').length"),18);
  await browser.click('input[aria-label="Habilitar 8 cuotas"]');await browser.evaluate("document.querySelector('[data-testid=budget-reference-configurator]').scrollIntoView({block:'start'})");if(view.name==="desktop")await capture("03-reference-configurator-budget.png");await clickReady("Incorporar opción");
  await clickReady("Nueva referencia para presupuesto");await browser.field("Nombre de la referencia",`Nueva alternativa ${view.name}`);await browser.field("Costo proveedor","680000");await browser.click('input[aria-label="Habilitar 12 cuotas"]');await browser.click('input[aria-label="Habilitar 18 cuotas"]');assert.equal(await browser.evaluate("[...document.querySelectorAll('label')].find(x=>x.textContent.includes('Guardar también como referencia privada')).querySelector('input').checked"),false);
  await clickReady("Incorporar opción");assert.equal(await browser.evaluate("document.querySelectorAll('[data-option-id]').length"),2);await browser.overflow(`${view.name} options`);
  await browser.evaluate("document.querySelector('[data-testid=budget-v2-editor]').scrollIntoView({block:'start'})");await capture(view.name==="desktop"?"01-presupuesto-v2-desktop.png":"05-presupuesto-v2-mobile.png");await browser.evaluate("document.querySelector('[data-testid=budget-v2-options]').scrollIntoView({block:'start'})");await capture(view.name==="desktop"?"02-opciones-multiples-desktop.png":"06-opciones-mobile.png");
  const before=(await db.collection("productos").get()).size;await clickReady("Guardar presupuesto");await browser.until("document.querySelector('[role=status]')?.textContent==='Presupuesto V2 guardado.'","save");assert.equal((await db.collection("productos").get()).size,before);
  const families=await db.collection("presupuestos_v2").where("solicitudId","==",id).get();assert.equal(families.size,1);const family=families.docs[0].ref;let saved=(await family.collection("versions").doc("1").get()).data()!;assert.equal(saved.sourceCollection,"solicitudes");assert.equal(saved.options.length,2);assert.deepEqual(saved.options.map((o:{referenceSnapshot:{planesOfrecidos:{cuotas:number}[]}})=>o.referenceSnapshot.planesOfrecidos.map(p=>p.cuotas)),[[8,12],[12,18]]);
  await clickReady("Cerrar presupuesto");await clickReady("Abrir versión 1",`[...document.querySelectorAll('article')].find(a=>a.textContent.includes('Cliente ${view.name}'))`);await browser.until("document.querySelectorAll('[data-option-id]').length===2","reopen");
  await browser.evaluate("window.confirm=()=>true");await clickReady("Emitir y archivar presupuesto");await browser.until("document.querySelector('[role=status]')?.textContent.includes('emitido y archivado')","issued");saved=(await family.collection("versions").doc("1").get()).data()!;assert.equal(saved.estado,"EMITIDO");assert.equal(await browser.evaluate("[...document.querySelectorAll('[data-testid=budget-v2-editor] button')].some(b=>b.textContent.startsWith('Editar opción'))"),false);
  await db.doc("productos/p3-browser-existing").update({costoProveedor:1});assert.deepEqual((await family.collection("versions").doc("1").get()).data(),saved);await db.doc("productos/p3-browser-existing").set(original!);
  await clickReady("PDF V2");await clickReady("Preparar WhatsApp");await browser.until("!!document.querySelector('[data-testid=budget-whatsapp]')","whatsapp DTO");const text=await browser.evaluate<string>("document.querySelector('[data-testid=budget-whatsapp]').textContent");assert.equal((text.match(/cuotas estimadas de/g)??[]).length,4);assert.ok(!text.includes("SECRET_PROVIDER"));await browser.overflow(`${view.name} issued`);if(view.name==="desktop"){await browser.evaluate("document.querySelector('[data-testid=budget-v2-editor]').scrollIntoView({block:'start'})");await capture("04-presupuesto-emitido-desktop.png");}
  await clickReady("Crear nueva revisión");await browser.until("document.querySelector('[role=status]')?.textContent.includes('Nueva revisión')","revision");assert.ok(await browser.evaluate("document.querySelector('[data-testid=budget-v2-editor]').textContent.includes('Versión 2 · GENERADO')"));assert.deepEqual((await family.collection("versions").doc("1").get()).data(),saved);
  await clickReady("Nueva referencia para presupuesto");await browser.field("Nombre de la referencia",`Privada ${view.name}`);await browser.field("Costo proveedor","700000");await browser.click('input[aria-label="Habilitar 12 cuotas"]');await browser.evaluate("[...document.querySelectorAll('label')].find(x=>x.textContent.includes('Guardar también como referencia privada')).querySelector('input').click()");await clickReady("Incorporar opción");const publicBefore=(await db.collection("catalogo_publico").get()).size;await clickReady("Guardar presupuesto");await browser.until("document.querySelector('[role=status]')?.textContent==='Presupuesto V2 guardado.'","private save");assert.equal((await db.collection("productos").get()).size,before+1);assert.equal((await db.collection("catalogo_publico").get()).size,publicBefore);await browser.overflow(`${view.name} final`);
  // Four commercial paths, all through the same V2 editor and server persistence.
  for(const manual of [false,true])for(const existing of [false,true]){
   await browser.navigate(`/admin/presupuestos${manual?"":`?sourceCollection=solicitudes_cuenta&solicitudId=${id}`}`);
   await browser.until("!!document.querySelector('[data-new-budget-v2]')&&!document.querySelector('[data-new-budget-v2]').disabled","four paths entry");
   await clickReady("Nuevo presupuesto V2");
   await browser.until("!!document.querySelector('[data-testid=budget-v2-editor]')","four paths editor");
   const name=`Four paths ${view.name} ${manual} ${existing}`;
   await browser.field("Nombre del cliente",name);await browser.field("WhatsApp","5491100000000");
   if(manual)await browser.evaluate("[...document.querySelectorAll('label')].find(l=>l.textContent.includes('Confirmo crear una solicitud de origen')).querySelector('input').click()");
   else assert.equal(await browser.evaluate("[...document.querySelectorAll('label')].find(l=>l.querySelector(':scope > span')?.textContent==='Solicitud de origen').querySelector('select').value"),`solicitudes_cuenta:${id}`);
   if(existing)await select("Agregar referencia existente","p3-browser-existing");
   else {await clickReady("Nueva referencia para presupuesto");await browser.field("Nombre de la referencia",name);await browser.field("Costo proveedor","580000");await browser.click('input[aria-label="Habilitar 12 cuotas"]');}
   await browser.until("!!document.querySelector('[data-testid=budget-reference-configurator]')","four paths reference");
   await clickReady("Incorporar opción");await clickReady("Guardar presupuesto");
   await browser.until("document.querySelector('[role=status]')?.textContent==='Presupuesto V2 guardado.'","four paths persisted");
   const matches=(await db.collection("presupuestos_v2").get()).docs;
   const versions=await Promise.all(matches.map(d=>d.ref.collection("versions").doc("1").get()));
   const found=versions.filter(d=>d.data()?.clienteSnapshot.nombre===name);assert.equal(found.length,1);
   const record=found[0].data()!;assert.equal(record.options[0].referenceSnapshot.source,existing?"EXISTING_REFERENCE":"NEW_REFERENCE");
   assert.equal(record.sourceCollection,"solicitudes_cuenta");assert.equal(record.estado,"GENERADO");
   if(manual){assert.equal(record.solicitudId,`budget_manual_${record.id}`);assert.equal((await db.doc(`solicitudes_cuenta/${record.solicitudId}`).get()).data()!.originBudgetId,record.id);}
   else assert.equal(record.solicitudId,id);
   assert.equal(await browser.evaluate("[...document.querySelectorAll('label')].find(l=>l.querySelector(':scope > span')?.textContent==='Solicitud de origen').querySelector('select').value"),`${record.sourceCollection}:${record.solicitudId}`);
   assert.equal((await db.doc(`solicitudes_cuenta/${record.solicitudId}`).get()).data()!.presupuestos,undefined);
   await browser.overflow(`four paths ${view.name}`);
  }
  console.log(`FOUR_V2_PATHS_${view.name.toUpperCase()} = PASS`);
  // Compatibility boundary in Validaciones: historical operations stay live.
  const validationId=`p3-validation-${view.name}`;
  const validationName=`Compatibilidad ${view.name}`;
  const validationLegacy={...legacyBudget,id:`pres_compat_${view.name}`,notas:"Nota original",tna:60,mora:0.5};
  const validationV2={id:`v2_${view.name}`,schemaVersion:"BUDGET_V2",estado:"Enviado"};
  const validationRef=db.doc(`solicitudes_cuenta/${validationId}`);
  await validationRef.set({estado:"Pendiente",tipo:"contacto_rapido",nombre:validationName,dni:view.name==="desktop"?"40000001":"40000002",whatsapp:"5491100000000",localidad:"Lincoln",necesidad:"Gestión de compra",fecha:new Date().toISOString(),presupuestos:[validationLegacy,validationV2]});
  async function openValidation(){
   assert.ok((await validationRef.get()).exists,"Validation fixture must exist");
   // Use the real client navigation, keeping the authenticated Firebase session ready.
   await browser.click('a[href="/admin"]');
   await browser.until("location.pathname==='/admin'&&!!document.querySelector('a[href=\"/admin/solicitudes\"]')","admin navigation");
   await browser.navigate(`/admin/validaciones?sourceCollection=solicitudes_cuenta&solicitudId=${validationId}`);
   await browser.until(`location.pathname==='/admin/solicitudes/solicitudes_cuenta/${validationId}'`,"legacy redirect preserves identity");
   await browser.until("!!document.querySelector('[data-testid=solicitud-detail]')","request detail");
  }
  await openValidation();
  assert.equal(await browser.evaluate("document.body.textContent.includes('Historial de Presupuestos Enviados')"),false);
  assert.equal(await browser.evaluate("document.body.textContent.includes('Armar Presupuesto Combinado')"),false);
  await browser.until("[...document.querySelectorAll('a')].some(a=>a.textContent.trim()==='Confeccionar presupuesto V2')","request loaded with V2 action");
  const startHref=await browser.evaluate<string>("[...document.querySelectorAll('a')].find(a=>a.textContent.trim()==='Confeccionar presupuesto V2').href");
  const startUrl=new URL(startHref);assert.equal(startUrl.pathname,"/admin/presupuestos");assert.equal(startUrl.searchParams.get("sourceCollection"),"solicitudes_cuenta");assert.equal(startUrl.searchParams.get("solicitudId"),validationId);
  const beforeNew=(await validationRef.get()).data()!;await browser.navigate(startUrl.pathname+startUrl.search);
  await browser.until("!!document.querySelector('[data-new-budget-v2]')&&!document.querySelector('[data-new-budget-v2]').disabled","V2 redirect arrival");assert.deepEqual((await validationRef.get()).data(),beforeNew);
  assert.deepEqual((await db.doc(`solicitudes/${id}`).get()).data()!.presupuestos,[legacyBudget]);
  console.log(`VALIDACIONES_BROWSER_${view.name.toUpperCase()} = PASS`);
  console.log(`P3_BROWSER_${view.name.toUpperCase()} = PASS`);
 }
 assert.equal(browser.storageWrites,0);assert.deepEqual(browser.externalFirebase,[]);assert.equal(browser.publishBodies.length,0);assert.deepEqual((await db.doc("productos/p3-browser-existing").get()).data(),original);console.log("PUBLICATION_CALLS_FROM_BUDGET = 0; PRODUCTION_DATABASE_MUTATIONS = 0");
 }catch(error){console.error("P3_BROWSER_PRIMARY_ERROR",error);console.error("LEGACY_TEST_DIAGNOSTIC",await browser.evaluate("JSON.stringify({alerts:window.__legacyAlerts,editor:!!document.querySelector('[aria-label=\"Editar presupuesto legacy\"]'),saveDisabled:document.querySelector('[data-testid=btn-guardar-presupuesto]')?.disabled,saveText:document.querySelector('[data-testid=btn-guardar-presupuesto]')?.textContent,notes:document.querySelector('textarea[placeholder=\"Detalles provistos por el cliente...\"]')?.value})").catch(()=>"DOM unavailable"));console.error("VALIDATION_FIXTURE_STATES",(await db.collection("solicitudes_cuenta").get()).docs.filter(d=>d.id.startsWith("p3-validation-")).map(d=>({id:d.id,estado:d.data().estado,nombre:d.data().nombre})));console.error("P3_BROWSER_DIAGNOSTIC",await browser.evaluate("document.body.innerText.slice(0,2000)").catch(()=>"DOM unavailable"));throw error;}finally{await browser.close();}
}
