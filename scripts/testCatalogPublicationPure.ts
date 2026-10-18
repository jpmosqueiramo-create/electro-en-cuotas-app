import assert from "node:assert/strict";
import {
  assertCatalogReferenceId, fingerprintCatalogReference, isCurrentCatalogProjection,
  prepareCatalogPublication, serializeCatalogReferencePublic,
} from "../src/lib/catalogPublicationContent";
import { catalogC2Fixture, sensitiveCatalogPaths } from "./helpers/catalogReferenceC2Fixtures";

const raw = catalogC2Fixture();
const before = structuredClone(raw);
const prepared = prepareCatalogPublication("c2-pure", raw);
assert.equal(prepared.validation.valid, true);
assert.ok(prepared.dto && prepared.fingerprint);
const dto = prepared.dto;
assert.equal(dto.publicado, true); // Flags legacy false no son autoridad C2.
assert.deepEqual(raw, before);
assert.deepEqual(Object.keys(dto).sort(), ["referenciaId", "nombre", "descripcion", "imagenUrls",
  "planesPublicados", "publicado", "schemaVersion"].sort());
assert.equal(dto.planesPublicados.length, 18);
assert.equal(dto.planesPublicados.find(plan => plan.cuotas === 12)?.cuotaEstimada, 145000);
assert.equal(dto.planesPublicados.find(plan => plan.cuotas === 18)?.cuotaEstimada, 130190);
assert.equal(dto.planesPublicados.some(plan => plan.cuotas === 24), false);
assert.deepEqual(sensitiveCatalogPaths(JSON.parse(JSON.stringify(dto))), []);
// El auditor debe detectar claves prohibidas también dentro de arrays anidados.
assert.deepEqual(sensitiveCatalogPaths({ a: [{ b: { costoProveedor: 1 } }] }), [".a[0].b.costoProveedor"]);

const reordered = {
  schemaVersion: dto.schemaVersion, publicado: dto.publicado,
  planesPublicados: dto.planesPublicados.map(p => ({ cuotaEstimada: p.cuotaEstimada, cuotas: p.cuotas })),
  imagenUrls: [...dto.imagenUrls], descripcion: dto.descripcion, nombre: dto.nombre,
  referenciaId: dto.referenciaId,
};
assert.equal(fingerprintCatalogReference(reordered), prepared.fingerprint);
assert.equal(serializeCatalogReferencePublic(reordered), serializeCatalogReferencePublic(dto));
assert.equal(fingerprintCatalogReference({ ...dto, proveedor: "IGNORADO" } as typeof dto), prepared.fingerprint);
assert.equal(isCurrentCatalogProjection({ ...dto, proveedor: "DEBE ELIMINARSE" }, dto), false);
assert.equal(isCurrentCatalogProjection(reordered, dto), true);
assert.equal(isCurrentCatalogProjection(undefined, dto), false);

// Cambios puramente privados o costo/factor que generan el mismo DTO no cambian hash.
assert.equal(prepareCatalogPublication("c2-pure", {
  ...raw, proveedor: "OTRO", skuInterno: "OTRO", codigoBarras: "OTRO", stock: [], margen: 999,
}).fingerprint, prepared.fingerprint);
assert.equal(prepareCatalogPublication("c2-pure", {
  ...raw, costoProducto: 580000.00001,
  factoresPlanes: { ...raw.factoresPlanes, 12: 3.00000001 },
}).fingerprint, prepared.fingerprint);
assert.notEqual(prepareCatalogPublication("c2-pure", { ...raw, nombre: "Versión B" }).fingerprint,
  prepared.fingerprint);
assert.notEqual(prepareCatalogPublication("c2-pure", {
  ...raw, imagenUrls: [...raw.imagenUrls].reverse(),
}).fingerprint, prepared.fingerprint);
const inactive = prepareCatalogPublication("c2-pure", {
  ...raw, planesActivos: { 12: false, 18: true, 24: true },
});
assert.deepEqual(inactive.dto?.planesPublicados.map(p => p.cuotas), [18]);
for (const invalid of [
  { ...raw, nombre: " " }, { ...raw, descripcion: "" }, { ...raw, costoProducto: 0 },
  { ...raw, imagenUrls: [] }, { ...raw, imagenUrls: ["1", "2", "3", "4", "5"] },
  { ...raw, planesActivos: {} }, { ...raw, factoresPlanes: { 12: NaN } },
]) {
  const result = prepareCatalogPublication("c2-pure", invalid);
  assert.equal(result.validation.valid, false);
  assert.equal(result.dto, null);
  assert.equal(result.fingerprint, null);
}
for (const id of ["", " ", " padded ", ".", "..", "a/b", "\u0000", "__reserved__", "a".repeat(1501)]) {
  assert.throws(() => assertCatalogReferenceId(id));
}
assertCatalogReferenceId("prod_presupuesto__item-1");
console.log("C2_PURE_TESTS = PASS");
console.log("SENSITIVE_FIELD_LEAKS = 0");
