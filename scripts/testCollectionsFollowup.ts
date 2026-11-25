import assert from 'node:assert/strict';
import { collectionNextStep, hasScheduledFollowup, loadCollectionFollowups, type CollectionContactHistory } from '../src/lib/collectionsFollowup';
import { collectionInboxCases, selectInboxCases } from '../src/lib/collectionsInbox';
import type { CollectionRow } from '../src/lib/collectionsOverview';
import { financialSummary } from '../src/lib/operationFinancialV2';

const today = '2026-11-25';
const summary = financialSummary({ totalCents: 10001, installments: [{ number: 1, dueDate: '2026-12-05', amountCents: 10001 }] }, [], today);
const row: CollectionRow = { key: 'budget:1', budgetId: 'budget', version: 1, operationId: 'operation', name: 'María Pérez', product: 'Sintético', saleDate: today, whatsapp: '', financial: { active: true, executionMode: 'EMULATOR_ONLY', mutationEnabled: false, revision: 1, contractNumber: 'CH-TEST', operationId: 'operation', snapshotHash: 'test', activatedAt: today, asOfDate: today, receipts: [], nextCursor: null, blockReason: '', ...summary } };
const promise = { id: 'promise', kind: 'PROMISE', note: 'Paga al cobrar', at: '2026-11-24T10:00:00Z', promisedDate: today, nextContactDate: null, recordedByMe: false };
const contact = { ...promise, id: 'contact', kind: 'CONTACT', note: 'Se volvió a conversar', at: '2026-11-25T01:00:00Z', promisedDate: null, recordedByMe: true };
const history: CollectionContactHistory = { records: [contact, promise], historyTruncated: false, latestPromise: promise };
const next = (extra: Partial<Parameters<typeof collectionNextStep>[0]> = {}) => collectionNextStep({ row, history, reports: 0, overdueCount: 0, today, ...extra });
async function main() {
  assert.match(next({ reports: 1 }).label, /pago informado antes de contactar/);
  assert.match(next({ reports: null }).label, /Verificar los pagos/);
  assert.match(next({ history: null }).label, /Actualizar el historial/);
  assert.match(next({ row: { ...row, financial: null } }).label, /Verificar el saldo/);
  assert.equal(next().label, 'Revisar si se cumplió la promesa');
  assert.equal(next().date, today);
  const scheduled = { ...history, records: [{ ...contact, nextContactDate: '2026-12-10' }] };
  assert.equal(next({ history: scheduled }).date, today, 'An earlier promise remains visible ahead of a later contact date.');
  assert.match(next({ history: { ...scheduled, latestPromise: null } }).label, /Próximo contacto programado/);
  assert.match(next({ history: { ...history, latestPromise: null, records: [{ ...contact, nextContactDate: today }] } }).label, /Retomar/);
  assert.match(next({ overdueCount: 2, history: { records: [], latestPromise: null, historyTruncated: false } }).label, /Contactar al cliente/);
  assert(row.financial?.active);
  const paid = { ...row, financial: { ...row.financial, balanceCents: 0 } };
  assert.match(next({ row: paid }).label, /Plan saldado/);
  assert.equal(hasScheduledFollowup(row, history), true); assert.equal(hasScheduledFollowup(paid, history), false);
  const data = { collections: [row], reports: [], vendors: [], followups: { [row.key]: history } };
  const cases = collectionInboxCases(data);
  assert.equal(cases.length, 1, 'A saved promise appears even before an installment is overdue.');
  assert.equal(selectInboxCases(cases, 'FOLLOWUP', 'perez').length, 1);
  assert.equal(selectInboxCases(cases, 'OVERDUE', '').length, 0);
  let flight = 0, maximum = 0;
  const rows = Array.from({ length: 9 }, (_, i) => ({ ...row, key: `b${i}:1`, budgetId: `b${i}` }));
  const loaded = await loadCollectionFollowups(rows, async url => {
    flight++; maximum = Math.max(maximum, flight); await new Promise(done => setTimeout(done, 2)); flight--;
    if (url.includes('/b3/')) throw Error('UNAVAILABLE');
    if (url.includes('/b4/')) return { records: [], historyTruncated: true };
    return history;
  });
  assert(maximum <= 4); assert.equal(loaded['b3:1'], null); assert.equal(loaded['b4:1'], null);
  assert.equal(loaded['b5:1']?.latestPromise?.id, 'promise');
  assert.equal(row.financial.balanceCents, 10001, 'Promises do not credit payments.');
  console.log('COLLECTIONS_FOLLOWUP_LAST_CONTACT_LATEST_PROMISE_SCHEDULED_CASES_PRIORITY_NO_INFERRED_PAYMENT_BOUNDED_PARTIAL_READS = PASS');
}
void main().catch(error => { console.error(error); process.exitCode = 1; });
