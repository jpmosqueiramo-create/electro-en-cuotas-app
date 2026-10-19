import './helpers/requireSafeEmulatorEnvironment';
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';
import { admin } from '../src/lib/firebaseAdmin';
import { ADMIN_EMAIL } from '../src/lib/adminAuth';
import * as api from '../src/app/api/admin/presupuestos-v2/[budgetId]/versions/[version]/contract/route';

// Explicit inventory independent of Rules: omissions must fail, not shrink coverage.
const roots = [
  'contractSnapshotsV2', 'contractNumbersV2', 'contractOriginsV2',
  'contractOriginEvidenceV2', 'contractNumberingV2',
  'contractInfrastructureCommandsV2', 'contractInfrastructureEventsV2',
  'contractInfrastructureFixturesV2', 'contractClientDataRequests', 'contractClientDataLimits',
];
async function main() {
  assert.equal(process.env.GCLOUD_PROJECT, 'demo-cuenta-hogar');
  assert.equal(process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID, 'demo-cuenta-hogar');
  assert.equal(process.env.FIRESTORE_EMULATOR_HOST, '127.0.0.1:8080');
  assert.equal(process.env.FIREBASE_AUTH_EMULATOR_HOST, '127.0.0.1:9099');
  assert.ok(!process.env.FIREBASE_SERVICE_ACCOUNT_KEY && !process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
  const db = admin.firestore(), run = `a2-${Date.now()}`;
  const base = 'http://127.0.0.1:8080/v1/projects/demo-cuenta-hogar/databases/(default)/documents';
  const password = 'Emulator-only-A2-123!';
  async function token(email?: string): Promise<string> {
    if (email) {
      try { const user = await admin.auth().getUserByEmail(email); await admin.auth().updateUser(user.uid, { password }); }
      catch { await admin.auth().createUser({ email, password }); }
    }
    const response = await fetch(`http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:${email ? 'signInWithPassword' : 'signUp'}?key=demo`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(email ? { email, password, returnSecureToken: true } : { returnSecureToken: true }),
    });
    assert.equal(response.status, 200, 'Auth Emulator login failed');
    const data = await response.json() as { idToken: string };
    assert.ok(data.idToken); return data.idToken;
  }
  const adminToken = await token(ADMIN_EMAIL), userToken = await token(`${run}@example.test`);
  const roles = { UNAUTHENTICATED: '', ANONYMOUS_AUTH: await token(), NON_ADMIN: userToken, ADMIN_CLIENT: adminToken };
  async function request(method: string, path: string, bearer: string, body?: unknown) {
    return fetch(`${base}${path}`, { method, headers: { 'Content-Type': 'application/json', ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  }
  let denies = 0, allows = 0;
  async function denied(response: Response, label: string) {
    assert.equal(response.status, 403, label);
    const data = await response.json() as { error: { status: string } };
    assert.equal(data.error.status, 'PERMISSION_DENIED', label); denies++;
  }
  async function allowed(response: Response, label: string) {
    assert.ok(response.ok, `${label}: ${response.status}`); allows++;
  }
  const seed = { state: 'ORIGINAL', marker: run };
  const fields = { state: { stringValue: 'MUTATED' }, marker: { stringValue: run } };
  const protectedPaths = roots.flatMap(root => [
    `${root}/${run}`, `${root}/${run}/children/existing`, `${root}/${run}/children/existing/deep/existing`,
  ]);
  const draft = `presupuestos_v2/${run}/contracts/v1`;
  protectedPaths.push(draft, ...['commands', 'events', 'requests', 'submissions'].map(part => `${draft}/${part}/existing`), `${draft}/requests/existing/deep/existing`);
  // Admin SDK is used only to seed synthetic Emulator records, never to assert Rules.
  for (const path of protectedPaths) await db.doc(path).set(seed);
  for (const [role, bearer] of Object.entries(roles)) {
    for (const path of protectedPaths) {
      const collection = path.slice(0, path.lastIndexOf('/')), missing = `${path}-missing`;
      await denied(await request('GET', `/${path}`, bearer), `${role} GET ${path}`);
      await denied(await request('GET', `/${missing}`, bearer), `${role} GET missing ${path}`);
      await denied(await request('GET', `/${collection}`, bearer), `${role} LIST ${collection}`);
      await denied(await request('GET', `/${missing}/empty`, bearer), `${role} LIST empty ${path}`);
      await denied(await request('PATCH', `/${missing}`, bearer, { fields }), `${role} CREATE ${path}`);
      await denied(await request('PATCH', `/${path}?currentDocument.exists=true`, bearer, { fields }), `${role} UPDATE state ${path}`);
      await denied(await request('DELETE', `/${path}`, bearer), `${role} DELETE ${path}`);
      await denied(await request('DELETE', `/${missing}`, bearer), `${role} DELETE missing ${path}`);
    }
    // Every protected root participates in a mixed batch. No allowed sibling may commit.
    for (const path of protectedPaths) {
      const sibling = `presupuestos_v2/${run}/versions/batch-control`;
      const name = (p: string) => `projects/demo-cuenta-hogar/databases/(default)/documents/${p}`;
      await denied(await request('POST', ':commit', bearer, { writes: [
        { update: { name: name(sibling), fields } },
        { update: { name: name(path), fields }, currentDocument: { exists: true } },
      ] }), `${role} BATCH ${path}`);
      assert.equal((await db.doc(sibling).get()).exists, false, 'Denied batch partially committed');
    }
    console.log(`${role}_PROTECTED_GET_LIST_CREATE_UPDATE_DELETE_BATCH = DENY; PATHS = ${protectedPaths.length}`);
  }
  for (const path of protectedPaths) {
    assert.deepEqual((await db.doc(path).get()).data(), seed);
    assert.equal((await db.doc(`${path}-missing`).get()).exists, false);
  }
  // Positive controls prove that Admin's real Auth Emulator token satisfies isAdmin.
  const budgetPaths = [`presupuestos_v2/${run}`, ...['versions', 'commands', 'acceptances', 'acceptanceCommands', 'documentation'].flatMap(section => [
    `presupuestos_v2/${run}/${section}/control`, `presupuestos_v2/${run}/${section}/control/deep/control`,
  ])];
  const modulePaths = [
    'productos', 'vendedores', 'solicitudes', 'solicitudes_cuenta', 'ledger_movimientos',
    'ledger_imputaciones', 'pagos_informados', 'rendiciones_efectivo',
    'ledger_comisiones_movimientos', 'liquidaciones_comision', 'snapshots_comision_operaciones',
  ].map(root => `${root}/${run}-control`);
  for (const path of [...budgetPaths, ...modulePaths]) {
    await allowed(await request('PATCH', `/${path}`, adminToken, { fields }), `Admin CREATE ${path}`);
    await allowed(await request('GET', `/${path}`, adminToken), `Admin GET ${path}`);
    await allowed(await request('GET', `/${path.slice(0, path.lastIndexOf('/'))}`, adminToken), `Admin LIST ${path}`);
    await allowed(await request('PATCH', `/${path}?currentDocument.exists=true`, adminToken, { fields: { state: { stringValue: 'UPDATED' } } }), `Admin UPDATE ${path}`);
    for (const [role, bearer] of Object.entries(roles).filter(([role]) => role !== 'ADMIN_CLIENT')) {
      await denied(await request('GET', `/${path}`, bearer), `${role} private module ${path}`);
    }
    await allowed(await request('DELETE', `/${path}`, adminToken), `Admin DELETE ${path}`);
  }
  const publicPath = `catalogo_publico/${run}`, privatePath = `catalogo_publico/${run}-private`;
  await db.doc(publicPath).set({ publicado: true }); await db.doc(privatePath).set({ publicado: false });
  for (const [role, bearer] of Object.entries(roles)) {
    await allowed(await request('GET', `/${publicPath}`, bearer), `${role} published catalog`);
    if (role !== 'ADMIN_CLIENT') await denied(await request('GET', `/${privatePath}`, bearer), `${role} unpublished catalog`);
    await denied(await request('PATCH', `/${publicPath}`, bearer, { fields }), `${role} catalog write`);
    await denied(await request('DELETE', `/${publicPath}`, bearer), `${role} catalog delete`);
  }
  // Owner-read behavior of solicitudes remains intact.
  const uid = (await admin.auth().verifyIdToken(userToken)).uid, ownerPath = `solicitudes/${run}-owner`;
  await db.doc(ownerPath).set({ clienteAuthUid: uid, clienteEmail: `${run}@example.test`, datosPersonales: { email: `${run}@example.test` } });
  await allowed(await request('GET', `/${ownerPath}`, userToken), 'Owner solicitud read');
  await denied(await request('PATCH', `/${ownerPath}`, userToken, { fields }), 'Owner solicitud write');
  const ctx = { params: Promise.resolve({ budgetId: run, version: '1' }) };
  for (const [label, bearer, status] of [['missing', '', 401], ['invalid', 'invalid-emulator-token', 401], ['non-admin', userToken, 403]] as const) {
    for (const method of ['GET', 'POST'] as const) {
      const response = await api[method](new NextRequest('http://localhost:3000/api/admin/test', { method, headers: bearer ? { Authorization: `Bearer ${bearer}` } : {} }), ctx);
      assert.equal(response.status, status, `API ${label} ${method}`);
    }
  }
  assert.equal((await api.GET(new NextRequest('http://localhost:3000/api/admin/test', { headers: { Authorization: `Bearer ${adminToken}` } }), ctx)).status, 200);
  console.log(`RULES_DENIAL_ASSERTIONS = ${denies}; LEGITIMATE_ACCESS_ASSERTIONS = ${allows}`);
  console.log('CONTRACT_FIRESTORE_SECURITY = PASS; OVERLAPPING_MATCH_BYPASSES = 0');
  console.log('BUDGET_ACCEPTANCE_P4_AND_OTHER_MODULE_PERMISSIONS = PASS; ADMIN_API_AUTHORIZATION = PASS');
}
main().catch(error => { console.error('CONTRACT_FIRESTORE_SECURITY = FAIL', error instanceof Error ? error.message : 'Unexpected failure'); process.exitCode = 1; }).finally(async () => { await admin.app().delete(); });
