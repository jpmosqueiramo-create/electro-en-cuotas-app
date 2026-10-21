import { NextResponse } from 'next/server';
import { admin } from '@/lib/firebaseAdmin';
import { clientPortalUid } from '@/lib/operationClientV2Http';
import { listClientServices } from '@/lib/operationClientV2Server';
import { contractHeaders } from '@/lib/contractV2Http';
export const runtime='nodejs';
export async function GET(req:Request) {
 try{return NextResponse.json({services:await listClientServices(admin.firestore(),await clientPortalUid(req))},{headers:contractHeaders});}
 catch{return NextResponse.json({error:'No se pudo verificar el acceso a servicios V2.'},{status:403,headers:contractHeaders});}
}
