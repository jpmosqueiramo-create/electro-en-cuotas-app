/** Etiquetas de presentación; el estado original sigue siendo la identidad del filtro. */
export function presentAdminSolicitudStatus(estado: string | null): string {
  switch (estado) {
    case "REQUIERE_INFO": return "Requiere información";
    case "PENDIENTE": return "Pendiente";
    case "PENDIENTE_FIRMA": return "Pendiente de autorización";
    case "APROBADO": return "Aprobado";
    case "RECHAZADO": return "Rechazado";
    default: return estado ?? "Sin estado registrado";
  }
}
