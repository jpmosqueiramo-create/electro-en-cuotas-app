import {createHash,randomBytes,timingSafeEqual} from 'node:crypto';
import type {Firestore} from 'firebase-admin/firestore';
import {contractRefs,clientTermsDigest} from './contractV2Server';
import {completeness,stable,opaque,exact,newContractDraft,type ContractDraftV2} from './contractV2';
import type {ClientConformitySummary} from './clientConformity';
import {contractPaymentAddress} from './contractPaymentAddress';
import {assertAdministrativeRecordActive} from './adminRecordRemovalServer';
import type {BudgetV2} from './budgetV2';
import type {BudgetAcceptanceV2} from './budgetAcceptanceV2';
/** Explicit client allowlist: no provider, supplier cost, internal factor, identity document or employment data. */
export function clientConformitySummary(d:ContractDraftV2):ClientConformitySummary {
 if(completeness(d).length||!d.productDetails?.quantity||!d.productDetails.condition)throw Error('Completá y guardá los datos, las condiciones y el cronograma del contrato.');
 const e=d.economicTerms!;
 return {version:'CLIENT_CONFORMITY_SUMMARY_V1',name:d.personalData.fullName,address:contractPaymentAddress(d.personalData).display,product:d.acceptedReferenceSnapshot.nombre,quantity:d.productDetails.quantity,condition:d.productDetails.condition==='NEW'?'Nuevo':'Usado',installments:e.contractPlanCuotas,installmentAmount:e.contractInstallmentAmount,total:e.contractTotal,firstDueDate:d.firstInstallmentDueDate!,schedule:d.paymentScheduleDraft.map(p=>({number:p.installmentNumber,dueDate:p.dueDate,amount:p.amount}))};
}

