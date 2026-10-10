process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";
process.env.FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:9099";
process.env.GCLOUD_PROJECT = "demo-cuenta-hogar";

import { admin } from "../src/lib/firebaseAdmin";
import { registrarPagoDirectoAdmin, validarReceptorEfectivoAutorizado } from "../src/lib/ledgerEngine";
import {
  registrarConfiguracionComisionVendedor,
  crearSnapshotComisionOperacion,
  reversarComisionPago,
  obtenerSaldoComisionesVendedor
} from "../src/lib/commissionsEngine";
import {
  obtenerCuentaCorrienteVendedor,
  obtenerSaldoDisponibleLiquidacion,
  obtenerLedgerCustodiaEfectivo,
  construirFifoFuentesComision,
  crearBorradorLiquidacion,
  confirmarLiquidacion,
  evaluarIncidenciasLiquidacion,
  anularLiquidacion,
  pagarLiquidacion,
  registrarAjusteAdministrativoComisiones,
  registrarRendicionEfectivo,
  registrarDevolucionFisicaCliente,
  registrarAjusteCustodiaEfectivo,
  actualizarVisibilidadPanelVendedor,
  resolverVendedorPorAuthUid,
  esMontoCentavosValido
} from "../src/lib/settlementsEngine";
import { GET as handlerCuentaCorriente } from "../src/app/api/afiliado/cuenta-corriente/route";

async function exchangeCustomTokenForIdToken(customToken: string): Promise<string> {
  const url = "http://127.0.0.1:9099/www.googleapis.com/identitytoolkit/v3/relyingparty/verifyCustomToken?key=fake-key";
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token: customToken, returnSecureToken: true })
  });
  const data = (await res.json()) as { idToken?: string };
  if (!res.ok || !data.idToken) {
    throw new Error(`Error al intercambiar customToken en Auth Emulator: ${JSON.stringify(data)}`);
  }
  return data.idToken;
}

async function testClientBrowserWriteDenied(collectionName: string, docId: string, idToken?: string): Promise<boolean> {
  const url = `http://127.0.0.1:8080/v1/projects/demo-cuenta-hogar/databases/(default)/documents/${collectionName}/${docId}`;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (idToken) {
    headers["Authorization"] = `Bearer ${idToken}`;
  }
  const res = await fetch(url, {
    method: "PATCH",
    headers,
    body: JSON.stringify({ fields: { testField: { stringValue: "unauthorized_browser_write" } } })
  });
  return res.status === 403;
}

