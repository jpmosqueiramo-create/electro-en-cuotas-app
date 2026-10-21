import { NextResponse } from 'next/server';
import { admin } from './firebaseAdmin';
import { custodyAuth,custodyParams } from './operationCustodyV2Http';
import { deliveryCommand,readDelivery } from './operationDeliveryV2Server';
import { deliveryFail,DeliveryError,type DeliverySlot } from './operationDeliveryV2';
import { saveDeliveryPhoto,readDeliveryPhoto } from './operationDeliveryV2Photos';
import { getBudgetDocumentationBucket } from './budgetDocumentationStorage';
import { contractHeaders,contractJson } from './contractV2Http';
export async function deliveryHandler(req:Request,id:string,version:string,isAdmin:boolean,photos=false){
 try{
  const actor=await custodyAuth(req,isAdmin),v=custodyParams(id,version),url=new URL(req.url),db=admin.firestore();
  if(!photos){if(url.search)deliveryFail();return NextResponse.json(req.method==='GET'?await readDelivery(db,id,v,actor):await deliveryCommand(db,id,v,await contractJson(req),actor),{headers:contractHeaders});}
  const bucket=await getBudgetDocumentationBucket();
  if(req.method==='GET'){if([...url.searchParams.keys()].some(k=>k!=='photoId'))deliveryFail();const p=await readDeliveryPhoto(db,bucket,id,v,url.searchParams.get('photoId')||'',actor);return new NextResponse(new Uint8Array(p.bytes),{headers:{...contractHeaders,'Content-Type':p.mime,'Content-Disposition':'inline'}});}
  if(url.search||!req.headers.get('content-type')?.startsWith('multipart/form-data;'))deliveryFail();
  const reader=req.body?.getReader();if(!reader)deliveryFail();let size=0;const chunks:Uint8Array[]=[];
  try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>11*1024*1024){await reader.cancel();deliveryFail();}chunks.push(value);}}finally{reader.releaseLock();}
  const form=await new Request(req.url,{method:'POST',headers:{'Content-Type':req.headers.get('content-type')!},body:Buffer.concat(chunks)}).formData();
  if([...form.keys()].length!==4||!['photoId','slot','relatedId','file'].every(k=>form.has(k)))deliveryFail();const file=form.get('file');if(!(file instanceof File))deliveryFail();
  return NextResponse.json(await saveDeliveryPhoto(db,bucket,id,v,String(form.get('photoId')),String(form.get('slot')) as DeliverySlot,String(form.get('relatedId')),Buffer.from(await file.arrayBuffer()),file.type,actor),{headers:contractHeaders});
 }catch(e){return NextResponse.json({error:isAdmin&&e instanceof DeliveryError?e.message:'Entrega o evidencia no disponible para esta identidad. Recargá y verificá los requisitos.'},{status:403,headers:contractHeaders});}
}
