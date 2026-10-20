import assert from 'node:assert/strict';
import {amountInWords,companyProfile,installmentBalance} from '../src/lib/contractDocuments/businessPolicy';
import {applyOperation,newOperations,operationReadiness} from '../src/lib/contractDocuments/operations';
import {documentReviewFixture} from './helpers/contractDocumentFixtures';
import {generateContractReviewPair} from '../src/lib/contractDocuments/pdf';
import {projectContractReview} from '../src/lib/contractDocuments/projection';
import {sealContractSnapshot} from '../src/lib/contractSnapshotV2';
assert.equal(companyProfile.taxId,'30-71962686-2');
for(const [n,words] of [[0,'CERO PESOS ARGENTINOS CON 00/100'],[1.01,'UN PESO ARGENTINO CON 01/100'],[100000,'CIEN MIL PESOS ARGENTINOS CON 00/100'],[1234567.89,'UN MILLÓN DOSCIENTOS TREINTA Y CUATRO MIL QUINIENTOS SESENTA Y SIETE PESOS ARGENTINOS CON 89/100'],[21000000,'VEINTIÚN MILLONES DE PESOS ARGENTINOS CON 00/100']] as const)assert.equal(amountInWords(n),words);
assert.throws(()=>amountInWords(1.001));assert.throws(()=>amountInWords(Number.NaN));assert.throws(()=>amountInWords(1e15));
assert.deepEqual(installmentBalance(100000,[]),{policy:'NONE',surcharge:0,outstanding:100000});assert.equal(installmentBalance(100000,[25000,10000]).outstanding,65000);assert.equal(installmentBalance(.3,[.1,.2]).outstanding,0);assert.throws(()=>installmentBalance(10,[11]));
let state=newOperations('Residencia sintética');const now='2026-10-19T12:00:00.000Z';
const delivery=()=>({action:'RECORD_DELIVERY',commandId:'delivery',expectedRevision:state.revision});
assert.throws(()=>applyOperation(state,delivery(),'synthetic-admin',now));
for(const kind of ['customerMandate','customerNote','deliveryReceipt']){
 state=applyOperation(state,{action:'RECORD_SIGNATURE',commandId:kind,expectedRevision:state.revision,kind,signedOn:'2026-10-19',actualPlace:'Localidad efectiva sintética',originalReference:`original-${kind}`,channel:'WHATSAPP'},'synthetic-admin',now);
 if(kind==='customerMandate')assert.throws(()=>applyOperation(state,delivery(),'synthetic-admin',now));
}
assert.equal(operationReadiness(state).deliveryAllowed,true);assert.equal(operationReadiness(state).representativePending,true);
state=applyOperation(state,delivery(),'synthetic-admin',now);assert.equal(state.delivery.state,'DELIVERED');assert.equal(state.custody,'PENDING');assert.equal(state.legalFormalization,'PENDING');
assert.throws(()=>applyOperation(state,{action:'FORMALIZED'},'synthetic-admin',now));
assert.throws(()=>applyOperation(state,{action:['RECEIVE_ORIGINALS'],commandId:'bad',expectedRevision:state.revision},'synthetic-admin',now));
const snapshot=documentReviewFixture(),before=JSON.stringify(snapshot);generateContractReviewPair(snapshot);assert.equal(JSON.stringify(snapshot),before);
assert.equal(projectContractReview(snapshot).reference.condition,'Pendiente');
const {integrity:_hash,...raw}=snapshot;void _hash;
for(const condition of ['NUEVO','USADO']){
 const s=sealContractSnapshot({...raw,documentContext:{...raw.documentContext,parameters:{...raw.documentContext.parameters,goodsConditionVersion:'GOODS_CONDITION_V1',goodsCondition:condition}}});
 assert.equal(projectContractReview(s).reference.condition,condition);assert.equal(generateContractReviewPair(s).mandate.pages,2);
}
console.log('APPROVED_BUSINESS_RULES_WORDS_ZERO_SURCHARGE_SIGNATURES_CONDITION_INTEGRITY = PASS');
