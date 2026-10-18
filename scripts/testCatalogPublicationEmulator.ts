import "./helpers/requireSafeEmulatorEnvironment";
import assert from "node:assert/strict";
import type { Transaction, DocumentReference, Firestore } from "firebase-admin/firestore";
import { NextRequest } from "next/server";
import { admin } from "../src/lib/firebaseAdmin";
import { ADMIN_EMAIL } from "../src/lib/adminAuth";
import { GET as previewRoute } from "../src/app/api/admin/catalogo/referencias/[id]/preview/route";
import { POST as publishRoute } from "../src/app/api/admin/catalogo/referencias/[id]/publicar/route";
import { POST as unpublishRoute } from "../src/app/api/admin/catalogo/referencias/[id]/despublicar/route";
import { catalogC2Fixture, sensitiveCatalogPaths } from "./helpers/catalogReferenceC2Fixtures";
import type { CatalogReferencePublic } from "../src/lib/catalogReference";

async function run() {
  // La guarda se evaluó antes de importar Admin. Sin defaults ni credenciales.
  assert.equal(process.env.GCLOUD_PROJECT, "demo-cuenta-hogar");
  assert.equal(process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID, "demo-cuenta-hogar");
  assert.equal(process.env.FIRESTORE_EMULATOR_HOST, "127.0.0.1:8080");
  assert.equal(process.env.FIREBASE_AUTH_EMULATOR_HOST, "127.0.0.1:9099");
  const db = admin.firestore();
  const writes: Record<string, number> = { productos: 0, catalogo_publico: 0 };
  const prefix = `c2-${process.pid}`;
  const id = `${prefix}-valid`;
  const invalidId = `${prefix}-invalid`;
  function assertFixturePath(path: string) {
    const [collection, document, ...rest] = path.split("/");
    assert.ok(["productos", "catalogo_publico"].includes(collection), "Escritura fuera del alcance");
    assert.ok(document.startsWith(prefix) && rest.length === 0, "Sólo fixtures C2");
  }
  function count(path: string) {
    assertFixturePath(path);
    writes[path.split("/")[0]]++;
  }
  async function seed(path: string, data: Record<string, unknown>) {
    assertFixturePath(path);
    await db.doc(path).set(data);
    count(path);
  }
  // Observar escrituras de transacciones reales, incluidas las de los endpoints.
  // Contar sólo el intento confirmado; reintentos abortados no se duplican.
  const originalTransaction = db.runTransaction.bind(db);
  db.runTransaction = async function<T>(
    operation: (transaction: Transaction) => Promise<T>,
    options?: Parameters<Firestore["runTransaction"]>[1],
  ): Promise<T> {
    let committedPaths: string[] = [];
    const result = await originalTransaction(async transaction => {
      const paths: string[] = [];
      const observed = new Proxy(transaction, {
        get(target, key) {
          if (["set", "delete", "update", "create"].includes(String(key))) {
            return (reference: DocumentReference, ...args: unknown[]) => {
              assertFixturePath(reference.path);
              paths.push(reference.path);
              const method = Reflect.get(target, key) as (...values: unknown[]) => unknown;
              return method.apply(target, [reference, ...args]);
            };
          }
          const value = Reflect.get(target, key);
          return typeof value === "function" ? value.bind(target) : value;
        },
      });
      const output = await operation(observed);
      committedPaths = paths;
      return output;
    }, options);
    committedPaths.forEach(count);
    return result;
  };
  assert.equal(admin.firestore(), db, "Los endpoints usan la instancia observada");

  async function token(email: string) {
    // Dos cuentas ficticias sólo en Auth Emulator; ninguna colección Firestore adicional.
    const response = await fetch(
      "http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake-apiKey",
      { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password: "DemoOnlyPassword123!", returnSecureToken: true }) },
    );
    assert.equal(response.status, 200, "Auth fixture local");
    const body = await response.json() as { idToken: string };
    assert.equal(typeof body.idToken, "string");
    return body.idToken;
  }
  const adminToken = await token(ADMIN_EMAIL);
  const clientToken = await token(`${prefix}@example.test`);
  function request(action: string, bearer?: string, body?: unknown) {
    return new NextRequest(`http://localhost/api/admin/catalogo/referencias/${id}/${action}`, {
      method: action === "preview" ? "GET" : "POST",
      headers: { ...(bearer ? { authorization: `Bearer ${bearer}` } : {}),
        ...(body === undefined ? {} : { "content-type": "application/json" }) },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  }
  const context = (referenceId = id) => ({ params: Promise.resolve({ id: referenceId }) });
  type Preview = {
    dto: CatalogReferencePublic | null; fingerprint: string | null;
    validation: { valid: boolean; errors: string[] };
    hasPublicProjection: boolean; hasUnpublishedChanges: boolean;
  };
  async function preview(referenceId = id, expectedStatus = 200): Promise<Preview> {
    const response = await previewRoute(request("preview", adminToken), context(referenceId));
    assert.equal(response.status, expectedStatus);
    assert.equal(response.headers.get("cache-control"), "no-store");
    return response.json();
  }
  async function publish(fingerprint: string, referenceId = id, expectedStatus = 200) {
    const response = await publishRoute(request("publicar", adminToken, {
      expectedFingerprint: fingerprint,
    }), context(referenceId));
    assert.equal(response.status, expectedStatus);
    return response.json() as Promise<{ status?: string; error?: string }>;
  }
  async function unpublish(referenceId = id, expectedStatus = 200) {
    const response = await unpublishRoute(request("despublicar", adminToken), context(referenceId));
    assert.equal(response.status, expectedStatus);
    return response.json() as Promise<{ status: string }>;
  }
  const privateRef = db.doc(`productos/${id}`);
  const publicRef = db.doc(`catalogo_publico/${id}`);
  const raw = catalogC2Fixture();
  await seed(privateRef.path, raw);
  const privateOriginal = (await privateRef.get()).data();
  // 23–24: auth real existente; los tres endpoints, sin ejecución del servicio.
  for (const [action, route] of [
    ["preview", previewRoute], ["publicar", publishRoute], ["despublicar", unpublishRoute],
  ] as const) {
    assert.equal((await route(request(action), context())).status, 401);
    assert.equal((await route(request(action, clientToken), context())).status, 403);
  }
  assert.equal(writes.catalogo_publico, 0);
  assert.equal((await publicRef.get()).exists, false);
  const invalidPath = await previewRoute(request("preview", adminToken), context("a/b"));
  assert.equal(invalidPath.status, 400);
  const invalidCommand = await publishRoute(request("publicar", adminToken, {
    expectedFingerprint: "a".repeat(64), costo: 1,
  }), context());
  assert.equal(invalidCommand.status, 400);
  assert.equal((await publishRoute(request("publicar", adminToken, {}), context())).status, 400);
  assert.equal((await publishRoute(request("publicar", adminToken, {
    expectedFingerprint: "not-a-hash",
  }), context())).status, 400);

  // 1–6, 15–21: preview, publicación inicial e idempotencia.
  const a = await preview();
  assert.ok(a.dto && a.fingerprint);
  assert.equal(a.validation.valid, true);
  assert.equal(a.hasPublicProjection, false);
  assert.equal(a.hasUnpublishedChanges, true);
  assert.equal((await publicRef.get()).exists, false, "Preview no escribe");
  assert.equal((await publish(a.fingerprint)).status, "PUBLISHED");
  const storedA = await publicRef.get();
  assert.deepEqual(storedA.data(), a.dto);
  assert.equal(storedA.id, id);
  assert.equal(storedA.data()!.publicado, true); // No depende de flags legacy false.
  assert.deepEqual((await privateRef.get()).data(), privateOriginal);
  assert.equal(a.dto.planesPublicados.length, 18);
  assert.equal(a.dto.planesPublicados.find(p => p.cuotas === 12)?.cuotaEstimada, 145000);
  assert.equal(a.dto.planesPublicados.find(p => p.cuotas === 18)?.cuotaEstimada, 130190);
  assert.equal(a.dto.planesPublicados.some(p => p.cuotas === 24), false);
  const publicWritesAfterA = writes.catalogo_publico;
  assert.equal((await publish(a.fingerprint)).status, "ALREADY_CURRENT");
  assert.equal(writes.catalogo_publico, publicWritesAfterA, "No escritura al republicar idéntico");
  assert.ok((await publicRef.get()).updateTime!.isEqual(storedA.updateTime!));
  assert.equal((await preview()).hasUnpublishedChanges, false);

  // Cambios privados sin efecto en DTO conservan fingerprint e idempotencia.
  await seed(privateRef.path, { ...raw, skuInterno: "OTRO-SKU", proveedor: "OTRO PROVEEDOR" });
  const privateOnly = await preview();
  assert.equal(privateOnly.fingerprint, a.fingerprint);
  assert.equal(privateOnly.hasUnpublishedChanges, false);
  assert.equal((await publish(a.fingerprint)).status, "ALREADY_CURRENT");
  assert.equal(writes.catalogo_publico, publicWritesAfterA);

  // 7–10: guardar B no publica; preview antigua rechazada; republicar reemplaza.
  const rawB = { ...raw, nombre: "Versión B", costoProducto: 600000,
    planesActivos: { 12: true, 18: true, 8: false, 24: true } };
  await seed(privateRef.path, rawB);
  assert.deepEqual((await publicRef.get()).data(), a.dto, "B privada no altera A pública");
  const b = await preview();
  assert.ok(b.dto && b.fingerprint);
  assert.equal(b.hasPublicProjection, true);
  assert.equal(b.hasUnpublishedChanges, true);
  assert.notEqual(b.fingerprint, a.fingerprint);
  assert.equal((await publish(a.fingerprint, id, 409)).error, "REFERENCE_CHANGED_SINCE_PREVIEW");
  assert.deepEqual((await publicRef.get()).data(), a.dto);
  assert.equal((await publish(b.fingerprint)).status, "PUBLISHED");
  assert.deepEqual((await publicRef.get()).data(), b.dto);
  const writesAfterB = writes.catalogo_publico;
  assert.equal((await publish(b.fingerprint)).status, "ALREADY_CURRENT");
  assert.equal(writes.catalogo_publico, writesAfterB);
  assert.deepEqual(b.dto.planesPublicados.map(p => p.cuotas), [12, 18]);
  assert.equal(b.dto.planesPublicados[0].cuotaEstimada, 150000);

  // 11: reparar documento contaminado incluso cuando el DTO permitido coincide.
  await seed(publicRef.path, {
    ...b.dto, costoProveedor: 600000, proveedor: "CONTAMINACIÓN", factor: 3,
    stock: [{ id: "PRIVADO" }], extra: [{ factor: 99 }],
  });
  assert.equal((await preview()).hasUnpublishedChanges, true);
  assert.equal((await publish(b.fingerprint)).status, "PUBLISHED");
  assert.deepEqual((await publicRef.get()).data(), b.dto);
  const leaks = sensitiveCatalogPaths(JSON.parse(JSON.stringify((await publicRef.get()).data())));
  assert.deepEqual(leaks, []);

  // 2–3, 22: inválidos y missing no crean proyección; tampoco alteran una existente.
  await seed(`productos/${invalidId}`, { ...raw, costoProducto: 0 });
  const invalid = await preview(invalidId, 400);
  assert.equal(invalid.validation.valid, false);
  assert.equal(invalid.dto, null);
  assert.equal(invalid.fingerprint, null);
  await publish("a".repeat(64), invalidId, 400);
  assert.equal((await db.doc(`catalogo_publico/${invalidId}`).get()).exists, false);
  await preview(`${prefix}-missing`, 404);
  await publish("a".repeat(64), `${prefix}-missing`, 404);
  await unpublish(`${prefix}-missing`, 404);
  const writesBeforeInvalid = writes.catalogo_publico;
  await seed(privateRef.path, { ...rawB, factoresPlanes: { 12: 0 } });
  await publish(b.fingerprint, id, 400);
  assert.deepEqual((await publicRef.get()).data(), b.dto);
  assert.equal(writes.catalogo_publico, writesBeforeInvalid);
  await seed(privateRef.path, rawB);

  // Dos publicaciones concurrentes del mismo contenido: un único commit de datos.
  await seed(privateRef.path, { ...rawB, nombre: "Versión C" });
  const c = await preview();
  assert.ok(c.fingerprint && c.dto);
  const writesBeforeConcurrent = writes.catalogo_publico;
  const concurrent = await Promise.all([publish(c.fingerprint), publish(c.fingerprint)]);
  assert.deepEqual(concurrent.map(r => r.status).sort(), ["ALREADY_CURRENT", "PUBLISHED"]);
  assert.equal(writes.catalogo_publico, writesBeforeConcurrent + 1);
  assert.deepEqual((await publicRef.get()).data(), c.dto);
  assert.deepEqual(sensitiveCatalogPaths(JSON.parse(JSON.stringify(c.dto))), []);

  // 12–14: despublicar no modifica ni elimina privados; doble acción es idempotente.
  const beforeUnpublish = (await privateRef.get()).data();
  assert.equal((await unpublish()).status, "UNPUBLISHED");
  assert.equal((await publicRef.get()).exists, false);
  const afterFirstUnpublish = writes.catalogo_publico;
  assert.equal((await unpublish()).status, "ALREADY_UNPUBLISHED");
  assert.equal(writes.catalogo_publico, afterFirstUnpublish);
  assert.deepEqual((await privateRef.get()).data(), beforeUnpublish);
  const collections = await db.listCollections();
  assert.ok(collections.every(collection => ["productos", "catalogo_publico"].includes(collection.id)),
    "No hay escrituras a otras colecciones Firestore");
  console.log("C2_EMULATOR_TESTS = PASS (casos 1–24 + concurrencia, handlers HTTP y Auth real local)");
  console.log(`SENSITIVE_FIELD_LEAKS = ${leaks.length}`);
  console.log(`EMULATOR_PRODUCTS_WRITES = ${writes.productos}`);
  console.log(`EMULATOR_PUBLIC_CATALOG_WRITES = ${writes.catalogo_publico}`);
  console.log("EMULATOR_OTHER_COLLECTION_WRITES = 0");
  db.runTransaction = originalTransaction;
}

run().catch(error => { console.error(error); process.exitCode = 1; })
  .finally(async () => { await Promise.all(admin.apps.map(app => app?.delete())); });