async function runTests3B5B() {
  console.log("=== FIREBASE FIRESTORE & AUTH EMULATOR SUITE 3B.5B (GATE FINAL MÍNIMO 3B.5B) ===");
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

  // Setup Vendedores & Receptores
  const v1Id = "vend_3b5b_1";
  const v1Email = "vend1@cuentahogar.com";
  const v1AuthUid = "uid_vend_1";

  const v2Id = "vend_3b5b_2";
  const v2Email = "vend2@cuentahogar.com";
  const v2AuthUid = "uid_vend_2";

  // Setup Documentos Vendedor
  await db.collection("vendedores").doc(v1Id).set({
    nombre: "Vendedor 1 Test",
    email: v1Email,
    authUid: v1AuthUid,
    mostrarCuentaCorrienteEnPanel: false,
    activo: true
  });

  await db.collection("vendedores").doc(v2Id).set({
    nombre: "Vendedor 2 Test",
    email: v2Email,
    authUid: v2AuthUid,
    mostrarCuentaCorrienteEnPanel: true,
    activo: true
  });

  // Setup Receptor Autorizado para Vendedor 1
  await db.collection("receptores_efectivo_autorizados").doc("rec_vendedor_1").set({
    nombre: "Caja Vendedor 1",
    tipoReceptor: "VENDEDOR_AFILIADO",
    vendedorAfiliadoId: v1Id,
    activo: true
  });

  // Setup Receptor sin vinculo para prueba 409
  await db.collection("receptores_efectivo_autorizados").doc("rec_sin_vinculo").set({
    nombre: "Receptor Incompleto",
    tipoReceptor: "VENDEDOR_AFILIADO",
    activo: true
  });

  // Setup Configuración de Comisión Vendedor 1 (10% = 1000 bps)
  await registrarConfiguracionComisionVendedor(db, {
    vendedorAfiliadoId: v1Id,
    vendedorAfiliadoEmail: v1Email,
    porcentajeComisionBasisPoints: 1000,
    vigenteDesde: "2026-01-01T00:00:00Z",
    motivoCambio: "Alta Inicial 10%",
    actualizadoPorAdminUid: "admin_test"
  });

  // Setup Operación 1 (400.000 centavos)
  const solId1 = "sol_3b5b_op1";
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

  await db.collection("solicitudes").doc(solId1).set({
    id: solId1,
    solicitudId: solId1,
    clienteId: "cli_1",
    clienteNombre: "Juan Perez",
    productoNombre: "Heladera No Frost",
    afiliadoEmail: v1Email,
    vendedorAfiliadoId: v1Id,
    pricingSchemaVersion: "CANONICAL_V1",
    fechaFormalizacion: "2026-02-01T10:00:00Z",
    propuestaAceptada: { ...mockSnapshot4Cuotas, vendedorAfiliadoId: v1Id }
  });

  await crearSnapshotComisionOperacion(db, {
    solicitudId: solId1,
    vendedorAfiliadoId: v1Id,
    tipoOperacion: "MANDATO_COMPRA",
    fechaCongelamiento: "2026-02-01T10:00:00Z"
  });

  // --- SECCIÓN 1: VALIDACIÓN MONETARIA Y AUDITORÍA ---
  assert(esMontoCentavosValido(1000) === true, "1. esMontoCentavosValido(1000) es true.");
  assert(esMontoCentavosValido(100.5) === false, "2. esMontoCentavosValido(100.5) es false por decimal.");
  assert(esMontoCentavosValido(NaN) === false, "3. esMontoCentavosValido(NaN) es false.");
  assert(esMontoCentavosValido(Infinity) === false, "4. esMontoCentavosValido(Infinity) es false.");
  assert(esMontoCentavosValido(-500, false) === false, "5. esMontoCentavosValido(-500, false) es false sin permitir negativo.");
  assert(esMontoCentavosValido(-500, true) === true, "6. esMontoCentavosValido(-500, true) es true cuando se permite negativo.");

  // Rechazo de montos no válidos en crearBorradorLiquidacion
  let errNaN = "";
  try {
    await crearBorradorLiquidacion(db, {
      vendedorAfiliadoId: v1Id,
      vendedorAfiliadoEmail: v1Email,
      montoSolicitadoCentavos: 100.5 as unknown as number,
      creadoPorAdminUid: "admin_test",
      idempotencyKey: "borrador_invalid_monto"
    });
  } catch (err: unknown) { errNaN = (err as Error).message || ""; }
  assert(errNaN.includes("400:MONTO_LIQUIDACION_INVALIDO"), "7. crearBorradorLiquidacion rechaza monto decimal con 400:MONTO_LIQUIDACION_INVALIDO.");

  // Single Source para receptores de efectivo y vinculo obligatorio
  const valRecOk = await validarReceptorEfectivoAutorizado(db, "rec_vendedor_1");
  assert(Boolean(valRecOk.esAutorizado) && valRecOk.vendedorAfiliadoId === v1Id, "8. Receptor autorizado retorna esAutorizado=true y vendedorAfiliadoId vinculada.");

  let errVinculo = "";
  try {
    await validarReceptorEfectivoAutorizado(db, "rec_sin_vinculo");
  } catch (err: unknown) { errVinculo = (err as Error).message || ""; }
  assert(errVinculo.includes("409:RECEPTOR_VENDEDOR_SIN_VINCULO"), "9. Receptor sin vendedorAfiliadoId lanza 409:RECEPTOR_VENDEDOR_SIN_VINCULO.");

  const valRecInexistente = await validarReceptorEfectivoAutorizado(db, "rec_inexistente");
  assert(!valRecInexistente.esAutorizado, "10. Receptor inexistente retorna esAutorizado=false.");

  // --- SECCIÓN 2: MOVIMIENTOS Y CUENTA CORRIENTE ---
  const resPago1 = await registrarPagoDirectoAdmin(db, {
    solicitudId: solId1,
    montoRecibidoCentavos: 100000,
    monedaRecibida: "ARS",
    medioPago: "TRANSFERENCIA",
    fechaAcreditacion: "2026-02-15",
    fechaEfectiva: "2026-02-15",
    registradoPor: "admin_test",
    origenRegistro: "ADMIN",
    idempotencyKey: "pago_3b5b_1"
  });

  const cc1 = await obtenerCuentaCorrienteVendedor(db, v1Id);
  assert(cc1.saldoCuentaCorrienteCentavos === 10000 && cc1.totalDevengadoCentavos === 10000,
    "11. Devengamiento por cobro produce saldoCuentaCorrienteCentavos === 10.000.");

  const aggCom = await obtenerSaldoComisionesVendedor(db, v1Id);
  assert(aggCom.saldoComisionesCentavos === 10000, "12. Agregador obtenerSaldoComisionesVendedor reporta saldoComisionesCentavos === 10.000.");

  // Reversa de comisión
  await db.collection("ledger_movimientos").doc("mov_rev_ledger_1").set({
    id: "mov_rev_ledger_1",
    solicitudId: solId1,
    tipo: "REVERSA",
    movimientoOriginalId: resPago1.movimiento.id,
    montoAplicablePlanCentavos: -100000,
    estado: "ACTIVO"
  });
  await db.collection("ledger_movimientos").doc(resPago1.movimiento.id).update({ estado: "REVERSADO" });

  await reversarComisionPago(db, {
    solicitudId: solId1,
    ledgerPagoMovimientoId: resPago1.movimiento.id,
    motivo: "Error de Acreditación",
    adminEmail: "admin_test",
  });

  const cc2 = await obtenerCuentaCorrienteVendedor(db, v1Id);
  assert(cc2.saldoCuentaCorrienteCentavos === 0, "13. Reversa de comisión lleva el saldo a 0.");

  // Saldo negativo por ajuste
  await registrarAjusteAdministrativoComisiones(db, {
    vendedorAfiliadoId: v1Id,
    vendedorAfiliadoEmail: v1Email,
    montoComisionCentavos: -3000,
    motivo: "Descuento por cargo administrativo",
    adminUid: "admin_test",
    idempotencyKey: "ajuste_neg_1"
  });

  const cc3 = await obtenerCuentaCorrienteVendedor(db, v1Id);
  assert(cc3.saldoCuentaCorrienteCentavos === -3000, "14. Saldo negativo: Ajuste administrativo negativo permite -3.000 sin truncar a cero.");

  // Absorción natural del negativo
  await registrarAjusteAdministrativoComisiones(db, {
    vendedorAfiliadoId: v1Id,
    vendedorAfiliadoEmail: v1Email,
    montoComisionCentavos: 10000,
    motivo: "Crédito extraordinario",
    adminUid: "admin_test",
    idempotencyKey: "ajuste_pos_1"
  });

  const cc4 = await obtenerCuentaCorrienteVendedor(db, v1Id);
  assert(cc4.saldoCuentaCorrienteCentavos === 7000, "15. Absorción natural: Ajuste positivo de 10.000 sobre -3.000 eleva el saldo a 7.000.");

  const fuentesFifo = await construirFifoFuentesComision(db, v1Id);
  assert(fuentesFifo.length === 1 && fuentesFifo[0].remanenteDisponibleCentavos === 10000,
    "16. Ajuste positivo participa de FIFO como fuente de 10.000 centavos.");

  // --- SECCIÓN 3: CICLO DE VIDA DE LIQUIDACIONES ---
  const borrador1 = await crearBorradorLiquidacion(db, {
    vendedorAfiliadoId: v1Id,
    vendedorAfiliadoEmail: v1Email,
    montoSolicitadoCentavos: 4000,
    creadoPorAdminUid: "admin_test",
    idempotencyKey: "borrador_1"
  });

  assert(borrador1.id.startsWith("borrador_"), "17. Borrador generado usa ID determinista con prefijo borrador_.");

  // Intento de anular BORRADOR -> debe fallar
  let errAnularBorrador = "";
  try {
    await anularLiquidacion(db, {
      liquidacionId: borrador1.id,
      motivoAnulacion: "Intento invalido",
      adminUid: "admin_test",
      idempotencyKey: "anular_borrador_invalid"
    });
  } catch (err: unknown) { errAnularBorrador = (err as Error).message || ""; }
  assert(errAnularBorrador.includes("400:TRANSICION_ESTADO_INVALIDA"), "18. anularLiquidacion rechaza estado BORRADOR con 400:TRANSICION_ESTADO_INVALIDA.");

  const dispAnteConfirmar = await obtenerSaldoDisponibleLiquidacion(db, v1Id);
  assert(dispAnteConfirmar === 7000, "19. BORRADOR no reserva: Saldo disponible continúa siendo 7.000.");

  const conf1 = await confirmarLiquidacion(db, {
    liquidacionId: borrador1.id,
    adminUid: "admin_test",
    idempotencyKey: "confirm_1"
  });

  const dispPostConfirmar = await obtenerSaldoDisponibleLiquidacion(db, v1Id);
  assert(conf1.estado === "CONFIRMADA" && dispPostConfirmar === 3000, "20. CONFIRMADA reserva 4.000 y reduce saldo disponible a 3.000.");

  const itemsConf1 = await db.collection("liquidaciones_comision").doc(conf1.id).collection("items").get();
  assert(itemsConf1.size === 1 && itemsConf1.docs[0].data().montoAsignadoCentavos === 4000, "21. FIFO asigna parcialmente 4.000 centavos.");

  // ANULADA de CONFIRMADA -> libera
  const anud1 = await anularLiquidacion(db, {
    liquidacionId: conf1.id,
    motivoAnulacion: "Error en cálculo de período",
    adminUid: "admin_test",
    idempotencyKey: "anular_1"
  });

  const dispPostAnular = await obtenerSaldoDisponibleLiquidacion(db, v1Id);
  assert(anud1.estado === "ANULADA" && dispPostAnular === 7000, "22. ANULADA de CONFIRMADA libera reserva y devuelve disponible a 7.000.");

  // PAGO DE LIQUIDACION
  const borrador2 = await crearBorradorLiquidacion(db, {
    vendedorAfiliadoId: v1Id,
    vendedorAfiliadoEmail: v1Email,
    montoSolicitadoCentavos: 5000,
    creadoPorAdminUid: "admin_test",
    idempotencyKey: "borrador_2"
  });

  const conf2 = await confirmarLiquidacion(db, {
    liquidacionId: borrador2.id,
    adminUid: "admin_test",
    idempotencyKey: "confirm_2"
  });

  // Pago con componente inválido (formaPago desconocida)
  let errFormaInv = "";
  try {
    await pagarLiquidacion(db, {
      liquidacionId: conf2.id,
      componentesPago: [{ formaPago: "BITCOIN" as unknown as "TRANSFERENCIA", montoCentavos: 5000 }],
      adminUid: "admin_test",
      idempotencyKey: "pagar_invalid_forma"
    });
  } catch (err: unknown) { errFormaInv = (err as Error).message || ""; }
  assert(errFormaInv.includes("400:COMPONENTE_PAGO_INVALIDO"), "23. pagarLiquidacion rechaza formaPago no permitida con 400:COMPONENTE_PAGO_INVALIDO.");

  const pagada2 = await pagarLiquidacion(db, {
    liquidacionId: conf2.id,
    componentesPago: [{ formaPago: "TRANSFERENCIA", montoCentavos: 5000, referenciaBancaria: "TX-999" }],
    adminUid: "admin_test",
    idempotencyKey: "pagar_2"
  });

  const ccPostPago = await obtenerCuentaCorrienteVendedor(db, v1Id);
  assert(pagada2.estado === "PAGADA" && ccPostPago.saldoCuentaCorrienteCentavos === 2000,
    "24. PAGADA emite PAGO_LIQUIDACION y deduce el saldo a 2.000 centavos.");

  const aggPostPago = await obtenerSaldoComisionesVendedor(db, v1Id);
  assert(aggPostPago.saldoComisionesCentavos === 2000, "25. Agregador comisiones calcula 2.000 deduciendo PAGO_LIQUIDACION.");

  // Retry de anular liquidacion PAGADA
  let errAnularPagada = "";
  try {
    await anularLiquidacion(db, {
      liquidacionId: conf2.id,
      motivoAnulacion: "Prueba anular pagada",
      adminUid: "admin_test",
      idempotencyKey: "anular_pagada_invalid"
    });
  } catch (err: unknown) { errAnularPagada = (err as Error).message || ""; }
  assert(errAnularPagada.includes("400:TRANSICION_ESTADO_INVALIDA"), "26. anularLiquidacion rechaza liquidación PAGADA con 400:TRANSICION_ESTADO_INVALIDA.");

  // --- SECCIÓN 4: CONCURRENCIA CON PROMISE.ALLSETTLED ---
  const [resConc1, resConc2] = await Promise.allSettled([
    crearBorradorLiquidacion(db, {
      vendedorAfiliadoId: v1Id,
      vendedorAfiliadoEmail: v1Email,
      montoSolicitadoCentavos: 1000,
      creadoPorAdminUid: "admin_test",
      idempotencyKey: "borrador_conc_same_key"
    }),
    crearBorradorLiquidacion(db, {
      vendedorAfiliadoId: v1Id,
      vendedorAfiliadoEmail: v1Email,
      montoSolicitadoCentavos: 1000,
      creadoPorAdminUid: "admin_test",
      idempotencyKey: "borrador_conc_same_key"
    })
  ]);

  const b1Doc = resConc1.status === "fulfilled" ? resConc1.value : null;
  const b2Doc = resConc2.status === "fulfilled" ? resConc2.value : null;
  assert(b1Doc !== null && b2Doc !== null && b1Doc.id === b2Doc.id,
    "27. Concurrencia Promise.allSettled con idéntica idempotencyKey retorna exactamente el mismo documento borrador.");

  // --- SECCIÓN 5: CUSTODIA DE EFECTIVO, RENDICIONES Y COMPENSACIONES ---
  await registrarPagoDirectoAdmin(db, {
    solicitudId: solId1,
    montoRecibidoCentavos: 50000,
    monedaRecibida: "ARS",
    medioPago: "EFECTIVO",
    receptorEfectivoId: "rec_vendedor_1",
    fechaRecepcion: "2026-02-20",
    fechaEfectiva: "2026-02-20",
    registradoPor: "admin_test",
    origenRegistro: "ADMIN",
    idempotencyKey: "pago_efectivo_v1_1"
  });

  const custodia1 = await obtenerLedgerCustodiaEfectivo(db, v1Id);
  assert(custodia1.efectivoPendienteRendicionCentavos === 50000, "28. Pago en efectivo genera custodia por 50.000 centavos.");

  // Exceso de rendicion
  let errExcesoRendicion = "";
  try {
    await registrarRendicionEfectivo(db, {
      vendedorAfiliadoId: v1Id,
      vendedorAfiliadoEmail: v1Email,
      montoRendidoCentavos: 60000,
      metodoEntrega: "EFECTIVO_EN_MANO",
      adminUid: "admin_test",
      idempotencyKey: "rend_exceso"
    });
  } catch (err: unknown) { errExcesoRendicion = (err as Error).message || ""; }
  assert(errExcesoRendicion.includes("400:EXCESO_RENDICION_EFECTIVO"), "29. Rendición por 60.000 sobre custodia de 50.000 falla con 400:EXCESO_RENDICION_EFECTIVO.");

  // Rendición parcial de 20.000
  await registrarRendicionEfectivo(db, {
    vendedorAfiliadoId: v1Id,
    vendedorAfiliadoEmail: v1Email,
    montoRendidoCentavos: 20000,
    metodoEntrega: "EFECTIVO_EN_MANO",
    adminUid: "admin_test",
    idempotencyKey: "rend_parcial_1"
  });

  const custodia2 = await obtenerLedgerCustodiaEfectivo(db, v1Id);
  assert(custodia2.efectivoPendienteRendicionCentavos === 30000, "30. Rendición parcial de 20.000 reduce custodia pendiente a 30.000.");

  // Concurrencia Rendicion vs Compensacion sobre 30.000 de custodia disponible
  await registrarAjusteAdministrativoComisiones(db, {
    vendedorAfiliadoId: v1Id,
    vendedorAfiliadoEmail: v1Email,
    montoComisionCentavos: 30000,
    motivo: "Bono para compensación",
    adminUid: "admin_test",
    idempotencyKey: "ajuste_bono_conc"
  });

  const borradorConcComp = await crearBorradorLiquidacion(db, {
    vendedorAfiliadoId: v1Id,
    vendedorAfiliadoEmail: v1Email,
    montoSolicitadoCentavos: 30000,
    creadoPorAdminUid: "admin_test",
    idempotencyKey: "borrador_conc_comp"
  });

  const confConcComp = await confirmarLiquidacion(db, {
    liquidacionId: borradorConcComp.id,
    adminUid: "admin_test",
    idempotencyKey: "conf_conc_comp"
  });

  const [resRendConc, resCompConc] = await Promise.allSettled([
    registrarRendicionEfectivo(db, {
      vendedorAfiliadoId: v1Id,
      vendedorAfiliadoEmail: v1Email,
      montoRendidoCentavos: 30000,
      metodoEntrega: "EFECTIVO_DEPOSITO",
      adminUid: "admin_test",
      idempotencyKey: "rend_conc_race"
    }),
    pagarLiquidacion(db, {
      liquidacionId: confConcComp.id,
      componentesPago: [{ formaPago: "COMPENSACION_EFECTIVO_EN_PODER", montoCentavos: 30000 }],
      adminUid: "admin_test",
      idempotencyKey: "pagar_conc_race"
    })
  ]);

  const custodiaPostRace = await obtenerLedgerCustodiaEfectivo(db, v1Id);
  assert(custodiaPostRace.efectivoPendienteRendicionCentavos >= 0,
    `31. Concurrencia Rendición vs Compensación preservó custodia de efectivo >= 0 (saldo actual: ${custodiaPostRace.efectivoPendienteRendicionCentavos}).`);
  assert((resRendConc.status === "fulfilled" && resCompConc.status === "rejected") || (resRendConc.status === "rejected" && resCompConc.status === "fulfilled"),
    "32. Exactamente una de las dos operaciones concurrentes sobre custodia completa tuvo éxito.");

  // Devolución física a cliente
  if (custodiaPostRace.efectivoPendienteRendicionCentavos === 0) {
    await registrarAjusteCustodiaEfectivo(db, {
      vendedorAfiliadoId: v1Id,
      montoCentavos: 10000,
      motivo: "Fondo de caja para devoluciones",
      adminUid: "admin_test",
      idempotencyKey: "ajuste_fondo_dev"
    });
  }

  await registrarDevolucionFisicaCliente(db, {
    vendedorAfiliadoId: v1Id,
    solicitudId: solId1,
    montoCentavos: 5000,
    motivo: "Devolución parcial",
    adminUid: "admin_test",
    idempotencyKey: "dev_fisica_1"
  });

  const custodiaPostDev = await obtenerLedgerCustodiaEfectivo(db, v1Id);
  assert(custodiaPostDev.efectivoPendienteRendicionCentavos === 5000, "33. Devolución física de 5.000 reduce la custodia física a 5.000.");

  let errExcesoDev = "";
  try {
    await registrarDevolucionFisicaCliente(db, {
      vendedorAfiliadoId: v1Id,
      montoCentavos: 20000,
      motivo: "Exceso dev",
      adminUid: "admin_test",
      idempotencyKey: "dev_exceso"
    });
  } catch (err: unknown) { errExcesoDev = (err as Error).message || ""; }
  assert(errExcesoDev.includes("400:EXCESO_DEVOLUCION_EFECTIVO"), "34. Exceso de devolución sobre custodia disponible falla con 400:EXCESO_DEVOLUCION_EFECTIVO.");

  // --- SECCIÓN 6: INCIDENCIAS SOBREVENIDAS ---
  await registrarAjusteAdministrativoComisiones(db, {
    vendedorAfiliadoId: v1Id,
    vendedorAfiliadoEmail: v1Email,
    montoComisionCentavos: 15000,
    motivo: "Bono inc",
    adminUid: "admin_test",
    idempotencyKey: "ajuste_bono_inc"
  });

  const borradorInc = await crearBorradorLiquidacion(db, {
    vendedorAfiliadoId: v1Id,
    vendedorAfiliadoEmail: v1Email,
    montoSolicitadoCentavos: 10000,
    creadoPorAdminUid: "admin_test",
    idempotencyKey: "borrador_inc_sec6"
  });

  const confInc = await confirmarLiquidacion(db, {
    liquidacionId: borradorInc.id,
    adminUid: "admin_test",
    idempotencyKey: "conf_inc_sec6"
  });

  await registrarAjusteAdministrativoComisiones(db, {
    vendedorAfiliadoId: v1Id,
    vendedorAfiliadoEmail: v1Email,
    montoComisionCentavos: -60000,
    motivo: "Penalización masiva sobrevenida",
    adminUid: "admin_test",
    idempotencyKey: "ajuste_penaliz_over_s6"
  });

  const evalInc = await evaluarIncidenciasLiquidacion(db, confInc.id);
  assert(evalInc.tieneIncidenciasPendientes === true, "35. Incidencia sobrevenida detecta tieneIncidenciasPendientes === true.");

  let errPagoInc = "";
  try {
    await pagarLiquidacion(db, {
      liquidacionId: confInc.id,
      componentesPago: [{ formaPago: "TRANSFERENCIA", montoCentavos: 10000 }],
      adminUid: "admin_test",
      idempotencyKey: "pagar_inc_sec6"
    });
  } catch (err: unknown) { errPagoInc = (err as Error).message || ""; }
  assert(errPagoInc.includes("409:LIQUIDACION_CON_INCIDENCIAS"), "36. Liquidación con incidencia no puede ser pagada y falla with 409:LIQUIDACION_CON_INCIDENCIAS.");

  await anularLiquidacion(db, {
    liquidacionId: confInc.id,
    motivoAnulacion: "Anular por incidencia",
    adminUid: "admin_test",
    idempotencyKey: "anular_inc_ok"
  });

  // --- SECCIÓN 7: VENDEDOR PANEL & AUTH EMULATOR (INTEGRACIÓN REAL CON ID TOKENS) ---
  const resolvedV2 = await resolverVendedorPorAuthUid(db, v2AuthUid);
  assert(resolvedV2 !== null && resolvedV2.vendedorId === v2Id, "37. resolverVendedorPorAuthUid mapea authUid a vendedorId correctamente.");

  const resolvedV1 = await resolverVendedorPorAuthUid(db, v1AuthUid);
  assert(resolvedV1 !== null && resolvedV1.vendedorDoc.mostrarCuentaCorrienteEnPanel === false, "38. Vendedor 1 inicia con mostrarCuentaCorrienteEnPanel === false.");

  // Asegurar usuarios en Firebase Auth Emulator
  try {
    await admin.auth().deleteUser(v1AuthUid).catch(() => {});
    await admin.auth().deleteUser(v2AuthUid).catch(() => {});
    await admin.auth().deleteUser("uid_non_admin").catch(() => {});
  } catch {
    // Ignorar si no existen
  }

  await admin.auth().createUser({ uid: v1AuthUid, email: v1Email });
  await admin.auth().createUser({ uid: v2AuthUid, email: v2Email });
  await admin.auth().createUser({ uid: "uid_non_admin", email: "nonadmin@test.com" });

  const customTokenV1 = await admin.auth().createCustomToken(v1AuthUid);
  const customTokenV2 = await admin.auth().createCustomToken(v2AuthUid);
  const customTokenNonAdmin = await admin.auth().createCustomToken("uid_non_admin");

  const idTokenV1 = await exchangeCustomTokenForIdToken(customTokenV1);
  const idTokenV2 = await exchangeCustomTokenForIdToken(customTokenV2);
  const idTokenNonAdmin = await exchangeCustomTokenForIdToken(customTokenNonAdmin);

  assert(typeof idTokenV1 === "string" && idTokenV1.length > 0, "39. ID Token real de Auth Emulator intercambiado para Vendedor 1.");

  // A. Invocación de GET /api/afiliado/cuenta-corriente con switch FALSE -> HTTP 403
  const reqV1False = new Request("http://localhost/api/afiliado/cuenta-corriente", {
    headers: { "Authorization": `Bearer ${idTokenV1}` }
  });
  const resV1False = await handlerCuentaCorriente(reqV1False);
  assert(resV1False.status === 403, "40. Endpoint GET /api/afiliado/cuenta-corriente retorna HTTP 403 cuando mostrarCuentaCorrienteEnPanel === false.");

  // B. Switch TRUE por admin y nueva invocación -> HTTP 200
  await actualizarVisibilidadPanelVendedor(db, {
    vendedorId: v1Id,
    mostrarCuentaCorrienteEnPanel: true,
    adminUid: "admin_test"
  });

  const reqV1True = new Request("http://localhost/api/afiliado/cuenta-corriente", {
    headers: { "Authorization": `Bearer ${idTokenV1}` }
  });
  const resV1True = await handlerCuentaCorriente(reqV1True);
  assert(resV1True.status === 200, "41. Endpoint GET /api/afiliado/cuenta-corriente retorna HTTP 200 cuando mostrarCuentaCorrienteEnPanel === true.");

  const jsonV1 = (await resV1True.json()) as {
    vendedorAfiliadoId: string;
    movimientos: Array<{
      id: string;
      fecha: string;
      tipo: string;
      montoComisionCentavos: number;
      clienteNombre?: string | null;
      productoResumen?: string | null;
      porcentajeAplicadoBasisPoints?: number;
      snapshot?: unknown;
      pricing?: unknown;
      margen?: unknown;
    }>;
  };

  // C. Mapping authUid !== vendedorAfiliadoId
  assert(jsonV1.vendedorAfiliadoId === v1Id, "42. Mapping exitoso: authUid 'uid_vend_1' resolvió correctamente a vendedorAfiliadoId 'vend_3b5b_1'.");

  // D. Aislamiento multitenant
  const reqV2 = new Request("http://localhost/api/afiliado/cuenta-corriente", {
    headers: { "Authorization": `Bearer ${idTokenV2}` }
  });
  const resV2 = await handlerCuentaCorriente(reqV2);
  const jsonV2 = (await resV2.json()) as { vendedorAfiliadoId: string; movimientos: Array<{ id: string }> };
  assert(resV2.status === 200 && jsonV2.vendedorAfiliadoId === v2Id, "43. Aislamiento: Vendedor 2 accede a su propio panel únicamente.");
  assert(!jsonV2.movimientos.some((m) => jsonV1.movimientos.some((m1) => m1.id === m.id)),
    "44. Aislamiento estricto: La respuesta del Vendedor A no contiene ningún movimiento del Vendedor B.");

  // E. Filtrado estricto
  const primerMovV1 = jsonV1.movimientos[0];
  const noCamposProhibidos = !("porcentajeAplicadoBasisPoints" in primerMovV1) &&
                             !("snapshot" in primerMovV1) &&
                             !("pricing" in primerMovV1) &&
                             !("margen" in primerMovV1);
  assert(noCamposProhibidos, "45. Respuesta no contiene porcentajeAplicadoBasisPoints, snapshots, pricing ni márgenes.");

  // F. Datos permitidos enriquecidos
  const movConSol = jsonV1.movimientos.find((m) => m.clienteNombre === "Juan Perez");
  assert(Boolean(movConSol) && movConSol?.productoResumen === "Heladera No Frost",
    "46. Respuesta devuelve correctamente clienteNombre ('Juan Perez') y productoResumen ('Heladera No Frost').");

  // --- SECCIÓN 8: SECURITY RULES FIRESTORE CON USUARIO AUTH NO ADMIN Y ANÓNIMO ---
  // Test Anónimo (Browser REST semántico)
  assert(await testClientBrowserWriteDenied("liquidaciones_comision", "doc_rules_liq_anon"), "47. Escritura anónima a liquidaciones_comision rechazada con HTTP 403.");
  assert(await testClientBrowserWriteDenied("ledger_custodia_efectivo", "doc_rules_cust_anon"), "48. Escritura anónima a ledger_custodia_efectivo rechazada con HTTP 403.");
  assert(await testClientBrowserWriteDenied("ledger_comisiones_movimientos", "doc_rules_com_anon"), "49. Escritura anónima a ledger_comisiones_movimientos rechazada con HTTP 403.");
  assert(await testClientBrowserWriteDenied("rendiciones_efectivo", "doc_rules_rend_anon"), "50. Escritura anónima a rendiciones_efectivo rechazada con HTTP 403.");

  // Test con Usuario Autenticado NO ADMIN (ID Token real de Auth Emulator)
  assert(await testClientBrowserWriteDenied("liquidaciones_comision", "doc_rules_liq_auth", idTokenNonAdmin),
    "51. Escritura directa desde usuario autenticado NO ADMIN a liquidaciones_comision rechazada con HTTP 403.");
  assert(await testClientBrowserWriteDenied("ledger_custodia_efectivo", "doc_rules_cust_auth", idTokenNonAdmin),
    "52. Escritura directa desde usuario autenticado NO ADMIN a ledger_custodia_efectivo rechazada con HTTP 403.");
  assert(await testClientBrowserWriteDenied("ledger_comisiones_movimientos", "doc_rules_com_auth", idTokenNonAdmin),
    "53. Escritura directa desde usuario autenticado NO ADMIN a ledger_comisiones_movimientos rechazada con HTTP 403.");
  assert(await testClientBrowserWriteDenied("rendiciones_efectivo", "doc_rules_rend_auth", idTokenNonAdmin),
    "54. Escritura directa desde usuario autenticado NO ADMIN a rendiciones_efectivo rechazada con HTTP 403.");

  // --- SECCIÓN 9: RETRY DE PAGO DE LIQUIDACIÓN + COMPENSACIÓN ---
  // Acreditar saldo disponible de comisión para el test de compensación
  await registrarAjusteAdministrativoComisiones(db, {
    vendedorAfiliadoId: v1Id,
    vendedorAfiliadoEmail: v1Email,
    montoComisionCentavos: 100000,
    motivo: "Bono para test retry compensacion",
    adminUid: "admin_test",
    idempotencyKey: "ajuste_bono_retry_test"
  });

  const borradorRetryComp = await crearBorradorLiquidacion(db, {
    vendedorAfiliadoId: v1Id,
    vendedorAfiliadoEmail: v1Email,
    montoSolicitadoCentavos: 4000,
    creadoPorAdminUid: "admin_test",
    idempotencyKey: "borrador_retry_comp_test"
  });

  const confRetryComp = await confirmarLiquidacion(db, {
    liquidacionId: borradorRetryComp.id,
    adminUid: "admin_test",
    idempotencyKey: "conf_retry_comp_test"
  });

  // Ejecutar primera vez
  const pagComp1 = await pagarLiquidacion(db, {
    liquidacionId: confRetryComp.id,
    componentesPago: [{ formaPago: "COMPENSACION_EFECTIVO_EN_PODER", montoCentavos: 4000 }],
    adminUid: "admin_test",
    idempotencyKey: "pagar_retry_comp_same_key"
  });

  const ccPostPagComp1 = await obtenerCuentaCorrienteVendedor(db, v1Id);
  const custPostPagComp1 = await obtenerLedgerCustodiaEfectivo(db, v1Id);

  // Re-ejecutar SEGUNDA vez con la MISMA idempotencyKey
  const pagComp2 = await pagarLiquidacion(db, {
    liquidacionId: confRetryComp.id,
    componentesPago: [{ formaPago: "COMPENSACION_EFECTIVO_EN_PODER", montoCentavos: 4000 }],
    adminUid: "admin_test",
    idempotencyKey: "pagar_retry_comp_same_key"
  });

  const ccPostPagComp2 = await obtenerCuentaCorrienteVendedor(db, v1Id);
  const custPostPagComp2 = await obtenerLedgerCustodiaEfectivo(db, v1Id);

  // Consulta directa a Firestore para verificar cardinalidad exacta
  const snapLedgerCom = await db.collection("ledger_comisiones_movimientos")
    .where("idempotencyKey", "==", "pagar_retry_comp_same_key_ledger")
    .get();

  const snapLedgerCust = await db.collection("ledger_custodia_efectivo")
    .where("idempotencyKey", "==", "pagar_retry_comp_same_key_custodia")
    .get();

  assert(pagComp1.estado === "PAGADA" && pagComp2.estado === "PAGADA", "55. Retry de pagarLiquidacion retorna estado PAGADA canónico.");
  assert(snapLedgerCom.size === 1, "56. Exactamente 1 documento PAGO_LIQUIDACION grabado en Firestore tras retry.");
  assert(snapLedgerCust.size === 1, "57. Exactamente 1 documento COMPENSACION_COMISION grabado en Firestore tras retry.");
  assert(custPostPagComp1.efectivoPendienteRendicionCentavos === custPostPagComp2.efectivoPendienteRendicionCentavos,
    "58. Custodia de efectivo descontada exactamente una vez tras el retry.");
  assert(ccPostPagComp1.saldoCuentaCorrienteCentavos === ccPostPagComp2.saldoCuentaCorrienteCentavos,
    "59. Saldo de cuenta corriente descontado exactamente una vez tras el retry.");

  // --- SECCIÓN 10: VERIFICACIONES ADICIONALES DE IDEMPOTENCIA Y SEGURIDAD ---
  const rend1 = await registrarRendicionEfectivo(db, {
    vendedorAfiliadoId: v1Id,
    vendedorAfiliadoEmail: v1Email,
    montoRendidoCentavos: 1000,
    metodoEntrega: "EFECTIVO_EN_MANO",
    adminUid: "admin_test",
    idempotencyKey: "rend_retry_idemp"
  });
  const rend2 = await registrarRendicionEfectivo(db, {
    vendedorAfiliadoId: v1Id,
    vendedorAfiliadoEmail: v1Email,
    montoRendidoCentavos: 1000,
    metodoEntrega: "EFECTIVO_EN_MANO",
    adminUid: "admin_test",
    idempotencyKey: "rend_retry_idemp"
  });
  assert(rend1.id === rend2.id, "60. Retry de registrarRendicionEfectivo retorna exactamente el mismo objeto de rendición.");

  const aj1 = await registrarAjusteCustodiaEfectivo(db, {
    vendedorAfiliadoId: v1Id,
    montoCentavos: 5000,
    motivo: "Ajuste idempotencia test",
    adminUid: "admin_test",
    idempotencyKey: "ajuste_cust_retry"
  });
  const aj2 = await registrarAjusteCustodiaEfectivo(db, {
    vendedorAfiliadoId: v1Id,
    montoCentavos: 5000,
    motivo: "Ajuste idempotencia test",
    adminUid: "admin_test",
    idempotencyKey: "ajuste_cust_retry"
  });
  assert(aj1.id === aj2.id, "61. Retry de registrarAjusteCustodiaEfectivo retorna exactamente el mismo documento de ajuste.");

  const dev1 = await registrarDevolucionFisicaCliente(db, {
    vendedorAfiliadoId: v1Id,
    montoCentavos: 1000,
    motivo: "Devolucion retry",
    adminUid: "admin_test",
    idempotencyKey: "dev_retry_key"
  });
  const dev2 = await registrarDevolucionFisicaCliente(db, {
    vendedorAfiliadoId: v1Id,
    montoCentavos: 1000,
    motivo: "Devolucion retry",
    adminUid: "admin_test",
    idempotencyKey: "dev_retry_key"
  });
  assert(dev1.id === dev2.id, "62. Retry de registrarDevolucionFisicaCliente retorna exactamente el mismo documento de devolución.");

  const ajCC1 = await registrarAjusteAdministrativoComisiones(db, {
    vendedorAfiliadoId: v1Id,
    vendedorAfiliadoEmail: v1Email,
    montoComisionCentavos: 1000,
    motivo: "Ajuste CC retry",
    adminUid: "admin_test",
    idempotencyKey: "ajuste_cc_retry"
  });
  const ajCC2 = await registrarAjusteAdministrativoComisiones(db, {
    vendedorAfiliadoId: v1Id,
    vendedorAfiliadoEmail: v1Email,
    montoComisionCentavos: 1000,
    motivo: "Ajuste CC retry",
    adminUid: "admin_test",
    idempotencyKey: "ajuste_cc_retry"
  });
  assert(ajCC1.id === ajCC2.id, "63. Retry de registrarAjusteAdministrativoComisiones retorna exactamente el mismo documento de ajuste CC.");

  const custEnd = await obtenerLedgerCustodiaEfectivo(db, v1Id);
  assert(custEnd.efectivoPendienteRendicionCentavos >= 0, "64. Integridad final de custodia de efectivo preserva saldo >= 0.");

  console.log(`\n3B.5B TEST SUITE SUMMARY: ${passed}/${total} checks passed cleanly.`);
  if (passed !== total) {
    process.exitCode = 1;
  }
}

runTests3B5B().catch(err => {
  console.error("FATAL ERROR IN TEST SUITE 3B.5B:", err);
  process.exitCode = 1;
});
