// Offline only. Exact source provenance, field substitution and deterministic review.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import source from '../src/lib/productionV2/proposedPackages/owner-final-uploaded-20261025.json';
import {approvedFinalPackages} from '../src/lib/productionV2/catalog';
import {assertOwnerFinalCatalog} from './helpers/assertOwnerFinalCatalog';
import {ownerFinalTemplates,ownerFinalIssuer} from '../src/lib/productionV2/ownerFinalDocuments';
import {renderContractPairReview} from '../src/lib/productionV2/originalPdf';
import baseline from '../output/pdf/document-review-v1/manifest.json';
import type {OperationDraftProjection} from '../src/lib/contractDocuments/operationDraft';
const normalize=(x:string)=>x.replace(/\s/g,'');
assertOwnerFinalCatalog(approvedFinalPackages);
for(const kind of ['MANDATE','PAGARE'] as const){
 const root=`docs/production-readiness/final-owner-files/${kind.toLowerCase()}-original`;
 assert.equal(createHash('sha256').update(readFileSync(root+'.pdf')).digest('hex'),source.sources[kind].sha256);
 const d=source.documents[kind];
 assert.equal(normalize(d.title+d.blocks.map(b=>b.originalText).join('')),normalize(readFileSync(root+'.txt','utf8')),'All original text accounted for');
 for(const b of d.blocks.filter(b=>b.type==='paragraph'||b.type==='heading')){
  const originalSegments=b.originalText.split(/\[[^\]]+\]|_{2,}/).filter(x=>x.trim());
  for(const segment of originalSegments){
   if(kind==='PAGARE'&&b.id==='amount'&&segment==='Por $ '){assert.equal(b.text,'Por {{economy.totalDisplay}} (Monto en números)');continue;}
   if(kind==='PAGARE'&&b.id==='issue'&&segment===' de 20'){assert.equal(b.text,'En la ciudad de {{issue.note.place}}, a los {{issue.note.day}} días del mes de {{issue.note.month}} de {{issue.note.year}}.');continue;}
   assert(b.text.includes(segment),'Only original variable placeholders may change');
  }
 }
}
const templates=ownerFinalTemplates(),text=templates.MANDATE.paragraphs.join(' '),note=templates.PAGARE.paragraphs.join(' ');
assert(text.includes('una (2) cuotas'));assert(note.includes('o donde la acreedora lo indique'));
assert(!/capitalizará mensualmente|interés punitorio del/.test(text+note));
const projection=structuredClone(baseline.projection) as OperationDraftProjection,before=structuredClone(projection);
const review=renderContractPairReview(projection,templates,undefined,ownerFinalIssuer());
assert.deepEqual(review,renderContractPairReview(projection,templates,undefined,ownerFinalIssuer()));
assert.deepEqual(projection,before);assert.equal(review.projection.number,null);
assert(review.mandate.pages>0&&review.promissoryNote.pages>0);
assert.throws(()=>renderContractPairReview({...projection,canPreview:false},templates),/BLOCKED/);
console.log('OWNER_FINAL_CATALOG PASS: exact original hashes and full text, variable mapping, deterministic PDF, no input mutation, mandatory guards; zero Firebase access');
