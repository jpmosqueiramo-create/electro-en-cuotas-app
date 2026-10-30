import {NextRequest,NextResponse} from 'next/server';
import {verifyAdminAuth} from '@/lib/adminAuth';
import {admin} from '@/lib/firebaseAdmin';
import {createClientConformityLink} from '@/lib/clientConformityServer';
import {contractHeaders,contractJson} from '@/lib/contractV2Http';
import {isPublicSolicitudOriginAllowed} from '@/lib/publicSolicitudOrigin';
export const runtime='nodejs';
export async function POST(req:NextRequest,ctx:{params:Promise<{budgetId:string;version:string}>}){
 const auth=await verifyAdminAuth(req);if(!auth.authorized)return NextResponse.json({error:'Acceso Admin requerido.'},{status:auth.errorResponse?.status===403?403:401,headers:contractHeaders});
 try{if(req.nextUrl.search||req.headers.get('sec-fetch-site')==='cross-site'||!isPublicSolicitudOriginAllowed(req.headers.get('origin')))throw Error('Origen no permitido.');
 const {budgetId,version}=await ctx.params;if(!/^[1-9]\d*$/.test(version))throw Error('Versión inválida.');
 return NextResponse.json(await createClientConformityLink(admin.firestore(),budgetId,Number(version),await contractJson(req),auth.uid!),{headers:contractHeaders});
 }catch{return NextResponse.json({error:'No se pudo generar el enlace. Guardá los datos completos y actualizá la operación antes de reintentar.'},{status:409,headers:contractHeaders});}
}
