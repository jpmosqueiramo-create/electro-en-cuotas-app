import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {NextResponse} from 'next/server';
import {verifyAdminAuth} from '@/lib/adminAuth';
import {contractContingencyModels} from '@/lib/contractContingencyModels';

export const runtime='nodejs';
export async function GET(req:Request){
 const auth=await verifyAdminAuth(req);
 if(!auth.authorized||!auth.uid)return auth.errorResponse??NextResponse.json({error:'Acceso administrativo requerido.'},{status:401});
 const headers={'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','X-Robots-Tag':'noindex, nofollow, noarchive'};
 const model=contractContingencyModels.find(x=>x.id===new URL(req.url).searchParams.get('modelo'));
 if(!model)return NextResponse.json({error:'Modelo no disponible.'},{status:404,headers});
 try{
  // The filename comes exclusively from the fixed catalog, never from request paths.
  const bytes=await readFile(path.join(process.cwd(),'src/assets/contract-contingency',model.filename));
  if(bytes.length!==model.sizeBytes||createHash('sha256').update(bytes).digest('hex')!==model.sha256)throw Error('MODEL_INTEGRITY');
  return new NextResponse(new Uint8Array(bytes),{headers:{...headers,'Content-Type':'application/pdf','Content-Disposition':`attachment; filename="${model.filename}"`,'Content-Length':String(bytes.length)}});
 }catch{return NextResponse.json({error:'No se pudo descargar el modelo. Volvé a intentar.'},{status:500,headers});}
}
