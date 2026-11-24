'use client';
import { useState, type ReactNode } from 'react';
import type { DocumentType } from '@/lib/budgetAcceptanceV2';

/** Collapsing keeps its children mounted, including unsaved review fields. */
export function DocumentSlot({ type, title, status, count, folderReference, compact, initiallyOpen, children }: {
  type: DocumentType; title: string; status: string; count: number; folderReference: boolean; compact: boolean; initiallyOpen: boolean; children: ReactNode;
}) {
  const [open, setOpen] = useState(initiallyOpen);
  const heading = <><span className="min-w-0 flex-1"><span className="block font-semibold">{title}{type === 'PAYSLIP' && <span className="ml-2 text-xs font-normal text-text-secondary">Opcional</span>}</span><span data-slot-status className="mt-1 block text-sm font-normal text-text-secondary">{status}</span></span><span className="shrink-0 text-xs text-text-secondary">{folderReference ? 'Carpeta del cliente' : `${count} ${count === 1 ? 'archivo' : 'archivos'}`}</span></>;
  return compact ? <details data-document-type={type} open={open} onToggle={event => setOpen(event.currentTarget.open)} className="min-w-0 rounded-xl border border-border-color bg-surface">
    <summary className="admin-control flex min-h-14 cursor-pointer items-center gap-3 rounded-xl px-4 py-3"><span aria-hidden="true" className="text-text-secondary">{open ? '−' : '+'}</span>{heading}<span className="sr-only">{open ? 'Ocultar' : 'Cargar o revisar'}</span></summary>
    <div className="space-y-3 border-t border-border-color p-4">{children}</div>
  </details> : <article data-document-type={type} className="min-w-0 space-y-3 rounded-xl border border-border-color p-4"><div className="flex flex-wrap items-center gap-3">{heading}</div>{children}</article>;
}
