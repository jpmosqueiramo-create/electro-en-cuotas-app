import './helpers/requireSafeEmulatorEnvironment';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, signInWithCustomToken, signOut } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator, terminate } from 'firebase/firestore';
import { admin } from '../src/lib/firebaseAdmin';
import { prepareCatalogCreate, saveCatalogCreate, CatalogCreateConflict } from '../src/lib/catalogReferenceCreate';
import { buildCatalogReferencePrivatePatch, createCatalogReferenceDraft } from '../src/lib/catalogReferenceEditor';
import { publishCatalogReference, previewCatalogReferencePublication } from '../src/lib/catalogPublicationService';
import { sensitiveCatalogPaths } from './helpers/catalogReferenceC2Fixtures';

async function main() {
  const app = initializeApp({ projectId: 'demo-cuenta-hogar', apiKey: 'demo-key', authDomain: 'demo-cuenta-hogar.firebaseapp.com' }, 'quick-' + randomUUID());
  const auth = getAuth(app), db = getFirestore(app), server = admin.firestore();
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true }); connectFirestoreEmulator(db, '127.0.0.1', 8080);
  try {
    const email = 'jpmosqueiramo@gmail.com';
    const actor = await admin.auth().getUserByEmail(email).catch(() => admin.auth().createUser({ email, emailVerified: true }));
    await signInWithCustomToken(auth, await admin.auth().createCustomToken(actor.uid));
    const draft = { ...createCatalogReferenceDraft(), nombre: 'QUICK-' + randomUUID(), costoProveedor: '580000', proveedor: 'PROVEEDOR PRIVADO', descripcion: 'Referencia sintética', imagenUrls: ['/logo-cuenta-hogar-oficial.png'] };
    draft.planesActivos[12] = true;
    const attempt = prepareCatalogCreate(db, buildCatalogReferencePrivatePatch(draft));
    const results = await Promise.all(Array.from({ length: 4 }, () => saveCatalogCreate(db, attempt)));
    assert.deepEqual([...new Set(results)], [attempt.id]);
    // The browser loses its result after commit and retries the exact prepared attempt.
    assert.equal(await saveCatalogCreate(db, attempt), attempt.id);
    assert.equal((await server.collection('productos').where('nombre', '==', draft.nombre).get()).size, 1);
    const privateRef = server.doc('productos/' + attempt.id), saved = (await privateRef.get()).data()!;
    assert.equal(saved.activo, false); assert.equal(saved.publicado, false); assert.equal(typeof saved.fechaCreacion.toDate, 'function');
    assert.equal((await server.doc('catalogo_publico/' + attempt.id).get()).exists, false, 'Saving cannot publish.');
    const preview = await previewCatalogReferencePublication(server, attempt.id); assert(preview.fingerprint && preview.dto);
    await publishCatalogReference(server, attempt.id, preview.fingerprint);
    assert.deepEqual(sensitiveCatalogPaths((await server.doc('catalogo_publico/' + attempt.id).get()).data()), []);
    await privateRef.update({ nombre: 'Cambio posterior preservado' });
    await assert.rejects(saveCatalogCreate(db, attempt), CatalogCreateConflict);
    assert.equal((await privateRef.get()).data()!.nombre, 'Cambio posterior preservado');
    const outsider = await admin.auth().createUser({ email: 'quick-outsider-' + randomUUID() + '@example.test' });
    await signInWithCustomToken(auth, await admin.auth().createCustomToken(outsider.uid));
    await assert.rejects(saveCatalogCreate(db, prepareCatalogCreate(db, buildCatalogReferencePrivatePatch(draft))));
    console.log('CATALOG_QUICK_CLIENT_TRANSACTIONS_RULES_ADMIN_ONLY_DUPLICATE_SUBMIT_LOST_RESPONSE_REPLAY_NO_CONCURRENT_OVERWRITE_EXPLICIT_SANITIZED_PUBLICATION = PASS');
  } finally { await signOut(auth); await terminate(db); await deleteApp(app); await admin.app().delete(); }
}
void main().catch(error => { console.error(error); process.exitCode = 1; });
