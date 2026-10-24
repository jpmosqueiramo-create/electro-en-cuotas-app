// Offline regression and reproducible review artifacts; no Firebase, network or credentials.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import amendment from '../src/lib/productionV2/proposedPackages/zero-penalties-v2.json';
import originalCandidate from '../src/lib/productionV2/proposedPackages/originals-v1.json';
import baseline from '../output/pdf/document-review-v1/manifest.json';
import { zeroPenaltyReviewTemplates } from '../src/lib/productionV2/zeroPenaltyProposal';
import { originalTemplates } from '../src/lib/productionV2/originals';
import { renderOriginalReview } from '../src/lib/productionV2/originalPdf';
import { FINAL_RENDERER_HASH, FINAL_RESOURCES_HASH } from '../src/lib/productionV2/pdf';
import { approvedFinalPackages, finalDocumentKinds, templateHash } from '../src/lib/productionV2/catalog';
import { contractValueHash } from '../src/lib/contractIntegrityV2';
import type { OperationDraftProjection } from '../src/lib/contractDocuments/operationDraft';
import { financialSummary } from '../src/lib/operationFinancialV2';

const checks: string[] = [];
const pass = (label: string) => { checks.push(label); console.log('PASS ' + label); };
const sha = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');
const args = process.argv.slice(2);
assert(args.every(x => x === '--write'));
assert.equal(sha(readFileSync(amendment.baseCandidate.path)), amendment.baseCandidate.sha256);
assert.deepEqual(approvedFinalPackages, []);
assert.equal(amendment.installable, false);
assert.equal(amendment.professionalValidation, null);
assert.equal(amendment.status, 'PROPOSED_NOT_APPROVED');
assert.deepEqual(amendment.ownerDecision, {
    reference: 'DECISIÓN DEFINITIVA SOBRE PUNITORIOS', penaltyInterestPolicy: 'ZERO',
    penaltyMonthlyPercent: '0', automaticLateSurcharges: false, penaltyCapitalization: 'DISABLED',
    retroactiveChanges: false, legalValidation: 'PENDING',
});
pass('EXACT_BASE_AND_ZERO_POLICY_NO_APPROVAL_OR_INSTALLATION');

const before = originalTemplates(), templates = zeroPenaltyReviewTemplates();
const differences: {kind: string; blockId: string; originalText: string; previousProposal: string; proposedText: string}[] = [];
for (const kind of finalDocumentKinds) {
    assert.equal(before[kind].sha256, baseline.templateVersions[kind].sha256);
    const { sha256: proposedHash, ...proposedBody } = templates[kind];
    assert.equal(proposedHash, templateHash(proposedBody));
    assert.deepEqual(templates[kind].blocks!.map(b => b.id), before[kind].blocks!.map(b => b.id));
    before[kind].blocks!.forEach((block, i) => {
        const next = templates[kind].blocks![i];
        assert.equal(next.type, block.type);
        if (next.text !== block.text) differences.push({kind, blockId: block.id,
            originalText: originalCandidate.documents[kind].blocks.find(b => b.id === block.id)!.originalText,
            previousProposal: block.text, proposedText: next.text});
    });
}
assert.deepEqual(differences.map(d => [d.kind, d.blockId]), [['MANDATE', 'default'], ['PAGARE', 'default-capitalization']]);
assert.deepEqual(templates.REMITO, before.REMITO);
assert.deepEqual(originalTemplates(), before);
pass('ONLY_TWO_CLAUSES_CHANGED_REMITO_AND_V1_HASHES_UNCHANGED');

const zeroText = 'No se cobrarán intereses punitorios ni recargos adicionales por atraso, ni se capitalizarán intereses punitorios.';
assert.equal(differences[0].proposedText, differences[0].originalText.replace(' con intereses punitorios del [PORCENTAJE]% mensual.', '.') + ' ' + zeroText);
assert.equal(differences[1].proposedText, differences[1].originalText.replace('En caso de mora, se pacta un interés punitorio del ________% mensual, que se capitalizará mensualmente.', zeroText));
for (const kind of ['MANDATE', 'PAGARE'] as const) {
    assert(!templates[kind].paragraphs.join(' ').includes('policy.penaltyMonthlyPercent'));
    assert(!templates[kind].paragraphs.join(' ').includes('capitalizará mensualmente'));
}
pass('DEFAULT_ACCELERATION_AND_SINGLE_DEBT_PRESERVED_NO_RATE_VARIABLE');

// This projection was created with demo-cuenta-hogar by the existing integration suite.
const projection = structuredClone(baseline.projection) as OperationDraftProjection;
assert.equal(projection.customer.email, 'demo@example.test');
const projectionBefore = structuredClone(projection);
const history = renderOriginalReview(projection);
for (const [kind, key] of [['MANDATE','mandate'], ['PAGARE','promissoryNote'], ['REMITO','remito']] as const) {
    const historicalBytes = readFileSync('output/pdf/document-review-v1/' + baseline.pdfs[kind].path);
    assert.equal(sha(historicalBytes), baseline.pdfs[kind].sha256);
    assert.equal(history[key].sha256, baseline.pdfs[kind].sha256);
    assert.deepEqual(Buffer.from(history[key].base64, 'base64'), historicalBytes);
}
pass('HISTORICAL_REVIEW_BYTES_AND_HASHES_IDENTICAL');

