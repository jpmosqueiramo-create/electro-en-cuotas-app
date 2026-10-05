import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { 
  Users, 
  UserCheck,
  MessageSquareText,
  FileSearch,
  ShoppingCart,
  Coins,
  ChevronRight,
  ChevronDown,
  ArrowRight,
  ShieldCheck,
  Handshake,
  Building2,
  CheckCircle2
} from "lucide-react";

export const metadata: Metadata = {
  title: { absolute: "Red de Afiliados | Cuenta Hogar" },
  description: "Conocé la Red de Vendedores Afiliados de Cuenta Hogar. Presencia territorial, acompañamiento cercano y confianza local en cada localidad.",
  keywords: [
    "Vendedor Afiliado Cuenta Hogar",
    "Red de Vendedores Afiliados",
    "confianza local cuenta hogar",
    "gestion de compras mandato"
  ]
};

export default function RedAfiliadosPage() {
  return (
    <div className="min-h-screen bg-[#111318] text-white font-sans selection:bg-[#FFD21A] selection:text-black">
      
      <Header />

      {/* 1. HERO DE LA RED DE AFILIADOS */}
      <section className="relative overflow-hidden pt-12 pb-16 lg:pt-20 lg:pb-24 border-b border-[#222530] bg-[#111318]">
        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-[#FFD21A]/5 via-transparent to-transparent pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
            
            {/* COLUMNA IZQUIERDA: MENSAJE E IDENTIFICACIÓN */}
            <div className="lg:col-span-7 space-y-6 text-left">
              
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#FFD21A]/10 border border-[#FFD21A]/30 text-[#FFD21A] text-xs font-mono font-bold tracking-wide">
                <Users className="w-3.5 h-3.5" /> RED DE AFILIADOS · PRESENCIA LOCAL
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-[46px] font-extrabold tracking-tight leading-[1.12] text-white">
                Un vínculo local para acercar<br />
                <span className="text-[#FFD21A] block mt-1">
                  necesidades a Cuenta Hogar.
                </span>
              </h1>

              <p className="text-base sm:text-lg text-[#D1D5DB] font-normal leading-relaxed max-w-2xl">
                El vendedor afiliado conoce su localidad, acerca solicitudes y acompaña al cliente. Cuenta Hogar evalúa cada caso, gestiona la compra y organiza la operación.
              </p>

              {/* BOTONERA DE CTAs DEL HERO */}
              <div className="pt-2 flex flex-col sm:flex-row gap-3.5 items-stretch sm:items-center">
                <a 
                  href="#como-funciona" 
                  className="inline-flex items-center justify-center gap-2 bg-[#FFD21A] hover:bg-[#FFE052] text-[#111318] text-xs sm:text-sm font-extrabold uppercase tracking-wider px-7 h-[50px] rounded-xl transition-all shadow-lg shadow-[#FFD21A]/20 transform active:scale-95 shrink-0"
                >
                  <span>CONOCER CÓMO FUNCIONA</span>
                  <ArrowRight className="w-4.5 h-4.5 text-[#111318]" />
                </a>

                <Link 
                  href="/login-afiliado" 
                  className="inline-flex items-center justify-center gap-2 bg-[#1A1D26] hover:bg-[#252A37] text-[#FFFDFC] hover:text-[#FFD21A] border border-[#4B5563] hover:border-[#FFD21A]/60 text-xs sm:text-sm font-bold uppercase tracking-wider px-7 h-[50px] rounded-xl transition-all shrink-0 shadow-sm"
                >
                  <UserCheck className="w-4.5 h-4.5 text-[#FFD21A]" />
                  <span>YA SOY AFILIADO · INGRESAR AL PANEL</span>
                </Link>
              </div>

            </div>

            {/* COLUMNA DERECHA: FOTOGRAFÍA DE ATENCIÓN Y VÍNCULO LOCAL */}
            <div className="lg:col-span-5 relative">
              <div className="relative rounded-2xl overflow-hidden border border-[#2D323E] bg-[#161922] shadow-2xl group">
                <img 
                  src="/vendedor-afiliado-atencion.jpg" 
                  alt="Vendedora afiliada de Cuenta Hogar brindando atención y asesoramiento local" 
                  className="w-full h-[320px] sm:h-[400px] lg:h-[440px] object-cover group-hover:scale-102 transition-transform duration-700" 
                />
                
                <div className="absolute inset-0 bg-gradient-to-t from-[#111318]/90 via-transparent to-transparent flex items-end p-5">
                  <div className="bg-[#161922]/95 border border-[#374151] text-white p-4 rounded-xl w-full backdrop-blur-md shadow-md">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-[#FFD21A]/10 border border-[#FFD21A]/40 rounded-lg flex items-center justify-center text-[#FFD21A] shrink-0 font-bold">
                        <Handshake className="w-5 h-5" />
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-xs font-mono font-bold uppercase text-[#FFD21A] tracking-wider">
                          VÍNCLO Y CONFIANZA LOCAL
                        </p>
                        <p className="text-xs text-[#D1D5DB] font-sans">
                          Atención de persona a persona en cada comunidad
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 2. TU ROL + EL ROL DE CUENTA HOGAR (EXCLUSIVAMENTE DOS BLOQUES CLAROS) */}
      <section className="py-16 lg:py-20 bg-[#0E1015] border-b border-[#222530]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-10">
          
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <h2 className="text-3xl lg:text-4xl font-extrabold text-white tracking-tight">
              Vos construís el vínculo local.<br />
              <span className="text-[#FFD21A] block mt-1">
                Nosotros resolvemos la operación.
              </span>
            </h2>
            <p className="text-sm sm:text-base text-[#D1D5DB] leading-relaxed">
              El modelo funciona porque cada parte tiene un rol claro.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 items-stretch">
            
            {/* BLOQUE 1: EL VENDEDOR AFILIADO */}
            <div className="bg-[#161922] border border-[#252A32] hover:border-[#FFD21A]/50 p-6 sm:p-8 rounded-2xl space-y-6 transition-all duration-200 shadow-xl flex flex-col justify-between">
              <div className="space-y-5">
                <div className="flex items-center gap-3 border-b border-[#252A32] pb-4">
                  <div className="w-10 h-10 bg-[#FFD21A]/10 border border-[#FFD21A]/40 rounded-xl flex items-center justify-center text-[#FFD21A]">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#FFD21A]">ROL LOCAL</span>
                    <h3 className="text-xl font-extrabold text-white">EL VENDEDOR AFILIADO</h3>
                  </div>
                </div>

                <ul className="space-y-3.5 text-xs sm:text-sm text-[#D1D5DB] font-sans">
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-4 h-4 text-[#FFD21A] shrink-0 mt-0.5" />
                    <span>Conoce al cliente y su contexto local.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-4 h-4 text-[#FFD21A] shrink-0 mt-0.5" />
                    <span>Detecta la necesidad y acerca la solicitud a Cuenta Hogar.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-4 h-4 text-[#FFD21A] shrink-0 mt-0.5" />
                    <span>Mantiene el contacto y la relación de cercanía durante toda la operación.</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* BLOQUE 2: CUENTA HOGAR */}
            <div className="bg-[#161922] border border-[#252A32] hover:border-[#FFD21A]/50 p-6 sm:p-8 rounded-2xl space-y-6 transition-all duration-200 shadow-xl flex flex-col justify-between">
              <div className="space-y-5">
                <div className="flex items-center gap-3 border-b border-[#252A32] pb-4">
                  <div className="w-10 h-10 bg-[#FFD21A]/10 border border-[#FFD21A]/40 rounded-xl flex items-center justify-center text-[#FFD21A]">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#FFD21A]">OPERACIÓN CENTRAL</span>
                    <h3 className="text-xl font-extrabold text-white">CUENTA HOGAR</h3>
                  </div>
                </div>

                <ul className="space-y-3.5 text-xs sm:text-sm text-[#D1D5DB] font-sans">
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-4 h-4 text-[#FFD21A] shrink-0 mt-0.5" />
                    <span>Evalúa la solicitud y las referencias disponibles.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-4 h-4 text-[#FFD21A] shrink-0 mt-0.5" />
                    <span>Presenta la propuesta comercial y gestiona la compra por mandato en CABA.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-4 h-4 text-[#FFD21A] shrink-0 mt-0.5" />
                    <span>Organiza la recepción, logística, entrega en domicilio y administración del plan.</span>
                  </li>
                </ul>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* 3. CÓMO FUNCIONA (TIMELINE DE 5 PASOS SIMPLIFICADA) */}
      <section id="como-funciona" className="py-16 lg:py-20 bg-[#161922] border-b border-[#222530] scroll-mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-10">
          
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <span className="inline-block bg-[#111318] border border-[#FFD21A]/30 text-[#FFD21A] font-mono text-xs font-bold uppercase tracking-wider px-3.5 py-1.5 rounded-full">
              CÓMO FUNCIONA
            </span>
            <h2 className="text-3xl lg:text-4xl font-extrabold text-white">
              De una necesidad a una operación gestionada
            </h2>
            <p className="text-sm sm:text-base text-[#9CA3AF]">
              Cinco pasos simples para entender el rol del vendedor afiliado.
            </p>
          </div>

          {/* VISTA DESKTOP: TIMELINE HORIZONTAL COMPACTA (lg:grid) */}
          <div className="hidden lg:grid grid-cols-5 gap-4 relative pt-4">
            
            <div className="absolute top-[38px] left-[10%] right-[10%] h-[2px] bg-[#2A2E3D] z-0" />

            {[
              {
                paso: "01",
                titulo: "Detectás una necesidad",
                texto: "Conversás con el cliente y nos contás qué necesita.",
                icon: MessageSquareText
              },
              {
                paso: "02",
                titulo: "Acercás la solicitud",
                texto: "Nos enviás la información y las referencias disponibles.",
                icon: FileSearch
              },
              {
                paso: "03",
                titulo: "Cuenta Hogar evalúa",
                texto: "Analizamos el caso y, si corresponde, presentamos una propuesta.",
                icon: ShieldCheck
              },
              {
                paso: "04",
                titulo: "Gestionamos y vos acompañás",
                texto: "Si el cliente acepta, formalizamos la operación. Cuenta Hogar la gestiona y vos mantenés el vínculo local.",
                icon: ShoppingCart
              },
              {
                paso: "05",
                titulo: "Generás comisiones",
                texto: "Las comisiones se generan sobre las cuotas que el cliente efectivamente paga por esa compra.",
                icon: Coins,
                destacado: true
              }
            ].map((item, idx) => {
              const IconComp = item.icon;
              return (
                <div key={idx} className="relative z-10 flex flex-col items-center text-center group">
                  
                  {/* NODO NUMERADO */}
                  <div className={`w-10 h-10 rounded-full font-mono font-bold text-xs flex items-center justify-center border-2 mb-4 transition-transform group-hover:scale-105 shadow-md ${
                    item.destacado 
                      ? 'bg-[#FFD21A] text-[#111318] border-[#FFD21A]' 
                      : 'bg-[#111318] text-white border-[#FFD21A]/50'
                  }`}>
                    {item.paso}
                  </div>

                  {/* TARJETA */}
                  <div className={`w-full h-full bg-[#111318] border p-4.5 rounded-2xl flex flex-col items-center justify-between space-y-3 transition-all ${
                    item.destacado 
                      ? 'border-[#FFD21A]/80 shadow-lg shadow-[#FFD21A]/10' 
                      : 'border-[#252A32] group-hover:border-[#FFD21A]/40'
                  }`}>
                    <div className="w-10 h-10 rounded-xl bg-[#161922] border border-[#2A2E3D] flex items-center justify-center text-[#FFD21A] shrink-0">
                      <IconComp className="w-5 h-5" />
                    </div>

                    <div className="space-y-1.5">
                      <h3 className="text-xs sm:text-sm font-bold text-white leading-snug">
                        {item.titulo}
                      </h3>
                      <p className="text-[11px] sm:text-xs text-[#9CA3AF] font-sans leading-relaxed">
                        {item.texto}
                      </p>
                    </div>

                    <span className="text-[10px] font-mono text-[#56616E] pt-2 border-t border-[#222530] w-full">
                      PASO {item.paso} DE 05
                    </span>
                  </div>

                </div>
              );
            })}
          </div>

          {/* VISTA MOBILE: TIMELINE VERTICAL (lg:hidden) */}
          <div className="block lg:hidden space-y-4">
            {[
              {
                paso: "01",
                titulo: "Detectás una necesidad",
                texto: "Conversás con el cliente y nos contás qué necesita.",
                icon: MessageSquareText
              },
              {
                paso: "02",
                titulo: "Acercás la solicitud",
                texto: "Nos enviás la información y las referencias disponibles.",
                icon: FileSearch
              },
              {
                paso: "03",
                titulo: "Cuenta Hogar evalúa",
                texto: "Analizamos el caso y, si corresponde, presentamos una propuesta.",
                icon: ShieldCheck
              },
              {
                paso: "04",
                titulo: "Gestionamos y vos acompañás",
                texto: "Si el cliente acepta, formalizamos la operación. Cuenta Hogar la gestiona y vos mantenés el vínculo local.",
                icon: ShoppingCart
              },
              {
                paso: "05",
                titulo: "Generás comisiones",
                texto: "Las comisiones se generan sobre las cuotas que el cliente efectivamente paga por esa compra.",
                icon: Coins,
                destacado: true
              }
            ].map((item, idx) => {
              const IconComp = item.icon;
              return (
                <div key={idx} className={`p-4 sm:p-5 rounded-xl border bg-[#111318] flex items-start gap-4 ${
                  item.destacado ? 'border-[#FFD21A]' : 'border-[#252A32]'
                }`}>
                  <div className={`w-9 h-9 rounded-full font-mono font-bold text-xs flex items-center justify-center border shrink-0 ${
                    item.destacado ? 'bg-[#FFD21A] text-[#111318] border-[#FFD21A]' : 'bg-[#161922] text-[#FFD21A] border-[#FFD21A]/40'
                  }`}>
                    {item.paso}
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <span>{item.titulo}</span>
                    </h3>
                    <p className="text-xs text-[#9CA3AF] leading-relaxed">
                      {item.texto}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

        </div>
      </section>

      {/* 4. INCORPORACIÓN + PANEL (SECCIÓN DE CIERRE DE DOS CAMINOS) */}
      <section className="py-16 lg:py-20 bg-[#111318] border-b border-[#222530]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 space-y-10">
          
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <span className="inline-block bg-[#FFD21A]/10 border border-[#FFD21A]/30 text-[#FFD21A] font-mono text-xs font-bold uppercase tracking-wider px-3.5 py-1.5 rounded-full">
              RED DE AFILIADOS
            </span>
            <h2 className="text-3xl lg:text-4xl font-extrabold text-white tracking-tight">
              Una red que crece a partir de la confianza.
            </h2>
            <p className="text-sm sm:text-base text-[#D1D5DB] leading-relaxed">
              La incorporación de nuevos vendedores afiliados se evalúa de manera personalizada y generalmente surge de referencias de personas vinculadas a nuestra red.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 items-stretch">
            
            {/* TARJETA 1: YA SOS VENDEDOR AFILIADO */}
            <div className="bg-[#161922] border border-[#252A32] p-6 sm:p-8 rounded-2xl space-y-6 flex flex-col justify-between shadow-xl">
              <div className="space-y-3">
                <span className="text-[10px] font-mono font-bold text-[#FFD21A] uppercase tracking-widest block">
                  YA SOS VENDEDOR AFILIADO
                </span>
                <h3 className="text-xl font-bold text-white">Todo tu seguimiento en un solo lugar</h3>
                <p className="text-xs sm:text-sm text-[#9CA3AF] leading-relaxed font-sans">
                  Desde tu panel podés gestionar solicitudes, seguir tu cartera y consultar cuotas abonadas y liquidaciones.
                </p>
              </div>
              <div className="pt-2">
                <Link 
                  href="/login-afiliado" 
                  className="w-full inline-flex items-center justify-center gap-2 bg-[#FFD21A] hover:bg-[#FFE052] text-[#111318] font-extrabold text-xs uppercase tracking-wider py-4 rounded-xl transition-all shadow-md active:scale-95"
                >
                  <UserCheck className="w-4 h-4 text-[#111318]" />
                  <span>INGRESAR A MI PANEL</span>
                </Link>
              </div>
            </div>

            {/* TARJETA 2: NUEVAS INCORPORACIONES */}
            <div className="bg-[#161922] border border-[#252A32] p-6 sm:p-8 rounded-2xl space-y-6 flex flex-col justify-between shadow-xl">
              <div className="space-y-3">
                <span className="text-[10px] font-mono font-bold text-[#FFD21A] uppercase tracking-widest block">
                  NUEVAS INCORPORACIONES
                </span>
                <h3 className="text-xl font-bold text-white">¿Te recomendaron para incorporarte?</h3>
                <p className="text-xs sm:text-sm text-[#9CA3AF] leading-relaxed font-sans">
                  Si llegaste a Cuenta Hogar por recomendación de alguien vinculado a nuestra red, podemos conversar sobre una posible incorporación en tu localidad.
                </p>
              </div>
              <div className="pt-2">
                <a 
                  href="https://wa.me/5491125659686?text=Hola%2C%20fui%20recomendado%20por%20un%20integrante%20de%20Cuenta%20Hogar%20y%20me%20gustar%C3%ADa%20conversar%20sobre%20la%20Red%20de%20Vendedores%20Afiliados." 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full inline-flex items-center justify-center gap-2 bg-[#1A1D26] hover:bg-[#252A37] text-white hover:text-[#FFD21A] border border-[#4B5563] hover:border-[#FFD21A]/60 font-bold text-xs uppercase tracking-wider py-4 rounded-xl transition-all shadow-sm active:scale-95"
                >
                  <MessageSquareText className="w-4 h-4 text-[#FFD21A]" />
                  <span>CONTACTAR A CUENTA HOGAR</span>
                </a>
              </div>
            </div>

          </div>

          <p className="text-center text-xs font-sans text-[#9CA3AF] pt-2">
            La incorporación no es automática y depende de la evaluación de cada caso y localidad.
          </p>

        </div>
      </section>

      <Footer />

    </div>
  );
}
