import { Check, Clock3, ExternalLink, Minus } from "lucide-react";
import { DOCUMENT_AVAILABILITY_LABELS, type AdminDocumentacionDocument } from "@/lib/adminDocumentacionReadModel";

export function DocumentAvailabilityList({ documentos }: { documentos: AdminDocumentacionDocument[] }) {
  return <ul className="divide-y divide-border-color">
    {documentos.map(doc => {
      const Icon = doc.availability === "AVAILABLE" ? Check : doc.availability === "PENDING_SEND" ? Clock3 : Minus;
      return <li key={doc.key} data-document-kind={doc.kind} data-availability={doc.availability} className="flex min-w-0 items-center gap-3 py-3 first:pt-0 last:pb-0">
        <Icon aria-hidden="true" className="size-4 shrink-0 text-text-secondary" />
        <div className="min-w-0 flex-1"><p className="break-words text-sm font-semibold">{doc.label}</p><p className="mt-0.5 text-xs text-text-secondary">{DOCUMENT_AVAILABILITY_LABELS[doc.availability]}</p></div>
        {doc.availability === "AVAILABLE" && doc.url && <a href={doc.url} target="_blank" rel="noopener noreferrer" aria-label={`Abrir ${doc.label} en una nueva pestaña`} className="admin-control inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-xl border border-border-color px-3 text-sm font-semibold text-brand-primary hover:bg-background-main">Abrir<ExternalLink aria-hidden="true" className="size-3.5" /></a>}
      </li>;
    })}
  </ul>;
}
