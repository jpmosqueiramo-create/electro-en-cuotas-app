import { assertStagingConfig } from "./firebaseEnvironment";
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, connectFirestoreEmulator, Firestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAuth, connectAuthEmulator, Auth } from "firebase/auth";

export function validateFirebaseConfig(env: Record<string, string | undefined>): { ok: boolean; error?: string } {
  try { assertStagingConfig(env); } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "STAGING_CONFIG_INVALID" };
  }
  const isProd = env.NODE_ENV === "production";
  const apiKey = env.NEXT_PUBLIC_FIREBASE_API_KEY;
  const projectId = env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const appId = env.NEXT_PUBLIC_FIREBASE_APP_ID;

  if (isProd) {
    if (!apiKey || !projectId || !appId) {
      return {
        ok: false,
        error: "Configuración de Firebase en producción incompleta: NEXT_PUBLIC_FIREBASE_API_KEY, NEXT_PUBLIC_FIREBASE_PROJECT_ID y NEXT_PUBLIC_FIREBASE_APP_ID son obligatorias."
      };
    }
    if (
      apiKey.includes("Dummy") ||
      apiKey.includes("fallback") ||
      projectId.includes("demo-") ||
      projectId.includes("fallback") ||
      appId.includes("dummy") ||
      appId.includes("fallback")
    ) {
      return {
        ok: false,
        error: "Configuración de Firebase en producción inválida: se detectaron credenciales dummy/fallback no permitidas en entorno productivo."
      };
    }
  }
  return { ok: true };
}

const validation = validateFirebaseConfig({
  NODE_ENV: process.env.NODE_ENV,
  NEXT_PUBLIC_APP_ENV: process.env.NEXT_PUBLIC_APP_ENV,
  NEXT_PUBLIC_ADMIN_EMAIL: process.env.NEXT_PUBLIC_ADMIN_EMAIL,
  NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  NEXT_PUBLIC_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  NEXT_PUBLIC_E2E_TEST_MODE: process.env.NEXT_PUBLIC_E2E_TEST_MODE,
  NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST: process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST
});
if (!validation.ok) {
  throw new Error(validation.error);
}

const isProduction = process.env.NODE_ENV === "production";
const isE2ETest = isProduction
  ? false
  : process.env.NEXT_PUBLIC_E2E_TEST_MODE === "1";

let apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
let projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
let appId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID;
let authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
let storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
const messagingSenderId = process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID;
const measurementId = process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID;

if (!isProduction) {
  // Entorno de Desarrollo / Test / E2E Emulator Fallback explícito
  apiKey = apiKey || "AIzaSyDummyKeyForStandaloneFallback123456";
  projectId = projectId || "demo-cuenta-hogar";
  appId = appId || "1:1028713210344:web:e2e-dummy";
  authDomain = authDomain || `${projectId}.firebaseapp.com`;
  storageBucket = storageBucket || `${projectId}.appspot.com`;
}

const firebaseConfig = {
  apiKey: apiKey!,
  authDomain: authDomain || `${projectId}.firebaseapp.com`,
  projectId: projectId!,
  storageBucket: storageBucket || `${projectId}.appspot.com`,
  messagingSenderId: messagingSenderId || "1028713210344",
  appId: appId!,
  ...(measurementId ? { measurementId } : {})
};

if (getApps().length && getApp().options.projectId !== firebaseConfig.projectId) {
  throw new Error("FIREBASE_CLIENT_EXISTING_APP_PROJECT_MISMATCH");
}
export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const db: Firestore = getFirestore(app);
export const storage = getStorage(app);
export const auth: Auth = getAuth(app);

// Guard global para prevenir doble conexión en HMR / dev
declare global {
  var __FIREBASE_AUTH_EMULATOR_CONNECTED__: boolean | undefined;
  var __FIREBASE_FIRESTORE_EMULATOR_CONNECTED__: boolean | undefined;
}

export function connectAuthEmulatorIfE2E(authTarget: Auth = auth): boolean {
  // 1. REGLA INVIOLABLE: Jamás conectar en producción
  if (process.env.NODE_ENV === "production") {
    return false;
  }

  // 2. Requiere bandera E2E explícita y host definido
  if (
    process.env.NEXT_PUBLIC_E2E_TEST_MODE === "1" &&
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST &&
    !globalThis.__FIREBASE_AUTH_EMULATOR_CONNECTED__
  ) {
    const rawHost = process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST.trim();
    if (!rawHost) return false;
    const url = rawHost.startsWith("http://") || rawHost.startsWith("https://")
      ? rawHost
      : `http://${rawHost}`;
    try {
      connectAuthEmulator(authTarget, url, { disableWarnings: true });
      globalThis.__FIREBASE_AUTH_EMULATOR_CONNECTED__ = true;
      return true;
    } catch {
      globalThis.__FIREBASE_AUTH_EMULATOR_CONNECTED__ = true;
      return false;
    }
  }
  return false;
}

export function connectFirestoreEmulatorIfE2E(dbTarget: Firestore = db): boolean {
  if (process.env.NODE_ENV === "production") {
    return false;
  }

  if (
    process.env.NEXT_PUBLIC_E2E_TEST_MODE === "1" &&
    !globalThis.__FIREBASE_FIRESTORE_EMULATOR_CONNECTED__
  ) {
    try {
      connectFirestoreEmulator(dbTarget, "127.0.0.1", 8080);
      globalThis.__FIREBASE_FIRESTORE_EMULATOR_CONNECTED__ = true;
      return true;
    } catch {
      globalThis.__FIREBASE_FIRESTORE_EMULATOR_CONNECTED__ = true;
      return false;
    }
  }
  return false;
}

if (typeof window !== "undefined") {
  connectAuthEmulatorIfE2E(auth);
  connectFirestoreEmulatorIfE2E(db);
  if (!isProduction && isE2ETest) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).__FIREBASE_AUTH__ = auth;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).__FIREBASE_SIGN_IN__ = (email: string, pass: string) => {
      return import("firebase/auth").then(({ signInWithEmailAndPassword }) =>
        signInWithEmailAndPassword(auth, email, pass)
      );
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).__FIREBASE_SIGN_OUT__ = () => {
      return import("firebase/auth").then(({ signOut }) => signOut(auth));
    };
  }
}
