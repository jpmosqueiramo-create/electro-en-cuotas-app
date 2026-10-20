import assert from "node:assert/strict";
import { assertStagingConfig, resolveServerProject, type FirebaseEnvironment } from "../src/lib/firebaseEnvironment";

const staging: FirebaseEnvironment = {
  NEXT_PUBLIC_APP_ENV: "staging", GCLOUD_PROJECT: "cuenta-hogar-staging",
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: "cuenta-hogar-staging",
  NEXT_PUBLIC_FIREBASE_API_KEY: "synthetic-config-not-used-for-network",
  NEXT_PUBLIC_FIREBASE_APP_ID: "1:123456:web:synthetic",
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: "123456",
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: "cuenta-hogar-staging.firebaseapp.com",
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: "cuenta-hogar-staging.firebasestorage.app",
  NEXT_PUBLIC_ADMIN_EMAIL: "admin.staging@example.invalid"
};
assert.equal(resolveServerProject(staging), "cuenta-hogar-staging");
for (const key of Object.keys(staging).filter(key => key.startsWith("NEXT_PUBLIC_"))) {
  const incomplete = { ...staging }; delete incomplete[key];
  assert.throws(() => resolveServerProject(incomplete), `Missing ${key} must fail closed`);
}
for (const overrides of [
  { NEXT_PUBLIC_FIREBASE_PROJECT_ID: "negocio-facil-page" },
  { GCLOUD_PROJECT: "negocio-facil-page" },
  { GOOGLE_CLOUD_PROJECT: "negocio-facil-page" },
  { NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: "negocio-facil-page.firebaseapp.com" },
  { NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: "negocio-facil-page.firebasestorage.app" },
  { NEXT_PUBLIC_FIREBASE_APP_ID: "1:999999:web:other-project" },
  { NEXT_PUBLIC_FIREBASE_API_KEY: "__PLACEHOLDER__" },
  { NEXT_PUBLIC_APP_ENV: "stagng" },
  { NEXT_PUBLIC_E2E_TEST_MODE: "1" },
  { NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST: "127.0.0.1:9099" },
  { FIRESTORE_EMULATOR_HOST: "127.0.0.1:8080" },
  { FIREBASE_AUTH_EMULATOR_HOST: "127.0.0.1:9099" },
  { FIREBASE_STORAGE_EMULATOR_HOST: "127.0.0.1:9199" },
  { FIREBASE_CLIENT_EMAIL: "synthetic@example.invalid", FIREBASE_PRIVATE_KEY: "not-a-key" },
  { GOOGLE_APPLICATION_CREDENTIALS: "/not-read.json" },
  { FIREBASE_SERVICE_ACCOUNT_KEY: "not-read" },
  { FIREBASE_SERVICE_ACCOUNT_JSON: "not-read" },
  { STORAGE_EMULATOR_HOST: "http://127.0.0.1:9199" },
  { FIREBASE_CONFIG: JSON.stringify({ projectId: "negocio-facil-page" }) },
  { FIREBASE_CONFIG: JSON.stringify({ projectId: "cuenta-hogar-staging", storageBucket: "other-bucket" }) },
  { FIREBASE_CONFIG: "invalid" }
]) assert.throws(() => resolveServerProject({ ...staging, ...overrides }));
assert.throws(() => resolveServerProject({}));
assert.throws(() => resolveServerProject({ GCLOUD_PROJECT: "cuenta-hogar-staging" }));
assert.throws(() => resolveServerProject({ GCLOUD_PROJECT: "demo-cuenta-hogar", NEXT_PUBLIC_FIREBASE_PROJECT_ID: "negocio-facil-page" }));
assert.throws(() => resolveServerProject({ GCLOUD_PROJECT: "negocio-facil-page", FIRESTORE_EMULATOR_HOST: "127.0.0.1:8080" }));
assert.equal(resolveServerProject({ GCLOUD_PROJECT: "demo-cuenta-hogar", FIRESTORE_EMULATOR_HOST: "127.0.0.1:8080", FIREBASE_AUTH_EMULATOR_HOST: "127.0.0.1:9099" }), "demo-cuenta-hogar");
assertStagingConfig({ NODE_ENV: "production", NEXT_PUBLIC_FIREBASE_PROJECT_ID: "negocio-facil-page" });

async function identityTests() {
  delete process.env.NEXT_PUBLIC_ADMIN_EMAIL;
  // Identity reads configuration at import; test empty config in a fresh process.
  const { spawnSync } = await import("node:child_process");
  for (const email of ["", "admin.staging@example.invalid"]) {
    const result = spawnSync(process.execPath, ["--import", "tsx", "--input-type=module", "-e", `
      import assert from 'node:assert/strict';
      import { isAdminEmail } from './src/lib/adminIdentity.ts';
      assert.equal(isAdminEmail(null), false);
      assert.equal(isAdminEmail(''), false);
      assert.equal(isAdminEmail('other@example.invalid'), false);
      assert.equal(isAdminEmail(' ADMIN.STAGING@EXAMPLE.INVALID '), ${Boolean(email)});
    `], { env: { ...process.env, NEXT_PUBLIC_ADMIN_EMAIL: email }, encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr);
  }
  console.log("STAGING_CONFIGURATION_AND_IDENTITY = PASS");
}
identityTests().catch(() => { console.error("STAGING_CONFIGURATION_TEST_FAILED"); process.exitCode = 1; });
