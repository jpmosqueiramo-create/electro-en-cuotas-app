import { CATALOGO_REFERENCIA_FACTORES_DEFAULT, calcularPlanReferenciaCatalogo } from "./catalogReference";
import { createCatalogReferenceDraft, type CatalogReferenceDraft } from "./catalogReferenceEditor";

export type ReferenceConfiguratorAction =
  | { type: "patch"; patch: Partial<CatalogReferenceDraft> }
  | { type: "factor"; cuotas: number; factor: number }
  | { type: "toggle"; cuotas: number; active: boolean }
  | { type: "resetFactors" };

export const createReferenceConfiguratorState = createCatalogReferenceDraft;

function assertPlan(key: string | number): void {
  const n = Number(key);
  if (!Number.isInteger(n) || n < 1 || n > 18 || String(n) !== String(key)) {
    throw new RangeError("El plan debe ser un entero entre 1 y 18.");
  }
}

/** Copies every mutable draft member, including map/array patches supplied by callers. */
export function referenceConfiguratorReducer(state: CatalogReferenceDraft, action: ReferenceConfiguratorAction): CatalogReferenceDraft {
  let patch: Partial<CatalogReferenceDraft>;
  switch (action.type) {
    case "patch": patch = action.patch; break;
    case "factor":
      assertPlan(action.cuotas);
      patch = { factoresPlanes: { ...state.factoresPlanes, [action.cuotas]: action.factor } }; break;
    case "toggle":
      assertPlan(action.cuotas);
      patch = { planesActivos: { ...state.planesActivos, [action.cuotas]: action.active } }; break;
    case "resetFactors": patch = { factoresPlanes: { ...CATALOGO_REFERENCIA_FACTORES_DEFAULT } }; break;
  }
  const next = { ...state, ...patch };
  for (const key of [...Object.keys(next.factoresPlanes), ...Object.keys(next.planesActivos)]) assertPlan(key);
  if (next.imagenUrls.length > 4) throw new RangeError("Usá hasta 4 imágenes por referencia.");
  return { ...next, imagenUrls: [...next.imagenUrls], factoresPlanes: { ...next.factoresPlanes }, planesActivos: { ...next.planesActivos } };
}

/** Budget eligibility differs from public publication: description/images may be absent. */
export function validateReferenceConfigurator(draft: CatalogReferenceDraft): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!draft.nombre.trim()) errors.push("Ingresá el nombre de la referencia.");
  const costo = Number(draft.costoProveedor);
  if (!Number.isFinite(costo) || costo <= 0) errors.push("Ingresá un costo proveedor mayor a cero.");
  if (draft.imagenUrls.length > 4 || draft.imagenUrls.some(url => !url.trim())) errors.push("Usá hasta 4 imágenes válidas.");
  for (const key of [...Object.keys(draft.factoresPlanes), ...Object.keys(draft.planesActivos)]) {
    try { assertPlan(key); } catch { errors.push("El plan debe ser un entero entre 1 y 18."); }
  }
  let active = 0;
  for (let cuotas = 1; cuotas <= 18; cuotas++) {
    if (draft.planesActivos[cuotas] !== true) continue;
    active++;
    try { calcularPlanReferenciaCatalogo({ costoProveedor: costo, cuotas, factor: draft.factoresPlanes[cuotas] }); }
    catch { errors.push(`Revisá costo/factor del plan de ${cuotas} cuotas.`); }
  }
  if (!active) errors.push("Seleccioná al menos un plan activo.");
  return { valid: errors.length === 0, errors };
}
