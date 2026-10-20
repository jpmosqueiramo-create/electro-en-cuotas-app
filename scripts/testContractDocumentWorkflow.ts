import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { assertReviewTransition, documentPolicy, documentStages } from '../src/lib/contractDocuments/workflow';
import { createPrivateDocumentArchiveEmulator } from '../src/lib/contractDocuments/archiveEmulator';
import { syntheticDocumentSample } from '../src/lib/contractDocuments/sample';
import { projectContractReview } from '../src/lib/contractDocuments/projection';
import { generateContractReviewPair } from '../src/lib/contractDocuments/pdf';
for(const target of documentStages)assert.throws(()=>assertReviewTransition(target,{contractSigned:true,promissoryNoteSigned:true,legalApproval:'APPROVED'}));
assert.equal(documentPolicy.issuance,'REVIEW_ONLY');assert.equal(documentPolicy.productiveFreeze,'DISABLED');
const saved={...process.env};
try{
  for(const key of ['GOOGLE_APPLICATION_CREDENTIALS','FIREBASE_CLIENT_EMAIL','FIREBASE_PRIVATE_KEY','FIREBASE_SERVICE_ACCOUNT_KEY','FIREBASE_SERVICE_ACCOUNT_JSON','FIREBASE_CONFIG','K_SERVICE','GAE_ENV'])Reflect.deleteProperty(process.env,key);
  Object.assign(process.env,{NODE_ENV:'development',GCLOUD_PROJECT:'demo-cuenta-hogar',NEXT_PUBLIC_FIREBASE_PROJECT_ID:'demo-cuenta-hogar',GOOGLE_CLOUD_PROJECT:'demo-cuenta-hogar',FIRESTORE_EMULATOR_HOST:'127.0.0.1:8080',FIREBASE_AUTH_EMULATOR_HOST:'127.0.0.1:9099',FIREBASE_STORAGE_EMULATOR_HOST:'127.0.0.1:9199'});
  const {snapshot,documents}=syntheticDocumentSample();assert.equal(documents.manifest.contractNumber,snapshot.contractNumber);assert.equal(documents.mandate.pages,2);assert.equal(documents.promissoryNote.pages,1);
  assert.equal(projectContractReview(snapshot).economics.total,snapshot.economicTerms.contractTotal);assert.deepEqual(documents.mandate.bytes,generateContractReviewPair(snapshot).mandate.bytes);
  Object.assign(process.env,{NODE_ENV:'production'});assert.throws(()=>syntheticDocumentSample());assert.throws(()=>createPrivateDocumentArchiveEmulator());
  Object.assign(process.env,{NODE_ENV:'development',FIREBASE_STORAGE_EMULATOR_HOST:'storage.example.test:9199'});assert.throws(()=>createPrivateDocumentArchiveEmulator());
  Object.assign(process.env,{FIREBASE_STORAGE_EMULATOR_HOST:'127.0.0.1:9199',GOOGLE_APPLICATION_CREDENTIALS:'/forbidden'});assert.throws(()=>createPrivateDocumentArchiveEmulator());
}finally{for(const key of Object.keys(process.env))if(!(key in saved))Reflect.deleteProperty(process.env,key);Object.assign(process.env,saved);}
const api=readFileSync('src/app/api/admin/contract-document-samples/[kind]/route.ts','utf8');assert.ok(api.includes('verifyAdminAuth'));assert.ok(!api.includes('export async function POST'));
const dossier=readFileSync('src/lib/contractDocuments/dossier.ts','utf8');for(const write of ['tx.create(','tx.set(','tx.update(','tx.delete('])assert.ok(!dossier.includes(write));
console.log('DOCUMENT_WORKFLOW_MODEL_POLICY_SAMPLE_PRODUCTION_GUARDS = PASS');
