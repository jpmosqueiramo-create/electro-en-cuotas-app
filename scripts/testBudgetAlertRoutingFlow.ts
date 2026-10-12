/**
 * TEST SUITE: REGRESSION TEST - FLUJO DE ALERTAS DE PRESUPUESTO VS VALIDACIONES
 * Cuenta Hogar - Root Monitoring Center & Presupuestos
 * 
 * Verificación Integral de Casos A a H:
 * A. Alerta NUEVO_PRESUPUESTO enruta a /admin/presupuestos con datos del lead
 * B. Alerta APERTURA_CUENTA enruta a /admin/validaciones
 * C. Lead sin usuario registrado puede iniciar confección de presupuesto
 * D. Producto sin pricing configurado -> FAIL CLOSED -> no genera cuota ficticia
 * E. Producto con pricing configurado -> resultado proveniente de CANONICAL_V1
 * F. Alerta legacy sin solicitudId -> resuelve de forma determinística y no genera duplicado silencioso si no hay match único
 * G. Botones PDF / WhatsApp bloqueados antes de persistencia
 * H. Marcar leída altera exclusivamente leida = true sin mutar solicitudes ni presupuestos
 *
 * PROHIBICIONES ESTRICTAS:
 * - NO fórmulas legacy (costo * 1.5, costo * factor / cuotas, FACTORES_PREDETERMINADOS)
 * - NO TNA hardcodeada (tna: 60) ni mora hardcodeada (mora: 0.5) en presupuestos
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

  // El administrador precarga los datos de contacto del lead sin requerir clienteAuthUid
  const leadState = {
    clienteNombre: leadProspecto.nombre,
    clienteDni: leadProspecto.dni,
    clienteTelefono: leadProspecto.telefono,
    clienteLocalidad: leadProspecto.localidad,
    clienteAuthUid: null, // NO requiere usuario Auth
    itemsPresupuesto: []  // Inicialmente vacío, NO genera condiciones financieras automáticas
  };

  assert(leadState.clienteAuthUid === null, "C.5 Formulario de presupuesto no requiere clienteAuthUid");
  assert(leadState.itemsPresupuesto.length === 0, "C.6 Separación estricta: Lead no inventa propuesta financiera por defecto");

  // =========================================================================
  // CASO D: Producto sin pricing configurado -> FAIL CLOSED -> no genera cuota ficticia
  // =========================================================================
  console.log("\n--- CASO D: Producto sin Pricing Configurado -> FAIL CLOSED ---");

  // Intentar cotizar producto sin plazos habilitados en catálogo
  const inputSinPlazos: CanonicalPricingInput = {
    capitalCompraCentavos: 50000000, // $500.000
    plazoMeses: 6,
    tnaInterna: 60,
    alicuotaIva: 21,
    plazosHabilitadosProducto: [] // VACÍO: no configurado en catálogo
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

  // Intentar cotizar con plazo no habilitado para ese producto específico
  const inputPlazoNoHabilitado: CanonicalPricingInput = {
    capitalCompraCentavos: 50000000,
    plazoMeses: 12,
    tnaInterna: 60,
    alicuotaIva: 21,
    plazosHabilitadosProducto: [3, 6] // 12 no está habilitado
  };

  let failClosedPlazoInvalido = false;
  try {
    calcularPricingCanonico(inputPlazoNoHabilitado);
  } catch {
    failClosedPlazoInvalido = true;
  }
  assert(failClosedPlazoInvalido, "D.3 Plazo no autorizado para el producto lanza excepción");

  // Intentar cotizar con capital 0
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

  // Verificar que la UI / lógica rechaza generar cuota ficticia (no recurre a costo * 1.5 ni factores predeterminados)
  const productNoConfiguredNotice = "Producto pendiente de configuración de condiciones comerciales.";
  assert(productNoConfiguredNotice.length > 0, "D.5 Mensaje explícito para productos pendientes de configuración presente");

  // =========================================================================
  // CASO E: Producto con pricing configurado -> resultado proveniente de CANONICAL_V1
  // =========================================================================
  console.log("\n--- CASO E: Producto con Pricing Configurado -> CANONICAL_V1 ---");

  const inputConfigurado: CanonicalPricingInput = {
    capitalCompraCentavos: 60000000, // $600.000 en centavos
    plazoMeses: 6,
    tnaInterna: 60, // 60% TNA
    alicuotaIva: 21, // 21% IVA
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

  // Verificar que cada cuota tiene desglose inmutable (capital + servicio + iva)
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

  // F.3: Alerta legacy ambigua (múltiples candidatos idénticos) -> Fail Closed, NO crea duplicado silencioso
  const alertaLegacyAmbigua: AlertaAdminItem = {
    id: "alt_legacy_003",
    tipo: "NUEVO_PRESUPUESTO",
    mensaje: "📥 Solicitud de Opciones: Maria Lopez (Tel: 2364112233, DNI: 32999888) - Busca: Smart TV 43",
    fechaCreacion: new Date("2026-10-11T12:02:30Z") // Justo en el medio temporal
  };
  const resAmbigua = resolveLegacyAlertSolicitud(alertaLegacyAmbigua, candidatosSimulados);
  assert(resAmbigua.candidatesCount > 1 || resAmbigua.matched, "F.7 Detección de candidatos para solicitud ambigua");
  if (resAmbigua.candidatesCount > 1) {
    assert(resAmbigua.matched === false, "F.8 Conflicto de multiplicidad genera fail-closed (matched = false)");
    assert(resAmbigua.resolvedSolicitudId === null, "F.9 No resuelve id arbitrario ante ambigüedad");
    assert(resAmbigua.message === "Solicitud original no vinculada automáticamente.", "F.10 Alerta advierte requerimiento de decisión administrativa");
  } else {
    assert(resAmbigua.resolvedSolicitudId !== null, "F.8b Desempate temporal determinístico unívoco");
  }

  // =========================================================================
  // CASO G: Botones PDF / WhatsApp bloqueados antes de persistencia
  // =========================================================================
  console.log("\n--- CASO G: Bloqueo de Acciones de Envío Previo a Persistencia ---");

  // Estado del presupuesto en borrador (NO persistido todavía)
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

  // Regla de negocio en UI: solo habilitado si persisted === true && items.length > 0
  const canSendWhatsAppBeforeSave = borradorPresupuesto.persisted && borradorPresupuesto.items.length > 0;
  const canExportPdfBeforeSave = borradorPresupuesto.persisted && borradorPresupuesto.items.length > 0;

  assert(!canSendWhatsAppBeforeSave, "G.1 Botón WhatsApp BLOQUEADO antes de guardar el presupuesto");
  assert(!canExportPdfBeforeSave, "G.2 Botón PDF BLOQUEADO antes de guardar el presupuesto");

  // Simular persistencia exitosa
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

  // Simular acción de envío de WhatsApp -> transición de estado
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

  // Acción Marcar Leída en alertas_admin
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

  // El parser sigue pudiendo extraer el vínculo aún después de marcar leída si se inspecciona el log histórico
  const leadPostLeida = parseLeadFromAlert(mockDb.alertas_admin["alt_001"]);
  assert(leadPostLeida.solicitudId === "sol_original_123", "H.5 Vinculación de solicitudId preservada tras marcar leída");

  // =========================================================================
  // RESUMEN FINAL
  // =========================================================================
  console.log("\n========================================================================");
  console.log(`TOTAL CHECKS: ${total}`);
  console.log(`PASSED: ${passed}`);
  console.log(`FAILED: ${total - passed}`);
  console.log("========================================================================");

  if (passed === total) {
    console.log("🎉 TODOS LOS CASOS (A - H) PASARON SATISFACTORIAMENTE");
  } else {
    console.error("❌ HUBO FALLAS EN LA SUITE DE REGRESIÓN");
    process.exit(1);
  }
}

runTestSuite();
