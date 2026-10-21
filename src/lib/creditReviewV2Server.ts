import { createHash } from 'node:crypto';
import type { Firestore, Transaction } from 'firebase-admin/firestore';
import { contractRefs } from './contractV2Server';
import { operationFromAcceptance,operationRef,verifyOperation } from './operationV2';
import { loadDocumentation } from './budgetAcceptanceV2Server';
import { documentType,fail,type BudgetAcceptanceV2,type BudgetDocumentationCaseV2 } from './budgetAcceptanceV2';
import { completeness,opaque,stable,exact,type ContractDraftV2 } from './contractV2';
import { CREDIT_POLICY,creditStates,creditPrerequisites,requiredDocuments,currentDocument,type CreditReview,type ClientDocumentProfile } from './creditReviewV2';
const hash=(v:unknown)=>createHash('sha256').update(stable(v)).digest('hex');
export const creditRefs=(db:Firestore,id:string,v:number)=>{const r=contractRefs(db,id,v);return {...r,review:r.draft.collection('creditReview').doc('current'),profile:r.draft.collection('clientProfiles').doc('verified')};};
const text=(v:unknown)=>{if(typeof v!=='string'||!v.trim()||v.length>1000||/[\x00-\x1f<>]/.test(v))fail('Registrá una observación válida de hasta 1000 caracteres.');return v.trim();};
function identityHash(d:ContractDraftV2){if(!/^\d{7,8}$/.test(d.personalData.dni)||!d.personalData.fullName.trim())fail('Primero revisá la identidad recibida.');return hash({dni:d.personalData.dni,fullName:d.personalData.fullName.trim().normalize('NFKC').toLocaleUpperCase('es-AR')});}
function personalHash(d:ContractDraftV2|null){return d?hash({personalData:d.personalData,employmentData:d.employmentData}):null;}
async function context(db:Firestore,tx:Transaction,id:string,v:number){
 const r=creditRefs(db,id,v),accepted=await tx.get(r.acceptance);if(!accepted.exists)fail('Primero registrá la aceptación.');const acceptance=accepted.data() as BudgetAcceptanceV2;if(acceptance.budgetId!==id||acceptance.budgetVersion!==v||acceptance.schemaVersion!=='BUDGET_ACCEPTANCE_V2')fail();const expected=operationFromAcceptance(acceptance);
 const [o,d,c]=await Promise.all([tx.get(operationRef(db,id,v)),tx.get(r.draft),tx.get(r.review)]);if(o.exists)verifyOperation(o.data(),expected);
 const draft=d.exists?d.data() as ContractDraftV2:null;
 const review=c.exists?c.data() as CreditReview:null;if(review&&(review.operationId!==expected.operationId||review.policy!==CREDIT_POLICY))fail('Evaluación de otra operación.');
 let profile:ClientDocumentProfile|null=null;let identityMismatch=false;
 if(review?.profileOrigin){const p=await tx.get(creditRefs(db,review.profileOrigin.budgetId,review.profileOrigin.version).profile);if(!p.exists)fail('Carpeta documental no disponible.');profile=p.data() as ClientDocumentProfile;identityMismatch=!draft||!/^\d{7,8}$/.test(draft.personalData.dni)||!draft.personalData.fullName.trim()||profile.identityHash!==identityHash(draft);}
 if(profile){
 profile=structuredClone(profile);
 for(const type of [...requiredDocuments,'PAYSLIP'] as const){const entry=profile.documents[type];if(!entry)continue;
 const source=await loadDocumentation(db,entry.sourceBudgetId,entry.sourceVersion,tx);const slot=source.documentation.slots[type];const attachment=slot.attachments.find(a=>a.attachmentId===entry.attachment.attachmentId);
 if(!attachment||attachment.sha256!==entry.attachment.sha256||slot.observation)profile.documents[type]={...entry,status:'OBSERVED'};
 }
 }
 return {r,expected,draft,review,profile,identityMismatch};
}
export async function readCreditReview(db:Firestore,id:string,v:number){return db.runTransaction(async tx=>{
 const c=await context(db,tx,id,v),now=new Date().toISOString(),documents=c.profile?.documents??{};const localSnapshot=await tx.get(c.r.family.collection('documentation').doc(String(v)));const local=localSnapshot.exists?localSnapshot.data() as BudgetDocumentationCaseV2:null;
 const dataReady=!c.identityMismatch&&!!c.draft&&completeness({...c.draft,economicTerms:c.draft.economicTerms}).filter(x=>x.startsWith('Datos personales')).length===0&&!!c.draft.lastClientSubmissionAppliedAt;
 const prerequisite=creditPrerequisites(dataReady,documents,now),fresh=!!c.review&&c.review.draftDataHash===personalHash(c.draft)&&c.review.documentsHash===hash(documents);
 const approved=c.review?.state==='APPROVED'&&prerequisite==='IN_REVIEW'&&fresh;
 // Return metadata only. Storage paths and identity hashes never leave the server.
 return {operationId:c.expected.operationId,identityMismatch:c.identityMismatch,review:c.review,profile:c.profile?{originBudgetId:c.profile.originBudgetId,originVersion:c.profile.originVersion,revision:c.profile.revision,verifiedAt:c.profile.verifiedAt}:null,
 documents:requiredDocuments.concat('PAYSLIP').map(type=>{const d=documents[type];return {type,required:requiredDocuments.includes(type),status:!d?'MISSING':c.identityMismatch?'OBSERVED':currentDocument(d,now)?'VERIFIED':d.status==='OBSERVED'?'OBSERVED':'EXPIRED',validUntil:d?.validUntil??null,reviewedAt:d?.reviewedAt??null,originalName:d?.attachment.originalName??null,attachmentId:d?.attachment.attachmentId??null,choices:(local?.slots?.[type]?.attachments??[]).map(a=>({id:a.attachmentId,name:a.originalName}))};}),
 state:c.review?.state==='REJECTED'||c.review?.state==='MORE_INFORMATION'?c.review.state:prerequisite!=='IN_REVIEW'?prerequisite:approved?'APPROVED' as const:'IN_REVIEW' as const,prerequisite,approved,requiresFreshReview:!fresh&&!!c.review,productiveFormalization:'DISABLED' as const};
 });}
