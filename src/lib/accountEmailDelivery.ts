import type { Firestore } from 'firebase-admin/firestore';
import { admin } from './firebaseAdmin';
import { runtimeData, runtimeForDatabase } from './productionV2/runtime';

/** Firebase delivers the email; never return or persist its OOB credential. */
export async function deliverAccountEmail(db: Firestore, email: string, continueUrl: string) {
 const { test } = runtimeData(runtimeForDatabase(db, admin.auth()));
 const apiKey = test ? 'emulator-only' : process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
 if (!apiKey) throw Error('Configuración de correo de Firebase incompleta.');
 const host = test ? 'http://127.0.0.1:9099/identitytoolkit.googleapis.com' : 'https://identitytoolkit.googleapis.com';
 const response = await fetch(`${host}/v1/accounts:sendOobCode?key=${encodeURIComponent(apiKey)}`, {
  method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Firebase-Locale': 'es' },
  body: JSON.stringify({ requestType: 'EMAIL_SIGNIN', email, continueUrl, canHandleCodeInApp: true }),
  signal: AbortSignal.timeout(15000),
 });
 if (!response.ok) throw Error('Firebase no confirmó el envío. Revisá que Email link esté habilitado y el dominio autorizado.');
}
