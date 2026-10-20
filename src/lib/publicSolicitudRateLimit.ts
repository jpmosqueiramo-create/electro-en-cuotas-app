import { createHmac } from "node:crypto";
import { Timestamp, type Firestore, type Transaction } from "firebase-admin/firestore";

export const CONTACT_LIMIT_POLICY = Object.freeze({ version: "CONTACT_3_PER_HOUR_V1", max: 3, windowMs: 3600000 });
export const CONTACT_LIMIT_COLLECTION = "public_solicitud_contact_limits";
export class ContactLimitExceeded extends Error {
  constructor(readonly retryAfter: number) { super("CONTACT_LIMIT_EXCEEDED"); }
}
export function contactLimitConfig(env: NodeJS.ProcessEnv = process.env) {
  const enabled = env.PUBLIC_SOLICITUDES_RATE_LIMIT_ENABLED;
  if (!enabled || enabled === "false") return null;
  if (enabled !== "true" || !/^[a-f0-9]{64}$/i.test(env.PUBLIC_SOLICITUDES_HMAC_KEY ?? "")) {
    throw Error("CONTACT_LIMIT_CONFIGURATION_INVALID");
  }
  return { key: Buffer.from(env.PUBLIC_SOLICITUDES_HMAC_KEY!, "hex") };
}
export function normalizedContact(value: string): string {
  if (!/^[+\d\s().-]+$/.test(value)) throw Error("INVALID_REQUEST");
  let digits = value.replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (!/^\d{6,15}$/.test(digits)) throw Error("INVALID_REQUEST");
  return digits;
}
export function contactLimitId(value: string, key: Buffer): string {
  return createHmac("sha256", key).update(`${CONTACT_LIMIT_POLICY.version}:contact:${normalizedContact(value)}`).digest("hex");
}
/** Called only after replay/conflict detection, before any transaction writes. */
export async function reserveContactSlot(tx: Transaction, db: Firestore, phone: string, now: number) {
  const config = contactLimitConfig();
  if (!config) return;
  const ref = db.collection(CONTACT_LIMIT_COLLECTION).doc(contactLimitId(phone, config.key));
  const snapshot = await tx.get(ref), data = snapshot.data();
  if (snapshot.exists && (data?.policy !== CONTACT_LIMIT_POLICY.version || !(data.expiresAt instanceof Timestamp) ||
      !Number.isInteger(data.count) || data.count < 1 || data.count > CONTACT_LIMIT_POLICY.max)) {
    throw Error("CONTACT_LIMIT_STATE_INVALID");
  }
  const active = !!data && data.expiresAt.toMillis() > now;
  if (active && data!.count >= CONTACT_LIMIT_POLICY.max) {
    throw new ContactLimitExceeded(Math.max(1, Math.ceil((data!.expiresAt.toMillis() - now) / 1000)));
  }
  tx.set(ref, { policy: CONTACT_LIMIT_POLICY.version, count: active ? data!.count + 1 : 1,
    expiresAt: active ? data!.expiresAt : Timestamp.fromMillis(now + CONTACT_LIMIT_POLICY.windowMs) });
}
/** Bounded, best-effort cleanup. Recheck each expiry transactionally to avoid deleting a renewed window. */
export async function cleanupExpiredContactLimits(db: Firestore, now: number) {
  if (!contactLimitConfig()) return;
  const expired = await db.collection(CONTACT_LIMIT_COLLECTION).where("expiresAt", "<=", Timestamp.fromMillis(now)).limit(10).get();
  for (const doc of expired.docs) await db.runTransaction(async tx => {
    const current = await tx.get(doc.ref), expiry = current.data()?.expiresAt;
    if (expiry instanceof Timestamp && expiry.toMillis() <= now) tx.delete(doc.ref);
  });
}
