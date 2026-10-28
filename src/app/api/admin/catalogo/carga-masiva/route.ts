import { NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/adminAuth';
import { BulkInputError } from '@/lib/catalogBulk';
import { admin } from '@/lib/firebaseAdmin';
import { applyCatalogBulk, BulkError, previewCatalogBulk } from '@/lib/catalogBulkServer';
export const runtime='nodejs';
export async function POST(req:Request){
 const auth=await verifyAdminAuth(req);if(!auth.authorized||!auth.uid)return auth.errorResponse??NextResponse.json({error:'Acceso administrativo requerido.'},{status:401});
 const headers={'Cache-Control':'private, no-store'};
 try{
  const raw=await req.text();if(Buffer.byteLength(raw,'utf8')>800000)throw new BulkError(413,'La carga es demasiado grande. Máximo 100 productos.');
  let body;try{body=JSON.parse(raw);}catch{throw new BulkError(400,'Formato de carga inválido.');}
  if(!body||typeof body!=='object'||Array.isArray(body)||typeof body.text!=='string'||typeof body.updatePublished!=='boolean'||!['PREVIEW','APPLY'].includes(body.action)||Object.keys(body).some(k=>!['action','text','updatePublished','digest','commandId'].includes(k)))throw new BulkError(400,'Formato de carga inválido.');
  if(body.action==='APPLY'&&(typeof body.digest!=='string'||typeof body.commandId!=='string'))throw new BulkError(400,'Revisá la carga antes de confirmar.');
  const result=body.action==='PREVIEW'?await previewCatalogBulk(admin.firestore(),body.text,body.updatePublished):await applyCatalogBulk(admin.firestore(),body,auth.uid);
  return NextResponse.json(result,{headers});
 }catch(e){if(e instanceof BulkError)return NextResponse.json({error:e.message},{status:e.status,headers});if(e instanceof BulkInputError)return NextResponse.json({error:e.message},{status:400,headers});return NextResponse.json({error:'No se pudo completar la carga. Si perdiste la respuesta, reintentá la misma confirmación.'},{status:500,headers});}
}
