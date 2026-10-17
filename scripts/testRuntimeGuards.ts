import assert from "node:assert/strict";
import { assertSafeEmulatorEnvironment } from "./helpers/assertSafeEmulatorEnvironment";
import { resolveChrome } from "./helpers/resolveChrome";
import { spawnSync } from "node:child_process";

const safe = {
  GCLOUD_PROJECT: "demo-cuenta-hogar",
  FIRESTORE_EMULATOR_HOST: "127.0.0.1:8080",
  FIREBASE_AUTH_EMULATOR_HOST: "127.0.0.1:9099",
};
assert.equal(assertSafeEmulatorEnvironment(safe), "demo-cuenta-hogar");
for (const env of [
  {}, { ...safe, FIRESTORE_EMULATOR_HOST: undefined },
  { ...safe, FIREBASE_AUTH_EMULATOR_HOST: undefined },
  { ...safe, GCLOUD_PROJECT: "negocio-facil-page" },
  { ...safe, NEXT_PUBLIC_FIREBASE_PROJECT_ID: "negocio-facil-page" },
  { ...safe, FIRESTORE_EMULATOR_HOST: "remote.example:8080" },
  { ...safe, FIREBASE_AUTH_EMULATOR_HOST: "localhost:99999" },
  { ...safe, FIREBASE_PRIVATE_KEY: "test-placeholder" },
]) {
  assert.throws(() => assertSafeEmulatorEnvironment(env), /REFUSED_UNSAFE_FIREBASE_TEST_ENVIRONMENT/);
}
assert.throws(() => resolveChrome({ PATH: "/nonexistent" }, []), /CHROME_NOT_FOUND/);
assert.equal(resolveChrome({ CHROME_BIN: process.execPath, PATH: "" }), process.execPath);
// Exercise the real entrypoint to cover guard execution before Admin imports.
const childEnv = { ...process.env };
for (const key of ["GCLOUD_PROJECT", "GOOGLE_CLOUD_PROJECT", "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
  "FIRESTORE_EMULATOR_HOST", "FIREBASE_AUTH_EMULATOR_HOST", "GOOGLE_APPLICATION_CREDENTIALS",
  "FIREBASE_CLIENT_EMAIL", "FIREBASE_PRIVATE_KEY"]) delete childEnv[key];
const child = spawnSync(process.execPath, ["--import", "tsx", "scripts/testAdminCommissionsUI3B5C1.ts"], {
  env: childEnv, encoding: "utf8", timeout: 10000,
});
assert.equal(child.status, 1);
assert.match(child.stderr, /REFUSED_UNSAFE_FIREBASE_TEST_ENVIRONMENT/);
console.log("Runtime guards: PASS (safe project, missing hosts, production project, credentials, Chrome resolution)");
