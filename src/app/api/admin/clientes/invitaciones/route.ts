import {NextResponse} from 'next/server';
import {admin} from '@/lib/firebaseAdmin';
import {custodyAuth} from '@/lib/operationCustodyV2Http';
import {contractHeaders,contractJson} from '@/lib/contractV2Http';
import {exact,opaque} from '@/lib/contractV2';
import {sendClientEmailInvitation} from '@/lib/clientEmailInvitations';
export async function POST(req:Request){
 let actor;try{actor=await custodyAuth(req,true);}catch{return NextResponse.json({error:'Acceso administrativo requerido.'},{status:403,headers:contractHeaders});}
 try{const b=exact(await contractJson(req),['target','commandId']);opaque(b.commandId);return NextResponse.json(await sendClientEmailInvitation(admin.firestore(),b.target,String(b.commandId),actor.uid),{headers:contractHeaders});}
 catch(e){return NextResponse.json({error:e instanceof Error?e.message:'No se confirmó la invitación.'},{status:409,headers:contractHeaders});}
}
