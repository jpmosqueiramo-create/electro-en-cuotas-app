'use client';

import { employmentFields, personalFields, type ClientDataSubmissionV2, type ContractDraftV2 } from '@/lib/contractV2';
import { btn, displayPersonal, labels } from './ContractDataFields';

/** Groups existing submissions for review; applying them still requires the existing command. */
export function ClientDataReview({ draft, submissions, onApply }: {
  draft: ContractDraftV2;
  submissions: ClientDataSubmissionV2[];
  onApply: (submissionId: string) => void;
}) {
  const sorted = [...submissions].sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
  const pending = sorted.filter(sub => sub.submittedAt > (draft.lastClientSubmissionAppliedAt ?? ''));
  const history = sorted.filter(sub => sub.submittedAt <= (draft.lastClientSubmissionAppliedAt ?? ''));

  function review(sub: ClientDataSubmissionV2, isPending: boolean) {
    const changes = [...personalFields, ...employmentFields, ...(sub.preferredMonthlyDueDay === undefined ? [] : ['preferredMonthlyDueDay'])].flatMap(key => {
      const current = key === 'preferredMonthlyDueDay' ? draft.preferredMonthlyDueDay : key in draft.personalData ? draft.personalData[key as keyof typeof draft.personalData] : draft.employmentData[key as keyof typeof draft.employmentData];
      const received = key === 'preferredMonthlyDueDay' ? sub.preferredMonthlyDueDay : key in sub.personalData ? sub.personalData[key as keyof typeof sub.personalData] : sub.employmentData[key as keyof typeof sub.employmentData];
      return (current ?? '') === (received ?? '') || ((key === 'province' || key === 'postalCode') && received === undefined) ? [] : [{ key, current, received }];
    });
    return <details className="min-w-0 space-y-3 rounded-xl border border-border-color bg-surface p-4" data-testid="client-data-review" data-submission-id={sub.submissionId} key={sub.submissionId} open={isPending}>
      <summary className="min-h-11 cursor-pointer break-words font-semibold">{isPending ? 'Revisar datos recibidos' : 'Consultar envío anterior'} · {new Date(sub.submittedAt).toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' })}</summary>
      <p className="text-sm text-text-secondary">{changes.length ? `${changes.length} ${changes.length===1?'campo diferente':'campos diferentes'} respecto de la ficha actual.` : 'Este envío coincide con los datos actuales de la ficha.'}</p>
      <div className="space-y-3">{changes.map(({ key, current, received }) => <div className="min-w-0 break-words border-b border-border-color pb-2" key={key}>
        <strong>{labels[key]}</strong><p>Actual: {displayPersonal(key, current?.toString()) || 'Sin completar'}</p><p>Recibido: {displayPersonal(key, received?.toString()) || 'Sin completar'}</p>
      </div>)}</div>
      <p className="text-sm text-text-secondary">Aplicar reemplaza los datos personales y laborales, incluidos los laborales vacíos. Conserva el plan y las fechas. Los envíos históricos mantienen su formato original.</p>
      <button type="button" className={btn} onClick={() => onApply(sub.submissionId)}>Aplicar datos recibidos</button>
    </details>;
  }

  return <div className="min-w-0 space-y-3">
    {pending.length > 0 && <section aria-label="Datos recibidos por revisar" className="min-w-0 space-y-3">
      <h4 className="font-semibold">Datos recibidos por revisar · {pending.length}</h4>
      {pending.map(sub => review(sub, true))}
    </section>}
    {history.length > 0 && <details data-testid="client-submission-history" className="min-w-0 rounded-xl border border-border-color p-3">
      <summary className="min-h-11 cursor-pointer font-semibold">Envíos anteriores · {history.length}</summary>
      <div className="min-w-0 space-y-3 pt-3">{history.map(sub => review(sub, false))}</div>
    </details>}
  </div>;
}
