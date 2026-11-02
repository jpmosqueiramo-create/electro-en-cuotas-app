import './helpers/requireSafeEmulatorEnvironment';
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { affiliateIntegrationFixture } from './testAffiliateIntegrationV2Emulator';
import { financialRef } from '../src/lib/operationFinancialV2Server';
import { CatalogBrowser } from './helpers/catalogBrowser';
export async function testAffiliateFollowupBrowser() {
 const f=await affiliateIntegrationFixture(),browser=await CatalogBrowser.open();
 const db=f.r.budget.firestore;
 await db.collection('catalogo_publico').doc('portal-visual').set({referenciaId:'portal-visual',nombre:'Lavarropas de prueba',descripcion:'Producto de prueba para revisar el catálogo del vendedor afiliado.',imagenUrls:['/logo-cuenta-hogar-oficial.png'],planesPublicados:[{cuotas:8,cuotaEstimada:40000},{cuotas:12,cuotaEstimada:30000}],publicado:true,schemaVersion:1});
 const before=(await financialRef(db,f.id,1).get()).updateTime?.toMillis();
 try {
  await browser.navigate('/login');await browser.until("typeof window.__FIREBASE_SIGN_IN__==='function'",'emulator login');
  await browser.evaluate(`window.__FIREBASE_SIGN_IN__(${JSON.stringify(f.uid+'@example.test')},'Emulator-only-123').then(()=>true)`);
  await browser.navigate('/afiliado');await browser.until("document.querySelectorAll('[data-testid=affiliate-followup-card]').length===1",'assigned followup card');
  const read=await browser.evaluate<{operations:{followup:{state:string};saleDate:string}[]}>("window.__FIREBASE_AUTH__.currentUser.getIdToken().then(token=>fetch('/api/afiliado/operaciones-v2',{headers:{Authorization:'Bearer '+token}})).then(r=>r.json())");
  assert.equal(read.operations.length,1);assert.equal(read.operations[0].followup.state,'ACTIVE');assert.match(read.operations[0].saleDate,/^\d{4}-\d{2}-\d{2}$/);
  assert.equal(await browser.evaluate("document.querySelectorAll('[data-testid=affiliate-v2-operation]').length"),0);
  await browser.change('input[type=search]','cliente inexistente');await browser.until("document.body.innerText.includes('No hay clientes que coincidan')",'no matches');
  await browser.clickText('Limpiar filtros');await browser.until("document.querySelectorAll('[data-testid=affiliate-followup-card]').length===1",'clear filters');
  await browser.click('button[aria-label="Con cuotas vencidas"]');await browser.until("document.querySelectorAll('[data-testid=affiliate-followup-card]').length===0",'overdue filter excludes future schedule');await browser.clickText('Limpiar filtros');
  for(const width of [1280,390,320]) {
   await browser.command('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:width<768});await browser.overflow('affiliate followup '+width);
   assert.equal(await browser.evaluate("getComputedStyle(document.querySelector('[data-testid=affiliate-portal]')).backgroundColor"),'rgb(247, 243, 236)');
   assert.equal(await browser.evaluate("[...document.querySelectorAll('nav[aria-label=\"Mi panel\"] a')].every(a=>a.getBoundingClientRect().height>=44)"),true);
   await browser.evaluate('window.scrollTo(0,0)');
   const shot=await browser.command('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});writeFileSync(`/tmp/ch-affiliate-followup-${width}.png`,Buffer.from(shot.data as string,'base64'));
  }
  await browser.click('[data-testid=affiliate-followup-card] summary');await browser.until("document.querySelectorAll('[data-testid=affiliate-v2-operation]').length===1",'account details');await browser.overflow('expanded followup 320');
  await browser.until("!!document.querySelector('[data-testid=financial-v2]')",'financial detail');
  assert.equal(await browser.evaluate("getComputedStyle(document.querySelector('[data-testid=affiliate-v2-operation]')).backgroundColor"),'rgb(247, 243, 236)');
  await browser.until("[...document.querySelectorAll('[data-testid=financial-v2] button')].some(button=>button.textContent==='Registrar cobro en efectivo'&&!button.disabled)",'financial data ready for cash form');
  await browser.clickText('Registrar cobro en efectivo');await browser.until("!!document.querySelector('[data-testid=payment-form]')",'cash form preserved');await browser.overflow('cash form 320');
  assert.equal(await browser.evaluate("document.querySelector('[data-testid=payment-form] input[type=date]').getBoundingClientRect().width>=180"),true,'date field must remain readable at 320px');
  await browser.evaluate("document.querySelector('[data-testid=payment-form]').scrollIntoView({block:'center'})");await browser.screenshot('affiliate-refresh-cash-320.png');
  await browser.clickText('Cerrar carga de pago');
  await browser.click('nav a[href=\"#comisiones\"]');await browser.until("document.querySelector('nav a[href=\"#comisiones\"]').getAttribute('aria-current')==='location'",'commission navigation');
  await browser.until("document.querySelector('[data-testid=affiliate-commissions]').textContent.includes('Pendiente disponible:')",'commission cards');await browser.until("getComputedStyle(document.querySelector('nav a[aria-current=location]')).backgroundColor==='rgb(23, 62, 59)'",'selected nav style');await browser.overflow('commission cards 320');await browser.screenshot('affiliate-refresh-commissions-320.png');
  await browser.click('nav a[href=\"#catalogo-afiliado\"]');await browser.until("!!document.querySelector('[data-affiliate-reference=portal-visual]')",'catalog product');await browser.overflow('catalog 320');await browser.screenshot('affiliate-refresh-catalog-320.png');
  await browser.evaluate("(()=>{const e=document.querySelector('[data-affiliate-reference=portal-visual] select');e.value='8';e.dispatchEvent(new Event('change',{bubbles:true}));})()");await browser.until("document.querySelector('[data-affiliate-reference=portal-visual]').textContent.includes('8 cuotas de')",'catalog plan choice');
  assert.equal((await financialRef(f.r.budget.firestore,f.id,1).get()).updateTime?.toMillis(),before);
  await browser.evaluate('window.__FIREBASE_SIGN_OUT__().then(()=>true)');
  await browser.evaluate(`window.__FIREBASE_SIGN_IN__(${JSON.stringify(f.uid2+'@example.test')},'Emulator-only-123').then(()=>true)`);await browser.navigate('/afiliado');await browser.until("document.body.innerText.includes('Sin operaciones asignadas')",'other seller sees no assignments');
  assert.equal(await browser.evaluate("document.querySelectorAll('[data-testid=affiliate-followup-card]').length"),0);
  assert.equal(browser.externalFirebase.length,0);
  console.log('AFFILIATE_FOLLOWUP_BROWSER_API_ISOLATION_LAZY_DETAILS_FILTERS_1280_390_320_NO_FINANCIAL_WRITES = PASS');
 }finally{await browser.close();}
}
