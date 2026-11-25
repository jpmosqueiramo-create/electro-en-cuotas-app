import type { Firestore, Transaction, ReadWriteTransactionOptions, ReadOnlyTransactionOptions } from 'firebase-admin/firestore';
import { setTimeout as delay } from 'node:timers/promises';

function closedTransaction(error: unknown) {
  if (!error || typeof error !== 'object') return false;
  const e = error as { code?: unknown; details?: unknown; message?: unknown };
  return e.code === 3 && [e.details, e.message].some(text => typeof text === 'string' && /^(?:3 INVALID_ARGUMENT: )?Transaction is invalid or closed\.?$/i.test(text));
}
class ClosedTransactionRead extends Error {
  constructor(readonly original: unknown) { super('Closed Firestore transaction during a read', { cause: original }); }
}

/** A closed READ cannot have committed. Restart with a fresh transaction ID;
 * leave normal contention retries to the SDK and never replay an uncertain commit.
 * No external effects belong inside update, just as with Firestore.runTransaction.
 */
export async function runFirestoreTransaction<T>(db: Firestore, update: (tx: Transaction) => Promise<T>, options?: ReadWriteTransactionOptions | ReadOnlyTransactionOptions): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await db.runTransaction(async tx => {
        let readFailure: { error: unknown } | undefined;
        const checked = new Proxy(tx, { get(target, key) {
          const value = Reflect.get(target, key);
          if (key === 'get' || key === 'getAll') return (...args: unknown[]) => {
            if (readFailure) return Promise.reject(readFailure.error);
            return (Reflect.apply(value, target, args) as Promise<unknown>).catch((error: unknown) => {
              readFailure ??= { error: closedTransaction(error) ? new ClosedTransactionRead(error) : error };
              throw readFailure.error;
            });
          };
          return typeof value === 'function' ? value.bind(target) : value;
        } });
        // An optional permission preview must not swallow a failed DB read and
        // continue on a transaction the server has already closed.
        try { const result = await update(checked); if (readFailure) throw readFailure.error; return result; }
        catch (error) { throw readFailure ? readFailure.error : error; }
      }, options);
    } catch (error) {
      if (!(error instanceof ClosedTransactionRead)) throw error;
      if (attempt >= 2) throw error.original;
      await delay(25 * 2 ** attempt + Math.floor(Math.random() * 25));
    }
  }
}

/** Transport errors are uncertain, not authorization denials. Preserve the
 * original command in the UI so a retry resolves its durable idempotent receipt.
 */
export function isFirestoreTransportError(error: unknown) {
  if (!error || typeof error !== 'object') return false;
  const code = (error as { code?: unknown }).code;
  return closedTransaction(error) || typeof code === 'number' && [1, 2, 4, 8, 10, 13, 14].includes(code);
}
