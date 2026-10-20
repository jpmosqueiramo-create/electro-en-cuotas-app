/** Public identity is configuration, never a credential or an authorization claim. */
export const ADMIN_EMAIL = (process.env.NEXT_PUBLIC_ADMIN_EMAIL || "").trim().toLowerCase();

export function isAdminEmail(email: string | null | undefined): boolean {
  return Boolean(ADMIN_EMAIL && email && email.trim().toLowerCase() === ADMIN_EMAIL);
}
