import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { budgetFixture } from "./helpers/budgetV2Fixtures";
import { budgetClientLines, duplicateBudgetOption, replaceBudgetOption, toClientBudgetV2, validateBudgetV2 } from "../src/lib/budgetV2";
import { renderBudgetPdfV2 } from "../src/lib/budgetV2Pdf";
for(const count of [1,3]){const b=budgetFixture(`budget-${count}`,count);validateBudgetV2(b);assert.equal(b.options.length,count);}
const b=budgetFixture();const copy=duplicateBudgetOption(b.options[0],"copy-opaque");assert.notEqual(copy.optionId,b.options[0].optionId);assert.notEqual(copy.referenceSnapshot,b.options[0].referenceSnapshot);
const updated=replaceBudgetOption(b.options,{...copy,optionId:b.options[0].optionId});assert.deepEqual(updated.map(o=>o.optionId),b.options.map(o=>o.optionId));
assert.deepEqual(b.options.filter(o=>o.optionId!==b.options[0].optionId).map(o=>o.optionId),["option-1"]);
assert.equal(b.options[0].referenceSnapshot.referenceId,null);assert.ok(Object.isFrozen(b.options[0].referenceSnapshot.planesOfrecidos));
assert.deepEqual(b.options.map(o=>o.referenceSnapshot.planesOfrecidos.map(p=>p.cuotas)),[[8,12],[12,18]]);
assert.throws(()=>toClientBudgetV2(b));b.estado="EMITIDO";b.issuedAt="2026-10-18T13:00:00.000Z";
const dto=toClientBudgetV2(b);assert.deepEqual(Object.keys(dto).sort(),["budgetId","version","fecha","cliente","options"].sort());
const lines=budgetClientLines(dto).join("\n");for(const n of [8,12,18])assert.ok(lines.includes(`${n} cuotas estimadas`));assert.equal((lines.match(/cuotas estimadas de/g)??[]).length,4);
const pdf=renderBudgetPdfV2(dto).output();for(const value of [JSON.stringify(dto),lines,pdf])for(const secret of ["SECRET_PROVIDER","SECRET_SKU","SECRET_EAN","SECRET_COST","SECRET_FACTOR","costoProveedorSnapshot","factoresSnapshot","planesActivosSnapshot"])assert.ok(!value.includes(secret));
assert.ok(!/combinada|cuota total/i.test(lines));
const src=readFileSync(new URL("../src/lib/budgetV2.ts",import.meta.url),"utf8");assert.ok(!/reduce\(/.test(src));
const legacy=readFileSync(new URL("../src/app/admin/validaciones/page.tsx",import.meta.url),"utf8");assert.ok(!legacy.includes("handleEnviarPresupuesto"));
console.log("P3_MODEL_TESTS = PASS; P3_IMMUTABILITY_TESTS = PASS; P3_CLIENT_DTO_TESTS = PASS; P3_PDF_WHATSAPP_TESTS = PASS; V2_CLIENT_SENSITIVE_FIELD_LEAKS = 0");

// Legacy UI is retired: bookmarked entry points may only redirect, never
// select a legacy contract or expose mutating handlers.
assert.ok(legacy.includes("redirect(legacyAdminDestination('validation'"));
for(const handler of ['handleOpenContratoEditor','updateDoc','deleteDoc','generarContratoModelo'])assert.ok(!legacy.includes(handler));

import { parseBudgetCommandV2, privateBudgetReferenceId } from "../src/lib/budgetV2Persistence";
import { BudgetV2DomainError, budgetV2SafeErrorMessage } from "../src/lib/budgetV2";
function schemaCommand(): Record<string, unknown> {
 return JSON.parse(JSON.stringify({action:"SAVE",commandId:"schema-command",budget:budgetFixture("schema-budget"),expectedRevision:0,privateOptionIds:[]}));
}
function target(root:unknown,path:string[]):Record<string,unknown>{let v=root;for(const key of path)v=(v as Record<string,unknown>)[key];return v as Record<string,unknown>;}
for(const action of ["SAVE","ISSUE","REVISE"]){
 for(const path of [[],["budget"],["budget","clienteSnapshot"],["budget","options","0"],["budget","options","0","referenceSnapshot"],["budget","options","0","referenceSnapshot","planesOfrecidos","0"]]){
  const cmd=schemaCommand();cmd.action=action;target(cmd,path).unexpected="must reject";assert.throws(()=>parseBudgetCommandV2(cmd),BudgetV2DomainError);
 }
}
for(const [path,key,value] of [
 [[],"privateOptionIds",["option-0","option-0"]],[[],"privateOptionIds",[null]],[[],"privateOptionIds","option-0"],[[],"privateOptionIds",["bad/id"]],
 [[],"expectedRevision",-1],[[],"expectedRevision","0"],[[],"commandId",null],[[],"action","DELETE"],
 [["budget"],"version",0],[["budget"],"revision",-1],[["budget"],"estado","ACCEPTED"],[["budget"],"createdAt","yesterday"],
 [["budget","clienteSnapshot"],"nombre",null],[["budget","clienteSnapshot"],"dni",42],[["budget","clienteSnapshot"],"localidad","x".repeat(501)],
 [["budget","options","0","referenceSnapshot"],"referenceId","arbitrary-product-id"],
 [["budget","options","0","referenceSnapshot"],"nombre","Referencia 1 "],
 [["budget","options","0","referenceSnapshot"],"costoProveedorSnapshot","580000"],
 [["budget","options","0","referenceSnapshot","factoresSnapshot"],"19",3],
 [["budget","options","0","referenceSnapshot","planesActivosSnapshot"],"8","true"],
 [["budget","options","0","referenceSnapshot","planesOfrecidos","0"],"cuotaEstimada",1]
] as [string[],string,unknown][]){const cmd=schemaCommand();target(cmd,path)[key]=value;assert.throws(()=>parseBudgetCommandV2(cmd),BudgetV2DomainError);}
for(const value of [null,[],"bad",42,{},undefined])assert.throws(()=>parseBudgetCommandV2(value),BudgetV2DomainError);
const deterministic=schemaCommand();target(deterministic,["budget","options","0","referenceSnapshot"]).referenceId=privateBudgetReferenceId("schema-budget","option-0");assert.doesNotThrow(()=>parseBudgetCommandV2(deterministic));
const existing=schemaCommand();target(existing,["budget","options","0","referenceSnapshot"]).source="EXISTING_REFERENCE";assert.throws(()=>parseBudgetCommandV2(existing),BudgetV2DomainError);target(existing,["budget","options","0","referenceSnapshot"]).referenceId="existing-product";assert.doesNotThrow(()=>parseBudgetCommandV2(existing));
assert.equal(budgetV2SafeErrorMessage(new Error("Firestore SDK secret /internal/path")),"No se pudo completar la operación.");
assert.equal(budgetV2SafeErrorMessage(new BudgetV2DomainError("Conflicto de revisión.")),"Conflicto de revisión.");
console.log("P3_ADVERSARIAL_SCHEMA_TESTS = PASS; UNEXPECTED_SERVER_ERRORS_SANITIZED = YES");

// The retired editor is absent; both entry points mount only the existing V2 workspace.
const page=readFileSync(new URL("../src/app/admin/presupuestos/page.tsx",import.meta.url),"utf8");
const workspace=readFileSync(new URL("../src/components/admin/budgets/BudgetV2Workspace.tsx",import.meta.url),"utf8");
assert.ok(page.includes("<BudgetV2Workspace />"));
for(const source of [page,workspace])for(const retired of ["legacyHistory","PresupuestosContent","generarPdfPresupuesto","budgetEditorLifecycle"])assert.ok(!source.includes(retired));
for(const retired of ["handleEnviarPresupuesto","handleAceptarPresupuesto","handleCargarPresupuestoParaEditar","Historial de Presupuestos Enviados"])assert.ok(!legacy.includes(retired));
assert.ok(legacy.includes("redirect("));
console.log("LEGACY_BUDGET_EDITOR_REMOVED = PASS; V2_ONLY_ENTRY_POINTS = PASS");
