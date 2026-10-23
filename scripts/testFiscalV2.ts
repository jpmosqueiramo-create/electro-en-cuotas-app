import assert from 'node:assert/strict';
import { fiscalProjection,fiscalReceiptReference,type FiscalRequest } from '../src/lib/fiscalV2';
export const fiscalFixture=():FiscalRequest=>({operationId:'op_'+'a'.repeat(64),snapshotId:'synthetic-snapshot',snapshotHash:'b'.repeat(64),date:'2026-01-10',documentClass:'B',kind:'INVOICE',pointOfSale:1,receiverStatus:'FINAL_CONSUMER',associatedId:null,policy:{id:'SYNTHETIC_NOT_LOOP_TAX_ADVICE',version:1,validFrom:'2026-01-01',validTo:'2026-12-31',confirmedBy:'synthetic-accountant',reference:'SYNTHETIC_ONLY',issuerStatus:'RI',allowedClasses:['A','B'],concepts:{MANAGEMENT:{treatment:'TAXED',rateBps:2100,basis:'NET',reference:'SYNTHETIC_RATE_NOT_PRODUCTIVE'},LOGISTICS:{treatment:'EXEMPT',rateBps:0,basis:'NET',reference:'SYNTHETIC_EXEMPTION_NOT_REAL'}}},lines:[{concept:'MANAGEMENT',baseCents:10000},{concept:'LOGISTICS',baseCents:2000}]});
const f=fiscalFixture(),p=fiscalProjection(f);assert.equal(p.taxCents,2100);assert.equal(p.totalCents,14100);assert.equal(p.productiveIssuance,false);
assert.equal(fiscalProjection({...f,receiverStatus:'RI',documentClass:'A'}).taxDisplay,'DISCRIMINATED');
assert.throws(()=>fiscalProjection({...f,documentClass:'C'}));
const c={...f,documentClass:'C' as const,policy:{...f.policy,issuerStatus:'EXEMPT' as const,allowedClasses:['C' as const]},lines:[{concept:'LOGISTICS' as const,baseCents:2000}]};assert.equal(fiscalProjection(c).taxCents,0);
assert.throws(()=>fiscalProjection({...f,lines:[{concept:'MANDATE_CAPITAL',baseCents:58000000}]}));
assert.throws(()=>fiscalProjection({...f,date:'2027-01-01'}));assert.throws(()=>fiscalProjection({...f,kind:'CREDIT_NOTE'}));
assert.throws(()=>fiscalProjection({...f,lines:[{concept:'MANAGEMENT',baseCents:1.2}]}));
assert.throws(()=>fiscalProjection({...f,policy:{...f.policy,confirmedBy:''}}));
assert.deepEqual(fiscalReceiptReference('synthetic-payment',7250000,['invoice-synthetic']),{paymentId:'synthetic-payment',amountCents:7250000,invoiceIds:['invoice-synthetic'],createsInvoice:false,calculatesVat:false});
console.log('FISCAL_A_B_C_EXPLICIT_RATES_EXEMPTION_VALIDITY_RECEIPT_NO_DUPLICATE_TAX=PASS');

export function grossFiscalFixture():FiscalRequest{const f=fiscalFixture();return {...f,policy:{...f.policy,version:2,concepts:{CONTRACT_SERVICES:{treatment:'TAXED',rateBps:2100,basis:'GROSS_INCLUDED',reference:'SYNTHETIC_AGGREGATE_NO_ALLOCATION'}}},lines:[{concept:'CONTRACT_SERVICES',grossCents:116000000}]};}
const gross=grossFiscalFixture(),extracted=fiscalProjection(gross);
assert.equal(extracted.totalCents,116000000);assert.equal(extracted.lines[0].baseCents,95867769);assert.equal(extracted.taxCents,20132231);
for(const rateBps of [0,1050,2100,2700])for(const grossCents of [1,2,5,121,9999,116000000,Number.MAX_SAFE_INTEGER]){
 const request={...gross,policy:{...gross.policy,concepts:{CONTRACT_SERVICES:{...gross.policy.concepts.CONTRACT_SERVICES!,rateBps}}},lines:[{concept:'CONTRACT_SERVICES' as const,grossCents}]};
 const result=fiscalProjection(request);assert.equal(result.totalCents,grossCents);assert.equal(result.lines[0].baseCents+result.taxCents,grossCents);assert(result.taxCents>=0);
}
assert.throws(()=>fiscalProjection({...gross,lines:[{concept:'CONTRACT_SERVICES',baseCents:100}]}));
assert.throws(()=>fiscalProjection({...gross,policy:{...gross.policy,concepts:{}}}));
assert.throws(()=>fiscalProjection({...gross,lines:[{concept:'CONTRACT_SERVICES',grossCents:1.2}]}));
console.log('GROSS_INCLUDED_EXTRACTION_EXACT_NO_ADDED_VAT_NO_ALLOCATION=PASS');
