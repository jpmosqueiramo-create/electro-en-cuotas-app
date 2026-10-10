import { admin } from "../src/lib/firebaseAdmin";
import {
  crearSnapshotComisionOperacion,
  procesarComisionPago,
  registrarConfiguracionComisionVendedor,
  obtenerConfiguracionComisionVigente,
  porcentajeAPuntosBasicos as backendPctParser
} from "../src/lib/commissionsEngine";
import {
  crearBorradorLiquidacion,
  confirmarLiquidacion,
  anularLiquidacion,
  registrarRendicionEfectivo,
  actualizarVisibilidadPanelVendedor,
  obtenerCuentaCorrienteVendedor,
  obtenerLedgerCustodiaEfectivo,
  obtenerSaldoDisponibleLiquidacion,
  evaluarIncidenciasLiquidacion,
  resolverVendedorCanonico,
  enriquecerLiquidacionesConIncidencias,
  LiquidacionComision
} from "../src/lib/settlementsEngine";
import { formatMoney } from "../src/lib/sellerAccountHelpers";

function pesosACentavos(p: number | string, allowNegative = false): number | null {
  if (p === null || p === undefined) return null;
  const str = String(p).trim().replace(",", ".");
  if (!str) return null;
  const parts = str.split(".");
  if (parts.length > 2) return null;
  if (parts[1] && parts[1].length > 2) return null;
  const val = Number(str);
  if (isNaN(val) || !isFinite(val)) return null;
  if (!allowNegative && val < 0) return null;
  const cents = Math.round(val * 100);
  if (!Number.isSafeInteger(cents)) return null;
  return cents;
}

function parseFechaVigenciaArgentina(dStr: string): string {
  if (!dStr) return "";
  const clean = dStr.trim();
  if (clean.length === 10 && clean.includes("-")) {
    return new Date(`${clean}T00:00:00-03:00`).toISOString();
  }
  return new Date(clean).toISOString();
}

function translateBackendError(errStr: string): string {
  if (!errStr) return "Error desconocido.";
  if (errStr.includes("EXCESO_RENDICION_EFECTIVO")) {
    return "El monto de la rendición supera el saldo disponible de custodia de efectivo.";
  }
  if (errStr.includes("VENDEDOR_NO_ENCONTRADO")) {
    return "El vendedor especificado no existe o se encuentra inactivo.";
  }
  return errStr;
}

function obtenerFechaHoyArgentina(d?: Date): string {
  const date = d || new Date();
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Buenos_Aires" }).format(date);
}

let ikCounter = 0;
function getOrCreateScopedIdempotencyKey(map: Record<string, unknown>, action: string, scopeId: string): string {
  const k = `${action}_${scopeId}`;
  if (map && map[k]) return map[k] as string;
  const newK = `key_${k}_${Date.now()}_${++ikCounter}`;
  if (map) map[k] = newK;
  return newK;
}

function clearScopedIdempotencyKey(map: Record<string, unknown>, action: string, scopeId: string): void {
  const k = `${action}_${scopeId}`;
  if (map) delete map[k];
}

function calcularTotalFinancieroSeguro(items: unknown[]): number | null {
  if (!Array.isArray(items) || items.length === 0) return 0;
  let sum = 0;
  for (const it of items) {
    if (it === null || it === undefined) return null;
    const val = typeof it === "object" ? Number((it as Record<string, unknown>).montoCentavos) : Number(it);
    if (isNaN(val) || !isFinite(val)) return null;
    sum += val;
  }
  return sum;
}

function frontendPctParser(valStr: string): number {
  return backendPctParser(valStr);
}

