import { NextRequest,NextResponse } from 'next/server';
import { admin } from '@/lib/firebaseAdmin';
import { publicContractData,unavailable } from '@/lib/contractV2Server';
import { contractHeaders,contractJson } from '@/lib/contractV2Http';
export const runtime='nodejs';
type Ctx={params:Promise<{requestId:string}>};
async function handle(req:NextRequest,ctx:Ctx){
  try {
    if(req.nextUrl.search||req.headers.get('sec-fetch-site')==='cross-site')throw new Error();
    const origin=req.headers.get('origin');if(origin&&origin!==req.nextUrl.origin)throw new Error();
    if(req.method==='POST'&&!origin)throw new Error();
    const token=req.headers.get('x-client-data-token')??'';
    const result=await publicContractData(admin.firestore(),(await ctx.params).requestId,token,req.method==='POST'?await contractJson(req):undefined);
    return NextResponse.json(result,{headers:contractHeaders});
  }catch{return NextResponse.json({error:unavailable},{status:400,headers:contractHeaders});}
}
export const GET=handle;export const POST=handle;
