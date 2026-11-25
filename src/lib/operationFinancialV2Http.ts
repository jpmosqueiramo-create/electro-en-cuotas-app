import {financialReceiptPdf} from './operationFinancialReceiptPdf';
import { NextResponse } from 'next/server';
import { admin } from './firebaseAdmin';
import { custodyAuth,custodyParams } from './operationCustodyV2Http';
import { contractHeaders,contractJson } from './contractV2Http';
import { FinancialV2Error } from './operationFinancialV2';
import { isFirestoreTransportError } from './firestoreTransaction';
import { readFinancial,readFinancialReceipt,financialCommand,type FinancialRole } from './operationFinancialV2Server';
export async function financialHandler(req:Request,id:string,version:string,role:FinancialRole){try{
 const actor=await custodyAuth(req,role==='ADMIN'),v=custodyParams(id,version);const params=new URL(req.url).searchParams;if([...params.keys()].some(k=>!['cursor','receipt'].includes(k))||req.method!=='GET'&&params.size)throw Error();const cursor=params.get('cursor')||undefined;if(cursor&&cursor.length>1024)throw Error();
 if(req.method!=='GET'&&role==='CLIENT')throw Error();
 if(params.has('receipt')){if(req.method!=='GET'||params.size!==1)throw Error();const source=await readFinancialReceipt(admin.firestore(),id,v,actor,role,params.get('receipt')!);return new NextResponse(financialReceiptPdf(source),{headers:{...contractHeaders,'Content-Type':'application/pdf','Content-Disposition':'inline; filename=recibo.pdf'}});}
 return NextResponse.json(req.method==='GET'?await readFinancial(admin.firestore(),id,v,actor,role,cursor):await financialCommand(admin.firestore(),id,v,await contractJson(req),actor,role==='AFFILIATE'?'AFFILIATE':'ADMIN'),{headers:contractHeaders});
 }catch(e){
  if(isFirestoreTransportError(e))return NextResponse.json({error:'No se recibió una confirmación definitiva. Reintentá la misma acción para consultar su resultado sin duplicarlo.'},{status:503,headers:contractHeaders});
  return NextResponse.json({error:role!=='CLIENT'&&e instanceof FinancialV2Error?e.message:'Información financiera no disponible para esta identidad.'},{status:403,headers:contractHeaders});}}
