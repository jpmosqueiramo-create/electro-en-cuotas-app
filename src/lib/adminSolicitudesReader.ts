import { collection, doc, getDoc, getDocs, type Firestore } from "firebase/firestore";
import { ADMIN_SOLICITUD_SOURCES, isAdminSolicitudSource, mapSolicitudCuentaToAdminReadModel, mapSolicitudToAdminReadModel, type AdminSolicitudListItem, type AdminSolicitudSource } from "./adminSolicitudesReadModel";

export type AdminSolicitudesLoadResult = {
  items: AdminSolicitudListItem[];
  errors: Partial<Record<AdminSolicitudSource, string>>;
  loadedSources: AdminSolicitudSource[];
};
const mapper = (source: AdminSolicitudSource) => source === "solicitudes" ? mapSolicitudToAdminReadModel : mapSolicitudCuentaToAdminReadModel;
async function databaseOrDefault(database?: Firestore) { return database ?? (await import("./firebase")).db; }

/** Sólo getDocs. Cada fuente falla independientemente; nunca migra ni siembra. */
export async function loadAdminSolicitudes(database?: Firestore): Promise<AdminSolicitudesLoadResult> {
  const db = await databaseOrDefault(database);
  return readAdminSolicitudesSources(async source => {
    const snapshot = await getDocs(collection(db, source));
    return snapshot.docs.map(document => mapper(source)(document.id, document.data()));
  });
}
/** Composición por fuente: permite comprobar fallos parciales sin simular persistencia. */
export async function readAdminSolicitudesSources(readSource: (source: AdminSolicitudSource) => Promise<AdminSolicitudListItem[]>): Promise<AdminSolicitudesLoadResult> {
  const results = await Promise.allSettled(ADMIN_SOLICITUD_SOURCES.map(source => Promise.resolve().then(() => readSource(source))));
  const result: AdminSolicitudesLoadResult = { items: [], errors: {}, loadedSources: [] };
  results.forEach((entry, index) => {
    const source = ADMIN_SOLICITUD_SOURCES[index];
    if (entry.status === "fulfilled") { result.items.push(...entry.value); result.loadedSources.push(source); }
    else {
      // Sólo código por fuente: no volcar documentos, mensajes del servidor ni datos personales.
      const code = entry.reason && typeof entry.reason.code === "string" ? entry.reason.code : "unknown";
      result.errors[source] = code;
      console.error(`[AdminSolicitudes] ${source}: ${code}`);
    }
  });
  return result;
}
/** Una identidad exacta. No hay búsqueda ni fallback a otra colección. */
export async function loadAdminSolicitudBySourceAndId(source: string, id: string, database?: Firestore): Promise<AdminSolicitudListItem | null> {
  if (!isAdminSolicitudSource(source) || !id || id.includes("/")) throw new Error("INVALID_SOLICITUD_IDENTITY");
  const db = await databaseOrDefault(database);
  const snapshot = await getDoc(doc(db, source, id));
  return snapshot.exists() ? mapper(source)(snapshot.id, snapshot.data()) : null;
}
