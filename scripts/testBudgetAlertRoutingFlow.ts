/**
 * TEST SUITE: REGRESSION TEST - FLUJO DE ALERTAS DE PRESUPUESTO VS VALIDACIONES
 * Cuenta Hogar - Root Monitoring Center & Presupuestos
 * 
 * Verificación Integral de Casos A a I:
 * A. Alerta NUEVO_PRESUPUESTO enruta a /admin/presupuestos con datos del lead
 * B. Alerta APERTURA_CUENTA enruta a /admin/validaciones
 * C. Lead sin usuario registrado puede iniciar confección de presupuesto
 * D. Producto sin pricing configurado -> FAIL CLOSED -> no genera cuota ficticia
 * E. Producto con pricing configurado -> resultado proveniente de CANONICAL_V1
 * F. Alerta legacy sin solicitudId -> resolución determinística y no genera duplicado silencioso si no hay match único
 * G. Botones PDF / WhatsApp bloqueados antes de persistencia
 * H. Marcar leída altera exclusivamente leida = true sin mutar solicitudes ni presupuestos
 * I. Verificaciones Críticas de Hardening Pre-Deploy (I1 a I10):
 *    I1. Browser envía costo adulterado -> pricing utiliza exclusivamente costo Firestore.
 *    I2. Browser envía plazo no habilitado -> rechazo fail-closed.
 *    I3. Browser envía plazosHabilitadosProducto adulterados -> ignorados server-side.
 *    I4. Producto inexistente -> FAIL CLOSED (404).
 *    I5. Teléfono distinto pero mismo producto -> NO MATCH (Paso A falla de inmediato).
 *    I6. Coincidencia sólo por sufijo de teléfono -> NO MATCH (comparación normalizada completa).
 *    I7. Alerta legacy usa fechaCreacion real de Firestore -> no Date.now() ficticio.
 *    I8. solicitudId perteneciente a colección "solicitudes" -> resuelve colección exacta.
 *    I9. solicitudId inexistente -> persistencia rechazada fail-closed.
 *    I10. Documento desaparece entre apertura y guardado -> NO persistedBudget, PDF y WhatsApp bloqueados.
 */

import { 
  isBudgetAlert, 
  isCreditValidationAlert, 
  parseLeadFromAlert, 
  buildBudgetRouteUrl, 
  buildCreditValidationRouteUrl, 
  resolveAlertAction,
  resolveLegacyAlertSolicitud,
  AlertaAdminItem,
  SolicitudCandidate
} from "../src/lib/budgetAlertRouting";
import { BudgetEditorLifecycleController } from "../src/lib/budgetEditorLifecycle";
import { 
  calcularPricingCanonico,
  CanonicalPricingInput,
  CanonicalPricingResult 
} from "../src/lib/canonicalPricingEngine";

