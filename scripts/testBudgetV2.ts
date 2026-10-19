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
const legacy=readFileSync(new URL("../src/app/admin/validaciones/page.tsx",import.meta.url),"utf8");assert.ok(legacy.includes('targetPres.schemaVersion === "BUDGET_V2"'));
console.log("P3_MODEL_TESTS = PASS; P3_IMMUTABILITY_TESTS = PASS; P3_CLIENT_DTO_TESTS = PASS; P3_PDF_WHATSAPP_TESTS = PASS; V2_CLIENT_SENSITIVE_FIELD_LEAKS = 0");

// Exercise the actual Validaciones handlers; compare historical behavior with HEAD.
import ts from "typescript";
import { execFileSync } from "node:child_process";
import { runInNewContext } from "node:vm";
const baseValidaciones=execFileSync("git",["show","f2d4d061ce41086d3a4c559462fb54e120ab0454:src/app/admin/validaciones/page.tsx"],{encoding:"utf8"});
function handler(source:string,name:string){
 const ast=ts.createSourceFile("validaciones.tsx",source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 let value:ts.Expression|undefined;
 function visit(node:ts.Node){if(ts.isVariableDeclaration(node)&&node.name.getText(ast)===name)value=node.initializer;ts.forEachChild(node,visit);}
 visit(ast);assert.ok(value,`Missing ${name}`);
 return value!.getText(ast);
}
const redirectGuard='    if (!editandoPresupuestoId) { window.location.assign(`/admin/presupuestos?sourceCollection=solicitudes_cuenta&solicitudId=${encodeURIComponent(sol.id)}`); return; }\n';
const acceptanceGuard='    if (targetPres.schemaVersion === "BUDGET_V2") return alert("La aceptación V2 se habilitará en su fase específica.");\n';
for(const name of ["handleCargarPresupuestoParaEditar","handleCancelarEdicionPresupuesto","handleEnviarPresupuesto","handleDescargarPdfPresupuestoHistorial","handleRechazarPresupuesto","handleAceptarPresupuesto"]){
 assert.equal(handler(legacy,name).replace(redirectGuard,"").replace(acceptanceGuard,""),handler(baseValidaciones,name),`${name}: historical implementation changed`);
}
async function exercise(source:string,name:string,editing:string|null,schema?:string){
 const events:unknown[]=[];const item={producto:"Histórico",cuotas:8,valorCuota:1234,contado:9000};
 const pres={id:"pres_historical",fecha:"2026-01-01T12:00:00Z",estado:"Enviado",items:[item],...(schema?{schemaVersion:schema}:{})};
 const sol={id:"sol-historical",nombre:"Cliente",whatsapp:"5491100000000",presupuestos:[pres]};
 const ctx:Record<string,unknown>={editandoPresupuestoId:editing,draftItems:[item],budgetTna:"60",budgetMora:"0.5",budgetNotas:" Nota ",selectedItemsMap:{},aperturas:[sol],db:{},encodeURIComponent,confirm:()=>true,alert:()=>{},doc:(_db:unknown,col:string,id:string)=>`${col}/${id}`,updateDoc:async(path:unknown,payload:unknown)=>{events.push([path,payload]);},fetchAperturas:async()=>{},fetchSolicitudes:async()=>{},generarPdfPresupuesto:(payload:unknown)=>events.push(["pdf",payload]),window:{open:(url:string)=>events.push(["whatsapp",url]),location:{assign:(url:string)=>events.push(["redirect",url])}}};
 for(const setter of ["EditandoPresupuestoId","DraftItems","BudgetProd","BudgetContado","BudgetCuotaValor","BudgetNotas","BudgetProveedor","BudgetLinkProveedor","BudgetCostoProveedor","BudgetTna","BudgetMora"])ctx[`set${setter}`]=()=>{};
 const js=ts.transpile(`const run = ${handler(source,name)}; run;`,{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None});
 const fn=runInNewContext(js,ctx);await fn(sol,name==="handleDescargarPdfPresupuestoHistorial"?pres:pres.id);
 return JSON.parse(JSON.stringify(events)) as unknown[][];
}
async function historicalRegression(){
 for(const name of ["handleEnviarPresupuesto","handleDescargarPdfPresupuestoHistorial","handleAceptarPresupuesto","handleRechazarPresupuesto"]){
  const current=await exercise(legacy,name,"pres_historical");const baseline=await exercise(baseValidaciones,name,"pres_historical");
  // Saving refreshes the timestamp, exactly as before; normalize only that generated field.
  for(const events of [current,baseline])for(const event of events){const payload=event[1] as {presupuestos?:{fecha:string}[]};for(const p of payload?.presupuestos??[])p.fecha="generated";}
  assert.deepEqual(current,baseline,name);assert.ok(current.length>0);
 }
 const start=await exercise(legacy,"handleEnviarPresupuesto",null);assert.deepEqual(start,[["redirect","/admin/presupuestos?sourceCollection=solicitudes_cuenta&solicitudId=sol-historical"]]);
 assert.deepEqual(await exercise(legacy,"handleAceptarPresupuesto",null,"BUDGET_V2"),[]);
 console.log("HISTORICAL_BUDGET_REGRESSION = PASS; NEW_LEGACY_BUDGET_CREATED_FROM_VALIDACIONES = NO; V2_LEGACY_ACCEPTANCE_HANDLER_BLOCKED = YES");
}
historicalRegression().catch(error=>{console.error(error);process.exitCode=1;});

// Contract selection may consume only an accepted historical budget, even in a mixed adversarial array.
const contractHandler=handler(legacy,"handleOpenContratoEditor");
assert.equal(contractHandler.replace('p.schemaVersion !== "BUDGET_V2" && ',""),handler(baseValidaciones,"handleOpenContratoEditor"));
assert.ok(contractHandler.includes('p.schemaVersion !== "BUDGET_V2" && p.estado === "Aceptado"'));
const acceptedSelection=contractHandler.match(/const acceptedBudget = (.+);/)?.[1];assert.ok(acceptedSelection);
const selectionJs=ts.transpile(`(${acceptedSelection})`,{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None});
const v2Accepted={id:"v2",schemaVersion:"BUDGET_V2",estado:"Aceptado"};const historicalAccepted={id:"legacy",estado:"Aceptado"};
assert.equal(runInNewContext(selectionJs,{sol:{presupuestos:[v2Accepted]}}),undefined);
assert.equal(runInNewContext(selectionJs,{sol:{presupuestos:[v2Accepted,historicalAccepted]}}).id,"legacy");
