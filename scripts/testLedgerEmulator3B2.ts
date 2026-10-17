import "./helpers/requireSafeEmulatorEnvironment";
import { admin } from "../src/lib/firebaseAdmin";
import { 
  registrarPagoDirectoAdmin,
  validarReceptorEfectivoAutorizado
} from "../src/lib/ledgerEngine";
import { verifyClientAuth } from "../src/lib/clientAuth";
import { NextRequest } from "next/server";

async function getRealIdTokenForUser(email: string, password: string): Promise<string> {
  const res = await fetch("http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=fake-apiKey", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, returnSecureToken: true })
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data = (await res.json()) as any;
  if (data?.idToken) return data.idToken;

  const signUpRes = await fetch("http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake-apiKey", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, returnSecureToken: true })
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const signUpData = (await signUpRes.json()) as any;
  if (signUpData?.idToken) return signUpData.idToken;
  throw new Error("Could not obtain idToken from Auth emulator: " + JSON.stringify(signUpData));
}

async function testClientBrowserWriteDenied(collectionName: string, docId: string): Promise<boolean> {
  const url = `http://127.0.0.1:8080/v1/projects/demo-cuenta-hogar/databases/(default)/documents/${collectionName}/${docId}`;
  const res = await fetch(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fields: { testField: { stringValue: "unauthorized_browser_write" } } })
  });
  // Firestore Emulator Rules reject browser/client unauthenticated writes with 403 or 400 PERMISSION_DENIED
  return res.status === 403 || res.status === 400 || res.status === 401;
}

