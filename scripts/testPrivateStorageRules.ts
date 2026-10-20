import './helpers/requireSafeEmulatorEnvironment';
import assert from 'node:assert/strict';
import { generateKeyPairSync, randomBytes } from 'node:crypto';
import { initializeApp, deleteApp, type FirebaseApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, signInWithEmailAndPassword } from 'firebase/auth';
import { getStorage, connectStorageEmulator, ref, uploadBytes, getBytes, deleteObject, listAll } from 'firebase/storage';

async function main() {
  assert.equal(process.env.GCLOUD_PROJECT, 'demo-cuenta-hogar');
  assert.equal(process.env.FIREBASE_STORAGE_EMULATOR_HOST, '127.0.0.1:9199');
  assert.equal(process.env.FIREBASE_AUTH_EMULATOR_HOST, '127.0.0.1:9099');
  const { initializeApp: initializeAdmin, deleteApp: deleteAdmin, cert } = await import('firebase-admin/app');
  const { getStorage: adminStorage } = await import('firebase-admin/storage');
  const { getAuth: adminAuth } = await import('firebase-admin/auth');
  const projectId = 'demo-cuenta-hogar', bucketName = `${projectId}.appspot.com`;
  const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const server = initializeAdmin({ projectId, storageBucket: bucketName, credential: cert({
    projectId, clientEmail: 'emulator-only@demo-cuenta-hogar.iam.gserviceaccount.com',
    privateKey: privateKey.export({ type: 'pkcs8', format: 'pem' }).toString()
  }) }, `private-rules-${Date.now()}`);
  const bucket = adminStorage(server).bucket(), apps: FirebaseApp[] = [], users: string[] = [];
  const bytes = new TextEncoder().encode('Synthetic private document, no personal information');
  let denies = 0;
  async function client(role: string, email?: string) {
    const app = initializeApp({ projectId, apiKey: 'demo-key', storageBucket: bucketName }, `${role}-${Date.now()}`);
    apps.push(app);
    const auth = getAuth(app); connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
    if (email) {
      const password = randomBytes(24).toString('hex');
      try {
        const existing = await adminAuth(server).getUserByEmail(email);
        await adminAuth(server).updateUser(existing.uid, { password });
      } catch (error) {
        if (!(typeof error === 'object' && error !== null && 'code' in error && error.code === 'auth/user-not-found')) throw error;
        const user = await adminAuth(server).createUser({ email, password }); users.push(user.uid);
      }
      await signInWithEmailAndPassword(auth, email, password);
    }
    const storage = getStorage(app); connectStorageEmulator(storage, '127.0.0.1', 9199);
    storage.maxUploadRetryTime = 1000; storage.maxOperationRetryTime = 1000;
    return storage;
  }
  async function denied(action: () => Promise<unknown>) {
    await assert.rejects(action, (error: unknown) => typeof error === 'object' && error !== null && 'code' in error && error.code === 'storage/unauthorized');
    denies++;
  }
  const paths = ['comprobantes/synthetic', 'comprobantes/afiliados/synthetic/file',
    'comprobantes/cuenta_solicitudes/synthetic', 'budget-documentation-v2/synthetic/v1/DNI_FRONT/file',
    'contract-documents-v2/synthetic/set/mandate.pdf', 'unknown-private/synthetic'];
  try {
    const anonymous = await client('anonymous'), customer = await client('customer', 'customer-private@example.invalid'),
      administrator = await client('admin', 'jpmosqueiramo@gmail.com');
    for (const path of paths) {
      await bucket.file(path).save(Buffer.from(bytes), { resumable: false, metadata: { contentType: 'application/pdf' } });
      assert.equal((await bucket.file(path).download())[0].toString(), Buffer.from(bytes).toString());
      for (const storage of [anonymous, customer, administrator]) {
        const target = ref(storage, path);
        await denied(() => getBytes(target));
        await denied(() => uploadBytes(target, bytes, { contentType: 'application/pdf' }));
        await denied(() => uploadBytes(ref(storage, path + '-new'), bytes, { contentType: 'application/pdf' }));
        await denied(() => deleteObject(target));
        await denied(() => listAll(ref(storage, path.split('/')[0])));
      }
    }
    const image = ref(administrator, 'productos/synthetic.jpg');
    await uploadBytes(image, bytes, { contentType: 'image/jpeg' });
    assert.equal((await getBytes(ref(anonymous, 'productos/synthetic.jpg'))).byteLength, bytes.length);
    await denied(() => uploadBytes(ref(customer, 'productos/no.jpg'), bytes, { contentType: 'image/jpeg' }));
    await denied(() => uploadBytes(ref(administrator, 'productos/no.pdf'), bytes, { contentType: 'application/pdf' }));
    await denied(() => uploadBytes(ref(administrator, 'productos/large.jpg'), new Uint8Array(10 * 1024 * 1024 + 1), { contentType: 'image/jpeg' }));
    await deleteObject(image);
    console.log(`PRIVATE_STORAGE_RULES = PASS; DENIALS = ${denies}; ADMIN_SERVER_ACCESS = PASS; PUBLIC_CATALOG_IMAGES = PASS`);
  } finally {
    for (const path of paths) await bucket.file(path).delete({ ignoreNotFound: true });
    for (const uid of users) await adminAuth(server).deleteUser(uid);
    await Promise.all(apps.map(deleteApp)); await deleteAdmin(server);
  }
}
main().catch(error => { console.error('PRIVATE_STORAGE_RULES = FAIL', error instanceof Error ? error.message : 'unknown'); process.exitCode = 1; });
