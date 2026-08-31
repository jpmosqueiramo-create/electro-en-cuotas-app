"use client";

import { useState } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { ArrowLeft, UserPlus, ClipboardCheck, Wallet, ChevronDown, CheckSquare, Send, ShieldAlert, BadgeCheck, Lock, Sparkles, Building2 } from "lucide-react";

export default function RedAfiliadosPage() {
  const [nombre, setNombre] = useState("");
  const [dni, setDni] = useState("");
  const [cuit, setCuit] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [localidad, setLocalidad] = useState("");
  const [aceptaCondiciones, setAceptaCondiciones] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!aceptaCondiciones) {
      alert("Debes aceptar el compromiso ético y de referencias reales para postularte.");
      return;
    }
    const mensaje = `Hola, quiero postularme como Afiliado Independiente de Cuenta Hogar. Soy ${nombre}, DNI ${dni}, CUIT ${cuit}, de la localidad de ${localidad}. Entiendo y acepto el proceso de evaluación exhaustiva de perfil.`;
    const wame = `https://wa.me/5491125659686?text=${encodeURIComponent(mensaje)}`;
    window.open(wame, "_blank");
  };

  return (
    <div className="min-h-screen bg-[#121316] text-zinc-100 font-sans selection:bg-[#fe5000] selection:text-white">
      
      {/* NAVBAR OFICIAL */}
      <Header />

      {/* HERO RECLUTAMIENTO EXCLUSIVO */}
      <section className="relative overflow-hidden pt-20 pb-20 border-b border-zinc-800">
        <div className="max-w-7xl mx-auto px-6 flex flex-col items-center text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#fe5000]/10 border border-[#fe5000]/30 text-[#fe5000] text-xs font-black tracking-widest uppercase mb-6">
            <Sparkles className="w-3.5 h-3.5" /> Red de Afiliados Selectos
          </div>
          
          <h1 className="text-4xl md:text-6xl font-black tracking-tighter leading-tight mb-6 text-white max-w-4xl">
            Desarrollá tu propio negocio representando a <span className="text-[#fe5000]">Cuenta Hogar</span>
          </h1>
          
          <p className="text-base md:text-xl text-zinc-400 mb-10 max-w-3xl font-normal leading-relaxed">
            Sumate a nuestra red oficial de representantes independientes. Manejá tus propios tiempos y generá ingresos continuos sin necesidad de inversión inicial, con el respaldo de nuestra infraestructura.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 items-center">
            <a href="#postulacion" className="group flex items-center justify-center gap-2 bg-[#fe5000] hover:bg-[#ff6b1a] text-white text-base font-black px-8 py-4 rounded-full transition-all duration-300 shadow-lg shadow-[#fe5000]/25">
              Iniciar Postulación <ChevronDown className="w-5 h-5 group-hover:translate-y-1 transition-transform" />
            </a>
            
            <Link href="/login-afiliado" className="flex items-center gap-2 bg-[#181920] text-zinc-200 border border-zinc-700 text-base font-bold px-8 py-3.5 rounded-full hover:border-[#fe5000] hover:text-[#fe5000] transition-all">
              Ingresar a mi Panel de Afiliado
            </Link>
          </div>
        </div>
      </section>

      {/* SECCIÓN DESTACADA: SELECCIÓN ESTRICTA Y VERIFICACIÓN DE PERFIL (FONDO BLANCO DINÁMICO) */}
      <section className="py-20 bg-white text-zinc-900 border-y-4 border-[#fe5000] relative overflow-hidden shadow-2xl">
        {/* Elementos dinámicos decorativos de fondo con animación */}
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-[#fe5000]/10 rounded-full blur-3xl animate-pulse pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl animate-pulse pointer-events-none" style={{ animationDelay: "1s" }} />

        <div className="max-w-6xl mx-auto px-6 relative z-10">
          <div className="bg-slate-50 border-2 border-zinc-200 hover:border-[#fe5000] p-8 md:p-14 rounded-3xl transition-all duration-500 shadow-xl hover:shadow-2xl hover:shadow-[#fe5000]/10 relative group">
            
            <div className="flex flex-col lg:flex-row items-center gap-10">
              
              {/* Badge Icono Animado */}
              <div className="relative flex-shrink-0">
                <div className="absolute -inset-4 bg-gradient-to-r from-[#fe5000] to-amber-500 rounded-3xl opacity-20 group-hover:opacity-40 blur transition-all duration-500 animate-pulse" />
                <div className="relative bg-white border-2 border-[#fe5000] p-6 rounded-3xl shadow-lg flex items-center justify-center group-hover:scale-105 transition-transform duration-500">
                  <ShieldAlert className="w-16 h-16 text-[#fe5000] animate-bounce" style={{ animationDuration: "3s" }} />
                </div>
              </div>

              {/* Contenido Principal */}
              <div className="space-y-4 text-center lg:text-left flex-1">
                
                <div className="inline-flex items-center gap-2 bg-[#fe5000]/10 border border-[#fe5000]/30 text-[#fe5000] px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest animate-pulse">
                  <BadgeCheck className="w-4 h-4 text-[#fe5000]" /> SELECCIÓN ESTRICTA Y VERIFICACIÓN DE PERFIL
                </div>

                <h2 className="text-3xl md:text-5xl font-black text-zinc-900 tracking-tight leading-tight">
                  No aceptamos ingresos masivos sin evaluación
                </h2>

                <p className="text-zinc-700 text-base md:text-lg leading-relaxed font-medium">
                  En <strong className="text-[#fe5000]">Cuenta Hogar</strong> la confianza es nuestro activo principal. Por este motivo, <strong className="text-zinc-900">cada postulación es sometida a un exhaustivo análisis de antecedentes comerciales, personales y éticos</strong>. Solo aprobamos representantes de probada reputación e integridad para proteger a nuestra comunidad y garantizar un servicio transparente en cada localidad.
                </p>

                {/* 3 Pilares Dinámicos con Iconos */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
                  <div className="bg-white border border-zinc-200 p-4 rounded-2xl flex items-center gap-3 shadow-sm hover:border-[#fe5000] transition-colors">
                    <span className="text-xl">🔍</span>
                    <span className="text-xs font-bold text-zinc-800">Análisis Comercial Riguroso</span>
                  </div>
                  <div className="bg-white border border-zinc-200 p-4 rounded-2xl flex items-center gap-3 shadow-sm hover:border-[#fe5000] transition-colors">
                    <span className="text-xl">🛡️</span>
                    <span className="text-xs font-bold text-zinc-800">Evaluación Ética y Personal</span>
                  </div>
                  <div className="bg-white border border-zinc-200 p-4 rounded-2xl flex items-center gap-3 shadow-sm hover:border-[#fe5000] transition-colors">
                    <span className="text-xl">🏆</span>
                    <span className="text-xs font-bold text-zinc-800">Reputación Local Probada</span>
                  </div>
                </div>

              </div>

            </div>

          </div>
        </div>
      </section>

      {/* BENEFICIOS CLAVE DEL AFILIADO */}
      <section className="py-20 bg-[#121316]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-black text-white mb-3">Ventajas de ser parte de la Red</h2>
            <p className="text-zinc-400 text-sm">Desarrollá tu actividad con el respaldo de herramientas de última generación</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            
            <div className="bg-[#181920] border border-zinc-800 p-8 rounded-3xl space-y-4 hover:border-[#fe5000]/50 transition-colors">
              <div className="bg-[#fe5000]/10 p-3.5 rounded-2xl w-fit text-[#fe5000]">
                <Wallet className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-black text-white">Ingresos Recurrentes</h3>
              <p className="text-zinc-400 text-sm leading-relaxed">
                Generás ganancias continuas por la gestión activa de tu cartera de clientes y el seguimiento puntual en tu localidad.
              </p>
            </div>

            <div className="bg-[#181920] border border-zinc-800 p-8 rounded-3xl space-y-4 hover:border-[#fe5000]/50 transition-colors">
              <div className="bg-[#fe5000]/10 p-3.5 rounded-2xl w-fit text-[#fe5000]">
                <Lock className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-black text-white">Cero Inversión de Capital</h3>
              <p className="text-zinc-400 text-sm leading-relaxed">
                No necesitás disponer de dinero inicial. Cuenta Hogar financia los equipos, asume el stock y gestiona la logística de envío.
              </p>
            </div>

            <div className="bg-[#181920] border border-zinc-800 p-8 rounded-3xl space-y-4 hover:border-[#fe5000]/50 transition-colors">
              <div className="bg-[#fe5000]/10 p-3.5 rounded-2xl w-fit text-[#fe5000]">
                <Building2 className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-black text-white">Panel Digital Exclusivo</h3>
              <p className="text-zinc-400 text-sm leading-relaxed">
                Accedés a tu propia plataforma web en <strong>/afiliado</strong> para registrar solicitudes, controlar cobros y solicitar liquidaciones en tiempo real.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* EL ROL DEL AFILIADO EN 3 PASOS */}
      <section className="py-20 bg-[#181920] border-y border-zinc-800">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-3xl md:text-4xl font-black text-center mb-14 text-white">¿Cómo funciona el trabajo diario?</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            
            <div className="bg-[#121316] p-8 rounded-3xl border border-zinc-800 relative">
              <div className="text-3xl font-black text-[#fe5000] mb-4">01</div>
              <h3 className="text-xl font-black text-white mb-2">Presentás la Solicitud</h3>
              <p className="text-zinc-400 text-sm leading-relaxed">
                Identificás a un interesado en tu comunidad y compartís la propuesta de compra financiada a su medida.
              </p>
            </div>

            <div className="bg-[#121316] p-8 rounded-3xl border border-zinc-800 relative">
              <div className="text-3xl font-black text-[#fe5000] mb-4">02</div>
              <h3 className="text-xl font-black text-white mb-2">Aportás tu Aval Local</h3>
              <p className="text-zinc-400 text-sm leading-relaxed">
                Brindás referencias comerciales y personales del cliente para acompañar el proceso de <em>Scoring Participativo</em>.
              </p>
            </div>

            <div className="bg-[#121316] p-8 rounded-3xl border border-zinc-800 relative">
              <div className="text-3xl font-black text-[#fe5000] mb-4">03</div>
              <h3 className="text-xl font-black text-white mb-2">Seguimiento y Ganancia</h3>
              <p className="text-zinc-400 text-sm leading-relaxed">
                Mantenés el contacto de cobranza y percibís la liquidación de tus comisiones por cada cuota abonada.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* FORMULARIO DE POSTULACIÓN */}
      <section id="postulacion" className="py-24">
        <div className="max-w-3xl mx-auto px-6">
          <div className="bg-[#181920] border border-zinc-800 rounded-3xl p-8 md:p-12 shadow-2xl">
            
            <div className="text-center mb-10 space-y-2">
              <h2 className="text-3xl font-black text-white">Formulario de Postulación de Afiliado</h2>
              <p className="text-zinc-400 text-sm">Completá tus datos para ingresar al proceso de evaluación y verificación.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                <div className="md:col-span-2">
                  <label className="block text-sm text-zinc-300 mb-2 font-bold">Nombre y Apellido Completo</label>
                  <input required value={nombre} onChange={e=>setNombre(e.target.value)} type="text" placeholder="Ej: Juan Pérez" className="w-full bg-[#121316] border border-zinc-800 p-4 rounded-xl text-white outline-none focus:border-[#fe5000] transition-colors text-sm" />
                </div>

                <div>
                  <label className="block text-sm text-zinc-300 mb-2 font-bold">DNI</label>
                  <input required value={dni} onChange={e=>setDni(e.target.value)} type="number" placeholder="Ej: 30123456" className="w-full bg-[#121316] border border-zinc-800 p-4 rounded-xl text-white outline-none focus:border-[#fe5000] transition-colors text-sm" />
                </div>

                <div>
                  <label className="block text-sm text-zinc-300 mb-2 font-bold">
                    CUIT <span className="text-xs text-[#fe5000] font-normal ml-1">(Para facturar liquidaciones)</span>
                  </label>
                  <input required value={cuit} onChange={e=>setCuit(e.target.value)} type="number" placeholder="Ej: 20301234568" className="w-full bg-[#121316] border border-zinc-800 p-4 rounded-xl text-white outline-none focus:border-[#fe5000] transition-colors text-sm" />
                </div>

                <div>
                  <label className="block text-sm text-zinc-300 mb-2 font-bold">WhatsApp de Contacto</label>
                  <input required value={whatsapp} onChange={e=>setWhatsapp(e.target.value)} type="tel" placeholder="Ej: 2355123456" className="w-full bg-[#121316] border border-zinc-800 p-4 rounded-xl text-white outline-none focus:border-[#fe5000] transition-colors text-sm" />
                </div>

                <div>
                  <label className="block text-sm text-zinc-300 mb-2 font-bold">Localidad de Residencia</label>
                  <input required value={localidad} onChange={e=>setLocalidad(e.target.value)} type="text" placeholder="Ej: Lincoln, Zavalía, Chivilcoy, Bragado, Los Toldos..." className="w-full bg-[#121316] border border-zinc-800 p-4 rounded-xl text-white outline-none focus:border-[#fe5000] transition-colors text-sm" />
                </div>

                <div className="md:col-span-2 mt-2 p-4 bg-[#fe5000]/5 border border-zinc-800 rounded-2xl flex gap-3 items-start cursor-pointer hover:bg-[#fe5000]/10 transition-colors" onClick={() => setAceptaCondiciones(!aceptaCondiciones)}>
                  <div className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded flex items-center justify-center border transition-colors ${aceptaCondiciones ? "bg-[#fe5000] border-[#fe5000] text-white" : "border-zinc-600 bg-zinc-800"}`}>
                    {aceptaCondiciones && <CheckSquare className="w-3.5 h-3.5" />}
                  </div>
                  <p className="text-xs text-zinc-300 select-none leading-relaxed">
                    <strong className="text-[#fe5000]">Requisito Ético:</strong> Acepto someter mi perfil a la verificación de antecedentes y me comprometo a aportar información veraz y referencias reales de los clientes solicitantes.
                  </p>
                </div>

              </div>

              <button type="submit" className="w-full flex items-center justify-center gap-2 bg-[#fe5000] hover:bg-[#ff6b1a] text-white font-black text-base py-4 rounded-xl transition-all duration-300 shadow-lg shadow-[#fe5000]/20">
                <Send className="w-5 h-5" /> Enviar solicitud para evaluación
              </button>
            </form>
          </div>
        </div>
      </section>

      <Footer />

    </div>
  );
}
