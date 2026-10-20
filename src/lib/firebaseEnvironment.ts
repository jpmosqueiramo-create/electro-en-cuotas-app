/** Pure configuration checks: no Firebase initialization or credential access. */
export type FirebaseEnvironment = Record<string, string | undefined>;
export const STAGING_PROJECT_ID = "cuenta-hogar-staging";

export function assertStagingConfig(env: FirebaseEnvironment): void {
  const project = env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  if (env.NEXT_PUBLIC_APP_ENV && !["staging", "production", "development"].includes(env.NEXT_PUBLIC_APP_ENV)) {
    throw new Error("FIREBASE_ENVIRONMENT_INVALID");
  }
  const staging = env.NEXT_PUBLIC_APP_ENV === "staging" || project === STAGING_PROJECT_ID ||
    env.GCLOUD_PROJECT === STAGING_PROJECT_ID || env.GOOGLE_CLOUD_PROJECT === STAGING_PROJECT_ID;
  if (!staging) return;
  if (env.NEXT_PUBLIC_APP_ENV !== "staging" || project !== STAGING_PROJECT_ID) {
    throw new Error("STAGING_CONFIG_PROJECT_MISMATCH");
  }
  const required = ["NEXT_PUBLIC_FIREBASE_API_KEY", "NEXT_PUBLIC_FIREBASE_APP_ID",
    "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN", "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET",
    "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID", "NEXT_PUBLIC_ADMIN_EMAIL"];
  if (required.some(key => !env[key]?.trim() || /dummy|fallback|placeholder|__[A-Z_]+__/i.test(env[key]!))) {
    throw new Error("STAGING_CONFIG_INCOMPLETE");
  }
  if (env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN !== `${project}.firebaseapp.com` ||
      ![`${project}.firebasestorage.app`, `${project}.appspot.com`].includes(env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!) ||
      !env.NEXT_PUBLIC_FIREBASE_APP_ID!.startsWith(`1:${env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID}:web:`) ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(env.NEXT_PUBLIC_ADMIN_EMAIL!) ||
      env.NEXT_PUBLIC_E2E_TEST_MODE || env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST) {
    throw new Error("STAGING_CONFIG_INVALID");
  }
}

export function resolveServerProject(env: FirebaseEnvironment): string {
  assertStagingConfig(env);
  const ids = [env.GCLOUD_PROJECT, env.GOOGLE_CLOUD_PROJECT, env.NEXT_PUBLIC_FIREBASE_PROJECT_ID].filter(Boolean);
  if (!ids.length || ids.some(id => id !== ids[0])) throw new Error("FIREBASE_SERVER_PROJECT_MISSING_OR_MISMATCHED");
  const project = ids[0]!;
  const hosts = [env.FIRESTORE_EMULATOR_HOST, env.FIREBASE_AUTH_EMULATOR_HOST, env.FIREBASE_STORAGE_EMULATOR_HOST];
  if (project === STAGING_PROJECT_ID &&
      (hosts.some(Boolean) || env.FIREBASE_CLIENT_EMAIL || env.FIREBASE_PRIVATE_KEY || env.GOOGLE_APPLICATION_CREDENTIALS ||
       env.FIREBASE_SERVICE_ACCOUNT_KEY || env.FIREBASE_SERVICE_ACCOUNT_JSON || env.STORAGE_EMULATOR_HOST)) {
    throw new Error("STAGING_SERVER_REQUIRES_RUNTIME_ADC_NO_EMULATORS");
  }
  if (hosts.some(Boolean) && (!project.startsWith("demo-") ||
      hosts.filter(Boolean).some(host => !/^(127\.0\.0\.1|localhost):[0-9]+$/.test(host!)))) {
    throw new Error("FIREBASE_EMULATORS_REQUIRE_LOCAL_DEMO_PROJECT");
  }
  if (env.FIREBASE_CONFIG) {
    let config: { projectId?: string; storageBucket?: string };
    try { config = JSON.parse(env.FIREBASE_CONFIG); } catch { throw new Error("FIREBASE_SERVER_CONFIG_INVALID"); }
    if (!config || config.projectId !== project ||
        (project === STAGING_PROJECT_ID && config.storageBucket && config.storageBucket !== env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET)) {
      throw new Error("FIREBASE_SERVER_CONFIG_PROJECT_MISMATCH");
    }
  }
  if (Boolean(env.FIREBASE_CLIENT_EMAIL) !== Boolean(env.FIREBASE_PRIVATE_KEY)) {
    throw new Error("FIREBASE_SERVER_CREDENTIALS_INCOMPLETE");
  }
  return project;
}
