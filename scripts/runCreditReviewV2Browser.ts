import "./helpers/requireSafeEmulatorEnvironment";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { testCreditReviewBrowser } from './testCreditReviewV2Browser';
import { admin } from "../src/lib/firebaseAdmin";

async function main() {
  if (process.env.FIREBASE_STORAGE_EMULATOR_HOST !== "127.0.0.1:9199") throw new Error("STORAGE_EMULATOR_REQUIRED");
  if (process.env.GCLOUD_PROJECT !== "demo-cuenta-hogar" || process.env.FIRESTORE_EMULATOR_HOST !== "127.0.0.1:8080" || process.env.FIREBASE_AUTH_EMULATOR_HOST !== "127.0.0.1:9099") throw new Error("REFUSED_UNSAFE_FIREBASE_TEST_ENVIRONMENT");
  await new Promise<void>((resolve, reject) => {
    const probe = createServer(); probe.once("error", reject); probe.listen(3000, "localhost", () => probe.close(() => resolve()));
  });
  const env: NodeJS.ProcessEnv = { ...process.env, NODE_ENV: "development", GCLOUD_PROJECT: "demo-cuenta-hogar", NEXT_PUBLIC_FIREBASE_PROJECT_ID: "demo-cuenta-hogar", NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: "demo-cuenta-hogar.firebaseapp.com", NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: "demo-cuenta-hogar.appspot.com", NEXT_PUBLIC_FIREBASE_API_KEY: "demo-key", NEXT_PUBLIC_FIREBASE_APP_ID: "demo-app", NEXT_PUBLIC_E2E_TEST_MODE: "1", NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST: "127.0.0.1:9099" };
  const server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "dev", "--hostname", "localhost", "--port", "3000"], { env, stdio: "inherit" });
  const stop = () => { server.kill("SIGTERM"); };
  process.once("SIGINT", stop); process.once("SIGTERM", stop);
  try {
    let ready = false;
    for (let i = 0; i < 120; i++) {
      if (server.exitCode !== null) throw new Error("NEXT_DEV_EXITED");
      try { if ((await fetch("http://localhost:3000/login", { signal: AbortSignal.timeout(3000) })).ok) { ready = true; break; } } catch { /* Wait for this server. */ }
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    if (!ready) throw new Error("NEXT_DEV_NOT_READY");
    await testCreditReviewBrowser();
  } finally {
    stop();
    await new Promise<void>(resolve => { if (server.exitCode !== null || server.signalCode !== null) resolve(); else server.once("close", () => resolve()); });
    process.removeListener("SIGINT", stop); process.removeListener("SIGTERM", stop);
    await admin.app().delete();
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
