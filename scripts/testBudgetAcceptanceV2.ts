import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { budgetFixture } from './helpers/budgetV2Fixtures';
import { buildAcceptance, parseAcceptanceCommand, createDocumentationCase, applyDocumentEvent, DOCUMENT_TYPES, storagePath, MAX_ATTACHMENT_SIZE_BYTES, type BudgetAttachment } from '../src/lib/budgetAcceptanceV2';
import { documentationBucketName, sanitizeOriginalName, validateDocumentBytes, parseUploadFields } from '../src/lib/budgetDocumentationStorage';
import { renderBudgetPdfV2 } from '../src/lib/budgetV2Pdf';
import { toClientBudgetV2, budgetClientLines } from '../src/lib/budgetV2';

export const fixtureFiles = [
  { mime: 'image/jpeg', bytes: Buffer.from([255,216,255,224,0,0]) },
  { mime: 'image/png', bytes: Buffer.from([137,80,78,71,13,10,26,10,0]) },
  { mime: 'image/webp', bytes: Buffer.from('RIFF0000WEBPVP8 ') },
  { mime: 'application/pdf', bytes: Buffer.from('%PDF-1.4\nsynthetic fixture\n%%EOF') },
];
export function modelTests() {
  const budget = { ...budgetFixture('p4-model'), estado: 'EMITIDO' as const, issuedAt: '2026-10-18T12:00:00.000Z' };
  const original = structuredClone(budget);
  const command = { budgetId: budget.id, version: 1, acceptedOptionId: 'option-1', preferredPlanCuotas: null, commandId: 'accept-model' };
  const a = buildAcceptance(budget, parseAcceptanceCommand(command), 'admin-fixture', budget.issuedAt);
  assert.equal(a.preferredPlanAmountSnapshot, null);
  assert.deepEqual(a.optionSnapshot, budget.options[1]);
  const preferred = buildAcceptance(budget, { ...command, preferredPlanCuotas: 12 }, 'admin-fixture', budget.issuedAt);
  assert.equal(preferred.preferredPlanAmountSnapshot, budget.options[1].referenceSnapshot.planesOfrecidos.find(p => p.cuotas === 12)!.cuotaEstimada);
  for (const invalid of [{ ...command, extra: true }, { ...command, acceptedOptionId: ['option-0','option-1'] }, { ...command, version: '1' }, { ...command, budgetId: '../arbitrary' }, { ...command, preferredPlanCuotas: 19 }, { ...command, commandId: '' }]) assert.throws(() => parseAcceptanceCommand(invalid));
  for (const c of [{ ...command, acceptedOptionId: 'unknown' }, { ...command, preferredPlanCuotas: 8 }, { ...command, version: 2 }]) assert.throws(() => buildAcceptance(budget, c, 'admin-fixture', budget.issuedAt));
  assert.throws(() => buildAcceptance({ ...budget, estado: 'GENERADO', issuedAt: null }, command, 'admin-fixture', budget.issuedAt));
  assert.throws(() => buildAcceptance({ ...budget, options: [budget.options[1], budget.options[1]] }, command, 'admin-fixture', budget.issuedAt));
  assert.deepEqual(budget, original);
  let doc = createDocumentationCase(a);
  assert.equal(doc.workflowStage, 'DOCUMENTACION'); assert.deepEqual(Object.keys(doc.slots), DOCUMENT_TYPES);
  for (const slot of Object.values(doc.slots)) { assert.equal(slot.required, false); assert.equal(slot.status, 'SIN_CARGAR'); }
  const attachment: BudgetAttachment = { attachmentId: 'att-demo', storagePath: storagePath(budget.id, 1, 'DNI_FRONT', 'att-demo'), originalName: 'SECRET_DNI_DOCUMENT', mimeType: 'application/pdf', size: 5, uploadedAt: budget.issuedAt, uploadedBy: 'admin-fixture', sha256: 'synthetic' };
  const event = { documentType: 'DNI_FRONT' as const, attachmentId: attachment.attachmentId, at: budget.issuedAt, by: 'admin-fixture', note: null };
  doc = applyDocumentEvent(doc, 'DNI_FRONT', { ...event, type: 'UPLOADED' }, attachment); assert.equal(doc.slots.DNI_FRONT.status, 'CARGADO');
  doc = applyDocumentEvent(doc, 'DNI_FRONT', { ...event, type: 'OBSERVED', note: 'SECRET_PAYSLIP' }); assert.equal(doc.slots.DNI_FRONT.status, 'OBSERVADO'); assert.equal(doc.slots.DNI_FRONT.observedBy, 'admin-fixture');
  const safeDto = toClientBudgetV2({ ...budget, documentation: doc, secret: 'SECRET_STORAGE_PATH' } as typeof budget);
  const client = JSON.stringify(safeDto) + budgetClientLines(safeDto).join('\n') + renderBudgetPdfV2(safeDto).output();
  for (const sentinel of ['SECRET_DNI_DOCUMENT','SECRET_PAYSLIP','SECRET_STORAGE_PATH']) assert.ok(!client.includes(sentinel));
  doc = applyDocumentEvent(doc, 'DNI_FRONT', { ...event, type: 'DELETED' }); assert.equal(doc.slots.DNI_FRONT.status, 'SIN_CARGAR'); assert.equal(doc.events.length, 3);
  assert.throws(() => applyDocumentEvent(doc, 'DNI_FRONT', { ...event, type: 'OBSERVED', note: 'No file' }));
  for (const f of fixtureFiles) assert.equal(validateDocumentBytes(f.bytes, f.mime), f.mime);
  assert.throws(() => validateDocumentBytes(fixtureFiles[0].bytes, 'application/pdf'));
  assert.throws(() => validateDocumentBytes(Buffer.from('arbitrary'), 'text/plain'));
  assert.throws(() => validateDocumentBytes(Buffer.alloc(MAX_ATTACHMENT_SIZE_BYTES + 1), 'image/png'));
  assert.equal(sanitizeOriginalName('../../private\r\nname.pdf'), 'privatename.pdf');
  assert.throws(() => parseUploadFields({ commandId: 'upload', originalName: 'a.pdf', mimeType: 'application/pdf', storagePath: 'arbitrary' }));
  assert.throws(() => documentationBucketName({}));
  assert.equal(documentationBucketName({ NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: 'explicit.firebasestorage.app' }), 'explicit.firebasestorage.app');
  assert.throws(() => documentationBucketName({ GCLOUD_PROJECT: 'demo-cuenta-hogar', NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: 'production.appspot.com' }));
  const ui = readFileSync('src/components/admin/budgets/BudgetAcceptanceDocumentation.tsx','utf8'); assert.ok(!/firebase\/storage|getDownloadURL|uploadBytes|deleteObject/.test(ui));
  console.log('P4_ACCEPTANCE_MODEL_TESTS = PASS\nP4_DOCUMENTATION_MODEL_TESTS = PASS\nDOCUMENTATION_CLIENT_LEAKS = 0');
}
if (process.argv[1]?.endsWith('testBudgetAcceptanceV2.ts')) modelTests();
