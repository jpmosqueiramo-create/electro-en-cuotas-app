import type { BudgetV2 } from './budgetV2';
import type { ContractDraftV2 } from './contractV2';
import type { OperationViewV2 } from './operationV2';
import type { readFinancial } from './operationFinancialV2Server';
import { argentinaBusinessDate } from './productionV2/businessDate';

export type CollectionFinancial = Awaited<ReturnType<typeof readFinancial>>;
export type CollectionStatus = 'OVERDUE' | 'TODAY' | 'CURRENT' | 'PAID' | 'INACTIVE' | 'UNKNOWN';
export type CollectionFilter = 'ALL' | CollectionStatus;
export interface CollectionRow {
  key: string; budgetId: string; version: number; name: string; product: string;
  saleDate: string | null; whatsapp: string; financial: CollectionFinancial | null;
}
export const collectionLabels: Record<CollectionFilter, string> = {
  ALL: 'Todas', OVERDUE: 'Cuotas vencidas', TODAY: 'Vencen hoy', CURRENT: 'Al día',
  PAID: 'Canceladas', INACTIVE: 'Sin cuotas activas', UNKNOWN: 'Sin verificar',
};
export function collectionStatus(row: CollectionRow, today: string): CollectionStatus {
  const f = row.financial;
  if (!f) return 'UNKNOWN';
  if (!f.active) return 'INACTIVE';
  if (f.balanceCents === 0) return 'PAID';
  if (f.overdueCount > 0) return 'OVERDUE';
  if (f.installments.some(i => i.balanceCents > 0 && i.dueDate === today)) return 'TODAY';
  return 'CURRENT';
}
export function overdueBalance(row: CollectionRow) {
  return row.financial?.active ? row.financial.installments.filter(i => i.overdue).reduce((n, i) => n + i.balanceCents, 0) : 0;
}
export function matchesCollectionFilter(row: CollectionRow, filter: CollectionFilter, today: string) {
  if (filter === 'ALL') return true;
  if (filter === 'TODAY') return !!row.financial?.active && row.financial.installments.some(i => i.balanceCents > 0 && i.dueDate === today);
  return collectionStatus(row, today) === filter;
}
export const normalizedSearch = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es-AR').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
export function selectCollections(rows: CollectionRow[], filters: { query: string; status: CollectionFilter; from: string; to: string; sort: string }, today: string) {
  const tokens = normalizedSearch(filters.query).split(/\s+/).filter(Boolean);
  return rows.filter(row => {
    const haystack = normalizedSearch(`${row.name} ${row.financial?.active ? row.financial.contractNumber : ''}`);
    return tokens.every(token => haystack.includes(token)) &&
      matchesCollectionFilter(row, filters.status, today) &&
      (!filters.from || !!row.saleDate && row.saleDate >= filters.from) &&
      (!filters.to || !!row.saleDate && row.saleDate <= filters.to);
  }).sort((a, b) => {
    const f = (r: CollectionRow) => r.financial?.active ? r.financial : null;
    if (filters.sort === 'NAME') return a.name.localeCompare(b.name, 'es');
    if (filters.sort === 'SALE') return (b.saleDate ?? '').localeCompare(a.saleDate ?? '') || a.key.localeCompare(b.key);
    return (f(a)?.nextDueDate ?? '9999').localeCompare(f(b)?.nextDueDate ?? '9999') || a.name.localeCompare(b.name, 'es');
  });
}
/** Read-only composition of the existing authorized routes. Never infers an unpaid balance from a failed request. */
export async function loadCollections(read: (url: string) => Promise<unknown>): Promise<CollectionRow[]> {
  const { budgets } = await read('/api/admin/presupuestos-v2') as { budgets: BudgetV2[] };
  const rows: CollectionRow[] = [];
  const issued = budgets.filter(b => b.estado === 'EMITIDO');
  for (let index = 0; index < issued.length; index += 4) {
    const batch = await Promise.all(issued.slice(index, index + 4).map(async budget => {
      const base: CollectionRow = { key: `${budget.id}:${budget.version}`, budgetId: budget.id, version: budget.version, name: budget.clienteSnapshot.nombre || 'Cliente', product: 'Propuesta aceptada', saleDate: null, whatsapp: budget.clienteSnapshot.whatsapp || '', financial: null };
      const url = `/api/admin/presupuestos-v2/${encodeURIComponent(budget.id)}/versions/${budget.version}`;
      try {
        const { operation, draft } = await read(`${url}/contract`) as { operation: OperationViewV2 | null; draft: ContractDraftV2 | null };
        if (!operation) return null;
        base.whatsapp = draft?.personalData.whatsapp?.trim() || base.whatsapp;
        base.name = draft?.personalData.fullName?.trim() || base.name;
        base.product = budget.options.find(o => o.optionId === operation.identity.acceptedOptionId)?.referenceSnapshot.nombre || base.product;
        const instant = new Date(operation.identity.acceptedAt);
        base.saleDate = Number.isFinite(instant.getTime()) ? argentinaBusinessDate(instant) : null;
        try { base.financial = await read(`${url}/financial`) as CollectionFinancial; } catch { /* Retain a visible unverified row, never a fabricated zero balance. */ }
      } catch { /* Keep the identity from the authorized budget listing while origin is unavailable. */ }
      return base;
    }));
    rows.push(...batch.filter((row): row is CollectionRow => row !== null));
  }
  return rows;
}

/** Client-safe reminder only: no internal prices, factors, document IDs or administrative notes. */
export function installmentWhatsApp(row: CollectionRow, today: string): string | null {
  const phone = row.whatsapp.replace(/[+\s()\-.]/g, '');
  if (!/^\d{8,15}$/.test(phone) || !row.financial?.active) return null;
  const installment = row.financial.installments.find(i => i.balanceCents > 0 && i.dueDate === today) ?? row.financial.installments.find(i => i.balanceCents > 0 && i.dueDate < today);
  if (!installment) return null;
  const amount = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(installment.balanceCents / 100);
  const due = installment.dueDate.split('-').reverse().join('/');
  const text = `Hola ${row.name}, te contactamos de Cuenta Hogar. ${installment.dueDate === today ? 'Hoy vence' : 'Quedó pendiente'} la cuota ${installment.number}, con vencimiento ${due}, por ${amount}. Si ya realizaste el pago, por favor envianos el comprobante. Si necesitás coordinar una fecha, avisanos. Gracias.`;
  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
}
