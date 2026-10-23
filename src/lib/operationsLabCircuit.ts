import { fiscalProjection } from './fiscalV2';
import { createHash } from 'node:crypto';
import { labRepository, type LabExecutionContext } from './operationsLabContext';
import { LabError, labCommand } from './operationsLabPolicy';
import { labBudget, labAcceptance, labReadySource, validateLabDraftSettings, type LabDraftSettings } from './operationsLabScenario';
import { contractValueHash } from './contractIntegrityV2';
import { operationFromAcceptance } from './operationV2';
import { freezeLabContract, validateLabSnapshot, validateLabNumberBinding, verifyLabReadyAudit, type LabSnapshot } from './operationsLabFreeze';
import { renderLabDocuments } from './operationsLabDocuments';
import { cents, financialSummary, type FinancialPayment, type FinancialInstallment } from './operationFinancialV2';
import { allocateOperationPayment } from './operationFinancialAllocationV2';
import { deliveryChecklistState } from './operationDeliveryV2Server';
import { initialDelivery, deliveryDocumentKinds } from './operationDeliveryV2';
import { initialCustody } from './operationCustodyV2';
import { initialFulfillment, nextFulfillment } from './operationFulfillmentV2';
import type { BudgetV2 } from './budgetV2';
import type { BudgetAcceptanceV2 } from './budgetAcceptanceV2';
export const labActions=['CREATE_REQUEST','ISSUE_BUDGET','ACCEPT','REVIEW_SYNTHETIC_DATA','UPDATE_DRAFT','READY','FREEZE','DOCUMENTS','SIGN_MANDATE','SIGN_PAGARE','SIGN_REMITO','CUSTODY','DELIVER','ACTIVATE','PAY','REVERSE'] as const;
export type LabAction=typeof labActions[number];
interface Workflow { revision:number;stage:string;operationId:string|null;budget:BudgetV2|null;acceptance:BudgetAcceptanceV2|null }
interface LabLedger { schemaVersion:'LAB_LEDGER_V1';snapshotHash:string;totalCents:number;installments:FinancialInstallment[];payments:FinancialPayment[];revision:number }
function fail(code:string):never{throw new LabError(409,code);}
function value<T>(record:FirebaseFirestore.DocumentData|null):T|null{return record?.value as T??null;}
function validateLedger(ledger:LabLedger,snapshot:LabSnapshot){
 const d=snapshot.source.draft,expected=d.paymentScheduleDraft.map(i=>({number:i.installmentNumber,dueDate:i.dueDate,amountCents:cents(i.amount)}));
 if(ledger.schemaVersion!=='LAB_LEDGER_V1'||ledger.snapshotHash!==snapshot.hash||ledger.totalCents!==cents(d.economicTerms!.contractTotal)||contractValueHash(ledger.installments)!==contractValueHash(expected)||ledger.payments.length>48||new Set(ledger.payments.map(p=>p.id)).size!==ledger.payments.length)fail('LAB_LEDGER_INVALID');
 for(const p of ledger.payments)if(!Number.isSafeInteger(p.amountCents)||p.amountCents<=0||p.receiptId!=='receipt_'+p.id||!Array.isArray(p.allocations)||new Set(p.allocations.map(a=>a.installmentNumber)).size!==p.allocations.length||p.allocations.some(a=>!Number.isSafeInteger(a.amountCents)||a.amountCents<=0||!expected.some(i=>i.number===a.installmentNumber))||p.allocations.reduce((n,a)=>n+a.amountCents,0)!==p.amountCents)fail('LAB_PAYMENT_INVALID');
 financialSummary(ledger,ledger.payments);
}
function simulatedFiscal(snapshot:LabSnapshot){
 return fiscalProjection({operationId:snapshot.operationId,snapshotId:'lab-snapshot',snapshotHash:snapshot.hash,date:snapshot.source.readyEvidence.reviewedAt.slice(0,10),documentClass:'B',kind:'INVOICE',pointOfSale:99998,receiverStatus:'FINAL_CONSUMER',associatedId:null,policy:{id:'SYNTHETIC_21_PERCENT_INCLUDED',version:1,validFrom:'2000-01-01',validTo:null,confirmedBy:'SYNTHETIC_POLICY_NOT_ACCOUNTANT_APPROVAL',reference:'Sólo laboratorio: IVA incluido del 21 %, sin CAE ni conexión ARCA',issuerStatus:'RI',allowedClasses:['B'],concepts:{CONTRACT_SERVICES:{treatment:'TAXED',rateBps:2100,basis:'GROSS_INCLUDED',reference:'SIMULACIÓN EXPLÍCITA'}}},lines:[{concept:'CONTRACT_SERVICES',grossCents:cents(snapshot.source.draft.economicTerms!.serviceAmount)}]});
}
export async function readLabCircuit(context:LabExecutionContext){
 return labRepository(context).transaction(async tx=>{
  const workflow=value<Workflow>(await tx.read('contracts','workflow'));
  if(!workflow)return {workflow:null,financial:null,documents:[],delivery:null,settings:null};
  const settings=await tx.read('contracts','draft-settings');
  const id=workflow.operationId;
  const [frozen,ledger,delivery]=id?await Promise.all([tx.read('snapshots',id),tx.read('ledger',id),tx.read('delivery',id)]):[null,null,null];
  if(frozen){validateLabSnapshot(context,frozen.value);await verifyLabReadyAudit(tx,context,frozen.value.source);validateLabNumberBinding(frozen.value,await tx.read('numberReservations',id!));}
  const l=value<LabLedger>(ledger);
  if(l){if(!frozen)fail('LAB_LEDGER_INVALID');validateLedger(l,frozen.value);for(const payment of l.payments){const receipt=await tx.read('receipts',payment.receiptId);if(!receipt||receipt.snapshotHash!==l.snapshotHash||contractValueHash(receipt.value)!==contractValueHash(payment))fail('LAB_RECEIPT_INVALID');}}
  return {settings:settings?.value as LabDraftSettings|undefined??null,workflow:{revision:workflow.revision,stage:frozen&&workflow.stage==='READY'?'FROZEN':workflow.stage,operationId:id},financial:l?{...financialSummary(l,l.payments),payments:l.payments,revision:l.revision,fiscal:simulatedFiscal(frozen!.value)}:null,documents:delivery?.documentHashes?Object.keys(delivery.documentHashes):[],delivery:delivery?{delivered:delivery.delivered===true,signatures:delivery.signatures??{},custody:delivery.custody===true}:null};
 });
}
export async function labCircuitCommand(context:LabExecutionContext,raw:unknown){
 if(!raw||typeof raw!=='object'||Array.isArray(raw))throw new LabError(400,'LAB_COMMAND_INVALID');
 const input=raw as {commandId:string;action:LabAction;expectedRevision:number;amountCents?:number;settings?:LabDraftSettings};
 labCommand({commandId:input.commandId});
 if(!['action,commandId,expectedRevision',...(input.action==='PAY'?['action,amountCents,commandId,expectedRevision']:[]),...(input.action==='UPDATE_DRAFT'?['action,commandId,expectedRevision,settings']:[])].includes(Object.keys(input).sort().join())||!labActions.includes(input.action)||!Number.isSafeInteger(input.expectedRevision)||input.expectedRevision<0)throw new LabError(400,'LAB_COMMAND_INVALID');
 const repo=labRepository(context),digest=contractValueHash({...input,owner:context.ownerUid,session:context.sessionId});
 if(input.action==='FREEZE'){
  const w=value<Workflow>(await repo.read('contracts','workflow'));
  const prior=await repo.read('commands',input.commandId);
  if(!w?.operationId||!prior&&(w.stage!=='READY'||w.revision!==input.expectedRevision))fail('LAB_STAGE_CONFLICT');
  const source=await repo.read('contracts',w.operationId);
  await freezeLabContract(context,{commandId:input.commandId,operationId:w.operationId,expectedRevision:source!.source.draft.revision,requestRevision:input.expectedRevision});
  return readLabCircuit(context);
 }
 // PDF rendering is outside the transaction. Its snapshot hash is checked again before commit.
 const before=input.action==='DOCUMENTS'?value<Workflow>(await repo.read('contracts','workflow')):null;
 const rendered=before?.operationId?await renderLabDocuments(context,before.operationId):null;
 await repo.transaction(async tx=>{
  const [prior,saved]=await Promise.all([tx.read('commands',input.commandId),tx.read('contracts','workflow')]);
  if(prior){if(prior.digest!==digest)fail('LAB_COMMAND_CONFLICT');return;}
  let w=value<Workflow>(saved)??{revision:0,stage:'EMPTY',operationId:null,budget:null,acceptance:null};
  if(w.revision!==input.expectedRevision)fail('LAB_REVISION_CONFLICT');
  w=structuredClone(w);
  const now=new Date().toISOString(),actor=context.ownerUid,id=w.operationId;
  const [frozen,deliveryRecord,ledgerRecord]=id?await Promise.all([tx.read('snapshots',id),tx.read('delivery',id),tx.read('ledger',id)]):[null,null,null];
  if(frozen){validateLabSnapshot(context,frozen.value);await verifyLabReadyAudit(tx,context,frozen.value.source);validateLabNumberBinding(frozen.value,await tx.read('numberReservations',id!));}
  if(frozen&&deliveryRecord?.delivered){
   if(deliveryRecord.snapshotHash!==frozen.value.hash||deliveryRecord.custody!==true)fail('LAB_DELIVERY_INVALID');
   for(const kind of deliveryDocumentKinds){const doc=await tx.read('documents',id+'_'+kind);if(!doc||doc.snapshotHash!==frozen.value.hash||doc.value.sha256!==deliveryRecord.documentHashes[kind]||deliveryRecord.signatures?.[kind]?.hash!==doc.value.sha256||deliveryRecord.signatures[kind].synthetic!==true||createHash('sha256').update(Buffer.from(doc.value.base64,'base64')).digest('hex')!==doc.value.sha256)fail('LAB_DELIVERY_EVIDENCE_INVALID');}
  }
  const draftSettings=value<LabDraftSettings>(await tx.read('contracts','draft-settings'));
  const stage=(expected:string)=>{if(w.stage!==expected)fail('LAB_STAGE_CONFLICT');};
  const writes:Array<()=>void>=[];let affectedPaymentId:string|null=null;let technicalReview:Record<string,unknown>|null=null,technicalEvent:Record<string,unknown>|null=null;
  if(input.action==='CREATE_REQUEST'){stage('EMPTY');writes.push(()=>tx.create('requests','origin',{name:'Cliente sintético del laboratorio',product:'Lavarropas sintético',locality:'Localidad sintética',whatsapp:'5491100000000',at:now}));w.stage='REQUEST';}
  else if(input.action==='ISSUE_BUDGET'){stage('REQUEST');w.budget=labBudget(context,now);w.stage='BUDGET';}
  else if(input.action==='ACCEPT'){stage('BUDGET');w.acceptance=labAcceptance(w.budget!,actor,now,input.commandId);w.operationId=operationFromAcceptance(w.acceptance).operationId;w.stage='ACCEPTED';}
  else if(input.action==='REVIEW_SYNTHETIC_DATA'){stage('ACCEPTED');w.stage='REVIEWED';}
  else if(input.action==='UPDATE_DRAFT'){stage('REVIEWED');const settings=validateLabDraftSettings(input.settings);writes.push(()=>tx.replace('contracts','draft-settings',{value:settings}));}
  else if(input.action==='READY'){stage('REVIEWED');const source=labReadySource(w.budget!,w.acceptance!,actor,now,input.commandId,draftSettings??undefined);technicalReview=source.reviewCommand;technicalEvent=source.reviewEvent;writes.push(()=>tx.create('contracts',w.operationId!,{state:'READY',source}));w.stage='READY';}
  else if(input.action==='DOCUMENTS'){
   stage('READY');if(!frozen||!rendered||rendered.snapshotHash!==frozen.value.hash)fail('LAB_SNAPSHOT_REQUIRED');
   const hashes:Record<string,string>={};
   for(const [kind,pdf]of Object.entries({MANDATE:rendered.mandate,PAGARE:rendered.promissoryNote,REMITO:rendered.remito})){if(Buffer.byteLength(pdf.base64,'base64')>600000)fail('LAB_DOCUMENT_TOO_LARGE');hashes[kind]=pdf.sha256;writes.push(()=>tx.create('documents',id+'_'+kind,{value:pdf,snapshotHash:frozen.value.hash,kind,operationId:id}));}
   writes.push(()=>tx.create('delivery',id!,{snapshotHash:frozen.value.hash,documentHashes:hashes,signatures:{},custody:false,delivered:false}));w.stage='DOCUMENTS';
  }else if(input.action.startsWith('SIGN_')||input.action==='CUSTODY'||input.action==='DELIVER'){
   stage('DOCUMENTS');if(!frozen||!deliveryRecord||deliveryRecord.snapshotHash!==frozen.value.hash||deliveryRecord.delivered)fail('LAB_DELIVERY_INVALID');
   const {labContext:_context,...delivery}=deliveryRecord;void _context;
   for(const kind of deliveryDocumentKinds){const doc=await tx.read('documents',id+'_'+kind);if(!doc||doc.snapshotHash!==frozen.value.hash||doc.value.sha256!==delivery.documentHashes[kind]||createHash('sha256').update(Buffer.from(doc.value.base64,'base64')).digest('hex')!==doc.value.sha256)fail('LAB_DOCUMENT_INTEGRITY');}
   if(input.action.startsWith('SIGN_')){const kind=input.action.slice(5);if(delivery.signatures[kind])fail('LAB_SIGNATURE_ALREADY_RECORDED');delivery.signatures={...delivery.signatures,[kind]:{synthetic:true,hash:delivery.documentHashes[kind],at:now,actor}};}
   if(input.action==='CUSTODY'){if(delivery.custody)fail('LAB_CUSTODY_ALREADY_RECORDED');delivery.custody=true;delivery.custodian=actor;delivery.custodyAt=now;}
   if(input.action==='DELIVER'){
    const d=initialDelivery(id!),c=initialCustody(id!),s=frozen.value.source,holder={uid:actor,role:'DEPOT' as const,affiliateId:null};
    d.responsible=holder;c.current=holder;c.location='Depósito sintético';
    let f=initialFulfillment(id!,s.draft.acceptedReferenceSnapshot.nombre,null,s.draft.economicTerms.capitalAmount);
    // Exercise the existing provider/logistics transition engine, never jump its states.
    const date=now.slice(0,10);
    const sequence=[['UPDATE_ORDER',{providerName:'Proveedor sintético',providerReference:'TEST',estimatedAvailabilityDate:date,notes:'SIMULACIÓN'}],['PLACE_ORDER',{orderDate:date}],['CONFIRM_ORDER',{actualCost:580000,confirmedAvailabilityDate:date}],['READY_FOR_PICKUP',{}],['RECORD_PICKUP',{actualPickupDate:date,pickupResponsible:'Custodio sintético'}],['RECEIVE',{actualReceiptDate:date,custodyLocation:'Depósito sintético',custodian:'Custodio sintético',visualCondition:'SIN_DANOS_VISIBLES',notes:'SIMULACIÓN'}],['PLAN_TRIP',{tripReference:'TEST',plannedTripDate:date,carrier:'Transporte sintético'}],['PLAN_DELIVERY',{destinationLocality:'Localidad sintética',estimatedDeliveryDate:date,deliveryResponsible:'Custodio sintético'}]] as const;
    for(const[action,data]of sequence)f=nextFulfillment(f,{action,data,operationId:id!,expectedRevision:f.revision,commandId:input.commandId},actor,now);
    for(const k of deliveryDocumentKinds){d.documents[k].prepared={photoId:'synthetic-'+k,sha256:delivery.documentHashes[k],reference:'TEST',templateVersion:'CURRENT_TEST',by:actor,at:now};if(delivery.signatures[k])d.documents[k].signature={photoId:'signature-'+k,sha256:contractValueHash(delivery.signatures[k]),clientSigned:true,legible:true,identityChecked:true,loopSigned:false,signedAt:now,verifiedBy:actor,verifiedAt:now};}
    if(delivery.custody)d.originals={holder,location:'Custodia sintética',receivedAt:now,reference:'TEST',documentHashes:delivery.documentHashes as Record<typeof deliveryDocumentKinds[number],string>};
    if(deliveryChecklistState(d,c,f).length)fail('LAB_DELIVERY_REQUIREMENTS_MISSING');
    delivery.delivered=true;delivery.deliveredAt=now;delivery.commandId=input.commandId;delivery.evidence={documents:d.documents,originals:d.originals,responsible:d.responsible};delivery.logistics=f;w.stage='DELIVERED';
   }
   writes.push(()=>tx.replace('delivery',id!,delivery));
  }else if(input.action==='ACTIVATE'){
   stage('DELIVERED');if(ledgerRecord||!frozen||deliveryRecord?.delivered!==true||deliveryRecord.snapshotHash!==frozen.value.hash)fail('LAB_ACTIVATION_REJECTED');
   const d=(frozen.value as LabSnapshot).source.draft,installments=d.paymentScheduleDraft.map(i=>({number:i.installmentNumber,dueDate:i.dueDate,amountCents:cents(i.amount)}));
   const ledger:LabLedger={schemaVersion:'LAB_LEDGER_V1',snapshotHash:frozen.value.hash,totalCents:cents(d.economicTerms!.contractTotal),installments,payments:[],revision:1};
   if(installments.reduce((n,i)=>n+i.amountCents,0)!==ledger.totalCents)fail('LAB_SCHEDULE_INVALID');
   writes.push(()=>tx.create('ledger',id!,{value:ledger}));w.stage='ACTIVE';
  }else if(input.action==='PAY'||input.action==='REVERSE'){
   stage('ACTIVE');const ledger=value<LabLedger>(ledgerRecord);
   if(!ledger||ledger.schemaVersion!=='LAB_LEDGER_V1'||!frozen||ledger.snapshotHash!==frozen.value.hash||deliveryRecord?.delivered!==true)fail('LAB_LEDGER_INVALID');
   validateLedger(ledger,frozen.value);
   const summary=financialSummary(ledger,ledger.payments);
   if(input.action==='PAY'){
    if(ledger.payments.length>=48)fail('LAB_PAYMENT_HISTORY_LIMIT');
    const amount=input.amountCents??14500000;if(!Number.isSafeInteger(amount)||amount<=0)fail('LAB_PAYMENT_AMOUNT_INVALID');if(summary.balanceCents<amount)fail('LAB_PAYMENT_EXCEEDS_BALANCE');
    const allocations=allocateOperationPayment(summary,amount);
    const payment:FinancialPayment={id:input.commandId,amountCents:amount,effectiveDate:now.slice(0,10),recordedAt:now,actor,method:'TRANSFERENCIA',reference:'PAGO SINTÉTICO — SIN TRANSFERENCIA REAL',allocations,reversedAt:null,reversedBy:null,reversalReason:null,receiptId:'receipt_'+input.commandId};ledger.payments.push(payment);affectedPaymentId=payment.id;
    writes.push(()=>tx.create('receipts',payment.receiptId,{value:payment,snapshotHash:ledger.snapshotHash,operationId:id,mode:'SYNTHETIC_ONLY'}));
   }else{const payment=ledger.payments.findLast(p=>!p.reversedAt);if(!payment)fail('LAB_PAYMENT_NOT_REVERSIBLE');affectedPaymentId=payment.id;payment.reversedAt=now;payment.reversedBy=actor;payment.reversalReason='REVERSA SINTÉTICA';writes.push(()=>tx.replace('receipts',payment.receiptId,{value:payment,snapshotHash:ledger.snapshotHash,operationId:id,mode:'SYNTHETIC_ONLY'}));}
   ledger.revision++;financialSummary(ledger,ledger.payments);writes.push(()=>tx.replace('ledger',id!,{value:ledger}));
  }else fail('LAB_ACTION_INVALID');
  w.revision++;writes.forEach(write=>write());tx.replace('contracts','workflow',{value:w});
  tx.create('commands',input.commandId,{digest,action:input.action,expectedRevision:input.expectedRevision,revision:w.revision,operationId:w.operationId,paymentId:affectedPaymentId,actor,at:now,...(technicalReview?{technicalReview,technicalEvent}:{})});tx.create('events',input.commandId,{action:input.action,expectedRevision:input.expectedRevision,revision:w.revision,operationId:w.operationId,paymentId:affectedPaymentId,actor,at:now,synthetic:true,...(input.action==='UPDATE_DRAFT'?{settings:input.settings}:{})});
 });
 return readLabCircuit(context);
}
