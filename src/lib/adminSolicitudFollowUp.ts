/** Internal case management. Operational/financial states remain owned by their modules. */
export const followUpLabels = { OPEN: 'Sin revisar', REVIEWING: 'En revisión', WAITING: 'Esperando respuesta', CLOSED: 'Seguimiento cerrado' } as const;
export type FollowUpState = keyof typeof followUpLabels;
export const followUpTransitions: Record<FollowUpState, readonly FollowUpState[]> = {
  OPEN: ['REVIEWING', 'WAITING', 'CLOSED'], REVIEWING: ['WAITING', 'CLOSED'], WAITING: ['REVIEWING', 'CLOSED'], CLOSED: ['REVIEWING'],
};
export type FollowUpCommand = {
  commandId: string; expectedRevision: number; action: 'ADD_NOTE' | 'CHANGE_STATE';
  note: string; toState: FollowUpState | null;
};
export type FollowUpEvent = {
  id: string; revision: number; action: FollowUpCommand['action'];
  fromState: FollowUpState; toState: FollowUpState; note: string; at: string;
  actor: { uid: string; email: string };
};
export type FollowUpPage = {
  state: FollowUpState; revision: number; events: FollowUpEvent[]; nextBefore: number | null;
};
export type FollowUpSummary = { state: FollowUpState; revision: number; updatedAt: string | null };
export class FollowUpError extends Error {
  constructor(public code: 'INVALID' | 'CONFLICT' | 'NOT_FOUND' | 'INACTIVE' | 'CORRUPT', message: string) { super(message); }
}
export function isFollowUpState(value: unknown): value is FollowUpState {
  return typeof value === 'string' && Object.hasOwn(followUpLabels, value);
}
export function parseFollowUpCommand(input: unknown): FollowUpCommand {
  const c = input as FollowUpCommand;
  if (!c || typeof c !== 'object' || Array.isArray(c) || Object.keys(c).sort().join(',') !== 'action,commandId,expectedRevision,note,toState' ||
      typeof c.commandId !== 'string' || !/^[A-Za-z0-9_-]{16,128}$/.test(c.commandId) ||
      !Number.isSafeInteger(c.expectedRevision) || c.expectedRevision < 0 || c.expectedRevision >= Number.MAX_SAFE_INTEGER ||
      !['ADD_NOTE', 'CHANGE_STATE'].includes(c.action) || typeof c.note !== 'string' || !c.note.trim() || c.note.length > 2000 ||
      /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(c.note) ||
      (c.action === 'ADD_NOTE' ? c.toState !== null : !isFollowUpState(c.toState))) {
    throw new FollowUpError('INVALID', 'Registrá una nota o motivo de hasta 2000 caracteres y una acción válida.');
  }
  return { commandId: c.commandId, expectedRevision: c.expectedRevision, action: c.action, note: c.note.trim(), toState: c.toState };
}
export function nextFollowUpState(state: FollowUpState, command: FollowUpCommand): FollowUpState {
  if (command.action === 'ADD_NOTE') return state;
  if (!command.toState || !followUpTransitions[state].includes(command.toState)) {
    throw new FollowUpError('CONFLICT', 'Ese cambio de seguimiento no corresponde al estado actual. Actualizá el historial.');
  }
  return command.toState;
}
export function formatFollowUpDate(value: string): string {
  return new Intl.DateTimeFormat('es-AR', { dateStyle: 'medium', timeStyle: 'short', hourCycle: 'h23', timeZone: 'America/Argentina/Buenos_Aires' }).format(new Date(value));
}
