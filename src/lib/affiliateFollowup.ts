import type { CollectionFinancial } from './collectionsOverview';
import { normalizedSearch } from './collectionsOverview';

export interface AffiliateFollowup {
  state: 'ACTIVE' | 'INACTIVE' | 'UNKNOWN';
  asOfDate: string;
  contractNumber: string | null;
  balanceCents: number | null;
  installments: { number: number; dueDate: string; balanceCents: number; overdue: boolean; daysPastDue: number }[];
}
/** Only the assigned client's collection data; amounts come from the existing accounting projection. */
export function affiliateFollowup(financial: CollectionFinancial | null, today: string): AffiliateFollowup {
  if (!financial?.active) return { state: financial ? 'INACTIVE' : 'UNKNOWN', asOfDate: today, contractNumber: null, balanceCents: null, installments: [] };
  return { state: 'ACTIVE', asOfDate: financial.asOfDate, contractNumber: financial.contractNumber, balanceCents: financial.balanceCents,
    installments: financial.installments.map(({ number, dueDate, balanceCents, overdue, daysPastDue }) => ({ number, dueDate, balanceCents, overdue, daysPastDue })) };
}
export const followupLabels = { ALL: 'Todos', OVERDUE: 'Con cuotas vencidas', TODAY: 'Vencen hoy', SOON: 'Próximos 7 días', CURRENT: 'Al día', PAID: 'Plan saldado', INACTIVE: 'Sin cuotas activas', UNKNOWN: 'Sin verificar' };
export type FollowupStatus = keyof typeof followupLabels;
export function followupStatus(f?: AffiliateFollowup): FollowupStatus {
  if (!f || f.state === 'UNKNOWN') return 'UNKNOWN';
  if (f.state === 'INACTIVE') return 'INACTIVE';
  if (f.balanceCents === 0) return 'PAID';
  if (f.installments.some(i => i.overdue)) return 'OVERDUE';
  if (f.installments.some(i => i.balanceCents > 0 && i.dueDate === f.asOfDate)) return 'TODAY';
  return 'CURRENT';
}
export function followupAge(f?: AffiliateFollowup) { return Math.max(0, ...(f?.installments ?? []).filter(i => i.balanceCents > 0).map(i => i.daysPastDue)); }
export const followupMoney = (cents: number | null | undefined) => cents == null ? 'Sin verificar' : new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(cents / 100);
export const followupDate = (date?: string | null) => date ? date.split('-').reverse().join('/') : 'Sin fecha';
export interface FollowupFilters { query: string; status: FollowupStatus; age: string; from: string; to: string; sort: string }
export const emptyFollowupFilters: FollowupFilters = { query: '', status: 'ALL', age: '', from: '', to: '', sort: 'PRIORITY' };
export function matchesFollowup(f: AffiliateFollowup | undefined, status: FollowupStatus) {
  if (status === 'ALL') return true;
  if (status === 'TODAY' || status === 'SOON') return !!f && f.installments.some(i => {
    const days = (Date.parse(i.dueDate) - Date.parse(f.asOfDate)) / 86400000;
    return i.balanceCents > 0 && (status === 'TODAY' ? days === 0 : days > 0 && days <= 7);
  });
  return followupStatus(f) === status;
}
export function selectAffiliateFollowup<T extends { client: string; locality: string; saleDate?: string | null; operationId: string; followup?: AffiliateFollowup }>(rows: T[], filters: FollowupFilters): T[] {
  const tokens = normalizedSearch(filters.query).split(/\s+/).filter(Boolean);
  const priority = (r: T) => ({ UNKNOWN: 0, OVERDUE: 1, TODAY: 2, CURRENT: 3, INACTIVE: 4, PAID: 5, ALL: 6, SOON: 3 })[followupStatus(r.followup)];
  const due = (r: T) => r.followup?.installments.find(i => i.balanceCents > 0)?.dueDate ?? '9999';
  return rows.filter(r => {
    const age = followupAge(r.followup);
    const bounds = filters.age.split(':').map(Number);
    return tokens.every(t => normalizedSearch(`${r.client} ${r.locality} ${r.followup?.contractNumber ?? ''}`).includes(t)) && matchesFollowup(r.followup, filters.status) &&
      (!filters.age || age >= bounds[0] && age <= bounds[1]) && (!filters.from || !!r.saleDate && r.saleDate >= filters.from) && (!filters.to || !!r.saleDate && r.saleDate <= filters.to);
  }).sort((a, b) => (filters.sort === 'NAME' ? a.client.localeCompare(b.client, 'es') : filters.sort === 'SALE' ? (b.saleDate ?? '').localeCompare(a.saleDate ?? '') : filters.sort === 'AGE' ? followupAge(b.followup) - followupAge(a.followup) : filters.sort === 'DUE' ? due(a).localeCompare(due(b)) : priority(a) - priority(b) || followupAge(b.followup) - followupAge(a.followup) || due(a).localeCompare(due(b))) || a.operationId.localeCompare(b.operationId));
}