export async function creditCommand(db:Firestore,id:string,v:number,input:unknown,actor:string){
 const raw=input as Record<string,unknown>;const keys:Record<string,string[]>={VERIFY_IDENTITY:['evidence'],LINK_PROFILE:['originBudgetId','originVersion','evidence'],REVIEW_DOCUMENT:['type','attachmentId','status','validUntil','note'],DECIDE:['state','resolution','notes']};
 if(typeof raw?.action!=='string'||!keys[raw.action])fail();const c=exact(input,['action','commandId','expectedRevision','expectedProfileRevision',...keys[raw.action]]);const cid=opaque(c.commandId),digest=hash({actor,input});
 return db.runTransaction(async tx=>{
 const x=await context(db,tx,id,v),command=x.r.draft.collection('creditCommands').doc(cid),old=await tx.get(command);
 if(old.exists){if(old.data()!.digest!==digest)fail('Conflicto de commandId.');return old.data()!.result;}
 if(x.identityMismatch&&!(c.action==='DECIDE'&&c.state==='MORE_INFORMATION'))fail('Identidad inconsistente. Solicitá aclaración antes de reutilizar documentos.');
 if(c.expectedRevision!==(x.review?.revision??0)||c.expectedProfileRevision!==(x.profile?.revision??0))fail('La operación cambió. Recargá antes de continuar.');
 const now=new Date().toISOString(),next:CreditReview=x.review?structuredClone(x.review):{policy:CREDIT_POLICY,operationId:x.expected.operationId,revision:0,state:'PENDING_DATA',profileOrigin:null,resolution:'',notes:'',reviewedBy:actor,reviewedAt:now,draftDataHash:null,documentsHash:null};
 let profile=x.profile,profileWrite=false;
 if(c.action==='VERIFY_IDENTITY'){
 if(!x.draft?.lastClientSubmissionAppliedAt)fail('Primero revisá y aplicá los datos del formulario contractual.');
 if(profile)fail('La operación ya tiene identidad verificada. No se permite reemplazarla ni fusionarla.');
 const prior=await tx.get(x.r.profile);if(prior.exists)fail('Ya existe una carpeta: vinculala explícitamente.');
 profile={schemaVersion:'CLIENT_DOCUMENT_PROFILE_V2',profileId:x.expected.operationId,originBudgetId:id,originVersion:v,identityHash:identityHash(x.draft),verifiedBy:actor,verifiedAt:now,verificationEvidence:text(c.evidence),revision:1,documents:{}};
 next.profileOrigin={budgetId:id,version:v};profileWrite=true;
 }else if(c.action==='LINK_PROFILE'){
 if(profile||!x.draft?.lastClientSubmissionAppliedAt)fail('Revisá los datos y la vinculación vigente.');
 const sourceId=opaque(c.originBudgetId);if(!Number.isSafeInteger(c.originVersion)||Number(c.originVersion)<1)fail();
 const p=await tx.get(creditRefs(db,sourceId,Number(c.originVersion)).profile);if(!p.exists)fail('No existe una identidad verificada de origen.');
 profile=p.data() as ClientDocumentProfile;if(profile.schemaVersion!=='CLIENT_DOCUMENT_PROFILE_V2'||profile.identityHash!==identityHash(x.draft))fail('Identidad inconsistente. No se vincula ni fusiona automáticamente.');
 text(c.evidence);next.profileOrigin={budgetId:sourceId,version:Number(c.originVersion)};
 }else if(c.action==='REVIEW_DOCUMENT'){
 if(!profile||!next.profileOrigin)fail('Verificá o vinculá la identidad antes de revisar documentos.');
 const type=documentType(c.type),{documentation}=await loadDocumentation(db,id,v,tx);let attachment=documentation.slots[type].attachments.find(a=>a.attachmentId===c.attachmentId);
 let sourceBudgetId=id,sourceVersion=v;
 if(!attachment&&profile.documents[type]?.attachment.attachmentId===c.attachmentId){const entry=profile.documents[type]!;const source=await loadDocumentation(db,entry.sourceBudgetId,entry.sourceVersion,tx);attachment=source.documentation.slots[type].attachments.find(a=>a.attachmentId===c.attachmentId);sourceBudgetId=entry.sourceBudgetId;sourceVersion=entry.sourceVersion;}
 if(!attachment)fail('Elegí un archivo de esta operación cargado mediante el módulo documental.');
 if(!['VERIFIED','OBSERVED'].includes(String(c.status)))fail();
 if(!(c.status==='OBSERVED'&&c.validUntil===null)&&(typeof c.validUntil!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(c.validUntil)||new Date(c.validUntil+'T00:00:00Z').toISOString().slice(0,10)!==c.validUntil))fail('Registrá una fecha de vigencia válida para verificar; no hay plazos automáticos.');
 profile=structuredClone(profile);profile.revision++;profile.documents[type]={type,sourceBudgetId,sourceVersion,attachment,status:c.status as 'VERIFIED'|'OBSERVED',validUntil:c.validUntil as string|null,reviewedAt:now,reviewedBy:actor,note:text(c.note)};profileWrite=true;
 }else{
 if(typeof c.state!=='string'||!creditStates.includes(c.state as typeof creditStates[number]))fail();
 const state=c.state as CreditReview['state'];const ready=!!x.draft?.lastClientSubmissionAppliedAt&&completeness(x.draft).filter(m=>m.startsWith('Datos personales')).length===0;
 const prerequisite=creditPrerequisites(ready,profile?.documents??{},now);
 if(['IN_REVIEW','APPROVED','REJECTED'].includes(state)&&prerequisite!=='IN_REVIEW')fail('Primero completá datos y documentación vigente.');
 if(['APPROVED','REJECTED'].includes(state)&&x.review?.state!=='IN_REVIEW')fail('Primero iniciá la evaluación.');
 next.state=state;next.resolution=text(c.resolution);next.notes=text(c.notes);
 }
 if(c.action!=='DECIDE'){next.state=creditPrerequisites(!!x.draft?.lastClientSubmissionAppliedAt,profile?.documents??{},now);next.resolution='Revisión documental actualizada; requiere evaluación propia de esta operación.';}
 next.revision++;next.reviewedAt=now;next.reviewedBy=actor;next.draftDataHash=personalHash(x.draft);next.documentsHash=hash(profile?.documents??{});
 if(profileWrite&&profile)tx.set(creditRefs(db,profile.originBudgetId,profile.originVersion).profile,profile);
 tx.set(x.r.review,next);const result={revision:next.revision,state:next.state};tx.create(command,{digest,result,actor,at:now,input});return result;
 });
}

