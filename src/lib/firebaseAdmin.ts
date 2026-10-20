// Explicit project selection; missing/mixed configuration must never select production.
import admin from "firebase-admin";
import { resolveServerProject } from "./firebaseEnvironment";

const projectId = resolveServerProject(process.env);
const existing = admin.apps.find(app => app?.name === "[DEFAULT]");
if (existing && existing.options.projectId !== projectId) {
  throw new Error("FIREBASE_ADMIN_EXISTING_APP_PROJECT_MISMATCH");
}
if (!existing) {
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;
  admin.initializeApp({
    projectId,
    ...(clientEmail && privateKey ? {
      credential: admin.credential.cert({ projectId, clientEmail, privateKey: privateKey.replace(/\\n/g, "\n") })
    } : {}) // Runtime ADC in App Hosting. No credentials or errors are logged.
  });
}
export { admin };
