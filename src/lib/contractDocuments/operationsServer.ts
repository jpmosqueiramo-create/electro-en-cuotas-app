// Admin-mediated operational evidence. Never updates snapshots, numbering or legal state.
import type { Firestore } from 'firebase-admin/firestore';
import { assertContractInfrastructureEmulator } from '../contractInfrastructureEmulator';
import { contractRefs } from '../contractV2Server';
import { opaque,reject,type ContractDraftV2 } from '../contractV2';
import { contractValueHash } from '../contractIntegrityV2';
import { applyOperation,newOperations,type ContractOperations } from './operations';
export async function contractOperations(db:Firestore,id:string,v:number,actor:string,input?:unknown){
 const refs=contractRefs(db,id,v),ref=refs.draft.collection('operationalEvidence').doc('current');
 return db.runTransaction(async tx=>{
  const [ds,os]=await Promise.all([tx.get(refs.draft),tx.get(ref)]);
  if(!ds.exists)reject('No existe borrador contractual.');const d=ds.data() as ContractDraftV2;
  const state=os.exists?os.data() as ContractOperations:newOperations(d.personalData.locality);
  let recordingEnabled=false;try{assertContractInfrastructureEmulator();recordingEnabled=true;}catch{/* Until legal approval, operational writes are Emulator-only. */}
  if(input===undefined)return {...state,recordingEnabled};
  assertContractInfrastructureEmulator();
  const cid=opaque((input as Record<string,unknown>).commandId),command=refs.draft.collection('operationalCommands').doc(cid),digest=contractValueHash({actor,input});
  const previous=await tx.get(command);if(previous.exists){if(previous.data()!.digest!==digest)reject('Conflicto de commandId.');return {...previous.data()!.result as ContractOperations,recordingEnabled};}
  // Review-only operation: never authorizes legal issuance or formalization.
  const now=new Date().toISOString(),next=applyOperation(state,input,actor,now);
  tx.set(ref,next);tx.create(command,{digest,result:next,by:actor,at:now});
  tx.create(refs.draft.collection('operationalEvents').doc(cid),{action:(input as Record<string,unknown>).action,by:actor,at:now,before:state,after:next});
  return {...next,recordingEnabled};
 });
}
