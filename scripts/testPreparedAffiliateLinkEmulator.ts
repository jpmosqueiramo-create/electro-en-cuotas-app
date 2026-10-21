import './helpers/requireSafeEmulatorEnvironment';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {admin} from '../src/lib/firebaseAdmin';
import {ADMIN_EMAIL} from '../src/lib/adminIdentity';
import {p1Token} from './testPortalP1Emulator';
import {POST} from '../src/app/api/admin/vendedores/registro/route';
import type {AffiliateProfileInput} from '../src/lib/affiliateRegistryServer';
async function main(){
 const db=admin.firestore();let root;try{root=await admin.auth().getUserByEmail(ADMIN_EMAIL);}catch{root=await admin.auth().createUser({email:ADMIN_EMAIL,emailVerified:true});}
 const token=await p1Token(root),actor=await admin.auth().createUser({email:`prepared-${randomUUID()}@example.test`,emailVerified:true}),affiliateToken=await p1Token(actor);
 const payload:AffiliateProfileInput={preparedLink:true,id:randomUUID(),commandId:randomUUID(),expectedRevision:0,nombre:'Vendedor sintético preparado',email:actor.email!,localidad:'Localidad sintética',telefono:'',authUid:actor.uid,activo:true,porcentajeComision:10,reason:'Vinculación sintética sin retroactividad'};
 const call=(body:unknown,auth:string|undefined=token)=>POST(new Request('http://localhost/api/admin/vendedores/registro',{method:'POST',headers:{'Content-Type':'application/json',...(auth?{Authorization:'Bearer '+auth}:{})},body:JSON.stringify(body)}));
 const paths=(p:AffiliateProfileInput)=>[`vendedores/${p.id}`,`vendedores_configuraciones_comision/registry_${p.id}_${p.commandId}`,`vendedores/${p.id}/registryHistory/${p.commandId}`,`vendedores/${p.id}/registryCommands/${p.commandId}`];
 const historical=new Map<string,unknown>();for(const collection of ['vendedores','notificaciones','pagos_comisiones']){const ref=db.collection(collection).doc('protected-'+randomUUID());await ref.set({synthetic:true,estado:'INTOCABLE'});historical.set(ref.path,(await ref.get()).updateTime!.valueOf());}
 async function inventory(){const rows=new Map<string,unknown>();async function walk(parent:FirebaseFirestore.Firestore|FirebaseFirestore.DocumentReference){for(const col of await parent.listCollections())for(const doc of await col.listDocuments()){const s=await doc.get();if(s.exists)rows.set(doc.path,s.updateTime!.valueOf());await walk(doc);}}await walk(db);return rows;}
 const before=await inventory();assert.equal((await call({...payload,mode:'PREVIEW'})).status,200);assert.deepEqual(await inventory(),before);
 for(const body of [payload,{...payload,mode:'PREVIEW'}]){assert.equal((await call(body,'')).status,403);assert.equal((await call(body,affiliateToken)).status,403);}
 const start=Date.now(),responses=await Promise.all([call(payload),call(payload)]);for(const r of responses){assert.equal(r.status,200);assert.deepEqual(await r.json(),{id:payload.id,revision:1});}
 const after=await inventory(),created=[...after.keys()].filter(p=>!before.has(p)).sort();assert.deepEqual(created,paths(payload).sort());for(const [path,time]of before)assert.deepEqual(after.get(path),time);
 const snaps=await Promise.all(paths(payload).map(p=>db.doc(p).get())),data=snaps.map(s=>s.data()!);assert.equal(data[0].authUid,actor.uid);assert.equal(data[0].porcentajeComision,10);assert.equal(data[1].porcentajeComisionBasisPoints,1000);assert.equal(data[1].vigenteDesde,data[0].createdAt);assert(Date.parse(data[1].vigenteDesde)>=start);assert.equal(data[2].before,null);assert.equal(data[2].reason,payload.reason);assert.equal(data[3].digest.length,64);assert(snaps.every(s=>s.createTime!.isEqual(snaps[0].createTime!)));
 assert.equal((await call(payload)).status,200);assert.equal((await (await call({...payload,mode:'PREVIEW'})).json()).alreadyRegistered,true);assert.deepEqual(await inventory(),after);assert.equal((await call({...payload,nombre:'Contenido diferente'})).status,409);assert.deepEqual(await inventory(),after);
 assert.equal((await call({...payload,id:randomUUID(),commandId:randomUUID()})).status,409);
 for(const state of ['missing','disabled','unverified','email-mismatch'] as const){let uid='missing-'+randomUUID(),email=`${randomUUID()}@example.test`;if(state!=='missing'){const u=await admin.auth().createUser({email,emailVerified:state!=='unverified',disabled:state==='disabled'});uid=u.uid;if(state==='email-mismatch')email=`other-${randomUUID()}@example.test`;}
 const invalid={...payload,id:randomUUID(),commandId:randomUUID(),authUid:uid,email};assert.equal((await call({...invalid,mode:'PREVIEW'})).status,409);assert.equal((await call(invalid)).status,409);for(const path of paths(invalid))assert.equal((await db.doc(path).get()).exists,false);}
 // A conflicting single destination must abort the entire write, not create a partial profile.
 const u=await admin.auth().createUser({email:`occupied-${randomUUID()}@example.test`,emailVerified:true}),occupied={...payload,id:randomUUID(),commandId:randomUUID(),authUid:u.uid,email:u.email!};await db.doc(paths(occupied)[2]).set({protected:true});const occupiedBefore=await inventory();assert.equal((await call(occupied)).status,409);assert.deepEqual(await inventory(),occupiedBefore);
 const emailUser=await admin.auth().createUser({email:`email-conflict-${randomUUID()}@example.test`,emailVerified:true});await db.collection('vendedores').doc('email-conflict-'+randomUUID()).set({email:emailUser.email,authUid:'',activo:true});const emailConflict={...payload,id:randomUUID(),commandId:randomUUID(),authUid:emailUser.uid,email:emailUser.email!},emailBefore=await inventory();assert.equal((await call({...emailConflict,mode:'PREVIEW'})).status,409);assert.equal((await call(emailConflict)).status,409);assert.deepEqual(await inventory(),emailBefore);
 for(const [path,time]of historical)assert.deepEqual((await db.doc(path).get()).updateTime!.valueOf(),time);
 console.log('PREPARED_LINK_EMULATOR=PASS; EXACT_IDS=PASS; ATOMIC_FOUR=PASS; PREVIEW_WRITES=0; CONCURRENT_REPLAY=PASS; CONFLICT=PASS; LINKED_UID=DENIED; MISSING_DISABLED_UNVERIFIED_MISMATCH=DENIED; AFFILIATE_ANONYMOUS=403; HISTORY_UNCHANGED=PASS; PRODUCTION_WRITES=0');
}
main().then(()=>admin.app().delete()).catch(e=>{console.error(e);process.exitCode=1;});
