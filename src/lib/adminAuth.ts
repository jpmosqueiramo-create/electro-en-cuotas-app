import { admin } from "./firebaseAdmin";
import { NextResponse } from "next/server";

import { isAdminEmail } from "./adminIdentity";
export { ADMIN_EMAIL } from "./adminIdentity";

export interface AdminAuthResult {
  authorized: boolean;
  email?: string;
  uid?: string;
  errorResponse?: NextResponse;
}

/**
 * Helper reutilizable para autenticación y autorización del Administrador Único.
 * Valida el token Bearer y verifica estricta pertenencia a ADMIN_EMAIL.
 * Elimina permisos genéricos por claim decodedToken.admin.
 */
export async function verifyAdminAuth(req: Request): Promise<AdminAuthResult> {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return {
        authorized: false,
        errorResponse: NextResponse.json(
          { error: "No autorizado - Encabezado Authorization de tipo Bearer ausente" },
          { status: 401 }
        )
      };
    }

    const token = authHeader.split("Bearer ")[1];
    const decodedToken = await admin.auth().verifyIdToken(token, true);
    const currentUser = await admin.auth().getUser(decodedToken.uid);
    const userEmail = (decodedToken.email || "").toLowerCase().trim();

    if (currentUser.disabled || !isAdminEmail(currentUser.email) || !isAdminEmail(userEmail)) {
      return {
        authorized: false,
        errorResponse: NextResponse.json(
          { error: "Acceso denegado: Se requieren permisos de administración" },
          { status: 403 }
        )
      };
    }

    return {
      authorized: true,
      email: userEmail,
      uid: decodedToken.uid
    };
  } catch {
    return {
      authorized: false,
      errorResponse: NextResponse.json(
        { error: "Token de autenticación expirado o inválido" },
        { status: 401 }
      )
    };
  }
}

export async function validarAdminToken(req: Request): Promise<{ valid: boolean; adminUid?: string; uid?: string; email?: string }> {
  const res = await verifyAdminAuth(req);
  return { valid: res.authorized, adminUid: res.uid, uid: res.uid, email: res.email };
}