export async function listVerifiedProfiles(db:Firestore){const list=await db.collectionGroup('clientProfiles').limit(100).get();const result=[];for(const doc of list.docs){const p=doc.data() as ClientDocumentProfile;if(p.schemaVersion!=='CLIENT_DOCUMENT_PROFILE_V2'||doc.ref.path!==creditRefs(db,p.originBudgetId,p.originVersion).profile.path)continue;const draft=await contractRefs(db,p.originBudgetId,p.originVersion).draft.get();if(!draft.exists)continue;result.push({budgetId:p.originBudgetId,version:p.originVersion,name:(draft.data() as ContractDraftV2).personalData.fullName,verifiedAt:p.verifiedAt});}return result;}
export async function reusableDocumentSource(db:Firestore,id:string,v:number,type:unknown){return db.runTransaction(async tx=>{const c=await context(db,tx,id,v),entry=c.profile?.documents[documentType(type)];if(c.identityMismatch||!entry)fail('Documento no disponible para la identidad vigente.');return entry;});}

/** Enrolled operations must have a fresh manual approval before economic preparation/READY. Historical unenrolled operations remain readable and unchanged. */
export async function assertCreditPreparation(db:Firestore,tx:Transaction,id:string,v:number){const enrolled=await tx.get(creditRefs(db,id,v).review);if(!enrolled.exists)return;const c=await context(db,tx,id,v);const ready=!c.identityMismatch&&!!c.draft?.lastClientSubmissionAppliedAt&&completeness(c.draft).filter(m=>m.startsWith('Datos personales')).length===0;if(!c.review||c.review.state!=='APPROVED'||creditPrerequisites(ready,c.profile?.documents??{},new Date().toISOString())!=='IN_REVIEW'||c.review.draftDataHash!==personalHash(c.draft)||c.review.documentsHash!==hash(c.profile?.documents??{}))fail('Primero completá la evaluación crediticia y registrá una aprobación vigente.');}
