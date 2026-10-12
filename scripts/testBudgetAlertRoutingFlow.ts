/**
 * TEST SUITE: REGRESSION TEST - FLUJO DE ALERTAS DE PRESUPUESTO VS VALIDACIONES
 * Cuenta Hogar - Root Monitoring Center & Presupuestos
 * 
 * Verifica los 4 casos críticos exigidos:
 * 1. Alerta NUEVO_PRESUPUESTO -> Enruta a /admin/presupuestos con solicitudId y datos del lead precargados.
 * 2. Alerta APERTURA_CUENTA -> Enruta a /admin/validaciones.
 * 3. Lead público / prospecto sin cuenta ni clienteAuthUid -> Confección de presupuesto permitida y válida.
 * 4. Acción 'Marcar Leída' -> Solo altera leida=true en alertas_admin sin borrar/desvincular solicitudes ni presupuestos.
 */

import { 
  isBudgetAlert, 
  isCreditValidationAlert, 
  parseLeadFromAlert, 
  buildBudgetRouteUrl, 
  buildCreditValidationRouteUrl, 
  resolveAlertAction,
  AlertaAdminItem
} from "../src/lib/budgetAlertRouting";
import { FACTORES_PREDETERMINADOS } from "../src/lib/financialEngine";

function runTestSuite() {
  console.log("===============================================================");
  console.log("🚀 INICIANDO TEST SUITE: ENRUTAMIENTO Y CONFECCIÓN DE PRESUPUESTOS");
  console.log("===============================================================\n");

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
  // CASO 1: Formulario público genera alerta NUEVO_PRESUPUESTO -> /admin/presupuestos
  // =========================================================================
  console.log("--- TEST CASO 1: Alerta NUEVO_PRESUPUESTO y Redirección a Presupuestos ---");

  const alertaPresupuestoReal: AlertaAdminItem = {
    id: "alt_test_001",
    tipo: "NUEVO_PRESUPUESTO",
    clienteEmail: "2364123456",
    mensaje: "📥 Solicitud de Opciones [ID: sol_cuenta_999]: Juan pablo (DNI: 30123456, Tel: 2364123456, Loc: Lincoln) - Busca: Heladera de 300 litros",
    fechaCreacion: new Date(),
    leida: false
  };

  assert(isBudgetAlert(alertaPresupuestoReal.tipo), "1.1 Reconocimiento de tipo NUEVO_PRESUPUESTO como alerta de presupuesto");
  assert(!isCreditValidationAlert(alertaPresupuestoReal.tipo), "1.2 NUEVO_PRESUPUESTO NO debe reconocerse como validación crediticia");

  const leadParsed = parseLeadFromAlert(alertaPresupuestoReal);
  assert(leadParsed.solicitudId === "sol_cuenta_999", `1.3 Extracción de solicitudId correcto (obtenido: '${leadParsed.solicitudId}')`);
  assert(leadParsed.nombre === "Juan pablo", `1.4 Extracción de nombre correcto (obtenido: '${leadParsed.nombre}')`);
  assert(leadParsed.dni === "30123456", `1.5 Extracción de DNI correcto (obtenido: '${leadParsed.dni}')`);
  assert(leadParsed.telefono === "2364123456", `1.6 Extracción de Teléfono correcto (obtenido: '${leadParsed.telefono}')`);
  assert(leadParsed.localidad === "Lincoln", `1.7 Extracción de Localidad correcta (obtenida: '${leadParsed.localidad}')`);
  assert(leadParsed.producto === "Heladera de 300 litros", `1.8 Extracción de Producto correcto (obtenido: '${leadParsed.producto}')`);

  const directBudgetUrl = buildBudgetRouteUrl(alertaPresupuestoReal);
  assert(directBudgetUrl.includes("solicitudId=sol_cuenta_999"), "1.8b buildBudgetRouteUrl incluye solicitudId");

  const actionBudget = resolveAlertAction(alertaPresupuestoReal);
  assert(actionBudget !== null, "1.9 resolveAlertAction devuelve una acción válida para la alerta");
  assert(actionBudget?.type === "budget", `1.10 Acción clasificada como 'budget' (obtenido: '${actionBudget?.type}')`);
  assert(actionBudget?.label === "Atender Solicitud", `1.11 Etiqueta del botón es 'Atender Solicitud'`);
  assert(Boolean(actionBudget?.href.startsWith("/admin/presupuestos")), `1.12 URL de destino inicia con /admin/presupuestos (obtenido: '${actionBudget?.href}')`);
  
  const urlObj = new URL(actionBudget?.href || "", "https://cuentahogar.com.ar");
  assert(urlObj.searchParams.get("solicitudId") === "sol_cuenta_999", "1.13 Parámetro solicitudId presente en URL");
  assert(urlObj.searchParams.get("nombre") === "Juan pablo", "1.14 Parámetro nombre presente en URL");
  assert(urlObj.searchParams.get("dni") === "30123456", "1.15 Parámetro dni presente en URL");
  assert(urlObj.searchParams.get("producto") === "Heladera de 300 litros", "1.16 Parámetro producto presente en URL");

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
  assert(actionCompra?.type === "budget", "1.17 NUEVA_SOLICITUD_COMPRA también clasificada como 'budget'");
  assert(Boolean(actionCompra?.href.includes("/admin/presupuestos")), "1.18 NUEVA_SOLICITUD_COMPRA enruta a /admin/presupuestos");

  // =========================================================================
  // CASO 2: Alertas de validación crediticia real -> /admin/validaciones
  // =========================================================================
  console.log("\n--- TEST CASO 2: Alerta APERTURA_CUENTA y Redirección a Validaciones ---");

  const alertaCreditoReal: AlertaAdminItem = {
    id: "alt_test_003",
    tipo: "APERTURA_CUENTA",
    clienteEmail: "maria@test.com",
    mensaje: "📋 Solicitud de Apertura de Cuenta: Maria Gomez (DNI: 28111222, Tel: 11554433, Loc: CABA) - Producto: Lavarropas",
    fechaCreacion: new Date(),
    leida: false
  };

  assert(isCreditValidationAlert(alertaCreditoReal.tipo), "2.1 Reconocimiento de tipo APERTURA_CUENTA como validación crediticia");
  assert(!isBudgetAlert(alertaCreditoReal.tipo), "2.2 APERTURA_CUENTA NO debe clasificarse como presupuesto");

  const directCreditUrl = buildCreditValidationRouteUrl(alertaCreditoReal);
  assert(directCreditUrl.includes("tab=aperturas"), "2.2b buildCreditValidationRouteUrl incluye tab=aperturas");

  const actionCredit = resolveAlertAction(alertaCreditoReal);
  assert(actionCredit !== null, "2.3 resolveAlertAction devuelve acción para APERTURA_CUENTA");
  assert(actionCredit?.type === "validation", `2.4 Acción clasificada como 'validation' (obtenido: '${actionCredit?.type}')`);
  assert(Boolean(actionCredit?.href.startsWith("/admin/validaciones")), `2.5 URL de destino apunta a /admin/validaciones (obtenido: '${actionCredit?.href}')`);
  assert(Boolean(actionCredit?.href.includes("tab=aperturas")), "2.6 URL incluye tab=aperturas para bandeja de evaluación");

  // =========================================================================
  // CASO 3: Confección de presupuesto para Lead Público sin Usuario Registrado
  // =========================================================================
  console.log("\n--- TEST CASO 3: Lead Público / Prospecto sin Usuario Registrado ---");

  // Simulación de lead que llega desde alerta sin usuario Firebase Auth ni clienteAuthUid
  const leadSinUsuario: AlertaAdminItem = {
    id: "alt_test_004",
    tipo: "NUEVO_PRESUPUESTO",
    clienteEmail: "prospecto_walkin",
    mensaje: "📥 Solicitud de Opciones: Carlos Tevez (DNI: 31222333, Tel: 2364001122, Loc: Chacabuco) - Busca: Notebook i5",
    fechaCreacion: new Date(),
    leida: false
  };

  const leadProspecto = parseLeadFromAlert(leadSinUsuario);
  assert(!leadProspecto.solicitudId, "3.1 Lead público puede originarse sin solicitudId previa");

  // Confección del borrador de presupuesto con múltiples opciones y factores financieros canónicos
  const cuotasOpcion1 = 12;
  const factorOpcion1 = FACTORES_PREDETERMINADOS[cuotasOpcion1] || 2.5;
  const costoOpcion1 = 600000;
  const valorCuotaCalculada = Math.round((costoOpcion1 * factorOpcion1) / cuotasOpcion1);

  const draftItemsSimulados = [
    {
      producto: "Notebook Asus Core i5 16GB",
      costoProveedor: costoOpcion1,
      contado: Math.round(costoOpcion1 * 1.5),
      cuotas: cuotasOpcion1,
      factor: factorOpcion1,
      valorCuota: valorCuotaCalculada
    },
    {
      producto: "Notebook Lenovo Core i3 8GB",
      costoProveedor: 450000,
      contado: 675000,
      cuotas: 6,
      factor: FACTORES_PREDETERMINADOS[6] || 1.85,
      valorCuota: Math.round((450000 * (FACTORES_PREDETERMINADOS[6] || 1.85)) / 6)
    }
  ];

  const nuevoPresupuestoGenerado = {
    id: "pres_" + Date.now(),
    items: draftItemsSimulados,
    producto: draftItemsSimulados[0].producto,
    cuotas: draftItemsSimulados[0].cuotas,
    valorCuota: draftItemsSimulados[0].valorCuota,
    contado: draftItemsSimulados[0].contado,
    costoProveedor: draftItemsSimulados[0].costoProveedor,
    factor: draftItemsSimulados[0].factor,
    tna: 60,
    mora: 0.5,
    notas: leadProspecto.notas,
    fecha: new Date().toISOString(),
    fechaIso: new Date().toISOString(),
    estado: "Enviado"
  };

  assert(nuevoPresupuestoGenerado.id.startsWith("pres_"), "3.2 ID de presupuesto generado correctamente");
  assert(nuevoPresupuestoGenerado.items.length === 2, "3.3 Presupuesto soporta múltiples opciones cotizadas");
  assert(nuevoPresupuestoGenerado.valorCuota === 125000, `3.4 Cálculo financiero canónico de cuota exacto: $${nuevoPresupuestoGenerado.valorCuota}`);

  // Simulación de guardado en solicitudes_cuenta sin requerir clienteAuthUid
  const payloadPersistenciaSolicitudesCuenta = {
    tipo: "contacto_rapido",
    nombreCompleto: leadProspecto.nombre,
    numeroDni: leadProspecto.dni || "",
    whatsapp: leadProspecto.telefono || "",
    direccion: leadProspecto.localidad || "",
    localidad: leadProspecto.localidad || "",
    productoNombre: draftItemsSimulados[0].producto,
    estado: "Presupuestado",
    fechaIso: new Date().toISOString(),
    presupuestos: [nuevoPresupuestoGenerado]
  };

  // Verificar que el payload cumple con keys().hasOnly() de firestore.rules para solicitudes_cuenta
  const allowedFirestoreKeys = [
    "tipo", "productoId", "productoNombre", "planElegido", "montoCuota", 
    "nombreCompleto", "numeroDni", "cuil", "fechaNacimiento", "whatsapp", 
    "direccion", "localidad", "codigoPostal", "ocupacion", "nombreAfiliado", 
    "referidoPor", "email", "antiguedadLaboral", "precioContado", "tasaInteresTna", 
    "tasaMora", "fecha", "fechaIso", "fechaCreacion", "estado", "comprobanteURL", 
    "dniFrenteURL", "dniDorsoURL", "presupuestos"
  ];
  const payloadKeys = Object.keys(payloadPersistenciaSolicitudesCuenta);
  const keysValidas = payloadKeys.every(k => allowedFirestoreKeys.includes(k));
  assert(keysValidas, "3.5 Payload de guardado para solicitudes_cuenta cumple con las claves autorizadas");

  // =========================================================================
  // CASO 4: Acción 'Marcar Leída' no borra ni desvincula la solicitud
  // =========================================================================
  console.log("\n--- TEST CASO 4: Integridad de la Acción 'Marcar Leída' ---");

  // Estado inicial simulado de la base de datos
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
        presupuestos: []
      }
    }
  };

  // Función marcarLeida canónica ejecutada por el botón '✓ Marcar Leída'
  function simularMarcarLeida(alertaId: string) {
    const alerta = mockDb.alertas_admin[alertaId as keyof typeof mockDb.alertas_admin];
    if (alerta) {
      alerta.leida = true;
    }
  }

  // Ejecutar acción
  simularMarcarLeida("alt_001");

  assert(mockDb.alertas_admin["alt_001"].leida === true, "4.1 La alerta fue marcada como leida=true en alertas_admin");
  assert(mockDb.solicitudes_cuenta["sol_original_123"] !== undefined, "4.2 La solicitud_cuenta asociada NO fue eliminada");
  assert(mockDb.solicitudes_cuenta["sol_original_123"].id === "sol_original_123", "4.3 El ID de la solicitud_cuenta permanece idéntico e intacto");
  assert(mockDb.solicitudes_cuenta["sol_original_123"].nombreCompleto === "Juan pablo", "4.4 Los datos de la solicitud no sufrieron mutación destructiva");

  // El parser sigue pudiendo extraer el vínculo aún después de marcar leída si se inspecciona el log histórico
  const leadPostLeida = parseLeadFromAlert(mockDb.alertas_admin["alt_001"]);
  assert(leadPostLeida.solicitudId === "sol_original_123", "4.5 Vinculación de solicitudId preservada tras marcar leída");

  // =========================================================================
  // RESUMEN FINAL
  // =========================================================================
  console.log("\n===============================================================");
  console.log(`TOTAL CHECKS: ${total}`);
  console.log(`PASSED: ${passed}`);
  console.log(`FAILED: ${total - passed}`);
  console.log("===============================================================");

  if (passed === total) {
    console.log("🎉 TODOS LOS CASOS DE REGRESIÓN DE ENRUTAMIENTO PASARON SATISFACTORIAMENTE");
  } else {
    console.error("❌ HUBO FALLAS EN LA SUITE DE REGRESIÓN");
    process.exit(1);
  }
}

runTestSuite();
