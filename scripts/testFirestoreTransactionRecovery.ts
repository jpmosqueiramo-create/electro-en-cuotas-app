import assert from 'node:assert/strict';
import type { Firestore, Transaction } from 'firebase-admin/firestore';
import { runFirestoreTransaction, isFirestoreTransportError } from '../src/lib/firestoreTransaction';

const closed = () => Object.assign(new Error('3 INVALID_ARGUMENT: Transaction is invalid or closed.'), { code: 3, details: 'Transaction is invalid or closed.' });
async function main() {
  function fixture(readError: () => unknown, commitError?: unknown) {
    let starts = 0, commits = 0;
    const db = { runTransaction: async (update: (tx: Transaction) => Promise<unknown>) => {
      starts++;
      const tx = { get: async () => { const e = readError(); if (e) throw e; return { exists: true }; }, set: () => tx } as unknown as Transaction;
      const result = await update(tx); commits++; if (commitError) throw commitError; return result;
    } } as unknown as Firestore;
    return { db, counts: () => ({ starts, commits }) };
  }
  let once = true;
  const recovered = fixture(() => { if (once) { once = false; return closed(); } });
  assert.equal(await runFirestoreTransaction(recovered.db, async tx => { await tx.get({} as never); tx.set({} as never, {}); return 'credited'; }), 'credited');
  assert.deepEqual(recovered.counts(), { starts: 2, commits: 1 });

  once = true;
  const swallowed = fixture(() => { if (once) { once = false; return closed(); } });
  assert.equal(await runFirestoreTransaction(swallowed.db, async tx => { try { await tx.get({} as never); } catch { return 'stale fallback'; } return 'fresh result'; }), 'fresh result');
  assert.deepEqual(swallowed.counts(), { starts: 2, commits: 1 });

  const exhausted = fixture(closed); await assert.rejects(runFirestoreTransaction(exhausted.db, tx => tx.get({} as never)), { code: 3 });
  assert.deepEqual(exhausted.counts(), { starts: 3, commits: 0 });
  for (const error of [Object.assign(Error('Invalid query'), { code: 3 }), Object.assign(Error('Permission denied'), { code: 7 }), Object.assign(Error('Aborted'), { code: 10 })]) {
    const f = fixture(() => error); await assert.rejects(runFirestoreTransaction(f.db, tx => tx.get({} as never)), e => e === error);
    assert.deepEqual(f.counts(), { starts: 1, commits: 0 }); // ABORTED belongs to the real SDK retry policy.
  }
  for (const error of [closed(), Object.assign(Error('Response lost after commit'), { code: 14 })]) {
    const f = fixture(() => undefined, error);
    await assert.rejects(runFirestoreTransaction(f.db, async tx => { await tx.get({} as never); return 'committed'; }), e => e === error);
    assert.deepEqual(f.counts(), { starts: 1, commits: 1 });
    assert.equal(isFirestoreTransportError(error), true);
  }
  assert.equal(isFirestoreTransportError(Object.assign(Error('Invalid amount'), { code: 3 })), false);
  assert.equal(isFirestoreTransportError(Object.assign(Error('Forbidden'), { code: 7 })), false);
  console.log('CLOSED_READ_FRESH_TRANSACTION_BOUNDED_RETRY_NO_SWALLOWED_ERROR_NO_COMMIT_REPLAY_NO_PERMISSION_RETRY = PASS');
}
void main().catch(error => { console.error(error); process.exitCode = 1; });
