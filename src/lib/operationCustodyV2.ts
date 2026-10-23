import { exact, opaque } from './contractV2';
export type CustodyRole = 'DRIVER' | 'AFFILIATE' | 'DEPOT';
export interface CustodyParticipant { uid: string; role: CustodyRole; affiliateId: string | null }
export interface CustodyTransfer {
 id: string; from: CustodyParticipant; to: CustodyParticipant; occurredAt: string; location: string;
 deliveredAt: string | null; receivedAt: string | null; completedAt: string | null;
 regularization: { evidence: string; reason: string; actor: string; at: string } | null;
}
export interface CustodyIncident {
 id: string; reason: string; damage: boolean; rejection: boolean; at: string;
 custodian: CustodyParticipant; location: string; decision: 'RETURN' | 'REPLACE' | 'RESCHEDULE' | null;
 resolution: string | null; resolvedAt: string | null;
}
export interface OperationCustodyV2 {
 schemaVersion: 'OPERATION_CUSTODY_V2'; operationId: string; revision: number;
 assignment: { affiliateId: string; uid: string } | null;
 current: CustodyParticipant | null; location: string; lastTransferAt: string | null;
 pending: CustodyTransfer | null; incidents: CustodyIncident[];
 deliveryClosure: 'BLOCKED_PHYSICAL_SIGNATURES_REQUIRED' | 'DELIVERED_EMULATOR'|'DELIVERED';
}
export interface CustodyCommand { commandId: string; operationId: string; expectedRevision: number; action: string; data: Record<string, unknown> }
export class CustodyError extends Error {}
export function custodyFail(message = 'No se pudo validar la operación de custodia.'): never { throw new CustodyError(message); }
export function custodyText(value: unknown, max = 500): string {
 if (typeof value !== 'string' || !value.trim() || value.length > max || /[\x00-\x1f<>]/.test(value)) custodyFail('Completá los datos requeridos.');
 return value.trim();
}
export function participant(value: unknown): CustodyParticipant {
 const p = exact(value, ['uid', 'role', 'affiliateId']);
 const uid = custodyText(p.uid, 128);
 if (!['DRIVER', 'AFFILIATE', 'DEPOT'].includes(String(p.role))) custodyFail();
 if (p.role === 'AFFILIATE') opaque(p.affiliateId); else if (p.affiliateId !== null) custodyFail();
 return { uid, role: p.role as CustodyRole, affiliateId: p.affiliateId as string | null };
}
export function sameParticipant(a: CustodyParticipant, b: CustodyParticipant) { return a.uid === b.uid && a.role === b.role && a.affiliateId === b.affiliateId; }
export function custodyCommandInput(value: unknown): CustodyCommand {
 const c = exact(value, ['commandId', 'operationId', 'expectedRevision', 'action', 'data']); opaque(c.commandId);
 if (!/^op_[a-f0-9]{64}$/.test(String(c.operationId)) || !Number.isSafeInteger(c.expectedRevision) || Number(c.expectedRevision) < 0 || !['ASSIGN', 'AUTHORIZE_TRANSFER', 'CONFIRM_DELIVERY', 'CONFIRM_RECEIPT', 'REGULARIZE', 'CANCEL_TRANSFER', 'INCIDENT', 'DECIDE_INCIDENT'].includes(String(c.action)) || !c.data || typeof c.data !== 'object' || Array.isArray(c.data)) custodyFail();
 return c as unknown as CustodyCommand;
}
export function initialCustody(operationId: string): OperationCustodyV2 {
 return { schemaVersion: 'OPERATION_CUSTODY_V2', operationId, revision: 0, assignment: null, current: null, location: '', lastTransferAt: null, pending: null, incidents: [], deliveryClosure: 'BLOCKED_PHYSICAL_SIGNATURES_REQUIRED' };
}
export function custodyTimestamp(value: unknown, now: string) {
 const t = custodyText(value, 40);
 if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(t) || !Number.isFinite(Date.parse(t)) || new Date(t).toISOString().slice(0,19) !== t.slice(0,19) || Date.parse(t) > Date.parse(now)) custodyFail('Fecha/hora real inválida o futura.');
 return new Date(t).toISOString();
}
