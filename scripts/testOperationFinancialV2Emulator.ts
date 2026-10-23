import './helpers/requireSafeEmulatorEnvironment';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { NextRequest } from 'next/server';
import { admin } from '../src/lib/firebaseAdmin';
import { deliveryFixture,prepareDeliveryDocuments } from './testOperationDeliveryV2Emulator';
import { deliveryCommand,readDelivery,deliveryRef } from '../src/lib/operationDeliveryV2Server';
import { financialCommand,readFinancial,financialRef,financialApprovalRef } from '../src/lib/operationFinancialV2Server';
import { cents,financialEnabled,financialSummary,type FinancialState } from '../src/lib/operationFinancialV2';
import { contractCommand,publicContractData } from '../src/lib/contractV2Server';
import { createContractFreezeIntegrationEmulator,FREEZE_DEPENDENCIES_COLLECTION } from '../src/lib/contractFreezeIntegrationEmulator';
import { CONTRACT_INFRASTRUCTURE_PATHS } from '../src/lib/contractInfrastructureEmulator';
import { infrastructureFixture } from './helpers/contractInfrastructureFixtures';
import { addressPayload } from './testContractV2';
import { reviewCommand,addDocuments } from './testCreditReviewV2Emulator';
import { clientBindingRef,clientIndex } from '../src/lib/operationClientV2Server';
import { contractValueHash } from '../src/lib/contractIntegrityV2';
import { financialHandler } from '../src/lib/operationFinancialV2Http';
const db=admin.firestore();
export async function financialFixture(){
 const f=await deliveryFixture(),actor='synthetic-admin-a',dependenciesId='finance-'+randomUUID();
 let d=(await f.r.draft.get()).data()!;
 // New acceptances require the same reviewed intake and manual credit decision
 // as the real workspace; do not bypass the new prerequisite in financial tests.
 const intake=await contractCommand(db,f.id,1,{action:'CREATE_CLIENT_DATA_REQUEST',commandId:randomUUID(),expectedRevision:d.revision},actor);
 await publicContractData(db,intake.requestId!,intake.secret!,{personalData:addressPayload.personalData,employmentData:addressPayload.employmentData});
 d=(await contractCommand(db,f.id,1,{action:'APPLY_CLIENT_SUBMISSION',submissionId:intake.requestId,commandId:randomUUID(),expectedRevision:intake.draft.revision},actor)).draft;
 await reviewCommand(f.id,'VERIFY_IDENTITY',{evidence:'Identidad documental sintética verificada'});
 await addDocuments(f.id);
 await reviewCommand(f.id,'DECIDE',{state:'IN_REVIEW',resolution:'Revisión previa financiera',notes:'Sólo Emulator'});
 await reviewCommand(f.id,'DECIDE',{state:'APPROVED',resolution:'Decisión manual sintética',notes:'No equivale a aprobación jurídica'});

 for(const [action,extra]of [['UPDATE_PERSONAL_DATA',{personalData:addressPayload.personalData}],['SET_CONTRACT_PLAN',{contractPlanCuotas:12}],['SET_PAYMENT_DATES',{firstInstallmentDueDate:'2026-12-15',preferredMonthlyDueDay:30}],['RECORD_CLIENT_CONFORMITY',{evidence:'Synthetic client confirmation fixture'}],['MARK_READY_TO_FORMALIZE',{}]] as const)d=(await contractCommand(db,f.id,1,{action,commandId:randomUUID(),expectedRevision:d.revision,...extra},actor)).draft;
 await db.collection(FREEZE_DEPENDENCIES_COLLECTION).doc(dependenciesId).set({schemaVersion:'CONTRACT_FREEZE_SYNTHETIC_DEPENDENCIES_V1',executionMode:'EMULATOR_ONLY',legalApproval:'NOT_APPROVED_SYNTHETIC_ONLY',legalContext:infrastructureFixture(f.id).legalContext});
 const counter=db.doc(CONTRACT_INFRASTRUCTURE_PATHS.counter);if(!(await counter.get()).exists)await counter.create({schemaVersion:'CONTRACT_NUMBER_COUNTER_V1',policyId:'CONTRACT_NUMBERING_V1',executionMode:'EMULATOR_ONLY',active:true,lastAllocatedSequence:'0'});
 const service=createContractFreezeIntegrationEmulator();let snapshot;
 try{const result=await service.execute({action:'FREEZE_READY_EMULATOR',commandId:randomUUID(),budgetId:f.id,budgetVersion:1,expectedRevision:d.revision,dependenciesId},actor);snapshot=(await service.getSnapshot(result.snapshotId))!;}finally{await service.close();}
 await prepareDeliveryDocuments(f);
 const command=async(action:string,data:Record<string,unknown>,as=f.root)=>{const s=(await readDelivery(db,f.id,1,as)).state;return deliveryCommand(db,f.id,1,{action,data,commandId:randomUUID(),operationId:f.identity.operationId,expectedRevision:s.revision},as);};
 await command('RECEIVE_ORIGINALS',{holder:f.holder,location:'Originales financieros demo',receivedAt:new Date().toISOString(),reference:'PACK-FINANCE',alternativeEvidence:'DEMO-FINANCE-EVIDENCE'});
 await command('CONFIRM_DELIVERY',{occurredAt:new Date().toISOString()},{uid:f.uid,admin:false});
 const delivery=(await readDelivery(db,f.id,1,f.root)).state;
 await financialApprovalRef(db,f.id,1).set({schemaVersion:'EMULATOR_FINANCIAL_APPROVAL_V1',project:'demo-cuenta-hogar',executionMode:'EMULATOR_ONLY',approval:'SYNTHETIC_APPROVED_ONLY',snapshotId:snapshot.contractSnapshotId,snapshotHash:snapshot.integrity.payloadHash,operationId:f.identity.operationId,deliveryCommandId:delivery.event!.commandId,documentHashes:delivery.originals!.documentHashes});
 const clientUid='financial-client-'+randomUUID();await admin.auth().createUser({uid:clientUid,email:`${clientUid}@example.test`,password:'Emulator-only-123',emailVerified:true});
 await clientBindingRef(db,f.id,1).set({schemaVersion:'OPERATION_CLIENT_V2',operationId:f.identity.operationId,revision:1,uid:clientUid,state:'ACTIVE',activeInvitationId:null,activatedAt:new Date().toISOString()});
 await clientIndex(db,clientUid).doc(f.identity.operationId).set({operationId:f.identity.operationId,budgetId:f.id,version:1,uid:clientUid});
 // Existing portal fixture remains separate; financial activation always checks the actual delivery above.
 await f.r.draft.collection('operation').doc('clientActivationFixture').set({schemaVersion:'EMULATOR_CLIENT_ACTIVATION_FIXTURE_V2',project:'demo-cuenta-hogar',delivered:true,mandateSigned:true,pagareSigned:true,remitoSigned:true});
 return {...f,snapshot,clientUid};
}
export async function activateFinancialFixture(f:Awaited<ReturnType<typeof financialFixture>>){return financialCommand(db,f.id,1,{action:'ACTIVATE',data:{},operationId:f.identity.operationId,expectedRevision:0,commandId:randomUUID()},f.root);}
async function main(){
 assert.equal(cents(0),0);assert.equal(cents(580000.5),58000050);assert.throws(()=>cents(-1));assert.throws(()=>cents(0.001));
 assert(financialEnabled());for(const env of [{...process.env,NODE_ENV:'production'},{...process.env,GCLOUD_PROJECT:'negocio-facil-page'},{...process.env,K_SERVICE:'cloud'}])assert(!financialEnabled(env));
 const f=await financialFixture(),before=contractValueHash({budget:(await f.r.budget.get()).data(),acceptance:(await f.r.acceptance.get()).data(),draft:(await f.r.draft.get()).data()}),legacy=db.collection('solicitudes').doc(f.b.solicitudId);await legacy.set({marker:'LEGACY_LEDGER_UNCHANGED'});
 const command=async(action:string,data:Record<string,unknown>,id=randomUUID())=>({action,data,commandId:id,operationId:f.identity.operationId,expectedRevision:(await financialRef(db,f.id,1).get()).data()?.revision||0});
 const execute=async(action:string,data:Record<string,unknown>)=>financialCommand(db,f.id,1,await command(action,data),f.root);
 const approval=financialApprovalRef(db,f.id,1),savedApproval=(await approval.get()).data()!;await approval.update({approval:'PENDING'});await assert.rejects(activateFinancialFixture(f));await approval.set(savedApproval);
 const dr=deliveryRef(db,f.id,1),savedDelivery=(await dr.get()).data()!;await dr.update({'documents.REMITO.signature':null});await assert.rejects(activateFinancialFixture(f));await dr.set(savedDelivery);
 await assert.rejects(financialCommand(db,f.id,1,await command('ACTIVATE',{}),{uid:f.uid,admin:false}));
 const activation=await command('ACTIVATE',{});const activates=await Promise.all([1,2,3].map(()=>financialCommand(db,f.id,1,activation,f.root)));assert.equal(activates.filter(r=>!r.replay).length,1);
 const state=(await financialRef(db,f.id,1).get()).data() as FinancialState;assert.deepEqual(state.installments,f.snapshot.paymentSchedule.installments.map(i=>({number:i.installmentNumber,dueDate:i.dueDate,amountCents:i.amount*100})));assert.equal(state.totalCents,f.snapshot.economicTerms.contractTotal*100);
 const amount=state.installments[0].amountCents,credit={paymentId:randomUUID(),amountCents:amount/2,effectiveDate:new Date().toISOString().slice(0,10),method:'TRANSFERENCIA',reference:'SYNTHETIC-CREDIT-001'};
 const first=await command('CREDIT_PAYMENT',credit),results=await Promise.all(Array.from({length:5},()=>financialCommand(db,f.id,1,first,f.root)));assert.equal(results.filter(r=>!r.replay).length,1);assert.equal((await financialRef(db,f.id,1).collection('payments').get()).size,1);
 let view=await readFinancial(db,f.id,1,f.root,'ADMIN');assert(view.active);assert.equal(view.installments[0].status,'PARCIAL');assert.equal(view.paidInstallmentCount,0);assert.equal(view.pendingInstallmentCount,state.installments.length);assert.equal(view.nextDueAmountCents,amount/2);assert.equal(view.balanceCents,state.totalCents-amount/2);assert.equal(view.receipts.length,1);
 await assert.rejects(financialCommand(db,f.id,1,{...first,data:{...credit,amountCents:1}},f.root));await assert.rejects(execute('CREDIT_PAYMENT',credit));
 const fail=await command('CREDIT_PAYMENT',{...credit,paymentId:randomUUID()}),run=db.runTransaction.bind(db);db.runTransaction=((cb:Parameters<typeof db.runTransaction>[0])=>run(async tx=>{await cb(tx);throw Error('INJECTED_ABORT');})) as typeof db.runTransaction;try{await assert.rejects(financialCommand(db,f.id,1,fail,f.root),/INJECTED_ABORT/);}finally{db.runTransaction=run;}assert.equal((await financialRef(db,f.id,1).collection('payments').get()).size,1);assert.equal((await financialRef(db,f.id,1).collection('commands').doc(fail.commandId).get()).exists,false);
 await execute('CREDIT_PAYMENT',{...credit,paymentId:randomUUID(),reference:'SYNTHETIC-CREDIT-002'});view=await readFinancial(db,f.id,1,f.root,'ADMIN');assert(view.active);assert.equal(view.installments[0].status,'PAGADA');
 const simultaneous=await Promise.allSettled([1,2].map(()=>execute('CREDIT_PAYMENT',{...credit,paymentId:randomUUID()})));assert.equal(simultaneous.filter(r=>r.status==='fulfilled').length,1);
 const reverse=await command('REVERSE_PAYMENT',{paymentId:credit.paymentId,reason:'Corrección sintética autorizada'});await financialCommand(db,f.id,1,reverse,f.root);assert((await financialCommand(db,f.id,1,reverse,f.root)).replay);view=await readFinancial(db,f.id,1,f.root,'ADMIN');assert(view.active);assert.equal(view.receipts.find(r=>r.paymentId===credit.paymentId)!.status,'REVERSADO');
 const future=financialSummary(state,[], '2028-01-01');assert.equal(future.overdueCount,12);assert(future.installments.every(i=>i.daysPastDue>0));assert.equal(future.lateChargesCents,0);assert.equal(future.totalCents,state.totalCents);
 for(const role of ['AFFILIATE','CLIENT'] as const){const uid=role==='AFFILIATE'?f.uid:f.clientUid,v=await readFinancial(db,f.id,1,{uid,admin:false},role);assert(v.active);for(const k of ['capitalCents','serviceCents','history','SECRET_PROVIDER','costoProveedor','reference'])assert(!JSON.stringify(v).includes('"'+k+'"'));}
 await assert.rejects(readFinancial(db,f.id,1,{uid:f.uid2,admin:false},'AFFILIATE'));await assert.rejects(readFinancial(db,f.id,1,{uid:f.uid2,admin:false},'CLIENT'));
 await clientBindingRef(db,f.id,1).update({state:'PREPARED'});await assert.rejects(readFinancial(db,f.id,1,{uid:f.clientUid,admin:false},'CLIENT'));await clientBindingRef(db,f.id,1).update({state:'ACTIVE'});
 await assert.rejects(readFinancial(db,'missing-operation',1,f.root,'ADMIN'));
 const anon=await financialHandler(new NextRequest('http://localhost/api'),f.id,'1','ADMIN');assert.equal(anon.status,403);
 const rr=financialRef(db,f.id,1).collection('receipts').doc('receipt_'+credit.paymentId),originalReceipt=(await rr.get()).data()!;await rr.update({amountCents:1});await assert.rejects(readFinancial(db,f.id,1,f.root,'ADMIN'));await rr.set(originalReceipt);
 const altered=structuredClone(state.installments);altered[0].dueDate='2099-01-01';await financialRef(db,f.id,1).update({installments:altered});await assert.rejects(readFinancial(db,f.id,1,f.root,'ADMIN'));await financialRef(db,f.id,1).update({installments:state.installments});
 view=await readFinancial(db,f.id,1,f.root,'ADMIN');assert(view.active);await execute('CREDIT_PAYMENT',{...credit,paymentId:randomUUID(),amountCents:view.balanceCents,reference:'SYNTHETIC-FULL-BALANCE'});view=await readFinancial(db,f.id,1,f.root,'ADMIN');assert(view.active);assert.equal(view.balanceCents,0);assert.equal(view.status,'PAGADA');assert.equal(view.paidInstallmentCount,state.installments.length);assert.equal(view.pendingInstallmentCount,0);assert.equal(view.nextDueAmountCents,0);assert.equal(view.nextDueDate,null);assert(view.installments.every(i=>i.status==='PAGADA'));await assert.rejects(execute('CREDIT_PAYMENT',{...credit,paymentId:randomUUID(),amountCents:1}));
 const previous=process.env.GCLOUD_PROJECT;process.env.GCLOUD_PROJECT='negocio-facil-page';try{await assert.rejects(execute('REVERSE_PAYMENT',{paymentId:credit.paymentId,reason:'blocked'}),/productiva deshabilitada/);}finally{process.env.GCLOUD_PROJECT=previous;}
 assert.equal(contractValueHash({budget:(await f.r.budget.get()).data(),acceptance:(await f.r.acceptance.get()).data(),draft:(await f.r.draft.get()).data()}),before);assert.deepEqual((await legacy.get()).data(),{marker:'LEGACY_LEDGER_UNCHANGED'});assert.deepEqual((await financialRef(db,f.id,1).get()).data()!.installments,state.installments);
 assert.equal((await db.collection('ledger_movimientos').get()).size,0);assert.equal((await db.collection('ledger_imputaciones').get()).size,0);
 console.log('FINANCIAL_V2_EMULATOR=PASS; PARTIAL_FULL_PAYMENTS=PASS; FIFO=PASS; RECEIPTS_REVERSALS=PASS; IDEMPOTENCY_CONCURRENCY_ABORT=PASS; OVERDUE_NO_SURCHARGES=PASS; ROLE_ISOLATION=PASS; ORIGINAL_SCHEDULE_PRESERVED=PASS; LEGACY_MUTATIONS=0; PRODUCTION_WRITES=0');
}
if(process.argv[1]?.endsWith('testOperationFinancialV2Emulator.ts'))main().then(()=>admin.app().delete()).catch(e=>{console.error(e instanceof assert.AssertionError?{message:e.message,stack:e.stack?.split('\n').filter(l=>l.trim().startsWith('at '))}:e);process.exitCode=1;});