const result = renderOriginalReview(projection, templates);
assert.deepEqual(renderOriginalReview(projection, templates), result);
assert.deepEqual(projection, projectionBefore);
assert.deepEqual(result.remito, history.remito);
assert.equal(result.projection.number, null);
assert.equal(result.projection.issuance, 'DRAFT_REVIEW_ONLY');
pass('REPEATABLE_REVIEW_ONLY_NO_NUMBER_OR_PROJECTION_MUTATION');
assert.throws(() => renderOriginalReview({...projection, canPreview: false}, templates), /ORIGINAL_REVIEW_BLOCKED/);
pass('IDENTITY_OR_CONFORMITY_BLOCK_PRESERVED');
const pending = renderOriginalReview({...projection, economics: null, schedule: []}, templates);
assert(pending.mandate.pages > 0 && pending.promissoryNote.pages > 0);
pass('MISSING_ECONOMICS_REMAIN_PENDING_NOT_INVENTED');

const e = projection.economics!;
assert.deepEqual(e, {capital: 580000, service: 1160000, total: 1740000, count: 12, installment: 145000});
assert.equal(projection.schedule.reduce((sum, r) => sum + r.amount, 0), e.total);
pass('CAPITAL_GROSS_SERVICES_TOTAL_AND_TWELVE_INSTALLMENTS_UNALTERED');
const financial = {totalCents: e.total * 100, installments: projection.schedule.map(r => ({number: r.installmentNumber, dueDate: r.dueDate, amountCents: r.amount * 100}))};
const financialBefore = structuredClone(financial);
for (const asOf of ['2026-11-01', '2027-12-31', '2036-12-31']) {
    const unpaid = financialSummary(financial, [], asOf);
    assert.equal(unpaid.lateChargesCents, 0); assert.equal(unpaid.balanceCents, e.total * 100);
    const partial = financialSummary(financial, [{allocations: [{installmentNumber: 1, amountCents: 10000}], reversedAt: null}], asOf);
    assert.equal(partial.balanceCents, e.total * 100 - 10000); assert.equal(partial.lateChargesCents, 0);
    const reversed = financialSummary(financial, [{allocations: [{installmentNumber: 1, amountCents: 10000}], reversedAt: '2026-10-24T00:00:00Z'}], asOf);
    assert.equal(reversed.balanceCents, e.total * 100); assert.equal(reversed.lateChargesCents, 0);
}
assert.equal(financialSummary(financial, [], '2036-12-31').overdueCount, 12);
assert.deepEqual(financial, financialBefore);
pass('EXISTING_LEDGER_NO_SURCHARGES_OR_COMPOUNDING_AFTER_TEN_YEARS_PARTIAL_AND_REVERSAL');

const folder = 'output/pdf/document-review-zero-penalties-v2';
const artifacts = Object.fromEntries(([
    ['MANDATE', 'mandate', 'mandato-sin-punitorios-revision.pdf'],
    ['PAGARE', 'promissoryNote', 'pagare-sin-punitorios-revision.pdf'],
    ['REMITO', 'remito', 'remito-sin-cambios-revision.pdf'],
] as const).map(([kind, key, path]) => {
    const bytes = Buffer.from(result[key].base64, 'base64');
    assert.equal(sha(bytes), result[key].sha256);
    if (args.includes('--write')) { mkdirSync(folder, {recursive: true}); writeFileSync(folder + '/' + path, bytes); }
    else assert.deepEqual(readFileSync(folder + '/' + path), bytes);
    return [kind, {path, sha256: result[key].sha256, pages: result[key].pages}];
}));
pass('THREE_REVIEW_PDFS_REPRODUCIBLE');
const manifest = {
    schemaVersion: 'ZERO_PENALTIES_REVIEW_MANIFEST_V1', version: amendment.version,
    status: amendment.status, installable: false, professionalValidation: null,
    amendmentFileSha256: sha(readFileSync('src/lib/productionV2/proposedPackages/zero-penalties-v2.json')),
    amendmentHash: contractValueHash(amendment), ownerDecision: amendment.ownerDecision,
    sourceDocuments: originalCandidate.sources, differences,
    templates, templateHash: contractValueHash(templates),
    rendererHash: FINAL_RENDERER_HASH, resourcesHash: FINAL_RESOURCES_HASH,
    fixtureSource: 'output/pdf/document-review-v1/manifest.json (demo-cuenta-hogar synthetic projection)',
    projection, pdfs: artifacts, checks, productionWrites: 0, networkRequests: 0,
};
const serialized = JSON.stringify(manifest, null, 2) + '\n';
if (args.includes('--write')) writeFileSync(folder + '/manifest.json', serialized);
else {
    // Preserve provenance of the archived V2 artifacts even after renderer code evolves.
    // Current renderer integrity is tested separately; identical historical bytes above remain mandatory.
    const archived = readFileSync(folder + '/manifest.json');
    assert.equal(sha(archived), 'f929e3d7a3e6951153f3a54fbdcba5de32d640f57b2ec9eaa4e95e3f632d009a');
    const saved = JSON.parse(archived.toString());
    assert.deepEqual(saved, {...manifest, rendererHash:saved.rendererHash});
}
console.log(JSON.stringify({status: 'PASS', groups: checks.length, productionWrites: 0, templateHash: manifest.templateHash, pdfs: artifacts}));
