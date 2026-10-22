/** Full same-operation journey. Writes only to a fresh local DEMO Emulator. */
import './helpers/requireSafeEmulatorEnvironment';
import assert from 'node:assert/strict';
import { randomUUID, randomBytes } from 'node:crypto';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { mkdirSync, writeFileSync } from 'node:fs';
import { jsPDF } from 'jspdf';
import { admin } from '../src/lib/firebaseAdmin';
import { CatalogBrowser } from './helpers/catalogBrowser';
import { adminEmail, adminPassword } from './helpers/adminSolicitudesFixtures';
import { budgetFixture } from './helpers/budgetV2Fixtures';
import { createCatalogReferenceDraft } from '../src/lib/catalogReferenceEditor';
import { buildBudgetOptionV2 } from '../src/lib/budgetReferenceV2';
import { contractRefs, getContract } from '../src/lib/contractV2Server';
import type { ContractDraftV2 } from '../src/lib/contractV2';
import { contractEconomics, contractSchedule } from '../src/lib/contractV2';
import { addressPayload } from './testContractV2';
import { creditRefs, readCreditReview } from '../src/lib/creditReviewV2Server';
import { requiredDocuments } from '../src/lib/creditReviewV2';
import { operationRef } from '../src/lib/operationV2';
import { readFulfillment } from '../src/lib/operationFulfillmentV2Server';
import { authorizeCustody } from '../src/lib/operationCustodyV2Server';
import { readDelivery } from '../src/lib/operationDeliveryV2Server';
import { saveDeliveryPhoto } from '../src/lib/operationDeliveryV2Photos';
import { getBudgetDocumentationBucket } from '../src/lib/budgetDocumentationStorage';
import { financialApprovalRef, financialRef, financialCommand, readFinancial } from '../src/lib/operationFinancialV2Server';
import { clientBindingCommand, prerequisitesRef, redeemClientInvitation, listClientServices } from '../src/lib/operationClientV2Server';
import { createContractFreezeIntegrationEmulator, FREEZE_DEPENDENCIES_COLLECTION } from '../src/lib/contractFreezeIntegrationEmulator';
import { CONTRACT_INFRASTRUCTURE_PATHS } from '../src/lib/contractInfrastructureEmulator';
import { infrastructureFixture } from './helpers/contractInfrastructureFixtures';
import { generateContractReviewPair, reviewDocumentDefinitions } from '../src/lib/contractDocuments/pdf';
import { createPrivateDocumentArchiveEmulator } from '../src/lib/contractDocuments/archiveEmulator';
import { contractValueHash } from '../src/lib/contractIntegrityV2';
import {readOperationDraftDocuments} from '../src/lib/contractDocuments/operationDraftServer';
import { financialEnabled } from '../src/lib/operationFinancialV2';
import { deliveryEnabled } from '../src/lib/operationDeliveryV2';
import { invitationsEnabled } from '../src/lib/operationClientV2';

