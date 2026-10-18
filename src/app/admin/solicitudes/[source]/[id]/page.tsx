import { notFound } from "next/navigation";
import { AdminSolicitudDetail } from "@/components/admin/solicitudes/AdminSolicitudDetail";
import { adminSolicitudesContext, isAdminSolicitudSource, parseAdminSolicitudFilters } from "@/lib/adminSolicitudesReadModel";

export default async function AdminSolicitudPage({ params, searchParams }: {
  params: Promise<{ source: string; id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { source, id } = await params;
  if (!isAdminSolicitudSource(source) || !id || id.includes("/")) notFound();
  const context = adminSolicitudesContext(parseAdminSolicitudFilters(await searchParams));
  return <AdminSolicitudDetail key={`${source}:${id}`} source={source} id={id} context={context} />;
}
