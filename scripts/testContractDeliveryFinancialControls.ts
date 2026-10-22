import './helpers/requireSafeEmulatorEnvironment';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {mkdirSync,writeFileSync} from 'node:fs';
import {NextRequest} from 'next/server';
import {admin} from '../src/lib/firebaseAdmin';
import {financialFixture,activateFinancialFixture} from './testOperationFinancialV2Emulator';
import {deliveryFixture,prepareDeliveryDocuments} from './testOperationDeliveryV2Emulator';
import {deliveryRef,deliveryCommand} from '../src/lib/operationDeliveryV2Server';
import {financialRef,financialCommand,readFinancial} from '../src/lib/operationFinancialV2Server';
import {financialHandler} from '../src/lib/operationFinancialV2Http';
import {type DeliveryV2} from '../src/lib/operationDeliveryV2';
import {clientBindingRef} from '../src/lib/operationClientV2Server';
import {contractValueHash} from '../src/lib/contractIntegrityV2';
const db=admin.firestore(),results:Record<string,unknown>={};
const pass=(n:string,extra:Record<string,unknown>={})=>{results[n]={result:'PASS',...extra};console.log(n+'=PASS');};
async function main(){
 assert.equal(process.env.GCLOUD_PROJECT,'demo-cuenta-hogar');assert.equal(process.env.FIREBASE_STORAGE_EMULATOR_HOST,'127.0.0.1:9199');
 const f=await financialFixture(),dr=deliveryRef(db,f.id,1),original=(await dr.get()).data() as DeliveryV2,ref=financialRef(db,f.id,1);
 const originHash=contractValueHash({budget:(await f.r.budget.get()).data(),acceptance:(await f.r.acceptance.get()).data(),draft:(await f.r.draft.get()).data(),snapshot:f.snapshot});
 async function blocked(name:string,change:(s:DeliveryV2)=>void){const s=structuredClone(original);change(s);await dr.set(s);await assert.rejects(activateFinancialFixture(f));assert.equal((await ref.get()).exists,false);assert.equal((await ref.collection('commands').get()).size,0);await dr.set(original);pass(name);}
 for(const k of ['MANDATE','PAGARE','REMITO'] as const)await blocked('NO_'+k+'_SIGNATURE_NO_FINANCE',s=>s.documents[k].signature=null);
 await blocked('NO_ORIGINALS_NO_FINANCE',s=>s.originals=null);
 await blocked('DIFFERENT_ORIGINAL_VERSION_NO_FINANCE',s=>s.originals!.documentHashes.MANDATE='0'.repeat(64));
 await blocked('INCONSISTENT_SIGNATURE_NO_FINANCE',s=>s.documents.PAGARE.signature!.sha256='0'.repeat(64));
 await blocked('NO_EFFECTIVE_DELIVERY_NO_FINANCE',s=>s.event=null);
 await blocked('OPEN_REJECTION_NO_FINANCE',s=>s.holds.push({id:'synthetic-rejection',type:'DAMAGE',clearedAt:null,at:new Date().toISOString(),clearedBy:null,reason:'Rechazo sintético',photoIds:[]}));
 const d=await deliveryFixture();await prepareDeliveryDocuments(d);const rd=deliveryRef(db,d.id,1);
 await deliveryCommand(db,d.id,1,{action:'RECEIVE_ORIGINALS',data:{holder:d.holder,location:'Archivo sintético',receivedAt:new Date().toISOString(),reference:'PACK-ONLY-EMU',alternativeEvidence:'SYNTHETIC'},commandId:randomUUID(),operationId:d.identity.operationId,expectedRevision:(await rd.get()).data()!.revision},d.root);
 const prepared=(await rd.get()).data()!;
 for(const k of ['MANDATE','PAGARE','REMITO'] as const){const s=structuredClone(prepared);s.documents[k].signature=null;await rd.set(s);await assert.rejects(deliveryCommand(db,d.id,1,{action:'CONFIRM_DELIVERY',data:{occurredAt:new Date().toISOString()},commandId:randomUUID(),operationId:d.identity.operationId,expectedRevision:s.revision},{uid:d.uid,admin:false}));assert.equal((await rd.get()).data()!.status,'PREPARING');await rd.set(prepared);pass('NO_'+k+'_SIGNATURE_NO_DELIVERY');}
 const activation={action:'ACTIVATE',data:{},operationId:f.identity.operationId,expectedRevision:0,commandId:randomUUID()};
 const calls=await Promise.all([financialCommand(db,f.id,1,activation,f.root),financialCommand(db,f.id,1,activation,f.root)]);assert.equal(calls.filter(x=>!x.replay).length,1);const stamp=(await ref.get()).updateTime;assert((await financialCommand(db,f.id,1,activation,f.root)).replay);assert.deepEqual((await ref.get()).updateTime,stamp);await assert.rejects(financialCommand(db,f.id,1,{...activation,commandId:randomUUID(),expectedRevision:1},f.root));pass('SINGLE_ORIGINATION_REPLAY_SECOND_ACTIVATION_BLOCKED');
 const current=(await ref.get()).data()!;assert.equal(current.installments.length,12);assert.deepEqual(current.installments,f.snapshot.paymentSchedule.installments.map(i=>({number:i.installmentNumber,dueDate:i.dueDate,amountCents:i.amount*100})));assert.equal(current.totalCents,f.snapshot.economicTerms.contractTotal*100);pass('SNAPSHOT_12_INSTALLMENTS_EXACT',{totalCents:current.totalCents,installments:current.installments});
 let state=await readFinancial(db,f.id,1,f.root,'ADMIN');assert(state.active);const views:unknown[]=[state];
 const send=async(action:string,data:Record<string,unknown>)=>financialCommand(db,f.id,1,{action,data,operationId:f.identity.operationId,expectedRevision:(await ref.get()).data()!.revision,commandId:randomUUID()},f.root);
 const paymentId=randomUUID(),half=current.installments[0].amountCents/2,date=new Date().toISOString().slice(0,10);
 await send('CREDIT_PAYMENT',{paymentId,amountCents:half,effectiveDate:date,method:'TRANSFERENCIA',reference:'SYNTHETIC-ONLY'});state=await readFinancial(db,f.id,1,f.root,'ADMIN');assert(state.active);assert.equal(state.installments[0].status,'PARCIAL');views.push(state);
 await send('CREDIT_PAYMENT',{paymentId:randomUUID(),amountCents:half,effectiveDate:date,method:'EFECTIVO',reference:'SYNTHETIC-ONLY'});state=await readFinancial(db,f.id,1,f.root,'ADMIN');assert(state.active);assert.equal(state.installments[0].status,'PAGADA');views.push(state);
 await send('REVERSE_PAYMENT',{paymentId,reason:'Reversa de prueba sin efecto real'});state=await readFinancial(db,f.id,1,f.root,'ADMIN');assert(state.active);assert.equal(state.balanceCents,current.totalCents-half);assert.equal(state.receipts.find(r=>r.paymentId===paymentId)!.status,'REVERSADO');views.push(state);assert.equal((await ref.collection('events').get()).size,4);pass('PARTIAL_FULL_REVERSAL_AUDIT');
 for(const [role,uid]of [['AFFILIATE',f.uid],['CLIENT',f.clientUid]] as const){const v=await readFinancial(db,f.id,1,{uid,admin:false},role);assert(v.active);assert.equal(v.balanceCents,state.balanceCents);assert.deepEqual(v.installments,state.installments);for(const k of ['history','capitalCents','serviceCents'])assert.equal(k in v,false);pass(role+'_CONSISTENT_READ_ONLY_VIEW');}
 await assert.rejects(readFinancial(db,f.id,1,{uid:f.uid2,admin:false},'AFFILIATE'));await assert.rejects(readFinancial(db,f.id,1,{uid:f.uid2,admin:false},'CLIENT'));pass('UNASSIGNED_B_CROSS_CLIENT_DENIED');
 await db.collection('vendedores').doc(f.affiliateId).update({activo:false});await assert.rejects(readFinancial(db,f.id,1,{uid:f.uid,admin:false},'AFFILIATE'));await db.collection('vendedores').doc(f.affiliateId).update({activo:true});pass('DEACTIVATED_AFFILIATE_DENIED');
 await clientBindingRef(db,f.id,1).update({state:'PREPARED'});await assert.rejects(readFinancial(db,f.id,1,{uid:f.clientUid,admin:false},'CLIENT'));await clientBindingRef(db,f.id,1).update({state:'ACTIVE'});pass('REVOKED_OR_UNACTIVATED_CLIENT_DENIED');
 async function token(uid:string){const custom=await admin.auth().createCustomToken(uid);const r=await fetch('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=demo-key',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token:custom,returnSecureToken:true})});assert.equal(r.status,200);return (await r.json()).idToken;}
 const tok=await token(f.uid);
 for(const action of ['CREDIT_PAYMENT','REVERSE_PAYMENT']){const req=new NextRequest('http://localhost/api',{method:'POST',headers:{Authorization:'Bearer '+tok,'Content-Type':'application/json'},body:JSON.stringify({action})});assert.equal((await financialHandler(req,f.id,'1','ADMIN')).status,403);assert.equal((await financialHandler(req,f.id,'1','AFFILIATE')).status,403);}pass('AFFILIATE_CREDIT_REVERSE_HTTP_403');
 assert.equal(contractValueHash({budget:(await f.r.budget.get()).data(),acceptance:(await f.r.acceptance.get()).data(),draft:(await f.r.draft.get()).data(),snapshot:f.snapshot}),originHash);assert.deepEqual((await ref.get()).data()!.installments,current.installments);pass('CONTRACT_SCHEDULE_SNAPSHOT_IMMUTABLE');
 mkdirSync('/tmp/cuenta-hogar-contract-delivery-controls',{recursive:true});writeFileSync('/tmp/cuenta-hogar-contract-delivery-controls/extra-controls.json',JSON.stringify({results,views,operationId:f.identity.operationId,productionWrites:0},null,2));
}
main().then(()=>admin.app().delete()).catch(e=>{console.error(e);process.exitCode=1;});
