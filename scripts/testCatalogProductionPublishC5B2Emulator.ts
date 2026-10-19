import "./helpers/requireSafeEmulatorEnvironment";
import assert from "node:assert/strict";
import { admin } from "../src/lib/firebaseAdmin";
import { approvedIds, approvedReferences, assertC5B2Environment, assertStablePreflight, captureC5B2Inventory, excludedReference, executeC5B2Plan, publishApprovedC5B2Reference, verifyC5B2PostApply } from "./helpers/catalogProductionPublishC5B2";
async function main(){
  assertC5B2Environment("EMULATOR",process.env);
  const db=admin.firestore(); assert.equal(admin.app().options.projectId,"demo-cuenta-hogar");
  assert.equal((await db.collection("productos").get()).size,0,"FRESH_DEMO_REQUIRED");
  assert.equal((await db.collection("catalogo_publico").get()).size,0,"FRESH_DEMO_REQUIRED");
  for(const row of approvedReferences)await db.doc(`productos/${row.id}`).set({nombre:row.name,descripcion:"Fixture de gestión",imagenUrls:["/logo-cuenta-hogar-oficial.png"],costoProveedor:580000,proveedor:"PRIVATE_FIXTURE",planesActivos:Object.fromEntries(row.plans.map(plan=>[plan,true])),factoresPlanes:{8:2,12:3},stock:[]});
  await db.doc(`productos/${excludedReference}`).set({nombre:"HORNO ELECTRICO",activo:false,publicado:false});
  const first=await captureC5B2Inventory(db),second=await captureC5B2Inventory(db);
  const plan=assertStablePreflight(first,second),entry=plan.entries[0],ref=db.doc(`productos/${entry.referenciaId}`),original=(await ref.get()).data()!;
  // Cambio después del plan: primero se comprueba la guarda de updateTime.
  await ref.update({costoProveedor:600000});
  await assert.rejects(()=>publishApprovedC5B2Reference(db,entry,second.versions),/PRIVATE_VERSION_CHANGED/);
  // Con versión fresca pero fingerprint anterior, C2 debe rechazar contenido cambiado.
  const changed=await captureC5B2Inventory(db);
  await assert.rejects(()=>publishApprovedC5B2Reference(db,entry,changed.versions),/REFERENCE_CHANGED_SINCE_PREVIEW/);
  assert.equal((await db.collection("catalogo_publico").get()).size,0);
  await ref.set(original); // Fin del setup negativo: tomar baseline privado definitivo.
  const before=await captureC5B2Inventory(db),again=await captureC5B2Inventory(db),freshPlan=assertStablePreflight(before,again);
  assert.equal(freshPlan.planIdentity,plan.planIdentity);
  await assert.rejects(()=>publishApprovedC5B2Reference(db,{...entry,referenciaId:excludedReference},before.versions));
  const results:{referenciaId:string;status:string}[]=[];
  await executeC5B2Plan(db,freshPlan,before.versions,result=>results.push(result));
  assert.equal(results.length,6);assert.ok(results.every(row=>row.status==="PUBLISHED"));assert.deepEqual(results.map(row=>row.referenciaId),approvedIds);
  const verification=await verifyC5B2PostApply(db,freshPlan,before.versions); assert.equal(verification.privateProductsMutated,0);
  assert.equal((await db.doc(`catalogo_publico/${excludedReference}`).get()).exists,false);
  const publicBefore=await db.doc(`catalogo_publico/${entry.referenciaId}`).get();
  assert.equal((await publishApprovedC5B2Reference(db,entry,before.versions)).status,"ALREADY_CURRENT");
  assert.ok((await db.doc(`catalogo_publico/${entry.referenciaId}`).get()).updateTime!.isEqual(publicBefore.updateTime!));
  const replay:string[]=[];
  await assert.rejects(()=>executeC5B2Plan(db,freshPlan,before.versions,result=>replay.push(result.referenciaId)),/UNEXPECTED_ALREADY_CURRENT_STOP/);
  assert.deepEqual(replay,[entry.referenciaId]);
  // Proyección concurrente diferente nunca puede ser reemplazada por este executor.
  const pub=db.doc(`catalogo_publico/${entry.referenciaId}`);await pub.update({nombre:"Concurrent fixture"});
  const concurrent=await pub.get();
  await assert.rejects(()=>publishApprovedC5B2Reference(db,entry,before.versions),/CONCURRENT_PUBLIC_PROJECTION_CANNOT_REPLACE/);
  assert.ok((await pub.get()).updateTime!.isEqual(concurrent.updateTime!));
  assert.deepEqual((await captureC5B2Inventory(db)).versions,before.versions);
  console.log("C5B2_EMULATOR_TESTS = PASS; SIX_C2_PUBLICATIONS = PASS; FINGERPRINT_CONFLICT = PASS; REPLAY_IDEMPOTENT = PASS; FIRST_ERROR_STOP = PASS; SENSITIVE_FIELD_LEAKS = 0; PRIVATE_PRODUCTS_MUTATED_AFTER_SETUP = 0; EXCLUDED_REFERENCE_PUBLISHED = NO");
}
main().catch(()=>{console.error("C5B2_EMULATOR_TEST_FAILED");process.exitCode=1;}).finally(async()=>{await Promise.all(admin.apps.map(app=>app?.delete()));});
