/** Public entry points verified against backend cuenta-hogar; never derived from request headers. */
export const PUBLIC_SOLICITUDES_ORIGINS = Object.freeze([
  'https://www.cuentahogar.com.ar',
  'https://cuenta-hogar--negocio-facil-page.us-central1.hosted.app',
]);

export function isPublicSolicitudOriginAllowed(origin: string | null, mode = process.env.NODE_ENV): boolean {
  // Preserve non-browser clients. Origin is a browser defense, not authentication:
  // an HTTP client can omit/spoof it and remains subject to validation and quotas.
  if (origin === null) return true;
  if (PUBLIC_SOLICITUDES_ORIGINS.includes(origin)) return true;
  // Local Next dev only; no local origins are admitted by a production build.
  return mode === 'development' && ['http://localhost:3000', 'http://127.0.0.1:3000'].includes(origin);
}
