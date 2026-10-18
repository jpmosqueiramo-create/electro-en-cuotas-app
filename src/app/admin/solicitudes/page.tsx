import { AdminSolicitudesInbox } from "@/components/admin/solicitudes/AdminSolicitudesInbox";
import { parseAdminSolicitudFilters } from "@/lib/adminSolicitudesReadModel";

export default async function AdminSolicitudesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return <AdminSolicitudesInbox initialFilters={parseAdminSolicitudFilters(await searchParams)} />;
}
