process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";
process.env.FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:9099";
process.env.GCLOUD_PROJECT = "demo-cuenta-hogar";

import { admin } from "../src/lib/firebaseAdmin";
import { registrarPagoDirectoAdmin } from "../src/lib/ledgerEngine";
import {
  registrarConfiguracionComisionVendedor,
  crearSnapshotComisionOperacion,
  procesarComisionPago,
  reversarComisionPago,
  obtenerEstadoComisionesOperacion
} from "../src/lib/commissionsEngine";

async function testClientBrowserWriteDenied(collectionName: string, docId: string): Promise<boolean> {
  const url = `http://127.0.0.1:8080/v1/projects/demo-cuenta-hogar/databases/(default)/documents/${collectionName}/${docId}`;
  const res = await fetch(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fields: { testField: { stringValue: "unauthorized_browser_write" } } })
  });
  return res.status === 403;
}

async function runTests3B4B() {
  console.log("=== FIREBASE FIRESTORE & AUTH EMULATOR SUITE 3B.4B (GATE FINAL DEFINITIVO) ===");
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

  const vendIdA = "vend_A_" + Date.now();
  const vendEmailA = "vendedorA@test.com";
  await registrarConfiguracionComisionVendedor(db, {
    vendedorAfiliadoId: vendIdA,
    vendedorAfiliadoEmail: vendEmailA,
    porcentajeComisionBasisPoints: 800,
    vigenteDesde: "2026-01-01T00:00:00Z",
    motivoCambio: "Configuración inicial 8%",
    actualizadoPorAdminUid: "admin_test_uid"
  });

  const vendIdB = "vend_B_" + Date.now();
  const vendEmailB = "vendedorB@test.com";
  await registrarConfiguracionComisionVendedor(db, {
    vendedorAfiliadoId: vendIdB,
    vendedorAfiliadoEmail: vendEmailB,
    porcentajeComisionBasisPoints: 1000,
    vigenteDesde: "2026-01-01T00:00:00Z",
    motivoCambio: "Configuración inicial 10%",
    actualizadoPorAdminUid: "admin_test_uid"
  });

  // 1. REGLAS CORE DE COMISIONES (COM-1 A COM-4)
  const solCom1A = "sol_com1A_" + Date.now();
  await db.collection("solicitudes").doc(solCom1A).set({
    id: solCom1A,
    clienteId: "cli_com1A",
    vendedorAfiliadoId: vendIdA,
    afiliadoEmail: vendEmailA,
    pricingSchemaVersion: "CANONICAL_V1",
    fechaEntregaReal: "2026-03-01",
    propuestaAceptada: { ...mockSnapshot4Cuotas, vendedorAfiliadoId: vendIdA }
  });
  await crearSnapshotComisionOperacion(db, {
    solicitudId: solCom1A,
    vendedorAfiliadoId: vendIdA,
    vendedorAfiliadoEmail: vendEmailA,
    tipoOperacion: "MANDATO_COMPRA",
    fechaCongelamiento: "2026-03-01T10:00:00Z"
  });

  const solCom1B = "sol_com1B_" + Date.now();
  await db.collection("solicitudes").doc(solCom1B).set({
    id: solCom1B,
    clienteId: "cli_com1B",
    vendedorAfiliadoId: vendIdB,
    afiliadoEmail: vendEmailB,
    pricingSchemaVersion: "CANONICAL_V1",
    fechaEntregaReal: "2026-03-01",
    propuestaAceptada: { ...mockSnapshot4Cuotas, vendedorAfiliadoId: vendIdB }
  });
  await crearSnapshotComisionOperacion(db, {
    solicitudId: solCom1B,
    vendedorAfiliadoId: vendIdB,
    vendedorAfiliadoEmail: vendEmailB,
    tipoOperacion: "MANDATO_COMPRA",
    fechaCongelamiento: "2026-03-01T10:00:00Z"
  });

  await registrarPagoDirectoAdmin(db, {
    solicitudId: solCom1A,
    montoRecibidoCentavos: 100000,
    monedaRecibida: "ARS",
    medioPago: "TRANSFERENCIA",
    fechaEfectiva: "2026-03-05T10:00:00Z",
    fechaAcreditacion: "2026-03-05T10:00:00Z",
    registradoPor: "admin@test.com",
    origenRegistro: "ADMIN",
    idempotencyKey: "pay_com1A_" + Date.now()
  });

  await registrarPagoDirectoAdmin(db, {
    solicitudId: solCom1B,
    montoRecibidoCentavos: 100000,
    monedaRecibida: "ARS",
    medioPago: "TRANSFERENCIA",
    fechaEfectiva: "2026-03-05T10:00:00Z",
    fechaAcreditacion: "2026-03-05T10:00:00Z",
    registradoPor: "admin@test.com",
    origenRegistro: "ADMIN",
    idempotencyKey: "pay_com1B_" + Date.now()
  });

  const estadoCom1A = await obtenerEstadoComisionesOperacion(db, solCom1A);
  const estadoCom1B = await obtenerEstadoComisionesOperacion(db, solCom1B);
  assert(estadoCom1A.totalComisionDevengadaCentavos === 8000 && estadoCom1B.totalComisionDevengadaCentavos === 10000,
    "COM-1. Vendedor A (8%) y Vendedor B (10%) producen distintas comisiones sobre 100.000 centavos (8.000 vs 10.000 centavos).");

  await registrarConfiguracionComisionVendedor(db, {
    vendedorAfiliadoId: vendIdA,
    vendedorAfiliadoEmail: vendEmailA,
    porcentajeComisionBasisPoints: 900,
    vigenteDesde: "2026-04-01T00:00:00Z",
    motivoCambio: "Aumento a 9%",
    actualizadoPorAdminUid: "admin_test_uid"
  });

  const estadoCom1A_post = await obtenerEstadoComisionesOperacion(db, solCom1A);
  assert(estadoCom1A_post.totalComisionDevengadaCentavos === 8000,
    "COM-2. Cambio posterior de comisión de Vendedor A a 9% NO modifica el devengamiento de la operación previa (conserva 8.000 centavos).");

  const solCom3 = "sol_com3_" + Date.now();
  await db.collection("solicitudes").doc(solCom3).set({
    id: solCom3,
    clienteId: "cli_com3",
    vendedorAfiliadoId: vendIdA,
    afiliadoEmail: vendEmailA,
    pricingSchemaVersion: "CANONICAL_V1",
    fechaEntregaReal: "2026-04-05",
    propuestaAceptada: { ...mockSnapshot4Cuotas, vendedorAfiliadoId: vendIdA }
  });
  await crearSnapshotComisionOperacion(db, {
    solicitudId: solCom3,
    vendedorAfiliadoId: vendIdA,
    vendedorAfiliadoEmail: vendEmailA,
    tipoOperacion: "MANDATO_COMPRA",
    fechaCongelamiento: "2026-04-05T10:00:00Z"
  });

  await registrarPagoDirectoAdmin(db, {
    solicitudId: solCom3,
    montoRecibidoCentavos: 100000,
    monedaRecibida: "ARS",
    medioPago: "TRANSFERENCIA",
    fechaEfectiva: "2026-04-10T10:00:00Z",
    fechaAcreditacion: "2026-04-10T10:00:00Z",
    registradoPor: "admin@test.com",
    origenRegistro: "ADMIN",
    idempotencyKey: "pay_com3_" + Date.now()
  });

  const estadoCom3 = await obtenerEstadoComisionesOperacion(db, solCom3);
  assert(estadoCom3.totalComisionDevengadaCentavos === 9000,
    "COM-3. Nueva operación de Vendedor A posterior al cambio aplica el nuevo porcentaje (9% -> 9.000 centavos).");

  const solCom4 = "sol_com4_" + Date.now();
  await db.collection("solicitudes").doc(solCom4).set({
    id: solCom4,
    clienteId: "cli_com4",
    vendedorAfiliadoId: vendIdA,
    afiliadoEmail: vendEmailA,
    pricingSchemaVersion: "CANONICAL_V1",
    propuestaAceptada: { ...mockSnapshot4Cuotas, vendedorAfiliadoId: vendIdA }
  });

  await crearSnapshotComisionOperacion(db, {
    solicitudId: solCom4,
    vendedorAfiliadoId: vendIdA,
    vendedorAfiliadoEmail: vendEmailA,
    tipoOperacion: "MANDATO_COMPRA",
    esOverrideAdmin: true,
    porcentajeOverrideBasisPoints: 1200,
    motivoOverride: "Acuerdo especial de bonificación",
    adminUidOverride: "admin_gerente@cuentahogar.com",
    fechaCongelamiento: "2026-04-05T10:00:00Z"
  });

  await registrarPagoDirectoAdmin(db, {
    solicitudId: solCom4,
    montoRecibidoCentavos: 100000,
    monedaRecibida: "ARS",
    medioPago: "TRANSFERENCIA",
    fechaEfectiva: "2026-04-10T10:00:00Z",
    fechaAcreditacion: "2026-04-10T10:00:00Z",
    registradoPor: "admin@test.com",
    origenRegistro: "ADMIN",
    idempotencyKey: "pay_com4_" + Date.now()
  });

  const estadoCom4 = await obtenerEstadoComisionesOperacion(db, solCom4);
  assert(estadoCom4.totalComisionDevengadaCentavos === 12000,
    "COM-4. Override administrativo (12%) se respeta sobre el estándar del vendedor y genera 12.000 centavos.");

  // 2. GARANTÍAS TÉCNICAS DEL GATE FINAL (GATE-1 A GATE-7)
  const solN9 = "sol_N9_" + Date.now();
  await db.collection("solicitudes").doc(solN9).set({ id: solN9, pricingSchemaVersion: "CANONICAL_V1" });
  await crearSnapshotComisionOperacion(db, {
    solicitudId: solN9,
    vendedorAfiliadoId: vendIdA,
    vendedorAfiliadoEmail: vendEmailA,
    tipoOperacion: "MANDATO_COMPRA",
    fechaCongelamiento: "2026-03-01T00:00:00Z"
  });
  await db.collection("ledger_movimientos").doc("mov_conc_N9").set({
    id: "mov_conc_N9",
    solicitudId: solN9,
    tipo: "PAGO",
    montoAplicablePlanCentavos: 100000,
    estado: "ACTIVO"
  });

  const [resN9_A, resN9_B] = await Promise.all([
    procesarComisionPago(db, { solicitudId: solN9, ledgerPagoMovimientoId: "mov_conc_N9", registradoPor: "admin-A@test.com" }),
    procesarComisionPago(db, { solicitudId: solN9, ledgerPagoMovimientoId: "mov_conc_N9", registradoPor: "admin-B@test.com" })
  ]);

  const docsN9 = await db.collection("ledger_comisiones_movimientos").where("solicitudId", "==", solN9).get();
  const docPersistidoN9 = docsN9.docs[0].data();
  assert(
    docsN9.size === 1 &&
    resN9_A?.id === resN9_B?.id &&
    resN9_A?.registradoPor === resN9_B?.registradoPor &&
    docPersistidoN9.registradoPor === resN9_A?.registradoPor,
    "GATE-1. Concurrencia de devengamiento con metadatos distintos genera exactamente 1 documento canónico inmutable sin sobrescribir registradoPor ni createdAt."
  );

  const solRevConc = "sol_rev_conc_" + Date.now();
  await db.collection("solicitudes").doc(solRevConc).set({ id: solRevConc, pricingSchemaVersion: "CANONICAL_V1" });
  await crearSnapshotComisionOperacion(db, {
    solicitudId: solRevConc,
    vendedorAfiliadoId: vendIdA,
    vendedorAfiliadoEmail: vendEmailA,
    tipoOperacion: "MANDATO_COMPRA",
    fechaCongelamiento: "2026-03-01T00:00:00Z"
  });
  await db.collection("ledger_movimientos").doc("mov_pago_rev_conc").set({
    id: "mov_pago_rev_conc",
    solicitudId: solRevConc,
    tipo: "PAGO",
    montoAplicablePlanCentavos: 100000,
    estado: "ACTIVO"
  });
  await db.collection("ledger_movimientos").doc("mov_reversa_ledger_conc").set({
    id: "mov_reversa_ledger_conc",
    solicitudId: solRevConc,
    tipo: "REVERSA",
    movimientoOriginalId: "mov_pago_rev_conc",
    montoAplicablePlanCentavos: -100000,
    estado: "ACTIVO"
  });
  await procesarComisionPago(db, { solicitudId: solRevConc, ledgerPagoMovimientoId: "mov_pago_rev_conc", registradoPor: "admin@test.com" });
  await db.collection("ledger_movimientos").doc("mov_pago_rev_conc").update({ estado: "REVERSADO" });

  const [revA, revB] = await Promise.all([
    reversarComisionPago(db, { solicitudId: solRevConc, ledgerPagoMovimientoId: "mov_pago_rev_conc", motivo: "Motivo A", adminEmail: "adminA@test.com" }),
    reversarComisionPago(db, { solicitudId: solRevConc, ledgerPagoMovimientoId: "mov_pago_rev_conc", motivo: "Motivo B", adminEmail: "adminB@test.com" })
  ]);

  const docsRevConc = await db.collection("ledger_comisiones_movimientos").where("solicitudId", "==", solRevConc).where("tipo", "==", "REVERSA_COMISION").get();
  const docPersistidoRev = docsRevConc.docs[0].data();
  assert(
    docsRevConc.size === 1 &&
    revA?.id === revB?.id &&
    revA?.registradoPor === revB?.registradoPor &&
    docPersistidoRev.registradoPor === revA?.registradoPor &&
    docPersistidoRev.motivo === revA?.motivo,
    "GATE-2. Invocación concurrente de reversa de comisión con distintos adminEmail y motivos genera 1 solo registro inmutable."
  );

  const solRevSinLedger = "sol_rev_sin_ledger_" + Date.now();
  await db.collection("solicitudes").doc(solRevSinLedger).set({ id: solRevSinLedger, pricingSchemaVersion: "CANONICAL_V1" });
  await crearSnapshotComisionOperacion(db, {
    solicitudId: solRevSinLedger,
    vendedorAfiliadoId: vendIdA,
    vendedorAfiliadoEmail: vendEmailA,
    tipoOperacion: "MANDATO_COMPRA",
    fechaCongelamiento: "2026-03-01T00:00:00Z"
  });
  await db.collection("ledger_movimientos").doc("mov_pago_sin_reversa").set({
    id: "mov_pago_sin_reversa",
    solicitudId: solRevSinLedger,
    tipo: "PAGO",
    montoAplicablePlanCentavos: 100000,
    estado: "ACTIVO"
  });
  await procesarComisionPago(db, { solicitudId: solRevSinLedger, ledgerPagoMovimientoId: "mov_pago_sin_reversa", registradoPor: "admin@test.com" });

  let errRevSinLedger = "";
  try {
    await reversarComisionPago(db, {
      solicitudId: solRevSinLedger,
      ledgerPagoMovimientoId: "mov_pago_sin_reversa",
      motivo: "Intento sin reversa en ledger",
      adminEmail: "admin@test.com"
    });
  } catch (err: any) {
    errRevSinLedger = err.message || "";
  }
  assert(errRevSinLedger.includes("400:REVERSA_LEDGER_NO_ENCONTRADA"),
    "GATE-3. Intentar reversar una comisión sin la correspondiente reversa de pago en el Ledger es rechazado con 400:REVERSA_LEDGER_NO_ENCONTRADA.");

  let errTypoSpace = "";
  try {
    await crearSnapshotComisionOperacion(db, {
      solicitudId: "sol_typo_1_" + Date.now(),
      vendedorAfiliadoId: vendIdA,
      tipoOperacion: "ENVIO_LOW_ COST",
      fechaCongelamiento: "2026-03-01T00:00:00Z"
    });
  } catch (err: any) {
    errTypoSpace = err.message || "";
  }

  let errOtro = "";
  try {
    await crearSnapshotComisionOperacion(db, {
      solicitudId: "sol_typo_2_" + Date.now(),
      vendedorAfiliadoId: vendIdA,
      tipoOperacion: "OTRO",
      fechaCongelamiento: "2026-03-01T00:00:00Z"
    });
  } catch (err: any) {
    errOtro = err.message || "";
  }

  assert(errTypoSpace.includes("409:TIPO_OPERACION_NO_SOPORTADO") && errOtro.includes("409:TIPO_OPERACION_NO_SOPORTADO"),
    "GATE-4. Tipos de operación no soportados (ENVIO_LOW_ COST, OTRO) son rechazados con 409:TIPO_OPERACION_NO_SOPORTADO.");

  const solOverride0 = "sol_ov_0_" + Date.now();
  const snapOv0 = await crearSnapshotComisionOperacion(db, {
    solicitudId: solOverride0,
    vendedorAfiliadoId: vendIdA,
    vendedorAfiliadoEmail: vendEmailA,
    tipoOperacion: "MANDATO_COMPRA",
    esOverrideAdmin: true,
    porcentajeOverrideBasisPoints: 0,
    motivoOverride: "Override explicito a 0%",
    adminUidOverride: "admin@test.com",
    fechaCongelamiento: "2026-03-01T00:00:00Z"
  });

  assert(
    snapOv0.porcentajeAplicadoBasisPoints === 0 &&
    snapOv0.esOverrideAdmin === true &&
    snapOv0.esComisionable === true,
    "GATE-5. Override explícito de 0 bps conserva porcentajeAplicadoBasisPoints === 0 sin convertirse en null ni perder override."
  );

  const vendIdConcCfg = "vend_conc_cfg_" + Date.now();
  await registrarConfiguracionComisionVendedor(db, {
    vendedorAfiliadoId: vendIdConcCfg,
    vendedorAfiliadoEmail: "vend_conc@test.com",
    porcentajeComisionBasisPoints: 800,
    vigenteDesde: "2026-01-01T00:00:00Z",
    motivoCambio: "Inicial",
    actualizadoPorAdminUid: "admin@test.com"
  });

  let errCfgConc = "";
  try {
    await Promise.all([
      registrarConfiguracionComisionVendedor(db, {
        vendedorAfiliadoId: vendIdConcCfg,
        vendedorAfiliadoEmail: "vend_conc@test.com",
        porcentajeComisionBasisPoints: 900,
        vigenteDesde: "2026-06-01T10:00:00Z",
        motivoCambio: "Aumento A",
        actualizadoPorAdminUid: "adminA@test.com"
      }),
      registrarConfiguracionComisionVendedor(db, {
        vendedorAfiliadoId: vendIdConcCfg,
        vendedorAfiliadoEmail: "vend_conc@test.com",
        porcentajeComisionBasisPoints: 1000,
        vigenteDesde: "2026-06-01T10:00:00Z",
        motivoCambio: "Aumento B",
        actualizadoPorAdminUid: "adminB@test.com"
      })
    ]);
  } catch (err: any) {
    errCfgConc = err.message || "";
  }

  const cfgsVend = await db.collection("vendedores_configuraciones_comision").where("vendedorAfiliadoId", "==", vendIdConcCfg).get();
  assert(
    cfgsVend.size === 2 && errCfgConc.includes("409:VIGENCIA_COMISION_RETROACTIVA_NO_PERMITIDA"),
    "GATE-6. Intentos concurrentes de registrar configuraciones con la misma fecha de vigencia son serializados atómicamente evitando historia no lineal."
  );

  let errFechaFaltante = "";
  try {
    await crearSnapshotComisionOperacion(db, {
      solicitudId: "sol_sin_fecha_" + Date.now(),
      vendedorAfiliadoId: vendIdA,
      tipoOperacion: "MANDATO_COMPRA",
      fechaCongelamiento: null
    });
  } catch (err: any) {
    errFechaFaltante = err.message || "";
  }
  assert(errFechaFaltante.includes("400:FECHA_CONGELAMIENTO_REQUERIDA"),
    "GATE-7. Invocación de crearSnapshotComisionOperacion sin fechaCongelamiento explícita falla con 400:FECHA_CONGELAMIENTO_REQUERIDA.");

  // 3. FIRESTORE SECURITY RULES (PROHIBICIÓN BROWSER CLIENT)
  const ruleDenied1 = await testClientBrowserWriteDenied("vendedores_configuraciones_comision", "doc_rules_1");
  assert(ruleDenied1, "RULES-1. Escritura directa Browser a vendedores_configuraciones_comision rechazada con HTTP 403.");

  const ruleDenied2 = await testClientBrowserWriteDenied("snapshots_comision_operaciones", "doc_rules_2");
  assert(ruleDenied2, "RULES-2. Escritura directa Browser a snapshots_comision_operaciones rechazada con HTTP 403.");

  const ruleDenied3 = await testClientBrowserWriteDenied("ledger_comisiones_movimientos", "doc_rules_3");
  assert(ruleDenied3, "RULES-3. Escritura directa Browser a ledger_comisiones_movimientos rechazada con HTTP 403.");

  const ruleDenied4 = await testClientBrowserWriteDenied("liquidaciones_comision", "doc_rules_4");
  assert(ruleDenied4, "RULES-4. Escritura directa Browser a liquidaciones_comision rechazada con HTTP 403.");

  console.log(`\n3B.4B GATE FINAL DEFINITIVO SUMMARY: ${passed}/${total} checks passed cleanly.`);
  if (passed !== total) {
    process.exitCode = 1;
  }
}

runTests3B4B().catch(err => {
  console.error("FATAL ERROR IN TEST SUITE 3B.4B:", err);
  process.exitCode = 1;
});
