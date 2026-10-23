import assert from 'node:assert/strict';
import { argentinaBusinessDate, assertCurrentIssueDates } from '../src/lib/productionV2/businessDate';
const cases = [
 ['2026-10-24T00:00:00.000Z','2026-10-23'], // 21:00 Argentina
 ['2026-10-24T01:30:00.000Z','2026-10-23'],
 ['2026-10-24T02:59:59.999Z','2026-10-23'],
 ['2026-10-24T03:00:00.000Z','2026-10-24'],
 ['2027-01-01T02:59:59.999Z','2026-12-31'],
 ['2027-01-01T03:00:00.000Z','2027-01-01'],
 ['2028-03-01T02:59:59.999Z','2028-02-29'],
 ['2028-03-01T03:00:00.000Z','2028-03-01'],
];
for(const [utc,day] of cases){
 const instant=new Date(utc), formal=Object.freeze({contractIssueDate:day,promissoryNoteIssueDate:day});
 assert.equal(argentinaBusinessDate(instant),day);
 assertCurrentIssueDates(formal,instant);
 assert.equal(instant.toISOString(),utc,'Audit UTC instant unchanged');
 assert.throws(()=>assertCurrentIssueDates({...formal,promissoryNoteIssueDate:'2020-01-01'},instant),/ACTUAL_ISSUE_DATE_REQUIRED/);
 assert.throws(()=>assertCurrentIssueDates({...formal,contractIssueDate:'2020-01-01'},instant),/ACTUAL_ISSUE_DATE_REQUIRED/);
 assert.deepEqual(formal,{contractIssueDate:day,promissoryNoteIssueDate:day});
}
const accepted=Object.freeze({contractIssueDate:'2026-10-23',promissoryNoteIssueDate:'2026-10-23'});
assert.throws(()=>assertCurrentIssueDates(accepted,new Date('2026-10-24T03:00:00Z')),/ACTUAL_ISSUE_DATE_REQUIRED/);
assert.equal(accepted.contractIssueDate,'2026-10-23');
assert.throws(()=>argentinaBusinessDate(new Date(NaN)),/INVALID_BUSINESS_INSTANT/);
console.log('P2_ARGENTINA_ISSUE_DATE = PASS (8 boundaries, UTC audit, both dates, no mutation)');
