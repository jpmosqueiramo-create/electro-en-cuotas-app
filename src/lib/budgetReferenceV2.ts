import { calcularPlanReferenciaCatalogo } from "./catalogReference";
import type { CatalogReferenceDraft } from "./catalogReferenceEditor";
import { validateReferenceConfigurator } from "./referenceConfigurator";

export interface BudgetOfferedPlanV2 { readonly cuotas: number; readonly cuotaEstimada: number }
export interface BudgetReferenceSnapshotV2 {
  readonly schemaVersion: "BUDGET_REFERENCE_V2";
  readonly categoriaLogisticaSnapshot?: import("./loopServiceTariffs").LoopCategory;
  readonly referenceId: string | null;
  readonly source: "EXISTING_REFERENCE" | "NEW_REFERENCE";
  readonly nombre: string;
  readonly descripcion: string;
  readonly imagenUrls: readonly string[];
  readonly skuInternoSnapshot: string | null;
  readonly codigoBarrasSnapshot: string | null;
  readonly costoProveedorSnapshot: number;
  readonly proveedorSnapshot: string;
  readonly factoresSnapshot: Readonly<Record<number, number>>;
  readonly planesActivosSnapshot: Readonly<Record<number, boolean>>;
  readonly planesOfrecidos: readonly BudgetOfferedPlanV2[];
  readonly fechaCotizacion: string;
}
export interface BudgetOptionV2 {
  readonly optionId: string;
  readonly referenceSnapshot: BudgetReferenceSnapshotV2;
}
export interface BudgetOptionClientV2 {
  readonly optionId: string;
  readonly nombre: string;
  readonly descripcion: string;
  readonly imagenUrls: readonly string[];
  readonly planesOfrecidos: readonly BudgetOfferedPlanV2[];
}

type SnapshotInput = { draft: CatalogReferenceDraft; fechaCotizacion: string } & (
  | { source: "EXISTING_REFERENCE"; referenceId: string }
  | { source: "NEW_REFERENCE"; referenceId: null }
);

/** Pure: explicit source, identity and clock; no persistence, advance or acceptance. */
export function buildBudgetReferenceSnapshotV2(input: SnapshotInput): BudgetReferenceSnapshotV2 {
  const validation = validateReferenceConfigurator(input.draft);
  if (!validation.valid) throw new Error(validation.errors.join("; "));
  if (input.source === "EXISTING_REFERENCE") {
    if (typeof input.referenceId !== "string" || !input.referenceId.trim()) throw new Error("referenceId requerido.");
  } else if (input.source !== "NEW_REFERENCE" || input.referenceId !== null) throw new Error("Origen de referencia inválido.");
  if (!/^\d{4}-\d{2}-\d{2}T/.test(input.fechaCotizacion) || !Number.isFinite(Date.parse(input.fechaCotizacion)) || new Date(input.fechaCotizacion).toISOString() !== input.fechaCotizacion) {
    throw new Error("fechaCotizacion debe ser ISO UTC explícita.");
  }
  const draft = input.draft;
  const planesOfrecidos: BudgetOfferedPlanV2[] = [];
  for (let cuotas = 1; cuotas <= 18; cuotas++) {
    if (draft.planesActivos[cuotas] !== true) continue;
    const plan = calcularPlanReferenciaCatalogo({ costoProveedor: Number(draft.costoProveedor), cuotas, factor: draft.factoresPlanes[cuotas] });
    planesOfrecidos.push(Object.freeze({ cuotas, cuotaEstimada: plan.cuotaExhibidaCatalogo }));
  }
  return Object.freeze({
    ...(draft.categoriaLogistica ? {categoriaLogisticaSnapshot:draft.categoriaLogistica} : {}),
    schemaVersion: "BUDGET_REFERENCE_V2", referenceId: input.referenceId, source: input.source,
    nombre: draft.nombre.trim(), descripcion: draft.descripcion.trim(),
    imagenUrls: Object.freeze([...draft.imagenUrls]),
    skuInternoSnapshot: draft.skuInterno.trim() || null, codigoBarrasSnapshot: draft.codigoBarras.trim() || null,
    costoProveedorSnapshot: Number(draft.costoProveedor), proveedorSnapshot: draft.proveedor,
    factoresSnapshot: Object.freeze({ ...draft.factoresPlanes }), planesActivosSnapshot: Object.freeze({ ...draft.planesActivos }),
    planesOfrecidos: Object.freeze(planesOfrecidos), fechaCotizacion: input.fechaCotizacion,
  });
}

/** The caller owns the stable opaque ID. Never derive it from item position or commercial fields. */
export function buildBudgetOptionV2(optionId: string, input: SnapshotInput): BudgetOptionV2 {
  if (typeof optionId !== "string" || !optionId.trim() || /^\d+$/.test(optionId) ||
    [input.draft.nombre, input.draft.skuInterno, input.draft.codigoBarras].includes(optionId)) throw new Error("optionId opaco y estable requerido.");
  return Object.freeze({ optionId, referenceSnapshot: buildBudgetReferenceSnapshotV2(input) });
}

/** Deep allowlist, including each offered plan. Never spread a private snapshot. */
export function toClientBudgetOptionV2(option: BudgetOptionV2): BudgetOptionClientV2 {
  const s = option.referenceSnapshot;
  return Object.freeze({
    optionId: option.optionId, nombre: s.nombre, descripcion: s.descripcion,
    imagenUrls: Object.freeze([...s.imagenUrls]),
    planesOfrecidos: Object.freeze(s.planesOfrecidos.map(plan => Object.freeze({ cuotas: plan.cuotas, cuotaEstimada: plan.cuotaEstimada }))),
  });
}
