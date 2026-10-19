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
export function validateBudgetV2(b: BudgetV2): void {
  if(b.schemaVersion!=="BUDGET_V2" || !/^[a-zA-Z0-9_-]{1,100}$/.test(b.id) || !Number.isInteger(b.version)||b.version<1)throw new Error("Identidad V2 inválida.");
  if(!["solicitudes","solicitudes_cuenta"].includes(b.sourceCollection)||!b.solicitudId||b.solicitudId.includes("/"))throw new Error("Seleccioná la solicitud y su colección.");
  if(!b.clienteSnapshot.nombre.trim()||!b.clienteSnapshot.whatsapp.trim())throw new Error("Nombre y WhatsApp requeridos.");
  for(const value of Object.values(b.clienteSnapshot))if(typeof value!=="string"||value.length>500)throw new Error("Datos comerciales inválidos.");
  if(!Array.isArray(b.options)||!b.options.length||new Set(b.options.map(o=>o.optionId)).size!==b.options.length)throw new Error("Incorporá opciones con identidades únicas.");
  for(const option of b.options){
    if(!/^[a-zA-Z0-9_-]{1,100}$/.test(option.optionId))throw new Error("optionId inválido.");
    const s=option.referenceSnapshot;
    if(!["EXISTING_REFERENCE","NEW_REFERENCE"].includes(s.source))throw new Error("Origen de referencia inválido.");
    const rebuilt=buildBudgetOptionV2(option.optionId,{draft:referenceSnapshotToDraft(s),fechaCotizacion:s.fechaCotizacion,
      ...(s.source==="EXISTING_REFERENCE"?{source:s.source,referenceId:s.referenceId!}:{source:"NEW_REFERENCE",referenceId:null})});
    if(s.schemaVersion!=="BUDGET_REFERENCE_V2"||JSON.stringify(rebuilt.referenceSnapshot.planesOfrecidos)!==JSON.stringify(s.planesOfrecidos))throw new Error("Planes inconsistentes con el snapshot.");
  }
  if(JSON.stringify(b).length>750000)throw new Error("El presupuesto supera el tamaño permitido; reducí imágenes embebidas.");
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
