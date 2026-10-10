process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";
process.env.FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:9099";
process.env.GCLOUD_PROJECT = "demo-cuenta-hogar";

import { admin } from "../src/lib/firebaseAdmin";
import { registrarPagoDirectoAdmin, reversarMovimientoPago } from "../src/lib/ledgerEngine";
import {
  evaluarVencimientoCuota,
  calcularEstadoCumplimientoOperacion,
  calcularFechasVencimientoPlan,
  sumarDiasCalendario,
  registrarPromesaPago,
  obtenerPromesasPagoOperacion,
  calcularPagadoCalificableHasta,
  registrarAjusteAdministrativo,
  reconstruirCiclosCuraOperacion,
  prepararNotificacionCumplimiento,
  obtenerFechaCalendarioArgentina,
  calcularSaldoTotalOperacionHasta
} from "../src/lib/expirationEngine";
import { NextRequest } from "next/server";
import { POST as postAfiliadoPromesas } from "../src/app/api/afiliado/promesas/route";

async function getRealIdTokenForUser(email: string, password: string): Promise<string> {
  const res = await fetch("http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=fake-apiKey", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, returnSecureToken: true })
  });
  const data = await res.json();
  if (!data.idToken) {
    throw new Error("Could not obtain idToken from Auth emulator: " + JSON.stringify(data));
  }
  return data.idToken;
}

async function testClientBrowserWriteDenied(collectionName: string, docId: string): Promise<boolean> {
  const url = `http://127.0.0.1:8080/v1/projects/demo-cuenta-hogar/databases/(default)/documents/${collectionName}/${docId}`;
  const res = await fetch(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fields: { testField: { stringValue: "unauthorized_browser_write" } } })
  });
  return res.status === 403 || res.status === 400 || res.status === 401;
}

