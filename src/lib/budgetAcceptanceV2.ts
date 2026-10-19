import type { BudgetV2 } from './budgetV2';
import type { BudgetOptionV2 } from './budgetReferenceV2';
import { BudgetV2DomainError, budgetV2ExactObject, budgetV2OpaqueId } from './budgetV2';

export const DOCUMENT_TYPES = ['DNI_FRONT', 'DNI_BACK', 'ADDRESS_PROOF', 'PAYSLIP'] as const;
export type DocumentType = typeof DOCUMENT_TYPES[number];
export const DOCUMENT_LABELS: Record<DocumentType, string> = { DNI_FRONT: 'DNI frente', DNI_BACK: 'DNI dorso', ADDRESS_PROOF: 'Servicio / comprobante de domicilio', PAYSLIP: 'Recibo de sueldo' };
export const MAX_ATTACHMENT_SIZE_BYTES = 10485760;
export const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'] as const;
export function fail(message = 'Datos de aceptación o documentación inválidos.'): never { throw new BudgetV2DomainError(message); }
export function identity(budgetId: unknown, version: unknown): asserts budgetId is string {
  if (!budgetV2OpaqueId(budgetId) || !Number.isSafeInteger(version) || Number(version) < 1) fail();
}
export function documentType(value: unknown): DocumentType {
  if (typeof value !== 'string' || !DOCUMENT_TYPES.includes(value as DocumentType)) fail();
  return value as DocumentType;
}
export interface AcceptanceCommand { budgetId: string; version: number; acceptedOptionId: string; preferredPlanCuotas: number | null; commandId: string }
export interface BudgetAcceptanceV2 {
  schemaVersion: 'BUDGET_ACCEPTANCE_V2'; budgetId: string; budgetVersion: number;
  sourceCollection: BudgetV2['sourceCollection']; solicitudId: string;
  acceptedOptionId: string; acceptedAt: string; acceptedBy: string;
  preferredPlanCuotas: number | null; preferredPlanAmountSnapshot: number | null;
  optionSnapshot: BudgetOptionV2; workflowStage: 'DOCUMENTACION';
}
export function parseAcceptanceCommand(value: unknown): AcceptanceCommand {
  const c = budgetV2ExactObject(value, ['budgetId', 'version', 'acceptedOptionId', 'preferredPlanCuotas', 'commandId']);
  identity(c.budgetId, c.version);
  if (!budgetV2OpaqueId(c.acceptedOptionId) || !budgetV2OpaqueId(c.commandId) || !(c.preferredPlanCuotas === null || (Number.isSafeInteger(c.preferredPlanCuotas) && Number(c.preferredPlanCuotas) >= 1 && Number(c.preferredPlanCuotas) <= 18))) fail();
  return { budgetId: c.budgetId, version: c.version as number, acceptedOptionId: c.acceptedOptionId, preferredPlanCuotas: c.preferredPlanCuotas as number | null, commandId: c.commandId };
}
export function buildAcceptance(budget: BudgetV2, command: AcceptanceCommand, actor: string, at: string): BudgetAcceptanceV2 {
  if (budget.schemaVersion !== 'BUDGET_V2' || budget.estado !== 'EMITIDO' || !budget.issuedAt || !Number.isFinite(Date.parse(budget.issuedAt))) fail('Sólo se acepta una versión emitida.');
  if (budget.id !== command.budgetId || budget.version !== command.version) fail('Versión incorrecta.');
  const options = budget.options.filter(o => o.optionId === command.acceptedOptionId);
  if (options.length !== 1) fail('Elegí exactamente una opción ofrecida.');
  const plan = options[0].referenceSnapshot.planesOfrecidos.find(p => p.cuotas === command.preferredPlanCuotas);
  if (command.preferredPlanCuotas !== null && !plan) fail('El plan preferido no fue ofrecido.');
  return { schemaVersion: 'BUDGET_ACCEPTANCE_V2', budgetId: budget.id, budgetVersion: budget.version,
    sourceCollection: budget.sourceCollection, solicitudId: budget.solicitudId, acceptedOptionId: command.acceptedOptionId,
    acceptedAt: at, acceptedBy: actor, preferredPlanCuotas: command.preferredPlanCuotas,
    preferredPlanAmountSnapshot: plan?.cuotaEstimada ?? null, optionSnapshot: structuredClone(options[0]), workflowStage: 'DOCUMENTACION' };
}
export interface BudgetAttachment { attachmentId: string; storagePath: string; originalName: string; mimeType: string; size: number; uploadedAt: string; uploadedBy: string; sha256: string }
export interface DocumentationSlot { type: DocumentType; required: false; status: 'SIN_CARGAR' | 'CARGADO' | 'OBSERVADO'; attachments: BudgetAttachment[]; observation: string | null; observedAt: string | null; observedBy: string | null }
export interface DocumentationEvent { type: 'UPLOADED' | 'DELETED' | 'OBSERVED'; documentType: DocumentType; attachmentId: string | null; at: string; by: string; note: string | null }
export interface BudgetDocumentationCaseV2 {
  schemaVersion: 'BUDGET_DOCUMENTATION_CASE_V2'; budgetId: string; budgetVersion: number; acceptedOptionId: string;
  workflowStage: 'DOCUMENTACION'; createdAt: string; createdBy: string; updatedAt: string;
  slots: Record<DocumentType, DocumentationSlot>; events: DocumentationEvent[];
}
export function createDocumentationCase(a: BudgetAcceptanceV2): BudgetDocumentationCaseV2 {
  const slot = (type: DocumentType): DocumentationSlot => ({ type, required: false, status: "SIN_CARGAR", attachments: [], observation: null, observedAt: null, observedBy: null });
  return { schemaVersion: 'BUDGET_DOCUMENTATION_CASE_V2', budgetId: a.budgetId, budgetVersion: a.budgetVersion, acceptedOptionId: a.acceptedOptionId,
    workflowStage: 'DOCUMENTACION', createdAt: a.acceptedAt, createdBy: a.acceptedBy, updatedAt: a.acceptedAt,
    slots: { DNI_FRONT: slot('DNI_FRONT'), DNI_BACK: slot('DNI_BACK'), ADDRESS_PROOF: slot('ADDRESS_PROOF'), PAYSLIP: slot('PAYSLIP') }, events: [] };
}
export function storagePath(budgetId: string, version: number, type: DocumentType, attachmentId: string) {
  identity(budgetId, version); documentType(type); if (!budgetV2OpaqueId(attachmentId)) fail();
  return `budget-documentation-v2/${budgetId}/v${version}/${type}/${attachmentId}`;
}
export function applyDocumentEvent(current: BudgetDocumentationCaseV2, type: DocumentType, event: DocumentationEvent, attachment?: BudgetAttachment): BudgetDocumentationCaseV2 {
  const next = structuredClone(current), slot = next.slots[type];
  if (next.events.length >= 250 || JSON.stringify(next).length > 600000) fail('El expediente alcanzó su límite técnico; requiere revisión administrativa.');
  if (event.type === 'UPLOADED') {
    if (!attachment || slot.attachments.length >= 20) fail('Límite técnico de archivos por documento.');
    slot.attachments.push(attachment); slot.observation = slot.observedAt = slot.observedBy = null;
  } else if (event.type === 'DELETED') slot.attachments = slot.attachments.filter(a => a.attachmentId !== event.attachmentId);
  else {
    if (!slot.attachments.length || !event.note?.trim() || event.note.length > 1000) fail('La observación requiere un archivo y texto de hasta 1000 caracteres.');
    slot.observation = event.note.trim(); slot.observedAt = event.at; slot.observedBy = event.by;
  }
  if (!slot.attachments.length) slot.observation = slot.observedAt = slot.observedBy = null;
  slot.status = !slot.attachments.length ? 'SIN_CARGAR' : slot.observation ? 'OBSERVADO' : 'CARGADO';
  next.updatedAt = event.at; next.events.push(event); return next;
}
