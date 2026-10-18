import assert from "node:assert/strict";
import { Timestamp } from "firebase/firestore";
import { adminSolicitudNextAction, adminSolicitudesContext, filterAdminSolicitudes, formatAdminSolicitudDate, isAdminSolicitudPending, mapSolicitudCuentaToAdminReadModel, mapSolicitudToAdminReadModel, parseAdminSolicitudFilters, storedDateMillis } from "../src/lib/adminSolicitudesReadModel";

import { readAdminSolicitudesSources } from "../src/lib/adminSolicitudesReader";

let tests = 0;
function test(name: string, run: () => void) { run(); tests++; console.log(`PASS ${name}`); }
const date = Timestamp.fromDate(new Date("2026-10-12T15:00:00Z"));
const input = Object.freeze({ estado: "PENDIENTE", fechaCreacion: date, datosPersonales: Object.freeze({ nombreCompleto: "Ana Demo", numeroDni: "123", telefono: "555" }), productoDeseado: "Heladera", costoProveedor: 99 });
const request = mapSolicitudToAdminReadModel("duplicate", input);
const opening = mapSolicitudCuentaToAdminReadModel("duplicate", { nombreCompleto: "Otra Demo", numeroDni: "123", estado: "Pendiente", fecha: date });
const filters = { view: "all" as const, type: "", status: "", q: "" };
test("solicitud normal, proyección explícita", () => { assert.equal(request.nombreCliente, "Ana Demo"); assert.equal(request.dni, "123"); assert.equal(request.tipoPresentacion, "Solicitud"); assert.equal(request.sourceCollection, "solicitudes"); assert.ok(!('costoProveedor' in request)); });
test("consulta de la segunda fuente", () => { assert.equal(opening.tipoPresentacion, "Consulta inicial"); assert.equal(opening.nombreCliente, "Otra Demo"); });
test("mismo ID conserva dos identidades", () => { assert.equal(request.documentId, opening.documentId); assert.notEqual(request.recordKey, opening.recordKey); assert.equal(filterAdminSolicitudes([request, opening], filters).length, 2); });
test("contacto rápido", () => assert.equal(mapSolicitudCuentaToAdminReadModel("c", { tipo: "contacto_rapido", nombre: "Demo", necesidad: "Mesa" }).tipoPresentacion, "Contacto rápido"));
test("ausencia de fecha sin fallback actual ni cero", () => { const r = mapSolicitudToAdminReadModel("missing", {}); assert.equal(r.fechaCreacion, null); assert.equal(r.fechaSort, null); assert.equal(formatAdminSolicitudDate(r.fechaCreacion), "Sin fecha registrada"); });
test("preserva Timestamp y unidad temporal", () => { assert.equal(request.fechaCreacion, date); assert.equal(request.fechaSort, date.toMillis()); assert.equal(storedDateMillis(new Date(0)), 0); });
test("fecha inválida no produce fecha inventada", () => assert.equal(mapSolicitudCuentaToAdminReadModel("x", { fecha: "error" }).fechaSort, null));
test("estado desconocido queda en Todas", () => { const r = mapSolicitudToAdminReadModel("x", { estado: "OTRO" }); assert.equal(r.estadoOriginal, "OTRO"); assert.equal(filterAdminSolicitudes([r], filters).length, 1); assert.equal(filterAdminSolicitudes([r], { ...filters, view: "pending" }).length, 0); });
test("sin estado no se convierte a pendiente", () => assert.equal(isAdminSolicitudPending(mapSolicitudCuentaToAdminReadModel("x", {})), false));
test("múltiples registros con igual DNI no se fusionan", () => { assert.equal(request.dni, opening.dni); assert.equal(filterAdminSolicitudes([request, opening, mapSolicitudToAdminReadModel("another", input)], filters).length, 3); });
test("filtros y búsqueda preservan fuente", () => { const r = filterAdminSolicitudes([request, opening], { ...filters, q: "123" }); assert.deepEqual(new Set(r.map(item => item.sourceCollection)), new Set(["solicitudes", "solicitudes_cuenta"])); assert.equal(filterAdminSolicitudes(r, { ...filters, type: "Solicitud" })[0].sourceCollection, "solicitudes"); });
test("estados activos legacy, sin alterar casing", () => { for (const estado of ["Pendiente", "Aprobado_Presupuesto", "solicitante", "APERTURADO"]) { const item = mapSolicitudCuentaToAdminReadModel("x", { estado }); assert.ok(isAdminSolicitudPending(item)); assert.equal(item.estadoOriginal, estado); } assert.ok(!isAdminSolicitudPending(mapSolicitudCuentaToAdminReadModel("x", { estado: "Aprobado" }))); });
test("próxima acción no muta estado", () => { const r = Object.freeze(mapSolicitudToAdminReadModel("x", { estado: "REQUIERE_INFO" })); assert.equal(adminSolicitudNextAction(r), "Consultar información solicitada"); assert.equal(r.estadoOriginal, "REQUIERE_INFO"); });
test("no genera valores financieros", () => { assert.deepEqual(request.propuestas, []); assert.ok(!('montoCuota' in request)); const p = mapSolicitudCuentaToAdminReadModel("x", { presupuestos: [{ items: [{ producto: "Mesa", costoProveedor: 200 }] }] }).propuestas[0].items[0]; assert.equal(p.cuotas, null); assert.equal(p.valorCuota, null); assert.equal(p.contado, null); assert.ok(!('costoProveedor' in p)); });
test("nunca consulta Date.now para mapear", () => { const now = Date.now; try { Date.now = () => { throw new Error("Unexpected Date.now"); }; assert.equal(mapSolicitudToAdminReadModel("x", {}).fechaCreacion, null); } finally { Date.now = now; } });
test("sentinel documental y URLs peligrosas", () => { const docs = mapSolicitudToAdminReadModel("x", { documentos: { dniFrente: "Pendiente envío WhatsApp", dniDorso: "javascript:alert(1)" } }).documentos; assert.equal(docs[0].status, "Pendiente"); assert.equal(docs[0].url, null); assert.equal(docs[1].url, null); assert.equal(docs[2].status, "No cargado"); });
test("actividad sólo con fechas y hechos guardados", () => { assert.equal(mapSolicitudToAdminReadModel("x", {}).actividad.length, 0); assert.equal(mapSolicitudToAdminReadModel("x", { contratoFirmado: true }).actividad.length, 0); assert.equal(mapSolicitudToAdminReadModel("x", { contratoFirmado: true, fechaFirmaDigital: date }).actividad[0].label, "Autorización registrada"); });
test("contexto privado: nunca q ni campos arbitrarios", () => { const query = adminSolicitudesContext({ ...filters, q: "Ana 123 email@test.com", type: "Solicitud", status: "PENDIENTE" }); assert.ok(!query.includes('q=')); assert.equal(parseAdminSolicitudFilters({ view: "all", q: "secret", status: "email@test.com", type: "bad" }).q, ""); assert.equal(parseAdminSolicitudFilters({ status: "email@test.com" }).status, ""); });
async function testSourceFailures() {
  for (const failed of ["solicitudes", "solicitudes_cuenta"]) {
    const result = await readAdminSolicitudesSources(async source => {
      if (source === failed) throw Object.assign(new Error("denied"), { code: "permission-denied" });
      return [source === "solicitudes" ? request : opening];
    });
    assert.equal(result.items.length, 1); assert.equal(result.loadedSources.length, 1);
    assert.ok(result.errors[failed as keyof typeof result.errors]);
    tests++;
  }
  const failed = await readAdminSolicitudesSources(async () => { throw new Error("offline"); });
  assert.equal(failed.loadedSources.length, 0); assert.equal(Object.keys(failed.errors).length, 2); tests++;
  console.log(`READ_MODEL_TEST = ${tests}/${tests} PASS`);
}
testSourceFailures().catch(error => { console.error(error); process.exitCode = 1; });
