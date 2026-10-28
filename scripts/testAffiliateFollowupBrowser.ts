import './helpers/requireSafeEmulatorEnvironment';
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { affiliateIntegrationFixture } from './testAffiliateIntegrationV2Emulator';
import { financialRef } from '../src/lib/operationFinancialV2Server';
import { CatalogBrowser } from './helpers/catalogBrowser';
export async function testAffiliateFollowupBrowser() {
 const f=await affiliateIntegrationFixture(),browser=await CatalogBrowser.open();
 const before=(await financialRef(f.r.budget.firestore,f.id,1).get()).updateTime?.toMillis();
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
   const shot=await browser.command('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});writeFileSync(`/tmp/ch-affiliate-followup-${width}.png`,Buffer.from(shot.data as string,'base64'));
  }
  await browser.click('[data-testid=affiliate-followup-card] summary');await browser.until("document.querySelectorAll('[data-testid=affiliate-v2-operation]').length===1",'account details');await browser.overflow('expanded followup 320');
  assert.equal((await financialRef(f.r.budget.firestore,f.id,1).get()).updateTime?.toMillis(),before);
  await browser.evaluate('window.__FIREBASE_SIGN_OUT__().then(()=>true)');
  await browser.evaluate(`window.__FIREBASE_SIGN_IN__(${JSON.stringify(f.uid2+'@example.test')},'Emulator-only-123').then(()=>true)`);await browser.navigate('/afiliado');await browser.until("document.body.innerText.includes('Sin operaciones asignadas')",'other seller sees no assignments');
  assert.equal(await browser.evaluate("document.querySelectorAll('[data-testid=affiliate-followup-card]').length"),0);
  assert.equal(browser.externalFirebase.length,0);
  console.log('AFFILIATE_FOLLOWUP_BROWSER_API_ISOLATION_LAZY_DETAILS_FILTERS_1280_390_320_NO_FINANCIAL_WRITES = PASS');
 }finally{await browser.close();}
}
