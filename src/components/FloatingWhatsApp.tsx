"use client";

import { usePathname } from "next/navigation";
import { useState } from "react";
import { MessageCircle } from "lucide-react";

const PHONE_NUMBER = "5491125659686";

function getContextualMessage(pathname: string): string {
  if (pathname === "/servicio-de-compra") {
    return `Hola, quiero consultar por el Servicio de Compra de Cuenta Hogar.\n\nNecesito comprar un producto y quisiera conocer cómo funciona la gestión mediante mandato, el plan de cuotas y la entrega en mi localidad.\n\n📍 Localidad:\n🛒 Producto que necesito:\n🔗 Si ya vi alguno, puedo enviarles el modelo, link o presupuesto.\n\n¿Me cuentan cómo sería la propuesta y el plan de cuotas?`;
  }

  if (pathname === "/envios") {
    return `Hola, quiero conocer el servicio de Envíos Low Cost de Cuenta Hogar que estará disponible desde el 25 de noviembre.\n\nSuelo comprar productos en CABA y me interesa saber cómo podría recibirlos en mi localidad.\n\n📍 Mi localidad es:\n\n¿Me cuentan cómo funciona el servicio?`;
  }

  if (pathname === "/red-afiliados") {
    return `Hola, estuve viendo la Red de Afiliados de Cuenta Hogar y quisiera hacer una consulta.\n\n¿Me pueden orientar?`;
  }

  if (pathname === "/nosotros") {
    return `Hola, estuve conociendo Cuenta Hogar a través de la web y quisiera hacer una consulta.\n\n📍 Mi localidad es:\n\n¿Me pueden orientar?`;
  }

  if (pathname === "/terms" || pathname === "/privacy" || pathname === "/arrepentimiento") {
    return `Hola, estoy en la web de Cuenta Hogar y quisiera hacer una consulta.`;
  }

  // Home ("/") y fallback general
  return `Hola, estuve viendo la web de Cuenta Hogar y quiero hacer una consulta.\n\n📍 Mi localidad es:\n\n¿Me pueden orientar sobre qué servicio se adapta mejor a lo que necesito?`;
}

export default function FloatingWhatsApp() {
  const pathname = usePathname();
  const [isHovered, setIsHovered] = useState(false);

  // Ocultar en páginas de admin/panel interno si aplica
  if (pathname.startsWith("/admin") || pathname.startsWith("/afiliado") || pathname.startsWith("/cliente")) {
    return null;
  }

  const message = getContextualMessage(pathname);
  const waUrl = `https://wa.me/${PHONE_NUMBER}?text=${encodeURIComponent(message)}`;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 pointer-events-auto pb-[env(safe-area-inset-bottom)]">
      {/* Tooltip en desktop */}
      <div 
        className={`hidden md:block bg-[#161922] text-white border border-[#2A2E3D] text-xs font-semibold px-3 py-1.5 rounded-xl shadow-xl transition-all duration-200 ${
          isHovered ? "opacity-100 translate-x-0" : "opacity-0 translate-x-2 pointer-events-none"
        }`}
      >
        ¿Tenés una consulta?
      </div>

      {/* Botón flotante verde WhatsApp */}
      <a
        href={waUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Consultar por WhatsApp"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="w-14 h-14 bg-[#25D366] hover:bg-[#20BA5C] text-white rounded-full flex items-center justify-center shadow-2xl hover:scale-105 active:scale-95 transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-[#25D366]/40"
      >
        <MessageCircle className="w-7 h-7 fill-white text-[#25D366]" />
      </a>
    </div>
  );
}
