import { createHash } from 'node:crypto';
import { exact, stable } from './contractV2';
import { draftClauses, noteDraftText } from './contractDocuments/operationDraftTemplates';
import { contractLegalEntity } from './contractDocuments/legalEntity';
import { OPERATION_DOCUMENT_VERSION } from './contractDocuments/operationDraft';

export type LegalKind = 'MANDATE' | 'PROMISSORY_NOTE';
export interface LegalArtifact {kind:LegalKind;version:string;textHash:string;pending:string[]}
export interface LegalApprovalRecord {
 schemaVersion:'LEGAL_APPROVAL_V1';kind:LegalKind;version:string;textHash:string;
 status:'OWNER_REPORTED'|'VERIFIED';approvalDate:string|null;professional:string|null;validationReference:string|null;
 evidence:{path:string;sha256:string;generation:string}|null;recordedBy:string;recordedAt:string;
}
const digest=(v:unknown)=>createHash('sha256').update(stable(v)).digest('hex');
export const currentLegalArtifacts:readonly LegalArtifact[]=(['MANDATE','PROMISSORY_NOTE'] as const).map(kind=>({
 kind,version:OPERATION_DOCUMENT_VERSION,textHash:digest({kind,version:OPERATION_DOCUMENT_VERSION,issuer:contractLegalEntity,text:kind==='MANDATE'?draftClauses:noteDraftText}),
 pending:['Texto definitivo sin cláusulas pendientes','Representación y facultades de firma','Jurisdicción aplicable','Lugar y fecha efectivos','Validación profesional de versión exacta'],
}));
export const ownerLegalDeclaration={status:'OWNER_REPORTED' as const,scope:'Última versión, según declaración del titular',verifiedVersion:null,approvalDate:null,professional:null,validationReference:null};
function fail():never {throw Error('LEGAL_APPROVAL_INVALID');}
function text(v:unknown,max=500):string {if(typeof v!=='string'||!v.trim()||v.length>max)fail();return v;}
export function approvalInput(input:unknown) {
 const d=exact(input,['kind','version','textHash','status','approvalDate','professional','validationReference','evidence']);
 if(!['MANDATE','PROMISSORY_NOTE'].includes(String(d.kind))||!['OWNER_REPORTED','VERIFIED'].includes(String(d.status))||! /^[a-f0-9]{64}$/.test(String(d.textHash)))fail();text(d.version,120);
 if(d.status==='OWNER_REPORTED') {if([d.approvalDate,d.professional,d.validationReference,d.evidence].some(v=>v!==null))fail();}
 else {
  if(typeof d.approvalDate!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(d.approvalDate)||new Date(d.approvalDate).toISOString().slice(0,10)!==d.approvalDate||d.approvalDate>new Date().toISOString().slice(0,10))fail();
  text(d.professional);text(d.validationReference);
  // Private evidence is optional; a verified professional reference is mandatory.
  if(d.evidence!==null){const e=exact(d.evidence,['path','sha256','generation']);if(typeof e.path!=='string'||!/^legal-approvals\/[a-zA-Z0-9_-]+\/[a-zA-Z0-9_.-]+$/.test(e.path)||! /^[a-f0-9]{64}$/.test(String(e.sha256)))fail();text(e.generation,100);}
 }
 return d as unknown as Omit<LegalApprovalRecord,'schemaVersion'|'recordedBy'|'recordedAt'>;
}
/** Eligibility only. No emitter/numbering capability or runtime flag is created here. */
export function legalIssuanceAssessment(artifacts:readonly LegalArtifact[],records:readonly LegalApprovalRecord[],formalDataComplete:boolean) {
 const reasons:string[]=[];
 for(const kind of ['MANDATE','PROMISSORY_NOTE'] as const){const artifact=artifacts.find(a=>a.kind===kind);if(!artifact||artifacts.filter(a=>a.kind===kind).length!==1){reasons.push(kind+'_ARTIFACT_REQUIRED');continue;}
  if(artifact.pending.length)reasons.push(kind+'_TEXT_PENDING');
  const matching=records.find(r=>r.kind===kind&&r.version===artifact.version&&r.textHash===artifact.textHash&&r.status==='VERIFIED');
  if(!matching)reasons.push(kind+'_EXACT_APPROVAL_REQUIRED');else {try{const {schemaVersion,recordedBy,recordedAt,...input}=matching;if(schemaVersion!=='LEGAL_APPROVAL_V1')fail();text(recordedBy);if(!Number.isFinite(Date.parse(recordedAt)))fail();approvalInput(input);}catch{reasons.push(kind+'_APPROVAL_INVALID');}}
 }
 if(!formalDataComplete)reasons.push('FORMAL_DATA_REQUIRED');
 return {legalPrerequisitesSatisfied:reasons.length===0,productiveIssuanceEnabled:false as const,reasons:[...reasons,'INDEPENDENT_PRODUCTION_AUTHORIZATION_REQUIRED']};
}
