import type { Firestore } from 'firebase-admin/firestore';
import { infrastructureFixture } from './contractInfrastructureFixtures';
import { contractCommand, contractRefs } from '../../src/lib/contractV2Server';
import { buildAcceptance } from '../../src/lib/budgetAcceptanceV2';
import { buildBudgetOptionV2 } from '../../src/lib/budgetReferenceV2';
import { referenceSnapshotToDraft } from '../../src/lib/budgetV2';
import { contractIdentity } from '../../src/lib/contractSnapshotV2';
export async function persistReadyContract(db:Firestore,id:string,decimal=false,plan=8){
 const f=infrastructureFixture(id),b=f.source.budget;
 // Freeze tests do not exercise identity changes: seed a consistent customer before issuing.
 b.clienteSnapshot.nombre=f.source.draft.personalData.fullName;
 b.clienteSnapshot.dni=f.source.draft.personalData.dni;
 if(decimal){const index=b.options.findIndex(o=>o.optionId==='option-1'),s=b.options[index].referenceSnapshot;
  b.options[index]=buildBudgetOptionV2('option-1',{draft:{...referenceSnapshotToDraft(s),costoProveedor:'580000.5'},fechaCotizacion:s.fechaCotizacion,source:'NEW_REFERENCE',referenceId:null});
 }
 const a=buildAcceptance(b,{budgetId:id,version:1,acceptedOptionId:'option-1',preferredPlanCuotas:12,commandId:'accept'},'synthetic-admin-a','2026-10-18T14:00:00.000Z');
 const r=contractRefs(db,id,1);await r.family.set({lastVersion:1});await r.budget.create(b);await r.acceptance.create(a);await r.family.collection('documentation').doc('1').create({marker:'P4_PRIVATE_TEST_UNCHANGED'});
 let d=(await contractCommand(db,id,1,{action:'OPEN_OR_CREATE',commandId:'open'},'synthetic-admin-a')).draft;
 for(const [action,extra] of [
  ['UPDATE_PERSONAL_DATA',{personalData:f.source.draft.personalData}],
  ['SET_CONTRACT_PLAN',{contractPlanCuotas:plan}],
  ['SET_PAYMENT_DATES',{firstInstallmentDueDate:'2026-12-15',preferredMonthlyDueDay:30}],
 ] as const)d=(await contractCommand(db,id,1,{action,commandId:action,expectedRevision:d.revision,...extra},'synthetic-admin-a')).draft;
 d=(await contractCommand(db,id,1,{action:'RECORD_CLIENT_CONFORMITY',commandId:'conformity',expectedRevision:d.revision,evidence:'Synthetic client confirmation fixture'},'synthetic-admin-a')).draft;
 d=(await contractCommand(db,id,1,{action:'MARK_READY_TO_FORMALIZE',commandId:'ready',expectedRevision:d.revision},'synthetic-admin-a')).draft;
 const identity={budgetId:id,budgetVersion:1,contractDraftId:d.contractDraftId,acceptedOptionId:d.acceptedOptionId};
 return {b,a,d,r,id,identity,contractId:contractIdentity(identity),legal:f.legalContext};
}
