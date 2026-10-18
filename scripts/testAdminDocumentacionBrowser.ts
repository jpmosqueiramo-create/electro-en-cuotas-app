import "./helpers/requireSafeEmulatorEnvironment";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { adminEmail, adminPassword, databaseSnapshot, documentacionDuplicateId, observeRuntimeWrites, setupAdminDocumentacionFixtures } from "./helpers/adminDocumentacionFixtures";
import { resolveChrome } from "./helpers/resolveChrome";

type CdpResponse = { id?: number; result?: Record<string, unknown>; error?: { message: string }; method?: string; params?: { request?: { url: string; method: string; postData?: string } } };
export async function testAdminDocumentacionBrowser() {
  await setupAdminDocumentacionFixtures();
  const before = await databaseSnapshot(), observer = await observeRuntimeWrites();
  const profile = mkdtempSync(join(tmpdir(), "documentacion-browser-"));
  const output = "/tmp/cuenta-hogar-documentacion-v1";
  mkdirSync(output, { recursive: true });
  const chrome = spawn(resolveChrome(), ["--headless=new", `--user-data-dir=${profile}`, "--remote-debugging-port=9225", "--disable-gpu", "--no-first-run", "--no-default-browser-check", ...(process.platform === "linux" && process.getuid?.() === 0 ? ["--no-sandbox"] : []), "about:blank"], { stdio: "ignore" });
  let ws: WebSocket | undefined;
  let sequence = 0, writes = 0;
  const externalFirebase: string[] = [];
  const pending = new Map<number, { resolve: (value: Record<string, unknown>) => void; reject: (error: Error) => void; timer: ReturnType<typeof setTimeout> }>();
  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
  try {
    let target: { webSocketDebuggerUrl: string } | undefined;
    for (let i = 0; i < 60 && !target; i++) {
      try { const targets = await (await fetch("http://127.0.0.1:9225/json/list")).json() as { type: string; webSocketDebuggerUrl: string }[]; target = targets.find(t => t.type === "page"); } catch { await delay(250); }
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
        if (url.hostname === "example.test") externalFirebase.push(url.hostname);
        if (/storage/.test(url.hostname) && ["POST", "PUT", "PATCH", "DELETE"].includes(request.method)) writes++;
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
      throw new Error(`TIMEOUT ${label}`);
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
      async function view(value: string, label: string) {
        if (viewport.width === 390) await change('select[aria-label="Vista de archivos"]', value);
        else await clickText(label);
      }
      await command("Emulation.setDeviceMetricsOverride", { width: viewport.width, height: viewport.height, deviceScaleFactor: 1, mobile: viewport.width === 390 });
      await navigate("/admin/documentacion");
      await until("document.querySelectorAll('[data-record-key]').length === 5", "unified documentation inbox");
      assert.equal(await evaluate("location.pathname"), "/admin/documentacion");
      assert.equal(await evaluate("window.__FIREBASE_AUTH__.currentUser.email"), adminEmail);
      assert.ok(await evaluate("document.querySelector('main').innerText.includes('Documentación') && document.querySelector('main').innerText.includes('No acredita revisión ni aprobación')"));
      assert.equal(await evaluate(`document.querySelectorAll('[data-record-key$=":${documentacionDuplicateId}"]').length`), 2);
      assert.ok(await evaluate("!!document.querySelector('a[aria-current=page][href=\"/admin/documentacion\"]')"));
      const requestSelector = `[data-record-key="solicitudes:${documentacionDuplicateId}"]`;
      assert.ok(await evaluate(`(() => { const row = document.querySelector(${JSON.stringify(requestSelector)}); return ['AVAILABLE','NOT_RECORDED','PENDING_SEND'].every(status => row.querySelector('[data-availability="'+status+'"]')); })()`));
      assert.ok(await evaluate("!document.querySelector('main input[type=file]')"));
      assert.equal(await evaluate("[...document.querySelectorAll('a')].find(a => a.textContent.trim() === 'Gestionar documentos').getAttribute('href')"), "/admin/validaciones");
      assert.ok(await evaluate("[...document.querySelectorAll('a[target=_blank]')].every(a => a.href.startsWith('https://example.test/') && a.rel.includes('noopener') && a.rel.includes('noreferrer') && a.getAttribute('aria-label').includes('nueva pestaña'))"));
      assert.ok(await evaluate("!document.querySelector('a[href*=\"Pendiente\"]')"));
      await overflow(`${viewport.name} documentation inbox`);
      await screenshot(`documentacion-${viewport.name}.png`);
      await view("available", "Con archivos");
      await until("document.querySelectorAll('[data-record-key]').length === 3", "available filter");
      await view("not_recorded", "Sin archivos registrados");
      await until("document.querySelectorAll('[data-record-key]').length === 1 && document.querySelector('[data-record-key]').innerText.includes('Carla Gómez')", "not recorded filter");
      await view("pending_send", "Pendiente de envío");
      await until("document.querySelectorAll('[data-record-key]').length === 3", "pending sentinel filter");
      await change('select[aria-label="Tipo de registro"]', "Consulta inicial");
      await until("document.querySelectorAll('[data-record-key]').length === 1 && document.querySelector('[data-record-key]').innerText.includes('Diego López')", "record type");
      await change('select[aria-label="Documento"]', "domicilio");
      await until("document.querySelectorAll('[data-document-kind]').length === 1", "document kind");
      assert.equal(await evaluate("document.querySelector('[data-document-kind]').dataset.availability"), "PENDING_SEND");
      await change('select[aria-label="Documento"]', "dni_frente");
      await until("document.querySelector('main').innerText.includes('No hay resultados para estos filtros')", "no results distinct from load failure");
      await change('select[aria-label="Tipo de registro"]', "");
      await change('select[aria-label="Documento"]', "");
      await view("all", "Todas");
      await change('input[aria-label="Buscar operación"]', "30111222");
      await until("document.querySelectorAll('[data-record-key]').length === 2", "same DNI preserves two operations");
      assert.equal(await evaluate("location.search"), "");
      assert.equal(await evaluate(`document.querySelector('[data-record-key="solicitudes_cuenta:${documentacionDuplicateId}"] a[href^="/admin/solicitudes"]').getAttribute('href')`), `/admin/solicitudes/solicitudes_cuenta/${documentacionDuplicateId}`);
      await evaluate(`document.querySelector('[data-record-key="solicitudes_cuenta:${documentacionDuplicateId}"] a[href^="/admin/solicitudes"]').click()`);
      await until(`location.pathname === "/admin/solicitudes/solicitudes_cuenta/${documentacionDuplicateId}" && document.querySelector('[data-testid=solicitud-detail]') && document.querySelector('main')?.innerText.includes('Mesa con ID compartido')`, "exact opening operation");
      assert.equal(await evaluate("location.pathname"), `/admin/solicitudes/solicitudes_cuenta/${documentacionDuplicateId}`);
      assert.ok(await evaluate("!document.querySelector('main').innerText.includes('Heladera de referencia')"));
      await overflow(`${viewport.name} opening operation`);
      await navigate("/admin/documentacion");
      await until("document.querySelectorAll('[data-record-key]').length === 5", "return to documentation");
      await change('select[aria-label="Documento"]', "comprobante_pago");
      await until("document.querySelectorAll('[data-record-key]').length === 1", "persisted payment attachment");
      assert.equal(await evaluate("document.querySelector('[data-document-kind=comprobante_pago] a').getAttribute('href')"), "https://example.test/pago.pdf");
      await change('select[aria-label="Documento"]', "");
      await change('input[aria-label="Buscar operación"]', "Ana Pérez");
      await until("document.querySelectorAll('[data-record-key]').length === 1", "mixed availability operation");
      await overflow(`${viewport.name} mixed states`);
      await evaluate("document.querySelector('[data-record-key]').scrollIntoView({ block: 'start', behavior: 'instant' })");
      await screenshot(`estado-mixto-${viewport.name}.png`);
      await evaluate(`document.querySelector(${JSON.stringify(requestSelector)}+' a[href^="/admin/solicitudes"]').click()`);
      await until(`location.pathname === "/admin/solicitudes/solicitudes/${documentacionDuplicateId}" && document.querySelector('[data-testid=solicitud-detail]') && document.querySelector('main')?.innerText.includes('Heladera de referencia')`, "exact request operation");
      assert.equal(await evaluate("location.pathname"), `/admin/solicitudes/solicitudes/${documentacionDuplicateId}`);
      assert.ok(await evaluate("!document.querySelector('main').innerText.includes('Mesa con ID compartido')"));
      await overflow(`${viewport.name} request operation`);
      console.log(`DOCUMENTATION_BROWSER_${viewport.width} = PASS`);
    }
    await navigate("/admin/documentacion");
    await until("document.querySelectorAll('[data-record-key]').length === 5", "logout page");
    await clickText("Salir");
    await until("location.pathname === '/login'", "logout navigation");
    assert.equal(await evaluate("window.__FIREBASE_AUTH__.currentUser"), null);
    await navigate("/admin/documentacion");
    await until("location.pathname === '/login'", "protected documentation after logout");
    assert.equal(writes, 0, "Firestore/Storage write attempts after setup");
    assert.equal(observer.count(), 0, "Firestore document mutations after setup");
    assert.deepEqual(await databaseSnapshot(), before, "All documents and collections unchanged");
    assert.deepEqual(externalFirebase, [], "No external document opened or production Firebase request");
    console.log("DOCUMENTATION_BROWSER_TEST = PASS\nWRITES_AFTER_SETUP = 0\nSTORAGE_WRITES = 0\nFIRESTORE_WRITES = 0\nPRODUCTION_PROJECT_USED = NO");
  } finally {
    observer.close();
    for (const entry of pending.values()) { clearTimeout(entry.timer); entry.reject(new Error("CDP_CLOSED")); }
    ws?.close();
    chrome.kill("SIGTERM");
    await new Promise<void>(resolve => { if (chrome.exitCode !== null || chrome.signalCode !== null) resolve(); else chrome.once("close", () => resolve()); });
    rmSync(profile, { recursive: true, force: true });
  }
}
