// Node-only allowlist. No financial engine, Firestore, live catalog or legacy PDF dependency.
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { canonicalizeContract,CONTRACT_CANONICALIZATION } from '../contractIntegrityV2';
import { calendarDate,dataFields,personalFields } from '../contractV2';
import { snapshotPayloadHash,contractIdentity,contractSnapshotId,contractNumber,type ContractSnapshotV2 } from '../contractSnapshotV2';
export const PROJECTION_SOURCE_SHA256=createHash('sha256').update(readFileSync(new URL(import.meta.url))).digest('hex');
export function projectContractReview(s:ContractSnapshotV2){
 canonicalizeContract(s);
 if(s.schemaVersion!=='CONTRACT_SNAPSHOT_V2'||s.currency!=='ARS'||s.freeze.state!=='TERMS_FROZEN'||s.integrity.canonicalizationVersion!==CONTRACT_CANONICALIZATION||s.integrity.hashAlgorithm!=='SHA-256'||s.integrity.payloadHash!==snapshotPayloadHash(s))throw Error('INVALID_REVIEW_SNAPSHOT_INTEGRITY');
 if(s.freeze.readinessPolicyVersion!=='EMULATOR_FIXTURE_ONLY_V1' && (s.freeze.readinessPolicyVersion!=='CONTRACT_TECHNICAL_REVIEW_V1'||s.freeze.executionMode!=='EMULATOR_ONLY'||s.freeze.integrationPolicyVersion!=='READY_FREEZE_EMULATOR_V1'||s.freeze.legalTemplateReviewRequired!==true))throw Error('PRODUCTION_DOCUMENT_ISSUANCE_DISABLED');
 if(!s.issuer.profileId.startsWith('synthetic-')||s.issuer.taxId!=='SYNTHETIC_NOT_A_TAX_ID'||Object.values(s.documentDefinitions).some(d=>d.legalApprovalId!=='SYNTHETIC_NOT_A_LEGAL_APPROVAL'))throw Error('SYNTHETIC_SNAPSHOT_REQUIRED');
 const identity={budgetId:s.sourceDraft.budgetId,budgetVersion:s.sourceDraft.budgetVersion,contractDraftId:s.sourceDraft.contractDraftId,acceptedOptionId:s.sourceDraft.acceptedOptionId};
 if(s.contractId!==contractIdentity(identity)||s.contractSnapshotId!==contractSnapshotId(identity)||s.contractNumber!==contractNumber(s.numbering.sequence))throw Error('INVALID_REVIEW_IDENTITY');
 if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(s.freeze.termsFrozenAt)||!Number.isFinite(Date.parse(s.freeze.termsFrozenAt)))throw Error('INVALID_REVIEW_TECHNICAL_DATE');
 const e=s.economicTerms,rows=s.paymentSchedule.installments;
 if(!Number.isInteger(e.contractPlanCuotas)||e.contractPlanCuotas<1||e.contractPlanCuotas>18||rows.length!==e.contractPlanCuotas||rows.some((r,i)=>r.installmentNumber!==i+1||r.amount!==e.contractInstallmentAmount))throw Error('INVALID_REVIEW_SCHEDULE');
 for(const value of [e.capitalAmount,e.serviceAmount,e.contractTotal,e.contractInstallmentAmount])if(!Number.isFinite(value)||value<0)throw Error('INVALID_REVIEW_AMOUNT');
 if(e.capitalAmount+e.serviceAmount!==e.contractTotal||e.contractInstallmentAmount*e.contractPlanCuotas!==e.contractTotal||rows.reduce((sum,row)=>sum+row.amount,0)!==e.contractTotal)throw Error('INVALID_REVIEW_RECONCILIATION');
 rows.forEach(row=>calendarDate(row.dueDate));
 if(rows[0].dueDate!==s.paymentSchedule.firstInstallmentDueDate||rows.some((row,i)=>i>0&&row.dueDate<=rows[i-1].dueDate))throw Error('INVALID_REVIEW_SCHEDULE');
 const p=s.personalData;dataFields(p,personalFields,true);
 const result={schemaVersion:'CONTRACT_REVIEW_PROJECTION_V1',technicalFrozenAt:s.freeze.termsFrozenAt,contractNumber:s.contractNumber,snapshotHash:s.integrity.payloadHash,
  customer:{fullName:p.fullName,dni:p.dni,address:p.address,locality:p.locality,province:s.addressInterpretation.provinceDisplayName,postalCode:p.postalCode,email:p.email,whatsapp:p.whatsapp},
  reference:{name:s.acceptedReference.nombre,description:s.acceptedReference.descripcion},
  economics:{capital:e.capitalAmount,service:e.serviceAmount,total:e.contractTotal,installment:e.contractInstallmentAmount,count:e.contractPlanCuotas},
  schedule:rows.map(row=>({number:row.installmentNumber,date:row.dueDate,amount:row.amount})),
  testIssue:{mandate:{date:s.documentContext.contractIssueDate,place:s.documentContext.contractIssuePlace},promissoryNote:{date:s.documentContext.promissoryNoteIssueDate,place:s.documentContext.promissoryNoteIssuePlace}},
 };
 // Built-in PDF WinAnsi font: reject unsupported text rather than corrupt or truncate it.
 function check(value:unknown):void{if(typeof value==='string'){if(/[^\x20-\xff\n\u2013\u2014\u2018\u2019\u201c\u201d\u2026\u20ac]/u.test(value))throw Error('UNSUPPORTED_REVIEW_TEXT');}else if(value&&typeof value==='object')Object.values(value).forEach(check);}
 check(result);return structuredClone(result);
}
export type ContractReviewProjection=ReturnType<typeof projectContractReview>;
