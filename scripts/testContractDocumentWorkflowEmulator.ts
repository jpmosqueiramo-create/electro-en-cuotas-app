import './helpers/requireSafeEmulatorEnvironment';
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';
import { initializeApp,deleteApp } from 'firebase/app';
import { getAuth,connectAuthEmulator,signInWithEmailAndPassword } from 'firebase/auth';
import { getStorage,connectStorageEmulator,ref as clientRef,getBytes,uploadBytes,deleteObject } from 'firebase/storage';
import { Storage } from '@google-cloud/storage';
import { admin } from '../src/lib/firebaseAdmin';
import { ADMIN_EMAIL } from '../src/lib/adminAuth';
import { persistReadyContract } from './helpers/contractFreezeFixtures';
import { createContractFreezeIntegrationEmulator, FREEZE_DEPENDENCIES_COLLECTION } from '../src/lib/contractFreezeIntegrationEmulator';
import { contractCommand } from '../src/lib/contractV2Server';
import { createDocumentationCase } from '../src/lib/budgetAcceptanceV2';
import { contractValueHash } from '../src/lib/contractIntegrityV2';
import { sealContractSnapshot } from '../src/lib/contractSnapshotV2';
import { syntheticDocumentSample } from '../src/lib/contractDocuments/sample';
import { reviewDocumentDefinitions } from '../src/lib/contractDocuments/pdf';
import { createPrivateDocumentArchiveEmulator } from '../src/lib/contractDocuments/archiveEmulator';
import { readContractDocumentDossier } from '../src/lib/contractDocuments/dossier';
import * as sampleApi from '../src/app/api/admin/contract-document-samples/[kind]/route';
import * as dossierApi from '../src/app/api/admin/presupuestos-v2/[budgetId]/versions/[version]/contract/documents/route';
async function main(){
  const db=admin.firestore(),freeze=createContractFreezeIntegrationEmulator(),archive=createPrivateDocumentArchiveEmulator();
  const bucket=new Storage({projectId:'demo-cuenta-hogar',apiEndpoint:'http://127.0.0.1:9199',useAuthWithCustomEndpoint:false}).bucket('demo-cuenta-hogar.appspot.com');
  const run=`synthetic-workflow-${Date.now()}`;
  try{
    const f=await persistReadyContract(db,run,true,18);await f.r.family.collection('documentation').doc('1').set(createDocumentationCase(f.a));
    const sourceBefore=contractValueHash({budget:(await f.r.budget.get()).data(),acceptance:(await f.r.acceptance.get()).data(),p4:(await f.r.family.collection('documentation').doc('1').get()).data()});
    const d0=await readContractDocumentDossier(db,run,1);assert.equal(d0.stage,'TECHNICAL_REVIEW');assert.ok(d0.readiness);assert.equal(d0.snapshot,null);assert.equal(d0.documentation.length,4);assert.ok(!JSON.stringify(d0).includes('SECRET_PROVIDER'));
    const readBefore=contractValueHash((await f.r.draft.get()).data());await readContractDocumentDossier(db,run,1);assert.equal(contractValueHash((await f.r.draft.get()).data()),readBefore);
    const returned=await contractCommand(db,run,1,{action:'RETURN_TO_DRAFT',expectedRevision:f.d.revision,commandId:'return',reason:'Prueba de estados'},'synthetic-admin-a');
    assert.equal((await readContractDocumentDossier(db,run,1)).stage,'DRAFT');
    const ready=await contractCommand(db,run,1,{action:'MARK_READY_TO_FORMALIZE',expectedRevision:returned.draft.revision,commandId:'review'},'synthetic-admin-a');
    const counter=db.doc('contractNumberingV2/CONTRACT_NUMBERING_V1');if(!(await counter.get()).exists)await counter.create({schemaVersion:'CONTRACT_NUMBER_COUNTER_V1',policyId:'CONTRACT_NUMBERING_V1',executionMode:'EMULATOR_ONLY',active:true,lastAllocatedSequence:'0'});
    f.legal.documentDefinitions=reviewDocumentDefinitions();await db.collection(FREEZE_DEPENDENCIES_COLLECTION).doc(run).create({schemaVersion:'CONTRACT_FREEZE_SYNTHETIC_DEPENDENCIES_V1',executionMode:'EMULATOR_ONLY',legalApproval:'NOT_APPROVED_SYNTHETIC_ONLY',legalContext:f.legal});
    const receipt=await freeze.execute({action:'FREEZE_READY_EMULATOR',commandId:run,budgetId:run,budgetVersion:1,expectedRevision:ready.draft.revision,dependenciesId:run},'synthetic-admin-a');
    const s=await freeze.getSnapshot(receipt.snapshotId);assert.ok(s);const snapshotBefore=contractValueHash(s),counterBefore=contractValueHash((await counter.get()).data());
    const [first,second]=await Promise.all([archive.preserve(s),archive.preserve(s)]);assert.deepEqual(first,second);assert.equal(first.state,'COMPLETE');assert.equal(first.snapshotHash,receipt.snapshotHash);assert.equal(first.contractNumber,receipt.contractNumber);
    const {integrity:_integrity,...payload}=s;void _integrity;
    await assert.rejects(()=>archive.preserve(sealContractSnapshot({...payload,documentDefinitions:{...s.documentDefinitions,contract:{...s.documentDefinitions.contract,templateVersion:'UNREVIEWED'}}})));
    await assert.rejects(()=>archive.preserve(syntheticDocumentSample().snapshot));
    const filesBefore=(await bucket.getFiles({prefix:`contract-documents-v2/${s.contractSnapshotId}/` }))[0].length;assert.equal(filesBefore,2);
    const replay=await archive.preserve(s);assert.deepEqual(replay,first);for(const kind of ['mandate','promissoryNote'] as const)assert.ok((await archive.read(s.contractSnapshotId,first.documentSetId,kind)).length>0);
    assert.equal((await archive.list(s.contractSnapshotId)).length,1);assert.equal((await bucket.getFiles({prefix:`contract-documents-v2/${s.contractSnapshotId}/`}))[0].length,2);
    const dossier=await readContractDocumentDossier(db,run,1);assert.equal(dossier.stage,'TERMS_FROZEN');assert.equal(dossier.snapshot?.contractNumber,receipt.contractNumber);assert.equal(dossier.archives.length,1);assert.ok(!JSON.stringify(dossier).includes('storagePath'));
    // Recover a durable reservation after a partial upload/finalization failure.
    const ref=db.collection('contractSnapshotsV2').doc(s.contractSnapshotId).collection('documents').doc(first.documentSetId);
    await ref.set({...first,state:'PENDING',artifacts:first.artifacts.map(a=>({...a,generation:null}))});const removed=first.artifacts[1];await bucket.file(removed.storagePath).delete({ifGenerationMatch:Number(removed.generation)});
    const recovered=await archive.preserve(s);assert.equal(recovered.state,'COMPLETE');assert.equal((await archive.list(s.contractSnapshotId)).length,1);
    // COMPLETE missing/replaced objects are never silently regenerated.
    const a=recovered.artifacts[0];await bucket.file(a.storagePath).delete({ifGenerationMatch:Number(a.generation)});await assert.rejects(()=>archive.preserve(s));assert.equal((await bucket.file(a.storagePath).exists())[0],false);
    await bucket.file(a.storagePath).save(Buffer.from('foreign'),{resumable:false});await assert.rejects(()=>archive.read(s.contractSnapshotId,first.documentSetId,'mandate'));await assert.rejects(()=>archive.preserve(s));
    await assert.rejects(()=>archive.read(s.contractSnapshotId,'doc_'+'0'.repeat(64),'mandate'));await assert.rejects(()=>archive.read('../foreign',first.documentSetId,'mandate'));
    assert.equal(contractValueHash(await freeze.getSnapshot(receipt.snapshotId)),snapshotBefore);assert.equal(contractValueHash((await counter.get()).data()),counterBefore);
    assert.equal(sourceBefore,contractValueHash({budget:(await f.r.budget.get()).data(),acceptance:(await f.r.acceptance.get()).data(),p4:(await f.r.family.collection('documentation').doc('1').get()).data()}));
    const password='Demo-documents-123!';
    async function token(email:string){let u;try{u=await admin.auth().getUserByEmail(email);}catch{u=await admin.auth().createUser({email});}await admin.auth().updateUser(u.uid,{password,emailVerified:true});const response=await fetch('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=demo',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password,returnSecureToken:true})});assert.equal(response.status,200);return (await response.json() as {idToken:string}).idToken;}
    const adminToken=await token(ADMIN_EMAIL),nonAdmin=await token('client-document@example.test');
    const request=(path:string,t='')=>new NextRequest(`http://localhost${path}`,{headers:t?{Authorization:`Bearer ${t}`}:{}});
    for(const [t,status] of [['',401],[nonAdmin,403]] as const){assert.equal((await sampleApi.GET(request('/api/admin/contract-document-samples/manifest',t),{params:Promise.resolve({kind:'manifest'})})).status,status);assert.equal((await dossierApi.GET(request('/dossier',t),{params:Promise.resolve({budgetId:run,version:'1'})})).status,status);}
    const result=await sampleApi.GET(request('/sample',adminToken),{params:Promise.resolve({kind:'manifest'})});assert.equal(result.status,200);assert.equal(result.headers.get('Cache-Control'),'private, no-store');const m=await result.json();assert.equal(m.proposedPromissoryNoteAmount.enforceableAmount,null);assert.equal(m.proposedPromissoryNoteAmount.status,'PENDING_LEGAL_APPROVAL');
    const pdf=await sampleApi.GET(request('/sample',adminToken),{params:Promise.resolve({kind:'mandate'})});assert.equal(pdf.status,200);assert.equal(pdf.headers.get('Content-Type'),'application/pdf');
    assert.equal((await sampleApi.GET(request('/sample',adminToken),{params:Promise.resolve({kind:'../anything'})})).status,404);
    // Browser clients, including Admin, have no direct access to the private paths.
    const firestoreUrl=`http://127.0.0.1:8080/v1/projects/demo-cuenta-hogar/databases/(default)/documents/${ref.path}`;
    for(const t of ['',nonAdmin,adminToken])assert.equal((await fetch(firestoreUrl,{headers:t?{Authorization:`Bearer ${t}`}:{}})).status,403);
    const controlPath=`productos/${run}-privacy-control`;await bucket.file(controlPath).save(Buffer.from('synthetic-control'),{resumable:false});
    for(const [role,email] of [['anonymous',null],['client','client-document@example.test'],['admin',ADMIN_EMAIL]] as const){
      const app=initializeApp({projectId:'demo-cuenta-hogar',apiKey:'demo-key',storageBucket:'demo-cuenta-hogar.appspot.com'},`document-privacy-${role}`);
      try{
        const auth=getAuth(app);connectAuthEmulator(auth,'http://127.0.0.1:9099',{disableWarnings:true});
        if(email){await signInWithEmailAndPassword(auth,email,password);assert.equal(auth.currentUser?.email,email);}else assert.equal(auth.currentUser,null);
        const client=getStorage(app);connectStorageEmulator(client,'127.0.0.1',9199);client.maxOperationRetryTime=5000;client.maxUploadRetryTime=5000;
        assert.deepEqual(Buffer.from(await getBytes(clientRef(client,controlPath))),Buffer.from('synthetic-control'));
        const denied=(action:()=>Promise<unknown>)=>assert.rejects(action,(error:unknown)=>typeof error==='object'&&error!==null&&'code' in error&&error.code==='storage/unauthorized');
        await denied(()=>getBytes(clientRef(client,a.storagePath)));await denied(()=>uploadBytes(clientRef(client,a.storagePath+'-new'),new Uint8Array([1])));await denied(()=>uploadBytes(clientRef(client,a.storagePath),new Uint8Array([1])));await denied(()=>deleteObject(clientRef(client,a.storagePath)));
        assert.equal((await bucket.file(a.storagePath+'-new').exists())[0],false);assert.deepEqual((await bucket.file(a.storagePath).download())[0],Buffer.from('foreign'));
      }finally{await deleteApp(app);}
    }
    await bucket.file(controlPath).delete();
    const mode=process.env.NODE_ENV;try{Object.assign(process.env,{NODE_ENV:'production'});await assert.rejects(()=>archive.list(s.contractSnapshotId));assert.equal((await sampleApi.GET(request('/sample',adminToken),{params:Promise.resolve({kind:'mandate'})})).status,503);}finally{if(mode===undefined)Reflect.deleteProperty(process.env,'NODE_ENV');else Object.assign(process.env,{NODE_ENV:mode});}
    console.log('DOCUMENT_WORKFLOW_READY_C1_ARCHIVE_CONCURRENCY_RECOVERY_PRIVACY_ADMIN = PASS');console.log('BUDGET_ACCEPTANCE_P4_SNAPSHOT_COUNTER_UNCHANGED_BY_DOCUMENTS = PASS; PRODUCTION_WRITES = 0');
  }finally{await archive.close();await freeze.close();await admin.app().delete();}
}
main().catch(error=>{console.error('DOCUMENT_WORKFLOW_EMULATOR = FAIL',error instanceof Error?error.stack?.split('\n').filter(line=>line.trim().startsWith('at ')).slice(0,5).join('\n'):'unexpected');process.exitCode=1;});
