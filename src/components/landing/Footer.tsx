"use client";
export default function Footer() {
  return (
    <footer className="bg-[#001F3F] border-t border-white/5 py-16 text-white/50">
      <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-8">
        <div className="flex flex-col items-center md:items-start">
          <div className="flex items-center gap-2 mb-4 opacity-70">
            <div className="bg-white text-[#002B5B] font-black px-1.5 py-0.5 rounded text-sm">CH</div>
            <span className="text-lg font-bold tracking-tight text-white">
              CUENTA <span className="text-accent-gold">HOGAR</span>
            </span>
          </div>
          <p className="text-sm">© {new Date().getFullYear()} Cuenta Hogar SRL. Todos los derechos reservados.</p>
        </div>
        
        <div className="flex gap-8 text-sm">
          <a href="#" className="hover:text-white transition-colors">Términos y Condiciones</a>
          <a href="#" className="hover:text-white transition-colors">Privacidad</a>
          <a href="#" className="hover:text-white transition-colors">Contacto</a>
        </div>
      </div>
    </footer>
  );
}
