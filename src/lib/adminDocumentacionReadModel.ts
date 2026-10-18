import type { AdminSolicitudSource, AdminSolicitudType } from "./adminSolicitudesReadModel";

/** Inventario contrastado con Validaciones (campos y consumidores, sin ejecutar sus loaders).
 * solicitudes: documentos.dniFrente/dniDorso/reciboSueldo/servicio (V:3084–3094);
 * planPagos[].comprobanteUrl sólo cuando hay referencia (V:4301–4340).
 * solicitudes_cuenta: dniFrenteURL/dniDorsoURL/comprobanteURL/comprobanteDomicilioURL
 * (V:2768–2789). comprobanteURL también duplica el DNI en solicitar/page.tsx:133:
 * conservar como adjunto, sin afirmar que acredita ingresos.
 * "No requerido en solicitud inicial" no es URL ni sentinel de envío.
 * Contrato/pagaré se generan localmente; contratoFirmado/estadoContrato son metadata,
 * /firmar-contrato/[id] es una acción. No inventar una referencia de archivo.
 * proveedorFacturaTicket/facturaProveedorOriginal son números de ticket, no archivos.
 */
export type DocumentAvailability = "AVAILABLE" | "NOT_RECORDED" | "PENDING_SEND";
export type DocumentKind = "dni_frente" | "dni_dorso" | "ingresos" | "domicilio" | "adjunto" | "comprobante_pago";
export const DOCUMENT_KIND_LABELS: Record<DocumentKind, string> = {
  dni_frente: "DNI frente", dni_dorso: "DNI dorso", ingresos: "Ingresos",
  domicilio: "Domicilio / servicio", adjunto: "Comprobante adjunto", comprobante_pago: "Comprobante de pago",
};
export const DOCUMENT_AVAILABILITY_LABELS: Record<DocumentAvailability, string> = {
  AVAILABLE: "Disponible", NOT_RECORDED: "Sin archivo registrado", PENDING_SEND: "Pendiente de envío",
};
export type AdminDocumentacionDocument = { key: string; kind: DocumentKind; label: string; availability: DocumentAvailability; url: string | null };
export type AdminDocumentacionItem = {
  sourceCollection: AdminSolicitudSource; documentId: string; recordKey: string;
  nombreCliente: string | null; dni: string | null; productoONecesidad: string | null;
  tipoRegistro: AdminSolicitudType; estadoOperacion: string | null;
  documentos: AdminDocumentacionDocument[];
};
const object = (value: unknown): Record<string, unknown> => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
const text = (...values: unknown[]): string | null => {
  for (const value of values) if (typeof value === "string" && value.trim()) return value;
  return null;
};
function document(kind: DocumentKind, value: unknown, key: string = kind, label = DOCUMENT_KIND_LABELS[kind]): AdminDocumentacionDocument {
  if (value === "Pendiente envío WhatsApp") return { key, kind, label, availability: "PENDING_SEND", url: null };
  if (typeof value === "string") {
    try {
      const parsed = new URL(value);
      if (["http:", "https:"].includes(parsed.protocol) && !parsed.username && !parsed.password) {
        return { key, kind, label, availability: "AVAILABLE", url: value };
      }
    } catch { /* Texto legacy o referencia no utilizable: nunca crear un enlace. */ }
  }
  return { key, kind, label, availability: "NOT_RECORDED", url: null };
}
export function mapSolicitudToDocumentacion(documentId: string, input: unknown): AdminDocumentacionItem {
  const data = object(input), personal = object(data.datosPersonales), docs = object(data.documentos);
  const documentos = [document("dni_frente", docs.dniFrente), document("dni_dorso", docs.dniDorso), document("ingresos", docs.reciboSueldo), document("domicilio", docs.servicio)];
  if (Array.isArray(data.planPagos)) data.planPagos.forEach((entry, index) => {
    const cuota = object(entry);
    const numero = typeof cuota.nroCuota === "number" && Number.isFinite(cuota.nroCuota) ? String(cuota.nroCuota) : text(cuota.nroCuota);
    if (text(cuota.comprobanteUrl)) documentos.push(document("comprobante_pago", cuota.comprobanteUrl, `comprobante_pago:${index}`, numero ? `Comprobante de pago · cuota ${numero}` : "Comprobante de pago"));
  });
  return {
    sourceCollection: "solicitudes", documentId, recordKey: `solicitudes:${documentId}`,
    nombreCliente: text(personal.nombreCompleto, data.nombreCompleto, data.nombre), dni: text(personal.numeroDni, data.numeroDni, data.dni),
    productoONecesidad: text(data.productoDeseado, data.necesidad, data.productoNombre), tipoRegistro: "Solicitud", estadoOperacion: text(data.estado), documentos,
  };
}
export function mapSolicitudCuentaToDocumentacion(documentId: string, input: unknown): AdminDocumentacionItem {
  const data = object(input);
  return {
    sourceCollection: "solicitudes_cuenta", documentId, recordKey: `solicitudes_cuenta:${documentId}`,
    nombreCliente: text(data.nombreCompleto, data.nombre), dni: text(data.numeroDni, data.dni),
    productoONecesidad: text(data.productoDeseado, data.necesidad, data.productoNombre),
    tipoRegistro: data.tipo === "contacto_rapido" ? "Contacto rápido" : "Consulta inicial", estadoOperacion: text(data.estado),
    documentos: [document("dni_frente", data.dniFrenteURL), document("dni_dorso", data.dniDorsoURL), document("adjunto", data.comprobanteURL), document("domicilio", data.comprobanteDomicilioURL)],
  };
}
export type AdminDocumentacionFilters = { view: "all" | "available" | "not_recorded" | "pending_send"; type: string; document: string; q: string };
export function visibleDocumentacionDocuments(item: AdminDocumentacionItem, kind: string): AdminDocumentacionDocument[] {
  return kind ? item.documentos.filter(doc => doc.kind === kind) : item.documentos;
}
export function filterAdminDocumentacion(items: AdminDocumentacionItem[], filters: AdminDocumentacionFilters): AdminDocumentacionItem[] {
  const q = filters.q.trim().toLocaleLowerCase("es");
  return items.filter(item => {
    if (filters.type && item.tipoRegistro !== filters.type) return false;
    if (q && ![item.nombreCliente, item.dni, item.productoONecesidad, item.documentId, item.recordKey].some(value => value?.toLocaleLowerCase("es").includes(q))) return false;
    const docs = visibleDocumentacionDocuments(item, filters.document);
    if (!docs.length) return false;
    if (filters.view === "available") return docs.some(doc => doc.availability === "AVAILABLE");
    if (filters.view === "pending_send") return docs.some(doc => doc.availability === "PENDING_SEND");
    if (filters.view === "not_recorded") return docs.every(doc => doc.availability === "NOT_RECORDED");
    return true;
  }).sort((a, b) => (a.nombreCliente ?? "").localeCompare(b.nombreCliente ?? "", "es") || a.recordKey.localeCompare(b.recordKey));
}
