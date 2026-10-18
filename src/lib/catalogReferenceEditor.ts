import {
  adaptarReferenciaCatalogoLegacy, CATALOGO_REFERENCIA_FACTORES_DEFAULT,
  calcularPlanReferenciaCatalogo,
} from "./catalogReference";

export interface CatalogReferenceDraft {
  skuInterno: string;
  codigoBarras: string;
  nombre: string;
  descripcion: string;
  costoProveedor: string;
  proveedor: string;
  imagenUrls: string[];
  factoresPlanes: Record<number, number>;
  planesActivos: Record<number, boolean>;
}

export function createCatalogReferenceDraft(raw?: Readonly<Record<string, unknown>>): CatalogReferenceDraft {
  const existing = raw ? adaptarReferenciaCatalogoLegacy("editor", raw) : null;
  const factoresPlanes: Record<number, number> = {};
  const planesActivos: Record<number, boolean> = {};
  for (let n = 1; n <= 18; n++) {
    // Ausentes usan default visual. Un override inválido requiere corrección explícita.
    factoresPlanes[n] = existing?.factoresPlanes[n] ?? CATALOGO_REFERENCIA_FACTORES_DEFAULT[n];
    planesActivos[n] = existing?.planesActivos[n] === true;
  }
  return {
    skuInterno: existing?.skuInterno ?? "", codigoBarras: existing?.codigoBarras ?? "",
    nombre: existing?.nombre ?? "", descripcion: existing?.descripcion ?? "",
    costoProveedor: existing && Number.isFinite(existing.costoProveedor) ? String(existing.costoProveedor) : "",
    proveedor: existing?.proveedor ?? "", imagenUrls: [...(existing?.imagenUrls ?? [])],
    factoresPlanes, planesActivos,
  };
}

/** Patch privado: updateDoc conserva todo campo legacy que no aparezca aquí. */
export function buildCatalogReferencePrivatePatch(draft: CatalogReferenceDraft, original: Readonly<Record<string, unknown>> = {}) {
  if (!draft.nombre.trim()) throw new Error("Ingresá el nombre de la referencia.");
  const costoProveedor = Number(draft.costoProveedor);
  if (!Number.isFinite(costoProveedor) || costoProveedor <= 0) throw new Error("Ingresá un costo proveedor mayor a cero.");
  if (draft.imagenUrls.length > 4 || draft.imagenUrls.some(url => !url.trim())) {
    throw new Error("Usá hasta 4 imágenes válidas.");
  }
  // Preservar claves legacy fuera del dominio visual, sin usarlas para C3/publicación.
  const factoresPlanes: Record<string, unknown> = { ...(original.factoresPlanes as Record<string, unknown> | undefined) };
  const planesActivos: Record<string, unknown> = { ...(original.planesActivos as Record<string, unknown> | undefined) };
  const legacyCuotas: { cuota8?: number; cuota12?: number } = {};
  for (let n = 1; n <= 18; n++) {
    const factor = draft.factoresPlanes[n];
    if (!Number.isFinite(factor) || factor <= 0) throw new Error(`Revisá el factor del plan de ${n} cuotas.`);
    factoresPlanes[n] = factor;
    planesActivos[n] = draft.planesActivos[n] === true;
    if ((n === 8 || n === 12) && planesActivos[n]) {
      const cuota = calcularPlanReferenciaCatalogo({ costoProveedor, cuotas: n, factor }).cuotaExhibidaCatalogo;
      if (n === 8) legacyCuotas.cuota8 = cuota;
      else legacyCuotas.cuota12 = cuota;
    }
  }
  return {
    skuInterno: draft.skuInterno.trim() || null,
    codigoBarras: draft.codigoBarras.trim() || null,
    nombre: draft.nombre.trim(), descripcion: draft.descripcion.trim(),
    costoProveedor, costoProducto: costoProveedor, proveedor: draft.proveedor.trim(),
    imagenUrls: draft.imagenUrls.map(url => url.trim()), imagenUrl: draft.imagenUrls[0]?.trim() || "",
    factoresPlanes, planesActivos, ...legacyCuotas,
  };
}

export interface CatalogPublicationPreview {
  referenciaId: string;
  dto: import("./catalogReference").CatalogReferencePublic | null;
  validation: { valid: boolean; errors: string[] };
  fingerprint: string | null;
  hasPublicProjection: boolean;
  hasUnpublishedChanges: boolean;
}

export function catalogPublicationLabel(preview?: CatalogPublicationPreview): string {
  if (!preview) return "Estado de publicación no disponible";
  if (!preview.validation.valid) return "No válida para publicar";
  if (!preview.hasPublicProjection) return "No publicada";
  return preview.hasUnpublishedChanges ? "Cambios sin publicar" : "Publicada";
}
