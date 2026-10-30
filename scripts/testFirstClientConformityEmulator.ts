import './helpers/requireSafeEmulatorEnvironment';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {admin} from '../src/lib/firebaseAdmin';
import {infrastructureFixture} from './helpers/contractInfrastructureFixtures';
import {contractCommand,contractRefs,getContract,clientTermsDigest,clientConformityIsCurrent} from '../src/lib/contractV2Server';

async function main(){
 const db=admin.firestore(),id='first-conformity-'+randomUUID(),r=contractRefs(db,id,1);
 const {budget,acceptance,draft}=infrastructureFixture(id).source;
 await r.budget.create(budget);await r.acceptance.create(acceptance);await r.draft.create(draft);
 const consent=r.draft.collection('conformity').doc('current');
 const original=await r.draft.get();
 const view=await getContract(db,id,1);
 assert.deepEqual(view.clientConformity,{required:true,confirmed:false,paymentAddressConfirmed:false,confirmedAt:null});
 assert.equal((await consent.get()).exists,false);
 assert.deepEqual((await r.draft.get()).updateTime,original.updateTime);
 const command={action:'RECORD_CLIENT_CONFORMITY',commandId:randomUUID(),expectedRevision:draft.revision,evidence:'Comunicación sintética recibida; condiciones y domicilio confirmados'};
 for(const evidence of ['', '<inválida>', 'x'.repeat(501)])await assert.rejects(()=>contractCommand(db,id,1,{...command,commandId:randomUUID(),evidence},'synthetic-admin'));
 assert.equal((await consent.get()).exists,false);
 const incomplete={...draft,economicTerms:null,paymentScheduleDraft:[]};await r.draft.set(incomplete);
 await assert.rejects(()=>contractCommand(db,id,1,command,'synthetic-admin'),/condiciones y el cronograma/);
 assert.equal((await consent.get()).exists,false);await r.draft.set(draft);
 const results=await Promise.all([contractCommand(db,id,1,command,'synthetic-admin'),contractCommand(db,id,1,command,'synthetic-admin')]);
 assert.equal(results.filter(x=>x.replayed).length,1);assert.deepEqual(results[0].draft,results[1].draft);
 const saved=(await consent.get()).data()!;
 assert.equal(saved.evidence,command.evidence);assert.equal(saved.confirmedBy,'synthetic-admin');assert.ok(saved.confirmedAt);
 assert.equal(saved.termsDigest,clientTermsDigest(results[0].draft));assert.equal(clientConformityIsCurrent(results[0].draft,saved),true);
 assert.equal((await getContract(db,id,1)).clientConformity?.confirmed,true);
 assert.equal((await r.draft.collection('events').doc(command.commandId).get()).data()!.action,'RECORD_CLIENT_CONFORMITY');
 await assert.rejects(()=>contractCommand(db,id,1,{...command,commandId:randomUUID()},'synthetic-admin'),/revisión/);
 const changed=await contractCommand(db,id,1,{action:'UPDATE_PRODUCT_DETAILS',commandId:randomUUID(),expectedRevision:results[0].draft.revision,productDetails:{quantity:2,condition:'NEW'}},'synthetic-admin');
 assert.equal((await getContract(db,id,1)).clientConformity?.confirmed,false);
 await contractCommand(db,id,1,{...command,commandId:randomUUID(),expectedRevision:changed.draft.revision},'synthetic-admin');
 assert.equal((await getContract(db,id,1)).clientConformity?.confirmed,true);
 console.log('FIRST_CONFORMITY_READ_ONLY_PENDING_VALIDATION_REPLAY_AUDIT_INVALIDATION=PASS');
 await admin.app().delete();
}
main().catch(e=>{console.error(e);process.exitCode=1;});
