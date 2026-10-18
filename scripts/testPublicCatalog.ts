import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parsePublicCatalogReference, isPublicReferenceId, publicCatalogSelection, selectPublishedPlan } from "../src/lib/publicCatalogContract";
import { publicFixture, publicSensitivePaths, forbiddenPublicKeys } from "./helpers/catalogC4Fixtures";
import { fetchPublicCatalog, fetchPublicCatalogReference } from "../src/lib/publicCatalogClient";

async function run() {
  const dto = publicFixture();
  assert.deepEqual(parsePublicCatalogReference(dto.referenciaId,dto),dto);
  const contaminated = { ...dto, ...Object.fromEntries([...forbiddenPublicKeys].map(key => [key,"SECRET"])), planesPublicados: dto.planesPublicados.map(plan => ({...plan, factor: 3, stock: []})) };
  assert.deepEqual(parsePublicCatalogReference(dto.referenciaId,contaminated),dto);
  assert.deepEqual(publicSensitivePaths(parsePublicCatalogReference(dto.referenciaId,contaminated)),[]);
  for (const patch of [{referenciaId:"other"},{publicado:false},{schemaVersion:2},{nombre:" "},{descripcion:1},{imagenUrls:[]},{imagenUrls:Array(5).fill("/logo.png")},{imagenUrls:[null]},{planesPublicados:[]}, {planesPublicados:[{cuotas:3,cuotaEstimada:1},{cuotas:3,cuotaEstimada:2}]}]) assert.equal(parsePublicCatalogReference(dto.referenciaId,{...dto,...patch}),null);
  for (const cuotas of [0,19,24,1.5,NaN]) assert.equal(parsePublicCatalogReference(dto.referenciaId,{...dto,planesPublicados:[{cuotas,cuotaEstimada:1}]}),null);
  for (const cuotaEstimada of [0,-1,NaN,Infinity,"42"]) assert.equal(parsePublicCatalogReference(dto.referenciaId,{...dto,planesPublicados:[{cuotas:3,cuotaEstimada}]}),null);
  for (const id of ["", " ","a/b","a\\b","..","__reserved__","x".repeat(1501)]) assert.equal(isPublicReferenceId(id),false);
  assert.equal(selectPublishedPlan(dto,"3"),"3");assert.equal(selectPublishedPlan(dto,"24"),"12");
  const no12={...dto,planesPublicados:[dto.planesPublicados[0]]};assert.equal(selectPublishedPlan(no12,"12"),"");
  assert.equal(publicCatalogSelection(dto,"3").montoCuota,42190);
  assert.deepEqual(Object.keys(publicCatalogSelection(dto,"12")).sort(),["montoCuota","planElegido","productoId","productoNombre"]);
  assert.throws(()=>publicCatalogSelection(no12,"12"));
  const consumers=["src/components/HomeTechCatalog.tsx","src/components/PublicCatalog.tsx","src/app/solicitar/page.tsx","src/app/cliente/page.tsx","src/app/afiliado/page.tsx"];
  for(const file of consumers){const source=readFileSync(file,"utf8");assert.ok(!/(?:collection|doc)\(db, ["']productos["']/.test(source),file);assert.ok(!/from ["'][^"']*(?:catalogManager|financialEngine|catalogPublicationService|firebase-admin)/.test(source),file);}
  assert.ok(!readFileSync("src/lib/publicCatalogReader.ts","utf8").includes('"productos"'));
  const original=globalThis.fetch;
  try {
    globalThis.fetch=async (_input,init)=>{ assert.equal(init?.cache,"no-store");return Response.json({items:[contaminated]});};
    assert.deepEqual(await fetchPublicCatalog(),[dto]);
    globalThis.fetch=async()=>Response.json({}, {status:404});assert.equal(await fetchPublicCatalogReference(dto.referenciaId),null);
    globalThis.fetch=async()=>Response.json({}, {status:500});await assert.rejects(()=>fetchPublicCatalog());
    globalThis.fetch=async()=>Response.json(contaminated);assert.deepEqual(await fetchPublicCatalogReference(dto.referenciaId),dto);
    globalThis.fetch=async()=>{throw new TypeError("Failed to fetch");};await assert.rejects(()=>fetchPublicCatalog(),/No pudimos cargar/);
    const controller=new AbortController();controller.abort();
    globalThis.fetch=async(_input,init)=>{init?.signal?.throwIfAborted();return Response.json({items:[]});};
    await assert.rejects(()=>fetchPublicCatalog(controller.signal));
  } finally {globalThis.fetch=original;}
  console.log("C4_PURE_TESTS = PASS; PUBLIC_API_SENSITIVE_FIELD_LEAKS = 0; NON_ADMIN_CATALOG_MANAGER_IMPORTS = 0");
}
run().catch(error=>{console.error(error);process.exitCode=1;});
