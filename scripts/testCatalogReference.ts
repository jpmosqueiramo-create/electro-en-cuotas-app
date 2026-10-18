import assert from "node:assert/strict";
import {
  CATALOGO_REFERENCIA_FACTORES_DEFAULT,
  adaptarReferenciaCatalogoLegacy,
  calcularPlanReferenciaCatalogo,
  generarPlanesPublicablesCatalogo,
  redondearCuotaCatalogo,
  toCatalogReferencePublic,
  validarReferenciaParaPublicacion,
  type CatalogReferencePrivate,
} from "../src/lib/catalogReference";

let passed = 0;
function test(name: string, run: () => void): void {
  run();
  passed++;
  console.log(`PASS ${name}`);
}

function fixture(): CatalogReferencePrivate {
  return {
    id: "referencia-1", nombre: "Referencia de heladera", descripcion: "Descripción pública",
    imagenUrls: ["/referencia.jpg"], costoProveedor: 500000, proveedor: "INTERNO",
    skuInterno: "SKU-INTERNO", codigoBarras: "0779000000000",
    factoresPlanes: {}, planesActivos: { 12: true }, publicado: true,
  };
}

test("A–C: defaults exactos, dominio 1..18, 12=3 y 18=4.04", () => {
  const expected = [1.10, 1.27, 1.45, 1.62, 1.79, 1.96, 2.14, 2.31, 2.48,
    2.65, 2.83, 3, 3.17, 3.35, 3.52, 3.69, 3.86, 4.04];
  assert.deepEqual(Object.values(CATALOGO_REFERENCIA_FACTORES_DEFAULT), expected);
  assert.deepEqual(Object.keys(CATALOGO_REFERENCIA_FACTORES_DEFAULT).map(Number),
    Array.from({ length: 18 }, (_, i) => i + 1));
  assert.equal(CATALOGO_REFERENCIA_FACTORES_DEFAULT[24], undefined);
  assert.ok(Object.isFrozen(CATALOGO_REFERENCIA_FACTORES_DEFAULT));
});

test("D–G, M: rechaza cuotas 0, 19, 24, fracciones y no finitos", () => {
  for (const cuotas of [0, -1, 19, 24, 1.5, NaN, Infinity, -Infinity]) {
    assert.throws(() => calcularPlanReferenciaCatalogo({ costoProveedor: 100, factor: 3, cuotas }));
  }
  assert.equal(calcularPlanReferenciaCatalogo({ costoProveedor: 100, factor: 3, cuotas: 1 }).cuotas, 1);
  assert.equal(calcularPlanReferenciaCatalogo({ costoProveedor: 100, factor: 3, cuotas: 18 }).cuotas, 18);
});

test("H: override válido gana al default y mantiene base fraccionaria", () => {
  const [plan] = generarPlanesPublicablesCatalogo({
    costoProveedor: 100001, factoresPlanes: { 12: 2.5 }, planesActivos: { 12: true },
  });
  assert.deepEqual(plan, {
    cuotas: 12, factorInterno: 2.5, valorTotalReferencia: 250003,
    cuotaBaseReferencia: 250003 / 12, cuotaExhibidaCatalogo: 20890,
    roundingStrategy: "NEXT_90_V1",
  });
  assert.notEqual(plan.cuotaBaseReferencia, Math.round(plan.cuotaBaseReferencia));
});

test("I–K: sólo true explícito, orden ascendente, faltantes/inactivos excluidos", () => {
  const plans = generarPlanesPublicablesCatalogo({
    costoProveedor: 1000, factoresPlanes: { 2: NaN, 24: 4 },
    planesActivos: { 18: true, 12: true, 2: false, 24: true, "1.5": true },
  });
  assert.deepEqual(plans.map(p => p.cuotas), [12, 18]);
  assert.deepEqual(plans.map(p => p.factorInterno), [3, 4.04]);
  assert.deepEqual(generarPlanesPublicablesCatalogo({
    costoProveedor: 100, factoresPlanes: {}, planesActivos: {},
  }), []);
  assert.equal(validarReferenciaParaPublicacion({ ...fixture(), planesActivos: {} }).valid, false);
  assert.equal(validarReferenciaParaPublicacion({ ...fixture(), planesActivos: { 24: true } }).valid, false);
});

