/**
 * Módulo de Enrutamiento y Normalización de Alertas de Presupuestos y Validaciones
 * Cuenta Hogar - Root Monitoring Center & Budget Flow
 */

export interface ParsedLead {
  solicitudId: string;
  nombre: string;
  dni: string;
  telefono: string;
  localidad: string;
  producto: string;
  notas: string;
}

export interface AlertaAdminItem {
  id?: string;
  tipo?: string;
  mensaje?: string;
  clienteEmail?: string;
  solicitudId?: string;
  fechaCreacion?: { toDate?: () => Date } | Date | null;
  leida?: boolean;
  [key: string]: unknown;
}

export interface SolicitudCandidate {
  id: string;
  sourceCollection: "solicitudes_cuenta" | "solicitudes";
  nombreCompleto?: string;
  numeroDni?: string;
  whatsapp?: string;
  productoNombre?: string;
  necesidad?: string;
  productoDeseado?: string;
  fechaCreacion?: unknown;
  fecha?: unknown;
  fechaIso?: string;
  [key: string]: unknown;
}

export interface LegacyResolutionResult {
  matched: boolean;
  resolvedSolicitudId: string | null;
  sourceCollection: "solicitudes_cuenta" | "solicitudes" | null;
  candidatesCount: number;
  candidates: SolicitudCandidate[];
  message: string;
}

/**
 * Determina si una alerta corresponde a un flujo de PRESUPUESTO
 */
export function isBudgetAlert(tipo?: string): boolean {
  if (!tipo) return false;
  const upper = tipo.toUpperCase().trim().replace(/\s+/g, "_");
  return (
    upper === "NUEVO_PRESUPUESTO" ||
    upper === "NUEVA_SOLICITUD_COMPRA" ||
    upper === "SOLICITUD_PRESUPUESTO" ||
    upper === "PRESUPUESTO" ||
    upper.includes("PRESUPUESTO") ||
    upper.includes("SOLICITUD_COMPRA")
  );
}

/**
 * Determina si una alerta corresponde a una VALIDACIÓN CREDITICIA REAL (Apertura de Cuenta)
 */
export function isCreditValidationAlert(tipo?: string): boolean {
  if (!tipo) return false;
  const upper = tipo.toUpperCase().trim().replace(/\s+/g, "_");
  return (
    upper === "APERTURA_CUENTA" ||
    upper === "APERTURA_DE_CUENTA" ||
    upper === "VALIDACION_CREDITICIA" ||
    upper === "SOLICITUD_CREDITO" ||
    upper.includes("APERTURA") ||
    upper.includes("CREDIT")
  );
}

/**
 * Parsea y extrae de forma determinística los datos del lead a partir del mensaje y campos de la alerta
 */
export function parseLeadFromAlert(alerta: AlertaAdminItem): ParsedLead {
  const msg = alerta.mensaje || "";
  let solicitudId = alerta.solicitudId || "";
  let nombre = "";
  let dni = "";
  let telefono = "";
  let localidad = "";
  let producto = "";

  // 1. Extraer solicitudId si viene en el texto como [ID: xyz] o (ID: xyz)
  if (!solicitudId) {
    const idMatch = msg.match(/\[ID:\s*([a-zA-Z0-9_-]+)\]/i) || msg.match(/\(ID:\s*([a-zA-Z0-9_-]+)\)/i);
    if (idMatch) {
      solicitudId = idMatch[1].trim();
    }
  }

  // 2. Extraer Nombre
  const headerMatch = msg.match(/(?:Solicitud de Opciones|Solicitud de Servicio de Compra|Solicitud de Presupuesto|Solicitud de Apertura de Cuenta|Solicitud)(?:\s*\[[^\]]+\])?:\s*([^(\n]+)/i);
  if (headerMatch) {
    nombre = headerMatch[1].trim();
  }

  // 3. Extraer DNI
  const dniMatch = msg.match(/DNI:\s*([^,\)]+)/i);
  if (dniMatch) {
    dni = dniMatch[1].trim();
  }

  // 4. Extraer Teléfono / WhatsApp
  const telMatch = msg.match(/(?:Tel|WhatsApp|Telefono):\s*([^,\)]+)/i);
  if (telMatch) {
    telefono = telMatch[1].trim();
  } else if (alerta.clienteEmail && /^[\+0-9\s-]+$/.test(alerta.clienteEmail)) {
    telefono = alerta.clienteEmail.trim();
  }

  // 5. Extraer Localidad
  const locMatch = msg.match(/(?:Loc|Localidad|Dir):\s*([^,\)]+)/i);
  if (locMatch) {
    localidad = locMatch[1].trim();
  }

  // 6. Extraer Producto o Necesidad buscada
  const prodMatch = msg.match(/(?:Busca|Producto|Necesidad):\s*([^.\n]+)/i);
  if (prodMatch) {
    producto = prodMatch[1].trim();
  }

  // Fallbacks usando clienteEmail si está disponible
  if (!nombre && alerta.clienteEmail && !alerta.clienteEmail.includes("@") && !/^[\+0-9\s-]+$/.test(alerta.clienteEmail)) {
    nombre = alerta.clienteEmail.trim();
  }

  return {
    solicitudId,
    nombre,
    dni,
    telefono,
    localidad,
    producto,
    notas: msg
  };
}

