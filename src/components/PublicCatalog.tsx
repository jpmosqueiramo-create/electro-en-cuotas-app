"use client";

import { registrarProductoBorradorSiNoExiste } from "@/lib/catalogManager";
import { calcularTablaTodosLosPlanes } from "@/lib/financialEngine";
import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, addDoc, serverTimestamp } from "firebase/firestore";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { RotateCcw, LogIn, ChevronLeft, ChevronRight, ShieldCheck, ArrowRight, MessageSquare, Truck, PackageCheck, Send, Menu, X, MapPin } from "lucide-react";

type Producto = {
  id: string;
  nombre: string;
  precioAnterior: number | null;
  cuota12: number;
  cuota8: number;
  costoProducto?: number | null;
  precioContado?: number | null;
  factoresPlanes?: Record<number, number>;
  planesActivos?: Record<number, boolean>;
  descripcion: string;
  imagenUrl: string;
  imagenUrls?: string[];
};

function WhatsAppIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414-.074-.124-.272-.198-.57-.347m-5.421 7.419c-1.776 0-3.517-.476-5.044-1.377l-.362-.215-3.744.982.999-3.648-.236-.375c-.991-1.574-1.513-3.612-1.513-5.696 0-5.836 4.75-10.587 10.587-10.587 2.828 0 5.486 1.1 7.485 3.101 1.999 2 3.098 4.658 3.097 7.487 0 5.837-4.75 10.588-10.587 10.588m0-20.709c-6.726 0-12.2 5.474-12.2 12.2 0 2.147.56 4.246 1.624 6.091l-1.724 6.295 6.442-1.69c1.782.971 3.792 1.485 5.858 1.485 6.726 0 12.2-5.474 12.2-12.2 0-3.26-1.27-6.324-3.578-8.631-2.308-2.307-5.37-3.576-8.622-3.576" />
    </svg>
  );
}

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
  const [qfSubmitting, setQfSubmitting] = useState(false);

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
          const data = doc.data();
          // ⚠️ Filtrar solo los productos que estén ACTIVOS y PUBLICADOS (desactivados/borradores no se muestran)
          if (data.activo !== false && data.publicado !== false) {
            prods.push({ id: doc.id, ...data } as Producto);
          }
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
    if (qfSubmitting) return;
    setQfSubmitting(true);
    
    try {
      // 1. Registrar borrador de catálogo si aplica
      if (qfNecesidad) { 
        await registrarProductoBorradorSiNoExiste(qfNecesidad).catch(() => {}); 
      }

      // 2. Guardar solicitud en solicitudes_cuenta
      try {
        await addDoc(collection(db, "solicitudes_cuenta"), {
          tipo: "contacto_rapido",
          nombre: qfNombre,
          dni: qfDni,
          whatsapp: qfWhatsapp,
          localidad: qfLocalidad,
          necesidad: qfNecesidad,
          referente: qfReferente || null,
          fecha: serverTimestamp(),
          fechaIso: new Date().toISOString(),
          estado: "Pendiente"
        });
      } catch (errDb) {
        console.warn("Aviso Firestore solicitudes_cuenta:", errDb);
      }

      // 3. Crear alerta en alertas_admin para notificar al panel de control
      try {
        await addDoc(collection(db, "alertas_admin"), {
          tipo: "NUEVO_PRESUPUESTO",
          clienteEmail: qfWhatsapp || qfNombre,
          mensaje: `📥 Presupuesto Rápido: ${qfNombre} (DNI: ${qfDni}, Tel: ${qfWhatsapp}, Loc: ${qfLocalidad}) - Necesita: ${qfNecesidad}`,
          fechaCreacion: serverTimestamp(),
          leida: false
        });
      } catch (errAlt) {
        console.warn("Aviso Firestore alertas_admin:", errAlt);
      }

      // 4. Despachar notificación por correo electrónico
      try {
        await fetch("/api/notificar-presupuesto", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            nombre: qfNombre,
            dni: qfDni,
            whatsapp: qfWhatsapp,
            localidad: qfLocalidad,
            necesidad: qfNecesidad,
            referente: qfReferente,
            tipo: "contacto_rapido"
          })
        });
      } catch (e) {
        console.error("Error al enviar email de presupuesto:", e);
      }

    } catch (err) {
      console.error("Error al guardar solicitud:", err);
    } finally {
      const refText = qfReferente ? ` Me recomendó: ${qfReferente}.` : "";
      const mensaje = `Hola, quiero iniciar un plan a medida. Soy ${qfNombre} (DNI: ${qfDni}) de ${qfLocalidad}. Necesito: ${qfNecesidad}. Mi número es ${qfWhatsapp}.${refText}`;
      const wame = `https://wa.me/5491125659686?text=${encodeURIComponent(mensaje)}`;
      window.location.href = wame;
    }
  };

  return (
    <div className="min-h-screen bg-[#121316] text-zinc-100 font-sans selection:bg-[#fe5000] selection:text-white">
      
      <Header />

      {/* 2. HERO SECTION */}
      <section className="relative overflow-hidden pt-20 pb-20">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-[#fe5000]/20 via-[#121316] to-[#121316] -z-10" />
        
        <div className="max-w-7xl mx-auto px-6 flex flex-col items-center text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#fe5000]/10 border border-[#fe5000]/30 text-[#fe5000] shadow-[0_0_15px_rgba(254,80,0,0.15)] text-xs font-bold tracking-widest uppercase mb-8">
            <ShieldCheck className="w-4 h-4" /> Financiación Directa a Sola Firma
          </div>
          
          <h1 className="text-5xl md:text-7xl font-black tracking-tighter leading-tight mb-6 text-white">
            Lo que te haga falta,<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-[#fe5000] to-amber-500">
              te lo llevamos y financiamos.
            </span>
          </h1>
          
          <p className="text-lg md:text-xl text-gray-300 mb-10 max-w-3xl font-light leading-relaxed">
            En Cuenta Hogar gestionamos la compra de tu tecnología, te la acercamos a la puerta de tu casa y te armamos un plan de pagos a tu medida. A sola firma y con la confianza de siempre.
          </p>
          
          <a href="#contacto" className="group flex items-center justify-center gap-2 bg-yellow-textured text-black text-lg font-bold px-8 py-4 rounded-full hover:-translate-y-1 active:scale-95 transition-all duration-300 shadow-md hover:scale-105 shadow-[0_0_30px_rgba(254,80,0,0.4)]">
            Abrí tu Cuenta de Confianza <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </a>
        </div>
      </section>

      {/* 2.5 LOCALIDADES DE COBERTURA (SECCIÓN BLANCA HARMONIOSA) */}
      <section className="py-24 bg-white text-zinc-900 border-y border-zinc-200 overflow-hidden relative">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center relative z-10">
          <div>
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#fe5000]/10 text-[#fe5000] border border-[#fe5000]/30 text-xs font-black uppercase tracking-wider mb-6">
              📍 Zonas de Cobertura
            </span>
            <h2 className="text-3xl md:text-5xl font-black text-zinc-900 leading-tight mb-6">
              ¿En qué localidades estamos?
            </h2>
            <p className="text-zinc-600 text-lg mb-8 max-w-lg leading-relaxed font-normal">
              Llegamos a tu puerta con financiación directa. Ofrecemos cobertura y entrega a sola firma en las siguientes ciudades:
            </p>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {["Lincoln", "Chivilcoy", "Los Toldos", "O´Brien", "Zavalia"].map((ciudad, idx) => (
                <div key={idx} className="bg-slate-50 border border-zinc-200 rounded-2xl p-4 flex items-center gap-3 hover:border-[#fe5000] hover:bg-orange-50/40 hover:shadow-md transition-all duration-300">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#fe5000] shadow-[0_0_10px_#fe5000] animate-pulse" />
                  <span className="font-bold text-zinc-900 text-sm md:text-base">{ciudad}</span>
                </div>
              ))}
            </div>
          </div>
          
          <div className="flex items-center justify-center lg:justify-end relative">
            <div className="relative w-full max-w-[400px] aspect-square flex items-center justify-center group">
              {/* Círculo luminoso de fondo */}
              <div className="absolute inset-0 bg-[#fe5000]/10 blur-3xl rounded-full group-hover:bg-[#fe5000]/20 transition-colors duration-500" />
              
              <img 
                src="/mapa_bsas.png" 
                alt="Mapa de Cobertura Provincia de Buenos Aires" 
                className="w-full h-full object-contain relative z-10 drop-shadow-[0_0_20px_rgba(254,80,0,0.4)] hover:scale-105 transition-transform duration-500 ease-out" 
              />
            </div>
          </div>
        </div>
      </section>

      {/* 3. CÓMO FUNCIONAMOS */}
      <section className="py-20 border-t border-zinc-800 max-w-7xl mx-auto px-6">
        <h2 className="text-3xl md:text-4xl font-black text-center mb-16 text-white">¿Cómo Funcionamos?</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-[#181920] p-8 rounded-3xl border border-zinc-800 shadow-xl text-center flex flex-col items-center">
            <div className="bg-[#fe5000]/10 p-4 rounded-full border border-[#fe5000]/20 mb-6">
              <MessageSquare className="w-8 h-8 text-[#fe5000]" />
            </div>
            <h3 className="text-xl font-bold mb-3 text-white">1. Nos contás qué necesitás</h3>
            <p className="text-zinc-400 text-sm">
              Elegís un equipo de nuestra vidriera o nos decís exactamente qué buscás. Un Afiliado Independiente toma tu pedido.
            </p>
          </div>
          <div className="bg-[#181920] p-8 rounded-3xl border border-zinc-800 shadow-xl text-center flex flex-col items-center">
            <div className="bg-[#fe5000]/10 p-4 rounded-full border border-[#fe5000]/20 mb-6">
              <PackageCheck className="w-8 h-8 text-[#fe5000]" />
            </div>
            <h3 className="text-xl font-bold mb-3 text-white">2. Gestionamos la compra</h3>
            <p className="text-zinc-400 text-sm">
              Con tu aprobación y a sola firma, ponemos el capital, compramos el equipo por vos y armamos tu plan de pagos.
            </p>
          </div>
          <div className="bg-[#181920] p-8 rounded-3xl border border-zinc-800 shadow-xl text-center flex flex-col items-center">
            <div className="bg-[#fe5000]/10 p-4 rounded-full border border-[#fe5000]/20 mb-6">
              <Truck className="w-8 h-8 text-[#fe5000]" />
            </div>
            <h3 className="text-xl font-bold mb-3 text-white">3. Lo recibís en tu casa</h3>
            <p className="text-zinc-400 text-sm">
              Te llevamos el equipo hasta la puerta de tu hogar. Pagás tu primera cuota recién cuando lo tenés en tus manos.
            </p>
          </div>
        </div>
      </section>

      {/* 4. NUESTRA FINANCIACIÓN */}
      <section className="py-20 bg-gradient-to-r from-[#ff6b1a] via-[#fe5000] to-[#e04600] text-white shadow-[0_0_35px_rgba(254,80,0,0.35)]">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-5xl font-black mb-6">Nuestra Financiación</h2>
          <p className="text-xl font-medium max-w-3xl mx-auto leading-relaxed">
            Creemos en tu palabra. Por eso te ofrecemos <strong className="font-black">crédito a sola firma</strong>, sin trámites bancarios engorrosos, con <strong className="font-black">cuotas fijas y en pesos</strong>. Sabés exactamente cuánto vas a pagar desde el primer día hasta el último, sin sorpresas.
          </p>
        </div>
      </section>

      {/* 4.5 ENTREGAS RECIENTES (SECCIÓN BLANCA HARMONIOSA) */}
      <section className="py-24 bg-slate-50 border-y border-zinc-200 overflow-hidden">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-12">
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#fe5000]/10 text-[#fe5000] border border-[#fe5000]/30 text-xs font-black uppercase tracking-wider mb-4">
              ✨ Entregas Reales
            </span>
            <h2 className="text-3xl md:text-5xl font-black text-zinc-900 leading-tight">
              Clientes Felices Recibiendo sus Equipos
            </h2>
            <p className="text-zinc-600 mt-3 max-w-2xl mx-auto text-lg">
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
                  <p className="text-sm md:text-base text-[#fe5000] font-bold">
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

      {/* 5. CATALOG GRID (PLANES SUGERIDOS & MODO BLINDAJE LEGAL) */}
      <section id="catalogo" className="max-w-7xl mx-auto px-6 py-20">
        <div className="flex items-end justify-between mb-12">
          <div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#fe5000]/10 border border-[#fe5000]/30 text-[#fe5000] text-xs font-bold uppercase tracking-widest mb-3">
              ✨ Vidriera de Equipos
            </span>
            <h2 className="text-3xl md:text-4xl font-black text-white">Planes Sugeridos</h2>
            <p className="text-zinc-400 mt-2 text-base">Nuestra vidriera de equipos. Elegí el tuyo y armamos la gestión.</p>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="animate-pulse bg-[#121316] rounded-3xl h-96 border border-zinc-800" />
            ))}
          </div>
        ) : productos.length === 0 ? (
          <div className="text-center py-20 bg-[#121316] rounded-3xl border border-dashed border-zinc-800">
            <p className="text-zinc-400 text-lg">Próximamente estaremos subiendo nuevos planes sugeridos. ¡Volvé pronto!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {productos.map(p => (
              <ProductCard key={p.id} p={p} formatPrice={formatPrice} />
            ))}
          </div>
        )}

        {/* DISCLAIMER OBLIGATORIO DEBAJO DE LOS PRODUCTOS */}
        <div className="mt-12 bg-[#16171d] border border-zinc-800/80 p-6 rounded-2xl text-center">
          <p className="text-xs text-zinc-400 leading-relaxed font-normal">
            "Imágenes ilustrativas. Los equipos exhibidos corresponden a Planes de Gestión sugeridos. Actuamos bajo mandato de compra y brindamos servicios de administración de crédito propio. Otorgamiento sujeto a análisis de riesgo (scoring crediticio) sin obligación de expresar causa."
          </p>
        </div>
      </section>

      {/* 6. NUEVA SECCIÓN: Iniciá tu Plan Ahora (SECCIÓN BLANCA HARMONIOSA) */}
      <section id="contacto" className="py-24 bg-white border-t border-zinc-200">
        <div className="max-w-4xl mx-auto px-6">
          <div className="bg-slate-900 text-white border border-slate-800 rounded-3xl p-8 md:p-12 shadow-2xl shadow-slate-900/30 relative overflow-hidden">
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-[#fe5000]/25 blur-3xl rounded-full pointer-events-none" />
            
            <div className="text-center mb-10 relative z-10">
              <h2 className="text-3xl md:text-4xl font-black text-white mb-4">¿Buscás algo en especial? Nosotros lo gestionamos por vos.</h2>
              <p className="text-zinc-300 text-lg font-light">Completá tus datos y contanos qué estás necesitando. Un <strong className="text-white font-bold">Afiliado Independiente</strong> de nuestra red se pondrá en contacto con vos para armar tu plan a medida.</p>
            </div>

            <form onSubmit={handleQuickFormSubmit} className="space-y-6 relative z-10">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm text-zinc-300 mb-2 font-bold">Nombre y Apellido</label>
                  <input required value={qfNombre} onChange={e=>setQfNombre(e.target.value)} type="text" placeholder="Tu nombre" className="w-full bg-slate-950 border border-slate-700 p-4 rounded-xl text-white outline-none focus:border-[#fe5000] focus:ring-1 focus:ring-[#fe5000]/30 transition-colors" />
                </div>
                <div>
                  <label className="block text-sm text-zinc-300 mb-2 font-bold">DNI</label>
                  <input required value={qfDni} onChange={e=>setQfDni(e.target.value)} type="number" placeholder="Sin puntos" className="w-full bg-slate-950 border border-slate-700 p-4 rounded-xl text-white outline-none focus:border-[#fe5000] focus:ring-1 focus:ring-[#fe5000]/30 transition-colors" />
                </div>
                <div>
                  <label className="block text-sm text-zinc-300 mb-2 font-bold">WhatsApp de contacto</label>
                  <input required value={qfWhatsapp} onChange={e=>setQfWhatsapp(e.target.value)} type="tel" placeholder="Código de área + número" className="w-full bg-slate-950 border border-slate-700 p-4 rounded-xl text-white outline-none focus:border-[#fe5000] focus:ring-1 focus:ring-[#fe5000]/30 transition-colors" />
                </div>
                <div>
                  <label className="block text-sm text-zinc-300 mb-2 font-bold">Localidad</label>
                  <input required value={qfLocalidad} onChange={e=>setQfLocalidad(e.target.value)} type="text" placeholder="Ej: Córdoba Capital" className="w-full bg-slate-950 border border-slate-700 p-4 rounded-xl text-white outline-none focus:border-[#fe5000] focus:ring-1 focus:ring-[#fe5000]/30 transition-colors" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm text-zinc-300 mb-2 font-bold">¿Algún cliente de Cuenta Hogar te recomendó con nosotros? <span className="text-xs text-zinc-400 font-normal">(Opcional)</span></label>
                  <input value={qfReferente} onChange={e=>setQfReferente(e.target.value)} type="text" placeholder="Escribí acá el nombre de quien te pasó el dato." className="w-full bg-slate-950 border border-slate-700 p-4 rounded-xl text-white outline-none focus:border-[#fe5000] focus:ring-1 focus:ring-[#fe5000]/30 transition-colors" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm text-zinc-300 mb-2 font-bold">¿Qué estás necesitando?</label>
                  <textarea required value={qfNecesidad} onChange={e=>setQfNecesidad(e.target.value)} placeholder="Describí el producto o equipo que buscás..." rows={4} className="w-full bg-slate-950 border border-slate-700 p-4 rounded-xl text-white outline-none focus:border-[#fe5000] focus:ring-1 focus:ring-[#fe5000]/30 transition-colors resize-none" />
                </div>
              </div>

            <button 
              type="submit" 
              disabled={qfSubmitting}
              className="w-full group flex items-center justify-center gap-2 bg-yellow-textured text-black font-black text-lg py-5 rounded-xl hover:-translate-y-1 active:scale-95 transition-all duration-300 shadow-md disabled:opacity-75 disabled:cursor-not-allowed"
            >
              <Send className="w-5 h-5" /> {qfSubmitting ? "Registrando solicitud..." : "Enviar mi solicitud de confianza"}
            </button>
          </form>
          </div>
        </div>
      </section>

      {/* 6.5. SECCIÓN DESTACADA: TRASLADO DE COMPRAS / LOGÍSTICA DESDE CABA */}
      <section id="fletes-caba" className="py-20 bg-[#121316] border-t border-zinc-800">
        <div className="max-w-7xl mx-auto px-6">
          <div className="bg-gradient-to-br from-zinc-900 via-slate-900 to-zinc-950 border border-zinc-800 rounded-3xl p-8 md:p-12 shadow-2xl relative overflow-hidden space-y-12">
            
            {/* 1. ENCABEZADO DESTACADO */}
            <div className="text-center max-w-3xl mx-auto space-y-4">
              <div className="inline-flex items-center gap-2 bg-[#fe5000]/15 border border-[#fe5000]/30 text-[#fe5000] px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider">
                <Truck className="w-4 h-4" /> Servicio de Traslado Logístico
              </div>
              <h2 className="text-3xl md:text-5xl font-black text-white tracking-tight">
                ¿Ya compraste en CABA y solo necesitás el Traslado de tu Compra?
              </h2>
              <p className="text-zinc-300 text-base md:text-lg font-normal leading-relaxed text-justify md:text-center">
                Si ya resolviste tu compra de tecnología o electrodomésticos por tu cuenta en Capital Federal, nosotros somos tu puente logístico. Recibimos tu mercadería en nuestro centro de recepción en CABA y te la llevamos segura hasta la puerta de tu casa en el interior.
              </p>
            </div>

            {/* 2. LOS 3 PASOS RÁPIDOS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Paso 1 */}
              <div className="bg-[#181920]/80 border border-zinc-800 p-6 rounded-2xl space-y-3 hover:border-[#fe5000]/50 transition-colors">
                <div className="w-12 h-12 bg-[#fe5000]/10 rounded-xl flex items-center justify-center text-[#fe5000] text-2xl font-bold border border-[#fe5000]/20">
                  📦
                </div>
                <h3 className="text-lg font-bold text-white">1. Enviás a nuestro local</h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  El vendedor despacha tu compra directamente a nuestra base en CABA (<strong className="text-white font-semibold">Caracas 1101</strong>). La factura debe estar a tu nombre.
                </p>
              </div>

              {/* Paso 2 */}
              <div className="bg-[#181920]/80 border border-zinc-800 p-6 rounded-2xl space-y-3 hover:border-[#fe5000]/50 transition-colors">
                <div className="w-12 h-12 bg-[#fe5000]/10 rounded-xl flex items-center justify-center text-[#fe5000] text-2xl font-bold border border-[#fe5000]/20">
                  🛡️
                </div>
                <h3 className="text-lg font-bold text-white">2. Cuidamos tu carga</h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Acopiamos tu paquete de forma segura hasta el día en que sale nuestra flota hacia tu localidad.
                </p>
              </div>

              {/* Paso 3 */}
              <div className="bg-[#181920]/80 border border-zinc-800 p-6 rounded-2xl space-y-3 hover:border-[#fe5000]/50 transition-colors">
                <div className="w-12 h-12 bg-[#fe5000]/10 rounded-xl flex items-center justify-center text-[#fe5000] text-2xl font-bold border border-[#fe5000]/20">
                  🚚
                </div>
                <h3 className="text-lg font-bold text-white">3. Entrega en tu puerta</h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Viajamos en regla con remito de traslado y te lo bajamos en la puerta de tu casa, con trato directo de vecino a vecino.
                </p>
              </div>

            </div>

            {/* 3. DATOS DE UBICACIÓN Y MAPA EMBEDIDO DE GOOGLE MAPS */}
            <div className="bg-[#181920] border border-zinc-800 rounded-2xl p-6 md:p-8 space-y-6">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#fe5000]/15 rounded-xl flex items-center justify-center text-[#fe5000]">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">Centro de Recepción CABA</span>
                    <strong className="text-lg text-white font-bold">Caracas 1101, Ciudad Autónoma de Buenos Aires</strong>
                  </div>
                </div>
                <Link
                  href="/flete"
                  className="text-xs font-bold text-[#fe5000] hover:underline flex items-center gap-1"
                >
                  Ver más detalles del servicio de traslado de compras →
                </Link>
              </div>

              {/* Mapa Embebido Google Maps */}
              <div className="w-full rounded-2xl overflow-hidden shadow-lg border border-zinc-800">
                <iframe
                  title="Ubicación Centro de Recepción CABA - Caracas 1101"
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3283.473539827663!2d-58.46820522346083!3d-34.61747805822394!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x95bcc9f3a61c572b%3A0x6b2e35a1408018e6!2sCaracas%201101%2C%20C1416AOS%20CABA!5e0!3m2!1ses!2sar!4v1700000000000!5m2!1ses!2sar"
                  width="100%"
                  height="280"
                  style={{ border: 0 }}
                  allowFullScreen={true}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  className="w-full h-[280px] rounded-2xl"
                />
              </div>
            </div>

            {/* 4. BOTÓN DE LLAMADO A LA ACCIÓN (CTA OBLIGATORIO) */}
            <div className="text-center space-y-3 pt-2 flex flex-col items-center">
              <a
                href="https://wa.me/5491125659686?text=Hola!%20%F0%9F%90%8B%20Quiero%20solicitar%20una%20cotizaci%C3%B3n%20para%20el%20*Traslado%20de%20mi%20Compra*%20desde%20CABA%20al%20interior.%0A%0A%F0%9F%9D%9B%20*Formulario%20de%20Solicitud%20de%20Cotizaci%C3%B3n:*%0A%E2%80%A2%20*Producto%20/%20Marca:*%20%0A%E2%80%A2%20*Comercio%20/%20Vendedor%20en%20CABA:*%20%0A%E2%80%A2%20*Bultos%20/%20Medidas%20aproximadas:*%20%0A%E2%80%A2%20*Localidad%20de%20Destino%20(Interior):*%20%0A%E2%80%A2%20*Nombre%20y%20Apellido:*%20%0A%0AQuedo%20a%20la%20espera%20de%20la%20cotizaci%C3%B3n.%20%C2%A1Muchas%20gracias!"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-3 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-base md:text-lg px-8 py-5 rounded-2xl shadow-xl hover:scale-105 transition-all uppercase tracking-wider w-full sm:w-auto"
              >
                <WhatsAppIcon className="w-6 h-6" />
                Cotizar Traslado de mi Compra en WhatsApp
              </a>
              <p className="text-xs text-zinc-400 font-medium">
                ⏱️ Se abrirá WhatsApp con el <strong>formulario de traslado</strong>. Te responderemos la cotización en las próximas horas.
              </p>
            </div>

          </div>
        </div>
      </section>

            {/* SECCIÓN SEO CLAVE DE BÚSQUEDA EN GOOGLE */}
      <section className="max-w-7xl mx-auto px-6 py-12 border-t border-zinc-800/80">
        <div className="bg-[#16171d] border border-zinc-800 rounded-3xl p-8 md:p-12 space-y-8">
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight">
              Soluciones Integrales: <span className="text-[#fe5000]">Comisionista CABA a Provincia</span> y Cuotas sin Tarjeta
            </h2>
            <p className="text-zinc-400 text-sm leading-relaxed">
              Cuenta Hogar puentea el acceso a la tecnología, el financiamiento propio y la logística de traslado de compras desde Buenos Aires hacia todo el país.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 text-xs text-zinc-300">
            <div className="bg-[#1c1e26] p-5 rounded-2xl border border-zinc-800/80 space-y-2">
              <h3 className="font-black text-[#fe5000] text-sm">Comisiones e Intermediación</h3>
              <p className="leading-relaxed">
                Servicio de comisionista capital a provincia, comisionistas en Buenos Aires para el interior, viajes y comisiones a Capital Federal y comisiones puerta a puerta.
              </p>
            </div>

            <div className="bg-[#1c1e26] p-5 rounded-2xl border border-zinc-800/80 space-y-2">
              <h3 className="font-black text-[#fe5000] text-sm">Compras por Encargo</h3>
              <p className="leading-relaxed">
                Comprar en Once desde el interior con comisionista, comprador personal en Buenos Aires, mandatos de compra en CABA y encargar electrodomésticos a Buenos Aires.
              </p>
            </div>

            <div className="bg-[#1c1e26] p-5 rounded-2xl border border-zinc-800/80 space-y-2">
              <h3 className="font-black text-[#fe5000] text-sm">Traslado de Mercadería</h3>
              <p className="leading-relaxed">
                Enviar compras de Buenos Aires al interior, transporte de compras personales CABA, comisionista para retirar mercadería en Capital y fletes desde CABA.
              </p>
            </div>

            <div className="bg-[#1c1e26] p-5 rounded-2xl border border-zinc-800/80 space-y-2">
              <h3 className="font-black text-[#fe5000] text-sm">Financiación Propia</h3>
              <p className="leading-relaxed">
                Comprar en cuotas sin tarjeta en el interior y financiamiento propio para tecnología y equipamiento del hogar desde Buenos Aires a sola firma.
              </p>
            </div>
          </div>
        </div>
      </section>

<Footer />
    </div>
  );
}

