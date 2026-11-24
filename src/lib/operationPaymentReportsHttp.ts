import { NextResponse } from 'next/server';
import { admin } from './firebaseAdmin';
import { custodyAuth, custodyParams } from './operationCustodyV2Http';
import { contractHeaders, contractJson } from './contractV2Http';
import { FinancialV2Error } from './operationFinancialV2';
import type { FinancialRole } from './operationFinancialV2Server';
import { readPaymentReports, submitPaymentReport, decidePaymentReport, pendingPaymentReports } from './operationPaymentReportsServer';
export async function paymentReportsHandler(req:Request,id:string,version:string,role:FinancialRole){
  try{
    const actor=await custodyAuth(req,role==='ADMIN'),v=custodyParams(id,version),q=new URL(req.url).searchParams;
    if([...q.keys()].some(k=>k!=='cursor')||q.getAll('cursor').length>1||req.method!=='GET'&&q.size)throw Error('INVALID');
    const result=req.method==='GET'?await readPaymentReports(admin.firestore(),id,v,actor,role,q.get('cursor')||undefined):role==='ADMIN'?await decidePaymentReport(admin.firestore(),id,v,await contractJson(req),actor):await submitPaymentReport(admin.firestore(),id,v,await contractJson(req),actor,role);
    return NextResponse.json(result,{headers:contractHeaders});
  }catch(e){return NextResponse.json({error:e instanceof FinancialV2Error?e.message:'No se pudo verificar el acceso al informe de pago.'},{status:e instanceof FinancialV2Error?409:403,headers:contractHeaders});}
}
export async function paymentReportsQueue(req:Request){try{await custodyAuth(req,true);const q=new URL(req.url).searchParams;if([...q.keys()].some(k=>k!=='cursor')||q.getAll('cursor').length>1)throw Error();return NextResponse.json(await pendingPaymentReports(admin.firestore(),q.get('cursor')||undefined),{headers:contractHeaders});}catch{return NextResponse.json({error:'No se pudo consultar la bandeja de pagos pendientes.'},{status:403,headers:contractHeaders});}}