const base='http://localhost:3000', dir='/tmp/cuenta-hogar-v2-integral', db=admin.firestore();
const ux:Record<string,unknown>[]=[];
const results:Record<string,string>={}, http: {method:string;path:string;status:number}[]=[];
const personal={...addressPayload.personalData,fullName:'Persona Sintética Integral',email:'integral-client@example.invalid',whatsapp:'5491100000001'};
const employment={cuil:'20123456786',employerOrWorkName:'Empresa ficticia de prueba',workAddress:'Domicilio laboral sintético'};
let token='', browser:CatalogBrowser;
function pass(stage:string){results[stage]='PASS';console.log(stage+' = PASS');}
async function api<T>(path:string,body?:unknown,as:string|null=token,expected=200):Promise<T>{
 assert.equal(new URL(path,base).hostname,'localhost');
 const response=await fetch(base+path,{method:body===undefined?'GET':'POST',headers:{...(as?{Authorization:'Bearer '+as}:{}),Origin:base,...(body===undefined?{}:{'Content-Type':'application/json'})},...(body===undefined?{}:{body:JSON.stringify(body)})});
 http.push({method:body===undefined?'GET':'POST',path,status:response.status});
 const data=await response.json();assert.equal(response.status,expected,path+' '+JSON.stringify(data));return data as T;
}
const endpoint=(id:string,suffix:string)=>'/api/admin/presupuestos-v2/'+id+'/versions/1/'+suffix;
async function photo(name:string){await browser.evaluate('document.fonts.ready.then(()=>true)');const s=await browser.command('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});writeFileSync(dir+'/'+name+'.png',Buffer.from(s.data as string,'base64'));}
async function view(id:string,section:string,label:string){await browser.navigate('/admin/operaciones/'+id+'/1');await browser.until("!!document.querySelector('[data-testid=operation-unified-workspace]')",'unified workspace');await browser.clickText(section);await browser.until("!document.querySelector('main').innerText.includes('Consultando evaluación…')",'loaded credit');if(section==='Cuotas y pagos')await browser.until("document.querySelector('[data-testid=financial-v2-status]')!==null",'financial data loaded');
 if(label.startsWith('final-')&&!label.includes('recurrente'))await browser.until("document.querySelector('[data-testid=operation-unified-workspace] header [role=status]')?.innerText.includes('Consultar cuotas y pagos')",'next action after delivery');
 await browser.overflow(label);
 ux.push({label,...await browser.evaluate<Record<string,unknown>>("({width:innerWidth,inputs:[...document.querySelectorAll('main input,main select,main textarea')].filter(e=>e.getClientRects().length>0).length,buttons:[...document.querySelectorAll('main button')].filter(e=>e.getClientRects().length>0).length,scrollHeight:document.documentElement.scrollHeight,nextAction:document.querySelector('[data-testid=operation-unified-workspace] header [role=status]')?.innerText})")});
 if(section==='Contrato')await browser.evaluate("document.querySelector('[data-testid=credit-review]')?.scrollIntoView({block:'start'})");await photo(label);}
async function intake(product:string){
 await browser.navigate('/solicitar');await browser.until("!!document.querySelector('form input[autocomplete=name]')",'quick form');await browser.until("!document.body.innerText.includes('Cargando referencia')",'quick hydrated');
 assert.equal(await browser.evaluate("document.querySelectorAll('form input[required]').length"),4);
 await browser.command('Network.setBlockedURLs',{urls:['*wa.me/*','*whatsapp.com/*']});
 for(const [label,value] of [['Producto o necesidad',product],['Nombre y apellido',personal.fullName],['WhatsApp',personal.whatsapp],['Localidad',personal.locality]])await browser.evaluate('(()=>{const e=[...document.querySelectorAll("label")].find(l=>l.textContent.includes('+JSON.stringify(label)+'))?.querySelector("input");if(!e)throw Error("Missing quick field");Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value").set.call(e,'+JSON.stringify(value)+');e.dispatchEvent(new Event("input",{bubbles:true}));})()');
 await browser.until("[...document.querySelectorAll('form input')].every(e=>e.value.trim())",'quick controlled values');
 await photo(product.includes('Lavarropas')?'01-consulta-desktop':'12-consulta-recurrente');
 await browser.clickText('Enviar consulta y hablar con un asesor');
 let requests=await db.collection('solicitudes_cuenta').where('productoNombre','==',product).get();
 const deadline=Date.now()+30000;while(requests.size===0&&Date.now()<deadline){await new Promise(r=>setTimeout(r,100));requests=await db.collection('solicitudes_cuenta').where('productoNombre','==',product).get();}assert.equal(requests.size,1,'one canonical request');
 assert.equal((await db.collection('solicitudes').get()).size,0,'no double legacy write');
 const doc=requests.docs[0],before=doc.updateTime!.toMillis();
 await api('/api/public/solicitudes',{submissionId:doc.id.slice(4),payload:{tipo:'consulta_v2',productoNombre:product,nombreCompleto:personal.fullName,whatsapp:personal.whatsapp,localidad:personal.locality}},null);
 assert.equal((await doc.ref.get()).updateTime!.toMillis(),before);
 return doc.id;
}
async function budget(sourceId:string,product:string){
 const id='integral-'+randomUUID(),b=budgetFixture(id,1),draft=createCatalogReferenceDraft();Object.assign(draft,{nombre:product,descripcion:'Producto sintético para validación integral',costoProveedor:'580000',proveedor:'PROVEEDOR_SINTETICO_PRIVADO'});for(const n of [8,12,18])draft.planesActivos[n]=true;
 b.options=[buildBudgetOptionV2('option-integral',{draft,source:'NEW_REFERENCE',referenceId:null,fechaCotizacion:new Date().toISOString()})];b.sourceCollection='solicitudes_cuenta';b.solicitudId=sourceId;b.clienteSnapshot={nombre:personal.fullName,dni:'',cuil:'',whatsapp:personal.whatsapp,localidad:personal.locality};
 const save={action:'SAVE',commandId:randomUUID(),budget:b,expectedRevision:0,privateOptionIds:[]};
 let saved=(await api<{budget:typeof b}>('/api/admin/presupuestos-v2',save)).budget;
 const stamp=(await contractRefs(db,id,1).budget.get()).updateTime!.toMillis();await api('/api/admin/presupuestos-v2',save);assert.equal((await contractRefs(db,id,1).budget.get()).updateTime!.toMillis(),stamp);
 saved=(await api<{budget:typeof b}>('/api/admin/presupuestos-v2',{action:'ISSUE',commandId:randomUUID(),budget:saved,expectedRevision:saved.revision,privateOptionIds:[]})).budget;
 const accept={budgetId:id,version:1,acceptedOptionId:'option-integral',preferredPlanCuotas:12,commandId:randomUUID()};await Promise.all([api(endpoint(id,'acceptance'),accept),api(endpoint(id,'acceptance'),accept)]);
 const r=contractRefs(db,id,1),identity=(await operationRef(db,id,1).get()).data()!;
 assert.equal(identity.solicitudId,sourceId);assert.equal(identity.budgetId,id);assert.equal((await r.family.collection('acceptances').get()).size,1);
 return {id,r,b:saved,identity};
}
type Case=Awaited<ReturnType<typeof budget>>;
async function cmd(f:Case,action:string,extra:Record<string,unknown>={}){const d=(await f.r.draft.get()).data();return api<{draft:ContractDraftV2;requestId?:string;secret?:string}>(endpoint(f.id,'contract'),{action,commandId:randomUUID(),...(action==='OPEN_OR_CREATE'?{}:{expectedRevision:d!.revision}),...extra});}
async function credit(f:Case,action:string,extra:Record<string,unknown>={}){const v=await readCreditReview(db,f.id,1);return api(endpoint(f.id,'credit-review'),{action,commandId:randomUUID(),expectedRevision:v.review?.revision??0,expectedProfileRevision:v.profile?.revision??0,...extra});}
async function clientData(f:Case){
 await cmd(f,'OPEN_OR_CREATE');const request=await cmd(f,'CREATE_CLIENT_DATA_REQUEST');assert(request.requestId&&request.secret);
 const url='/completar-datos/'+request.requestId;
 await browser.navigate(url+'#'+request.secret);await browser.until("!!document.querySelector('[data-testid=public-contract-form] form')",'private form');
 assert.equal(await browser.evaluate("document.querySelector('[name=preferredMonthlyDueDay]')"),null);
 assert.equal(await browser.evaluate("/capitalAmount|contractPlanCuotas|Cuotas/.test(document.querySelector('form').innerText)"),false);
 for(const [key,value]of Object.entries({...personal,...employment})){const selector='[name="'+key+'"]';const isSelect=await browser.evaluate('document.querySelector('+JSON.stringify(selector)+')?.tagName==="SELECT"');if(isSelect)await browser.evaluate('(()=>{const e=document.querySelector('+JSON.stringify(selector)+');e.value='+JSON.stringify(value)+';e.dispatchEvent(new Event("change",{bubbles:true}));})()');else await browser.change(selector,value);}
 await photo(f.b.options[0].referenceSnapshot.nombre.includes('Lavarropas')?'04-formulario-personal':'13-formulario-recurrente');
 const bad=await fetch(base+'/api/public/contract-data/'+request.requestId,{method:'POST',headers:{Origin:base,'Content-Type':'application/json','X-Client-Data-Token':request.secret},body:JSON.stringify({personalData:personal,employmentData:employment,contractPlanCuotas:18})});assert.equal(bad.status,400);
 await browser.clickText('Enviar datos');await browser.until("document.body.innerText.includes('Recibimos tus datos')",'client submission');
 const sub=(await f.r.draft.collection('submissions').doc(request.requestId).get());assert(sub.exists);assert.equal(sub.data()!.preferredMonthlyDueDay,undefined);
 const time=sub.updateTime!.toMillis();const repeat=await fetch(base+'/api/public/contract-data/'+request.requestId,{method:'POST',headers:{Origin:base,'Content-Type':'application/json','X-Client-Data-Token':request.secret},body:JSON.stringify({personalData:personal,employmentData:employment})});assert.equal(repeat.status,200);assert.equal((await sub.ref.get()).updateTime!.toMillis(),time);
 assert.equal((await f.r.draft.get()).data()!.lastClientSubmissionAppliedAt,null);
 await cmd(f,'APPLY_CLIENT_SUBMISSION',{submissionId:request.requestId});assert.deepEqual((await f.r.draft.get()).data()!.personalData,personal);
 return request;
}
async function main(){
 assert.equal(process.env.GCLOUD_PROJECT,'demo-cuenta-hogar');assert.equal(process.env.FIREBASE_STORAGE_EMULATOR_HOST,'127.0.0.1:9199');assert.equal((await db.collection('presupuestos_v2').get()).size,0,'Use fresh emulator');
 mkdirSync(dir,{recursive:true});
 const historical=contractRefs(db,'historical-integral-sentinel',1);
 const historicalBudget=budgetFixture('historical-integral-sentinel',1);
 await historical.family.create({lastVersion:1,sourceCollection:historicalBudget.sourceCollection,solicitudId:historicalBudget.solicitudId});
 await historical.budget.create(historicalBudget);
 const historicalSubmission=historical.draft.collection('submissions').doc('legacy-submission');
 await historicalSubmission.create({personalData:addressPayload.personalData,employmentData:addressPayload.employmentData,preferredMonthlyDueDay:30,submittedAt:'2026-01-01T00:00:00Z',digest:'HISTORICAL_DIGEST_UNCHANGED'});
 const historicalBefore=await Promise.all([historical.budget.get(),historicalSubmission.get()]);

 const u=await admin.auth().createUser({email:adminEmail,password:adminPassword,emailVerified:true});
 const login=await fetch('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=demo-key',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:adminEmail,password:adminPassword,returnSecureToken:true})});assert.equal(login.status,200);token=(await login.json()).idToken;
 browser=await CatalogBrowser.open();
 try{
 await browser.command('Emulation.setDeviceMetricsOverride',{width:1280,height:800,deviceScaleFactor:1,mobile:false});
 const source=await intake('Lavarropas sintético integral — NO REAL');pass('01_PUBLIC_QUERY');
 await browser.navigate('/login');await browser.until("typeof window.__FIREBASE_SIGN_IN__==='function'",'emulator admin');await browser.evaluate('window.__FIREBASE_SIGN_IN__('+JSON.stringify(adminEmail)+','+JSON.stringify(adminPassword)+').then(()=>true)');
 await browser.navigate('/admin/solicitudes');await browser.until("document.body.innerText.includes('Lavarropas sintético integral')",'inbox query');await photo('02-bandeja');pass('02_ADMIN_INBOX');
 const f=await budget(source,'Lavarropas sintético integral');await view(f.id,'Presupuesto','03-aceptacion-ficha');pass('03_BUDGET_ISSUE_ACCEPTANCE');
 const dataRequest=await clientData(f);await cmd(f,'UPDATE_PRODUCT_DETAILS',{productDetails:{quantity:1,condition:'NEW'}});await view(f.id,'Contrato','05-datos-recibidos');pass('04_PERSONAL_EMPLOYMENT_REVIEW_APPLY');
 await credit(f,'VERIFY_IDENTITY',{evidence:'Documento sintético comprobado por administrador de prueba'});
 const proof=new jsPDF();proof.text('DOCUMENTO SINTETICO — NO ES DNI REAL',15,25);proof.text('Persona Sintetica Integral / SOLO EMULATOR',15,40);const pdf=proof.output('arraybuffer');
 for(const type of requiredDocuments){const form=new FormData();form.set('file',new Blob([pdf],{type:'application/pdf'}),type+'-sintetico.pdf');form.set('commandId',randomUUID());const res=await fetch(base+endpoint(f.id,'documentation/'+type+'/attachments'),{method:'POST',headers:{Authorization:'Bearer '+token},body:form});assert.equal(res.status,200,await res.clone().text());const a=(await res.json()).attachment;await credit(f,'REVIEW_DOCUMENT',{type,attachmentId:a.attachmentId,status:'VERIFIED',validUntil:'2099-12-31',note:'Verificación visual sintética; vigencia manual de prueba'});}
 await view(f.id,'Contrato','06-documentos-verificados');
 await credit(f,'DECIDE',{state:'IN_REVIEW',resolution:'Evaluación manual iniciada',notes:'Prueba sintética sin validez crediticia'});await credit(f,'DECIDE',{state:'APPROVED',resolution:'Aprobación sintética de esta operación',notes:'No es aprobación jurídica'});assert((await readCreditReview(db,f.id,1)).approved);pass('05_DOCUMENTS_MANUAL_CREDIT');
 await cmd(f,'SET_CONTRACT_PLAN',{contractPlanCuotas:12});assert.equal((await f.r.draft.get()).data()!.economicTerms.contractTotal,1740000);await cmd(f,'SET_PAYMENT_DATES',{firstInstallmentDueDate:'2026-12-15',preferredMonthlyDueDay:30});
 let d=(await f.r.draft.get()).data() as ContractDraftV2;assert.deepEqual(d.economicTerms,contractEconomics(f.b.options[0].referenceSnapshot,12));assert.deepEqual(d.paymentScheduleDraft,contractSchedule(d.economicTerms!,'2026-12-15',30));
 await api(endpoint(f.id,'contract'),{action:'MARK_READY_TO_FORMALIZE',expectedRevision:d.revision,commandId:randomUUID()},token,409);
 await cmd(f,'RECORD_CLIENT_CONFORMITY',{evidence:'Conformidad sintética documentada sobre plan y fechas'});await cmd(f,'SET_CONTRACT_PLAN',{contractPlanCuotas:8});assert.equal((await f.r.draft.get()).data()!.economicTerms.contractTotal,1339920);assert.equal((await getContract(db,f.id,1)).clientConformity?.confirmed,false);await cmd(f,'RECORD_CLIENT_CONFORMITY',{evidence:'Nueva conformidad sintética por cambio de 12 a 8 cuotas'});await cmd(f,'SET_CONTRACT_PLAN',{contractPlanCuotas:12});assert.equal((await f.r.draft.get()).data()!.economicTerms.contractTotal,1740000);await cmd(f,'RECORD_CLIENT_CONFORMITY',{evidence:'Conformidad sintética final sobre 12 cuotas'});await cmd(f,'MARK_READY_TO_FORMALIZE');
 const revoked=await fetch(base+'/api/public/contract-data/'+dataRequest.requestId,{headers:{Origin:base,'X-Client-Data-Token':dataRequest.secret!}});assert.equal(revoked.status,400);
 const immutable=contractValueHash({budget:(await f.r.budget.get()).data(),acceptance:(await f.r.acceptance.get()).data()});await view(f.id,'Contrato','07-ready');pass('06_ECONOMICS_CONFORMITY_READY');
 const source2=await intake('Heladera sintética recurrente — NO REAL');const second=await budget(source2,'Heladera sintética recurrente');await clientData(second);
 await cmd(second,'UPDATE_PERSONAL_DATA',{personalData:{...personal,dni:'87654321'}});const v=await readCreditReview(db,second.id,1);await api(endpoint(second.id,'credit-review'),{action:'LINK_PROFILE',originBudgetId:f.id,originVersion:1,evidence:'Debe rechazar identidad diferente',commandId:randomUUID(),expectedRevision:v.review!.revision,expectedProfileRevision:0},token,409);await cmd(second,'UPDATE_PERSONAL_DATA',{personalData:personal});
 const bucket=await getBudgetDocumentationBucket(),fileCount=(await bucket.getFiles({prefix:'budget-documentation-v2/'}))[0].length;
 await credit(second,'LINK_PROFILE',{originBudgetId:f.id,originVersion:1,evidence:'Identidad documental expresamente verificada'});assert.equal((await bucket.getFiles({prefix:'budget-documentation-v2/'}))[0].length,fileCount);assert(!(await readCreditReview(db,second.id,1)).approved);
 await credit(second,'DECIDE',{state:'IN_REVIEW',resolution:'Nueva revisión propia',notes:'No se hereda aprobación'});await credit(second,'DECIDE',{state:'REJECTED',resolution:'Rechazo sintético independiente',notes:'Primera operación permanece aprobada'});assert((await readCreditReview(db,f.id,1)).approved);
 const profile=(await creditRefs(db,f.id,1).profile.get()).data()!;
 const reusedDownload=await fetch(base+endpoint(second.id,'credit-document/DNI_FRONT'),{headers:{Authorization:'Bearer '+token}});assert.equal(reusedDownload.status,200);assert.equal(reusedDownload.headers.get('Cache-Control'),'private, no-store');assert.deepEqual(Buffer.from(await reusedDownload.arrayBuffer()),Buffer.from(pdf));
 const anonymousStorage=await fetch('http://127.0.0.1:9199/v0/b/demo-cuenta-hogar.appspot.com/o/'+encodeURIComponent(profile.documents.DNI_FRONT.attachment.storagePath)+'?alt=media');assert.equal(anonymousStorage.status,403);
 for(const [type,status,validUntil]of [['DNI_FRONT','VERIFIED','2000-01-01'],['DNI_BACK','OBSERVED',null]] as const)await credit(second,'REVIEW_DOCUMENT',{type,attachmentId:profile.documents[type].attachment.attachmentId,status,validUntil,note:'Solicitar actualización sintética'});
 assert.equal((await readCreditReview(db,second.id,1)).documents[0].status,'EXPIRED');assert.equal((await readCreditReview(db,second.id,1)).documents[1].status,'OBSERVED');assert(!(await readCreditReview(db,f.id,1)).approved);
 await view(second.id,'Contrato','14-recurrente-actualizacion');pass('07_RECURRENT_REUSE_INDEPENDENT_REVIEW');
 const legal=infrastructureFixture(f.id).legalContext;legal.documentDefinitions=reviewDocumentDefinitions();const dep='integral-'+randomUUID();await db.collection(FREEZE_DEPENDENCIES_COLLECTION).doc(dep).create({schemaVersion:'CONTRACT_FREEZE_SYNTHETIC_DEPENDENCIES_V1',executionMode:'EMULATOR_ONLY',legalApproval:'NOT_APPROVED_SYNTHETIC_ONLY',legalContext:legal});
 await db.doc(CONTRACT_INFRASTRUCTURE_PATHS.counter).create({schemaVersion:'CONTRACT_NUMBER_COUNTER_V1',policyId:'CONTRACT_NUMBERING_V1',executionMode:'EMULATOR_ONLY',active:true,lastAllocatedSequence:'0'});

 const staleFreeze=createContractFreezeIntegrationEmulator();
 try{const ready=(await f.r.draft.get()).data()!;await assert.rejects(()=>staleFreeze.execute({action:'FREEZE_READY_EMULATOR',commandId:randomUUID(),budgetId:f.id,budgetVersion:1,expectedRevision:ready.revision,dependenciesId:dep},'synthetic-admin-a'),/evaluación crediticia/);assert.equal((await db.doc(CONTRACT_INFRASTRUCTURE_PATHS.counter).get()).data()!.lastAllocatedSequence,'0');}finally{await staleFreeze.close();}
 pass('07B_STALE_CREDIT_BLOCKS_FREEZE');

 // Restore validity with explicit audited commands; no file copied or deleted.
 for(const type of requiredDocuments)await credit(f,'REVIEW_DOCUMENT',{type,attachmentId:profile.documents[type].attachment.attachmentId,status:'VERIFIED',validUntil:'2099-12-31',note:'Actualización sintética verificada'});
 await credit(f,'DECIDE',{state:'IN_REVIEW',resolution:'Revisión posterior a actualización',notes:'Sólo Emulator'});await credit(f,'DECIDE',{state:'APPROVED',resolution:'Nueva aprobación manual sintética',notes:'Sólo Emulator'});
 await cmd(f,'RETURN_TO_DRAFT',{reason:'Revisión sintética explícita posterior a READY'});assert.equal((await f.r.draft.get()).data()!.status,'DRAFT');await cmd(f,'MARK_READY_TO_FORMALIZE');
 const currentDocuments=await readOperationDraftDocuments(db,f.id,1);assert(currentDocuments.available);assert.equal(currentDocuments.projection.product.quantity,1);assert.equal(currentDocuments.projection.product.condition,'NEW');assert.equal(currentDocuments.projection.economics!.total,1740000);assert.equal(currentDocuments.projection.schedule.length,12);assert.equal(currentDocuments.projection.number,null);
 writeFileSync(dir+'/mandato-borrador-operacion.pdf',Buffer.from(currentDocuments.mandate.base64,'base64'));writeFileSync(dir+'/pagare-borrador-operacion.pdf',Buffer.from(currentDocuments.promissoryNote.base64,'base64'));writeFileSync(dir+'/document-projection.json',JSON.stringify(currentDocuments.projection,null,2));pass('07C_RETURN_DRAFT_CURRENT_PDFS_SAME_PERSISTED_REVISION');
 // Continue the exact first operation. Synthetic dependencies explicitly do not attest legal approval.
 const freeze=createContractFreezeIntegrationEmulator();let snapshot;
 try{d=(await f.r.draft.get()).data() as ContractDraftV2;const receipt=await freeze.execute({action:'FREEZE_READY_EMULATOR',commandId:randomUUID(),budgetId:f.id,budgetVersion:1,expectedRevision:d.revision,dependenciesId:dep},'synthetic-admin-a');snapshot=(await freeze.getSnapshot(receipt.snapshotId))!;}finally{await freeze.close();}
 assert.equal(snapshot.paymentSchedule.installments.length,12);writeFileSync(dir+'/contract-snapshot-synthetic.json',JSON.stringify(snapshot,null,2));assert.deepEqual(snapshot.paymentSchedule.installments,currentDocuments.projection.schedule);assert.equal(snapshot.economicTerms.contractTotal,currentDocuments.projection.economics!.total);const pair=generateContractReviewPair(snapshot);assert.equal(pair.mandate.pages,2);assert.equal(pair.promissoryNote.pages,1);assert.equal(pair.manifest.legalApproval,'PENDING');writeFileSync(dir+'/reference-mandato-emulator.pdf',pair.mandate.bytes);writeFileSync(dir+'/reference-pagare-emulator.pdf',pair.promissoryNote.bytes);
 const archive=createPrivateDocumentArchiveEmulator();try{const saved=await archive.preserve(snapshot);const replay=await archive.preserve(snapshot);assert.deepEqual(saved,replay);}finally{await archive.close();}pass('08_REVIEW_PDF_ARCHIVE');
 const op=String(f.identity.operationId);async function fulfillment(action:string,data:Record<string,unknown>){const state=(await readFulfillment(db,f.id,1)).state;return api(endpoint(f.id,'fulfillment'),{action,data,operationId:op,expectedRevision:state.revision,commandId:randomUUID()});}
 for(const [action,data]of [['UPDATE_ORDER',{providerName:'Proveedor sintético',providerReference:'TEST-ORDER',estimatedAvailabilityDate:'2026-10-20',notes:'SOLO EMULATOR'}],['PLACE_ORDER',{orderDate:'2026-10-19'}],['CONFIRM_ORDER',{actualCost:610000,confirmedAvailabilityDate:'2026-10-20'}],['READY_FOR_PICKUP',{}],['RECORD_PICKUP',{actualPickupDate:'2026-10-20',pickupResponsible:'Conductor sintético'}],['RECEIVE',{actualReceiptDate:'2026-10-20',custodyLocation:'Depósito ficticio',custodian:'Conductor sintético',visualCondition:'SIN_DANOS_VISIBLES',notes:''}],['PLAN_TRIP',{tripReference:'VIAJE-TEST',plannedTripDate:'2026-10-21',carrier:'Conductor sintético'}],['PLAN_DELIVERY',{destinationLocality:'Lincoln',estimatedDeliveryDate:'2026-10-21',deliveryResponsible:'Afiliado sintético'}]] as const)await fulfillment(action,data);
 assert.equal((await readFulfillment(db,f.id,1)).state.actualCost,610000);assert.equal(contractValueHash({budget:(await f.r.budget.get()).data(),acceptance:(await f.r.acceptance.get()).data()}),immutable);await view(f.id,'Proveedor y logística','08-proveedor-logistica');pass('09_PROVIDER_LOGISTICS');
 const affiliate=await admin.auth().createUser({email:'affiliate-integral@example.invalid',password:'Synthetic-integral-only-123',emailVerified:true}),driver=await admin.auth().createUser({email:'driver-integral@example.invalid',emailVerified:true}),client=await admin.auth().createUser({email:personal.email,password:'Synthetic-integral-only-123',emailVerified:true}),other=await admin.auth().createUser({email:'outsider-integral@example.invalid',emailVerified:true});
 const affiliateId='integral-affiliate';await db.collection('vendedores').doc(affiliateId).create({authUid:affiliate.uid,activo:true,nombre:'Vendedor afiliado sintético',email:affiliate.email});const root={uid:u.uid,admin:true},holder={uid:affiliate.uid,role:'AFFILIATE' as const,affiliateId};
 async function custody(action:string,data:Record<string,unknown>,as=token){const s=(await authorizeCustody(db,f.id,1,root)).state;return api(as===token?endpoint(f.id,'custody'):'/api/custodia-v2/'+f.id+'/1',{action,data,operationId:op,expectedRevision:s.revision,commandId:randomUUID()},as);}
 async function authToken(uid:string){const custom=await admin.auth().createCustomToken(uid);const r=await fetch('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=demo-key',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token:custom,returnSecureToken:true})});assert.equal(r.status,200);return (await r.json()).idToken as string;}
 const affiliateToken=await authToken(affiliate.uid),driverToken=await authToken(driver.uid),clientToken=await authToken(client.uid),otherToken=await authToken(other.uid);
 await custody('ASSIGN',{affiliateId,uid:affiliate.uid,reason:'Entrega sintética autorizada'});await custody('AUTHORIZE_TRANSFER',{from:{uid:driver.uid,role:'DRIVER',affiliateId:null},to:holder,occurredAt:new Date().toISOString(),location:'Custodia sintética',reason:'Transferencia sintética de producto'});const transfer=(await authorizeCustody(db,f.id,1,root)).state.pending!.id;await custody('CONFIRM_DELIVERY',{transferId:transfer},driverToken);await custody('CONFIRM_RECEIPT',{transferId:transfer},affiliateToken);pass('10_AFFILIATE_CUSTODY');
 async function delivery(action:string,data:Record<string,unknown>,as=token,expected=200){const s=(await readDelivery(db,f.id,1,root)).state;return api(as===token?endpoint(f.id,'delivery'):'/api/custodia-v2/'+f.id+'/1/delivery',{action,data,operationId:op,expectedRevision:s.revision,commandId:randomUUID()},as,expected);}
 await delivery('PREPARE_DELIVERY',{responsible:holder});await delivery('CONFIRM_DELIVERY',{occurredAt:new Date().toISOString()},affiliateToken,403);
 // Legible synthetic photograph; not a real signature or identification document.
 const encoded=await browser.evaluate<string>("(()=>{const c=document.createElement('canvas');c.width=1000;c.height=650;const x=c.getContext('2d');x.fillStyle='white';x.fillRect(0,0,1000,650);x.fillStyle='black';x.font='bold 30px sans-serif';x.fillText('EVIDENCIA SINTETICA - SOLO EMULATOR',40,70);x.font='24px sans-serif';x.fillText('NO ES UNA FIRMA REAL NI UN DOCUMENTO LEGAL',40,130);x.fillText('Prueba de custodia y validacion de tres documentos',40,210);x.fillText('Participante y operacion ficticios',40,270);return c.toDataURL('image/png').split(',')[1];})()");
 const png=Buffer.from(encoded,'base64');writeFileSync(dir+'/evidencia-firma-sintetica.png',png);
 const remito=new jsPDF();remito.text('REMITO SINTETICO - SOLO EMULATOR - NO FIRMAR',15,25);remito.text('Lavarropas sintetico integral - Cantidad 1 - Nuevo',15,40);remito.text('No acredita una entrega real. Evidencia de prueba.',15,55);const remitoBytes=Buffer.from(remito.output('arraybuffer'));writeFileSync(dir+'/remito-sintetico.pdf',remitoBytes);
 for(const kind of ['MANDATE','PAGARE','REMITO'] as const){const p=randomUUID();await saveDeliveryPhoto(db,bucket,f.id,1,p,`${kind}_PREPARED` as const,'',kind==='MANDATE'?Buffer.from(currentDocuments.mandate.base64,'base64'):kind==='PAGARE'?Buffer.from(currentDocuments.promissoryNote.base64,'base64'):remitoBytes,'application/pdf',root);await delivery('PREPARE_DOCUMENT',{kind,photoId:p,reference:'SYNTHETIC-'+kind,templateVersion:kind==='REMITO'?'SYNTHETIC_REMITO_V1':currentDocuments.templateVersion});if(kind==='REMITO')await delivery('CONFIRM_DELIVERY',{occurredAt:new Date().toISOString()},affiliateToken,403);const s=randomUUID();await saveDeliveryPhoto(db,bucket,f.id,1,s,`${kind}_SIGNED` as const,p,png,'image/png',root);await delivery('VERIFY_SIGNATURE',{kind,photoId:s,clientSigned:true,legible:true,identityChecked:true,loopSigned:false,signedAt:new Date().toISOString()});}
 await delivery('RECEIVE_ORIGINALS',{holder,location:'Carpeta sintética',receivedAt:new Date().toISOString(),reference:'ORIGINALS-TEST',alternativeEvidence:'EVIDENCIA_SINTETICA_NO_FIRMA_REAL'});await delivery('CONFIRM_DELIVERY',{occurredAt:new Date().toISOString()},affiliateToken);const delivered=(await readDelivery(db,f.id,1,root)).state;assert.equal(delivered.status,'DELIVERED_EMULATOR');pass('11_THREE_SIGNATURES_DELIVERY_SIMULATION');
 await prerequisitesRef(db,f.id,1).create({schemaVersion:'EMULATOR_CLIENT_ACTIVATION_FIXTURE_V2',project:'demo-cuenta-hogar',delivered:true,mandateSigned:true,pagareSigned:true,remitoSigned:true});
 await clientBindingCommand(db,f.id,1,{action:'LINK',data:{uid:client.uid,reason:'Vínculo explícito sintético'},operationId:op,commandId:randomUUID(),expectedRevision:0},u.uid);const inviteToken=randomBytes(32).toString('base64url');const invite=await clientBindingCommand(db,f.id,1,{action:'INVITE',data:{email:personal.email,token:inviteToken},operationId:op,commandId:randomUUID(),expectedRevision:1},u.uid);await redeemClientInvitation(db,invite.invitationId!,inviteToken,randomUUID(),client.uid);assert.equal((await listClientServices(db,client.uid)).length,1);pass('12_CLIENT_ACTIVATION_EMULATOR_BRIDGE');
 await financialApprovalRef(db,f.id,1).create({schemaVersion:'EMULATOR_FINANCIAL_APPROVAL_V1',project:'demo-cuenta-hogar',executionMode:'EMULATOR_ONLY',approval:'SYNTHETIC_APPROVED_ONLY',snapshotId:snapshot.contractSnapshotId,snapshotHash:snapshot.integrity.payloadHash,operationId:op,deliveryCommandId:delivered.event!.commandId,documentHashes:delivered.originals!.documentHashes});
 async function financial(action:string,data:Record<string,unknown>){const s=(await financialRef(db,f.id,1).get()).data();const c={action,data,operationId:op,commandId:randomUUID(),expectedRevision:s?.revision??0};const r=await api(endpoint(f.id,'financial'),c);await api(endpoint(f.id,'financial'),c);return r;}
 await financial('ACTIVATE',{});let fv=await readFinancial(db,f.id,1,root,'ADMIN');assert(fv.active);const due=fv.installments[0].amountCents;
 // A valid assignment alone does not authorize commissions: keep the rejection
 // covered, then complete the synthetic seller fixture required by the real engine.
 const beforeConfig=(await financialRef(db,f.id,1).get()).data()!;
 await assert.rejects(financialCommand(db,f.id,1,{action:'CREDIT_PAYMENT',data:{paymentId:randomUUID(),amountCents:due/2,effectiveDate:new Date().toISOString().slice(0,10),method:'TRANSFERENCIA',reference:'SYNTHETIC-MISSING-CONFIG'},operationId:op,commandId:randomUUID(),expectedRevision:beforeConfig.revision},root),/Configuración vigente de comisión requerida/);
 assert.equal((await financialRef(db,f.id,1).get()).data()!.revision,beforeConfig.revision);assert.equal((await financialRef(db,f.id,1).collection('payments').get()).size,0);
 await db.collection('vendedores_configuraciones_comision').doc('integral-affiliate-config').create({id:'integral-affiliate-config',vendedorAfiliadoId:affiliateId,vendedorAfiliadoEmail:affiliate.email,porcentajeComisionBasisPoints:1000,vigenteDesde:new Date().toISOString(),createdAt:new Date().toISOString()});pass('12B_MISSING_COMMISSION_CONFIG_ABORTS_WITHOUT_PAYMENT');
 const pay=(amountCents:number)=>financial('CREDIT_PAYMENT',{paymentId:randomUUID(),amountCents,effectiveDate:new Date().toISOString().slice(0,10),method:'TRANSFERENCIA',reference:'SOLO_SIMULACION'});await pay(due/2);fv=await readFinancial(db,f.id,1,root,'ADMIN');assert(fv.active);assert.equal(fv.installments[0].status,'PARCIAL');await view(f.id,'Cuotas y pagos','09-pago-parcial');await pay(due/2);fv=await readFinancial(db,f.id,1,root,'ADMIN');assert(fv.active);assert.equal(fv.installments[0].status,'PAGADA');const finalPayment=await pay(fv.balanceCents) as {paymentId:string};fv=await readFinancial(db,f.id,1,root,'ADMIN');assert(fv.active);assert.equal(fv.balanceCents,0);assert.equal(fv.receipts.length,3);assert.deepEqual((await financialRef(db,f.id,1).get()).data()!.installments,snapshot.paymentSchedule.installments.map(i=>({number:i.installmentNumber,dueDate:i.dueDate,amountCents:i.amount*100})));pass('13_PARTIAL_FULL_PAYMENTS_RECEIPTS');
 await financial('REVERSE_PAYMENT',{paymentId:finalPayment.paymentId,reason:'Reversa sintética de la cancelación final'});fv=await readFinancial(db,f.id,1,root,'ADMIN');assert(fv.active);assert.equal(fv.balanceCents,174000000-due);assert.equal(fv.receipts.find(r=>r.paymentId===finalPayment.paymentId)!.status,'REVERSADO');assert.equal(fv.receipts.length,3);assert.deepEqual((await financialRef(db,f.id,1).get()).data()!.installments,snapshot.paymentSchedule.installments.map(i=>({number:i.installmentNumber,dueDate:i.dueDate,amountCents:i.amount*100})));writeFileSync(dir+'/financial-after-reversal.json',JSON.stringify(fv,null,2));pass('13B_REVERSAL_BALANCE_RECEIPTS_ORIGINAL_SCHEDULE');
 for(const [role,t]of [['cliente',clientToken],['afiliado',affiliateToken]] as const){const p='/api/'+role+(role==='cliente'?'/servicios-v2/':'/operaciones-v2/')+f.id+'/1/financial',result=await api<Record<string,unknown>>(p,undefined,t);assert.equal(result.active,true);assert(!JSON.stringify(result).includes('PROVEEDOR_SINTETICO_PRIVADO'));await api(p,undefined,otherToken,403);}
 await api(endpoint(f.id,'credit-review'),undefined,affiliateToken,403);await api(endpoint(f.id,'credit-review'),undefined,clientToken,403);await api(endpoint(f.id,'contract'),undefined,clientToken,403);await api(endpoint(f.id,'credit-review'),undefined,null,401);pass('14_UID_AUTHORIZATION_ISOLATION');
 // Validate actual portals with the same synthetic accounts and operation.
 for(const [portal,email,password,label]of [['/afiliado',affiliate.email!,'Synthetic-integral-only-123','10-portal-afiliado'],['/cliente',client.email!,'Synthetic-integral-only-123','11-portal-cliente']] as const){await browser.navigate('/login');await browser.until("typeof window.__FIREBASE_SIGN_IN__==='function'",'sign in helper');await browser.evaluate('window.__FIREBASE_SIGN_OUT__().then(()=>true)');await browser.evaluate('window.__FIREBASE_SIGN_IN__('+JSON.stringify(email)+','+JSON.stringify(password)+').then(()=>true)');await browser.navigate(portal);await browser.until("document.body.innerText.includes('Lavarropas sintético integral')",portal);await browser.until("document.querySelector('[data-testid=financial-v2-status]')!==null",'portal financial data');assert.equal(await browser.evaluate("document.querySelectorAll('[data-testid=financial-receipt]').length"),3);if(portal==='/afiliado')assert.equal(await browser.evaluate("[...document.querySelectorAll('h4')].some(e=>e.textContent==='Registrar incidencia bajo mi custodia')"),false);await browser.overflow(portal);await browser.evaluate("document.querySelector('[data-testid=financial-v2]')?.scrollIntoView({block:'start'})");await photo(label);
 await browser.command('Emulation.setDeviceMetricsOverride',{width:390,height:844,mobile:true,deviceScaleFactor:1});await browser.overflow(portal+' mobile');await browser.evaluate("document.querySelector('[data-testid=financial-v2]')?.scrollIntoView({block:'start'})");await photo(label+'-mobile');await browser.command('Emulation.setDeviceMetricsOverride',{width:1280,height:800,mobile:false,deviceScaleFactor:1});}
 // Reopen admin; capture both the first operation and the recurrent operation.
 await browser.navigate('/login');await browser.until("typeof window.__FIREBASE_SIGN_IN__==='function'",'admin sign in');await browser.evaluate('window.__FIREBASE_SIGN_IN__('+JSON.stringify(adminEmail)+','+JSON.stringify(adminPassword)+').then(()=>true)');
 for(const [width,height,mobile]of [[1280,800,false],[390,844,true]] as const){await browser.command('Emulation.setDeviceMetricsOverride',{width,height,mobile,deviceScaleFactor:1});for(const [section,name]of [['Presupuesto','presupuesto'],['Contrato','documentacion'],['Proveedor y logística','logistica'],['Vendedor afiliado','afiliado'],['Cuotas y pagos','finanzas']])await view(f.id,section,'final-'+name+'-'+width);await view(second.id,'Contrato','final-recurrente-'+width);}
 assert.deepEqual(browser.externalFirebase,[]);const prod={...process.env,NODE_ENV:'production'};assert(!financialEnabled(prod));assert(!deliveryEnabled(prod));assert(!invitationsEnabled(prod));assert.equal(contractValueHash({budget:(await f.r.budget.get()).data(),acceptance:(await f.r.acceptance.get()).data()}),immutable);assert.equal((await db.collection('ledger_movimientos').get()).size,0);pass('15_VISUAL_GUARDS_INTEGRITY');
 for(const prior of historicalBefore){const after=await prior.ref.get();assert.equal(after.updateTime!.toMillis(),prior.updateTime!.toMillis());assert.deepEqual(after.data(),prior.data());}
 pass('16_HISTORICAL_DIGEST_UPDATETIME_UNCHANGED');
 writeFileSync(dir+'/journey.json',JSON.stringify({results,http,ux,first:{budgetId:f.id,sourceId:source,operationId:op,snapshotId:snapshot.contractSnapshotId},second:{budgetId:second.id,sourceId:source2,operationId:second.identity.operationId},productionWrites:0,legalApproval:'PENDING',syntheticBridges:['EMULATOR_FREEZE_DEPENDENCIES','CLIENT_ACTIVATION_FIXTURE','FINANCIAL_APPROVAL_FIXTURE'],externalFirebase:browser.externalFirebase},null,2));
 }finally{await browser.close();}
}
async function run(){
 await new Promise<void>((resolve,reject)=>{const s=createServer();s.once('error',reject);s.listen(3000,'localhost',()=>s.close(()=>resolve()));});
 const server=spawn(process.execPath,['node_modules/next/dist/bin/next','dev','--hostname','localhost','--port','3000'],{env:{...process.env,NODE_ENV:'development',NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN:'demo-cuenta-hogar.firebaseapp.com',NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET:'demo-cuenta-hogar.appspot.com',NEXT_PUBLIC_FIREBASE_API_KEY:'demo-key',NEXT_PUBLIC_FIREBASE_APP_ID:'demo-app',NEXT_PUBLIC_E2E_TEST_MODE:'1',NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST:'127.0.0.1:9099'},stdio:'inherit'});
 try{let ready=false;for(let i=0;i<120;i++){if(server.exitCode!==null)throw Error('NEXT_EXITED');try{if((await fetch(base+'/login',{signal:AbortSignal.timeout(3000)})).ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,500));}assert(ready,'LOCAL_NEXT_READY');await main();}
 finally{server.kill('SIGTERM');await new Promise<void>(r=>{if(server.exitCode!==null||server.signalCode!==null)r();else server.once('close',()=>r());});await admin.app().delete();}
}
run().catch(e=>{mkdirSync(dir,{recursive:true});writeFileSync(dir+'/failure.json',JSON.stringify({results,http,error:e instanceof Error?e.message:'FAILED',stack:e instanceof Error?e.stack:undefined},null,2));console.error(e);process.exitCode=1;});