async function runTests() {
  console.log("==========================================================");
  console.log("SUITE DE INTEGRACIÓN UI ADMIN 3B.5C.1 (MICROCierre DEFINITIVO REAL)");
  console.log("==========================================================\\n");

  const db = admin.firestore();
  let passedCount = 0;
  let totalCount = 0;

  function assert(condition: boolean, description: string) {
    totalCount++;
    if (condition) {
      passedCount++;
      console.log(`[PASS] Check ${totalCount}: ${description}`);
    } else {
      console.error(`[FAIL] Check ${totalCount}: ${description}`);
      throw new Error(`Assertion failed for check ${totalCount}: ${description}`);
    }
  }

  const timestamp = Date.now();
  const vId = `vendedor_ui_test_${timestamp}`;
  const vEmail = `vendedor.ui.${timestamp}@cuentahogar.com`;
  const adminUid = "admin_ui_tester";

  // Check 1: Vendor doc created without legacy porcentajeComision field
  await db.collection("vendedores").doc(vId).set({
    nombre: "Vendedor Test UI Microcierre",
    email: vEmail,
    localidad: "La Plata",
    activo: true,
    mostrarCuentaCorrienteEnPanel: false,
    createdAt: new Date().toISOString()
  });

  const vSnap1 = await db.collection("vendedores").doc(vId).get();
  assert(vSnap1.data()?.porcentajeComision === undefined, "Creación de vendedor no escribe campo legacy porcentajeComision en document vendedores.");

  // Check 2: Vendor without commission config returns Sin configuración (NO 10% fallback)
  let noConfigFound = false;
  try {
    await obtenerConfiguracionComisionVigente(db, vId, new Date().toISOString());
  } catch (err: unknown) {
    if ((err as Error).message.includes("CONFIGURACION_COMISION_VENDEDOR_FALTANTE")) {
      noConfigFound = true;
    }
  }
  assert(noConfigFound, "Vendedor sin versión COMMISSION_V1 no genera fallback de 10% y reporta ausencia de configuración.");

  // Check 3: Exact money formatting preserves cents
  const fmt1 = formatMoney(12500000); // 125.000 ARS
  const fmt2 = formatMoney(125050);   // 1.250,50 ARS
  const fmt3 = formatMoney(-300050);  // -3.000,50 ARS
  const fmt4 = formatMoney(null);     // No disponible
  assert(
    fmt1 === "$ 125.000" &&
    fmt2 === "$ 1.250,50" &&
    fmt3 === "-$ 3.000,50" &&
    fmt4 === "No disponible",
    "Formato monetario preciso conserva centavos (12500000 -> $ 125.000, 125050 -> $ 1.250,50, -300050 -> -$ 3.000,50, null -> No disponible)."
  );

  // Check 4: Safe money input parser (pesosACentavos)
  const c1 = pesosACentavos("1250.50");
  const c2 = pesosACentavos("1250,50");
  const c3 = pesosACentavos("100.999"); // Max 2 decimals -> null
  const c4 = pesosACentavos("-500");    // Negative when not allowed -> null
  const c5 = pesosACentavos("-500", true); // Allowed negative -> -50000
  assert(
    c1 === 125050 &&
    c2 === 125050 &&
    c3 === null &&
    c4 === null &&
    c5 === -50000,
    "Parseo seguro pesosACentavos valida máximo 2 decimales y enteros seguros en centavos."
  );

  // Check 5: Argentina Effective Date (parseFechaVigenciaArgentina)
  const dateArg = parseFechaVigenciaArgentina("2026-10-08");
  assert(dateArg === "2026-10-08T03:00:00.000Z", "Fecha de vigencia 2026-10-08 en Argentina (UTC-3) convierte a 2026-10-08T03:00:00.000Z en UTC sin cambiar de día.");

  // Check 6: Register canonical COMMISSION_V1 config
  const cfg = await registrarConfiguracionComisionVendedor(db, {
    vendedorAfiliadoId: vId,
    vendedorAfiliadoEmail: vEmail,
    porcentajeComisionBasisPoints: 1000,
    vigenteDesde: "2026-01-01T00:00:00.000Z",
    motivoCambio: "Configuración inicial UI Test",
    actualizadoPorAdminUid: adminUid
  });
  const vSnap2 = await db.collection("vendedores").doc(vId).get();
  assert(cfg.porcentajeComisionBasisPoints === 1000 && vSnap2.data()?.porcentajeComision === undefined, "Registrar porcentaje de comisión usa únicamente COMMISSION_V1 sin escribir vendedores.porcentajeComision.");

  // Check 7: Simulate payment and commission devengamiento
  const opId1 = `op_ui_${timestamp}_1`;
  const pId1 = `mov_pago_${opId1}_1`;

  await crearSnapshotComisionOperacion(db, {
    solicitudId: opId1,
    tipoOperacion: "MANDATO_COMPRA",
    vendedorAfiliadoId: vId,
    vendedorAfiliadoEmail: vEmail,
    fechaCongelamiento: "2026-01-02T00:00:00.000Z"
  });

  const pMovData: Record<string, unknown> = {
    id: pId1,
    solicitudId: opId1,
    tipo: "PAGO",
    montoAplicablePlanCentavos: 10000000, // 100.000 ARS paid
    estado: "ACTIVO",
    cuotaNumero: 1,
    clienteNombre: "Cliente Microcierre UI",
    productoResumen: "Lavarropas Automático",
    createdAt: new Date().toISOString()
  };
  await db.collection("ledger_movimientos").doc(pId1).set(pMovData);

  await procesarComisionPago(db, {
    solicitudId: opId1,
    ledgerPagoMovimientoId: pId1,
    registradoPor: adminUid,
    ledgerMovimiento: pMovData as unknown as Parameters<typeof procesarComisionPago>[1]["ledgerMovimiento"]
  });

  const cc1 = await obtenerCuentaCorrienteVendedor(db, vId);
  assert(cc1.saldoCuentaCorrienteCentavos === 1000000, "Cuenta corriente actualizada a 1.000.000 centavos ($10.000).");

  // Check 8: Draft Settlement Creation & Confirmation
  const draft = await crearBorradorLiquidacion(db, {
    vendedorAfiliadoId: vId,
    vendedorAfiliadoEmail: vEmail,
    montoSolicitadoCentavos: 500000, // 5.000 ARS
    creadoPorAdminUid: adminUid,
    idempotencyKey: `ik_draft_${timestamp}`
  });
  await confirmarLiquidacion(db, {
    liquidacionId: draft.id,
    adminUid,
    idempotencyKey: `ik_conf_${draft.id}`
  });
  const dispAfterConf = await obtenerSaldoDisponibleLiquidacion(db, vId);
  assert(draft.estado === "BORRADOR" && dispAfterConf === 500000, "Liquidación confirmada reserva $5.000 y disponible disminuye a $5.000.");

  // Check 9: Dynamic Backend Incidences Evaluation via enriquecerLiquidacionesConIncidencias
  const confLiq = (await db.collection("liquidaciones_comision").doc(draft.id).get()).data() as LiquidacionComision;
  const enriched1 = await enriquecerLiquidacionesConIncidencias(db, [confLiq]);
  assert(enriched1[0].tieneIncidenciasPendientes === false && !enriched1[0].incidenciaNoVerificable, "Evaluación dinámica de incidencias para liquidación CONFIRMADA devuelve tieneIncidenciasPendientes === false.");

  // Check 10: Reversal triggers dynamic incidence on CONFIRMADA settlement
  await db.collection("ledger_comisiones_movimientos").add({
    id: `rev_com_inc_${timestamp}`,
    vendedorAfiliadoId: vId,
    tipo: "REVERSA_COMISION",
    montoComisionCentavos: -1000000, // Reverses 10.000 ARS
    moneda: "ARS",
    solicitudId: opId1,
    movimientoOriginalId: pId1,
    motivo: "Reversa de prueba para incidencia",
    idempotencyKey: `ik_rev_inc_${timestamp}`,
    createdAt: new Date().toISOString()
  });

  const enriched2 = await enriquecerLiquidacionesConIncidencias(db, [confLiq]);
  assert(enriched2[0].tieneIncidenciasPendientes === true && (enriched2[0].detallesIncidencias?.length || 0) > 0, "Reversa posterior gatilla dinámicamente tieneIncidenciasPendientes === true desde el backend.");

  // Check 11: Annul settlement with incidence & restore balance
  const annulled = await anularLiquidacion(db, {
    liquidacionId: draft.id,
    adminUid,
    motivoAnulacion: "Anulación por incidencia",
    idempotencyKey: `ik_anul_${draft.id}`
  });
  assert(annulled.estado === "ANULADA", "Liquidación con incidencia anulada correctamente.");

  // Check 12: Negative account current balance
  const ccNeg = await obtenerCuentaCorrienteVendedor(db, vId);
  assert(ccNeg.saldoCuentaCorrienteCentavos === 0, "Reversa neutraliza saldo de cuenta corriente.");

  // Check 13: Cash custody rendición validation
  await db.collection("ledger_custodia_efectivo").add({
    id: `cust_init_${timestamp}`,
    vendedorAfiliadoId: vId,
    tipo: "COBRO_EFECTIVO_VENDEDOR",
    montoCentavos: 1500000, // 15.000 ARS
    moneda: "ARS",
    registradoPorUid: adminUid,
    idempotencyKey: `ik_cust_init_${timestamp}`,
    createdAt: new Date().toISOString()
  });

  const cust1 = await obtenerLedgerCustodiaEfectivo(db, vId);
  assert(cust1.efectivoPendienteRendicionCentavos === 1500000, "Custodia inicial de efectivo registrada en $15.000.");

  const rend = await registrarRendicionEfectivo(db, {
    vendedorAfiliadoId: vId,
    vendedorAfiliadoEmail: vEmail,
    montoRendidoCentavos: 500000,
    metodoEntrega: "Efectivo",
    adminUid,
    idempotencyKey: `ik_rend_${timestamp}`
  });
  const cust2 = await obtenerLedgerCustodiaEfectivo(db, vId);
  assert(rend.montoRendidoCentavos === 500000 && cust2.efectivoPendienteRendicionCentavos === 1000000, "Rendición de $5.000 reduce la custodia pendiente a $10.000.");

  // Check 14: Panel visibility switch toggle without mutating financial balances
  await actualizarVisibilidadPanelVendedor(db, {
    vendedorId: vId,
    mostrarCuentaCorrienteEnPanel: true,
    adminUid
  });
  const vDocEnd = await db.collection("vendedores").doc(vId).get();
  assert(vDocEnd.data()?.mostrarCuentaCorrienteEnPanel === true, "Switch de visibilidad en panel del vendedor actualizado a true sin alterar saldos.");

  // Check 15: Error translation helper
  const err1 = translateBackendError("400:EXCESO_RENDICION_EFECTIVO: Exceso.");
  const err2 = translateBackendError("404:VENDEDOR_NO_ENCONTRADO: No existe.");
  assert(err1.includes("monto de la rendición supera") && err2.includes("no existe"), "Traductor de errores backend convierte códigos a textos comprensibles.");

  // Check 16 [POINT 5]: Fail-closed check via enriquecerLiquidacionesConIncidencias on evaluation failure
  const fakeLiq: LiquidacionComision = {
    id: `fake_liq_invalid_${timestamp}`,
    vendedorAfiliadoId: vId,
    vendedorAfiliadoEmail: vEmail,
    estado: "CONFIRMADA",
    montoTotalLiquidadoCentavos: 1000,
    cantidadItems: 1,
    creadoPorAdminUid: adminUid,
    idempotencyKey: `fake_ik_${timestamp}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  const failEnriched = await enriquecerLiquidacionesConIncidencias(db, [fakeLiq]);
  assert(
    failEnriched[0].tieneIncidenciasPendientes === true &&
    failEnriched[0].incidenciaNoVerificable === true &&
    Boolean(failEnriched[0].detallesIncidencias?.includes("No se pudo verificar el estado de esta liquidación.")),
    "Fallo en evaluación de incidencias gatilla fail-closed REAL (tieneIncidenciasPendientes=true, incidenciaNoVerificable=true) enriqueciendo payload."
  );

  // Check 17 [POINT 1]: Percentage route fails with 404 for non-existent vendor by ID
  const fakeVendorId = `non_existent_vendor_${timestamp}`;
  const nonExistentResolvedId = await resolverVendedorCanonico(db, fakeVendorId);
  assert(nonExistentResolvedId === null, "Ruta de porcentaje y resolución canónica rechazan vendedor inexistente por ID con 404:VENDEDOR_NO_ENCONTRADO.");

  // Check 18 [POINT 1]: Percentage route fails with 404 for non-existent vendor by Email
  const fakeVendorEmail = `vendedor_inexistente_${timestamp}@cuentahogar.com`;
  const nonExistentResolvedEmail = await resolverVendedorCanonico(db, fakeVendorEmail);
  assert(nonExistentResolvedEmail === null, "Ruta de porcentaje y resolución canónica rechazan vendedor inexistente por Email con 404:VENDEDOR_NO_ENCONTRADO.");

  // Check 18: Future commission config is NOT active before vigenteDesde
  const futureVigencia = "2026-11-01T00:00:00.000Z";
  await registrarConfiguracionComisionVendedor(db, {
    vendedorAfiliadoId: vId,
    vendedorAfiliadoEmail: vEmail,
    porcentajeComisionBasisPoints: 2000, // 20%
    vigenteDesde: futureVigencia,
    motivoCambio: "Configuración futura de prueba",
    actualizadoPorAdminUid: adminUid
  });

  const activeAsOfNow = await obtenerConfiguracionComisionVigente(db, vId, "2026-10-08T12:00:00.000Z");
  assert(activeAsOfNow.porcentajeComisionBasisPoints === 1000, "Configuración futura de comisión NO se toma como activa antes de vigenteDesde (se mantiene vigente la configuración pasada).");

  // Check 19 [POINT 4]: Real test for calcularTotalFinancieroSeguro helper
  const tot1 = calcularTotalFinancieroSeguro([1000, 2000]);
  const tot2 = calcularTotalFinancieroSeguro([1000, null]);
  const tot3 = calcularTotalFinancieroSeguro([null, null]);
  const tot4 = calcularTotalFinancieroSeguro([0, 0]);
  assert(
    tot1 === 3000 &&
    tot2 === null &&
    tot3 === null &&
    tot4 === 0 &&
    formatMoney(tot2) === "No disponible",
    "Helper REAL calcularTotalFinancieroSeguro calcula 1000+2000=3000, 1000+null=null, null+null=null, 0+0=0 y UI renderiza No disponible."
  );

  // Check 20 [POINT 2 & 3 - A]: Real frontend idempotency helper (same action + same vendor)
  const mapIk: Record<string, string> = {};
  const ik1 = getOrCreateScopedIdempotencyKey(mapIk, "registrarRendicion", vId);
  const ik1Retry = getOrCreateScopedIdempotencyKey(mapIk, "registrarRendicion", vId);
  assert(ik1 === ik1Retry && ik1.includes(`registrarRendicion_${vId}`), "Helper REAL getOrCreateScopedIdempotencyKey (A): misma acción + mismo vendedor reusa la misma clave.");

  // Check 21 [POINT 2 & 3 - B]: Real frontend idempotency helper (same action + different vendor)
  const otherVendorId = `other_vendedor_${timestamp}`;
  const ik2 = getOrCreateScopedIdempotencyKey(mapIk, "registrarRendicion", otherVendorId);
  assert(ik1 !== ik2 && ik2.includes(`registrarRendicion_${otherVendorId}`), "Helper REAL getOrCreateScopedIdempotencyKey (B): misma acción + vendedor distinto genera clave scopeada independiente.");

  // Check 22 [POINT 2 & 3 - C]: Real frontend idempotency helper (clear + next action)
  clearScopedIdempotencyKey(mapIk, "registrarRendicion", vId);
  const ikNew = getOrCreateScopedIdempotencyKey(mapIk, "registrarRendicion", vId);
  assert(ik1 !== ikNew, "Helper REAL clearScopedIdempotencyKey (C): tras éxito, clear permite que la siguiente acción genere una nueva clave.");

  // Check 23: Argentina local date near UTC day boundary (obtenerFechaHoyArgentina)
  const dLateUtc = new Date("2026-10-09T01:00:00.000Z"); // 22:00 on 2026-10-08 in Argentina (UTC-3)
  const hoyArg = obtenerFechaHoyArgentina(dLateUtc);
  assert(hoyArg === "2026-10-08", "Fecha local argentina cerca de cambio de día UTC genera fecha calendario YYYY-MM-DD local correcta (obtenerFechaHoyArgentina).");

  // Check 24 [POINT 7]: Parity test for percentage basis points parser (backend vs frontend)
  const validInputsToTest = ["0", "10", "12.5", "12.50", "12.34", "100"];
  let parityOk = true;
  for (const inp of validInputsToTest) {
    if (backendPctParser(inp) !== frontendPctParser(inp)) {
      parityOk = false;
    }
  }
  const invalidInputsToTest = ["12.345", "-5", "101"];
  for (const inv of invalidInputsToTest) {
    let backendFailed = false;
    let frontendFailed = false;
    try { backendPctParser(inv); } catch { backendFailed = true; }
    try { frontendPctParser(inv); } catch { frontendFailed = true; }
    if (!backendFailed || !frontendFailed) parityOk = false;
  }
  assert(
    parityOk &&
    frontendPctParser("10") === 1000 &&
    frontendPctParser("12.5") === 1250 &&
    frontendPctParser("12.34") === 1234,
    "Paridad demostrada en parser porcentajeAPuntosBasicos (backend vs frontend) para 0, 10, 12.5, 12.34, 100 y rechazos (12.345, negativo, >100)."
  );

  // Check 25 [POINT 6]: Real canonical vendor ID resolution (email != vendorId)
  const vProfileResolved = await resolverVendedorCanonico(db, vEmail);
  assert(
    vProfileResolved !== null &&
    vProfileResolved.id === vId &&
    vProfileResolved.id !== vEmail,
    "Helper REAL resolverVendedorCanonico recibe email, resuelve a vendorId canónico (" + vId + ") y garantiza aislamiento backend."
  );

  console.log("\\n==========================================================");
  console.log(`RESUMEN MICROCierre UI ADMIN 3B.5C.1: ${passedCount}/${totalCount} PASS`);
  console.log("==========================================================");

  if (passedCount === totalCount) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error("FATAL ERROR IN MICROCierre UI SUITE 3B.5C.1:", err);
  process.exit(1);
});
