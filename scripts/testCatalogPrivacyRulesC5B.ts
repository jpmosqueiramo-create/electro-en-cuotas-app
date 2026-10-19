import "./helpers/requireSafeEmulatorEnvironment";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

/** C5B-3A: exige Rules exactas previamente cargadas sólo en Emulator. */
async function main(){
  const plan=JSON.parse(readFileSync("docs/CATALOGO_REFERENCIAS_RULES_C5B_PLAN.json","utf8")) as {expectedRulesSha256:string};
  const actual=createHash("sha256").update(readFileSync("firestore.rules")).digest("hex");
  if(actual!==plan.expectedRulesSha256)throw new Error("C5B_RULES_NOT_APPLIED_TEST_NOT_AUTHORIZED_IN_C5A");
  const {admin}=await import("../src/lib/firebaseAdmin");
  const {previewCatalogReferencePublication,publishCatalogReference}=await import("../src/lib/catalogPublicationService");
  const db=admin.firestore(),prefix=`c5b-rules-${process.pid}`;
  const base="http://127.0.0.1:8080/v1/projects/demo-cuenta-hogar/databases/(default)/documents";
  try{
    const valid={nombre:"Referencia futura",descripcion:"Gestión de compra",imagenUrls:["/logo-cuenta-hogar-oficial.png"],costoProveedor:580000,factoresPlanes:{12:3},planesActivos:{12:true},activo:false,publicado:false};
    await db.doc(`productos/${prefix}`).set(valid);
    await db.doc(`productos/${prefix}/unidades/unit`).set({nserie:"PRIVATE_FIXTURE"});
    const candidate=await previewCatalogReferencePublication(db,prefix);assert.ok(candidate.fingerprint);
    await publishCatalogReference(db,prefix,candidate.fingerprint!);
    await db.doc(`catalogo_publico/${prefix}-hidden`).set({referenciaId:`${prefix}-hidden`,publicado:false,schemaVersion:1});
    await db.doc(`catalogo_publico/${prefix}/unidades/unit`).set({fixture:true});
    const emails=["",`${prefix}-client@example.test`,`${prefix}-seller@example.test`,"jpmosqueiramo@gmail.com"];
    const tokens=[""];
    for(const email of emails.slice(1)){
      const password="C5BDemoOnly123!";
      try{await admin.auth().createUser({email,password,emailVerified:true});}catch(error){if((error as {code?:string}).code!=="auth/email-already-exists")throw error;const user=await admin.auth().getUserByEmail(email);await admin.auth().updateUser(user.uid,{password});}
      const response=await fetch("http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=demo-key",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email,password,returnSecureToken:true})});assert.equal(response.status,200);tokens.push((await response.json()).idToken);
    }
    async function rest(method:string,path:string,token:string,body?:unknown){return fetch(base+path,{method,headers:{...(token?{Authorization:`Bearer ${token}`}:{"X-Test-Anonymous":"true"}),...(body?{"Content-Type":"application/json"}:{})},...(body?{body:JSON.stringify(body)}:{})});}
    for(const [index,token] of tokens.entries()){
      const isAdmin=index===3;
      const role=["anonymous","client","affiliate","admin"][index];
      assert.equal((await rest("GET",`/productos/${prefix}`,token)).status,isAdmin?200:403,`${role}: product GET`);
      assert.equal((await rest("GET","/productos",token)).status,isAdmin?200:403,`${role}: product LIST`);
      assert.equal((await rest("GET",`/productos/${prefix}/unidades`,token)).status,isAdmin?200:403,`${role}: product subcollection LIST`);
      for(const method of ["GET","PATCH","DELETE"]){
        assert.equal((await rest(method,`/catalogo_publico/${prefix}/unidades/unit`,token,method==="PATCH"?{fields:{fixture:{booleanValue:true}}}:undefined)).status,403,`${role}: public subcollection ${method}`);
      }
      assert.equal((await rest("GET",`/catalogo_publico/${prefix}/unidades`,token)).status,403,`${role}: public subcollection LIST`);
      assert.equal((await rest("POST",":runQuery",token,{structuredQuery:{from:[{collectionId:"catalogo_publico"}]}})).status,isAdmin?200:403,`${role}: unfiltered public query`);
      assert.equal((await rest("GET","/catalogo_publico",token)).status,isAdmin?200:403,`${role}: public LIST`);
      assert.equal((await rest("GET",`/productos/${prefix}/unidades/unit`,token)).status,isAdmin?200:403);
      assert.equal((await rest("GET",`/catalogo_publico/${prefix}`,token)).status,200);
      assert.equal((await rest("GET",`/catalogo_publico/${prefix}-hidden`,token)).status,isAdmin?200:403);
      assert.equal((await rest("PATCH",`/productos/${prefix}`,token,{fields:{nombre:{stringValue:"Edición privada"}}})).status,isAdmin?200:403);
      for(const [method,path,body] of [["PATCH",`/catalogo_publico/${prefix}`,{fields:{publicado:{booleanValue:true}}}],["PATCH",`/catalogo_publico/${prefix}-new`,{fields:{publicado:{booleanValue:true}}}],["DELETE",`/catalogo_publico/${prefix}`,undefined]] as const)assert.equal((await rest(method,path,token,body)).status,403);
      const query={structuredQuery:{from:[{collectionId:"catalogo_publico"}],where:{fieldFilter:{field:{fieldPath:"publicado"},op:"EQUAL",value:{booleanValue:true}}}}};
      assert.equal((await rest("POST",":runQuery",token,query)).status,200);
      assert.equal((await rest("POST",":runQuery",token,{structuredQuery:{from:[{collectionId:"productos"}]}})).status,isAdmin?200:403);
      assert.equal((await rest("POST",":runQuery",token,{structuredQuery:{from:[{collectionId:"productos"}],where:{fieldFilter:{field:{fieldPath:"nombre"},op:"EQUAL",value:{stringValue:"Edición privada"}}}}})).status,isAdmin?200:403,`${role}: filtered product query`);
      assert.equal((await rest("PATCH",`/productos/${prefix}/unidades/new-${index}`,token,{fields:{fixture:{booleanValue:true}}})).status,isAdmin?200:403,`${role}: private subcollection write`);
    }
    // Regresión de colecciones ajenas: matriz completa de roles y operaciones.
    const privateCollections=["vendedores","solicitudes","solicitudes_cuenta","alertas_admin","arrepentimientos","solicitudes_localidad","liquidaciones_comision","ledger_custodia_efectivo","ledger_comisiones_movimientos","rendiciones_efectivo","ledger_movimientos","ledger_imputaciones","idempotencia_ledger","ledger_operaciones","pagos_informados","configuracion_general","vendedores_configuraciones_comision","snapshots_comision_operaciones"];
    for(const collection of privateCollections){
      await db.doc(`${collection}/${prefix}`).set({fixture:true});
      for(const [index,token] of tokens.entries()){
        const expected=index===3?200:403;
        assert.equal((await rest("GET",`/${collection}/${prefix}`,token)).status,expected,`${collection}: read role ${index}`);
        assert.equal((await rest("PATCH",`/${collection}/${prefix}`,token,{fields:{fixture:{booleanValue:true}}})).status,expected,`${collection}: update role ${index}`);
        assert.equal((await rest("PATCH",`/${collection}/${prefix}-invalid-${index}`,token,{fields:{fixture:{booleanValue:true}}})).status,expected,`${collection}: arbitrary create role ${index}`);
        assert.equal((await rest("DELETE",`/${collection}/${prefix}`,token)).status,expected,`${collection}: delete role ${index}`);
      }
    }
    for(const config of ["draft_config","published_config"]){
      await db.doc(`shipping_settings/${config}`).set({fixture:true});
      for(const [index,token] of tokens.entries()){
        assert.equal((await rest("GET",`/shipping_settings/${config}`,token)).status,index===3||config==="published_config"?200:403);
        assert.equal((await rest("PATCH",`/shipping_settings/${config}`,token,{fields:{fixture:{booleanValue:true}}})).status,index===3?200:403);
      }
    }
    console.log("C5B_RULES_TESTS = PASS; ADMIN_BROWSER_PUBLIC_WRITES = DENY; ADMIN_SDK_PUBLICATION = PASS");
  }finally{await Promise.all(admin.apps.map(app=>app?.delete()));}
}
main().catch(error=>{console.error(error instanceof Error?error.message:"FUTURE_RULES_TEST_FAILED");process.exitCode=1;});
