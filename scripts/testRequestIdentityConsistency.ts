import './helpers/requireSafeEmulatorEnvironment';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { NextRequest } from 'next/server';
import { admin } from '../src/lib/firebaseAdmin';
import { reviewOperationIdentity } from '../src/lib/operationIdentityReview';
import { authenticatedSolicitudDetail } from '../src/lib/adminSolicitudDetailClient';
import { createCreditCase, reviewCommand } from './testCreditReviewV2Emulator';
import { getContract, contractCommand } from '../src/lib/contractV2Server';
import { readCreditReview, reusableDocumentSource } from '../src/lib/creditReviewV2Server';
import { GET } from '../src/app/api/admin/solicitudes/[source]/[id]/route';
import { databaseSnapshot } from './helpers/adminSolicitudesFixtures';
export async function tests() {
  const entries = [{ source:'BUDGET' as const,name:'Persona Sintética',dni:'12345678' },{ source:'DRAFT' as const,name:' PERSONA   SINTÉTICA ',dni:'12345678' }];
  assert.equal(reviewOperationIdentity(entries,false,true).discrepancy,false);
  assert.equal(reviewOperationIdentity(entries,false,false,true).requiresClarification,true);
  assert.ok(!JSON.stringify(reviewOperationIdentity(entries,false,true)).includes('12345678'));
  const changed = [...entries,{ source:'SUBMISSION' as const,name:'Otra persona',dni:'87654321',applied:false }];
  assert.equal(reviewOperationIdentity(changed,true,false).requiresClarification,true);
  assert.equal(reviewOperationIdentity([{source:'BUDGET',name:'Nombre anterior',dni:''},{source:'DRAFT',name:'Nombre actualizado',dni:'12345678'}],false,false).requiresClarification,true);
  assert.equal(reviewOperationIdentity([{source:'BUDGET',name:'Nombre anterior',dni:''},{source:'DRAFT',name:'Nombre actualizado',dni:'12345678'}],true,false).requiresClarification,false);
  const originalFetch=globalThis.fetch;
  let calls=0;
  try {
    globalThis.fetch=async()=>{calls++;return new Response(JSON.stringify({item:{documentId:'exact-id'}}),{status:200});};
    const result=await authenticatedSolicitudDetail({getIdToken:async()=> 'emulator-only'},'solicitudes_cuenta','exact-id',new AbortController().signal);
    assert.equal(result?.documentId,'exact-id');assert.equal(calls,1);
    globalThis.fetch=async()=>new Response('{}',{status:503});
    await assert.rejects(()=>authenticatedSolicitudDetail({getIdToken:async()=> 'emulator-only'},'solicitudes','exact-id',new AbortController().signal),/FAILED/);
    await assert.rejects(()=>authenticatedSolicitudDetail({getIdToken:()=>new Promise(()=>{})},'solicitudes','exact-id',new AbortController().signal,10),/TIMEOUT/);
    const abort=new AbortController();abort.abort();
    await assert.rejects(()=>authenticatedSolicitudDetail({getIdToken:async()=> 'emulator-only'},'solicitudes','exact-id',abort.signal),/CANCELLED/);
  } finally { globalThis.fetch=originalFetch; }
  const c=await createCreditCase('identity-'+randomUUID()), db=admin.firestore();
  const before=await databaseSnapshot(), time=(await c.r.draft.get()).updateTime!;
  const view=await getContract(db,c.id,1);
  assert.deepEqual(view.identityReview!.entries.map(e=>e.source),['REQUEST','BUDGET','SUBMISSION','DRAFT']);
  assert.equal(view.identityReview!.requiresClarification,true);
  assert.equal((await readCreditReview(db,c.id,1)).approved,false);
  for(const command of [{action:'SET_CONTRACT_PLAN',contractPlanCuotas:8},{action:'SET_PAYMENT_DATES',firstInstallmentDueDate:'2027-01-20',preferredMonthlyDueDay:20},{action:'MARK_READY_TO_FORMALIZE'}]) {
    await assert.rejects(()=>contractCommand(db,c.id,1,{...command,commandId:randomUUID(),expectedRevision:c.d.revision},'synthetic-admin'),/identidad/);
  }
  await assert.rejects(()=>reviewCommand(c.id,'DECIDE',{state:'APPROVED',resolution:'No debe avanzar',notes:'Prueba'}),/identidad/);
  assert.deepEqual(await databaseSnapshot(),before);assert.ok((await c.r.draft.get()).updateTime!.isEqual(time));
  // Existing explicit documentary verification resolves an updated name; original snapshots remain intact.
  const snapshots=JSON.stringify({b:(await c.r.budget.get()).data(),a:(await c.r.acceptance.get()).data()});
  await reviewCommand(c.id,'VERIFY_IDENTITY',{evidence:'Verificación documental sintética explícita de los datos actuales'});
  assert.equal((await getContract(db,c.id,1)).identityReview!.requiresClarification,false);
  assert.equal(JSON.stringify({b:(await c.r.budget.get()).data(),a:(await c.r.acceptance.get()).data()}),snapshots);
  const updated=await contractCommand(db,c.id,1,{action:'UPDATE_PERSONAL_DATA',commandId:randomUUID(),expectedRevision:c.d.revision,personalData:{...c.d.personalData,fullName:'Otra identidad sintética',dni:'87654321'}},'synthetic-admin');
  assert.equal((await getContract(db,c.id,1)).identityReview!.requiresClarification,true);
  assert.equal((await readCreditReview(db,c.id,1)).identityMismatch,true);
  await assert.rejects(()=>reusableDocumentSource(db,c.id,1,'DNI_FRONT'),/identidad/);
  const after=await databaseSnapshot();await getContract(db,c.id,1);await readCreditReview(db,c.id,1);assert.deepEqual(await databaseSnapshot(),after);
  assert.equal(updated.draft.personalData.fullName,'Otra identidad sintética');
  const ctx={params:Promise.resolve({source:'solicitudes_cuenta',id:c.source.id})};
  assert.equal((await GET(new NextRequest('http://localhost/api/admin/solicitudes/x/y'),ctx)).status,401);
  const user=await admin.auth().createUser({email:`role-${randomUUID()}@example.test`,password:randomUUID(),emailVerified:true});
  const auth=await fetch('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=demo-key',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token:await admin.auth().createCustomToken(user.uid),returnSecureToken:true})});
  const token=(await auth.json()).idToken;
  assert.equal((await GET(new NextRequest('http://localhost/api/admin/solicitudes/x/y',{headers:{Authorization:`Bearer ${token}`}}),ctx)).status,403);
  const adminEmail=process.env.NEXT_PUBLIC_ADMIN_EMAIL;assert.ok(adminEmail,'SYNTHETIC_ADMIN_EMAIL_REQUIRED');
  let administrator;try{administrator=await admin.auth().getUserByEmail(adminEmail);}catch{administrator=await admin.auth().createUser({email:adminEmail,emailVerified:true});}
  const signed=await fetch('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=demo-key',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token:await admin.auth().createCustomToken(administrator.uid),returnSecureToken:true})});
  const adminToken=(await signed.json()).idToken,request=new NextRequest('http://localhost/api/admin/solicitudes/x/y',{headers:{Authorization:`Bearer ${adminToken}`}});
  const readBefore=await databaseSnapshot();const response=await GET(request,ctx);assert.equal(response.status,200);assert.equal((await response.json()).item.documentId,c.source.id);
  const other=await GET(request,{params:Promise.resolve({source:'solicitudes',id:c.source.id})});assert.equal(other.status,200);assert.equal((await other.json()).item,null);
  assert.deepEqual(await databaseSnapshot(),readBefore);
  console.log('REQUEST_AUTH_TIMEOUT_RETRY_IDENTITY_PROVENANCE_SERVER_GUARDS_HISTORICAL_INTEGRITY = PASS');
}
if(process.argv[1]?.endsWith('testRequestIdentityConsistency.ts'))tests().then(()=>admin.app().delete()).catch(e=>{console.error(e);process.exitCode=1;});
