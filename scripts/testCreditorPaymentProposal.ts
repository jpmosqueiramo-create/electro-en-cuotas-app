// Offline: exact proposal comparison and synthetic PDF generation. No Firebase.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdirSync,writeFileSync} from 'node:fs';
import source from '../output/pdf/document-review-zero-penalties-v2/manifest.json';
import {creditorPaymentPlaceReviewTemplates,creditorPaymentReviewIssuer,creditorPaymentProposal} from '../src/lib/productionV2/creditorPaymentPlaceProposal';
import {zeroPenaltyReviewTemplates} from '../src/lib/productionV2/zeroPenaltyProposal';
import {clientPaymentPlaceReviewTemplates} from '../src/lib/productionV2/clientPaymentPlaceProposal';
import {renderContractPairReview,renderOriginalReview} from '../src/lib/productionV2/originalPdf';
import {approvedFinalPackages} from '../src/lib/productionV2/catalog';
import type {OperationDraftProjection} from '../src/lib/contractDocuments/operationDraft';
const v2=zeroPenaltyReviewTemplates(),v3=clientPaymentPlaceReviewTemplates(),next=creditorPaymentPlaceReviewTemplates();
assert.equal(v2.MANDATE.sha256,'ca1a5657f0023dff55ca9c0181571fe08d205f2b2e14bf7bc2a8c3b158b0f054');
assert.equal(v2.PAGARE.sha256,'4429925fbcc6d179595ac2f71b8a66fdc45e785fe9bf3a4bcbf715051e38f18a');
for(const [kind,id] of [['MANDATE','default'],['PAGARE','promise']] as const){
 assert.deepEqual(next[kind].blocks!.filter((b,i)=>b.text!==v2[kind].blocks![i].text).map(b=>b.id),[id]);
 assert(next[kind].paragraphs.join(' ').includes('No se cobrarán intereses punitorios'));
}
assert(next.MANDATE.paragraphs.join(' ').includes('dos (2) cuotas mensuales consecutivas'));
const note=next.PAGARE.paragraphs.join(' ');
assert(note.includes('A LA VISTA'));assert(note.includes('sin protesto'));assert(note.includes(creditorPaymentProposal.paymentPlace));
assert(!note.includes('client.paymentAddress'));assert(!note.includes('dos (2)'));assert(!note.includes('o donde la acreedora'));
assert.deepEqual(next.PAGARE.blocks!.find(b=>b.id==='jurisdiction'),v2.PAGARE.blocks!.find(b=>b.id==='jurisdiction'));
assert.deepEqual(next.REMITO,v2.REMITO);assert.deepEqual(approvedFinalPackages,[]);assert.equal(creditorPaymentProposal.installable,false);
const p=structuredClone(source.projection) as OperationDraftProjection,before=structuredClone(p);
const result=renderContractPairReview(p,next,undefined,creditorPaymentReviewIssuer());
assert.equal('remito' in result,false);assert.deepEqual(result,renderContractPairReview(p,next,undefined,creditorPaymentReviewIssuer()));assert.deepEqual(p,before);
assert.throws(()=>renderContractPairReview({...p,canPreview:false},next),/BLOCKED/);
const historical=renderOriginalReview(p,v2);assert.equal(historical.remito.sha256,source.pdfs.REMITO.sha256);assert.equal(historical.mandate.sha256,source.pdfs.MANDATE.sha256);
assert(v3.PAGARE.paragraphs.join(' ').includes('client.paymentAddress'));
const folder='output/pdf/document-review-creditor-payment-v4';mkdirSync(folder,{recursive:true});
const pdfs=Object.fromEntries(([['MANDATE','mandate','mandato-propuesto.pdf'],['PAGARE','promissoryNote','pagare-propuesto.pdf']] as const).map(([kind,key,path])=>{
 const artifact=result[key],bytes=Buffer.from(artifact.base64,'base64');assert.equal(createHash('sha256').update(bytes).digest('hex'),artifact.sha256);writeFileSync(folder+'/'+path,bytes);return [kind,{path,sha256:artifact.sha256,pages:artifact.pages}];
}));
writeFileSync(folder+'/manifest.json',JSON.stringify({status:'PROPOSED_NOT_APPROVED',professionalValidation:null,installable:false,proposal:creditorPaymentProposal,issuer:creditorPaymentReviewIssuer(),sourceDocuments:source.sourceDocuments,templates:next,projection:p,pdfs,productionWrites:0},null,2)+'\n');
console.log('PASS: original hashes, two exact amendments, creditor address, separate note jurisdiction, zero penalties, no two-installment note restriction, immutable historical PDFs, no internal remito, conformity gate, deterministic PDFs, unchanged economics/schedule, empty final catalog');
