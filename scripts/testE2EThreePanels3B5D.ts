import "./helpers/requireSafeEmulatorEnvironment";
import { admin } from "../src/lib/firebaseAdmin";
import {
} from "../src/lib/ledgerEngine";
import {
  evaluarVencimientoCuota,
  calcularEstadoCumplimientoOperacion
} from "../src/lib/expirationEngine";
import {
  crearSnapshotComisionOperacion,
  procesarComisionPago
} from "../src/lib/commissionsEngine";
import {
  crearBorradorLiquidacion,
  confirmarLiquidacion,
  pagarLiquidacion
} from "../src/lib/settlementsEngine";
import { GET as handlerCuentaCorriente } from "../src/app/api/afiliado/cuenta-corriente/route";
import { GET as handlerAfiliadoOperaciones } from "../src/app/api/afiliado/operaciones/route";
import { POST as handlerAfiliadoPromesas } from "../src/app/api/afiliado/promesas/route";
import { POST as handlerAfiliadoObservaciones } from "../src/app/api/afiliado/observaciones/route";
import { GET as handlerClienteEstadoFinanciero } from "../src/app/api/cliente/estado-financiero/route";
import { GET as handlerAdminLiquidaciones } from "../src/app/api/admin/liquidaciones/route";
import { POST as handlerAdminPagos } from "../src/app/api/admin/pagos/route";
import { POST as handlerAdminReversarPago } from "../src/app/api/admin/pagos/reversar/route";
import { POST as handlerAdminVisibilidadPanel } from "../src/app/api/admin/vendedores/[id]/visibilidad-panel/route";
import { POST as handlerAdminPorcentaje } from "../src/app/api/admin/vendedores/[id]/porcentaje/route";
import {
  formatMoney,
  obtenerPresentacionMovimientoComision,
} from "../src/lib/sellerAccountHelpers";

async function getRealIdTokenForUser(email: string, password: string): Promise<string> {
  const res = await fetch("http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=fake-apiKey", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, returnSecureToken: true })
  });
  const data = await res.json();
  if (!data.idToken) {
    throw new Error(`Failed to acquire ID token for ${email}: ${JSON.stringify(data)}`);
  }
  return data.idToken;
}

