import './helpers/requireSafeEmulatorEnvironment';
import { creditorPaymentPlaceReviewTemplates, creditorPaymentReviewIssuer } from '../src/lib/productionV2/creditorPaymentPlaceProposal';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { admin } from '../src/lib/firebaseAdmin';
import { productionReadyFixture, syntheticOriginalPackage, syntheticOriginalFormal } from './helpers/productionAdapterFixtures';
import { clientPaymentPlaceReviewTemplates } from '../src/lib/productionV2/clientPaymentPlaceProposal';
import { contractPaymentAddress } from '../src/lib/contractPaymentAddress';
import { contractCommand, getContract, clientTermsDigest } from '../src/lib/contractV2Server';
import { contractValueHash } from '../src/lib/contractIntegrityV2';
import { readOperationDraftDocuments } from '../src/lib/contractDocuments/operationDraftServer';
import { renderContractPairReview } from '../src/lib/productionV2/originalPdf';
import { packageHash, approvedFinalPackages, type FinalSnapshot } from '../src/lib/productionV2/catalog';
import { assertOriginalSnapshot } from '../src/lib/productionV2/originalBindings';
import { productionRuntimeForEmulator } from '../src/lib/productionV2/runtime';
import { authorizeOperation, recordFinalPackageApproval, productionRef } from '../src/lib/productionV2/authorization';
import { argentinaBusinessDate } from '../src/lib/productionV2/businessDate';
import { reviewCommand } from './testCreditReviewV2Emulator';

