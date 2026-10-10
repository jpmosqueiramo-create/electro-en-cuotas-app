import { admin } from "./firebaseAdmin";
import { NextRequest, NextResponse } from "next/server";

export const ADMIN_EMAIL = "jpmosqueiramo@gmail.com";

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
export async function verifyAdminAuth(req: NextRequest): Promise<AdminAuthResult> {
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
    const decodedToken = await admin.auth().verifyIdToken(token);
    const userEmail = (decodedToken.email || "").toLowerCase().trim();

    if (userEmail !== ADMIN_EMAIL.toLowerCase()) {
      return {
        authorized: false,
        errorResponse: NextResponse.json(
          { error: `Acceso denegado: Se requieren permisos del Administrador Único (${ADMIN_EMAIL})` },
          { status: 403 }
        )
      };
    }

    return {
      authorized: true,
      email: userEmail,
      uid: decodedToken.uid
    };
  } catch (error: any) {
    console.error("Error en verifyAdminAuth:", error);
    return {
      authorized: false,
      errorResponse: NextResponse.json(
        { error: "Token de autenticación expirado o inválido: " + (error.message || "") },
        { status: 401 }
      )
    };
  }
}

export async function validarAdminToken(req: Request): Promise<{ valid: boolean; adminUid?: string; uid?: string; email?: string }> {
  const res = await verifyAdminAuth(req as any);
  return { valid: res.authorized, adminUid: res.uid, uid: res.uid, email: res.email };
}