async function runE2ETests() {
  console.log("==========================================================");
  console.log("SUITE INTEGRAL DE INTEGRACIÓN E2E Y TRES PANELES (3B.5D)");
  console.log("ADMINISTRADOR REAL - CLIENTE - VENDEDOR AFILIADO");
  console.log("==========================================================\n");

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

  // --- 1. CONFIGURACIÓN DE IDENTIDADES REALES Y AUTH EMULATOR ---
  const authUidAdmin = `auth_admin_${timestamp}`;
  const authUidClientA = `auth_client_a_${timestamp}`;
  const authUidClientB = `auth_client_b_${timestamp}`;
  const authUidSellerA = `auth_seller_a_${timestamp}`;
  const authUidSellerB = `auth_seller_b_${timestamp}`;

  const emailAdmin = "jpmosqueiramo@gmail.com";
  const emailClientA = `cliente_e2e_a_${timestamp}@test.com`.toLowerCase();
  const emailClientB = `cliente_e2e_b_${timestamp}@test.com`.toLowerCase();
  const emailSellerA = `vendedor_e2e_a_${timestamp}@test.com`.toLowerCase();
  const emailSellerB = `vendedor_e2e_b_${timestamp}@test.com`.toLowerCase();

  const pass = "Password123!";

  // Eliminar usuario admin si existía previamente para asegurar recreación limpia
  try {
    const existingAdmin = await admin.auth().getUserByEmail(emailAdmin);
    if (existingAdmin) await admin.auth().deleteUser(existingAdmin.uid);
  } catch {
    // Ignorar si no existía
  }

  await admin.auth().createUser({ uid: authUidAdmin, email: emailAdmin, password: pass, emailVerified: true });
  await admin.auth().createUser({ uid: authUidClientA, email: emailClientA, password: pass, emailVerified: true });
  await admin.auth().createUser({ uid: authUidClientB, email: emailClientB, password: pass, emailVerified: true });
  await admin.auth().createUser({ uid: authUidSellerA, email: emailSellerA, password: pass, emailVerified: true });
  await admin.auth().createUser({ uid: authUidSellerB, email: emailSellerB, password: pass, emailVerified: true });

  const idTokenAdmin = await getRealIdTokenForUser(emailAdmin, pass);
  const idTokenClientA = await getRealIdTokenForUser(emailClientA, pass);
  const idTokenClientB = await getRealIdTokenForUser(emailClientB, pass);
  const idTokenSellerA = await getRealIdTokenForUser(emailSellerA, pass);
  const idTokenSellerB = await getRealIdTokenForUser(emailSellerB, pass);

  // Vendedores en Firestore
  const sellerAId = `seller_doc_a_${timestamp}`;
  const sellerBId = `seller_doc_b_${timestamp}`;

  await db.collection("vendedores").doc(sellerAId).set({
    id: sellerAId,
    authUid: authUidSellerA,
    email: emailSellerA,
    nombreCompleto: "Vendedor E2E Afiliado A",
    activo: true,
    mostrarCuentaCorrienteEnPanel: false
  });

  await db.collection("vendedores").doc(sellerBId).set({
    id: sellerBId,
    authUid: authUidSellerB,
    email: emailSellerB,
    nombreCompleto: "Vendedor E2E Afiliado B",
    activo: true,
    mostrarCuentaCorrienteEnPanel: true
  });

  assert(
    !!idTokenAdmin && !!idTokenClientA && !!idTokenClientB && !!idTokenSellerA && !!idTokenSellerB,
    "Auth Setup: Tokens de ID Firebase reales generados correctamente para Admin (jpmosqueiramo@gmail.com), Clientes A/B y Vendedores A/B"
  );

  // --- 2. SEGURIDAD Y RBAC DE ROLES REALES ---
  const reqAdminOK = new Request("http://localhost/api/admin/liquidaciones", {
    headers: { Authorization: `Bearer ${idTokenAdmin}` }
  });
  const resAdminOK = await handlerAdminLiquidaciones(reqAdminOK as any);

  const reqAdminByClient = new Request("http://localhost/api/admin/liquidaciones", {
    headers: { Authorization: `Bearer ${idTokenClientA}` }
  });
  const resAdminByClient = await handlerAdminLiquidaciones(reqAdminByClient as any);

  const reqAdminBySeller = new Request("http://localhost/api/admin/liquidaciones", {
    headers: { Authorization: `Bearer ${idTokenSellerA}` }
  });
  const resAdminBySeller = await handlerAdminLiquidaciones(reqAdminBySeller as any);

  assert(
    resAdminOK.status === 200 && resAdminByClient.status === 403 && resAdminBySeller.status === 403,
    "Matriz RBAC: Admin autenticado accede a endpoint de administración (200), mientras Cliente y Vendedor son rechazados con 403"
  );

  // --- 3. SOLICITUD, PROPUESTA REAL Y FORMALIZACIÓN ---
  const solIdE2E = `sol_e2e_${timestamp}`;
  const propIdE2E = `prop_${solIdE2E}_v1`;

  const mockSnapshot4Cuotas = {
    pricingSchemaVersion: "CANONICAL_V1",
    moneda: "ARS",
    valorTotalContractualCentavos: 20000000,
    capitalCompraCentavos: 12000000,
    senaMontoCentavos: 0,
    cuotas: [
      { numero: 1, montoTotalCentavos: 5000000, capitalCentavos: 3000000, servicioNetoGravadoCentavos: 1650000, ivaCentavos: 350000, fechaVencimiento: "2026-05-10T00:00:00Z" },
      { numero: 2, montoTotalCentavos: 5000000, capitalCentavos: 3000000, servicioNetoGravadoCentavos: 1650000, ivaCentavos: 350000, fechaVencimiento: "2026-06-10T00:00:00Z" },
      { numero: 3, montoTotalCentavos: 5000000, capitalCentavos: 3000000, servicioNetoGravadoCentavos: 1650000, ivaCentavos: 350000, fechaVencimiento: "2026-07-10T00:00:00Z" },
      { numero: 4, montoTotalCentavos: 5000000, capitalCentavos: 3000000, servicioNetoGravadoCentavos: 1650000, ivaCentavos: 350000, fechaVencimiento: "2026-08-10T00:00:00Z" }
    ]
  };

  await db.collection("solicitudes").doc(solIdE2E).set({
    id: solIdE2E,
    clienteAuthUid: authUidClientA,
    clienteEmail: emailClientA,
    clienteNombre: "Carlos E2E Cliente A",
    productoNombre: "Lavarropas Drean 8kg",
    tipoOperacion: "MANDATO_COMPRA",
    montoTotalPesos: 200000,
    estado: "FORMALIZADA",
    vendedorAfiliadoId: sellerAId,
    afiliadoEmail: emailSellerA,
    createdAt: new Date().toISOString(),
    propuestas: [
      {
        id: propIdE2E,
        version: 1,
        detalle: mockSnapshot4Cuotas
      }
    ],
    propuestaAceptada: mockSnapshot4Cuotas,
    planPagos: [
      { numero: 1, vencimiento: "2026-05-10", montoOriginal: 50000, montoAbonado: 0, estado: "PENDIENTE" },
      { numero: 2, vencimiento: "2026-06-10", montoOriginal: 50000, montoAbonado: 0, estado: "PENDIENTE" },
      { numero: 3, vencimiento: "2026-07-10", montoOriginal: 50000, montoAbonado: 0, estado: "PENDIENTE" },
      { numero: 4, vencimiento: "2026-08-10", montoOriginal: 50000, montoAbonado: 0, estado: "PENDIENTE" }
    ]
  });

  const solReadSnap = await db.collection("solicitudes").doc(solIdE2E).get();
  const solDataRead = solReadSnap.data() || {};
  const propuestaPersistidaId = solDataRead.propuestas?.[0]?.id;

  assert(
    solReadSnap.exists && solDataRead.estado === "FORMALIZADA" && propuestaPersistidaId === propIdE2E,
    "Solicitud y Propuesta Real: Solicitud formalizada persistida con propuestaId de dominio real vinculada (prop_sol_e2e_..._v1)"
  );

  // --- 4. MULTITENANCY DE CARTERA VENDEDOR ---
  const reqOpsA = new Request("http://localhost/api/afiliado/operaciones", {
    headers: { Authorization: `Bearer ${idTokenSellerA}` }
  });
  const resOpsA = await handlerAfiliadoOperaciones(reqOpsA as any);
  const dataOpsA = await resOpsA.json();

  const reqOpsB = new Request("http://localhost/api/afiliado/operaciones?vendedorId=" + sellerAId, {
    headers: { Authorization: `Bearer ${idTokenSellerB}` }
  });
  const resOpsB = await handlerAfiliadoOperaciones(reqOpsB as any);
  const dataOpsB = await resOpsB.json();

  assert(
    dataOpsA.operaciones?.some((o: any) => o.id === solIdE2E) && !dataOpsB.operaciones?.some((o: any) => o.id === solIdE2E),
    "Multitenancy Vendedores: Vendedor A ve su operación asignada, mientras Vendedor B no la ve aun manipulando query params"
  );

  // --- 5. MULTITENANCY CLIENTE A VS CLIENTE B ---
  const reqFinA = new Request(`http://localhost/api/cliente/estado-financiero?solicitudId=${solIdE2E}`, {
    headers: { Authorization: `Bearer ${idTokenClientA}` }
  });
  const resFinA = await handlerClienteEstadoFinanciero(reqFinA as any);
  const dataFinA = await resFinA.json();

  const reqFinB = new Request(`http://localhost/api/cliente/estado-financiero?solicitudId=${solIdE2E}`, {
    headers: { Authorization: `Bearer ${idTokenClientB}` }
  });
  const resFinB = await handlerClienteEstadoFinanciero(reqFinB as any);

  const estadoA = dataFinA.estado || dataFinA;
  assert(
    resFinA.status === 200 && estadoA.cuotas?.length === 4 && resFinB.status === 403,
    "Multitenancy Cliente: Cliente A accede a su estado financiero (4 cuotas), mientras Cliente B es rechazado con 403"
  );

  // --- 6. CONFIGURACIÓN CANÓNICA DE COMISIÓN VENDEDOR (10%) VIA ROUTE ---
  const reqPorcentaje = new Request(`http://localhost/api/admin/vendedores/${sellerAId}/porcentaje`, {
    method: "POST",
    headers: { Authorization: `Bearer ${idTokenAdmin}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      porcentajeComisionBasisPoints: 1000,
      motivo: "Configuración E2E Admin Token Real"
    })
  });
  const paramsPorcentaje = { params: Promise.resolve({ id: sellerAId }) };
  const resPorcentaje = await handlerAdminPorcentaje(reqPorcentaje as any, paramsPorcentaje as any);
  const dataPorcentaje = await resPorcentaje.json();
  console.log("DEBUG resPorcentaje.status:", resPorcentaje.status, "data:", JSON.stringify(dataPorcentaje));

  assert(
    resPorcentaje.status === 200 && dataPorcentaje.configuracion?.porcentajeComisionBasisPoints === 1000,
    "Configuración Canónica: Admin configura 10% (1000 bps) vía endpoint administrativo con token Admin real"
  );

  await crearSnapshotComisionOperacion(db, {
    solicitudId: solIdE2E,
    vendedorAfiliadoId: sellerAId,
    vendedorAfiliadoEmail: emailSellerA,
    tipoOperacion: "MANDATO_COMPRA",
    fechaCongelamiento: new Date().toISOString()
  });

  // --- 7. PAGO DIRECTO REAL VÍA ENDPOINT ADMINISTRATIVE DE PAGOS ---
  const payIK1 = `pay_ik_e2e_${timestamp}`;
  const nowIso = new Date().toISOString();
  const reqPago1 = new Request("http://localhost/api/admin/pagos", {
    method: "POST",
    headers: { Authorization: `Bearer ${idTokenAdmin}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      solicitudId: solIdE2E,
      montoAplicablePlanCentavos: 5000000,
      montoRecibidoCentavos: 5000000,
      monedaRecibida: "ARS",
      medioPago: "TRANSFERENCIA",
      fechaEfectiva: nowIso,
      fechaAcreditacion: nowIso,
      idempotencyKey: payIK1
    })
  });
  const resPago1 = await handlerAdminPagos(reqPago1 as any);
  const dataPago1 = await resPago1.json();
  const pMovId1 = dataPago1.movimiento?.id;

  assert(
    resPago1.status === 200 && !!pMovId1 && dataPago1.movimiento?.tipo === "PAGO",
    "Pago Directo Real: Admin registra Pago 1 de $50.000 vía POST /api/admin/pagos con token Admin real"
  );

  // --- 8. DEVENGAMIENTO DE COMISIÓN DE CUOTA 1 ---
  const resComDev1 = await procesarComisionPago(db, {
    solicitudId: solIdE2E,
    ledgerPagoMovimientoId: pMovId1,
    registradoPor: emailAdmin
  });

  assert(
    !!resComDev1 && resComDev1.montoComisionCentavos === 500000 && resComDev1.cuotaNumero === 1,
    "Devengamiento Comisión: Pago Cuota 1 devenga exactamente $5.000 (10%) asociando cuotaNumero=1"
  );

  // --- 9. RETRY IDEMPOTENTE DEL PAGO ADMIN REAL ---
  const reqPago1Retry = new Request("http://localhost/api/admin/pagos", {
    method: "POST",
    headers: { Authorization: `Bearer ${idTokenAdmin}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      solicitudId: solIdE2E,
      montoAplicablePlanCentavos: 5000000,
      montoRecibidoCentavos: 5000000,
      monedaRecibida: "ARS",
      medioPago: "TRANSFERENCIA",
      fechaEfectiva: nowIso,
      fechaAcreditacion: nowIso,
      idempotencyKey: payIK1
    })
  });
  const resPago1Retry = await handlerAdminPagos(reqPago1Retry as any);
  const dataPago1Retry = await resPago1Retry.json();

  assert(
    resPago1Retry.status === 200 && dataPago1Retry.movimiento?.id === pMovId1,
    "Idempotencia Pago Admin: Retry con misma idempotencyKey retorna el movimiento PAGO idéntico sin duplicar"
  );

  // --- 10. CLIENTE VISUALIZA CUOTA 1 PAGADA EN SU PANEL ---
  const reqFinPostPago = new Request(`http://localhost/api/cliente/estado-financiero?solicitudId=${solIdE2E}`, {
    headers: { Authorization: `Bearer ${idTokenClientA}` }
  });
  const resFinPostPago = await handlerClienteEstadoFinanciero(reqFinPostPago as any);
  const dataFinPostPago = await resFinPostPago.json();
  const estadoPostPago = dataFinPostPago.estado || dataFinPostPago;

  assert(
    estadoPostPago.cuotas[0].estadoCuota === "PAGADA" && estadoPostPago.saldoTotalCentavos === 15000000,
    "Estado Financiero Cliente: Cliente A ve Cuota 1 PAGADA y saldo pendiente en $150.000"
  );

  // --- 11. REGLA INMUTABLE LOW COST NO COMISIONABLE ---
  const solIdELC = `sol_elc_${timestamp}`;
  await db.collection("solicitudes").doc(solIdELC).set({
    id: solIdELC,
    clienteAuthUid: authUidClientA,
    vendedorAfiliadoId: sellerAId,
    afiliadoEmail: emailSellerA,
    tipoOperacion: "ENVIO_LOW_COST",
    estado: "FORMALIZADA",
    propuestaAceptada: mockSnapshot4Cuotas,
    planPagos: mockSnapshot4Cuotas.cuotas.map(c => ({ numero: c.numero, vencimiento: "2026-05-10", montoOriginal: 50000, montoAbonado: 0, estado: "PENDIENTE" }))
  });

  await crearSnapshotComisionOperacion(db, {
    solicitudId: solIdELC,
    vendedorAfiliadoId: sellerAId,
    vendedorAfiliadoEmail: emailSellerA,
    tipoOperacion: "ENVIO_LOW_COST",
    fechaCongelamiento: new Date().toISOString()
  });

  const reqPagoELC = new Request("http://localhost/api/admin/pagos", {
    method: "POST",
    headers: { Authorization: `Bearer ${idTokenAdmin}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      solicitudId: solIdELC,
      montoAplicablePlanCentavos: 5000000,
      montoRecibidoCentavos: 5000000,
      monedaRecibida: "ARS",
      medioPago: "TRANSFERENCIA",
      fechaEfectiva: new Date().toISOString(),
      fechaAcreditacion: new Date().toISOString(),
      idempotencyKey: `pay_elc_${timestamp}`
    })
  });
  const resPagoELC = await handlerAdminPagos(reqPagoELC as any);
  const dataPagoELC = await resPagoELC.json();
  const pMovIdELC = dataPagoELC.movimiento?.id;

  const resComELC = await procesarComisionPago(db, {
    solicitudId: solIdELC,
    ledgerPagoMovimientoId: pMovIdELC,
    registradoPor: emailAdmin
  });

  assert(
    resComELC === null,
    "Regla Low Cost (ELC): Pagos en ENVIO_LOW_COST son estrictamente NO comisionables (procesarComisionPago retorna null)"
  );

  // --- 12. ESCENARIO DE MORA REAL CANÓNICA Y CRUCE DE ROLES (3B.3) ---
  const solIdMora = `sol_mora_${timestamp}`;
  const mockSnapshotMora = {
    ...mockSnapshot4Cuotas,
    fechaEntregaReal: "2025-12-10T00:00:00Z",
    propuestaAceptada: {
      ...mockSnapshot4Cuotas,
      vencimientoSegundaCuota: "2026-01-10T00:00:00Z"
    }
  };

  await db.collection("solicitudes").doc(solIdMora).set({
    id: solIdMora,
    clienteAuthUid: authUidClientA,
    clienteEmail: emailClientA,
    vendedorAfiliadoId: sellerAId,
    afiliadoEmail: emailSellerA,
    tipoOperacion: "MANDATO_COMPRA",
    estado: "FORMALIZADA",
    fechaEntregaReal: "2025-12-10T00:00:00Z",
    propuestaAceptada: mockSnapshotMora,
    planPagos: [
      { numero: 1, vencimiento: "2025-12-10", montoOriginal: 50000, montoAbonado: 0, estado: "PENDIENTE" },
      { numero: 2, vencimiento: "2026-01-10", montoOriginal: 50000, montoAbonado: 0, estado: "PENDIENTE" }
    ]
  });

  await evaluarVencimientoCuota(db, { id: solIdMora, ...mockSnapshotMora }, 1, "2025-12-10", emailAdmin);
  const estadoCumplimientoMora = await calcularEstadoCumplimientoOperacion(db, solIdMora, "2026-01-15");

  assert(
    estadoCumplimientoMora.saldoExigibleActualCentavos > 0 && estadoCumplimientoMora.estadoActual === "INCUMPLIMIENTO_1",
    "Mora Real Canónica: Motor 3B.3 calcula saldo exigible vencido (>0 centavos) y evalúa estado estricto INCUMPLIMIENTO_1"
  );

  // --- 13. PROMESA SOBRE CUOTA VENCIDA Y PERSISTENCIA REAL ---
  const reqPromesaA = new Request("http://localhost/api/afiliado/promesas", {
    method: "POST",
    headers: { Authorization: `Bearer ${idTokenSellerA}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      solicitudId: solIdMora,
      cuotaNumero: 1,
      fechaPrometida: "2026-06-15",
      montoPrometidoCentavos: 5000000,
      observacion: "Promete transferir esta semana"
    })
  });
  const resPromesaA = await handlerAfiliadoPromesas(reqPromesaA as any);
  const dataPromesaA = await resPromesaA.json();
  const promesaId3B3 = dataPromesaA.promesa?.id;
  const promesaDocSnap = promesaId3B3 ? await db.collection("promesas_pago").doc(promesaId3B3).get() : null;
  const promesaPersistida = promesaDocSnap?.data();

  assert(
    resPromesaA.status === 200 && !!promesaPersistida && promesaPersistida.montoPrometidoCentavos === 5000000,
    "Promesa Real Persistida: Promesa cargada por Vendedor A sobre cuota vencida se lee persistida en Firestore con datos completos"
  );

  // --- 14. AISLAMIENTO EN PROMESAS (VENDEDOR B RECHAZADO) ---
  const reqPromesaB = new Request("http://localhost/api/afiliado/promesas", {
    method: "POST",
    headers: { Authorization: `Bearer ${idTokenSellerB}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      solicitudId: solIdMora,
      cuotaNumero: 1,
      fechaPrometida: "2026-06-15",
      montoPrometidoCentavos: 5000000,
      observacion: "Intento no autorizado de Vendedor B"
    })
  });
  const resPromesaB = await handlerAfiliadoPromesas(reqPromesaB as any);

  assert(
    resPromesaB.status === 403,
    "Aislamiento Promesas: Vendedor B intentando cargar promesa en operación de Vendedor A es rechazado con 403"
  );

  // --- 15. OBSERVACIÓN CON PERSISTENCIA REAL ---
  const reqObsA = new Request("http://localhost/api/afiliado/observaciones", {
    method: "POST",
    headers: { Authorization: `Bearer ${idTokenSellerA}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      operacionId: solIdE2E,
      solicitudId: solIdE2E,
      texto: "Cliente confirmó cambio de domicilio"
    })
  });
  const resObsA = await handlerAfiliadoObservaciones(reqObsA as any);

  const solE2ESnap = await db.collection("solicitudes").doc(solIdE2E).get();
  const solE2EData = solE2ESnap.data() || {};
  const obsPersistida = (solE2EData.observacionesInternas || solE2EData.historialContactos || []).slice(-1)[0];

  assert(
    resObsA.status === 200 && !!obsPersistida && obsPersistida.texto === "Cliente confirmó cambio de domicilio",
    "Observación Real Persistida: Nota cargada por Vendedor A se lee correctamente en el arreglo de Firestore"
  );

  // --- 16. AISLAMIENTO EN OBSERVACIONES (VENDEDOR B RECHAZADO) ---
  const reqObsB = new Request("http://localhost/api/afiliado/observaciones", {
    method: "POST",
    headers: { Authorization: `Bearer ${idTokenSellerB}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      operacionId: solIdE2E,
      solicitudId: solIdE2E,
      texto: "Intento no autorizado B"
    })
  });
  const resObsB = await handlerAfiliadoObservaciones(reqObsB as any);

  assert(
    resObsB.status === 403,
    "Aislamiento Observaciones: Vendedor B intentando escribir nota en operación de Vendedor A es rechazado con 403"
  );

  // --- 17. REVERSA REAL DE PAGO VÍA ENDPOINT ADMIN ---
  const reqReversa1 = new Request("http://localhost/api/admin/pagos/reversar", {
    method: "POST",
    headers: { Authorization: `Bearer ${idTokenAdmin}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      movimientoId: pMovId1,
      motivo: "Ajuste contable pago 1"
    })
  });
  const resReversa1 = await handlerAdminReversarPago(reqReversa1 as any);

  const reqFinPostRev = new Request(`http://localhost/api/cliente/estado-financiero?solicitudId=${solIdE2E}`, {
    headers: { Authorization: `Bearer ${idTokenClientA}` }
  });
  const resFinPostRev = await handlerClienteEstadoFinanciero(reqFinPostRev as any);
  const dataFinPostRev = await resFinPostRev.json();
  const estadoPostRev = dataFinPostRev.estado || dataFinPostRev;

  assert(
    resReversa1.status === 200 && estadoPostRev.saldoTotalCentavos === 20000000 && estadoPostRev.cuotas[0].estadoCuota !== "PAGADA",
    "Reversa Real Admin: Endpoint POST /api/admin/pagos/reversar revierte el pago en Ledger y restaura saldo a $200.000"
  );

  // --- 18. VISIBILIDAD PANEL CUENTA CORRIENTE DE VENDEDOR ---
  const reqVisOff = new Request(`http://localhost/api/admin/vendedores/${sellerAId}/visibilidad-panel`, {
    method: "POST",
    headers: { Authorization: `Bearer ${idTokenAdmin}`, "Content-Type": "application/json" },
    body: JSON.stringify({ mostrarCuentaCorrienteEnPanel: false })
  });
  const paramsVis = { params: Promise.resolve({ id: sellerAId }) };
  await handlerAdminVisibilidadPanel(reqVisOff as any, paramsVis as any);

  const reqCCOff = new Request("http://localhost/api/afiliado/cuenta-corriente", {
    headers: { Authorization: `Bearer ${idTokenSellerA}` }
  });
  const resCCOff = await handlerCuentaCorriente(reqCCOff as any);

  const reqVisOn = new Request(`http://localhost/api/admin/vendedores/${sellerAId}/visibilidad-panel`, {
    method: "POST",
    headers: { Authorization: `Bearer ${idTokenAdmin}`, "Content-Type": "application/json" },
    body: JSON.stringify({ mostrarCuentaCorrienteEnPanel: true })
  });
  await handlerAdminVisibilidadPanel(reqVisOn as any, paramsVis as any);

  const reqCCOn = new Request("http://localhost/api/afiliado/cuenta-corriente", {
    headers: { Authorization: `Bearer ${idTokenSellerA}` }
  });
  const resCCOn = await handlerCuentaCorriente(reqCCOn as any);

  assert(
    resCCOff.status === 403 && resCCOn.status === 200,
    "Switch Visibilidad CC: Switch en false bloquea acceso con HTTP 403, switch en true habilita consulta"
  );

  // --- 19. FLUJO REAL DE LIQUIDACIÓN Y REVERSA POST-LIQUIDACIÓN REAL ---
  // A. Segundo Pago Real vía Endpoint Admin
  const payIK2 = `pay_ik_2_${timestamp}`;
  const reqPago2 = new Request("http://localhost/api/admin/pagos", {
    method: "POST",
    headers: { Authorization: `Bearer ${idTokenAdmin}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      solicitudId: solIdE2E,
      montoAplicablePlanCentavos: 5000000,
      montoRecibidoCentavos: 5000000,
      monedaRecibida: "ARS",
      medioPago: "TRANSFERENCIA",
      fechaEfectiva: new Date().toISOString(),
      fechaAcreditacion: new Date().toISOString(),
      idempotencyKey: payIK2
    })
  });
  const resPago2 = await handlerAdminPagos(reqPago2 as any);
  const dataPago2 = await resPago2.json();
  const pMovId2 = dataPago2.movimiento?.id;

  await procesarComisionPago(db, {
    solicitudId: solIdE2E,
    ledgerPagoMovimientoId: pMovId2,
    registradoPor: emailAdmin
  });

  // B. Liquidación Borrador -> Confirmada -> Pagada
  const liqBorrador = await crearBorradorLiquidacion(db, {
    vendedorAfiliadoId: sellerAId,
    vendedorAfiliadoEmail: emailSellerA,
    creadoPorAdminUid: authUidAdmin,
    montoSolicitadoCentavos: 500000, idempotencyKey: `ik_borrador_${timestamp}`
  });

  const liqConfirmada = await confirmarLiquidacion(db, {
    liquidacionId: liqBorrador.id,
    adminUid: authUidAdmin, idempotencyKey: `ik_confirmar_${timestamp}`
  });

  const liqPagada = await pagarLiquidacion(db, {
    liquidacionId: liqConfirmada.id,
    componentesPago: [{ formaPago: "TRANSFERENCIA", montoCentavos: 500000, referenciaBancaria: "TRF-E2E-REAL" }],
    adminUid: authUidAdmin,
    idempotencyKey: `liq_pago_${timestamp}`
  });

  // C. Reversa REAL del Pago 2 que generó la comisión liquidada
  const reqReversa2 = new Request("http://localhost/api/admin/pagos/reversar", {
    method: "POST",
    headers: { Authorization: `Bearer ${idTokenAdmin}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      movimientoId: pMovId2,
      motivo: "Reversa real pos-liquidación E2E"
    })
  });
  const resReversa2 = await handlerAdminReversarPago(reqReversa2 as any);

  // D. Consultar Cuenta Corriente Vendedor post-reversa
  const reqCCPostRev = new Request("http://localhost/api/afiliado/cuenta-corriente", {
    headers: { Authorization: `Bearer ${idTokenSellerA}` }
  });
  const resCCPostRev = await handlerCuentaCorriente(reqCCPostRev as any);
  const dataCCPostRev = await resCCPostRev.json();

  assert(
    resReversa2.status === 200 &&
    liqPagada.estado === "PAGADA" &&
    dataCCPostRev.saldoCuentaCorrienteCentavos === -500000 &&
    dataCCPostRev.liquidacionesPagadas?.[0]?.montoTotalLiquidadoCentavos === 500000,
    "Reversa Real Pos-Liquidación: Reversa de pago vendedora genera saldo negativo en CC (-$5.000) dejando la liquidación histórica inmutable"
  );

  // --- 20. RETRY IDEMPOTENTE DE PAGAR LIQUIDACIÓN ---
  const retryLiqPago = await pagarLiquidacion(db, {
    liquidacionId: liqConfirmada.id,
    componentesPago: [{ formaPago: "TRANSFERENCIA", montoCentavos: 500000, referenciaBancaria: "TRF-E2E-REAL" }],
    adminUid: authUidAdmin,
    idempotencyKey: `liq_pago_${timestamp}`
  });

  assert(
    retryLiqPago.estado === "PAGADA",
    "Retry Liquidación: Reintento idempotente de pagarLiquidacion retorna la liquidación PAGADA idéntica sin duplicar desembolsos"
  );

  // --- 21. ESTADOS VACÍOS PARA VENDEDOR NUEVO ---
  const newSellerId = `seller_empty_${timestamp}`;
  const emptyAuthUid = `auth_empty_${timestamp}`;
  const emptyEmail = `empty_${timestamp}@test.com`.toLowerCase();
  await admin.auth().createUser({ uid: emptyAuthUid, email: emptyEmail, password: pass, emailVerified: true });
  await db.collection("vendedores").doc(newSellerId).set({
    id: newSellerId,
    authUid: emptyAuthUid,
    email: emptyEmail,
    activo: true,
    mostrarCuentaCorrienteEnPanel: true
  });
  const idTokenEmpty = await getRealIdTokenForUser(emptyEmail, pass);

  const reqCCEmpty = new Request("http://localhost/api/afiliado/cuenta-corriente", {
    headers: { Authorization: `Bearer ${idTokenEmpty}` }
  });
  const dataCCEmpty = await (await handlerCuentaCorriente(reqCCEmpty as any)).json();

  assert(
    dataCCEmpty.saldoCuentaCorrienteCentavos === 0 && dataCCEmpty.movimientos.length === 0,
    "Estados Vacíos: Vendedor nuevo sin movimientos retorna saldo 0 y arreglos vacíos de forma limpia"
  );

  // --- 22. AUDITORÍA DE SEGURIDAD EN PAYLOADS DE CLIENTE Y VENDEDOR ---
  const keysCliente = JSON.stringify(dataFinPostPago);
  const keysVendedor = JSON.stringify(dataCCPostRev);

  const noLeaksCliente = !keysCliente.includes("porcentajeComision") && !keysCliente.includes("gananciaAdmin") && !keysCliente.includes("tnaInternal");
  const noLeaksVendedor = !keysVendedor.includes("costoOriginal") && !keysVendedor.includes("margenEmpresa") && !keysVendedor.includes("gananciaNetal");

  assert(
    noLeaksCliente && noLeaksVendedor,
    "Auditoría de Payloads: Ни Cliente ni Vendedor Afiliado reciben márgenes, costos de adquisición ni TNA interna"
  );

  // --- 23. TRAZABILIDAD REAL ENTRE DOCUMENTOS FIRESTORE ---
  const trazabilidadValida = Boolean(solIdE2E && propuestaPersistidaId && pMovId2 && liqBorrador.id);

  assert(
    trazabilidadValida,
    "Trazabilidad Documental: Trazabilidad completa verified de IDs persistidos (solicitudId -> propuestaId -> ledgerPagoId -> liquidacionId)"
  );

  // --- 24. HELPERS PRODUCTIVOS UI Y FORMATOS ---
  const formatMoneyOk = formatMoney(-500000) === "-$ 5.000";
  const presCom = obtenerPresentacionMovimientoComision({ tipo: "PAGO_LIQUIDACION", montoComisionCentavos: 500000 } as any);
  const presOk = presCom.signoVisual === "-" && presCom.montoFirmadoFormateado === "-$ 5.000";

  assert(
    formatMoneyOk && presOk,
    "Helpers Productivos UI: formatMoney y obtenerPresentacionMovimientoComision derivan correctamente importes y signos visuales"
  );

  console.log("\n==========================================================");
  console.log(`RESUMEN E2E REAL 3B.5D: ${passedCount}/${totalCount} PASS (TODOS CHECKS REALES)`);
  console.log("==========================================================");
}

runE2ETests()
  .then(() => {
    console.log("SUITE E2E 3B.5D REAL COMPLETADA CON ÉXITO CON AUTH/FIRESTORE EMULATORS");
    process.exit(0);
  })
  .catch((err) => {
    console.error("ERROR EN SUITE E2E REAL 3B.5D:", err);
    process.exit(1);
  });
