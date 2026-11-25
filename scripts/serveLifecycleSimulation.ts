import './helpers/requireSafeEmulatorEnvironment';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

/** Read-only browser review of a completed synthetic run, using real route exports. */
async function main() {
  const file = resolve(process.argv[2] ?? '');
  const evidence = JSON.parse(readFileSync(file, 'utf8'));
  assert.equal(evidence.status, 'PASS');
  assert.match(evidence.databaseId, /^lifecycle-[a-z0-9-]+$/);
  assert.match(evidence.adminEmail, /^lifecycle-.*@example\.test$/);
  assert.equal(evidence.cases.length, 2);
  process.env.LIFECYCLE_DATABASE_ID = evidence.databaseId;
  process.env.NEXT_PUBLIC_ADMIN_EMAIL = evidence.adminEmail;
  await import('./helpers/lifecycleEmulatorDatabase');
  const { admin } = await import('../src/lib/firebaseAdmin');
  const { approvedFinalPackages } = await import('../src/lib/productionV2/catalog');
  const { productionRuntimeForEmulator } = await import('../src/lib/productionV2/runtime');
  const { startProductionBrowserServer } = await import('./helpers/productionAdapterBrowserServer');
  const db = admin.firestore(), actor = await admin.auth().getUserByEmail(evidence.adminEmail);
  const runtime = productionRuntimeForEmulator(db, admin.auth(), [approvedFinalPackages[0]], [actor.uid]);
  const server = await startProductionBrowserServer(runtime);
  console.log('LIFECYCLE_BROWSER_READY http://localhost:3000');
  await new Promise<void>(done => { process.once('SIGINT', done); process.once('SIGTERM', done); });
  await server.stop();
  writeFileSync(file.replace(/\.json$/, '-browser-calls.json'), JSON.stringify(server.calls, null, 2));
  await admin.app().delete();
}
void main().catch(error => { console.error(error); process.exitCode = 1; });
