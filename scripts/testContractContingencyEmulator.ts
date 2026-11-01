import './helpers/requireSafeEmulatorEnvironment';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,mkdirSync,existsSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {admin} from '../src/lib/firebaseAdmin';
import {contractContingencyModels} from '../src/lib/contractContingencyModels';
import {GET} from '../src/app/api/admin/documentacion/modelos-contingencia/route';
import {p1Token} from './testPortalP1Emulator';
import {CatalogBrowser} from './helpers/catalogBrowser';
import {startProductionBrowserServer} from './helpers/productionAdapterBrowserServer';
import {productionRuntimeForEmulator} from '../src/lib/productionV2/runtime';
async function main(){
 const db=admin.firestore(),password='Synthetic-only-123',owner=await admin.auth().createUser({email:process.env.NEXT_PUBLIC_ADMIN_EMAIL!,password,emailVerified:true}),other=await admin.auth().createUser({email:'contingency-client@example.test',password,emailVerified:true});
 const ownerToken=await p1Token(owner),otherToken=await p1Token(other);
 const request=(id:string,token?:string)=>GET(new Request('http://localhost/api/admin/documentacion/modelos-contingencia?modelo='+encodeURIComponent(id),{headers:token?{Authorization:'Bearer '+token}:{}}));
 assert.equal((await request('contrato-anexos')).status,401);assert.equal((await request('contrato-anexos',otherToken)).status,403);
 for(const bad of ['','../finalPackages.json','contrato','__proto__'])assert.equal((await request(bad,ownerToken)).status,404);
 for(const model of contractContingencyModels){const response=await request(model.id,ownerToken);assert.equal(response.status,200);assert.equal(response.headers.get('Content-Type'),'application/pdf');assert.equal(response.headers.get('Cache-Control'),'private, no-store');assert.equal(response.headers.get('Content-Disposition'),`attachment; filename="${model.filename}"`);const bytes=Buffer.from(await response.arrayBuffer());assert.equal(bytes.length,model.sizeBytes);assert.equal(createHash('sha256').update(bytes).digest('hex'),model.sha256);assert.equal(bytes.subarray(0,5).toString(),'%PDF-');assert.deepEqual(bytes,readFileSync(join('src/assets/contract-contingency',model.filename)));}
 assert.equal((await db.listCollections()).length,0,'Downloads create no business records');
 console.log('CONTINGENCY_MODELS_AUTH_ALLOWLIST_PRIVATE_HEADERS_INTEGRITY_NO_BUSINESS_WRITES=PASS');
 if(process.env.CONTINGENCY_BROWSER==='1'){
  const server=await startProductionBrowserServer(productionRuntimeForEmulator(db,admin.auth(),[],[owner.uid])),browser=await CatalogBrowser.open(),output='/tmp/cuenta-hogar-contingency-downloads';mkdirSync(output,{recursive:true});
  try{
   await browser.command('Browser.setDownloadBehavior',{behavior:'allow',downloadPath:output});
   await browser.navigate('/login');await browser.until("typeof window.__FIREBASE_SIGN_IN__==='function'",'Auth');await browser.evaluate(`window.__FIREBASE_SIGN_IN__(${JSON.stringify(process.env.NEXT_PUBLIC_ADMIN_EMAIL)},${JSON.stringify(password)}).then(()=>true)`);
   await browser.navigate('/admin/documentacion');await browser.until("document.querySelectorAll('[data-testid=contract-contingency] button:not(:disabled)').length===2",'Download models');
   for(const width of [1280,390]){await browser.command('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:width<768});await browser.evaluate("document.querySelector('[data-testid=contract-contingency]').scrollIntoView({block:'start'})");await browser.overflow('contingency '+width);await browser.screenshot('contingency-'+width+'.png');}
   for(const model of contractContingencyModels){const file=join(output,model.filename);rmSync(file,{force:true});await browser.clickText(model.id==='contrato-anexos'?'Descargar contrato y anexos':'Descargar pagaré en pesos');let downloaded=false;for(let i=0;i<100;i++){if(existsSync(file)&&createHash('sha256').update(readFileSync(file)).digest('hex')===model.sha256){downloaded=true;break;}await new Promise(resolve=>setTimeout(resolve,100));}assert(downloaded,'Browser downloaded exact model '+model.id);await browser.until("document.querySelectorAll('[data-testid=contract-contingency] button:not(:disabled)').length===2",'Download complete');}
   assert.equal((await db.listCollections()).length,0);assert.deepEqual(browser.externalFirebase,[]);
   console.log('CONTINGENCY_BROWSER_DOWNLOAD_FILES_1280_390_NO_OVERFLOW_NO_BUSINESS_WRITES=PASS');
  }finally{await browser.close();await server.stop();}
 }
 await admin.app().delete();
}
main().catch(error=>{console.error(error);process.exitCode=1;});
