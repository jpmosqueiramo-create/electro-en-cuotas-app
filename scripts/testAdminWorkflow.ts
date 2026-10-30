import assert from 'node:assert/strict';
import {ADMIN_DESTINATIONS} from '../src/components/admin/navigation';
import {workflowLabels,matchesWorkflow,type AdminWorkflow} from '../src/lib/adminWorkflow';
import {mapSolicitudCuentaToAdminReadModel,filterAdminSolicitudes,isAdminSolicitudPending,adminSolicitudesContext,parseAdminSolicitudFilters} from '../src/lib/adminSolicitudesReadModel';
assert.deepEqual(ADMIN_DESTINATIONS.slice(0,3).map(d=>d.label),['Inicio','Presupuestos','Solicitudes']);
const base:AdminWorkflow={budgetId:'demo',version:1,product:'Producto',acceptedAt:'2026-10-30T12:00:00Z',stage:'PENDING_APPROVAL',approval:'PENDING'};
const item={...mapSolicitudCuentaToAdminReadModel('same-id',{nombre:'Cliente',estado:'APROBADO'}),tipoPresentacion:'Solicitud' as const,workflow:[base]};
const filter=(status:string)=>filterAdminSolicitudes([item],{view:'all',type:'Solicitud',q:'',status});
assert.equal(filter('PENDING_APPROVAL').length,1);assert.equal(filter('APROBADO').length,0);assert.equal(filter('APPROVED').length,0);
item.workflow=[{...base,stage:'CONTRACT',approval:'APPROVED'}];assert.equal(filter('APPROVED').length,1);assert.equal(filter('CONTRACT').length,1);assert.equal(filter('PENDING_APPROVAL').length,0);
item.workflow=[{...base,stage:'DELIVERED'}];assert.equal(isAdminSolicitudPending(item),false);item.workflow.push({...base,budgetId:'other',stage:'PENDING_PERSONAL_DATA'});assert.equal(isAdminSolicitudPending(item),true);assert.equal(filter('PENDING_PERSONAL_DATA').length,1);
for(const status of Object.keys(workflowLabels)){const c=adminSolicitudesContext({view:'all',type:'Solicitud',status,q:'Private name'});assert.ok(!c.includes('Private'));assert.equal(parseAdminSolicitudFilters(Object.fromEntries(new URLSearchParams(c))).status,status);}
assert.equal(matchesWorkflow({...base,stage:'UNAVAILABLE'},'APPROVED'),false);
console.log('ADMIN_WORKFLOW_MENU_FILTERS_STAGE_APPROVAL_MULTIPLE_OPERATIONS_URL_PRIVACY=PASS');
