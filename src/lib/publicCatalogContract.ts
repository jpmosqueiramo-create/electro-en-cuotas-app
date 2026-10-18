import type { CatalogReferencePublic } from "./catalogReference";

export function isPublicReferenceId(id: unknown): id is string {
  return typeof id === "string" && !!id.trim() && id === id.trim() &&
    id !== "." && id !== ".." && !/[/\\\u0000-\u001f\u007f]/.test(id) &&
    !/^__.*__$/.test(id) && new TextEncoder().encode(id).length <= 1500;
}

/** Nueva allowlist en cada frontera: no transporta campos privados. */
export function parsePublicCatalogReference(id: string, input: unknown): CatalogReferencePublic | null {
  if (!isPublicReferenceId(id) || !input || typeof input !== "object" || Array.isArray(input)) return null;
  const raw = input as Record<string, unknown>;
  if (raw.referenciaId !== id || raw.publicado !== true || raw.schemaVersion !== 1 ||
      typeof raw.nombre !== "string" || !raw.nombre.trim() || typeof raw.descripcion !== "string" ||
      !Array.isArray(raw.imagenUrls) || raw.imagenUrls.length < 1 || raw.imagenUrls.length > 4 ||
      raw.imagenUrls.some(url => typeof url !== "string" || !url.trim()) ||
      !Array.isArray(raw.planesPublicados) || !raw.planesPublicados.length) return null;
  const seen = new Set<number>();
  const planesPublicados: CatalogReferencePublic["planesPublicados"] = [];
  for (const entry of raw.planesPublicados) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) return null;
    const plan = entry as Record<string, unknown>;
    if (typeof plan.cuotas !== "number" || !Number.isInteger(plan.cuotas) || plan.cuotas < 1 || plan.cuotas > 18 ||
        seen.has(plan.cuotas) || typeof plan.cuotaEstimada !== "number" || !Number.isFinite(plan.cuotaEstimada) || plan.cuotaEstimada <= 0) return null;
    seen.add(plan.cuotas);
    planesPublicados.push({ cuotas: plan.cuotas, cuotaEstimada: plan.cuotaEstimada });
  }
  return { referenciaId: id, nombre: raw.nombre, descripcion: raw.descripcion,
    imagenUrls: raw.imagenUrls.map(url => String(url)), planesPublicados: planesPublicados.sort((a,b) => a.cuotas-b.cuotas),
    publicado: true, schemaVersion: 1 };
}

export function selectPublishedPlan(reference: CatalogReferencePublic, requested?: string | null): string {
  if (requested && reference.planesPublicados.some(plan => String(plan.cuotas) === requested)) return requested;
  return reference.planesPublicados.some(plan => plan.cuotas === 12) ? "12" : "";
}
export function publicCatalogSelection(reference: CatalogReferencePublic, cuotas: string) {
  const plan = reference.planesPublicados.find(plan => String(plan.cuotas) === cuotas);
  if (!plan) throw new Error("El plan ya no está disponible para esta referencia.");
  return { productoId: reference.referenciaId, productoNombre: reference.nombre,
    planElegido: String(plan.cuotas), montoCuota: plan.cuotaEstimada };
}
