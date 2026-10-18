import { PageHeader } from "@/components/PageHeader";

// Adaptador incremental: los imports existentes conservan su encabezado local.
// La navegación global y la sesión pertenecen exclusivamente a AdminAppShell.
export function AdminNav({ title, subtitle }: { title?: string; subtitle?: string }) {
  return <PageHeader title={title || "Operación diaria"} subtitle={subtitle} />;
}
