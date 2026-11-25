import { createCatalogReferenceDraft, type CatalogReferenceDraft } from './catalogReferenceEditor';

/** Explicit "save and add another" keeps configuration, never the product's identity. */
export function nextCatalogEntry(previous: CatalogReferenceDraft): CatalogReferenceDraft {
  return { ...createCatalogReferenceDraft(), proveedor: previous.proveedor, categoriaLogistica: previous.categoriaLogistica,
    planesActivos: { ...previous.planesActivos }, factoresPlanes: { ...previous.factoresPlanes } };
}

export function catalogEntryMissing(draft: CatalogReferenceDraft) {
  const fields: string[] = [];
  if (!draft.nombre.trim()) fields.push('nombre');
  if (!Number.isFinite(Number(draft.costoProveedor)) || Number(draft.costoProveedor) <= 0) fields.push('costo proveedor');
  return fields;
}
