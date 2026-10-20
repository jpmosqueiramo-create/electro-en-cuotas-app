import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { assertSafeEmulatorEnvironment } from "./helpers/assertSafeEmulatorEnvironment";

async function main() {
  const project = assertSafeEmulatorEnvironment();
  assert.equal(project, "demo-cuenta-hogar");
  assert.equal(process.env.FIREBASE_AUTH_EMULATOR_HOST, "127.0.0.1:9099");
  assert.equal(process.env.NEXT_PUBLIC_ADMIN_EMAIL, "admin.staging@example.invalid");
  const { admin } = await import("../src/lib/firebaseAdmin");
  const { verifyAdminAuth } = await import("../src/lib/adminAuth");
  const { isAdminEmail } = await import("../src/lib/adminIdentity");
  const apps = [admin.app()];
  const created: string[] = [];
  const tokenFor = async (email: string, projectId = project) => {
    const response = await fetch("http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo-key", {
      method: "POST", headers: { "Content-Type": "application/json", "x-goog-user-project": projectId },
      body: JSON.stringify({ email, password: randomBytes(24).toString("hex"), returnSecureToken: true })
    });
    assert.equal(response.status, 200);
    const value = await response.json() as { idToken: string; localId: string };
    if (projectId === project) created.push(value.localId);
    return value;
  };
  const check = async (token?: string) => verifyAdminAuth(new Request("http://localhost/api/admin/test", {
    headers: token ? { authorization: `Bearer ${token}` } : {}
  }));
  try {
    assert.equal((await check()).errorResponse?.status, 401);
    assert.equal((await check("invalid")).errorResponse?.status, 401);
    const administrator = await tokenFor("admin.staging@example.invalid");
    assert.equal((await check(administrator.idToken)).authorized, true);
    assert.equal(isAdminEmail("admin.staging@example.invalid"), true);
    const customer = await tokenFor("customer@example.invalid");
    await admin.auth().setCustomUserClaims(customer.localId, { admin: true });
    // A fresh token really includes admin:true; generic claims still cannot authorize.
    const custom = await admin.auth().createCustomToken(customer.localId);
    const exchange = await fetch("http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=demo-key", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: custom, returnSecureToken: true })
    });
    assert.equal(exchange.status, 200);
    const claimed = await exchange.json() as { idToken: string };
    assert.equal((await admin.auth().verifyIdToken(claimed.idToken)).admin, true);
    assert.equal((await check(claimed.idToken)).errorResponse?.status, 403);
    const { NextRequest } = await import("next/server");
    const legacyAdminRoutes = await Promise.all([
      import("../src/app/api/admin/liberar-reserva/route"),
      import("../src/app/api/admin/pedido-proveedor/route"),
      import("../src/app/api/admin/preparar-entrega/route"),
      import("../src/app/api/admin/recepcion-mercaderia/route"),
      import("../src/app/api/admin/reserva-stock/route"),
      import("../src/app/api/propuesta/crear/route"),
      import("../src/app/api/propuesta/token/route")
    ]);
    for (const route of legacyAdminRoutes) {
      const response = await route.POST(new NextRequest("http://localhost/api/test", {
        method: "POST", headers: { authorization: `Bearer ${claimed.idToken}`, "Content-Type": "application/json" }, body: "{}"
      }));
      assert.equal(response.status, 403, "Generic admin claim must not authorize any legacy admin route");
    }
    // Emulator ID tokens are unsigned. Give a real local token a foreign issuer/audience
    // to verify Admin SDK project validation without contacting another Firebase project.
    const parts = administrator.idToken.split(".");
    const decoded = JSON.parse(Buffer.from(parts[1], "base64url").toString());
    decoded.aud = "demo-foreign-project";
    decoded.iss = "https://securetoken.google.com/demo-foreign-project";
    const foreignToken = [parts[0], Buffer.from(JSON.stringify(decoded)).toString("base64url"), parts[2]].join(".");
    assert.equal((await check(foreignToken)).errorResponse?.status, 401);
    const { POST: notify } = await import("../src/app/api/notificar-presupuesto/route");
    const previous = process.env.NEXT_PUBLIC_APP_ENV;
    process.env.NEXT_PUBLIC_APP_ENV = "staging";
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => { throw new Error("EXTERNAL_NETWORK_MUST_NOT_BE_USED"); };
    try { assert.equal((await notify(new Request("http://localhost/api/notificar-presupuesto", { method: "POST" }))).status, 503); }
    finally { globalThis.fetch = originalFetch; if (previous === undefined) delete process.env.NEXT_PUBLIC_APP_ENV; else process.env.NEXT_PUBLIC_APP_ENV = previous; }
    console.log("STAGING_AUTH_EMULATOR = PASS (admin, customer, generic claim denied, foreign project denied, notifications blocked)");
  } finally {
    for (const uid of created) await admin.auth().deleteUser(uid);
    await Promise.all(apps.map(app => app.delete()));
  }
}
main().catch(error => { console.error("STAGING_AUTH_EMULATOR = FAIL", error instanceof Error ? error.message : "unknown"); process.exitCode = 1; });
