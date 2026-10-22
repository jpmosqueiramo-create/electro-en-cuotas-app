import { AdminDocumentacionInbox } from "@/components/admin/documentacion/AdminDocumentacionInbox";

export default function AdminDocumentacionPage() {
  return <><a className="m-4 inline-flex min-h-11 items-center rounded border px-4" href="/admin/aprobacion-documental">Aprobación documental</a><AdminDocumentacionInbox /></>;
}
