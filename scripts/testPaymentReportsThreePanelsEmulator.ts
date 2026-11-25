import './helpers/requireSafeEmulatorEnvironment';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { admin } from '../src/lib/firebaseAdmin';
import { approvedFinalPackages } from '../src/lib/productionV2/catalog';
import { productionRuntimeForEmulator } from '../src/lib/productionV2/runtime';
import { productionReadyFixture } from './helpers/productionAdapterFixtures';
import { productionPaths } from '../src/lib/productionV2/freeze';
import { contractCommand } from '../src/lib/contractV2Server';
import { prepareClientProposal } from '../src/lib/clientProposalServer';
import { readLoopTariffs, saveLoopTariffs } from '../src/lib/loopServiceTariffsServer';
import { loopReferenceTariffs } from '../src/lib/loopServiceTariffs';
import { issueContractEditor } from '../src/lib/productionV2/simpleIssuance';
import { argentinaBusinessDate } from '../src/lib/productionV2/businessDate';
import { getBudgetDocumentationBucket } from '../src/lib/budgetDocumentationStorage';
import { financialCommand, financialRef, readFinancial } from '../src/lib/operationFinancialV2Server';
import { readPaymentReports, submitPaymentReport, decidePaymentReport, pendingPaymentReports } from '../src/lib/operationPaymentReportsServer';
import { paymentReportRef, reportDigest, bankReferenceKey } from '../src/lib/operationPaymentReportStore';
import { paymentAmountCents } from '../src/lib/operationPaymentReports';
import { clientBindingCommand, readClientBinding, listClientServices, clientBindingRef } from '../src/lib/operationClientV2Server';
import { withAdminCommissionAccess } from '../src/lib/affiliateCommissionAccess';
import { affiliateSettlementCommand } from '../src/lib/affiliateSettlementAdmin';
import { obtenerLedgerCustodiaEfectivo, registrarRendicionEfectivo, listRemittanceCollections, previewSelectedCashRemittance } from '../src/lib/settlementsEngine';
import { paymentReportsHandler, paymentReportsQueue } from '../src/lib/operationPaymentReportsHttp';
import { resolveAlertAction } from '../src/lib/budgetAlertRouting';
import { startProductionBrowserServer } from './helpers/productionAdapterBrowserServer';
import type { Transaction, ReadWriteTransactionOptions, ReadOnlyTransactionOptions } from 'firebase-admin/firestore';
import { p1Token } from './testPortalP1Emulator';
import { financialHandler } from '../src/lib/operationFinancialV2Http';

