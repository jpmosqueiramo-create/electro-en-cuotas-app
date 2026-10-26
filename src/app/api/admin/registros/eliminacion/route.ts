import {NextResponse} from 'next/server';
import {verifyAdminAuth} from '@/lib/adminAuth';
import {admin} from '@/lib/firebaseAdmin';
import {isAdminEmail} from '@/lib/adminIdentity';
import {contractJson,contractHeaders} from '@/lib/contractV2Http';
import {previewAdministrativeRemoval,manageAdministrativeRecord} from '@/lib/adminRecordRemovalServer';
export const runtime='nodejs';
export async function POST(req:Request){
 const auth=await verifyAdminAuth(req);if(!auth.authorized)return auth.errorResponse!;
 try{await admin.auth().verifyIdToken(req.headers.get('authorization')!.slice(7),true);const u=await admin.auth().getUser(auth.uid!);if(u.disabled||!u.emailVerified||!isAdminEmail(u.email))throw Error();}catch{return NextResponse.json({error:'Acceso administrativo no vigente.'},{status:403,headers:contractHeaders});}
 try{
  const body=await contractJson(req) as Record<string,unknown>;
  if(body.mode==='PREVIEW'&&Object.keys(body).sort().join(',')==='mode,subject')return NextResponse.json({preview:await previewAdministrativeRemoval(admin.firestore(),body.subject)},{headers:contractHeaders});
  return NextResponse.json({result:await manageAdministrativeRecord(admin.firestore(),body,auth.uid!)},{headers:contractHeaders});
 }catch(e){const code=e instanceof Error?e.message:'';const messages:Record<string,string>={REMOVAL_CHANGED:'El registro cambió. Volvé a verificar antes de confirmar.',REMOVAL_COMMAND_CONFLICT:'Este comando ya se utilizó con otros datos.',REMOVAL_NOT_FOUND:'El registro ya no está disponible.',REMOVAL_INVALID:'Confirmación o referencia inválida.'};return NextResponse.json({error:messages[code]??'No se pudo verificar la operación. No se modificaron los registros originales.'},{status:409,headers:contractHeaders});}
}
