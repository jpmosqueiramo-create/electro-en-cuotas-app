import { NextResponse } from 'next/server';
import { admin } from './firebaseAdmin';
import { custodyAuth,custodyParams } from './operationCustodyV2Http';
import { contractHeaders,contractJson } from './contractV2Http';
import { FinancialV2Error } from './operationFinancialV2';
import { readFinancial,financialCommand,type FinancialRole } from './operationFinancialV2Server';
export async function financialHandler(req:Request,id:string,version:string,role:FinancialRole){try{
 const actor=await custodyAuth(req,role==='ADMIN'),v=custodyParams(id,version);if(new URL(req.url).search)throw Error();
 if(req.method!=='GET'&&role!=='ADMIN')throw Error();
 return NextResponse.json(req.method==='GET'?await readFinancial(admin.firestore(),id,v,actor,role):await financialCommand(admin.firestore(),id,v,await contractJson(req),actor),{headers:contractHeaders});
 }catch(e){return NextResponse.json({error:role==='ADMIN'&&e instanceof FinancialV2Error?e.message:'Información financiera no disponible para esta identidad.'},{status:403,headers:contractHeaders});}}
