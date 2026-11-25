import { collectionNextStep, type CollectionContactHistory } from '@/lib/collectionsFollowup';
import type { CollectionRow } from '@/lib/collectionsOverview';

const date = (value: string) => value.split('-').reverse().join('/');
const instant = (value: string | null) => value && Number.isFinite(Date.parse(value)) ? new Intl.DateTimeFormat('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', dateStyle: 'short', timeStyle: 'short' }).format(new Date(value)) : 'Fecha sin verificar';

export function CollectionFollowupSummary({ history, row, reports, overdueCount, today }: {
  history?: CollectionContactHistory | null; row: CollectionRow | null; reports: number | null; overdueCount: number; today: string;
}) {
  const latest = history?.records[0], promise = history?.latestPromise;
  const next = collectionNextStep({ history, row, reports, overdueCount, today });
  return <div data-testid="collection-followup" className="space-y-3 rounded-xl border border-border-color bg-background-main p-3 text-sm">
    <div><p className="font-semibold text-text-primary">Último contacto</p>{history ? latest ? <><p className="text-xs text-text-secondary">{instant(latest.at)} · {latest.recordedByMe ? 'Registrado por vos' : 'Contacto del equipo'}</p><p className="mt-1 whitespace-pre-wrap break-words">{latest.note.slice(0, 180)}{latest.note.length > 180 ? '…' : ''}</p></> : <p className="text-text-secondary">Sin contactos registrados.</p> : <p className="text-amber-950">Historial sin verificar. Actualizá la consulta.</p>}</div>
    <div><p className="font-semibold text-text-primary">Última promesa de pago</p><p className="text-text-secondary">{!history ? 'Sin verificar' : promise?.promisedDate ? date(promise.promisedDate) : 'Sin promesas registradas.'}</p></div>
    {latest?.nextContactDate && <p className="text-text-secondary">Próximo contacto programado: <strong>{date(latest.nextContactDate)}</strong></p>}
    <div className="border-t border-border-color pt-2"><p className="text-xs text-text-secondary">Próximo paso sugerido</p><p className="font-semibold text-brand-primary">{next.label}{next.date ? ` · ${date(next.date)}` : ''}</p></div>
  </div>;
}