/**
 * Resolución determinística de solicitudes para alertas legacy sin solicitudId explícito.
 * Orden estricto de resolución:
 * 1. Teléfono / WhatsApp exacto
 * 2. DNI exacto si existe
 * 3. Producto / Necesidad
 * 4. Proximidad temporal con fechaCreacion
 * FAIL CLOSED: Si existen 0 o más de 1 candidatos, NO vincula automáticamente.
 */
export function resolveLegacyAlertSolicitud(
  alerta: AlertaAdminItem,
  solicitudes: SolicitudCandidate[]
): LegacyResolutionResult {
  const cleanDigits = (str?: string) => (str || "").replace(/\D/g, "");

  // 0. Si ya tiene ID explícito, buscarlo directamente
  const lead = parseLeadFromAlert(alerta);
  const explicitId = alerta.solicitudId || lead.solicitudId;
  if (explicitId) {
    const direct = solicitudes.find(s => s.id === explicitId);
    if (direct) {
      return {
        matched: true,
        resolvedSolicitudId: direct.id,
        sourceCollection: direct.sourceCollection,
        candidatesCount: 1,
        candidates: [direct],
        message: "Solicitud vinculada por ID directo."
      };
    }
  }

  const leadTel = cleanDigits(lead.telefono);
  const leadDni = cleanDigits(lead.dni);
  const leadProd = (lead.producto || "").toLowerCase().trim();

  let pool = [...solicitudes];

  // 1. Filtrar por Teléfono / WhatsApp exacto si existe
  if (leadTel && leadTel.length >= 6) {
    const byTel = pool.filter(s => {
      const sTel = cleanDigits(s.whatsapp || (s.telefono as string));
      return sTel && (sTel === leadTel || sTel.endsWith(leadTel) || leadTel.endsWith(sTel));
    });
    if (byTel.length > 0) {
      pool = byTel;
    }
  }

  // 2. Filtrar por DNI exacto si existe y quedan múltiples
  if (pool.length > 1 && leadDni && leadDni.length >= 6) {
    const byDni = pool.filter(s => {
      const sDni = cleanDigits(s.numeroDni || (s.dni as string));
      return sDni && sDni === leadDni;
    });
    if (byDni.length > 0) {
      pool = byDni;
    }
  }

  // 3. Filtrar por Producto / Necesidad si aún quedan múltiples
  if (pool.length > 1 && leadProd) {
    const byProd = pool.filter(s => {
      const pName = String(s.productoNombre || s.necesidad || s.productoDeseado || "").toLowerCase().trim();
      return pName && (pName.includes(leadProd) || leadProd.includes(pName));
    });
    if (byProd.length > 0) {
      pool = byProd;
    }
  }

  // 4. Filtrar por proximidad temporal si aún quedan múltiples y fechaCreacion existe
  if (pool.length > 1 && alerta.fechaCreacion) {
    const parseDateMs = (val: unknown): number => {
      if (!val) return 0;
      if (val instanceof Date) return val.getTime();
      const obj = val as { toMillis?: () => number; seconds?: number };
      if (obj.toMillis) return obj.toMillis();
      if (obj.seconds) return obj.seconds * 1000;
      if (typeof val === "string" || typeof val === "number") {
        const d = new Date(val);
        return isNaN(d.getTime()) ? 0 : d.getTime();
      }
      return 0;
    };

    const alertMs = parseDateMs(alerta.fechaCreacion);
    if (alertMs > 0) {
      pool.sort((a, b) => {
        const diffA = Math.abs(parseDateMs(a.fechaCreacion || a.fecha || a.fechaIso) - alertMs);
        const diffB = Math.abs(parseDateMs(b.fechaCreacion || b.fecha || b.fechaIso) - alertMs);
        return diffA - diffB;
      });

      const diff0 = Math.abs(parseDateMs(pool[0].fechaCreacion || pool[0].fecha || pool[0].fechaIso) - alertMs);
      const diff1 = Math.abs(parseDateMs(pool[1].fechaCreacion || pool[1].fecha || pool[1].fechaIso) - alertMs);
      if (diff0 < diff1 && diff0 < 3600 * 1000) {
        pool = [pool[0]];
      }
    }
  }

  // Resultado
  if (pool.length === 1) {
    return {
      matched: true,
      resolvedSolicitudId: pool[0].id,
      sourceCollection: pool[0].sourceCollection,
      candidatesCount: 1,
      candidates: pool,
      message: "Solicitud original resuelta de manera determinística unívoca."
    };
  }

  return {
    matched: false,
    resolvedSolicitudId: null,
    sourceCollection: null,
    candidatesCount: pool.length,
    candidates: pool,
    message: "Solicitud original no vinculada automáticamente."
  };
}

