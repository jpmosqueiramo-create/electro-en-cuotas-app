import {NextResponse} from 'next/server';
import {admin} from '@/lib/firebaseAdmin';
import {custodyAuth} from '@/lib/operationCustodyV2Http';
import {contractHeaders,contractJson} from '@/lib/contractV2Http';
import {exact} from '@/lib/contractV2';
/** Exact email lookup for existing access only. Never creates an Auth user or assigns a role. */
export async function POST(req:Request){
 try{await custodyAuth(req,true);}catch{return NextResponse.json({error:'Acceso administrativo requerido.'},{status:403,headers:contractHeaders});}
 try{const {email}=exact(await contractJson(req),['email']);if(typeof email!=='string'||email.length>254||!email.trim())throw Error();const u=await admin.auth().getUserByEmail(email.trim().toLowerCase());if(u.disabled||!u.emailVerified)throw Error();return NextResponse.json({uid:u.uid,email:u.email},{headers:contractHeaders});}catch{return NextResponse.json({error:'No hay una cuenta activa y con correo verificado para ese correo. El vendedor afiliado puede completar su registro y verificar su correo antes de vincularlo.'},{status:409,headers:contractHeaders});}
}
