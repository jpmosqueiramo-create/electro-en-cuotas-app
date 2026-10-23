import assert from 'node:assert/strict';
import { approvalInput,originalLegalArtifacts,assertRegistrableApproval,currentLegalArtifacts,legalIssuanceAssessment,type LegalApprovalRecord } from '../src/lib/legalApprovalV2';
for(const a of currentLegalArtifacts){assert.equal(a.textHash.length,64);assert(a.pending.length);}
assert.equal(legalIssuanceAssessment(currentLegalArtifacts,[],true).legalPrerequisitesSatisfied,false);
const artifacts=currentLegalArtifacts.map(a=>({...a,pending:[]}));
const records:LegalApprovalRecord[]=artifacts.map(({kind,version,textHash})=>({...approvalInput({kind,version,textHash,status:'VERIFIED',approvalDate:'2026-01-01',professional:'Profesional sintético',validationReference:'REFERENCIA SINTETICA NO LEGAL',evidence:null}),schemaVersion:'LEGAL_APPROVAL_V1',recordedBy:'synthetic-admin',recordedAt:'2026-01-01T00:00:00Z'}));
assert.equal(legalIssuanceAssessment(artifacts,records,true).legalPrerequisitesSatisfied,true);
assert.equal(legalIssuanceAssessment(artifacts,records,true).productiveIssuanceEnabled,false);
// Server registry envelopes add metadata; only explicit approval fields are validated.
assert.equal(legalIssuanceAssessment(artifacts,records.map((r,i)=>({...r,id:'record-'+i,digest:'technical-metadata'})),true).legalPrerequisitesSatisfied,true);
assert.equal(legalIssuanceAssessment(currentLegalArtifacts,records,true).legalPrerequisitesSatisfied,false);
assert.equal(legalIssuanceAssessment(artifacts,records,false).legalPrerequisitesSatisfied,false);
assert.equal(legalIssuanceAssessment(artifacts,records.map(r=>({...r,textHash:'0'.repeat(64)})),true).legalPrerequisitesSatisfied,false);
assert.equal(legalIssuanceAssessment(artifacts,records.map(r=>({...r,status:'OWNER_REPORTED'})),true).legalPrerequisitesSatisfied,false);
assert.equal(legalIssuanceAssessment(artifacts,records.map(r=>({...r,professional:null})),true).legalPrerequisitesSatisfied,false);
for(const invalid of ['2026-02-30','2099-01-01']){const {schemaVersion,recordedBy,recordedAt,...input}=records[0];void schemaVersion;void recordedBy;void recordedAt;assert.throws(()=>approvalInput({...input,approvalDate:invalid}));}
console.log('LEGAL_EXACT_VERSION_DECLARATION_SEPARATION_FORMAL_DATA_PRODUCTIVE_BLOCK=PASS');

for(const original of originalLegalArtifacts){
 const approval=approvalInput({...original,status:'OWNER_REPORTED',approvalDate:null,professional:null,validationReference:null,evidence:null});
 assertRegistrableApproval(approval);
 assert.throws(()=>assertRegistrableApproval({...approval,textHash:'0'.repeat(64)}));
 assert.throws(()=>assertRegistrableApproval({...approval,source:{...original.source,reference:'wrong.pdf'}}));
 const record:LegalApprovalRecord={...approval,schemaVersion:'LEGAL_APPROVAL_V1',recordedBy:'synthetic-admin',recordedAt:'2026-01-01T00:00:00Z'};
 assert.equal(legalIssuanceAssessment(artifacts,[record],true).legalPrerequisitesSatisfied,false);
 assert.equal(legalIssuanceAssessment(artifacts,[{...record,status:'VERIFIED',approvalDate:'2026-01-01',professional:'Synthetic professional',validationReference:'Synthetic reference'}],true).legalPrerequisitesSatisfied,false);
}
console.log('ORIGINAL_HASH_SOURCE_ISOLATION_NO_APPROVAL_TRANSFER=PASS');

assert.equal(approvalInput({...originalLegalArtifacts[0],status:'OWNER_REPORTED',approvalDate:'2026-01-01',professional:null,validationReference:'Declaración sintética',evidence:null}).status,'OWNER_REPORTED');
