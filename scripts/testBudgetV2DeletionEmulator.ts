import './helpers/requireSafeEmulatorEnvironment';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { admin } from '../src/lib/firebaseAdmin';
import { persistBudgetV2, type BudgetCommandV2 } from '../src/lib/budgetV2Persistence';
import { acceptBudgetV2 } from '../src/lib/budgetAcceptanceV2Server';
import { deleteBudgetFamily, previewBudgetDeletion, budgetDeletionRef, BUDGET_DELETE_LIMIT } from '../src/lib/budgetV2Deletion';
import { POST } from '../src/app/api/admin/presupuestos-v2/eliminacion/route';
import { budgetFixture } from './helpers/budgetV2Fixtures';
import { p1Token, p1User } from './testPortalP1Emulator';
import { ADMIN_EMAIL } from '../src/lib/adminIdentity';
const db = admin.firestore();
async function fixture() {
  const budget = budgetFixture('delete-'+randomUUID());
  budget.solicitudId='delete-source-'+randomUUID();
  await db.doc('solicitudes/'+budget.solicitudId).set({marker: 'preserve-source'});
  const command: BudgetCommandV2 = {action:'SAVE',commandId:randomUUID(),budget,expectedRevision:0,privateOptionIds:[]};
  return {budget:await persistBudgetV2(db,command,'admin-test'),command};
}
async function removal(id: string, commandId=randomUUID()) {const p=await previewBudgetDeletion(db,id);return {budgetId:id,commandId,fingerprint:p.fingerprint,confirm:true};}
async function main() {
  const unrelated=await fixture(), protectedBefore=await db.doc(`presupuestos_v2/${unrelated.budget.id}/versions/1`).get();
  const f=await fixture(), source=await db.doc(`solicitudes/${f.budget.solicitudId}`).get(), c=await removal(f.budget.id);
  const first=await deleteBudgetFamily(db,c,'admin-test'), audit=await budgetDeletionRef(db,f.budget.id).get();
  assert.equal(first.deletedPaths.length,3);assert.equal((await db.doc(`presupuestos_v2/${f.budget.id}`).get()).exists,false);
  assert.deepEqual(await deleteBudgetFamily(db,c,'admin-test'),first);assert.deepEqual(await deleteBudgetFamily(db,{confirm:true,fingerprint:c.fingerprint,commandId:c.commandId,budgetId:c.budgetId},'admin-test'),first);assert((await budgetDeletionRef(db,f.budget.id).get()).updateTime!.isEqual(audit.updateTime!));
  assert((await source.ref.get()).updateTime!.isEqual(source.updateTime!));
  await assert.rejects(()=>persistBudgetV2(db,f.command,'admin-test'),/eliminado/);
  await assert.rejects(()=>deleteBudgetFamily(db,{...c,commandId:randomUUID()},'admin-test'),/Conflicto/);
  await assert.rejects(()=>deleteBudgetFamily(db,{...c,confirm:false},'admin-test'),/Confirmación/);
  console.log('SIMPLE_DELETE=PASS; REPLAY_NO_WRITES=PASS; SOURCE_PRESERVED=PASS; RESURRECTION_BLOCKED=PASS');
  const multi=await fixture();const issued=await persistBudgetV2(db,{action:'ISSUE',commandId:randomUUID(),budget:multi.budget,expectedRevision:1,privateOptionIds:[]},'admin-test');
  await persistBudgetV2(db,{action:'REVISE',commandId:randomUUID(),budget:issued,expectedRevision:2,privateOptionIds:[]},'admin-test');
  const mp=await previewBudgetDeletion(db,multi.budget.id);assert.deepEqual(mp.versions,[1,2]);assert.equal(mp.paths.length,6);assert.equal((await deleteBudgetFamily(db,await removal(multi.budget.id),'admin-test')).deletedPaths.length,6);
  const blockers=['acceptances/1','contracts/v1','documentation/1','contracts/v1/fulfillment/current','contracts/v1/custody/current','contracts/v1/financial/current/payments/p1','contracts/v1/financial/current/receipts/r1','contracts/v1/creditReview/current','contracts/v1/operation/identity'];
  for(const path of blockers){const b=await fixture(),ref=db.doc(`presupuestos_v2/${b.budget.id}/${path}`);await ref.set({marker:path});const before=await ref.get(),p=await previewBudgetDeletion(db,b.budget.id);assert.equal(p.allowed,false,path);await assert.rejects(()=>deleteBudgetFamily(db,{budgetId:b.budget.id,commandId:randomUUID(),fingerprint:p.fingerprint,confirm:true},'admin-test'),/dependencias/);assert((await ref.get()).updateTime!.isEqual(before.updateTime!));assert.equal((await budgetDeletionRef(db,b.budget.id).get()).exists,false);}
  for(const [collection,field] of [['productos','originBudgetId'],['ledger_comisiones_movimientos','budgetId'],['contractSnapshotsV2','sourceDraft.budgetId'],['contractClientDataRequests','budgetId']] as const){const b=await fixture(),ref=db.collection(collection).doc(randomUUID());await ref.set(field.includes('.')?{sourceDraft:{budgetId:b.budget.id}}:{[field]:b.budget.id});const p=await previewBudgetDeletion(db,b.budget.id);assert.equal(p.allowed,false);assert(p.blockers.includes(ref.path));await assert.rejects(()=>deleteBudgetFamily(db,{budgetId:b.budget.id,commandId:randomUUID(),fingerprint:p.fingerprint,confirm:true},'admin-test'));}
  console.log('MULTI_VERSION=PASS; ACCEPTANCE_CONTRACT_DOCUMENTS_LOGISTICS_ASSIGNMENT_PAYMENTS_RECEIPTS_CREDIT=BLOCKED; EXTERNAL_REFERENCE_COMMISSION_SNAPSHOT=BLOCKED');
  const stale=await fixture(),staleCommand=await removal(stale.budget.id);await persistBudgetV2(db,{...stale.command,budget:stale.budget,commandId:randomUUID(),expectedRevision:1},'admin-test');await assert.rejects(()=>deleteBudgetFamily(db,staleCommand,'admin-test'),/cambió/);
  const parallel=await fixture(),pc=await removal(parallel.budget.id),results=await Promise.all([deleteBudgetFamily(db,pc,'admin-test'),deleteBudgetFamily(db,pc,'admin-test')]);assert.deepEqual(results[0],results[1]);
  const two=await fixture(),tc=await removal(two.budget.id);const both=await Promise.allSettled([deleteBudgetFamily(db,tc,'admin-test'),deleteBudgetFamily(db,{...tc,commandId:randomUUID()},'other-admin')]);assert.equal(both.filter(x=>x.status==='fulfilled').length,1);
  for(const action of ['SAVE','ISSUE','ACCEPT'] as const){const r=await fixture();let budget=r.budget;if(action==='ACCEPT')budget=await persistBudgetV2(db,{action:'ISSUE',commandId:randomUUID(),budget,expectedRevision:budget.revision,privateOptionIds:[]},'admin-test');const rc=await removal(budget.id);const attempt=action==='ACCEPT'?()=>acceptBudgetV2(db,{budgetId:budget.id,version:1,commandId:randomUUID(),acceptedOptionId:budget.options[0].optionId,preferredPlanCuotas:null},'admin-test'):()=>persistBudgetV2(db,{action,commandId:randomUUID(),budget,expectedRevision:budget.revision,privateOptionIds:[]},'admin-test');const race=await Promise.allSettled([deleteBudgetFamily(db,rc,'admin-test'),attempt()]);assert.equal(race.filter(x=>x.status==='fulfilled').length,1,action+' race must have exactly one winner');const deleted=(await budgetDeletionRef(db,budget.id).get()).exists;if(deleted){assert.equal((await db.doc(`presupuestos_v2/${budget.id}`).get()).exists,false);assert.equal((await db.doc(`presupuestos_v2/${budget.id}/acceptances/1`).get()).exists,false);}else assert.equal((await db.doc(`presupuestos_v2/${budget.id}`).get()).exists,true);}
  const large=await fixture(),batch=db.batch();for(let n=0;n<BUDGET_DELETE_LIMIT;n++)batch.set(db.doc(`presupuestos_v2/${large.budget.id}/commands/extra-${n}`),{unknown:true});await batch.commit();await assert.rejects(()=>previewBudgetDeletion(db,large.budget.id),/límite seguro/);
  for (const corrupt of ['missing-source','unknown-family','unknown-command']) {
    const f=await fixture();
    if(corrupt==='missing-source') await db.doc('solicitudes/'+f.budget.solicitudId).delete();
    if(corrupt==='unknown-family') await db.doc('presupuestos_v2/'+f.budget.id).update({unknownOperationalField:true});
    if(corrupt==='unknown-command') await db.doc(`presupuestos_v2/${f.budget.id}/commands/foreign`).set({result:{id:'another-family'}});
    assert.equal((await previewBudgetDeletion(db,f.budget.id)).allowed,false,corrupt);
  }
  console.log('STALE_PREVIEW=REJECTED; CONCURRENT_REPLAY=PASS; TWO_ADMINS=PASS; SAVE_ISSUE_ACCEPT_RACES=PASS; BOUNDED_DELETE=PASS');
  const request=(body:unknown,token?:string)=>new Request('http://localhost/api/admin/presupuestos-v2/eliminacion',{method:'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:JSON.stringify(body)});
  for(const kind of ['client','affiliate']){const token=await p1Token(await p1User(kind));assert.equal((await POST(request({mode:'DELETE',...await removal(unrelated.budget.id)},token))).status,403);}
  assert.equal((await POST(request({mode:'PREVIEW',budgetId:unrelated.budget.id}))).status,401);
  let root;try{root=await admin.auth().getUserByEmail(ADMIN_EMAIL);}catch{root=await admin.auth().createUser({email:ADMIN_EMAIL,emailVerified:true});}const token=await p1Token(root),http=await fixture();assert.equal((await POST(request({mode:'PREVIEW',budgetId:http.budget.id},token))).status,200);assert.equal((await POST(request({mode:'DELETE',...await removal(http.budget.id)},token))).status,200);
  assert((await protectedBefore.ref.get()).updateTime!.isEqual(protectedBefore.updateTime!));
  console.log('ADMIN_HTTP=PASS; ANONYMOUS=401; CLIENT_AFFILIATE=403; OTHER_BUDGET_HISTORY_UNCHANGED=PASS; PRODUCTION_WRITES=0; BUDGET_DELETION_EMULATOR=PASS');
}
main().then(()=>admin.app().delete()).catch(e=>{console.error(e);process.exitCode=1;});
