import './helpers/requireSafeEmulatorEnvironment';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {admin} from '../src/lib/firebaseAdmin';
import {approvedFinalPackages} from '../src/lib/productionV2/catalog';
import {productionRuntimeForEmulator} from '../src/lib/productionV2/runtime';
import {productionReadyFixture,syntheticOriginalFormal} from './helpers/productionAdapterFixtures';
import {productionPaths} from '../src/lib/productionV2/freeze';
import {issuePreparedOperation} from '../src/lib/productionV2/simpleIssuance';
import {argentinaBusinessDate} from '../src/lib/productionV2/businessDate';
import {getBudgetDocumentationBucket} from '../src/lib/budgetDocumentationStorage';
import {financialCommand,financialRef,readFinancial} from '../src/lib/operationFinancialV2Server';
import {clientBindingRef,clientIndex,listClientServices,clientBindingCommand} from '../src/lib/operationClientV2Server';
import {sendClientEmailInvitation,acceptClientEmailInvitation,clientEmailAccount} from '../src/lib/clientEmailInvitations';
import {POST as sendPost} from '../src/app/api/admin/clientes/invitaciones/route';
import {POST as acceptPost} from '../src/app/api/cliente/activar/route';
import {p1Token} from './testPortalP1Emulator';
import {startProductionBrowserServer} from './helpers/productionAdapterBrowserServer';
import {CatalogBrowser} from './helpers/catalogBrowser';
const pass=(s:string)=>console.log(s+' = PASS');
async function main(){
 const db=admin.firestore(),password='Emulator-only-123',email=process.env.NEXT_PUBLIC_ADMIN_EMAIL!,actor=(await admin.auth().createUser({email,password,emailVerified:true})).uid;
 const runtime=productionRuntimeForEmulator(db,admin.auth(),approvedFinalPackages,[actor]),f=await productionReadyFixture(actor,true,true),p=approvedFinalPackages[0],bucket=await getBudgetDocumentationBucket();
 await db.doc(productionPaths.counter).create({schemaVersion:'CONTRACT_NUMBER_COUNTER_V1',policyId:'CONTRACT_NUMBERING_V1',executionMode:'PRODUCTION',active:true,lastAllocatedSequence:'0',initializationAuthorizationReference:'SYNTHETIC_ONLY'});
 const d=(await f.r.draft.get()).data()!;
 await issuePreparedOperation(runtime,bucket,f.id,1,{commandId:randomUUID(),expectedRevision:d.revision,packageId:p.id,packageHash:p.sha256,formal:{contractIssueDate:argentinaBusinessDate(),contractIssuePlace:'Localidad sintética',promissoryNoteIssueDate:argentinaBusinessDate(),promissoryNoteIssuePlace:'Localidad sintética',...syntheticOriginalFormal},confirmed:true},actor);
 await financialCommand(db,f.id,1,{action:'ACTIVATE_WITH_FIRST_PAYMENT',data:{paymentId:randomUUID(),amountCents:14500000,effectiveDate:argentinaBusinessDate(),method:'TRANSFERENCIA',reference:'SYNTHETIC-EXISTING-PLAN'},commandId:randomUUID(),expectedRevision:0,operationId:f.identity.operationId},f.root);
 const financialBefore=await financialRef(db,f.id,1).get(),paymentsBefore=await financialRef(db,f.id,1).collection('payments').get(),draftBefore=(await f.r.draft.get()).data();
 const clientEmail=d.personalData.email,foreign=await admin.auth().createUser({email:'other-client@example.test',password,emailVerified:true}),foreignIdentity={uid:foreign.uid,email:foreign.email!,emailVerified:true};
 const adminToken=await p1Token({uid:actor}),foreignToken=await p1Token({uid:foreign.uid}),req=(b:unknown,t=adminToken)=>new Request('http://localhost/api',{method:'POST',headers:{Authorization:'Bearer '+t,'Content-Type':'application/json'},body:JSON.stringify(b)});
 const target={kind:'OPERATION' as const,budgetId:f.id,version:1},command=randomUUID();
 assert.equal((await sendPost(req({target,commandId:randomUUID()},foreignToken))).status,403);
 assert.equal((await sendPost(req({target:{...target,budgetId:'missing'},commandId:randomUUID()}))).status,409);
 const results=await Promise.all([sendClientEmailInvitation(db,target,command,actor),sendClientEmailInvitation(db,target,command,actor)]);assert(results.some(r=>r.state==='SENT'));
 const key=results[0].accountKey,codes=async()=>(await(await fetch('http://127.0.0.1:9099/emulator/v1/projects/demo-cuenta-hogar/oobCodes')).json()).oobCodes as {email:string;oobCode:string;oobLink:string}[];
 assert.equal((await codes()).filter(c=>c.email===clientEmail).length,1);await sendClientEmailInvitation(db,target,command,actor);assert.equal((await codes()).filter(c=>c.email===clientEmail).length,1);
 assert.equal((await acceptPost(req({accountKey:key,invitationId:command},foreignToken))).status,409);await assert.rejects(acceptClientEmailInvitation(db,key,command,foreignIdentity));
 await assert.rejects(sendClientEmailInvitation(db,target,randomUUID(),actor));
 pass('ADMIN_ONLY_IDEMPOTENT_EMAIL_NO_ACCOUNT_CREATION_FOREIGN_IDENTITY_REJECTED');
 // Reject unverified identities, expired invitations and changed source emails.
 const unverified=await admin.auth().createUser({email:'unverified-client@example.test',password,emailVerified:false});
 await assert.rejects(acceptClientEmailInvitation(db,key,command,{uid:unverified.uid,email:unverified.email!,emailVerified:false}));
 const legacy=db.collection('solicitudes').doc('invitation-negative-source');await legacy.create({email:foreign.email,nombreCompleto:'Cliente sintético'});
 const legacyTarget={kind:'REQUEST' as const,collection:'solicitudes' as const,id:legacy.id},legacyCommand=randomUUID();
 const legacySend=await sendClientEmailInvitation(db,legacyTarget,legacyCommand,actor),legacyAccount=clientEmailAccount(db,legacySend.accountKey),legacyInvite=legacyAccount.collection('invitations').doc(legacyCommand);
 await legacyInvite.update({expiresAt:new Date(Date.now()-1000).toISOString()});await assert.rejects(acceptClientEmailInvitation(db,legacySend.accountKey,legacyCommand,foreignIdentity));
 await legacyInvite.update({expiresAt:new Date(Date.now()+60000).toISOString()});await legacy.update({email:'changed-client@example.test'});await assert.rejects(acceptClientEmailInvitation(db,legacySend.accountKey,legacyCommand,foreignIdentity));
 await legacy.update({email:foreign.email});await legacyAccount.update({lastSentAt:new Date(Date.now()-61000).toISOString()});const replacement=randomUUID();await sendClientEmailInvitation(db,legacyTarget,replacement,actor);await assert.rejects(acceptClientEmailInvitation(db,legacySend.accountKey,legacyCommand,foreignIdentity));
 await admin.auth().updateUser(foreign.uid,{disabled:true});await assert.rejects(acceptClientEmailInvitation(db,legacySend.accountKey,replacement,foreignIdentity));await admin.auth().updateUser(foreign.uid,{disabled:false});
 await legacy.update({clienteAuthUid:actor});await legacyAccount.update({lastSentAt:new Date(Date.now()-61000).toISOString()});await assert.rejects(sendClientEmailInvitation(db,legacyTarget,randomUUID(),actor));
 pass('UNVERIFIED_DISABLED_EXPIRED_SUPERSEDED_CHANGED_EMAIL_AND_CONFLICTING_UID_REJECTED');
 const emptyEmail='new-empty-plan@example.test',emptySource=db.collection('solicitudes').doc('new-empty-plan');await emptySource.create({email:emptyEmail,nombreCompleto:'Cliente nuevo sintético'});
 const emptyCommand=randomUUID(),empty=await sendClientEmailInvitation(db,{kind:'REQUEST',collection:'solicitudes',id:emptySource.id},emptyCommand,actor),emptyCode=(await codes()).find(c=>c.email===emptyEmail)!;
 const emptySignIn=await fetch('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithEmailLink?key=emulator-only',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:emptyEmail,oobCode:emptyCode.oobCode})});assert.equal(emptySignIn.status,200);const emptyUser=await emptySignIn.json();
 const emptyIdentity={uid:emptyUser.localId,email:emptyEmail,emailVerified:true};assert.deepEqual(await acceptClientEmailInvitation(db,empty.accountKey,emptyCommand,emptyIdentity),{ok:true,plans:0});assert.deepEqual(await listClientServices(db,emptyUser.localId),[]);assert.equal((await clientIndex(db,emptyUser.localId).get()).size,0);
 pass('NEW_CUSTOMER_WITHOUT_ISSUED_PLAN_CREATES_ACCOUNT_WITHOUT_DEBT_OR_INDEX');


 if(process.env.CLIENT_EMAIL_BROWSER==='1'){
  const server=await startProductionBrowserServer(runtime),browser=await CatalogBrowser.open();
  try{
   await browser.command('Emulation.setDeviceMetricsOverride',{width:1280,height:900,deviceScaleFactor:1,mobile:false});await browser.navigate('/login');await browser.until("typeof window.__FIREBASE_SIGN_IN__==='function'",'auth');await browser.evaluate(`window.__FIREBASE_SIGN_IN__(${JSON.stringify(email)},${JSON.stringify(password)}).then(()=>true)`);
   await browser.navigate(`/admin/operaciones/${f.id}/1?section=logistics`);await browser.until("!!document.querySelector('[data-testid=client-email-invite]')",'operation invitation');
   await browser.evaluate("[...document.querySelectorAll('summary')].find(e=>e.textContent==='Cuenta del cliente')?.click()");await browser.until("document.querySelector('[data-testid=client-email-invite] button').getClientRects().length>0",'invitation visible');
   // The mailbox already holds an invitation from the real route; inspect the same operation and then redeem it.
   const code=(await codes()).find(c=>c.email===clientEmail)!;const callback=new URL(new URL(code.oobLink).searchParams.get('continueUrl')!);callback.searchParams.set('apiKey','emulator-only');callback.searchParams.set('mode','signIn');callback.searchParams.set('oobCode',code.oobCode);
   await browser.navigate('/');await browser.until("typeof window.__FIREBASE_SIGN_OUT__==='function'",'signout');await browser.evaluate('window.__FIREBASE_SIGN_OUT__().then(()=>true)');await browser.navigate(callback.pathname+callback.search);
   await browser.until("!!document.querySelector('[data-testid=client-email-activation] fieldset')&&!document.querySelector('fieldset').disabled",'auth ready');
   await browser.field('Tu correo electrónico',clientEmail);await browser.field('Contraseña para ingresar al panel',password);
   for(const width of [1280,390,320]){await browser.command('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:width<768});await browser.overflow('client activation '+width);await browser.screenshot('client-email-activation-'+width+'.png');}
   await browser.clickText('Activar mi cuenta');await browser.until("document.body.innerText.includes('Cuenta activada.')||!!document.querySelector('[role=alert]')",'activation');assert.equal(await browser.evaluate("document.querySelector('[role=alert]')?.textContent||''"),'');await browser.screenshot('client-email-activated-mobile.png');
   await browser.navigate('/cliente');await browser.until("!!document.querySelector('[data-testid=client-service-v2]')&&!!document.querySelector('[data-testid=financial-v2-status]')",'same plan visible');
   await browser.evaluate("document.querySelector('[data-testid=client-service-v2]').scrollIntoView({block:'start'})");await browser.overflow('client plan mobile');await browser.screenshot('client-email-plan-mobile.png');
   assert.deepEqual(browser.externalFirebase,[]);assert(!server.calls.some(c=>c.status>=500));
   pass('BROWSER_REAL_EMAIL_SIGNUP_PASSWORD_SAME_PLAN_12_INSTALLMENTS_PAYMENT_RECEIPT_DESKTOP_390_320');
   // New historical client without an issued V2 plan can create access without creating a debt.
   await browser.navigate('/');await browser.until("typeof window.__FIREBASE_SIGN_IN__==='function'",'switch administrator');await browser.evaluate(`window.__FIREBASE_SIGN_IN__(${JSON.stringify(email)},${JSON.stringify(password)}).then(()=>true)`);
   await db.collection('solicitudes_cuenta').doc('synthetic-new-client').create({nombreCompleto:'Nuevo cliente sin cuenta',email:'new-client-browser@example.test',numeroDni:'00000001',estado:'Pendiente'});
   await browser.navigate('/admin/clientes');await browser.until("document.body.innerText.includes('Nuevo cliente sin cuenta')",'client directory');
   await browser.evaluate(`(()=>{const buttons=[...document.querySelectorAll('[data-testid=client-email-invite]')];const b=buttons.find(e=>e.parentElement.parentElement.innerText.includes('Nuevo cliente sin cuenta'));if(!b)throw Error('Missing client invite');b.querySelector('button').click();})()`);
   await browser.until("document.querySelector('[data-testid=client-email-invite] [role=status]')?.textContent.includes('Invitación enviada')",'directory mail');assert((await codes()).some(c=>c.email==='new-client-browser@example.test'));
   pass('CLIENT_DIRECTORY_SENDS_NEW_ACCOUNT_INVITATION_WITHOUT_FICTITIOUS_PLAN');
  }finally{await browser.close();await server.stop();}
 }else{
  const code=(await codes()).find(c=>c.email===clientEmail)!;const response=await fetch('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithEmailLink?key=emulator-only',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:clientEmail,oobCode:code.oobCode})});assert.equal(response.status,200);const u=await response.json();await acceptClientEmailInvitation(db,key,command,{uid:u.localId,email:clientEmail,emailVerified:true});
 }
 const client=await admin.auth().getUserByEmail(clientEmail),identity={uid:client.uid,email:clientEmail,emailVerified:true};
 await Promise.all([acceptClientEmailInvitation(db,key,command,identity),acceptClientEmailInvitation(db,key,command,identity)]);
 const services=await listClientServices(db,client.uid);assert.equal(services.length,1);assert.equal(services[0].operationId,f.identity.operationId);assert.equal((await clientIndex(db,client.uid).get()).size,1);
 const financial=await readFinancial(db,f.id,1,{uid:client.uid,admin:false},'CLIENT');assert(financial.active);assert.equal(financial.installments.length,12);assert.equal(financial.receipts.length,1);assert.equal(financial.balanceCents,159500000);
 await assert.rejects(readFinancial(db,f.id,1,{uid:foreign.uid,admin:false},'CLIENT'));assert.equal((await listClientServices(db,foreign.uid)).length,0);
 assert.deepEqual((await financialRef(db,f.id,1).get()).data(),financialBefore.data());assert.deepEqual((await financialRef(db,f.id,1).collection('payments').get()).docs.map(d=>d.data()),paymentsBefore.docs.map(d=>d.data()));assert.deepEqual((await f.r.draft.get()).data(),draftBefore);assert.equal((await db.doc(productionPaths.counter).get()).data()!.lastAllocatedSequence,'1');
 pass('EXISTING_PLAN_BALANCE_PAYMENT_RECEIPT_CONTRACT_CH_UNCHANGED_AND_CLIENT_ISOLATION');
 await clientEmailAccount(db,key).update({lastSentAt:new Date(Date.now()-61000).toISOString()});const c2=randomUUID();assert.equal((await sendClientEmailInvitation(db,target,c2,actor)).state,'SENT');await acceptClientEmailInvitation(db,key,c2,identity);assert.equal((await clientIndex(db,client.uid).get()).size,1);
 const state=(await clientBindingRef(db,f.id,1).get()).data()!;await clientBindingCommand(db,f.id,1,{action:'REVOKE_ACCESS',commandId:randomUUID(),operationId:f.identity.operationId,expectedRevision:state.revision,data:{reason:'Revocación sintética'}},actor);
 await assert.rejects(acceptClientEmailInvitation(db,key,c2,identity));await assert.rejects(sendClientEmailInvitation(db,target,randomUUID(),actor));assert.equal((await listClientServices(db,client.uid)).length,0);
 pass('EXISTING_ACCOUNT_REINVITATION_NO_DUPLICATE_INDEX_REVOCATION_NEVER_RESTORED');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
