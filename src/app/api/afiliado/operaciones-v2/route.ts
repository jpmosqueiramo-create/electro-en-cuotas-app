import { NextResponse } from 'next/server';
import { admin } from '@/lib/firebaseAdmin';
import { custodyAuth } from '@/lib/operationCustodyV2Http';
import { listAffiliateOperations } from '@/lib/operationCustodyV2Server';
import { readFinancial } from '@/lib/operationFinancialV2Server';
import { affiliateEngagement } from '@/lib/affiliateEngagementV2';
import { contractHeaders } from '@/lib/contractV2Http';
export const runtime='nodejs';
export async function GET(req:Request) {
 try {
 const db=admin.firestore(),actor=await custodyAuth(req,false),operations=await listAffiliateOperations(db,actor);
 const details=await Promise.all(operations.map(async op=>{if(!op.budgetId||!op.version)throw Error('Identidad incompleta');const [finance,engagement]=await Promise.allSettled([readFinancial(db,op.budgetId,op.version,actor,'AFFILIATE'),affiliateEngagement(db,op.budgetId,op.version,actor)]);return {finance:finance.status==='fulfilled'?finance.value:null,engagement:engagement.status==='fulfilled'?engagement.value:null};}));
 const scheduledContacts=details.flatMap(d=>d.engagement&&'records'in d.engagement?(d.engagement.records??[]):[]).filter(r=>r.nextContactDate);
 const active=details.flatMap(d=>d.finance?.active?[d.finance]:[]),promises=details.flatMap(d=>d.engagement&&'records'in d.engagement?(d.engagement.records??[]):[]).filter(r=>r.kind==='PROMISE');
 return NextResponse.json({operations,overview:{assigned:operations.length,overdue:active.reduce((n,f)=>n+f.overdueCount,0),nextDueDate:active.flatMap(f=>f.nextDueDate&&f.nextDueDate>=new Date().toISOString().slice(0,10)?[f.nextDueDate]:[]).sort()[0]??null,promises:promises.length,scheduledContacts:scheduledContacts.length,nextContactDate:scheduledContacts.map(r=>r.nextContactDate!).sort()[0]??null,partial:details.some(d=>!d.finance||!d.engagement),historyLimited:true}},{headers:contractHeaders});
 }
 catch{return NextResponse.json({error:'Acceso de vendedor afiliado activo requerido.'},{status:403,headers:contractHeaders});}
}
