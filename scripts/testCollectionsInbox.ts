import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { CollectionsInbox } from '../src/components/admin/operations/CollectionsInbox';
import { collectionInboxCases, loadCollectionsInbox, loadPendingCollectionReports, selectInboxCases, type CollectionsInboxData } from '../src/lib/collectionsInbox';
import { financialSummary } from '../src/lib/operationFinancialV2';
import type { CollectionRow } from '../src/lib/collectionsOverview';
import type { PaymentReportPublic } from '../src/lib/operationPaymentReports';

const today = '2026-11-24';
const summary = financialSummary({ totalCents: 30003, installments: [{ number: 1, dueDate: '2026-10-24', amountCents: 10001 }, { number: 2, dueDate: '2026-11-23', amountCents: 10001 }, { number: 3, dueDate: '2026-12-24', amountCents: 10001 }] }, [{ reversedAt: null, allocations: [{ installmentNumber: 1, amountCents: 5001 }] }], today);
const row: CollectionRow = { key: 'budget:1', budgetId: 'budget', version: 1, operationId: 'operation', name: 'María José Pérez', product: 'Producto sintético', saleDate: today, whatsapp: '', financial: { active: true, mutationEnabled: false, revision: 1, contractNumber: 'CH-000007', operationId: 'operation', executionMode: 'EMULATOR_ONLY', snapshotHash: 'test', activatedAt: today, asOfDate: today, receipts: [], nextCursor: null, blockReason: '', ...summary } };
const report = (id: string, extra: Partial<PaymentReportPublic> = {}): PaymentReportPublic => ({ id, operationId: 'operation', budgetId: 'budget', version: 1, revision: 1, amountCents: 10001, method: 'EFECTIVO', effectiveDate: today, cashRecipient: 'AFFILIATE', createdAt: today + 'T12:00:00Z', decidedAt: null, paymentId: null, status: 'PENDING', reportedBy: 'AFFILIATE', reference: null, decisionNote: null, clientName: row.name, ...extra });
const data: CollectionsInboxData = { collections: [row], reports: [report('p1'), report('p2', { method: 'TRANSFERENCIA' })], vendors: [{ id: 'seller', name: row.name, active: false, cashCents: 7777 }, { id: 'unknown', name: 'Cuenta sin verificar', active: true, cashCents: null }, { id: 'zero', name: 'Sin custodia', active: true, cashCents: 0 }] };

async function main() {
  const before = JSON.stringify(data), cases = collectionInboxCases(data);
  assert.equal(cases.length, 2, 'Two reports and two overdue installments share one operation case; seller stays separate despite identical name.');
  assert.equal(cases[0].kind, 'OPERATION');
  if (cases[0].kind !== 'OPERATION') throw Error();
  assert.equal(cases[0].overdueCents, 15001); assert.equal(cases[0].overdueCount, 2); assert.equal(cases[0].reports.length, 2);
  assert.equal(cases[0].oldestDue, '2026-10-24');
  assert.equal(selectInboxCases(cases, 'CASH', '').length, 1);
  assert.equal(selectInboxCases(cases, 'REPORTS', 'perez maria').length, 1);
  assert.equal(selectInboxCases(cases, 'OVERDUE', 'CH-000007').length, 1);
  assert.equal(selectInboxCases(cases, 'ALL', 'inexistente').length, 0);
  assert.equal(collectionInboxCases({ ...data, reports: [report('other', { operationId: 'another', clientName: row.name })] }).length, 3, 'No name-based join.');
  assert.equal(collectionInboxCases({ ...data, reports: [report('other-version', { version: 2 })] }).length, 3, 'Different versions cannot merge.');
  assert.equal(collectionInboxCases({ ...data, reports: [report('other-budget', { budgetId: 'other-budget' })] }).length, 3, 'Different budgets cannot merge.');
  assert.equal(collectionInboxCases({ ...data, collections: [], reports: data.reports }).length, 2, 'Pending first installment must remain visible before activation.');
  assert.equal(collectionInboxCases({ ...data, reports: null }).length, 2, 'One unavailable source must preserve other pending cases.');
  assert.equal(JSON.stringify(data), before, 'No snapshot or balance mutation.');

  let pageCalls = 0;
  const pages = await loadPendingCollectionReports(async url => {
    pageCalls++;
    if (!url.includes('?')) return { reports: Array.from({ length: 50 }, (_, n) => report('p' + n)), nextCursor: 'with/slash?cursor' };
    assert(url.endsWith('cursor=with%2Fslash%3Fcursor'));
    return { reports: [report('p49'), report('p50')], nextCursor: null };
  });
  assert.equal(pages.length, 51); assert.equal(pageCalls, 2);
  await assert.rejects(loadPendingCollectionReports(async () => ({ reports: [], nextCursor: 'loop' })), /INCOMPLETE_REPORT_QUEUE/);
  await assert.rejects(loadPendingCollectionReports(async () => ({ reports: [report('bad', { amountCents: 0 })], nextCursor: null })), /INVALID_PENDING_REPORT/);
  const partial = await loadCollectionsInbox(async url => {
    if (url === '/api/admin/presupuestos-v2') return { budgets: [] };
    if (url === '/api/admin/vendedores') return { vendedores: [{ id: 'inactive', nombre: 'Inactivo', activo: false, efectivoPendienteRendicionCentavos: 15001 }, { id: 'invalid', nombre: 'Sin verificar', efectivoPendienteRendicionCentavos: -1 }] };
    if (url.includes('?cursor=')) throw Error('PAGE_2_UNAVAILABLE');
    return { reports: [report('p1')], nextCursor: 'next' };
  });
  assert.deepEqual(partial.collections, []); assert.equal(partial.reports, null, 'No partial report total after page two fails.');
  assert.equal(partial.vendors?.[0].cashCents, 15001); assert.equal(partial.vendors?.[1].cashCents, null);
  const unavailable = await loadCollectionsInbox(async () => { throw Error('UNAVAILABLE'); });
  assert.deepEqual(unavailable, { collections: null, reports: null, vendors: null, followups: {} });
  const render = (value: CollectionsInboxData) => renderToStaticMarkup(createElement(CollectionsInbox, { data: value, loading: false, onManage: () => {}, onRemittance: () => {} }));
  const html = render(data);
  assert.equal((html.match(/data-testid="collections-operation-case"/g) ?? []).length, 1);
  assert.match(html, /150,01/); assert.match(html, /200,02/); assert.match(html, /77,77/);
  assert.match(html, /Vendedor afiliado inactivo/); assert.match(html, /Consulta parcial/);
  assert(!html.includes('wa.me'), 'No reminder ahead of pending-payment review.');
  const failed = render(unavailable);
  assert.match(failed, /Consulta incompleta/); assert.match(failed, /Importe sin verificar/);
  assert(!failed.includes('No hay pendientes en las tres fuentes consultadas'));
  assert.match(render({ collections: [], reports: [], vendors: [] }), /No hay pendientes en las tres fuentes consultadas/);
  console.log('COLLECTIONS_INBOX_GROUPING_OVERLAP_EXACT_CENTS_ALL_PAGES_PARTIAL_FAILURE_UNKNOWN_BALANCES_INACTIVE_SELLER_PRESENTATION = PASS');
}
void main().catch(error => { console.error(error); process.exitCode = 1; });
