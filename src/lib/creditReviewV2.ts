import type { DocumentType, BudgetAttachment } from './budgetAcceptanceV2';
export const CREDIT_POLICY = 'MANUAL_CREDIT_REVIEW_V1' as const;
export const creditStates = ['PENDING_DATA','PENDING_DOCUMENTS','IN_REVIEW','MORE_INFORMATION','APPROVED','REJECTED'] as const;
export type CreditState = typeof creditStates[number];
export const creditLabels: Record<CreditState,string> = { PENDING_DATA:'Pendiente de datos', PENDING_DOCUMENTS:'Pendiente de documentación', IN_REVIEW:'En evaluación', MORE_INFORMATION:'Información adicional requerida', APPROVED:'Aprobado', REJECTED:'Rechazado' };
export const requiredDocuments: DocumentType[] = ['DNI_FRONT','DNI_BACK','ADDRESS_PROOF'];
export interface ReviewedClientDocument { type:DocumentType; sourceBudgetId:string; sourceVersion:number; attachment:BudgetAttachment; status:'VERIFIED'|'OBSERVED'; validUntil:string|null; reviewedAt:string; reviewedBy:string; note:string }
export interface ClientDocumentProfile { schemaVersion:'CLIENT_DOCUMENT_PROFILE_V2'; profileId:string; originBudgetId:string; originVersion:number; identityHash:string; verifiedBy:string; verifiedAt:string; verificationEvidence:string; revision:number; documents:Partial<Record<DocumentType,ReviewedClientDocument>> }
export interface CreditReview { policy:typeof CREDIT_POLICY; operationId:string; revision:number; state:CreditState; profileOrigin:null|{budgetId:string;version:number}; resolution:string; notes:string; reviewedBy:string; reviewedAt:string; draftDataHash:string|null; documentsHash:string|null }
export function currentDocument(d:ReviewedClientDocument|undefined,now:string) { return !!d && d.status==='VERIFIED' && typeof d.validUntil==='string' && d.validUntil >= now.slice(0,10); }
export function creditPrerequisites(hasData:boolean,documents:Partial<Record<DocumentType,ReviewedClientDocument>>,now:string):CreditState {return !hasData?'PENDING_DATA':requiredDocuments.some(t=>!currentDocument(documents[t],now))?'PENDING_DOCUMENTS':'IN_REVIEW';}
