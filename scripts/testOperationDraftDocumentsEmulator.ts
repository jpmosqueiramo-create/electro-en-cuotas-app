import './helpers/requireSafeEmulatorEnvironment';
import { syntheticPreviewConformity } from './helpers/previewConformityFixture';
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';
import { admin } from '../src/lib/firebaseAdmin';
import { infrastructureFixture } from './helpers/contractInfrastructureFixtures';
import { contractRefs,clientTermsDigest } from '../src/lib/contractV2Server';
import { readOperationDraftDocuments } from '../src/lib/contractDocuments/operationDraftServer';
import { GET } from '../src/app/api/admin/presupuestos-v2/[budgetId]/versions/[version]/contract/documents/preview/route';
import { createHash } from 'node:crypto';
import { stable } from '../src/lib/contractV2';
async function main(){
 const db=admin.firestore(),id='preview-emulator-'+Date.now(),{budget:b,acceptance:a,draft:d}=infrastructureFixture(id).source,r=contractRefs(db,id,1);
 d.personalData.fullName=b.clienteSnapshot.nombre;d.personalData.dni=b.clienteSnapshot.dni||'12345678';
 await r.budget.create(b);await r.acceptance.create(a);await r.draft.create(d);
 const before=await Promise.all([r.budget.get(),r.acceptance.get(),r.draft.get()]);
 assert.equal((await readOperationDraftDocuments(db,id,1)).available,true);
 await r.draft.collection('conformity').doc('current').create(syntheticPreviewConformity(d));
 const pair=await readOperationDraftDocuments(db,id,1);assert.equal(pair.available,true);assert.equal(pair.projection.budgetId,id);
 assert.deepEqual((await Promise.all([r.budget.get(),r.acceptance.get(),r.draft.get()])).map(s=>s.updateTime),before.map(s=>s.updateTime));
 assert.deepEqual((await r.draft.listCollections()).map(c=>c.id),['conformity']);assert.equal((await db.collection('contractNumberingV2').get()).size,0);assert.equal((await db.collection('contractSnapshotsV2').get()).size,0);
 await r.draft.collection('conformity').doc('current').set({confirmedDigest:null});assert.equal((await readOperationDraftDocuments(db,id,1)).available,true);
 await r.draft.collection('conformity').doc('current').set({confirmedDigest:clientTermsDigest(d)});assert.equal((await readOperationDraftDocuments(db,id,1)).available,true);
 await r.draft.collection('conformity').doc('current').set(syntheticPreviewConformity(d));assert.equal((await readOperationDraftDocuments(db,id,1)).available,true);
 await r.draft.update({'personalData.fullName':'Otra identidad ficticia'});assert.equal((await readOperationDraftDocuments(db,id,1)).available,false);
 await r.draft.update({personalData:d.personalData});
 // Explicitly linked verified profile, as a recurrent customer; no name-based linking.
 await r.draft.collection('clientProfiles').doc('verified').create({schemaVersion:'CLIENT_DOCUMENT_PROFILE_V2',identityHash:createHash('sha256').update(stable({dni:d.personalData.dni,fullName:d.personalData.fullName.trim().normalize('NFKC').toLocaleUpperCase('es-AR')})).digest('hex')});
 await r.draft.collection('creditReview').doc('current').create({profileOrigin:{budgetId:id,version:1}});assert.equal((await readOperationDraftDocuments(db,id,1)).available,true);
 const {budget:b2,acceptance:a2,draft:d2}=infrastructureFixture(id+'-second').source;d2.personalData.fullName=b2.clienteSnapshot.nombre;d2.personalData.dni=b2.clienteSnapshot.dni||'12345678';const r2=contractRefs(db,b2.id,1);await r2.budget.create(b2);await r2.acceptance.create(a2);await r2.draft.create(d2);const other=await readOperationDraftDocuments(db,b2.id,1);assert.notEqual(other.projection.operationId,pair.projection.operationId);assert.notEqual(other.projection.sourceHash,pair.projection.sourceHash);
 const uri=`http://localhost:3000/api/admin/presupuestos-v2/${id}/versions/1/contract/documents/preview`,ctx={params:Promise.resolve({budgetId:id,version:'1'})};
 assert.equal((await GET(new NextRequest(uri),ctx)).status,401);
 async function token(email:string){const r=await fetch('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password:'Synthetic-only-582!',returnSecureToken:true})});const data=await r.json();assert.ok(data.idToken);return data.idToken as string;}
 const affiliate=await token(`affiliate-${Date.now()}@example.test`),client=await token(`client-${Date.now()}@example.test`),administrator=await token(process.env.NEXT_PUBLIC_ADMIN_EMAIL!);
 for(const t of [affiliate,client])assert.equal((await GET(new NextRequest(uri,{headers:{Authorization:'Bearer '+t}}),ctx)).status,403);
 const allowed=await GET(new NextRequest(uri,{headers:{Authorization:'Bearer '+administrator}}),ctx);assert.equal(allowed.status,200);assert.match(allowed.headers.get('cache-control')!,/no-store/);
 const snapshots=await Promise.all([r.budget.get(),r.acceptance.get(),r.draft.get()]);const view=await GET(new NextRequest(uri,{headers:{Authorization:'Bearer '+administrator}}),ctx);assert.equal(view.status,200);assert.deepEqual((await Promise.all([r.budget.get(),r.acceptance.get(),r.draft.get()])).map(s=>s.updateTime),snapshots.map(s=>s.updateTime));
 assert.equal((await db.collection('contractNumberingV2').get()).size,0);assert.equal((await db.collection('contractSnapshotsV2').get()).size,0);
 console.log('OPERATION_DRAFT_DOCUMENTS_EMULATOR=PASS; ADMIN_ONLY; CROSS_ROLE_DENIED; TWO_OPERATIONS_ISOLATED; NEW_RECURRENT; IDENTITY_BLOCK_DRAFT_CONFORMITY_PENDING; READ_ONLY_UPDATE_TIMES; NO_NUMBERING_SNAPSHOT_STORAGE_WRITES');
 await admin.app().delete();
}
main().catch(e=>{console.error(e);process.exitCode=1;});
