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
