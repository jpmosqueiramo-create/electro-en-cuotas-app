import assert from 'node:assert/strict';
import { approvalInput,currentLegalArtifacts,legalIssuanceAssessment,type LegalApprovalRecord } from '../src/lib/legalApprovalV2';
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
