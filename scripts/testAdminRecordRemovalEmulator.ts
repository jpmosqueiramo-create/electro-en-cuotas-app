import './helpers/requireSafeEmulatorEnvironment';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {admin} from '../src/lib/firebaseAdmin';
import {administrativeRecordRef,manageAdministrativeRecord,previewAdministrativeRemoval,readAdministrativeStatus} from '../src/lib/adminRecordRemovalServer';
import type {AdminRecordSubject} from '../src/lib/adminRecordRemoval';
import {POST} from '../src/app/api/admin/registros/eliminacion/route';
import {budgetFixture} from './helpers/budgetV2Fixtures';
import {persistBudgetV2} from '../src/lib/budgetV2Persistence';
import {acceptBudgetV2} from '../src/lib/budgetAcceptanceV2Server';
import {contractCommand,contractRefs,publicContractData} from '../src/lib/contractV2Server';
import {readySource} from '../src/lib/productionV2/source';
import {ADMIN_EMAIL} from '../src/lib/adminIdentity';
import {p1Token,p1User} from './testPortalP1Emulator';
const db=admin.firestore();
async function command(subject:AdminRecordSubject,action='REMOVE') {const p=await previewAdministrativeRemoval(db,subject);return {subject,action,commandId:randomUUID(),fingerprint:p.fingerprint,confirmed:true,reason:'Prueba sintética de administración'};}
async function main(){
 assert.equal(process.env.GCLOUD_PROJECT,'demo-cuenta-hogar');
 const id=randomUUID(),a={kind:'REQUEST',source:'solicitudes',id} as const,b={kind:'REQUEST',source:'solicitudes_cuenta',id} as const;
 await db.doc(`solicitudes/${id}`).create({estado:'PENDIENTE',marker:'same-id-a'});await db.doc(`solicitudes_cuenta/${id}`).create({estado:'Pendiente',marker:'same-id-b'});
 const original=await db.doc(`solicitudes/${id}`).get(),other=await db.doc(`solicitudes_cuenta/${id}`).get(),c=await command(a);
 const results=await Promise.all([manageAdministrativeRecord(db,c,'admin-test'),manageAdministrativeRecord(db,c,'admin-test')]);
 assert.equal(results[0].state,'DELETED');assert.deepEqual(results.map(x=>x.revision),[1,1]);
 const marker=await administrativeRecordRef(db,a).get();await manageAdministrativeRecord(db,c,'admin-test');assert((await administrativeRecordRef(db,a).get()).updateTime!.isEqual(marker.updateTime!));
 assert.equal((await administrativeRecordRef(db,a).collection('commands').get()).size,1);assert.equal(await readAdministrativeStatus(db,b),null);
 assert((await original.ref.get()).updateTime!.isEqual(original.updateTime!));assert((await other.ref.get()).updateTime!.isEqual(other.updateTime!));
 await assert.rejects(()=>manageAdministrativeRecord(db,{...c,reason:'Otro contenido'},'admin-test'),/CONFLICT/);
 await manageAdministrativeRecord(db,await command(a,'RESTORE'),'admin-test');assert.equal((await readAdministrativeStatus(db,a))!.state,'ACTIVE');
 const stale=await command(a);await original.ref.update({marker:'updated-before-confirmation'});await assert.rejects(()=>manageAdministrativeRecord(db,stale,'admin-test'),/CHANGED/);
 const concurrent=await command(a),outcomes=await Promise.allSettled([manageAdministrativeRecord(db,concurrent,'admin-test'),manageAdministrativeRecord(db,{...concurrent,commandId:randomUUID()},'admin-test')]);assert.equal(outcomes.filter(x=>x.status==='fulfilled').length,1);
 const budget=budgetFixture('remove-'+randomUUID());budget.solicitudId='source-'+randomUUID();await db.doc('solicitudes/'+budget.solicitudId).create({estado:'PENDIENTE'});
 const saved=await persistBudgetV2(db,{action:'SAVE',commandId:randomUUID(),expectedRevision:0,budget,privateOptionIds:[]},'admin-test');
 const source={kind:'REQUEST',source:'solicitudes',id:budget.solicitudId} as const;assert.equal((await previewAdministrativeRemoval(db,source)).resultState,'ARCHIVED');
 const subject={kind:'BUDGET',id:budget.id} as const;await manageAdministrativeRecord(db,await command(subject),'admin-test');await assert.rejects(()=>persistBudgetV2(db,{action:'SAVE',commandId:randomUUID(),expectedRevision:1,budget:saved,privateOptionIds:[]},'admin-test'),/retirado/);
 await manageAdministrativeRecord(db,await command(subject,'RESTORE'),'admin-test');
 const issued=await persistBudgetV2(db,{action:'ISSUE',commandId:randomUUID(),expectedRevision:1,budget:saved,privateOptionIds:[]},'admin-test');assert.equal((await previewAdministrativeRemoval(db,subject)).resultState,'ARCHIVED');
 await acceptBudgetV2(db,{budgetId:issued.id,version:1,acceptedOptionId:issued.options[0].optionId,preferredPlanCuotas:12,commandId:randomUUID()},'admin-test');
 await contractCommand(db,budget.id,1,{action:'OPEN_OR_CREATE',commandId:randomUUID()},'admin-test');
 const refs=contractRefs(db,budget.id,1),d=(await refs.draft.get()).data()!;
 const link=await contractCommand(db,budget.id,1,{action:'CREATE_CLIENT_DATA_REQUEST',commandId:randomUUID(),expectedRevision:d.revision},'admin-test');
 const contract={kind:'CONTRACT',id:budget.id,version:1} as const,ds=await refs.draft.get();await manageAdministrativeRecord(db,await command(contract),'admin-test');
 await assert.rejects(()=>contractCommand(db,budget.id,1,{action:'OPEN_OR_CREATE',commandId:randomUUID()},'admin-test'),/retirado/);
 await assert.rejects(()=>publicContractData(db,link.requestId!,link.secret!),/retirado/);
 await assert.rejects(()=>db.runTransaction(tx=>readySource(db,tx,budget.id,1,ds.data()!.revision)),/retirado/);
 assert((await refs.draft.get()).updateTime!.isEqual(ds.updateTime!));
 await manageAdministrativeRecord(db,await command(contract,'RESTORE'),'admin-test');const restoredLink=await publicContractData(db,link.requestId!,link.secret!);assert.ok('available' in restoredLink&&restoredLink.available);
 const financial=refs.draft.collection('operation').doc('financial');await financial.create({status:'ACTIVE',balanceCents:174000000,marker:'synthetic-financial-preservation'});const f=await financial.get();
 const archived=await manageAdministrativeRecord(db,await command(contract),'admin-test');assert.equal(archived.state,'ARCHIVED');assert((await financial.get()).updateTime!.isEqual(f.updateTime!));assert((await refs.draft.get()).updateTime!.isEqual(ds.updateTime!));
 const request=(body:unknown,token?:string)=>new Request('http://localhost/api/admin/registros/eliminacion',{method:'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:JSON.stringify(body)});
 const previewBody={mode:'PREVIEW',subject};assert.equal((await POST(request(previewBody))).status,401);
 for(const role of ['client','affiliate']){const user=await p1User('removal-'+role);const token=await p1Token(user);assert.equal((await POST(request(previewBody,token))).status,403);}
 let operator;try{operator=await admin.auth().getUserByEmail(ADMIN_EMAIL);}catch{operator=await admin.auth().createUser({email:ADMIN_EMAIL,emailVerified:true});}
 const token=await p1Token(operator);assert.equal((await POST(request(previewBody,token))).status,200);
 const sdk=await fetch(`http://127.0.0.1:8080/v1/projects/demo-cuenta-hogar/databases/(default)/documents/${administrativeRecordRef(db,a).path}`,{headers:{Authorization:'Bearer '+token}});assert.equal(sdk.status,403,'Even administrators cannot access the removal registry directly via SDK');
 assert.equal((await POST(request({...previewBody,subject:{kind:'REQUEST',source:'vendedores',id}},token))).status,409);
 console.log('ADMIN_REMOVAL_EMULATOR = PASS; REPLAY = PASS; CONCURRENCY = PASS; STALE_PREVIEW = PASS; SAME_ID_ISOLATION = PASS; CONTRACT_LINK_AND_FREEZE_BLOCK = PASS; RESTORE = PASS; FINANCIAL_AND_CANONICAL_INTEGRITY = PASS; ROLES_AND_SDK_DENIAL = PASS');
 await admin.app().delete();
}
main().catch(e=>{console.error(e);process.exitCode=1;});