test("L–M: costo/factor no válido, overflow y total redondeado cero", () => {
  for (const invalid of [0, -1, NaN, Infinity, -Infinity]) {
    assert.throws(() => calcularPlanReferenciaCatalogo({ costoProveedor: invalid, factor: 3, cuotas: 12 }));
    assert.throws(() => calcularPlanReferenciaCatalogo({ costoProveedor: 100, factor: invalid, cuotas: 12 }));
    assert.throws(() => generarPlanesPublicablesCatalogo({
      costoProveedor: 100, factoresPlanes: { 12: invalid }, planesActivos: { 12: true },
    }));
    assert.equal(validarReferenciaParaPublicacion({
      ...fixture(), factoresPlanes: { 12: invalid },
    }).valid, false);
  }
  assert.throws(() => calcularPlanReferenciaCatalogo({ costoProveedor: Number.MAX_VALUE, factor: 3, cuotas: 12 }));
  assert.throws(() => calcularPlanReferenciaCatalogo({ costoProveedor: 0.01, factor: 1, cuotas: 1 }));
  assert.throws(() => redondearCuotaCatalogo(Number.MAX_SAFE_INTEGER));
});

test("N–P: terminación comercial 90 y fracciones por encima del límite", () => {
  const cases = [[42137, 42190], [78412, 78490], [145833, 145890],
    [231044, 231090], [387612, 387690], [145890, 145890], [145891, 145990],
    [145890.01, 145990], [89.99, 90], [90, 90], [90.01, 190], [0.1, 90]];
  for (const [base, expected] of cases) assert.equal(redondearCuotaCatalogo(base), expected);
  for (const invalid of [0, -1, NaN, Infinity, -Infinity]) {
    assert.throws(() => redondearCuotaCatalogo(invalid));
  }
  for (let i = 1; i <= 10000; i++) {
    const base = i / 7;
    const result = redondearCuotaCatalogo(base);
    assert.ok(Number.isSafeInteger(result));
    assert.equal(result % 100, 90);
    assert.ok(result >= base);
    assert.ok(result - 100 < base);
  }
});

test("Q–R: allowlist pública exacta, sin claves sensibles ni mutación", () => {
  const privateInput = {
    ...fixture(), codigoProducto: "LEGACY", costoProducto: 500000, precioContado: 1500000,
    tna: 60, mora: 0.5, margen: 123, stock: [{ serie: "PRIVADA" }],
    notasInternas: "SECRETO", datosFiscales: { iva: 21 },
    extra: { proveedor: "INTERNO", factor: 3 },
  };
  const before = structuredClone(privateInput);
  Object.freeze(privateInput.imagenUrls);
  Object.freeze(privateInput.factoresPlanes);
  Object.freeze(privateInput.planesActivos);
  Object.freeze(privateInput);
  const dto = toCatalogReferencePublic(privateInput);
  assert.deepEqual(Object.keys(dto).sort(), ["referenciaId", "nombre", "descripcion",
    "imagenUrls", "planesPublicados", "publicado", "schemaVersion"].sort());
  assert.deepEqual(dto.planesPublicados, [{ cuotas: 12, cuotaEstimada: 125090 }]);
  assert.equal(dto.schemaVersion, 1);
  const sensitive = ["skuInterno", "codigoBarras", "codigoProducto", "legacyCodigoProducto",
    "costoProducto", "costoProveedor", "proveedor", "factoresPlanes", "factor", "factorInterno",
    "precioContado", "tna", "mora", "margen", "stock", "notasInternas", "datosFiscales",
    "valorTotalReferencia", "cuotaBaseReferencia", "roundingStrategy"];
  const serialized = JSON.stringify(dto);
  const leaks = sensitive.filter(key => serialized.includes(`"${key}":`));
  assert.deepEqual(leaks, []);
  assert.ok(!serialized.includes("SECRETO") && !serialized.includes("PRIVADA"));
  dto.imagenUrls.push("/otra.jpg");
  dto.planesPublicados[0].cuotaEstimada = 1;
  assert.deepEqual(privateInput, before);
  console.log(`SENSITIVE_FIELD_LEAKS = ${leaks.length}`);
});

