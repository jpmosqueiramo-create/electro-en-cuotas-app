import { NextResponse } from 'next/server';
import { admin } from './firebaseAdmin';
import { contractHeaders } from './contractV2Http';
import { LegacyPortalError,portalIdentity,readLegacyPortal } from './legacyPortalServer';
export async function legacyHistoryHandler(req:Request,role:'CLIENT'|'AFFILIATE'){
 try{if(new URL(req.url).search)throw Error();const actor=await portalIdentity(req);return NextResponse.json(await readLegacyPortal(admin.firestore(),actor,role),{headers:contractHeaders});}
 catch(e){return NextResponse.json({error:e instanceof LegacyPortalError?e.message:'Historial no disponible para esta identidad.'},{status:403,headers:contractHeaders});}
}
/** Commercial intake belongs to the public form or Administration, never affiliates. */
export async function affiliateSolicitudHandler(req:Request){
 void req;
 return NextResponse.json({error:'El vendedor afiliado sólo puede gestionar operaciones asignadas por Administración.'},{status:403,headers:contractHeaders});
}
