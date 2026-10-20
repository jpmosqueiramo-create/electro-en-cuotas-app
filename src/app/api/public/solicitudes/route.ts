import { isPublicSolicitudOriginAllowed } from "@/lib/publicSolicitudOrigin";
import { ContactLimitExceeded } from "@/lib/publicSolicitudRateLimit";
import { NextResponse } from "next/server";
import { admin } from "@/lib/firebaseAdmin";
import { persistPublicSolicitud } from "@/lib/publicSolicitudService";
export const runtime="nodejs";
export async function POST(req: Request) {
  const origin=req.headers.get('origin');
  if(!isPublicSolicitudOriginAllowed(origin))return NextResponse.json({error:'Origen no permitido.'},{status:403});
  try {
    const text=await req.text();if(text.length>16000)return NextResponse.json({error:'Solicitud demasiado extensa.'},{status:413});
    const body=JSON.parse(text);
    if(!body||typeof body!=="object"||Array.isArray(body)||Object.keys(body).some(key=>!["submissionId","payload"].includes(key)))throw Error("INVALID_REQUEST");
    const result=await persistPublicSolicitud(admin.firestore(),body.submissionId,body.payload);
    return NextResponse.json(result,{headers:{'Cache-Control':'no-store'}});
  }catch(e){
    if(e instanceof ContactLimitExceeded)return NextResponse.json({error:"Hay demasiadas solicitudes para este contacto. Podrás reintentar más tarde."},{status:429,headers:{"Retry-After":String(e.retryAfter),"Cache-Control":"no-store"}});
    const code=e instanceof Error?e.message:'';
    const status=code==='INVALID_REQUEST'||e instanceof SyntaxError?400:code==='REQUEST_CONFLICT'||code==='CATALOG_SELECTION_CHANGED'?409:503;
    return NextResponse.json({error:status===409?'El envío o la referencia cambió. Revisá los datos antes de volver a enviar.':status===400?'Revisá los datos de la solicitud.':'No pudimos confirmar el registro. Reintentá: no abriremos WhatsApp sin confirmación.'},{status,headers:{'Cache-Control':'no-store'}});
  }
}