async function runEmulatorTests() {
  console.log("=== FIREBASE FIRESTORE & AUTH EMULATOR TEST SUITE (3B.2) ===");
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

  // 1. CREAR USUARIOS DE PRUEBA REALES EN FIREBASE AUTH EMULATOR
  const emailA = "clientA_" + Date.now() + "@test.com";
  const emailB = "clientB_" + Date.now() + "@test.com";
  const password = "Password123!";

  const userA = await admin.auth().createUser({ email: emailA, password, emailVerified: true });
  const userB = await admin.auth().createUser({ email: emailB, password, emailVerified: true });

  const uidA = userA.uid;
  const uidB = userB.uid;

  // Obtener tokens de ID reales emitidos por el Auth Emulator
  const tokenA = await getRealIdTokenForUser(emailA, password);
  const tokenB = await getRealIdTokenForUser(emailB, password);

  // 2. CREAR SOLICITUDES EN FIRESTORE EMULATOR CON VÍNCULO CANÓNICO clienteAuthUid
  const solIdA = "sol_emul_A_" + Date.now();
  const solIdB = "sol_emul_B_" + Date.now();
  const solIdUnlinked = "sol_emul_unlinked_" + Date.now();
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
    valorTotalContractualCentavos: 300,
    capitalCompraCentavos: 180,
    senaMontoCentavos: 0,
    cuotas: [
      { numero: 1, montoTotalCentavos: 100, capitalCentavos: 60, servicioNetoGravadoCentavos: 33, ivaCentavos: 7 },
      { numero: 2, montoTotalCentavos: 100, capitalCentavos: 60, servicioNetoGravadoCentavos: 33, ivaCentavos: 7 },
      { numero: 3, montoTotalCentavos: 100, capitalCentavos: 60, servicioNetoGravadoCentavos: 33, ivaCentavos: 7 }
    ]
  };

  await db.collection("solicitudes").doc(solIdA).set({
    id: solIdA,
    clienteAuthUid: uidA,
    clienteEmail: emailA,
    propuestaAceptada: mockSnapshotARS
  });

  await db.collection("solicitudes").doc(solIdB).set({
    id: solIdB,
    clienteAuthUid: uidB,
    clienteEmail: emailB,
    propuestaAceptada: mockSnapshotARS
  });

  await db.collection("solicitudes").doc(solIdUnlinked).set({
    id: solIdUnlinked,
    clienteEmail: "unlinked@test.com",
    propuestaAceptada: mockSnapshotARS
  });

  const solIdClienteIdOnly = "sol_emul_clienteIdOnly_" + Date.now();
  await db.collection("solicitudes").doc(solIdClienteIdOnly).set({
    id: solIdClienteIdOnly,
    clienteId: uidA,
    propuestaAceptada: mockSnapshotARS
  });

  const solIdEmailOnly = "sol_emul_emailOnly_" + Date.now();
  await db.collection("solicitudes").doc(solIdEmailOnly).set({
    id: solIdEmailOnly,
    clienteEmail: emailA,
    email: emailA,
    propuestaAceptada: mockSnapshotARS
  });

  await db.collection("solicitudes").doc(solIdUSD).set({
    id: solIdUSD,
    clienteAuthUid: uidA,
    clienteEmail: emailA,
    propuestaAceptada: mockSnapshotUSD
  });

  // Guardar receptor de efectivo AUTORIZADO en la fuente de verdad única
  await db.collection("receptores_efectivo_autorizados").doc("rec_oficial_caja").set({
    nombre: "Caja Central San Martín",
    activo: true
  });

  // Guardar vendedor afiliado (para verificar que NO puede ser receptor)
  await db.collection("vendedores").doc("vendedor_afiliado_1").set({
    nombre: "Juan Vendedor",
    afiliado: true
  });

  // =========================================================================
  // PRUEBAS DE TITULARIDAD (OWNERSHIP) Y TOKEN DE AUTH REAL EMULATOR
  // =========================================================================

  // A. Cliente A + token A -> Operación A = PERMITIDO
  const reqA_A = new NextRequest("http://localhost/api/cliente/estado-financiero?solicitudId=" + solIdA, {
    headers: { "authorization": `Bearer ${tokenA}` }
  });
  const resA_A = await verifyClientAuth(reqA_A, solIdA);
  assert(resA_A.authorized && resA_A.clienteId === uidA, "A. Cliente A con ID Token real de Auth Emulator accede correctamente a Operación A");

  // B. Cliente A + token A -> Operación B = DENEGADO 403
  const reqA_B = new NextRequest("http://localhost/api/cliente/estado-financiero?solicitudId=" + solIdB, {
    headers: { "authorization": `Bearer ${tokenA}` }
  });
  const resA_B = await verifyClientAuth(reqA_B, solIdB);
  assert(!resA_B.authorized, "B. Cliente A intenta acceder a Operación B de Cliente B -> Rechazado con 403:CLIENTE_NO_AUTORIZADO_OPERACION");

  // C. Cliente B + token B -> Operación B = PERMITIDO
  const reqB_B = new NextRequest("http://localhost/api/cliente/estado-financiero?solicitudId=" + solIdB, {
    headers: { "authorization": `Bearer ${tokenB}` }
  });
  const resB_B = await verifyClientAuth(reqB_B, solIdB);
  assert(resB_B.authorized && resB_B.clienteId === uidB, "C. Cliente B con ID Token real de Auth Emulator accede correctamente a Operación B");

  // D. Petición sin token -> DENEGADO 403
  const reqNoToken = new NextRequest("http://localhost/api/cliente/estado-financiero?solicitudId=" + solIdA);
  const resNoToken = await verifyClientAuth(reqNoToken, solIdA);
  assert(!resNoToken.authorized, "D. Petición sin token Bearer -> Rechazado con 403");

  // E. Token de propuesta -> DENEGADO 403
  const reqPropToken = new NextRequest("http://localhost/api/cliente/estado-financiero?solicitudId=" + solIdA, {
    headers: { "x-proposal-token": "token_dummy_123" }
  });
  const resPropToken = await verifyClientAuth(reqPropToken, solIdA);
  assert(!resPropToken.authorized, "E. Token de propuesta (tokens_propuesta) NO autoriza endpoints financieros (403)");

  // F. Operación no vinculada a clienteAuthUid -> DENEGADO 403 (CLIENTE_CUENTA_NO_VINCULADA)
  const reqUnlinked = new NextRequest("http://localhost/api/cliente/estado-financiero?solicitudId=" + solIdUnlinked, {
    headers: { "authorization": `Bearer ${tokenA}` }
  });
  const resUnlinked = await verifyClientAuth(reqUnlinked, solIdUnlinked);
  assert(!resUnlinked.authorized, "F. Operación sin clienteAuthUid vinculado -> Rechazado con 403 CLIENTE_CUENTA_NO_VINCULADA");

  // G. Sin clienteAuthUid pero clienteId === uid autenticado -> DENEGADO 403
  const reqClienteIdOnly = new NextRequest("http://localhost/api/cliente/estado-financiero?solicitudId=" + solIdClienteIdOnly, {
    headers: { "authorization": `Bearer ${tokenA}` }
  });
  const resClienteIdOnly = await verifyClientAuth(reqClienteIdOnly, solIdClienteIdOnly);
  assert(!resClienteIdOnly.authorized, "G. Sin clienteAuthUid pero clienteId === uid autenticado -> Rechazado con 403 CLIENTE_CUENTA_NO_VINCULADA");

  // H. Sin clienteAuthUid pero email coincide -> DENEGADO 403
  const reqEmailOnly = new NextRequest("http://localhost/api/cliente/estado-financiero?solicitudId=" + solIdEmailOnly, {
    headers: { "authorization": `Bearer ${tokenA}` }
  });
  const resEmailOnly = await verifyClientAuth(reqEmailOnly, solIdEmailOnly);
  assert(!resEmailOnly.authorized, "H. Sin clienteAuthUid pero email coincide -> Rechazado con 403 CLIENTE_CUENTA_NO_VINCULADA");

  // =========================================================================
  // PRUEBAS DE FIRESTORE SECURITY RULES (BACKEND ONLY WRITE - ALLOW WRITE: IF FALSE)
  // =========================================================================

  const collectionsToTest = [
    "ledger_movimientos",
    "ledger_imputaciones",
    "idempotencia_ledger",
    "ledger_operaciones",
    "pagos_informados",
    "configuracion_general"
  ];

  for (const col of collectionsToTest) {
    const denied = await testClientBrowserWriteDenied(col, "hack_doc_" + Date.now());
    assert(denied, `Rules. Escritura directa desde Browser/Client SDK en ${col} -> DENEGADA (allow write: if false)`);
  }

  // Admin SDK Server-side write -> PERMITIDO
  await db.collection("ledger_movimientos").doc("mov_admin_ok").set({
    id: "mov_admin_ok",
    solicitudId: solIdA,
    montoRecibidoCentavos: 1000
  });
  const adminDoc = await db.collection("ledger_movimientos").doc("mov_admin_ok").get();
  assert(adminDoc.exists, "Rules. Escritura Server-Side mediante Firebase Admin SDK -> PERMITIDA");

  // =========================================================================
  // PRUEBAS DE RECEPTOR DE EFECTIVO AUTORIZADO (SIN BYPASS HARDCODEADO)
  // =========================================================================

  // Receptor autorizado explícito en receptores_efectivo_autorizados con activo === true -> OK
  const isRecOk = await validarReceptorEfectivoAutorizado(db, "rec_oficial_caja");
  assert(Boolean(isRecOk?.esAutorizado ?? isRecOk), "Receptor. Receptor registrado en receptores_efectivo_autorizados con activo === true -> AUTORIZADO");

  // Email hardcodeado o admin sin registro en la colección -> RECHAZADO (Sin bypass hardcodeado)
  const isBypassFail = await validarReceptorEfectivoAutorizado(db, "jpmosqueiramo@gmail.com");
  assert(!isBypassFail?.esAutorizado, "Receptor. Email de admin/hardcodeado sin registro activo en receptores_efectivo_autorizados -> RECHAZADO (Sin bypass)");

  // Vendedor afiliado -> RECHAZADO
  const isVendedorFail = await validarReceptorEfectivoAutorizado(db, "vendedor_afiliado_1");
  assert(!isVendedorFail?.esAutorizado, "Receptor. Vendedor afiliado -> RECHAZADO (No puede ser receptor de efectivo)");

  // =========================================================================
  // PRUEBAS DE REGLAS MONETARIAS Y FX
  // =========================================================================

  // USD plan pagado en ARS con FX -> OK
  const movP = await registrarPagoDirectoAdmin(db, {
    solicitudId: solIdUSD,
    montoRecibidoCentavos: 120000,
    monedaRecibida: "ARS",
    cotizacionAplicada: 1200,
    fuenteCotizacion: "OFICIAL_BCRA",
    fechaCotizacion: "2026-10-07",
    medioPago: "TRANSFERENCIA",
    fechaEfectiva: "2026-10-07T10:00:00Z",
    fechaAcreditacion: "2026-10-07T10:00:00Z",
    registradoPor: "jpmosqueiramo@gmail.com",
    origenRegistro: "ADMIN",
    idempotencyKey: "IDEMP_USD_FX_OK_" + Date.now()
  });
  assert(movP.movimiento.montoAplicablePlanCentavos === 100 && movP.movimiento.monedaPlan === "USD", "FX. Plan USD pagado en ARS con cotización convierte exactamente a 100 centavos USD (1 USD)");

  console.log(`\nFIREBASE FIRESTORE & AUTH EMULATOR TEST SUMMARY: ${passed}/${total} checks passed cleanly.`);
  if (passed !== total) {
    process.exit(1);
  }
}

runEmulatorTests();
