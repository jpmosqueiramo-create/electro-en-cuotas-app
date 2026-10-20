import assert from 'node:assert/strict';
import { mkdirSync,writeFileSync } from 'node:fs';
import { CatalogBrowser } from './helpers/catalogBrowser';
import { createSyntheticReviewServer } from './helpers/contractDocumentPreview';
import { documentReviewFixture } from './helpers/contractDocumentFixtures';
import { generateContractReviewPair } from '../src/lib/contractDocuments/pdf';
async function main(){
 const pair=generateContractReviewPair(documentReviewFixture()),server=createSyntheticReviewServer(pair);await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));
 const browser=await CatalogBrowser.open();mkdirSync('/tmp/cuenta-hogar-contract-documents',{recursive:true});
 try{
  const address=server.address();assert.ok(address&&typeof address!=='string');const base=`http://127.0.0.1:${address.port}`;
  for(const [width,height] of [[1280,800],[390,844]]){
   await browser.command('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width===390});await browser.command('Page.navigate',{url:base});
   await browser.until("document.readyState!=='loading'&&!!document.querySelector('iframe')",'review preview');
   assert.equal(await browser.evaluate('document.querySelectorAll("iframe").length'),2);assert.equal(await browser.evaluate('document.querySelectorAll("button").length'),0);await browser.overflow('synthetic review preview');
   const text=await browser.evaluate<string>('document.body.innerText');assert.ok(text.includes('NO VÁLIDO PARA FIRMA'));assert.ok(text.includes('Revisión administrativa'));
   assert.equal((await fetch(`${base}/pagare.pdf`)).status,200);
   const shot=await browser.command('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});writeFileSync(`/tmp/cuenta-hogar-contract-documents/preview-${width}.png`,Buffer.from(shot.data as string,'base64'));
  }
  assert.deepEqual(browser.externalFirebase,[]);console.log('DOCUMENTS_LOCAL_REVIEW_BROWSER_DESKTOP_MOBILE = PASS');
 }finally{await browser.close();await new Promise<void>((resolve,reject)=>server.close(err=>err?reject(err):resolve()));}
}
main().catch(()=>{console.error('DOCUMENTS_BROWSER = FAIL');process.exitCode=1;});
