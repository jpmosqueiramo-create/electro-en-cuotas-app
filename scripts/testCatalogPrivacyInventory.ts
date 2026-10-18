import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { inventoryCatalog,inventoryPlanIdentity,sensitiveFieldCount } from "../src/lib/catalogPrivacyInventory";
import { parseCatalogBackfillOptions,assertCatalogInventoryEnvironment } from "../src/lib/catalogBackfillPolicy";
import { privacyFixtures } from "./helpers/catalogPrivacyFixtures";

const fixtures=privacyFixtures();const result=inventoryCatalog(fixtures.privateDocs,fixtures.publicDocs);
assert.deepEqual(result.summary.counts,{READY_NEW:1,READY_UPDATE:1,ALREADY_CURRENT:2,NOT_ELIGIBLE:1,INVALID_PRIVATE:1,PUBLIC_ORPHAN:1,PUBLIC_MALFORMED:1,IDENTITY_CONFLICT:1,REVIEW_REQUIRED:2});
assert.equal(result.summary.rows.length,11);assert.equal(result.plan.length,2);
assert.deepEqual(result,inventoryCatalog([...fixtures.privateDocs].reverse(),[...fixtures.publicDocs].reverse()));
assert.equal(inventoryPlanIdentity(result.plan),inventoryPlanIdentity(inventoryCatalog(fixtures.privateDocs,fixtures.publicDocs).plan));
assert.equal(result.summary.dryRunSensitiveFieldLeaks,0);assert.equal(sensitiveFieldCount(result.plan.map(entry=>entry.dto)),0);
assert.equal(sensitiveFieldCount({plans:[{factor:3}],stock:[]}),2);
for(const entry of result.plan){assert.equal(entry.dto.referenciaId,entry.referenciaId);assert.equal(entry.dto.planesPublicados[0].cuotaEstimada,145000);assert.ok(entry.dto.planesPublicados.every(plan=>plan.cuotas>=1&&plan.cuotas<=18));}
const summary=JSON.stringify(result.summary);for(const secret of ["PRIVATE_PROVIDER_SECRET","PRIVATE_SKU_SECRET","PRIVATE_EAN_SECRET","580000"])assert.ok(!summary.includes(secret));
for(const stock of [[],0,[{nserie:"PRIVATE_SERIAL_SECRET"}]]){
 const doc={...fixtures.privateDocs[0],data:{...fixtures.privateDocs[0].data,stock}};
 assert.equal(inventoryCatalog([doc],[]).summary.counts.READY_NEW,1);
}
const env={GCLOUD_PROJECT:"demo-cuenta-hogar",NEXT_PUBLIC_FIREBASE_PROJECT_ID:"demo-cuenta-hogar",FIRESTORE_EMULATOR_HOST:"127.0.0.1:8080",FIREBASE_AUTH_EMULATOR_HOST:"127.0.0.1:9099"};
const opts=parseCatalogBackfillOptions(["--confirm-project","demo-cuenta-hogar"]);assert.equal(opts.mode,"dry-run");assert.equal(assertCatalogInventoryEnvironment(opts,env),"demo-cuenta-hogar");
assert.throws(()=>parseCatalogBackfillOptions([]),/EXPLICIT_PROJECT/);assert.throws(()=>parseCatalogBackfillOptions(["--unknown"]),/UNKNOWN/);
assert.throws(()=>parseCatalogBackfillOptions(["--apply","--dry-run","--confirm-project","demo-cuenta-hogar"]),/DUPLICATE/);
assert.throws(()=>assertCatalogInventoryEnvironment(parseCatalogBackfillOptions(["--apply","--confirm-project","demo-cuenta-hogar"]),env),/C5A_APPLY_DISABLED/);
assert.throws(()=>assertCatalogInventoryEnvironment({...opts,confirmProject:"negocio-facil-page"},env),/PRODUCTION/);
assert.throws(()=>assertCatalogInventoryEnvironment(opts,{...env,GCLOUD_PROJECT:"negocio-facil-page"}));
assert.throws(()=>assertCatalogInventoryEnvironment(opts,{...env,GOOGLE_APPLICATION_CREDENTIALS:"forbidden"}));
assert.throws(()=>assertCatalogInventoryEnvironment(opts,{...env,FIRESTORE_EMULATOR_HOST:"remote.example:8080"}));
const malformed=inventoryCatalog([], [{id:"orphan-bad",data:{referenciaId:"orphan-bad",publicado:true,schemaVersion:1,costoProveedor:1}}]);assert.equal(malformed.summary.counts.PUBLIC_MALFORMED,1);
const identity=inventoryCatalog([{id:"id",data:{referenciaId:"other"}}],[]);assert.equal(identity.summary.counts.IDENTITY_CONFLICT,1);
assert.throws(()=>inventoryCatalog([fixtures.privateDocs[0],fixtures.privateDocs[0]],[]),/DUPLICATE/);
const patch=readFileSync("docs/CATALOGO_REFERENCIAS_RULES_C5B_PROPOSED.patch","utf8");assert.ok(patch.includes('+      allow read, write: if collection != "catalogo_publico" && isAdmin();'));assert.ok(patch.includes('+      allow write: if false;'));
console.log("C5A_PURE_TESTS = PASS; DRY_RUN_SENSITIVE_FIELD_LEAKS = 0; APPLY_EXECUTED = NO");
