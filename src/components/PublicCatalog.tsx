"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, addDoc, serverTimestamp } from "firebase/firestore";
import Link from "next/link";
import { LogIn, ChevronRight, ShieldCheck, CheckCircle2, MessageSquare, Truck, PackageCheck, Send, Menu, X } from "lucide-react";

type Producto = {
  id: string;
  nombre: string;
  precioAnterior: number | null;
  cuota12: number;
  cuota8: number;
  descripcion: string;
  imagenUrl: string;
};

export default function PublicCatalog() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Quick Form State
  const [qfNombre, setQfNombre] = useState("");
  const [qfDni, setQfDni] = useState("");
  const [qfWhatsapp, setQfWhatsapp] = useState("");
  const [qfLocalidad, setQfLocalidad] = useState("");
  const [qfNecesidad, setQfNecesidad] = useState("");
  const [qfReferente, setQfReferente] = useState("");

  useEffect(() => {
    const fetchCatalog = async () => {
      try {
        const q = query(collection(db, "productos"));
        const snap = await getDocs(q);
        const prods: Producto[] = [];
        snap.forEach(doc => {
          prods.push({ id: doc.id, ...doc.data() } as Producto);
        });
        setProductos(prods.reverse());
      } catch (error) {
        console.error("Error al cargar el catálogo:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchCatalog();
  }, []);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(price);
  };

  const handleQuickFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Guardado limpio y seguro en Firestore (sin procesos IA)
    try {
      addDoc(collection(db, "solicitudes_cuenta"), {
        tipo: "contacto_rapido",
        nombre: qfNombre,
        dni: qfDni,
        whatsapp: qfWhatsapp,
        localidad: qfLocalidad,
        necesidad: qfNecesidad,
        referente: qfReferente || null,
        fecha: serverTimestamp(),
        estado: "Pendiente"
      });
    } catch (err) {
      console.error("Error al guardar solicitud:", err);
    }

    const refText = qfReferente ? ` Me recomendó: ${qfReferente}.` : "";
    const mensaje = `Hola, quiero iniciar un plan a medida. Soy ${qfNombre} (DNI: ${qfDni}) de ${qfLocalidad}. Necesito: ${qfNecesidad}. Mi número es ${qfWhatsapp}.${refText}`;
    const wame = `https://wa.me/5491125659686?text=${encodeURIComponent(mensaje)}`;
    window.location.href = wame;
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-zinc-900 font-sans selection:bg-yellow-500 selection:text-black">
      
      {/* 1. NAVBAR */}
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-xl border-b border-yellow-500/10">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <img src="https://storage.googleapis.com/negocio-facil-page.firebasestorage.app/Logos/LOGO%20SIN%20NOMBRE%20-%20CUENTA%20HOGAR.png" alt="Cuenta Hogar Logo" className="h-10 w-auto object-contain" />
            <span className="text-xl md:text-2xl font-black tracking-tight text-black">
              CUENTA <span className="text-yellow-500">HOGAR</span>
            </span>
          </Link>

          {/* Desktop Menu */}
          <div className="hidden lg:flex items-center gap-4">
            <Link href="/nosotros" className="text-sm font-bold text-gray-700 hover:text-zinc-900 transition-colors px-3 py-2">
              ¿En qué te ayudamos?
            </Link>
            <Link href="/red-afiliados" className="text-sm font-bold text-gray-700 hover:text-zinc-900 transition-colors px-3 py-2">
              Red de Afiliados
            </Link>
            <Link href="/login" className="flex items-center gap-2 text-sm font-bold bg-black text-yellow-500 px-5 py-2.5 rounded-full hover:bg-yellow-500 hover:text-black hover:-translate-y-0.5 hover:shadow-lg active:scale-95 transition-all duration-300 font-black">
              <LogIn className="w-4 h-4" />
              <span>Portal de Clientes</span>
            </Link>
          </div>

          {/* Mobile Menu Toggle */}
          <button className="lg:hidden text-yellow-500 p-2" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Dropdown */}
        {mobileMenuOpen && (
          <div className="lg:hidden absolute top-20 left-0 w-full bg-white border-b border-yellow-500/10 p-6 flex flex-col gap-4 shadow-xl">
            <Link href="/nosotros" onClick={() => setMobileMenuOpen(false)} className="text-lg font-bold text-gray-700 hover:text-zinc-900 transition-colors">
              ¿En qué te ayudamos?
            </Link>
            <Link href="/red-afiliados" onClick={() => setMobileMenuOpen(false)} className="text-lg font-bold text-gray-700 hover:text-zinc-900 transition-colors">
              Red de Afiliados
            </Link>
            <div className="pt-4 border-t border-gray-200">
              <Link href="/login" onClick={() => setMobileMenuOpen(false)} className="flex items-center justify-center gap-2 text-lg font-bold bg-black text-yellow-500 px-5 py-3 rounded-xl hover:bg-yellow-500 hover:text-black hover:shadow-lg active:scale-95 transition-all duration-300 font-black">
                <LogIn className="w-5 h-5" /> Portal de Clientes
              </Link>
            </div>
          </div>
        )}
      </nav>

      {/* 2. HERO SECTION */}
      <section className="relative overflow-hidden pt-20 pb-20">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-yellow-900/20 via-black to-black -z-10" />
        
        <div className="max-w-7xl mx-auto px-6 flex flex-col items-center text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 text-xs font-bold tracking-widest uppercase mb-8">
            <ShieldCheck className="w-4 h-4" /> Financiación Directa a Sola Firma
          </div>
          
          <h1 className="text-5xl md:text-7xl font-black tracking-tighter leading-tight mb-6">
            Lo que te haga falta,<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-yellow-600">
              te lo llevamos y financiamos.
            </span>
          </h1>
          
          <p className="text-lg md:text-xl text-gray-700 mb-10 max-w-3xl font-light leading-relaxed">
            En Cuenta Hogar gestionamos la compra de tu tecnología, te la acercamos a la puerta de tu casa y te armamos un plan de pagos a tu medida. A sola firma y con la confianza de siempre.
          </p>
          
          <a href="#contacto" className="group flex items-center gap-2 bg-yellow-500 text-black text-lg font-bold px-8 py-4 rounded-full hover:bg-yellow-400 hover:-translate-y-1 hover:shadow-xl active:scale-95 transition-all duration-300 shadow-md hover:scale-105 shadow-[0_0_30px_rgba(234,179,8,0.3)]">
            Abrí tu Cuenta de Confianza <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </a>
        </div>
      </section>

      {/* 3. CÓMO FUNCIONAMOS */}
      <section className="py-20 border-t border-gray-200 max-w-7xl mx-auto px-6">
        <h2 className="text-3xl md:text-4xl font-black text-center mb-16 text-zinc-900">¿Cómo Funcionamos?</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-white/40 p-8 rounded-3xl border border-gray-200 text-center flex flex-col items-center">
            <div className="bg-yellow-500/10 p-4 rounded-full mb-6">
              <MessageSquare className="w-8 h-8 text-yellow-500" />
            </div>
            <h3 className="text-xl font-bold mb-3 text-zinc-900">1. Nos contás qué necesitás</h3>
            <p className="text-gray-600 text-sm">
              Elegís un equipo de nuestra vidriera o nos decís exactamente qué buscás. Un Afiliado Independiente toma tu pedido.
            </p>
          </div>
          <div className="bg-white/40 p-8 rounded-3xl border border-gray-200 text-center flex flex-col items-center">
            <div className="bg-yellow-500/10 p-4 rounded-full mb-6">
              <PackageCheck className="w-8 h-8 text-yellow-500" />
            </div>
            <h3 className="text-xl font-bold mb-3 text-zinc-900">2. Gestionamos la compra</h3>
            <p className="text-gray-600 text-sm">
              Con tu aprobación y a sola firma, ponemos el capital, compramos el equipo por vos y armamos tu plan de pagos.
            </p>
          </div>
          <div className="bg-white/40 p-8 rounded-3xl border border-gray-200 text-center flex flex-col items-center">
            <div className="bg-yellow-500/10 p-4 rounded-full mb-6">
              <Truck className="w-8 h-8 text-yellow-500" />
            </div>
            <h3 className="text-xl font-bold mb-3 text-zinc-900">3. Lo recibís en tu casa</h3>
            <p className="text-gray-600 text-sm">
              Te llevamos el equipo hasta la puerta de tu hogar. Pagás tu primera cuota recién cuando lo tenés en tus manos.
            </p>
          </div>
        </div>
      </section>

      {/* 4. NUESTRA FINANCIACIÓN */}
      <section className="py-20 bg-yellow-500 text-black">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-5xl font-black mb-6">Nuestra Financiación</h2>
          <p className="text-xl font-medium max-w-3xl mx-auto leading-relaxed">
            Creemos en tu palabra. Por eso te ofrecemos <strong className="font-black">crédito a sola firma</strong>, sin trámites bancarios engorrosos, con <strong className="font-black">cuotas fijas y en pesos</strong>. Sabés exactamente cuánto vas a pagar desde el primer día hasta el último, sin sorpresas.
          </p>
        </div>
      </section>

      {/* 5. CATALOG GRID (PLANES SUGERIDOS) */}
      <section id="catalogo" className="max-w-7xl mx-auto px-6 py-20">
        <div className="flex items-end justify-between mb-12">
          <div>
            <h2 className="text-3xl md:text-4xl font-black text-zinc-900">Planes Sugeridos</h2>
            <p className="text-gray-600 mt-2">Nuestra vidriera de equipos. Elegí el tuyo y armamos la gestión.</p>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="animate-pulse bg-white rounded-2xl h-96 border border-gray-200" />
            ))}
          </div>
        ) : productos.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-300">
            <p className="text-gray-600 text-lg">Próximamente estaremos subiendo nuevos planes. ¡Vuelve pronto!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {productos.map(p => (
              <div key={p.id} className="group bg-gray-50 hover:bg-white border border-gray-200 hover:border-yellow-500/50 rounded-3xl overflow-hidden transition-all duration-300 flex flex-col shadow-lg relative">
                
                {/* Imagen del Producto */}
                <div className="relative aspect-square bg-[#f8f8f8] p-6 flex flex-col items-center justify-center overflow-hidden">
                  <div className="absolute top-4 left-4 bg-yellow-500 text-black text-xs font-black px-3 py-1 rounded-full z-10 shadow-md">
                    PLAN DE GESTIÓN
                  </div>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img 
                    src={p.imagenUrl} 
                    alt={p.nombre} 
                    className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-500 mix-blend-multiply" 
                  />
                </div>
                
                {/* Información y Plan */}
                <div className="p-6 flex flex-col flex-1">
                  <h3 className="text-lg font-bold text-zinc-900 mb-1 line-clamp-2 leading-tight">
                    Plan de Gestión {p.nombre}
                  </h3>
                  
                  <div className="mt-auto flex flex-col justify-end pt-4">
                    <p className="text-sm text-gray-600 mb-1">Llevalo desde</p>
                    <p className="text-2xl font-black text-yellow-500 mb-4">{formatPrice(p.cuota12)} <span className="text-sm text-gray-500 font-normal">por mes</span></p>

                    <Link 
                      href={`/solicitar?id=\${p.id}`} 
                      className="flex items-center justify-center gap-2 w-full bg-zinc-800 border border-gray-300 text-zinc-900 font-bold py-3.5 rounded-full hover:bg-yellow-500 hover:text-black hover:border-yellow-500 transition-all shadow-md group-hover:shadow-[0_0_20px_rgba(234,179,8,0.2)]"
                    >
                      <CheckCircle2 className="w-5 h-5" /> Solicitar scoring para este plan
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 6. NUEVA SECCIÓN: Iniciá tu Plan Ahora (Contacto Rápido) */}
      <section id="contacto" className="max-w-4xl mx-auto px-6 py-20 border-t border-gray-200">
        <div className="bg-white border border-yellow-500/30 rounded-3xl p-8 md:p-12 shadow-[0_0_40px_rgba(234,179,8,0.1)] relative overflow-hidden">
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-yellow-500/20 blur-3xl rounded-full pointer-events-none" />
          
          <div className="text-center mb-10 relative z-10">
            <h2 className="text-3xl md:text-4xl font-black text-zinc-900 mb-4">¿Buscás algo en especial? Nosotros lo gestionamos por vos.</h2>
            <p className="text-gray-600 text-lg">Completá tus datos y contanos qué estás necesitando. Un <strong className="text-zinc-900 font-bold">Afiliado Independiente</strong> de nuestra red se pondrá en contacto con vos para armar tu plan a medida.</p>
          </div>

          <form onSubmit={handleQuickFormSubmit} className="space-y-6 relative z-10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm text-gray-600 mb-2 font-bold">Nombre y Apellido</label>
                <input required value={qfNombre} onChange={e=>setQfNombre(e.target.value)} type="text" placeholder="Tu nombre" className="w-full bg-[#FAFAFA] border border-gray-300 p-4 rounded-xl text-zinc-900 outline-none focus:border-yellow-500 transition-colors" />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-2 font-bold">DNI</label>
                <input required value={qfDni} onChange={e=>setQfDni(e.target.value)} type="number" placeholder="Sin puntos" className="w-full bg-[#FAFAFA] border border-gray-300 p-4 rounded-xl text-zinc-900 outline-none focus:border-yellow-500 transition-colors" />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-2 font-bold">WhatsApp de contacto</label>
                <input required value={qfWhatsapp} onChange={e=>setQfWhatsapp(e.target.value)} type="tel" placeholder="Código de área + número" className="w-full bg-[#FAFAFA] border border-gray-300 p-4 rounded-xl text-zinc-900 outline-none focus:border-yellow-500 transition-colors" />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-2 font-bold">Localidad</label>
                <input required value={qfLocalidad} onChange={e=>setQfLocalidad(e.target.value)} type="text" placeholder="Ej: Córdoba Capital" className="w-full bg-[#FAFAFA] border border-gray-300 p-4 rounded-xl text-zinc-900 outline-none focus:border-yellow-500 transition-colors" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm text-gray-600 mb-2 font-bold">¿Algún cliente de Cuenta Hogar te recomendó con nosotros? <span className="text-xs text-gray-500 font-normal">(Opcional)</span></label>
                <input value={qfReferente} onChange={e=>setQfReferente(e.target.value)} type="text" placeholder="Escribí acá el nombre de quien te pasó el dato." className="w-full bg-[#FAFAFA] border border-gray-300 p-4 rounded-xl text-zinc-900 outline-none focus:border-yellow-500 transition-colors" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm text-gray-600 mb-2 font-bold">¿Qué estás necesitando?</label>
                <textarea required value={qfNecesidad} onChange={e=>setQfNecesidad(e.target.value)} placeholder="Describí el producto o equipo que buscás..." rows={4} className="w-full bg-[#FAFAFA] border border-gray-300 p-4 rounded-xl text-zinc-900 outline-none focus:border-yellow-500 transition-colors resize-none" />
              </div>
            </div>

            <button type="submit" className="w-full group flex items-center justify-center gap-2 bg-yellow-500 text-black font-black text-lg py-5 rounded-xl hover:bg-yellow-400 hover:-translate-y-1 hover:shadow-xl active:scale-95 transition-all duration-300 shadow-md">
              <Send className="w-5 h-5" /> Enviar mi solicitud de confianza
            </button>
          </form>
        </div>
      </section>

      {/* 7. FOOTER LEGAL */}
      <footer className="border-t border-gray-200 py-12">
        <div className="max-w-7xl mx-auto px-6 text-center text-gray-500 text-sm space-y-4">
          <p className="font-semibold text-zinc-900">Cuenta Hogar</p>
          <p>© {new Date().getFullYear()} Cuenta Hogar. Todos los derechos reservados.</p>
          <p>Razón Social: Cuenta Hogar S.R.L. | CUIT: 30-00000000-0</p>
          <p>Domicilio Legal: Av. Ejemplo 123, Ciudad Autónoma de Buenos Aires, Argentina</p>
          
          <div className="flex justify-center gap-2 flex-wrap items-center pt-2">
            <Link href="/terms" className="hover:text-yellow-500 transition-colors">Términos y Condiciones</Link>
            <span>|</span>
            <Link href="/privacy" className="hover:text-yellow-500 transition-colors">Política de Privacidad</Link>
            <span>|</span>
            <Link href="/cookies" className="hover:text-yellow-500 transition-colors">Política de Cookies</Link>
            <span>|</span>
            <Link href="/arrepentimiento" className="text-yellow-500 font-medium hover:underline">Botón de Arrepentimiento</Link>
          </div>
          
          <p className="pt-2">
            <Link href="https://www.argentina.gob.ar/produccion/defensadelconsumidor/formulario" target="_blank" rel="noopener noreferrer" className="hover:text-zinc-900 transition-colors font-medium">
              Defensa de las y los Consumidores - Para reclamos ingrese aquí
            </Link>
          </p>

          <div className="pt-6 border-t border-gray-200 max-w-3xl mx-auto text-xs text-gray-600">
            <p>Cuenta Hogar SRL presta servicios de gestión administrativa y financiación propia. No realizamos intermediación financiera en los términos de la Ley de Entidades Financieras.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
