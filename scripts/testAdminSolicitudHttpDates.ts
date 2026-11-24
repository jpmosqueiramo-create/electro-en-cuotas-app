import assert from "node:assert/strict";
import { Timestamp } from "firebase-admin/firestore";
import {
  mapSolicitudToAdminReadModel,
  mapSolicitudCuentaToAdminReadModel,
  toAdminSolicitudHttpPayload,
  formatAdminSolicitudDate,
} from "../src/lib/adminSolicitudesReadModel";

const timestamp = Timestamp.fromDate(new Date("2026-10-12T15:00:00Z"));
for (const map of [mapSolicitudToAdminReadModel, mapSolicitudCuentaToAdminReadModel]) {
  const item = map("date-regression", {
    fechaCreacion: timestamp,
    contratoFirmado: true,
    fechaFirmaDigital: timestamp,
    presupuestos: [{ id: "proposal", fecha: timestamp }],
  });
  const payload = JSON.parse(JSON.stringify(toAdminSolicitudHttpPayload(item)));
  assert.equal(payload.fechaCreacion, "2026-10-12T15:00:00.000Z");
  assert.equal(payload.actividad[0].fecha, payload.fechaCreacion);
  assert.equal(payload.propuestas[0].fecha, payload.fechaCreacion);
  assert.equal(formatAdminSolicitudDate(payload.fechaCreacion), "12 de oct de 2026");
  assert.equal(item.fechaCreacion, timestamp);
  assert.equal(item.actividad[0].fecha, timestamp);
  const missing = toAdminSolicitudHttpPayload(map("no-date", {}));
  assert.equal(missing.fechaCreacion, null);
  assert.deepEqual(missing.actividad, []);
}
console.log("HTTP_DATES_BOTH_REQUEST_SOURCES = PASS");
