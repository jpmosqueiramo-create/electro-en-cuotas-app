import './requireSafeEmulatorEnvironment';
import { admin } from '../../src/lib/firebaseAdmin';
import { getFirestore, type Transaction, type ReadWriteTransactionOptions, type ReadOnlyTransactionOptions } from 'firebase-admin/firestore';

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
  database.runTransaction = async function<T>(update: (tx: Transaction) => Promise<T>, options?: ReadWriteTransactionOptions | ReadOnlyTransactionOptions) {
    const caller = new Error('LIFECYCLE_TRANSACTION_CALLER').stack;
    let attempt = 0;
    return transact(async tx => {
      const currentAttempt = ++attempt;
      let read = 0;
      const observed = new Proxy(tx, { get(target, key) {
        const value = Reflect.get(target, key);
        if (key === 'get' || key === 'getAll') return (...args: unknown[]) => {
          const index = ++read, source = new Error('LIFECYCLE_READ_CALLER').stack;
          return (Reflect.apply(value, target, args) as Promise<unknown>).catch((error: {code?:number}) => {
            if (error.code === 3 || error.code === 10) console.error(JSON.stringify({event:'LIFECYCLE_TX_READ_FAILURE',attempt:currentAttempt,read:index,code:error.code,source}));
            throw error;
          });
        };
        return typeof value === 'function' ? value.bind(target) : value;
      } });
      return update(observed);
    }, options).catch(error => { console.error(caller); throw error; });
  };
}
Object.defineProperty(admin, 'firestore', {
  value: Object.assign(() => database, original), configurable: true,
});
console.log('ISOLATED_EMULATOR_DATABASE = ' + databaseId);