test("S: validación nombre, descripción e imágenes 1..4; códigos opcionales", () => {
  const reference = fixture();
  delete reference.skuInterno;
  delete reference.codigoBarras;
  assert.equal(validarReferenciaParaPublicacion(reference).valid, true);
  for (const nombre of ["", "  "]) {
    assert.equal(validarReferenciaParaPublicacion({ ...reference, nombre }).valid, false);
  }
  assert.equal(validarReferenciaParaPublicacion({ ...reference, descripcion: " " }).valid, false);
  for (const imagenUrls of [[], [" "], ["/1", "/2", "/3", "/4", "/5"]]) {
    const invalid = { ...reference, imagenUrls };
    assert.equal(validarReferenciaParaPublicacion(invalid).valid, false);
    assert.throws(() => toCatalogReferencePublic(invalid));
  }
  assert.equal(validarReferenciaParaPublicacion({
    ...reference, imagenUrls: ["/1", "/2", "/3", "/4"],
  }).valid, true);
  assert.equal(toCatalogReferencePublic({ ...reference, publicado: false }).publicado, false);
  assert.throws(() => toCatalogReferencePublic({ ...reference, id: " " }));
});

test("T: adaptador conserva legacy sin inferir SKU/EAN, planes ni costo inventado", () => {
  const raw = {
    codigoProducto: "001234", costoProducto: 700, nombre: "Referencia", descripcion: "Detalle",
    imagenUrl: "/principal.jpg", imagenUrls: [], factoresPlanes: { 12: 2.7 },
    planesActivos: { 12: true }, cuota8: 200, cuota12: 300, precioContado: 10000,
    publicado: true, stock: [{ id: "unidad", fecha: new Date("2026-01-01") }],
  };
  const before = structuredClone(raw);
  const adapted = adaptarReferenciaCatalogoLegacy("id-estable", raw);
  assert.equal(adapted.id, "id-estable");
  assert.equal(adapted.legacyCodigoProducto, "001234");
  assert.equal(adapted.skuInterno, null);
  assert.equal(adapted.codigoBarras, null);
  assert.equal(adapted.costoProveedor, 700);
  assert.equal(adapted.cuota8, 200);
  assert.equal(adapted.cuota12, 300);
  assert.equal(adapted.precioContado, 10000);
  assert.deepEqual(adapted.imagenUrls, ["/principal.jpg"]);
  assert.deepEqual(adapted.factoresPlanes, { 12: 2.7 });
  assert.equal(adapted.stock, raw.stock); // Objeto opaco: tipos e identidad conservados.
  assert.deepEqual(raw, before);
  adapted.factoresPlanes = { 12: 4 };
  assert.deepEqual(raw.factoresPlanes, { 12: 2.7 });
  const noCost = adaptarReferenciaCatalogoLegacy("id", { precioContado: 10000, cuota12: 300 });
  assert.ok(Number.isNaN(noCost.costoProveedor));
  assert.deepEqual(noCost.planesActivos, {});
  assert.equal(noCost.publicado, false);
  const conflict = adaptarReferenciaCatalogoLegacy("id", { ...raw, costoProveedor: 0, activo: false });
  assert.equal(conflict.costoProveedor, 0); // No reemplazar un costo explícito inválido.
  assert.equal(conflict.publicado, false);
  const fiveImages = adaptarReferenciaCatalogoLegacy("id", {
    ...raw, imagenUrls: ["/1", "/2", "/3", "/4", "/5"],
  });
  assert.equal(fiveImages.imagenUrls.length, 5);
  assert.equal(validarReferenciaParaPublicacion(fiveImages).valid, false);
});

console.log(`CATALOG_TESTS = PASS (${passed} grupos; A–T)`);
