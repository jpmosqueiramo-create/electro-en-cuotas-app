import { NextRequest, NextResponse } from "next/server";
import { admin } from "./firebaseAdmin";

export interface ClientAuthResult {
  authorized: boolean;
  clienteId?: string;
  dni?: string;
  email?: string;
  errorResponse?: NextResponse;
}

/**
 * Autenticación y Verificación Canónica de Titularidad (Ownership) por UID para Endpoints Financieros del Cliente.
 * Exige sesión real de Firebase Auth (Bearer Token) y coincidencia explícita solicitud.clienteAuthUid === decodedToken.uid.
 * Los tokens de propuesta (tokens_propuesta) NO autorizan el acceso a funciones ni estados financieros.
 */
export async function verifyClientAuth(req: NextRequest, solicitudId: string): Promise<ClientAuthResult> {
  if (!solicitudId || !solicitudId.trim()) {
    return {
      authorized: false,
      errorResponse: NextResponse.json(
        { error: "400:SOLICITUD_REQUERIDA: Se requiere especificar solicitudId." },
        { status: 400 }
      )
    };
  }

  const authHeader = req.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return {
      authorized: false,
      errorResponse: NextResponse.json(
        { error: "403:CLIENTE_NO_AUTORIZADO_OPERACION: Se requiere autenticación de sesión de cliente activa para acceder a funciones financieras." },
        { status: 403 }
      )
    };
  }

  const idToken = authHeader.split("Bearer ")[1]?.trim();
  if (!idToken) {
    return {
      authorized: false,
      errorResponse: NextResponse.json(
        { error: "403:CLIENTE_NO_AUTORIZADO_OPERACION: Token de autenticación de cliente ausente." },
        { status: 403 }
      )
    };
  }

  let decoded;
  try {
    decoded = await admin.auth().verifyIdToken(idToken);
  } catch {
    return {
      authorized: false,
      errorResponse: NextResponse.json(
        { error: "403:CLIENTE_NO_AUTORIZADO_OPERACION: Sesión de cliente inválida o expirada." },
        { status: 403 }
      )
    };
  }

  const db = admin.firestore();
  const solRef = db.collection("solicitudes").doc(solicitudId);
  let solSnap = await solRef.get();
  
  if (!solSnap.exists) {
    const propRef = db.collection("propuestas").doc(solicitudId);
    solSnap = await propRef.get();
  }

  if (!solSnap.exists) {
    return {
      authorized: false,
      errorResponse: NextResponse.json(
        { error: "404:SOLICITUD_NO_ENCONTRADA: La solicitud especificada no existe." },
        { status: 404 }
      )
    };
  }

  const solData = solSnap.data() || {};
  const decodedUid = decoded.uid;
  const decodedEmail = (decoded.email || "").toLowerCase().trim();

  // Relación primaria y obligatoria por clienteAuthUid
  const ownerAuthUid = (solData.clienteAuthUid || "").toString().trim();
  const ownerDni = (solData.dni || solData.datosPersonales?.dni || solData.numeroDni || "").toString().replace(/\D/g, "");

  if (!ownerAuthUid) {
    return {
      authorized: false,
      errorResponse: NextResponse.json(
        { error: "403:CLIENTE_CUENTA_NO_VINCULADA: La solicitud especificada aún no se encuentra vinculada a una cuenta de usuario activa. Complete la activación de su cuenta para acceder a funciones financieras." },
        { status: 403 }
      )
    };
  }

  // Verificación Canónica por UID explícito (Sin coincidencia heurística de email/DNI)
  if (decodedUid === ownerAuthUid) {
    return {
      authorized: true,
      clienteId: ownerAuthUid,
      dni: ownerDni,
      email: decodedEmail || solData.clienteEmail || solData.email
    };
  }

  return {
    authorized: false,
    errorResponse: NextResponse.json(
      { error: "403:CLIENTE_NO_AUTORIZADO_OPERACION: Acceso denegado. No posee permisos de titularidad sobre esta operación." },
      { status: 403 }
    )
  };
}
