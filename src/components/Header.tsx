"use client";

import { CuentaHogarLogo } from "@/components/CuentaHogarLogo";
import { Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef, useState } from "react";

const links = [
  ["/#modelo", "Cómo funciona"],
  ["/servicio-de-compra", "Servicio de compra"],
  ["/envios", "Envíos Low Cost"],
  ["/nosotros", "Nosotros"],
  ["/red-afiliados", "Red de afiliados"],
] as const;

export default function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const toggle = useRef<HTMLButtonElement>(null);

  const navigation = (closeMenu?: () => void) => links.map(([href, label]) => (
    <Link key={href} href={href} aria-current={pathname === href ? "page" : undefined} onClick={closeMenu}>
      {label}
    </Link>
  ));

  return (
    <header className="public-header" onKeyDown={(event) => {
      if (event.key === "Escape" && open) {
        setOpen(false);
        toggle.current?.focus();
      }
    }}>
      <div className="public-container public-nav">
        <Link href="/" onClick={() => setOpen(false)}>
          <CuentaHogarLogo className="h-12" />
        </Link>
        <nav aria-label="Navegación principal" className="public-nav-links">{navigation()}<Link href="/login-afiliado" aria-label="Ingresar al panel de vendedores afiliados">Ingresar</Link></nav>
        <div className="flex items-center gap-2">
          <Link href="/#contacto" className="public-button" onClick={() => setOpen(false)}>Consultar</Link>
          <button ref={toggle} type="button" className="public-menu-toggle" onClick={() => setOpen(!open)}
            aria-expanded={open} aria-controls="public-mobile-navigation"
            aria-label={open ? "Cerrar menú de navegación" : "Abrir menú de navegación"}>
            {open ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
          </button>
        </div>
      </div>
      <nav id="public-mobile-navigation" aria-label="Navegación móvil" hidden={!open}
        className="public-container public-mobile-nav">
        {navigation(() => setOpen(false))}
        <Link href="/cliente" onClick={() => setOpen(false)}>Portal de clientes</Link>
        <Link href="/login-afiliado" onClick={() => setOpen(false)}>Acceso de vendedores afiliados</Link>
      </nav>
    </header>
  );
}
