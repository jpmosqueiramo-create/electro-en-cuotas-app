import './helpers/requireSafeEmulatorEnvironment';
import assert from 'node:assert/strict';
import { mkdirSync,writeFileSync } from 'node:fs';
import { admin } from '../src/lib/firebaseAdmin';
import { infrastructureFixture } from './helpers/contractInfrastructureFixtures';
import { CatalogBrowser } from './helpers/catalogBrowser';
import { adminEmail,adminPassword,databaseSnapshot,setupAdminSolicitudesFixtures } from './helpers/adminSolicitudesFixtures';
export async function testSolicitudOperationNavigationBrowser(){
  await setupAdminSolicitudesFixtures();const db=admin.firestore();
  const cases=['empty','generated','issued','accepted','multiple','historical'] as const;
  for(const name of cases){
    const source=name==='historical'?'solicitudes':'solicitudes_cuenta';
    await db.collection(source).doc(`nav-${name}`).set({nombre:'Persona sintética con un nombre largo para verificar la navegación móvil',datosPersonales:{nombreCompleto:'Persona sintética'},necesidad:'Lavarropas de prueba',estado:'Pendiente',...(name==='historical'?{presupuestos:[{id:'legacy-reference',estado:'Enviado',items:[{producto:'Producto histórico'}]}]}:{})});
    if(name==='empty'||name==='historical')continue;
    for(let i=1;i<=(name==='multiple'?2:1);i++){
      const {budget,acceptance}=infrastructureFixture(`nav-budget-${name}-${i}`).source;
      budget.sourceCollection=source;budget.solicitudId=`nav-${name}`;acceptance.sourceCollection=source;acceptance.solicitudId=budget.solicitudId;
      if(name==='generated'){budget.estado='GENERADO';budget.issuedAt=null;}
      const family=db.collection('presupuestos_v2').doc(budget.id);await family.set({sourceCollection:source,solicitudId:budget.solicitudId,lastVersion:1});await family.collection('versions').doc('1').set(budget);
      if(name==='accepted'||name==='multiple')await family.collection('acceptances').doc('1').set(acceptance);
    }
  }
  // Same document ID in the other source must never acquire the accepted operation.
  await db.collection('solicitudes').doc('nav-accepted').set({datosPersonales:{nombreCompleto:'Otra persona sintética'},estado:'PENDIENTE'});
  const before=await databaseSnapshot();let browser=await CatalogBrowser.open();const dir='/tmp/cuenta-hogar-request-navigation';mkdirSync(dir,{recursive:true});
  try{
    async function login(){await browser.navigate('/login');await browser.until("typeof window.__FIREBASE_SIGN_IN__==='function'",'auth');await browser.evaluate(`window.__FIREBASE_SIGN_IN__(${JSON.stringify(adminEmail)},${JSON.stringify(adminPassword)}).then(()=>true)`);}
    await login();
    const root="document.querySelector('[data-testid=solicitud-operation-links]')";
    for(const [width,height] of [[1280,800],[390,844]]){
      await browser.command('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width===390});
      for(const name of cases){
        assert.deepEqual(browser.externalFirebase,[]);await browser.close();browser=await CatalogBrowser.open();await login();await browser.command('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width===390});
        const source=name==='historical'?'solicitudes':'solicitudes_cuenta';await browser.navigate(`/admin/solicitudes/${source}/nav-${name}`);
        await browser.until(`${root}&&!${root}.innerText.includes('Consultando')`,'links loaded');
        const text=await browser.evaluate<string>(`${root}.innerText`);assert.ok(!text.includes('No se pudo'));
        const links=await browser.evaluate<string[]>(`[...${root}.querySelectorAll('a')].map(a=>a.getAttribute('href'))`);
        assert.equal(links.filter(x=>x.startsWith('/admin/operaciones/')).length,name==='multiple'?2:name==='accepted'?1:0);
        if(name==='empty'||name==='historical')assert.ok(text.includes('Todavía no hay una operación vinculada'));
        if(name==='generated'||name==='issued'){
          assert.ok(text.includes(name==='issued'?'pendiente de aceptación':'Presupuesto en preparación'));
          await browser.navigate(links[0]);await browser.until("!!document.querySelector('[data-testid=budget-v2-editor]')",'exact budget open');
          assert.ok((await browser.evaluate<string>("document.querySelector('[data-testid=budget-v2-editor]').innerText")).includes(`nav-budget-${name}-1`));
          continue;
        }
        await browser.overflow(name);
        if(name==='accepted'){
          await browser.evaluate('window.scrollTo(0,0)');const shot=await browser.command('Page.captureScreenshot',{format:'png'});writeFileSync(`${dir}/request-${width}.png`,Buffer.from(shot.data as string,'base64'));
          await browser.navigate(links[0]);await browser.until("[...document.querySelectorAll('a')].some(a=>a.textContent==='Volver a solicitud')",'return link');
          const back=await browser.evaluate<string>("[...document.querySelectorAll('a')].find(a=>a.textContent==='Volver a solicitud').getAttribute('href')");assert.equal(back,`/admin/solicitudes/${source}/nav-${name}`);
          await browser.overflow('operation');const operationShot=await browser.command('Page.captureScreenshot',{format:'png'});writeFileSync(`${dir}/operation-${width}.png`,Buffer.from(operationShot.data as string,'base64'));
          await browser.navigate(back);await browser.until(`${root}?.innerText.includes('Abrir ficha de operación')`,'roundtrip');
        }
      }
      await browser.navigate('/admin/solicitudes/solicitudes/nav-accepted');await browser.until(`${root}?.innerText.includes('Todavía no hay una operación vinculada')`,'source isolation');
    }
    assert.deepEqual(await databaseSnapshot(),before);assert.deepEqual(browser.externalFirebase,[]);
    console.log('REQUEST_OPERATION_NAVIGATION_CASES_DESKTOP_MOBILE_ROUNDTRIP_NO_WRITES = PASS');
  }finally{await browser.close();}
}
