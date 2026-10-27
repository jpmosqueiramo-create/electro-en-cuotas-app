import type { BudgetV2 } from './budgetV2';
import type { ContractDraftV2 } from './contractV2';
import type { OperationViewV2 } from './operationV2';
import type { FulfillmentAction, FulfillmentV2 } from './operationFulfillmentV2';
import type { FulfillmentViewV2 } from './operationFulfillmentV2Server';
import { argentinaBusinessDate } from './productionV2/businessDate';
export type LogisticsStage = 'WAITING' | 'ORDERED' | 'CONFIRMED' | 'READY' | 'PICKED_UP' | 'RECEIVED' | 'TRIP' | 'SCHEDULED' | 'DELIVERED' | 'CANCELLED' | 'INCIDENT' | 'UNKNOWN';
export const logisticsLabels: Record<LogisticsStage, string> = { WAITING: 'Por encargar', ORDERED: 'Encargado al proveedor', CONFIRMED: 'Pedido confirmado', READY: 'Listo para retirar', PICKED_UP: 'Retirado del proveedor', RECEIVED: 'En mi poder', TRIP: 'Traslado previsto', SCHEDULED: 'Entrega programada', DELIVERED: 'Entregado', CANCELLED: 'Cancelado', INCIDENT: 'Con incidencia', UNKNOWN: 'Sin verificar' };
export function logisticsStage(s: FulfillmentV2 | null): LogisticsStage {
  if (!s) return 'UNKNOWN';
  if (s.deliveryClosure === 'DELIVERED' || s.deliveryClosure === 'DELIVERED_EMULATOR') return 'DELIVERED';
  if (s.incidents.some(i => !i.resolvedAt) || s.logisticsState === 'EN_CUSTODIA_POR_RECHAZO') return 'INCIDENT';
  if (s.providerState === 'CANCELADO') return 'CANCELLED';
  if (s.logisticsState === 'ENTREGA_PROGRAMADA') return 'SCHEDULED';
  if (s.logisticsState === 'VIAJE_PROGRAMADO') return 'TRIP';
  if (s.logisticsState === 'RECIBIDO') return 'RECEIVED';
  if (s.logisticsState === 'RETIRADO') return 'PICKED_UP';
  return ({ PENDIENTE_PEDIDO: 'WAITING', PEDIDO_REALIZADO: 'ORDERED', CONFIRMADO: 'CONFIRMED', LISTO_PARA_RETIRAR: 'READY', RETIRADO: 'PICKED_UP', CANCELADO: 'CANCELLED' } as const)[s.providerState];
}
export function guidedLogisticsAction(s: FulfillmentV2): FulfillmentAction | null {
  if (['DELIVERED', 'DELIVERED_EMULATOR'].includes(s.deliveryClosure)) return null;
  if (s.incidents.some(i => !i.resolvedAt)) return 'RESOLVE_INCIDENT';
  if (s.providerState === 'CANCELADO') return 'REOPEN_ORDER';
  if (s.logisticsState === 'EN_CUSTODIA_POR_RECHAZO') return 'RESUME_FROM_CUSTODY';
  if (s.providerState === 'PENDIENTE_PEDIDO') return s.providerName ? 'PLACE_ORDER' : 'UPDATE_ORDER';
  if (s.providerState === 'PEDIDO_REALIZADO') return 'CONFIRM_ORDER';
  if (s.providerState === 'CONFIRMADO') return 'READY_FOR_PICKUP';
  if (s.providerState === 'LISTO_PARA_RETIRAR') return 'RECORD_PICKUP';
  if (s.logisticsState === 'RETIRADO') return 'RECEIVE';
  if (s.logisticsState === 'RECIBIDO') return 'PLAN_TRIP';
  if (s.logisticsState === 'VIAJE_PROGRAMADO') return 'PLAN_DELIVERY';
  return null;
}
export const guidedLogisticsLabels: Partial<Record<FulfillmentAction, string>> = { UPDATE_ORDER: '1. ¿A quién le encargás el producto?', PLACE_ORDER: '2. ¿Cuándo lo encargaste?', CONFIRM_ORDER: '3. ¿Cuándo estará disponible?', READY_FOR_PICKUP: '4. ¿El proveedor ya lo tiene listo?', RECORD_PICKUP: '5. ¿Cuándo lo retiraste?', RECEIVE: '6. ¿Cuándo quedó en tu poder?', PLAN_TRIP: '7. Organizar el traslado', PLAN_DELIVERY: '8. Coordinar la entrega al cliente', RESOLVE_INCIDENT: 'Resolver la incidencia pendiente', REOPEN_ORDER: 'Reabrir el pedido', RESUME_FROM_CUSTODY: 'Continuar con el producto en custodia' };
export function logisticsTimeline(s: FulfillmentV2, acceptedAt: string, deliveredAt: string | null = null) {
  const accepted = new Date(acceptedAt);
  return [
    { label: 'Pedido del cliente aceptado', date: Number.isFinite(accepted.getTime()) ? argentinaBusinessDate(accepted) : null, planned: false },
    { label: 'Encargado al proveedor', date: s.orderDate, planned: false },
    { label: 'Disponibilidad confirmada', date: s.confirmedAvailabilityDate, planned: true },
    { label: 'Retirado del proveedor', date: s.actualPickupDate, planned: false },
    { label: 'Recibido en mi poder', date: s.actualReceiptDate, planned: false },
    { label: 'Traslado previsto', date: s.plannedTripDate, planned: true },
    { label: 'Entrega programada', date: s.estimatedDeliveryDate, planned: true },
    { label: 'Entregado al cliente', date: logisticsStage(s) === 'DELIVERED' && deliveredAt && Number.isFinite(Date.parse(deliveredAt)) ? argentinaBusinessDate(new Date(deliveredAt)) : null, planned: false },
  ];
}
export interface LogisticsRow { key: string; budgetId: string; version: number; client: string; product: string; quantity: number | null; acceptedAt: string | null; view: FulfillmentViewV2 | null }
export type LogisticsFilter = LogisticsStage | 'ALL' | 'ACTIVE' | 'SUPPLIER' | 'IN_HAND';
export function matchesLogistics(row: LogisticsRow, filter: LogisticsFilter) {
  const stage = logisticsStage(row.view?.state ?? null);
  if (filter === 'ALL') return true;
  if (filter === 'ACTIVE') return !['DELIVERED', 'CANCELLED'].includes(stage);
  if (filter === 'SUPPLIER') return ['ORDERED', 'CONFIRMED', 'READY'].includes(stage);
  if (filter === 'IN_HAND') return ['RECEIVED', 'TRIP', 'SCHEDULED'].includes(stage);
  return stage === filter;
}
const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es-AR');
export function selectLogistics(rows: LogisticsRow[], query: string, filter: LogisticsFilter) {
  const tokens = normalize(query).trim().split(/\s+/).filter(Boolean);
  return rows.filter(row => matchesLogistics(row, filter) && tokens.every(token => normalize(`${row.client} ${row.product} ${row.view?.state.providerName ?? ''}`).includes(token)))
    .sort((a, b) => (b.view?.state.orderDate ?? b.acceptedAt ?? '').localeCompare(a.view?.state.orderDate ?? a.acceptedAt ?? '') || a.client.localeCompare(b.client, 'es'));
}
/** Compose only existing authorized reads; no migration, reservation or financial activation. */
export async function loadLogistics(read: (url: string) => Promise<unknown>) {
  const { budgets } = await read('/api/admin/presupuestos-v2') as { budgets: BudgetV2[] };
  const issued = budgets.filter(b => b.estado === 'EMITIDO'), result: LogisticsRow[] = [];
  for (let i = 0; i < issued.length; i += 4) {
    const batch = await Promise.all(issued.slice(i, i + 4).map(async budget => {
      const row: LogisticsRow = { key: `${budget.id}:${budget.version}`, budgetId: budget.id, version: budget.version, client: budget.clienteSnapshot.nombre || 'Cliente', product: 'Producto sin verificar', quantity: null, acceptedAt: null, view: null };
      const base = `/api/admin/presupuestos-v2/${encodeURIComponent(budget.id)}/versions/${budget.version}`;
      try {
        const { operation, draft } = await read(`${base}/contract`) as { operation: OperationViewV2 | null; draft: ContractDraftV2 | null };
        if (!operation) return null;
        row.client = draft?.personalData.fullName?.trim() || row.client; row.quantity = draft?.productDetails?.quantity ?? null;
        row.acceptedAt = operation.identity.acceptedAt;
        row.product = budget.options.find(o => o.optionId === operation.identity.acceptedOptionId)?.referenceSnapshot.nombre || row.product;
        try { row.view = await read(`${base}/fulfillment`) as FulfillmentViewV2; } catch { /* Unknown is visible, never falsely delivered or empty. */ }
      } catch { /* Preserve an unverified row when origin cannot be read. */ }
      return row;
    }));
    result.push(...batch.filter((row): row is LogisticsRow => row !== null));
  }
  return result;
}
