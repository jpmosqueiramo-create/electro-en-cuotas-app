/** Offline review artifacts only. No Firebase, browser sessions, networking or issuance. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { contractLegalEntity } from '../src/lib/contractDocuments/legalEntity';
import { amountWords, formatDraftAmount } from '../src/lib/contractDocuments/amountWords';
import candidate from '../src/lib/productionV2/proposedPackages/originals-v1.json';
import fixture from '../docs/production-readiness/document-review-v1/fixture.json';

const root = path.resolve(__dirname, '..');
const output = path.resolve(process.argv[2] || path.join(root, 'tmp/pdfs/original-document-review'));
const sha = (bytes: string | Buffer) => createHash('sha256').update(bytes).digest('hex');
const canonical = (value: unknown): string => {
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  if (value !== null && typeof value === 'object') return '{' + Object.entries(value).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([k, v]) => JSON.stringify(k) + ':' + canonical(v)).join(',') + '}';
  return JSON.stringify(value);
};
const normal = (s: string) => s.replace(/PÁGINA \d+/g, '').replace(/\s+/g, ' ').trim();
const read = (p: string) => readFileSync(path.join(root, p));

assert.equal(candidate.status, 'PROPOSED_NOT_APPROVED');
assert.equal(candidate.installable, false);
assert.equal(candidate.professionalValidation, null);
assert.equal(candidate.representative.corporateEvidence, null);
assert.equal(candidate.jurisdiction.promissoryNotePolicy, null);
assert.deepEqual(JSON.parse(read('src/lib/productionV2/finalPackages.json').toString()), [], 'Do not run this review fixture as an installed final package');
assert.equal(fixture.synthetic, true);
assert.equal(fixture.contractNumber, null);
assert.equal(fixture.remitoNumber, null);
assert.equal(fixture.acceptance, null);
assert.equal(fixture.professionalApproval, null);
assert.equal(fixture.deliveryOccurred, false);
assert.deepEqual(fixture.signatures, []);
assert.equal(fixture.economy.total, fixture.economy.capital + fixture.economy.servicesGrossIncludingVat);
assert.equal(fixture.schedule.length, fixture.economy.installmentCount);
assert.equal(fixture.schedule.reduce((sum, i) => sum + i.amount, 0), fixture.economy.total);
assert.equal(fixture.economy.advance, null);
fixture.schedule.forEach((i, n) => {
  assert.equal(i.number, n + 1);
  assert.equal(i.amount, fixture.economy.installmentAmount);
  assert.match(i.dueDate, /^\d{4}-\d{2}-0[1-9]$/); // example respects original days 1-10
});
const documents = {} as Record<string, unknown>;
const sourceTexts = {} as Record<string, string>;
for (const kind of ['MANDATE', 'PAGARE', 'REMITO'] as const) {
  const d = candidate.documents[kind], s = candidate.sources[kind];
  sourceTexts[s.textPath] = sha(read(s.textPath));
  const original = normal(read(s.textPath).toString());
  if (kind !== 'REMITO') assert.equal(normal(d.blocks.map(b => b.originalText).join(' ')), original.slice(d.title.length).trim(), 'Every original clause must be present and in order: ' + kind);
  else d.blocks.forEach(b => assert.ok(original.includes(b.originalText)));
  documents[kind] = { version: d.version, canonicalTextSha256: sha(canonical(d)) };
}
const logo = read('public/logo-cuenta-hogar-oficial.png');
assert.equal(sha(logo), 'f4da4d3be0517fa40e169d771590ca450c8b2c5824a77b11f5333c619188647b');
const money = fixture.economy;
const values: Record<string, string> = {
  'issuer.legalName': contractLegalEntity.legalName,
  'issuer.taxId': contractLegalEntity.taxId,
  'issuer.legalAddress': contractLegalEntity.legalAddress,
  'representative.fullName': candidate.representative.fullName,
  'representative.capacity': candidate.representative.capacity,
  'economy.totalDisplay': formatDraftAmount(money.total),
  'economy.totalWordsWithoutCurrency': amountWords(money.total).replace(/ PESOS(?= CON)/, ''),
};
for (const [k, v] of Object.entries(fixture.client)) values['client.' + k] = v;
for (const kind of ['contract', 'note'] as const) for (const [k, v] of Object.entries(fixture.issue[kind])) values['issue.' + kind + '.' + k] = v;
const rendered = Object.fromEntries(Object.entries(candidate.documents).map(([kind, d]) => [kind, {
  ...d,
  blocks: d.blocks.map(b => ({ ...b, text: b.text.replace(/\{\{([^}]+)\}\}/g, (_, key: string) => {
    assert.ok(Object.hasOwn(values, key), 'Unapproved review variable: ' + key); return values[key];
  }) })),
}]));
const data = {
  reviewOnly: true, warning: 'BORRADOR — NO VÁLIDO PARA FIRMA', candidateId: candidate.id, candidateVersion: candidate.version,
  fixture, issuer: contractLegalEntity, documents: rendered,
  display: { capital: formatDraftAmount(money.capital), services: formatDraftAmount(money.servicesGrossIncludingVat), total: formatDraftAmount(money.total),
    schedule: fixture.schedule.map(i => ({ ...i, amountDisplay: formatDraftAmount(i.amount) })) },
  digests: { algorithm: 'SHA-256', canonicalization: 'UTF-8 JSON recursively sorted keys, compact separators, no newline; byte hashes explicitly named',
    candidate: sha(canonical(candidate)), fixture: sha(canonical(fixture)), documents, sourceTextByteHashes: sourceTexts,
    brandPng: sha(logo), legalEntity: sha(canonical(contractLegalEntity)),
    authoringSources: Object.fromEntries(['scripts/prepareOriginalDocumentReview.ts', 'scripts/renderOriginalDocumentReview.py'].map(p => [p, sha(read(p))])),
  },
};
mkdirSync(output, { recursive: true });
writeFileSync(path.join(output, 'render-input.json'), JSON.stringify(data, null, 2) + '\n');
console.log(JSON.stringify({ status: 'PASS', originalClauses: 'complete in source order', proposedOnly: true, financialValuesUnchanged: true, candidateSha256: data.digests.candidate, output }));
