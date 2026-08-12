"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, addDoc, serverTimestamp } from "firebase/firestore";
import Link from "next/link";
import { LogIn, ChevronLeft, ChevronRight, ShieldCheck, ArrowRight, MessageSquare, Truck, PackageCheck, Send, Menu, X } from "lucide-react";

type Producto = {
  id: string;
  nombre: string;
  precioAnterior: number | null;
  cuota12: number;
  cuota8: number;
  descripcion: string;
  imagenUrl: string;
  imagenUrls?: string[];
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

  // Carrusel de entregas (Casos de éxito)
  const entregas = [
    {
      src: "/entrega1.jpg",
      alt: "Entrega de Smart TV en domicilio",
      titulo: "Entrega puerta a puerta sin trámites bancarios",
      descripcion: "Tu Smart TV financiado a sola firma y en cuotas fijas en pesos."
    },
    {
      src: "/entrega2.jpg",
      alt: "Familia disfrutando de su Smart TV en el living",
      titulo: "La tranquilidad de equipar tu hogar",
      descripcion: "Financiamos tu tecnología para que disfrutes momentos únicos en familia."
    },
    {
      src: "/entrega3.jpg",
      alt: "Entrega de televisor Noblex a cliente",
      titulo: "Tu palabra vale: crédito a sola firma",
      descripcion: "Hacemos la entrega y pagás tu primera cuota recién cuando tenés el producto en tus manos."
    }
  ];

  const [activeEntregaIdx, setActiveEntregaIdx] = useState(0);

  const handleNextEntrega = () => {
    setActiveEntregaIdx((prev) => (prev + 1) % entregas.length);
  };

  const handlePrevEntrega = () => {
    setActiveEntregaIdx((prev) => (prev - 1 + entregas.length) % entregas.length);
  };

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

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveEntregaIdx((prev) => (prev + 1) % entregas.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [entregas.length]);

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
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-yellow-500 selection:text-black">
      
      {/* 1. NAVBAR */}
      <nav className="sticky top-0 z-50 bg-zinc-900/90 backdrop-blur-xl border-b border-zinc-850">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <img src="https://storage.googleapis.com/negocio-facil-page.firebasestorage.app/Logos/LOGO%20SIN%20NOMBRE%20-%20CUENTA%20HOGAR.png" alt="Cuenta Hogar Logo" className="h-10 w-auto object-contain" />
            <span className="text-xl md:text-2xl font-black tracking-tight text-white">
              CUENTA <span className="text-yellow-400">HOGAR</span>
            </span>
          </Link>

          {/* Desktop Menu */}
          <div className="hidden lg:flex items-center gap-4">
            <a href="#catalogo" className="text-sm font-bold text-zinc-300 hover:text-white transition-colors px-3 py-2">
              Planes para vos
            </a>
            <Link href="/nosotros" className="text-sm font-bold text-zinc-300 hover:text-white transition-colors px-3 py-2">
              ¿En qué te ayudamos?
            </Link>
            <a href="/red-afiliados" className="text-sm font-bold text-zinc-300 hover:text-white transition-colors px-3 py-2">
              Red de Afiliados
            </a>
            <Link href="/login" className="flex items-center gap-2 text-sm font-bold bg-black text-yellow-400 px-5 py-2.5 rounded-full hover:bg-yellow-500 hover:text-black hover:-translate-y-0.5 hover:shadow-2xl shadow-black/60 active:scale-95 transition-all duration-300 font-black">
              <LogIn className="w-4 h-4" />
              <span>Portal de Clientes</span>
            </Link>
          </div>

          {/* Mobile Menu Toggle */}
          <button className="lg:hidden text-yellow-400 p-2" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Dropdown */}
        {mobileMenuOpen && (
          <div className="lg:hidden absolute top-20 left-0 w-full bg-zinc-900 border-b border-zinc-850 p-6 flex flex-col gap-4 shadow-2xl shadow-black/80">
            <a href="#catalogo" onClick={() => setMobileMenuOpen(false)} className="text-lg font-bold text-zinc-300 hover:text-white transition-colors">
              Planes para vos
            </a>
            <Link href="/nosotros" onClick={() => setMobileMenuOpen(false)} className="text-lg font-bold text-zinc-300 hover:text-white transition-colors">
              ¿En qué te ayudamos?
            </Link>
            <a href="/red-afiliados" onClick={() => setMobileMenuOpen(false)} className="text-lg font-bold text-zinc-300 hover:text-white transition-colors">
              Red de Afiliados
            </a>
            <div className="pt-4 border-t border-zinc-850">
              <Link href="/login" onClick={() => setMobileMenuOpen(false)} className="flex items-center justify-center gap-2 text-lg font-bold bg-black text-yellow-400 px-5 py-3 rounded-xl hover:bg-yellow-500 hover:text-black hover:shadow-2xl shadow-black/60 active:scale-95 transition-all duration-300 font-black">
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
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-yellow-500/5 border border-zinc-800 text-yellow-400 text-xs font-bold tracking-widest uppercase mb-8">
            <ShieldCheck className="w-4 h-4" /> Financiación Directa a Sola Firma
          </div>
          
          <h1 className="text-5xl md:text-7xl font-black tracking-tighter leading-tight mb-6 text-white">
            Lo que te haga falta,<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-yellow-600">
              te lo llevamos y financiamos.
            </span>
          </h1>
          
          <p className="text-lg md:text-xl text-gray-300 mb-10 max-w-3xl font-light leading-relaxed">
            En Cuenta Hogar gestionamos la compra de tu tecnología, te la acercamos a la puerta de tu casa y te armamos un plan de pagos a tu medida. A sola firma y con la confianza de siempre.
          </p>
          
          <a href="#contacto" className="group flex items-center justify-center gap-2 bg-yellow-textured text-black text-lg font-bold px-8 py-4 rounded-full hover:-translate-y-1 active:scale-95 transition-all duration-300 shadow-md hover:scale-105 shadow-[0_0_30px_rgba(234,179,8,0.3)]">
            Abrí tu Cuenta de Confianza <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </a>
        </div>
      </section>

      {/* 2.5 LOCALIDADES DE COBERTURA */}
      <section className="py-20 border-t border-zinc-850 bg-zinc-950/40 overflow-hidden relative">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center relative z-10">
          <div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 text-xs font-black uppercase tracking-wider mb-6">
              📍 Zonas de Cobertura
            </span>
            <h2 className="text-3xl md:text-5xl font-black text-white leading-tight mb-6">
              ¿En qué localidades estamos?
            </h2>
            <p className="text-zinc-400 text-lg mb-8 max-w-lg leading-relaxed">
              Llegamos a tu puerta con financiación directa. Ofrecemos cobertura y entrega a sola firma en las siguientes ciudades:
            </p>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {["Lincoln", "Chivilcoy", "Los Toldos", "O´Brien", "Zavalia"].map((ciudad, idx) => (
                <div key={idx} className="bg-zinc-900 border border-zinc-850 rounded-2xl p-4 flex items-center gap-3 hover:border-yellow-500/50 hover:bg-zinc-900/80 transition-all duration-300 shadow-lg">
                  <span className="w-2.5 h-2.5 rounded-full bg-yellow-400 animate-pulse" />
                  <span className="font-bold text-white text-sm md:text-base">{ciudad}</span>
                </div>
              ))}
            </div>
          </div>
          
          <div className="flex items-center justify-center lg:justify-end relative">
            <div className="relative w-full max-w-[400px] aspect-square flex items-center justify-center group">
              {/* Círculo luminoso de fondo */}
              <div className="absolute inset-0 bg-yellow-500/5 blur-3xl rounded-full group-hover:bg-yellow-500/10 transition-colors duration-500" />
              
              <img 
                src="/mapa_bsas.png" 
                alt="Mapa de Cobertura Provincia de Buenos Aires" 
                className="w-full h-full object-contain relative z-10 drop-shadow-[0_0_15px_rgba(234,179,8,0.3)] hover:scale-105 transition-transform duration-500 ease-out" 
              />
            </div>
          </div>
        </div>
      </section>

      {/* 3. CÓMO FUNCIONAMOS */}
      <section className="py-20 border-t border-zinc-850 max-w-7xl mx-auto px-6">
        <h2 className="text-3xl md:text-4xl font-black text-center mb-16 text-white">¿Cómo Funcionamos?</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-zinc-900/40 p-8 rounded-3xl border border-zinc-850 text-center flex flex-col items-center">
            <div className="bg-yellow-500/5 p-4 rounded-full mb-6">
              <MessageSquare className="w-8 h-8 text-yellow-400" />
            </div>
            <h3 className="text-xl font-bold mb-3 text-white">1. Nos contás qué necesitás</h3>
            <p className="text-zinc-400 text-sm">
              Elegís un equipo de nuestra vidriera o nos decís exactamente qué buscás. Un Afiliado Independiente toma tu pedido.
            </p>
          </div>
          <div className="bg-zinc-900/40 p-8 rounded-3xl border border-zinc-850 text-center flex flex-col items-center">
            <div className="bg-yellow-500/5 p-4 rounded-full mb-6">
              <PackageCheck className="w-8 h-8 text-yellow-400" />
            </div>
            <h3 className="text-xl font-bold mb-3 text-white">2. Gestionamos la compra</h3>
            <p className="text-zinc-400 text-sm">
              Con tu aprobación y a sola firma, ponemos el capital, compramos el equipo por vos y armamos tu plan de pagos.
            </p>
          </div>
          <div className="bg-zinc-900/40 p-8 rounded-3xl border border-zinc-850 text-center flex flex-col items-center">
            <div className="bg-yellow-500/5 p-4 rounded-full mb-6">
              <Truck className="w-8 h-8 text-yellow-400" />
            </div>
            <h3 className="text-xl font-bold mb-3 text-white">3. Lo recibís en tu casa</h3>
            <p className="text-zinc-400 text-sm">
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

      {/* 4.5 ENTREGAS RECIENTES (CARRUSEL DE ENVIOS) */}
      <section className="py-20 bg-zinc-950 border-t border-b border-zinc-850 overflow-hidden">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-12">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 text-xs font-black uppercase tracking-wider mb-4">
              ✨ Entregas Reales
            </span>
            <h2 className="text-3xl md:text-5xl font-black text-white leading-tight">
              Clientes Felices Recibiendo sus Equipos
            </h2>
            <p className="text-zinc-400 mt-3 max-w-2xl mx-auto text-lg">
              Entregamos puerta a puerta con financiación a sola firma en todo el país. Mirá a algunos de nuestros clientes con sus productos en mano.
            </p>
          </div>

          {/* Carrusel de imágenes */}
          <div className="relative max-w-4xl mx-auto group/carousel">
            <div className="relative aspect-[16/9] w-full overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900 shadow-2xl shadow-black/85">
              
              {/* Imagen activa con animación de desvanecimiento suave */}
              <div className="w-full h-full relative">
                <img
                  src={entregas[activeEntregaIdx].src}
                  alt={entregas[activeEntregaIdx].alt}
                  className="w-full h-full object-cover transition-all duration-700 ease-in-out"
                />
                
                {/* Overlay con gradiente premium */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent flex flex-col justify-end p-8 md:p-12">
                  <h3 className="text-xl md:text-3xl font-black text-white mb-2 leading-snug">
                    {entregas[activeEntregaIdx].titulo}
                  </h3>
                  <p className="text-sm md:text-base text-yellow-400 font-bold">
                    {entregas[activeEntregaIdx].descripcion}
                  </p>
                </div>
              </div>

              {/* Botón Prev */}
              <button
                type="button"
                onClick={handlePrevEntrega}
                className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 border border-zinc-800 text-white rounded-full p-2.5 opacity-0 group-hover/carousel:opacity-100 transition-opacity duration-300 z-20 flex items-center justify-center backdrop-blur-sm"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>

              {/* Botón Next */}
              <button
                type="button"
                onClick={handleNextEntrega}
                className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 border border-zinc-800 text-white rounded-full p-2.5 opacity-0 group-hover/carousel:opacity-100 transition-opacity duration-300 z-20 flex items-center justify-center backdrop-blur-sm"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </div>

            {/* Selector de diapositivas (Dots) */}
            <div className="flex justify-center gap-2.5 mt-6">
              {entregas.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActiveEntregaIdx(idx)}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    idx === activeEntregaIdx ? 'bg-yellow-400 w-8' : 'bg-zinc-700 w-2 hover:bg-zinc-600'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 5. CATALOG GRID (PLANES SUGERIDOS) */}
      <section id="catalogo" className="max-w-7xl mx-auto px-6 py-20">
        <div className="flex items-end justify-between mb-12">
          <div>
            <h2 className="text-3xl md:text-4xl font-black text-white">Planes Sugeridos</h2>
            <p className="text-zinc-400 mt-2">Nuestra vidriera de equipos. Elegí el tuyo y armamos la gestión.</p>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="animate-pulse bg-zinc-900 rounded-2xl h-96 border border-zinc-850" />
            ))}
          </div>
        ) : productos.length === 0 ? (
          <div className="text-center py-20 bg-zinc-900 rounded-3xl border border-dashed border-zinc-800">
            <p className="text-zinc-400 text-lg">Próximamente estaremos subiendo nuevos planes. ¡Vuelve pronto!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {productos.map(p => (
              <ProductCard key={p.id} p={p} formatPrice={formatPrice} />
            ))}
          </div>
        )}
      </section>

      {/* 6. NUEVA SECCIÓN: Iniciá tu Plan Ahora (Contacto Rápido) */}
      <section id="contacto" className="max-w-4xl mx-auto px-6 py-20 border-t border-zinc-850">
        <div className="bg-zinc-900 border border-zinc-800 shadow-[0_0_30px_rgba(0,0,0,0.5)] rounded-3xl p-8 md:p-12 shadow-[0_0_40px_rgba(234,179,8,0.1)] relative overflow-hidden">
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-yellow-500/20 blur-3xl rounded-full pointer-events-none" />
          
          <div className="text-center mb-10 relative z-10">
            <h2 className="text-3xl md:text-4xl font-black text-white mb-4">¿Buscás algo en especial? Nosotros lo gestionamos por vos.</h2>
            <p className="text-zinc-400 text-lg">Completá tus datos y contanos qué estás necesitando. Un <strong className="text-white font-bold">Afiliado Independiente</strong> de nuestra red se pondrá en contacto con vos para armar tu plan a medida.</p>
          </div>

          <form onSubmit={handleQuickFormSubmit} className="space-y-6 relative z-10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm text-zinc-400 mb-2 font-bold">Nombre y Apellido</label>
                <input required value={qfNombre} onChange={e=>setQfNombre(e.target.value)} type="text" placeholder="Tu nombre" className="w-full bg-zinc-950 border border-zinc-800 p-4 rounded-xl text-white outline-none focus:border-yellow-500 transition-colors" />
              </div>
              <div>
                <label className="block text-sm text-zinc-400 mb-2 font-bold">DNI</label>
                <input required value={qfDni} onChange={e=>setQfDni(e.target.value)} type="number" placeholder="Sin puntos" className="w-full bg-zinc-950 border border-zinc-800 p-4 rounded-xl text-white outline-none focus:border-yellow-500 transition-colors" />
              </div>
              <div>
                <label className="block text-sm text-zinc-400 mb-2 font-bold">WhatsApp de contacto</label>
                <input required value={qfWhatsapp} onChange={e=>setQfWhatsapp(e.target.value)} type="tel" placeholder="Código de área + número" className="w-full bg-zinc-950 border border-zinc-800 p-4 rounded-xl text-white outline-none focus:border-yellow-500 transition-colors" />
              </div>
              <div>
                <label className="block text-sm text-zinc-400 mb-2 font-bold">Localidad</label>
                <input required value={qfLocalidad} onChange={e=>setQfLocalidad(e.target.value)} type="text" placeholder="Ej: Córdoba Capital" className="w-full bg-zinc-950 border border-zinc-800 p-4 rounded-xl text-white outline-none focus:border-yellow-500 transition-colors" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm text-zinc-400 mb-2 font-bold">¿Algún cliente de Cuenta Hogar te recomendó con nosotros? <span className="text-xs text-zinc-500 font-normal">(Opcional)</span></label>
                <input value={qfReferente} onChange={e=>setQfReferente(e.target.value)} type="text" placeholder="Escribí acá el nombre de quien te pasó el dato." className="w-full bg-zinc-950 border border-zinc-800 p-4 rounded-xl text-white outline-none focus:border-yellow-500 transition-colors" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm text-zinc-400 mb-2 font-bold">¿Qué estás necesitando?</label>
                <textarea required value={qfNecesidad} onChange={e=>setQfNecesidad(e.target.value)} placeholder="Describí el producto o equipo que buscás..." rows={4} className="w-full bg-zinc-950 border border-zinc-800 p-4 rounded-xl text-white outline-none focus:border-yellow-500 transition-colors resize-none" />
              </div>
            </div>

            <button type="submit" className="w-full group flex items-center justify-center gap-2 bg-yellow-textured text-black font-black text-lg py-5 rounded-xl hover:-translate-y-1 active:scale-95 transition-all duration-300 shadow-md">
              <Send className="w-5 h-5" /> Enviar mi solicitud de confianza
            </button>
          </form>
        </div>
      </section>

      {/* 7. FOOTER LEGAL */}
      <footer className="border-t border-zinc-850 py-12">
        <div className="max-w-7xl mx-auto px-6 text-center text-zinc-500 text-sm space-y-4">
          <p className="font-semibold text-white">Cuenta Hogar</p>
          <p>© {new Date().getFullYear()} Cuenta Hogar. Todos los derechos reservados.</p>
          <p>Razón Social: Cuenta Hogar S.R.L. | CUIT: 30-00000000-0</p>
          <p>Domicilio Legal: Av. Ejemplo 123, Ciudad Autónoma de Buenos Aires, Argentina</p>
          
          <div className="flex justify-center gap-2 flex-wrap items-center pt-2">
            <Link href="/terms" className="hover:text-yellow-400 transition-colors">Términos y Condiciones</Link>
            <span>|</span>
            <Link href="/privacy" className="hover:text-yellow-400 transition-colors">Política de Privacidad</Link>
            <span>|</span>
            <Link href="/cookies" className="hover:text-yellow-400 transition-colors">Política de Cookies</Link>
            <span>|</span>
            <Link href="/arrepentimiento" className="text-yellow-400 font-medium hover:underline">Botón de Arrepentimiento</Link>
          </div>
          
          <p className="pt-2">
            <Link href="https://www.argentina.gob.ar/produccion/defensadelconsumidor/formulario" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors font-medium">
              Defensa de las y los Consumidores - Para reclamos ingrese aquí
            </Link>
          </p>

          <div className="pt-6 border-t border-zinc-850 max-w-3xl mx-auto text-xs text-zinc-400">
            <p>LOOP GESTIÓN INTEGRAL S.A.S. (Cuenta Hogar) presta servicios de gestión administrativa y financiación propia. No realizamos intermediación financiera en los términos de la Ley de Entidades Financieras.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function ProductCard({ p, formatPrice }: { p: Producto; formatPrice: (price: number) => string }) {
  const [activeIdx, setActiveIdx] = useState(0);
  const images = p.imagenUrls && p.imagenUrls.length > 0 ? p.imagenUrls : (p.imagenUrl ? [p.imagenUrl] : []);

  const handleNext = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setActiveIdx((prev) => (prev + 1) % images.length);
  };

  const handlePrev = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setActiveIdx((prev) => (prev - 1 + images.length) % images.length);
  };

  return (
    <div className="group bg-zinc-900/40 hover:bg-zinc-900/80 border border-zinc-850 hover:border-yellow-500/50 rounded-3xl overflow-hidden transition-all duration-300 flex flex-col shadow-2xl shadow-black/60 relative">
      
      {/* Imagen del Producto */}
      <div className="relative aspect-square bg-white p-6 flex flex-col items-center justify-center overflow-hidden border-b border-zinc-850 group/img">
        {images.length > 0 ? (
          <img 
            src={images[activeIdx]} 
            alt={p.nombre} 
            className="w-full h-full object-contain group-hover:scale-[1.03] transition-transform duration-500" 
          />
        ) : (
          <span className="text-zinc-600 text-xs italic">Sin imagen</span>
        )}
        
        {images.length > 1 && (
          <>
            {/* Flecha Izquierda */}
            <button
              onClick={handlePrev}
              type="button"
              className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 text-white rounded-full p-2 opacity-0 group-hover/img:opacity-100 transition-opacity z-10 border border-zinc-800 flex items-center justify-center"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            
            {/* Flecha Derecha */}
            <button
              onClick={handleNext}
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 text-white rounded-full p-2 opacity-0 group-hover/img:opacity-100 transition-opacity z-10 border border-zinc-800 flex items-center justify-center"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            {/* Indicadores (Dots) */}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1 z-10">
              {images.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setActiveIdx(i);
                  }}
                  className={`w-1.5 h-1.5 rounded-full transition-all ${
                    i === activeIdx ? 'bg-yellow-400 w-3' : 'bg-zinc-600'
                  }`}
                />
              ))}
            </div>
          </>
        )}
      </div>
      
      {/* Información y Plan */}
      <div className="p-6 flex flex-col flex-1">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-yellow-500/10 text-yellow-400 border border-yellow-500/10 text-[9px] font-black uppercase tracking-widest mb-3 w-fit">
          Plan de Gestión
        </div>
        
        <h3 className="text-base font-bold text-white line-clamp-2 leading-snug mb-3">
          {p.nombre}
        </h3>
        
        <div className="mt-auto flex flex-col justify-end pt-2">
          <p className="text-xs text-zinc-400 mb-0.5">Llevalo desde</p>
          <p className="text-xl font-black text-yellow-400 mb-4">
            {formatPrice(p.cuota12)} <span className="text-xs text-zinc-500 font-normal">/ mes</span>
          </p>

          <Link 
            href={`/solicitar?id=${p.id}`} 
            className="w-full bg-yellow-textured text-black font-extrabold text-[11px] tracking-wider py-3.5 rounded-full flex items-center justify-center gap-2 shadow-md hover:scale-[1.02] hover:shadow-lg active:scale-95 transition-all duration-200"
          >
            <ArrowRight className="w-4 h-4 shrink-0" />
            <span>SOLICITAR SCORING PARA ESTE PLAN</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
