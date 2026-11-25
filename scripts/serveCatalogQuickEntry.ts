import './helpers/requireSafeEmulatorEnvironment';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { admin } from '../src/lib/firebaseAdmin';
import { productionRuntimeForEmulator } from '../src/lib/productionV2/runtime';
import { approvedFinalPackages } from '../src/lib/productionV2/catalog';
import { startProductionBrowserServer } from './helpers/productionAdapterBrowserServer';
import { buildCatalogReferencePrivatePatch, createCatalogReferenceDraft } from '../src/lib/catalogReferenceEditor';

async function main() {
  assert.equal(process.env.GCLOUD_PROJECT, 'demo-cuenta-hogar');
  assert.equal(process.env.NEXT_PUBLIC_ADMIN_EMAIL, 'jpmosqueiramo@gmail.com');
  assert(!process.env.LIFECYCLE_DATABASE_ID, 'Catalog client and server must use the same default emulator database.');
  const email = process.env.NEXT_PUBLIC_ADMIN_EMAIL!, password = 'Emulator-only-123';
  const actor = await admin.auth().getUserByEmail(email).catch(() => admin.auth().createUser({ email, emailVerified: true }));
  await admin.auth().updateUser(actor.uid, { password, emailVerified: true, disabled: false });
  const db = admin.firestore(), id = 'quick-entry-' + randomUUID();
  const draft = { ...createCatalogReferenceDraft(), nombre: 'PRUEBA SIMPLE · Lavarropas', costoProveedor: '580000', proveedor: 'Proveedor sintético', descripcion: 'Referencia sintética para gestión de compra', imagenUrls: ['/logo-cuenta-hogar-oficial.png'], skuInterno: 'SYNTHETIC-' + id, categoriaLogistica: 'C' as const };
  draft.planesActivos[12] = true; draft.factoresPlanes[12] = 3.75;
  await db.doc('productos/' + id).create({ ...buildCatalogReferencePrivatePatch(draft), activo: false, publicado: false, codigoProducto: 'LEGACY-SYNTHETIC', precioContado: 777, stock: [{ id: 'unit-' + id, localidad: 'Lincoln', nserie: 'SYNTHETIC-SERIAL', estado: 'Disponible' }] });
  writeFileSync('/tmp/catalog-quick-browser-fixture.json', JSON.stringify({ email, password, productId: id }));
  const runtime = productionRuntimeForEmulator(db, admin.auth(), [approvedFinalPackages[0]], [actor.uid]);
  const server = await startProductionBrowserServer(runtime);
  console.log('CATALOG_QUICK_BROWSER_READY http://localhost:3000');
  await new Promise<void>(done => { process.once('SIGINT', done); process.once('SIGTERM', done); });
  await server.stop(); writeFileSync('/tmp/catalog-quick-browser-calls.json', JSON.stringify(server.calls, null, 2));
  await admin.app().delete();
}
void main().catch(error => { console.error(error); process.exitCode = 1; });
