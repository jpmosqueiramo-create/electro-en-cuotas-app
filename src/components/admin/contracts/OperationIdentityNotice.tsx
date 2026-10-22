import type { OperationIdentityReview } from '@/lib/operationIdentityReview';
const labels = { REQUEST: 'Solicitud original', BUDGET: 'Presupuesto aceptado', SUBMISSION: 'Formulario recibido', DRAFT: 'Borrador contractual' };
export function OperationIdentityNotice({ review }: { review: OperationIdentityReview }) {
  return <section aria-label="Origen de los datos del cliente" data-testid="operation-identity" className="min-w-0 space-y-2 rounded-xl border border-border-color p-3">
    {review.discrepancy && <p role="alert" className="break-words font-semibold">{review.requiresClarification ? 'Hay diferencias de identidad. Administración debe revisar los datos y verificar la identidad antes de continuar con acciones que la requieren.' : 'Los datos actualizados difieren del origen. La identidad actual tiene una vinculación documental verificada.'}</p>}
    {review.discrepancy&&<p className="text-sm">Diferencias detectadas: {[...review.differences.map(field=>field==='name'?'nombre':'DNI'),...(review.profileMismatch?['carpeta documental']:[])].join(' y ')}.</p>}
    <p className="text-sm">No se reemplazan los datos originales ni se fusionan clientes automáticamente.</p>
    {review.originalUnavailable && <p className="text-sm">Solicitud original no disponible. Se conserva la referencia del presupuesto.</p>}
    <details><summary className="min-h-11 cursor-pointer font-semibold">Ver origen de los nombres</summary><dl className="space-y-3 break-words text-sm">{review.entries.map(e => <div key={e.source}><dt className="font-semibold">{labels[e.source]}{e.source === 'SUBMISSION' ? e.applied ? ' · aplicado' : ' · pendiente de revisión y aplicación' : ''}</dt><dd>{e.name || 'Nombre no registrado'}</dd></div>)}<div><dt className="font-semibold">Aceptación</dt><dd>Conserva la alternativa aceptada y el cliente del presupuesto emitido; no reemplaza su identidad.</dd></div><div><dt className="font-semibold">Carpeta documental</dt><dd>{review.verifiedCurrent ? 'Vínculo explícito compatible con los datos actuales' : 'Identidad actual pendiente de verificación o aclaración'}</dd></div></dl></details>
    {review.requiresClarification && <p className="text-sm">Revisá y aplicá el formulario correcto. Luego utilizá la verificación o vinculación documental administrativa existente. Si la carpeta no coincide, solicitá aclaración; no reemplaces su titular.</p>}
  </section>;
}
