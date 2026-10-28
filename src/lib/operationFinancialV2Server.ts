import {prepareAffiliateCollectionAlert} from './affiliateCollectionAlerts';
import {resolveCashCustodian,prepareCashCustody,cashCustodyOptions} from './operationCashCustody';
import {issuedPaymentProof} from './productionV2/issuedPaymentProof';
import {prepareClientActivationAtFirstPayment} from './operationClientV2Server';
import {argentinaBusinessDate} from './productionV2/businessDate';
import {operationRuntime,productionDeliveryProof,productionWriter,productionReader} from './productionV2/gates';
import {runtimeData} from './productionV2/runtime';
import {frozenOperation} from './productionV2/freeze';
import { preparePaymentCommissions } from './operationCommissionV2Server';
import { FieldPath, type Firestore, type Transaction } from 'firebase-admin/firestore';
import { createHash } from 'node:crypto';
import { admin } from './firebaseAdmin';
import { exact,opaque,stable } from './contractV2';
import { contractRefs } from './contractV2Server';
import { contractSnapshotId,validateContractSnapshot,type ContractSnapshotV2 } from './contractSnapshotV2';
import { contractValueHash } from './contractIntegrityV2';
import { allocateOperationPayment } from './operationFinancialAllocationV2';
import { custodyLoad,type CustodyActor } from './operationCustodyV2Server';
import { deliveryRef } from './operationDeliveryV2Server';
import { deliveryDocumentKinds,type DeliveryV2 } from './operationDeliveryV2';
import { clientBindingRef } from './operationClientV2Server';
import { FINANCIAL_POLICY,cents,financialEnabled,financialFail,financialDate,financialSummary,parseFinancialCommand,requireFinancialEmulator,type FinancialState,type FinancialPayment } from './operationFinancialV2';
import { verifyEvidenceObject,assertVerifiedEvidence,type VerifiedEvidence,type EvidenceMetadata } from './operationEvidenceV2';
export type FinancialRole='ADMIN'|'AFFILIATE'|'CLIENT';
export const financialRef=(db:Firestore,id:string,v:number)=>deliveryRef(db,id,v).parent.doc('financial');
// No route writes this approval. Test fixtures explicitly attest synthetic documents only.
export const financialApprovalRef=(db:Firestore,id:string,v:number)=>deliveryRef(db,id,v).parent.doc('financialApprovalFixture');
async function context(db:Firestore,tx:Transaction,id:string,v:number,actor:CustodyActor,role:FinancialRole){
 if(role==='ADMIN'&&!actor.admin||role!=='ADMIN'&&actor.admin)financialFail('Rol no autorizado.');
 const base=await custodyLoad(db,tx,id,v,{...actor,admin:role!=='AFFILIATE'});
 if(role==='CLIENT'){const binding=(await tx.get(clientBindingRef(db,id,v))).data();const u=await admin.auth().getUser(actor.uid).catch(()=>financialFail());if(u.disabled||!u.emailVerified||binding?.uid!==actor.uid||binding?.state!=='ACTIVE'||binding.operationId!==base.source.identity.operationId)financialFail('Servicio no disponible para esta cuenta.');}
 const ref=financialRef(db,id,v),saved=await tx.get(ref),state=saved.exists?saved.data() as FinancialState:null;
 if(state&&(state.schemaVersion!=='OPERATION_FINANCIAL_V2'||state.policy!==FINANCIAL_POLICY||!['EMULATOR_ONLY','PRODUCTION'].includes(state.executionMode)||state.operationId!==base.source.identity.operationId||!Number.isSafeInteger(state.revision)))financialFail();
 if(state?.activationBasis&&(state.activationBasis.policy!=='FIRST_PAYMENT_BEFORE_DELIVERY_V1'||!/^([a-f0-9]{64})$/.test(state.activationBasis.issuedManifestHash)||state.executionMode!=='PRODUCTION'||state.deliveryCommandId!==null))financialFail('Origen financiero inválido.');
 const runtime=await operationRuntime(db,tx,id,v);if(runtime)await productionReader(runtime,actor);if(state&&((state.executionMode==='PRODUCTION')!==!!runtime||state.executionMode==='PRODUCTION'&&(!state.approvalAuthorizationId||state.approvalFixtureId)))financialFail('Modo financiero incompatible.');
 return {...base,ref,financial:state,runtime};
}
async function activationProof(db:Firestore,tx:Transaction,id:string,v:number,base:Awaited<ReturnType<typeof context>>,verified?:Map<string,VerifiedEvidence>,firstPayment=false){
 if(base.runtime&&(firstPayment||base.financial?.activationBasis?.policy==='FIRST_PAYMENT_BEFORE_DELIVERY_V1')){const proof=await issuedPaymentProof(base.runtime,tx,id,v,verified);if(base.financial?.activationBasis&&(base.financial.activationBasis.issuedManifestHash!==proof.manifest.hash||base.financial.deliveryCommandId!==null))financialFail('Origen de activación financiera inconsistente.');return proof;}
 if(firstPayment)financialFail('El primer pago anticipado requiere documentos productivos emitidos.');
 if(base.runtime)return productionDeliveryProof(base.runtime,tx,id,v,'FINANCE',true,verified);
 const files=new Map<string,EvidenceMetadata>();
 requireFinancialEmulator();const identity=base.source.identity,sid=contractSnapshotId({budgetId:id,budgetVersion:v,contractDraftId:identity.contractDraftId,acceptedOptionId:identity.acceptedOptionId}),r=contractRefs(db,id,v);
 const [ss,ds,ap,dr]=await Promise.all([tx.get(db.collection('contractSnapshotsV2').doc(sid)),tx.get(deliveryRef(db,id,v)),tx.get(financialApprovalRef(db,id,v)),tx.get(r.draft)]);
 const snapshot=ss.data();validateContractSnapshot(snapshot);const s:ContractSnapshotV2=snapshot,d=ds.data() as DeliveryV2|undefined,a=ap.data(),draft=dr.data();
 if(s.contractSnapshotId!==sid||stable(s.sourceDraft.budgetId)!==stable(id)||s.sourceDraft.budgetVersion!==v||s.sourceDraft.acceptedOptionId!==identity.acceptedOptionId||s.origin.sourceCollection!==identity.sourceCollection||s.origin.solicitudId!==identity.solicitudId||s.freeze.state!=='TERMS_FROZEN'||draft?.status!=='TERMS_FROZEN'||draft.emulatorFreeze?.receipt?.snapshotHash!==s.integrity.payloadHash||draft.emulatorFreeze?.receipt?.snapshotId!==sid)financialFail('Se requiere snapshot congelado V2 vinculado al borrador.');
 const [b,ac]=await Promise.all([tx.get(r.budget),tx.get(r.acceptance)]);if(contractValueHash(b.data())!==s.origin.budgetHash||contractValueHash(ac.data())!==s.origin.acceptanceHash)financialFail('Origen contractual cambiado.');
 if(!d||d.operationId!==identity.operationId||d.status!=='DELIVERED_EMULATOR'||d.event?.operationId!==identity.operationId||d.event.executionMode!=='EMULATOR_ONLY'||!d.originals||d.originalsTransfer||base.state.current||base.state.pending||base.fulfillment.deliveryClosure!=='DELIVERED_EMULATOR'||base.state.incidents.some(i=>!i.resolvedAt)||base.fulfillment.incidents.some(i=>!i.resolvedAt)||d.holds.some(h=>!h.clearedAt))financialFail('Falta entrega efectiva y custodia documental completa.');
 if(a?.schemaVersion!=='EMULATOR_FINANCIAL_APPROVAL_V1'||a.project!=='demo-cuenta-hogar'||a.executionMode!=='EMULATOR_ONLY'||a.approval!=='SYNTHETIC_APPROVED_ONLY'||a.operationId!==identity.operationId||a.snapshotHash!==s.integrity.payloadHash||a.deliveryCommandId!==d.event.commandId||a.snapshotId!==sid)financialFail('Aprobación sintética aislada requerida; no equivale a aprobación jurídica real.');
 for(const k of deliveryDocumentKinds){const doc=d.documents[k];if(!doc.prepared||!doc.signature?.clientSigned||!doc.signature.legible||!doc.signature.identityChecked||a.documentHashes?.[k]!==doc.prepared.sha256||d.originals.documentHashes[k]!==doc.prepared.sha256||stable(doc)!==stable(d.event.documents[k]))financialFail('Firmas o versiones documentales incompletas.');
  for(const [photoId,hash,slot,related]of [[doc.prepared.photoId,doc.prepared.sha256,`${k}_PREPARED`,''],[doc.signature.photoId,doc.signature.sha256,`${k}_SIGNED`,doc.prepared.photoId]]){const p=(await tx.get(deliveryRef(db,id,v).collection('photos').doc(photoId))).data();if(!p||p.state!=='COMMITTED'||p.sha256!==hash||p.slot!==slot||p.relatedId!==related||p.path!==`operation-delivery-v2/${id}/v${v}/${photoId}`)financialFail('Evidencia privada inconsistente.');files.set(p.path,p as EvidenceMetadata);if(verified)assertVerifiedEvidence(p as EvidenceMetadata,verified.get(p.path));}
 }
 return {snapshot:s,delivery:d,files};
}
function verifyProjection(s:FinancialState,snapshot:ContractSnapshotV2){if(s.snapshotHash!==snapshot.integrity.payloadHash||s.snapshotId!==snapshot.contractSnapshotId||s.contractNumber!==snapshot.contractNumber||s.capitalCents!==cents(snapshot.economicTerms.capitalAmount)||s.serviceCents!==cents(snapshot.economicTerms.serviceAmount)||s.totalCents!==cents(snapshot.economicTerms.contractTotal)||stable(s.installments)!==stable(snapshot.paymentSchedule.installments.map(i=>({number:i.installmentNumber,dueDate:i.dueDate,amountCents:cents(i.amount)}))))financialFail('Proyección diferente del snapshot original.');}
function customerReceipt(p:FinancialPayment,s:FinancialState){return {receiptId:p.receiptId,paymentId:p.id,operationId:s.operationId,contractNumber:s.contractNumber,snapshotHash:s.snapshotHash,amountCents:p.amountCents,effectiveDate:p.effectiveDate,issuedAt:p.recordedAt,method:p.method,allocations:p.allocations,status:p.reversedAt?'REVERSADO':'ACREDITADO',reversedAt:p.reversedAt,executionMode:s.executionMode};}
const HISTORY_PAGE_SIZE=50,LEGACY_HISTORY_LIMIT=500;
function validatePayment(value:FinancialPayment,id:string,s:FinancialState){
 if(value.id!==id||!Number.isSafeInteger(value.amountCents)||value.amountCents<=0||!Array.isArray(value.allocations)||value.allocations.some(a=>!Number.isSafeInteger(a.amountCents)||a.amountCents<=0||!s.installments.some(i=>i.number===a.installmentNumber))||new Set(value.allocations.map(a=>a.installmentNumber)).size!==value.allocations.length||value.allocations.reduce((n,a)=>n+a.amountCents,0)!==value.amountCents||value.receiptId!==`receipt_${id}`)financialFail('Pago inconsistente.');return value;
}
async function paymentHistory(tx:Transaction,ref:ReturnType<typeof financialRef>,s:FinancialState,cursor?:string){
 let lastId:string|undefined,lastAt:string|undefined;
 if(cursor){try{const p=JSON.parse(Buffer.from(cursor,'base64url').toString());if(p.operationId!==s.operationId||p.revision!==s.revision||typeof p.id!=='string'||typeof p.at!=='string'||new Date(p.at).toISOString()!==p.at)financialFail('El historial cambió. Actualizá para continuar.');lastId=opaque(p.id);lastAt=p.at;}catch{financialFail('Página de historial inválida o desactualizada.');}}
 const limit=s.accounting?HISTORY_PAGE_SIZE:LEGACY_HISTORY_LIMIT;
 let query=ref.collection('payments').orderBy('recordedAt','desc').orderBy(FieldPath.documentId(),'desc').limit(limit+1);if(lastId)query=query.startAfter(lastAt,lastId);
 const ps=await tx.get(query);if(!s.accounting&&ps.size>LEGACY_HISTORY_LIMIT)financialFail('Historial anterior requiere conciliación explícita antes de continuar.');
 const payments=ps.docs.slice(0,limit).map(p=>validatePayment(p.data() as FinancialPayment,p.id,s));
 if(!s.accounting){const receipts=await tx.get(ref.collection('receipts').limit(LEGACY_HISTORY_LIMIT+1));if(receipts.size!==payments.length)financialFail('Recibos históricos inconsistentes.');}
 const rs=await Promise.all(payments.map(p=>tx.get(ref.collection('receipts').doc(p.receiptId))));
 if(payments.some((p,i)=>stable(rs[i].data()||null)!==stable(customerReceipt(p,s))))financialFail('Recibo no coincide con pago acreditado.');
 return {payments,nextCursor:ps.size>limit?Buffer.from(JSON.stringify({operationId:s.operationId,revision:s.revision,id:payments.at(-1)!.id,at:payments.at(-1)!.recordedAt})).toString('base64url'):null};
}
/** One authorized, persisted receipt; never calculated by the browser. */
export async function readFinancialReceipt(db:Firestore,id:string,v:number,actor:CustodyActor,role:FinancialRole,receiptId:string){
 opaque(receiptId);if(!receiptId.startsWith('receipt_'))financialFail('Recibo inválido.');
 return db.runTransaction(async tx=>{
  const c=await context(db,tx,id,v,actor,role),s=c.financial;if(!s)financialFail('Sin pagos acreditados.');
  if(c.runtime)await frozenOperation(c.runtime,tx,id,v,'FINANCE',false);else requireFinancialEmulator();
  const snapshot=(await tx.get(db.collection('contractSnapshotsV2').doc(s.snapshotId))).data();validateContractSnapshot(snapshot);verifyProjection(s,snapshot);
  const paymentId=opaque(receiptId.slice(8)),p=(await tx.get(c.ref.collection('payments').doc(paymentId))).data();
  if(!p)financialFail('Pago no disponible.');const payment=validatePayment(p as FinancialPayment,paymentId,s),receipt=customerReceipt(payment,s);
  if(stable((await tx.get(c.ref.collection('receipts').doc(receiptId))).data()??null)!==stable(receipt))financialFail('Recibo inconsistente.');
  return {receipt,clientName:snapshot.personalData.fullName,issuer:snapshot.issuer,test:!c.runtime||runtimeData(c.runtime).test};
 });
}
function accountingSummary(s:FinancialState,payments:FinancialPayment[],asOf?:string){
 if(!s.accounting)return financialSummary(s,payments,asOf);
 const a=s.accounting;if(a.schemaVersion!=='FINANCIAL_BALANCES_V1'||!Number.isSafeInteger(a.paymentCount)||a.paymentCount<0||a.paidByInstallment.length!==s.installments.length||a.paidByInstallment.some((p,i)=>!Number.isSafeInteger(p)||p<0||p>s.installments[i].amountCents))financialFail('Saldo acumulado inconsistente.');
 return financialSummary(s,[{allocations:s.installments.map((i,n)=>({installmentNumber:i.number,amountCents:a.paidByInstallment[n]})),reversedAt:null}],asOf);
}
export async function readFinancial(db:Firestore,id:string,v:number,actor:CustodyActor,role:FinancialRole,cursor?:string){
 return db.runTransaction(async tx=>{const c=await context(db,tx,id,v,actor,role);let productionMutation=false,firstInstallmentCents:number|null=null;if(c.runtime&&role!=='CLIENT'){try{await productionWriter(c.runtime,actor);const proof=await activationProof(db,tx,id,v,c,undefined,!c.financial);firstInstallmentCents=cents(proof.snapshot.paymentSchedule.installments[0].amount);productionMutation=true;}catch{/* Preserve authorized reads while new commands are blocked. */}}const mutationEnabled=c.runtime?productionMutation:financialEnabled()&&role!=='CLIENT';const cashOptions=role!=='CLIENT'?await cashCustodyOptions(db,tx,c.state.assignment):undefined;if(!c.financial)return {active:false as const,...(cashOptions?{cashOptions}:{}),...(c.source.identity.operationId?{operationId:c.source.identity.operationId}:{}),executionMode:c.runtime?'PRODUCTION' as const:'EMULATOR_ONLY' as const,mutationEnabled,firstInstallmentCents,blockReason:productionMutation?'Podés registrar la primera cuota recibida. Se activa el cronograma emitido sin declarar firmas ni entrega.':'Primero emití el mandato y el pagaré y verificá la habilitación administrativa.'};
 // Frozen hash is rechecked on every view; never project private reference or personal fields.
 if(c.runtime)await frozenOperation(c.runtime,tx,id,v,'FINANCE',false);else requireFinancialEmulator();const snapshot=(await tx.get(db.collection('contractSnapshotsV2').doc(c.financial.snapshotId))).data();validateContractSnapshot(snapshot);verifyProjection(c.financial,snapshot);
 const s=c.financial,page=await paymentHistory(tx,c.ref,s,cursor),payments=page.payments,asOfDate=argentinaBusinessDate(),summary=accountingSummary(s,payments,asOfDate);
 const binding=role==='ADMIN'?(await tx.get(clientBindingRef(db,id,v))).data():null;
 return {active:true as const,...(cashOptions?{cashOptions}:{}),...(role==='ADMIN'?{clientPortalStatus:binding?.state==='ACTIVE'?'ACTIVE':binding?.state==='REVOKED'?'REVOKED':'ACCOUNT_LINK_REQUIRED'}:{}),mutationEnabled,operationId:s.operationId,revision:s.revision,contractNumber:s.contractNumber,executionMode:s.executionMode,snapshotHash:s.snapshotHash,activatedAt:s.activatedAt,asOfDate,...summary,nextCursor:page.nextCursor,receipts:payments.map(p=>customerReceipt(p,s)),...(role==='ADMIN'?{capitalCents:s.capitalCents,serviceCents:s.serviceCents,history:payments}:{}),blockReason:c.runtime?'Importes del contrato emitido. Los recibos acreditan pagos; no sustituyen comprobantes fiscales.':'Demostración en Emulator. Cobranza productiva deshabilitada; revisión jurídica pendiente.'};});
}
export async function financialCommand(db:Firestore,id:string,v:number,input:unknown,actor:CustodyActor,role:'ADMIN'|'AFFILIATE'='ADMIN'){
 const runtime=await db.runTransaction(tx=>operationRuntime(db,tx,id,v));if(runtime)await productionWriter(runtime,actor);else requireFinancialEmulator();if(role==='ADMIN'&&!actor.admin||role==='AFFILIATE'&&actor.admin)financialFail('Rol de cobro no autorizado.');
 const c=parseFinancialCommand(input);if(role==='AFFILIATE'&&(!['CREDIT_PAYMENT','ACTIVATE_WITH_FIRST_PAYMENT'].includes(c.action)||c.data.method!=='EFECTIVO'||c.data.cashCustody!=='AFFILIATE'))financialFail('El vendedor afiliado sólo puede registrar efectivo bajo su custodia.');const ref=financialRef(db,id,v),receipt=ref.collection('commands').doc(c.commandId),digest=createHash('sha256').update(stable({c,actor:actor.uid})).digest('hex');
 // Authorize and capture metadata first; no Storage I/O runs in either transaction.
 const files=await db.runTransaction(async tx=>{const base=await context(db,tx,id,v,actor,role),prior=await tx.get(receipt);if(prior.exists){if(prior.data()!.digest!==digest)financialFail('Conflicto de commandId.');return new Map<string,EvidenceMetadata>();}return (await activationProof(db,tx,id,v,base,undefined,c.action==='ACTIVATE_WITH_FIRST_PAYMENT')).files;});
 const verified=new Map<string,VerifiedEvidence>();
 if(files.size){const {getBudgetDocumentationBucket}=await import('./budgetDocumentationStorage');const bucket=await getBudgetDocumentationBucket();for(const [path,p] of files)verified.set(path,await verifyEvidenceObject(bucket,p));}
 return db.runTransaction(async tx=>{
 if(!runtime)requireFinancialEmulator();const base=await context(db,tx,id,v,actor,role),prior=await tx.get(receipt);if(c.operationId!==base.source.identity.operationId)financialFail('Operación incorrecta.');if(prior.exists){if(prior.data()!.digest!==digest)financialFail('Conflicto de commandId.');return {...prior.data()!.result,replay:true};}
 if((base.financial?.revision||0)!==c.expectedRevision)financialFail('Conflicto de revisión. Recargá.');
 const proof=await activationProof(db,tx,id,v,base,verified,c.action==='ACTIVATE_WITH_FIRST_PAYMENT'),now=new Date().toISOString(),data=c.data;
 let s=base.financial,created:FinancialPayment|null=null,reversed:FinancialPayment|null=null;
 const firstPayment=c.action==='ACTIVATE_WITH_FIRST_PAYMENT';
 if(c.action==='ACTIVATE'||firstPayment){
  if(!firstPayment)exact(data,[]);if(s)financialFail('Cobranza ya activada.');const snapshot=proof.snapshot;
  const installments=snapshot.paymentSchedule.installments.map(i=>({number:i.installmentNumber,dueDate:i.dueDate,amountCents:cents(i.amount)}));const total=cents(snapshot.economicTerms.contractTotal),capital=cents(snapshot.economicTerms.capitalAmount),service=cents(snapshot.economicTerms.serviceAmount);
  if(installments.reduce((n,i)=>n+i.amountCents,0)!==total||capital+service!==total||installments.length!==snapshot.economicTerms.contractPlanCuotas)financialFail('Cronograma inconsistente.');
  s={schemaVersion:'OPERATION_FINANCIAL_V2',policy:FINANCIAL_POLICY,executionMode:runtime?'PRODUCTION':'EMULATOR_ONLY',operationId:c.operationId,revision:1,snapshotId:snapshot.contractSnapshotId,snapshotHash:snapshot.integrity.payloadHash,contractNumber:snapshot.contractNumber,capitalCents:capital,serviceCents:service,totalCents:total,installments,activatedAt:now,activatedBy:actor.uid,deliveryCommandId:proof.delivery?.event?.commandId??null,...(firstPayment&&'manifest' in proof?{activationBasis:{policy:'FIRST_PAYMENT_BEFORE_DELIVERY_V1' as const,issuedManifestHash:proof.manifest.hash}}:{}),...(runtime&&proof.snapshot.freeze.readinessPolicyVersion==='CONTRACT_PRODUCTION_APPROVAL_V1'?{approvalAuthorizationId:proof.snapshot.freeze.authorizationId}:{approvalFixtureId:financialApprovalRef(db,id,v).id}),accounting:{schemaVersion:'FINANCIAL_BALANCES_V1',paymentCount:0,paidByInstallment:installments.map(()=>0)}};
 }
 if(c.action!=='ACTIVATE'){
  if(!s||s.snapshotHash!==proof.snapshot.integrity.payloadHash)financialFail('Cobranza no activada o snapshot diferente.');
  verifyProjection(s,proof.snapshot);
  const payments=s.accounting?[]:(await paymentHistory(tx,ref,s)).payments;
  const summary=accountingSummary(s,payments);
  if(c.action==='CREDIT_PAYMENT'||firstPayment){
   exact(data,['paymentId','amountCents','effectiveDate','method','reference',...(Object.hasOwn(data,'cashCustody')?['cashCustody']:[])]);const pid=opaque(data.paymentId);if((await tx.get(ref.collection('payments').doc(pid))).exists)financialFail('Pago ya registrado. Reintentá el commandId original.');
   if(!Number.isSafeInteger(data.amountCents)||Number(data.amountCents)<=0||!['TRANSFERENCIA','EFECTIVO'].includes(String(data.method))||typeof data.reference!=='string'||!data.reference.trim()||data.reference.length>200)financialFail('Datos de pago inválidos.');
   const amount=Number(data.amountCents),summary=accountingSummary(s,payments),effectiveDate=financialDate(data.effectiveDate);if(amount>summary.balanceCents)financialFail('El pago supera el saldo contractual.');if(firstPayment&&amount!==s.installments[0].amountCents)financialFail('El importe debe coincidir con la primera cuota del contrato.');if(s.activationBasis){if(effectiveDate<proof.snapshot.documentContext.contractIssueDate||effectiveDate>argentinaBusinessDate())financialFail('Fecha de pago fuera del período de emisión vigente.');}else if(!proof.delivery?.event||effectiveDate<proof.delivery.event.occurredAt.slice(0,10))financialFail('Pago anterior a entrega efectiva.');
   // Reuse legacy FIFO allocation order/partial amounts, never its source lookup, tax split, commissions or writers.
   const allocations=allocateOperationPayment(summary,amount);
   const cashCustody=await resolveCashCustodian(db,tx,actor,base.state.assignment,data);
   created={...(cashCustody?{cashCustody}:{}),id:pid,amountCents:amount,effectiveDate,recordedAt:now,actor:actor.uid,method:data.method as FinancialPayment['method'],reference:data.reference.trim(),allocations,reversedAt:null,reversedBy:null,reversalReason:null,receiptId:`receipt_${pid}`};
  }else{
   exact(data,['paymentId','reason']);const pid=opaque(data.paymentId),saved=await tx.get(ref.collection('payments').doc(pid)),p=saved.exists?validatePayment(saved.data() as FinancialPayment,pid,s):null;if(p){const r=await tx.get(ref.collection('receipts').doc(p.receiptId));if(stable(r.data()||null)!==stable(customerReceipt(p,s)))financialFail('Recibo inconsistente.');}if(!p||p.reversedAt||typeof data.reason!=='string'||!data.reason.trim()||data.reason.length>500)financialFail('Pago no reversible o motivo ausente.');reversed={...p,reversedAt:now,reversedBy:actor.uid,reversalReason:data.reason.trim()};
  }
  const paid=summary.installments.map(i=>i.paidCents),change=created||reversed;
  if(change)for(const a of change.allocations){const index=s.installments.findIndex(i=>i.number===a.installmentNumber);paid[index]+=a.amountCents*(created?1:-1);}
  s={...s,revision:s.revision+1,accounting:{schemaVersion:'FINANCIAL_BALANCES_V1',paymentCount:(s.accounting?.paymentCount??payments.length)+(created?1:0),paidByInstallment:paid}};
  accountingSummary(s,[]);
 }
 if(!s)financialFail('Cobranza no activada.');
 const clientActivation=firstPayment?await prepareClientActivationAtFirstPayment(db,tx,id,v,actor.uid,c.commandId,now):null;
 const cashWrites=await prepareCashCustody(db,tx,{created,reversed,operationId:s.operationId,budgetId:id,version:v,actor:actor.uid,at:now});
 const commissionWrites=created||reversed?await preparePaymentCommissions(db,tx,{operationId:s.operationId,budgetId:id,version:v,assignment:base.state.assignment,clientName:proof.snapshot.personalData.fullName,productName:proof.snapshot.acceptedReference.nombre,payment:(created||reversed)!,reversal:!!reversed,actor:actor.uid,at:now,affiliateActor:role==='AFFILIATE'},runtime??undefined):()=>{};
 const alertWrite=role==='AFFILIATE'&&created?await prepareAffiliateCollectionAlert(db,tx,{identity:base.source.identity,assignment:base.state.assignment,actor:actor.uid,commandId:c.commandId,clientName:proof.snapshot.personalData.fullName,event:{kind:'PAYMENT',paymentId:created.id,amountCents:created.amountCents,effectiveDate:created.effectiveDate,contractNumber:s.contractNumber}}):()=>{};
 const result={revision:s.revision,paymentId:created?.id||reversed?.id||null,replay:false,...(clientActivation?{clientPortal:clientActivation.status}:{})};
 clientActivation?.write();commissionWrites();cashWrites();alertWrite();tx.set(ref,s);if(created){tx.create(ref.collection('payments').doc(created.id),created);tx.create(ref.collection('receipts').doc(created.receiptId),customerReceipt(created,s));}if(reversed){tx.set(ref.collection('payments').doc(reversed.id),reversed);tx.set(ref.collection('receipts').doc(reversed.receiptId),customerReceipt(reversed,s));}
 tx.create(receipt,{digest,result,actor:actor.uid,at:now});tx.create(ref.collection('events').doc(c.commandId),{commandId:c.commandId,operationId:c.operationId,action:c.action,expectedRevision:c.expectedRevision,revision:s.revision,actor:actor.uid,at:now,data,evidenceGenerations:Object.fromEntries([...verified].map(([path,p])=>[path,p.generation])),snapshotHash:s.snapshotHash});return result;
 });
}
