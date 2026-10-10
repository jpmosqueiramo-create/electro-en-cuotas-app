process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";
process.env.FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:9099";
const targetProjectId = process.env.GCLOUD_PROJECT || "negocio-facil-page";
process.env.GCLOUD_PROJECT = targetProjectId;

import { admin } from "../src/lib/firebaseAdmin";

async function runRulesTests() {
  console.log("==========================================================");
  console.log("SUITE LOCAL DE SEGURIDAD: FIRESTORE SECURITY RULES (3B.6B.1)");
  console.log("==========================================================\\n");

  const dbAdmin = admin.firestore();
  const authAdmin = admin.auth();

  let passed = 0;
  let total = 0;

  function assert(condition: boolean, desc: string) {
    total++;
    if (condition) {
      passed++;
      console.log(`[PASS] Check ${total}: ${desc}`);
    } else {
      console.error(`[FAIL] Check ${total}: ${desc}`);
      throw new Error(`Assertion failed for check ${total}: ${desc}`);
    }
  }

  const timestamp = Date.now();
  const adminEmail = "jpmosqueiramo@gmail.com";
  const clientAEmail = `cliente_rules_a_${timestamp}@test.com`.toLowerCase();
  const clientBEmail = `cliente_rules_b_${timestamp}@test.com`.toLowerCase();
  const sellerEmail = `seller_rules_${timestamp}@test.com`.toLowerCase();
  const pass = "Password123!";

  let uAdmin, uClientA, uClientB, uSeller;
  try { uAdmin = await authAdmin.getUserByEmail(adminEmail); await authAdmin.updateUser(uAdmin.uid, { password: pass }); }
  catch { uAdmin = await authAdmin.createUser({ email: adminEmail, password: pass, emailVerified: true }); }

  try { uClientA = await authAdmin.getUserByEmail(clientAEmail); await authAdmin.updateUser(uClientA.uid, { password: pass }); }
  catch { uClientA = await authAdmin.createUser({ email: clientAEmail, password: pass, emailVerified: true }); }

  try { uClientB = await authAdmin.getUserByEmail(clientBEmail); await authAdmin.updateUser(uClientB.uid, { password: pass }); }
  catch { uClientB = await authAdmin.createUser({ email: clientBEmail, password: pass, emailVerified: true }); }

  try { uSeller = await authAdmin.getUserByEmail(sellerEmail); await authAdmin.updateUser(uSeller.uid, { password: pass }); }
  catch { uSeller = await authAdmin.createUser({ email: sellerEmail, password: pass, emailVerified: true }); }

  async function getIdTokenForUser(email: string): Promise<string> {
    const res = await fetch("http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=fake", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: pass, returnSecureToken: true })
    });
    const data = await res.json();
    if (!data.idToken) console.log("AUTH ERROR for", email, data);
    return data.idToken;
  }

  const idTokenAdmin = await getIdTokenForUser(adminEmail);
  const idTokenClientA = await getIdTokenForUser(clientAEmail);

  const idTokenSeller = await getIdTokenForUser(sellerEmail);

  async function firestoreRestCall(method: string, path: string, body?: unknown, idToken?: string) {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (idToken) headers["Authorization"] = `Bearer ${idToken}`;

    const res = await fetch(`http://127.0.0.1:8080/v1/projects/${targetProjectId}/databases/(default)/documents${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined
    });
    return res;
  }

  const solIdA = `sol_rules_a_${timestamp}`;
  const solIdB = `sol_rules_b_${timestamp}`;
  await dbAdmin.collection("solicitudes").doc(solIdA).set({
    id: solIdA,
    clienteEmail: clientAEmail,
    datosPersonales: { email: clientAEmail, numeroDni: "12345678" },
    afiliadoEmail: sellerEmail,
    estado: "FORMALIZADA",
    planPagos: [{ numero: 1, montoOriginal: 50000 }]
  });
  await dbAdmin.collection("solicitudes").doc(solIdB).set({
    id: solIdB,
    clienteEmail: clientBEmail,
    datosPersonales: { email: clientBEmail, numeroDni: "87654321" },
    afiliadoEmail: sellerEmail,
    estado: "FORMALIZADA",
    planPagos: [{ numero: 1, montoOriginal: 50000 }]
  });

  // ==========================================================
  // BLOQUE 1: REGLAS CANÓNICAS PREVIAS (CHECKS 1 A 10)
  // ==========================================================
  const resAnonVendedores = await firestoreRestCall("GET", "/vendedores");
  assert(resAnonVendedores.status === 403, "Lectura anónima a /vendedores denegada con HTTP 403");

  const resAnonLedger = await firestoreRestCall("POST", "/ledger_movimientos", { fields: { test: { stringValue: "val" } } });
  assert(resAnonLedger.status === 403, "Escritura anónima a /ledger_movimientos denegada con HTTP 403");

  const resAnonLiq = await firestoreRestCall("POST", "/liquidaciones_comision", { fields: { test: { stringValue: "val" } } });
  assert(resAnonLiq.status === 403, "Escritura anónima a /liquidaciones_comision denegada con HTTP 403");

  const resClientConfig = await firestoreRestCall("POST", "/vendedores_configuraciones_comision", { fields: { pct: { integerValue: 1000 } } }, idTokenClientA);
  assert(resClientConfig.status === 403, "Escritura de Cliente a /vendedores_configuraciones_comision denegada con HTTP 403");

  const resClientAReadB = await firestoreRestCall("GET", `/solicitudes/${solIdB}`, undefined, idTokenClientA);
  assert(resClientAReadB.status === 403, "Cliente A leyendo solicitud de Cliente B denegado con HTTP 403");

  const resClientAReadSelf = await firestoreRestCall("GET", `/solicitudes/${solIdA}`, undefined, idTokenClientA);
  console.log("DEBUG Check 6 status:", resClientAReadSelf.status, "text:", await resClientAReadSelf.text());
  assert(resClientAReadSelf.status === 200, "Cliente A leyendo su propia solicitud permitido con HTTP 200");

  const resClientAUpdateForbidden = await firestoreRestCall("PATCH", `/solicitudes/${solIdA}?updateMask.fieldPaths=estado`, {
    fields: { estado: { stringValue: "CANCELADO" } }
  }, idTokenClientA);
  assert(resClientAUpdateForbidden.status === 403, "Cliente A intentando alterar campo financiero estado denegado con HTTP 403");

  const resSellerCustodia = await firestoreRestCall("POST", "/ledger_custodia_efectivo", { fields: { monto: { integerValue: 100 } } }, idTokenSeller);
  assert(resSellerCustodia.status === 403, "Escritura directa de Vendedor a /ledger_custodia_efectivo denegada con HTTP 403");

  const resAdminVendedores = await firestoreRestCall("GET", "/vendedores", undefined, idTokenAdmin);
  assert(resAdminVendedores.status === 200, "Administrador Único leyendo /vendedores permitido con HTTP 200");

  const resPublicProductos = await firestoreRestCall("GET", "/productos");
  assert(resPublicProductos.status === 200, "Lectura pública de catálogo en /productos permitida con HTTP 200");

  // ==========================================================
  // BLOQUE 2: PUBLIC WRITE HARDENING — SOLICITUDES_CUENTA (11 A 15)
  // ==========================================================
  const docSolCuentaId = `sol_cta_${timestamp}`;
  const resSolCuentaValido = await firestoreRestCall("POST", `/solicitudes_cuenta?documentId=${docSolCuentaId}`, {
    fields: {
      tipo: { stringValue: "apertura_cuenta" },
      nombreCompleto: { stringValue: "Juan Pérez" },
      estado: { stringValue: "Pendiente" }
    }
  });
  assert(resSolCuentaValido.status === 200, "solicitudes_cuenta: create válido permitido con HTTP 200");

  const resSolCuentaArbitrario = await firestoreRestCall("POST", "/solicitudes_cuenta", {
    fields: {
      tipo: { stringValue: "apertura_cuenta" },
      nombreCompleto: { stringValue: "Juan Pérez" },
      estado: { stringValue: "Pendiente" },
      campoHackeado: { stringValue: "inject" }
    }
  });
  assert(resSolCuentaArbitrario.status === 403, "solicitudes_cuenta: create con campo arbitrario denegado con HTTP 403");

  const resSolCuentaOversized = await firestoreRestCall("POST", "/solicitudes_cuenta", {
    fields: {
      tipo: { stringValue: "apertura_cuenta" },
      nombreCompleto: { stringValue: "X".repeat(200) },
      estado: { stringValue: "Pendiente" }
    }
  });
  assert(resSolCuentaOversized.status === 403, "solicitudes_cuenta: create con payload oversized denegado con HTTP 403");

  const resSolCuentaUpdate = await firestoreRestCall("PATCH", `/solicitudes_cuenta/${docSolCuentaId}`, {
    fields: { estado: { stringValue: "APROBADO" } }
  });
  assert(resSolCuentaUpdate.status === 403, "solicitudes_cuenta: update público denegado con HTTP 403");

  const resSolCuentaDelete = await firestoreRestCall("DELETE", `/solicitudes_cuenta/${docSolCuentaId}`);
  assert(resSolCuentaDelete.status === 403, "solicitudes_cuenta: delete público denegado con HTTP 403");

  // ==========================================================
  // BLOQUE 3: PUBLIC WRITE HARDENING — ALERTAS_ADMIN (16 A 20)
  // ==========================================================
  const docAlertaId = `alerta_${timestamp}`;
  const resAlertaValido = await firestoreRestCall("POST", `/alertas_admin?documentId=${docAlertaId}`, {
    fields: {
      tipo: { stringValue: "APERTURA_CUENTA" },
      mensaje: { stringValue: "Nueva solicitud registrada" },
      fechaCreacion: { timestampValue: new Date().toISOString() },
      leida: { booleanValue: false }
    }
  });
  assert(resAlertaValido.status === 200, "alertas_admin: create válido permitido con HTTP 200");

  const resAlertaArbitrario = await firestoreRestCall("POST", "/alertas_admin", {
    fields: {
      tipo: { stringValue: "APERTURA_CUENTA" },
      mensaje: { stringValue: "Nueva solicitud registrada" },
      fechaCreacion: { timestampValue: new Date().toISOString() },
      leida: { booleanValue: false },
      inyeccionRol: { stringValue: "ADMIN" }
    }
  });
  assert(resAlertaArbitrario.status === 403, "alertas_admin: create con campo arbitrario denegado con HTTP 403");

  const resAlertaOversized = await firestoreRestCall("POST", "/alertas_admin", {
    fields: {
      tipo: { stringValue: "APERTURA_CUENTA" },
      mensaje: { stringValue: "M".repeat(1500) },
      fechaCreacion: { timestampValue: new Date().toISOString() },
      leida: { booleanValue: false }
    }
  });
  assert(resAlertaOversized.status === 403, "alertas_admin: create con payload oversized denegado con HTTP 403");

  const resAlertaUpdate = await firestoreRestCall("PATCH", `/alertas_admin/${docAlertaId}`, {
    fields: { leida: { booleanValue: true } }
  });
  assert(resAlertaUpdate.status === 403, "alertas_admin: update público denegado con HTTP 403");

  const resAlertaDelete = await firestoreRestCall("DELETE", `/alertas_admin/${docAlertaId}`);
  assert(resAlertaDelete.status === 403, "alertas_admin: delete público denegado con HTTP 403");

  // ==========================================================
  // BLOQUE 4: PUBLIC WRITE HARDENING — ARREPENTIMIENTOS (21 A 25)
  // ==========================================================
  const docArrepId = `arrep_${timestamp}`;
  const resArrepValido = await firestoreRestCall("POST", `/arrepentimientos?documentId=${docArrepId}`, {
    fields: {
      nombreCompleto: { stringValue: "María Gómez" },
      dni: { stringValue: "35123456" },
      email: { stringValue: "maria@test.com" },
      telefono: { stringValue: "1122334455" },
      producto: { stringValue: "Televisor Smart 55" },
      estado: { stringValue: "PENDIENTE" },
      fechaCreacion: { timestampValue: new Date().toISOString() }
    }
  });
  assert(resArrepValido.status === 200, "arrepentimientos: create válido permitido con HTTP 200");

  const resArrepArbitrario = await firestoreRestCall("POST", "/arrepentimientos", {
    fields: {
      nombreCompleto: { stringValue: "María Gómez" },
      dni: { stringValue: "35123456" },
      email: { stringValue: "maria@test.com" },
      telefono: { stringValue: "1122334455" },
      producto: { stringValue: "Televisor Smart 55" },
      estado: { stringValue: "PENDIENTE" },
      fechaCreacion: { timestampValue: new Date().toISOString() },
      montoDevolucion: { integerValue: 500000 }
    }
  });
  assert(resArrepArbitrario.status === 403, "arrepentimientos: create con campo arbitrario denegado con HTTP 403");

  const resArrepOversized = await firestoreRestCall("POST", "/arrepentimientos", {
    fields: {
      nombreCompleto: { stringValue: "N".repeat(200) },
      dni: { stringValue: "35123456" },
      email: { stringValue: "maria@test.com" },
      telefono: { stringValue: "1122334455" },
      producto: { stringValue: "Televisor Smart 55" },
      estado: { stringValue: "PENDIENTE" },
      fechaCreacion: { timestampValue: new Date().toISOString() }
    }
  });
  assert(resArrepOversized.status === 403, "arrepentimientos: create con payload oversized denegado con HTTP 403");

  const resArrepUpdate = await firestoreRestCall("PATCH", `/arrepentimientos/${docArrepId}`, {
    fields: { estado: { stringValue: "RESOLVIDO" } }
  });
  assert(resArrepUpdate.status === 403, "arrepentimientos: update público denegado con HTTP 403");

  const resArrepDelete = await firestoreRestCall("DELETE", `/arrepentimientos/${docArrepId}`);
  assert(resArrepDelete.status === 403, "arrepentimientos: delete público denegado con HTTP 403");

  // ==========================================================
  // BLOQUE 5: PUBLIC WRITE HARDENING — SOLICITUDES_LOCALIDAD (26 A 30)
  // ==========================================================
  const docLocId = `loc_${timestamp}`;
  const resLocValido = await firestoreRestCall("POST", `/solicitudes_localidad?documentId=${docLocId}`, {
    fields: {
      nombre: { stringValue: "Carlos López" },
      localidad: { stringValue: "Tandil" },
      telefono: { stringValue: "2494112233" },
      fechaCreacion: { timestampValue: new Date().toISOString() }
    }
  });
  assert(resLocValido.status === 200, "solicitudes_localidad: create válido permitido con HTTP 200");

  const resLocArbitrario = await firestoreRestCall("POST", "/solicitudes_localidad", {
    fields: {
      nombre: { stringValue: "Carlos López" },
      localidad: { stringValue: "Tandil" },
      telefono: { stringValue: "2494112233" },
      fechaCreacion: { timestampValue: new Date().toISOString() },
      autorizado: { booleanValue: true }
    }
  });
  assert(resLocArbitrario.status === 403, "solicitudes_localidad: create con campo arbitrario denegado con HTTP 403");

  const resLocOversized = await firestoreRestCall("POST", "/solicitudes_localidad", {
    fields: {
      nombre: { stringValue: "Carlos López" },
      localidad: { stringValue: "L".repeat(200) },
      telefono: { stringValue: "2494112233" },
      fechaCreacion: { timestampValue: new Date().toISOString() }
    }
  });
  assert(resLocOversized.status === 403, "solicitudes_localidad: create con payload oversized denegado con HTTP 403");

  const resLocUpdate = await firestoreRestCall("PATCH", `/solicitudes_localidad/${docLocId}`, {
    fields: { localidad: { stringValue: "Azul" } }
  });
  assert(resLocUpdate.status === 403, "solicitudes_localidad: update público denegado con HTTP 403");

  const resLocDelete = await firestoreRestCall("DELETE", `/solicitudes_localidad/${docLocId}`);
  assert(resLocDelete.status === 403, "solicitudes_localidad: delete público denegado con HTTP 403");

  // ==========================================================
  // BLOQUE 6: SUBCOLECCIONES Y DEFAULT FAIL-CLOSED (31 A 32)
  // ==========================================================
  const resSubcollAnon = await firestoreRestCall("POST", `/solicitudes_cuenta/${docSolCuentaId}/subcoleccion_no_autorizada`, {
    fields: { payload: { stringValue: "illegal" } }
  });
  assert(resSubcollAnon.status === 403, "Escritura anónima en subcolección no autorizada denegada con HTTP 403");

  const resUndefinedPath = await firestoreRestCall("GET", "/coleccion_inexistente_fail_closed");
  assert(resUndefinedPath.status === 403, "Consulta a colección no definida denegada con HTTP 403 (Default Fail-Closed)");

  // ==========================================================
  // BLOQUE 7: VALIDACIONES DE TIPO INCORRECTO (33 A 35)
  // ==========================================================
  // Check 33: fechaCreacion con tipo incorrecto (string en lugar de timestamp) -> 403
  const resBadTypeFecha = await firestoreRestCall("POST", "/arrepentimientos", {
    fields: {
      nombreCompleto: { stringValue: "María Gómez" },
      dni: { stringValue: "35123456" },
      email: { stringValue: "maria@test.com" },
      telefono: { stringValue: "1122334455" },
      producto: { stringValue: "Televisor Smart 55" },
      estado: { stringValue: "PENDIENTE" },
      fechaCreacion: { stringValue: "2026-10-08" }
    }
  });
  assert(resBadTypeFecha.status === 403, "Tipo incorrecto en fechaCreacion (string en vez de timestamp) denegado con HTTP 403");

  // Check 34: campo numérico con tipo incorrecto (string en lugar de number) -> 403
  const resBadTypeNumero = await firestoreRestCall("POST", "/solicitudes_cuenta", {
    fields: {
      tipo: { stringValue: "apertura_cuenta" },
      nombreCompleto: { stringValue: "Juan Pérez" },
      estado: { stringValue: "Pendiente" },
      montoCuota: { stringValue: "cinco_mil" }
    }
  });
  assert(resBadTypeNumero.status === 403, "Tipo incorrecto en campo numérico montoCuota (string en vez de number) denegado con HTTP 403");

  // Check 35: campo string con tipo incorrecto (integer en lugar de string) -> 403
  const resBadTypeString = await firestoreRestCall("POST", "/alertas_admin", {
    fields: {
      tipo: { integerValue: 12345 },
      mensaje: { stringValue: "Alerta invalida" },
      fechaCreacion: { timestampValue: new Date().toISOString() },
      leida: { booleanValue: false }
    }
  });
  assert(resBadTypeString.status === 403, "Tipo incorrecto en campo string tipo (integer en vez de string) denegado con HTTP 403");

  console.log("\\n==========================================================");
  console.log(`RESUMEN SEGURIDAD FIRESTORE RULES 3B.6B.1: ${passed}/${total} PASS`);
  console.log("==========================================================");

  process.exit(0);
}

runRulesTests().catch(err => {
  console.error("FATAL ERROR IN RULES TEST SUITE 3B.6B.1:", err);
  process.exit(1);
});
