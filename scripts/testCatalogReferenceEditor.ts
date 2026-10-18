import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import { createCatalogReferenceDraft, buildCatalogReferencePrivatePatch, catalogPublicationLabel } from '../src/lib/catalogReferenceEditor';
import { CATALOGO_REFERENCIA_FACTORES_DEFAULT, adaptarReferenciaCatalogoLegacy, toCatalogReferencePublic, validarReferenciaParaPublicacion } from '../src/lib/catalogReference';
import { prepareCatalogPublication } from '../src/lib/catalogPublicationContent';
import { CatalogReferencePreview } from '../src/components/admin/catalog/CatalogReferencePreview';
import { sensitiveCatalogPaths } from './helpers/catalogReferenceC2Fixtures';

const draft = createCatalogReferenceDraft();
assert.deepEqual(draft.factoresPlanes, CATALOGO_REFERENCIA_FACTORES_DEFAULT);
assert.equal(Object.keys(draft.factoresPlanes).length, 18);
assert.ok(Object.values(draft.planesActivos).every(active => !active));
const raw = {
  nombre: 'Heladera de referencia', descripcion: 'Descripción de referencia pública', costoProducto: 580000,
  codigoProducto: 'LEGACY-INTERNO', precioContado: 123456, cuota8: 888, cuota12: 999,
  tasaInteresTna: 60, tasaMora: 0.5, stock: [], activo: true, publicado: true,
  factoresPlanes: { 12: 3, 24: 4 }, planesActivos: { 12: true, 24: true },
  imagenUrl: '/logo-cuenta-hogar-oficial.png', proveedor: 'PROVEEDOR PRIVADO',
};
const before = structuredClone(raw);
const existing = createCatalogReferenceDraft(raw);
assert.equal(existing.skuInterno, ''); assert.equal(existing.codigoBarras, '');
assert.equal(existing.factoresPlanes[18], 4.04);
assert.equal(existing.planesActivos[18], false);
assert.deepEqual(raw, before);
existing.skuInterno = 'SKU-PRIVADO'; existing.codigoBarras = '0779000000000';
const patch = buildCatalogReferencePrivatePatch(existing, raw);
const saved = { ...raw, ...patch };
assert.equal(saved.precioContado, raw.precioContado);
assert.equal(saved.codigoProducto, raw.codigoProducto);
assert.equal(saved.cuota8, raw.cuota8);
assert.equal(saved.cuota12, 145000);
assert.equal(saved.costoProveedor, 580000); assert.equal(saved.costoProducto, 580000);
assert.equal(saved.tasaInteresTna, 60); assert.equal(saved.tasaMora, 0.5);
assert.equal(saved.factoresPlanes[24], 4);
assert.equal(saved.stock, raw.stock);
existing.factoresPlanes[12] = 2.5;
const override = buildCatalogReferencePrivatePatch(existing, raw);
assert.equal(override.factoresPlanes[12], 2.5);
assert.equal(override.cuota12, 120890);
existing.planesActivos[12] = false;
assert.ok(!('cuota12' in buildCatalogReferencePrivatePatch(existing, raw)));
existing.planesActivos[8] = true;
assert.ok(buildCatalogReferencePrivatePatch(existing, raw).cuota8! > 0);
assert.throws(() => buildCatalogReferencePrivatePatch({ ...existing, imagenUrls: ['1','2','3','4','5'] }));
assert.throws(() => buildCatalogReferencePrivatePatch({ ...existing, factoresPlanes: { ...existing.factoresPlanes, 12: NaN } }));
for (const stock of [[], 0]) {
  const reference = { ...saved, stock };
  const prepared = prepareCatalogPublication('zero-stock', reference);
  assert.equal(prepared.validation.valid, true); assert.ok(prepared.dto);
  assert.deepEqual(prepared.dto.planesPublicados, [{ cuotas: 12, cuotaEstimada: 145000 }]);
  assert.deepEqual(sensitiveCatalogPaths(JSON.parse(JSON.stringify(prepared.dto))), []);
  const markup = renderToStaticMarkup(createElement(CatalogReferencePreview, { reference: prepared.dto }));
  for (const secret of ['SKU-PRIVADO','0779000000000','PROVEEDOR PRIVADO','LEGACY-INTERNO','costoProveedor','factoresPlanes','stock']) assert.ok(!markup.includes(secret));
  assert.ok(markup.includes('145.000'));
}
const model = adaptarReferenciaCatalogoLegacy('zero-stock', saved);
assert.equal(validarReferenciaParaPublicacion(model).valid, true);
assert.deepEqual(sensitiveCatalogPaths(toCatalogReferencePublic(model)), []);
assert.equal(catalogPublicationLabel({ ...prepareCatalogPublication('id', saved), referenciaId:'id', hasPublicProjection:true,hasUnpublishedChanges:true }), 'Cambios sin publicar');
console.log('C3_PURE_TESTS = PASS (editor, compatibilidad y stock cero)');
console.log('PREVIEW_SENSITIVE_FIELDS = 0');
console.log('PUBLIC_DTO_SENSITIVE_FIELDS = 0');
