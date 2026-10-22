import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { adminPaths,legacyAdminDestination } from '../src/lib/adminCanonicalNavigation';
import { resolveAlertAction } from '../src/lib/budgetAlertRouting';
import { parseAdminSolicitudFilters } from '../src/lib/adminSolicitudesReadModel';
assert.equal(legacyAdminDestination('validation',{}),adminPaths.requests);
assert.equal(legacyAdminDestination('validation',{sourceCollection:'solicitudes_cuenta',solicitudId:'same-id'}),'/admin/solicitudes/solicitudes_cuenta/same-id');
assert.equal(legacyAdminDestination('validation',{sourceCollection:'solicitudes',solicitudId:'same-id'}),'/admin/solicitudes/solicitudes/same-id');
assert.equal(legacyAdminDestination('validation',{solicitudId:'same-id'}),'/admin/solicitudes?view=all&reference=same-id');
assert.equal(parseAdminSolicitudFilters({reference:'same-id',view:'all'}).q,'same-id');
assert.equal(parseAdminSolicitudFilters({q:'private text',reference:'bad/reference'}).q,'');
for(const bad of ['https://evil.test','//evil.test','a/b','.','..'])assert.equal(legacyAdminDestination('validation',{sourceCollection:'solicitudes',solicitudId:bad,returnTo:'https://evil.test'}),adminPaths.requests);
assert.equal(legacyAdminDestination('collections',{}),adminPaths.collections);assert.equal(legacyAdminDestination('logistics',{}),adminPaths.logistics);
assert.equal(legacyAdminDestination('validation',{tab:'documentacion'}),adminPaths.documents);assert.equal(legacyAdminDestination('validation',{tab:'entregas'}),adminPaths.logistics);
assert.equal(resolveAlertAction({tipo:'APERTURA_CUENTA',sourceCollection:'solicitudes',solicitudId:'exact'})?.href,'/admin/solicitudes/solicitudes/exact');
assert.equal(resolveAlertAction({tipo:'APERTURA_CUENTA',mensaje:'Persona con DNI 1234'})?.href,adminPaths.requests);
for(const route of ['validaciones','cartera','remitos']){const source=readFileSync(`src/app/admin/${route}/page.tsx`,'utf8');assert.ok(source.includes('redirect(legacyAdminDestination('));for(const forbidden of ['use client','firebase','updateDoc','deleteDoc','addDoc','generarContrato','planPagos'])assert.ok(!source.includes(forbidden));}
for(const file of ['src/app/admin/page.tsx','src/components/admin/navigation.ts','src/components/admin/solicitudes/AdminSolicitudDetail.tsx','src/components/admin/documentacion/AdminDocumentacionInbox.tsx']){const source=readFileSync(file,'utf8');assert.ok(!/\/admin\/(validaciones|cartera|remitos)/.test(source));}
const history=readFileSync('src/components/admin/operations/HistoricalOperationalRecords.tsx','utf8');for(const forbidden of ['updateDoc','deleteDoc','setDoc','addDoc','getDownloadURL','generarComprobante'])assert.ok(!history.includes(forbidden));
console.log('CANONICAL_ADMIN_ROUTES_ALERTS_REDIRECTS_READ_ONLY = PASS');
