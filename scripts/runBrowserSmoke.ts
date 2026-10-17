import "./helpers/requireSafeEmulatorEnvironment";
import { spawn, type ChildProcess } from "node:child_process";
import { createServer } from "node:net";
import { resolveChrome } from "./helpers/resolveChrome";

async function main() {
  const chrome = resolveChrome();
  // Never reuse an unknown server which could be connected to production.
  await new Promise<void>((resolve, reject) => {
    const probe = createServer();
    probe.once("error", reject);
    probe.listen(3000, "localhost", () => probe.close(() => resolve()));
  });
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    NODE_ENV: "development",
    CHROME_BIN: chrome,
    GCLOUD_PROJECT: "demo-cuenta-hogar",
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: "demo-cuenta-hogar",
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: "demo-cuenta-hogar.firebaseapp.com",
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: "demo-cuenta-hogar.appspot.com",
    NEXT_PUBLIC_FIREBASE_API_KEY: "demo-key",
    NEXT_PUBLIC_FIREBASE_APP_ID: "demo-app",
    NEXT_PUBLIC_E2E_TEST_MODE: "1",
    NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST: "127.0.0.1:9099",
    FIRESTORE_EMULATOR_HOST: "127.0.0.1:8080",
    FIREBASE_AUTH_EMULATOR_HOST: "127.0.0.1:9099",
  };
  if (process.env.GCLOUD_PROJECT !== env.GCLOUD_PROJECT ||
      process.env.FIRESTORE_EMULATOR_HOST !== env.FIRESTORE_EMULATOR_HOST ||
      process.env.FIREBASE_AUTH_EMULATOR_HOST !== env.FIREBASE_AUTH_EMULATOR_HOST) {
    throw new Error("REFUSED_UNSAFE_FIREBASE_TEST_ENVIRONMENT: smoke requires demo-cuenta-hogar and ports 8080/9099");
  }
  const next = spawn(process.execPath, ["node_modules/next/dist/bin/next", "dev", "--hostname", "localhost", "--port", "3000"], { env, stdio: "inherit" });
  let smokeProcess: ChildProcess | undefined;
  let launchError: Error | undefined;
  next.once("error", error => { launchError = error; });
  const stop = () => { smokeProcess?.kill("SIGTERM"); next.kill("SIGTERM"); };
  process.once("SIGINT", stop);
  process.once("SIGTERM", stop);
  try {
    let ready = false;
    for (let i = 0; i < 120; i++) {
      if (launchError) throw launchError;
      if (next.exitCode !== null) throw new Error("NEXT_DEV_EXITED_BEFORE_READY");
      try {
        const response = await fetch("http://localhost:3000/login", { signal: AbortSignal.timeout(3000) });
        if (response.ok) { ready = true; break; }
      } catch { /* Wait for our Next process. */ }
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    if (!ready) throw new Error("NEXT_DEV_NOT_READY");
    const smoke = spawn(process.execPath, ["--import", "tsx", "scripts/runMobileBrowserSmokeTest.ts"], { env, stdio: "inherit" });
    smokeProcess = smoke;
    process.exitCode = await new Promise<number>(resolve => {
      smoke.once("error", () => resolve(1));
      smoke.once("exit", code => resolve(code ?? 1));
    });
  } finally {
    stop();
    await new Promise<void>(resolve => {
      if (!next.pid || next.exitCode !== null || next.signalCode !== null) resolve();
      else next.once("close", () => resolve());
    });
    process.removeListener("SIGINT", stop);
    process.removeListener("SIGTERM", stop);
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
