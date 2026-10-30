import { buildBudgetOptionV2, toClientBudgetOptionV2, type BudgetOptionV2, type BudgetOptionClientV2, type BudgetReferenceSnapshotV2 } from "./budgetReferenceV2";
import type { CatalogReferenceDraft } from "./catalogReferenceEditor";

export interface BudgetV2 {
  schemaVersion: "BUDGET_V2"; id: string; version: number;
  sourceCollection: "solicitudes" | "solicitudes_cuenta"; solicitudId: string;
  clienteSnapshot: { nombre: string; dni: string; cuil: string; whatsapp: string; localidad: string };
  options: BudgetOptionV2[];
  estado: "GENERADO" | "EMITIDO";
  createdAt: string; updatedAt: string; issuedAt: string | null;
  revision: number; revisionOf: number | null;
}
export interface BudgetClientV2 {
  budgetId: string; version: number; fecha: string;
  cliente: BudgetV2["clienteSnapshot"]; options: BudgetOptionClientV2[];
}
export function referenceSnapshotToDraft(s: BudgetReferenceSnapshotV2): CatalogReferenceDraft {
  return { nombre:s.nombre, descripcion:s.descripcion, skuInterno:s.skuInternoSnapshot??"", codigoBarras:s.codigoBarrasSnapshot??"",
    ...(s.categoriaLogisticaSnapshot?{categoriaLogistica:s.categoriaLogisticaSnapshot}:{}),
    costoProveedor:String(s.costoProveedorSnapshot), proveedor:s.proveedorSnapshot, imagenUrls:[...s.imagenUrls],
    factoresPlanes:{...s.factoresSnapshot}, planesActivos:{...s.planesActivosSnapshot} };
}
export function replaceBudgetOption(options: readonly BudgetOptionV2[], option: BudgetOptionV2): BudgetOptionV2[] {
  const index=options.findIndex(o=>o.optionId===option.optionId);
  return index<0 ? [...options,option] : options.map(o=>o.optionId===option.optionId?option:o);
}
export function duplicateBudgetOption(option: BudgetOptionV2, newId: string): BudgetOptionV2 {
  if(newId===option.optionId)throw new Error("La copia requiere otra identidad.");
  const s=option.referenceSnapshot;
  return buildBudgetOptionV2(newId,{draft:referenceSnapshotToDraft(s),fechaCotizacion:s.fechaCotizacion,
    ...(s.source==="EXISTING_REFERENCE"?{source:s.source,referenceId:s.referenceId!}:{source:"NEW_REFERENCE",referenceId:null})});
}
export class BudgetV2DomainError extends Error {}
export function budgetV2SafeErrorMessage(error: unknown): string {
  return error instanceof BudgetV2DomainError ? error.message : "No se pudo completar la operación.";
}
function invalid(message = "Estructura de presupuesto V2 inválida."): never { throw new BudgetV2DomainError(message); }
export function budgetV2ExactObject(value: unknown, keys: readonly string[]): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value) || ![Object.prototype, null].includes(Object.getPrototypeOf(value))) invalid();
  const record = value as Record<string, unknown>;
  if (Object.keys(record).length !== keys.length || keys.some(key => !Object.hasOwn(record, key))) invalid();
  return record;
}
export function budgetV2OpaqueId(value: unknown): value is string {
  return typeof value === "string" && /^[a-zA-Z0-9_-]{1,100}$/.test(value) && !/^\d+$/.test(value);
}
function text(value: unknown, max: number, required = false): value is string {
  return typeof value === "string" && value.length <= max && (!required || !!value.trim());
}
function integer(value: unknown, min: number): value is number { return typeof value === "number" && Number.isSafeInteger(value) && value >= min; }
function iso(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}T/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value;
}
function canonicalSnapshot(value: unknown): string {
  function sorted(v: unknown): unknown {
    if (Array.isArray(v)) return v.map(sorted);
    if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).sort(([a], [b]) => a.localeCompare(b)).map(([k, item]) => [k, sorted(item)]));
    return v;
  }
  return JSON.stringify(sorted(value));
}
/** Runtime boundary: exact nested allowlists, P2 canonical reconstruction, no browser spreads. */
export function validateBudgetV2(value: unknown, privateId?: (budgetId: string, optionId: string) => string): asserts value is BudgetV2 {
  const b = budgetV2ExactObject(value, ["schemaVersion", "id", "version", "sourceCollection", "solicitudId", "clienteSnapshot", "options", "estado", "createdAt", "updatedAt", "issuedAt", "revision", "revisionOf"]);
  if (b.schemaVersion !== "BUDGET_V2" || !budgetV2OpaqueId(b.id) || !integer(b.version, 1)) invalid("Identidad V2 inválida.");
  if (!["solicitudes", "solicitudes_cuenta"].includes(String(b.sourceCollection)) || typeof b.sourceCollection !== "string" || !text(b.solicitudId, 1500, true) || b.solicitudId.includes("/") || [".", ".."].includes(b.solicitudId)) invalid("Seleccioná la solicitud y su colección.");
  if (!integer(b.revision, 0) || !(b.revisionOf === null || (integer(b.revisionOf, 1) && b.revisionOf < b.version)) || (b.version === 1 && b.revisionOf !== null)) invalid();
  if (!iso(b.createdAt) || !iso(b.updatedAt) || !["GENERADO", "EMITIDO"].includes(String(b.estado)) || typeof b.estado !== "string" || (b.estado === "GENERADO" ? b.issuedAt !== null : !iso(b.issuedAt))) invalid();
  const client = budgetV2ExactObject(b.clienteSnapshot, ["nombre", "dni", "cuil", "whatsapp", "localidad"]);
  for (const [key, field] of Object.entries(client)) if (!text(field, 500, key === "nombre" || key === "whatsapp")) invalid("Datos comerciales inválidos.");
  if (!Array.isArray(b.options) || !b.options.length) invalid("Incorporá opciones con identidades únicas.");
  const ids = new Set<string>();
  for (const raw of b.options) {
    const option = budgetV2ExactObject(raw, ["optionId", "referenceSnapshot"]);
    if (!budgetV2OpaqueId(option.optionId) || ids.has(option.optionId)) invalid("optionId inválido.");
    ids.add(option.optionId);
    const s = budgetV2ExactObject(option.referenceSnapshot, [...(Object.hasOwn(option.referenceSnapshot as object,"categoriaLogisticaSnapshot")?["categoriaLogisticaSnapshot"]:[]), "schemaVersion", "referenceId", "source", "nombre", "descripcion", "imagenUrls", "skuInternoSnapshot", "codigoBarrasSnapshot", "costoProveedorSnapshot", "proveedorSnapshot", "factoresSnapshot", "planesActivosSnapshot", "planesOfrecidos", "fechaCotizacion"]);
    if (Object.hasOwn(s,"categoriaLogisticaSnapshot") && !["A","B","C","D"].includes(s.categoriaLogisticaSnapshot as string)) invalid();
    if (s.schemaVersion !== "BUDGET_REFERENCE_V2" || !text(s.nombre, 500, true) || !text(s.descripcion, 10000) || !text(s.proveedorSnapshot, 500) || !iso(s.fechaCotizacion)) invalid();
    for (const code of [s.skuInternoSnapshot, s.codigoBarrasSnapshot]) if (code !== null && !text(code, 500)) invalid();
    if (typeof s.costoProveedorSnapshot !== "number" || !Number.isFinite(s.costoProveedorSnapshot) || s.costoProveedorSnapshot <= 0) invalid();
    if (!Array.isArray(s.imagenUrls) || s.imagenUrls.length > 4 || s.imagenUrls.some(url => !text(url, 750000, true))) invalid();
    if (s.source === "EXISTING_REFERENCE") {
      if (!text(s.referenceId, 1500, true) || s.referenceId.includes("/") || [".", ".."].includes(s.referenceId)) invalid("referenceId requerido.");
    } else if (s.source === "NEW_REFERENCE") {
      if (s.referenceId !== null && (!privateId || s.referenceId !== privateId(b.id, option.optionId))) invalid("Referencia privada inválida.");
    } else invalid("Origen de referencia inválido.");
    for (const [map, kind] of [[s.factoresSnapshot, "number"], [s.planesActivosSnapshot, "boolean"]] as const) {
      if (!map || typeof map !== "object" || Array.isArray(map) || Object.getPrototypeOf(map) !== Object.prototype) invalid();
      for (const [key, field] of Object.entries(map)) {
        if (!/^(?:[1-9]|1[0-8])$/.test(key) || typeof field !== kind || (kind === "number" && (typeof field !== "number" || !Number.isFinite(field)))) invalid();
      }
    }
    if (!Array.isArray(s.planesOfrecidos) || !s.planesOfrecidos.length || s.planesOfrecidos.length > 18) invalid();
    for (const plan of s.planesOfrecidos) {
      const p = budgetV2ExactObject(plan, ["cuotas", "cuotaEstimada"]);
      if (!integer(p.cuotas, 1) || p.cuotas > 18 || !integer(p.cuotaEstimada, 1)) invalid();
    }
    const snapshot = s as unknown as BudgetReferenceSnapshotV2;
    let rebuilt: BudgetOptionV2;
    try {
      rebuilt = buildBudgetOptionV2(option.optionId, { draft: referenceSnapshotToDraft(snapshot), fechaCotizacion: snapshot.fechaCotizacion,
        ...(snapshot.source === "EXISTING_REFERENCE" ? { source: snapshot.source, referenceId: snapshot.referenceId! } : { source: "NEW_REFERENCE", referenceId: null }) });
    } catch { invalid("Snapshot de referencia inválido."); }
    const expected = { ...rebuilt.referenceSnapshot, referenceId: snapshot.referenceId };
    if (canonicalSnapshot(expected) !== canonicalSnapshot(snapshot)) invalid("Snapshot inconsistente con su representación canónica.");
  }
  if (JSON.stringify(b).length > 750000) invalid("El presupuesto supera el tamaño permitido; reducí imágenes embebidas.");
}
export function toClientBudgetV2(b: BudgetV2): BudgetClientV2 {
  if(b.estado!=="EMITIDO"||!b.issuedAt)throw new Error("Emití y archivá antes de compartir.");
  const c=b.clienteSnapshot;
  return {budgetId:b.id,version:b.version,fecha:b.issuedAt,cliente:{nombre:c.nombre,dni:c.dni,cuil:c.cuil,whatsapp:c.whatsapp,localidad:c.localidad},options:b.options.map(toClientBudgetOptionV2)};
}
export function budgetClientLines(b: BudgetClientV2): string[] {
  return ["Cuenta Hogar · Propuesta de gestión de compra",`Presupuesto ${b.budgetId} · Versión ${b.version}`,`Fecha: ${b.fecha}`,`Cliente: ${b.cliente.nombre}`,`DNI: ${b.cliente.dni} · CUIL: ${b.cliente.cuil}`,`WhatsApp: ${b.cliente.whatsapp} · Localidad: ${b.cliente.localidad}`,
    ...b.options.flatMap((o,i)=>[`Opción ${i+1} · ${o.nombre}`,o.descripcion,...o.planesOfrecidos.map(p=>`• ${p.cuotas} cuotas estimadas de ${new Intl.NumberFormat("es-AR",{style:"currency",currency:"ARS",maximumFractionDigits:0}).format(p.cuotaEstimada)}`)]),
    "Las opciones son alternativas independientes. Disponibilidad a confirmar. El plan contractual definitivo se confirma al confeccionar el contrato."];
}
