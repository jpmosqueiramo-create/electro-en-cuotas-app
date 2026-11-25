import type { CollectionRow } from './collectionsOverview';

export interface CollectionContact {
  id: string; kind: string; note: string; at: string | null;
  promisedDate: string | null; nextContactDate: string | null; recordedByMe: boolean;
}
export interface CollectionContactHistory {
  records: CollectionContact[]; historyTruncated: boolean; latestPromise: CollectionContact | null;
}

export async function loadCollectionFollowups(rows: CollectionRow[], read: (url: string) => Promise<unknown>) {
  const result: Record<string, CollectionContactHistory | null> = {};
  for (let offset = 0; offset < rows.length; offset += 4) {
    await Promise.all(rows.slice(offset, offset + 4).map(async row => {
      try {
        const data = await read(`/api/admin/presupuestos-v2/${encodeURIComponent(row.budgetId)}/versions/${row.version}/gestiones`) as CollectionContactHistory;
        if (!Array.isArray(data.records) || typeof data.historyTruncated !== 'boolean' || data.latestPromise === undefined) throw Error('INCOMPLETE_CONTACT_HISTORY');
        result[row.key] = data;
      } catch { result[row.key] = null; }
    }));
  }
  return result;
}

export function hasScheduledFollowup(row: CollectionRow, history?: CollectionContactHistory | null) {
  return !!row.financial?.active && row.financial.balanceCents > 0 && !!(history?.latestPromise || history?.records[0]?.nextContactDate);
}

/** A date is a declaration, never proof of payment or of a broken promise. */
export function collectionNextStep({ history, row, reports, overdueCount, today }: {
  history?: CollectionContactHistory | null; row: CollectionRow | null; reports: number | null; overdueCount: number; today: string;
}) {
  if (reports && reports > 0) return { label: 'Revisar el pago informado antes de contactar', date: null };
  if (reports === null) return { label: 'Verificar los pagos informados antes de contactar', date: null };
  if (!history) return { label: 'Actualizar el historial antes de contactar', date: null };
  if (!row?.financial) return { label: 'Verificar el saldo antes de contactar', date: null };
  if (row.financial.active && row.financial.balanceCents === 0) return { label: 'Plan saldado: consultar el historial si hace falta', date: null };
  const next = history.records[0]?.nextContactDate;
  const promise = history.latestPromise;
  if (next && (!promise?.promisedDate || next <= promise.promisedDate)) return { label: next <= today ? 'Retomar el contacto programado' : 'Próximo contacto programado', date: next };
  if (promise?.promisedDate) return { label: promise.promisedDate <= today ? 'Revisar si se cumplió la promesa' : 'Revisar el pago en la fecha prometida', date: promise.promisedDate };
  return { label: overdueCount > 0 ? 'Contactar al cliente por las cuotas vencidas' : 'Revisar el caso y registrar el contacto si corresponde', date: null };
}
