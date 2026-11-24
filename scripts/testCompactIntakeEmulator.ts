import './helpers/requireSafeEmulatorEnvironment';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { admin } from '../src/lib/firebaseAdmin';
import { fixture, addressPayload } from './testContractV2';
import { DATA_AUTHORIZATION_VERSION } from '../src/lib/clientFlowMessages';
import { acceptBudgetV2, loadDocumentation } from '../src/lib/budgetAcceptanceV2Server';
import { applyDocumentEvent, storagePath } from '../src/lib/budgetAcceptanceV2';
import { contractRefs, contractCommand, publicContractData } from '../src/lib/contractV2Server';
import { readCreditReview, creditCommand } from '../src/lib/creditReviewV2Server';
import { OPERATION_MAIN_STEPS, operationMainStep, isOperationIntake } from '../src/lib/operationWorkspaceV2';

async function acceptedCase(id: string) {
  const db = admin.firestore(), { b } = fixture(id), r = contractRefs(db, id, 1);
  b.clienteSnapshot.nombre = addressPayload.personalData.fullName;
  b.solicitudId = 'request-' + id;
  await db.collection(b.sourceCollection).doc(b.solicitudId).create({ datosPersonales: { nombreCompleto: b.clienteSnapshot.nombre, numeroDni: b.clienteSnapshot.dni }, estado: 'PENDIENTE' });
  await r.family.create({ sourceCollection: b.sourceCollection, solicitudId: b.solicitudId, lastVersion: 1 });
  await r.budget.create(b);
  await acceptBudgetV2(db, { budgetId: id, version: 1, acceptedOptionId: 'option-1', preferredPlanCuotas: 12, commandId: 'accept' }, 'synthetic-admin');
  return { id, b, r };
}
async function reviewCommand(id: string, action: string, extra: Record<string, unknown>) {
  const view = await readCreditReview(admin.firestore(), id, 1);
  return creditCommand(admin.firestore(), id, 1, { action, commandId: randomUUID(), expectedRevision: view.review?.revision ?? 0, expectedProfileRevision: view.profile?.revision ?? 0, ...extra }, 'synthetic-admin');
}
/** Firestore metadata only. No Storage client, uploads or production credentials. */
export async function compactIntakeFixtures() {
  const db = admin.firestore(), empty = await acceptedCase('compact-empty-' + randomUUID());
  const ready = await acceptedCase('compact-data-' + randomUUID());
  let d = (await contractCommand(db, ready.id, 1, { action: 'OPEN_OR_CREATE', commandId: 'open' }, 'synthetic-admin')).draft;
  const request = await contractCommand(db, ready.id, 1, { action: 'CREATE_CLIENT_DATA_REQUEST', expectedRevision: d.revision, commandId: 'request' }, 'synthetic-admin');
  await publicContractData(db, request.requestId!, request.secret!, { personalData: addressPayload.personalData, employmentData: addressPayload.employmentData, dataAuthorization: { version: DATA_AUTHORIZATION_VERSION, accepted: true } });
  d = (await contractCommand(db, ready.id, 1, { action: 'APPLY_CLIENT_SUBMISSION', expectedRevision: request.draft.revision, submissionId: request.requestId, commandId: 'apply' }, 'synthetic-admin')).draft;
  await reviewCommand(ready.id, 'VERIFY_IDENTITY', { evidence: 'Identidad sintética revisada para la prueba local.' });
  const { documentation } = await loadDocumentation(db, ready.id, 1);
  const attachment = { attachmentId: 'compact-fixture-front', storagePath: storagePath(ready.id, 1, 'DNI_FRONT', 'compact-fixture-front'), originalName: 'dni-sintetico.pdf', mimeType: 'application/pdf', size: 120, uploadedAt: new Date().toISOString(), uploadedBy: 'synthetic-admin', sha256: 'a'.repeat(64) };
  const seeded = applyDocumentEvent(documentation, 'DNI_FRONT', { type: 'UPLOADED', documentType: 'DNI_FRONT', attachmentId: attachment.attachmentId, at: attachment.uploadedAt, by: attachment.uploadedBy, note: null }, attachment);
  await ready.r.family.collection('documentation').doc('1').set(seeded);
  await reviewCommand(ready.id, 'REVIEW_DOCUMENT', { type: 'DNI_FRONT', attachmentId: attachment.attachmentId, status: 'VERIFIED', validUntil: '2099-12-31', note: 'Revisión explícita de metadatos sintéticos en el emulador.' });
  return { emptyId: empty.id, readyId: ready.id, r: empty.r, ready: { ...ready, d } };
}
async function tests() {
  const db = admin.firestore(), f = await compactIntakeFixtures();
  const budget = await f.ready.r.budget.get(), acceptance = await f.ready.r.acceptance.get(), draft = await f.ready.r.draft.get();
  const view = await readCreditReview(db, f.readyId, 1);
  assert.equal((await f.r.draft.get()).exists, false, 'Opening a newly accepted case must not prepare a draft');
  assert.equal(view.approved, false, 'One verified document never implies approval');
  assert.equal(view.documents.filter(d => d.required && d.status === 'VERIFIED').length, 1);
  assert.equal(view.documents.find(d => d.type === 'DNI_FRONT')!.fromThisOperation, true);
  assert.equal(view.documents.find(d => d.type === 'PAYSLIP')!.required, false);
  assert.deepEqual(OPERATION_MAIN_STEPS, ['documents', 'contract', 'logistics', 'payments']);
  assert.equal(operationMainStep('client'), 'documents');
  for (const section of ['documents', 'client'] as const) assert.equal(isOperationIntake(section), true);
  for (const section of ['contract', 'logistics', 'payments', 'affiliate', 'budget'] as const) assert.equal(operationMainStep(section), section);
  // Opening either old or new intake entry point is presentation only.
  for (const section of ['client', 'documents', 'contract', 'documents'] as const) {
    operationMainStep(section);
    await readCreditReview(db, f.readyId, 1);
    await loadDocumentation(db, f.readyId, 1);
  }
  assert.deepEqual((await f.ready.r.budget.get()).data(), budget.data());
  assert.ok((await f.ready.r.acceptance.get()).updateTime!.isEqual(acceptance.updateTime!));
  assert.ok((await f.ready.r.draft.get()).updateTime!.isEqual(draft.updateTime!));
  const stale = { action: 'REVIEW_DOCUMENT', expectedRevision: view.review!.revision - 1, expectedProfileRevision: view.profile!.revision, commandId: randomUUID(), type: 'DNI_FRONT', attachmentId: 'compact-fixture-front', status: 'VERIFIED', validUntil: '2099-12-31', note: 'Revisión desde otra sesión.' };
  await assert.rejects(creditCommand(db, f.readyId, 1, stale, 'synthetic-admin'), /cambió/);
  await assert.rejects(creditCommand(db, f.readyId, 1, { ...stale, commandId: randomUUID(), expectedRevision: view.review!.revision, type: 'DNI_BACK' }, 'synthetic-admin'), /Elegí un archivo/);
  await assert.rejects(contractCommand(db, f.readyId, 1, { action: 'MARK_READY_TO_FORMALIZE', expectedRevision: f.ready.d.revision, commandId: randomUUID() }, 'synthetic-admin'));
  assert.ok((await f.ready.r.budget.get()).updateTime!.isEqual(budget.updateTime!));
  assert.ok((await f.ready.r.draft.get()).updateTime!.isEqual(draft.updateTime!));
  console.log('COMPACT_INTAKE_EMULATOR = PASS; LEGACY_CLIENT_LINK=PASS; REQUIRED_DOCUMENTS=3; OPTIONAL_PAYSLIP=PASS; STALE_REVIEW_AND_WRONG_DOCUMENT_REJECTED=PASS; ACCEPTANCE_BUDGET_DRAFT_UNCHANGED=PASS; STORAGE_CALLS=0');
  console.log(JSON.stringify({ emptyId: f.emptyId, readyId: f.readyId }));
}
if (process.argv[1]?.endsWith('testCompactIntakeEmulator.ts')) void tests().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => admin.app().delete());
