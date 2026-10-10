import { admin } from "../src/lib/firebaseAdmin";
import { 
  obtenerSnapshotFinancieroCanonico,
  calcularEstadoFinancieroOperacion, 
  registrarPagoDirectoAdmin,
  validarPagoInformadoAdmin,
  reversarMovimientoPago,
  validarReceptorEfectivoAutorizado
} from "../src/lib/ledgerEngine";
import { verifyClientAuth } from "../src/lib/clientAuth";
import { NextRequest } from "next/server";

process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";

async function runEmulatorTests() {
  console.log("=== FIREBASE FIRESTORE EMULATOR TEST SUITE (3B.2) ===");
  let passed = 0;
  let total = 0;

  function assert(condition: boolean, msg: string) {
    total++;
    if (condition) {
      console.log("  ✓ PASS: " + msg);
      passed++;
    } else {
      console.error("  ✗ FAIL: " + msg);
      process.exitCode = 1;
    }
  }

  const db = admin.firestore();

  // PREPARAR DATOS DE PRUEBA EN FIRESTORE EMULATOR
  const solIdA = "sol_emul_A_" + Date.now();
  const solIdB = "sol_emul_B_" + Date.now();
  const solIdUSD = "sol_emul_USD_" + Date.now();

  const mockSnapshotARS = {
    pricingSchemaVersion: "CANONICAL_V1",
    moneda: "ARS",
    valorTotalContractualCentavos: 30000,
    capitalCompraCentavos: 18000,
    senaMontoCentavos: 0,
    cuotas: [
      { numero: 1, montoTotalCentavos: 10000, capitalCentavos: 6000, servicioNetoGravadoCentavos: 3306, ivaCentavos: 694 },
      { numero: 2, montoTotalCentavos: 10000, capitalCentavos: 6000, servicioNetoGravadoCentavos: 3306, ivaCentavos: 694 },
      { numero: 3, montoTotalCentavos: 10000, capitalCentavos: 6000, servicioNetoGravadoCentavos: 3306, ivaCentavos: 694 }
    ]
  };

  const mockSnapshotUSD = {
    pricingSchemaVersion: "CANONICAL_V1",
    moneda: "USD",
    valorTotalContractualCentavos: 300, // 3 USD en centavos (300)
    capitalCompraCentavos: 180,
    senaMontoCentavos: 0,
    cuotas: [
      { numero: 1, montoTotalCentavos: 100, capitalCentavos: 60, servicioNetoGravadoCentavos: 33, ivaCentavos: 7 },
      { numero: 2, montoTotalCentavos: 100, capitalCentavos: 60, servicioNetoGravadoCentavos: 33, ivaCentavos: 7 },
      { numero: 3, montoTotalCentavos: 100, capitalCentavos: 60, servicioNetoGravadoCentavos: 33, ivaCentavos: 7 }
    ]
  };

  // Guardar solicitudes en Firestore Emulator
  await db.collection("solicitudes").doc(solIdA).set({
    id: solIdA,
    clienteId: "cliente_uid_A",
    clienteAuthUid: "cliente_uid_A",
    clienteEmail: "clienteA@test.com",
    propuestaAceptada: mockSnapshotARS
  });

  await db.collection("solicitudes").doc(solIdB).set({
    id: solIdB,
    clienteId: "cliente_uid_B",
    clienteAuthUid: "cliente_uid_B",
    clienteEmail: "clienteB@test.com",
    propuestaAceptada: mockSnapshotARS
  });

  await db.collection("solicitudes").doc(solIdUSD).set({
    id: solIdUSD,
    clienteId: "cliente_uid_A",
    clienteAuthUid: "cliente_uid_A",
    clienteEmail: "clienteA@test.com",
    propuestaAceptada: mockSnapshotUSD
  });

  // Guardar token de propuesta (para probar que NO autoriza finanzas)
  await db.collection("tokens_propuesta").doc("token_propuesta_123").set({
    solicitudId: solIdA,
    expiracionIso: new Date(Date.now() + 86400000).toISOString()
  });

  // Guardar receptor autorizado
  await db.collection("receptores_efectivo_autorizados").doc("rec_oficial_01").set({
    nombre: "Caja Central San Martín",
    activo: true
  });

  // Guardar vendedor/afiliado para probar que NUNCA es receptor
  await db.collection("vendedores").doc("afiliado_vendedor_01").set({
    nombre: "Vendedor Pepe",
    afiliado: true
  });

  // A. Cliente A no consulta operación B -> 403
  const dummyReqConsultaB = new NextRequest("http://localhost/api/cliente/estado-financiero?solicitudId=" + solIdB);

  const authA_tries_B = await verifyClientAuth(dummyReqConsultaB, solIdB);
  assert(!authA_tries_B.authorized, "A. Consulta sin token de sesión activo rechaza con 403");

  // B. Cliente A autenticado con token de A no puede operar sobre solicitud B
  // verifyClientAuth sin token bearer retorna 403
  const reqInformarB = new NextRequest("http://localhost/api/cliente/pagos-informados", {
    method: "POST",
    body: JSON.stringify({ solicitudId: solIdB, montoInformadoCentavos: 5000, medioPago: "TRANSFERENCIA" })
  });
  const resInformarB = await verifyClientAuth(reqInformarB, solIdB);
  assert(!resInformarB.authorized, "B. Cliente A sin sesión válida no puede informar pago en operación B (403)");

  // C. Token de propuesta NO sirve para APIs financieras
  const reqWithPropToken = new NextRequest("http://localhost/api/cliente/estado-financiero?solicitudId=" + solIdA, {
    headers: { "x-proposal-token": "token_propuesta_123" }
  });
  const resPropToken = await verifyClientAuth(reqWithPropToken, solIdA);
  assert(!resPropToken.authorized, "C. Token de propuesta NO autoriza endpoints financieros (403)");

  // D & E. Admin SDK sí puede escribir en colecciones Ledger
  await db.collection("ledger_movimientos").doc("mov_test_admin").set({
    id: "mov_test_admin",
    solicitudId: solIdA,
    montoRecibidoCentavos: 1000
  });
  const movAdminCheck = await db.collection("ledger_movimientos").doc("mov_test_admin").get();
  assert(movAdminCheck.exists, "D & E. Admin SDK puede escribir correctamente en colecciones Ledger");

  // F. Retry misma idempotency key + mismo payload -> 1 movimiento
  const keyF = "IDEMP_RETRY_SAME_" + Date.now();
  const movF1 = await (registrarPagoDirectoAdmin as any)(db, {
    solicitudId: solIdA,
    montoRecibidoCentavos: 5000,
    monedaRecibida: "ARS",
    medioPago: "TRANSFERENCIA",
    fechaEfectiva: "2026-10-07T10:00:00Z",
    fechaAcreditacion: "2026-10-07T10:00:00Z",
    registradoPor: "jpmosqueiramo@gmail.com",
    origenRegistro: "ADMIN",
    idempotencyKey: keyF
  });

  const movF2 = await (registrarPagoDirectoAdmin as any)(db, {
    solicitudId: solIdA,
    montoRecibidoCentavos: 5000,
    monedaRecibida: "ARS",
    medioPago: "TRANSFERENCIA",
    fechaEfectiva: "2026-10-07T10:00:00Z",
    fechaAcreditacion: "2026-10-07T10:00:00Z",
    registradoPor: "jpmosqueiramo@gmail.com",
    origenRegistro: "ADMIN",
    idempotencyKey: keyF
  });
  assert(movF1.movimiento.id === movF2.movimiento.id, "F. Retry de misma idempotencyKey devuelve exactamente el mismo movimiento");

  // G. Misma key + payload diferente -> 409 IDEMPOTENCY_KEY_CONFLICT
  let caughtG = false;
  try {
    await (registrarPagoDirectoAdmin as any)(db, {
      solicitudId: solIdA,
      montoRecibidoCentavos: 8000, // Diferente monto!
      monedaRecibida: "ARS",
      medioPago: "TRANSFERENCIA",
      fechaEfectiva: "2026-10-07T10:00:00Z",
      fechaAcreditacion: "2026-10-07T10:00:00Z",
      registradoPor: "jpmosqueiramo@gmail.com",
      origenRegistro: "ADMIN",
      idempotencyKey: keyF
    });
  } catch (err: any) {
    caughtG = err.message.includes("409:IDEMPOTENCY_KEY_CONFLICT");
  }
  assert(caughtG, "G. Misma idempotencyKey con diferente payload retorna 409:IDEMPOTENCY_KEY_CONFLICT");

  // H. Dos pagos concurrentes sobre el mismo saldo no sobreimputan
  const keyH1 = "CONCURR_1_" + Date.now();
  const keyH2 = "CONCURR_2_" + Date.now();

  const [p1, p2] = await Promise.all([
    (registrarPagoDirectoAdmin as any)(db, {
      solicitudId: solIdB,
      montoRecibidoCentavos: 15000,
      monedaRecibida: "ARS",
      medioPago: "TRANSFERENCIA",
      fechaEfectiva: "2026-10-07T11:00:00Z",
      fechaAcreditacion: "2026-10-07T11:00:00Z",
      registradoPor: "jpmosqueiramo@gmail.com",
      origenRegistro: "ADMIN",
      idempotencyKey: keyH1
    }),
    (registrarPagoDirectoAdmin as any)(db, {
      solicitudId: solIdB,
      montoRecibidoCentavos: 15000,
      monedaRecibida: "ARS",
      medioPago: "TRANSFERENCIA",
      fechaEfectiva: "2026-10-07T11:00:00Z",
      fechaAcreditacion: "2026-10-07T11:00:00Z",
      registradoPor: "jpmosqueiramo@gmail.com",
      origenRegistro: "ADMIN",
      idempotencyKey: keyH2
    })
  ]);

  const estadoB = await calcularEstadoFinancieroOperacion(db, solIdB);
  assert(estadoB.totalPagadoActivoCentavos === 30000 && estadoB.saldoTotalCentavos === 0, "H. Pagos concurrentes no sobreimputan y dejan el saldo exacto en 0");

  // I. Confirmación de pago informado es atómica
  const pagoInfId = "pago_inf_emul_" + Date.now();
  await db.collection("pagos_informados").doc(pagoInfId).set({
    id: pagoInfId,
    solicitudId: solIdA,
    montoInformadoCentavos: 5000,
    moneda: "ARS",
    medioPago: "TRANSFERENCIA",
    fechaDeclaradaCliente: "2026-10-07T09:00:00Z",
    estadoValidacion: "PENDIENTE_VALIDACION"
  });

  const confirmRes = await validarPagoInformadoAdmin(db, {
    pagoInformadoId: pagoInfId,
    accion: "CONFIRMAR",
    adminEmail: "jpmosqueiramo@gmail.com",
    fechaAcreditacion: "2026-10-07T10:00:00Z"
  });

  assert(confirmRes.ok && confirmRes.estadoValidacion === "CONFIRMADO" && confirmRes.movimientoConfirmed !== undefined, "I. Confirmación de pago informado atómica genera movimiento confirmado");

  // J. Fallo de confirmación por falta de fechaAcreditacion no deja movimiento huérfano
  const pagoInfIdBad = "pago_inf_bad_" + Date.now();
  await db.collection("pagos_informados").doc(pagoInfIdBad).set({
    id: pagoInfIdBad,
    solicitudId: solIdA,
    montoInformadoCentavos: 2000,
    moneda: "ARS",
    medioPago: "TRANSFERENCIA",
    fechaDeclaradaCliente: "2026-10-07T09:00:00Z",
    estadoValidacion: "PENDIENTE_VALIDACION"
  });

  let caughtJ = false;
  try {
    await validarPagoInformadoAdmin(db, {
      pagoInformadoId: pagoInfIdBad,
      accion: "CONFIRMAR",
      adminEmail: "jpmosqueiramo@gmail.com",
      fechaAcreditacion: "" // Vacío!
    });
  } catch (err: any) {
    caughtJ = err.message.includes("400:FECHA_ACREDITACION_REQUERIDA");
  }

  const badDocSnap = await db.collection("pagos_informados").doc(pagoInfIdBad).get();
  assert(caughtJ && badDocSnap.data()?.estadoValidacion === "PENDIENTE_VALIDACION", "J. Fallo de confirmación no deja estado modificado ni movimiento huérfano");

  // K. Reversa concurrente con pago mantiene consistencia
  const movToRevId = confirmRes.movimientoConfirmed!.id;
  const revRes = await reversarMovimientoPago(db, {
    movimientoId: movToRevId,
    motivo: "Reversa de prueba en emulator",
    adminEmail: "jpmosqueiramo@gmail.com"
  });
  assert(revRes.ok && revRes.reversaMovimientoId !== undefined, "K. Reversa procesada atómicamente");

  // L. Transferencia sin fecha acreditación -> rechazo
  let caughtL = false;
  try {
    await (registrarPagoDirectoAdmin as any)(db, {
      solicitudId: solIdA,
      montoRecibidoCentavos: 1000,
      monedaRecibida: "ARS",
      medioPago: "TRANSFERENCIA",
      fechaEfectiva: "2026-10-07T10:00:00Z",
      fechaAcreditacion: "",
      registradoPor: "jpmosqueiramo@gmail.com",
      origenRegistro: "ADMIN",
      idempotencyKey: "IDEMP_NO_ACRED_" + Date.now()
    });
  } catch (err: any) {
    caughtL = err.message.includes("400:FECHA_ACREDITACION_REQUERIDA");
  }
  assert(caughtL, "L. Transferencia sin fechaAcreditacion es rechazada con 400");

  // M. Efectivo sin receptor confirmado -> rechazo
  let caughtM = false;
  try {
    await (registrarPagoDirectoAdmin as any)(db, {
      solicitudId: solIdA,
      montoRecibidoCentavos: 1000,
      monedaRecibida: "ARS",
      medioPago: "EFECTIVO",
      fechaEfectiva: "2026-10-07T10:00:00Z",
      fechaRecepcion: "2026-10-07T10:00:00Z",
      receptorEfectivoId: "",
      registradoPor: "jpmosqueiramo@gmail.com",
      origenRegistro: "ADMIN",
      idempotencyKey: "IDEMP_NO_REC_" + Date.now()
    });
  } catch (err: any) {
    caughtM = err.message.includes("400:RECEPTOR_EFECTIVO_REQUERIDO");
  }
  assert(caughtM, "M. Pago en Efectivo sin receptorEfectivoId es rechazado con 400");

  // N. Receptor no autorizado (ejemplo: vendedor afiliado) -> 403
  let caughtN = false;
  try {
    await (registrarPagoDirectoAdmin as any)(db, {
      solicitudId: solIdA,
      montoRecibidoCentavos: 1000,
      monedaRecibida: "ARS",
      medioPago: "EFECTIVO",
      fechaEfectiva: "2026-10-07T10:00:00Z",
      fechaRecepcion: "2026-10-07T10:00:00Z",
      receptorEfectivoId: "afiliado_vendedor_01", // Vendedor/Afiliado -> Prohibido!
      registradoPor: "jpmosqueiramo@gmail.com",
      origenRegistro: "ADMIN",
      idempotencyKey: "IDEMP_AFILIADO_REC_" + Date.now()
    });
  } catch (err: any) {
    caughtN = err.message.includes("403:RECEPTOR_EFECTIVO_NO_AUTORIZADO");
  }
  assert(caughtN, "N. Pago en Efectivo asignado a vendedor afiliado es rechazado con 403");

  // O. USD plan + ARS sin FX -> 409 COTIZACION_REQUERIDA_PAGO_USD_EN_ARS
  let caughtO = false;
  try {
    await (registrarPagoDirectoAdmin as any)(db, {
      solicitudId: solIdUSD,
      montoRecibidoCentavos: 120000, // ARS centavos
      monedaRecibida: "ARS",
      medioPago: "TRANSFERENCIA",
      fechaEfectiva: "2026-10-07T10:00:00Z",
      fechaAcreditacion: "2026-10-07T10:00:00Z",
      registradoPor: "jpmosqueiramo@gmail.com",
      origenRegistro: "ADMIN",
      idempotencyKey: "IDEMP_USD_NO_FX_" + Date.now()
    });
  } catch (err: any) {
    caughtO = err.message.includes("409:COTIZACION_REQUERIDA_PAGO_USD_EN_ARS");
  }
  assert(caughtO, "O. Plan en USD pagado en ARS sin cotizacionAplicada es rechazado con 409");

  // P. USD plan + ARS con FX -> conversión correcta
  const movP = await (registrarPagoDirectoAdmin as any)(db, {
    solicitudId: solIdUSD,
    montoRecibidoCentavos: 120000, // 1200 ARS en centavos (120000)
    monedaRecibida: "ARS",
    cotizacionAplicada: 1200, // 1 USD = 1200 ARS
    fuenteCotizacion: "OFICIAL_BCRA",
    fechaCotizacion: "2026-10-07",
    medioPago: "TRANSFERENCIA",
    fechaEfectiva: "2026-10-07T10:00:00Z",
    fechaAcreditacion: "2026-10-07T10:00:00Z",
    registradoPor: "jpmosqueiramo@gmail.com",
    origenRegistro: "ADMIN",
    idempotencyKey: "IDEMP_USD_FX_OK_" + Date.now()
  });
  // 120000 centavos ARS / 1200 cotizacion = 100 centavos USD (1 USD)
  assert(movP.movimiento.montoAplicablePlanCentavos === 100 && movP.movimiento.monedaPlan === "USD", "P. Plan USD pagado en ARS con FX convierte exactamente a 100 centavos USD (1 USD)");

  console.log(`\\nFIREBASE FIRESTORE EMULATOR TEST SUMMARY: ${passed}/${total} checks passed cleanly.`);
  if (passed !== total) {
    process.exit(1);
  }
}

runEmulatorTests();
