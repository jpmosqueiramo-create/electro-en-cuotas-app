import {NextRequest,NextResponse} from 'next/server';
import {admin} from '@/lib/firebaseAdmin';
import {publicClientConformity} from '@/lib/clientConformityServer';
import {contractHeaders,contractJson} from '@/lib/contractV2Http';
import {isPublicSolicitudOriginAllowed} from '@/lib/publicSolicitudOrigin';
export const runtime='nodejs';
async function handle(req:NextRequest,ctx:{params:Promise<{requestId:string}>}){
 try{const origin=req.headers.get('origin');if(req.nextUrl.search||req.headers.get('sec-fetch-site')==='cross-site'||!isPublicSolicitudOriginAllowed(origin)||(req.method==='POST'&&!origin))throw Error();
 return NextResponse.json(await publicClientConformity(admin.firestore(),(await ctx.params).requestId,req.headers.get('x-client-conformity-token')??'',req.method==='POST'?await contractJson(req):undefined),{headers:contractHeaders});
 }catch{return NextResponse.json({error:'El enlace no está disponible. Solicitá uno nuevo a Cuenta Hogar.'},{status:400,headers:contractHeaders});}
}
export const GET=handle;export const POST=handle;
