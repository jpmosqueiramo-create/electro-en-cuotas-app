import { admin } from "./firebaseAdmin";

export interface ValidacionSerieResult {
  duplicada: boolean;
  detalle?: string;
}

/**
 * Normaliza un número de Serie/IMEI para comparaciones estrictas.
 */
export function normalizarSerie(numSerie: string | null | undefined): string {
  if (!numSerie) return "";
  return numSerie.toString().trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

/**
 * Verifica si un número de Serie/IMEI ya está asignado o vinculado a otra unidad
 * del catálogo o a otra operación activa distinta de currentSolicitudId.
 */
export async function checkSerieDuplicada(
  db: admin.firestore.Firestore,
  numSerieRaw: string,
  currentSolicitudId: string,
  currentUnitId?: string
): Promise<ValidacionSerieResult> {
  const numSerieClean = normalizarSerie(numSerieRaw);
  if (!numSerieClean) {
    return { duplicada: false };
  }

  // 1. Buscar coincidencia en productos (stock físico)
  const prodsSnap = await db.collection("productos").get();
  for (const doc of prodsSnap.docs) {
    const prodData = doc.data();
    const stock: any[] = prodData.stock || [];
    for (const unit of stock) {
      const unitSerieClean = normalizarSerie(unit.nserie || unit.imei || unit.numeroSerie);
      if (unitSerieClean === numSerieClean) {
        // Excluir la propia unidad actual si está asignada a la misma solicitud
        const esMismaUnidadySolicitud = unit.id === currentUnitId && unit.asignadoA === currentSolicitudId;
        if (!esMismaUnidadySolicitud && unit.asignadoA && unit.asignadoA !== currentSolicitudId) {
          return {
            duplicada: true,
            detalle: `La Serie/IMEI "${numSerieRaw}" ya se encuentra asignada a la unidad "${unit.id}" del producto "${prodData.nombre || doc.id}" para la operación "${unit.asignadoA}".`
          };
        }
      }
    }
  }

  // 2. Buscar coincidencia en solicitudes activas
  const cols = ["solicitudes", "solicitudes_cuenta"];
  for (const colName of cols) {
    const snap = await db.collection(colName).get();
    for (const doc of snap.docs) {
      if (doc.id === currentSolicitudId) continue;
      const data = doc.data();
      const solSerieClean = normalizarSerie(data.numeroSerie || data.datosPersonales?.numeroSerie);
      if (solSerieClean === numSerieClean) {
        const estadoAdq = data.estadoAdquisicionStock || data.estado || "";
        if (estadoAdq !== "CANCELADO" && estadoAdq !== "LIBERADO") {
          return {
            duplicada: true,
            detalle: `La Serie/IMEI "${numSerieRaw}" ya está vinculada a la operación activa "${doc.id}" (${data.datosPersonales?.nombreCompleto || 'Sin nombre'}).`
          };
        }
      }
    }
  }

  return { duplicada: false };
}