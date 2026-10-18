import { collection, getDocs, type Firestore } from "firebase/firestore";
import { ADMIN_SOLICITUD_SOURCES, type AdminSolicitudSource } from "./adminSolicitudesReadModel";
import { mapSolicitudCuentaToDocumentacion, mapSolicitudToDocumentacion, type AdminDocumentacionItem } from "./adminDocumentacionReadModel";

export type AdminDocumentacionLoadResult = {
  items: AdminDocumentacionItem[]; loadedSources: AdminSolicitudSource[];
  errors: Partial<Record<AdminSolicitudSource, string>>;
};
/** Únicamente getDocs de las dos fuentes; no importa el módulo legacy. */
export async function loadAdminDocumentacion(database?: Firestore): Promise<AdminDocumentacionLoadResult> {
  const db = database ?? (await import("./firebase")).db;
  return readAdminDocumentacionSources(async source => {
    const snapshot = await getDocs(collection(db, source));
    const map = source === "solicitudes" ? mapSolicitudToDocumentacion : mapSolicitudCuentaToDocumentacion;
    return snapshot.docs.map(doc => map(doc.id, doc.data()));
  });
}
export async function readAdminDocumentacionSources(readSource: (source: AdminSolicitudSource) => Promise<AdminDocumentacionItem[]>): Promise<AdminDocumentacionLoadResult> {
  const results = await Promise.allSettled(ADMIN_SOLICITUD_SOURCES.map(source => Promise.resolve().then(() => readSource(source))));
  const result: AdminDocumentacionLoadResult = { items: [], loadedSources: [], errors: {} };
  results.forEach((entry, index) => {
    const source = ADMIN_SOLICITUD_SOURCES[index];
    if (entry.status === "fulfilled") { result.items.push(...entry.value); result.loadedSources.push(source); }
    else {
      const code = typeof entry.reason?.code === "string" && /^[a-z/-]+$/.test(entry.reason.code) ? entry.reason.code : "unknown";
      result.errors[source] = code;
      console.error(`[AdminDocumentacion] ${source}: ${code}`);
    }
  });
  return result;
}
