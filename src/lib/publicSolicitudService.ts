import { reserveContactSlot, cleanupExpiredContactLimits } from "./publicSolicitudRateLimit";
import { createHash } from "node:crypto";
import { FieldValue, type Firestore, type Transaction } from "firebase-admin/firestore";
import type { AffiliateSolicitudInput } from "./affiliateSolicitudServer";
import { parsePublicSolicitud, type PublicSolicitudInput } from "./publicSolicitud";
import { parsePublicCatalogReference } from "./publicCatalogContract";

/** One canonical operation. Replays never overwrite administrative state or captured prices. */
export async function persistPublicSolicitud(db: Firestore, id: string, raw: unknown,
  notify?: (id: string, payload: Record<string,unknown>)=>Promise<void>, clock: () => number = Date.now) {
  return persistAuthorizedSolicitud(db,id,parsePublicSolicitud(raw),undefined,undefined,notify,clock);
}
/** Shared server persistence; affiliate attribution is resolved inside the same transaction. */
export async function persistAuthorizedSolicitud(db:Firestore,id:string,input:PublicSolicitudInput|AffiliateSolicitudInput,attribution?: (tx:Transaction)=>Promise<Record<string,unknown>>,ownerUid?:string,notify?: (id:string,payload:Record<string,unknown>)=>Promise<void>,clock:()=>number=Date.now){
  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id))throw Error("INVALID_REQUEST");
  const hash=createHash('sha256').update(JSON.stringify(ownerUid?{input,ownerUid}:input)).digest('hex');
  const documentId=ownerUid?`aff_${createHash('sha256').update(ownerUid).digest('hex').slice(0,24)}_${id}`:`web_${id}`,ref=db.collection('solicitudes_cuenta').doc(documentId);
  const replay=await db.runTransaction(async tx=>{
    const trusted=attribution?await attribution(tx):{};
    const existing=await tx.get(ref);
    if(existing.exists){if(existing.data()?.publicSubmissionHash!==hash)throw Error('REQUEST_CONFLICT');return true;}
    if(input.productoId){
      const doc=await tx.get(db.collection('catalogo_publico').doc(input.productoId));
      const dto=doc.exists?parsePublicCatalogReference(doc.id,doc.data()):null;
      const plan=dto?.planesPublicados.find(p=>String(p.cuotas)===input.planElegido);
      if(!dto||dto.nombre!==input.productoNombre||(input.planElegido?plan?.cuotaEstimada!==input.montoCuota:input.tipo!=='consulta_v2'||input.montoCuota!==undefined))throw Error('CATALOG_SELECTION_CHANGED');
    }
    await reserveContactSlot(tx,db,input.whatsapp,clock());
    tx.create(ref,{...input,...trusted,publicSubmissionHash:hash,estado:'Pendiente',fecha:FieldValue.serverTimestamp(),fechaIso:new Date().toISOString()});
    return false;
  });
  let notificationPending=false;
  try {
    const alert={tipo:input.tipo==='consulta_v2'?'CONSULTA_PUBLICA_V2':input.tipo==='contacto_rapido'?'NUEVO_PRESUPUESTO':'APERTURA_CUENTA',
      ...(input.tipo==='consulta_v2'?{sourceCollection:'solicitudes_cuenta',solicitudId:documentId}:{}),
      mensaje:`Solicitud web ${documentId}: ${input.nombreCompleto} — ${input.productoNombre}`,
      fechaCreacion:FieldValue.serverTimestamp(),leida:false};
    if(notify)await notify(documentId,alert);
    else await db.runTransaction(async tx=>{const a=db.collection('alertas_admin').doc(documentId);if(!(await tx.get(a)).exists)tx.create(a,alert);});
  }catch{notificationPending=true;}
  // Cleanup never changes the confirmed result or the idempotent receipt.
  if(!replay)try{await cleanupExpiredContactLimits(db,clock());}catch{/* Retry on a later new request. */}
  return {id:documentId,sourceCollection:'solicitudes_cuenta' as const,persisted:true as const,replay,notificationPending};
}