const hash=(s:string)=>createHash('sha256').update(s).digest('hex');
const binding=(d:ContractDraftV2)=>hash(stable({terms:clientTermsDigest(d),personal:d.personalData,reference:d.acceptedReferenceSnapshot}));
const unavailable=()=>{throw Error('El enlace no está disponible. Solicitá uno nuevo a Cuenta Hogar.');};
export async function createClientConformityLink(db:Firestore,id:string,v:number,input:unknown,actor:string){
 const c=exact(input,['commandId','expectedRevision']),cid=opaque(c.commandId),r=contractRefs(db,id,v),requestId=randomBytes(18).toString('base64url'),secret=randomBytes(32).toString('base64url');
 const receipt=r.draft.collection('conformityLinkCommands').doc(cid),pointer=r.draft.collection('conformityLinks').doc('current');
 const result=await db.runTransaction(async tx=>{
  await assertAdministrativeRecordActive(db,tx,{kind:'CONTRACT',id,version:v});
  const [ds,bs,as,prior,active]=await Promise.all([tx.get(r.draft),tx.get(r.budget),tx.get(r.acceptance),tx.get(receipt),tx.get(pointer)]);
  if(prior.exists){if(prior.data()!.actor!==actor||prior.data()!.expectedRevision!==c.expectedRevision)throw Error('Conflicto de commandId.');return {requestId:prior.data()!.requestId as string,replayed:true};}
  if(!ds.exists||!bs.exists||!as.exists)throw Error('Primero prepará el contrato aceptado.');
  const d=ds.data() as ContractDraftV2;const origin=newContractDraft(bs.data() as BudgetV2,as.data() as BudgetAcceptanceV2,actor,d.updatedAt);
  if(d.budgetId!==id||d.budgetVersion!==v||d.acceptedOptionId!==origin.acceptedOptionId||stable(d.acceptedReferenceSnapshot)!==stable(origin.acceptedReferenceSnapshot))throw Error('Origen inconsistente.');
  if(d.status!=='DRAFT'||d.revision!==c.expectedRevision)throw Error('Recargá el contrato y guardá los cambios antes de generar el enlace.');
  const summary=clientConformitySummary(d),now=new Date().toISOString(),old=active.data()?.requestId as string|undefined;
  if(old)tx.update(r.draft.collection('conformityRequests').doc(old),{status:'REVOKED',revokedAt:now});
  tx.create(r.draft.collection('conformityRequests').doc(requestId),{schemaVersion:'CLIENT_CONFORMITY_REQUEST_V1',requestId,tokenHash:hash(secret),binding:binding(d),originHash:hash(stable({budget:bs.data(),acceptance:as.data()})),summary,status:'ACTIVE',createdAt:now,createdBy:actor,expiresAt:new Date(Date.now()+7*86400000).toISOString()});
  tx.set(pointer,{requestId});tx.create(db.collection('contractClientConformityRequests').doc(requestId),{budgetId:id,version:v});
  tx.create(receipt,{actor,expectedRevision:c.expectedRevision,requestId,at:now});
  return {requestId,replayed:false,summary};
 });
 return {...result,...(!result.replayed?{secret}:{})};
}
async function limit(db:Firestore,id:string){await db.runTransaction(async tx=>{const refs=[db.collection('contractClientConformityLimits').doc(id),db.collection('contractClientConformityLimits').doc('global')],snaps=await Promise.all(refs.map(r=>tx.get(r))),now=Date.now();const values=snaps.map(s=>{const d=s.data();return d&&now-d.start<60000?{start:d.start,count:d.count+1}:{start:now,count:1};});if(values[0].count>60||values[1].count>300)unavailable();refs.forEach((r,i)=>tx.set(r,values[i]));});}
export async function publicClientConformity(db:Firestore,id:string,token:string,input?:unknown){
 opaque(id);if(!/^[A-Za-z0-9_-]{43}$/.test(token))unavailable();await limit(db,id);
 if(input!==undefined){const o=exact(input,['confirmed']);if(o.confirmed!==true)unavailable();}
 const index=await db.collection('contractClientConformityRequests').doc(id).get();if(!index.exists)unavailable();const {budgetId,version}=index.data()!,r=contractRefs(db,budgetId,version),rr=r.draft.collection('conformityRequests').doc(id);
 return db.runTransaction(async tx=>{
  await assertAdministrativeRecordActive(db,tx,{kind:'CONTRACT',id:budgetId,version});
  const [rs,ds,active,bs,as]=await Promise.all([tx.get(rr),tx.get(r.draft),tx.get(r.draft.collection('conformityLinks').doc('current')),tx.get(r.budget),tx.get(r.acceptance)]);if(!rs.exists||!ds.exists)unavailable();
  const request=rs.data()!,actual=Buffer.from(hash(token),'hex'),expected=Buffer.from(request.tokenHash,'hex');
  if(actual.length!==expected.length||!timingSafeEqual(actual,expected)||active.data()?.requestId!==id||Date.parse(request.expiresAt)<=Date.now()||request.status==='REVOKED')unavailable();
  // A response lost after acceptance can be retried without changing the confirmation.
  if(request.status==='ACCEPTED')return {confirmed:true,confirmedAt:request.confirmedAt};
  if(!bs.exists||!as.exists||request.originHash!==hash(stable({budget:bs.data(),acceptance:as.data()})))unavailable();
  const d=ds.data() as ContractDraftV2;if(request.status!=='ACTIVE'||d.status!=='DRAFT'||request.binding!==binding(d))unavailable();
  if(input===undefined)return {confirmed:false,summary:request.summary};
  clientConformitySummary(d);const now=new Date().toISOString(),termsDigest=clientTermsDigest(d),evidence='Aceptación del cliente mediante enlace privado '+id;
  const after={...d,revision:d.revision+1,updatedAt:now,updatedBy:'client-conformity-link'};
  tx.set(r.draft.collection('conformity').doc('current'),{termsDigest,confirmedDigest:termsDigest,confirmedPaymentAddressHash:contractPaymentAddress(d.personalData).hash,confirmedAt:now,confirmedBy:'client-conformity-link',evidence});
  tx.update(rr,{status:'ACCEPTED',confirmedAt:now});tx.set(r.draft,after);
  tx.create(r.draft.collection('events').doc('client-conformity-'+id),{action:'RECORD_CLIENT_CONFORMITY',by:'client-conformity-link',at:now,before:d,after,evidence,termsDigest,requestId:id,presentation:request.summary});
  return {confirmed:true,confirmedAt:now};
 });
}
