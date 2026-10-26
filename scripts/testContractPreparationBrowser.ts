import './helpers/requireSafeEmulatorEnvironment';
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
import {admin} from '../src/lib/firebaseAdmin';
import {CatalogBrowser} from './helpers/catalogBrowser';
import {productionReadyFixture} from './helpers/productionAdapterFixtures';
import {contractCommand} from '../src/lib/contractV2Server';
import {adminEmail,adminPassword} from './helpers/adminSolicitudesFixtures';
export async function testContractPreparationBrowser(){
 const actor=await admin.auth().createUser({email:adminEmail,password:adminPassword,emailVerified:true});
 const f=await productionReadyFixture(actor.uid);
 const before=(await f.r.draft.get()).data()!;
 await contractCommand(admin.firestore(),f.id,1,{action:'RETURN_TO_DRAFT',commandId:randomUUID(),expectedRevision:before.revision,reason:'Corrección sintética para prueba visual'},actor.uid);
 const b=await CatalogBrowser.open(),dir='docs/contract-preparation/evidence';mkdirSync(dir,{recursive:true});
 async function select(label:string,value:string){await b.evaluate(`(()=>{const e=document.querySelector('[aria-label="'+${JSON.stringify(label)}+'"]');Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set.call(e,${JSON.stringify(value)});e.dispatchEvent(new Event('change',{bubbles:true}));})()`);}
 async function shot(name:string){await b.evaluate('document.fonts.ready.then(()=>true)');const image=await b.command('Page.captureScreenshot',{format:'png'});writeFileSync(dir+'/'+name+'.png',Buffer.from(image.data as string,'base64'));}
 const plan='[aria-label="Plan de cuotas del borrador"]';
 try{
 await b.navigate('/login');await b.until("typeof window.__FIREBASE_SIGN_IN__==='function'",'emulator auth');await b.evaluate(`window.__FIREBASE_SIGN_IN__(${JSON.stringify(adminEmail)},${JSON.stringify(adminPassword)}).then(()=>true)`);
 for(const [name,width,height,mobile]of [['desktop',1280,900,false],['mobile',390,844,true]] as const){
 await b.command('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile});
 await b.navigate(`/admin/operaciones/${f.id}/1`);await b.until("!!document.querySelector('[data-testid=open-contract-preparation]')",'independent editor access');
 const link=await b.evaluate<{href:string;target:string}>("(()=>{const a=document.querySelector('[data-testid=open-contract-preparation]');return {href:a.getAttribute('href'),target:a.target};})()");
 assert.equal(link.href,`/admin/operaciones/${f.id}/1?section=contract&editor=1`);assert.equal(link.target,`contract-${f.id}-1`);
 // Confirm a real separate browser target is opened; inspect the same destination
 // through the controlled test tab after closing that isolated target.
 await b.command('Runtime.evaluate',{expression:"document.querySelector('[data-testid=open-contract-preparation]').click()",userGesture:true});
 let opened:string|undefined;for(let i=0;i<30&&!opened;i++){const targets=await b.command('Target.getTargets');opened=(targets.targetInfos as {targetId:string;url:string}[]).find(t=>t.url.includes(link.href))?.targetId;if(!opened)await b.delay(100);}
 assert(opened,'Separate preparation window');await b.command('Target.closeTarget',{targetId:opened});
 await b.navigate(link.href);await b.until(`!!document.querySelector('${plan}')&&!document.querySelector('${plan}').disabled`,'editor editable');
 assert.equal(await b.evaluate("document.querySelectorAll('[data-testid=open-contract-preparation]').length"),0);
 await b.change('input[name=fullName]','Cambio local sintético sin guardar');await b.evaluate("window.dispatchEvent(new Event('focus'))");await b.delay(200);assert.equal(await b.evaluate("document.querySelector('input[name=fullName]').value"),'Cambio local sintético sin guardar');await b.change('input[name=fullName]',(await f.r.draft.get()).data()!.personalData.fullName);
 await b.overflow('independent editor '+name);await shot('editor-'+name);
 const count=(await f.r.draft.collection('commands').get()).size;
 await b.evaluate("(()=>{const original=window.fetch;window.planPosts=0;window.fetch=async(...args)=>{if(args[1]?.method==='POST'&&String(args[0]).endsWith('/contract')&&JSON.parse(args[1].body).action==='SET_CONTRACT_PLAN'){window.planPosts++;const response=await original(...args);await new Promise(resolve=>window.releasePlan=resolve);return response;}return original(...args);};const e=document.querySelector('[aria-label=\"Plan de cuotas del borrador\"]');for(const value of ['8','12']){Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set.call(e,value);e.dispatchEvent(new Event('change',{bubbles:true}));}})()");
 await b.until("typeof window.releasePlan==='function'",'pending save');assert.equal(await b.evaluate('window.planPosts'),1);assert.equal(await b.evaluate(`document.querySelector('${plan}').disabled`),true);assert.equal((await f.r.draft.collection('commands').get()).size,count+1);
 await b.evaluate('(()=>{window.releasePlan();return true;})()');await b.until(`!document.querySelector('${plan}').disabled&&document.querySelector('${plan}').value==='8'`,'saved draft');
 await b.change('[aria-label="Primera cuota"]','2027-01-31');await select('Día habitual','31');await b.clickText('Guardar fechas y revisar cronograma');
 await b.until("document.querySelector('[data-testid=contract-schedule] tbody').rows.length===8&&!document.querySelector('[data-testid=contract-editable-fields]').disabled",'schedule persisted');
 const d=(await f.r.draft.get()).data()!;assert.equal(d.paymentScheduleDraft[1].dueDate,'2027-02-28');assert.equal(d.paymentScheduleDraft.reduce((sum:number,row:{amount:number})=>sum+row.amount,0),d.economicTerms.contractTotal);
 await b.until("[...document.querySelectorAll('button')].some(e=>e.textContent==='Contrato de mandato — Ver vista previa'&&!e.disabled)",'draft PDF before conformity');await b.clickText('Contrato de mandato — Ver vista previa');await b.until("!!document.querySelector('[data-testid=operation-document-open]')",'mandate open');await b.overflow('draft PDF '+name);await shot('mandato-'+name);await b.clickText('Cerrar vista previa');await b.clickText('Pagaré — Ver vista previa');await b.until("!!document.querySelector('[data-testid=operation-document-open]')",'note open');await shot('pagare-'+name);await b.clickText('Cerrar vista previa');
 assert.equal((await admin.firestore().collection('contractNumbersV2').get()).size,0);assert.equal((await admin.firestore().collection('contractSnapshotsV2').get()).size,0);
 }
 assert.deepEqual(b.externalFirebase,[]);console.log('CONTRACT_PREPARATION_BROWSER_DESKTOP_MOBILE_POPUP_DESTINATION_DRAFT_SAVE_DUPLICATE_GUARD_PDFS_NO_CH = PASS');
 }catch(error){await shot('failure');throw error;}finally{await b.close();}
}
