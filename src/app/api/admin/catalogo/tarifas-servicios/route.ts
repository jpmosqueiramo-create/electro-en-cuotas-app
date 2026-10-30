import {admin} from '@/lib/firebaseAdmin';
import {verifyAdminAuth} from '@/lib/adminAuth';
import {readLoopTariffs,saveLoopTariffs} from '@/lib/loopServiceTariffsServer';
import {contractHeaders,contractJson} from '@/lib/contractV2Http';
import {exact} from '@/lib/contractV2';
export const runtime='nodejs';
export async function GET(req:Request){
 const actor=await verifyAdminAuth(req);if(!actor.authorized)return actor.errorResponse!;
 try{return Response.json(await readLoopTariffs(admin.firestore()),{headers:contractHeaders});}
 catch{return Response.json({error:'No se pudieron consultar las tarifas.'},{status:503,headers:contractHeaders});}
}
export async function POST(req:Request){
 const actor=await verifyAdminAuth(req);if(!actor.authorized)return actor.errorResponse!;
 try{const b=exact(await contractJson(req),['tariffs','expectedRevision']);return Response.json(await saveLoopTariffs(admin.firestore(),b.tariffs,b.expectedRevision as number,actor.uid!),{headers:contractHeaders});}
 catch(e){return Response.json({error:e instanceof Error?e.message:'No se guardaron las tarifas.'},{status:409,headers:contractHeaders});}
}
