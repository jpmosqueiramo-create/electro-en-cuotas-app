import "./requireSafeEmulatorEnvironment";
import assert from "node:assert/strict";
import { admin } from "../../src/lib/firebaseAdmin";
import { adminEmail, adminPassword } from "./adminSolicitudesFixtures";
export { adminEmail, adminPassword, databaseSnapshot, observeRuntimeWrites } from "./adminSolicitudesFixtures";
export const documentacionDuplicateId = "documentacion_same_id";
export async function setupAdminDocumentacionFixtures() {
  assert.equal(process.env.GCLOUD_PROJECT, "demo-cuenta-hogar");
  assert.equal((await admin.firestore().collection("vendedores").get()).size, 0, "Use an isolated DEMO instance with empty vendedores");
  try { const user = await admin.auth().getUserByEmail(adminEmail); await admin.auth().updateUser(user.uid, { password: adminPassword }); }
  catch (error) {
    if ((error as { code?: string }).code !== "auth/user-not-found") throw error;
    await admin.auth().createUser({ email: adminEmail, password: adminPassword, emailVerified: true });
  }
  const db = admin.firestore(), batch = db.batch();
  batch.set(db.collection("solicitudes").doc(documentacionDuplicateId), {
    datosPersonales: { nombreCompleto: "Ana Pérez · Demo", numeroDni: "30111222" }, estado: "REQUIERE_INFO", productoDeseado: "Heladera de referencia",
    documentos: { dniFrente: "https://example.test/dni-frente.pdf", dniDorso: "https://example.test/dni-dorso.pdf", reciboSueldo: "Pendiente envío WhatsApp" },
    planPagos: [{ nroCuota: 1, comprobanteUrl: "https://example.test/pago.pdf" }],
  });
  batch.set(db.collection("solicitudes_cuenta").doc(documentacionDuplicateId), {
    nombre: "Bruno Díaz · Demo", dni: "30111222", tipo: "contacto_rapido", estado: "Pendiente", necesidad: "Mesa con ID compartido",
    dniFrenteURL: "https://example.test/consulta-dni.pdf", dniDorsoURL: "Pendiente envío WhatsApp", comprobanteURL: "https://example.test/adjunto.pdf",
  });
  batch.set(db.collection("solicitudes").doc("documentacion_none"), { datosPersonales: { nombreCompleto: "Carla Gómez · Demo" }, estado: "PENDIENTE", productoDeseado: "Cocina" });
  batch.set(db.collection("solicitudes_cuenta").doc("documentacion_pending"), { nombreCompleto: "Diego López · Demo", tipo: "apertura_cuenta", estado: "Pendiente", productoDeseado: "Lavarropas", comprobanteDomicilioURL: "Pendiente envío WhatsApp" });
  batch.set(db.collection("solicitudes").doc("documentacion_available"), {
    datosPersonales: { nombreCompleto: "Elena Torres · Demo" }, estado: "APROBADO", productoDeseado: "Ventilador",
    documentos: { dniFrente: "https://example.test/elena-frente.pdf", dniDorso: "https://example.test/elena-dorso.pdf", reciboSueldo: "https://example.test/ingresos.pdf", servicio: "https://example.test/servicio.pdf" },
  });
  await batch.commit();
}
