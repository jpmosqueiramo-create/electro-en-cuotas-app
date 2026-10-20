import { isPublicReferenceId } from "./publicCatalogContract";

/** Public request contract. No private pricing fields or client-selected collection. */
export type PublicSolicitudInput = {
  tipo: "contacto_rapido" | "apertura_cuenta";
  nombreCompleto: string; whatsapp: string; localidad: string; productoNombre: string;
  numeroDni?: string; cuil?: string; fechaNacimiento?: string; direccion?: string;
  codigoPostal?: string; ocupacion?: string; email?: string; antiguedadLaboral?: string;
  nombreAfiliado?: string; referidoPor?: string;
  productoId?: string; planElegido?: string; montoCuota?: number;
};
const limits = { nombreCompleto:150, whatsapp:50, localidad:150, productoNombre:200,
  numeroDni:30,cuil:30,fechaNacimiento:50,direccion:200,codigoPostal:20,ocupacion:100,
  email:150,antiguedadLaboral:100,nombreAfiliado:150,referidoPor:150,productoId:100,planElegido:50 } as const;
export function parsePublicSolicitud(value: unknown): PublicSolicitudInput {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw Error("INVALID_REQUEST");
  const raw=value as Record<string,unknown>;
  if (typeof raw.tipo!=='string' || !['contacto_rapido','apertura_cuenta'].includes(raw.tipo) || Object.keys(raw).some(k=>!['tipo','montoCuota',...Object.keys(limits)].includes(k))) throw Error("INVALID_REQUEST");
  const output: Record<string,string|number>={tipo:raw.tipo as string};
  for(const [key,max] of Object.entries(limits)) {
    const v=raw[key]; if(v===undefined)continue;
    if(typeof v!=='string'||v.length>max)throw Error("INVALID_REQUEST");
    output[key]=v.trim();
  }
  if(['nombreCompleto','whatsapp','localidad','productoNombre'].some(k=>!output[k]))throw Error("INVALID_REQUEST");
  if(raw.tipo==='apertura_cuenta') {
    if(['numeroDni','cuil','fechaNacimiento','direccion','codigoPostal','ocupacion','email','antiguedadLaboral'].some(k=>!output[k]) || !/^\d{2}-\d{8}-\d$/.test(String(output.cuil)) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(output.email))) throw Error("INVALID_REQUEST");
  }
  if(output.productoId) {
    if(!isPublicReferenceId(output.productoId)||raw.tipo!=='apertura_cuenta'||!/^[1-9]\d?$/.test(String(output.planElegido))||Number(output.planElegido)>18||typeof raw.montoCuota!=='number'||!Number.isFinite(raw.montoCuota)||raw.montoCuota<=0)throw Error("INVALID_REQUEST");
    output.montoCuota=raw.montoCuota;
  } else if(raw.montoCuota!==undefined || output.planElegido)throw Error("INVALID_REQUEST");
  return output as PublicSolicitudInput;
}
export function publicSolicitudOrigin(data: Record<string,unknown>): string {
  if(data.tipo==='contacto_rapido')return 'Consulta por producto fuera del catálogo';
  if(typeof data.productoId==='string'&&data.productoId.trim()&&data.productoId!=='A definir')return 'Solicitud desde catálogo';
  return 'Origen no registrado';
}
