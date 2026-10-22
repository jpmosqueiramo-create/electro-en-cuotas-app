import { legacyAdminDestination } from "./adminCanonicalNavigation";
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
  fechaCreacion?: unknown;
  leida?: boolean;
  [key: string]: unknown;
}

export interface SolicitudCandidate {
  id: string;
  sourceCollection: "solicitudes_cuenta" | "solicitudes";
  nombreCompleto?: string;
  numeroDni?: string;
  whatsapp?: string;
  telefono?: string;
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
 * Normaliza determinísticamente un número telefónico extrayendo solo dígitos
 * y estandarizando prefijos comunes. Comparación exacta sobre string normalizado.
 */
export function normalizePhoneForMatching(str?: string): string {
  if (!str) return "";
  let digits = str.replace(/\D/g, "");
  if (digits.startsWith("549") && digits.length > 10) {
    digits = digits.slice(3);
  } else if (digits.startsWith("54") && digits.length > 10) {
    digits = digits.slice(2);
  }
  if (digits.startsWith("0") && digits.length > 10) {
    digits = digits.slice(1);
  }
  return digits;
}

/**
 * Normaliza determinísticamente un DNI extrayendo solo dígitos.
 */
export function normalizeDniForMatching(str?: string): string {
  if (!str) return "";
  return str.replace(/\D/g, "");
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
 * Secuencia estricta y Fail-Closed:
 * A. Teléfono: Comparación exacta de números normalizados completos (NO endsWith, NO matching parcial).
 *    Si el teléfono existe en la alerta y tiene 0 coincidencias exactas: RETURN INMEDIATO fail-closed.
 * B. DNI: Si quedan múltiples candidatos y la alerta tiene DNI, comparar DNI exacto.
 *    Si tiene 0 coincidencias: RETURN INMEDIATO fail-closed.
 * C. Producto: Reduce conjunto todavía ambiguo. Si 0 coincidencias: RETURN INMEDIATO fail-closed.
 * D. Fecha: Sólo desempata candidatos que sobrevivieron a los pasos anteriores.
 *    Usa fechaCreacion REAL de la alerta (NUNCA Date.now() ficticio).
 */
export function resolveLegacyAlertSolicitud(
  alerta: AlertaAdminItem,
  solicitudes: SolicitudCandidate[]
): LegacyResolutionResult {
  // 0. Si ya tiene ID explícito, buscarlo directamente en el pool
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
    // Si traía ID explícito pero no existe en el pool -> FAIL CLOSED
    return {
      matched: false,
      resolvedSolicitudId: null,
      sourceCollection: null,
      candidatesCount: 0,
      candidates: [],
      message: "Solicitud original no vinculada automáticamente."
    };
  }

  const leadTel = normalizePhoneForMatching(lead.telefono);
  const leadDni = normalizeDniForMatching(lead.dni);
  const leadProd = (lead.producto || "").toLowerCase().trim();

  let pool = [...solicitudes];

  // A. Teléfono: Normalizado exacto completo (NO endsWith, NO contains, NO matching parcial)
  if (leadTel && leadTel.length >= 6) {
    const byTel = pool.filter(s => {
      const sTel = normalizePhoneForMatching(s.whatsapp || (s.telefono as string));
      return sTel === leadTel;
    });
    // Si la alerta tiene teléfono y hay 0 coincidencias exactas: RETURN INMEDIATO FAIL CLOSED
    if (byTel.length === 0) {
      return {
        matched: false,
        resolvedSolicitudId: null,
        sourceCollection: null,
        candidatesCount: 0,
        candidates: [],
        message: "Solicitud original no vinculada automáticamente."
      };
    }
    pool = byTel;
  }

  // B. DNI: Si después del teléfono quedan múltiples candidatos y existe DNI
  if (pool.length > 1 && leadDni && leadDni.length >= 6) {
    const byDni = pool.filter(s => {
      const sDni = normalizeDniForMatching(s.numeroDni || (s.dni as string));
      return sDni === leadDni;
    });
    // Si existen 0 coincidencias de DNI: RETURN INMEDIATO FAIL CLOSED
    if (byDni.length === 0) {
      return {
        matched: false,
        resolvedSolicitudId: null,
        sourceCollection: null,
        candidatesCount: 0,
        candidates: [],
        message: "Solicitud original no vinculada automáticamente."
      };
    }
    pool = byDni;
  }

  // C. Producto: Sólo sirve para reducir un conjunto todavía ambiguo
  if (pool.length > 1 && leadProd) {
    const byProd = pool.filter(s => {
      const pName = String(s.productoNombre || s.necesidad || s.productoDeseado || "").toLowerCase().trim();
      return pName && (pName.includes(leadProd) || leadProd.includes(pName));
    });
    // Si existe producto y ninguna coincidencia: RETURN INMEDIATO FAIL CLOSED
    if (byProd.length === 0) {
      return {
        matched: false,
        resolvedSolicitudId: null,
        sourceCollection: null,
        candidatesCount: 0,
        candidates: [],
        message: "Solicitud original no vinculada automáticamente."
      };
    }
    pool = byProd;
  }

  // D. Fecha: Sólo desempata candidatos que sobrevivieron a los criterios anteriores.
  // Utiliza fechaCreacion real de la alerta. NUNCA Date.now() como fallback.
  if (pool.length > 1 && alerta.fechaCreacion) {
    const parseDateMs = (val: unknown): number => {
      if (!val) return 0;
      if (val instanceof Date) return val.getTime();
      const obj = val as { toMillis?: () => number; seconds?: number };
      if (typeof obj.toMillis === "function") return obj.toMillis();
      if (typeof obj.seconds === "number") return obj.seconds * 1000;
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
  if(alerta.sourceCollection==='solicitudes'||alerta.sourceCollection==='solicitudes_cuenta')params.set("sourceCollection",alerta.sourceCollection);
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
  return legacyAdminDestination('validation',{sourceCollection:typeof alerta.sourceCollection==='string'?alerta.sourceCollection:undefined,solicitudId:lead.solicitudId});
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

  if(tipo==='CONSULTA_PUBLICA_V2'){
    if(alerta.sourceCollection!=='solicitudes_cuenta'||typeof alerta.solicitudId!=='string'||!/^web_[A-Za-z0-9_-]+$/.test(alerta.solicitudId))return null;
    return {label:'Revisar consulta',href:`/admin/solicitudes/solicitudes_cuenta/${encodeURIComponent(alerta.solicitudId)}`,type:'other'};
  }

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
