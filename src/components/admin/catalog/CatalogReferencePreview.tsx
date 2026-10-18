import type { CatalogReferencePublic } from "@/lib/catalogReference";

/** Límite de datos: sólo DTO público C1; sin documento productos ni callbacks privados. */
export function CatalogReferencePreview({ reference }: { reference: CatalogReferencePublic }) {
  return <article data-testid="public-preview" className="min-w-0 space-y-5">
    <div className="grid grid-cols-2 gap-3">
      {reference.imagenUrls.map((url, i) => <div key={`${url}-${i}`} className="aspect-square overflow-hidden rounded-xl border border-border-color bg-background-main p-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img onError={event => { if (!event.currentTarget.src.endsWith("/logo-cuenta-hogar-oficial.png")) event.currentTarget.src = "/logo-cuenta-hogar-oficial.png"; }} src={url} alt={`${reference.nombre}, imagen ${i + 1}`} className="h-full w-full object-contain" />
      </div>)}
    </div>
    <div><p className="text-sm text-text-secondary">Referencia de compra</p><h3 className="mt-1 font-heading text-xl font-bold text-brand-primary">{reference.nombre}</h3>
      <p className="mt-3 whitespace-pre-wrap break-words text-text-secondary">{reference.descripcion}</p></div>
    <div><h4 className="font-heading font-semibold">Planes estimados</h4><p className="mt-1 text-sm text-text-secondary">Estimación para catálogo</p>
      <ul className="mt-3 divide-y divide-border-color rounded-xl border border-border-color">
        {reference.planesPublicados.map(plan => <li key={plan.cuotas} data-public-plan={plan.cuotas} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
          <span>{plan.cuotas} {plan.cuotas === 1 ? "cuota estimada" : "cuotas estimadas"}</span><strong className="font-heading text-brand-primary">{money(plan.cuotaEstimada)}</strong>
        </li>)}
      </ul>
    </div>
    <p className="text-sm text-text-secondary">Sujeto a disponibilidad y cotización al momento de solicitar la gestión.</p>
    <p className="rounded-xl bg-background-main p-3 text-sm font-semibold text-brand-primary">Solicitar gestión de compra</p>
  </article>;
}

export function money(value: number) {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(value);
}
