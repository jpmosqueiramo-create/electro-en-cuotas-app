"use client";
import { useEffect, useRef, type ReactNode } from "react";

export function CatalogDialog({ title, children, onClose }: {
  title: string; children: ReactNode; onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const container = ref.current!;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    container.focus();
    const keydown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab") {
        const items = Array.from(container.querySelectorAll<HTMLElement>('button:not(:disabled),a[href],input:not(:disabled),[tabindex="0"]'));
        const first = items[0], last = items.at(-1);
        if (!first) { e.preventDefault(); container.focus(); }
        else if (e.shiftKey && (document.activeElement === first || document.activeElement === container)) { e.preventDefault(); last?.focus(); }
        else if (!e.shiftKey && (document.activeElement === last || document.activeElement === container)) { e.preventDefault(); first.focus(); }
      }
    };
    container.addEventListener("keydown", keydown);
    return () => { container.removeEventListener("keydown", keydown); document.body.style.overflow = previousOverflow; previous?.focus(); };
  }, [onClose]);
  return <div className="fixed inset-0 z-[70] flex items-center justify-center bg-brand-primary/30 p-3 backdrop-blur-sm">
    <div ref={ref} role="dialog" aria-modal="true" aria-labelledby="catalog-dialog-title" tabIndex={-1} className="max-h-[90dvh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-border-color bg-surface p-5 shadow-xl sm:p-7">
      <div className="mb-5 flex items-start justify-between gap-3"><h2 id="catalog-dialog-title" className="font-heading text-xl font-bold text-brand-primary">{title}</h2><button type="button" className="min-h-11 rounded-lg border border-border-color px-3 text-sm" onClick={onClose}>Cerrar</button></div>
      {children}
    </div>
  </div>;
}

export function ConfirmDialog({ title, message, onConfirm, onClose, busy }: {
  title: string; message: string; onConfirm: () => void; onClose: () => void; busy: boolean;
}) {
  return <CatalogDialog title={title} onClose={onClose}>
    <p className="text-text-secondary">{message}</p>
    <div className="mt-5 flex flex-wrap justify-end gap-3"><button type="button" disabled={busy} onClick={onClose} className="min-h-11 rounded-xl border border-border-color px-4">Cancelar</button>
      <button type="button" disabled={busy} onClick={onConfirm} className="min-h-11 rounded-xl bg-brand-primary px-4 text-white disabled:opacity-50">{busy ? "Procesando…" : title}</button></div>
  </CatalogDialog>;
}