async function runTests3B3() {
  console.log("=== FIREBASE FIRESTORE & AUTH EMULATOR SUITE 3B.3 (SUITE REGRESIÓN ACUMULATIVA FINAL) ===");
  let passed = 0;
  let total = 0;

  function assert(cond: boolean, msg: string) {
    total++;
    if (cond) {
      console.log(`  ✓ PASS [${total}]: ${msg}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL [${total}]: ${msg}`);
      process.exitCode = 1;
    }
  }

  const db = admin.firestore();

  // Registrar receptor de efectivo autorizado
  await db.collection("receptores_efectivo_autorizados").doc("rec_caja_oficial").set({
    nombre: "Caja Central",
    activo: true
  });

  const mockSnapshot4Cuotas = {
    pricingSchemaVersion: "CANONICAL_V1",
    moneda: "ARS",
    valorTotalContractualCentavos: 400000,
    capitalCompraCentavos: 240000,
    senaMontoCentavos: 0,
    vencimientoSegundaCuota: "2026-03-31",
    cuotas: [
      { numero: 1, montoTotalCentavos: 100000, capitalCentavos: 60000, servicioNetoGravadoCentavos: 33058, ivaCentavos: 6942 },
      { numero: 2, montoTotalCentavos: 100000, capitalCentavos: 60000, servicioNetoGravadoCentavos: 33058, ivaCentavos: 6942 },
      { numero: 3, montoTotalCentavos: 100000, capitalCentavos: 60000, servicioNetoGravadoCentavos: 33058, ivaCentavos: 6942 },
      { numero: 4, montoTotalCentavos: 100000, capitalCentavos: 60000, servicioNetoGravadoCentavos: 33058, ivaCentavos: 6942 }
    ]
  };

  // =========================================================================
  // SECCIÓN 1: PRUEBAS AS OF ACTUALES (REG-1 A REG-11)
  // =========================================================================

  // 1. Cura 31/03-10/04 + pago 06/04: AS OF 04/04 -> EN_PERIODO_CURA
  const solReg1 = "sol_reg_1_" + Date.now();
  await db.collection("solicitudes").doc(solReg1).set({
    id: solReg1,
    clienteId: "cli_reg1",
    fechaEntregaReal: "2026-03-01",
    propuestaAceptada: mockSnapshot4Cuotas
  });
  const solDataReg1 = (await db.collection("solicitudes").doc(solReg1).get()).data()!;
  await evaluarVencimientoCuota(db, solDataReg1, 1, "2026-03-01");
  await evaluarVencimientoCuota(db, solDataReg1, 2, "2026-03-31");

  const movPagoReg1 = await registrarPagoDirectoAdmin(db, {
    solicitudId: solReg1,
    montoRecibidoCentavos: 160000,
    monedaRecibida: "ARS",
    medioPago: "TRANSFERENCIA",
    fechaEfectiva: "2026-04-06T10:00:00Z",
    fechaAcreditacion: "2026-04-06T10:00:00Z",
    registradoPor: "admin@test.com",
    origenRegistro: "ADMIN",
    idempotencyKey: "pago_reg1_" + Date.now()
  });

  const estadoAsOf0404 = await calcularEstadoCumplimientoOperacion(db, solReg1, "2026-04-04");
  assert(estadoAsOf0404.estadoActual === "EN_PERIODO_CURA", 
    "REG-1. Cura 31/03-10/04 con pago el 06/04: consulta AS OF 04/04 resulta en EN_PERIODO_CURA.");

  // 2. Mismo caso: AS OF 06/04 -> CURADO
  const estadoAsOf0604 = await calcularEstadoCumplimientoOperacion(db, solReg1, "2026-04-06");
  assert(estadoAsOf0604.estadoActual === "CURADO", 
    "REG-2. Mismo caso: consulta AS OF 06/04 resulta en CURADO.");

  // 3. Pago posterior al límite (15/04): no cura retroactivamente
  const solReg3 = "sol_reg_3_" + Date.now();
  await db.collection("solicitudes").doc(solReg3).set({
    id: solReg3,
    clienteId: "cli_reg3",
    fechaEntregaReal: "2026-03-01",
    propuestaAceptada: mockSnapshot4Cuotas
  });
  const solDataReg3 = (await db.collection("solicitudes").doc(solReg3).get()).data()!;
  await evaluarVencimientoCuota(db, solDataReg3, 1, "2026-03-01");
  await evaluarVencimientoCuota(db, solDataReg3, 2, "2026-03-31");
  
  await registrarPagoDirectoAdmin(db, {
    solicitudId: solReg3,
    montoRecibidoCentavos: 200000,
    monedaRecibida: "ARS",
    medioPago: "TRANSFERENCIA",
    fechaEfectiva: "2026-04-15T10:00:00Z",
    fechaAcreditacion: "2026-04-15T10:00:00Z",
    registradoPor: "admin@test.com",
    origenRegistro: "ADMIN",
    idempotencyKey: "pago_reg3_" + Date.now()
  });
  const estadoReg3 = await calcularEstadoCumplimientoOperacion(db, solReg3, "2026-04-15");
  assert(estadoReg3.estadoActual === "CURA_VENCIDA", 
    "REG-3. Pago posterior a la fecha límite no cura retroactivamente (estado al 15/04 es CURA_VENCIDA).");

  // 4. Pago futuro (15/04): no altera saldoExigibleActualCentavos histórico (31/03)
  const estadoReg4ASOF3103 = await calcularEstadoCumplimientoOperacion(db, solReg3, "2026-03-31");
  assert(estadoReg4ASOF3103.saldoExigibleActualCentavos === 200000, 
    "REG-4. Pago futuro del 15/04 no altera el saldoExigibleActualCentavos (200.000) en consulta histórica AS OF 31/03.");

  // 5. Pago final futuro (01/08): no convierte consulta histórica anterior (01/04) en CANCELADO
  const solReg5 = "sol_reg_5_" + Date.now();
  await db.collection("solicitudes").doc(solReg5).set({
    id: solReg5,
    clienteId: "cli_reg5",
    fechaEntregaReal: "2026-03-01",
    propuestaAceptada: mockSnapshot4Cuotas
  });
  await registrarPagoDirectoAdmin(db, {
    solicitudId: solReg5,
    montoRecibidoCentavos: 400000,
    monedaRecibida: "ARS",
    medioPago: "TRANSFERENCIA",
    fechaEfectiva: "2026-08-01T10:00:00Z",
    fechaAcreditacion: "2026-08-01T10:00:00Z",
    registradoPor: "admin@test.com",
    origenRegistro: "ADMIN",
    idempotencyKey: "pago_reg5_final_" + Date.now()
  });

  const estadoReg5ASOF0104 = await calcularEstadoCumplimientoOperacion(db, solReg5, "2026-04-01");
  assert(estadoReg5ASOF0104.estadoActual !== "CANCELADO", 
    "REG-5. Pago final futuro el 01/08 no convierte la consulta histórica AS OF 01/04 en CANCELADO.");

  // 6. saldoTotalCentavos histórico correcto antes (01/04 -> 400.000) y después del pago (01/08 -> 0)
  const saldoReg5Before = await calcularSaldoTotalOperacionHasta(db, solReg5, "2026-04-01");
  const saldoReg5After = await calcularSaldoTotalOperacionHasta(db, solReg5, "2026-08-01");
  assert(saldoReg5Before.saldoTotalCentavos === 400000 && saldoReg5After.saldoTotalCentavos === 0, 
    "REG-6. saldoTotalCentavos histórico devuelve 400.000 centavos AS OF 01/04 y 0 centavos AS OF 01/08.");

  // 7. Promesa consultada antes de un pago futuro: no aparece cumplida (VIGENTE), consultada el día del pago sí (CUMPLIDA)
  const solReg7 = "sol_reg_7_" + Date.now();
  await db.collection("solicitudes").doc(solReg7).set({
    id: solReg7,
    clienteId: "cli_reg7",
    fechaEntregaReal: "2026-03-01",
    propuestaAceptada: mockSnapshot4Cuotas
  });

  await registrarPromesaPago(db, {
    solicitudId: solReg7,
    clienteId: "cli_reg7",
    fechaPrometida: "2026-04-15",
    montoPrometidoCentavos: 50000,
    creadaPor: "admin@test.com",
    creadaPorRol: "ADMIN"
  });

  await registrarPagoDirectoAdmin(db, {
    solicitudId: solReg7,
    montoRecibidoCentavos: 50000,
    monedaRecibida: "ARS",
    medioPago: "TRANSFERENCIA",
    fechaEfectiva: "2026-04-12T10:00:00Z",
    fechaAcreditacion: "2026-04-12T10:00:00Z",
    registradoPor: "admin@test.com",
    origenRegistro: "ADMIN",
    idempotencyKey: "pago_reg7_" + Date.now()
  });

  const promesasASOF1004 = await obtenerPromesasPagoOperacion(db, solReg7, "2026-04-10");
  const promesasASOF1204 = await obtenerPromesasPagoOperacion(db, solReg7, "2026-04-12");

  assert(promesasASOF1004[0].estadoDerivado === "VIGENTE" && promesasASOF1204[0].estadoDerivado === "CUMPLIDA", 
    "REG-7. Promesa consultada AS OF 10/04 (antes del pago del 12/04) resulta VIGENTE; AS OF 12/04 resulta CUMPLIDA.");

  // 8. Pago del 80% exactamente en vencimiento: CUMPLIDO_80
  const solReg8 = "sol_reg_8_" + Date.now();
  await db.collection("solicitudes").doc(solReg8).set({
    id: solReg8,
    clienteId: "cli_reg8",
    fechaEntregaReal: "2026-03-01",
    propuestaAceptada: mockSnapshot4Cuotas
  });
  const solDataReg8 = (await db.collection("solicitudes").doc(solReg8).get()).data()!;

  await registrarPagoDirectoAdmin(db, {
    solicitudId: solReg8,
    montoRecibidoCentavos: 80000,
    monedaRecibida: "ARS",
    medioPago: "TRANSFERENCIA",
    fechaEfectiva: "2026-03-01T10:00:00Z",
    fechaAcreditacion: "2026-03-01T10:00:00Z",
    registradoPor: "admin@test.com",
    origenRegistro: "ADMIN",
    idempotencyKey: "pago_reg8_" + Date.now()
  });

  const evReg8 = await evaluarVencimientoCuota(db, solDataReg8, 1, "2026-03-01");
  assert(evReg8.resultado === "CUMPLIDO_80", 
    "REG-8. Pago del 80% exactamente el día de vencimiento resulta en CUMPLIDO_80.");

  // 9. Reversa posterior: no altera la foto histórica anterior a la reversa
  const pagadoAntesRevASOF0104 = await calcularPagadoCalificableHasta(db, solReg1, "2026-04-06");
  await reversarMovimientoPago(db, {
    movimientoId: movPagoReg1.movimiento.id,
    motivo: "Reversa administrativa post-auditoría",
    adminEmail: "admin@test.com"
  });
  const fechaHoyLocal = obtenerFechaCalendarioArgentina();
  const pagadoDespuesRevASOF0104 = await calcularPagadoCalificableHasta(db, solReg1, "2026-04-06");
  const pagadoDespuesRevASOFHoy = await calcularPagadoCalificableHasta(db, solReg1, fechaHoyLocal);

  assert(pagadoAntesRevASOF0104 === 160000 && pagadoDespuesRevASOF0104 === 160000 && pagadoDespuesRevASOFHoy === 0, 
    "REG-9. Reversa posterior no altera la foto histórica AS OF 06/04 (160.000) pero la elimina AS OF la fecha actual de la reversa (0).");

  // 10. ledgerRevisionEvaluada proviene de la revisión real de ledger_operaciones
  const opDocSnap = await db.collection("ledger_operaciones").doc(solReg8).get();
  const revisionRealOp = opDocSnap.exists ? (opDocSnap.data()?.revision || 1) : 1;
  assert(evReg8.ledgerRevisionEvaluada === revisionRealOp, 
    "REG-10. ledgerRevisionEvaluada grabado en la evaluación proviene de la revisión real de ledger_operaciones.");

  // 11. Concurrencia: dos evaluadores simultáneos producen exactamente un documento
  const solReg11 = "sol_reg_11_" + Date.now();
  await db.collection("solicitudes").doc(solReg11).set({
    id: solReg11,
    clienteId: "cli_reg11",
    fechaEntregaReal: "2026-03-01",
    propuestaAceptada: mockSnapshot4Cuotas
  });
  const solDataReg11 = (await db.collection("solicitudes").doc(solReg11).get()).data()!;

  const [resConc1, resConc2] = await Promise.all([
    evaluarVencimientoCuota(db, solDataReg11, 1, "2026-03-01"),
    evaluarVencimientoCuota(db, solDataReg11, 1, "2026-03-01")
  ]);

  const countEvalsSnap = await db.collection("evaluaciones_vencimiento")
    .where("solicitudId", "==", solReg11)
    .where("cuotaNumero", "==", 1)
    .get();

  assert(resConc1.id === resConc2.id && countEvalsSnap.size === 1, 
    "REG-11. Concurrencia: dos evaluadores simultáneos de la misma cuota producen exactamente 1 documento en Firestore.");

  // =========================================================================
  // SECCIÓN 2: RESTAURACIÓN EXPLÍCITA DE MÚLTIPLES CICLOS DE MORA Y CURA (MC-1 A MC-8)
  // =========================================================================

  const solIdCiclosMulti = "sol_mc_multi_" + Date.now();
  await db.collection("solicitudes").doc(solIdCiclosMulti).set({
    id: solIdCiclosMulti,
    clienteId: "cli_multi",
    fechaEntregaReal: "2026-03-01",
    propuestaAceptada: mockSnapshot4Cuotas
  });
  const solDataMulti = (await db.collection("solicitudes").doc(solIdCiclosMulti).get()).data()!;

  // MC-1. Cuota 1 incumplida + Cuota 2 incumplida -> rachaDespues = 2 y gatilla Ciclo de Cura 1
  const evMC1 = await evaluarVencimientoCuota(db, solDataMulti, 1, "2026-03-01");
  const evMC2 = await evaluarVencimientoCuota(db, solDataMulti, 2, "2026-03-31");
  assert(evMC1.rachaDespues === 1 && evMC2.rachaDespues === 2, 
    "MC-1. Cuota 1 y Cuota 2 incumplidas resultan en rachaDespues = 2 y gatillan Ciclo de Cura 1.");

  // MC-2. Cura exitosa del Ciclo 1 (Pago 80% al 06/04) -> rachaActiva = 0
  await registrarPagoDirectoAdmin(db, {
    solicitudId: solIdCiclosMulti,
    montoRecibidoCentavos: 160000,
    monedaRecibida: "ARS",
    medioPago: "TRANSFERENCIA",
    fechaEfectiva: "2026-04-06T10:00:00Z",
    fechaAcreditacion: "2026-04-06T10:00:00Z",
    registradoPor: "admin@test.com",
    origenRegistro: "ADMIN",
    idempotencyKey: "pago_mc_cura1_" + Date.now()
  });
  const estCuraMC1 = await calcularEstadoCumplimientoOperacion(db, solIdCiclosMulti, "2026-04-06");
  assert(estCuraMC1.estadoActual === "CURADO" && estCuraMC1.rachaActiva === 0, 
    "MC-2. Cura exitosa del Ciclo 1 al 80% restablece rachaActiva = 0 y estadoActual = CURADO.");

  // MC-3. Base congelada Ciclo 1 (exigibleBaseCuraCentavos = 200.000) permanece congelada al vencer cuotas posteriores
  const { historialCiclos: histMC1 } = await reconstruirCiclosCuraOperacion(db, solIdCiclosMulti, "2026-05-05");
  assert(histMC1[0].exigibleBaseCuraCentavos === 200000 && histMC1[0].resultadoDerivado === "CURADA", 
    "MC-3. Base congelada del Ciclo 1 (exigibleBaseCuraCentavos = 200.000) permanece congelada e igual al vencer cuotas posteriores.");

  // MC-4. Cuota 3 incumplida post-cura: rachaAntes = 0 y rachaDespues = 1
  const evMC3 = await evaluarVencimientoCuota(db, solDataMulti, 3, "2026-04-30");
  assert(evMC3.rachaAntes === 0 && evMC3.rachaDespues === 1, 
    "MC-4. Cuota 3 incumplida post-cura exitosa inicia con rachaAntes = 0 y resulta en rachaDespues = 1.");

  // MC-5. Cuota 4 incumplida (31/05): rachaDespues = 2 e inicia Ciclo de Cura 2
  const evMC4 = await evaluarVencimientoCuota(db, solDataMulti, 4, "2026-05-31");
  assert(evMC4.rachaDespues === 2, 
    "MC-5. Cuota 4 incumplida genera rachaDespues = 2 e inicia el Ciclo de Cura 2.");

  // MC-6. Ciclo 2 posee su propia exigibleBaseCuraCentavos = 400.000
  const { historialCiclos: histMC2, cicloVigente: cicloVigMC2 } = await reconstruirCiclosCuraOperacion(db, solIdCiclosMulti, "2026-06-05");
  assert(histMC2.length === 2 && cicloVigMC2?.exigibleBaseCuraCentavos === 400000, 
    "MC-6. El segundo ciclo de cura posee su propia base congelada exigibleBaseCuraCentavos = 400.000.");

  // MC-7. Historial coexistente: Ciclo 1 CURADA + Ciclo 2 VENCIDA (al 12/06 sin pago) -> estadoActual = CURA_VENCIDA
  const estMC2 = await calcularEstadoCumplimientoOperacion(db, solIdCiclosMulti, "2026-06-12");
  assert(estMC2.estadoActual === "CURA_VENCIDA", 
    "MC-7. Historial coexistente (Ciclo 1 CURADA + Ciclo 2 VENCIDA) resulta en estadoActual = CURA_VENCIDA.");

  // MC-8. Pago posterior al vencimiento del Ciclo 2 (15/06) no transforma retroactivamente el Ciclo 2 en CURADA
  await registrarPagoDirectoAdmin(db, {
    solicitudId: solIdCiclosMulti,
    montoRecibidoCentavos: 200000,
    monedaRecibida: "ARS",
    medioPago: "TRANSFERENCIA",
    fechaEfectiva: "2026-06-15T10:00:00Z",
    fechaAcreditacion: "2026-06-15T10:00:00Z",
    registradoPor: "admin@test.com",
    origenRegistro: "ADMIN",
    idempotencyKey: "pago_mc_post_vencido_" + Date.now()
  });
  const estMC2PostPago = await calcularEstadoCumplimientoOperacion(db, solIdCiclosMulti, "2026-06-15");
  assert(estMC2PostPago.estadoActual === "CURA_VENCIDA", 
    "MC-8. Pago posterior al vencimiento del Ciclo 2 no lo transforma retroactivamente en CURADA.");

  // =========================================================================
  // SECCIÓN 3: REGRESIONES ADICIONALES DE SEGURIDAD Y REGLAS (ADD-1 A ADD-11 + SEC)
  // =========================================================================

  // ADD-1. Promesa recién creada no se cumple con pagos anteriores a su baseline
  const solPromBase = "sol_prom_base_" + Date.now();
  await db.collection("solicitudes").doc(solPromBase).set({
    id: solPromBase,
    clienteId: "cli_prom_base",
    fechaEntregaReal: "2026-03-01",
    propuestaAceptada: mockSnapshot4Cuotas
  });
  await registrarPagoDirectoAdmin(db, {
    solicitudId: solPromBase,
    montoRecibidoCentavos: 100000,
    monedaRecibida: "ARS",
    medioPago: "TRANSFERENCIA",
    fechaEfectiva: "2026-03-05T10:00:00Z",
    fechaAcreditacion: "2026-03-05T10:00:00Z",
    registradoPor: "admin@test.com",
    origenRegistro: "ADMIN",
    idempotencyKey: "pago_base_previo_" + Date.now()
  });

  const promBase = await registrarPromesaPago(db, {
    solicitudId: solPromBase,
    clienteId: "cli_prom_base",
    fechaPrometida: "2026-04-15",
    montoPrometidoCentavos: 50000,
    creadaPor: "admin@test.com",
    creadaPorRol: "ADMIN"
  });
  assert(promBase.pagadoCalificableCentavosAlCrear === 100000, 
    "ADD-1. Promesa recién creada registra baseline de 100.000 centavos y no considera cumplido dicho pago previo.");

  // ADD-2. Promesa posterior deja a la anterior en SUPERADA
  const promPosterior = await registrarPromesaPago(db, {
    solicitudId: solPromBase,
    clienteId: "cli_prom_base",
    fechaPrometida: "2026-04-20",
    montoPrometidoCentavos: 80000,
    creadaPor: "admin@test.com",
    creadaPorRol: "ADMIN"
  });
  const listPromBase = await obtenerPromesasPagoOperacion(db, solPromBase, "2026-04-10");
  const pBase1Deriv = listPromBase.find(p => p.id === promBase.id);
  assert(pBase1Deriv?.estadoDerivado === "SUPERADA", 
    "ADD-2. Promesa anterior queda con estadoDerivado = SUPERADA al crearse una promesa posterior.");

  // ADD-3. Excepción 409 si falta fecha contractual de Cuota 2
  const solSinCuota2 = {
    id: "sol_sin_cuota2_" + Date.now(),
    fechaEntregaReal: "2026-03-01",
    propuestaAceptada: {
      pricingSchemaVersion: "CANONICAL_V1",
      moneda: "ARS",
      valorTotalContractualCentavos: 200000,
      capitalCompraCentavos: 120000,
      cuotas: [
        { numero: 1, montoTotalCentavos: 100000, capitalCentavos: 60000, servicioNetoGravadoCentavos: 33058, ivaCentavos: 6942 },
        { numero: 2, montoTotalCentavos: 100000, capitalCentavos: 60000, servicioNetoGravadoCentavos: 33058, ivaCentavos: 6942 }
      ]
    }
  };
  let errorCuota2 = false;
  try {
    calcularFechasVencimientoPlan(solSinCuota2, 2);
  } catch (err: any) {
    if (err.message.includes("409:FECHA_CUOTA_2_CONTRACTUAL_FALTANTE")) {
      errorCuota2 = true;
    }
  }
  assert(errorCuota2, "ADD-3. Solicitud sin fecha de Cuota 2 arroja 409:FECHA_CUOTA_2_CONTRACTUAL_FALTANTE.");

  // ADD-4. Excepción 409 si se intenta evaluar Cuota 2 sin evaluar Cuota 1 previamente
  const solSecuencia = "sol_secuencia_" + Date.now();
  await db.collection("solicitudes").doc(solSecuencia).set({
    id: solSecuencia,
    fechaEntregaReal: "2026-03-01",
    propuestaAceptada: mockSnapshot4Cuotas
  });
  const solDataSecuencia = (await db.collection("solicitudes").doc(solSecuencia).get()).data()!;
  let errorSecuencia = false;
  try {
    await evaluarVencimientoCuota(db, solDataSecuencia, 2, "2026-03-31");
  } catch (err: any) {
    if (err.message.includes("409:EVALUACION_PREVIA_REQUERIDA")) {
      errorSecuencia = true;
    }
  }
  assert(errorSecuencia, "ADD-4. Evaluar Cuota 2 sin Cuota 1 previa arroja 409:EVALUACION_PREVIA_REQUERIDA.");

  // ADD-5 a ADD-8. Notificaciones de cumplimiento
  const notif1 = await prepararNotificacionCumplimiento(db, solReg1, "INCUMPLIMIENTO_1", "2026-03-01");
  const notif1Dup = await prepararNotificacionCumplimiento(db, solReg1, "INCUMPLIMIENTO_1", "2026-03-01");
  assert(notif1.id === notif1Dup.id, "ADD-5. Notificación con misma solicitud, tipo y fecha es IDEMPOTENTE.");

  const notif2 = await prepararNotificacionCumplimiento(db, solReg1, "INICIO_CURA", "2026-03-01");
  assert(notif1.id !== notif2.id, "ADD-6. Distintos tipos generan notificaciones distintas.");

  const notif3 = await prepararNotificacionCumplimiento(db, solReg1, "INCUMPLIMIENTO_1", "2026-03-31");
  assert(notif1.id !== notif3.id, "ADD-7. Distintas fechas generan notificaciones distintas.");

  const docNotifCheck = await db.collection("notificaciones_cumplimiento").doc(notif1.id).get();
  assert(docNotifCheck.exists, "ADD-8. Escritura server-side mediante Admin SDK a notificaciones_cumplimiento es EXITOSA.");

  // ADD-9. Ajuste administrativo append-only obtiene valorAnterior server-side
  const evReg1_1 = (await db.collection("evaluaciones_vencimiento").where("solicitudId", "==", solReg1).where("cuotaNumero", "==", 1).get()).docs[0].data();
  const ajusteReal = await registrarAjusteAdministrativo(db, {
    solicitudId: solReg1,
    referenciaEventoId: evReg1_1.id,
    tipoAjuste: "AJUSTE_RESULTADO",
    motivo: "Ajuste por verificación administrativa comprobada",
    valorNuevo: { resultado: "CUMPLIDO_80" },
    adminUid: "admin_oficial@cuentahogar.com"
  });
  assert(ajusteReal.valorAnterior.resultado === "INCUMPLIMIENTO", 
    "ADD-9. Ajuste administrativo obtiene server-side el valorAnterior real del evento sin confiar en el cliente.");

  // ADD-10 y ADD-11. Identidad y Autorización por Rol de Vendedor Afiliado
  const emailVendedorA = ("vendedora_" + Date.now() + "@test.com").toLowerCase();
  const emailVendedorB = ("vendedorb_" + Date.now() + "@test.com").toLowerCase();
  const password = "Password123!";

  await admin.auth().createUser({ email: emailVendedorA, password });
  await admin.auth().createUser({ email: emailVendedorB, password });

  const tokenVendedorA = await getRealIdTokenForUser(emailVendedorA, password);
  const tokenVendedorB = await getRealIdTokenForUser(emailVendedorB, password);

  await db.collection("vendedores").doc("vendedor_A_doc").set({ email: emailVendedorA, activo: true });
  await db.collection("vendedores").doc("vendedor_B_doc").set({ email: emailVendedorB, activo: true });

  const solIdAsigA = "sol_asig_A_" + Date.now();
  await db.collection("solicitudes").doc(solIdAsigA).set({
    id: solIdAsigA,
    afiliadoEmail: emailVendedorA,
    fechaEntregaReal: "2026-03-01",
    propuestaAceptada: mockSnapshot4Cuotas
  });

  const reqVendedA = new NextRequest("http://localhost/api/afiliado/promesas", {
    method: "POST",
    headers: { "authorization": `Bearer ${tokenVendedorA}`, "content-type": "application/json" },
    body: JSON.stringify({ solicitudId: solIdAsigA, fechaPrometida: "2026-04-15" })
  });
  const resVendedA = await postAfiliadoPromesas(reqVendedA);
  assert(resVendedA.status === 200, "ADD-10. Vendedor A autenticado crea promesa en su operación asignada A -> 200 OK");

  const reqVendedB = new NextRequest("http://localhost/api/afiliado/promesas", {
    method: "POST",
    headers: { "authorization": `Bearer ${tokenVendedorB}`, "content-type": "application/json" },
    body: JSON.stringify({ solicitudId: solIdAsigA, fechaPrometida: "2026-04-15" })
  });
  const resVendedB = await postAfiliadoPromesas(reqVendedB);
  assert(resVendedB.status === 403, "ADD-11. Vendedor B en operación asignada a Vendedor A -> Rechazado 403 Forbidden");

  // SEC-1 A SEC-4. Rechazo explícito de escrituras directas Browser/REST en colecciones clave
  const secEvalDenied = await testClientBrowserWriteDenied("evaluaciones_vencimiento", "hack_eval_" + Date.now());
  assert(secEvalDenied, "SEC-1. Escritura directa desde cliente REST a evaluaciones_vencimiento está DENEGADA (allow write: if false).");

  const secPromDenied = await testClientBrowserWriteDenied("promesas_pago", "hack_prom_" + Date.now());
  assert(secPromDenied, "SEC-2. Escritura directa desde cliente REST a promesas_pago está DENEGADA (allow write: if false).");

  const secAjustesDenied = await testClientBrowserWriteDenied("ajustes_vencimiento", "hack_ajuste_" + Date.now());
  assert(secAjustesDenied, "SEC-3. Escritura directa desde cliente REST a ajustes_vencimiento está DENEGADA (allow write: if false).");

  const secNotifDenied = await testClientBrowserWriteDenied("notificaciones_cumplimiento", "hack_notif_" + Date.now());
  assert(secNotifDenied, "SEC-4. Escritura directa desde cliente REST a notificaciones_cumplimiento está DENEGADA (allow write: if false).");

  console.log(`\n3B.3 MICROCierre REGRESIÓN ACUMULATIVA SUMMARY: ${passed}/${total} checks passed cleanly.`);
  if (passed !== total) {
    process.exit(1);
  }
}

runTests3B3();