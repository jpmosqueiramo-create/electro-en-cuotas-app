import assert from 'node:assert/strict';
import { affiliateFollowup, emptyFollowupFilters, followupAge, followupStatus, matchesFollowup, selectAffiliateFollowup } from '../src/lib/affiliateFollowup';
import { financialSummary } from '../src/lib/operationFinancialV2';
import type { CollectionFinancial } from '../src/lib/collectionsOverview';
const today='2026-10-27';
const finance={active:true,asOfDate:today,contractNumber:'CH-DEMO',...financialSummary({totalCents:30000,installments:[{number:1,dueDate:'2026-09-20',amountCents:10000},{number:2,dueDate:today,amountCents:10000},{number:3,dueDate:'2026-11-02',amountCents:10000}]},[{reversedAt:null,allocations:[{installmentNumber:1,amountCents:4000}]}],today)} as CollectionFinancial;
const followup=affiliateFollowup(finance,today),row={operationId:'demo',client:'María José Pérez',locality:'Lincoln',saleDate:'2026-09-01',followup};
assert.equal(followup.balanceCents,26000);assert.equal(followup.installments[0].balanceCents,6000);assert.equal(followupAge(followup),37);
assert.equal(followupStatus(followup),'OVERDUE');assert(matchesFollowup(followup,'TODAY'));assert(matchesFollowup(followup,'SOON'));
assert.equal(followupStatus(affiliateFollowup(null,today)),'UNKNOWN');assert.equal(affiliateFollowup(null,today).balanceCents,null);
assert.equal(followupStatus(affiliateFollowup({active:false} as CollectionFinancial,today)),'INACTIVE');
for(const query of ['perez maria','JOSE','ch-demo','lincoln'])assert.equal(selectAffiliateFollowup([row],{...emptyFollowupFilters,query}).length,1);
assert.equal(selectAffiliateFollowup([row],{...emptyFollowupFilters,age:'31:60'}).length,1);
assert.equal(selectAffiliateFollowup([row],{...emptyFollowupFilters,age:'8:30'}).length,0);
assert.equal(selectAffiliateFollowup([row],{...emptyFollowupFilters,from:row.saleDate,to:row.saleDate}).length,1);
assert.equal(selectAffiliateFollowup([row],{...emptyFollowupFilters,from:'2026-09-02'}).length,0);
const old=JSON.stringify(row);selectAffiliateFollowup([row],emptyFollowupFilters);assert.equal(JSON.stringify(row),old);
assert.deepEqual(Object.keys(followup).sort(),['state','asOfDate','contractNumber','balanceCents','installments'].sort());
console.log('AFFILIATE_FOLLOWUP_PARTIAL_PAYMENTS_SEARCH_AGE_DATES_STATUS_ALLOWLIST = PASS');
for(const [days,bucket] of [[7,'1:7'],[8,'8:30'],[30,'8:30'],[31,'31:60'],[60,'31:60'],[61,'61:90'],[90,'61:90'],[91,'91:999999']] as const){
 const ageRow={...row,followup:{...followup,installments:[{number:1,dueDate:'2026-01-01',balanceCents:1,overdue:true,daysPastDue:days}]}};
 assert.equal(selectAffiliateFollowup([ageRow],{...emptyFollowupFilters,age:bucket}).length,1);
}
const unknown={...row,operationId:'unknown',followup:affiliateFollowup(null,today)};
assert.deepEqual(selectAffiliateFollowup([row,unknown],emptyFollowupFilters).map(r=>r.operationId),['unknown','demo']);
assert.equal(selectAffiliateFollowup([unknown],{...emptyFollowupFilters,age:'1:7'}).length,0);
