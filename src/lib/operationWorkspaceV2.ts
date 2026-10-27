import type { ContractDraftV2 } from './contractV2';
import type { FulfillmentV2 } from './operationFulfillmentV2';
export type OperationSection = 'documents' | 'client' | 'budget' | 'contract' | 'logistics' | 'affiliate' | 'payments';
/** Read-only presentation. No persisted workflow, pricing or inferred identity. */
export function operationNextAction({ draft, tracking, pendingSubmissions, conformityPending }: {creditState?:import('./creditReviewV2').CreditState; draft: ContractDraftV2 | null; tracking: FulfillmentV2 | null; pendingSubmissions: boolean; conformityPending: boolean }): { status: string; label: string; responsible: string; section: OperationSection } {
  const administrative = (status: string, label: string, section: OperationSection = 'contract') => ({ status, label, responsible: 'Administración', section });
  if (tracking?.incidents.some(i => !i.resolvedAt)) return administrative('Incidencia pendiente', 'Revisar incidencia', 'logistics');
  if (!draft) return administrative('Propuesta aceptada', 'Preparar datos contractuales');
  if (pendingSubmissions) return administrative('Datos recibidos del cliente', 'Revisar datos recibidos');
  if (conformityPending) return administrative('Condiciones pendientes de conformidad', 'Registrar conformidad del cliente');
  if (tracking?.logisticsState==='DELIVERED') return administrative('Entrega registrada', 'Consultar cuotas y pagos', 'payments');
  if (tracking?.logisticsState==='DELIVERED_EMULATOR') return administrative('Entrega registrada en entorno de prueba', 'Consultar cuotas y pagos', 'payments');
  if (String(draft.status) === 'TERMS_FROZEN') return administrative('Condiciones contractuales guardadas', 'Consultar contrato y pagaré');
  if (draft.status !== 'READY_TO_FORMALIZE') return administrative('Documentación en preparación', 'Completar revisión contractual');
  if (!tracking) return administrative('Preparación técnica revisada', 'Consultar seguimiento del producto', 'logistics');
  if (tracking.providerState === 'PENDIENTE_PEDIDO') return administrative('Preparación técnica revisada', 'Preparar pedido al proveedor', 'logistics');
  if (tracking.providerState === 'CANCELADO') return administrative('Pedido cancelado', 'Revisar pedido cancelado', 'logistics');
  return administrative('Seguimiento de compra en curso', 'Consultar proveedor y logística', 'logistics');
}
export function operationStatusLabel(value: string): string {
  const labels: Record<string,string> = { PENDIENTE_PEDIDO:'Pendiente de pedido', PEDIDO_REALIZADO:'Pedido realizado', CONFIRMADO:'Pedido confirmado', LISTO_PARA_RETIRAR:'Listo para retirar', RETIRADO:'Retirado', CANCELADO:'Cancelado', PENDIENTE_RETIRO:'Retiro pendiente', RECIBIDO:'Recibido', VIAJE_PROGRAMADO:'Viaje programado', ENTREGA_PROGRAMADA:'Entrega programada', EN_CUSTODIA_POR_RECHAZO:'En custodia por rechazo', DELIVERED:'Entrega registrada', DELIVERED_EMULATOR:'Entrega de prueba', DRIVER:'Conductor', AFFILIATE:'Vendedor afiliado', DEPOT:'Depósito' };
  return labels[value] ?? value.replaceAll('_',' ').toLocaleLowerCase('es-AR');
}
