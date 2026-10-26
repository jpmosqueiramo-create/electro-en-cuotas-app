import {assertOwnerFinalCatalog} from './helpers/assertOwnerFinalCatalog';
// Offline proposal review. Firebase is neither imported nor contacted.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import amendment from '../src/lib/productionV2/proposedPackages/client-payment-place-v3.json';
import v2 from '../output/pdf/document-review-zero-penalties-v2/manifest.json';
import { clientPaymentPlaceReviewTemplates } from '../src/lib/productionV2/clientPaymentPlaceProposal';
import { renderOriginalReview } from '../src/lib/productionV2/originalPdf';
import { contractPaymentAddress, assertPaymentAddressConformity, recordedPaymentAddressIsCurrent } from '../src/lib/contractPaymentAddress';
import { contractValueHash } from '../src/lib/contractIntegrityV2';
import { FINAL_RENDERER_HASH, FINAL_RESOURCES_HASH } from '../src/lib/productionV2/pdf';
import { approvedFinalPackages } from '../src/lib/productionV2/catalog';
import type { OperationDraftProjection } from '../src/lib/contractDocuments/operationDraft';

const checks: string[] = [], pass = (label: string) => { checks.push(label); console.log('PASS ' + label); };
const sha = (x: Uint8Array) => createHash('sha256').update(x).digest('hex');
const args = process.argv.slice(2); assert(args.every(x => x === '--write'));
const templates = clientPaymentPlaceReviewTemplates(), projection = structuredClone(v2.projection) as OperationDraftProjection;
const sourceBefore = structuredClone(projection), address = contractPaymentAddress(projection.customer);
const consent = { confirmedPaymentAddressHash: address.hash };
assertOwnerFinalCatalog(approvedFinalPackages); assert.equal(amendment.installable, false); assert.equal(amendment.professionalValidation, null);
assert.deepEqual(templates.MANDATE, v2.templates.MANDATE); assert.deepEqual(templates.REMITO, v2.templates.REMITO);
const changed = templates.PAGARE.blocks!.filter((b, i) => b.text !== v2.templates.PAGARE.blocks[i].text);
assert.deepEqual(changed.map(b => b.id), ['promise']);
assert.equal(changed[0].text, v2.templates.PAGARE.blocks.find(b => b.id === 'promise')!.text.replace('en el domicilio de {{policy.notePaymentPlace}}, o donde la acreedora lo indique,', 'en el domicilio del suscriptor situado en {{client.paymentAddress}},'));
pass('ONLY_PAYMENT_PLACE_CHANGED_ZERO_PENALTIES_AND_SEPARATE_JURISDICTION_PRESERVED');
assert.equal(address.display, 'Domicilio demo, Lincoln, Buenos Aires, CP 6070');
assert.equal(contractPaymentAddress({...projection.customer, province: '06'}).hash, address.hash);
assert(!address.display.includes('Caracas'));
pass('CLIENT_ADDRESS_LOCALITY_PROVINCE_POSTAL_FROM_SOURCE_NO_ISSUER_FALLBACK');

