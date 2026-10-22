import { publicSolicitudOrigin } from "./publicSolicitud";
/** Proyección explícita de lectura. No importa Firebase ni ejecuta efectos. */
export const ADMIN_SOLICITUD_SOURCES = ["solicitudes", "solicitudes_cuenta"] as const;
export type AdminSolicitudSource = typeof ADMIN_SOLICITUD_SOURCES[number];
export type AdminSolicitudType = "Solicitud" | "Consulta inicial" | "Contacto rápido";
export type StoredDate = Date | string | { seconds: number; nanoseconds?: number; toMillis?: () => number };
export type AdminDocument = { label: string; status: "Disponible" | "No cargado" | "Pendiente"; url: string | null };
export type AdminProposal = {
  reference: string | null; estado: string | null; fecha: StoredDate | null;
  itemCount: number | null; items: { producto: string | null; cuotas: number | null; valorCuota: number | null; contado: number | null }[];
};
export type AdminSolicitudListItem = {
  sourceCollection: AdminSolicitudSource; documentId: string; recordKey: string;
  tipoPresentacion: AdminSolicitudType; origenPresentacion: string;
  nombreCliente: string | null; dni: string | null; cuil: string | null; email: string | null; telefono: string | null;
  domicilio: string | null; localidad: string | null; productoONecesidad: string | null;
  referenciaCatalogo: string | null; planPreferido: string | null; cuotaCapturada: number | null;
  estadoOriginal: string | null; fechaCreacion: StoredDate | null; fechaSort: number | null;
  mensajeAdmin: string | null; clienteId: string | null; tipoOriginal: string | null;
  estadoEntrega: string | null; propuestas: AdminProposal[]; documentos: AdminDocument[];
  actividad: { label: string; fecha: StoredDate }[];
};
const object = (value: unknown): Record<string, unknown> => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
const text = (...values: unknown[]): string | null => {
  for (const value of values) if (typeof value === "string" && value.trim()) return value;
  return null;
};
const numeric = (value: unknown): number | null => typeof value === "number" && Number.isFinite(value) ? value : null;
export function isAdminSolicitudSource(value: string): value is AdminSolicitudSource {
  return ADMIN_SOLICITUD_SOURCES.some(source => source === value);
}
export function storedDateMillis(value: unknown): number | null {
  let result: number;
  if (value instanceof Date) result = value.getTime();
  else if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}(?:T|$)/.test(value)) result = Date.parse(value);
  else {
    const date = object(value);
    if (typeof date.seconds !== "number" || !Number.isFinite(date.seconds)) return null;
    result = date.seconds * 1000 + (typeof date.nanoseconds === "number" ? date.nanoseconds / 1e6 : 0);
  }
  return Number.isFinite(result) && Math.abs(result) <= 8640000000000000 ? result : null;
}
function storedDate(...values: unknown[]): StoredDate | null {
  return (values.find(value => storedDateMillis(value) !== null) as StoredDate | undefined) ?? null;
}
export function formatAdminSolicitudDate(value: unknown): string {
  const millis = storedDateMillis(value);
  return millis === null ? "Sin fecha registrada" : new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "short", year: "numeric", timeZone: "America/Argentina/Buenos_Aires" }).format(new Date(millis));
}
function projectProposals(value: unknown): AdminProposal[] {
  if (!Array.isArray(value)) return [];
  return value.map(entry => {
    const p = object(entry);
    const rawItems = Array.isArray(p.items) ? p.items : text(p.producto) ? [p] : null;
    return {
      reference: text(p.id), estado: text(p.estado), fecha: storedDate(p.fechaIso, p.fecha, p.fechaCreacion),
      itemCount: rawItems?.length ?? null,
      items: (rawItems ?? []).map(entry => {
        const item = object(entry);
        return { producto: text(item.producto, item.nombre), cuotas: numeric(item.cuotas), valorCuota: numeric(item.valorCuota), contado: numeric(item.contado) };
      }),
    };
  });
}
function documentReference(label: string, value: unknown): AdminDocument {
  if (value === "Pendiente envío WhatsApp") return { label, status: "Pendiente", url: null };
  if (typeof value === "string") {
    try {
      const url = new URL(value);
      if (["https:", "http:"].includes(url.protocol) && !url.username && !url.password) return { label, status: "Disponible", url: url.href };
    } catch { /* Una referencia inválida nunca se convierte en enlace ejecutable. */ }
  }
  return { label, status: value ? "Pendiente" : "No cargado", url: null };
}
function mapRecord(sourceCollection: AdminSolicitudSource, documentId: string, input: unknown): AdminSolicitudListItem {
  const data = object(input), personal = object(data.datosPersonales), docs = object(data.documentos);
  const isRequest = sourceCollection === "solicitudes";
  const tipoOriginal = text(data.tipo);
  const fechaCreacion = storedDate(data.fechaCreacion, data.fecha, data.fechaIso);
  const documentos = isRequest ? [
    documentReference("DNI · frente", docs.dniFrente), documentReference("DNI · dorso", docs.dniDorso),
    documentReference("Ingresos", docs.reciboSueldo), documentReference("Domicilio", docs.servicio),
  ] : [
    documentReference("DNI · frente", data.dniFrenteURL), documentReference("DNI · dorso", data.dniDorsoURL),
    documentReference("Comprobante adjunto", data.comprobanteURL), documentReference("Domicilio", data.comprobanteDomicilioURL),
  ];
  const actividad: AdminSolicitudListItem["actividad"] = [];
  if (fechaCreacion) actividad.push({ label: "Registro creado", fecha: fechaCreacion });
  const autorizacion = storedDate(data.fechaFirmaDigital);
  if (autorizacion && (data.contratoFirmado === true || data.estadoContrato === "AUTORIZADO")) actividad.push({ label: "Autorización registrada", fecha: autorizacion });
  const entrega = storedDate(data.fechaEntrega);
  if (entrega) actividad.push({ label: "Entrega registrada", fecha: entrega });
  actividad.sort((a, b) => storedDateMillis(b.fecha)! - storedDateMillis(a.fecha)!);
  return {
    sourceCollection, documentId, recordKey: `${sourceCollection}:${documentId}`,
    tipoPresentacion: isRequest ? "Solicitud" : tipoOriginal === "contacto_rapido" ? "Contacto rápido" : "Consulta inicial",
    origenPresentacion: publicSolicitudOrigin(data),
    referenciaCatalogo: text(data.productoId) === "A definir" ? null : text(data.productoId),
    planPreferido: text(data.planElegido) ?? (numeric(data.planElegido) !== null ? String(data.planElegido) : null),
    cuotaCapturada: numeric(data.montoCuota),
    nombreCliente: isRequest ? text(personal.nombreCompleto, data.nombreCompleto, data.nombre) : text(data.nombreCompleto, data.nombre),
    dni: isRequest ? text(personal.numeroDni, data.numeroDni, data.dni) : text(data.numeroDni, data.dni),
    cuil: text(personal.cuil, data.cuil), email: text(data.clienteEmail, data.email, personal.email),
    telefono: text(personal.telefono, data.whatsapp, data.telefono), domicilio: text(personal.direccion, data.direccion), localidad: text(personal.localidad, data.localidad),
    productoONecesidad: text(data.productoDeseado, data.necesidad, data.productoNombre),
    estadoOriginal: text(data.estado), fechaCreacion, fechaSort: storedDateMillis(fechaCreacion),
    mensajeAdmin: text(data.mensajeAdmin), clienteId: text(data.clienteId), tipoOriginal,
    estadoEntrega: text(data.estadoEntrega), propuestas: projectProposals(data.presupuestos), documentos, actividad,
  };
}
export const mapSolicitudToAdminReadModel = (id: string, data: unknown) => mapRecord("solicitudes", id, data);
export const mapSolicitudCuentaToAdminReadModel = (id: string, data: unknown) => mapRecord("solicitudes_cuenta", id, data);
export function isAdminSolicitudPending(item: AdminSolicitudListItem): boolean {
  if (item.estadoOriginal === null) return false;
  return item.sourceCollection === "solicitudes"
    ? ["PENDIENTE", "REQUIERE_INFO", "PENDIENTE_FIRMA"].includes(item.estadoOriginal)
    : ["pendiente", "aprobado_presupuesto", "solicitante", "aperturado"].includes(item.estadoOriginal.toLowerCase());
}
export function adminSolicitudNextAction(item: AdminSolicitudListItem): string {
  if (item.sourceCollection === "solicitudes") {
    if (item.estadoOriginal === "REQUIERE_INFO") return "Consultar información solicitada";
    if (item.estadoOriginal === "PENDIENTE_FIRMA") return "Consultar autorización";
  }
  if (item.tipoPresentacion === "Contacto rápido" && item.propuestas.length && isAdminSolicitudPending(item)) return "Consultar presupuestos V2";
  if (isAdminSolicitudPending(item)) return "Revisar solicitud";
  if (["APROBADO", "Aprobado"].includes(item.estadoOriginal ?? "") && item.estadoEntrega === "PENDIENTE_ENTREGA") return "Consultar seguimiento";
  return "Ver detalle";
}
export type AdminSolicitudFilters = { view: "pending" | "all"; type: string; status: string; q: string };
export const EMPTY_STATUS_FILTER = "__missing__";
export function filterAdminSolicitudes(items: AdminSolicitudListItem[], filters: AdminSolicitudFilters): AdminSolicitudListItem[] {
  const q = filters.q.trim().toLocaleLowerCase("es");
  return items.filter(item => (filters.view === "all" || isAdminSolicitudPending(item))
    && (!filters.type || filters.type === item.tipoPresentacion)
    && (!filters.status || (filters.status === EMPTY_STATUS_FILTER ? item.estadoOriginal === null : item.estadoOriginal === filters.status))
    && (!q || [item.nombreCliente, item.dni, item.email, item.telefono, item.productoONecesidad, item.documentId, item.recordKey].some(value => value?.toLocaleLowerCase("es").includes(q))))
    .sort((a, b) => {
      if (a.fechaSort === null && b.fechaSort !== null) return 1;
      if (b.fechaSort === null && a.fechaSort !== null) return -1;
      return (b.fechaSort ?? 0) - (a.fechaSort ?? 0) || a.recordKey.localeCompare(b.recordKey);
    });
}
/** Sólo contexto de UI; q nunca se serializa (podría contener datos personales). */
export function adminSolicitudesContext(filters: AdminSolicitudFilters): string {
  const params = new URLSearchParams({ view: filters.view });
  if (["Solicitud", "Consulta inicial", "Contacto rápido"].includes(filters.type)) params.set("type", filters.type);
  // El estado persistido podría contener texto inesperado: transportar sólo valores documentados.
  if (["PENDIENTE", "REQUIERE_INFO", "PENDIENTE_FIRMA", "APROBADO", "RECHAZADO", "Pendiente", "Aprobado", "Rechazado", "Aprobado_Presupuesto", "solicitante", "aperturado", EMPTY_STATUS_FILTER].includes(filters.status)) params.set("status", filters.status);
  return params.toString();
}
export function parseAdminSolicitudFilters(params: Record<string, string | string[] | undefined>): AdminSolicitudFilters {
  const type = typeof params.type === "string" ? params.type : "";
  const status = typeof params.status === "string" ? params.status : "";
  const filters: AdminSolicitudFilters = { view: params.view === "all" ? "all" : "pending", type, status, q: "" };
  // La misma allowlist rige entrada y salida. Nunca reflejar q de la URL.
  const safe = new URLSearchParams(adminSolicitudesContext(filters));
  return { view: filters.view, type: safe.get("type") ?? "", status: safe.get("status") ?? "", q: typeof params.reference === "string" && /^[A-Za-z0-9_-]{1,200}$/.test(params.reference) ? params.reference : "" };
}
