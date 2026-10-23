/** Pure policy; never enables any existing Emulator-only business command. */
export const LAB_WATERMARK = 'DOCUMENTO DE PRUEBA — SIN VALIDEZ CONTRACTUAL O FISCAL';
export const LAB_SCHEMA = 'OPERATIONS_LAB_SESSION_V1';
export class LabError extends Error {
  constructor(public readonly status: number, public readonly code: string) { super(code); }
}
export function requireLabAccess(uid: string, env: Record<string, string | undefined>) {
  if (env.OPERATIONS_LAB_ENABLED !== 'true') throw new LabError(403, 'LAB_DISABLED');
  let ids: unknown;
  try { ids = JSON.parse(env.OPERATIONS_LAB_ADMIN_UIDS || ''); } catch { throw new LabError(403, 'LAB_ACCESS_DENIED'); }
  if (!Array.isArray(ids) || !ids.length || ids.some(id => typeof id !== 'string' || !id || id.length > 128) || !ids.includes(uid)) {
    throw new LabError(403, 'LAB_ACCESS_DENIED');
  }
}
export function labCommand(value: unknown): { commandId: string } {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).join() !== 'commandId') throw new LabError(400, 'LAB_COMMAND_INVALID');
  const id = (value as {commandId?: unknown}).commandId;
  if (typeof id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(id)) throw new LabError(400, 'LAB_COMMAND_INVALID');
  return { commandId: id };
}
