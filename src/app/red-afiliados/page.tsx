import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { 
  Users, 
  Handshake, 
  TrendingUp, 
  Search, 
  Building2, 
  Truck, 
  Smartphone, 
  ShoppingBag, 
  ShieldCheck, 
  UserCheck,
  MessageSquareText,
  FileSearch,
  ShoppingCart,
  Coins,
  ChevronRight,
  ChevronDown
} from "lucide-react";

export const metadata: Metadata = {
  title: "Red de Vendedores Afiliados | Cuenta Hogar",
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
    <div className="min-h-screen bg-[#111318] text-white font-sans selection:bg-[#111318] selection:text-white">
      
      <Header />

      {/* 1. HERO INSTITUCIONAL (FONDO VERDE PETRÓLEO #173E3B) */}
      <section className="relative bg-[#111318] text-[#FFFDFC] pt-16 pb-20 lg:pt-24 lg:pb-28 overflow-hidden border-b border-[#173E3B]">
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* COLUMNA IZQUIERDA: TITULAR & ACCESO */}
            <div className="lg:col-span-7 space-y-6 text-left">
              
              <div className="inline-flex items-center gap-2 bg-[#161922]/10 border border-[#FFFDFC]/20 text-[#FFD21A] px-4 py-1.5 rounded-full text-xs font-heading font-bold uppercase tracking-widest">
                <Users className="w-4 h-4 text-[#FFD21A]" /> RED DE VENDEDORES AFILIADOS
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-[54px] font-heading font-extrabold tracking-tight leading-[1.08] text-white">
                La confianza local también forma parte de <span className="text-[#FFD21A]">Cuenta Hogar.</span>
              </h1>

              <p className="text-base sm:text-lg text-[#F7F3EC]/90 font-sans font-normal leading-relaxed max-w-2xl">
                Nuestros vendedores afiliados conocen a las personas de su localidad, acompañan cada solicitud y mantienen una relación cercana durante todo el proceso.
              </p>

              <div className="pt-4">
                <Link 
                  href="/login-afiliado" 
                  className="inline-flex items-center justify-center gap-2.5 bg-[#161922] hover:bg-[#111318] text-[#FFD21A] font-heading font-bold px-8 py-4 rounded-xl text-xs uppercase tracking-wider transition-all shadow-md"
                >
                  <UserCheck className="w-4 h-4 text-[#FFD21A]" />
                  Ingresar a mi panel
                </Link>
              </div>

            </div>

            {/* COLUMNA DERECHA: FOTOGRAFÍA REAL DE ATENCIÓN / ENTREGA LOCAL */}
            <div className="lg:col-span-5 relative">
              <div className="relative rounded-2xl overflow-hidden border-2 border-[#FFFDFC]/20 shadow-2xl group">
                <img 
                  src="/entrega1.jpg" 
                  alt="Vendedor afiliado y atención local Cuenta Hogar" 
                  className="w-full h-[360px] sm:h-[420px] lg:h-[460px] object-cover group-hover:scale-102 transition-transform duration-700" 
                />
                
                <div className="absolute inset-0 bg-gradient-to-t from-[#173E3B]/90 via-transparent to-transparent flex items-end p-6">
                  <div className="bg-[#111318]/95 backdrop-blur-md border border-[#FFFDFC]/20 text-[#FFFDFC] p-4 rounded-xl w-full">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-[#FFD21A] rounded-lg flex items-center justify-center text-white shrink-0 font-bold">
                        <Handshake className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-heading font-bold uppercase text-[#FFD21A] tracking-wider">
                          Vínculo y Presencia Territorial
                        </p>
                        <p className="text-xs text-[#F7F3EC]/80 font-sans">
                          Atención personalizada de vecino a vecino en cada localidad
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

      {/* 2. SECCIÓN 2: "Mucho más que acercar una solicitud" (FONDO CREMA #F7F3EC) */}
      <section className="py-20 lg:py-24 bg-[#111318] border-b border-[#222530]">
        <div className="max-w-6xl mx-auto px-6 space-y-12">
          
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <h2 className="text-3xl sm:text-4xl font-heading font-extrabold text-[#FFD21A]">
              Mucho más que acercar una solicitud
            </h2>
            <p className="text-[#9CA3AF] text-base font-sans">
              El rol clave del vendedor afiliado en el desarrollo de la comunidad
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            
            {/* BLOQUE 1: CONOCE AL CLIENTE */}
            <div className="bg-[#161922] border border-[#222530] p-8 rounded-2xl space-y-4 shadow-xs hover:border-[#173E3B]/40 transition-colors">
              <div className="w-12 h-12 bg-[#111318] border border-[#222530] rounded-xl flex items-center justify-center text-[#FFD21A]">
                <Search className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-heading font-bold text-[#FFD21A]">
                CONOCE AL CLIENTE
              </h3>
              <p className="text-sm text-[#9CA3AF] font-sans leading-relaxed">
                Su conocimiento de la localidad y de las personas aporta información valiosa para evaluar cada solicitud.
              </p>
            </div>

            {/* BLOQUE 2: ACOMPAÑA EL PROCESO */}
            <div className="bg-[#161922] border border-[#222530] p-8 rounded-2xl space-y-4 shadow-xs hover:border-[#173E3B]/40 transition-colors">
              <div className="w-12 h-12 bg-[#111318] border border-[#222530] rounded-xl flex items-center justify-center text-[#FFD21A]">
                <Handshake className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-heading font-bold text-[#FFD21A]">
                ACOMPAÑA EL PROCESO
              </h3>
              <p className="text-sm text-[#9CA3AF] font-sans leading-relaxed">
                Es un punto de contacto cercano entre el cliente y Cuenta Hogar durante la gestión de compra y el plan acordado.
              </p>
            </div>

            {/* BLOQUE 3: MANTIENE LA RELACIÓN */}
            <div className="bg-[#161922] border border-[#222530] p-8 rounded-2xl space-y-4 shadow-xs hover:border-[#173E3B]/40 transition-colors">
              <div className="w-12 h-12 bg-[#111318] border border-[#222530] rounded-xl flex items-center justify-center text-[#FFD21A]">
                <TrendingUp className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-heading font-bold text-[#FFD21A]">
                MANTIENE LA RELACIÓN
              </h3>
              <p className="text-sm text-[#9CA3AF] font-sans leading-relaxed">
                Realiza el seguimiento de los clientes de su cartera y participa de la cobranza de las cuotas abonadas.
              </p>
            </div>

          </div>

        </div>
      </section>

      {/* 3. SECCIÓN "CÓMO FUNCIONA" - INFOGRAFÍA WEB NATIVA DE 5 PASOS */}
      <section className="py-20 lg:py-28 bg-[#161922] border-b border-[#222530] relative overflow-hidden">
        
        {/* LUZ DE FONDO DECORATIVA */}
        <div className="absolute top-1/2 right-0 w-96 h-96 bg-[#FFD21A]/5 rounded-full blur-3xl pointer-events-none -translate-y-1/2" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-14 sm:space-y-16 relative z-10">
          
          {/* ENCABEZADO */}
          <div className="text-center space-y-4 max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-2 bg-[#111318] border border-[#FFD21A]/30 px-4 py-1.5 rounded-full text-xs font-mono font-bold uppercase tracking-wider text-[#FFD21A] shadow-xs">
              RED DE AFILIADOS
            </div>

            <h2 className="text-4xl sm:text-5xl font-heading font-extrabold tracking-tight">
              <span className="text-[#FFD21A]">Cómo</span> <span className="text-white">funciona</span>
            </h2>

            <p className="text-[#9CA3AF] text-base sm:text-lg font-sans leading-relaxed">
              El circuito operativo de trabajo diario en 5 pasos claros
            </p>
          </div>

          {/* VISTA DESKTOP: INFOGRAFÍA HORIZONTAL CONTINUA CON CONECTORES (lg:block hidden) */}
          <div className="hidden lg:block relative pt-6 pb-4">
            
            {/* LÍNEA ONDULADA / CONECTORA HORIZONTAL DETRÁS DE LOS NODOS */}
            <div className="absolute top-[48px] left-[8%] right-[8%] h-[3px] bg-[#222530] z-0 rounded-full" />
            <div className="absolute top-[48px] left-[8%] right-[8%] h-[3px] bg-gradient-to-r from-[#FFD21A]/40 via-[#FFD21A] to-[#FFD21A] z-0 rounded-full opacity-80" />

            <div className="grid grid-cols-5 gap-4 relative z-10">
              {[
                {
                  paso: "01",
                  titulo: "Detecta una necesidad",
                  texto: "El vendedor afiliado conversa con el cliente y transmite a Cuenta Hogar qué producto necesita.",
                  icon: MessageSquareText,
                  destacado: false
                },
                {
                  paso: "02",
                  titulo: "Cuenta Hogar analiza la solicitud",
                  texto: "Con la información disponible y las referencias aportadas, Cuenta Hogar evalúa si puede avanzar con la operación.",
                  icon: FileSearch,
                  destacado: false
                },
                {
                  paso: "03",
                  titulo: "Gestionamos la compra",
                  texto: "Una vez aceptada la propuesta y formalizado el mandato de compra, Cuenta Hogar gestiona la adquisición solicitada en Capital Federal.",
                  icon: ShoppingCart,
                  destacado: false
                },
                {
                  paso: "04",
                  titulo: "Acompaña al cliente",
                  texto: "El vendedor afiliado mantiene el vínculo local y realiza el seguimiento durante el período acordado.",
                  icon: UserCheck,
                  destacado: false
                },
                {
                  paso: "05",
                  titulo: "Comisiones por cuotas cobradas",
                  texto: "Las comisiones del vendedor afiliado se generan sobre las cuotas que el cliente efectivamente paga por esa compra.",
                  icon: Coins,
                  destacado: true
                }
              ].map((item, idx) => {
                const IconComponent = item.icon;
                return (
                  <div key={idx} className="relative group flex flex-col items-center">
                    
                    {/* FLECHA DE CONEXIÓN ENTRE NODOS EN EL GAP */}
                    {idx < 4 && (
                      <div className="absolute -right-3.5 xl:-right-4 top-[24px] -translate-y-1/2 z-30 pointer-events-none flex items-center justify-center">
                        <div className="w-5 h-5 rounded-full bg-[#161922] border border-[#FFD21A]/40 flex items-center justify-center text-[#FFD21A] shadow-md">
                          <ChevronRight className="w-3 h-3 text-[#FFD21A]" />
                        </div>
                      </div>
                    )}

                    {/* NODO NUMERADO EN EL EJE DEL TIMELINE */}
                    <div className="mb-6 relative">
                      <div className={`w-12 h-12 rounded-full font-mono font-extrabold text-sm flex items-center justify-center border-2 transition-transform duration-300 group-hover:scale-110 shadow-xl ${
                        item.destacado
                          ? 'bg-[#FFD21A] text-[#111318] border-[#FFD21A] ring-4 ring-[#FFD21A]/30 shadow-[#FFD21A]/40'
                          : 'bg-[#111318] text-white border-[#FFD21A]/50 group-hover:border-[#FFD21A] ring-4 ring-[#161922]'
                      }`}>
                        {item.paso}
                      </div>
                    </div>

                    {/* PANEL DE CONTENIDO DE CADA PASO */}
                    <div className={`w-full flex-1 bg-[#111318] border rounded-3xl p-6 text-center flex flex-col items-center justify-between space-y-4 shadow-xl transition-all duration-300 group-hover:border-[#FFD21A]/60 ${
                      item.destacado
                        ? 'border-[#FFD21A]/60 bg-gradient-to-b from-[#111318] via-[#111318] to-[#161922] shadow-2xl shadow-[#FFD21A]/10 ring-1 ring-[#FFD21A]/30'
                        : 'border-[#222530]'
                    }`}>
                      <div className="space-y-4 flex flex-col items-center">
                        {/* ÍCONO CENTRAL EN CÍRCULO */}
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border transition-all duration-300 ${
                          item.destacado
                            ? 'bg-[#FFD21A]/15 border-[#FFD21A] text-[#FFD21A] shadow-lg shadow-[#FFD21A]/20'
                            : 'bg-[#161922] border-[#222530] text-[#FFD21A] group-hover:border-[#FFD21A]/40'
                        }`}>
                          <IconComponent className="w-6 h-6" />
                        </div>

                        {/* TÍTULO Y DIVISOR */}
                        <div className="space-y-2.5">
                          <h3 className="font-heading font-bold text-[#FFD21A] text-sm sm:text-base leading-snug">
                            {item.titulo}
                          </h3>
                          <div className="w-8 h-[2px] bg-[#FFD21A]/40 mx-auto rounded-full" />
                        </div>

                        {/* DESCRIPCIÓN */}
                        <p className="text-xs text-[#9CA3AF] font-sans leading-relaxed">
                          {item.texto}
                        </p>
                      </div>

                      {/* BADGE INFERIOR DE PROCESO */}
                      <div className="pt-3 w-full border-t border-[#222530]/60 text-[10px] font-mono font-bold tracking-wider text-[#9CA3AF]">
                        {item.destacado ? (
                          <span className="text-[#FFD21A] uppercase">COMISIÓN SOBRE CUOTAS COBRADAS</span>
                        ) : (
                          <span>PASO {item.paso} DE 05</span>
                        )}
                      </div>
                    </div>

                  </div>
                );
              })}
            </div>
          </div>

          {/* VISTA MOBILE Y TABLET: TIMELINE VERTICAL CONTINUO (lg:hidden block) */}
          <div className="block lg:hidden relative pl-4 sm:pl-6">
            
            {/* LÍNEA VERTICAL CONTINUA CON DEGRADADO AMARILLO */}
            <div className="absolute left-[23px] sm:left-[31px] top-6 bottom-6 w-[3px] bg-gradient-to-b from-[#FFD21A] via-[#FFD21A] to-[#FFD21A] rounded-full z-0 opacity-80" />

            <div className="space-y-6 relative z-10">
              {[
                {
                  paso: "01",
                  titulo: "Detecta una necesidad",
                  texto: "El vendedor afiliado conversa con el cliente y transmite a Cuenta Hogar qué producto necesita.",
                  icon: MessageSquareText,
                  destacado: false
                },
                {
                  paso: "02",
                  titulo: "Cuenta Hogar analiza la solicitud",
                  texto: "Con la información disponible y las referencias aportadas, Cuenta Hogar evalúa si puede avanzar con la operación.",
                  icon: FileSearch,
                  destacado: false
                },
                {
                  paso: "03",
                  titulo: "Gestionamos la compra",
                  texto: "Una vez aceptada la propuesta y formalizado el mandato de compra, Cuenta Hogar gestiona la adquisición solicitada en Capital Federal.",
                  icon: ShoppingCart,
                  destacado: false
                },
                {
                  paso: "04",
                  titulo: "Acompaña al cliente",
                  texto: "El vendedor afiliado mantiene el vínculo local y realiza el seguimiento durante el período acordado.",
                  icon: UserCheck,
                  destacado: false
                },
                {
                  paso: "05",
                  titulo: "Comisiones por cuotas cobradas",
                  texto: "Las comisiones del vendedor afiliado se generan sobre las cuotas que el cliente efectivamente paga por esa compra.",
                  icon: Coins,
                  destacado: true
                }
              ].map((item, idx) => {
                const IconComponent = item.icon;
                return (
                  <div key={idx} className="relative pl-9 sm:pl-11 flex flex-col">
                    
                    {/* NODO CIRCULAR SOBRE LA LÍNEA VERTICAL */}
                    <div className={`absolute left-0 top-1 -translate-x-1/2 w-9 h-9 sm:w-10 sm:h-10 rounded-full font-mono font-extrabold text-xs sm:text-sm flex items-center justify-center z-10 border-2 shadow-lg ${
                      item.destacado
                        ? 'bg-[#FFD21A] text-[#111318] border-[#FFD21A] ring-4 ring-[#FFD21A]/30'
                        : 'bg-[#111318] text-white border-[#FFD21A]/60 ring-4 ring-[#161922]'
                    }`}>
                      {item.paso}
                    </div>

                    {/* TARJETA DEL PASO EN MOBILE/TABLET */}
                    <div className={`bg-[#111318] border rounded-2xl p-5 space-y-3 shadow-xl ${
                      item.destacado
                        ? 'border-[#FFD21A] bg-gradient-to-r from-[#111318] to-[#161922] ring-1 ring-[#FFD21A]/30'
                        : 'border-[#222530]'
                    }`}>
                      <div className="flex items-center gap-3 border-b border-[#222530] pb-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center border shrink-0 ${
                          item.destacado
                            ? 'bg-[#FFD21A]/20 border-[#FFD21A] text-[#FFD21A]'
                            : 'bg-[#161922] border-[#222530] text-[#FFD21A]'
                        }`}>
                          <IconComponent className="w-5 h-5" />
                        </div>
                        <h3 className="font-heading font-bold text-[#FFD21A] text-sm sm:text-base">
                          {item.titulo}
                        </h3>
                      </div>

                      <p className="text-xs sm:text-sm text-[#9CA3AF] font-sans leading-relaxed">
                        {item.texto}
                      </p>

                      <div className="pt-2 border-t border-[#222530]/60 flex items-center justify-between text-[11px] font-mono text-[#9CA3AF]">
                        <span className={item.destacado ? "text-[#FFD21A] font-bold" : ""}>
                          {item.destacado ? "ETAPA DE COBRO DE COMISIONES" : `Paso ${item.paso} de 05`}
                        </span>
                        {idx < 4 && (
                          <div className="flex items-center gap-1 text-[#FFD21A] text-xs">
                            <span>Siguiente</span>
                            <ChevronDown className="w-3.5 h-3.5 text-[#FFD21A]" />
                          </div>
                        )}
                      </div>
                    </div>

                  </div>
                );
              })}
            </div>

          </div>

        </div>
      </section>

      {/* 4. SECCIÓN 4: INSTITUCIONAL Y SELECTIVA (SIN FORMULARIO NI POSTULACIÓN) */}
      <section className="py-20 lg:py-24 bg-[#111318] text-[#FFFDFC] border-b border-[#173E3B]">
        <div className="max-w-4xl mx-auto px-6 text-center space-y-6">
          
          <span className="inline-flex items-center gap-2 bg-[#161922]/10 border border-[#FFFDFC]/20 text-[#FFD21A] px-4 py-1.5 rounded-full text-xs font-heading font-bold uppercase tracking-widest">
            <ShieldCheck className="w-4 h-4 text-[#FFD21A]" /> INCORPORACIÓN RESPONSABLE
          </span>

          <h2 className="text-3xl sm:text-4xl lg:text-[42px] font-heading font-extrabold tracking-tight leading-tight text-[#FFFDFC]">
            No buscamos vendedores afiliados masivamente.<br />
            <span className="text-[#FFD21A]">Buscamos personas de confianza.</span>
          </h2>

          <div className="space-y-4 text-base sm:text-lg text-[#F7F3EC]/90 font-sans font-normal leading-relaxed max-w-3xl mx-auto pt-2">
            <p>
              La red de Cuenta Hogar crece de manera selectiva. Los nuevos vendedores afiliados suelen incorporarse a través de referencias de personas que ya trabajan con nosotros, clientes o vínculos que conocemos previamente.
            </p>
            <p className="text-sm text-[#F7F3EC]/80">
              Antes de incorporar una nueva localidad o un nuevo vendedor afiliado, evaluamos las referencias, la relación y la posibilidad real de desarrollar esa zona de manera responsable.
            </p>
          </div>

        </div>
      </section>

      {/* 5. SECCIÓN 5: CAPACIDADES OPERATIVAS ("Vos construís la relación local...") */}
      <section className="py-20 lg:py-28 bg-[#111318] border-b border-[#222530]">
        <div className="max-w-6xl mx-auto px-6 space-y-14">
          
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <h2 className="text-3xl sm:text-4xl font-heading font-extrabold text-[#FFD21A] leading-tight">
              Vos construís la relación local.<br />
              <span className="text-[#FFD21A]">Cuenta Hogar organiza la operación.</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            
            <div className="bg-[#161922] border border-[#222530] p-6 rounded-2xl space-y-3 shadow-xs">
              <div className="w-10 h-10 bg-[#111318] border border-[#222530] rounded-xl flex items-center justify-center text-[#FFD21A]">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <h4 className="font-heading font-bold text-[#FFD21A] text-base">GESTIÓN DE COMPRA</h4>
              <p className="text-xs text-[#9CA3AF] font-sans leading-relaxed">
                Procesamos las solicitudes y, cuando corresponde, realizamos la compra por mandato del cliente.
              </p>
            </div>

            <div className="bg-[#161922] border border-[#222530] p-6 rounded-2xl space-y-3 shadow-xs">
              <div className="w-10 h-10 bg-[#111318] border border-[#222530] rounded-xl flex items-center justify-center text-[#FFD21A]">
                <Building2 className="w-5 h-5" />
              </div>
              <h4 className="font-heading font-bold text-[#FFD21A] text-base">CENTRO LOGÍSTICO EN CABA</h4>
              <p className="text-xs text-[#9CA3AF] font-sans leading-relaxed">
                Recibimos y organizamos los productos antes de cada recorrido.
              </p>
            </div>

            <div className="bg-[#161922] border border-[#222530] p-6 rounded-2xl space-y-3 shadow-xs">
              <div className="w-10 h-10 bg-[#111318] border border-[#222530] rounded-xl flex items-center justify-center text-[#FFD21A]">
                <Truck className="w-5 h-5" />
              </div>
              <h4 className="font-heading font-bold text-[#FFD21A] text-base">TRANSPORTE PROPIO</h4>
              <p className="text-xs text-[#9CA3AF] font-sans leading-relaxed">
                Coordinamos el traslado y la entrega en las localidades atendidas.
              </p>
            </div>

            <div className="bg-[#161922] border border-[#222530] p-6 rounded-2xl space-y-3 shadow-xs">
              <div className="w-10 h-10 bg-[#111318] border border-[#222530] rounded-xl flex items-center justify-center text-[#FFD21A]">
                <Smartphone className="w-5 h-5" />
              </div>
              <h4 className="font-heading font-bold text-[#FFD21A] text-base">HERRAMIENTAS DIGITALES</h4>
              <p className="text-xs text-[#9CA3AF] font-sans leading-relaxed">
                El vendedor afiliado puede gestionar su cartera y seguimiento desde su panel.
              </p>
            </div>

          </div>

        </div>
      </section>

      {/* 6. SECCIÓN 6: PANEL DE AFILIADO */}
      <section className="py-20 lg:py-24 bg-[#161922]">
        <div className="max-w-4xl mx-auto px-6 text-center space-y-8">
          
          <div className="space-y-3 max-w-2xl mx-auto">
            <span className="text-xs font-heading font-bold text-[#FFD21A] uppercase tracking-widest">
              PLATAFORMA EXCLUSIVA
            </span>
            <h2 className="text-3xl sm:text-4xl font-heading font-extrabold text-[#FFD21A]">
              Todo tu seguimiento en un solo lugar
            </h2>
            <p className="text-base text-[#9CA3AF] font-sans leading-relaxed">
              Desde tu panel podés consultar solicitudes, seguimiento de clientes, cuotas cobradas y liquidaciones.
            </p>
          </div>

          <div className="pt-2">
            <Link 
              href="/login-afiliado" 
              className="inline-flex items-center justify-center gap-2.5 bg-[#111318] hover:bg-[#123230] text-white font-heading font-bold px-10 py-5 rounded-2xl text-xs uppercase tracking-wider transition-all shadow-md"
            >
              <UserCheck className="w-5 h-5 text-white" />
              Ingresar a mi panel
            </Link>
          </div>

        </div>
      </section>

            {/* MODELO DE INCORPORACIÓN Y ACCESO A LA RED */}
      <section className="py-20 lg:py-24 bg-[#111318] border-b border-[#222530]">
        <div className="max-w-5xl mx-auto px-6 space-y-10">
          
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <span className="inline-block bg-[#161922] border border-[#FFD21A]/30 text-[#FFD21A] font-mono text-xs font-bold uppercase tracking-widest px-3.5 py-1.5 rounded-full">
              RED DE VENDEDORES AFILIADOS
            </span>
            <h2 className="text-3xl sm:text-4xl font-heading font-extrabold text-[#FFD21A]">
              Vínculo Local y Confianza Previa
            </h2>
            <p className="text-sm sm:text-base text-[#9CA3AF] font-sans leading-relaxed">
              Nuestra red comercial se conforma mediante recomendaciones directas y relaciones de confianza en cada localidad.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* AFILIADO ACTUAL */}
            <div className="bg-[#161922] border border-[#222530] p-8 rounded-2xl space-y-4 text-center flex flex-col justify-between shadow-xl">
              <div className="space-y-3">
                <span className="text-xs font-mono font-bold text-[#FFD21A] uppercase block">INTEGRANTE REGISTRADO</span>
                <h3 className="text-xl font-bold text-white">¿Ya sos vendedor afiliado?</h3>
                <p className="text-xs text-[#9CA3AF] leading-relaxed">
                  Accedé a tu panel para gestionar tus solicitudes, realizar el seguimiento de tu cartera y consultar comisiones de cuotas abonadas.
                </p>
              </div>
              <div className="pt-2">
                <Link 
                  href="/login-afiliado" 
                  className="w-full inline-flex items-center justify-center gap-2 bg-[#FFD21A] hover:bg-[#FFE052] text-[#111318] font-bold text-xs uppercase tracking-wider py-3.5 rounded-xl transition-all shadow-md"
                >
                  <UserCheck className="w-4 h-4 text-[#111318]" />
                  <span>INGRESAR A MI PANEL</span>
                </Link>
              </div>
            </div>

            {/* POSIBLE NUEVO AFILIADO RECOMENDADO */}
            <div className="bg-[#161922] border border-[#222530] p-8 rounded-2xl space-y-4 text-center flex flex-col justify-between shadow-xl">
              <div className="space-y-3">
                <span className="text-xs font-mono font-bold text-[#FFD21A] uppercase block">NUEVAS INCORPORACIONES</span>
                <h3 className="text-xl font-bold text-white">¿Fuiste recomendado para incorporarte?</h3>
                <p className="text-xs text-[#9CA3AF] leading-relaxed">
                  Si llegaste a Cuenta Hogar por recomendación de alguien vinculado a nuestra red, podés contactarnos para conversar sobre una posible incorporación en tu localidad.
                </p>
              </div>
              <div className="pt-2">
                <a 
                  href="https://wa.me/5491125659686?text=Hola%2C%20fui%20recomendado%20por%20un%20integrante%20de%20Cuenta%20Hogar%20y%20me%20gustar%C3%ADa%20conversar%20sobre%20la%20Red%20de%20Vendedores%20Afiliados." 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full inline-flex items-center justify-center gap-2 bg-[#111318] hover:bg-[#1A1D26] text-white hover:text-[#FFD21A] border border-[#FFD21A]/40 font-bold text-xs uppercase tracking-wider py-3.5 rounded-xl transition-all shadow-sm"
                >
                  <MessageSquareText className="w-4 h-4 text-[#FFD21A]" />
                  <span>CONTACTAR A CUENTA HOGAR</span>
                </a>
              </div>
            </div>

          </div>

        </div>
      </section>

      <Footer />

    </div>
  );
}
