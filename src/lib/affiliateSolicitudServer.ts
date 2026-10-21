import type { Firestore } from 'firebase-admin/firestore';
import { persistAuthorizedSolicitud } from './publicSolicitudService';
import { activePortalAffiliate,type PortalIdentity } from './legacyPortalServer';
import { isPublicReferenceId } from './publicCatalogContract';
export interface AffiliateSolicitudInput {tipo:'solicitud_afiliado';nombreCompleto:string;numeroDni:string;whatsapp:string;direccion:string;localidad:string;email:string;productoId:string;productoNombre:string;planElegido:string;montoCuota:number}
export function parseAffiliateSolicitud(value:unknown):AffiliateSolicitudInput{
 if(!value||typeof value!=='object'||Array.isArray(value))throw Error('INVALID_REQUEST');const raw=value as Record<string,unknown>,fields={nombreCompleto:150,numeroDni:30,whatsapp:50,direccion:200,localidad:150,email:150,productoId:100,productoNombre:200,planElegido:50};
 if(Object.keys(raw).length!==Object.keys(fields).length+1||Object.keys(raw).some(k=>!Object.hasOwn(fields,k)&&k!=='montoCuota'))throw Error('INVALID_REQUEST');
 const data:Record<string,string|number>={tipo:'solicitud_afiliado'};for(const [key,max]of Object.entries(fields)){if(typeof raw[key]!=='string'||!raw[key].trim()||raw[key].length>max)throw Error('INVALID_REQUEST');data[key]=raw[key].trim();}
 if(!isPublicReferenceId(data.productoId)||! /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(data.email))||! /^[1-9]\d?$/.test(String(data.planElegido))||Number(data.planElegido)>18||typeof raw.montoCuota!=='number'||!Number.isFinite(raw.montoCuota)||raw.montoCuota<=0)throw Error('INVALID_REQUEST');data.email=String(data.email).toLowerCase();data.montoCuota=raw.montoCuota;return data as unknown as AffiliateSolicitudInput;
}
export async function persistAffiliateSolicitud(db:Firestore,id:string,value:unknown,actor:PortalIdentity){
 const input=parseAffiliateSolicitud(value);return persistAuthorizedSolicitud(db,id,input,async tx=>{const affiliate=await activePortalAffiliate(db,actor,tx);return {afiliadoAuthUid:actor.uid,afiliadoId:affiliate.id,afiliadoEmail:actor.email,cargadoPorAfiliado:true};},actor.uid);
}
