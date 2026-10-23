import "./requireSafeEmulatorEnvironment";
import assert from "node:assert/strict";
import { admin } from "../../src/lib/firebaseAdmin";

export const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL || "admin@example.test";
export const adminPassword = "Password123!";
export const duplicateId = "solicitudes_v1_same_id";
export async function setupAdminSolicitudesFixtures() {
  assert.equal(process.env.GCLOUD_PROJECT, "demo-cuenta-hogar");
  const db = admin.firestore();
  // These fixtures require an isolated DEMO instance, not an existing work dataset.
  const sellers = await db.collection("vendedores").get();
  assert.equal(sellers.size, 0, "Start a fresh DEMO emulator: vendedores must be empty");
  try { const user = await admin.auth().getUserByEmail(adminEmail); await admin.auth().updateUser(user.uid, { password: adminPassword }); }
  catch (error) {
    if ((error as { code?: string }).code !== "auth/user-not-found") throw error;
    await admin.auth().createUser({ email: adminEmail, password: adminPassword, emailVerified: true });
  }
  const fecha = admin.firestore.Timestamp.fromDate(new Date("2026-10-12T15:00:00Z"));
  const batch = db.batch();
  batch.set(db.collection("solicitudes").doc(duplicateId), {
    estado: "REQUIERE_INFO", fechaCreacion: fecha, productoDeseado: "Heladera · solicitud de referencia",
    datosPersonales: { nombreCompleto: "Ana Pérez · Demo", numeroDni: "30111222", cuil: "27301112221", telefono: "5550100", direccion: "Calle Ejemplo 123", localidad: "Lincoln" },
    clienteEmail: "ana@example.test", mensajeAdmin: "Necesitamos consultar la información de domicilio.",
    documentos: { dniFrente: "https://example.test/dni-demo.pdf", reciboSueldo: "Pendiente envío WhatsApp" },
    presupuestos: [{ id: "propuesta_demo", estado: "Enviado", fecha, items: [{ producto: "Heladera", cuotas: 6, valorCuota: 25000, contado: 120000 }] }],
  });
  batch.set(db.collection("solicitudes_cuenta").doc(duplicateId), {
    tipo: "contacto_rapido", nombre: "Bruno Díaz · Demo", dni: "30111222", estado: "Pendiente", fecha,
    necesidad: "Mesa · consulta con ID compartido", whatsapp: "5550200", localidad: "Junín",
    presupuestos: [{ id: "consulta_demo", estado: "Enviado", fecha, items: [{ producto: "Mesa de comedor", cuotas: 3, valorCuota: 18000 }] }],
  });
  batch.set(db.collection("solicitudes_cuenta").doc("solicitudes_v1_approved_no_replica"), { tipo: "apertura_cuenta", nombreCompleto: "Carla Gómez · Demo", estado: "Aprobado", fecha, productoDeseado: "Lavarropas" });
  batch.set(db.collection("solicitudes_cuenta").doc("solicitudes_v1_initial"), { tipo: "apertura_cuenta", nombreCompleto: "Diego López · Demo", estado: "Pendiente", fecha, productoDeseado: "Cocina" });
  batch.set(db.collection("solicitudes").doc("solicitudes_v1_no_date"), { estado: "PENDIENTE_FIRMA", datosPersonales: { nombreCompleto: "Elena Torres · Demo" }, productoDeseado: "Ventilador" });
  batch.set(db.collection("solicitudes").doc("solicitudes_v1_unknown"), { estado: "ESTADO_LEGACY_DESCONOCIDO", datosPersonales: { nombreCompleto: "Fabián Ruiz · Demo" }, productoDeseado: "Sillón" });
  await batch.commit();
}
export async function databaseSnapshot(): Promise<[string, unknown][]> {
  const result: [string, unknown][] = [];
  async function visit(collection: FirebaseFirestore.CollectionReference) {
    const snapshot = await collection.get();
    for (const document of snapshot.docs) {
      result.push([document.ref.path, document.data()]);
      for (const child of await document.ref.listCollections()) await visit(child);
    }
  }
  for (const collection of await admin.firestore().listCollections()) await visit(collection);
  return result.sort(([a], [b]) => a.localeCompare(b));
}
/** Observa cambios de documentos, no sólo diferencias finales; ignora únicamente snapshots iniciales. */
export async function observeRuntimeWrites() {
  const names = new Set(["solicitudes", "solicitudes_cuenta", "vendedores", "productos", "notificaciones", "alertas_admin", "remitos"]);
  for (const collection of await admin.firestore().listCollections()) names.add(collection.id);
  let count = 0;
  const unsubscribe: (() => void)[] = [];
  await Promise.all([...names].map(name => new Promise<void>((resolve, reject) => {
    let initial = true;
    unsubscribe.push(admin.firestore().collection(name).onSnapshot(snapshot => {
      if (initial) { initial = false; resolve(); }
      else count += snapshot.docChanges().length;
    }, reject));
  })));
  return { count: () => count, close: () => unsubscribe.forEach(stop => stop()) };
}
