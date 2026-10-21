import type { Firestore } from 'firebase-admin/firestore';
import { type PortalIdentity } from './legacyPortalServer';
export interface AffiliateSolicitudInput {tipo:'solicitud_afiliado';nombreCompleto:string;numeroDni:string;whatsapp:string;direccion:string;localidad:string;email:string;productoId:string;productoNombre:string;planElegido:string;montoCuota:number}
/** Retired entry point retained as an explicit fail-closed guard for old callers. */
export async function persistAffiliateSolicitud(_db:Firestore,_id:string,_value:unknown,_actor:PortalIdentity):Promise<never>{
 void [_db,_id,_value,_actor];
 throw new Error('AFFILIATE_COMMERCIAL_INTAKE_DISABLED');
}
