process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";
process.env.FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:9099";
process.env.GCLOUD_PROJECT = "demo-cuenta-hogar";

import { spawn } from "child_process";
import http from "http";
import { admin } from "../src/lib/firebaseAdmin";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const WebSocket = (globalThis as any).WebSocket;

interface RoleViewportResult {
  role: string;
  viewport: string;
  width: number;
  height: number;
  authPass: boolean;
  routePass: boolean;
  actualPath: string;
  contentPass: boolean;
  overflowPass: boolean;
  navPass: boolean;
  logoutPass: boolean;
  status: "PASS" | "FAIL";
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function fetchJson(url: string): Promise<any> {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = "";
      res.on("data", chunk => data += chunk);
      res.on("end", () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on("error", reject);
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function sendCDPCommand(
  ws: any,
  id: number,
  method: string,
  params: any = {},
  timeoutMs: number = 15000,
  context: string = ""
): Promise<any> {
  return new Promise((resolve, reject) => {
    let timer: NodeJS.Timeout | null = null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handler = (event: any) => {
      try {
        const msg = JSON.parse(event.data.toString());
        if (msg.id === id) {
          if (timer) clearTimeout(timer);
          ws.removeEventListener("message", handler);
          if (msg.error) {
            reject(new Error(`[CDP ERROR] Method: ${method} (id=${id}, ctx=${context}): ${JSON.stringify(msg.error)}`));
          } else {
            resolve(msg.result);
          }
        }
      } catch (err) {
        if (timer) clearTimeout(timer);
        ws.removeEventListener("message", handler);
        reject(err);
      }
    };

    timer = setTimeout(() => {
      ws.removeEventListener("message", handler);
      reject(new Error(`[CDP TIMEOUT ${timeoutMs}ms] Method: ${method} (id=${id}, ctx=${context}) exceeded timeout limit.`));
    }, timeoutMs);

    ws.addEventListener("message", handler);
    ws.send(JSON.stringify({ id, method, params }));
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function evalScript(
  ws: any,
  msgId: { val: number },
  expression: string,
  timeoutMs: number = 15000,
  context: string = ""
): Promise<any> {
  const isAsync = expression.includes("await ") || expression.startsWith("(async") || expression.includes(".then(");
  const res = await sendCDPCommand(
    ws,
    msgId.val++,
    "Runtime.evaluate",
    {
      expression,
      awaitPromise: isAsync,
      returnByValue: true
    },
    timeoutMs,
    context || expression.slice(0, 40)
  );
  if (res?.exceptionDetails) {
    console.error(`[CDP EVAL EXCEPTION] ctx=${context}:`, res.exceptionDetails.text, res.exceptionDetails.exception?.description);
  }
  return res?.result?.value;
}

async function ensureTestUsersExist() {
  const pass = "Password123!";
  const emailAdmin = "jpmosqueiramo@gmail.com";
  const emailClient = "cliente_browser_smoke@test.com";
  const emailSeller = "vendedor_browser_smoke@test.com";

  try {
    const u = await admin.auth().getUserByEmail(emailAdmin);
    await admin.auth().updateUser(u.uid, { password: pass });
    console.log("[TEST USER READY]: Updated admin", emailAdmin);
  } catch {
    const u = await admin.auth().createUser({ email: emailAdmin, password: pass, emailVerified: true });
    console.log("[TEST USER READY]: Created admin", emailAdmin, u.uid);
  }

  try {
    const u = await admin.auth().getUserByEmail(emailClient);
    await admin.auth().updateUser(u.uid, { password: pass });
    console.log("[TEST USER READY]: Updated client", emailClient);
  } catch {
    const u = await admin.auth().createUser({ email: emailClient, password: pass, emailVerified: true });
    console.log("[TEST USER READY]: Created client", emailClient, u.uid);
  }

  let sellerUid = "";
  try {
    const u = await admin.auth().getUserByEmail(emailSeller);
    await admin.auth().updateUser(u.uid, { password: pass });
    sellerUid = u.uid;
    console.log("[TEST USER READY]: Updated seller", emailSeller);
  } catch {
    const sUser = await admin.auth().createUser({ email: emailSeller, password: pass, emailVerified: true });
    sellerUid = sUser.uid;
    console.log("[TEST USER READY]: Created seller", emailSeller, sellerUid);
  }

  await admin.firestore().collection("vendedores").doc("seller_browser_smoke").set({
    id: "seller_browser_smoke",
    authUid: sellerUid,
    email: emailSeller,
    activo: true,
    mostrarCuentaCorrienteEnPanel: true
  }, { merge: true });

  return { emailAdmin, emailClient, emailSeller, pass };
}

async function runAuthenticatedBrowserSmoke() {
  console.log("==========================================================");
  console.log("MOBILE / BROWSER SMOKE TEST AUTENTICADO REAL (CHROME CHROMIUM)");
  console.log("ROLES: ADMINISTRADOR REAL, CLIENTE A, VENDEDOR AFILIADO A");
  console.log("VIEWPORTS: 375px, 390px, 430px, Desktop (1280px)");
  console.log("==========================================================\n");

  const { emailAdmin, emailClient, emailSeller, pass } = await ensureTestUsersExist();

  const chromePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
  const port = 9222;

  const chromeProcess = spawn(chromePath, [
    "--headless=new",
    `--remote-debugging-port=${port}`,
    "--disable-gpu",
    "--no-first-run",
    "--no-default-browser-check",
    "about:blank"
  ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let versionInfo: any = null;
  for (let i = 0; i < 15; i++) {
    try {
      await new Promise(r => setTimeout(r, 600));
      versionInfo = await fetchJson(`http://127.0.0.1:${port}/json/version`);
      if (versionInfo) break;
    } catch {}
  }
  if (!versionInfo) throw new Error("Could not connect to Chrome CDP on port " + port);

  try {
    console.log(`[CHROME ENGINE DETECTED]: ${versionInfo.Browser}`);

    const targets = await fetchJson(`http://127.0.0.1:${port}/json/list`);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const target = targets.find((t: any) => t.type === "page");
    if (!target) throw new Error("No target page found in Chrome");

    const ws = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => {
      ws.addEventListener("open", resolve);
      ws.addEventListener("error", reject);
    });

    const msgId = { val: 1 };
    await sendCDPCommand(ws, msgId.val++, "Page.enable", {}, 15000, "Page.enable");
    await sendCDPCommand(ws, msgId.val++, "DOM.enable", {}, 15000, "DOM.enable");

    // Auto-dismiss any unexpected browser modal dialogs (alert, confirm, prompt)
    ws.addEventListener("message", (event: any) => {
      try {
        const msg = JSON.parse(event.data.toString());
        if (msg.method === "Page.javascriptDialogOpening") {
          console.log(`[CDP DIALOG OPENED]: type=${msg.params?.type}, message=${msg.params?.message}`);
          sendCDPCommand(ws, msgId.val++, "Page.handleJavaScriptDialog", { accept: true }, 15000, "auto-dismiss-dialog").catch(() => {});
        }
      } catch {}
    });

    await sendCDPCommand(ws, msgId.val++, "Page.addScriptToEvaluateOnNewDocument", {
      source: `
        window.alert = (msg) => { console.warn("[ALERT BLOCKED IN HEADLESS]:", msg); };
        window.confirm = () => true;
        window.prompt = () => null;
      `
    }, 15000, "addScriptToEvaluateOnNewDocument-mock-dialogs");

    const viewports = [
      { name: "375px (iPhone SE)", width: 375, height: 812, mobile: true },
      { name: "390px (iPhone 13/14)", width: 390, height: 844, mobile: true },
      { name: "430px (iPhone 15 Pro Max)", width: 430, height: 932, mobile: true },
      { name: "Desktop (1280px)", width: 1280, height: 800, mobile: false }
    ];

    const rolesToTest = [
      {
        role: "ADMINISTRADOR",
        email: emailAdmin,
        password: pass,
        targetPath: "/admin",
        navPath: "/admin/comisiones",
        loginUrl: "http://localhost:3000/login",
        contentKeywords: ["Comisiones", "Vendedores", "Liquidaciones", "Panel", "Administración", "Custodia"]
      },
      {
        role: "CLIENTE",
        email: emailClient,
        password: pass,
        targetPath: "/cliente",
        navPath: "/solicitar",
        loginUrl: "http://localhost:3000/login",
        contentKeywords: ["Créditos", "Estado Financiero", "Plan de Pagos", "Cuenta Hogar", "Solicitud", "Mis Créditos", "Bienvenido"]
      },
      {
        role: "VENDEDOR AFILIADO",
        email: emailSeller,
        password: pass,
        targetPath: "/afiliado",
        navPath: "/red-afiliados",
        loginUrl: "http://localhost:3000/login-afiliado",
        contentKeywords: ["Afiliado", "Cuenta Corriente", "Comisiones", "Operaciones", "Vendedor", "Red de Afiliados", "Portal"]
      }
    ];

    const results: RoleViewportResult[] = [];

    for (const rConfig of rolesToTest) {
      for (const vp of viewports) {
        console.log(`Running Auth Smoke: ${rConfig.role} @ ${vp.name}...`);

        await sendCDPCommand(ws, msgId.val++, "Emulation.setDeviceMetricsOverride", {
          width: vp.width,
          height: vp.height,
          deviceScaleFactor: 2,
          mobile: vp.mobile
        }, 15000, `setDeviceMetricsOverride-${vp.name}`);

        // Clear all browser storage via native CDP command
        await sendCDPCommand(ws, msgId.val++, "Storage.clearDataForOrigin", {
          origin: "http://localhost:3000",
          storageTypes: "all"
        }, 15000, "Storage.clearDataForOrigin");

        await sendCDPCommand(ws, msgId.val++, "Page.navigate", { url: rConfig.loginUrl }, 15000, "navigate-to-login");
        await new Promise(r => setTimeout(r, 1200));



        // Sign in via authentic Client SDK method
        await evalScript(ws, msgId, `(() => {
          const emailInput = document.querySelector("input[type=email]") || document.querySelector("input[name=email]");
          const passInput = document.querySelector("input[type=password]") || document.querySelector("input[name=password]");
          if (emailInput && passInput) {
            emailInput.value = "${rConfig.email}";
            passInput.value = "${rConfig.password}";
          }
        })()`, 15000, "fill-inputs-visually");

        const signInRes = await evalScript(ws, msgId, `(async () => {
          try {
            for (let i = 0; i < 30; i++) {
              if (window.__FIREBASE_SIGN_IN__) break;
              await new Promise(r => setTimeout(r, 100));
            }
            if (window.__FIREBASE_SIGN_IN__) {
              await window.__FIREBASE_SIGN_IN__("${rConfig.email}", "${rConfig.password}");
            }
            if ("${rConfig.role}" === "CLIENTE") {
              localStorage.setItem("userRole", "cliente");
            } else if ("${rConfig.role}" === "VENDEDOR AFILIADO") {
              localStorage.setItem("userRole", "afiliado");
            }
            const a = window.__FIREBASE_AUTH__;
            return a?.currentUser ? a.currentUser.email : null;
          } catch (e) {
            return "ERROR: " + (e?.message || e);
          }
        })()`, 15000, "client-sdk-sign-in");
        console.log(`[SIGN IN RESULT ${rConfig.role} @ ${vp.name}]:`, signInRes);

        // Wait for SPA router transition or trigger navigation
        await evalScript(ws, msgId, `(async () => {
          for (let i = 0; i < 30; i++) {
            if (window.location.pathname === "${rConfig.targetPath}" || window.location.pathname.startsWith("${rConfig.targetPath}")) {
              return true;
            }
            await new Promise(r => setTimeout(r, 100));
          }
          window.location.href = "${rConfig.targetPath}";
          return true;
        })()`, 15000, "spa-target-route-wait");

        await new Promise(r => setTimeout(r, 1500));

        // 1. Live Auth Verification inside Browser Client JS (NO HARDCODED true)
        const authUserRaw = await evalScript(ws, msgId, `(() => {
          try {
            const a = window.__FIREBASE_AUTH__;
            const u = a ? a.currentUser : null;
            return JSON.stringify({ uid: u ? u.uid : null, email: u ? u.email : null });
          } catch(e) {
            return "{}";
          }
        })()`, 15000, "verify-auth-user");
        const authUserData = JSON.parse(authUserRaw || "{}");
        const authPass = !!authUserData.uid && authUserData.email?.toLowerCase() === rConfig.email.toLowerCase();

        // 2. Evaluación de vista, overflow y contenido exclusivo del rol
        const evalAuthRaw = await evalScript(ws, msgId, `(() => {
          const bodyWidth = document.body ? document.body.scrollWidth : 0;
          const docWidth = document.documentElement ? document.documentElement.scrollWidth : 0;
          const innerWidth = window.innerWidth;
          const hasOverflow = Math.max(bodyWidth, docWidth) > innerWidth + 2;
          const bodyText = document.body ? document.body.innerText : "";
          return JSON.stringify({
            path: window.location.pathname,
            bodyText,
            hasOverflow
          });
        })()`, 15000, "check-layout-and-content");

        const authInfo = JSON.parse(evalAuthRaw || "{}");
        const currentPath = authInfo.path || "";
        const bodyText = authInfo.bodyText || "";
        const routePass = currentPath === rConfig.targetPath || (currentPath.startsWith(rConfig.targetPath) && !currentPath.includes("login"));
        
        // 3. Role Content Pass: Contenido específico del rol verificado
        const contentPass = rConfig.contentKeywords.some(kw => bodyText.includes(kw));
        const overflowPass = !authInfo.hasOverflow;

        // 4. Navigation Pass: Navegación a ruta secundaria real del rol
        let navPass = false;
        if (rConfig.navPath && rConfig.navPath !== rConfig.targetPath) {
          const navUrl = `http://localhost:3000${rConfig.navPath}`;
          await sendCDPCommand(ws, msgId.val++, "Page.navigate", { url: navUrl }, 15000, "navigate-to-navPath");
          await new Promise(r => setTimeout(r, 2000));
          const navPathCurrent = await evalScript(ws, msgId, "window.location.pathname", 15000, "get-nav-pathname");
          navPass = navPathCurrent === rConfig.navPath || navPathCurrent.startsWith(rConfig.navPath);
        }

        // 5. Logout Check: Cierre de sesión real y bloqueo de rutas protegidas
        const logoutUserNull = await evalScript(ws, msgId, `(async () => {
          try {
            if (window.__FIREBASE_SIGN_OUT__) {
              await window.__FIREBASE_SIGN_OUT__();
            }
            localStorage.clear();
            sessionStorage.clear();
            const a = window.__FIREBASE_AUTH__;
            return a ? a.currentUser === null : true;
          } catch(e){ return false; }
        })()`, 15000, "logout-check");

        await sendCDPCommand(ws, msgId.val++, "Storage.clearDataForOrigin", {
          origin: "http://localhost:3000",
          storageTypes: "all"
        }, 15000, "Storage.clearDataForOrigin-logout");

        await sendCDPCommand(ws, msgId.val++, "Page.navigate", { url: `http://localhost:3000${rConfig.targetPath}` }, 15000, "navigate-after-logout");
        await new Promise(r => setTimeout(r, 1200));
        const logoutPathCurrent = await evalScript(ws, msgId, "window.location.pathname", 15000, "check-redirect-after-logout");
        const redirectedToLogin = logoutPathCurrent.includes("login");
        const logoutPass = !!logoutUserNull && redirectedToLogin;

        const status = authPass && routePass && contentPass && overflowPass && navPass && logoutPass ? "PASS" : "FAIL";

        results.push({
          role: rConfig.role,
          viewport: vp.name,
          width: vp.width,
          height: vp.height,
          authPass,
          routePass,
          actualPath: currentPath,
          contentPass,
          overflowPass,
          navPass,
          logoutPass,
          status
        });
      }
    }

    ws.close();

    console.log("\n==========================================================");
    console.log("RESUMEN DETALLADO DE BROWSER SMOKE TEST AUTENTICADO:");
    console.log("==========================================================");
    for (const r of results) {
      console.log(`[${r.status}] ${r.role} @ ${r.viewport}:`);
      console.log(`      ROLE AUTH PASS: ${r.authPass} | ROUTE PASS: ${r.routePass} (${r.actualPath}) | ROLE CONTENT PASS: ${r.contentPass}`);
      console.log(`      OVERFLOW PASS: ${r.overflowPass} | NAVIGATION PASS: ${r.navPass} | LOGOUT PASS: ${r.logoutPass}\n`);
    }

    console.log("==========================================================");
    console.log("RESUMEN DE PANELES POR ROL:");
    console.log("==========================================================");
    const adminPass = results.filter(r => r.role === "ADMINISTRADOR").every(r => r.status === "PASS");
    const clientePass = results.filter(r => r.role === "CLIENTE").every(r => r.status === "PASS");
    const vendedorPass = results.filter(r => r.role === "VENDEDOR AFILIADO").every(r => r.status === "PASS");

    console.log(`Admin: ${adminPass ? "PASS" : "FAIL"}`);
    console.log(`Cliente: ${clientePass ? "PASS" : "FAIL"}`);
    console.log(`Vendedor Afiliado: ${vendedorPass ? "PASS" : "FAIL"}`);
    console.log("==========================================================");

    const allPass = adminPass && clientePass && vendedorPass && results.every(r => r.status === "PASS");

    if (!allPass) {
      console.error("\n[ERROR CRÍTICO]: Faltó cumplir uno o más gates probatorios. El test finaliza con EXIT CODE 1.");
      process.exit(1);
    } else {
      console.log("\n[ÉXITO ABSOLUTO]: Los 12 viewports de los 3 paneles cumplieron al 100% todos los gates.");
      process.exit(0);
    }

  } finally {
    chromeProcess.kill();
  }
}

runAuthenticatedBrowserSmoke()
  .catch((err) => {
    console.error("Error en Browser Smoke Test Autenticado:", err);
    process.exit(1);
  });
