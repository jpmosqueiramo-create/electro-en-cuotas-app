import { createBudgetReferenceDraft } from "../src/lib/budgetReferenceDraft";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ReferenceConfigurator } from "../src/components/admin/references/ReferenceConfigurator";
import { createReferenceConfiguratorState, referenceConfiguratorReducer as reduce, validateReferenceConfigurator } from "../src/lib/referenceConfigurator";
import { CATALOGO_REFERENCIA_FACTORES_DEFAULT, redondearCuotaCatalogo } from "../src/lib/catalogReference";

const initial = createReferenceConfiguratorState();
assert.deepEqual(initial.factoresPlanes, CATALOGO_REFERENCIA_FACTORES_DEFAULT);
assert.equal(Object.keys(initial.factoresPlanes).length, 18);
assert.ok(Object.values(initial.planesActivos).every(value => value === false));
const configured = reduce(initial, { type: "patch", patch: { nombre: "Referencia", costoProveedor: "580000", skuInterno: "SKU", codigoBarras: "0779000000000" } });
const override = reduce(configured, { type: "factor", cuotas: 12, factor: 3.1 });
assert.equal(override.factoresPlanes[12], 3.1);
assert.equal(initial.factoresPlanes[12], 3);
assert.equal(override.planesActivos[12], false);
const enabled = reduce(override, { type: "toggle", cuotas: 12, active: true });
const reset = reduce(enabled, { type: "resetFactors" });
assert.deepEqual(reset.factoresPlanes, CATALOGO_REFERENCIA_FACTORES_DEFAULT);
assert.deepEqual(reset.planesActivos, enabled.planesActivos);
assert.equal(reset.skuInterno, "SKU"); assert.equal(reset.codigoBarras, "0779000000000");
assert.equal(validateReferenceConfigurator(reset).valid, true);
assert.equal(validateReferenceConfigurator(initial).valid, false);
for (const factor of [NaN, Infinity, 0, -1]) assert.equal(validateReferenceConfigurator(reduce(enabled, { type: "factor", cuotas: 12, factor })).valid, false);
for (const cuotas of [0, 19, 24, 1.5]) {
  assert.throws(() => reduce(enabled, { type: "toggle", cuotas, active: true }));
  assert.throws(() => reduce(enabled, { type: "factor", cuotas, factor: 3 }));
}
assert.throws(() => reduce(enabled, { type: "patch", patch: { imagenUrls: ["1", "2", "3", "4", "5"] } }));
const images = ["one"];
const copy = reduce(enabled, { type: "patch", patch: { imagenUrls: images } });
images.push("two"); copy.factoresPlanes[12] = 9; copy.planesActivos[12] = false;
assert.deepEqual(copy.imagenUrls, ["one"]); assert.equal(enabled.factoresPlanes[12], 3.1); assert.equal(enabled.planesActivos[12], true);
for (const [base, expected] of [[145000,145000],[230000,230000],[99999,100090],[42137,42190],[78412,78490],[145833,145890],[145890,145890],[145891,145990]]) assert.equal(redondearCuotaCatalogo(base), expected);
const raw = { nombre: "Legacy", costoProducto: 580000, codigoProducto: "MIXTO", skuInterno: "SKU", codigoBarras: "EAN", proveedor: "privado", descripcion: "desc", imagenUrls: ["one"], factoresPlanes: {12:3.1,24:4}, planesActivos: {12:true,24:true}, stock: [{id:"unit"}] };
const rawBefore = structuredClone(raw);
const existing = createReferenceConfiguratorState(raw);
assert.equal(existing.factoresPlanes[12],3.1); assert.equal(existing.planesActivos[12],true);
assert.equal(existing.factoresPlanes[24],undefined); assert.equal(existing.codigoBarras,"EAN");
existing.imagenUrls.push("two"); assert.deepEqual(raw, rawBefore);
// Unrouted budget-host harness: the same controlled fields need no Firebase provider.
const markup = renderToStaticMarkup(createElement(ReferenceConfigurator, {
  draft: reset, onChange: patch => { reduce(reset, { type: "patch", patch }); },
  externalUrl: "", files: [], onExternalUrlChange: () => {}, onAddUrl: () => {},
  onAddFiles: () => {}, onRemoveFile: () => {},
}));
assert.equal((markup.match(/data-editor-section=/g) ?? []).length, 5);
assert.equal((markup.match(/data-plan-row=/g) ?? []).length, 18);
assert.ok(markup.includes("SOLO ADMINISTRACIÓN"));
assert.ok(!markup.includes('data-editor-section="Publicación"'));
console.log("P2_CONFIGURATOR_TESTS = PASS; UNROUTED_BUDGET_HOST = PASS");

const newBudgetDraft = createBudgetReferenceDraft();
assert.equal(Object.values(newBudgetDraft.planesActivos).filter(Boolean).length, 18);
assert.deepEqual(newBudgetDraft.factoresPlanes, CATALOGO_REFERENCIA_FACTORES_DEFAULT);
assert.deepEqual(createBudgetReferenceDraft(raw), createReferenceConfiguratorState(raw));
assert.ok(Object.values(createReferenceConfiguratorState().planesActivos).every(value => !value));
console.log("NEW_BUDGET_PLANS_ENABLED_EXISTING_SELECTIONS_PRESERVED = PASS");
