import assert from "assert";
import { validateFirebaseConfig, connectAuthEmulatorIfE2E, connectFirestoreEmulatorIfE2E } from "../src/lib/firebase";

async function runGuardTests() {
  console.log("==========================================================");
  console.log("TEST DE SEGURIDAD: FAIL-CLOSED CONFIG & EMULATOR GUARDS");
  console.log("==========================================================\n");

  const originalEnv = { ...process.env };

  try {
    // ----------------------------------------------------
    // PARTE 1: VERIFICACIÓN FAIL-CLOSED DE CONFIG EN PRODUCCIÓN
    // ----------------------------------------------------
    // Escenario 1: Producción sin API KEY -> RECHAZADO (incompleta)
    const resNoApiKey = validateFirebaseConfig({
      NODE_ENV: "production",
      NEXT_PUBLIC_FIREBASE_PROJECT_ID: "cuenta-hogar-prod",
      NEXT_PUBLIC_FIREBASE_APP_ID: "1:123456:web:abcdef"
    });
    assert.strictEqual(resNoApiKey.ok, false);
    assert(resNoApiKey.error?.includes("incompleta"));
    console.log("[PASS] Escenario 1: Producción sin API Key -> RECHAZO FAIL-CLOSED");

    // Escenario 2: Producción sin PROJECT ID -> RECHAZADO (incompleta)
    const resNoProjectId = validateFirebaseConfig({
      NODE_ENV: "production",
      NEXT_PUBLIC_FIREBASE_API_KEY: "AIzaSyRealProductionKey1234567890",
      NEXT_PUBLIC_FIREBASE_APP_ID: "1:123456:web:abcdef"
    });
    assert.strictEqual(resNoProjectId.ok, false);
    assert(resNoProjectId.error?.includes("incompleta"));
    console.log("[PASS] Escenario 2: Producción sin Project ID -> RECHAZO FAIL-CLOSED");

    // Escenario 3: Producción sin APP ID -> RECHAZADO (incompleta)
    const resNoAppId = validateFirebaseConfig({
      NODE_ENV: "production",
      NEXT_PUBLIC_FIREBASE_API_KEY: "AIzaSyRealProductionKey1234567890",
      NEXT_PUBLIC_FIREBASE_PROJECT_ID: "cuenta-hogar-prod"
    });
    assert.strictEqual(resNoAppId.ok, false);
    assert(resNoAppId.error?.includes("incompleta"));
    console.log("[PASS] Escenario 3: Producción sin App ID -> RECHAZO FAIL-CLOSED");

    // Escenario 4: Producción con Dummy API Key -> RECHAZADO (dummy/fallback)
    const resDummyApiKey = validateFirebaseConfig({
      NODE_ENV: "production",
      NEXT_PUBLIC_FIREBASE_API_KEY: "AIzaSyDummyKeyForStandaloneFallback123456",
      NEXT_PUBLIC_FIREBASE_PROJECT_ID: "cuenta-hogar-prod",
      NEXT_PUBLIC_FIREBASE_APP_ID: "1:123456:web:abcdef"
    });
    assert.strictEqual(resDummyApiKey.ok, false);
    assert(resDummyApiKey.error?.includes("dummy/fallback"));
    console.log("[PASS] Escenario 4: Producción con Dummy API Key -> RECHAZO FAIL-CLOSED");

    // Escenario 5: Producción con Dummy Project ID -> RECHAZADO (dummy/fallback)
    const resDummyProj = validateFirebaseConfig({
      NODE_ENV: "production",
      NEXT_PUBLIC_FIREBASE_API_KEY: "AIzaSyRealProductionKey1234567890",
      NEXT_PUBLIC_FIREBASE_PROJECT_ID: "demo-cuenta-hogar",
      NEXT_PUBLIC_FIREBASE_APP_ID: "1:123456:web:abcdef"
    });
    assert.strictEqual(resDummyProj.ok, false);
    assert(resDummyProj.error?.includes("dummy/fallback"));
    console.log("[PASS] Escenario 5: Producción con Demo Project ID -> RECHAZO FAIL-CLOSED");

    // Escenario 6: Producción con Dummy App ID -> RECHAZADO (dummy/fallback)
    const resDummyApp = validateFirebaseConfig({
      NODE_ENV: "production",
      NEXT_PUBLIC_FIREBASE_API_KEY: "AIzaSyRealProductionKey1234567890",
      NEXT_PUBLIC_FIREBASE_PROJECT_ID: "cuenta-hogar-prod",
      NEXT_PUBLIC_FIREBASE_APP_ID: "1:1028713210344:web:e2e-dummy"
    });
    assert.strictEqual(resDummyApp.ok, false);
    assert(resDummyApp.error?.includes("dummy/fallback"));
    console.log("[PASS] Escenario 6: Producción con Dummy App ID -> RECHAZO FAIL-CLOSED");

    // Escenario 7: Producción con Credenciales Reales -> ACEPTADO
    const resValidProd = validateFirebaseConfig({
      NODE_ENV: "production",
      NEXT_PUBLIC_FIREBASE_API_KEY: "AIzaSyRealProductionKey1234567890",
      NEXT_PUBLIC_FIREBASE_PROJECT_ID: "cuenta-hogar-prod",
      NEXT_PUBLIC_FIREBASE_APP_ID: "1:123456:web:abcdef"
    });
    assert.strictEqual(resValidProd.ok, true);
    console.log("[PASS] Escenario 7: Producción con Credenciales Reales -> ACEPTADO");

    console.log("\n==========================================================");
    console.log("PRODUCTION_DUMMY_FIREBASE_CONFIG = IMPOSSIBLE");
    console.log("==========================================================\n");

    // ----------------------------------------------------
    // PARTE 2: VERIFICACIÓN DE GUARDS DE EMULADORES EN PRODUCCIÓN
    // ----------------------------------------------------
    Object.assign(process.env, { NODE_ENV: "production" });
    process.env.NEXT_PUBLIC_E2E_TEST_MODE = "1";
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:9099";
    globalThis.__FIREBASE_AUTH_EMULATOR_CONNECTED__ = undefined;
    globalThis.__FIREBASE_FIRESTORE_EMULATOR_CONNECTED__ = undefined;

    const mockAuth = { _isMock: true } as unknown as import("firebase/auth").Auth;
    const mockDb = { _isMock: true } as unknown as import("firebase/firestore").Firestore;

    const resultProdAuth = connectAuthEmulatorIfE2E(mockAuth);
    assert.strictEqual(resultProdAuth, false, "En producción connectAuthEmulator DEBE retornar false");
    assert.strictEqual(globalThis.__FIREBASE_AUTH_EMULATOR_CONNECTED__, undefined, "Auth emulator no debe marcarse como conectado");
    console.log("[PASS] Escenario 8: En NODE_ENV=production con banderas E2E activas -> AUTH EMULATOR BLOQUEADO");

    const resultProdFirestore = connectFirestoreEmulatorIfE2E(mockDb);
    assert.strictEqual(resultProdFirestore, false, "En producción connectFirestoreEmulator DEBE retornar false");
    assert.strictEqual(globalThis.__FIREBASE_FIRESTORE_EMULATOR_CONNECTED__, undefined, "Firestore emulator no debe marcarse como conectado");
    console.log("[PASS] Escenario 9: En NODE_ENV=production con banderas E2E activas -> FIRESTORE EMULATOR BLOQUEADO");

    // Escenario 10: Sin NEXT_PUBLIC_E2E_TEST_MODE -> DEBE RECHAZAR
    Object.assign(process.env, { NODE_ENV: "development" });
    delete process.env.NEXT_PUBLIC_E2E_TEST_MODE;
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:9099";
    globalThis.__FIREBASE_AUTH_EMULATOR_CONNECTED__ = undefined;

    const resultNoE2EFlag = connectAuthEmulatorIfE2E(mockAuth);
    assert.strictEqual(resultNoE2EFlag, false, "Sin bandera E2E DEBE retornar false");
    console.log("[PASS] Escenario 10: Sin NEXT_PUBLIC_E2E_TEST_MODE=1 -> CONEXIÓN BLOQUEADA");

    // Escenario 11: Sin HOST -> DEBE RECHAZAR
    process.env.NEXT_PUBLIC_E2E_TEST_MODE = "1";
    delete process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST;
    globalThis.__FIREBASE_AUTH_EMULATOR_CONNECTED__ = undefined;

    const resultNoHost = connectAuthEmulatorIfE2E(mockAuth);
    assert.strictEqual(resultNoHost, false, "Sin host DEBE retornar false");
    console.log("[PASS] Escenario 11: Sin NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST -> CONEXIÓN BLOQUEADA");

    console.log("\n==========================================================");
    console.log("PRODUCTION_AUTH_EMULATOR_CONNECTION = IMPOSSIBLE");
    console.log("TODAS LAS CONDICIONES DE SEGURIDAD VERIFICADAS (11/11 PASS)");
    console.log("==========================================================");
    process.exit(0);
  } catch (err) {
    console.error("ERROR EN TEST DE GUARDA:", err);
    process.exit(1);
  } finally {
    process.env = originalEnv;
  }
}

runGuardTests();
