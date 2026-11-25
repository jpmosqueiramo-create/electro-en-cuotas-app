import './requireSafeEmulatorEnvironment';
import { admin } from '../../src/lib/firebaseAdmin';
import { getFirestore } from 'firebase-admin/firestore';

// Test-process isolation only. Preserve the SDK namespace (FieldValue, Timestamp,
// etc.) while making existing test/route dependencies share one fresh database.
// Auth and Storage remain local emulators. Never load this helper in the app.
const databaseId = process.env.LIFECYCLE_DATABASE_ID;
if (!databaseId || !/^lifecycle-[a-z0-9-]+$/.test(databaseId)) {
  throw Error('EXPLICIT_LIFECYCLE_EMULATOR_DATABASE_REQUIRED');
}
const original = admin.firestore;
const database = getFirestore(admin.app(), databaseId);
if (process.env.LIFECYCLE_TRACE_TRANSACTIONS === '1') {
  const transact = database.runTransaction.bind(database);
  database.runTransaction = ((...args: Parameters<typeof database.runTransaction>) => {
    const caller = new Error('LIFECYCLE_TRANSACTION_CALLER').stack;
    return transact(...args).catch(error => { console.error(caller); throw error; });
  }) as typeof database.runTransaction;
}
Object.defineProperty(admin, 'firestore', {
  value: Object.assign(() => database, original), configurable: true,
});
console.log('ISOLATED_EMULATOR_DATABASE = ' + databaseId);
