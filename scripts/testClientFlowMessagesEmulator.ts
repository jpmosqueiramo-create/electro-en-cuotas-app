import './helpers/requireSafeEmulatorEnvironment';
import assert from 'node:assert/strict';
import {randomUUID,createHash} from 'node:crypto';
import {writeFileSync} from 'node:fs';
import {NextRequest} from 'next/server';
import {admin} from '../src/lib/firebaseAdmin';
import {infrastructureFixture} from './helpers/contractInfrastructureFixtures';
import {contractRefs,contractCommand,publicContractData,getContract} from '../src/lib/contractV2Server';
import {DATA_AUTHORIZATION_VERSION,DATA_AUTHORIZATION_TEXT,clientDataRequestMessage} from '../src/lib/clientFlowMessages';
import {prepareClientProposal,proposalDigest} from '../src/lib/clientProposalServer';
import {loopReferenceTariffs} from '../src/lib/loopServiceTariffs';
import {saveLoopTariffs} from '../src/lib/loopServiceTariffsServer';
import {POST} from '../src/app/api/admin/presupuestos-v2/[budgetId]/versions/[version]/client-proposal/route';
import {CatalogBrowser} from './helpers/catalogBrowser';
import {startProductionBrowserServer} from './helpers/productionAdapterBrowserServer';
import {productionRuntimeForEmulator} from '../src/lib/productionV2/runtime';
import {syntheticFinalPackage} from './helpers/productionAdapterFixtures';
export async function messageFixture(actor:string){
 const id='messages-'+randomUUID(),r=contractRefs(admin.firestore(),id,1),f=infrastructureFixture(id),d=f.source.draft;
 d.personalData.fullName=f.source.budget.clienteSnapshot.nombre;d.personalData.dni=f.source.budget.clienteSnapshot.dni!;d.productDetails={quantity:1,condition:'NEW'};
 await r.budget.create(f.source.budget);await r.acceptance.create(f.source.acceptance);await r.draft.create(d);
 await admin.firestore().doc(`${f.source.budget.sourceCollection}/${f.source.budget.solicitudId}`).set({nombre:d.personalData.fullName,nombreCompleto:d.personalData.fullName,dni:d.personalData.dni,numeroDni:d.personalData.dni,localidad:d.personalData.locality});
 const fields={personalData:d.personalData,employmentData:d.employmentData,productDetails:d.productDetails,contractPlanCuotas:12,firstInstallmentDueDate:'2026-12-05',preferredMonthlyDueDay:9,issuePlace:'Localidad sintética',loopServices:{category:'C',tariffRevision:1,otherServicesCents:0,cftAnnualPercent:321.123,cftBasis:'Criterio sintético de prueba',supplierTaxId:'20123456786',notePaymentPlace:'Domicilio sintético de pago',noteDueDate:'2027-11-09',acceptanceChannel:'',proposalSentAt:'',clientAcceptedAt:''}};
 const cmd=async(action:string,extra:Record<string,unknown>={})=>contractCommand(admin.firestore(),id,1,{action,commandId:randomUUID(),expectedRevision:(await r.draft.get()).data()!.revision,...extra},actor);
 await cmd('SAVE_CONTRACT_EDITOR',fields);return {id,r,fields,cmd};
}
async function main(){const db=admin.firestore(),actor='synthetic-admin';await saveLoopTariffs(db,loopReferenceTariffs,0,actor);const f=await messageFixture(actor);
 const request=await f.cmd('CREATE_CLIENT_DATA_REQUEST'),data={personalData:f.fields.personalData,employmentData:f.fields.employmentData};
 const auth={version:DATA_AUTHORIZATION_VERSION,accepted:true};
 for(const payload of [data,{...data,dataAuthorization:{...auth,accepted:false}},{...data,dataAuthorization:{...auth,version:'wrong'}},{...data,dataAuthorization:{...auth,extra:true}}])await assert.rejects(()=>publicContractData(db,request.requestId!,request.secret!,payload));
 assert.equal((await f.r.draft.collection('submissions').get()).size,0);
 const payload={...data,dataAuthorization:auth};await publicContractData(db,request.requestId!,request.secret!,payload);const submission=(await f.r.draft.collection('submissions').doc(request.requestId!).get()).data()!;assert.equal(submission.dataAuthorization.text,DATA_AUTHORIZATION_TEXT);assert.equal(submission.dataAuthorization.accepted,true);await publicContractData(db,request.requestId!,request.secret!,payload);assert.deepEqual((await f.r.draft.collection('submissions').doc(request.requestId!).get()).data(),submission);
 assert.ok(clientDataRequestMessage('https://example.invalid/#test').startsWith(DATA_AUTHORIZATION_TEXT));
 const args={commandId:randomUUID(),expectedRevision:(await f.r.draft.get()).data()!.revision},prepared=await prepareClientProposal(db,f.id,1,args,actor);
 const before=(await f.r.draft.get()).data()!;assert.equal((await getContract(db,f.id,1)).clientConformity?.confirmed,false);
 assert.deepEqual(await prepareClientProposal(db,f.id,1,args,actor),prepared);assert.equal((await f.r.draft.collection('clientProposals').get()).size,1);
 assert.ok(prepared.message.includes(`12 cuotas`));assert.ok(prepared.message.includes(`«ACEPTO la propuesta de Cuenta Hogar identificada como ${prepared.reference}`));assert.ok(!prepared.message.includes('undefined'));
 for(const value of ['factorSnapshot','costoProveedorSnapshot','employerOrWorkName','tasaMora'])assert.ok(!prepared.message.includes(value));
 const record=(await f.r.draft.collection('clientProposals').doc(args.commandId).get()).data()!;const pdf=Buffer.from(prepared.pdfBase64,'base64');assert.equal(createHash('sha256').update(pdf).digest('hex'),record.pdfSha256);writeFileSync('/tmp/client-proposal-synthetic.pdf',pdf);assert.deepEqual((await f.r.draft.get()).data(),before);
 await f.cmd('SAVE_CONTRACT_EDITOR',{...f.fields,personalData:{...f.fields.personalData,address:'Otro domicilio sintético'}});await assert.rejects(()=>f.cmd('RECORD_CLIENT_CONFORMITY',{evidence:'Respuesta sintética conservada',proposalCommandId:prepared.commandId}),/condiciones cambiaron/);
 await f.cmd('SAVE_CONTRACT_EDITOR',{...f.fields,loopServices:{...f.fields.loopServices,acceptanceChannel:'WHATSAPP',proposalSentAt:'2026-10-30T06:00',clientAcceptedAt:'2026-10-30T06:10'}});assert.equal(proposalDigest((await f.r.draft.get()).data() as typeof request.draft),record.digest);
 await assert.rejects(()=>f.cmd('RECORD_CLIENT_CONFORMITY',{evidence:'',proposalCommandId:prepared.commandId}));
 await f.cmd('RECORD_CLIENT_CONFORMITY',{evidence:'Respuesta ACEPTO sintética; chat de prueba conservado',proposalCommandId:prepared.commandId});assert.equal((await getContract(db,f.id,1)).clientConformity?.confirmed,true);assert.equal((await f.r.draft.collection('conformity').doc('current').get()).data()!.proposalCommandId,prepared.commandId);
 assert.equal((await POST(new NextRequest('http://localhost:3000/api/admin/test',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(args)}),{params:Promise.resolve({budgetId:f.id,version:'1'})})).status,401);
 console.log('CLIENT_MESSAGES_EXPLICIT_DATA_AUTHORIZATION_SAVED_PROPOSAL_PDF_REPLY_BINDING_IDEMPOTENCY=PASS');
 if(process.env.CLIENT_MESSAGES_BROWSER==='1'){
 const password='Synthetic-message-only!',user=await admin.auth().createUser({email:process.env.NEXT_PUBLIC_ADMIN_EMAIL!,emailVerified:true,password}),runtime=productionRuntimeForEmulator(db,admin.auth(),[syntheticFinalPackage()],[user.uid]),server=await startProductionBrowserServer(runtime),browser=await CatalogBrowser.open();
 try{await browser.navigate('/login');await browser.until("typeof window.__FIREBASE_SIGN_IN__==='function'",'auth');await browser.evaluate(`window.__FIREBASE_SIGN_IN__(${JSON.stringify(process.env.NEXT_PUBLIC_ADMIN_EMAIL)},${JSON.stringify(password)}).then(()=>true)`);
 for(const view of [{width:1280,height:900,mobile:false},{width:390,height:844,mobile:true}]){
 const x=await messageFixture(user.uid);await browser.command('Emulation.setDeviceMetricsOverride',{...view,deviceScaleFactor:1});await browser.navigate(`/admin/operaciones/${x.id}/1?section=contract&editor=1`);await browser.until("!!document.querySelector('[data-testid=client-proposal-message]')",'message panel');await browser.clickText('Preparar propuesta y mensaje');await browser.until("!!document.querySelector('[aria-label=\"Mensaje de aceptación para el cliente\"]')",'proposal ready');
 const text=await browser.evaluate<string>("document.querySelector('[aria-label=\"Mensaje de aceptación para el cliente\"]').value");assert.ok(text.includes('ACEPTO la propuesta'));assert.ok(text.includes('documento adjunto'));assert.equal((await getContract(db,x.id,1)).clientConformity?.confirmed,false);
 await browser.evaluate("document.querySelector('[data-testid=client-proposal-message]').scrollIntoView({block:'start'})");await browser.overflow('proposal '+view.width);await browser.screenshot(`client-proposal-message-${view.width}.png`);await browser.change('[aria-label="Lugar de emisión"]','Cambio sintético sin guardar');assert.equal(await browser.evaluate("!!document.querySelector('[aria-label=\"Mensaje de aceptación para el cliente\"]')"),false);
 const intake=await x.cmd('CREATE_CLIENT_DATA_REQUEST');await browser.navigate(`/completar-datos/${intake.requestId}#${intake.secret}`);await browser.until("!!document.querySelector('[data-testid=data-authorization]')",'data notice');assert.equal(await browser.evaluate('location.hash'),'');assert.equal(await browser.evaluate("document.querySelector('button[type=submit]').disabled"),true);
 assert.ok(await browser.evaluate("document.querySelector('[data-testid=data-authorization]').textContent.includes('La presentación de esta solicitud no implica aprobación')"));await browser.overflow('data notice '+view.width);await browser.screenshot(`client-data-authorization-${view.width}.png`);
 for(const [key,value] of Object.entries(x.fields.personalData)){if(key==='province')await browser.evaluate(`(()=>{const element=document.querySelector('[name=province]');Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set.call(element,${JSON.stringify(value)});element.dispatchEvent(new Event('change',{bubbles:true}));})()`);else await browser.change(`[name=${key}]`,value);}
 await browser.click('[aria-label="Autorizo el tratamiento de mis datos"]');await browser.click('button[type=submit]');await browser.until("!!document.querySelector('[data-testid=client-data-success]')",'data receipt');assert.equal((await x.r.draft.collection('submissions').doc(intake.requestId!).get()).data()!.dataAuthorization.accepted,true);
 }
 assert.deepEqual(browser.externalFirebase,[]);assert.equal(browser.storageWrites,0);console.log('CLIENT_MESSAGES_BROWSER_1280_390_AUTHORIZATION_WHATSAPP_NO_IMPLICIT_ACCEPTANCE=PASS');
 }finally{await browser.close();await server.stop();}}
 await admin.app().delete();}
void main().catch(e=>{console.error(e);process.exitCode=1;});
