import './helpers/requireSafeEmulatorEnvironment';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { mkdirSync, openSync, closeSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Admin SDK suites use independent, fresh named emulator databases. This leaves
// existing default-database fixtures intact. This is NOT a Firestore Rules test:
// named databases created implicitly by the emulator have open Rules.
const suites = [
  'testCanonicalPricingEngine', 'testEndToEndPricingFlow', 'testBudgetAlertRoutingFlow',
  'testBudgetReferenceV2', 'testBudgetV2Emulator', 'testLedgerEngine3B2',
  'testProductionAuthEmulatorGuard', 'testContractV2', 'testBudgetAcceptanceV2Emulator',
  'testRuntimeGuards',
  'testFirestoreTransactionRecovery',
  'testCompactIntakeEmulator', 'testCompactIntakeStorageEmulator', 'testCreditReviewV2Emulator',
  'testProductionAdapterEmulator', 'testOperationFinancialV2Emulator',
  'testPaymentReportsThreePanelsEmulator', 'testNetRemittanceEmulator',
  'testLedgerEmulator3B2', 'testEngine3B3', 'testCommissionsEngine3B4B',
  'testSettlementsEngine3B5B', 'testE2EThreePanels3B5D', 'testFullLifecycleEmulator',
] as const;
const selected = process.argv.slice(2);
if (selected.some(name => !(suites as readonly string[]).includes(name))) throw Error('UNKNOWN_LIFECYCLE_SUITE');
const repetitions = Number(process.env.LIFECYCLE_REPETITIONS ?? '1');
if (!Number.isInteger(repetitions) || repetitions < 1 || repetitions > 10) throw Error('INVALID_LIFECYCLE_REPETITIONS');
// These historical suites target a separate default-database freeze adapter or
// retired email-based endpoints / fixed historical admin identities. Keep them selectable for diagnostics, rather
// than weakening their assertions or reopening old application writers.
const historical = new Set(['testOperationFinancialV2Emulator', 'testEngine3B3', 'testE2EThreePanels3B5D']);
const run = randomUUID(), output = resolve(process.env.LIFECYCLE_OUTPUT_DIR ?? '/tmp/cuenta-hogar-lifecycle-evidence', run);
mkdirSync(output, { recursive: true });
const results: { suite: string; iteration: number; exitCode: number | null; signal: string | null; seconds: number; log: string; databaseId: string }[] = [];
async function main() {
for (let iteration = 1; iteration <= repetitions; iteration++) {
for (const suite of selected.length ? selected : suites.filter(name => !historical.has(name))) {
  const started = Date.now(), databaseId = 'lifecycle-' + randomUUID(), log = resolve(output, suite + (repetitions > 1 ? '-run-' + iteration : '') + '.log'), file = openSync(log, 'w');
  console.log('RUN ' + suite + ' iteration=' + iteration + ' database=' + databaseId);
  const child = spawn(process.execPath, ['--import', 'tsx', '--import', './scripts/helpers/lifecycleEmulatorDatabase.ts', 'scripts/' + suite + '.ts'], {
    env: { ...process.env, GCLOUD_PROJECT: 'demo-cuenta-hogar', NEXT_PUBLIC_FIREBASE_PROJECT_ID: 'demo-cuenta-hogar', FIRESTORE_EMULATOR_HOST: '127.0.0.1:8080', FIREBASE_AUTH_EMULATOR_HOST: '127.0.0.1:9099', FIREBASE_STORAGE_EMULATOR_HOST: '127.0.0.1:9199', STORAGE_EMULATOR_HOST: 'http://127.0.0.1:9199', NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: 'demo-cuenta-hogar.appspot.com', NEXT_PUBLIC_ADMIN_EMAIL: 'lifecycle-' + randomUUID() + '@example.test', PAYMENT_REPORTS_BROWSER: '0', NET_REMITTANCE_BROWSER: '0', LIFECYCLE_DATABASE_ID: databaseId, LIFECYCLE_OUTPUT_DIR: output },
    stdio: ['ignore', file, file],
  });
  const result = await new Promise<{ code: number | null; signal: string | null }>((done, reject) => { child.once('error', reject); child.once('close', (code, signal) => done({ code, signal })); });
  closeSync(file);
  results.push({ suite, iteration, exitCode: result.code, signal: result.signal, seconds: Math.round((Date.now() - started) / 1000), log, databaseId });
  writeFileSync(resolve(output, 'suite-results.json'), JSON.stringify({ run, results, complete: false, productionWrites: 0, namedDatabasesDoNotTestFirestoreRules: true }, null, 2));
  console.log((result.code === 0 ? 'PASS ' : 'FAIL ') + suite + ' (' + results.at(-1)!.seconds + 's)');
}
}
writeFileSync(resolve(output, 'suite-results.json'), JSON.stringify({ run, results, complete: true, productionWrites: 0, namedDatabasesDoNotTestFirestoreRules: true }, null, 2));
console.log('EVIDENCE ' + output);
if (results.some(r => r.exitCode !== 0)) process.exitCode = 1;
}
void main().catch(error => { console.error(error); process.exitCode = 1; });
