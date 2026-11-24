import './helpers/requireSafeEmulatorEnvironment';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { admin } from '../src/lib/firebaseAdmin';
import { readFollowUp, writeFollowUp, followUpRef, readFollowUpSummaries } from '../src/lib/adminSolicitudFollowUpServer';
import { administrativeRecordRef } from '../src/lib/adminRecordRemovalServer';
import { FollowUpError, type FollowUpCommand } from '../src/lib/adminSolicitudFollowUp';
import { GET, POST } from '../src/app/api/admin/solicitudes/[source]/[id]/seguimiento/route';
import { readAdminRequestPage } from '../src/lib/adminSolicitudesServer';

const db = admin.firestore(), id = `followup-test-${randomUUID()}`, actor = { uid: 'followup-test-admin', email: 'admin@example.test' };
const source = 'solicitudes' as const;
const note = (revision: number, text = 'Se revisó la documentación.'): FollowUpCommand => ({ commandId: randomUUID(), expectedRevision: revision, action: 'ADD_NOTE', note: text, toState: null });
const change = (revision: number, toState: FollowUpCommand['toState']) => ({ ...note(revision), action: 'CHANGE_STATE' as const, toState });
const reject = (fn: Promise<unknown>, code: FollowUpError['code']) => assert.rejects(fn, (error: unknown) => error instanceof FollowUpError && error.code === code);
async function token(email: string) {
  let uid: string;
  try { uid = (await admin.auth().getUserByEmail(email)).uid; }
  catch { uid = (await admin.auth().createUser({ email, password: 'Password123!', emailVerified: true })).uid; }
  await admin.auth().updateUser(uid, { password: 'Password123!' });
  const response = await fetch(`http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=demo-key`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password: 'Password123!', returnSecureToken: true }) });
  assert.equal(response.status, 200); return (await response.json()).idToken as string;
}
async function main() {
  const protectedRefs = [db.collection(source).doc(id), db.collection('solicitudes_cuenta').doc(id), db.collection('presupuestos_v2').doc(`financial-${id}`)];
  const stamp = admin.firestore.Timestamp.fromDate(new Date('2026-11-01T12:34:56Z'));
  await protectedRefs[0].set({ estado: 'REQUIERE_INFO', montoCuota: 12345.67, fechaCreacion: stamp, datosPersonales: { nombreCompleto: 'Caso sintético de seguimiento', numeroDni: '00123456' }, presupuestos: [{ id: 'snapshot', producto: 'Producto sintético', cuotas: 6, valorCuota: 12345.67, contado: 0, fecha: stamp }], documentos: { dniFrente: 'https://example.test/fixture.pdf' } });
  await protectedRefs[1].set({ tipo: 'contacto_rapido', nombre: 'Otro caso con igual ID', estado: 'Pendiente', fecha: stamp, montoCuota: 0 });
  await protectedRefs[2].set({ sourceCollection: source, solicitudId: id, options: [{ pricingMode: 'CANONICAL_V1', snapshot: { costo: 100000.01, cuota: 12345.67, cuotas: 6 } }] });
  const baseline = await db.getAll(...protectedRefs);
  assert.deepEqual(await readFollowUp(db, source, id), { state: 'OPEN', revision: 0, events: [], nextBefore: null });
  assert.equal((await followUpRef(db, source, id).get()).exists, false, 'Read does not seed a state');
  const first = note(0);
  const repeated = await Promise.all(Array.from({ length: 5 }, () => writeFollowUp(db, source, id, first, actor)));
  assert.equal(repeated.filter(r => !r.replayed).length, 1);
  assert.equal((await readFollowUp(db, source, id)).revision, 1);
  const reordered = Object.fromEntries(Object.entries(first).reverse());
  assert.equal((await writeFollowUp(db, source, id, reordered, actor)).replayed, true, 'JSON property order does not change command identity');
  await reject(writeFollowUp(db, source, id, { ...first, note: 'different' }, actor), 'CONFLICT');
  await reject(writeFollowUp(db, source, id, first, { ...actor, uid: 'other' }), 'CONFLICT');
  const competing = await Promise.allSettled([writeFollowUp(db, source, id, change(1, 'REVIEWING'), actor), writeFollowUp(db, source, id, note(1, 'Nota de otra sesión'), actor)]);
  assert.equal(competing.filter(r => r.status === 'fulfilled').length, 1);
  assert.equal(competing.filter(r => r.status === 'rejected' && r.reason.code === 'CONFLICT').length, 1);
  let current = await readFollowUp(db, source, id);
  if (current.state === 'OPEN') await writeFollowUp(db, source, id, change(current.revision, 'REVIEWING'), actor);
  current = await readFollowUp(db, source, id);
  await reject(writeFollowUp(db, source, id, change(current.revision, 'OPEN'), actor), 'CONFLICT');
  await writeFollowUp(db, source, id, change(current.revision, 'WAITING'), actor);
  current = await readFollowUp(db, source, id);
  await writeFollowUp(db, source, id, change(current.revision, 'CLOSED'), actor);
  current = await readFollowUp(db, source, id);
  await writeFollowUp(db, source, id, note(current.revision, 'Se conserva una observación posterior al cierre.'), actor);
  current = await readFollowUp(db, source, id);
  await writeFollowUp(db, source, id, change(current.revision, 'REVIEWING'), actor);
  // Retry an older successful command after subsequent changes: does not roll back the head.
  const revision = (await readFollowUp(db, source, id)).revision;
  assert.deepEqual(await writeFollowUp(db, source, id, first, actor), { revision: 1, replayed: true });
  assert.equal((await readFollowUp(db, source, id)).revision, revision);
  assert.equal((await readFollowUp(db, 'solicitudes_cuenta', id)).revision, 0);
  await writeFollowUp(db, 'solicitudes_cuenta', id, note(0, 'Seguimiento independiente.'), actor);
  assert.equal((await readFollowUp(db, source, id)).revision, revision);
  await reject(writeFollowUp(db, source, `missing-${id}`, note(0), actor), 'NOT_FOUND');
  assert.equal((await db.collection(source).doc(`missing-${id}`).get()).exists, false);
  await reject(writeFollowUp(db, 'vendedores', id, note(0), actor), 'INVALID');
  await reject(writeFollowUp(db, source, '../bad', note(0), actor), 'INVALID');
  for (const extra of [{ montoCuota: 1 }, { at: 'fake' }, { actor: { uid: 'fake' } }]) await reject(writeFollowUp(db, source, id, { ...note(revision), ...extra }, actor), 'INVALID');
  const removal = administrativeRecordRef(db, { kind: 'REQUEST', source, id });
  for (const state of ['ARCHIVED', 'DELETED']) {
    await removal.set({ schemaVersion: 'ADMIN_RECORD_STATE_V1', subject: { kind: 'REQUEST', source, id }, state, revision: 1, at: new Date().toISOString(), reason: 'fixture' });
    await reject(writeFollowUp(db, source, id, note(revision), actor), 'INACTIVE');
    assert.equal((await readFollowUp(db, source, id)).revision, revision);
  }
  await removal.delete();
  for (let index = revision; index < 66; index++) await writeFollowUp(db, source, id, note(index, `Gestión sintética ${index + 1}`), actor);
  const pages = []; let before: number | undefined;
  do { const page = await readFollowUp(db, source, id, before); pages.push(...page.events); before = page.nextBefore ?? undefined; } while (before);
  assert.equal(pages.length, 66); assert.equal(new Set(pages.map(e => e.id)).size, 66);
  assert.deepEqual(pages.map(e => e.revision), Array.from({ length: 66 }, (_, i) => 66 - i));
  assert.ok(pages.every(e => e.at.endsWith('Z') && e.actor.email === actor.email && !Object.hasOwn(e, 'digest')));
  const summaries = await readFollowUpSummaries(db, source, [id]);
  assert.equal(summaries[id].revision, 66); assert.equal(summaries[id].state, 'REVIEWING');
  const wirePage = await readAdminRequestPage(db, source, null);
  const projected = wirePage.items.find(item => item.documentId === id)!;
  assert.equal(projected.followUp?.revision, 66); assert.equal(projected.cuotaCapturada, 12345.67); assert.equal(projected.dni, '00123456'); assert.equal(projected.propuestas[0].items[0].contado, 0);
  // Same key in both collections remains isolated, including numerical zero.
  assert.equal((await readAdminRequestPage(db, 'solicitudes_cuenta', null)).items.find(item => item.documentId === id)?.cuotaCapturada, 0);
  for (const cursor of [0, -1, 1.1, 100, Number.MAX_SAFE_INTEGER + 1]) await reject(readFollowUp(db, source, id, cursor), 'INVALID');
  const adminToken = await token(process.env.NEXT_PUBLIC_ADMIN_EMAIL || 'admin@example.test'), otherToken = await token(`client-${id}@example.test`);
  const context = { params: Promise.resolve({ source, id }) }, url = `http://localhost/api/admin/solicitudes/${source}/${id}/seguimiento`;
  const http = (method: string, body?: unknown, auth?: string, suffix = '') => new Request(url + suffix, { method, headers: { 'Content-Type': 'application/json', ...(auth ? { Authorization: `Bearer ${auth}` } : {}) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  assert.equal((await GET(http('GET'), context)).status, 401);
  assert.equal((await POST(http('POST', note(66), otherToken), context)).status, 403);
  assert.equal((await GET(http('GET', undefined, adminToken, '?before=1&before=2'), context)).status, 400);
  assert.equal((await POST(http('POST', { ...note(66), actor: 'forged' }, adminToken), context)).status, 400);
  assert.equal((await POST(http('POST', { ...note(66), note: 'x'.repeat(20000) }, adminToken), context)).status, 400);
  const httpCommand = note(66, 'Nota desde la API autenticada.');
  const saved = await POST(http('POST', httpCommand, adminToken), context);
  assert.equal(saved.status, 200); assert.equal((await saved.json()).revision, 67);
  assert.equal((await POST(http('POST', httpCommand, adminToken), context)).status, 200);
  assert.equal((await POST(http('POST', note(66), adminToken), context)).status, 409);
  const read = await GET(http('GET', undefined, adminToken), context);
  assert.equal(read.status, 200); assert.match(read.headers.get('cache-control')!, /no-store/);
  assert.equal((await read.json()).events[0].actor.email, process.env.NEXT_PUBLIC_ADMIN_EMAIL || 'admin@example.test');
  // Browser SDK/REST cannot read or edit the server-mediated history, even with Admin token.
  const path = followUpRef(db, source, id).path;
  const rest = `http://${process.env.FIRESTORE_EMULATOR_HOST}/v1/projects/demo-cuenta-hogar/databases/(default)/documents/${path}`;
  assert.equal((await fetch(rest, { headers: { Authorization: `Bearer ${adminToken}` } })).status, 403);
  assert.equal((await fetch(rest + '/events/forged', { method: 'PATCH', headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ fields: { note: { stringValue: 'forged' } } }) })).status, 403);
  const after = await db.getAll(...protectedRefs);
  baseline.forEach((saved, index) => { assert.ok(saved.updateTime!.isEqual(after[index].updateTime!)); assert.deepEqual(saved.data(), after[index].data()); });
  // Corrupt heads, gaps and orphan events are surfaced, never replaced by a successful empty history.
  const ref = followUpRef(db, source, id), head = (await ref.get()).data()!;
  await ref.update({ revision: 68 }); await reject(readFollowUp(db, source, id), 'CORRUPT'); await reject(writeFollowUp(db, source, id, note(68), actor), 'CORRUPT');
  await ref.set(head);
  const middle = (await ref.collection('events').where('revision', '==', 60).get()).docs[0];
  const middleData = middle.data(); await middle.ref.delete(); await reject(readFollowUp(db, source, id), 'CORRUPT'); await middle.ref.set(middleData);
  await ref.delete(); await reject(writeFollowUp(db, source, id, note(0), actor), 'CORRUPT'); await ref.set(head);
  console.log('FOLLOW_UP_EMULATOR = PASS\nATOMIC_CONCURRENCY_REPLAYS_PAGINATION_AUTHORIZATION_RULES = PASS\nORIGINAL_REQUESTS_TIMESTAMPS_SNAPSHOTS_AMOUNTS_UNCHANGED = PASS');
}
main().catch(error => { console.error(error); process.exitCode = 1; }).finally(async () => { await admin.app().delete(); });
