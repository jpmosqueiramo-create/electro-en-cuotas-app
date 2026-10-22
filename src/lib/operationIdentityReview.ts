export interface IdentityEntry { source: 'REQUEST' | 'BUDGET' | 'SUBMISSION' | 'DRAFT'; name: string; dni: string; applied?: boolean }
export interface OperationIdentityReview {
  entries: Omit<IdentityEntry, 'dni'>[];
  differences: ('name' | 'dni')[];
  discrepancy: boolean;
  profileMismatch: boolean;
  verifiedCurrent: boolean;
  requiresClarification: boolean;
  originalUnavailable: boolean;
}
const normalized = (s: string) => s.normalize('NFKC').trim().replace(/\s+/g, ' ').toLocaleUpperCase('es-AR');
/** Comparison detects discrepancies only; it never matches or merges people. Missing historical values are not invented. */
export function reviewOperationIdentity(entries: IdentityEntry[], verifiedCurrent: boolean, originalUnavailable: boolean, profileMismatch = false): OperationIdentityReview {
  const differs = (field: 'name' | 'dni') => new Set(entries.map(e => normalized(e[field])).filter(Boolean)).size > 1;
  const differences = (['name','dni'] as const).filter(differs);
  const discrepancy = differences.length > 0 || profileMismatch;
  const unapplied = entries.some(e => e.source === 'SUBMISSION' && !e.applied);
  return { entries: entries.map(({source,name,applied}) => ({source,name,...(applied === undefined ? {} : {applied})})), differences, discrepancy, profileMismatch, verifiedCurrent, requiresClarification: profileMismatch || (discrepancy && (!verifiedCurrent || unapplied)), originalUnavailable };
}
