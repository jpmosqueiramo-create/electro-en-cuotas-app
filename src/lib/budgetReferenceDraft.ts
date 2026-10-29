import { createCatalogReferenceDraft, type CatalogReferenceDraft } from "./catalogReferenceEditor";

/** New budget options offer all reference plans; saved catalogue selections stay explicit. */
export function createBudgetReferenceDraft(raw?: Readonly<Record<string, unknown>>): CatalogReferenceDraft {
  const draft = createCatalogReferenceDraft(raw);
  if (!raw) {
    for (let cuotas = 1; cuotas <= 18; cuotas++) draft.planesActivos[cuotas] = true;
  }
  return draft;
}
