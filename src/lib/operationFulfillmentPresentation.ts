import type { FulfillmentAction, FulfillmentV2 } from './operationFulfillmentV2';
/** Presentation of the existing state machine only. Commands are still validated by nextFulfillment on server. */
export function fulfillmentWorkflow(s: FulfillmentV2, today = new Date().toISOString().slice(0,10)) {
 const pending=s.incidents.some(i=>!i.resolvedAt),p=s.providerState,l=s.logisticsState;
 const prePickup=['PENDIENTE_PEDIDO','PEDIDO_REALIZADO','CONFIRMADO','LISTO_PARA_RETIRAR'].includes(p);
 const available:FulfillmentAction[]=[];
 if(s.deliveryClosure==='DELIVERED_EMULATOR')return {available,primary:null as FulfillmentAction|null,notice:'Entrega registrada sólo en Emulator. El seguimiento está cerrado.'};
 if(prePickup)available.push('UPDATE_ORDER','PLAN_PICKUP','CANCEL_ORDER');
 if(p==='PENDIENTE_PEDIDO'&&s.providerName&&!pending)available.push('PLACE_ORDER');
 if(p==='PEDIDO_REALIZADO'&&!pending)available.push('CONFIRM_ORDER');
 if(p==='CONFIRMADO'&&!pending&&s.confirmedAvailabilityDate&&s.confirmedAvailabilityDate<=today)available.push('READY_FOR_PICKUP');
 if(['CONFIRMADO','LISTO_PARA_RETIRAR'].includes(p))available.push('UPDATE_AVAILABILITY');
 if(['CONFIRMADO','LISTO_PARA_RETIRAR','RETIRADO'].includes(p))available.push('UPDATE_COST');
 if(p==='CANCELADO')available.push('REOPEN_ORDER');
 if(p==='LISTO_PARA_RETIRAR'&&l==='PENDIENTE_RETIRO'&&!pending)available.push('RECORD_PICKUP');
 if(p==='RETIRADO'&&l==='RETIRADO')available.push('RECEIVE');
 if(p==='RETIRADO'&&['RECIBIDO','VIAJE_PROGRAMADO'].includes(l)&&!pending)available.push('PLAN_TRIP');
 if(p==='RETIRADO'&&['VIAJE_PROGRAMADO','ENTREGA_PROGRAMADA'].includes(l)&&!pending)available.push('PLAN_DELIVERY');
 if(s.incidents.length<100&&p==='RETIRADO'&&['RECIBIDO','VIAJE_PROGRAMADO','ENTREGA_PROGRAMADA'].includes(l))available.push('REJECT_DAMAGED');
 if(p==='RETIRADO'&&l==='EN_CUSTODIA_POR_RECHAZO'&&!pending)available.push('RESUME_FROM_CUSTODY');
 if(s.incidents.length<100)available.push('REPORT_INCIDENT');if(pending)available.push('RESOLVE_INCIDENT');
 let primary:FulfillmentAction|null=null,notice='';
 if(pending){notice='Hay incidencias pendientes. Revisalas en Más opciones antes de avanzar.';if(available.includes('RECEIVE'))primary='RECEIVE';}
 else if(p==='CANCELADO')notice='El pedido está cancelado. Podés reabrirlo con un motivo en Más opciones.';
 else if(l==='EN_CUSTODIA_POR_RECHAZO')primary='RESUME_FROM_CUSTODY';
 else if(l==='ENTREGA_PROGRAMADA')notice='Entrega programada. El cierre físico productivo sigue bloqueado; requiere mandato, pagaré y remito firmados.';
 else if(p==='PENDIENTE_PEDIDO')primary=s.providerName?'PLACE_ORDER':'UPDATE_ORDER';
 else if(p==='PEDIDO_REALIZADO')primary='CONFIRM_ORDER';
 else if(p==='CONFIRMADO'){if(available.includes('READY_FOR_PICKUP'))primary='READY_FOR_PICKUP';else {primary=s.plannedPickupDate?null:'PLAN_PICKUP';notice='La disponibilidad confirmada todavía no llegó. Podés planificar el retiro o corregir la fecha con motivo.';}}
 else if(p==='LISTO_PARA_RETIRAR')primary=s.plannedPickupDate?'RECORD_PICKUP':'PLAN_PICKUP';
 else if(l==='RETIRADO')primary='RECEIVE';
 else if(l==='RECIBIDO')primary='PLAN_TRIP';
 else if(l==='VIAJE_PROGRAMADO')primary='PLAN_DELIVERY';
 return {available,primary,notice};
}
