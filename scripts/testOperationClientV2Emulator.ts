import './helpers/requireSafeEmulatorEnvironment';
import assert from 'node:assert/strict';
import { randomUUID,randomBytes } from 'node:crypto';
import { NextRequest } from 'next/server';
import { admin } from '../src/lib/firebaseAdmin';
import { fixture } from './testContractV2';
import { contractRefs } from '../src/lib/contractV2Server';
import { acceptBudgetV2 } from '../src/lib/budgetAcceptanceV2Server';
import { operationFromAcceptance } from '../src/lib/operationV2';
import { invitationsEnabled } from '../src/lib/operationClientV2';
import { clientBindingCommand,readClientBinding,inspectClientInvitation,redeemClientInvitation,listClientServices,readClientService,prerequisitesRef,clientBindingRef,invitationRef,clientIndex } from '../src/lib/operationClientV2Server';
import * as clientApi from '../src/app/api/cliente/servicios-v2/[budgetId]/[version]/route';
import * as adminApi from '../src/app/api/admin/presupuestos-v2/[budgetId]/versions/[version]/client-portal/route';
import * as publicApi from '../src/app/api/public/client-invitations/[invitationId]/route';
import { verifyClientAuth } from '../src/lib/clientAuth';
const db=admin.firestore();
export async function clientFixture() {
 const id=`portal-${randomUUID()}`,r=contractRefs(db,id,1),{b}=fixture(id);
 await r.family.set({sourceCollection:b.sourceCollection,solicitudId:b.solicitudId,lastVersion:1});await r.budget.set(b);
 const a=await acceptBudgetV2(db,{budgetId:id,version:1,acceptedOptionId:'option-1',preferredPlanCuotas:12,commandId:'accept'},'admin-demo');
 return {id,r,b,operation:operationFromAcceptance(a)};
}
export async function clientPrerequisites(id:string) {
 assert.equal(invitationsEnabled(),true);
 await prerequisitesRef(db,id,1).set({schemaVersion:'EMULATOR_CLIENT_ACTIVATION_FIXTURE_V2',project:'demo-cuenta-hogar',delivered:true,mandateSigned:true,pagareSigned:true,remitoSigned:true});
}
export async function issueClientInvitation(f:Awaited<ReturnType<typeof clientFixture>>,email:string) {
 const token=randomBytes(32).toString('base64url'),state=(await readClientBinding(db,f.id,1)).state;
 const command={commandId:randomUUID(),operationId:f.operation.operationId,expectedRevision:state.revision,action:'INVITE',data:{email,token}};
 const result=await clientBindingCommand(db,f.id,1,command,'admin-demo');return {token,command,id:result.invitationId!};
}
async function main() {
 assert.equal(invitationsEnabled(),true);
 for(const env of [{...process.env,NODE_ENV:'production'},{...process.env,K_SERVICE:'synthetic-cloud-runtime'},{...process.env,GAE_ENV:'standard'},{},{GCLOUD_PROJECT:'negocio-facil-page',NEXT_PUBLIC_FIREBASE_PROJECT_ID:'negocio-facil-page',FIRESTORE_EMULATOR_HOST:'127.0.0.1:8080',FIREBASE_AUTH_EMULATOR_HOST:'127.0.0.1:9099'},{...process.env,FIREBASE_AUTH_EMULATOR_HOST:undefined},{...process.env,GOOGLE_CLOUD_PROJECT:'negocio-facil-page'}])assert.equal(invitationsEnabled(env),false);
 const f=await clientFixture(),email=`client-${randomUUID()}@example.test`,other=await admin.auth().createUser({email:`other-${randomUUID()}@example.test`,emailVerified:true});
 const original=JSON.stringify({budget:(await f.r.budget.get()).data(),acceptance:(await f.r.acceptance.get()).data()});
 const legacy=db.collection(f.b.sourceCollection).doc(f.b.solicitudId);await legacy.set({marker:'HISTORICAL_NO_MIGRATION',clienteEmail:email,clienteId:'legacy-unchanged'});const old=JSON.stringify((await legacy.get()).data());
 await assert.rejects(issueClientInvitation(f,email),/entrega/);assert.equal((await clientBindingRef(db,f.id,1).get()).exists,false);
 await clientPrerequisites(f.id);const invite=await issueClientInvitation(f,email);
 assert.equal((await inspectClientInvitation(db,invite.id,invite.token)).email,email);
 assert(!JSON.stringify((await invitationRef(db,invite.id).get()).data()).includes(invite.token));
 const replay=await clientBindingCommand(db,f.id,1,invite.command,'admin-demo');assert.equal(replay.replay,true);
 await assert.rejects(clientBindingCommand(db,f.id,1,{...invite.command,data:{...invite.command.data,email:'different@example.test'}},'admin-demo'));
 const savedProject=process.env.GCLOUD_PROJECT;process.env.GCLOUD_PROJECT='negocio-facil-page';
 try{const blocked=await publicApi.POST(new Request('http://localhost/api',{method:'POST',headers:{'Content-Type':'application/json',Origin:'https://www.cuentahogar.com.ar'},body:JSON.stringify({action:'INSPECT',token:invite.token})}),{params:Promise.resolve({invitationId:invite.id})});assert.equal(blocked.status,403);}finally{process.env.GCLOUD_PROJECT=savedProject;}
 assert.equal((await inspectClientInvitation(db,invite.id,invite.token)).email,email);
 const customer=await admin.auth().createUser({email,password:'Own-emulator-password-123',emailVerified:false});
 await assert.rejects(redeemClientInvitation(db,invite.id,invite.token,'redeem-unverified',customer.uid),/Verificá/);
 await admin.auth().updateUser(customer.uid,{emailVerified:true});
 await assert.rejects(redeemClientInvitation(db,invite.id,invite.token,'cross-account',other.uid));
 const redeemed=await Promise.all(Array.from({length:6},()=>redeemClientInvitation(db,invite.id,invite.token,'redeem-identical',customer.uid)));
 assert.equal(redeemed.filter(r=>!r.replay).length,1);assert(redeemed.every(r=>r.activated));
 await assert.rejects(inspectClientInvitation(db,invite.id,invite.token));
 await assert.rejects(redeemClientInvitation(db,invite.id,invite.token,'reuse-different-command',customer.uid));
 assert.equal((await listClientServices(db,customer.uid)).length,1);assert.equal((await listClientServices(db,other.uid)).length,0);
 await assert.rejects(readClientService(db,f.id,1,other.uid));
 const f2=await clientFixture();await clientPrerequisites(f2.id);
 const link={commandId:randomUUID(),operationId:f2.operation.operationId,expectedRevision:0,action:'LINK',data:{uid:customer.uid,reason:'Cuenta explícita compartida por dos servicios'}};
 const links=await Promise.all(Array.from({length:4},()=>clientBindingCommand(db,f2.id,1,link,'admin-demo')));assert.equal(links.filter(x=>!x.replay).length,1);
 assert.equal((await listClientServices(db,customer.uid)).length,1,'Prelink does not grant service access');
 const i2=await issueClientInvitation(f2,email);await redeemClientInvitation(db,i2.id,i2.token,'redeem-second',customer.uid);
 assert.equal((await listClientServices(db,customer.uid)).length,2);
 const projection=JSON.stringify(await listClientServices(db,customer.uid));for(const forbidden of ['580000','SECRET_PROVIDER','costo','factor','dni','whatsapp','plan','cuotaEstimada','contractTotal','ledger','storagePath','snapshot'])assert(!projection.includes(forbidden),forbidden);
 const expired=await clientFixture();await clientPrerequisites(expired.id);const e=await issueClientInvitation(expired,`expired-${randomUUID()}@example.test`);await invitationRef(db,e.id).update({expiresAt:'2000-01-01T00:00:00Z'});await assert.rejects(inspectClientInvitation(db,e.id,e.token));await assert.rejects(redeemClientInvitation(db,e.id,e.token,'expired',customer.uid));
 const revoked=await clientFixture();await clientPrerequisites(revoked.id);const rev=await issueClientInvitation(revoked,`revoke-${randomUUID()}@example.test`),revState=(await readClientBinding(db,revoked.id,1)).state;
 await clientBindingCommand(db,revoked.id,1,{commandId:'revoke',operationId:revoked.operation.operationId,expectedRevision:revState.revision,action:'REVOKE',data:{invitationId:rev.id}},'admin-demo');
 await assert.rejects(inspectClientInvitation(db,rev.id,rev.token));await assert.rejects(redeemClientInvitation(db,rev.id,rev.token,'revoked',customer.uid));
 const race=await clientFixture();await clientPrerequisites(race.id);const raceEmail=`race-${randomUUID()}@example.test`,ri=await issueClientInvitation(race,raceEmail),raceUser=await admin.auth().createUser({email:raceEmail,emailVerified:true});
 const results=await Promise.allSettled([redeemClientInvitation(db,ri.id,ri.token,'race-redeem',raceUser.uid),clientBindingCommand(db,race.id,1,{commandId:'race-revoke',operationId:race.operation.operationId,expectedRevision:1,action:'REVOKE',data:{invitationId:ri.id}},'admin-demo')]);assert.equal(results.filter(x=>x.status==='fulfilled').length,1);
 const failed=await clientFixture();await clientPrerequisites(failed.id);const failEmail=`fail-${randomUUID()}@example.test`,fi=await issueClientInvitation(failed,failEmail),failUser=await admin.auth().createUser({email:failEmail,emailVerified:true}),originalRun=db.runTransaction.bind(db);
 db.runTransaction=((callback:Parameters<typeof db.runTransaction>[0])=>originalRun(async tx=>{await callback(tx);throw Error('INJECTED_ABORT');})) as typeof db.runTransaction;
 try{await assert.rejects(redeemClientInvitation(db,fi.id,fi.token,'fail-consume',failUser.uid),/INJECTED_ABORT/);}finally{db.runTransaction=originalRun;}
 assert.equal((await invitationRef(db,fi.id).get()).data()!.state,'PENDING');assert.equal((await clientIndex(db,failUser.uid).get()).size,0);
 await redeemClientInvitation(db,fi.id,fi.token,'fail-consume',failUser.uid);
 const before=(await readClientBinding(db,f.id,1)).state;await assert.rejects(clientBindingCommand(db,f.id,1,{commandId:'illegal-relink',operationId:f.operation.operationId,expectedRevision:before.revision,action:'LINK',data:{uid:other.uid,reason:'Cambio activo rechazado'}},'admin-demo'));
 const custom=await admin.auth().createCustomToken(customer.uid),login=await fetch('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=demo',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token:custom,returnSecureToken:true})}),jwt=(await login.json()).idToken;
 const ctx={params:Promise.resolve({budgetId:f.id,version:'1'})},req=(token?:string)=>new NextRequest('http://localhost/api',{headers:token?{Authorization:`Bearer ${token}`}:{}});
 assert.equal((await clientApi.GET(req(),ctx)).status,403);assert.equal((await clientApi.GET(req(jwt),ctx)).status,200);assert.equal((await adminApi.GET(req(jwt),ctx)).status,401);
 assert.equal((await verifyClientAuth(req(jwt),f.b.solicitudId)).authorized,false,'V2 activation does not grant legacy financial access');
 const bad=await publicApi.POST(new Request('http://localhost/api',{method:'POST',headers:{'Content-Type':'application/json',Origin:'https://evil.example'},body:JSON.stringify({action:'INSPECT',token:fi.token})}),{params:Promise.resolve({invitationId:fi.id})});assert.equal(bad.status,403);
 await admin.auth().updateUser(customer.uid,{disabled:true});await assert.rejects(listClientServices(db,customer.uid));await admin.auth().updateUser(customer.uid,{disabled:false});
 const active=(await readClientBinding(db,f.id,1)).state;
 const revokeAccess={commandId:'revoke-active',operationId:f.operation.operationId,expectedRevision:active.revision,action:'REVOKE_ACCESS',data:{reason:'Revocación sintética explícita'}};
 const revocations=await Promise.all(Array.from({length:4},()=>clientBindingCommand(db,f.id,1,revokeAccess,'admin-demo')));
 assert.equal(revocations.filter(r=>!r.replay).length,1);
 const revokedSnap=await clientBindingRef(db,f.id,1).get();
 assert.equal(revokedSnap.data()!.state,'REVOKED');assert.equal(revokedSnap.data()!.uid,customer.uid);assert.equal(revokedSnap.data()!.activatedAt,active.activatedAt);
 await clientBindingCommand(db,f.id,1,revokeAccess,'admin-demo');assert((await clientBindingRef(db,f.id,1).get()).updateTime!.isEqual(revokedSnap.updateTime!));
 await assert.rejects(clientBindingCommand(db,f.id,1,{...revokeAccess,data:{reason:'Otro motivo'}},'admin-demo'),/commandId/);
 await assert.rejects(readClientService(db,f.id,1,customer.uid));
 const remaining=await listClientServices(db,customer.uid);assert.equal(remaining.length,1);assert.equal(remaining[0].budgetId,f2.id);
 await assert.rejects(redeemClientInvitation(db,invite.id,invite.token,'redeem-identical',customer.uid));
 await assert.rejects(issueClientInvitation(f,email));
 const revokeReq=(token?:string)=>new NextRequest('http://localhost/api',{method:'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},body:JSON.stringify(revokeAccess)});
 assert.equal((await adminApi.POST(revokeReq(),ctx)).status,401);assert.equal((await adminApi.POST(revokeReq(jwt),ctx)).status,401);
 console.log('ACTIVE_ACCESS_REVOCATION_CONCURRENCY_REPLAY_MULTIPLE_SERVICES=PASS');
 assert.equal(JSON.stringify({budget:(await f.r.budget.get()).data(),acceptance:(await f.r.acceptance.get()).data()}),original);assert.equal(JSON.stringify((await legacy.get()).data()),old);
 console.log('CLIENT_PORTAL_EMULATOR=PASS; SINGLE_USE_EXPIRY_REVOCATION=PASS; CONCURRENCY_IDEMPOTENCY_ATOMICITY=PASS; MULTIPLE_SERVICES=PASS; UID_ISOLATION=PASS; FINANCIAL_ACCESS=DENIED; HISTORICAL_MUTATIONS=0; PRODUCTIVE_INVITATIONS=DISABLED; PRODUCTION_WRITES=0');
}
if(process.argv[1]?.endsWith('testOperationClientV2Emulator.ts'))main().then(()=>admin.app().delete()).catch(e=>{console.error(e instanceof Error?e.message:'CLIENT_TEST_FAILED');process.exitCode=1;});