const checks:string[]=[];
function pass(label:string){checks.push(label);console.log('PASS '+label);}
async function run(){
 assert.equal(process.env.GCLOUD_PROJECT,'demo-cuenta-hogar');
 assert.equal(process.env.FIREBASE_STORAGE_EMULATOR_HOST,'127.0.0.1:9199');
 assert.deepEqual(approvedFinalPackages,[]);
 const db=admin.firestore(), actor=(await admin.auth().createUser({email:process.env.NEXT_PUBLIC_ADMIN_EMAIL,emailVerified:true,password:'Only-Emulator-123'})).uid;
 const f=await productionReadyFixture(actor,true), consentRef=f.r.draft.collection('conformity').doc('current');
 const initial=(await consentRef.get()).data()!, origin={budget:await f.r.budget.get(),acceptance:await f.r.acceptance.get()};
 const terms=clientTermsDigest(f.ready), paymentAddress=contractPaymentAddress(f.ready.personalData);
 assert.equal(initial.confirmedPaymentAddressHash,paymentAddress.hash);
 assert((await getContract(db,f.id,1)).clientConformity?.paymentAddressConfirmed);
 const base=syntheticOriginalPackage(), {sha256:discarded,...body}=base;void discarded;
 const candidate={...body,id:'synthetic-client-payment-place',version:'SYNTHETIC_V3',templates:clientPaymentPlaceReviewTemplates()};
 const p={...candidate,sha256:packageHash(candidate)},runtime=productionRuntimeForEmulator(db,admin.auth(),[p],[actor]);
 const approvalId=randomUUID();
 await recordFinalPackageApproval(runtime,{commandId:approvalId,packageId:p.id,packageHash:p.sha256,approvalDate:argentinaBusinessDate(),professional:'SINTÉTICO, NO REAL',validationReference:'ONLY_EMULATOR',sourceReference:'ONLY_EMULATOR',confirmed:true},actor);
 const grant={commandId:randomUUID(),operationId:f.identity.operationId,expectedRevision:f.ready.revision,packageId:p.id,approvalId,
  formal:{...syntheticOriginalFormal,contractIssueDate:argentinaBusinessDate(),contractIssuePlace:'Ciudad sintética',promissoryNoteIssueDate:argentinaBusinessDate(),promissoryNoteIssuePlace:'Ciudad sintética'},
  scopes:['ISSUANCE'],expiresAt:new Date(Date.now()+86400000).toISOString(),reason:'Sólo Emulator, sin efectos jurídicos',confirmed:true};
 pass('NEW_CONFORMITY_HAS_ADDRESS_PROOF_WITHOUT_CHANGING_TERMS_DIGEST');
 for(const field of ['address','locality','province','postalCode']){
  await f.r.draft.update({['personalData.'+field]:''});const blocked=await readOperationDraftDocuments(db,f.id,1);assert.equal(blocked.available,false);assert.equal(blocked.code,'DOCUMENT_CONFORMITY_PENDING');assert(!('promissoryNote' in blocked));
  await f.r.draft.update({personalData:f.ready.personalData});
 }
 pass('INCOMPLETE_PAYMENT_ADDRESS_BLOCKS_WEB_PREVIEW_WITHOUT_PDF');

 // A synthetic legacy record, not an automatic migration of a real consent.
 const {confirmedPaymentAddressHash:oldAddress,...legacy}=initial;void oldAddress;
 await consentRef.set(legacy);const legacyBefore=await consentRef.get();
 const legacyView=await getContract(db,f.id,1);
 assert(legacyView.clientConformity?.confirmed);assert.equal(legacyView.clientConformity.paymentAddressConfirmed,false);
 const legacyPreview=await readOperationDraftDocuments(db,f.id,1);assert.equal(legacyPreview.available,false);assert.equal(legacyPreview.code,'DOCUMENT_CONFORMITY_PENDING');
 await assert.rejects(authorizeOperation(runtime,f.id,1,grant,actor),/ADDRESS_CONFORMITY_REQUIRED/);
 const legacyAfter=await consentRef.get();assert.deepEqual(legacyAfter.data(),legacyBefore.data());assert(legacyAfter.updateTime!.isEqual(legacyBefore.updateTime!));
 assert.equal((await productionRef(db,f.id,1).collection('authorizations').get()).size,0);
 await consentRef.set(initial);
 pass('LEGACY_HASH_DATE_AND_READ_COMPATIBILITY_PRESERVED_NEW_TEMPLATE_REQUIRES_EXPLICIT_ADDRESS_CONSENT');
 async function cmd(action:string,extra:Record<string,unknown>={}){
  return contractCommand(db,f.id,1,{action,commandId:randomUUID(),expectedRevision:(await f.r.draft.get()).data()!.revision,...extra},actor);
 }
 await cmd('RETURN_TO_DRAFT',{reason:'Revisar domicilio sintético'});
 const changedAddress={...f.ready.personalData,address:'Calle ficticia 456'};
 const changed=(await cmd('UPDATE_PERSONAL_DATA',{personalData:changedAddress})).draft;
 assert.equal(clientTermsDigest(changed),terms);assert.deepEqual(changed.economicTerms,f.ready.economicTerms);assert.deepEqual(changed.paymentScheduleDraft,f.ready.paymentScheduleDraft);
 assert.equal((await getContract(db,f.id,1)).clientConformity?.confirmed,false);
 assert.deepEqual((await consentRef.get()).data(),initial,'Changing the draft must not overwrite the old proof');
 assert.equal((await readOperationDraftDocuments(db,f.id,1)).code,'DOCUMENT_CONFORMITY_PENDING');
 await assert.rejects(cmd('MARK_READY_TO_FORMALIZE'));
 pass('ADDRESS_EDIT_INVALIDATES_PREVIEW_AND_READY_WITHOUT_REWRITING_CONFORMITY_OR_ECONOMICS');

 const input={action:'RECORD_CLIENT_CONFORMITY',commandId:randomUUID(),expectedRevision:changed.revision,evidence:'Conformidad ficticia explícita con condiciones y domicilio actualizado; sólo Emulator'};
 const results=await Promise.all([contractCommand(db,f.id,1,input,actor),contractCommand(db,f.id,1,input,actor)]);
 assert.equal(results.filter(x=>!x.replayed).length,1);assert.deepEqual(results[0].draft,results[1].draft);
 const paths=[f.r.draft,consentRef,f.r.draft.collection('commands').doc(input.commandId),f.r.draft.collection('events').doc(input.commandId)];
 const before=await Promise.all(paths.map(r=>r.get()));assert((await contractCommand(db,f.id,1,input,actor)).replayed);
 const after=await Promise.all(paths.map(r=>r.get()));for(let i=0;i<before.length;i++){assert.deepEqual(after[i].data(),before[i].data());assert(after[i].updateTime!.isEqual(before[i].updateTime!));}
 await assert.rejects(contractCommand(db,f.id,1,{...input,evidence:'Distinta evidencia'},actor),/commandId/);
 const proof=(await consentRef.get()).data()!;
 assert.equal(proof.confirmedPaymentAddressHash,contractPaymentAddress(changedAddress).hash);
 assert.equal((await f.r.draft.collection('events').doc(input.commandId).get()).data()!.paymentAddressHash,proof.confirmedPaymentAddressHash);
 assert((await getContract(db,f.id,1)).clientConformity?.paymentAddressConfirmed);
 pass('EXPLICIT_RECONFORMITY_AUDIT_CONCURRENCY_REPLAY_NO_EXTRA_WRITES_AND_COMMAND_CONFLICT');

 const preview=await readOperationDraftDocuments(db,f.id,1);assert(preview.available);
 const proposed=renderContractPairReview(preview.projection,creditorPaymentPlaceReviewTemplates(),proof,creditorPaymentReviewIssuer());
 assert.equal(preview.templateHash,proposed.templateHash);assert.deepEqual(preview.mandate,proposed.mandate);assert.deepEqual(preview.promissoryNote,proposed.promissoryNote);assert.equal('remito' in preview,false);
 assert.equal(proposed.projection.customer.address,changedAddress.address);
 assert.equal(proposed.projection.economics!.total,f.ready.economicTerms!.contractTotal);
 await reviewCommand(f.id,'DECIDE',{state:'IN_REVIEW',resolution:'Revisar datos sintéticos actualizados',notes:'Sólo Emulator'});
 await reviewCommand(f.id,'DECIDE',{state:'APPROVED',resolution:'Aprobación sintética vigente',notes:'Sólo Emulator'});
 const ready=(await cmd('MARK_READY_TO_FORMALIZE')).draft;
 const request={...grant,expectedRevision:ready.revision};
 await assert.rejects(authorizeOperation(runtime,f.id,1,request,f.uid));
 const approved=await authorizeOperation(runtime,f.id,1,request,actor);assert(!approved.replay);
 const authorizationRef=productionRef(db,f.id,1).collection('authorizations').doc(approved.id),authorization=await authorizationRef.get();
 assert.equal(authorization.data()!.legalContext.documentContext.parameters.notePaymentAddressHash,proof.confirmedPaymentAddressHash);
 assert((await authorizeOperation(runtime,f.id,1,request,actor)).replay);assert((await authorizationRef.get()).updateTime!.isEqual(authorization.updateTime!));
 pass('REVIEW_AND_CURRENT_CONSENT_RECOVER_PDFS_AUTHORIZATION_BINDS_ADDRESS_HASH_AND_ROLE');

 // Test the snapshot-only binding without freezing, numbering or issuing anything.
 const binding={personalData:structuredClone(ready.personalData),documentContext:authorization.data()!.legalContext.documentContext,economicTerms:ready.economicTerms,paymentSchedule:{installments:ready.paymentScheduleDraft}} as FinalSnapshot;
 assertOriginalSnapshot(binding,p);
 assert.throws(()=>assertOriginalSnapshot({...binding,personalData:{...binding.personalData,address:'Domicilio alterado 999'}},p),/ADDRESS_CONFORMITY_REQUIRED/);
 assert.throws(()=>assertOriginalSnapshot({...binding,personalData:{...binding.personalData,province:''}},p),/ADDRESS_INCOMPLETE/);
 assert.throws(()=>assertOriginalSnapshot({...binding,documentContext:{...binding.documentContext,parameters:{...binding.documentContext.parameters,notePaymentAddressHash:'0'.repeat(64)}}},p),/ADDRESS_CONFORMITY_REQUIRED/);
 pass('SNAPSHOT_BINDING_REJECTS_CHANGED_INCOMPLETE_ADDRESS_OR_HASH_NO_CUSTOMER_LOOKUP');
 for(const [key,ref] of [['budget',f.r.budget],['acceptance',f.r.acceptance]] as const){const current=await ref.get();assert.deepEqual(current.data(),origin[key].data());assert(current.updateTime!.isEqual(origin[key].updateTime!));}
 for(const path of ['contractNumberingV2','contractNumbersV2','contractSnapshotsV2','contractOriginsV2','contractOriginEvidenceV2'])assert.equal((await db.collection(path).get()).size,0);
 assert.equal(contractValueHash(ready.economicTerms),contractValueHash(f.ready.economicTerms));assert.deepEqual(ready.paymentScheduleDraft,f.ready.paymentScheduleDraft);
 pass('ACCEPTANCE_ORIGIN_AMOUNTS_DATES_UNCHANGED_NO_COUNTER_NUMBER_SNAPSHOT_OR_REAL_APPROVAL');
 console.log(JSON.stringify({status:'PASS',groups:checks.length,checks,project:process.env.GCLOUD_PROJECT,productionWrites:0}));
}
run().then(()=>admin.app().delete()).catch(e=>{console.error(e);process.exitCode=1;});
