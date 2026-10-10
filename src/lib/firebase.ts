import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, connectFirestoreEmulator, Firestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAuth, connectAuthEmulator, Auth } from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyDummyKeyForStandaloneFallback123456",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "negocio-facil-page.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "negocio-facil-page",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "negocio-facil-page.appspot.com",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "1028713210344",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:1028713210344:web:fallback",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-FALLBACK"
};

export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const db: Firestore = getFirestore(app);
export const storage = getStorage(app);
export const auth: Auth = getAuth(app);

// Guard global para prevenir doble conexión en HMR / dev
declare global {
  // eslint-disable-next-line no-var
  var __FIREBASE_AUTH_EMULATOR_CONNECTED__: boolean | undefined;
  // eslint-disable-next-line no-var
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
  if (process.env.NODE_ENV !== "production" && process.env.NEXT_PUBLIC_E2E_TEST_MODE === "1") {
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
