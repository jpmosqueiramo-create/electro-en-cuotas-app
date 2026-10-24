import './helpers/requireSafeEmulatorEnvironment';
import { syntheticPreviewConformity } from './helpers/previewConformityFixture';
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';
import { admin } from '../src/lib/firebaseAdmin';
import { pendingBulletPreviewFixture } from './helpers/operationPreviewFixtures';
import { contractRefs } from '../src/lib/contractV2Server';
import { GET } from '../src/app/api/admin/presupuestos-v2/[budgetId]/versions/[version]/contract/documents/preview/route';
async function main(){
 const db=admin.firestore(),id='preview-409-'+Date.now(),{budget:b,acceptance:a,draft:d}=pendingBulletPreviewFixture(id),refs=contractRefs(db,id,1);
 d.personalData.fullName=b.clienteSnapshot.nombre;
 await refs.budget.create(b);await refs.acceptance.create(a);await refs.draft.create(d);
 let auth=await fetch('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:process.env.NEXT_PUBLIC_ADMIN_EMAIL,password:'Synthetic-only-582!',returnSecureToken:true})});
 if(!auth.ok)auth=await fetch('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=demo',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:process.env.NEXT_PUBLIC_ADMIN_EMAIL,password:'Synthetic-only-582!',returnSecureToken:true})});
 const {idToken}=await auth.json();assert.ok(idToken);
 const ctx={params:Promise.resolve({budgetId:id,version:'1'})},uri=`http://localhost:3000/api/admin/presupuestos-v2/${id}/versions/1/contract/documents/preview`;
 const call=async()=>GET(new NextRequest(uri,{headers:{Authorization:'Bearer '+idToken}}),ctx);
 const before=async()=>Promise.all([refs.budget.get(),refs.acceptance.get(),refs.draft.get()]).then(s=>s.map(x=>x.updateTime));
 const missing=await (await call()).json();assert.equal(missing.available,false);assert.equal(missing.code,'DOCUMENT_CONFORMITY_PENDING');assert.ok(!missing.promissoryNote);
 d.personalData.province='06';d.personalData.postalCode='6070';await refs.draft.set(d);
 await refs.draft.collection('conformity').doc('current').create(syntheticPreviewConformity(d));
 const unchanged=await before();const first=await call();assert.equal(first.status,200);const pair=await first.json();assert.equal(pair.code,'DOCUMENT_DATA_PENDING');assert.equal(pair.available,true);assert.equal(pair.projection.economics,null);assert.deepEqual(pair.projection.schedule,[]);
 const retry=await (await call()).json();assert.equal(retry.mandate.sha256,pair.mandate.sha256);assert.equal(retry.promissoryNote.sha256,pair.promissoryNote.sha256);assert.deepEqual(await before(),unchanged);
 await refs.draft.collection('conformity').doc('current').set({confirmedDigest:null});const conformity=await (await call()).json();assert.equal(conformity.available,false);assert.equal(conformity.code,'DOCUMENT_CONFORMITY_PENDING');assert.ok(!conformity.mandate);
 // Preserve this record; test identity with a separate operation rather than deleting evidence.
 const second=pendingBulletPreviewFixture(id+'-identity'),r2=contractRefs(db,second.budget.id,1);second.draft.personalData.fullName='Identidad distinta sintética';await r2.budget.create(second.budget);await r2.acceptance.create(second.acceptance);await r2.draft.create(second.draft);
 const identity=await GET(new NextRequest(uri,{headers:{Authorization:'Bearer '+idToken}}),{params:Promise.resolve({budgetId:second.budget.id,version:'1'})});const blocked=await identity.json();assert.equal(blocked.code,'DOCUMENT_IDENTITY_REVIEW_REQUIRED');assert.equal(blocked.available,false);
 // Typed server failures must never expose exception strings or personal fields.
 await refs.draft.update({acceptedOptionId:'inconsistent-option'});const origin=await call();assert.equal(origin.status,409);assert.deepEqual(Object.keys(await origin.json()).sort(),['code','error']);
 await refs.draft.update({acceptedOptionId:d.acceptedOptionId});
 const invalid=pendingBulletPreviewFixture(id+'-render'),r3=contractRefs(db,invalid.budget.id,1);
 invalid.draft.personalData.fullName=invalid.budget.clienteSnapshot.nombre;
 invalid.draft.personalData.address='Domicilio sintético 🧪';invalid.draft.personalData.province='06';invalid.draft.personalData.postalCode='6070';await r3.budget.create(invalid.budget);await r3.acceptance.create(invalid.acceptance);await r3.draft.create(invalid.draft);await r3.draft.collection('conformity').doc('current').create(syntheticPreviewConformity(invalid.draft));
 const render=await GET(new NextRequest(uri,{headers:{Authorization:'Bearer '+idToken}}),{params:Promise.resolve({budgetId:invalid.budget.id,version:'1'})});assert.equal(render.status,500);const failure=await render.json();assert.equal(failure.code,'DOCUMENT_RENDER_FAILED');assert.ok(!JSON.stringify(failure).includes('Domicilio sintético'));assert.ok(!JSON.stringify(failure).includes('UNSUPPORTED_TEXT'));
 assert.equal((await db.collection('contractNumberingV2').get()).size,0);assert.equal((await db.collection('contractSnapshotsV2').get()).size,0);
 console.log('PREVIEW_409_HTTP_EMULATOR=PASS; 200_PENDING_WITH_TWO_PDFS; IDENTICAL_RETRY_NO_WRITES; IDENTITY_CONFORMITY_CODES; 409_ORIGIN; 500_RENDER; PRIVATE_ERRORS; ZERO_PRODUCTION_WRITES');await admin.app().delete();
}
main().catch(e=>{console.error(e);process.exitCode=1;});
