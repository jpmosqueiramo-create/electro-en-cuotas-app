import './helpers/requireSafeEmulatorEnvironment';
import assert from 'node:assert/strict';
import { admin } from '../src/lib/firebaseAdmin';
import { GET as affiliateCatalog } from '../src/app/api/afiliado/catalogo/route';
import { GET as publicVisibility } from '../src/app/api/catalogo-visibilidad/route';
import { GET as adminVisibility, POST as updateVisibility } from '../src/app/api/admin/catalogo/visibilidad/route';
import { GET as publicCatalog } from '../src/app/api/catalogo/route';
import { catalogVisibilityPath } from '../src/lib/catalogVisibility';
import { publicFixture, publicSensitivePaths } from './helpers/catalogC4Fixtures';
import { p1Token } from './testPortalP1Emulator';
import { productionRuntimeForEmulator } from '../src/lib/productionV2/runtime';
import { startProductionBrowserServer } from './helpers/productionAdapterBrowserServer';
import { CatalogBrowser } from './helpers/catalogBrowser';
const pass = (name: string) => console.log(name + ' = PASS');
async function main() {
  const db = admin.firestore(), password = 'Emulator-only-123', email = process.env.NEXT_PUBLIC_ADMIN_EMAIL!;
  const owner = await admin.auth().createUser({ email, password, emailVerified: true });
  const seller = await admin.auth().createUser({ email: 'catalog-seller@example.test', password, emailVerified: true });
  const client = await admin.auth().createUser({ email: 'catalog-client@example.test', password, emailVerified: true });
  const unverified = await admin.auth().createUser({ email: 'catalog-unverified@example.test', password, emailVerified: false });
  const vendor = db.collection('vendedores').doc('catalog-seller'); await vendor.set({ authUid: seller.uid, activo: true, nombre: 'Vendedor sintético' });
  await db.collection('vendedores').doc('catalog-unverified').set({ authUid: unverified.uid, activo: true });
  const tokens = { owner: await p1Token(owner), seller: await p1Token(seller), client: await p1Token(client), unverified: await p1Token(unverified) };
  const req = (token?: string, body?: unknown) => new Request('http://localhost:3000/api/test', { method: body === undefined ? 'GET' : 'POST', headers: { ...(token ? { Authorization: 'Bearer ' + token } : {}), 'Content-Type': 'application/json' }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  const product = publicFixture('affiliate-visible', 'Lavarropas sintético');
  await db.collection('catalogo_publico').doc(product.referenciaId).set({ ...product, costoProveedor: 999999, proveedor: 'PRIVATE-NEVER-EXPOSE' });
  await db.collection('catalogo_publico').doc('not-published').set({ ...publicFixture('not-published'), publicado: false });
  await db.collection('productos').doc(product.referenciaId).set({ nombre: product.nombre, costoProveedor: 999999, proveedor: 'PRIVATE-NEVER-EXPOSE' });
  const catalogBefore = (await db.collection('catalogo_publico').get()).docs.map(d => d.data()), privateBefore = (await db.collection('productos').get()).docs.map(d => d.data());
  assert.deepEqual(await (await publicVisibility()).json(), { homeVisible: true }); assert.equal((await db.doc(catalogVisibilityPath).get()).exists, false);
  for (const token of [undefined, tokens.seller, tokens.client]) { assert([401, 403].includes((await adminVisibility(req(token))).status)); assert([401, 403].includes((await updateVisibility(req(token, { homeVisible: false, expectedRevision: 0 }))).status)); }
  for (const token of [undefined, tokens.client, tokens.unverified]) assert.equal((await affiliateCatalog(req(token))).status, 403);
  const first = await affiliateCatalog(req(tokens.seller)); assert.equal(first.status, 200); const dto = await first.json(); assert.deepEqual(dto, { items: [product] }); assert.deepEqual(publicSensitivePaths(dto), []);
  await vendor.update({ activo: false }); assert.equal((await affiliateCatalog(req(tokens.seller))).status, 403); await vendor.update({ activo: true });
  await admin.auth().updateUser(seller.uid, { disabled: true }); assert.equal((await affiliateCatalog(req(tokens.seller))).status, 403); await admin.auth().updateUser(seller.uid, { disabled: false });
  const change = (visible: boolean, revision: number) => updateVisibility(req(tokens.owner, { homeVisible: visible, expectedRevision: revision }));
  const hidden = await change(false, 0); assert.equal(hidden.status, 200); assert.deepEqual(await hidden.json(), { homeVisible: false, revision: 1 });
  const retries = await Promise.all([change(false, 0), change(false, 0)]); for (const r of retries) assert.deepEqual(await r.json(), { homeVisible: false, revision: 1 });
  assert.deepEqual(await (await publicVisibility()).json(), { homeVisible: false }); assert.deepEqual(await (await affiliateCatalog(req(await p1Token(seller)))).json(), dto);
  assert.deepEqual(await (await publicCatalog()).json(), dto); // This switch is presentation, not an access-control boundary.
  assert.equal((await change(true, 0)).status, 409); assert.equal((await change(true, 1)).status, 200);
  assert.equal((await updateVisibility(req(tokens.owner, { homeVisible: 'false', expectedRevision: 2 }))).status, 409);
  pass('ADMIN_ONLY_EXPLICIT_VISIBILITY_REVISION_RETRY_CONFLICT_DEFAULT_COMPATIBILITY');
  pass('ACTIVE_VERIFIED_AFFILIATE_ONLY_PUBLIC_ALLOWLIST_NO_PRIVATE_DATA_HIDDEN_HOME_INDEPENDENT');
  if (process.env.CATALOG_VISIBILITY_BROWSER === '1') {
    const runtime = productionRuntimeForEmulator(db, admin.auth(), [], [owner.uid]);
    const server = await startProductionBrowserServer(runtime), browser = await CatalogBrowser.open();
    try {
      // Public reference IDs remain valid; the visibility endpoint must not shadow a detail URL.
      await db.collection('catalogo_publico').doc('visibilidad').set(publicFixture('visibilidad'));
      const preservedDetail = await fetch('http://localhost:3000/api/catalogo/visibilidad'); assert.equal(preservedDetail.status, 200); assert.equal((await preservedDetail.json()).referenciaId, 'visibilidad');
      await db.collection('catalogo_publico').doc('visibilidad').delete();
      await browser.command('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
      await browser.navigate('/login'); await browser.until("typeof window.__FIREBASE_SIGN_IN__==='function'", 'auth'); await browser.evaluate(`window.__FIREBASE_SIGN_IN__(${JSON.stringify(email)},${JSON.stringify(password)}).then(()=>true)`);
      await browser.navigate('/admin/productos'); await browser.until("document.querySelector('[data-testid=catalog-visibility]')?.innerText.includes('Ocultar de la página principal')", 'admin visibility');
      for (const width of [1280, 390, 320]) { await browser.command('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: width < 768 }); await browser.evaluate("document.querySelector('[data-testid=catalog-visibility]').scrollIntoView({block:'start'})"); await browser.overflow('admin catalog visibility ' + width); await browser.screenshot('catalog-visibility-admin-' + width + '.png'); }
      await browser.clickText('Ocultar de la página principal'); await browser.until("document.querySelector('[data-testid=catalog-visibility] [role=status]')?.innerText.includes('Catálogo oculto')", 'hidden saved');
      const publicReads = server.calls.filter(c => c.path === '/api/catalogo').length;
      await browser.navigate('/'); await browser.until("!!document.querySelector('#contacto')&&performance.getEntriesByType('resource').some(e=>e.name.endsWith('/api/catalogo-visibilidad'))", 'hidden homepage loaded');
      assert.equal(await browser.evaluate("document.querySelector('#catalogo')===null&&document.querySelector('[data-public-reference]')===null"), true); assert.equal(server.calls.filter(c => c.path === '/api/catalogo').length, publicReads);
      await browser.evaluate(`window.__FIREBASE_SIGN_IN__(${JSON.stringify(seller.email)},${JSON.stringify(password)}).then(()=>true)`); await browser.navigate('/afiliado'); await browser.until("!!document.querySelector('[data-affiliate-reference=affiliate-visible]')", 'affiliate catalog while homepage hidden');
      await browser.evaluate("(()=>{const s=document.querySelector('[data-affiliate-reference] select');s.value='3';s.dispatchEvent(new Event('change',{bubbles:true}));})()"); await browser.until("document.querySelector('[data-affiliate-reference]').innerText.includes('42.190')", 'published plan without recalculation');
      for (const width of [1280, 390, 320]) { await browser.command('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: width < 768 }); await browser.evaluate("document.querySelector('[data-testid=affiliate-catalog]').scrollIntoView({block:'start'})"); await browser.overflow('affiliate catalog ' + width); await browser.screenshot('affiliate-catalog-' + width + '.png'); }
      await browser.field('Buscar producto', 'LAVARROPAS sintetico'); assert.equal(await browser.evaluate("document.querySelectorAll('[data-affiliate-reference]').length"), 1); await browser.field('Buscar producto', 'inexistente'); await browser.until("document.querySelector('[data-testid=affiliate-catalog]').innerText.includes('No hay coincidencias')", 'search empty'); await browser.field('Buscar producto', '');
      await browser.evaluate(`window.__FIREBASE_SIGN_IN__(${JSON.stringify(email)},${JSON.stringify(password)}).then(()=>true)`); await browser.navigate('/admin/productos'); await browser.until("document.querySelector('[data-testid=catalog-visibility]')?.innerText.includes('Mostrar en la página principal')", 'persisted hidden'); await browser.clickText('Mostrar en la página principal'); await browser.until("document.querySelector('[data-testid=catalog-visibility] [role=status]')?.innerText.includes('Catálogo visible')", 'visible saved');
      await browser.navigate('/'); await browser.until("!!document.querySelector('[data-public-reference=affiliate-visible]')", 'homepage restored'); assert.deepEqual(browser.externalFirebase, []); assert(!server.calls.some(c => c.status >= 500));
      pass('BROWSER_ADMIN_HIDE_RELOAD_AFFILIATE_SEARCH_PLANS_RESTORE_HOME_DESKTOP_390_320');
    } finally { await browser.close(); await server.stop(); }
  }
  assert.deepEqual((await db.collection('catalogo_publico').get()).docs.map(d => d.data()), catalogBefore); assert.deepEqual((await db.collection('productos').get()).docs.map(d => d.data()), privateBefore);
  await db.doc(catalogVisibilityPath).set({ schemaVersion: 999, homeVisible: true, revision: 1 }); assert.equal((await publicVisibility()).status, 503); await db.doc(catalogVisibilityPath).delete();
  pass('CATALOG_PRODUCTS_PRICES_PUBLICATIONS_UNCHANGED_INVALID_SETTINGS_FAIL_CLOSED');
}
main().catch(e => { console.error(e); process.exitCode = 1; });
