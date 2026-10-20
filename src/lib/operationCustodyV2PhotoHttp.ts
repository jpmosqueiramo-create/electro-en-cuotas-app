import { NextResponse } from 'next/server';
import { admin } from './firebaseAdmin';
import { custodyAuth, custodyParams } from './operationCustodyV2Http';
import { custodyFail } from './operationCustodyV2';
import { contractHeaders } from './contractV2Http';
import { getBudgetDocumentationBucket } from './budgetDocumentationStorage';
import { saveCustodyPhoto, readCustodyPhoto } from './operationCustodyV2Photos';
export async function custodyPhotoHandler(req:Request,id:string,version:string,isAdmin:boolean) {
 try {
  const actor=await custodyAuth(req,isAdmin),v=custodyParams(id,version),url=new URL(req.url);
  const bucket=await getBudgetDocumentationBucket();
  if(req.method==='GET') {
   if([...url.searchParams.keys()].some(k=>k!=='photoId'))custodyFail();
   const p=await readCustodyPhoto(admin.firestore(),bucket,id,v,url.searchParams.get('photoId')||'',actor);
   return new NextResponse(new Uint8Array(p.bytes),{headers:{...contractHeaders,'Content-Type':p.mime,'Content-Disposition':'inline'}});
  }
  if(url.search||!req.headers.get('content-type')?.startsWith('multipart/form-data;'))custodyFail();
  const reader=req.body?.getReader();if(!reader)custodyFail();const chunks:Uint8Array[]=[];let size=0;
  try {while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>11*1024*1024){await reader.cancel();custodyFail();}chunks.push(value);}}finally{reader.releaseLock();}
  const form=await new Request(req.url,{method:'POST',headers:{'Content-Type':req.headers.get('content-type')!},body:Buffer.concat(chunks)}).formData();
  if([...form.keys()].length!==3||!['incidentId','photoId','file'].every(k=>form.has(k)))custodyFail();
  const f=form.get('file');if(!(f instanceof File))custodyFail();
  return NextResponse.json(await saveCustodyPhoto(admin.firestore(),bucket,id,v,String(form.get('incidentId')),String(form.get('photoId')),Buffer.from(await f.arrayBuffer()),f.type,actor),{headers:contractHeaders});
 }catch{return NextResponse.json({error:'No se pudo consultar o conservar la fotografía privada. Reintentá la misma carga.'},{status:403,headers:contractHeaders});}
}