/**
 * Construye la URL de redirección con parámetros pre-cargados para el módulo de Presupuestos
 */
export function buildBudgetRouteUrl(alerta: AlertaAdminItem): string {
  const lead = parseLeadFromAlert(alerta);
  const params = new URLSearchParams();

  if (alerta.id) params.set("alertaId", alerta.id);
  if (lead.solicitudId) params.set("solicitudId", lead.solicitudId);
  if (lead.nombre) params.set("nombre", lead.nombre);
  if (lead.dni) params.set("dni", lead.dni);
  if (lead.telefono) params.set("telefono", lead.telefono);
  if (lead.localidad) params.set("localidad", lead.localidad);
  if (lead.producto) params.set("producto", lead.producto);
  if (lead.notas) params.set("notas", lead.notas);

  // Parámetro de búsqueda rápida en tabla
  const searchFilter = lead.dni || lead.telefono || lead.nombre || lead.solicitudId || "";
  if (searchFilter) {
    params.set("q", searchFilter);
  }

  return `/admin/presupuestos?${params.toString()}`;
}

/**
 * Construye la URL de redirección para el módulo de Validaciones Crediticias
 */
export function buildCreditValidationRouteUrl(alerta: AlertaAdminItem): string {
  const lead = parseLeadFromAlert(alerta);
  const params = new URLSearchParams();

  params.set("tab", "aperturas");
  if (lead.solicitudId) params.set("solicitudId", lead.solicitudId);
  if (lead.dni) params.set("dni", lead.dni);

  return `/admin/validaciones?${params.toString()}`;
}

export interface AlertAction {
  label: string;
  href: string;
  type: "budget" | "validation" | "other";
}

/**
 * Resuelve la acción adecuada para cada alerta del Centro de Monitoreo Root
 */
export function resolveAlertAction(alerta: AlertaAdminItem): AlertAction | null {
  const tipo = alerta.tipo || "";

  if (isBudgetAlert(tipo)) {
    return {
      label: "Atender Solicitud",
      href: buildBudgetRouteUrl(alerta),
      type: "budget"
    };
  }

  if (isCreditValidationAlert(tipo)) {
    return {
      label: "Atender Solicitud",
      href: buildCreditValidationRouteUrl(alerta),
      type: "validation"
    };
  }

  return null;
}
