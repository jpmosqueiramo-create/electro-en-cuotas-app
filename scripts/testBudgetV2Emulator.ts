import "./helpers/requireSafeEmulatorEnvironment";
import assert from "node:assert/strict";
import { admin } from "../src/lib/firebaseAdmin";
import { persistBudgetV2, privateBudgetReferenceId, type BudgetCommandV2 } from "../src/lib/budgetV2Persistence";
import { budgetFixture } from "./helpers/budgetV2Fixtures";
async function main(){
 const db=admin.firestore();await db.doc("solicitudes/p3-shared-id").set({clienteEmail:"demo@example.invalid",estado:"PENDIENTE"});await db.doc("solicitudes_cuenta/p3-shared-id").set({estado:"Pendiente"});
 const run=(cmd:BudgetCommandV2)=>persistBudgetV2(db,cmd,"demo-admin");let seq=0;
 const command=(budget=budgetFixture(`p3-${process.pid}-${seq++}`),privateOptionIds:string[]=[])=>({action:"SAVE" as const,commandId:`cmd-${seq++}`,budget,expectedRevision:budget.revision,privateOptionIds});
 const before=(await db.collection("productos").get()).size;const publicBefore=(await db.collection("catalogo_publico").get()).size;
 const c=command();let saved=await run(c);assert.equal((await db.collection("productos").get()).size,before);assert.deepEqual(await run(c),saved);
 const privateCommand=command(budgetFixture(`private-${process.pid}`),["option-0"]);const stored=await run(privateCommand);const ref=db.doc(`productos/${privateBudgetReferenceId(stored.id,"option-0")}`);
 assert.equal((await ref.get()).data()!.activo,false);assert.equal((await ref.get()).data()!.publicado,false);assert.equal((await db.collection("productos").get()).size,before+1);
 await ref.update({nombre:"Editada después",stock:[{id:"preservar"}]});await run(privateCommand);assert.equal((await ref.get()).data()!.nombre,"Editada después");
 const reuse=command(stored,["option-0"]);await run(reuse);assert.equal((await ref.get()).data()!.nombre,"Editada después");assert.deepEqual((await ref.get()).data()!.stock,[{id:"preservar"}]);
 assert.equal(stored.options[0].referenceSnapshot.planesOfrecidos[1].cuotaEstimada,145000);
 const collision=command(budgetFixture(`collision-${process.pid}`),["option-0"]);await db.doc(`productos/${privateBudgetReferenceId(collision.budget.id,"option-0")}`).set({nombre:"Referencia privada de otro origen",costoProveedor:580000,activo:false,publicado:false,originBudgetId:"foreign"});await assert.rejects(()=>run(collision),/Colisión/);
 assert.equal((await db.collection("catalogo_publico").get()).size,publicBefore);
 const issue:BudgetCommandV2={...command(saved),action:"ISSUE"};saved=await run(issue);const original=structuredClone(saved);assert.equal(saved.estado,"EMITIDO");await assert.rejects(()=>run(command(saved)),/inmutable/);
 assert.deepEqual((await db.doc(`presupuestos_v2/${saved.id}/versions/1`).get()).data(),original);
 const reviewCmd:BudgetCommandV2={...command(saved),action:"REVISE"};const review=await run(reviewCmd);assert.equal(review.version,2);assert.equal(review.estado,"GENERADO");assert.deepEqual(await run(reviewCmd),review);assert.deepEqual((await db.doc(`presupuestos_v2/${saved.id}/versions/1`).get()).data(),original);
 const edits=await Promise.allSettled([run(command(review)),run(command(review))]);assert.equal(edits.filter(r=>r.status==="fulfilled").length,1);assert.equal(edits.filter(r=>r.status==="rejected").length,1);
 const other=command();await run(other);assert.equal((await db.doc(`presupuestos_v2/${other.budget.id}/versions/1`).get()).exists,true);
 const wrong=command({...review,sourceCollection:"solicitudes_cuenta"});await assert.rejects(()=>run(wrong),/origen/);
 const source=await db.doc("solicitudes/p3-shared-id").get();assert.equal(source.data()!.presupuestos,undefined);assert.equal(source.data()!.estado,"PENDIENTE");
 console.log("P3_PERSISTENCE_EMULATOR = PASS; P3_IMMUTABILITY_TESTS = PASS; PRIVATE_REFERENCE_IDEMPOTENT = YES; PRIVATE_REFERENCE_AUTOPUBLISH = NO");
 await admin.app().delete();
}
main().catch(e=>{console.error(e);process.exitCode=1;});
