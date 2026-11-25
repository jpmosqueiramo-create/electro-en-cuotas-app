import './helpers/requireSafeEmulatorEnvironment';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { mock } from 'node:test';
import { admin } from '../src/lib/firebaseAdmin';
import { persistPublicSolicitud } from '../src/lib/publicSolicitudService';
import { budgetFixture } from './helpers/budgetV2Fixtures';
import { persistBudgetV2 } from '../src/lib/budgetV2Persistence';
import { acceptBudgetV2 } from '../src/lib/budgetAcceptanceV2Server';
import { contractCommand, contractRefs, publicContractData } from '../src/lib/contractV2Server';
import { addressPayload } from './testContractV2';
import { DATA_AUTHORIZATION_VERSION } from '../src/lib/clientFlowMessages';
import { creditCommand, readCreditReview } from '../src/lib/creditReviewV2Server';
import { requiredDocuments } from '../src/lib/creditReviewV2';
import { getBudgetDocumentationBucket, uploadBudgetDocument } from '../src/lib/budgetDocumentationStorage';
import { approvedFinalPackages, issuedDocumentKinds } from '../src/lib/productionV2/catalog';
import { productionRuntimeForEmulator } from '../src/lib/productionV2/runtime';
import { productionPaths } from '../src/lib/productionV2/freeze';
import { issueContractEditor } from '../src/lib/productionV2/simpleIssuance';
import { issuedOperation } from '../src/lib/productionV2/documents';
import { argentinaBusinessDate } from '../src/lib/productionV2/businessDate';
import { prepareClientProposal } from '../src/lib/clientProposalServer';
import { readLoopTariffs, saveLoopTariffs } from '../src/lib/loopServiceTariffsServer';
import { loopReferenceTariffs } from '../src/lib/loopServiceTariffs';
import { saveAffiliateProfile } from '../src/lib/affiliateRegistryServer';
import { readFulfillment, fulfillmentCommand } from '../src/lib/operationFulfillmentV2Server';
import { readCustody, custodyCommand } from '../src/lib/operationCustodyV2Server';
import { readDelivery, deliveryCommand } from '../src/lib/operationDeliveryV2Server';
import { saveDeliveryPhoto } from '../src/lib/operationDeliveryV2Photos';
import { readClientBinding, clientBindingCommand } from '../src/lib/operationClientV2Server';
import { financialCommand, financialRef, readFinancial, readFinancialReceipt } from '../src/lib/operationFinancialV2Server';
import { financialSummary, type FinancialState, type FinancialPayment } from '../src/lib/operationFinancialV2';
import { readPaymentReports, submitPaymentReport, decidePaymentReport } from '../src/lib/operationPaymentReportsServer';
import { affiliateSettlementCommand } from '../src/lib/affiliateSettlementAdmin';
import { withAdminCommissionAccess } from '../src/lib/affiliateCommissionAccess';
import { obtenerCuentaCorrienteVendedor, obtenerLedgerCustodiaEfectivo, listRemittanceCollections, previewSelectedCashRemittance } from '../src/lib/settlementsEngine';
import { readAffiliateCommissions } from '../src/lib/affiliateCommissionPortal';
import { contractValueHash } from '../src/lib/contractIntegrityV2';

// Uses actual persistence/domain services and the production adapter in emulators.
// The clock changes only Date in this Node process, never the OS or a server.
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aL1EAAAAASUVORK5CYII=', 'base64');
const db = admin.firestore();
const checks: string[] = [];
const timeline: Record<string, unknown>[] = [];
const output = resolve(process.env.LIFECYCLE_OUTPUT_DIR ?? '/tmp/cuenta-hogar-lifecycle-evidence');
const pass = (name: string) => { checks.push(name); console.log(name + ' = PASS'); };
const at = (date: string) => mock.timers.setTime(Date.parse(date + 'T15:00:00Z'));
const addDays = (date: string, days: number) => new Date(Date.parse(date + 'T15:00:00Z') + days * 86400000).toISOString().slice(0, 10);

