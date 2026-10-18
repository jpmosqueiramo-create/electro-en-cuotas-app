import "./helpers/requireSafeEmulatorEnvironment";
import assert from "node:assert/strict";
import { initializeApp, deleteApp } from "firebase/app";
import { connectAuthEmulator, getAuth, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { connectFirestoreEmulator, getFirestore, terminate } from "firebase/firestore";
import { admin } from "../src/lib/firebaseAdmin";
import { filterAdminDocumentacion } from "../src/lib/adminDocumentacionReadModel";
import { loadAdminDocumentacion } from "../src/lib/adminDocumentacionReader";
import { loadAdminSolicitudBySourceAndId } from "../src/lib/adminSolicitudesReader";
import { adminEmail, adminPassword, databaseSnapshot, documentacionDuplicateId, observeRuntimeWrites, setupAdminDocumentacionFixtures } from "./helpers/adminDocumentacionFixtures";

async function main() {
  await setupAdminDocumentacionFixtures();
  const before = await databaseSnapshot(), observer = await observeRuntimeWrites();
  const app = initializeApp({ projectId: "demo-cuenta-hogar", apiKey: "demo-key", appId: "demo-doc-test" }, "documentacion-read-only");
  const auth = getAuth(app), db = getFirestore(app);
  const [host, port] = process.env.FIRESTORE_EMULATOR_HOST!.split(":");
  connectFirestoreEmulator(db, host, Number(port));
  connectAuthEmulator(auth, `http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}`, { disableWarnings: true });
  try {
    await signInWithEmailAndPassword(auth, adminEmail, adminPassword);
    const result = await loadAdminDocumentacion(db);
    assert.deepEqual(result.errors, {}); assert.equal(result.loadedSources.length, 2); assert.equal(result.items.length, 5);
    const base = { view: "all" as const, type: "", document: "", q: "" };
    assert.equal(filterAdminDocumentacion(result.items, { ...base, q: "30111222" }).length, 2);
    assert.equal(filterAdminDocumentacion(result.items, { ...base, view: "available" }).length, 3);
    assert.equal(filterAdminDocumentacion(result.items, { ...base, view: "not_recorded" }).length, 1);
    assert.equal(filterAdminDocumentacion(result.items, { ...base, view: "pending_send" }).length, 3);
    for (const source of ["solicitudes", "solicitudes_cuenta"] as const) {
      const item = await loadAdminSolicitudBySourceAndId(source, documentacionDuplicateId, db);
      assert.equal(item?.sourceCollection, source); assert.equal(item?.documentId, documentacionDuplicateId);
    }
    assert.deepEqual(await databaseSnapshot(), before); assert.equal(observer.count(), 0);
    console.log("EMULATOR_READ_ONLY_TEST = PASS\nWRITES_AFTER_SETUP = 0");
    await signOut(auth);
    const denied = await loadAdminDocumentacion(db);
    assert.equal(denied.loadedSources.length, 0); assert.equal(Object.keys(denied.errors).length, 2);
  } finally { observer.close(); await terminate(db); await deleteApp(app); await admin.app().delete(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
