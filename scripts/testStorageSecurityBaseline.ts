import './helpers/requireSafeEmulatorEnvironment';
import assert from 'node:assert/strict';
import { createHash, generateKeyPairSync } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { initializeApp, deleteApp, type FirebaseApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, signInWithEmailAndPassword } from 'firebase/auth';
import { getStorage, connectStorageEmulator, ref, uploadBytes, getBytes, deleteObject } from 'firebase/storage';

async function main() {
  assert.equal(process.env.GCLOUD_PROJECT, 'demo-cuenta-hogar');
  assert.equal(process.env.FIREBASE_STORAGE_EMULATOR_HOST, '127.0.0.1:9199');
  assert.equal(process.env.FIREBASE_AUTH_EMULATOR_HOST, '127.0.0.1:9099');
  // Exact bytes also prove that no permission expression has changed.
  assert.equal(createHash('sha256').update(readFileSync('storage.rules')).digest('hex'),
    'd280ad25a0d3885fb93fe3286341839eeef1c5377010d1747d24cc2ad9b4db09');
  const { initializeApp: initializeAdmin, deleteApp: deleteAdmin, cert } = await import('firebase-admin/app');
  const { getStorage: adminStorage } = await import('firebase-admin/storage');
  const { getAuth: adminAuth } = await import('firebase-admin/auth');
  const projectId = 'demo-cuenta-hogar';
  const bucketName = `${projectId}.appspot.com`;
  // Ephemeral synthetic key stays in memory; no ADC or production credentials.
  assert.ok(!process.env.STORAGE_EMULATOR_HOST || process.env.STORAGE_EMULATOR_HOST === 'http://127.0.0.1:9199');
  const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const admin = initializeAdmin({ projectId, storageBucket: bucketName,
    credential: cert({ projectId, clientEmail: 'emulator-only@demo-cuenta-hogar.iam.gserviceaccount.com',
      privateKey: privateKey.export({ type: 'pkcs8', format: 'pem' }).toString() }) }, `storage-baseline-${Date.now()}`);
  const bucket = adminStorage(admin).bucket();
  const apps: FirebaseApp[] = [];
  const users: string[] = [];
  const p4 = 'budget-documentation-v2/budget-test-123/v1/DNI_FRONT/attachment-test-456';
  const paths = ['comprobantes/foo', 'comprobantes/foo-created', `${p4}-create`, p4, `${p4}-server`];
  const payload = new TextEncoder().encode('synthetic emulator fixture');
  const changed = new TextEncoder().encode('synthetic updated fixture');
  const save = (path: string) => bucket.file(path).save(Buffer.from(payload), { resumable: false, metadata: { contentType: 'application/pdf' } });
  async function client(role: string, email?: string) {
    const app = initializeApp({ projectId, apiKey: 'demo-key', storageBucket: bucketName }, `${role}-${Date.now()}`);
    apps.push(app);
    const auth = getAuth(app);
    connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
    const storage = getStorage(app);
    connectStorageEmulator(storage, '127.0.0.1', 9199);
    storage.maxOperationRetryTime = 5000;
    storage.maxUploadRetryTime = 5000;
    if (email) {
      const password = 'synthetic-emulator-only-password';
      const user = await adminAuth(admin).createUser({ email, password });
      users.push(user.uid);
      await signInWithEmailAndPassword(auth, email, password);
      assert.equal(auth.currentUser?.email, email);
    } else assert.equal(auth.currentUser, null);
    return storage;
  }
  async function denied(action: () => Promise<unknown>) {
    await assert.rejects(action, (error: unknown) =>
      typeof error === 'object' && error !== null && 'code' in error && error.code === 'storage/unauthorized');
  }
  try {
    await save('comprobantes/foo');
    await save(p4);
    const anonymous = await client('anonymous');
    assert.deepEqual(new Uint8Array(await getBytes(ref(anonymous, 'comprobantes/foo'))), payload);
    await denied(() => uploadBytes(ref(anonymous, 'comprobantes/foo-created'), payload));
    const authenticated = await client('non-admin', 'storage-fixture@example.test');
    assert.deepEqual(new Uint8Array(await getBytes(ref(authenticated, 'comprobantes/foo'))), payload);
    const legacy = ref(authenticated, 'comprobantes/foo-created');
    await uploadBytes(legacy, payload);
    await uploadBytes(legacy, changed);
    assert.deepEqual(new Uint8Array(await getBytes(legacy)), changed);
    await deleteObject(legacy);
    assert.equal((await bucket.file('comprobantes/foo-created').exists())[0], false);
    console.log('STORAGE_BASELINE_RULES_TEST = PASS');
    const browserAdmin = await client('admin-browser', 'jpmosqueiramo@gmail.com');
    for (const [role, storage] of [['anonymous', anonymous], ['non-admin', authenticated], ['admin-browser', browserAdmin]] as const) {
      await denied(() => getBytes(ref(storage, p4)));
      await denied(() => uploadBytes(ref(storage, `${p4}-create`), payload));
      await denied(() => uploadBytes(ref(storage, p4), changed));
      await denied(() => deleteObject(ref(storage, p4)));
      assert.equal((await bucket.file(`${p4}-create`).exists())[0], false);
      assert.deepEqual((await bucket.file(p4).download())[0], Buffer.from(payload));
      console.log(`P4_CLIENT_${role}_READ_CREATE_UPDATE_DELETE = DENY`);
    }
    console.log('P4_STORAGE_DENY_TEST = PASS');
    const serverPath = `${p4}-server`;
    await save(serverPath);
    assert.deepEqual((await bucket.file(serverPath).download())[0], Buffer.from(payload));
    await bucket.file(serverPath).delete();
    assert.equal((await bucket.file(serverPath).exists())[0], false);
    console.log('P4_ADMIN_SDK_EMULATOR_TEST = PASS');
    console.log('P4_SERVER_MEDIATED_STORAGE = PASS');
    console.log('SEMANTIC_PERMISSION_DIFF = 0');
  } finally {
    await Promise.all(paths.map(path => bucket.file(path).delete({ ignoreNotFound: true })));
    await Promise.all(apps.map(app => deleteApp(app)));
    await Promise.all(users.map(uid => adminAuth(admin).deleteUser(uid)));
    await deleteAdmin(admin);
  }
}
main().catch(error => {
  console.error(error instanceof Error ? error.message : 'STORAGE_BASELINE_TEST_FAILED');
  process.exitCode = 1;
});
