import {NextRequest,NextResponse} from 'next/server';
import {FieldPath} from 'firebase-admin/firestore';
import {admin} from '@/lib/firebaseAdmin';
import {isAdminEmail} from '@/lib/adminIdentity';
import {verifyAdminAuth} from '@/lib/adminAuth';
import {contractHeaders} from '@/lib/contractV2Http';
export async function GET(req:NextRequest){
 const auth=await verifyAdminAuth(req);if(!auth.authorized)return auth.errorResponse!;
 try{await admin.auth().verifyIdToken(req.headers.get('authorization')!.slice(7),true);const user=await admin.auth().getUser(auth.uid!);if(user.disabled||!user.emailVerified||!isAdminEmail(user.email))throw Error();}
 catch{return NextResponse.json({error:'Acceso administrativo no vigente.'},{status:403,headers:contractHeaders});}
 const params=req.nextUrl.searchParams,cursor=params.get('cursor');
 if([...params.keys()].some(k=>k!=='cursor')||params.getAll('cursor').length>1||cursor!==null&&(!cursor||cursor.includes('/')||Buffer.byteLength(cursor)>1500))return NextResponse.json({error:'Consulta inválida.'},{status:400,headers:contractHeaders});
 let query=admin.firestore().collection('productos').orderBy(FieldPath.documentId()).limit(101);
 if(cursor)query=query.startAfter(cursor);
 try{const result=await query.get(),docs=result.docs.slice(0,100);return NextResponse.json({items:docs.map(d=>({...d.data(),id:d.id})),nextCursor:result.size>100?docs.at(-1)!.id:null},{headers:contractHeaders});}
 catch{return NextResponse.json({error:'No se pudieron consultar las referencias privadas.'},{status:503,headers:contractHeaders});}
}