function ProductCard({ p, formatPrice }: { p: Producto; formatPrice: (price: number) => string }) {
  const [activeIdx, setActiveIdx] = useState(0);
  const images = p.imagenUrls && p.imagenUrls.length > 0 ? p.imagenUrls : (p.imagenUrl ? [p.imagenUrl] : []);

  // Calcular únicamente los planes tildados/activos (1 a 12 cuotas)
  const planes = (() => {
    const cProd = Number(p.costoProducto || p.precioContado) || 0;
    const factores = p.factoresPlanes;
    let activos = p.planesActivos;

    // Fallback para productos legados sin planesActivos explícito
    if (!activos || Object.keys(activos).length === 0) {
      activos = {
        12: Boolean(p.cuota12 && p.cuota12 > 0),
        8: Boolean(p.cuota8 && p.cuota8 > 0)
      };
    }

    return calcularTablaTodosLosPlanes(cProd, factores, activos).map(plan => {
      let cuota = plan.cuotaMensual;
      if (plan.cuotas === 12 && p.cuota12 && p.cuota12 > 0 && (!factores || !factores[12])) {
        cuota = p.cuota12;
      } else if (plan.cuotas === 8 && p.cuota8 && p.cuota8 > 0 && (!factores || !factores[8])) {
        cuota = p.cuota8;
      }
      return { ...plan, cuotaMensual: cuota };
    }).filter(plan => plan.activo && plan.cuotaMensual > 0);
  })();

  const [cuotaElegida, setCuotaElegida] = useState<number>(() => {
    return planes.some(pl => pl.cuotas === 12) ? 12 : (planes[planes.length - 1]?.cuotas || 12);
  });

  const planActual = planes.find(pl => pl.cuotas === cuotaElegida) || planes[planes.length - 1];
  const cuotaMensual = planActual ? planActual.cuotaMensual : (p.cuota12 || 0);

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
    <div className="group bg-[#121316] hover:bg-[#181920] border border-zinc-800 hover:border-[#fe5000]/60 hover:shadow-[0_0_30px_rgba(254,80,0,0.2)] rounded-3xl overflow-hidden transition-all duration-300 flex flex-col shadow-2xl shadow-black/80 relative">
      
      {/* Imagen del Equipo */}
      <div className="relative aspect-square bg-white p-6 flex flex-col items-center justify-center overflow-hidden border-b border-zinc-800 group/img">
        {images.length > 0 ? (
          <img 
            src={images[activeIdx]} 
            alt={p.nombre} 
            className="w-full h-full object-contain group-hover:scale-[1.04] transition-transform duration-500" 
          />
        ) : (
          <span className="text-zinc-400 text-xs italic">Imagen de equipo sugerido</span>
        )}
        
        {images.length > 1 && (
          <>
            <button
              onClick={handlePrev}
              type="button"
              className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/70 hover:bg-black text-white rounded-full p-2 opacity-0 group-hover/img:opacity-100 transition-opacity z-10 border border-zinc-700 flex items-center justify-center"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            
            <button
              onClick={handleNext}
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/70 hover:bg-black text-white rounded-full p-2 opacity-0 group-hover/img:opacity-100 transition-opacity z-10 border border-zinc-700 flex items-center justify-center"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

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
                    i === activeIdx ? "bg-[#fe5000] w-3.5" : "bg-zinc-400"
                  }`}
                />
              ))}
            </div>
          </>
        )}
      </div>
      
      {/* Información del Plan */}
      <div className="p-6 flex flex-col flex-1">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#fe5000]/15 text-[#fe5000] border border-[#fe5000]/30 text-[10px] font-black uppercase tracking-widest mb-3 w-fit shadow-sm">
          PLAN DE GESTIÓN
        </div>
        
        <h3 className="text-base font-bold text-white line-clamp-2 leading-snug mb-3">
          {p.nombre}
        </h3>

        {/* Selector de Cuotas Disponibles (1 a 12 Cuotas) */}
        {planes.length > 0 && (
          <div className="mb-4">
            <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1.5">
              Elegí tu Plan de Cuotas:
            </label>
            <div className="flex flex-wrap gap-1.5">
              {planes.map((pl) => (
                <button
                  key={pl.cuotas}
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setCuotaElegida(pl.cuotas);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                    cuotaElegida === pl.cuotas
                      ? "bg-[#fe5000] text-white shadow-md shadow-[#fe5000]/30 font-black scale-105"
                      : "bg-[#181920] text-zinc-400 border border-zinc-800 hover:text-white hover:border-zinc-700"
                  }`}
                >
                  {pl.cuotas} {pl.cuotas === 1 ? "Cuota" : "Cuotas"}
                </button>
              ))}
            </div>
          </div>
        )}
        
        {/* Bloque de Valor: SOLO PRECIO POR CUOTA (Cero Precio Total) */}
        <div className="mt-auto flex flex-col justify-end pt-2 border-t border-zinc-800/80">
          <p className="text-xs text-zinc-400 font-medium">
            Llevalo en {cuotaElegida} {cuotaElegida === 1 ? "cuota" : "cuotas"} desde
          </p>
          <p className="text-2xl font-black text-[#fe5000] mb-4">
            {formatPrice(cuotaMensual)} <span className="text-xs text-zinc-400 font-normal">/ mes</span>
          </p>

          <Link 
            href={`/solicitar?id=${p.id}&cuotas=${cuotaElegida}`} 
            className="w-full bg-[#fe5000] hover:bg-[#fe5000]/90 text-white font-black text-[11px] tracking-wider py-4 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-[#fe5000]/25 hover:shadow-[#fe5000]/40 hover:-translate-y-0.5 active:scale-95 transition-all duration-200 uppercase"
          >
            <ArrowRight className="w-4 h-4 shrink-0" />
            <span>SOLICITAR SCORING PARA ESTE PLAN</span>
          </Link>
        </div>
      </div>
    </div>
  );
}