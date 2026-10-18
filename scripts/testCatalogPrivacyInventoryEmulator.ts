import "./helpers/requireSafeEmulatorEnvironment";
import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import { admin } from "../src/lib/firebaseAdmin";
import { readCatalogPrivacyInventory } from "../src/lib/catalogPrivacyInventory";
import { privacyFixtures } from "./helpers/catalogPrivacyFixtures";
async function run(){
 const db=admin.firestore();const fixture=privacyFixtures();
 for(const entry of fixture.privateDocs)await db.collection("productos").doc(entry.id).set(entry.data);
 for(const entry of fixture.publicDocs)await db.collection("catalogo_publico").doc(entry.id).set(entry.data);
 const before=await Promise.all([db.collection("productos").get(),db.collection("catalogo_publico").get()]);
 const versions=before.map(snap=>snap.docs.map(doc=>({id:doc.id,data:doc.data(),updateTime:doc.updateTime.toMillis()})));
 let writes=0;const original=db.collection.bind(db);
 db.collection=function(name:string){assert.ok(["productos","catalogo_publico"].includes(name));const collection=original(name);
  return new Proxy(collection,{get(target,key){if(key==="doc")return (id:string)=>{const reference=target.doc(id);return new Proxy(reference,{get(ref,method){if(["set","create","update","delete"].includes(String(method)))return ()=>{writes++;throw new Error("DRY_RUN_WRITE_ATTEMPT");};const value=Reflect.get(ref,method);return typeof value==="function"?value.bind(ref):value;}});};const value=Reflect.get(target,key);return typeof value==="function"?value.bind(target):value;}});
 };
 try{
  const a=await readCatalogPrivacyInventory(db),b=await readCatalogPrivacyInventory(db);assert.deepEqual(a,b);assert.equal(writes,0);
  assert.deepEqual(a.summary.counts,{READY_NEW:1,READY_UPDATE:1,ALREADY_CURRENT:2,NOT_ELIGIBLE:1,INVALID_PRIVATE:1,PUBLIC_ORPHAN:1,PUBLIC_MALFORMED:1,IDENTITY_CONFLICT:1,REVIEW_REQUIRED:2});
  const after=await Promise.all([db.collection("productos").get(),db.collection("catalogo_publico").get()]);
  assert.deepEqual(after.map(snap=>snap.docs.map(doc=>({id:doc.id,data:doc.data(),updateTime:doc.updateTime.toMillis()}))),versions);
  writeFileSync("/tmp/cuenta-hogar-c5a-inventory-emulator.json",JSON.stringify(a.summary,null,2));
  console.log("C5A_EMULATOR_TESTS = PASS; WRITES_AFTER_SETUP = 0; PRIVATE_DOCUMENTS_UNCHANGED = YES; PUBLIC_DOCUMENTS_UNCHANGED = YES");console.log(JSON.stringify(a.summary.counts));
 }finally{db.collection=original;}
}
run().catch(error=>{console.error(error);process.exitCode=1;}).finally(async()=>{await Promise.all(admin.apps.map(app=>app?.delete()));});
