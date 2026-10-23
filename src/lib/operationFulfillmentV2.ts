import { calendarDate, exact, opaque } from './contractV2';
export const providerStates = ['PENDIENTE_PEDIDO','PEDIDO_REALIZADO','CONFIRMADO','LISTO_PARA_RETIRAR','RETIRADO','CANCELADO'] as const;
export type ProviderState = typeof providerStates[number];
export type LogisticsState = 'PENDIENTE_RETIRO'|'RETIRADO'|'RECIBIDO'|'VIAJE_PROGRAMADO'|'ENTREGA_PROGRAMADA'|'EN_CUSTODIA_POR_RECHAZO'|'DELIVERED_EMULATOR'|'DELIVERED';
export interface IncidentV2 { id:string; openedAt:string; openedBy:string; description:string; resolvedAt:string|null; resolvedBy:string|null; resolution:string|null }
export interface FulfillmentV2 {
 schemaVersion:'OPERATION_FULFILLMENT_V2'; operationId:string; revision:number;
 productName:string; referenceId:string|null; budgetedCost:number; actualCost:number|null;
 providerState:ProviderState; cancelledFrom:ProviderState|null; providerName:string; providerReference:string;
 orderDate:string|null; estimatedAvailabilityDate:string|null; confirmedAvailabilityDate:string|null;
 plannedPickupDate:string|null; actualPickupDate:string|null; pickupResponsible:string;
 actualReceiptDate:string|null; custodyLocation:string; custodian:string; visualCondition:string;
 logisticsState:LogisticsState; tripReference:string; plannedTripDate:string|null; carrier:string;
 destinationLocality:string; estimatedDeliveryDate:string|null; deliveryResponsible:string;
 notes:string; incidents:IncidentV2[]; updatedAt:string|null; updatedBy:string|null;
 deliveryClosure:'BLOCKED_PHYSICAL_SIGNATURES_REQUIRED'|'DELIVERED_EMULATOR'|'DELIVERED';
}
export const fulfillmentActions = ['UPDATE_ORDER','PLACE_ORDER','CONFIRM_ORDER','READY_FOR_PICKUP','UPDATE_COST','UPDATE_AVAILABILITY','CANCEL_ORDER','REOPEN_ORDER','PLAN_PICKUP','RECORD_PICKUP','RECEIVE','PLAN_TRIP','PLAN_DELIVERY','REPORT_INCIDENT','RESOLVE_INCIDENT','REJECT_DAMAGED','RESUME_FROM_CUSTODY'] as const;
export type FulfillmentAction = typeof fulfillmentActions[number];
export interface FulfillmentCommand { commandId:string; operationId:string; expectedRevision:number; action:FulfillmentAction; data:Record<string,unknown> }
export class FulfillmentError extends Error {}
function fail(message='Comando operativo inválido.'):never {throw new FulfillmentError(message);}
export function parseFulfillmentCommand(value:unknown):FulfillmentCommand {
 const x=exact(value,['commandId','operationId','expectedRevision','action','data']);opaque(x.commandId);
 if(typeof x.operationId!=='string'||!/^op_[a-f0-9]{64}$/.test(x.operationId)||!Number.isSafeInteger(x.expectedRevision)||Number(x.expectedRevision)<0||!fulfillmentActions.includes(x.action as FulfillmentAction)||!x.data||typeof x.data!=='object'||Array.isArray(x.data))fail();
 return x as unknown as FulfillmentCommand;
}
function text(v:unknown,required=false):string {if(typeof v!=='string'||v.length>500||/[\x00-\x1f<>]/.test(v)||(required&&!v.trim()))fail('Completá los datos operativos requeridos.');return v.trim();}
function date(v:unknown):string {return calendarDate(v);}
function actualDate(v:unknown,now:string):string {const d=date(v);if(d>now.slice(0,10))fail('Una fecha real no puede estar en el futuro.');return d;}
function cents(v:unknown):number {if(typeof v!=='number'||!Number.isFinite(v)||v<0||!Number.isSafeInteger(Math.round(v*100))||Math.abs(v*100-Math.round(v*100))>0.00001)fail('Costo inválido: usá hasta dos decimales.');return Math.round(v*100);}
export function costDifference(s:FulfillmentV2):number|null {return s.actualCost===null?null:(cents(s.actualCost)-cents(s.budgetedCost))/100;}
export function initialFulfillment(operationId:string,name:string,referenceId:string|null,cost:number):FulfillmentV2 {
 cents(cost);return {schemaVersion:'OPERATION_FULFILLMENT_V2',operationId,revision:0,productName:name,referenceId,budgetedCost:cost,actualCost:null,providerState:'PENDIENTE_PEDIDO',cancelledFrom:null,providerName:'',providerReference:'',orderDate:null,estimatedAvailabilityDate:null,confirmedAvailabilityDate:null,plannedPickupDate:null,actualPickupDate:null,pickupResponsible:'',actualReceiptDate:null,custodyLocation:'',custodian:'',visualCondition:'',logisticsState:'PENDIENTE_RETIRO',tripReference:'',plannedTripDate:null,carrier:'',destinationLocality:'',estimatedDeliveryDate:null,deliveryResponsible:'',notes:'',incidents:[],updatedAt:null,updatedBy:null,deliveryClosure:'BLOCKED_PHYSICAL_SIGNATURES_REQUIRED'};
}
export function nextFulfillment(current:FulfillmentV2,c:FulfillmentCommand,actor:string,now:string):FulfillmentV2 {
 if(c.operationId!==current.operationId||c.expectedRevision!==current.revision)fail('Conflicto de revisión. Recargá la operación.');
 const s=structuredClone(current),d=c.data;
 const fields=(keys:string[])=>exact(d,keys);
 const state=(...allowed:ProviderState[])=>{if(!allowed.includes(s.providerState))fail('Transición de proveedor no permitida.');};
 const logistics=(...allowed:LogisticsState[])=>{if(!allowed.includes(s.logisticsState))fail('Transición logística no permitida.');};
 const clear=()=>{if(s.incidents.some(i=>i.resolvedAt===null))fail('Resolvé las incidencias pendientes antes de avanzar.');};
 const incident=(description:string)=>{if(s.incidents.length>=100)fail('Límite de incidencias de la operación alcanzado.');s.incidents.push({id:c.commandId,openedAt:now,openedBy:actor,description,resolvedAt:null,resolvedBy:null,resolution:null});};
 if(c.action==='UPDATE_ORDER') {fields(['providerName','providerReference','estimatedAvailabilityDate','notes']);state('PENDIENTE_PEDIDO','PEDIDO_REALIZADO','CONFIRMADO','LISTO_PARA_RETIRAR');const supplier=text(d.providerName,true);if(['CONFIRMADO','LISTO_PARA_RETIRAR'].includes(s.providerState)&&supplier!==s.providerName)fail('No se puede sustituir un proveedor confirmado en una edición de datos.');s.providerName=supplier;s.providerReference=text(d.providerReference);s.estimatedAvailabilityDate=d.estimatedAvailabilityDate===null?null:date(d.estimatedAvailabilityDate);s.notes=text(d.notes);}
 if(c.action==='PLACE_ORDER') {fields(['orderDate']);state('PENDIENTE_PEDIDO');clear();if(!s.providerName)fail('Seleccioná un proveedor.');s.orderDate=actualDate(d.orderDate,now);s.providerState='PEDIDO_REALIZADO';}
 if(c.action==='CONFIRM_ORDER') {fields(['actualCost','confirmedAvailabilityDate']);state('PEDIDO_REALIZADO');clear();cents(d.actualCost);s.actualCost=d.actualCost as number;s.confirmedAvailabilityDate=date(d.confirmedAvailabilityDate);s.providerState='CONFIRMADO';}
 if(c.action==='READY_FOR_PICKUP') {fields([]);state('CONFIRMADO');clear();if(!s.confirmedAvailabilityDate||s.confirmedAvailabilityDate>now.slice(0,10))fail('La disponibilidad confirmada todavía no llegó.');s.providerState='LISTO_PARA_RETIRAR';}
 if(c.action==='UPDATE_AVAILABILITY') {fields(['confirmedAvailabilityDate','reason']);state('CONFIRMADO','LISTO_PARA_RETIRAR');text(d.reason,true);s.confirmedAvailabilityDate=date(d.confirmedAvailabilityDate);s.providerState='CONFIRMADO';}
 if(c.action==='UPDATE_COST') {fields(['actualCost','reason']);state('CONFIRMADO','LISTO_PARA_RETIRAR','RETIRADO');text(d.reason,true);cents(d.actualCost);s.actualCost=d.actualCost as number;}
 if(c.action==='CANCEL_ORDER') {fields(['reason']);state('PENDIENTE_PEDIDO','PEDIDO_REALIZADO','CONFIRMADO','LISTO_PARA_RETIRAR');text(d.reason,true);s.cancelledFrom=s.providerState;s.providerState='CANCELADO';}
 if(c.action==='REOPEN_ORDER') {fields(['reason']);state('CANCELADO');text(d.reason,true);if(!s.cancelledFrom||s.cancelledFrom==='RETIRADO'||s.cancelledFrom==='CANCELADO')fail();s.providerState=s.cancelledFrom;s.cancelledFrom=null;}
 if(c.action==='PLAN_PICKUP') {fields(['plannedPickupDate','pickupResponsible']);state('PENDIENTE_PEDIDO','PEDIDO_REALIZADO','CONFIRMADO','LISTO_PARA_RETIRAR');s.plannedPickupDate=date(d.plannedPickupDate);s.pickupResponsible=text(d.pickupResponsible,true);}
 if(c.action==='RECORD_PICKUP') {fields(['actualPickupDate','pickupResponsible']);state('LISTO_PARA_RETIRAR');logistics('PENDIENTE_RETIRO');clear();s.actualPickupDate=actualDate(d.actualPickupDate,now);if(s.orderDate&&s.actualPickupDate<s.orderDate)fail('El retiro real precede al pedido.');if(s.confirmedAvailabilityDate&&s.actualPickupDate<s.confirmedAvailabilityDate)fail('El retiro real precede a la disponibilidad confirmada.');s.pickupResponsible=text(d.pickupResponsible,true);s.providerState='RETIRADO';s.logisticsState='RETIRADO';}
 if(c.action==='RECEIVE') {fields(['actualReceiptDate','custodyLocation','custodian','visualCondition','notes']);state('RETIRADO');logistics('RETIRADO');s.actualReceiptDate=actualDate(d.actualReceiptDate,now);if(s.actualPickupDate&&s.actualReceiptDate<s.actualPickupDate)fail('La recepción precede al retiro real.');s.custodyLocation=text(d.custodyLocation,true);s.custodian=text(d.custodian,true);s.visualCondition=text(d.visualCondition,true);if(!['SIN_DANOS_VISIBLES','DANOS_VISIBLES','PENDIENTE_REVISION'].includes(s.visualCondition))fail();s.notes=text(d.notes);s.logisticsState='RECIBIDO';if(s.visualCondition!=='SIN_DANOS_VISIBLES')incident(`Recepción: ${s.visualCondition}. ${s.notes}`);}
 if(c.action==='PLAN_TRIP') {fields(['tripReference','plannedTripDate','carrier']);state('RETIRADO');logistics('RECIBIDO','VIAJE_PROGRAMADO');clear();s.tripReference=text(d.tripReference,true);s.plannedTripDate=date(d.plannedTripDate);if(s.actualReceiptDate&&s.plannedTripDate<s.actualReceiptDate)fail('El viaje precede a la recepción.');s.carrier=text(d.carrier,true);s.logisticsState='VIAJE_PROGRAMADO';}
 if(c.action==='PLAN_DELIVERY') {fields(['destinationLocality','estimatedDeliveryDate','deliveryResponsible']);state('RETIRADO');logistics('VIAJE_PROGRAMADO','ENTREGA_PROGRAMADA');clear();s.destinationLocality=text(d.destinationLocality,true);s.estimatedDeliveryDate=date(d.estimatedDeliveryDate);if(s.plannedTripDate&&s.estimatedDeliveryDate<s.plannedTripDate)fail('La entrega estimada precede al viaje.');s.deliveryResponsible=text(d.deliveryResponsible,true);s.logisticsState='ENTREGA_PROGRAMADA';}
 if(c.action==='REPORT_INCIDENT') {fields(['description']);incident(text(d.description,true));}
 if(c.action==='RESOLVE_INCIDENT') {fields(['incidentId','resolution']);const i=s.incidents.find(i=>i.id===d.incidentId);if(!i||i.resolvedAt)fail('Incidencia inexistente o resuelta.');i.resolution=text(d.resolution,true);i.resolvedAt=now;i.resolvedBy=actor;}
 if(c.action==='REJECT_DAMAGED') {fields(['actualDate','custodyLocation','custodian','description']);state('RETIRADO');logistics('RECIBIDO','VIAJE_PROGRAMADO','ENTREGA_PROGRAMADA');const rejected=actualDate(d.actualDate,now);if(s.actualReceiptDate&&rejected<s.actualReceiptDate)fail('El rechazo precede a la recepción.');s.custodyLocation=text(d.custodyLocation,true);s.custodian=text(d.custodian,true);incident(`Rechazo por daño visible (${rejected}): ${text(d.description,true)}`);s.visualCondition='DANOS_VISIBLES';s.logisticsState='EN_CUSTODIA_POR_RECHAZO';}
 if(c.action==='RESUME_FROM_CUSTODY') {fields(['reason']);logistics('EN_CUSTODIA_POR_RECHAZO');state('RETIRADO');clear();text(d.reason,true);s.logisticsState='RECIBIDO';s.tripReference='';s.plannedTripDate=null;s.carrier='';s.destinationLocality='';s.estimatedDeliveryDate=null;s.deliveryResponsible='';}
 return {...s,revision:s.revision+1,updatedAt:now,updatedBy:actor};
}
export function fulfillmentNextStep(s:FulfillmentV2):string {
 if(s.logisticsState==='DELIVERED')return 'Entrega física registrada. Consultar originales, cuotas y pagos acreditados.';
 if(s.logisticsState==='DELIVERED_EMULATOR')return 'Entrega física registrada sólo en Emulator. Sin activación financiera ni formalización.';
 if(s.incidents.some(i=>!i.resolvedAt))return 'Resolver incidencias y conservar la custodia';
 if(s.providerState==='CANCELADO')return 'Pedido cancelado; reapertura sólo mediante comando con motivo';
 if(s.logisticsState==='ENTREGA_PROGRAMADA')return 'Entrega bloqueada hasta verificar firmas físicas de mandato, pagaré y remito';
 if(s.logisticsState==='EN_CUSTODIA_POR_RECHAZO')return 'Reanudar explícitamente desde custodia';
 return ({PENDIENTE_PEDIDO:'Registrar pedido',PEDIDO_REALIZADO:'Confirmar costo y disponibilidad',CONFIRMADO:'Confirmar listo para retirar',LISTO_PARA_RETIRAR:'Registrar retiro real',CANCELADO:'Pedido cancelado',RETIRADO:s.logisticsState==='RETIRADO'?'Registrar recepción física':s.logisticsState==='RECIBIDO'?'Programar viaje':'Programar entrega'} satisfies Record<ProviderState,string>)[s.providerState];
}
