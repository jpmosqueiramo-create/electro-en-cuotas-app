import { NextRequest, NextResponse } from "next/server";
import { admin } from './firebaseAdmin';

export interface ClientAuthResult {
  authorized: boolean;
  clienteId?: string;
  dni?: string;
  email?: string;
  errorResponse?: NextResponse;
}

/**
 * Autenticación y Verificación de Titularidad (Ownership) para Endpoints del Cliente.
 * No confía en clienteId, dni ni solicitudId enviados por el navegador sin autenticación.
 */
export async function verifyClientAuth(req: NextRequest, solicitudId: string): Promise<ClientAuthResult> {
  if (!solicitudId || !solicitudId.trim()) {
    return {
      authorized: false,
      errorResponse: NextResponse.json({ error: '400:SOLICITUD_REQUERIDA: Se requiere especificar solicitudId.' }, { status: 400 })
    };
  }

  const authHeader = req.headers.get('authorization');
  const proposalTokenHeader = req.headers.get('x-proposal-token') || req.headers.get('x-client-token');

  const db = admin.firestore();
  const solRef = db.collection('solicitudes').doc(solicitudId);
  let solSnap = await solRef.get();
  
  if (!solSnap.exists) {
    const propRef = db.collection('propuestas').doc(solicitudId);
    solSnap = await propRef.get();
  }

  if (!solSnap.exists) {
    return {
      authorized: false,
      errorResponse: NextResponse.json({ error: '404:SOLICITUD_NO_ENCONTRADA: La solicitud especificada no existe.' }, { status: 404 })
    };
  }

  const solData = solSnap.data() || {};
  const ownerDni = (solData.clienteId || solData.dni || solData.datosPersonales?.dni || solData.numeroDni || '').toString().replace(/\\D/g, '');
  const ownerEmail = (solData.email || solData.clienteEmail || solData.datosPersonales?.email || '').toLowerCase().trim();

  // 1. Verificación por ID Token de Firebase Auth (si está autenticado como usuario)
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const idToken = authHeader.split('Bearer ')[1];
      const decoded = await admin.auth().verifyIdToken(idToken);
      const decodedEmail = (decoded.email || '').toLowerCase().trim();
      const decodedUid = decoded.uid;

      // Ownership match: email o uid coincide con los datos del titular de la solicitud
      if (
        (decodedEmail && ownerEmail && decodedEmail === ownerEmail) ||
        (decodedUid && solData.clienteId && decodedUid === solData.clienteId) ||
        (decodedUid && ownerDni && decodedUid === ownerDni)
      ) {
        return {
          authorized: true,
          clienteId: solData.clienteId || ownerDni,
          dni: ownerDni,
          email: decodedEmail
        };
      }
    } catch (err) {
      console.warn('Aviso: Token Bearer de cliente inválido o expirado');
    }
  }



  return {
    authorized: false,
    errorResponse: NextResponse.json(
      { error: '403:CLIENTE_NO_AUTORIZADO_OPERACION: Acceso denegado. No posee permisos de titularidad sobre esta operación.' },
      { status: 403 }
    )
  };
}
