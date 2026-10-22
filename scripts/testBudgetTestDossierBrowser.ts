import './helpers/requireSafeEmulatorEnvironment';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { admin } from '../src/lib/firebaseAdmin';
import { CatalogBrowser } from './helpers/catalogBrowser';
import { budgetFixture } from './helpers/budgetV2Fixtures';
import { persistBudgetV2 } from '../src/lib/budgetV2Persistence';
import { acceptBudgetV2 } from '../src/lib/budgetAcceptanceV2Server';
import { authorizedAbsentTestSources } from '../src/lib/budgetTestDossierPolicy';
import { budgetDeletionRef } from '../src/lib/budgetV2Deletion';
export async function testBudgetTestDossierBrowser() {
    const email = process.env.NEXT_PUBLIC_ADMIN_EMAIL!, password = 'Emulator-only-123';
    assert(email);
    try {
        const u = await admin.auth().getUserByEmail(email);
        await admin.auth().updateUser(u.uid, { password });
    }
    catch {
        await admin.auth().createUser({ email, password, emailVerified: true });
    }
    const db = admin.firestore(), browser = await CatalogBrowser.open(), out = '/tmp/cuenta-hogar-test-dossier-review';
    mkdirSync(out, { recursive: true });
    async function seed(label: string, blocked = false, knownId?: string) {
        const b = budgetFixture(knownId ?? ('cleanup-browser-' + randomUUID()));
        b.clienteSnapshot.nombre = label + ' ' + randomUUID().slice(0, 8);
        b.solicitudId = 'cleanup-source-' + randomUUID();
        if (knownId) {
            b.sourceCollection = 'solicitudes_cuenta';
            b.solicitudId = authorizedAbsentTestSources[knownId].split('/')[1];
        }
        await db.doc(b.sourceCollection + '/' + b.solicitudId).set({ nombre: label, estado: 'PENDIENTE' });
        const saved = await persistBudgetV2(db, { action: 'SAVE', commandId: randomUUID(), budget: b, expectedRevision: 0, privateOptionIds: [] }, 'browser-admin');
        await persistBudgetV2(db, { action: 'ISSUE', commandId: randomUUID(), budget: saved, expectedRevision: 1, privateOptionIds: [] }, 'browser-admin');
        await acceptBudgetV2(db, { budgetId: b.id, version: 1, acceptedOptionId: b.options[0].optionId, preferredPlanCuotas: null, commandId: randomUUID() }, 'browser-admin');
        if (blocked)
            await db.doc(`presupuestos_v2/${b.id}/contracts/v1/financial/current/payments/p1`).set({ marker: 'PROTECTED' });
        if (knownId)
            await db.doc(b.sourceCollection + '/' + b.solicitudId).delete();
        return b;
    }
    const desktop = await seed('EXPEDIENTE PRUEBA DESKTOP', false, '14b82cff-5c72-438b-8bac-a69fd7ef4d0b'), mobile = await seed('EXPEDIENTE PRUEBA MOBILE', false, '40aa027d-9a25-4108-9cb5-9c69f3b5a34a'), blocked = await seed('EXPEDIENTE PROTEGIDO', true);
    async function capture(name: string) { await browser.overflow(name); const s = await browser.command('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false }); writeFileSync(`${out}/${name}.png`, Buffer.from(s.data as string, 'base64')); }
    async function select(name: string) { await browser.field('Buscar presupuesto V2', name); await browser.until("document.querySelectorAll('[data-testid=budget-history-delete]').length===1", 'filtered history'); await browser.click('[data-testid=budget-history-delete]'); await browser.clickText('Verificar dependencias'); await browser.until("!!document.querySelector('[data-testid=budget-delete-preview]')", 'normal blocked preview'); assert.equal(await browser.evaluate("!!document.querySelector('[data-testid=confirm-budget-delete]')"), false); await browser.clickText('Eliminar expediente de prueba'); assert.equal(await browser.evaluate("!!document.querySelector('[data-testid=budget-delete-preview]')"), false); await browser.clickText('Verificar dependencias'); await browser.until("!!document.querySelector('[data-testid=budget-delete-preview]')", 'test manifest'); }
    async function run(b: typeof desktop, label: string) { await select(b.clienteSnapshot.nombre); assert.equal(await browser.evaluate("!!document.querySelector('[data-testid=absent-source-warning]')"), true); assert.equal(await browser.evaluate("document.querySelector('[data-testid=confirm-budget-delete]').disabled"), true); await browser.evaluate("[...document.querySelectorAll('summary')].find(e=>e.textContent==='Ver registros que se eliminarán').click()"); await capture(label + '-manifest'); await browser.evaluate("document.querySelector('[data-testid=absent-source-warning]').scrollIntoView({block:'center'})");await capture(label+'-absent-source'); await browser.click('[data-testid=test-declaration]'); await browser.evaluate("(()=>{const e=document.querySelector('[data-testid=test-reason]');const set=Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set;set.call(e,'Expediente íntegramente sintético de la suite local.');e.dispatchEvent(new Event('input',{bubbles:true}));})()"); await browser.click('[data-testid=budget-delete-dialog] input:not([data-testid])'); await browser.until("!document.querySelector('[data-testid=confirm-budget-delete]').disabled", 'two confirmations'); await browser.evaluate("document.querySelector('[data-testid=confirm-budget-delete]').scrollIntoView({block:'center'})"); await capture(label + '-confirm'); await browser.click('[data-testid=confirm-budget-delete]'); await browser.until("!document.querySelector('[data-testid=budget-delete-dialog]')", 'deleted synthetic family'); assert.equal((await db.doc('presupuestos_v2/' + b.id).get()).exists, false); assert.equal((await budgetDeletionRef(db, b.id).get()).exists, true); assert.equal((await db.doc(b.sourceCollection + '/' + b.solicitudId).get()).exists, false); assert.deepEqual((await budgetDeletionRef(db, b.id).get()).data()!.missingSourcePaths, [b.sourceCollection + '/' + b.solicitudId]); }
    try {
        await browser.command('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
        await browser.navigate('/login');
        await browser.until("typeof window.__FIREBASE_SIGN_IN__==='function'", 'synthetic login');
        await browser.evaluate(`window.__FIREBASE_SIGN_IN__(${JSON.stringify(email)},${JSON.stringify(password)}).then(()=>true)`);
        await browser.navigate('/admin/presupuestos');
        await browser.until("document.body.innerText.includes('EXPEDIENTE PRUEBA DESKTOP')", 'history');
        await run(desktop, 'desktop');
        await browser.command('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
        await run(mobile, 'mobile');
        await select(blocked.clienteSnapshot.nombre);
        assert.equal(await browser.evaluate("!!document.querySelector('[data-testid=confirm-budget-delete]')"), false);
        await capture('mobile-protected');
        assert.equal((await db.doc('presupuestos_v2/' + blocked.id).get()).exists, true);
        assert.deepEqual(browser.externalFirebase, []);
        console.log('TEST_DOSSIER_BROWSER=PASS; DESKTOP_MOBILE=PASS; DOUBLE_CONFIRMATION=PASS; MANIFEST=PASS; PROTECTED_PAYMENT=BLOCKED; ABSENT_SOURCE_WARNING_AUDIT=PASS; SOURCE_NOT_RECREATED=PASS; OVERFLOW=0; PRODUCTION_REQUESTS=0');
    }
    finally {
        await browser.close();
    }
}