for (const field of ['address', 'locality', 'province', 'postalCode'] as const) {
    const incomplete = {...projection, customer: {...projection.customer, [field]: ''}};
    assert.throws(() => renderOriginalReview(incomplete, templates, consent), /ADDRESS_INCOMPLETE/);
    const different = {...projection, customer: {...projection.customer, [field]: {address:'Otra calle 456',locality:'Junín',province:'Córdoba',postalCode:'6000'}[field]}};
    assert.throws(() => renderOriginalReview(different, templates, consent), /ADDRESS_CONFORMITY_REQUIRED/);
    assert.equal(recordedPaymentAddressIsCurrent(different.customer, consent), false);
}
assert.throws(() => contractPaymentAddress({...projection.customer, province:'Provincia inventada'}), /ADDRESS_INCOMPLETE/);
assert.throws(() => contractPaymentAddress({...projection.customer, address:'Calle\n123'}), /ADDRESS_INCOMPLETE/);
pass('INCOMPLETE_CHANGED_OR_INVALID_ADDRESS_BLOCKS_REVIEW');
assert.throws(() => renderOriginalReview(projection, templates), /ADDRESS_CONFORMITY_REQUIRED/);
assert.throws(() => renderOriginalReview(projection, templates, {}), /ADDRESS_CONFORMITY_REQUIRED/);
assert.equal(recordedPaymentAddressIsCurrent(projection.customer, {}), true);
assert.throws(() => assertPaymentAddressConformity(projection.customer, {}), /ADDRESS_CONFORMITY_REQUIRED/);
pass('LEGACY_CONFORMITY_RETAINED_BUT_NOT_REPURPOSED_AS_ADDRESS_ACCEPTANCE');
assert.throws(() => renderOriginalReview({...projection,canPreview:false}, templates, consent), /ORIGINAL_REVIEW_BLOCKED/);
pass('IDENTITY_AND_TERMS_CONFORMITY_GUARDS_PRESERVED');
const result = renderOriginalReview(projection, templates, consent);
assert.deepEqual(renderOriginalReview(projection, templates, consent), result);
assert.deepEqual(projection, sourceBefore);
const updated = {...projection, customer:{...projection.customer,address:'Otra calle 456'}};
const updatedResult = renderOriginalReview(updated, templates, {confirmedPaymentAddressHash:contractPaymentAddress(updated.customer).hash});
assert.notEqual(updatedResult.promissoryNote.sha256, result.promissoryNote.sha256);
assert.deepEqual(updatedResult.projection.economics, result.projection.economics);
assert.deepEqual(updatedResult.projection.schedule, result.projection.schedule);
pass('NEW_EXPLICIT_CONFORMITY_RECOVERS_PREVIEW_WITH_NEW_HASH_AMOUNTS_UNCHANGED');
assert.equal(result.mandate.sha256, v2.pdfs.MANDATE.sha256);
assert.equal(result.remito.sha256, v2.pdfs.REMITO.sha256);
for (const info of Object.values(v2.pdfs)) assert.equal(sha(readFileSync('output/pdf/document-review-zero-penalties-v2/' + info.path)), info.sha256);
pass('V2_PDFS_PRESERVED_MANDATE_AND_REMITO_IDENTICAL');
const folder = 'output/pdf/document-review-client-payment-place-v3';
const pdfs = Object.fromEntries(([
    ['MANDATE','mandate','mandato-revision.pdf'], ['PAGARE','promissoryNote','pagare-domicilio-cliente-revision.pdf'], ['REMITO','remito','remito-revision.pdf'],
] as const).map(([kind,key,path]) => {
    const bytes = Buffer.from(result[key].base64,'base64'); assert.equal(sha(bytes), result[key].sha256);
    if(args.includes('--write')) {mkdirSync(folder,{recursive:true});writeFileSync(folder+'/'+path,bytes);} else assert.deepEqual(readFileSync(folder+'/'+path),bytes);
    return [kind,{path,sha256:result[key].sha256,pages:result[key].pages}];
}));
const manifest = {schemaVersion:'CLIENT_PAYMENT_PLACE_REVIEW_MANIFEST_V1',version:amendment.version,status:amendment.status,installable:false,professionalValidation:null,
    amendmentFileSha256:sha(readFileSync('src/lib/productionV2/proposedPackages/client-payment-place-v3.json')),amendmentHash:contractValueHash(amendment),
    sourceDocuments:v2.sourceDocuments,ownerDecision:amendment.ownerDecision,legalReview:amendment.legalReview,
    differences:[{kind:'PAGARE',blockId:'promise',previousProposal:v2.templates.PAGARE.blocks.find(b=>b.id==='promise')!.text,proposedText:changed[0].text}],
    templates,templateHash:contractValueHash(templates),rendererHash:FINAL_RENDERER_HASH,resourcesHash:FINAL_RESOURCES_HASH,
    projection,syntheticConformity:consent,paymentAddress:address,pdfs,checks,productionWrites:0};
const text = JSON.stringify(manifest,null,2)+'\n';
if(args.includes('--write'))writeFileSync(folder+'/manifest.json',text);else {
 const archived=readFileSync(folder+'/manifest.json');
 assert.equal(sha(archived),'8ab3b546e1fcf2d6ccf47775d5b073678048d69b795bc0fc24322c7e5bc5da58','Historical provenance remains byte-identical');
 const saved=JSON.parse(archived.toString());
 assert.deepEqual(saved,{...manifest,rendererHash:saved.rendererHash},'All historical PDF bytes, fields and checks remain exact; current renderer tested separately');
}
console.log(JSON.stringify({status:'PASS',groups:checks.length,templateHash:manifest.templateHash,pdfs}));
