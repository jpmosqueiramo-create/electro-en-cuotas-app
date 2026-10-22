import assert from 'node:assert/strict';
import { initialFulfillment,nextFulfillment,type FulfillmentAction } from '../src/lib/operationFulfillmentV2';
import { fulfillmentWorkflow } from '../src/lib/operationFulfillmentPresentation';
const now='2026-10-22T12:00:00.000Z';let s=initialFulfillment('op_'+'a'.repeat(64),'Producto sintético',null,580000),counter=0;
function step(action:FulfillmentAction,data:Record<string,unknown>={}){assert.ok(fulfillmentWorkflow(s,now.slice(0,10)).available.includes(action));s=nextFulfillment(s,{action,data,operationId:s.operationId,expectedRevision:s.revision,commandId:'test-'+(++counter)},'synthetic-admin',now);const w=fulfillmentWorkflow(s,now.slice(0,10));if(w.primary)assert.ok(w.available.includes(w.primary));}
assert.equal(fulfillmentWorkflow(s).primary,'UPDATE_ORDER');assert.ok(!fulfillmentWorkflow(s).available.includes('PLACE_ORDER'));assert.ok(!fulfillmentWorkflow(s).available.includes('READY_FOR_PICKUP'));
step('UPDATE_ORDER',{providerName:'Proveedor sintético',providerReference:'DEMO',estimatedAvailabilityDate:null,notes:''});assert.equal(fulfillmentWorkflow(s).primary,'PLACE_ORDER');
step('CANCEL_ORDER',{reason:'Prueba'});assert.equal(fulfillmentWorkflow(s).primary,null);assert.ok(!fulfillmentWorkflow(s).available.includes('PLACE_ORDER'));step('REOPEN_ORDER',{reason:'Prueba'});
step('PLACE_ORDER',{orderDate:'2026-01-01'});assert.equal(fulfillmentWorkflow(s).primary,'CONFIRM_ORDER');
step('CONFIRM_ORDER',{actualCost:600000,confirmedAvailabilityDate:'2099-01-01'});assert.ok(!fulfillmentWorkflow(s).available.includes('READY_FOR_PICKUP'));assert.equal(fulfillmentWorkflow(s).primary,'PLAN_PICKUP');
step('UPDATE_AVAILABILITY',{confirmedAvailabilityDate:'2026-01-02',reason:'Corrección sintética'});assert.equal(fulfillmentWorkflow(s).primary,'READY_FOR_PICKUP');step('READY_FOR_PICKUP');assert.equal(fulfillmentWorkflow(s).primary,'PLAN_PICKUP');
step('PLAN_PICKUP',{plannedPickupDate:'2026-01-03',pickupResponsible:'Conductor demo'});assert.equal(s.actualPickupDate,null);assert.equal(fulfillmentWorkflow(s).primary,'RECORD_PICKUP');
step('RECORD_PICKUP',{actualPickupDate:'2026-01-03',pickupResponsible:'Conductor demo'});assert.equal(fulfillmentWorkflow(s).primary,'RECEIVE');
step('RECEIVE',{actualReceiptDate:'2026-01-04',custodyLocation:'Depósito demo',custodian:'Custodio demo',visualCondition:'SIN_DANOS_VISIBLES',notes:''});assert.equal(fulfillmentWorkflow(s).primary,'PLAN_TRIP');
step('REPORT_INCIDENT',{description:'Incidencia sintética'});assert.equal(fulfillmentWorkflow(s).primary,null);assert.ok(!fulfillmentWorkflow(s).available.includes('PLAN_TRIP'));step('RESOLVE_INCIDENT',{incidentId:s.incidents[0].id,resolution:'Revisada'});
step('PLAN_TRIP',{tripReference:'Viaje demo',plannedTripDate:'2026-12-10',carrier:'Transportista demo'});assert.equal(fulfillmentWorkflow(s).primary,'PLAN_DELIVERY');step('PLAN_DELIVERY',{destinationLocality:'Lincoln',estimatedDeliveryDate:'2026-12-11',deliveryResponsible:'Responsable demo'});assert.equal(fulfillmentWorkflow(s).primary,null);assert.equal(s.deliveryClosure,'BLOCKED_PHYSICAL_SIGNATURES_REQUIRED');
const delivered={...s,deliveryClosure:'DELIVERED_EMULATOR' as const,logisticsState:'DELIVERED_EMULATOR' as const};assert.deepEqual(fulfillmentWorkflow(delivered).available,[]);
assert.equal(s.budgetedCost,580000);console.log('FULFILLMENT_PRESENTATION_VALID_ACTIONS_NEXT_STEP_PLANNED_VS_ACTUAL_GUARDS=PASS');