async function main() {
  assert.match(process.env.LIFECYCLE_DATABASE_ID ?? '', /^lifecycle-/);
  assert.equal(process.env.FIREBASE_STORAGE_EMULATOR_HOST, '127.0.0.1:9199');
  assert.equal(process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET, 'demo-cuenta-hogar.appspot.com');
  const email = process.env.NEXT_PUBLIC_ADMIN_EMAIL!, password = 'Emulator-only-123';
  const adminUser = await admin.auth().getUserByEmail(email).catch(() => admin.auth().createUser({ email, password, emailVerified: true }));
  const root = { uid: adminUser.uid, admin: true };
  const runtime = productionRuntimeForEmulator(db, admin.auth(), [approvedFinalPackages[0]], [root.uid]);
  const bucket = await getBudgetDocumentationBucket();
  assert.equal((await db.collection(productionPaths.snapshots).get()).size, 0, 'Use a fresh named emulator database');
  await db.doc(productionPaths.counter).create({ schemaVersion: 'CONTRACT_NUMBER_COUNTER_V1', policyId: 'CONTRACT_NUMBERING_V1', executionMode: 'PRODUCTION', active: true, lastAllocatedSequence: '0', initializationAuthorizationReference: 'SYNTHETIC_ONLY' });
  await saveLoopTariffs(db, loopReferenceTariffs, 0, root.uid);
  mock.timers.enable({ apis: ['Date'], now: Date.parse('2026-11-24T15:00:00Z') });

  async function createCase(plan: number, percentage: number) {
    at('2026-11-24');
    const id = 'life-' + randomUUID(), sourceId = randomUUID();
    const input = { tipo: 'consulta_v2', nombreCompleto: 'Cliente sintético ' + plan, whatsapp: '5491100000000', localidad: 'Lincoln', productoNombre: 'Producto sintético' };
    const submitted = await Promise.all([persistPublicSolicitud(db, sourceId, input), persistPublicSolicitud(db, sourceId, input)]);
    assert.equal(submitted.filter(r => !r.replay).length, 1);
    await assert.rejects(persistPublicSolicitud(db, sourceId, { ...input, nombreCompleto: 'Otra persona' }));
    const source = submitted[0], b = budgetFixture(id); b.sourceCollection = source.sourceCollection; b.solicitudId = source.id; b.clienteSnapshot.nombre = input.nombreCompleto;
    let budget = await persistBudgetV2(db, { action: 'SAVE', commandId: randomUUID(), budget: b, expectedRevision: 0, privateOptionIds: [] }, root.uid);
    await assert.rejects(acceptBudgetV2(db, { budgetId: id, version: 1, acceptedOptionId: 'option-1', preferredPlanCuotas: plan, commandId: randomUUID() }, root.uid));
    budget = await persistBudgetV2(db, { action: 'ISSUE', commandId: randomUUID(), budget, expectedRevision: budget.revision, privateOptionIds: [] }, root.uid);
    const acceptance = { budgetId: id, version: 1, acceptedOptionId: 'option-1', preferredPlanCuotas: plan, commandId: randomUUID() };
    const accepted = await acceptBudgetV2(db, acceptance, root.uid); assert.deepEqual(await acceptBudgetV2(db, acceptance, root.uid), accepted);
    const r = contractRefs(db, id, 1);
    const cmd = async (action: string, extra: Record<string, unknown> = {}) => contractCommand(db, id, 1, { action, commandId: randomUUID(), ...(action === 'OPEN_OR_CREATE' ? {} : { expectedRevision: (await r.draft.get()).data()?.revision ?? 0 }), ...extra }, root.uid);
    await cmd('OPEN_OR_CREATE');
    const request = await cmd('CREATE_CLIENT_DATA_REQUEST');
    const personalData = { ...addressPayload.personalData, fullName: input.nombreCompleto };
    const employmentData = { ...addressPayload.employmentData, cuil: '20123456786' };
    await assert.rejects(publicContractData(db, request.requestId!, 'wrong-secret', { personalData, employmentData }));
    await assert.rejects(publicContractData(db, request.requestId!, request.secret!, { personalData, employmentData }), /autorización/);
    await assert.rejects(publicContractData(db, request.requestId!, request.secret!, { personalData, employmentData, dataAuthorization: { version: DATA_AUTHORIZATION_VERSION, accepted: false } }), /autorización/);
    await publicContractData(db, request.requestId!, request.secret!, { personalData, employmentData, dataAuthorization: { version: DATA_AUTHORIZATION_VERSION, accepted: true } });
    await cmd('APPLY_CLIENT_SUBMISSION', { submissionId: request.requestId });
    await cmd('SAVE_CONTRACT_EDITOR', { personalData, employmentData, productDetails: { quantity: 1, condition: 'NEW' }, contractPlanCuotas: plan, firstInstallmentDueDate: '2026-12-05', preferredMonthlyDueDay: plan === 18 ? 31 : 5, issuePlace: 'Ciudad sintética', loopServices: { category: 'C', tariffRevision: (await readLoopTariffs(db)).revision, otherServicesCents: 0, cftAnnualPercent: null, cftBasis: '', supplierTaxId: '20123456786', notePaymentPlace: 'Domicilio sintético', noteDueDate: plan === 18 ? '2028-05-31' : '2027-11-05', acceptanceChannel: 'WHATSAPP', proposalSentAt: '2026-11-24T09:00', clientAcceptedAt: '2026-11-24T09:10' } });
    const review = async (action: string, data: Record<string, unknown>) => { const v = await readCreditReview(db, id, 1); return creditCommand(db, id, 1, { action, commandId: randomUUID(), expectedRevision: v.review?.revision ?? 0, expectedProfileRevision: v.profile?.revision ?? 0, ...data }, root.uid); };
    await review('VERIFY_IDENTITY', { evidence: 'Verificación sintética explícita' });
    await assert.rejects(review('DECIDE', { state: 'APPROVED', resolution: 'Sin documentos', notes: 'Debe bloquearse' }));
    for (const type of requiredDocuments) {
      const doc = await uploadBudgetDocument(db, bucket, id, 1, type, { commandId: randomUUID(), originalName: 'synthetic.png', mimeType: 'image/png' }, png, root.uid);
      assert.equal((await readCreditReview(db, id, 1)).approved, false);
      await review('REVIEW_DOCUMENT', { type, attachmentId: doc.attachmentId, status: 'VERIFIED', validUntil: '2099-12-31', note: 'Revisión ficticia, sin efecto real' });
    }
    await review('DECIDE', { state: 'IN_REVIEW', resolution: 'Revisión manual sintética', notes: 'Caso ficticio en emuladores' });
    await review('DECIDE', { state: 'MORE_INFORMATION', resolution: 'Pedir aclaración sintética', notes: 'Caso ficticio en emuladores' });
    assert.equal((await readCreditReview(db, id, 1)).approved, false);
    await review('DECIDE', { state: 'IN_REVIEW', resolution: 'Aclaración recibida', notes: 'Caso ficticio en emuladores' });
    await review('DECIDE', { state: 'APPROVED', resolution: 'Aprobación sintética manual', notes: 'Caso ficticio en emuladores' });
    assert.equal((await readCreditReview(db, id, 1)).approved, true);
    const proposal = await prepareClientProposal(db, id, 1, { commandId: randomUUID(), expectedRevision: (await r.draft.get()).data()!.revision }, root.uid);
    await cmd('RECORD_CLIENT_CONFORMITY', { proposalCommandId: proposal.commandId, evidence: 'Conformidad sintética explícita de prueba, sin cliente real' });
    const issue = { commandId: randomUUID(), expectedRevision: (await r.draft.get()).data()!.revision, confirmed: true };
    const emitted = await issueContractEditor(runtime, bucket, id, 1, issue, root.uid);
    assert.equal((await issueContractEditor(runtime, bucket, id, 1, issue, root.uid)).snapshotId, emitted.snapshotId);
    const proof = await db.runTransaction(tx => issuedOperation(runtime, tx, id, 1, 'FINANCE'));
    const vendor = await admin.auth().createUser({ email: id + '-seller@example.test', password, emailVerified: true });
    const affiliateId = id + '-affiliate';
    await saveAffiliateProfile(db, { id: affiliateId, commandId: randomUUID(), expectedRevision: 0, nombre: 'Vendedor afiliado sintético', email: vendor.email!, localidad: 'Lincoln', telefono: '', authUid: vendor.uid, activo: true, porcentajeComision: percentage, reason: 'Prueba aislada' }, root.uid);
    const identity = (await readFulfillment(db, id, 1)).identity;
    await custodyCommand(db, id, 1, { action: 'ASSIGN', commandId: randomUUID(), expectedRevision: 0, operationId: identity.operationId, data: { affiliateId, uid: vendor.uid, reason: 'Asignación explícita sintética' } }, root);
    const client = await admin.auth().createUser({ email: id + '-client@example.test', password, emailVerified: true });
    const binding = await readClientBinding(db, id, 1, root.uid);
    await clientBindingCommand(db, id, 1, { action: 'LINK', commandId: randomUUID(), expectedRevision: binding.state.revision, operationId: identity.operationId, data: { uid: client.uid, reason: 'Cuenta sintética verificada' } }, root.uid);
    pass(`INTAKE_ACCEPT_DOCUMENTS_APPROVAL_ISSUANCE_${plan}`);
    return { id, r, b: budget, source, root, identity, affiliateId, seller: { uid: vendor.uid, admin: false }, client: { uid: client.uid, admin: false }, vendor, proof, cmd, percentage };
  }
  type Case = Awaited<ReturnType<typeof createCase>>;
  const view = (f: Case) => readFinancial(db, f.id, 1, root, 'ADMIN');
  async function command(f: Case, action: string, data: Record<string, unknown>) { const v = await view(f); return { action, data, commandId: randomUUID(), operationId: f.identity.operationId, expectedRevision: v.active ? v.revision : 0 }; }
  async function pay(f: Case, amountCents: number, method = 'TRANSFERENCIA', extra: Record<string, unknown> = {}) {
    const paymentId = randomUUID(), data = { paymentId, amountCents, method, effectiveDate: argentinaBusinessDate(), reference: 'SYNTHETIC-' + paymentId, ...extra };
    const c = await command(f, (await view(f)).active ? 'CREDIT_PAYMENT' : 'ACTIVATE_WITH_FIRST_PAYMENT', data);
    await financialCommand(db, f.id, 1, c, root);
    assert.equal((await financialCommand(db, f.id, 1, c, root)).replay, true);
    return { paymentId, data, c };
  }
  async function reconcile(f: Case, label: string) {
    const values = await Promise.all([readFinancial(db, f.id, 1, root, 'ADMIN'), readFinancial(db, f.id, 1, f.seller, 'AFFILIATE'), readFinancial(db, f.id, 1, f.client, 'CLIENT')]);
    const a = values[0]; assert(a.active);
    for (const v of values) { assert(v.active); for (const key of ['paidCents', 'balanceCents', 'paidInstallmentCount', 'pendingInstallmentCount', 'nextDueDate', 'lateChargesCents'] as const) assert.deepEqual(v[key], a[key]); assert.equal(v.totalCents, a.paidCents + a.balanceCents); }
    const ref = financialRef(db, f.id, 1), state = (await ref.get()).data() as FinancialState;
    const ps = (await ref.collection('payments').get()).docs.map(p => p.data() as FinancialPayment);
    const golden = financialSummary(state, ps, argentinaBusinessDate());
    assert.equal(a.paidCents, ps.filter(p => !p.reversedAt).reduce((n, p) => n + p.amountCents, 0));
    assert.deepEqual(a.installments, golden.installments);
    for (const p of ps) { assert.equal(p.allocations.reduce((n, r) => n + r.amountCents, 0), p.amountCents); const r = await readFinancialReceipt(db, f.id, 1, f.client, 'CLIENT', p.receiptId); assert.equal(r.receipt.amountCents, p.amountCents); }
    assert.equal((await ref.collection('receipts').get()).size, ps.length);
    assert.equal(state.snapshotHash, f.proof.snapshot.integrity.payloadHash);
    assert.deepEqual(state.installments, f.proof.snapshot.paymentSchedule.installments.map(i => ({ number: i.installmentNumber, dueDate: i.dueDate, amountCents: Math.round(i.amount * 100) })));
    for (const v of values.slice(1)) for (const k of ['capitalCents', 'serviceCents', 'history']) assert.equal(k in v, false);
    timeline.push({ case: f.id, plan: state.installments.length, label, date: argentinaBusinessDate(), paidCents: a.paidCents, balanceCents: a.balanceCents, paidInstallments: a.paidInstallmentCount, overdueCount: a.overdueCount, receipts: ps.length });
    return a;
  }
  async function report(f: Case, amountCents: number, method = 'EFECTIVO') {
    const body = { commandId: randomUUID(), operationId: f.identity.operationId, amountCents, method, effectiveDate: argentinaBusinessDate(), reference: 'SYNTHETIC-' + randomUUID(), cashRecipient: method === 'EFECTIVO' ? 'AFFILIATE' : null };
    const before = (await view(f));
    const r = await submitPaymentReport(db, f.id, 1, body, f.seller, 'AFFILIATE');
    assert.equal((await submitPaymentReport(db, f.id, 1, body, f.seller, 'AFFILIATE')).replayed, true);
    const after = await view(f); assert.equal(after.active, before.active); if (after.active && before.active) assert.equal(after.paidCents, before.paidCents);
    assert.equal((await readPaymentReports(db, f.id, 1, f.client, 'CLIENT')).reports.find(x => x.id === r.reportId)!.status, 'PENDING');
    return { ...r, body };
  }
  async function confirm(f: Case, r: Awaited<ReturnType<typeof report>>) {
    const v = await view(f), c = { action: 'CONFIRM', reportId: r.reportId, expectedRevision: 1, commandId: randomUUID(), financialRevision: v.active ? v.revision : 0, reference: r.body.reference };
    await decidePaymentReport(db, f.id, 1, c, root); await decidePaymentReport(db, f.id, 1, c, root);
  }
  async function remit(f: Case, deductCommission: boolean) {
    const before = (await financialRef(db, f.id, 1).get()).data();
    const rows = await withAdminCommissionAccess(db, root.uid, false, () => listRemittanceCollections(db, f.affiliateId));
    const q = await withAdminCommissionAccess(db, root.uid, false, () => previewSelectedCashRemittance(db, f.affiliateId, { collectionIds: rows.collections.map(c => c.id), deductCommission }));
    assert.equal(q.grossCents, q.receivedCents + q.commissionRetainedCents);
    const c = { action: 'REMIT_REVIEWED', commandId: randomUUID(), data: { collectionIds: q.collectionIds, deductCommission, previewHash: q.hash, method: 'TRANSFERENCIA', reference: 'Rendición sintética', notes: '' } };
    await affiliateSettlementCommand(db, f.affiliateId, root.uid, c); await affiliateSettlementCommand(db, f.affiliateId, root.uid, c);
    assert.equal((await obtenerLedgerCustodiaEfectivo(db, f.affiliateId)).efectivoPendienteRendicionCentavos, 0);
    assert.deepEqual((await financialRef(db, f.id, 1).get()).data(), before);
  }
  async function deliver(f: Case) {
    const today = argentinaBusinessDate(), holder = { uid: f.seller.uid, role: 'AFFILIATE', affiliateId: f.affiliateId };
    for (const [action, data] of [
      ['UPDATE_ORDER', { providerName: 'Proveedor sintético', providerReference: 'INTERNO', estimatedAvailabilityDate: today, notes: '' }], ['PLACE_ORDER', { orderDate: today }], ['CONFIRM_ORDER', { actualCost: 580000, confirmedAvailabilityDate: today }], ['READY_FOR_PICKUP', {}], ['RECORD_PICKUP', { actualPickupDate: today, pickupResponsible: 'Transportista sintético' }], ['RECEIVE', { actualReceiptDate: today, custodyLocation: 'Depósito sintético', custodian: 'Responsable sintético', visualCondition: 'SIN_DANOS_VISIBLES', notes: '' }], ['PLAN_TRIP', { tripReference: 'Viaje sintético', plannedTripDate: today, carrier: 'Transportista sintético' }], ['PLAN_DELIVERY', { destinationLocality: 'Lincoln', estimatedDeliveryDate: today, deliveryResponsible: 'Vendedor afiliado sintético' }],
    ] as const) { const v = await readFulfillment(db, f.id, 1); await fulfillmentCommand(db, f.id, 1, { action, data, commandId: randomUUID(), operationId: f.identity.operationId, expectedRevision: v.state.revision }, root.uid); }
    const custody = await readCustody(db, f.id, 1, root);
    assert(custody.state);
    await custodyCommand(db, f.id, 1, { action: 'AUTHORIZE_TRANSFER', commandId: randomUUID(), expectedRevision: custody.state.revision, operationId: f.identity.operationId, data: { from: { uid: root.uid, role: 'DEPOT', affiliateId: null }, to: holder, occurredAt: new Date().toISOString(), location: 'Lincoln', reason: 'Transferencia sintética' } }, root);
    const pending = (await readCustody(db, f.id, 1, root)).state;
    assert(pending);
    await custodyCommand(db, f.id, 1, { action: 'REGULARIZE', commandId: randomUUID(), expectedRevision: pending.revision, operationId: f.identity.operationId, data: { transferId: pending.pending!.id, reason: 'Sin conectividad, caso sintético', evidence: 'Respaldo ficticio' } }, root);
    const exec = async (action: string, data: Record<string, unknown>) => { const d = await readDelivery(db, f.id, 1, root); return deliveryCommand(db, f.id, 1, { action, data, commandId: randomUUID(), expectedRevision: d.state.revision, operationId: f.identity.operationId }, root); };
    await exec('PREPARE_DELIVERY', { responsible: holder });
    await assert.rejects(exec('REGULARIZE_DELIVERY', { occurredAt: new Date().toISOString(), reason: 'No documentos', alternativeEvidence: 'No debe alcanzar' }));
    for (const kind of issuedDocumentKinds(f.proof.package)) { const doc = f.proof.manifest.documents[kind]; await exec('PREPARE_DOCUMENT', { kind, photoId: doc.photoId, reference: f.proof.snapshot.contractNumber, templateVersion: doc.templateVersion }); mock.timers.setTime(Date.now() + 1); const pid = randomUUID(); await saveDeliveryPhoto(db, bucket, f.id, 1, pid, `${kind}_SIGNED`, doc.photoId, png, 'image/png', root); await exec('VERIFY_SIGNATURE', { kind, photoId: pid, clientSigned: true, identityChecked: true, legible: true, loopSigned: false, signedAt: new Date().toISOString() }); }
    if ((await readDelivery(db, f.id, 1, root)).state.documentPolicy) {
      const pid = randomUUID(); await saveDeliveryPhoto(db, bucket, f.id, 1, pid, 'EXTERNAL_TRANSFER', f.proof.snapshot.integrity.payloadHash, png, 'image/png', root);
      await exec('REGISTER_EXTERNAL_TRANSFER', { photoId: pid, number: 'REMITO-SINTETICO', date: today, issuer: 'Proveedor sintético', documentType: 'REMITO', applicabilityReference: 'Respaldo sintético', customerChecked: true, productChecked: true });
      const receipt = randomUUID(); await saveDeliveryPhoto(db, bucket, f.id, 1, receipt, 'DELIVERY_RECEIPT', pid, png, 'image/png', root);
      await exec('VERIFY_DELIVERY_RECEIPT', { photoId: receipt, receivedAt: new Date().toISOString(), observations: '', clientSigned: true, identityChecked: true, productChecked: true, legible: true });
    }
    await exec('RECEIVE_ORIGINALS', { holder: { uid: root.uid, role: 'DEPOT', affiliateId: null }, location: 'Carpeta sintética', receivedAt: new Date().toISOString(), reference: 'ORIGINALES-FICTICIOS', alternativeEvidence: '' });
    await exec('REGULARIZE_DELIVERY', { occurredAt: new Date().toISOString(), reason: 'Regularización explícita sintética', alternativeEvidence: 'Constancia ficticia de recepción' });
    assert.equal((await readDelivery(db, f.id, 1, root)).state.status, 'DELIVERED');
    pass('REAL_DELIVERY_DOCUMENTS_SIGNATURES_ORIGINALS_AND_CLOSURE');
  }

  const f = await createCase(12, 10), schedule = f.proof.snapshot.paymentSchedule.installments.map(i => ({ due: i.dueDate, amount: Math.round(i.amount * 100) }));
  const initialHashes = { budget: contractValueHash((await f.r.budget.get()).data()), acceptance: contractValueHash((await f.r.acceptance.get()).data()), snapshot: contractValueHash(f.proof.snapshot) };
  await pay(f, schedule[0].amount);
  assert.equal((await readClientBinding(db, f.id, 1, root.uid)).state.state, 'ACTIVE');
  assert.equal((await readDelivery(db, f.id, 1, root)).state.event, null);
  await reconcile(f, 'Primera cuota antes de entrega');
  await deliver(f);
  at(schedule[1].due);
  const half = Math.floor(schedule[1].amount / 2), cash = await report(f, half); await confirm(f, cash);
  assert.equal((await obtenerLedgerCustodiaEfectivo(db, f.affiliateId)).efectivoPendienteRendicionCentavos, half);
  await reconcile(f, 'Pago parcial en efectivo confirmado, rendición pendiente'); await remit(f, true);
  await pay(f, schedule[1].amount - half); await reconcile(f, 'Cuota 2 completada, comisión retenida descontada');
  at(schedule[2].due); const transfer = await report(f, schedule[2].amount, 'TRANSFERENCIA'); await confirm(f, transfer); await reconcile(f, 'Transferencia informada por vendedor afiliado');
  at(schedule[3].due); await pay(f, schedule[3].amount, 'EFECTIVO', { cashCustody: 'ADMIN' }); await reconcile(f, 'Efectivo recibido directamente por Administración');
  at(schedule[4].due); const rejected = await report(f, schedule[4].amount); await decidePaymentReport(db, f.id, 1, { action: 'REJECT', reportId: rejected.reportId, expectedRevision: 1, commandId: randomUUID(), note: 'No se recibió: rechazo sintético' }, root); await pay(f, schedule[4].amount); await reconcile(f, 'Informe rechazado; pago real separado');
  at(schedule[5].due); const reversed = await pay(f, schedule[5].amount); await financialCommand(db, f.id, 1, await command(f, 'REVERSE_PAYMENT', { paymentId: reversed.paymentId, reason: 'Transferencia asignada incorrectamente, ejemplo sintético' }), root); await reconcile(f, 'Reversión reabre saldo'); await pay(f, schedule[5].amount, 'TRANSFERENCIA', { reference: reversed.data.reference });
  at(addDays(schedule[6].due, 10)); const late = await reconcile(f, 'Cuota 7 impaga diez días'); assert.equal(late.overdueCount, 1); assert.equal(late.installments[6].daysPastDue, 10); assert.equal(late.lateChargesCents, 0);
  at(addDays(schedule[7].due, 3)); await pay(f, schedule[6].amount + schedule[7].amount); await reconcile(f, 'Un pago cubre cuotas 7 y 8 atrasadas');
  at(schedule[8].due); const direct = await pay(f, schedule[8].amount); const duplicate = await report(f, schedule[8].amount, 'TRANSFERENCIA'); await decidePaymentReport(db, f.id, 1, { action: 'LINK', reportId: duplicate.reportId, expectedRevision: 1, commandId: randomUUID(), paymentId: direct.paymentId, note: 'Transferencia ya acreditada, vincular sin duplicar' }, root); await reconcile(f, 'Informe vinculado a transferencia ya acreditada');
  at(addDays(schedule[9].due, -5)); await pay(f, schedule[9].amount + schedule[10].amount); await reconcile(f, 'Adelanto de dos cuotas sin recalcular el contrato');
  at(schedule[11].due);
  const beforeInvalid = contractValueHash((await financialRef(db, f.id, 1).get()).data());
  for (const bad of [0, -1, 1.1, Number.MAX_SAFE_INTEGER + 1, schedule[11].amount + 1]) await assert.rejects(financialCommand(db, f.id, 1, await command(f, 'CREDIT_PAYMENT', { paymentId: randomUUID(), amountCents: bad, method: 'TRANSFERENCIA', effectiveDate: argentinaBusinessDate(), reference: 'INVALID' }), root));
  assert.equal(contractValueHash((await financialRef(db, f.id, 1).get()).data()), beforeInvalid);
  const final = await pay(f, schedule[11].amount); const paid = await reconcile(f, 'Todas las cuotas pagadas'); assert.equal(paid.balanceCents, 0); assert.equal(paid.paidInstallmentCount, 12); assert.equal(paid.pendingInstallmentCount, 0); assert.equal(paid.nextDueDate, null);
  await assert.rejects(pay(f, 1));
  const account = await withAdminCommissionAccess(db, root.uid, false, () => obtenerCuentaCorrienteVendedor(db, f.affiliateId)), owed = account.saldoCuentaCorrienteCentavos;
  assert(owed > 0);
  const settlement = await affiliateSettlementCommand(db, f.affiliateId, root.uid, { action: 'PREPARE', commandId: randomUUID(), data: { amountCents: owed } });
  await affiliateSettlementCommand(db, f.affiliateId, root.uid, { action: 'CONFIRM', commandId: randomUUID(), data: { settlementId: settlement.id } });
  await affiliateSettlementCommand(db, f.affiliateId, root.uid, { action: 'PAY', commandId: randomUUID(), data: { settlementId: settlement.id, method: 'TRANSFERENCIA', reference: 'Pago sintético de comisiones' } });
  await financialCommand(db, f.id, 1, await command(f, 'REVERSE_PAYMENT', { paymentId: final.paymentId, reason: 'Reversión posterior al cierre y a la comisión pagada' }), root);
  assert.equal((await reconcile(f, 'Reversión después de cierre')).balanceCents, schedule[11].amount);
  const recovery = await readAffiliateCommissions(db, { uid: f.vendor.uid, email: f.vendor.email!, emailVerified: true }); assert(recovery.recoveryCents > 0);
  await pay(f, schedule[11].amount); await reconcile(f, 'Saldo repuesto después de reversión');
  assert.equal((await withAdminCommissionAccess(db, root.uid, false, () => obtenerCuentaCorrienteVendedor(db, f.affiliateId))).saldoCuentaCorrienteCentavos, 0);
  assert.equal((await obtenerLedgerCustodiaEfectivo(db, f.affiliateId)).efectivoPendienteRendicionCentavos, 0);
  assert.equal(contractValueHash((await f.r.budget.get()).data()), initialHashes.budget); assert.equal(contractValueHash((await f.r.acceptance.get()).data()), initialHashes.acceptance); assert.equal(contractValueHash((await db.collection(productionPaths.snapshots).doc(f.proof.snapshot.contractSnapshotId).get()).data()), initialHashes.snapshot);
  pass('LIFETIME_12_MIXED_PAYMENTS_THREE_ROLES_EXACT_CENTS_COMMISSIONS_AND_REOPEN');

  const g = await createCase(18, 15), gs = g.proof.snapshot.paymentSchedule.installments;
  assert.equal(gs.find(i => i.dueDate.startsWith('2028-02'))!.dueDate, '2028-02-29');
  for (let i = 0; i < gs.length; i++) { at(gs[i].dueDate); const amount = Math.round(gs[i].amount * 100); if (i === 0 || i === 8) { const r = await report(g, amount); await confirm(g, r); await remit(g, i === 8); } else await pay(g, amount); await reconcile(g, `Cuota mensual ${i + 1}/18`); }
  const final18 = await reconcile(g, 'Plan 18 completo'); assert.equal(final18.balanceCents, 0); assert.equal(final18.pendingInstallmentCount, 0); assert.equal(final18.nextDueDate, null);
  const account18 = await withAdminCommissionAccess(db, root.uid, false, () => obtenerCuentaCorrienteVendedor(db, g.affiliateId));
  const settlement18 = await affiliateSettlementCommand(db, g.affiliateId, root.uid, { action: 'PREPARE', commandId: randomUUID(), data: { amountCents: account18.saldoCuentaCorrienteCentavos } });
  await affiliateSettlementCommand(db, g.affiliateId, root.uid, { action: 'CONFIRM', commandId: randomUUID(), data: { settlementId: settlement18.id } });
  await affiliateSettlementCommand(db, g.affiliateId, root.uid, { action: 'PAY', commandId: randomUUID(), data: { settlementId: settlement18.id, method: 'EFECTIVO_EN_MANO', reference: 'Comisión sintética de plan 18' } });
  assert.equal((await withAdminCommissionAccess(db, root.uid, false, () => obtenerCuentaCorrienteVendedor(db, g.affiliateId))).saldoCuentaCorrienteCentavos, 0);
  assert.equal((await obtenerLedgerCustodiaEfectivo(db, g.affiliateId)).efectivoPendienteRendicionCentavos, 0);
  pass('LIFETIME_18_MONTHLY_PAYMENTS_15_PERCENT_FULL_NET_REMITTANCE_LEAP_YEAR');
  mkdirSync(output, { recursive: true });
  writeFileSync(resolve(output, 'full-lifecycle.json'), JSON.stringify({ status: 'PASS', databaseId: process.env.LIFECYCLE_DATABASE_ID, adminEmail: email, checks, timeline, cases: [f.id, g.id], simulatedInstallments: 30, productionWrites: 0, limits: ['Date-only backend clock; no real months elapsed', 'Synthetic 1px documentation; no real identity or legal validation', 'V2 late charges remain zero; no new policy invented', 'Finite scenarios; not proof of all possible states'] }, null, 2));
}

main().catch(error => { console.error('FULL_LIFECYCLE_FAILED', error); process.exitCode = 1; }).finally(async () => { mock.timers.reset(); mkdirSync(output, { recursive: true }); writeFileSync(resolve(output, 'full-lifecycle-progress.json'), JSON.stringify({ checks, timeline, complete: process.exitCode !== 1 }, null, 2)); await admin.app().delete(); });
