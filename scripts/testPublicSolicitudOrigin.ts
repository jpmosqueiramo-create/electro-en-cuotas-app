import './helpers/requireSafeEmulatorEnvironment';
import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { admin } from '../src/lib/firebaseAdmin';
import { POST } from '../src/app/api/public/solicitudes/route';
import { PUBLIC_SOLICITUDES_ORIGINS, isPublicSolicitudOriginAllowed } from '../src/lib/publicSolicitudOrigin';
import { CONTACT_LIMIT_COLLECTION, contactLimitId } from '../src/lib/publicSolicitudRateLimit';

async function run() {
  const db = admin.firestore(), key = randomBytes(32).toString('hex');
  process.env.PUBLIC_SOLICITUDES_RATE_LIMIT_ENABLED = 'true';
  process.env.PUBLIC_SOLICITUDES_HMAC_KEY = key;
  const contact = `000${Date.now()}`, prefix = `origin-${randomUUID()}`;
  const payload = { tipo: 'contacto_rapido', nombreCompleto: prefix, whatsapp: contact,
    localidad: 'Ciudad ficticia', productoNombre: 'Producto sintético' };
  // Deliberately differs from the allowed public origins, as behind a reverse proxy.
  const internalUrl = 'http://0.0.0.0:8080/api/public/solicitudes';
  const id = randomUUID();
  const request = (origin: string | null, submissionId = id) => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json',
      Host: 'attacker.invalid', 'X-Forwarded-Host': 'attacker.invalid' };
    if (origin !== null) headers.Origin = origin;
    return new Request(internalUrl, { method: 'POST', headers, body: JSON.stringify({ submissionId, payload }) });
  };
  for (const origin of PUBLIC_SOLICITUDES_ORIGINS) assert.equal(isPublicSolicitudOriginAllowed(origin, 'production'), true);
  const denied = ['https://external.invalid', 'https://www.cuentahogar.com.ar.evil.invalid',
    'https://cuentahogar.com.ar', 'https://www-cuentahogar.com.ar', 'http://www.cuentahogar.com.ar',
    'https://www.cuentahogar.com.ar:444', 'https://www.cuentahogar.com.ar:443',
    'https://www.cuentahogar.com.ar/', 'https://www.cuentahogar.com.ar@evil.invalid',
    'https://www.cuentahogar.com.ar,https://external.invalid', 'null', '', 'http://localhost:3000'];
  for (const origin of denied) {
    assert.equal(isPublicSolicitudOriginAllowed(origin, 'production'), false);
    // Even forged Host headers matching a trusted domain cannot authorize an external origin.
    const req = request(origin); req.headers.set('Host', 'www.cuentahogar.com.ar');
    req.headers.set('X-Forwarded-Host', 'www.cuentahogar.com.ar');
    assert.equal((await POST(req)).status, 403, origin);
  }
  assert.equal((await db.collection('solicitudes_cuenta').doc(`web_${id}`).get()).exists, false);
  assert.equal(isPublicSolicitudOriginAllowed('http://localhost:3000', 'development'), true);
  assert.equal(isPublicSolicitudOriginAllowed('http://localhost:3001', 'development'), false);
  assert.equal(isPublicSolicitudOriginAllowed(null, 'production'), true);
  const first = await POST(request(PUBLIC_SOLICITUDES_ORIGINS[0]));
  assert.equal(first.status, 200); assert.equal((await first.json()).persisted, true);
  // Replays through either legitimate entry point or a non-browser client use no extra quota.
  for (const origin of [PUBLIC_SOLICITUDES_ORIGINS[1], null]) {
    const replay = await POST(request(origin)); assert.equal(replay.status, 200);
    assert.equal((await replay.json()).replay, true);
  }
  assert.equal((await POST(request(PUBLIC_SOLICITUDES_ORIGINS[1], randomUUID()))).status, 200);
  assert.equal((await POST(request(null, randomUUID()))).status, 200);
  const rejectedId = randomUUID(), fourth = await POST(request(PUBLIC_SOLICITUDES_ORIGINS[0], rejectedId));
  assert.equal(fourth.status, 429); assert.ok(Number(fourth.headers.get('Retry-After')) > 0);
  assert.equal((await db.collection('solicitudes_cuenta').doc(`web_${rejectedId}`).get()).exists, false);
  assert.equal((await db.collection('solicitudes_cuenta').where('nombreCompleto', '==', prefix).get()).size, 3);
  const counter = await db.collection(CONTACT_LIMIT_COLLECTION).doc(contactLimitId(contact, Buffer.from(key, 'hex'))).get();
  assert.equal(counter.data()?.count, 3);
  const replayAtLimit = await POST(request(PUBLIC_SOLICITUDES_ORIGINS[0]));
  assert.equal(replayAtLimit.status, 200); assert.equal((await replayAtLimit.json()).replay, true);
  assert.equal((await counter.ref.get()).data()?.count, 3);
  console.log('PUBLIC_SOLICITUD_ORIGIN = PASS; EXACT_ALLOWLIST = PASS; INTERNAL_URL = PASS; ABSENT_ORIGIN = PASS; PERSISTENCE = PASS; QUOTA_3 = PASS; FOURTH_429 = PASS; REPLAY = PASS; PRODUCTION_WRITES = 0');
}
run().catch(error => { console.error(error); process.exitCode = 1; })
  .finally(async () => { await Promise.all(admin.apps.map(app => app?.delete())); });
