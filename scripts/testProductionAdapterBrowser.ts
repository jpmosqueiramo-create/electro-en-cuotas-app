import './helpers/requireSafeEmulatorEnvironment';
import assert from 'node:assert/strict';
import { argentinaBusinessDate } from '../src/lib/productionV2/businessDate';
import { mkdirSync, writeFileSync } from 'node:fs';
import { admin } from '../src/lib/firebaseAdmin';
import { productionReadyFixture, syntheticFinalPackage } from './helpers/productionAdapterFixtures';
import { productionRuntimeForEmulator } from '../src/lib/productionV2/runtime';
import { freezeOperation, productionPaths } from '../src/lib/productionV2/freeze';
import { authorizeOperation, scopes } from '../src/lib/productionV2/authorization';
import { issueDocuments } from '../src/lib/productionV2/documents';
import { getBudgetDocumentationBucket } from '../src/lib/budgetDocumentationStorage';
import { randomUUID } from 'node:crypto';
import { productionOverview } from '../src/lib/productionV2/overview';
import { readDelivery } from '../src/lib/operationDeliveryV2Server';
import { readFinancial } from '../src/lib/operationFinancialV2Server';
import { syntheticPng } from './testOperationDeliveryV2Emulator';
import { startProductionBrowserServer } from './helpers/productionAdapterBrowserServer';
import { CatalogBrowser } from './helpers/catalogBrowser';
const out = '/tmp/ch-production-browser', password = 'Emulator-only-123';
const scope = (test: string) => `document.querySelector('[data-testid=${test}]')`;
async function run() {
    const db = admin.firestore(), email = process.env.NEXT_PUBLIC_ADMIN_EMAIL!;
    assert.equal(email, 'production-review-admin@example.test');
    const actor = (await admin.auth().createUser({ email, password, emailVerified: true })).uid, p = syntheticFinalPackage(), runtime = productionRuntimeForEmulator(db, admin.auth(), [p], [actor]);
    const f = await productionReadyFixture(actor), clientEmail = 'production-browser-client@example.test', client = (await admin.auth().createUser({ email: clientEmail, password, emailVerified: true })).uid;
    await db.doc(productionPaths.counter).create({ schemaVersion: 'CONTRACT_NUMBER_COUNTER_V1', policyId: 'CONTRACT_NUMBERING_V1', executionMode: 'PRODUCTION', active: true, lastAllocatedSequence: '0', initializationAuthorizationReference: 'SYNTHETIC_BROWSER_COUNTER_ONLY' });
    mkdirSync(out, { recursive: true });
    writeFileSync(out + '/signature-synthetic.png', syntheticPng);
    const server = await startProductionBrowserServer(runtime), browser = await CatalogBrowser.open(), screens: string[] = [];
    const operation = `/admin/operaciones/${f.id}/1`, prod = scope('production-operation'), delivery = scope('delivery-v2'), finance = scope('financial-v2');
    const now = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, -1);
    async function login(e: string) {
        if(e===`${f.uid}@example.test`){
            await browser.navigate('/login-afiliado');
            await browser.until("!!document.querySelector('input[type=email]')",'affiliate login');
            await browser.change('input[type=email]',e);await browser.change('input[type=password]',password);await browser.clickText('Ingresar');
            await browser.until("location.pathname==='/afiliado'",'affiliate session ready');return;
        }
        await browser.navigate('/login'); await browser.until("typeof window.__FIREBASE_SIGN_IN__==='function'", 'Emulator Auth'); await browser.evaluate(`window.__FIREBASE_SIGN_IN__(${JSON.stringify(e)},${JSON.stringify(password)}).then(()=>true)`);
    }
    async function logout() { await browser.evaluate('window.__FIREBASE_SIGN_OUT__().then(()=>true)'); }
    async function select(selector: string, value: string) { await browser.evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});if(!e)throw Error('Missing select');Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set.call(e,${JSON.stringify(value)});e.dispatchEvent(new Event('change',{bubbles:true}));})()`); }
    async function detail(title: string) { await browser.evaluate(`(()=>{const s=[...document.querySelectorAll('summary')].find(x=>x.textContent===${JSON.stringify(title)});if(!s)throw Error('Missing details');s.parentElement.open=true;})()`); }
    async function capture(name: string, test: string) { await browser.evaluate(`${scope(test)}.scrollIntoView({block:'start'})`); await browser.overflow(name); await browser.evaluate('document.fonts.ready.then(()=>true)'); const image = await browser.command('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false }); writeFileSync(`${out}/${name}.png`, Buffer.from(image.data as string, 'base64')); screens.push(name); }
    async function action(name: string, fields: Record<string, string>) { const rev = (await readDelivery(db, f.id, 1, f.root)).state.revision; await select('[aria-label="Acción de entrega"]', name); for (const [label, value] of Object.entries(fields)) {
        const css = `[data-testid=delivery-v2] [aria-label=${JSON.stringify(label)}]`;
        if (['Documento', 'Archivo privado', 'Firma de LOOP registrada (no bloqueante)', 'Rol físico'].includes(label))
            await select(css, value);
        else
            await browser.change(css, value);
    } await browser.clickText('Confirmar control de entrega', delivery); await browser.until(`${delivery}?.textContent.includes('Revisión ${rev + 1}')`, 'delivery ' + name); }
    try {
        await browser.command('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
        await login(email);
        await browser.navigate(operation + '?section=contract');
        await browser.until(`${prod}?.textContent.includes('PRUEBA LOCAL')`, 'isolated adapter UI');
        await capture('authorization-pending-desktop', 'production-operation');
        await detail('Registro jurídico del paquete final');
        await select('[data-testid=production-operation] select[name=package]', p.id);
        for (const [name, value] of Object.entries({ date: argentinaBusinessDate(), professional: 'Profesional ficticio de prueba', reference: 'SYNTHETIC_APPROVAL_ONLY', source: 'Fixture sintético, no documento jurídico real' }))
            await browser.change(`[data-testid=production-operation] input[name=${name}]`, value);
        await browser.click('[data-testid=production-operation] input[name=confirmed]');
        await browser.clickText('Registrar aprobación identificada', prod);
        await browser.until(`${prod}?.querySelector('select[name=approval]')?.options.length===2`, 'approval saved by HTTP');
        const approved = (await productionOverview(runtime, f.id, 1, actor)).approvals[0];
        assert(approved);
        await detail('Autorizar una operación real');
        await select('[data-testid=production-operation] select[name=approval]', approved.id);
        for (const [name, value] of Object.entries({ issueDate: argentinaBusinessDate(), issuePlace: 'Lugar sintético', noteDate: argentinaBusinessDate(), notePlace: 'Lugar sintético', expires: new Date(Date.now() + 86400000 - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16), reason: 'AUTORIZACIÓN SINTÉTICA DE PRUEBA, SIN EFECTOS REALES' }))
            await browser.change(`[data-testid=production-operation] input[name=${name}]`, value);
        await browser.evaluate(`${prod}.querySelectorAll('input[name=scope]').forEach(x=>x.click())`);
        await browser.click('[data-testid=production-operation] form input[type=checkbox]:not([name])');
        await browser.clickText('Registrar autorización de esta operación', prod);
        await browser.until(`${prod}?.textContent.includes('Autorización vigente')`, 'operation grant');
        const grant = (await productionOverview(runtime, f.id, 1, actor)).authorizations[0];
        assert(grant.available);
        await browser.evaluate(`(()=>{const e=[...${prod}.querySelectorAll('label')].find(x=>x.textContent.startsWith('Autorización vigente')).querySelector('select');Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set.call(e,${JSON.stringify(grant.id)});e.dispatchEvent(new Event('change',{bubbles:true}));})()`);
        await browser.evaluate(`[...${prod}.querySelectorAll('label')].find(x=>x.textContent.includes('congelamiento irreversible')).querySelector('input').click()`);
        await browser.clickText('Congelar condiciones autorizadas', prod);
        await browser.until(`${prod}?.textContent.includes('Términos congelados:')`, 'frozen by HTTP');
        await browser.evaluate(`[...${prod}.querySelectorAll('label')].find(x=>x.textContent.includes('Confirmo la emisión')).querySelector('input').click()`);
        await browser.until(`[...${prod}.querySelectorAll('button')].some(b=>b.textContent==='Emitir o recuperar documentos autorizados'&&!b.disabled)`, 'emission confirmation ready');
        await browser.clickText('Emitir o recuperar documentos autorizados', prod);
        await browser.until(`${prod}?.textContent.includes('Abrir pagaré emitido')`, 'three documents emitted');
        await capture('issued-documents-desktop', 'production-operation');
        await browser.command('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
        await capture('issued-documents-mobile', 'production-operation');
        await browser.clickText('Proveedor y logística');
        await browser.until(`${delivery}?.textContent.includes('Documentos emitidos para esta operación')`, 'delivery UI');
        await action('PREPARE_DELIVERY', { 'UID responsable': f.uid, 'Rol físico': 'AFFILIATE', 'Registro de vendedor afiliado (sólo si corresponde)': f.affiliateId });
        for (const kind of ['MANDATE', 'PAGARE', 'REMITO']) {
            await action('PREPARE_DOCUMENT', { 'Documento': kind });
            assert.equal(await browser.evaluate(`${delivery}.querySelector('[aria-label="Versión de plantilla / documento"]')===null`), true);
            await select('[aria-label="Tipo de evidencia"]', kind + '_SIGNED');
            const root = (await browser.command('DOM.getDocument')).root as {
                nodeId: number;
            }, node = await browser.command('DOM.querySelector', { nodeId: root.nodeId, selector: '[data-testid=delivery-v2] input[type=file]' });
            await browser.command('DOM.setFileInputFiles', { nodeId: node.nodeId, files: [out + '/signature-synthetic.png'] });
            await browser.clickText('Conservar evidencia privada', delivery);
            await browser.until(`${delivery}?.textContent.includes('Ver ${kind}_SIGNED')`, 'private signed photo');
            const photo = (await readDelivery(db, f.id, 1, f.root)).photos.find(p => p.slot === kind + '_SIGNED')!;
            await action('VERIFY_SIGNATURE', { 'Documento': kind, 'Archivo privado': photo.id, 'Fecha y hora real de firma': now(), 'Firma de LOOP registrada (no bloqueante)': 'false' });
        }
        await action('RECEIVE_ORIGINALS', { 'UID responsable': f.uid, 'Rol físico': 'AFFILIATE', 'Registro de vendedor afiliado (sólo si corresponde)': f.affiliateId, 'Ubicación física': 'Archivo sintético de originales', 'Fecha y hora real de recepción': now(), 'Referencia del documento / paquete físico': 'SYNTHETIC ORIGINALS', 'Referencia de evidencia alternativa (sin conversaciones)': 'SYNTHETIC ONLY' });
        await capture('three-signatures-mobile', 'delivery-v2');
        await logout();
        await login(`${f.uid}@example.test`);
        await browser.navigate(`/custodia-v2/${f.id}/1`);
        await browser.until(`${delivery}?.textContent.includes('Remito: preparado')`, 'custodian identity');
        await action('CONFIRM_DELIVERY', { 'Fecha y hora real': now() });
        await browser.until(`${delivery}?.textContent.includes('DELIVERED')`, 'delivery completed');
        await capture('delivery-affiliate-mobile', 'delivery-v2');
        await logout();
        await login(email);
        await browser.navigate(operation + '?section=payments');
        await browser.until(`${finance}?.textContent.includes('Activar cuotas del contrato')`, 'activation after actual evidence');
        const beforeCancel=server.calls.filter(c=>c.method==='POST'&&c.path.endsWith('/financial')).length;
        await browser.evaluate('window.confirm=()=>false');
        await browser.clickText('Activar cuotas del contrato',finance);
        assert.equal(server.calls.filter(c=>c.method==='POST'&&c.path.endsWith('/financial')).length,beforeCancel);
        assert.equal((await readFinancial(db,f.id,1,f.root,'ADMIN')).active,false);
        // The explicit native confirmation is exercised; no automatic acceptance in application code.
        await browser.command('Page.addScriptToEvaluateOnNewDocument', { source: 'window.confirm=()=>true' });
        await browser.evaluate('window.confirm=()=>true');
        await browser.clickText('Activar cuotas del contrato', finance);
        await browser.until(`${finance}?.textContent.includes('Revisión 1')`, 'ledger activated');
        await detail('Vínculo de cuenta del cliente');
        await browser.until("!!document.querySelector('[aria-label=\"UID del cliente existente\"]')", 'client binding');
        await browser.change('[aria-label="UID del cliente existente"]', client);
        await browser.change('[aria-label="Motivo del vínculo"]', 'Vínculo sintético explícito');
        await browser.clickText('Vincular cuenta por UID', scope('client-portal-admin'));
        await browser.until(`${scope('client-portal-admin')}?.textContent.includes('Revisión 1')`, 'linked');
        await browser.change('[aria-label="Email de activación"]', clientEmail);
        await browser.clickText('Preparar invitación segura', scope('client-portal-admin'));
        await browser.until("!!document.querySelector('[data-testid=client-activation-link]')", 'invitation prepared');
        const invite = await browser.evaluate<string>("document.querySelector('[data-testid=client-activation-link]').href");
        await browser.change('[aria-label="Importe acreditado"]', '145000');
        await browser.change('[aria-label="Fecha efectiva"]', argentinaBusinessDate());
        await browser.change('[aria-label="Referencia de acreditación"]', 'SYNTHETIC PAYMENT NO REAL MONEY');
        await browser.clickText('Confirmar pago acreditado', finance);
        await browser.until(`${finance}?.textContent.replace(/\\s/g,'').includes('Saldopendiente:$1.595.000,00')`, 'admin balance');
        await capture('admin-paid-mobile', 'financial-v2');
        await browser.command('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
        await capture('admin-paid-desktop', 'financial-v2');
        await logout();
        await browser.navigate(new URL(invite).pathname + new URL(invite).hash);
        await browser.until("document.body.textContent.includes('Este acceso no crea usuarios.')",'anonymous production invitation blocked');
        assert.equal(await browser.evaluate("document.body.textContent.includes('Cuenta invitada:')"),false);
        await browser.change('input[name=email]',clientEmail);await browser.change('input[name=password]',password);
        await browser.clickText('Ingresar con mi cuenta');
        await browser.until("[...document.querySelectorAll('button')].some(b=>b.textContent==='Confirmar activación del servicio'&&!b.disabled)", 'existing verified client');
        await browser.clickText('Confirmar activación del servicio');
        await browser.until("document.body.textContent.includes('Servicio activado para tu cuenta.')", 'client activated');
        await browser.navigate('/cliente');
        await browser.until(`${finance}?.textContent.replace(/\\s/g,'').includes('Saldopendiente:$1.595.000,00')`, 'same client balance');
        await capture('client-paid-desktop', 'financial-v2');
        await browser.command('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
        await capture('client-paid-mobile', 'financial-v2');
        assert(!(await browser.evaluate<string>(`${finance}.innerText`)).includes('Confirmar pago acreditado'));
        await logout();
        await login(`${f.uid}@example.test`);
        await browser.navigate('/afiliado');
        await browser.until(`${finance}?.textContent.replace(/\\s/g,'').includes('Saldopendiente:$1.595.000,00')`, 'same affiliate balance');
        await capture('affiliate-paid-mobile', 'financial-v2');
        await browser.command('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
        await capture('affiliate-paid-desktop', 'financial-v2');
        const text = await browser.evaluate<string>(`${finance}.innerText`);
        assert(!text.includes('SYNTHETIC PAYMENT NO REAL MONEY'));
        assert(!text.includes('Confirmar pago acreditado'));
        await logout();
        await login(email);
        await browser.navigate(operation + '?section=payments');
        await browser.until(`${finance}?.textContent.includes('Revisión 2')`, 'admin current');
        await browser.evaluate('window.confirm=()=>true');
        await browser.change('[data-testid=financial-v2] input[name=reason]', 'Reversa sintética de prueba');
        await browser.clickText('Confirmar reversa auditada', finance);
        await browser.until(`${finance}?.textContent.replace(/\\s/g,'').includes('Saldopendiente:$1.740.000,00')`, 'reversal');
        await capture('reversal-admin-desktop', 'financial-v2');
        for (const [role, uid] of [['ADMIN', actor], ['AFFILIATE', f.uid], ['CLIENT', client]] as const) {
            const view = await readFinancial(db, f.id, 1, { uid, admin: role === 'ADMIN' }, role);
            assert(view.active);
            assert.equal(view.balanceCents, 174000000);
            assert.equal(view.receipts[0].status, 'REVERSADO');
        }
        for(const [mail,path] of [[clientEmail,'/cliente'],[`${f.uid}@example.test`,'/afiliado']]){
            await logout();await login(mail);await browser.navigate(path);
            await browser.until(`${finance}?.textContent.replace(/\\s/g,'').includes('Saldopendiente:$1.740.000,00')`,'reversed balance '+path);
            await capture(path.slice(1)+'-reversed-desktop','financial-v2');
        }
        // A second, entirely synthetic fixture starts from an interrupted frozen issue.
        // Only seeding/interruption is programmatic; recovery is completed through the actual UI/API.
        await logout(); await login(email);
        const interrupted=await productionReadyFixture(actor), bucket=await getBudgetDocumentationBucket();
        const expiry=Date.now()+15000;
        const recoveryGrant=await authorizeOperation(runtime,interrupted.id,1,{commandId:randomUUID(),operationId:interrupted.identity.operationId,expectedRevision:interrupted.ready.revision,packageId:p.id,approvalId:approved.id,
            formal:{contractIssueDate:argentinaBusinessDate(),promissoryNoteIssueDate:argentinaBusinessDate(),contractIssuePlace:'Lugar sintético',promissoryNoteIssuePlace:'Lugar sintético'},scopes:[...scopes],expiresAt:new Date(expiry).toISOString(),reason:'Autorización sintética para interrupción controlada',confirmed:true},actor);
        await freezeOperation(runtime,interrupted.id,1,{commandId:randomUUID(),authorizationId:recoveryGrant.id,expectedRevision:interrupted.ready.revision,confirmed:true},actor);
        const unavailable=new Proxy(bucket,{get(target,key){if(key==='file')return (...args:Parameters<typeof bucket.file>)=>{const file=target.file(...args);return new Proxy(file,{get(f,k){if(k==='save')return async()=>{throw Error('SYNTHETIC_INTERRUPTION');};const value=Reflect.get(f,k);return typeof value==='function'?value.bind(f):value;}});};const value=Reflect.get(target,key);return typeof value==='function'?value.bind(target):value;}});
        await assert.rejects(issueDocuments(runtime,unavailable,interrupted.id,1,actor),/SYNTHETIC_INTERRUPTION/);
        await new Promise(resolve=>setTimeout(resolve,Math.max(0,expiry-Date.now()+100)));
        await browser.navigate(`/admin/operaciones/${interrupted.id}/1?section=contract`);
        await browser.until(`${prod}?.textContent.includes('La autorización de emisión venció')`,'expired emission recovery');
        await capture('recovery-pending-desktop','issuance-recovery');
        await browser.command('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
        await capture('recovery-pending-mobile','issuance-recovery');
        await browser.change('input[name=recoveryExpires]',new Date(Date.now()+3600000-new Date().getTimezoneOffset()*60000).toISOString().slice(0,16));
        await browser.change('input[name=recoveryReason]','Nueva autorización sintética exacta; misma emisión');
        await browser.click('[data-testid=issuance-recovery] form input[type=checkbox]');
        await browser.change('input[name=recoveryReason]','Autorización sintética revisada, sin efectos reales');
        assert(await browser.evaluate(`[...${prod}.querySelectorAll('button')].find(b=>b.textContent==='Autorizar recuperación de emisión').disabled`),'editing invalidates confirmation');
        await browser.click('[data-testid=issuance-recovery] form input[type=checkbox]');
        await browser.clickText('Autorizar recuperación de emisión',prod);
        await browser.until(`document.querySelector('[aria-label="Autorización de recuperación vigente"]')?.options.length===2`,'recovery authorized by HTTP');
        const recovery=(await productionOverview(runtime,interrupted.id,1,actor)).recoveryAuthorizations[0];
        await select('[aria-label="Autorización de recuperación vigente"]',recovery.id);
        await browser.evaluate(`[...${prod}.querySelectorAll('label')].find(x=>x.textContent.includes('Confirmo completar los archivos')).querySelector('input').click()`);
        await browser.clickText('Recuperar los mismos documentos',prod);
        await browser.until(`${prod}?.textContent.includes('Abrir pagaré emitido')`,'recovered single package');
        await capture('recovery-completed-mobile','production-operation');
        await detail('Auditoría de autorizaciones y versiones');
        assert(await browser.evaluate(`[...${prod}.querySelectorAll('button')].some(b=>b.textContent==='Siguientes aprobaciones'&&b.disabled)`));
        assert.equal(browser.externalFirebase.length, 0);
        assert(!server.calls.some(c => c.status >= 500));
        writeFileSync(out + '/results.json', JSON.stringify({ browser: 'PASS', recovery: 'PASS_EXPIRED_AUTHORIZATION_HTTP_UI', mode: 'REAL_ADAPTER_ON_LOCAL_EMULATORS', http: 'existing route exports in shared isolated test process', screens, requests: server.calls, productionWrites: 0, total: 1740000, paid: 145000, balanceAfterPayment: 1595000, balanceAfterReversal: 1740000 }, null, 2));
        console.log('PRODUCTION_ADAPTER_BROWSER_DESKTOP_MOBILE_THREE_ROLES=PASS');
    }
    catch (error) {
        writeFileSync(out + '/failure.txt', String(error) + '\n' + await browser.evaluate<string>('document.body.innerText').catch(() => ''));
        writeFileSync(out + '/http.json', JSON.stringify(server.calls, null, 2));
        throw error;
    }
    finally {
        await browser.close();
        await server.stop();
        await admin.app().delete();
    }
}
run().catch(error => { console.error(error); process.exitCode = 1; });
