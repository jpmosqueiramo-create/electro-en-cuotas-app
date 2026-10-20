import assert from 'node:assert/strict';
import { mkdtempSync,writeFileSync,readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { documentReviewFixture } from './helpers/contractDocumentFixtures';
import { createSyntheticReviewServer } from './helpers/contractDocumentPreview';
import { generateContractReviewPair,formatSnapshotAmount } from '../src/lib/contractDocuments/pdf';
import { projectContractReview } from '../src/lib/contractDocuments/projection';
import { sealContractSnapshot } from '../src/lib/contractSnapshotV2';
import { REVIEW_WARNING } from '../src/lib/contractDocuments/templates';
// Pagaré content-stream baseline: origin/main 829cd2987823782f1419bed075b7489d9a7333f5.
const PROMISSORY_NOTE_STREAM_BASELINE_SHA256='f2edc86c674fc2d2301091c69d528b7bb3c67fd1ff1c77498a76a31cce449db9';
async function main(){
 const s=documentReviewFixture(),before=JSON.stringify(s),p=projectContractReview(s),pair=generateContractReviewPair(s);
 assert.equal(JSON.stringify(s),before);assert.equal(p.contractNumber,s.contractNumber);assert.deepEqual(p.schedule,s.paymentSchedule.installments.map(row=>({number:row.installmentNumber,date:row.dueDate,amount:row.amount})));
 for(const definition of Object.values(pair.manifest.definitions))assert.ok(definition.templateId.startsWith('synthetic-'));
 assert.deepEqual(generateContractReviewPair(s).mandate.bytes,pair.mandate.bytes);
 assert.equal(pair.manifest.artifacts.mandate.sha256,createHash('sha256').update(pair.mandate.bytes).digest('hex'));
 assert.equal(Buffer.from(pair.mandate.bytes.slice(0,5)).toString(),'%PDF-');
 const tampered=structuredClone(s);tampered.personalData.address='tampered';assert.throws(()=>generateContractReviewPair(tampered));
 const {integrity:_integrity,...plain}=s;void _integrity;
 const incompatible=sealContractSnapshot({...plain,documentDefinitions:{...s.documentDefinitions,contract:{...s.documentDefinitions.contract,templateVersion:'OTHER'}}});assert.throws(()=>generateContractReviewPair(incompatible),/PACKAGE_MISMATCH/);
 const forbidden=sealContractSnapshot({...plain,issuer:{...s.issuer,profileId:'real-profile'}});assert.throws(()=>generateContractReviewPair(forbidden),/SYNTHETIC_SNAPSHOT_REQUIRED/);
 const unsupported=sealContractSnapshot({...plain,personalData:{...s.personalData,fullName:'Persona 😀'}});assert.throws(()=>generateContractReviewPair(unsupported),/UNSUPPORTED_REVIEW_TEXT/);
 const sensitive=sealContractSnapshot({...plain,acceptedReference:{...s.acceptedReference,proveedorSnapshot:'SECRET_INTERNAL_VENDOR'},employmentData:{cuil:'20-12345678-6',employerOrWorkName:'SECRET_WORKPLACE',workAddress:'SECRET_WORK_ADDRESS'}});
 const projected=JSON.stringify(projectContractReview(sensitive));for(const value of ['SECRET_INTERNAL_VENDOR','SECRET_WORKPLACE','SECRET_WORK_ADDRESS','factorSnapshot','proveedorSnapshot','costoProveedorSnapshot'])assert.ok(!projected.includes(value));
 for(const [value,expected] of [[580000.5,'$ 580.000,50'],[580000.505,'$ 580.000,505'],[0.0000001,'$ 0,0000001'],[1e21,'$ 1.000.000.000.000.000.000.000,00']] as const)assert.equal(formatSnapshotAmount(value),expected);
 for(let plan=1;plan<=18;plan++){
  const snapshot=documentReviewFixture(plan),pair=generateContractReviewPair(snapshot);assert.equal(projectContractReview(snapshot).schedule.length,plan);assert.equal(pair.mandate.pages,2);assert.equal(pair.promissoryNote.pages,1);
 }
 const secondNumber=sealContractSnapshot({...plain,contractNumber:'CH-000002',numbering:{...s.numbering,sequence:'2'}});
 assert.equal(generateContractReviewPair(secondNumber).manifest.contractNumber,'CH-000002');
 for(const snapshot of [s,sensitive,secondNumber,documentReviewFixture(18,'Descripción sintética extensa. '.repeat(3)),...[1,2,3,6,12].map(plan=>documentReviewFixture(plan))]){
  const docs=generateContractReviewPair(snapshot),dir=mkdtempSync(join(tmpdir(),'contract-document-test-'));
  writeFileSync(join(dir,'mandato.pdf'),docs.mandate.bytes);writeFileSync(join(dir,'pagare.pdf'),docs.promissoryNote.bytes);
  writeFileSync(join(dir,'expected.json'),JSON.stringify({contractNumber:snapshot.contractNumber,...(snapshot===s?{unchangedNoteStreamHash:PROMISSORY_NOTE_STREAM_BASELINE_SHA256}:{}),required:[REVIEW_WARNING,'LOOP GESTIÓN INTEGRAL S.R.L.','pendiente de validación documental',formatSnapshotAmount(snapshot.economicTerms.contractTotal),snapshot.personalData.fullName,'NO VÁLIDO PARA FIRMA'],forbidden:['SECRET_INTERNAL_VENDOR','SECRET_WORKPLACE','SECRET_WORK_ADDRESS','factorSnapshot','costoProveedorSnapshot','P4_PRIVATE'],economics:{capital:formatSnapshotAmount(snapshot.economicTerms.capitalAmount),service:formatSnapshotAmount(snapshot.economicTerms.serviceAmount),total:formatSnapshotAmount(snapshot.economicTerms.contractTotal)},rows:snapshot.paymentSchedule.installments.map(row=>({number:row.installmentNumber,date:row.dueDate.split('-').reverse().join('/'),amount:formatSnapshotAmount(row.amount)}))}));
  process.stdout.write(execFileSync(process.env.PDF_REVIEW_PYTHON??'python3',['scripts/verifyContractDocumentPdfs.py',dir],{encoding:'utf8'}));
 }
 // A fixed reference format must reject excess text, never clip it or silently add pages.
 assert.throws(()=>generateContractReviewPair(documentReviewFixture(18,'Descripción sintética extensa. '.repeat(120))),/REFERENCE_FORMAT_CONTENT_OVERFLOW/);
 const server=createSyntheticReviewServer(pair);await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));
 try{const address=server.address();assert.ok(address&&typeof address!=='string');const base=`http://127.0.0.1:${address.port}`;
  const html=await fetch(base);assert.equal(html.status,200);assert.ok((await html.text()).includes('Revisión administrativa'));assert.equal(html.headers.get('cache-control'),'no-store');
  const pdf=await fetch(`${base}/mandato.pdf`);assert.equal(pdf.headers.get('content-type'),'application/pdf');assert.deepEqual(Buffer.from(await pdf.arrayBuffer()),Buffer.from(pair.mandate.bytes));
  assert.equal((await fetch(`${base}/mandato.pdf`,{method:'POST'})).status,405);assert.equal((await fetch(`${base}/.env.local`)).status,404);
 }finally{await new Promise<void>((resolve,reject)=>server.close(error=>error?reject(error):resolve()));}
 const mode=process.env.NODE_ENV;try{Object.assign(process.env,{NODE_ENV:'production'});assert.throws(()=>generateContractReviewPair(s),/DISABLED/);assert.throws(()=>createSyntheticReviewServer(pair),/DISABLED/);}finally{if(mode===undefined)Reflect.deleteProperty(process.env,'NODE_ENV');else Object.assign(process.env,{NODE_ENV:mode});}
 for(const file of ['pdf.ts','projection.ts']){const code=readFileSync(`src/lib/contractDocuments/${file}`,'utf8');for(const forbidden of ['calcularPlanReferenciaCatalogo','contractEconomics(','contractSchedule(','firebase-admin','pdfGenerator'])assert.ok(!code.includes(forbidden));}
 console.log('CONTRACT_DOCUMENTS_MODEL_RENDERER_INTEGRITY_PREVIEW = PASS; PRODUCTION_DOCUMENT_ISSUANCE = DISABLED');
}
main().catch(error=>{console.error('CONTRACT_DOCUMENTS = FAIL',error instanceof Error?error.stack?.split('\n').filter(l=>l.trim().startsWith('at ')).slice(0,3).join('\n'):'unexpected');process.exitCode=1;});
