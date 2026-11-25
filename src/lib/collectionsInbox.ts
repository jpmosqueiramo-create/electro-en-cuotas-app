import { loadCollections, normalizedSearch, overdueBalance, type CollectionRow } from './collectionsOverview';
import type { PaymentReportPublic } from './operationPaymentReports';

export interface CollectionVendor {
  id: string; name: string; active: boolean; cashCents: number | null;
}
export interface CollectionsInboxData {
  collections: CollectionRow[] | null;
  reports: PaymentReportPublic[] | null;
  vendors: CollectionVendor[] | null;
}
export type InboxFilter = 'ALL' | 'OVERDUE' | 'REPORTS' | 'CASH';
export interface CollectionCase {
  kind: 'OPERATION'; key: string; name: string; row: CollectionRow | null;
  budgetId: string; version: number; reports: PaymentReportPublic[];
  overdueCents: number; overdueCount: number; oldestDue: string | null;
}
export type InboxCase = CollectionCase | { kind: 'CASH'; key: string; name: string; vendor: CollectionVendor };

const positiveCents = (n: unknown): n is number => typeof n === 'number' && Number.isSafeInteger(n) && n > 0;
/** Fetch every page before publishing counts. A failed later page is not a complete queue. */
export async function loadPendingCollectionReports(read: (url: string) => Promise<unknown>) {
  const reports = new Map<string, PaymentReportPublic>(), cursors = new Set<string>();
  let cursor: string | null = null;
  do {
    const page = await read('/api/admin/payment-reports' + (cursor ? '?cursor=' + encodeURIComponent(cursor) : '')) as { reports: PaymentReportPublic[]; nextCursor: string | null };
    if (!Array.isArray(page.reports) || !(page.nextCursor === null || typeof page.nextCursor === 'string' && page.nextCursor.length > 0)) throw Error('INVALID_REPORT_PAGE');
    for (const report of page.reports) {
      if (!report || report.status !== 'PENDING' || !report.id || !report.budgetId || !report.operationId || !Number.isSafeInteger(report.version) || report.version < 1 || !positiveCents(report.amountCents)) throw Error('INVALID_PENDING_REPORT');
      reports.set(report.id, report);
    }
    cursor = page.nextCursor;
    if (cursor) {
      if (cursors.has(cursor) || cursors.size >= 1000) throw Error('INCOMPLETE_REPORT_QUEUE');
      cursors.add(cursor);
    }
  } while (cursor);
  return [...reports.values()].sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
}

async function loadVendors(read: (url: string) => Promise<unknown>): Promise<CollectionVendor[]> {
  const data = await read('/api/admin/vendedores') as { vendedores: { id: string; nombre: string; activo: boolean; efectivoPendienteRendicionCentavos: number | null }[] };
  if (!Array.isArray(data.vendedores)) throw Error('INVALID_VENDOR_LIST');
  const seen = new Set<string>();
  return data.vendedores.map(v => {
    if (!v.id || seen.has(v.id)) throw Error('INVALID_VENDOR_IDENTITY');
    seen.add(v.id);
    const cash = v.efectivoPendienteRendicionCentavos;
    return { id: v.id, name: v.nombre || 'Vendedor afiliado', active: v.activo !== false, cashCents: typeof cash === 'number' && Number.isSafeInteger(cash) && cash >= 0 ? cash : null };
  });
}

/** Existing admin-only GET routes; no new collection, writes, fields or financial calculations. */
export async function loadCollectionsInbox(read: (url: string) => Promise<unknown>): Promise<CollectionsInboxData> {
  const [collections, reports, vendors] = await Promise.allSettled([loadCollections(read), loadPendingCollectionReports(read), loadVendors(read)]);
  return {
    collections: collections.status === 'fulfilled' ? collections.value : null,
    reports: reports.status === 'fulfilled' ? reports.value : null,
    vendors: vendors.status === 'fulfilled' ? vendors.value : null,
  };
}

/** Join only by the immutable operation identity, never by a person's name. */
export function collectionInboxCases(data: CollectionsInboxData): InboxCase[] {
  const cases = new Map<string, CollectionCase>();
  const identity = (budgetId: string, version: number, operationId: string) => JSON.stringify([budgetId, version, operationId]);
  for (const row of data.collections ?? []) {
    const overdue = row.financial?.active ? row.financial.installments.filter(i => i.overdue && i.balanceCents > 0) : [];
    if (!overdue.length) continue;
    cases.set(identity(row.budgetId, row.version, row.operationId ?? row.key), { kind: 'OPERATION', key: row.key, name: row.name, row, budgetId: row.budgetId, version: row.version, reports: [], overdueCents: overdueBalance(row), overdueCount: overdue.length, oldestDue: overdue.map(i => i.dueDate).sort()[0] });
  }
  for (const report of data.reports ?? []) {
    const key = identity(report.budgetId, report.version, report.operationId);
    let item = cases.get(key);
    if (!item) {
      const row = data.collections?.find(r => r.operationId === report.operationId && r.budgetId === report.budgetId && r.version === report.version) ?? null;
      item = { kind: 'OPERATION', key, name: row?.name || report.clientName || 'Cliente', row, budgetId: report.budgetId, version: report.version, reports: [], overdueCents: 0, overdueCount: 0, oldestDue: null };
      cases.set(key, item);
    }
    item.reports.push(report);
  }
  const operations = [...cases.values()].sort((a, b) => Number(b.reports.length > 0) - Number(a.reports.length > 0) || (a.oldestDue ?? a.reports[0]?.createdAt ?? '').localeCompare(b.oldestDue ?? b.reports[0]?.createdAt ?? '') || a.key.localeCompare(b.key));
  const cash: InboxCase[] = (data.vendors ?? []).filter(v => v.cashCents !== null && v.cashCents > 0).sort((a, b) => a.name.localeCompare(b.name, 'es')).map(vendor => ({ kind: 'CASH', key: 'cash:' + vendor.id, name: vendor.name, vendor }));
  return [...operations, ...cash];
}

export function selectInboxCases(cases: InboxCase[], filter: InboxFilter, query: string) {
  const tokens = normalizedSearch(query).split(/\s+/).filter(Boolean);
  return cases.filter(item => {
    if (filter === 'CASH' && item.kind !== 'CASH' || filter === 'OVERDUE' && (item.kind !== 'OPERATION' || !item.overdueCount) || filter === 'REPORTS' && (item.kind !== 'OPERATION' || !item.reports.length)) return false;
    const text = normalizedSearch(`${item.name} ${item.kind === 'OPERATION' && item.row?.financial?.active ? item.row.financial.contractNumber : ''}`);
    return tokens.every(t => text.includes(t));
  });
}
