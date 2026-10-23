import {NextResponse} from 'next/server';
import {admin} from '@/lib/firebaseAdmin';
import {verifyAdminAuth} from '@/lib/adminAuth';
import {isAdminEmail} from '@/lib/adminIdentity';
import {contractHeaders} from '@/lib/contractV2Http';
import {isAdminSolicitudSource} from '@/lib/adminSolicitudesReadModel';
import {readAdminRequestPage} from '@/lib/adminSolicitudesServer';
export const runtime='nodejs';
export async function GET(req:Request){
 const auth=await verifyAdminAuth(req);if(!auth.authorized)return auth.errorResponse!;
 try{await admin.auth().verifyIdToken(req.headers.get('authorization')!.slice(7),true);const user=await admin.auth().getUser(auth.uid!);if(user.disabled||!user.emailVerified||!isAdminEmail(user.email))throw Error('INACTIVE');}
 catch{return NextResponse.json({error:'Acceso administrativo no vigente.'},{status:403,headers:contractHeaders});}
 const url=new URL(req.url),source=url.searchParams.get('source')??'',cursor=url.searchParams.get('cursor');
 if(!isAdminSolicitudSource(source)||cursor!==null&&(!cursor||cursor.includes('/')||Buffer.byteLength(cursor)>1500))return NextResponse.json({error:'Referencia de página inválida.'},{status:400,headers:contractHeaders});
 try{return NextResponse.json(await readAdminRequestPage(admin.firestore(),source,cursor),{headers:contractHeaders});}
 catch{return NextResponse.json({error:'No se pudo consultar esta fuente de solicitudes.'},{status:503,headers:contractHeaders});}
}
