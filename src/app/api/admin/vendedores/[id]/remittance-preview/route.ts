import {NextResponse} from 'next/server';
import {admin} from '@/lib/firebaseAdmin';
import {custodyAuth} from '@/lib/operationCustodyV2Http';
import {contractHeaders} from '@/lib/contractV2Http';
import {opaque} from '@/lib/contractV2';
import {withAdminCommissionAccess} from '@/lib/affiliateCommissionAccess';
import {listRemittanceCollections,previewSelectedCashRemittance} from '@/lib/settlementsEngine';
export async function GET(req:Request,ctx:{params:Promise<{id:string}>}){
 let actor;try{actor=await custodyAuth(req,true);}catch{return NextResponse.json({error:'Acceso administrativo requerido.'},{status:403,headers:contractHeaders});}
 try{const {id}=await ctx.params;opaque(id);const q=new URL(req.url).searchParams,ids=q.getAll('collectionId');
 if([...q.keys()].some(k=>!['collectionId','deductCommission','cursor'].includes(k))||q.getAll('deductCommission').length>1||q.getAll('cursor').length>1||ids.length&&(!['0','1'].includes(q.get('deductCommission')||'')||q.has('cursor'))||!ids.length&&q.has('deductCommission'))throw Error('Selección inválida.');
 const cursor=q.get('cursor')||undefined;if(cursor&&!/^[A-Za-z0-9_-]{1,200}$/.test(cursor))throw Error('Página inválida.');
 const result=ids.length?await withAdminCommissionAccess(admin.firestore(),actor.uid,false,()=>previewSelectedCashRemittance(admin.firestore(),id,{collectionIds:ids,deductCommission:q.get('deductCommission')==='1'})):await withAdminCommissionAccess(admin.firestore(),actor.uid,false,()=>listRemittanceCollections(admin.firestore(),id,cursor));return NextResponse.json(result,{headers:contractHeaders});
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:'No se pudieron verificar los importes de la rendición.'},{status:409,headers:contractHeaders});}
}
