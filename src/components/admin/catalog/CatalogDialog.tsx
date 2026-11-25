"use client";
import { useEffect, useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";

const openDialogs = new Set<HTMLDialogElement>();
let originalOverflow = '';
let rootOpener: HTMLElement | null = null;
function focusIfAvailable(element: Element | null) {
  if (!(element instanceof HTMLElement) || element === document.body || !element.isConnected || element.matches(':disabled') || element.closest('dialog:not([open])')) return false;
  element.focus({ preventScroll: true });
  return document.activeElement === element;
}

export function CatalogDialog({ title, children, onClose, footer, wide = false, closeDisabled = false, testId }: {
  title: string; children: ReactNode; onClose: () => void; footer?: ReactNode;
  wide?: boolean; closeDisabled?: boolean; testId?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null), titleId = useId();
  useEffect(() => {
    const previous = document.activeElement, dialog = ref.current!;
    if (!openDialogs.size) { originalOverflow = document.body.style.overflow; rootOpener = previous instanceof HTMLElement ? previous : null; }
    openDialogs.add(dialog);
    document.body.style.overflow = "hidden";
    dialog.showModal();
    dialog.querySelector<HTMLElement>('input:not(:disabled),textarea:not(:disabled),select:not(:disabled)')?.focus({ preventScroll: true });
    return () => {
      dialog.close(); openDialogs.delete(dialog);
      if (!openDialogs.size) {
        document.body.style.overflow = originalOverflow;
        focusIfAvailable(rootOpener); rootOpener = null;
      } else if (!dialog.contains(previous) && !focusIfAvailable(previous)) {
        // Async actions can disable their opener before the next dialog mounts.
        const parent = Array.from(openDialogs).at(-1);
        focusIfAvailable(parent?.querySelector('input:not(:disabled),textarea:not(:disabled),select:not(:disabled),button:not(:disabled)') ?? null);
      }
    };
  }, []);
  if (typeof document === 'undefined') return null;
  return createPortal(<dialog ref={ref} aria-labelledby={titleId} data-testid={testId} onCancel={e => { e.preventDefault(); if (!closeDisabled) onClose(); }} onKeyDown={e => {
    if (e.key !== 'Tab' || Array.from(openDialogs).at(-1) !== e.currentTarget) return;
    const controls = Array.from(e.currentTarget.querySelectorAll<HTMLElement>('a[href],button,input,textarea,select,[tabindex]')).filter(element => element.tabIndex >= 0 && !element.matches(':disabled') && element.getClientRects().length > 0);
    const first = controls[0], last = controls.at(-1);
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
  }} className={`fixed inset-0 m-auto max-h-[92dvh] w-[calc(100%_-_1.5rem)] ${wide ? 'max-w-3xl' : 'max-w-2xl'} overflow-hidden rounded-2xl border border-border-color bg-surface p-0 text-text-primary shadow-2xl backdrop:bg-brand-primary/40 backdrop:backdrop-blur-sm`}>
    <div className="flex max-h-[92dvh] min-w-0 flex-col">
      <header className="flex shrink-0 items-start justify-between gap-3 border-b border-border-color bg-surface p-4 sm:px-6"><h2 id={titleId} className="break-words font-heading text-xl font-bold text-brand-primary">{title}</h2><button type="button" disabled={closeDisabled} className="admin-control min-h-11 shrink-0 rounded-lg border border-border-color px-3 text-sm disabled:opacity-50" onClick={onClose}>Cerrar</button></header>
      <div className="min-h-0 overflow-y-auto p-4 sm:p-6" data-testid="catalog-dialog-content">{children}</div>
      {footer && <footer className="shrink-0 border-t border-border-color bg-surface p-3 sm:px-6 sm:py-4">{footer}</footer>}
    </div>
  </dialog>, document.body);
}

export function ConfirmDialog({ title, message, onConfirm, onClose, busy }: {
  title: string; message: string; onConfirm: () => void; onClose: () => void; busy: boolean;
}) {
  return <CatalogDialog title={title} onClose={onClose} closeDisabled={busy}>
    <p className="text-text-secondary">{message}</p>
    <div className="mt-5 flex flex-wrap justify-end gap-3"><button type="button" disabled={busy} onClick={onClose} className="min-h-11 rounded-xl border border-border-color px-4">Cancelar</button>
      <button type="button" disabled={busy} onClick={onConfirm} className="min-h-11 rounded-xl bg-brand-primary px-4 text-white disabled:opacity-50">{busy ? "Procesando…" : title}</button></div>
  </CatalogDialog>;
}
