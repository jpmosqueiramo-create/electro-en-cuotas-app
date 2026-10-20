import { buildReadyEvidence, verifyReadyEvidence, type ContractReadyEvidenceV1 } from './contractReadyV2';
import type { BudgetV2 } from './budgetV2';
import { PERSONAL_ADDRESS_VERSION } from './contractAddress';
import { createHash,randomBytes,timingSafeEqual } from 'node:crypto';
import type { Firestore, DocumentData } from 'firebase-admin/firestore';
import { validateBudgetV2 } from './budgetV2';
import { privateBudgetReferenceId } from './budgetV2Persistence';
import type { BudgetAcceptanceV2 } from './budgetAcceptanceV2';
import { personalVersion,calendarDate,contractEconomics,contractSchedule,dataFields,dueDay,employmentFields,exact,newContractDraft,opaque,personalFields,reject,submissionPayload,type ClientDataSubmissionV2,type ContractClientDataRequestV2,type ContractDraftV2,stable } from './contractV2';
function submissionBody(s:ClientDataSubmissionV2){return {personalData:s.personalData,employmentData:s.employmentData,preferredMonthlyDueDay:s.preferredMonthlyDueDay};}
const digest=(o:unknown)=>createHash('sha256').update(stable(o)).digest('hex');
const hash=(s:string)=>createHash('sha256').update(s).digest('hex');
export function contractRefs(db:Firestore,budgetId:string,version:number) {
  opaque(budgetId);if(!Number.isSafeInteger(version)||version<1)reject();
  const family=db.collection('presupuestos_v2').doc(budgetId);
  return {family,draft:family.collection('contracts').doc(`v${version}`),budget:family.collection('versions').doc(String(version)),acceptance:family.collection('acceptances').doc(String(version))};
}
export async function getContract(db:Firestore,id:string,v:number){
  const r=contractRefs(db,id,v);
  return db.runTransaction(async tx=>{
    const snapshot=await tx.get(r.draft);if(!snapshot.exists)return {draft:null,requests:[],submissions:[],readiness:null};
    const draft=snapshot.data() as ContractDraftV2;
    let readiness:ContractReadyEvidenceV1|null=null;
    if(draft.status==='READY_TO_FORMALIZE'){
      if(!draft.readyEvidenceId)reject('Falta evidencia de revisión.');
      const [b,a,e]=await Promise.all([tx.get(r.budget),tx.get(r.acceptance),tx.get(r.draft.collection('readyReviews').doc(opaque(draft.readyEvidenceId)))]);
      if(!b.exists||!a.exists||!e.exists)reject('Falta origen o evidencia de revisión.');
      readiness=e.data() as ContractReadyEvidenceV1;verifyReadyEvidence(b.data() as BudgetV2,a.data() as BudgetAcceptanceV2,draft,readiness);
    }
    const [requests,submissions]=await Promise.all([tx.get(r.draft.collection('requests')),tx.get(r.draft.collection('submissions'))]);
    return {draft,readiness,requests:requests.docs.map(x=>{const {tokenHash:_hash,submissionDigest:_digest,...safe}=x.data();void _hash;void _digest;return safe;}),submissions:submissions.docs.map(x=>x.data() as ClientDataSubmissionV2)};
  });
}
const actionKeys:Record<string,string[]>={OPEN_OR_CREATE:[],SET_GOODS_CONDITION:['goodsCondition'],MARK_READY_TO_FORMALIZE:[],RETURN_TO_DRAFT:['reason'],UPDATE_PERSONAL_DATA:['personalData'],UPDATE_EMPLOYMENT_DATA:['employmentData'],SET_CONTRACT_PLAN:['contractPlanCuotas'],SET_PAYMENT_DATES:['firstInstallmentDueDate','preferredMonthlyDueDay'],CREATE_CLIENT_DATA_REQUEST:[],REVOKE_CLIENT_DATA_REQUEST:[],APPLY_CLIENT_SUBMISSION:['submissionId']};
export async function contractCommand(db:Firestore,id:string,v:number,input:unknown,actor:string) {
  const raw=input as Record<string,unknown>,action=raw?.action;
  if(typeof action!=='string'||!Object.hasOwn(actionKeys,action))reject('NEW_PROPOSAL_REQUIRED: operación no permitida.');
  const o=exact(input,['action','commandId',...(action==='OPEN_OR_CREATE'?[]:['expectedRevision']),...actionKeys[action]]);
  const cid=opaque(o.commandId),r=contractRefs(db,id,v),command=r.draft.collection('commands').doc(cid),dg=digest({actor,input});
  // Generated outside transaction retries, returned only after a committed first execution.
  const secret=action==='CREATE_CLIENT_DATA_REQUEST'?randomBytes(32).toString('base64url'):null;
  const requestId=randomBytes(18).toString('base64url');
  return db.runTransaction(async tx=>{
    const [old,cmd,b,a,documentation]=await Promise.all([tx.get(r.draft),tx.get(command),tx.get(r.budget),tx.get(r.acceptance),tx.get(r.family.collection('documentation').doc(String(v)))]);
    // P4 is optional context only; never copied to Draft or changed by contract commands.
    void documentation;
    if(cmd.exists){if(cmd.data()!.digest!==dg)reject('Conflicto de commandId.');return {draft:cmd.data()!.result as ContractDraftV2,replayed:true};}
    if(!b.exists||!a.exists)reject('Primero registrá la aceptación.');
    const budget=b.data();validateBudgetV2(budget,privateBudgetReferenceId);
    const now=new Date().toISOString();
    let d:ContractDraftV2=old.exists?old.data() as ContractDraftV2:newContractDraft(budget,a.data() as BudgetAcceptanceV2,actor,now);
    if(d.schemaVersion!=='CONTRACT_DRAFT_V2'||!['DRAFT','READY_TO_FORMALIZE'].includes(d.status)||d.budgetId!==id||d.budgetVersion!==v)reject();
    if(action!=='OPEN_OR_CREATE'&&(!old.exists||o.expectedRevision!==d.revision))reject('Conflicto de revisión. Recargá el borrador.');
    personalVersion(d.personalDataVersion);
    if(d.status==='READY_TO_FORMALIZE' && !['OPEN_OR_CREATE','RETURN_TO_DRAFT'].includes(action))reject('Volvé explícitamente a borrador antes de editar.');
    if(action==='RETURN_TO_DRAFT' && d.status!=='READY_TO_FORMALIZE')reject('El borrador no tiene una revisión READY vigente.');
    let readyEvidence:ContractReadyEvidenceV1|null=null;
    if(d.status==='READY_TO_FORMALIZE'){
      if(!d.readyEvidenceId)reject('Falta evidencia de revisión.');
      const evidence=await tx.get(r.draft.collection('readyReviews').doc(opaque(d.readyEvidenceId)));
      if(!evidence.exists)reject('Falta evidencia de revisión.');
      readyEvidence=evidence.data() as ContractReadyEvidenceV1;
      verifyReadyEvidence(budget,a.data() as BudgetAcceptanceV2,d,readyEvidence);
    }
    const before=structuredClone(d);
    const activeRef=d.activeClientDataRequestId?r.draft.collection('requests').doc(opaque(d.activeClientDataRequestId)):null;
    const active=activeRef?await tx.get(activeRef):null;
    let sub:ClientDataSubmissionV2|null=null;
    let subVersion=personalVersion(undefined);
    if(action==='APPLY_CLIENT_SUBMISSION') {
      const snap=await tx.get(r.draft.collection('submissions').doc(opaque(o.submissionId)));
      if(!snap.exists)reject();sub=snap.data() as ClientDataSubmissionV2;
      const req=await tx.get(r.draft.collection('requests').doc(opaque(sub.requestId)));
      if(!req.exists||req.data()!.contractDraftId!==d.contractDraftId||req.data()!.budgetId!==id||req.data()!.budgetVersion!==v||sub.contractDraftId!==d.contractDraftId||sub.submissionId!==o.submissionId)reject();
      subVersion=personalVersion(req.data()!.personalDataVersion);
      if(personalVersion(sub.personalDataVersion)!==subVersion)reject('Submission incompatible.');
    }
    if(action==='MARK_READY_TO_FORMALIZE'){
      readyEvidence=buildReadyEvidence(budget,a.data() as BudgetAcceptanceV2,d,actor,now,cid);
      const reviewRef=r.draft.collection('readyReviews').doc(cid);
      if((await tx.get(reviewRef)).exists)reject('La revisión ya existe sin un comando consistente.');
      // Revoke outstanding capability atomically. Received submissions remain untouched.
      if(active?.exists&&active.data()!.status==='ACTIVE')tx.update(activeRef!,{status:'REVOKED',revokedAt:now});
      tx.create(reviewRef,readyEvidence);
      d={...d,status:'READY_TO_FORMALIZE',readyEvidenceId:cid,activeClientDataRequestId:null};
    }
    if(action==='RETURN_TO_DRAFT'){
      if(typeof o.reason!=='string'||!o.reason.trim()||o.reason.trim().length>300||/[<>\x00-\x1f\x7f]/.test(o.reason))reject('Indicá un motivo breve sin datos personales.');
      d={...d,status:'DRAFT',readyEvidenceId:null};
    }
    if(action==='SET_GOODS_CONDITION'){if(typeof o.goodsCondition!=='string'||!['NUEVO','USADO'].includes(o.goodsCondition))reject('Indicá NUEVO o USADO.');d={...d,goodsCondition:{version:'GOODS_CONDITION_V1',value:o.goodsCondition as 'NUEVO'|'USADO'}};}
    if(action==='UPDATE_PERSONAL_DATA')d={...d,personalDataVersion:PERSONAL_ADDRESS_VERSION,personalData:dataFields(o.personalData,personalFields)};
    if(action==='UPDATE_EMPLOYMENT_DATA')d={...d,employmentData:dataFields(o.employmentData,employmentFields)};
    if(action==='SET_CONTRACT_PLAN') {
      if(typeof o.contractPlanCuotas!=='number')reject();
      d={...d,economicTerms:contractEconomics({...d.acceptedReferenceSnapshot,imagenUrls:[]},o.contractPlanCuotas)};
    }
    if(action==='SET_PAYMENT_DATES') d={...d,firstInstallmentDueDate:o.firstInstallmentDueDate===null?null:calendarDate(o.firstInstallmentDueDate),preferredMonthlyDueDay:o.preferredMonthlyDueDay===null?null:dueDay(o.preferredMonthlyDueDay)};
    if(sub)d={...d,...(subVersion==='LEGACY_SIX'?{}:{personalDataVersion:PERSONAL_ADDRESS_VERSION}),personalData:subVersion==='LEGACY_SIX'?{...d.personalData,...submissionPayload(submissionBody(sub),subVersion).personalData}:dataFields(sub.personalData,personalFields,true),employmentData:dataFields(sub.employmentData,employmentFields),preferredMonthlyDueDay:dueDay(sub.preferredMonthlyDueDay),lastClientSubmissionId:sub.submissionId,lastClientSubmissionAppliedAt:now,lastClientSubmissionAppliedBy:actor};
    if(action==='CREATE_CLIENT_DATA_REQUEST') {
      if(active?.exists&&active.data()!.status==='ACTIVE')tx.update(activeRef!,{status:'REVOKED',revokedAt:now});
      const request:ContractClientDataRequestV2={schemaVersion:'CONTRACT_CLIENT_DATA_REQUEST_V2',personalDataVersion:PERSONAL_ADDRESS_VERSION,requestId,contractDraftId:d.contractDraftId,budgetId:id,budgetVersion:v,tokenHash:hash(secret!),status:'ACTIVE',createdAt:now,createdBy:actor,expiresAt:new Date(Date.parse(now)+7*86400000).toISOString(),submittedAt:null,revokedAt:null,submissionDigest:null};
      tx.create(r.draft.collection('requests').doc(requestId),request);
      tx.create(db.collection('contractClientDataRequests').doc(requestId),{budgetId:id,version:v});
      d={...d,activeClientDataRequestId:requestId};
    }
    if(action==='REVOKE_CLIENT_DATA_REQUEST') {
      if(active?.exists&&active.data()!.status==='ACTIVE')tx.update(activeRef!,{status:'REVOKED',revokedAt:now});
      d={...d,activeClientDataRequestId:null};
    }
    if(action!=='OPEN_OR_CREATE')d={...d,revision:d.revision+1,updatedAt:now,updatedBy:actor,...(['SET_CONTRACT_PLAN','SET_PAYMENT_DATES','APPLY_CLIENT_SUBMISSION'].includes(action)?{paymentScheduleDraft:d.economicTerms&&d.firstInstallmentDueDate&&d.preferredMonthlyDueDay?contractSchedule(d.economicTerms,d.firstInstallmentDueDate,d.preferredMonthlyDueDay):[]}:{} )};
    if(!old.exists||action!=='OPEN_OR_CREATE')tx.set(r.draft,d);
    tx.create(command,{digest:dg,result:d,createdAt:now,by:actor,action});
    if(action!=='OPEN_OR_CREATE')tx.create(r.draft.collection('events').doc(cid),['MARK_READY_TO_FORMALIZE','RETURN_TO_DRAFT'].includes(action)
      ?{action,by:actor,at:now,from:before.status,to:d.status,beforeRevision:before.revision,afterRevision:d.revision,readyEvidenceId:readyEvidence?.commandId??null,...(action==='RETURN_TO_DRAFT'?{reason:(o.reason as string).trim()}: {})}
      :{action,by:actor,at:now,before,after:d,clientSubmissionId:sub?.submissionId??null});
    return {draft:d,...(secret?{requestId,secret}:{}),replayed:false};
  });
}
export const unavailable='El enlace no está disponible.';
// Durable per-request limiting includes invalid credentials; no IP or token logs.
async function limit(db:Firestore,requestId:string) {
  const ref=db.collection('contractClientDataLimits').doc(`request_${requestId}`),global=db.collection('contractClientDataLimits').doc('global'),now=Date.now();
  await db.runTransaction(async tx=>{
    const [s,g]=await Promise.all([tx.get(ref),tx.get(global)]);
    const next=(data:DocumentData|undefined)=>({start:data&&now-data.start<60000?data.start:now,count:data&&now-data.start<60000?data.count+1:1});
    const local=next(s.data()),all=next(g.data());
    if(local.count>60||all.count>300)reject(unavailable);
    tx.set(ref,local);tx.set(global,all);
  });
}
export async function publicContractData(db:Firestore,requestId:string,token:string,input?:unknown) {
  opaque(requestId);if(!/^[A-Za-z0-9_-]{43}$/.test(token))reject(unavailable);
  await limit(db,requestId);
  const index=await db.collection('contractClientDataRequests').doc(requestId).get();if(!index.exists)reject(unavailable);
  const refs=contractRefs(db,index.data()!.budgetId,index.data()!.version),rr=refs.draft.collection('requests').doc(requestId);
  return db.runTransaction(async tx=>{
    const [rs,ds]=await Promise.all([tx.get(rr),tx.get(refs.draft)]);if(!rs.exists||!ds.exists)reject(unavailable);
    const r=rs.data() as ContractClientDataRequestV2,d=ds.data() as ContractDraftV2;
    const actual=Buffer.from(hash(token),'hex'),expected=Buffer.from(r.tokenHash,'hex');
    if(actual.length!==expected.length||!timingSafeEqual(actual,expected)||d.status!=='DRAFT'||Date.parse(r.expiresAt)<=Date.now()||r.status==='REVOKED'||r.status==='EXPIRED')reject(unavailable);
    if(input===undefined){if(r.status!=='ACTIVE')reject(unavailable);return {available:true,personalDataVersion:personalVersion(r.personalDataVersion)};}
    const version=personalVersion(r.personalDataVersion);
    const p=submissionPayload(input,version),dg=digest(p);
    if(r.status==='SUBMITTED'){if(r.submissionDigest===dg)return {received:true};reject(unavailable);}
    if(r.status!=='ACTIVE'||d.activeClientDataRequestId!==requestId)reject(unavailable);
    const s:ClientDataSubmissionV2={schemaVersion:'CLIENT_DATA_SUBMISSION_V2',...(version==='LEGACY_SIX'?{}:{personalDataVersion:version}),submissionId:requestId,requestId,contractDraftId:d.contractDraftId,submittedAt:new Date().toISOString(),...p};
    tx.create(refs.draft.collection('submissions').doc(requestId),s);tx.update(rr,{status:'SUBMITTED',submittedAt:s.submittedAt,submissionDigest:dg});
    // Deliberately no Draft update on receipt.
    return {received:true};
  });
}
