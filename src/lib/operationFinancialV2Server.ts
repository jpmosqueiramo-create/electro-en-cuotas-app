import type { Firestore,Transaction } from 'firebase-admin/firestore';
import { createHash } from 'node:crypto';
import { admin } from './firebaseAdmin';
import { exact,opaque,stable } from './contractV2';
import { contractRefs } from './contractV2Server';
import { contractSnapshotId,validateContractSnapshot,type ContractSnapshotV2 } from './contractSnapshotV2';
import { contractValueHash } from './contractIntegrityV2';
import { calcularImputacionesFIFO,type EstadoCuotaDerivado } from './ledgerEngine';
import { custodyLoad,type CustodyActor } from './operationCustodyV2Server';
import { deliveryRef } from './operationDeliveryV2Server';
import { deliveryDocumentKinds,type DeliveryV2 } from './operationDeliveryV2';
import { clientBindingRef } from './operationClientV2Server';
import { FINANCIAL_POLICY,cents,financialEnabled,financialFail,financialDate,financialSummary,parseFinancialCommand,requireFinancialEmulator,type FinancialState,type FinancialPayment } from './operationFinancialV2';
export type FinancialRole='ADMIN'|'AFFILIATE'|'CLIENT';
export const financialRef=(db:Firestore,id:string,v:number)=>deliveryRef(db,id,v).parent.doc('financial');
// No route writes this approval. Test fixtures explicitly attest synthetic documents only.
export const financialApprovalRef=(db:Firestore,id:string,v:number)=>deliveryRef(db,id,v).parent.doc('financialApprovalFixture');
async function context(db:Firestore,tx:Transaction,id:string,v:number,actor:CustodyActor,role:FinancialRole){
 if(role==='ADMIN'&&!actor.admin||role!=='ADMIN'&&actor.admin)financialFail('Rol no autorizado.');
 const base=await custodyLoad(db,tx,id,v,{...actor,admin:role!=='AFFILIATE'});
 if(role==='CLIENT'){const binding=(await tx.get(clientBindingRef(db,id,v))).data();const u=await admin.auth().getUser(actor.uid).catch(()=>financialFail());if(u.disabled||!u.emailVerified||binding?.uid!==actor.uid||binding?.state!=='ACTIVE'||binding.operationId!==base.source.identity.operationId)financialFail('Servicio no disponible para esta cuenta.');}
 const ref=financialRef(db,id,v),saved=await tx.get(ref),state=saved.exists?saved.data() as FinancialState:null;
 if(state&&(state.schemaVersion!=='OPERATION_FINANCIAL_V2'||state.policy!==FINANCIAL_POLICY||state.executionMode!=='EMULATOR_ONLY'||state.operationId!==base.source.identity.operationId||!Number.isSafeInteger(state.revision)))financialFail();
 return {...base,ref,financial:state};
}
async function activationProof(db:Firestore,tx:Transaction,id:string,v:number,base:Awaited<ReturnType<typeof context>>){
 requireFinancialEmulator();const identity=base.source.identity,sid=contractSnapshotId({budgetId:id,budgetVersion:v,contractDraftId:identity.contractDraftId,acceptedOptionId:identity.acceptedOptionId}),r=contractRefs(db,id,v);
 const [ss,ds,ap,dr]=await Promise.all([tx.get(db.collection('contractSnapshotsV2').doc(sid)),tx.get(deliveryRef(db,id,v)),tx.get(financialApprovalRef(db,id,v)),tx.get(r.draft)]);
 const snapshot=ss.data();validateContractSnapshot(snapshot);const s:ContractSnapshotV2=snapshot,d=ds.data() as DeliveryV2|undefined,a=ap.data(),draft=dr.data();
 if(s.contractSnapshotId!==sid||stable(s.sourceDraft.budgetId)!==stable(id)||s.sourceDraft.budgetVersion!==v||s.sourceDraft.acceptedOptionId!==identity.acceptedOptionId||s.origin.sourceCollection!==identity.sourceCollection||s.origin.solicitudId!==identity.solicitudId||s.freeze.state!=='TERMS_FROZEN'||draft?.status!=='TERMS_FROZEN'||draft.emulatorFreeze?.receipt?.snapshotHash!==s.integrity.payloadHash||draft.emulatorFreeze?.receipt?.snapshotId!==sid)financialFail('Se requiere snapshot congelado V2 vinculado al borrador.');
 const [b,ac]=await Promise.all([tx.get(r.budget),tx.get(r.acceptance)]);if(contractValueHash(b.data())!==s.origin.budgetHash||contractValueHash(ac.data())!==s.origin.acceptanceHash)financialFail('Origen contractual cambiado.');
 if(!d||d.operationId!==identity.operationId||d.status!=='DELIVERED_EMULATOR'||d.event?.operationId!==identity.operationId||d.event.executionMode!=='EMULATOR_ONLY'||!d.originals||d.originalsTransfer||base.state.current||base.state.pending||base.fulfillment.deliveryClosure!=='DELIVERED_EMULATOR'||base.state.incidents.some(i=>!i.resolvedAt)||base.fulfillment.incidents.some(i=>!i.resolvedAt)||d.holds.some(h=>!h.clearedAt))financialFail('Falta entrega efectiva y custodia documental completa.');
 if(a?.schemaVersion!=='EMULATOR_FINANCIAL_APPROVAL_V1'||a.project!=='demo-cuenta-hogar'||a.executionMode!=='EMULATOR_ONLY'||a.approval!=='SYNTHETIC_APPROVED_ONLY'||a.operationId!==identity.operationId||a.snapshotHash!==s.integrity.payloadHash||a.deliveryCommandId!==d.event.commandId||a.snapshotId!==sid)financialFail('Aprobación sintética aislada requerida; no equivale a aprobación jurídica real.');
 for(const k of deliveryDocumentKinds){const doc=d.documents[k];if(!doc.prepared||!doc.signature?.clientSigned||!doc.signature.legible||!doc.signature.identityChecked||a.documentHashes?.[k]!==doc.prepared.sha256||d.originals.documentHashes[k]!==doc.prepared.sha256||stable(doc)!==stable(d.event.documents[k]))financialFail('Firmas o versiones documentales incompletas.');
  for(const [photoId,hash,slot,related]of [[doc.prepared.photoId,doc.prepared.sha256,`${k}_PREPARED`,''],[doc.signature.photoId,doc.signature.sha256,`${k}_SIGNED`,doc.prepared.photoId]]){const p=(await tx.get(deliveryRef(db,id,v).collection('photos').doc(photoId))).data();if(!p||p.state!=='COMMITTED'||p.sha256!==hash||p.slot!==slot||p.relatedId!==related||p.path!==`operation-delivery-v2/${id}/v${v}/${photoId}`)financialFail('Evidencia privada inconsistente.');const {getBudgetDocumentationBucket}=await import('./budgetDocumentationStorage');const bucket=await getBudgetDocumentationBucket(),bytes=(await bucket.file(p.path).download())[0];if(bytes.length!==p.size||createHash('sha256').update(bytes).digest('hex')!==p.sha256)financialFail('Integridad fotográfica inválida.');}
 }
 return {snapshot:s,delivery:d};
}
function verifyProjection(s:FinancialState,snapshot:ContractSnapshotV2){if(s.snapshotHash!==snapshot.integrity.payloadHash||s.snapshotId!==snapshot.contractSnapshotId||s.contractNumber!==snapshot.contractNumber||s.capitalCents!==cents(snapshot.economicTerms.capitalAmount)||s.serviceCents!==cents(snapshot.economicTerms.serviceAmount)||s.totalCents!==cents(snapshot.economicTerms.contractTotal)||stable(s.installments)!==stable(snapshot.paymentSchedule.installments.map(i=>({number:i.installmentNumber,dueDate:i.dueDate,amountCents:cents(i.amount)}))))financialFail('Proyección diferente del snapshot original.');}
function customerReceipt(p:FinancialPayment,s:FinancialState){return {receiptId:p.receiptId,paymentId:p.id,operationId:s.operationId,contractNumber:s.contractNumber,snapshotHash:s.snapshotHash,amountCents:p.amountCents,effectiveDate:p.effectiveDate,issuedAt:p.recordedAt,method:p.method,allocations:p.allocations,status:p.reversedAt?'REVERSADO':'ACREDITADO',reversedAt:p.reversedAt,executionMode:'EMULATOR_ONLY'};}
async function paymentHistory(tx:Transaction,ref:ReturnType<typeof financialRef>,s:FinancialState){
 const [ps,rs]=await Promise.all([tx.get(ref.collection('payments')),tx.get(ref.collection('receipts'))]);const payments=ps.docs.map(p=>{const value=p.data() as FinancialPayment;if(value.id!==p.id||!Number.isSafeInteger(value.amountCents)||value.amountCents<=0||!Array.isArray(value.allocations)||value.allocations.some(a=>!Number.isSafeInteger(a.amountCents)||a.amountCents<=0||!s.installments.some(i=>i.number===a.installmentNumber))||new Set(value.allocations.map(a=>a.installmentNumber)).size!==value.allocations.length||value.allocations.reduce((n,a)=>n+a.amountCents,0)!==value.amountCents||value.receiptId!==`receipt_${p.id}`)financialFail('Pago inconsistente.');return value;});
 if(rs.size!==payments.length||payments.some(p=>stable(rs.docs.find(r=>r.id===p.receiptId)?.data()||null)!==stable(customerReceipt(p,s))))financialFail('Recibo no coincide con pago acreditado.');return payments.sort((a,b)=>b.recordedAt.localeCompare(a.recordedAt)||a.id.localeCompare(b.id));
}
export async function readFinancial(db:Firestore,id:string,v:number,actor:CustodyActor,role:FinancialRole){
 return db.runTransaction(async tx=>{const c=await context(db,tx,id,v,actor,role);if(!c.financial)return {active:false as const,mutationEnabled:financialEnabled()&&role==='ADMIN',blockReason:'Cobranza V2 no activada. Requiere contrato aprobado, entrega y control documental. Producción deshabilitada.'};
 // Frozen hash is rechecked on every view; never project private reference or personal fields.
 requireFinancialEmulator();const snapshot=(await tx.get(db.collection('contractSnapshotsV2').doc(c.financial.snapshotId))).data();validateContractSnapshot(snapshot);verifyProjection(c.financial,snapshot);
 const s=c.financial,payments=await paymentHistory(tx,c.ref,s),summary=financialSummary(s,payments);
 return {active:true as const,mutationEnabled:financialEnabled()&&role==='ADMIN',operationId:s.operationId,revision:s.revision,contractNumber:s.contractNumber,executionMode:s.executionMode,snapshotHash:s.snapshotHash,activatedAt:s.activatedAt,...summary,receipts:payments.map(p=>customerReceipt(p,s)),...(role==='ADMIN'?{capitalCents:s.capitalCents,serviceCents:s.serviceCents,history:payments}:{}),blockReason:'Demostración en Emulator. Cobranza productiva deshabilitada; revisión jurídica pendiente.'};});
}
export async function financialCommand(db:Firestore,id:string,v:number,input:unknown,actor:CustodyActor){
 requireFinancialEmulator();if(!actor.admin)financialFail('Sólo Administración acredita o revierte pagos.');
 const c=parseFinancialCommand(input),ref=financialRef(db,id,v),receipt=ref.collection('commands').doc(c.commandId),digest=createHash('sha256').update(stable({c,actor:actor.uid})).digest('hex');
 return db.runTransaction(async tx=>{
 requireFinancialEmulator();const base=await context(db,tx,id,v,actor,'ADMIN'),prior=await tx.get(receipt);if(c.operationId!==base.source.identity.operationId)financialFail('Operación incorrecta.');if(prior.exists){if(prior.data()!.digest!==digest)financialFail('Conflicto de commandId.');return {...prior.data()!.result,replay:true};}
 if((base.financial?.revision||0)!==c.expectedRevision)financialFail('Conflicto de revisión. Recargá.');
 const proof=await activationProof(db,tx,id,v,base),now=new Date().toISOString(),data=c.data;
 let s=base.financial,created:FinancialPayment|null=null,reversed:FinancialPayment|null=null;
 if(c.action==='ACTIVATE'){
  exact(data,[]);if(s)financialFail('Cobranza ya activada.');const snapshot=proof.snapshot;
  const installments=snapshot.paymentSchedule.installments.map(i=>({number:i.installmentNumber,dueDate:i.dueDate,amountCents:cents(i.amount)}));const total=cents(snapshot.economicTerms.contractTotal),capital=cents(snapshot.economicTerms.capitalAmount),service=cents(snapshot.economicTerms.serviceAmount);
  if(installments.reduce((n,i)=>n+i.amountCents,0)!==total||capital+service!==total||installments.length!==snapshot.economicTerms.contractPlanCuotas)financialFail('Cronograma inconsistente.');
  s={schemaVersion:'OPERATION_FINANCIAL_V2',policy:FINANCIAL_POLICY,executionMode:'EMULATOR_ONLY',operationId:c.operationId,revision:1,snapshotId:snapshot.contractSnapshotId,snapshotHash:snapshot.integrity.payloadHash,contractNumber:snapshot.contractNumber,capitalCents:capital,serviceCents:service,totalCents:total,installments,activatedAt:now,activatedBy:actor.uid,deliveryCommandId:proof.delivery.event!.commandId,approvalFixtureId:financialApprovalRef(db,id,v).id};
 }else{
  if(!s||s.snapshotHash!==proof.snapshot.integrity.payloadHash)financialFail('Cobranza no activada o snapshot diferente.');
  verifyProjection(s,proof.snapshot);
  const payments=await paymentHistory(tx,ref,s);
  if(c.action==='CREDIT_PAYMENT'){
   exact(data,['paymentId','amountCents','effectiveDate','method','reference']);const pid=opaque(data.paymentId);if((await tx.get(ref.collection('payments').doc(pid))).exists)financialFail('Pago ya registrado. Reintentá el commandId original.');
   if(!Number.isSafeInteger(data.amountCents)||Number(data.amountCents)<=0||!['TRANSFERENCIA','EFECTIVO'].includes(String(data.method))||typeof data.reference!=='string'||!data.reference.trim()||data.reference.length>200)financialFail('Datos de pago inválidos.');
   const amount=Number(data.amountCents),summary=financialSummary(s,payments),effectiveDate=financialDate(data.effectiveDate);if(amount>summary.balanceCents)financialFail('El pago supera el saldo contractual.');if(effectiveDate<proof.delivery.event!.occurredAt.slice(0,10))financialFail('Pago anterior a entrega efectiva. No se admiten anticipos.');
   // Reuse legacy FIFO allocation order/partial amounts, never its source lookup, tax split, commissions or writers.
   const rows=summary.installments.map(i=>({numero:i.number,saldoCentavos:i.balanceCents,capitalPendienteCentavos:i.balanceCents,servicioNetoPendienteCentavos:0,ivaPendienteCentavos:0} as EstadoCuotaDerivado));
   const allocations=calcularImputacionesFIFO(rows,amount).map(a=>({installmentNumber:a.cuotaNumero,amountCents:a.importeAplicadoCentavos}));if(allocations.reduce((n,a)=>n+a.amountCents,0)!==amount)financialFail();
   created={id:pid,amountCents:amount,effectiveDate,recordedAt:now,actor:actor.uid,method:data.method as FinancialPayment['method'],reference:data.reference.trim(),allocations,reversedAt:null,reversedBy:null,reversalReason:null,receiptId:`receipt_${pid}`};
  }else{
   exact(data,['paymentId','reason']);const pid=opaque(data.paymentId),p=payments.find(p=>p.id===pid);if(!p||p.reversedAt||typeof data.reason!=='string'||!data.reason.trim()||data.reason.length>500)financialFail('Pago no reversible o motivo ausente.');reversed={...p,reversedAt:now,reversedBy:actor.uid,reversalReason:data.reason.trim()};
  }
  s={...s,revision:s.revision+1};
 }
 const result={revision:s.revision,paymentId:created?.id||reversed?.id||null,replay:false};
 tx.set(ref,s);if(created){tx.create(ref.collection('payments').doc(created.id),created);tx.create(ref.collection('receipts').doc(created.receiptId),customerReceipt(created,s));}if(reversed){tx.set(ref.collection('payments').doc(reversed.id),reversed);tx.set(ref.collection('receipts').doc(reversed.receiptId),customerReceipt(reversed,s));}
 tx.create(receipt,{digest,result,actor:actor.uid,at:now});tx.create(ref.collection('events').doc(c.commandId),{commandId:c.commandId,operationId:c.operationId,action:c.action,expectedRevision:c.expectedRevision,revision:s.revision,actor:actor.uid,at:now,data,snapshotHash:s.snapshotHash});return result;
 });
}
