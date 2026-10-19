import assert from 'node:assert/strict';
import { budgetFixture } from './helpers/budgetV2Fixtures';
import { buildAcceptance } from '../src/lib/budgetAcceptanceV2';
import { contractEconomics,contractSchedule,newContractDraft,completeness,submissionPayload,exact } from '../src/lib/contractV2';
import { calcularPlanReferenciaCatalogo } from '../src/lib/catalogReference';
export function fixture(id='p5c-fixture'){
  const b=budgetFixture(id);b.estado='EMITIDO';b.issuedAt='2026-10-18T13:00:00.000Z';
  const a=buildAcceptance(b,{budgetId:id,version:1,acceptedOptionId:'option-1',preferredPlanCuotas:12,commandId:'accept'},'admin-demo','2026-10-18T14:00:00.000Z');
  return {b,a};
}
export const clientPayload={personalData:{fullName:'Cliente sintético',dni:'12345678',address:'Domicilio demo',locality:'Lincoln',email:'demo@example.test',whatsapp:'5491100000000'},employmentData:{cuil:'',employerOrWorkName:'',workAddress:''},preferredMonthlyDueDay:30};
export function modelTests(){
 const {b,a}=fixture(),before=JSON.stringify({b,a}),d=newContractDraft(b,a,'admin-demo','2026-12-01T00:00:00.000Z');
 assert.equal(d.personalData.address,'');assert.equal(d.personalData.email,'');assert.equal(d.economicTerms,null);assert.equal(d.preferredPlanCuotas,12);assert.equal('imagenUrls' in d.acceptedReferenceSnapshot,false);assert.equal(d.preparedAt,'2026-12-01T00:00:00.000Z');assert.ok(completeness(d).length);
 for(let n=1;n<=18;n++){const e=contractEconomics(a.optionSnapshot.referenceSnapshot,n),shared=calcularPlanReferenciaCatalogo({costoProveedor:580000,cuotas:n,factor:a.optionSnapshot.referenceSnapshot.factoresSnapshot[n]});assert.equal(e.capitalAmount,580000);assert.equal(e.factorComputedTotal,shared.valorTotalReferencia);assert.equal(e.contractInstallmentAmount,shared.cuotaExhibidaCatalogo);assert.equal(e.contractTotal,n*e.contractInstallmentAmount);assert.equal(e.serviceAmount,e.contractTotal-580000);assert.equal(e.roundingAdjustment,e.contractTotal-e.factorComputedTotal);assert.equal(e.capitalAmount+e.serviceAmount,e.contractTotal);}
 for(const n of [0,19,1.5,NaN])assert.throws(()=>contractEconomics(a.optionSnapshot.referenceSnapshot,n));
 assert.throws(()=>contractEconomics({...a.optionSnapshot.referenceSnapshot,factoresSnapshot:{}},8));
 const decimal=contractEconomics({...a.optionSnapshot.referenceSnapshot,costoProveedorSnapshot:580000.5},8);assert.equal(decimal.capitalAmount,580000.5);assert.equal(decimal.capitalAmount+decimal.serviceAmount,decimal.contractTotal);
 const e=contractEconomics(a.optionSnapshot.referenceSnapshot,8);assert.equal(e.factorSnapshot,2.31);assert.equal(e.contractInstallmentAmount,167490);assert.equal(e.contractTotal,1339920);assert.equal(e.roundingAdjustment,120);
 const schedule=contractSchedule(e,'2026-12-15',30);assert.deepEqual(schedule.map(p=>p.dueDate),['2026-12-15','2027-01-30','2027-02-28','2027-03-30','2027-04-30','2027-05-30','2027-06-30','2027-07-30']);
 for(const [first,day,expected] of [['2027-01-31',31,'2027-02-28'],['2028-01-31',31,'2028-02-29'],['2028-01-29',29,'2028-02-29'],['2027-03-31',31,'2027-04-30'],['2026-12-31',31,'2027-01-31']] as const)assert.equal(contractSchedule(e,first,day)[1].dueDate,expected);
 for(const date of ['2027-02-29','2027-04-31','2026-12-15T00:00:00Z'])assert.throws(()=>contractSchedule(e,date,30));
 assert.equal(schedule.reduce((s,p)=>s+p.amount,0),e.contractTotal);assert.equal(JSON.stringify({b,a}),before);
 assert.deepEqual(submissionPayload(clientPayload),clientPayload);for(const day of [0,32,1.5])assert.throws(()=>submissionPayload({...clientPayload,preferredMonthlyDueDay:day}));
 assert.throws(()=>submissionPayload({...clientPayload,capitalAmount:10}));assert.throws(()=>submissionPayload({...clientPayload,personalData:{...clientPayload.personalData,email:''}}));assert.throws(()=>exact({x:1,y:2},['x']));
 assert.deepEqual(completeness({...d,personalData:clientPayload.personalData,economicTerms:e,firstInstallmentDueDate:'2026-12-15',preferredMonthlyDueDay:30,paymentScheduleDraft:schedule}),[]);
 console.log('P5C_MODEL_TESTS = PASS');console.log('P5C_SCHEDULE_TESTS = PASS');
}
modelTests();
