import type { AdminSolicitudListItem, AdminSolicitudSource } from './adminSolicitudesReadModel';
/** Bounded authenticated read; token stays inside the existing application session. */
export async function authenticatedSolicitudDetail(user: { getIdToken(): Promise<string> }, source: AdminSolicitudSource, id: string, signal: AbortSignal, timeoutMs = 15000): Promise<AdminSolicitudListItem | null> {
  const controller = new AbortController();
  const abort = () => controller.abort();
  signal.addEventListener('abort', abort, { once: true });
  if (signal.aborted) controller.abort();
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      (async () => {
        const token = await user.getIdToken();
        if (controller.signal.aborted) throw Error('SOLICITUD_READ_CANCELLED');
        const response = await fetch(`/api/admin/solicitudes/${source}/${encodeURIComponent(id)}`, { cache: 'no-store', signal: controller.signal, headers: { Authorization: `Bearer ${token}` } });
        if (!response.ok) throw Error('SOLICITUD_READ_FAILED');
        return (await response.json()).item as AdminSolicitudListItem | null;
      })(),
      new Promise<never>((_, reject) => { timer = setTimeout(() => { controller.abort(); reject(Error('SOLICITUD_READ_TIMEOUT')); }, timeoutMs); }),
    ]);
  } finally { clearTimeout(timer); signal.removeEventListener('abort', abort); }
}
