import './helpers/requireSafeEmulatorEnvironment';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {admin} from '../src/lib/firebaseAdmin';
import {GET} from '../src/app/api/admin/solicitudes/route';
import {loadAuthorizedRequestPage,mergeAuthorizedRequestPages,AdministrativeRequestAccessError} from '../src/lib/adminSolicitudesHttpReader';
import {mapSolicitudCuentaToAdminReadModel} from '../src/lib/adminSolicitudesReadModel';
async function main(){
 assert.equal(process.env.GCLOUD_PROJECT,'demo-cuenta-hogar');assert.equal(process.env.NEXT_PUBLIC_ADMIN_EMAIL,'production-review-admin@example.test');
 const db=admin.firestore(),prefix=randomUUID(),timestamp=admin.firestore.Timestamp.fromMillis(Date.parse('2026-01-02T12:00:00Z'));
 assert.equal((await db.collection('solicitudes_cuenta').get()).size,0,'Fresh requests required');
 const batch=db.batch();for(let i=0;i<103;i++)batch.create(db.collection('solicitudes_cuenta').doc(prefix+'-'+String(i).padStart(3,'0')),{nombre:'Persona sintética '+i,fecha:timestamp,localidad:'Localidad de prueba',necesidad:'Producto ficticio'});await batch.commit();
 const prior=await db.collection('solicitudes_cuenta').get();
 let owner;try{owner=await admin.auth().getUserByEmail(process.env.NEXT_PUBLIC_ADMIN_EMAIL!);}catch{owner=await admin.auth().createUser({email:process.env.NEXT_PUBLIC_ADMIN_EMAIL,emailVerified:true});}
 const outsider=await admin.auth().createUser({email:prefix+'@example.test',emailVerified:true});
 async function token(uid:string){const custom=await admin.auth().createCustomToken(uid);const r=await fetch('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=demo-key',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token:custom,returnSecureToken:true})});assert.equal(r.status,200);return (await r.json()).idToken as string;}
 const t=await token(owner.uid),o=await token(outsider.uid);
 const request=(query:string,auth?:string)=>new Request('http://localhost/api/admin/solicitudes?'+query,{headers:auth?{Authorization:'Bearer '+auth}:{}});
 assert.equal((await GET(request('source=solicitudes_cuenta'))).status,401);assert.equal((await GET(request('source=solicitudes_cuenta',o))).status,403);
 assert.equal((await GET(request('source=vendedores',t))).status,400);assert.equal((await GET(request('source=solicitudes_cuenta&cursor=a%2Fb',t))).status,400);
 const page1=await GET(request('source=solicitudes_cuenta',t));assert.equal(page1.status,200);assert.equal(page1.headers.get('Cache-Control'),'private, no-store');const p1=await page1.json();assert.equal(p1.items.length,100);assert(p1.nextCursor);assert.equal(p1.items[0].fechaCreacion,'2026-01-02T12:00:00.000Z');
 const p2=await (await GET(request('source=solicitudes_cuenta&cursor='+encodeURIComponent(p1.nextCursor),t))).json();assert.equal(p2.items.length,3);assert.equal(p2.nextCursor,null);assert.equal(new Set([...p1.items,...p2.items].map(i=>i.recordKey)).size,103);
 for(const doc of prior.docs){const after=await doc.ref.get();assert(after.updateTime!.isEqual(doc.updateTime!));assert(after.data()!.fecha instanceof admin.firestore.Timestamp);}
 const originalFetch=global.fetch,item=mapSolicitudCuentaToAdminReadModel('synthetic','nombre');
 try{
  global.fetch=async input=>String(input).includes('source=solicitudes_cuenta')?new Response(JSON.stringify({items:[item],nextCursor:'cursor-1'}),{status:200}):new Response('{}',{status:503});
  const first=await loadAuthorizedRequestPage({getIdToken:async()=>t});assert.equal(first.items.length,1);assert.equal(first.loadedSources.length,1);assert(first.errors.solicitudes);assert(first.cursors.solicitudes_cuenta);
  global.fetch=async()=>new Response('{}',{status:503});const failed=await loadAuthorizedRequestPage({getIdToken:async()=>t},first.cursors),merged=mergeAuthorizedRequestPages(first,failed);assert.equal(merged.items.length,1);assert.equal(merged.cursors.solicitudes_cuenta,'cursor-1');
  global.fetch=async()=>new Response('{}',{status:403});await assert.rejects(loadAuthorizedRequestPage({getIdToken:async()=>t}),AdministrativeRequestAccessError);
 }finally{global.fetch=originalFetch;}
 console.log('ADMIN_REQUESTS_AUTH_PAGINATION_DATES_READONLY_PARTIAL_FAILURE_REVOCATION=PASS (10 checks); PRODUCTION_WRITES=0');
}
main().then(()=>admin.app().delete()).catch(e=>{console.error(e);process.exitCode=1;});
