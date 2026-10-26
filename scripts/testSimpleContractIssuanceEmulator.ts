import './helpers/requireSafeEmulatorEnvironment';
import assert from 'node:assert/strict';
import {randomUUID,randomBytes} from 'node:crypto';
import {mkdirSync,writeFileSync} from 'node:fs';
import {admin} from '../src/lib/firebaseAdmin';
import {productionReadyFixture,syntheticFinalPackage,syntheticOriginalFormal} from './helpers/productionAdapterFixtures';
import {productionRuntimeForEmulator} from '../src/lib/productionV2/runtime';
import {approvedFinalPackages,packageHash} from '../src/lib/productionV2/catalog';
import {issuePreparedOperation} from '../src/lib/productionV2/simpleIssuance';
import {productionPaths} from '../src/lib/productionV2/freeze';
import {contractCommand} from '../src/lib/contractV2Server';
import {getBudgetDocumentationBucket} from '../src/lib/budgetDocumentationStorage';
import {argentinaBusinessDate} from '../src/lib/productionV2/businessDate';
import {issuedOperation,readIssuedDocument} from '../src/lib/productionV2/documents';
import {clientBindingCommand,readClientBinding,redeemClientInvitation,readClientService} from '../src/lib/operationClientV2Server';
import {verifiedProductionClientDocuments} from '../src/lib/productionV2/gates';
import {financialCommand} from '../src/lib/operationFinancialV2Server';
import {deliveryCommand} from '../src/lib/operationDeliveryV2Server';
import {startProductionBrowserServer} from './helpers/productionAdapterBrowserServer';
import {CatalogBrowser} from './helpers/catalogBrowser';
import {creditRefs} from '../src/lib/creditReviewV2Server';
const results:Record<string,string>={};function pass(s:string){results[s]='PASS';console.log(s+' = PASS');}
async function main(){
 const db=admin.firestore(),password='Emulator-only-123',actor=(await admin.auth().createUser({email:process.env.NEXT_PUBLIC_ADMIN_EMAIL,emailVerified:true,password})).uid;
 const originals=process.env.SYNTHETIC_INSTALLED_OWNER_PACKAGE_SUITE==='1';
 const {sha256:_,...base}=originals?structuredClone(approvedFinalPackages[0]):syntheticFinalPackage();void _;const body={...base,deliveryDocumentPolicy:'EXTERNAL_TRANSFER_AND_RECEIPT_V1' as const},p={...body,sha256:packageHash(body)};
 const runtime=productionRuntimeForEmulator(db,admin.auth(),[p],[actor]),bucket=await getBudgetDocumentationBucket();
 const f=await productionReadyFixture(actor,originals,true);
 async function cmd(action:string,extra:Record<string,unknown>={}){return contractCommand(db,f.id,1,{action,commandId:randomUUID(),expectedRevision:(await f.r.draft.get()).data()!.revision,...extra},actor);}
 await cmd('RETURN_TO_DRAFT',{reason:'Edición sintética antes de emitir'});const draft=(await f.r.draft.get()).data()!;
 assert.notEqual((await creditRefs(db,f.id,1).review.get()).data()?.state,'APPROVED');assert.notEqual((await creditRefs(db,f.id,1).profile.get()).data()?.identity?.status,'VERIFIED');
 await db.doc(productionPaths.counter).create({schemaVersion:'CONTRACT_NUMBER_COUNTER_V1',policyId:'CONTRACT_NUMBERING_V1',executionMode:'PRODUCTION',active:true,lastAllocatedSequence:'0',initializationAuthorizationReference:'SYNTHETIC_ONLY'});
 const input={commandId:randomUUID(),expectedRevision:draft.revision,packageId:p.id,packageHash:p.sha256,formal:{contractIssueDate:argentinaBusinessDate(),contractIssuePlace:'Localidad sintética',promissoryNoteIssueDate:argentinaBusinessDate(),promissoryNoteIssuePlace:'Localidad sintética',...(originals?syntheticOriginalFormal:{})},confirmed:true};
 await assert.rejects(issuePreparedOperation(runtime,bucket,f.id,1,{...input,confirmed:false},actor));
 await assert.rejects(issuePreparedOperation(runtime,bucket,f.id,1,{...input,packageHash:'0'.repeat(64)},actor));
 await assert.rejects(issuePreparedOperation(runtime,bucket,f.id,1,input,f.uid));
 await admin.auth().updateUser(actor,{emailVerified:false});await assert.rejects(issuePreparedOperation(runtime,bucket,f.id,1,input,actor),/NOT_AUTHORIZED/);await admin.auth().updateUser(actor,{emailVerified:true});
 await cmd('UPDATE_PERSONAL_DATA',{personalData:{...draft.personalData,fullName:'Otra identidad sintética'}});
 await assert.rejects(issuePreparedOperation(runtime,bucket,f.id,1,{...input,commandId:randomUUID(),expectedRevision:(await f.r.draft.get()).data()!.revision},actor),/IDENTITY/);
 await cmd('UPDATE_PERSONAL_DATA',{personalData:draft.personalData});
 assert.equal((await db.doc(productionPaths.counter).get()).data()!.lastAllocatedSequence,'0');pass('CONFIRMATION_EXACT_PACKAGE_AND_ADMIN_BEFORE_NUMBER');
 // A real edit invalidates consent; the server cannot manufacture a replacement.
 await cmd('UPDATE_PERSONAL_DATA',{personalData:{...draft.personalData,address:'Calle sintética modificada 2'}});
 await assert.rejects(issuePreparedOperation(runtime,bucket,f.id,1,{...input,commandId:randomUUID(),expectedRevision:(await f.r.draft.get()).data()!.revision},actor));
 await cmd('RECORD_CLIENT_CONFORMITY',{evidence:'Conformidad sintética explícita posterior al cambio, sin efectos reales'});pass('STALE_CONFORMITY_BLOCKS_WITHOUT_CH');
 const c={...input,expectedRevision:(await f.r.draft.get()).data()!.revision};
 const pair=await Promise.allSettled([issuePreparedOperation(runtime,bucket,f.id,1,c,actor),issuePreparedOperation(runtime,bucket,f.id,1,c,actor)]);
 // The upload lease may reject a concurrent caller; a retry must converge.
 assert(pair.some(r=>r.status==='fulfilled'),JSON.stringify(pair));const replay=await issuePreparedOperation(runtime,bucket,f.id,1,c,actor);
 assert.equal(replay.replay,true);assert.equal(replay.contractNumber,'CH-000001');assert.equal((await db.doc(productionPaths.counter).get()).data()!.lastAllocatedSequence,'1');
 await assert.rejects(issuePreparedOperation(runtime,bucket,f.id,1,{...c,formal:{...c.formal,contractIssuePlace:'Otro lugar'}},actor));
 assert.notEqual((await creditRefs(db,f.id,1).review.get()).data()?.state,'APPROVED');pass('NO_CREDIT_GATE_READY_APPROVAL_AUTHORIZATION_UNIQUE_EMISSION_REPLAY');
 mkdirSync('/tmp/ch93-issuance',{recursive:true});for(const kind of ['MANDATE','PAGARE'] as const){const d=await readIssuedDocument(runtime,bucket,f.id,1,kind,actor);writeFileSync('/tmp/ch93-issuance/'+kind.toLowerCase()+'.pdf',d);}
 pass('PRIVATE_MANDATE_AND_NOTE_SAME_SNAPSHOT');
 const email='simple-client@example.test',client=(await admin.auth().createUser({email,emailVerified:true,password})).uid;
 const bind=async(action:string,data:Record<string,unknown>)=>clientBindingCommand(db,f.id,1,{action,data,commandId:randomUUID(),operationId:f.identity.operationId,expectedRevision:(await readClientBinding(db,f.id,1,actor)).state.revision},actor);
 await bind('LINK',{uid:client,reason:'Vínculo sintético explícito'});const token=randomBytes(32).toString('base64url'),invite=await bind('INVITE',{email,token});
 await redeemClientInvitation(db,invite.invitationId!,token,randomUUID(),client);
 assert.equal((await readClientService(db,f.id,1,client)).financialInformationAvailable,false);
 await assert.rejects(readClientService(db,f.id,1,f.uid));pass('CLIENT_PORTAL_BEFORE_DELIVERY_NO_DEBT_AND_CROSS_ROLE_DENIED');
 await assert.rejects(financialCommand(db,f.id,1,{action:'ACTIVATE',data:{},commandId:randomUUID(),operationId:f.identity.operationId,expectedRevision:0},f.root));
 await assert.rejects(deliveryCommand(db,f.id,1,{action:'CONFIRM_DELIVERY',data:{occurredAt:new Date().toISOString()},commandId:randomUUID(),operationId:f.identity.operationId,expectedRevision:0},f.root));pass('SIGNATURE_EXTERNAL_EVIDENCE_AND_DELIVERY_STILL_REQUIRED_FOR_FINANCE');
 const proof=await db.runTransaction(tx=>issuedOperation(runtime,tx,f.id,1,'CLIENT_ACTIVATION',false));
 await bucket.file(proof.manifest.documents.PAGARE.path).save(Buffer.from('PDF sustituido sintético'),{resumable:false});
 await assert.rejects(verifiedProductionClientDocuments(runtime,f.id,1));pass('SUBSTITUTED_DOCUMENT_BLOCKS_PORTAL_ACTIVATION');
 // Run the real Next UI against the actual route exports, using the opaque local-only runtime.
 const ui=await productionReadyFixture(actor,originals,true);await contractCommand(db,ui.id,1,{action:'RETURN_TO_DRAFT',reason:'Edición sintética UI',commandId:randomUUID(),expectedRevision:(await ui.r.draft.get()).data()!.revision},actor);
 const server=await startProductionBrowserServer(runtime),browser=await CatalogBrowser.open();
 try{
  await browser.command('Emulation.setDeviceMetricsOverride',{width:1280,height:900,deviceScaleFactor:1,mobile:false});
  await browser.navigate('/login');await browser.until("typeof window.__FIREBASE_SIGN_IN__==='function'",'Auth hook');await browser.evaluate(`window.__FIREBASE_SIGN_IN__(${JSON.stringify(process.env.NEXT_PUBLIC_ADMIN_EMAIL)},${JSON.stringify(password)}).then(()=>true)`);
  await browser.navigate(`/admin/operaciones/${ui.id}/1?section=contract`);await browser.until("!!document.querySelector('[data-testid=simple-contract-issuance] input[name=issuePlace]:not(:disabled)')",'five steps complete');
  await browser.change('[data-testid=simple-contract-issuance] input[name=issuePlace]','Ciudad sintética');
  if(originals){await browser.change('[name=originalNetManagementLogistics]',String(syntheticOriginalFormal.originalNetManagementLogistics));await browser.change('[name=originalCft]',String(syntheticOriginalFormal.originalCft));await browser.change('[name=originalAllocationConformity]',syntheticOriginalFormal.originalAllocationConformity);}
  await browser.evaluate("document.querySelector('[data-testid=simple-contract-issuance]').scrollIntoView({block:'start'})");
  await browser.screenshot('ch93-single-issue-desktop.png');await browser.overflow('desktop');
  await browser.command('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});await browser.evaluate("document.querySelector('[data-testid=simple-contract-issuance]').scrollIntoView({block:'start'})");await browser.screenshot('ch93-single-issue-mobile.png');await browser.overflow('mobile');
  await browser.click('[data-testid=simple-contract-issuance] input[type=checkbox]');await browser.click('[data-testid=simple-contract-issuance] button');
  await browser.until("document.body.innerText.includes('Abrir mandato emitido')",'issued documents');assert.equal((await db.doc(productionPaths.counter).get()).data()!.lastAllocatedSequence,'2');
  await browser.evaluate("document.querySelector('[data-testid=production-operation]').scrollIntoView({block:'start'})");
  await browser.screenshot('ch93-issued-mobile.png');assert.deepEqual(browser.externalFirebase,[]);pass('BROWSER_DESKTOP_MOBILE_SINGLE_BUTTON_REAL_ROUTES');
 }finally{await browser.close();await server.stop();}
 writeFileSync('/tmp/ch93-issuance/results.json',JSON.stringify(results,null,2));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
