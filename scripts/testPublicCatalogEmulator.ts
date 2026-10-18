import "./helpers/requireSafeEmulatorEnvironment";
import assert from "node:assert/strict";
import { admin } from "../src/lib/firebaseAdmin";
import { GET as list } from "../src/app/api/catalogo/route";
import { GET as detail } from "../src/app/api/catalogo/[id]/route";
import { publicFixture, publicSensitivePaths } from "./helpers/catalogC4Fixtures";
async function run(){
  const db=admin.firestore();const prefix=`c4-api-${process.pid}`;
  const docs=[publicFixture(`${prefix}-z`,"Zeta"), publicFixture(`${prefix}-a`,"Álfa"),publicFixture(`${prefix}-b`,"alfa")];
  let writes=0;
  for(const dto of docs){await db.collection("catalogo_publico").doc(dto.referenciaId).set({...dto,costoProveedor:580000,stock:[],proveedor:"SECRET"});writes++;}
  await db.collection("catalogo_publico").doc(`${prefix}-hidden`).set({...publicFixture(`${prefix}-hidden`),publicado:false});writes++;
  await db.collection("catalogo_publico").doc(`${prefix}-bad`).set({...publicFixture(`${prefix}-bad`),planesPublicados:[{cuotas:24,cuotaEstimada:1}]});writes++;
  // Única ficha privada necesaria para la prueba explícita de ausencia de fallback.
  await db.collection("productos").doc(`${prefix}-private-only`).set({nombre:"PRIVATE NEVER PUBLIC",costoProveedor:580000});
  const original=db.collection.bind(db);const reads:string[]=[];
  db.collection=function(name:string){reads.push(name);assert.equal(name,"catalogo_publico","Lector público consultó colección privada");return original(name);};
  try {
    const response=await list();assert.equal(response.status,200);assert.equal(response.headers.get("Cache-Control"),"no-store");
    const body=await response.json();assert.deepEqual(publicSensitivePaths(body),[]);
    assert.deepEqual(body.items.filter((x:{referenciaId:string})=>x.referenciaId.startsWith(prefix)).map((x:{referenciaId:string})=>x.referenciaId),[docs[1].referenciaId,docs[2].referenciaId,docs[0].referenciaId]);
    const get=(id:string)=>detail(new Request("http://localhost/api/catalogo/"+encodeURIComponent(id)),{params:Promise.resolve({id})});
    const ok=await get(docs[0].referenciaId);assert.equal(ok.status,200);assert.deepEqual(publicSensitivePaths(await ok.json()),[]);
    for(const suffix of ["hidden","bad","missing","private-only"])assert.equal((await get(`${prefix}-${suffix}`)).status,404);
    assert.equal((await get("../invalid")).status,400);assert.ok(reads.length>0);assert.equal(reads.filter(x=>x==="productos").length,0);
    console.log(`C4_EMULATOR_TESTS = PASS; PUBLIC_API_SENSITIVE_FIELD_LEAKS = 0; PUBLIC_READER_PRIVATE_PRODUCTS_READS = 0; EMULATOR_PUBLIC_CATALOG_WRITES = ${writes}; EMULATOR_PRODUCTS_WRITES = 1 (fixture de ausencia de fallback); EMULATOR_OTHER_WRITES = 0`);
  } finally {db.collection=original;}
}
run().catch(error=>{console.error(error);process.exitCode=1;}).finally(async()=>{await Promise.all(admin.apps.map(app=>app?.delete()));});
