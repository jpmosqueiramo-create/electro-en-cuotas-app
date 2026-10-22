import './helpers/requireSafeEmulatorEnvironment';
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
import {admin} from '../src/lib/firebaseAdmin';
import {contractRefs,contractCommand} from '../src/lib/contractV2Server';
import {pendingBulletPreviewFixture} from './helpers/operationPreviewFixtures';
import {CatalogBrowser} from './helpers/catalogBrowser';
import {testOperationDraftDocumentsBrowser} from './testOperationDraftDocumentsBrowser';
export async function testOfficialBrandBrowser(){
 const id='brand-form-'+randomUUID(),{budget:b,acceptance:a,draft:d}=pendingBulletPreviewFixture(id),r=contractRefs(admin.firestore(),id,1);
 await r.budget.create(b);await r.acceptance.create(a);await r.draft.create(d);
 const request=await contractCommand(admin.firestore(),id,1,{action:'CREATE_CLIENT_DATA_REQUEST',expectedRevision:d.revision,commandId:randomUUID()},'synthetic-admin');
 const browser=await CatalogBrowser.open(),out='/tmp/cuenta-hogar-official-brand';mkdirSync(out,{recursive:true});
 try{
  for(const [width,height]of [[1280,900],[390,844]]){
   await browser.command('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width===390});
   for(const [name,url]of [['homepage','/'],['formulario',`/completar-datos/${request.requestId}#${request.secret}`]] as const){
    await browser.navigate(url);await browser.until("!!document.querySelector('[data-brand-logo=official] img')&&document.querySelector('[data-brand-logo=official] img').naturalWidth===2000",'official logo loaded');
    if(name==='formulario')await browser.until("!!document.querySelector('[data-testid=public-contract-form] form')",'private client form');
    await browser.overflow(name+' '+width);
    const frame=await browser.evaluate<{width:number;height:number}>("(()=>{const r=document.querySelector('[data-brand-logo=official]').getBoundingClientRect();return {width:r.width,height:r.height};})()");assert.ok(frame.width>20);assert.ok(Math.abs(frame.width-frame.height)<1,'Logo retains square proportions');
    const shot=await browser.command('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});writeFileSync(`${out}/${name}-${width}.png`,Buffer.from(shot.data as string,'base64'));
   }
  }
  assert.deepEqual(browser.externalFirebase,[]);
 }finally{await browser.close();}
 await testOperationDraftDocumentsBrowser();
 console.log('OFFICIAL_BRAND_BROWSER=PASS; HOMEPAGE_FORM_DESKTOP_MOBILE; CONTRACT_PREVIEW_REGRESSIONS; EMULATOR_ONLY');
}
