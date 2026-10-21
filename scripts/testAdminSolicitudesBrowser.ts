import "./helpers/requireSafeEmulatorEnvironment";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { adminEmail, adminPassword, databaseSnapshot, duplicateId, observeRuntimeWrites, setupAdminSolicitudesFixtures } from "./helpers/adminSolicitudesFixtures";
import { resolveChrome } from "./helpers/resolveChrome";

type CdpResponse = { id?: number; result?: Record<string, unknown>; error?: { message: string }; method?: string; params?: { request?: { url: string; method: string; postData?: string } } };
export async function testAdminSolicitudesBrowser() {
  await setupAdminSolicitudesFixtures();
  const before = await databaseSnapshot(), observer = await observeRuntimeWrites();
  const profile = mkdtempSync(join(tmpdir(), "solicitudes-browser-"));
  const output = "/tmp/cuenta-hogar-solicitudes-v1";
  mkdirSync(output, { recursive: true });
  const chrome = spawn(resolveChrome(), ["--headless=new", `--user-data-dir=${profile}`, "--remote-debugging-port=9223", "--disable-gpu", "--no-first-run", "--no-default-browser-check", ...(process.platform === "linux" && process.getuid?.() === 0 ? ["--no-sandbox"] : []), "about:blank"], { stdio: "ignore" });
  let ws: WebSocket | undefined;
  let sequence = 0, writes = 0;
  const externalFirebase: string[] = [];
  const pending = new Map<number, { resolve: (value: Record<string, unknown>) => void; reject: (error: Error) => void; timer: ReturnType<typeof setTimeout> }>();
  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
  try {
    let target: { webSocketDebuggerUrl: string } | undefined;
    for (let i = 0; i < 60 && !target; i++) {
      try { const targets = await (await fetch("http://127.0.0.1:9223/json/list")).json() as { type: string; webSocketDebuggerUrl: string }[]; target = targets.find(t => t.type === "page"); } catch { await delay(250); }
    }
    assert.ok(target, "Chrome CDP target required");
    ws = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise<void>((resolve, reject) => { ws!.addEventListener("open", () => resolve(), { once: true }); ws!.addEventListener("error", () => reject(new Error("CDP_CONNECT_FAILED")), { once: true }); });
    ws.addEventListener("message", event => {
      const message = JSON.parse(String(event.data)) as CdpResponse;
      if (message.id) {
        const entry = pending.get(message.id);
        if (entry) { clearTimeout(entry.timer); pending.delete(message.id); if (message.error) entry.reject(new Error(message.error.message)); else entry.resolve(message.result ?? {}); }
      }
      if (message.method === "Network.requestWillBeSent" && message.params?.request) {
        const request = message.params.request;
        const url = new URL(request.url);
        if (/googleapis\.com$/.test(url.hostname) && /firestore|identitytoolkit|securetoken|storage/.test(url.hostname)) externalFirebase.push(url.hostname);
        if (/Firestore\/Write\/|:(commit|batchWrite)(\?|$)/.test(url.pathname + url.search)
          || (/\/v1\/projects\/.*\/documents\//.test(url.pathname) && ["PATCH", "DELETE"].includes(request.method))) writes++;
      }
    });
    async function command(method: string, params: Record<string, unknown> = {}) {
      const id = ++sequence;
      const promise = new Promise<Record<string, unknown>>((resolve, reject) => {
        const timer = setTimeout(() => { pending.delete(id); reject(new Error(`CDP timeout: ${method}`)); }, 20000);
        pending.set(id, { resolve, reject, timer });
      });
      ws!.send(JSON.stringify({ id, method, params })); return promise;
    }
    async function evaluate<T = unknown>(expression: string, deadline = Date.now() + 32000): Promise<T> {
      // Guard and DOM access run in the same browser evaluation: a separate
      // readiness check could itself race with a full document navigation.
      while (Date.now() < deadline) {
        const result = await command("Runtime.evaluate", {
          expression: `(async () => {
            if (document.readyState === 'loading' || document.body === null || !document.body.innerText.trim()) return { ready: false };
            return { ready: true, value: await (${expression}) };
          })()`,
          awaitPromise: true,
          returnByValue: true,
        });
        // Real evaluation exceptions remain failures; only a not-ready DOM polls.
        if (result.exceptionDetails) throw new Error(`Browser evaluation failed: ${JSON.stringify(result.exceptionDetails)}`);
        const value = (result.result as { value: { ready: boolean; value?: T } }).value;
        if (value.ready) return value.value as T;
        await delay(100);
      }
      throw new Error("TIMEOUT waiting for interactive/complete document with nonempty body");
    }
    async function until(expression: string, label: string) {
      const deadline = Date.now() + 32000;
      while (Date.now() < deadline) { if (await evaluate(expression, deadline)) return; await delay(200); }
      const diagnostic=await evaluate("JSON.stringify({path:location.pathname,text:document.body.innerText.slice(0,1800)})").catch(()=>"DOM unavailable");
      throw new Error(`TIMEOUT ${label}: ${diagnostic}`);
    }
    async function navigate(path: string) {
      const result = await command("Page.navigate", { url: `http://localhost:3000${path}` });
      if (result.errorText) throw new Error(`Navigation failed: ${result.errorText}`);
      await until("document.readyState !== 'loading' && document.body !== null", `DOM after navigation to ${path}`);
    }
    async function clickText(text: string) { assert.ok(await evaluate(`(() => { const button = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === ${JSON.stringify(text)}); if (!button) return false; button.click(); return true; })()`)); }
    async function change(selector: string, value: string) {
      await evaluate(`(() => { const element = document.querySelector(${JSON.stringify(selector)}); const proto = element.tagName === 'SELECT' ? HTMLSelectElement.prototype : HTMLInputElement.prototype; Object.getOwnPropertyDescriptor(proto, 'value').set.call(element, ${JSON.stringify(value)}); element.dispatchEvent(new Event(element.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true })); })()`);
    }
    async function overflow(label: string) {
      assert.ok(await evaluate("Math.max(document.body.scrollWidth, document.documentElement.scrollWidth) <= innerWidth + 2"), `${label}: global overflow`);
    }
    async function screenshot(file: string) {
      await evaluate("document.fonts.ready.then(() => true)");
      const result = await command("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
      writeFileSync(join(output, file), Buffer.from(result.data as string, "base64"));
    }
    await command("Page.enable"); await command("Network.enable");
    await navigate("/login");
    await until("typeof window.__FIREBASE_SIGN_IN__ === 'function'", "auth hook");
    assert.equal(await evaluate(`window.__FIREBASE_SIGN_IN__(${JSON.stringify(adminEmail)}, ${JSON.stringify(adminPassword)}).then(() => window.__FIREBASE_AUTH__.currentUser.email)`), adminEmail);
    for (const viewport of [{ width: 1280, height: 800, name: "desktop" }, { width: 390, height: 844, name: "mobile" }]) {
      await command("Emulation.setDeviceMetricsOverride", { width: viewport.width, height: viewport.height, deviceScaleFactor: 1, mobile: viewport.width === 390 });
      await navigate("/admin/solicitudes");
      await until("document.querySelectorAll('[data-record-key]').length === 4", "pending inbox");
      assert.equal(await evaluate("location.pathname"), "/admin/solicitudes");
      assert.ok(await evaluate("document.body.innerText.includes('Ana Pérez') && document.body.innerText.includes('Bruno Díaz')"));
      assert.equal(await evaluate(`document.querySelectorAll('[data-record-key$=":${duplicateId}"]').length`), 2);
      await overflow(`${viewport.name} inbox`);
      await screenshot(`inbox-${viewport.name}.png`);
      await change('input[aria-label="Buscar operación"]', "30111222");
      await until("document.querySelectorAll('[data-record-key]').length === 2", "DNI search preserves operations");
      assert.ok(!(await evaluate<string>("location.search")).includes("30111222"));
      await change('select[aria-label="Tipo"]', "Contacto rápido");
      await until("document.querySelectorAll('[data-record-key]').length === 1", "type filter");
      assert.equal(await evaluate("document.querySelector('[data-record-key]').dataset.recordKey"), `solicitudes_cuenta:${duplicateId}`);
      await evaluate("document.querySelector('[data-record-key] a').click()");
      await until("document.querySelector('[data-testid=solicitud-detail]') && document.body.innerText.includes('Bruno Díaz')", "opening detail");
      assert.equal(await evaluate("location.pathname"), `/admin/solicitudes/solicitudes_cuenta/${duplicateId}`);
      assert.ok(await evaluate("document.querySelector('main').innerText.includes('Mesa · consulta con ID compartido') && !document.querySelector('main').innerText.includes('Heladera · solicitud de referencia')"));
      await overflow(`${viewport.name} opening detail`);
      await evaluate("[...document.querySelectorAll('a')].find(a => a.textContent.includes('Volver a Solicitudes')).click()");
      await until("document.querySelectorAll('[data-record-key]').length === 1", "return preserves type/view");
      assert.equal(await evaluate("document.querySelector('select[aria-label=Tipo]').value"), "Contacto rápido");
      assert.equal(await evaluate("document.querySelector('input[type=search]').value"), "");
      await change('select[aria-label="Tipo"]', "");
      await clickText("Todas");
      await until("document.querySelectorAll('[data-record-key]').length === 6", "all states");
      await change('select[aria-label="Estado"]', "ESTADO_LEGACY_DESCONOCIDO");
      await until("document.querySelectorAll('[data-record-key]').length === 1", "dynamic unknown state");
      assert.ok(await evaluate("document.body.innerText.includes('Fabián Ruiz')"));
      await navigate(`/admin/solicitudes/solicitudes/${duplicateId}?view=all`);
      await until("document.querySelector('main')?.innerText.includes('Información solicitada al cliente')", "exact request detail");
      assert.ok(await evaluate("document.querySelector('main').innerText.includes('Heladera · solicitud de referencia') && !document.querySelector('main').innerText.includes('Mesa · consulta con ID compartido')"));
      for (const title of ["Resumen", "Datos", "Presupuestos V2", "Documentos", "Actividad", "Gestión avanzada"]) assert.ok(await evaluate(`!!document.querySelector('section[aria-label="${title}"]')`), title);
      assert.equal(await evaluate("[...document.querySelectorAll('a')].find(a => a.textContent.includes('Abrir gestión avanzada')).getAttribute('href')"), "/admin/validaciones");
      assert.ok(await evaluate("!!document.querySelector('a[aria-current=page][href=\"/admin/solicitudes\"]')"), "active navigation on detail");
      await overflow(`${viewport.name} request detail`);
      await screenshot(`detail-${viewport.name}.png`);
      await navigate("/admin/solicitudes/solicitudes/solicitudes_v1_approved_no_replica");
      await until("document.body.innerText.includes('Operación no encontrada')", "no cross-source fallback");
      await navigate("/admin/solicitudes/solicitudes_cuenta/solicitudes_v1_approved_no_replica");
      await until("document.body.innerText.includes('Carla Gómez')", "approved opening without replica");
      await navigate("/admin/solicitudes/solicitudes/solicitudes_v1_no_date");
      await until("document.body.innerText.includes('Sin actividad registrada')", "no invented activity/date");
      await navigate(`/admin/solicitudes/vendedores/${duplicateId}`);
      await until("document.body.innerText.includes('404')", "invalid source");
      console.log(`SOLICITUDES_BROWSER_${viewport.width} = PASS`);
    }
    await navigate("/admin/solicitudes");
    await until("document.querySelectorAll('[data-record-key]').length === 4", "logout page");
    await clickText("Salir");
    await until("location.pathname === '/login'", "logout navigation");
    assert.equal(await evaluate("window.__FIREBASE_AUTH__.currentUser"), null);
    await navigate("/admin/solicitudes");
    await until("location.pathname === '/login'", "auth gate after logout");
    await delay(400);
    assert.equal(writes, 0, "Firestore write RPC attempts after setup");
    assert.equal(observer.count(), 0, "Firestore document mutations after setup");
    assert.deepEqual(await databaseSnapshot(), before, "All root collections and descendants unchanged");
    assert.deepEqual(externalFirebase, [], "No production Firebase endpoints");
    console.log("SOLICITUDES_BROWSER_TEST = PASS\nWRITES_AFTER_SETUP = 0\nFIRESTORE_WRITE_RPC_ATTEMPTS = 0\nPRODUCTION_PROJECT_USED = NO");
  } finally {
    observer.close();
    for (const entry of pending.values()) { clearTimeout(entry.timer); entry.reject(new Error("CDP_CLOSED")); }
    ws?.close();
    chrome.kill("SIGTERM");
    await new Promise<void>(resolve => { if (chrome.exitCode !== null || chrome.signalCode !== null) resolve(); else chrome.once("close", () => resolve()); });
    rmSync(profile, { recursive: true, force: true });
  }
}
