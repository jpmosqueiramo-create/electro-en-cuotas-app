import "./helpers/requireSafeEmulatorEnvironment";
import assert from "node:assert/strict";
import { admin } from "../src/lib/firebaseAdmin";
import { initializeApp, deleteApp } from "firebase/app";
import { connectAuthEmulator, getAuth, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { connectFirestoreEmulator, getFirestore, terminate } from "firebase/firestore";
import { loadAdminSolicitudBySourceAndId, loadAdminSolicitudes } from "../src/lib/adminSolicitudesReader";
import { filterAdminSolicitudes } from "../src/lib/adminSolicitudesReadModel";
import { adminEmail, adminPassword, databaseSnapshot, duplicateId, observeRuntimeWrites, setupAdminSolicitudesFixtures } from "./helpers/adminSolicitudesFixtures";

async function main() {
  await setupAdminSolicitudesFixtures();
  const before = await databaseSnapshot();
  const observer = await observeRuntimeWrites();
  const app = initializeApp({ projectId: "demo-cuenta-hogar", apiKey: "demo-key", appId: "demo-test" }, "solicitudes-read-only-test");
  const auth = getAuth(app), db = getFirestore(app);
  const [firestoreHost, firestorePort] = process.env.FIRESTORE_EMULATOR_HOST!.split(":");
  connectFirestoreEmulator(db, firestoreHost, Number(firestorePort));
  connectAuthEmulator(auth, `http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}`, { disableWarnings: true });
  try {
    await signInWithEmailAndPassword(auth, adminEmail, adminPassword);
    const result = await loadAdminSolicitudes(db);
    assert.deepEqual(result.errors, {}); assert.equal(result.loadedSources.length, 2);
    assert.equal(result.items.filter(item => item.documentId === duplicateId).length, 2);
    const filtered = filterAdminSolicitudes(result.items, { view: "all", type: "", status: "", q: "30111222" });
    assert.equal(filtered.length, 2);
    assert.equal(filterAdminSolicitudes(result.items, { view: "pending", type: "Contacto rápido", status: "", q: "" }).length, 1);
    for (const source of ["solicitudes", "solicitudes_cuenta"] as const) {
      const item = await loadAdminSolicitudBySourceAndId(source, duplicateId, db);
      assert.equal(item?.sourceCollection, source); assert.equal(item?.documentId, duplicateId);
    }
    assert.equal(await loadAdminSolicitudBySourceAndId("solicitudes", "solicitudes_v1_approved_no_replica", db), null);
    assert.equal((await loadAdminSolicitudBySourceAndId("solicitudes_cuenta", "solicitudes_v1_approved_no_replica", db))?.estadoOriginal, "Aprobado");
    await assert.rejects(loadAdminSolicitudBySourceAndId("vendedores", duplicateId, db), /INVALID_SOLICITUD_IDENTITY/);
    assert.deepEqual(await databaseSnapshot(), before);
    assert.equal(observer.count(), 0);
    console.log("EMULATOR_READ_ONLY_TEST = PASS\nWRITES_AFTER_SETUP = 0");
    // Signed-out reads fail per source rather than masquerading as an empty successful inbox.
    await signOut(auth);
    const denied = await loadAdminSolicitudes(db);
    assert.equal(denied.loadedSources.length, 0); assert.equal(Object.keys(denied.errors).length, 2);
    console.log("UNAUTHORIZED_SOURCES_TEST = PASS");
  } finally { observer.close(); await terminate(db); await deleteApp(app); await admin.app().delete(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
