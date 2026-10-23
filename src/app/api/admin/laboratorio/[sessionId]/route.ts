import { NextResponse } from 'next/server';
import { admin } from '@/lib/firebaseAdmin';
import { requireLabAdministrator } from '@/lib/operationsLabAuth';
import { resolveLabExecutionContext, labRepository } from '@/lib/operationsLabContext';
import { labCircuitCommand, readLabCircuit } from '@/lib/operationsLabCircuit';
import { LabError } from '@/lib/operationsLabPolicy';
import { contractHeaders, contractJson } from '@/lib/contractV2Http';
import { validateLabSnapshot } from '@/lib/operationsLabFreeze';
import { renderLabReceipt } from '@/lib/operationsLabDocuments';
import { createHash } from 'node:crypto';
export const runtime='nodejs';
async function handle(req:Request,{params}:{params:Promise<{sessionId:string}>}){
 try{
  const uid=await requireLabAdministrator(req),{sessionId}=await params;
  const context=await resolveLabExecutionContext(admin.firestore(),uid,sessionId,process.env);
  if(req.method==='POST')return NextResponse.json(await labCircuitCommand(context,await contractJson(req)),{headers:contractHeaders});
  const document=new URL(req.url).searchParams.get('document');
  if(document?.startsWith('receipt:')){const bytes=await renderLabReceipt(context,document.slice(8));return new Response(bytes,{headers:{...contractHeaders,'Content-Type':'application/pdf','Content-Disposition':'inline; filename="TEST-RECIBO.pdf"'}});}
  if(document){
   if(!['MANDATE','PAGARE','REMITO'].includes(document))throw new LabError(400,'LAB_DOCUMENT_INVALID');
   const repo=labRepository(context),workflow=await repo.read('contracts','workflow'),id=workflow?.value?.operationId;
   if(!id)throw new LabError(404,'LAB_DOCUMENT_UNAVAILABLE');
   const [record,snapshot]=await Promise.all([repo.read('documents',id+'_'+document),repo.read('snapshots',id)]);
   if(!record||!snapshot)throw new LabError(404,'LAB_DOCUMENT_UNAVAILABLE');
   validateLabSnapshot(context,snapshot.value);
   const bytes=Buffer.from(record.value.base64,'base64');
   if(record.snapshotHash!==snapshot.value.hash||createHash('sha256').update(bytes).digest('hex')!==record.value.sha256)throw new LabError(409,'LAB_DOCUMENT_INTEGRITY');
   return new Response(bytes,{headers:{...contractHeaders,'Content-Type':'application/pdf','Content-Disposition':`inline; filename="TEST-${document}.pdf"`}});
  }
  return NextResponse.json(await readLabCircuit(context),{headers:contractHeaders});
 }catch(error){return NextResponse.json({error:error instanceof LabError?error.code:'LAB_REQUIREMENTS_NOT_MET'},{status:error instanceof LabError?error.status:409,headers:contractHeaders});}
}
export const GET=handle;
export const POST=handle;