async function main(){
 assert.equal(process.env.FIREBASE_STORAGE_EMULATOR_HOST,'127.0.0.1:9199');
 assert.equal(process.env.STORAGE_EMULATOR_HOST,'http://127.0.0.1:9199');
 for(const [s,n] of [['0,01',1],['1234.56',123456],['145000',14500000]] as const)assert.equal(paymentAmountCents(s),n);
 for(const s of ['0','-1','1e3','1.001','12.000,50','NaN','Infinity','9999999999999999'])assert.throws(()=>paymentAmountCents(s));
 const db=admin.firestore(),password='Emulator-only-123';
 let actor:string;try{actor=(await admin.auth().getUserByEmail(process.env.NEXT_PUBLIC_ADMIN_EMAIL!)).uid;await admin.auth().updateUser(actor,{password,emailVerified:true,disabled:false});}catch{actor=(await admin.auth().createUser({email:process.env.NEXT_PUBLIC_ADMIN_EMAIL,password,emailVerified:true})).uid;}
 const root={uid:actor,admin:true},p=approvedFinalPackages[0],runtime=productionRuntimeForEmulator(db,admin.auth(),[p],[actor]),bucket=await getBudgetDocumentationBucket();
 if(!(await db.doc(productionPaths.counter).get()).exists)await db.doc(productionPaths.counter).create({schemaVersion:'CONTRACT_NUMBER_COUNTER_V1',policyId:'CONTRACT_NUMBERING_V1',executionMode:'PRODUCTION',active:true,lastAllocatedSequence:'0',initializationAuthorizationReference:'SYNTHETIC_ONLY'});
 const currentTariffs=await readLoopTariffs(db);await saveLoopTariffs(db,loopReferenceTariffs,currentTariffs.revision,actor);
 async function fixture(){
  const f=await productionReadyFixture(actor,true,true);
  const cmd=(action:string,extra:Record<string,unknown>={})=>contractCommand(db,f.id,1,{action,commandId:randomUUID(),expectedRevision:0,...extra},actor);
  await cmd('RETURN_TO_DRAFT',{expectedRevision:(await f.r.draft.get()).data()!.revision,reason:'Preparación sintética del paquete actual'});
  const d=(await f.r.draft.get()).data()!,tariff=await readLoopTariffs(db),today=argentinaBusinessDate();
  await cmd('SAVE_CONTRACT_EDITOR',{expectedRevision:d.revision,personalData:d.personalData,employmentData:d.employmentData,productDetails:d.productDetails,contractPlanCuotas:12,firstInstallmentDueDate:'2026-12-05',preferredMonthlyDueDay:9,issuePlace:'Localidad sintética',loopServices:{category:'C',tariffRevision:tariff.revision,otherServicesCents:0,cftAnnualPercent:null,cftBasis:'',supplierTaxId:'20123456786',notePaymentPlace:'Domicilio sintético de pago',noteDueDate:'2027-11-09',acceptanceChannel:'WHATSAPP',proposalSentAt:today+'T09:00',clientAcceptedAt:today+'T09:10'}});
  const proposal=await prepareClientProposal(db,f.id,1,{commandId:randomUUID(),expectedRevision:(await f.r.draft.get()).data()!.revision},actor);
  await cmd('RECORD_CLIENT_CONFORMITY',{expectedRevision:(await f.r.draft.get()).data()!.revision,proposalCommandId:proposal.commandId,evidence:'Respuesta sintética conservada para pruebas, sin cliente real.'});
  const issued=await issueContractEditor(runtime,bucket,f.id,1,{commandId:randomUUID(),expectedRevision:(await f.r.draft.get()).data()!.revision,confirmed:true},actor);
  const snapshot=(await db.collection(productionPaths.snapshots).doc(issued.snapshotId).get()).data()!;
  return {...f,firstCents:Math.round(snapshot.paymentSchedule.installments[0].amount*100)};
 }

 const f=await fixture(),seller={uid:f.uid,admin:false},outsider={uid:f.uid2,admin:false};
 const clientUser=await admin.auth().createUser({email:`payment-client-${randomUUID()}@example.test`,password,emailVerified:true}),client={uid:clientUser.uid,admin:false};
 const binding=await readClientBinding(db,f.id,1,actor);
 await clientBindingCommand(db,f.id,1,{action:'LINK',commandId:randomUUID(),operationId:f.identity.operationId,expectedRevision:binding.state.revision,data:{uid:client.uid,reason:'Vínculo explícito sintético de prueba'}},actor);
 assert.equal((await listClientServices(db,client.uid))[0].financialInformationAvailable,false);
 await assert.rejects(readFinancial(db,f.id,1,client,'CLIENT'));
 const payload=(amount=f.firstCents,method='EFECTIVO')=>({commandId:randomUUID(),operationId:f.identity.operationId,amountCents:amount,method,effectiveDate:argentinaBusinessDate(),reference:'SYNTHETIC-'+randomUUID(),cashRecipient:method==='EFECTIVO'?'AFFILIATE':null});
 const report=payload();
 await assert.rejects(submitPaymentReport(db,f.id,1,report,outsider,'AFFILIATE'));
 const submitted=await Promise.all([1,2,3].map(()=>submitPaymentReport(db,f.id,1,report,seller,'AFFILIATE'))),rid=submitted[0].reportId;
 assert.equal(submitted.filter(x=>!x.replayed).length,1);assert(!(await financialRef(db,f.id,1).get()).exists);
 assert.equal((await obtenerLedgerCustodiaEfectivo(db,f.affiliateId)).efectivoPendienteRendicionCentavos,0);
 assert.equal((await db.collection('comisiones_movimientos').where('operationId','==',f.identity.operationId).get()).size,0);
 await assert.rejects(submitPaymentReport(db,f.id,1,{...report,amountCents:1},seller,'AFFILIATE'));
 for(const amountCents of [-1,0,1.1,Number.MAX_SAFE_INTEGER+1])await assert.rejects(submitPaymentReport(db,f.id,1,{...payload(),amountCents},seller,'AFFILIATE'));
 await paymentReportRef(db,rid).update({solicitudId:'another-synthetic-request'});
 await assert.rejects(readPaymentReports(db,f.id,1,client,'CLIENT'));
 await paymentReportRef(db,rid).update({solicitudId:f.b.solicitudId});
 const clientView=await readPaymentReports(db,f.id,1,client,'CLIENT');assert.equal(clientView.reports[0].status,'PENDING');assert.equal(clientView.reports[0].reference,null);assert.equal(clientView.reports[0].paymentId,null);assert(!('reporter' in clientView.reports[0]));assert(!JSON.stringify(clientView).includes('SECRET_'));
 const alert=(await db.collection('alertas_admin').doc(rid).get()).data()!;assert.equal(resolveAlertAction(alert)?.href,`/admin/operaciones/${f.id}/1?section=payments`);
 const oldDirect={operationId:f.identity.operationId,expectedRevision:0,commandId:randomUUID(),action:'ACTIVATE_WITH_FIRST_PAYMENT',data:{paymentId:randomUUID(),amountCents:f.firstCents,method:'EFECTIVO',cashCustody:'AFFILIATE',effectiveDate:argentinaBusinessDate(),reference:'OLD_SELLER_TAB'}};
 await assert.rejects(financialCommand(db,f.id,1,oldDirect,seller,'AFFILIATE'));
 const decision={action:'CONFIRM',reportId:rid,expectedRevision:1,commandId:randomUUID(),financialRevision:0,reference:report.reference};
 await assert.rejects(decidePaymentReport(db,f.id,1,decision,seller));
 // A create collision late in the final transaction must roll back report, account, receipt and cash together.
 const evt=paymentReportRef(db,rid).collection('events').doc('report_confirm_'+reportDigest([decision.commandId,rid]));await evt.create({syntheticCollision:true});
 await assert.rejects(decidePaymentReport(db,f.id,1,decision,root));assert(!(await financialRef(db,f.id,1).get()).exists);assert.equal((await paymentReportRef(db,rid).get()).data()!.status,'PENDING');assert.equal((await obtenerLedgerCustodiaEfectivo(db,f.affiliateId)).efectivoPendienteRendicionCentavos,0);await evt.delete();
 const confirmed=await Promise.all([1,2,3].map(()=>decidePaymentReport(db,f.id,1,decision,root)));assert.equal(confirmed.filter(x=>!('replay' in x&&x.replay)).length,1);
 assert.equal((await financialRef(db,f.id,1).collection('payments').get()).size,1);assert.equal((await financialRef(db,f.id,1).collection('receipts').get()).size,1);
 const view=await readFinancial(db,f.id,1,client,'CLIENT');assert(view.active);assert.equal(view.paidCents,f.firstCents);assert.equal(view.paidInstallmentCount,1);
 assert.equal((await obtenerLedgerCustodiaEfectivo(db,f.affiliateId)).efectivoPendienteRendicionCentavos,f.firstCents);assert.equal((await readPaymentReports(db,f.id,1,client,'CLIENT')).reports[0].status,'CONFIRMED');assert.equal((await db.collection('alertas_admin').doc(rid).get()).data()!.resuelta,true);
 const beforeRemittance=(await financialRef(db,f.id,1).get()).data();
 const remittance={vendedorAfiliadoId:f.affiliateId,vendedorAfiliadoEmail:`${f.uid}@example.test`,montoRendidoCentavos:f.firstCents,metodoEntrega:'EFECTIVO',adminUid:actor,idempotencyKey:randomUUID(),comprobanteReferencia:'ENTREGA SINTÉTICA'};
 await registrarRendicionEfectivo(db,remittance);await registrarRendicionEfectivo(db,remittance);assert.equal((await obtenerLedgerCustodiaEfectivo(db,f.affiliateId)).efectivoPendienteRendicionCentavos,0);assert.deepEqual((await financialRef(db,f.id,1).get()).data(),beforeRemittance);
 async function direct(amount:number,reference:string){const state=(await financialRef(db,f.id,1).get()).data()!;return financialCommand(db,f.id,1,{action:'CREDIT_PAYMENT',operationId:f.identity.operationId,expectedRevision:state.revision,commandId:randomUUID(),data:{paymentId:randomUUID(),amountCents:amount,method:'TRANSFERENCIA',reference,effectiveDate:argentinaBusinessDate()}},root);}
 const bank='BANK-'+randomUUID(),credited=await direct(10001,bank);await assert.rejects(direct(10001,' '+bank.toLowerCase()+' '));
 const transfer=payload(10001,'TRANSFERENCIA'),tr=await submitPaymentReport(db,f.id,1,transfer,seller,'AFFILIATE');
 const state=(await financialRef(db,f.id,1).get()).data()!;
 await assert.rejects(decidePaymentReport(db,f.id,1,{action:'CONFIRM',reportId:tr.reportId,expectedRevision:1,commandId:randomUUID(),financialRevision:state.revision,reference:bank},root));
 const link={action:'LINK',reportId:tr.reportId,expectedRevision:1,commandId:randomUUID(),paymentId:credited.paymentId,note:'Transferencia ya asignada por Administración'};
 await decidePaymentReport(db,f.id,1,link,root);await decidePaymentReport(db,f.id,1,link,root);assert.equal((await financialRef(db,f.id,1).get()).data()!.accounting.paymentCount,2);
 assert.equal((await obtenerLedgerCustodiaEfectivo(db,f.affiliateId)).efectivoPendienteRendicionCentavos,0);
 await financialCommand(db,f.id,1,{action:'REVERSE_PAYMENT',operationId:f.identity.operationId,expectedRevision:state.revision,commandId:randomUUID(),data:{paymentId:credited.paymentId,reason:'Reversa sintética de conciliación'}},root);
 assert.equal((await readPaymentReports(db,f.id,1,client,'CLIENT')).reports.find(x=>x.id===tr.reportId)!.status,'REVERSED');
 await direct(10001,bank); // A verified reversal releases only its own transfer identifier.
 const partial=await submitPaymentReport(db,f.id,1,payload(1,'TRANSFERENCIA'),client,'CLIENT');
 const revision=(await financialRef(db,f.id,1).get()).data()!.revision;
 const race=await Promise.allSettled([
  decidePaymentReport(db,f.id,1,{action:'CONFIRM',reportId:partial.reportId,expectedRevision:1,commandId:randomUUID(),financialRevision:revision,reference:'CENT-'+randomUUID()},root),
  decidePaymentReport(db,f.id,1,{action:'REJECT',reportId:partial.reportId,expectedRevision:1,commandId:randomUUID(),note:'Rechazo sintético concurrente'},root)
 ]);assert.equal(race.filter(x=>x.status==='fulfilled').length,1);
 const rs=(await paymentReportRef(db,partial.reportId).get()).data()!;
 assert.equal((await financialRef(db,f.id,1).collection('payments').doc('reported_'+partial.reportId).get()).exists,rs.status==='CONFIRMED');
 // Transfers confirmed from a report create no seller cash movement; cents remain exact.
 const sellerTransfer=await submitPaymentReport(db,f.id,1,payload(12345,'TRANSFERENCIA'),seller,'AFFILIATE');
 await decidePaymentReport(db,f.id,1,{action:'CONFIRM',reportId:sellerTransfer.reportId,expectedRevision:1,commandId:randomUUID(),financialRevision:(await financialRef(db,f.id,1).get()).data()!.revision,reference:'BANK-REPORT-'+randomUUID()},root);
 assert.equal((await obtenerLedgerCustodiaEfectivo(db,f.affiliateId)).efectivoPendienteRendicionCentavos,0);
 const current=await readFinancial(db,f.id,1,client,'CLIENT');assert(current.active);assert.equal(current.paidCents,f.firstCents+10001+12345+(rs.status==='CONFIRMED'?1:0));
 await assert.rejects(financialCommand(db,f.id,1,{action:'REVERSE_PAYMENT',operationId:f.identity.operationId,expectedRevision:current.revision,commandId:randomUUID(),data:{paymentId:'reported_'+rid,reason:'Efectivo rendido no disponible'}},root));
 // Same bank identifier cannot be credited in a different operation.
 const second=await fixture();await assert.rejects(financialCommand(db,second.id,1,{...oldDirect,operationId:second.identity.operationId,commandId:randomUUID(),data:{paymentId:randomUUID(),amountCents:second.firstCents,method:'TRANSFERENCIA',reference:bank,effectiveDate:argentinaBusinessDate()}},root));
 // Rejects access to every HTTP route without authorization; role-specific report contents remain server-only.
 assert.equal((await paymentReportsHandler(new Request('http://localhost/test'),f.id,'1','CLIENT')).status,403);
 assert.equal((await paymentReportsQueue(new Request('http://localhost/test'))).status,403);
 const unknown=await admin.auth().createUser({email:`unknown-${randomUUID()}@example.test`,emailVerified:true});await assert.rejects(readPaymentReports(db,f.id,1,{uid:unknown.uid,admin:false},'CLIENT'));
 await clientBindingRef(db,f.id,1).update({state:'REVOKED'});await assert.rejects(readPaymentReports(db,f.id,1,client,'CLIENT'));await clientBindingRef(db,f.id,1).update({state:'ACTIVE'});
 await db.collection('vendedores').doc(f.affiliateId).update({activo:false});await assert.rejects(submitPaymentReport(db,f.id,1,payload(),seller,'AFFILIATE'));await db.collection('vendedores').doc(f.affiliateId).update({activo:true});
 // The same net-remittance path verifies real V2 commission snapshots and leaves customer payments intact.
 const extraCash=await submitPaymentReport(db,f.id,1,payload(10000,'EFECTIVO'),seller,'AFFILIATE');
 await decidePaymentReport(db,f.id,1,{action:'CONFIRM',reportId:extraCash.reportId,expectedRevision:1,commandId:randomUUID(),financialRevision:(await financialRef(db,f.id,1).get()).data()!.revision,reference:'V2-CASH-FOR-NET-REMIT'},root);
 const pendingCash=await withAdminCommissionAccess(db,actor,false,()=>listRemittanceCollections(db,f.affiliateId));assert.equal(pendingCash.collections.length,1);
 const remittanceQuote=await withAdminCommissionAccess(db,actor,false,()=>previewSelectedCashRemittance(db,f.affiliateId,{collectionIds:[pendingCash.collections[0].id],deductCommission:true}));assert.equal(remittanceQuote.grossCents,10000);assert.equal(remittanceQuote.commissionRetainedCents,1000);assert.equal(remittanceQuote.receivedCents,9000);
 const unchangedFinancial=(await financialRef(db,f.id,1).get()).data();
 await affiliateSettlementCommand(db,f.affiliateId,actor,{action:'REMIT_REVIEWED',commandId:randomUUID(),data:{collectionIds:remittanceQuote.collectionIds,deductCommission:true,previewHash:remittanceQuote.hash,method:'TRANSFERENCIA',reference:'RENDITION-V2-NET-SYNTHETIC',notes:''}});
 assert.deepEqual((await financialRef(db,f.id,1).get()).data(),unchangedFinancial);assert.equal((await obtenerLedgerCustodiaEfectivo(db,f.affiliateId)).efectivoPendienteRendicionCentavos,0);
 // Bounded pagination must neither omit nor duplicate reports as the operation grows.
 const suffixForPage=randomUUID();
 const template=(await paymentReportRef(db,rid).get()).data()!,ids=Array.from({length:52},(_,i)=>'report_page_'+suffixForPage+'_'+i);
 const setup=db.batch();for(const id of ids)setup.create(paymentReportRef(db,id),{...template,id,status:'PENDING',revision:1,paymentId:null,decidedAt:null,decidedBy:null,decisionNote:null});await setup.commit();
 const seen:string[]=[];let cursor:string|undefined;do{const page=await readPaymentReports(db,f.id,1,client,'CLIENT',cursor);assert(page.reports.length<=50);seen.push(...page.reports.map(r=>r.id));cursor=page.nextCursor||undefined;}while(cursor);
 assert.equal(new Set(seen).size,seen.length);assert(ids.every(id=>seen.includes(id)));const cleanup=db.batch();for(const id of ids)cleanup.delete(paymentReportRef(db,id));await cleanup.commit();
 const queue=await pendingPaymentReports(db);assert(Array.isArray(queue.reports));
 const claim=(await db.collection('presupuestos_v2').doc('_financial_transfer_ids_v1').collection('contracts').doc(bankReferenceKey(bank)).get()).data()!;assert.equal(claim.state,'ACTIVE');
 // Reproduce the exact closed-read failure at the second budget read. A fresh
 // transaction must recover without a report/alert, payment or cash duplication.
 const recovery=await fixture(),recoverySeller={uid:recovery.uid,admin:false};
 const recoveryBody={...payload(recovery.firstCents),operationId:recovery.identity.operationId};
 const originalRun=db.runTransaction;let starts=0,budgetReads=0,failed=false;
 function faultReads(permanent=false){
  db.runTransaction=async function<T>(update:(tx:Transaction)=>Promise<T>,options?:ReadWriteTransactionOptions|ReadOnlyTransactionOptions){
   starts++;
   return (originalRun.bind(db) as typeof db.runTransaction)<T>(tx=>update(new Proxy(tx,{get(target,key){const value=Reflect.get(target,key);if(key==='get')return (...args:unknown[])=>{
    if((args[0] as {path?:string}).path===recovery.r.budget.path&&(permanent||++budgetReads===2)){
     failed=true;return Promise.reject(Object.assign(Error('3 INVALID_ARGUMENT: Transaction is invalid or closed.'),{code:3,details:'Transaction is invalid or closed.'}));
    }
    return Reflect.apply(value,target,args);
   };return typeof value==='function'?value.bind(target):value;}})),options);
  };
 }
 let recoveredReport:Awaited<ReturnType<typeof submitPaymentReport>>;
 faultReads();try{recoveredReport=await submitPaymentReport(db,recovery.id,1,recoveryBody,recoverySeller,'AFFILIATE');}finally{db.runTransaction=originalRun;}
 assert(failed);assert.equal(starts,2);assert.equal(recoveredReport!.replayed,false);
 assert.equal((await submitPaymentReport(db,recovery.id,1,recoveryBody,recoverySeller,'AFFILIATE')).replayed,true);
 assert(!(await financialRef(db,recovery.id,1).get()).exists);
 const adminToken=await p1Token({uid:actor}),sellerToken=await p1Token({uid:recovery.uid});
 const post=(body:unknown,role:'ADMIN'|'AFFILIATE'='ADMIN')=>paymentReportsHandler(new Request('http://localhost/test',{method:'POST',headers:{Authorization:`Bearer ${role==='ADMIN'?adminToken:sellerToken}`,'Content-Type':'application/json'},body:JSON.stringify(body)}),recovery.id,'1',role);
 starts=0;faultReads(true);
 try{
  const response=await post({...recoveryBody,commandId:randomUUID()},'AFFILIATE');assert.equal(response.status,503);assert(!JSON.stringify(await response.json()).includes('INVALID_ARGUMENT'));assert.equal(starts,3);
  const financialResponse=await financialHandler(new Request('http://localhost/test',{headers:{Authorization:`Bearer ${adminToken}`}}),recovery.id,'1','ADMIN');assert.equal(financialResponse.status,503);
 }finally{db.runTransaction=originalRun;}
 assert.equal((await paymentReportRef(db,recoveredReport!.reportId).parent.where('operationId','==',recovery.identity.operationId).get()).size,1);
 const recoveryDecision={action:'CONFIRM',reportId:recoveredReport!.reportId,expectedRevision:1,commandId:randomUUID(),financialRevision:0,reference:recoveryBody.reference};
 let lose=true;
 db.runTransaction=async function<T>(update:(tx:Transaction)=>Promise<T>,options?:ReadWriteTransactionOptions|ReadOnlyTransactionOptions){
  const result=await (originalRun.bind(db) as typeof db.runTransaction)<T>(update,options);
  if(lose&&(await financialRef(db,recovery.id,1).get()).exists){lose=false;throw Object.assign(Error('SYNTHETIC_RESPONSE_LOST_AFTER_PAYMENT_COMMIT'),{code:14});}
  return result;
 };
 try{assert.equal((await post(recoveryDecision)).status,503);}finally{db.runTransaction=originalRun;}
 assert.equal(lose,false);assert.equal((await post(recoveryDecision)).status,200);
 const recoveryAccount=await readFinancial(db,recovery.id,1,root,'ADMIN');assert(recoveryAccount.active);assert.equal(recoveryAccount.paidCents,recovery.firstCents);
 assert.equal((await financialRef(db,recovery.id,1).collection('payments').get()).size,1);assert.equal((await financialRef(db,recovery.id,1).collection('receipts').get()).size,1);
 assert.equal((await obtenerLedgerCustodiaEfectivo(db,recovery.affiliateId)).efectivoPendienteRendicionCentavos,recovery.firstCents);
 const recoveryCommissions=await db.collection('ledger_comisiones_movimientos').where('operationId','==',recovery.identity.operationId).get();assert.equal(recoveryCommissions.docs.reduce((sum,d)=>sum+d.data().montoComisionCentavos,0),Math.floor(recovery.firstCents/10));
 console.log('CLOSED_READ_RECOVERED_EXHAUSTED_503_AND_LOST_COMMIT_RESPONSE_SAME_COMMAND_SINGLE_PAYMENT_RECEIPT_COMMISSION_CASH = PASS');
 console.log('PAYMENT_REPORTS_THREE_PANELS_PENDING_CONFIRM_CASH_REMITTANCE_TRANSFER_LINK_RETRY_RACE_ROLLBACK_CENTS_ACCESS = PASS');
 if(process.env.PAYMENT_REPORTS_BROWSER==='1'){
  // Leave a pending report for manual browser QA using the real local route handlers.
  const demo=await submitPaymentReport(db,f.id,1,payload(725000,'EFECTIVO'),seller,'AFFILIATE');
  writeFileSync('/tmp/cuenta-hogar-payment-browser-fixture.json',JSON.stringify({budgetId:f.id,version:1,operationId:f.identity.operationId,reportId:demo.reportId,adminEmail:process.env.NEXT_PUBLIC_ADMIN_EMAIL,sellerEmail:`${f.uid}@example.test`,clientEmail:clientUser.email,password}));
  const server=await startProductionBrowserServer(runtime);console.log('PAYMENT_BROWSER_LOCAL_READY localhost:3000');
  await new Promise<void>(resolve=>{process.once('SIGINT',resolve);process.once('SIGTERM',resolve);});await server.stop();
 }
}
main().then(()=>admin.app().delete()).catch(e=>{console.error(e);process.exitCode=1;});
