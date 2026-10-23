import './helpers/requireSafeEmulatorEnvironment';
import assert from 'node:assert/strict';
import {NextRequest} from 'next/server';
import {admin} from '../src/lib/firebaseAdmin';
import {GET} from '../src/app/api/admin/presupuestos-v2/references/route';
async function run(){
 const db=admin.firestore();assert.equal((await db.collection('productos').get()).size,0,'Fresh Emulator required');
 const owner=await admin.auth().createUser({email:process.env.NEXT_PUBLIC_ADMIN_EMAIL!,emailVerified:true}),outsider=await admin.auth().createUser({email:'budget-reads-outsider@example.test',emailVerified:true});
 async function token(uid:string){const response=await fetch('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=demo',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token:await admin.auth().createCustomToken(uid),returnSecureToken:true})});assert.equal(response.status,200);return (await response.json()).idToken as string;}
 const auth=await token(owner.uid),other=await token(outsider.uid);
 const req=(q='',t?:string)=>new NextRequest('http://localhost:3000/api/admin/presupuestos-v2/references'+q,{headers:t?{Authorization:'Bearer '+t}:{}});
 assert.equal((await GET(req())).status,401);assert.equal((await GET(req('',other))).status,403);
 const batch=db.batch();for(let i=0;i<103;i++)batch.create(db.collection('productos').doc('synthetic-'+String(i).padStart(3,'0')),{nombre:'Referencia sintética '+i,fecha:admin.firestore.Timestamp.fromDate(new Date('2026-01-01'))});await batch.commit();
 const before=await db.collection('productos').get();
 const first=await GET(req('',auth));assert.equal(first.status,200);assert.equal(first.headers.get('cache-control'),'private, no-store');const a=await first.json();assert.equal(a.items.length,100);assert(a.nextCursor);
 const second=await GET(req('?cursor='+a.nextCursor,auth)),b=await second.json();assert.equal(second.status,200);assert.equal(b.items.length,3);assert.equal(b.nextCursor,null);assert.equal(new Set([...a.items,...b.items].map(i=>i.id)).size,103);
 for(const q of ['?cursor=','?cursor=x/y','?role=admin','?cursor=x&cursor=y'])assert.equal((await GET(req(q,auth))).status,400);
 await admin.auth().updateUser(owner.uid,{emailVerified:false});assert.equal((await GET(req('',auth))).status,403);
 // Disabled accounts are rejected by the existing token verifier before role checks (401).
 await admin.auth().updateUser(owner.uid,{emailVerified:true,disabled:true});assert.equal((await GET(req('',auth))).status,401);
 const after=await db.collection('productos').get();assert.equal(after.size,before.size);for(let i=0;i<before.size;i++)assert(before.docs[i].updateTime.isEqual(after.docs[i].updateTime));
 console.log('BUDGET_PRIVATE_REFERENCES_AUTH_PAGINATION_READ_ONLY=PASS; 103=100+3; PRODUCTION_WRITES=0');
}
run().then(()=>admin.app().delete()).catch(e=>{console.error(e);process.exitCode=1;});
