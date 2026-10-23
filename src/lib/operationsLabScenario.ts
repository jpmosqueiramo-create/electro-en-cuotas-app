// Explicit synthetic scenario. Never accepts a real customer or imports production records.
import { LabError } from './operationsLabPolicy';
import { createHash } from 'node:crypto';
import { createCatalogReferenceDraft } from './catalogReferenceEditor';
import { buildBudgetOptionV2 } from './budgetReferenceV2';
import type { BudgetV2 } from './budgetV2';
import { buildAcceptance, type BudgetAcceptanceV2 } from './budgetAcceptanceV2';
import { newContractDraft, contractEconomics, contractSchedule, dataFields, personalFields, stable, productDetails, calendarDate, dueDay } from './contractV2';
import { buildReadyEvidence } from './contractReadyV2';
import { clientTermsDigest } from './contractV2Server';
import { operationFromAcceptance } from './operationV2';
import { requiredDocuments } from './creditReviewV2';
import type { LabReadySource } from './operationsLabFreeze';
import type { LabExecutionContext } from './operationsLabContext';
export function labBudget(context: LabExecutionContext, now: string): BudgetV2 {
 const reference=createCatalogReferenceDraft();
 Object.assign(reference,{nombre:'Lavarropas sintético',descripcion:'Gestión de compra — PRUEBA SIN PRODUCTO REAL',costoProveedor:'580000',proveedor:'PROVEEDOR SINTÉTICO'});
 reference.planesActivos[12]=true;
 const option=buildBudgetOptionV2('synthetic-option',{draft:reference,fechaCotizacion:now,source:'NEW_REFERENCE',referenceId:null});
 return {schemaVersion:'BUDGET_V2',id:'lab-'+context.sessionId,version:1,sourceCollection:'solicitudes_cuenta',solicitudId:'lab-request-'+context.sessionId,clienteSnapshot:{nombre:'Cliente sintético del laboratorio',dni:'12345678',cuil:'',whatsapp:'5491100000000',localidad:'Localidad sintética'},options:[option],estado:'EMITIDO',revision:1,revisionOf:null,issuedAt:now,createdAt:now,updatedAt:now};
}
export function labAcceptance(budget:BudgetV2, actor:string, at:string, commandId:string){return buildAcceptance(budget,{budgetId:budget.id,version:budget.version,acceptedOptionId:'synthetic-option',preferredPlanCuotas:12,commandId},actor,at);}
/** Called only after the owner explicitly confirms synthetic data/document/credit review. */
export function labReadySource(budget:BudgetV2,acceptance:BudgetAcceptanceV2,actor:string,now:string,commandId:string,settings?:LabDraftSettings):LabReadySource {
 const d=newContractDraft(budget,acceptance,actor,now);
 d.personalData=dataFields({fullName:budget.clienteSnapshot.nombre,dni:'12345678',address:'Domicilio sintético 123',locality:'Localidad sintética',province:'02',postalCode:'C1425ABC',email:'persona@example.test',whatsapp:'5491100000000'},personalFields,true);
 d.productDetails=settings?productDetails({quantity:settings.quantity,condition:settings.condition}):{quantity:1,condition:'NEW'};
 d.economicTerms=contractEconomics(acceptance.optionSnapshot.referenceSnapshot,12);
 if(d.economicTerms.capitalAmount!==580000||d.economicTerms.serviceAmount!==1160000||d.economicTerms.contractTotal!==1740000||d.economicTerms.contractInstallmentAmount!==145000)throw Error('LAB_SCENARIO_PRICING_CHANGED');
 const first=new Date(now);first.setUTCMonth(first.getUTCMonth()+1,15);
 d.firstInstallmentDueDate=settings?calendarDate(settings.firstDate):first.toISOString().slice(0,10);d.preferredMonthlyDueDay=settings?dueDay(settings.dueDay):15;
 d.paymentScheduleDraft=contractSchedule(d.economicTerms,d.firstInstallmentDueDate,d.preferredMonthlyDueDay);
 d.lastClientSubmissionId='synthetic-submission';d.lastClientSubmissionAppliedAt=now;d.lastClientSubmissionAppliedBy=actor;
 const evidence=buildReadyEvidence(budget,acceptance,d,actor,now,commandId);
 d.revision++;d.status='READY_TO_FORMALIZE';d.readyEvidenceId=commandId;d.updatedAt=now;d.updatedBy=actor;
 const operationId=operationFromAcceptance(acceptance).operationId;
 const hash=(v:unknown)=>createHash('sha256').update(stable(v)).digest('hex');
 const source:LabReadySource={budget,acceptance,draft:d,readyEvidence:evidence,
 reviewCommand:{action:'MARK_READY_TO_FORMALIZE',digest:hash({actor,input:{action:'MARK_READY_TO_FORMALIZE',commandId,expectedRevision:d.revision-1}}),by:actor,createdAt:now,result:d},
 reviewEvent:{action:'MARK_READY_TO_FORMALIZE',from:'DRAFT',to:'READY_TO_FORMALIZE',by:actor,at:now,afterRevision:d.revision,beforeRevision:d.revision-1,readyEvidenceId:commandId},
 conformity:{confirmedDigest:clientTermsDigest(d),confirmedAt:now,confirmedBy:actor},
 profile:{schemaVersion:'CLIENT_DOCUMENT_PROFILE_V2',profileId:operationId,originBudgetId:budget.id,originVersion:1,identityHash:hash({dni:d.personalData.dni,fullName:d.personalData.fullName.trim().normalize('NFKC').toLocaleUpperCase('es-AR')}),verifiedBy:actor,verifiedAt:now,verificationEvidence:'SIMULACIÓN EXPLÍCITA — NO IDENTIDAD REAL',revision:1,documents:{}},
 credit:{policy:'MANUAL_CREDIT_REVIEW_V1',operationId,revision:1,state:'APPROVED',profileOrigin:{budgetId:budget.id,version:1},resolution:'SIMULACIÓN EXPLÍCITA — NO APROBACIÓN REAL',notes:'Sólo laboratorio',reviewedBy:actor,reviewedAt:now,draftDataHash:hash({personalData:d.personalData,employmentData:d.employmentData}),documentsHash:null}};
 for(const type of requiredDocuments)source.profile.documents[type]={type,sourceBudgetId:budget.id,sourceVersion:1,attachment:{attachmentId:'synthetic-'+type,storagePath:'NO_STORAGE_OBJECT_SYNTHETIC_ONLY',originalName:'Evidencia sintética '+type,mimeType:'text/plain',size:0,uploadedAt:now,uploadedBy:actor,sha256:hash({type,operationId,mode:'SYNTHETIC_ONLY'})},status:'VERIFIED',validUntil:first.toISOString().slice(0,10),reviewedAt:now,reviewedBy:actor,note:'Evidencia simulada, sin archivo ni documento de identidad real'};
 source.credit.documentsHash=hash(source.profile.documents);
 return source;
}

export interface LabDraftSettings {quantity:number;condition:'NEW'|'USED';firstDate:string;dueDay:number}
export function validateLabDraftSettings(value:unknown):LabDraftSettings {
 if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).sort().join()!=='condition,dueDay,firstDate,quantity')throw new LabError(400,'LAB_DRAFT_SETTINGS_INVALID');
 const s=value as LabDraftSettings;
 try{const p=productDetails({quantity:s.quantity,condition:s.condition});
 if(p.quantity===null||p.condition===null)throw new LabError(400,'LAB_DRAFT_SETTINGS_INVALID');
 calendarDate(s.firstDate);dueDay(s.dueDay);return s;}catch{throw new LabError(400,'LAB_DRAFT_SETTINGS_INVALID');}
}
