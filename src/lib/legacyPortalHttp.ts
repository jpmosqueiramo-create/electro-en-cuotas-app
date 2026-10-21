import { NextResponse } from 'next/server';
import { admin } from './firebaseAdmin';
import { contractHeaders,contractJson } from './contractV2Http';
import { LegacyPortalError,portalIdentity,readLegacyPortal } from './legacyPortalServer';
import { persistAffiliateSolicitud } from './affiliateSolicitudServer';
import { ContactLimitExceeded } from './publicSolicitudRateLimit';
import { isPublicSolicitudOriginAllowed } from './publicSolicitudOrigin';
export async function legacyHistoryHandler(req:Request,role:'CLIENT'|'AFFILIATE'){
 try{if(new URL(req.url).search)throw Error();const actor=await portalIdentity(req);return NextResponse.json(await readLegacyPortal(admin.firestore(),actor,role),{headers:contractHeaders});}
 catch(e){return NextResponse.json({error:e instanceof LegacyPortalError?e.message:'Historial no disponible para esta identidad.'},{status:403,headers:contractHeaders});}
}
export async function affiliateSolicitudHandler(req:Request){
 try{if(new URL(req.url).search||!isPublicSolicitudOriginAllowed(req.headers.get('origin'))||!req.headers.get('origin'))throw new LegacyPortalError('Origen no permitido.');
 const actor=await portalIdentity(req),body=await contractJson(req) as Record<string,unknown>;
 if(!body||typeof body!=='object'||Array.isArray(body)||Object.keys(body).length!==2||!Object.hasOwn(body,'submissionId')||!Object.hasOwn(body,'payload'))throw Error('INVALID_REQUEST');
 return NextResponse.json(await persistAffiliateSolicitud(admin.firestore(),String(body.submissionId),body.payload,actor),{headers:contractHeaders});
 }catch(e){const status=e instanceof ContactLimitExceeded?429:e instanceof LegacyPortalError?403:e instanceof Error&&['REQUEST_CONFLICT','CATALOG_SELECTION_CHANGED'].includes(e.message)?409:e instanceof Error&&e.message==='INVALID_REQUEST'?400:503;
 return NextResponse.json({error:status===403?'No se pudo verificar un vendedor afiliado activo autorizado.':status===429?'Hay demasiadas solicitudes para este contacto. Reintentá más tarde.':status===409?'El envío o la referencia cambió. Revisá los datos.':'No pudimos confirmar el registro. Reintentá el mismo envío.'},{status,headers:{...contractHeaders,...(e instanceof ContactLimitExceeded?{'Retry-After':String(e.retryAfter)}:{})}});}
}
