import './helpers/requireSafeEmulatorEnvironment';
import assert from 'node:assert/strict';
import {POST} from '../src/app/api/admin/presupuestos-v2/[budgetId]/versions/[version]/sharing/route';
import {admin} from '../src/lib/firebaseAdmin';
import {prepareBudgetSharing} from '../src/lib/budgetPdfNumbering';
import {administrativeRecordRef} from '../src/lib/adminRecordRemovalServer';
import {budgetFixture} from './helpers/budgetV2Fixtures';
async function main(){
 const db=admin.firestore();
 const params={params:Promise.resolve({budgetId:'numbering-first',version:'1'})};
 assert.equal((await POST(new Request('http://localhost:3000/api/admin/presupuestos-v2/numbering-first/versions/1/sharing',{method:'POST'}),params)).status,401);
 await admin.auth().createUser({email:'seller-numbering@example.invalid',password:'Emulator-only-123',emailVerified:true});
 const login=await fetch('http://'+process.env.FIREBASE_AUTH_EMULATOR_HOST+'/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=demo-key',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:'seller-numbering@example.invalid',password:'Emulator-only-123',returnSecureToken:true})});
 assert.equal(login.status,200);const credentials=await login.json();
 assert.equal((await POST(new Request('http://localhost:3000/api/admin/presupuestos-v2/numbering-first/versions/1/sharing',{method:'POST',headers:{Authorization:'Bearer '+credentials.idToken}}),params)).status,403);
 assert.equal((await db.doc('configuracion_general/budget_pdf_number_counter_v1').get()).exists,false);

 const put=async(id:string,version=1,emitted=true)=>{const b=budgetFixture(id);Object.assign(b,{version,estado:emitted?'EMITIDO':'GENERADO',issuedAt:emitted?b.createdAt:null});await db.doc(`presupuestos_v2/${id}/versions/${version}`).set(b);return b;};
 const original=await put('numbering-first');
 const [a,b]=await Promise.all([prepareBudgetSharing(db,original.id,1,'admin-demo'),prepareBudgetSharing(db,original.id,1,'admin-demo')]);
 assert.equal(a.documentNumber,'P-000001');assert.deepEqual(a,b);assert.equal('costoProveedorSnapshot' in a.options[0],false);
 const revision=await put(original.id,2);assert.equal((await prepareBudgetSharing(db,original.id,2,'admin-demo')).documentNumber,a.documentNumber);
 assert.deepEqual((await db.doc(`presupuestos_v2/${original.id}/versions/1`).get()).data(),original);
 assert.deepEqual((await db.doc(`presupuestos_v2/${original.id}/versions/2`).get()).data(),revision);
 const ids=['numbering-second','numbering-third','numbering-fourth'];await Promise.all(ids.map(id=>put(id)));const next=await Promise.all(ids.map(id=>prepareBudgetSharing(db,id,1,'admin-demo')));assert.deepEqual(next.map(x=>x.documentNumber).sort(),['P-000002','P-000003','P-000004']);
 await put('numbering-draft',1,false);await assert.rejects(prepareBudgetSharing(db,'numbering-draft',1,'admin-demo'));await assert.rejects(prepareBudgetSharing(db,'numbering-missing',1,'admin-demo'));
 await put('numbering-removed');await administrativeRecordRef(db,{kind:'BUDGET',id:'numbering-removed'}).set({schemaVersion:'ADMIN_RECORD_STATE_V1',subject:{kind:'BUDGET',id:'numbering-removed'},state:'ARCHIVED',revision:1});await assert.rejects(prepareBudgetSharing(db,'numbering-removed',1,'admin-demo'));
 assert.equal((await db.doc('configuracion_general/budget_pdf_number_counter_v1').get()).data()!.lastSequence,4);
 // A damaged/reset counter must never reuse an existing public number.
 await db.doc('configuracion_general/budget_pdf_number_counter_v1').update({lastSequence:0});await put('numbering-collision');await assert.rejects(prepareBudgetSharing(db,'numbering-collision',1,'admin-demo'));assert.equal((await db.doc('budgetPdfNumberingV1/budget_numbering-collision').get()).exists,false);
 await db.doc('budgetPdfNumberingV1/number_P-000001').update({budgetId:'different-origin'});await assert.rejects(prepareBudgetSharing(db,original.id,1,'admin-demo'));
 console.log('BUDGET_NUMBERING_CONCURRENCY_RETRY_REVISION_IMMUTABILITY_PRIVACY_INVALID_REMOVED_COLLISION=PASS');
 await admin.app().delete();
}
main().catch(e=>{console.error(e);process.exitCode=1;});
