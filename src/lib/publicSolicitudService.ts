import { createHash } from "node:crypto";
import { FieldValue, type Firestore } from "firebase-admin/firestore";
import { parsePublicSolicitud } from "./publicSolicitud";
import { parsePublicCatalogReference } from "./publicCatalogContract";

/** One canonical operation. Replays never overwrite administrative state or captured prices. */
export async function persistPublicSolicitud(db: Firestore, id: string, raw: unknown,
  notify?: (id: string, payload: Record<string,unknown>)=>Promise<void>) {
  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id))throw Error("INVALID_REQUEST");
  const input=parsePublicSolicitud(raw);
  const hash=createHash('sha256').update(JSON.stringify(input)).digest('hex');
  const documentId=`web_${id}`,ref=db.collection('solicitudes_cuenta').doc(documentId);
  const replay=await db.runTransaction(async tx=>{
    const existing=await tx.get(ref);
    if(existing.exists){if(existing.data()?.publicSubmissionHash!==hash)throw Error('REQUEST_CONFLICT');return true;}
    if(input.productoId){
      const doc=await tx.get(db.collection('catalogo_publico').doc(input.productoId));
      const dto=doc.exists?parsePublicCatalogReference(doc.id,doc.data()):null;
      const plan=dto?.planesPublicados.find(p=>String(p.cuotas)===input.planElegido);
      if(!dto||dto.nombre!==input.productoNombre||plan?.cuotaEstimada!==input.montoCuota)throw Error('CATALOG_SELECTION_CHANGED');
    }
    tx.create(ref,{...input,publicSubmissionHash:hash,estado:'Pendiente',fecha:FieldValue.serverTimestamp(),fechaIso:new Date().toISOString()});
    return false;
  });
  let notificationPending=false;
  try {
    const alert={tipo:input.tipo==='contacto_rapido'?'NUEVO_PRESUPUESTO':'APERTURA_CUENTA',
      mensaje:`Solicitud web ${documentId}: ${input.nombreCompleto} — ${input.productoNombre}`,
      fechaCreacion:FieldValue.serverTimestamp(),leida:false};
    if(notify)await notify(documentId,alert);
    else await db.runTransaction(async tx=>{const a=db.collection('alertas_admin').doc(documentId);if(!(await tx.get(a)).exists)tx.create(a,alert);});
  }catch{notificationPending=true;}
  return {id:documentId,sourceCollection:'solicitudes_cuenta' as const,persisted:true as const,replay,notificationPending};
}
