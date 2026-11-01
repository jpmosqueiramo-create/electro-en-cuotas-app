import { NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/adminAuth';
import { admin } from '@/lib/firebaseAdmin';
import { applyCatalogDelete, catalogDeleteIds, CatalogDeleteError, previewCatalogDelete } from '@/lib/catalogBulkDelete';
export const runtime='nodejs';
export async function POST(req:Request){
 const auth=await verifyAdminAuth(req);if(!auth.authorized||!auth.uid)return auth.errorResponse??NextResponse.json({error:'Acceso administrativo requerido.'},{status:401});
 const headers={'Cache-Control':'private, no-store'};
 try{
  const raw=await req.text();if(Buffer.byteLength(raw,'utf8')>160000)throw new CatalogDeleteError(413,'La selección es demasiado grande.');
  let body;try{body=JSON.parse(raw);}catch{throw new CatalogDeleteError(400,'Selección inválida.');}
  if(!body||typeof body!=='object'||Array.isArray(body)||!['PREVIEW','APPLY'].includes(body.action)||Object.keys(body).some(k=>!['action','ids','digest'].includes(k)))throw new CatalogDeleteError(400,'Selección inválida.');
  const ids=catalogDeleteIds(body.ids);
  if(body.action==='APPLY'&&typeof body.digest!=='string')throw new CatalogDeleteError(400,'Revisá la selección antes de confirmar.');
  return NextResponse.json(body.action==='PREVIEW'?await previewCatalogDelete(admin.firestore(),ids):await applyCatalogDelete(admin.firestore(),ids,body.digest),{headers});
 }catch(e){return NextResponse.json({error:e instanceof CatalogDeleteError?e.message:'No se pudo completar la eliminación. Actualizá el catálogo antes de reintentar.'},{status:e instanceof CatalogDeleteError?e.status:500,headers});}
}
