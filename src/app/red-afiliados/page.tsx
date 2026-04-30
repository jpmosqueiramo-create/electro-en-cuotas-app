"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, UserPlus, ClipboardCheck, Wallet, ChevronDown, CheckSquare, Send } from "lucide-react";

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
      alert("Debes aceptar el compromiso de aportar referencias reales para continuar.");
      return;
    }
    const mensaje = `Hola, quiero postularme como Afiliado Independiente. Soy ${nombre}, DNI ${dni}, CUIT ${cuit}, de ${localidad}. Entiendo y acepto las bases y mi rol en el scoring participativo.`;
    const wame = `https://wa.me/5491125659686?text=${encodeURIComponent(mensaje)}`;
    window.open(wame, "_blank");
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-zinc-900 font-sans selection:bg-yellow-500 selection:text-black">
      
      {/* NAVBAR SIMPLE */}
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-xl border-b border-yellow-500/10">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link href="/" className="text-gray-600 hover:text-yellow-500 flex items-center gap-2 text-sm transition-colors font-bold">
            <ArrowLeft className="w-5 h-5" /> Volver al inicio
          </Link>
          <div className="flex items-center gap-2">
            <span className="text-xl font-black text-zinc-900">CUENTA <span className="text-yellow-500">HOGAR</span></span>
          </div>
        </div>
      </nav>

      {/* 1. HERO RECLUTAMIENTO */}
      <section className="relative overflow-hidden pt-24 pb-24">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-yellow-900/10 via-black to-black -z-10" />
        
        <div className="max-w-7xl mx-auto px-6 flex flex-col items-center text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 text-xs font-bold tracking-widest uppercase mb-8">
            Programa de Afiliados
          </div>
          
          <h1 className="text-5xl md:text-7xl font-black tracking-tighter leading-tight mb-6">
            Armá tu propio negocio<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-yellow-600">
              gestionando soluciones.
            </span>
          </h1>
          
          <p className="text-lg md:text-xl text-gray-600 mb-10 max-w-3xl font-light">
            Sumate a nuestra <strong className="text-zinc-900 font-bold">Red de Afiliados Independientes</strong>. Armá tu propio negocio gestionando soluciones para tus vecinos. Sin inversión inicial, manejando tus tiempos y con el respaldo de Cuenta Hogar.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 items-center">
            <a href="#postulacion" className="group flex items-center gap-2 bg-yellow-500 text-black text-lg font-bold px-8 py-4 rounded-full hover:bg-yellow-400 hover:-translate-y-1 hover:shadow-xl active:scale-95 transition-all duration-300 shadow-md hover:scale-105 shadow-[0_0_30px_rgba(234,179,8,0.3)]">
              Quiero afiliarme hoy <ChevronDown className="w-5 h-5 group-hover:translate-y-1 transition-transform" />
            </a>
            
            <a href="/login-afiliado" className="flex items-center gap-2 bg-white text-zinc-900 border-2 border-gray-200 text-lg font-bold px-8 py-3.5 rounded-full hover:border-yellow-500 hover:text-yellow-600 hover:-translate-y-1 hover:shadow-lg active:scale-95 transition-all duration-300">
              Ya soy afiliado, ingresar a mi panel
            </a>
          </div>
        </div>
      </section>

      {/* 2. CÓMO FUNCIONA EL SISTEMA */}
      <section className="py-24 border-t border-gray-200 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-3xl md:text-4xl font-black text-center mb-16 text-zinc-900">¿Cómo funciona el sistema de Afiliados?</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-[#FAFAFA] p-8 rounded-3xl border border-gray-200 flex flex-col items-start hover:border-yellow-500/30 transition-all shadow-lg relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/5 blur-3xl rounded-full" />
              <div className="bg-yellow-500/10 p-4 rounded-2xl mb-6">
                <UserPlus className="w-8 h-8 text-yellow-500" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-zinc-900">Paso 1: Referenciás</h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                Identificás a un cliente en tu localidad que necesita renovar su tecnología y le compartís el formulario de nuestra plataforma.
              </p>
            </div>

            <div className="bg-[#FAFAFA] p-8 rounded-3xl border border-gray-200 flex flex-col items-start hover:border-yellow-500/30 transition-all shadow-lg relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/5 blur-3xl rounded-full" />
              <div className="bg-yellow-500/10 p-4 rounded-2xl mb-6">
                <ClipboardCheck className="w-8 h-8 text-yellow-500" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-zinc-900">Paso 2: Análisis de Confianza</h3>
              <div className="inline-block bg-yellow-500/20 text-yellow-500 text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded mb-3">Scoring Participativo</div>
              <p className="text-gray-600 text-sm leading-relaxed">
                Realizamos el análisis de riesgo, pero tu conocimiento del cliente es clave. Como Afiliado, aportás referencias comerciales y personales del interesado. Tu aval ayuda a agilizar la aprobación del Plan de Confianza.
              </p>
            </div>

            <div className="bg-[#FAFAFA] p-8 rounded-3xl border border-gray-200 flex flex-col items-start hover:border-yellow-500/30 transition-all shadow-lg relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/5 blur-3xl rounded-full" />
              <div className="bg-yellow-500/10 p-4 rounded-2xl mb-6">
                <Wallet className="w-8 h-8 text-yellow-500" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-zinc-900">Paso 3: Gestionás y Cobrás</h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                Mantenés el contacto con tu cliente para asegurar el pago en término. Por esta gestión activa de cobranza, percibís una comisión recurrente del <strong className="text-yellow-500">15%</strong> sobre cada cuota efectivamente cobrada.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 3. FORMULARIO DE POSTULACIÓN */}
      <section id="postulacion" className="py-24 border-t border-gray-200">
        <div className="max-w-3xl mx-auto px-6">
          <div className="bg-white border border-yellow-500/30 rounded-3xl p-8 md:p-12 shadow-[0_0_40px_rgba(234,179,8,0.1)]">
            
            <div className="text-center mb-10">
              <h2 className="text-3xl font-black text-zinc-900 mb-2">Completá tus datos para sumarte a la red.</h2>
              <p className="text-gray-600">Un miembro de nuestro equipo evaluará tu perfil y se pondrá en contacto.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                <div className="md:col-span-2">
                  <label className="block text-sm text-gray-600 mb-2 font-bold">Nombre y Apellido</label>
                  <input required value={nombre} onChange={e=>setNombre(e.target.value)} type="text" placeholder="Tu nombre completo" className="w-full bg-[#FAFAFA] border border-gray-300 p-4 rounded-xl text-zinc-900 outline-none focus:border-yellow-500 transition-colors" />
                </div>

                <div>
                  <label className="block text-sm text-gray-600 mb-2 font-bold">DNI</label>
                  <input required value={dni} onChange={e=>setDni(e.target.value)} type="number" placeholder="Ej: 30123456" className="w-full bg-[#FAFAFA] border border-gray-300 p-4 rounded-xl text-zinc-900 outline-none focus:border-yellow-500 transition-colors" />
                </div>

                <div>
                  <label className="block text-sm text-gray-600 mb-2 font-bold">
                    CUIT <span className="text-xs text-yellow-500 font-normal ml-1">(Para facturar tus comisiones)</span>
                  </label>
                  <input required value={cuit} onChange={e=>setCuit(e.target.value)} type="number" placeholder="Ej: 20301234568" className="w-full bg-[#FAFAFA] border border-gray-300 p-4 rounded-xl text-zinc-900 outline-none focus:border-yellow-500 transition-colors" />
                </div>

                <div>
                  <label className="block text-sm text-gray-600 mb-2 font-bold">WhatsApp</label>
                  <input required value={whatsapp} onChange={e=>setWhatsapp(e.target.value)} type="tel" placeholder="Código de área + número" className="w-full bg-[#FAFAFA] border border-gray-300 p-4 rounded-xl text-zinc-900 outline-none focus:border-yellow-500 transition-colors" />
                </div>

                <div>
                  <label className="block text-sm text-gray-600 mb-2 font-bold">Localidad</label>
                  <input required value={localidad} onChange={e=>setLocalidad(e.target.value)} type="text" placeholder="Ej: Jesús María, Córdoba" className="w-full bg-[#FAFAFA] border border-gray-300 p-4 rounded-xl text-zinc-900 outline-none focus:border-yellow-500 transition-colors" />
                </div>

                <div className="md:col-span-2 mt-4 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl flex gap-3 items-start cursor-pointer hover:bg-yellow-500/20 transition-colors" onClick={() => setAceptaCondiciones(!aceptaCondiciones)}>
                  <div className={`mt-1 flex-shrink-0 w-6 h-6 rounded flex items-center justify-center border-2 transition-colors \${aceptaCondiciones ? 'bg-yellow-500 border-yellow-500 text-black' : 'border-gray-500'}`}>
                    {aceptaCondiciones && <CheckSquare className="w-4 h-4" />}
                  </div>
                  <p className="text-sm text-gray-700 font-medium select-none">
                    <strong className="text-yellow-500">Obligatorio:</strong> Entiendo que deberé aportar y validar referencias reales de mis clientes para el scoring.
                  </p>
                </div>

              </div>

              <button type="submit" className="w-full group flex items-center justify-center gap-2 bg-yellow-500 text-black font-black text-lg py-5 rounded-xl hover:bg-yellow-400 hover:-translate-y-1 hover:shadow-xl active:scale-95 transition-all duration-300 shadow-md mt-4">
                <Send className="w-5 h-5" /> Enviar solicitud de afiliación
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* 4. SECCIÓN LEGAL (LETR CHICA) Y FOOTER */}
      <footer className="border-t border-gray-200 bg-white py-16">
        <div className="max-w-5xl mx-auto px-6">
          
          <div className="mb-12">
            <h4 className="text-gray-600 font-bold uppercase tracking-widest text-xs mb-6 text-center border-b border-gray-200 pb-4">Bases, Condiciones y Términos Legales de Afiliación</h4>
            <div className="space-y-4 text-[11px] text-gray-500 text-justify leading-relaxed column-count-1 md:columns-2 gap-8">
              
              <p>
                <strong className="text-gray-700">Naturaleza del Vínculo:</strong> La relación es estrictamente comercial y civil. Bajo ninguna circunstancia existirá relación de dependencia, subordinación jurídica, técnica ni económica entre el Afiliado y Cuenta Hogar SRL.
              </p>
              
              <p>
                <strong className="text-gray-700">Derecho de Admisión y Baja:</strong> Cuenta Hogar SRL se reserva el derecho de admisión y el derecho de suspender o dar de baja a cualquier Afiliado de forma unilateral, sin invocación de causa, sin previo aviso y sin derecho a reclamo o indemnización alguna.
              </p>
              
              <p>
                <strong className="text-gray-700">Condiciones de Comisión:</strong> El cobro del 15% está sujeto a la gestión activa y acreditación de fondos. Si el cliente entra en mora y el Afiliado no regulariza el pago, obligando a Cuenta Hogar SRL a intervenir directamente, el Afiliado perderá automáticamente el derecho a percibir la comisión de esa cuota y de todas las futuras de dicho contrato.
              </p>
              
              <p>
                <strong className="text-gray-700">Responsabilidad sobre Referencias:</strong> El Afiliado debe aportar información veraz. La detección de referencias falsas o colusión para obtener un plan será causal de baja inmediata. El Afiliado no es responsable patrimonial por la morosidad del cliente, salvo demostración de dolo o falsedad ideológica en las referencias.
              </p>
              
              <p>
                <strong className="text-gray-700">Obligaciones Fiscales:</strong> El Afiliado es responsable de su situación tributaria. La emisión de factura es requisito excluyente para el cobro.
              </p>
              
              <p>
                <strong className="text-gray-700">Código de Conducta:</strong> Prohibido el uso de extorsiones o métodos abusivos para el cobro. El Afiliado asume total responsabilidad civil y penal por su accionar, manteniendo indemne a Cuenta Hogar SRL.
              </p>
            </div>
          </div>

          <div className="pt-8 border-t border-gray-200 text-center text-gray-600 text-xs space-y-2">
            <p className="font-bold text-gray-600">Cuenta Hogar SRL | CUIT: 30-00000000-0 | Domicilio Legal: Av. Ejemplo 123, CABA, Argentina</p>
            <p>Cuenta Hogar SRL presta servicios de gestión administrativa y financiación propia. No realizamos intermediación financiera en los términos de la Ley de Entidades Financieras.</p>
          </div>
          
        </div>
      </footer>

    </div>
  );
}
