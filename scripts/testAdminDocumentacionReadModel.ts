import assert from "node:assert/strict";
import { filterAdminDocumentacion, mapSolicitudCuentaToDocumentacion, mapSolicitudToDocumentacion, type AdminDocumentacionFilters } from "../src/lib/adminDocumentacionReadModel";
import { readAdminDocumentacionSources } from "../src/lib/adminDocumentacionReader";

let count = 0;
function test(label: string, run: () => void) { run(); count++; console.log(`PASS ${label}`); }
const filters: AdminDocumentacionFilters = { view: "all", type: "", document: "", q: "" };
const raw = Object.freeze({ datosPersonales: Object.freeze({ nombreCompleto: "Ana", numeroDni: "123" }), estado: "APROBADO", documentos: Object.freeze({ dniFrente: "https://example.test/dni.pdf?token=demo", dniDorso: "Pendiente envío WhatsApp", reciboSueldo: "", servicio: null }) });
const request = mapSolicitudToDocumentacion("same", raw);
const opening = mapSolicitudCuentaToDocumentacion("same", { nombre: "Ana", dni: "123", tipo: "contacto_rapido", dniFrenteURL: "https://example.test/other.pdf", comprobanteDomicilioURL: "Pendiente envío WhatsApp" });
const none = mapSolicitudToDocumentacion("none", {});
test("solicitud con documentos reales", () => { assert.equal(request.documentos[0].availability, "AVAILABLE"); assert.equal(request.documentos[0].url, raw.documentos.dniFrente); });
test("solicitud sin documentos", () => assert.ok(none.documentos.every(doc => doc.availability === "NOT_RECORDED" && doc.url === null)));
test("consulta con campos de su propia fuente", () => { assert.equal(opening.tipoRegistro, "Contacto rápido"); assert.equal(opening.documentos[0].availability, "AVAILABLE"); });
test("sentinel sólo es pendiente de envío", () => { assert.equal(request.documentos[1].availability, "PENDING_SEND"); assert.equal(request.documentos[1].url, null); });
test("campo vacío no es falta obligatoria", () => { assert.equal(request.documentos[2].availability, "NOT_RECORDED"); assert.equal(request.documentos[3].availability, "NOT_RECORDED"); });
test("URL válida mantiene exactamente la referencia", () => assert.equal(request.documentos[0].url, "https://example.test/dni.pdf?token=demo"));
test("misma persona no fusiona operaciones", () => assert.equal(filterAdminDocumentacion([request, opening], { ...filters, q: "123" }).length, 2));
test("mismo ID en dos fuentes mantiene identidad", () => { assert.notEqual(request.recordKey, opening.recordKey); assert.equal(request.documentId, opening.documentId); assert.deepEqual([request.sourceCollection, opening.sourceCollection], ["solicitudes", "solicitudes_cuenta"]); });
test("Con archivos", () => assert.equal(filterAdminDocumentacion([request, opening, none], { ...filters, view: "available" }).length, 2));
test("Sin archivos registrados excluye sentinels", () => assert.deepEqual(filterAdminDocumentacion([request, opening, none], { ...filters, view: "not_recorded" }).map(item => item.documentId), ["none"]));
test("Pendiente de envío requiere sentinel", () => assert.equal(filterAdminDocumentacion([request, opening, none], { ...filters, view: "pending_send" }).length, 2));
test("disponibilidad no equivale a aprobación", () => { assert.equal(request.estadoOperacion, "APROBADO"); assert.ok(request.documentos.every(doc => !("estado" in doc) && !("aprobado" in doc))); assert.equal(request.documentos[0].availability, "AVAILABLE"); });
test("mapper no muta input", () => { mapSolicitudToDocumentacion("again", raw); assert.equal(raw.documentos.dniDorso, "Pendiente envío WhatsApp"); assert.ok(Object.isFrozen(raw)); });
test("no cruza esquemas entre fuentes", () => { assert.ok(mapSolicitudToDocumentacion("x", { dniFrenteURL: "https://example.test/wrong" }).documentos.every(doc => !doc.url)); assert.ok(mapSolicitudCuentaToDocumentacion("x", { documentos: raw.documentos }).documentos.every(doc => !doc.url)); });
test("URLs peligrosas, referencias relativas y metadatos no son archivos", () => { for (const value of ["javascript:alert(1)", "data:text/html,test", "/firmar-contrato/id", "No requerido en solicitud inicial", "https://user:secret@example.test/file"]) assert.equal(mapSolicitudToDocumentacion("x", { documentos: { dniFrente: value } }).documentos[0].availability, "NOT_RECORDED"); });
test("no inventa referencia legal ni requisito", () => { const r = mapSolicitudToDocumentacion("x", { contratoFirmado: true, estadoContrato: "AUTORIZADO", proveedorFacturaTicket: "0001-0002" }); assert.equal(r.documentos.length, 4); assert.ok(r.documentos.every(doc => !doc.url)); });
test("comprobantes de pago existentes, sin fabricar cuotas ausentes", () => { const r = mapSolicitudToDocumentacion("x", { planPagos: [{ comprobanteUrl: null }, { comprobanteUrl: "https://example.test/payment.pdf" }] }); assert.equal(r.documentos.length, 5); assert.equal(r.documentos[4].key, "comprobante_pago:1"); assert.equal(r.documentos[4].availability, "AVAILABLE"); });
test("filtro de documento compone disponibilidad sin perder source", () => { assert.equal(filterAdminDocumentacion([request, opening], { ...filters, document: "domicilio", view: "pending_send" })[0].sourceCollection, "solicitudes_cuenta"); assert.equal(filterAdminDocumentacion([request], { ...filters, document: "domicilio", view: "available" }).length, 0); });
test("tipo y búsqueda por bien/referencia", () => { const r = mapSolicitudCuentaToDocumentacion("ref-x", { tipo: "contacto_rapido", necesidad: "Mesa" }); assert.equal(filterAdminDocumentacion([r, request], { ...filters, type: "Contacto rápido", q: "mesa" }).length, 1); assert.equal(filterAdminDocumentacion([r], { ...filters, q: "ref-x" })[0].documentId, "ref-x"); });
test("etiqueta de pago usa número guardado, no posición supuesta", () => { const a = mapSolicitudToDocumentacion("x", { planPagos: [{ nroCuota: 7, comprobanteUrl: "https://example.test/pago" }] }); const b = mapSolicitudToDocumentacion("x", { planPagos: [{ comprobanteUrl: "https://example.test/pago" }] }); assert.equal(a.documentos[4].label, "Comprobante de pago · cuota 7"); assert.equal(b.documentos[4].label, "Comprobante de pago"); });
async function main() {
  for (const failed of ["solicitudes", "solicitudes_cuenta"]) {
    const result = await readAdminDocumentacionSources(async source => { if (source === failed) throw Object.assign(new Error("denied"), { code: "permission-denied" }); return [source === "solicitudes" ? request : opening]; });
    assert.equal(result.loadedSources.length, 1); assert.equal(result.items.length, 1); assert.equal(Object.keys(result.errors).length, 1); count++;
  }
  const failed = await readAdminDocumentacionSources(async () => { throw new Error("offline"); });
  assert.equal(failed.loadedSources.length, 0); assert.equal(Object.keys(failed.errors).length, 2); count++;
  console.log(`READ_MODEL_TEST = ${count}/${count} PASS`);
}
main().catch(error => { console.error(error); process.exitCode = 1; });
