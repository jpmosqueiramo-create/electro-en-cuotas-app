import {NextResponse} from 'next/server';
import {verifyAdminAuth} from '@/lib/adminAuth';
import {admin} from '@/lib/firebaseAdmin';
import {historicalJson} from '@/lib/historicalSalesHttp';
import {contractHeaders} from '@/lib/contractV2Http';
import {HistoricalSaleError} from '@/lib/historicalSales';
import {historicalSaleDetail,historicalSalesCommand,listHistoricalSales} from '@/lib/historicalSalesServer';
export const runtime='nodejs';
async function authorize(req:Request){const result=await verifyAdminAuth(req);if(result.authorized&&!(await admin.auth().getUser(result.uid!).catch(()=>null))?.emailVerified)return {authorized:false,errorResponse:NextResponse.json({error:'Verificá tu correo administrativo.'},{status:403,headers:contractHeaders})};return result;}
export async function GET(req:Request){const auth=await authorize(req);if(!auth.authorized)return auth.errorResponse!;try{const url=new URL(req.url);if([...url.searchParams.keys()].some(k=>!['id','cursor'].includes(k)))throw Error();const id=url.searchParams.get('id'),cursor=url.searchParams.get('cursor');return NextResponse.json(id?{sale:await historicalSaleDetail(admin.firestore(),id,cursor)}:await listHistoricalSales(admin.firestore(),cursor),{headers:contractHeaders});}catch{return NextResponse.json({error:'No se pudieron consultar las ventas anteriores.'},{status:503,headers:contractHeaders});}}
export async function POST(req:Request){const auth=await authorize(req);if(!auth.authorized)return auth.errorResponse!;try{const origin=req.headers.get('origin');if(origin&&![new URL(req.url).origin,'https://www.cuentahogar.com.ar','https://cuentahogar.com.ar'].includes(origin))return NextResponse.json({error:'Origen no permitido.'},{status:403,headers:contractHeaders});return NextResponse.json(await historicalSalesCommand(admin.firestore(),await historicalJson(req),auth.uid!),{headers:contractHeaders});}catch(e){return NextResponse.json({error:e instanceof HistoricalSaleError?e.message:'No se pudo guardar. Revisá los datos y actualizá antes de reintentar.'},{status:409,headers:contractHeaders});}}
