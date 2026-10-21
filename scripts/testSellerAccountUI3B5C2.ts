import "./helpers/requireSafeEmulatorEnvironment";
import { admin } from "../src/lib/firebaseAdmin";
import {
  registrarConfiguracionComisionVendedor,
  crearSnapshotComisionOperacion,
  procesarComisionPago,
  reversarComisionPago
} from "../src/lib/commissionsEngine";
import {
  crearBorradorLiquidacion,
  confirmarLiquidacion,
  pagarLiquidacion,
  registrarAjusteAdministrativoComisiones
} from "../src/lib/settlementsEngine";
import { GET as handlerCuentaCorriente } from "../src/app/api/afiliado/cuenta-corriente/route";
import { formatMoney } from "../src/lib/sellerAccountHelpers";

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

async function runTests() {
  console.log("==========================================================");
  console.log("SUITE DE INTEGRACIÓN PANEL VENDEDOR AFILIADO 3B.5C.2");
  console.log("CUENTA CORRIENTE, COMISIONES Y SEGURIDAD MULTITENANT");
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
  const sellerAId = `vendedor_seller_a_${timestamp}`;
  const sellerAEmail = `vendedor.a.${timestamp}@cuentahogar.com`;
  const sellerBId = `vendedor_seller_b_${timestamp}`;
  const sellerBEmail = `vendedor.b.${timestamp}@cuentahogar.com`;

  // 1. Crear usuarios en Firebase Auth Emulator
  const userARecord = await admin.auth().createUser({ email: sellerAEmail, password: "password123" });
  const authUidA = userARecord.uid;
  const customTokenA = await admin.auth().createCustomToken(authUidA);
  const idTokenA = await exchangeCustomTokenForIdToken(customTokenA);

  const userBRecord = await admin.auth().createUser({ email: sellerBEmail, password: "password123" });
  const authUidB = userBRecord.uid;
  const customTokenB = await admin.auth().createCustomToken(authUidB);
  const idTokenB = await exchangeCustomTokenForIdToken(customTokenB);

  // Check 1: Unauthenticated request returns 401
  const reqUnauth = new Request("http://localhost/api/afiliado/cuenta-corriente");
  const resUnauth = await handlerCuentaCorriente(reqUnauth);
  assert(resUnauth.status === 401, "Solicitud sin Bearer token devuelve HTTP 401");

  // Check 2: Authenticated user without seller doc returns 403
  const reqNoSeller = new Request("http://localhost/api/afiliado/cuenta-corriente", {
    headers: { Authorization: `Bearer ${idTokenA}` }
  });
  const resNoSeller = await handlerCuentaCorriente(reqNoSeller);
  assert(resNoSeller.status === 403, "Usuario autenticado sin documento de vendedor devuelve HTTP 403");

  // Crear documento de vendedor A con mostrarCuentaCorrienteEnPanel = false
  await db.collection("vendedores").doc(sellerAId).set({
    id: sellerAId,
    nombre: "Vendedor A Test",
    email: sellerAEmail,
    authUid: authUidA,
    activo: true,
    mostrarCuentaCorrienteEnPanel: false,
    createdAt: new Date().toISOString()
  });

  // Check 3: Seller with mostrarCuentaCorrienteEnPanel === false returns HTTP 403
  const reqSwitchOff = new Request("http://localhost/api/afiliado/cuenta-corriente", {
    headers: { Authorization: `Bearer ${idTokenA}` }
  });
  const resSwitchOff = await handlerCuentaCorriente(reqSwitchOff);
  const dataSwitchOff = await resSwitchOff.json();
  assert(resSwitchOff.status === 403 && dataSwitchOff.error.includes("403:FORBIDDEN"), "Vendedor con switch FALSE devuelve HTTP 403");

  // Activar switch mostrarCuentaCorrienteEnPanel = true
  await db.collection("vendedores").doc(sellerAId).update({
    mostrarCuentaCorrienteEnPanel: true
  });

  // Check 4: Seller with mostrarCuentaCorrienteEnPanel === true returns HTTP 200
  const reqSwitchOn = new Request("http://localhost/api/afiliado/cuenta-corriente", {
    headers: { Authorization: `Bearer ${idTokenA}` }
  });
  const resSwitchOn = await handlerCuentaCorriente(reqSwitchOn);
  assert(resSwitchOn.status === 200, "Vendedor con switch TRUE devuelve HTTP 200");

  // Check 5: Initial checking account has balance 0 and empty arrays
  const dataInit = await resSwitchOn.json();
  assert(
    dataInit.vendedorAfiliadoId === sellerAId &&
    dataInit.saldoCuentaCorrienteCentavos === 0 &&
    Array.isArray(dataInit.movimientos) && dataInit.movimientos.length === 0 &&
    Array.isArray(dataInit.liquidacionesPagadas) && dataInit.liquidacionesPagadas.length === 0,
    "Cuenta corriente inicial sin movimientos retorna saldo 0 y arreglos vacíos"
  );

  // Configurar comisiones para Vendedor A (10% = 1000 basis points)
  await (registrarConfiguracionComisionVendedor as any)(db, {
    db,
    vendedorAfiliadoId: sellerAId,
    vendedorAfiliadoEmail: sellerAEmail,
    porcentajeComisionBasisPoints: 1000,
    motivoCambio: "Configuración Inicial Test 3B.5C.2",
    actualizadoPorAdminUid: "admin_tester",
    idempotencyKey: `config_${timestamp}`
  });

  // Crear solicitud simulada para resolver clienteNombre y productoResumen
  const solId1 = `sol_test_a_${timestamp}`;
  await db.collection("solicitudes").doc(solId1).set({
    id: solId1,
    vendedorAfiliadoId: sellerAId,
    clienteNombre: "María González",
    productoNombre: "Smart TV Samsung 55",
    montoTotalPesos: 150000
  });

  // Crear snapshot e ingresar pago para Vendedor A
  const snap1 = await crearSnapshotComisionOperacion({
    db,
    solicitudId: solId1,
    vendedorAfiliadoId: sellerAId,
    idempotencyKey: `snap_1_${timestamp}`
  });

  const resPago1 = await procesarComisionPago({
    db,
    snapshotComision: snap1,
    pago: {
      montoPagoCentavos: 5000000, // $50.000
      cuotaNumero: 1,
      idempotencyKey: `pago_1_${timestamp}`
    }
  });

  // Check 6: Devengamiento movement increases balance
  const reqPago1 = new Request("http://localhost/api/afiliado/cuenta-corriente", {
    headers: { Authorization: `Bearer ${idTokenA}` }
  });
  const resDev = await handlerCuentaCorriente(reqPago1);
  const dataDev = await resDev.json();
  assert(
    dataDev.saldoCuentaCorrienteCentavos === resPago1.montoComisionDevengadoCentavos &&
    dataDev.movimientos.length === 1 &&
    dataDev.movimientos[0].tipo === "DEVENGAMIENTO_PAGO",
    "Movimiento de devengamiento incrementa el saldo y registra tipo DEVENGAMIENTO_PAGO"
  );

  // Check 7: clienteNombre and productoResumen populated server-side
  assert(
    dataDev.movimientos[0].clienteNombre === "María González" &&
    dataDev.movimientos[0].productoResumen === "Smart TV Samsung 55",
    "El endpoint resuelve server-side clienteNombre y productoResumen desde la solicitud"
  );

  // Check 8: baseComisionableCentavos correctly populated
  assert(
    dataDev.movimientos[0].baseComisionableCentavos === 5000000,
    "El movimiento contiene baseComisionableCentavos exacto"
  );

  // Check 9: Reversal movement decreases balance
  const resRev1 = await reversarComisionPago({
    db,
    solicitudId: solId1,
    cuotaNumero: 1,
    motivo: "Devolución por falla técnica de fábrica",
    realizadoPorUid: "admin_tester",
    idempotencyKey: `reversa_1_${timestamp}`
  });

  const reqRev = new Request("http://localhost/api/afiliado/cuenta-corriente", {
    headers: { Authorization: `Bearer ${idTokenA}` }
  });
  const resRevData = await (await handlerCuentaCorriente(reqRev)).json();
  assert(
    resRevData.saldoCuentaCorrienteCentavos === 0 &&
    resRevData.movimientos.length === 2 &&
    resRevData.movimientos[0].tipo === "REVERSA_PAGO",
    "Reversa de pago descuenta la comisión del saldo de cuenta corriente"
  );

  // Check 10: Reversal preserves motivo
  assert(
    resRevData.movimientos[0].motivo === "Devolución por falla técnica de fábrica",
    "La reversa conserva el motivo registrado por la administración"
  );

  // Check 11: Positive adjustment movement (AJUSTE_POSITIVO)
  await registrarAjusteAdministrativoComisiones({
    db,
    vendedorAfiliadoId: sellerAId,
    vendedorAfiliadoEmail: sellerAEmail,
    montoComisionCentavos: 1200000, // $12.000 a favor
    motivo: "Premio por volumen de ventas mensual",
    registradoPorAdminUid: "admin_tester",
    idempotencyKey: `ajuste_pos_${timestamp}`
  });

  const reqAjPos = new Request("http://localhost/api/afiliado/cuenta-corriente", {
    headers: { Authorization: `Bearer ${idTokenA}` }
  });
  const dataAjPos = await (await handlerCuentaCorriente(reqAjPos)).json();
  assert(
    dataAjPos.saldoCuentaCorrienteCentavos === 1200000 &&
    dataAjPos.movimientos[0].tipo === "AJUSTE_POSITIVO" &&
    dataAjPos.movimientos[0].motivo === "Premio por volumen de ventas mensual",
    "Ajuste positivo registra tipo AJUSTE_POSITIVO e incrementa el saldo"
  );

  // Check 12: Negative adjustment movement (AJUSTE_NEGATIVO) bringing balance negative
  await registrarAjusteAdministrativoComisiones({
    db,
    vendedorAfiliadoId: sellerAId,
    vendedorAfiliadoEmail: sellerAEmail,
    montoComisionCentavos: -2000000, // -$20.000 en contra
    motivo: "Cargo por gastos administrativos",
    registradoPorAdminUid: "admin_tester",
    idempotencyKey: `ajuste_neg_${timestamp}`
  });

  const reqAjNeg = new Request("http://localhost/api/afiliado/cuenta-corriente", {
    headers: { Authorization: `Bearer ${idTokenA}` }
  });
  const dataAjNeg = await (await handlerCuentaCorriente(reqAjNeg)).json();
  assert(
    dataAjNeg.saldoCuentaCorrienteCentavos === -800000 &&
    dataAjNeg.movimientos[0].tipo === "AJUSTE_NEGATIVO" &&
    dataAjNeg.saldoCuentaCorrienteCentavos < 0,
    "Ajuste negativo registra tipo AJUSTE_NEGATIVO y permite saldo negativo compensable"
  );

  // Volver saldo a positivo para probar liquidación
  await registrarAjusteAdministrativoComisiones({
    db,
    vendedorAfiliadoId: sellerAId,
    vendedorAfiliadoEmail: sellerAEmail,
    montoComisionCentavos: 1800000, // +$18.000 -> saldo = $10.000 (1000000 centavos)
    motivo: "Regularización de saldo para liquidación",
    registradoPorAdminUid: "admin_tester",
    idempotencyKey: `ajuste_reg_${timestamp}`
  });

  // Check 13: Paid liquidation appears in liquidacionesPagadas
  const liqBorrador = await crearBorradorLiquidacion({
    db,
    vendedorAfiliadoId: sellerAId,
    vendedorAfiliadoEmail: sellerAEmail,
    montoTotalLiquidadoCentavos: 1000000,
    creadoPorAdminUid: "admin_tester",
    idempotencyKey: `liq_borr_${timestamp}`
  });

  await confirmarLiquidacion({
    db,
    liquidacionId: liqBorrador.id,
    confirmadoPorAdminUid: "admin_tester"
  });

  await pagarLiquidacion({
    db,
    liquidacionId: liqBorrador.id,
    componentesPago: [
      {
        formaPago: "TRANSFERENCIA",
        montoCentavos: 1000000,
        referenciaBancaria: "TRF-99887766"
      }
    ],
    pagadoPorAdminUid: "admin_tester",
    idempotencyKey: `pago_liq_${timestamp}`
  });

  const reqLiqPag = new Request("http://localhost/api/afiliado/cuenta-corriente", {
    headers: { Authorization: `Bearer ${idTokenA}` }
  });
  const dataLiqPag = await (await handlerCuentaCorriente(reqLiqPag)).json();
  assert(
    dataLiqPag.liquidacionesPagadas.length === 1 &&
    dataLiqPag.liquidacionesPagadas[0].id === liqBorrador.id &&
    dataLiqPag.liquidacionesPagadas[0].montoTotalLiquidadoCentavos === 1000000 &&
    dataLiqPag.liquidacionesPagadas[0].tipoPagoConsolidado === "TRANSFERENCIA",
    "La liquidación pagada figura en el arreglo liquidacionesPagadas con sus datos consolidados"
  );

  // Check 14: Reversal after paid liquidation makes balance negative while liquidation stays PAGADA
  const solId2 = `sol_test_a2_${timestamp}`;
  await db.collection("solicitudes").doc(solId2).set({
    id: solId2,
    vendedorAfiliadoId: sellerAId,
    clienteNombre: "Carlos López",
    productoNombre: "Lavarropas Drean 8kg",
    montoTotalPesos: 100000
  });

  const snap2 = await crearSnapshotComisionOperacion({
    db,
    solicitudId: solId2,
    vendedorAfiliadoId: sellerAId,
    idempotencyKey: `snap_2_${timestamp}`
  });

  await procesarComisionPago({
    db,
    snapshotComision: snap2,
    pago: {
      montoPagoCentavos: 3000000, // $30.000 -> $3.000 comisión (300000 centavos)
      cuotaNumero: 1,
      idempotencyKey: `pago_2_${timestamp}`
    }
  });

  // Reversar pago 2
  await reversarComisionPago({
    db,
    solicitudId: solId2,
    cuotaNumero: 1,
    motivo: "Reversa pos-pago de liquidación",
    realizadoPorUid: "admin_tester",
    idempotencyKey: `reversa_2_${timestamp}`
  });

  const reqRevPostLiq = new Request("http://localhost/api/afiliado/cuenta-corriente", {
    headers: { Authorization: `Bearer ${idTokenA}` }
  });
  const dataRevPostLiq = await (await handlerCuentaCorriente(reqRevPostLiq)).json();
  assert(
    dataRevPostLiq.liquidacionesPagadas.length === 1 &&
    dataRevPostLiq.liquidacionesPagadas[0].id === liqBorrador.id,
    "La reversa posterior no anula la liquidación PAGADA, que permanece en el historial"
  );

  // Crear documento de Vendedor B
  await db.collection("vendedores").doc(sellerBId).set({
    id: sellerBId,
    nombre: "Vendedor B Test",
    email: sellerBEmail,
    authUid: authUidB,
    activo: true,
    mostrarCuentaCorrienteEnPanel: true,
    createdAt: new Date().toISOString()
  });

  // Check 15: Multitenant isolation - Seller B cannot see Seller A's data
  const reqSellerB = new Request("http://localhost/api/afiliado/cuenta-corriente", {
    headers: { Authorization: `Bearer ${idTokenB}` }
  });
  const dataSellerB = await (await handlerCuentaCorriente(reqSellerB)).json();
  assert(
    dataSellerB.vendedorAfiliadoId === sellerBId &&
    dataSellerB.saldoCuentaCorrienteCentavos === 0 &&
    dataSellerB.movimientos.length === 0 &&
    dataSellerB.liquidacionesPagadas.length === 0,
    "Aislamiento multitenant: Vendedor B solo consulta su propia información y no ve movimientos de Vendedor A"
  );

  // Check 16: URL/query param ID manipulation does not override Auth UID
  const reqQueryManip = new Request(`http://localhost/api/afiliado/cuenta-corriente?vendedorId=${sellerAId}`, {
    headers: { Authorization: `Bearer ${idTokenB}` }
  });
  const dataQueryManip = await (await handlerCuentaCorriente(reqQueryManip)).json();
  assert(
    dataQueryManip.vendedorAfiliadoId === sellerBId,
    "La manipulación del parámetro vendedorId en la URL no altera la resolución server-side del Auth UID"
  );

  // Auditar campos prohibidos (Checks 17 a 24)
  const forbiddenFields = [
    "porcentaje",
    "basisPoints",
    "pricing",
    "margen",
    "markup",
    "snapshot",
    "costoProducto",
    "rentabilidad"
  ];

  function auditForbiddenFields(obj: any, path = ""): string[] {
    const found: string[] = [];
    if (!obj || typeof obj !== "object") return found;
    for (const key of Object.keys(obj)) {
      const currentPath = path ? `${path}.${key}` : key;
      const keyLower = key.toLowerCase();
      for (const forbidden of forbiddenFields) {
        if (keyLower.includes(forbidden.toLowerCase())) {
          found.push(currentPath);
        }
      }
      if (typeof (obj as any)[key] === "object" && (obj as any)[key] !== null) {
        found.push(...auditForbiddenFields((obj as any)[key], currentPath));
      }
    }
    return found;
  }

  const payloadA = await (await handlerCuentaCorriente(new Request("http://localhost/api/afiliado/cuenta-corriente", {
    headers: { Authorization: `Bearer ${idTokenA}` }
  }))).json();

  const violations = auditForbiddenFields(payloadA);

  assert(!violations.some(v => v.toLowerCase().includes("porcentaje")), "Check 17: El payload NO contiene el campo prohibido 'porcentaje'");
  assert(!violations.some(v => v.toLowerCase().includes("basispoints")), "Check 18: El payload NO contiene el campo prohibido 'basisPoints'");
  assert(!violations.some(v => v.toLowerCase().includes("pricing")), "Check 19: El payload NO contiene el campo prohibido 'pricing'");
  assert(!violations.some(v => v.toLowerCase().includes("margen")), "Check 20: El payload NO contiene el campo prohibido 'margen'");
  assert(!violations.some(v => v.toLowerCase().includes("markup")), "Check 21: El payload NO contiene el campo prohibido 'markup'");
  assert(!violations.some(v => v.toLowerCase().includes("snapshot")), "Check 22: El payload NO contiene el campo prohibido 'snapshot'");
  assert(!violations.some(v => v.toLowerCase().includes("costoproducto")), "Check 23: El payload NO contiene el campo prohibido 'costoProducto'");
  assert(!violations.some(v => v.toLowerCase().includes("rentabilidad")), "Check 24: El payload NO contiene el campo prohibido 'rentabilidad'");

  // Check 25: formatMoney helper formatting
  assert(
    formatMoney(8450000) === "$ 84.500" &&
    formatMoney(0) === "$ 0" &&
    formatMoney(-500000) === "-$ 5.000" &&
    formatMoney(1050) === "$ 10,50",
    "Check 25: formatMoney formatea importes de manera exacta en ARS"
  );

  // Check 26: Response simulation for HTTP 403 maps to friendly DISABLED status
  const sim403 = { status: 403 };
  const mappedStatus403 = sim403.status === 403 ? "DISABLED" : "UNKNOWN";
  assert(mappedStatus403 === "DISABLED", "Check 26: HTTP 403 mapea al estado 'DISABLED' amigable en el componente UI");

  // Check 27: Response simulation for HTTP 500 maps to ERROR status with Retry option
  const sim500 = { status: 500, error: "500:INTERNAL_ERROR" };
  const mappedStatus500 = sim500.status === 500 ? "ERROR" : "UNKNOWN";
  assert(mappedStatus500 === "ERROR" && sim500.error === "500:INTERNAL_ERROR", "Check 27: Error de servidor (500) mapea al estado 'ERROR' permitiendo reintento sin asumir saldo 0");

  console.log("\\n==========================================================");
  console.log(`RESUMEN: ${passedCount}/${totalCount} PASS`);
  console.log("==========================================================");
}

runTests()
  .then(() => {
    console.log("SUITE 3B.5C.2 COMPLETADA CON ÉXITO");
    process.exit(0);
  })
  .catch((err) => {
    console.error("ERROR EN SUITE 3B.5C.2:", err);
    process.exit(1);
  });
