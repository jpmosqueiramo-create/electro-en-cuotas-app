"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { ADMIN_DESTINATIONS, activeAdminDestination } from "./navigation";

export function AdminHorizontalNav({ pathname }: { pathname: string }) {
  const [search, setSearch] = useState("");
  const searchInput = useRef<HTMLInputElement>(null);
  const menu = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 768px)");
    const updateMenu = () => {
      if (menu.current) menu.current.open = desktop.matches;
    };
    updateMenu();
    desktop.addEventListener("change", updateMenu);
    return () => desktop.removeEventListener("change", updateMenu);
  }, []);

  const active = activeAdminDestination(pathname);
  const items = ADMIN_DESTINATIONS.filter(item => item.id !== "laboratory");
  const activeLabel = items.find(item => item.id === active)?.label ?? "Administración";
  const normalizedSearch = search.trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const visibleItems = items.filter(item =>
    item.label.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().includes(normalizedSearch)
  );

  const links = visibleItems.map(({ id, label, href, icon: Icon }) => (
    <Link
      key={id}
      href={href}
      aria-current={active === id ? "page" : undefined}
      onClick={() => {
        setSearch("");
        if (menu.current && window.matchMedia("(max-width: 767px)").matches) {
          menu.current.open = false;
        }
      }}
      className={`admin-control inline-flex min-h-11 min-w-0 items-center gap-2 rounded-xl px-3 py-2 font-heading text-sm font-semibold ${active === id ? "bg-brand-primary text-white" : "text-text-primary hover:bg-background-main"}`}
    >
      <Icon aria-hidden="true" className={`size-4 shrink-0 ${active === id ? "text-white" : "text-brand-secondary"}`} />
      <span>{label}</span>
    </Link>
  ));

  const sectionSearch = (
    <div className="space-y-2">
      <label className="block text-sm font-semibold text-text-primary" htmlFor="admin-section-search">Buscar sección</label>
      <div className="flex min-h-11 items-center gap-2 rounded-xl border border-text-secondary bg-surface px-3 focus-within:ring-2 focus-within:ring-brand-primary">
        <Search aria-hidden="true" className="size-4 shrink-0 text-text-secondary" />
        <input
          ref={searchInput}
          id="admin-section-search"
          type="search"
          value={search}
          onChange={event => setSearch(event.target.value)}
          onKeyDown={event => {
            if (event.key === "Escape") setSearch("");
          }}
          placeholder="Solicitudes, clientes, cobranzas…"
          className="min-h-11 min-w-0 flex-1 bg-transparent text-base text-text-primary outline-none placeholder:text-text-secondary"
          aria-controls="admin-section-results"
        />
        {search && (
          <button type="button" aria-label="Limpiar búsqueda de secciones" className="admin-control flex min-h-11 min-w-11 items-center justify-center rounded-lg"
            onClick={() => { setSearch(""); searchInput.current?.focus(); }}>
            <X aria-hidden="true" className="size-4" />
          </button>
        )}
      </div>
    </div>
  );

  return (
    <nav aria-label="Secciones de administración" className="min-w-0 rounded-2xl border border-border-color bg-surface p-3 shadow-xs">
      <details ref={menu} className="group" open>
        <summary className="admin-control flex min-h-11 cursor-pointer items-center rounded-xl px-3 py-2 font-semibold text-brand-primary">
          Menú · {activeLabel}
        </summary>
        <div className="space-y-3 border-t border-border-color pt-3">
          {sectionSearch}
          <div id="admin-section-results" className="grid min-w-0 grid-cols-1 gap-1 sm:grid-cols-2 md:flex md:flex-wrap">
            {links}
          </div>
          {normalizedSearch && (
            <p role="status" className="px-3 text-sm text-text-secondary">
              {visibleItems.length ? `${visibleItems.length} secciones encontradas.` : "No encontramos una sección con ese nombre. Probá con otra palabra."}
            </p>
          )}
        </div>
      </details>
    </nav>
  );
}