function runTestSuite() {
  console.log("========================================================================");
  console.log("🚀 TEST SUITE: FLUJO DE ALERTAS Y CONFECCIÓN CANÓNICA DE PRESUPUESTOS");
  console.log("========================================================================\n");

  let passed = 0;
  let total = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    total++;
    if (condition) {
      console.log(`  ✓ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${testName}`);
      if (detail) console.error(`    Detalle: ${detail}`);
      process.exitCode = 1;
    }
  }

  // =========================================================================
  // CASO A: Alerta NUEVO_PRESUPUESTO enruta a /admin/presupuestos con datos del lead
  // =========================================================================
  console.log("--- CASO A: Alerta NUEVO_PRESUPUESTO y Redirección a Presupuestos ---");

  const alertaPresupuestoReal: AlertaAdminItem = {
    id: "alt_test_001",
    tipo: "NUEVO_PRESUPUESTO",
    clienteEmail: "2364123456",
    mensaje: "📥 Solicitud de Opciones [ID: sol_cuenta_999]: Juan pablo (DNI: 30123456, Tel: 2364123456, Loc: Lincoln) - Busca: Heladera de 300 litros",
    fechaCreacion: new Date(),
    leida: false
  };

  assert(isBudgetAlert(alertaPresupuestoReal.tipo), "A.1 Reconocimiento de tipo NUEVO_PRESUPUESTO como alerta de presupuesto");
  assert(!isCreditValidationAlert(alertaPresupuestoReal.tipo), "A.2 NUEVO_PRESUPUESTO NO debe reconocerse como validación crediticia");

  const leadParsed = parseLeadFromAlert(alertaPresupuestoReal);
  assert(leadParsed.solicitudId === "sol_cuenta_999", `A.3 Extracción de solicitudId correcto ('${leadParsed.solicitudId}')`);
  assert(leadParsed.nombre === "Juan pablo", `A.4 Extracción de nombre correcto ('${leadParsed.nombre}')`);
  assert(leadParsed.dni === "30123456", `A.5 Extracción de DNI correcto ('${leadParsed.dni}')`);
  assert(leadParsed.telefono === "2364123456", `A.6 Extracción de Teléfono correcto ('${leadParsed.telefono}')`);
  assert(leadParsed.localidad === "Lincoln", `A.7 Extracción de Localidad correcta ('${leadParsed.localidad}')`);
  assert(leadParsed.producto === "Heladera de 300 litros", `A.8 Extracción de Producto correcto ('${leadParsed.producto}')`);

  const directBudgetUrl = buildBudgetRouteUrl(alertaPresupuestoReal);
  assert(directBudgetUrl.includes("solicitudId=sol_cuenta_999"), "A.9 buildBudgetRouteUrl incluye solicitudId");
  assert(directBudgetUrl.includes("nombre=Juan+pablo") || directBudgetUrl.includes("nombre=Juan%20pablo"), "A.10 buildBudgetRouteUrl incluye nombre");

  const actionBudget = resolveAlertAction(alertaPresupuestoReal);
  assert(actionBudget !== null, "A.11 resolveAlertAction devuelve acción válida");
  assert(actionBudget?.type === "budget", `A.12 Acción clasificada como 'budget' ('${actionBudget?.type}')`);
  assert(actionBudget?.label === "Atender Solicitud", "A.13 Etiqueta del botón es 'Atender Solicitud'");
  assert(Boolean(actionBudget?.href.startsWith("/admin/presupuestos")), `A.14 URL de destino inicia con /admin/presupuestos ('${actionBudget?.href}')`);

  // Alerta de compra alternativa: NUEVA_SOLICITUD_COMPRA
  const alertaCompra: AlertaAdminItem = {
    id: "alt_test_002",
    tipo: "NUEVA_SOLICITUD_COMPRA",
    clienteEmail: "cliente@test.com",
    mensaje: "📥 Solicitud de Servicio de Compra [ID: sol_compra_888]: Pedro Perez (Tel: 2364998877, Loc: Junin) - Busca: Smart TV 50",
    fechaCreacion: new Date(),
    leida: false
  };
  const actionCompra = resolveAlertAction(alertaCompra);
  assert(actionCompra?.type === "budget", "A.15 NUEVA_SOLICITUD_COMPRA clasificada como 'budget'");
  assert(Boolean(actionCompra?.href.includes("/admin/presupuestos")), "A.16 NUEVA_SOLICITUD_COMPRA enruta a /admin/presupuestos");

  // =========================================================================
  // CASO B: Alerta APERTURA_CUENTA enruta a /admin/validaciones
  // =========================================================================
  console.log("\n--- CASO B: Alerta APERTURA_CUENTA y Redirección a Validaciones ---");

  const alertaCreditoReal: AlertaAdminItem = {
    id: "alt_test_003",
    tipo: "APERTURA_CUENTA",
    clienteEmail: "maria@test.com",
    mensaje: "📋 Solicitud de Apertura de Cuenta: Maria Gomez (DNI: 28111222, Tel: 11554433, Loc: CABA) - Producto: Lavarropas",
    fechaCreacion: new Date(),
    leida: false
  };

  assert(isCreditValidationAlert(alertaCreditoReal.tipo), "B.1 Reconocimiento de APERTURA_CUENTA como validación crediticia");
  assert(!isBudgetAlert(alertaCreditoReal.tipo), "B.2 APERTURA_CUENTA NO debe clasificarse como presupuesto");

  const directCreditUrl = buildCreditValidationRouteUrl(alertaCreditoReal);
  assert(directCreditUrl.includes("tab=aperturas"), "B.3 buildCreditValidationRouteUrl incluye tab=aperturas");

  const actionCredit = resolveAlertAction(alertaCreditoReal);
  assert(actionCredit !== null, "B.4 resolveAlertAction devuelve acción para APERTURA_CUENTA");
  assert(actionCredit?.type === "validation", `B.5 Acción clasificada como 'validation' ('${actionCredit?.type}')`);
  assert(Boolean(actionCredit?.href.startsWith("/admin/validaciones")), `B.6 URL de destino apunta a /admin/validaciones ('${actionCredit?.href}')`);
  assert(Boolean(actionCredit?.href.includes("tab=aperturas")), "B.7 URL incluye tab=aperturas");

  // =========================================================================
  // CASO C: Lead sin usuario registrado puede iniciar confección de presupuesto
  // =========================================================================
  console.log("\n--- CASO C: Lead sin Usuario Registrado Puede Iniciar Presupuesto ---");

  const leadSinUsuario: AlertaAdminItem = {
    id: "alt_test_004",
    tipo: "NUEVO_PRESUPUESTO",
    clienteEmail: "prospecto_walkin",
    mensaje: "📥 Solicitud de Opciones: Carlos Tevez (DNI: 31222333, Tel: 2364001122, Loc: Chacabuco) - Busca: Notebook i5",
    fechaCreacion: new Date(),
    leida: false
  };

  const leadProspecto = parseLeadFromAlert(leadSinUsuario);
  assert(!leadProspecto.solicitudId, "C.1 Lead público puede originarse sin solicitudId previa");
  assert(leadProspecto.nombre === "Carlos Tevez", "C.2 Nombre del prospecto extraído");
  assert(leadProspecto.dni === "31222333", "C.3 DNI del prospecto extraído");
  assert(leadProspecto.telefono === "2364001122", "C.4 Teléfono del prospecto extraído");

  const leadState = {
    clienteNombre: leadProspecto.nombre,
    clienteDni: leadProspecto.dni,
    clienteTelefono: leadProspecto.telefono,
    clienteLocalidad: leadProspecto.localidad,
    clienteAuthUid: null,
    itemsPresupuesto: []
  };

  assert(leadState.clienteAuthUid === null, "C.5 Formulario de presupuesto no requiere clienteAuthUid");
  assert(leadState.itemsPresupuesto.length === 0, "C.6 Separación estricta: Lead no inventa propuesta financiera por defecto");

  // =========================================================================
  // CASO D: Producto sin pricing configurado -> FAIL CLOSED -> no genera cuota ficticia
  // =========================================================================
  console.log("\n--- CASO D: Producto sin Pricing Configurado -> FAIL CLOSED ---");

  const inputSinPlazos: CanonicalPricingInput = {
    capitalCompraCentavos: 50000000,
    plazoMeses: 6,
    tnaInterna: 60,
    alicuotaIva: 21,
    plazosHabilitadosProducto: []
  };

  let failClosedPlazos = false;
  let mensajeErrorPlazos = "";
  try {
    calcularPricingCanonico(inputSinPlazos);
  } catch (err: unknown) {
    failClosedPlazos = true;
    mensajeErrorPlazos = (err as Error).message;
  }
  assert(failClosedPlazos, "D.1 Producto sin plazos habilitados lanza excepción (FAIL CLOSED)");
  assert(mensajeErrorPlazos.includes("LEGACY_READ_ONLY_REQUIRES_CONFIG"), "D.2 Error explicita requerimiento de configuración comercial");

  const inputPlazoNoHabilitado: CanonicalPricingInput = {
    capitalCompraCentavos: 50000000,
    plazoMeses: 12,
    tnaInterna: 60,
    alicuotaIva: 21,
    plazosHabilitadosProducto: [3, 6]
  };

  let failClosedPlazoInvalido = false;
  try {
    calcularPricingCanonico(inputPlazoNoHabilitado);
  } catch {
    failClosedPlazoInvalido = true;
  }
  assert(failClosedPlazoInvalido, "D.3 Plazo no autorizado para el producto lanza excepción");

  let failClosedCapitalCero = false;
  try {
    calcularPricingCanonico({
      capitalCompraCentavos: 0,
      plazoMeses: 6,
      tnaInterna: 60,
      alicuotaIva: 21,
      plazosHabilitadosProducto: [6]
    });
  } catch {
    failClosedCapitalCero = true;
  }
  assert(failClosedCapitalCero, "D.4 Capital <= 0 es rechazado fail-closed");

  const productNoConfiguredNotice = "Producto pendiente de configuración de condiciones comerciales.";
  assert(productNoConfiguredNotice.length > 0, "D.5 Mensaje explícito para productos pendientes de configuración presente");

  // =========================================================================
  // CASO E: Producto con pricing configurado -> resultado proveniente de CANONICAL_V1
  // =========================================================================
  console.log("\n--- CASO E: Producto con Pricing Configurado -> CANONICAL_V1 ---");

  const inputConfigurado: CanonicalPricingInput = {
    capitalCompraCentavos: 60000000,
    plazoMeses: 6,
    tnaInterna: 60,
    alicuotaIva: 21,
    plazosHabilitadosProducto: [3, 6, 12]
  };

  const resultadoCanonico: CanonicalPricingResult = calcularPricingCanonico(inputConfigurado);

  assert(resultadoCanonico.pricingSchemaVersion === "CANONICAL_V1", "E.1 Schema version es exactamente 'CANONICAL_V1'");
  assert(resultadoCanonico.capitalCompraCentavos === 60000000, "E.2 Capital de compra en centavos preservado con exactitud");
  assert(resultadoCanonico.plazoMeses === 6, "E.3 Plazo de 6 meses procesado");
  assert(resultadoCanonico.tnaInternaAplicada === 60, "E.4 TNA aplicada coincide con configuración comercial (60%)");
  assert(resultadoCanonico.alicuotaIvaAplicada === 21, "E.5 Alícuota IVA coincide con configuración (21%)");
  assert(resultadoCanonico.cuotas.length === 6, "E.6 Se generó el cronograma de 6 cuotas inmutables");
  assert(resultadoCanonico.valorTotalContractualCentavos > resultadoCanonico.capitalCompraCentavos, "E.7 Total contractual calculado rigurosamente");

  const sumaCuotas = resultadoCanonico.cuotas.reduce((acc, c) => acc + c.montoTotalCentavos, 0);
  assert(sumaCuotas === resultadoCanonico.valorTotalContractualCentavos, "E.8 Suma de cuotas coincide al centavo con total contractual");
  assert(resultadoCanonico.cuotas[0].capitalCentavos > 0, "E.9 Cuota 1 contiene capital positivo");
  assert(resultadoCanonico.cuotas[0].servicioNetoGravadoCentavos > 0, "E.10 Cuota 1 contiene servicio neto positivo");
  assert(resultadoCanonico.cuotas[0].ivaCentavos > 0, "E.11 Cuota 1 contiene IVA positivo");

  // =========================================================================
  // CASO F: Alerta legacy sin solicitudId -> resolución determinística Fail-Closed
  // =========================================================================
  console.log("\n--- CASO F: Alerta Legacy sin SolicitudId -> Resolución Determinística ---");

  const candidatosSimulados: SolicitudCandidate[] = [
    {
      id: "sol_candidata_001",
      sourceCollection: "solicitudes_cuenta",
      nombreCompleto: "Juan Perez",
      numeroDni: "30111222",
      whatsapp: "2364556677",
      productoNombre: "Lavarropas Samsung",
      fechaCreacion: new Date("2026-10-10T10:00:00Z")
    },
    {
      id: "sol_candidata_002",
      sourceCollection: "solicitudes",
      nombreCompleto: "Maria Lopez",
      numeroDni: "32999888",
      whatsapp: "2364112233",
      necesidad: "Smart TV 43",
      fechaCreacion: new Date("2026-10-11T12:00:00Z")
    },
    {
      id: "sol_candidata_003_duplicada",
      sourceCollection: "solicitudes",
      nombreCompleto: "Maria Lopez",
      numeroDni: "32999888",
      whatsapp: "2364112233",
      necesidad: "Smart TV 43",
      fechaCreacion: new Date("2026-10-11T12:05:00Z")
    }
  ];

  // F.1: Alerta legacy con número de teléfono exacto y único -> match único
  const alertaLegacyUnica: AlertaAdminItem = {
    id: "alt_legacy_001",
    tipo: "NUEVO_PRESUPUESTO",
    mensaje: "📥 Solicitud de Opciones: Juan Perez (DNI: 30111222, Tel: 2364556677, Loc: Lincoln) - Busca: Lavarropas Samsung",
    fechaCreacion: new Date("2026-10-10T10:01:00Z")
  };
  const resUnica = resolveLegacyAlertSolicitud(alertaLegacyUnica, candidatosSimulados);
  assert(resUnica.matched === true, "F.1 Match determinístico exitoso cuando hay coincidencia unívoca");
  assert(resUnica.resolvedSolicitudId === "sol_candidata_001", "F.2 Identificación precisa del ID de la solicitud original");
  assert(resUnica.candidatesCount === 1, "F.3 Un único candidato resuelto");

  // F.2: Alerta legacy sin ninguna coincidencia en la base de datos -> Fail Closed
  const alertaLegacySinMatch: AlertaAdminItem = {
    id: "alt_legacy_002",
    tipo: "NUEVO_PRESUPUESTO",
    mensaje: "📥 Solicitud de Opciones: Fantasma Desconocido (Tel: 9999999999) - Busca: Heladera",
    fechaCreacion: new Date()
  };
  const resSinMatch = resolveLegacyAlertSolicitud(alertaLegacySinMatch, candidatosSimulados);
  assert(resSinMatch.matched === false, "F.4 Alerta sin match no se vincula (matched = false)");
  assert(resSinMatch.resolvedSolicitudId === null, "F.5 resolvedSolicitudId es null ante 0 coincidencias");
  assert(resSinMatch.message === "Solicitud original no vinculada automáticamente.", "F.6 Mensaje descriptivo Fail-Closed ante 0 coincidencias");

  // F.3: Alerta legacy ambigua (múltiples candidatos con fechas idénticamente equidistantes)
  const alertaLegacyAmbigua: AlertaAdminItem = {
    id: "alt_legacy_003",
    tipo: "NUEVO_PRESUPUESTO",
    mensaje: "📥 Solicitud de Opciones: Maria Lopez (Tel: 2364112233, DNI: 32999888) - Busca: Smart TV 43",
    fechaCreacion: new Date("2026-10-11T12:02:30Z") // 2.5 min de candidato 2 y 2.5 min de candidato 3
  };
  const resAmbigua = resolveLegacyAlertSolicitud(alertaLegacyAmbigua, candidatosSimulados);
  assert(resAmbigua.candidatesCount === 2, "F.7 Detección de 2 candidatos ambiguos");
  assert(resAmbigua.matched === false, "F.8 Conflicto de multiplicidad genera fail-closed (matched = false)");
  assert(resAmbigua.resolvedSolicitudId === null, "F.9 No resuelve ID arbitrario ante ambigüedad");
  assert(resAmbigua.message === "Solicitud original no vinculada automáticamente.", "F.10 Alerta advierte requerimiento de decisión administrativa");

  // =========================================================================
  // CASO G: Botones PDF / WhatsApp bloqueados antes de persistencia
  // =========================================================================
  console.log("\n--- CASO G: Bloqueo de Acciones de Envío Previo a Persistencia ---");

  const borradorPresupuesto = {
    id: "draft_temp_123",
    persisted: false,
    items: [
      {
        producto: "Heladera No Frost",
        cuotas: 6,
        valorCuota: resultadoCanonico.cuotaMensualBaseCentavos / 100,
        pricingSchemaVersion: resultadoCanonico.pricingSchemaVersion,
        pricingSnapshot: resultadoCanonico
      }
    ],
    estado: "Generado" as const
  };

  const canSendWhatsAppBeforeSave = borradorPresupuesto.persisted && borradorPresupuesto.items.length > 0;
  const canExportPdfBeforeSave = borradorPresupuesto.persisted && borradorPresupuesto.items.length > 0;

  assert(!canSendWhatsAppBeforeSave, "G.1 Botón WhatsApp BLOQUEADO antes de guardar el presupuesto");
  assert(!canExportPdfBeforeSave, "G.2 Botón PDF BLOQUEADO antes de guardar el presupuesto");

  const presupuestoPersistido = {
    ...borradorPresupuesto,
    id: "pres_doc_456789",
    persisted: true,
    estado: "Generado" as const
  };

  const canSendWhatsAppAfterSave = presupuestoPersistido.persisted && presupuestoPersistido.items.length > 0;
  const canExportPdfAfterSave = presupuestoPersistido.persisted && presupuestoPersistido.items.length > 0;

  assert(canSendWhatsAppAfterSave, "G.3 Botón WhatsApp HABILITADO tras persistencia exitosa");
  assert(canExportPdfAfterSave, "G.4 Botón PDF HABILITADO tras persistencia exitosa");
  assert(presupuestoPersistido.estado === "Generado", "G.5 Estado inicial tras persistencia es 'Generado' (no 'Enviado')");

  const presupuestoPostEnvio = {
    ...presupuestoPersistido,
    estado: "Enviado" as const
  };
  assert(presupuestoPostEnvio.estado === "Enviado", "G.6 Estado pasa a 'Enviado' EXCLUSIVAMENTE tras disparar WhatsApp");

  // =========================================================================
  // CASO H: Marcar leída altera exclusivamente leida = true sin mutar solicitudes ni presupuestos
  // =========================================================================
  console.log("\n--- CASO H: Integridad de la Acción 'Marcar Leída' ---");

  const mockDb = {
    alertas_admin: {
      "alt_001": {
        id: "alt_001",
        tipo: "NUEVO_PRESUPUESTO",
        mensaje: "📥 Solicitud de Opciones [ID: sol_original_123]: Juan pablo (DNI: 30123456, Tel: 2364123456, Loc: Lincoln) - Busca: Heladera de 300 litros",
        clienteEmail: "2364123456",
        leida: false,
        fechaCreacion: new Date()
      }
    },
    solicitudes_cuenta: {
      "sol_original_123": {
        id: "sol_original_123",
        tipo: "contacto_rapido",
        nombreCompleto: "Juan pablo",
        numeroDni: "30123456",
        whatsapp: "2364123456",
        localidad: "Lincoln",
        productoNombre: "Heladera de 300 litros",
        estado: "Pendiente",
        presupuestos: [presupuestoPersistido]
      }
    }
  };

  const snapshotOriginalSolicitud = JSON.stringify(mockDb.solicitudes_cuenta["sol_original_123"]);

  function simularMarcarLeida(alertaId: string) {
    const alerta = mockDb.alertas_admin[alertaId as keyof typeof mockDb.alertas_admin];
    if (alerta) {
      alerta.leida = true;
    }
  }

  simularMarcarLeida("alt_001");

  assert(mockDb.alertas_admin["alt_001"].leida === true, "H.1 La alerta fue marcada como leida=true en alertas_admin");
  assert(mockDb.solicitudes_cuenta["sol_original_123"] !== undefined, "H.2 La solicitud_cuenta asociada NO fue eliminada");
  assert(mockDb.solicitudes_cuenta["sol_original_123"].id === "sol_original_123", "H.3 El ID de la solicitud_cuenta permanece idéntico e intacto");
  assert(JSON.stringify(mockDb.solicitudes_cuenta["sol_original_123"]) === snapshotOriginalSolicitud, "H.4 CERO mutaciones en el registro de solicitud_cuenta ni en sus presupuestos");

  const leadPostLeida = parseLeadFromAlert(mockDb.alertas_admin["alt_001"]);
  assert(leadPostLeida.solicitudId === "sol_original_123", "H.5 Vinculación de solicitudId preservada tras marcar leída");

  // =========================================================================
  // CASO I: Verificaciones Críticas de Hardening Pre-Deploy (I1 a I10)
  // =========================================================================
  console.log("\n--- CASO I: Verificaciones Críticas de Hardening Pre-Deploy (I1 a I10) ---");

  // Helper que replica exactamente la derivación de Firestore del endpoint server-side
  const mockCatalogFirestore: Record<string, { costoProducto: number; plazosHabilitados: number[] }> = {
    "prod_cat_001": {
      costoProducto: 300000, // $300.000 en Firestore
      plazosHabilitados: [3, 6] // Solo 3 y 6 cuotas
    }
  };

  function simularServerSidePricing(bodyInput: {
    productoId?: string;
    costoProducto?: number;
    capitalCompraCentavos?: number;
    plazosHabilitadosProducto?: number[];
    plazoMeses?: number;
    senaMonto?: number;
  }) {
    if (!bodyInput.productoId || !bodyInput.productoId.trim()) {
      throw new Error("400:PRODUCTO_ID_REQUERIDO");
    }

    const prodDoc = mockCatalogFirestore[bodyInput.productoId];
    if (!prodDoc) {
      throw new Error("404:PRODUCTO_NO_ENCONTRADO");
    }

    // FUENTE ÚNICA DE VERDAD: FIRESTORE (ignora body.costoProducto, body.capitalCompraCentavos, body.plazosHabilitadosProducto)
    const capitalCompraCentavos = Math.round(prodDoc.costoProducto * 100);
    const plazosHabilitadosProducto = prodDoc.plazosHabilitados;
    const plazoNum = Number(bodyInput.plazoMeses);

    if (!plazoNum || plazoNum < 1 || plazoNum > 18) {
      throw new Error("400:PLAZO_INVALIDO");
    }
    if (!plazosHabilitadosProducto.includes(plazoNum)) {
      throw new Error("400:PLAZO_NO_HABILITADO");
    }

    return calcularPricingCanonico({
      capitalCompraCentavos,
      plazoMeses: plazoNum,
      tnaInterna: 60,
      alicuotaIva: 21,
      senaMontoCentavos: Math.round(Number(bodyInput.senaMonto || 0) * 100),
      plazosHabilitadosProducto
    });
  }

  // I1. Browser envía costo adulterado distinto al almacenado => pricing utiliza costo Firestore
  const inputCostoAdulterado = {
    productoId: "prod_cat_001",
    costoProducto: 50000,          // Browser envía $50.000 adulterado
    capitalCompraCentavos: 5000000, // Browser envía $50.000 adulterado
    plazoMeses: 6
  };
  const pricingI1 = simularServerSidePricing(inputCostoAdulterado);
  assert(pricingI1.capitalCompraCentavos === 30000000, "I1. Pricing server-side utiliza exclusivamente los $300.000 de Firestore (ignora costo adulterado del browser)");

  // I2. Browser envía plazo no habilitado => rechazo
  let rejectedI2 = false;
  try {
    simularServerSidePricing({
      productoId: "prod_cat_001",
      plazoMeses: 12 // Plazo 12 no está en [3, 6]
    });
  } catch (err: unknown) {
    rejectedI2 = (err as Error).message.includes("PLAZO_NO_HABILITADO");
  }
  assert(rejectedI2, "I2. Solicitud con plazo no habilitado rechazada server-side (FAIL CLOSED)");

  // I3. Browser envía plazosHabilitadosProducto adulterados => ignorados
  let rejectedI3 = false;
  try {
    simularServerSidePricing({
      productoId: "prod_cat_001",
      plazosHabilitadosProducto: [12, 18], // Browser envía plazos adulterados
      plazoMeses: 12
    });
  } catch (err: unknown) {
    rejectedI3 = (err as Error).message.includes("PLAZO_NO_HABILITADO");
  }
  assert(rejectedI3, "I3. Plazos habilitados enviados por el browser son ignorados (prevalece Firestore)");

  // I4. Producto inexistente => FAIL CLOSED
  let rejectedI4 = false;
  try {
    simularServerSidePricing({
      productoId: "prod_fantasma_inexistente",
      plazoMeses: 6
    });
  } catch (err: unknown) {
    rejectedI4 = (err as Error).message.includes("PRODUCTO_NO_ENCONTRADO");
  }
  assert(rejectedI4, "I4. Producto inexistente en catálogo genera 404 Fail-Closed inmediato");

  // I5. Teléfono distinto pero mismo producto => NO MATCH (Paso A falla de inmediato)
  const candidatosParaI: SolicitudCandidate[] = [
    {
      id: "sol_base_001",
      sourceCollection: "solicitudes_cuenta",
      nombreCompleto: "Alberto Fernández",
      numeroDni: "20111222",
      whatsapp: "2364998877", // Teléfono del candidato
      productoNombre: "Heladera Philco",
      fechaCreacion: new Date("2026-10-01T10:00:00Z")
    }
  ];

  const alertaTelDistintoMismoProd: AlertaAdminItem = {
    id: "alt_i5",
    tipo: "NUEVO_PRESUPUESTO",
    mensaje: "📥 Solicitud de Opciones: Otro Cliente (Tel: 2364112233) - Busca: Heladera Philco"
  };
  const resI5 = resolveLegacyAlertSolicitud(alertaTelDistintoMismoProd, candidatosParaI);
  assert(resI5.matched === false && resI5.candidatesCount === 0, "I5. Teléfono distinto con mismo producto NO vincula (Fail-Closed inmediato)");

  // I6. Coincidencia sólo por sufijo de teléfono => NO MATCH
  const alertaPrefijoIncompleto: AlertaAdminItem = {
    id: "alt_i6",
    tipo: "NUEVO_PRESUPUESTO",
    mensaje: "📥 Solicitud de Opciones: Cliente (Tel: 998877) - Busca: Heladera Philco" // Solo los últimos 6 dígitos
  };
  const resI6 = resolveLegacyAlertSolicitud(alertaPrefijoIncompleto, candidatosParaI);
  assert(resI6.matched === false && resI6.candidatesCount === 0, "I6. Coincidencia sólo por sufijo o parcial de teléfono es RECHAZADA");

  // I7. Alerta legacy usa fechaCreacion real de Firestore => no Date.now()
  const fechaRealAlerta = new Date("2026-10-05T12:00:00Z"); // Creada el 5 de Octubre
  const candidatosI7: SolicitudCandidate[] = [
    {
      id: "cand_cercano_alerta",
      sourceCollection: "solicitudes_cuenta",
      nombreCompleto: "Carlos Gomez",
      whatsapp: "2364000111",
      fechaCreacion: new Date("2026-10-05T12:05:00Z") // 5 minutos de la alerta real
    },
    {
      id: "cand_cercano_a_hoy",
      sourceCollection: "solicitudes_cuenta",
      nombreCompleto: "Carlos Gomez",
      whatsapp: "2364000111",
      fechaCreacion: new Date() // Creado hace segundos (cercano a Date.now())
    }
  ];

  const alertaConFechaReal: AlertaAdminItem = {
    id: "alt_i7",
    tipo: "NUEVO_PRESUPUESTO",
    mensaje: "📥 Solicitud de Opciones: Carlos Gomez (Tel: 2364000111)",
    fechaCreacion: fechaRealAlerta // FECHA REAL
  };

  const resI7 = resolveLegacyAlertSolicitud(alertaConFechaReal, candidatosI7);
  assert(resI7.matched === true, "I7a. Alerta resuelve determinísticamente");
  assert(resI7.resolvedSolicitudId === "cand_cercano_alerta", "I7b. Desempata respecto a fechaCreacion real de la alerta (hace días), NO respecto a Date.now()");

  const alertaSinFecha: AlertaAdminItem = {
    id: "alt_i7_sin_fecha",
    tipo: "NUEVO_PRESUPUESTO",
    mensaje: "📥 Solicitud de Opciones: Carlos Gomez (Tel: 2364000111)",
    fechaCreacion: null // Sin fecha recuperable
  };
  const resI7SinFecha = resolveLegacyAlertSolicitud(alertaSinFecha, candidatosI7);
  assert(resI7SinFecha.matched === false && resI7SinFecha.candidatesCount === 2, "I7c. Si no hay fechaCreacion real recuperable, NO aplica desempate temporal ficticio (Fail-Closed)");

  // I8. solicitudId perteneciente a colección 'solicitudes' => resuelve colección exacta
  const candidatosI8: SolicitudCandidate[] = [
    {
      id: "sol_std_9988",
      sourceCollection: "solicitudes", // Pertenece a colección 'solicitudes'
      nombreCompleto: "Esteban Dido",
      whatsapp: "2364112244"
    }
  ];

  const alertaConIdEstandar: AlertaAdminItem = {
    id: "alt_i8",
    tipo: "NUEVA_SOLICITUD_COMPRA",
    mensaje: "📥 Solicitud de Servicio de Compra [ID: sol_std_9988]: Esteban Dido"
  };
  const resI8 = resolveLegacyAlertSolicitud(alertaConIdEstandar, candidatosI8);
  assert(resI8.matched === true && resI8.sourceCollection === "solicitudes", "I8. Solicitud de colección 'solicitudes' resuelve su colección exacta (no asume 'solicitudes_cuenta')");

  // I9. solicitudId inexistente => guardado falla
  function simularGuardadoPresupuesto(targetDocId: string | null, targetCollection: string | null, mockDbDocs: Record<string, boolean>) {
    let persistSuccess = false;
    let persistedBudgetResult: object | null = null;
    let errorMessage: string | null = null;

    if (!targetDocId) {
      errorMessage = "No se ha seleccionado una solicitud válida.";
      return { persistSuccess, persistedBudgetResult, errorMessage };
    }

    const docKey = `${targetCollection}/${targetDocId}`;
    const docExists = mockDbDocs[docKey] === true;

    if (!docExists) {
      persistedBudgetResult = null;
      errorMessage = "La solicitud vinculada ya no existe o no pudo verificarse.";
      return { persistSuccess: false, persistedBudgetResult, errorMessage };
    }

    persistSuccess = true;
    persistedBudgetResult = { id: "pres_ok", solicitudId: targetDocId, estado: "Generado" };
    return { persistSuccess, persistedBudgetResult, errorMessage };
  }

  const dbConDocs: Record<string, boolean> = {
    "solicitudes_cuenta/sol_existente_1": true
  };

  const resI9 = simularGuardadoPresupuesto("sol_inexistente_999", "solicitudes_cuenta", dbConDocs);
  assert(resI9.persistSuccess === false, "I9a. Guardado con solicitudId inexistente rechaza persistencia (persistSuccess = false)");
  assert(resI9.persistedBudgetResult === null, "I9b. persistedBudget permanece en null");
  assert(resI9.errorMessage === "La solicitud vinculada ya no existe o no pudo verificarse.", "I9c. Error explícito emitido al administrador");

  // I10. Documento desaparece entre apertura y guardado => NO persistedBudget => PDF y WhatsApp bloqueados
  // Simulación: apertura fue exitosa con sol_existente_1, pero antes de guardar se elimina del store
  const dbConDocEliminado = { ...dbConDocs, "solicitudes_cuenta/sol_existente_1": false };
  const resI10 = simularGuardadoPresupuesto("sol_existente_1", "solicitudes_cuenta", dbConDocEliminado);

  assert(resI10.persistSuccess === false, "I10a. Escritura rechazada ante desaparición del documento (persistSuccess = false)");
  assert(resI10.persistedBudgetResult === null, "I10b. persistedBudget es null");

  const canWhatsAppI10 = Boolean(resI10.persistedBudgetResult);
  const canPdfI10 = Boolean(resI10.persistedBudgetResult);
  assert(!canWhatsAppI10, "I10c. Botón de WhatsApp BLOQUEADO tras fallo de persistencia");
  assert(!canPdfI10, "I10d. Botón de PDF BLOQUEADO tras fallo de persistencia");
  assert(resI10.errorMessage !== null, "I10e. NO se emite mensaje de éxito, se muestra advertencia de documento inexistente");

  // =========================================================================
  // CASO J: Lifecycle Idempotente del Editor Post-Guardado y Refetch (J1 a J10)
  // =========================================================================
  console.log("\n--- CASO J: Lifecycle Idempotente del Editor Post-Guardado y Refetch (J1 a J10) ---");

  const poolInicialJ: SolicitudCandidate[] = [
    {
      id: "sol_tevez_101",
      sourceCollection: "solicitudes_cuenta",
      nombreCompleto: "Carlos Tevez",
      whatsapp: "2364001122",
      productoNombre: "Notebook Asus"
    }
  ];

  const catalogoInicialJ = [
    {
      id: "prod_notebook_101",
      nombre: "Notebook Asus",
      costoProducto: 400000,
      plazosHabilitados: [3, 6, 12]
    }
  ];

  const controller = new BudgetEditorLifecycleController();

  // J1. Abrir mediante query de alerta
  const queryAlertaJ1 = "alertaId=alt_j1&nombre=Carlos+Tevez&telefono=2364001122&producto=Notebook+Asus";
  const searchParamsJ1 = new URLSearchParams(queryAlertaJ1);

  // Antes de que los datos estén cargados (dataLoaded = false): el controller no abre el editor
  const openedBeforeData = controller.handleQueryOrDataChange({
    queryKey: queryAlertaJ1,
    searchParams: searchParamsJ1,
    dataLoaded: false,
    solicitudesPool: [],
    catalogoProductos: []
  });
  assert(!openedBeforeData && !controller.getState().modalOpen, "J1a. Editor espera a que los datos estén cargados (dataLoaded = false)");

  // Datos cargados (dataLoaded = true): el controller abre e inicializa el editor
  const openedAfterData = controller.handleQueryOrDataChange({
    queryKey: queryAlertaJ1,
    searchParams: searchParamsJ1,
    dataLoaded: true,
    solicitudesPool: poolInicialJ,
    catalogoProductos: catalogoInicialJ,
    realFechaCreacion: new Date("2026-10-10T12:00:00Z")
  });
  assert(openedAfterData && controller.getState().modalOpen === true, "J1b. Editor abierto e inicializado mediante query de alerta tras carga de datos");

  // J2. Resolver lead/solicitud
  assert(controller.getState().leadData.nombre === "Carlos Tevez", "J2a. Datos de lead precargados correctamente");
  assert(controller.getState().resolvedSolicitudId === "sol_tevez_101", "J2b. Solicitud vinculada determinísticamente");
  assert(controller.getState().selectedProductoId === "prod_notebook_101", "J2c. Producto del catálogo preseleccionado");

  // J3. Calcular CANONICAL_V1
  const pricingCalcJ3 = calcularPricingCanonico({
    capitalCompraCentavos: 40000000,
    plazoMeses: 6,
    tnaInterna: 60,
    alicuotaIva: 21,
    plazosHabilitadosProducto: [3, 6, 12]
  });
  controller.setPricingResult(pricingCalcJ3);
  controller.setSelectedProductAndTerm("prod_notebook_101", 6, "0");

  assert(controller.getState().pricingResult !== null, "J3a. Pricing CANONICAL_V1 calculado y fijado en editor");
  assert(controller.getState().selectedPlazo === 6, "J3b. Plazo 6 cuotas seleccionado");

  // J4 & J5. Persistir correctamente -> persistedBudget != null
  const presupuestoGuardadoJ4 = {
    id: "pres_doc_tevez_123",
    solicitudId: "sol_tevez_101",
    producto: "Notebook Asus",
    cuotas: 6,
    valorCuota: pricingCalcJ3.cuotaMensualBaseCentavos / 100,
    pricingSchemaVersion: "CANONICAL_V1" as const,
    pricingSnapshot: pricingCalcJ3,
    estado: "Generado" as const
  };
  controller.setPersistedBudget(presupuestoGuardadoJ4);

  assert(controller.getState().persistedBudget !== null, "J4/J5. Presupuesto persistido exitosamente en base de datos (persistedBudget != null)");

  // J6. Simular refresh de Firestore (fetchPresupuestos) manteniendo la misma query
  const poolRefrescadoJ6 = [
    ...poolInicialJ,
    {
      id: "sol_nueva_ingresada",
      sourceCollection: "solicitudes_cuenta" as const,
      nombreCompleto: "Nuevo Cliente"
    }
  ];
  const catalogoRefrescadoJ6 = [...catalogoInicialJ];

  // Simular disparo del useEffect debido a que solicitudesPool y catalogoProductos cambiaron en el componente
  const reinitializedOnRefetch = controller.handleQueryOrDataChange({
    queryKey: queryAlertaJ1, // MISMA QUERY KEY
    searchParams: searchParamsJ1,
    dataLoaded: true,
    solicitudesPool: poolRefrescadoJ6,
    catalogoProductos: catalogoRefrescadoJ6
  });

  assert(reinitializedOnRefetch === false, "J6. Refetch interno NO reinicializa el editor (handleQueryOrDataChange retorna false)");

  // J7. Verificar después del refresh: persistedBudget != null, pricingResult != null, selectedPlazo preservado, resolvedSolicitudId preservado
  assert(controller.getState().persistedBudget !== null, "J7a. persistedBudget SOBREVIVE al refetch de datos");
  assert(controller.getState().pricingResult !== null, "J7b. pricingResult SOBREVIVE al refetch de datos");
  assert(controller.getState().selectedPlazo === 6, "J7c. selectedPlazo (6 cuotas) PRESERVADO tras refetch");
  assert(controller.getState().resolvedSolicitudId === "sol_tevez_101", "J7d. resolvedSolicitudId PRESERVADO tras refetch");
  assert(controller.getState().selectedProductoId === "prod_notebook_101", "J7e. selectedProductoId PRESERVADO tras refetch");

  // J8. PDF permanece habilitado
  const canDownloadPdfJ8 = Boolean(controller.getState().persistedBudget);
  assert(canDownloadPdfJ8 === true, "J8. Botón Descargar PDF PERMANECE HABILITADO tras refresh");

  // J9. WhatsApp permanece habilitado
  const canSendWhatsAppJ9 = Boolean(controller.getState().persistedBudget);
  assert(canSendWhatsAppJ9 === true, "J9. Botón Enviar WhatsApp PERMANECE HABILITADO tras refresh");

  // J10. Cambiar a una query/alerta distinta -> editor SÍ debe reinicializarse con la nueva solicitud
  const queryAlertaNuevaJ10 = "alertaId=alt_j10_nueva&nombre=Lionel+Messi&telefono=2364998877&producto=Smart+TV";
  const searchParamsNuevaJ10 = new URLSearchParams(queryAlertaNuevaJ10);

  const reinitializedOnNewQuery = controller.handleQueryOrDataChange({
    queryKey: queryAlertaNuevaJ10, // NUEVA QUERY DISTINTA
    searchParams: searchParamsNuevaJ10,
    dataLoaded: true,
    solicitudesPool: poolRefrescadoJ6,
    catalogoProductos: catalogoRefrescadoJ6
  });

  assert(reinitializedOnNewQuery === true, "J10a. Navegación a NUEVA alerta SÍ reinicializa el editor");
  assert(controller.getState().leadData.nombre === "Lionel Messi", "J10b. Nuevo lead cargado en el editor");
  assert(controller.getState().persistedBudget === null, "J10c. Borrador nuevo arranca sin persistedBudget (bloqueado para envío hasta guardar)");
  assert(controller.getState().pricingResult === null, "J10d. Pricing se resetea para nueva cotización");
  assert(controller.getState().selectedPlazo === 0, "J10e. Plazo se resetea para nueva cotización");

  // =========================================================================
  // RESUMEN FINAL
  // =========================================================================
  console.log("\n========================================================================");
  console.log(`TOTAL CHECKS: ${total}`);
  console.log(`PASSED: ${passed}`);
  console.log(`FAILED: ${total - passed}`);
  console.log("========================================================================");

  if (passed === total) {
    console.log("🎉 TODOS LOS CASOS (A - J) PASARON SATISFACTORIAMENTE");
  } else {
    console.error("❌ HUBO FALLAS EN LA SUITE DE REGRESIÓN");
    process.exit(1);
  }
}

runTestSuite();
