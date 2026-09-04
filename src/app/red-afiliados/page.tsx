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
  UserCheck
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
    <div className="min-h-screen bg-[#F7F3EC] text-[#1F2928] font-sans selection:bg-[#173E3B] selection:text-white">
      
      <Header />

      {/* 1. HERO INSTITUCIONAL (FONDO VERDE PETRÓLEO #173E3B) */}
      <section className="relative bg-[#173E3B] text-[#FFFDFC] pt-16 pb-20 lg:pt-24 lg:pb-28 overflow-hidden border-b border-[#173E3B]">
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* COLUMNA IZQUIERDA: TITULAR & ACCESO */}
            <div className="lg:col-span-7 space-y-6 text-left">
              
              <div className="inline-flex items-center gap-2 bg-[#FFFDFC]/10 border border-[#FFFDFC]/20 text-[#E7B86A] px-4 py-1.5 rounded-full text-xs font-heading font-bold uppercase tracking-widest">
                <Users className="w-4 h-4 text-[#E7B86A]" /> RED DE VENDEDORES AFILIADOS
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-[54px] font-heading font-extrabold tracking-tight leading-[1.08] text-[#FFFDFC]">
                La confianza local también forma parte de Cuenta Hogar.
              </h1>

              <p className="text-base sm:text-lg text-[#F7F3EC]/90 font-sans font-normal leading-relaxed max-w-2xl">
                Nuestros vendedores afiliados conocen a las personas de su localidad, acompañan cada solicitud y mantienen una relación cercana durante todo el proceso.
              </p>

              <div className="pt-4">
                <Link 
                  href="/login-afiliado" 
                  className="inline-flex items-center justify-center gap-2.5 bg-[#FFFDFC] hover:bg-[#F7F3EC] text-[#173E3B] font-heading font-bold px-8 py-4 rounded-xl text-xs uppercase tracking-wider transition-all shadow-md"
                >
                  <UserCheck className="w-4 h-4 text-[#173E3B]" />
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
                  <div className="bg-[#173E3B]/95 backdrop-blur-md border border-[#FFFDFC]/20 text-[#FFFDFC] p-4 rounded-xl w-full">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-[#B44E2A] rounded-lg flex items-center justify-center text-white shrink-0 font-bold">
                        <Handshake className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-heading font-bold uppercase text-[#E7B86A] tracking-wider">
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
      <section className="py-20 lg:py-24 bg-[#F7F3EC] border-b border-[#DED8CF]">
        <div className="max-w-6xl mx-auto px-6 space-y-12">
          
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <h2 className="text-3xl sm:text-4xl font-heading font-extrabold text-[#173E3B]">
              Mucho más que acercar una solicitud
            </h2>
            <p className="text-[#68706E] text-base font-sans">
              El rol clave del vendedor afiliado en el desarrollo de la comunidad
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            
            {/* BLOQUE 1: CONOCE AL CLIENTE */}
            <div className="bg-[#FFFDFC] border border-[#DED8CF] p-8 rounded-2xl space-y-4 shadow-xs hover:border-[#173E3B]/40 transition-colors">
              <div className="w-12 h-12 bg-[#F7F3EC] border border-[#DED8CF] rounded-xl flex items-center justify-center text-[#173E3B]">
                <Search className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-heading font-bold text-[#173E3B]">
                CONOCE AL CLIENTE
              </h3>
              <p className="text-sm text-[#68706E] font-sans leading-relaxed">
                Su conocimiento de la localidad y de las personas aporta información valiosa para evaluar cada solicitud.
              </p>
            </div>

            {/* BLOQUE 2: ACOMPAÑA EL PROCESO */}
            <div className="bg-[#FFFDFC] border border-[#DED8CF] p-8 rounded-2xl space-y-4 shadow-xs hover:border-[#173E3B]/40 transition-colors">
              <div className="w-12 h-12 bg-[#F7F3EC] border border-[#DED8CF] rounded-xl flex items-center justify-center text-[#173E3B]">
                <Handshake className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-heading font-bold text-[#173E3B]">
                ACOMPAÑA EL PROCESO
              </h3>
              <p className="text-sm text-[#68706E] font-sans leading-relaxed">
                Es un punto de contacto cercano entre el cliente y Cuenta Hogar durante la gestión de compra y el plan acordado.
              </p>
            </div>

            {/* BLOQUE 3: MANTIENE LA RELACIÓN */}
            <div className="bg-[#FFFDFC] border border-[#DED8CF] p-8 rounded-2xl space-y-4 shadow-xs hover:border-[#173E3B]/40 transition-colors">
              <div className="w-12 h-12 bg-[#F7F3EC] border border-[#DED8CF] rounded-xl flex items-center justify-center text-[#173E3B]">
                <TrendingUp className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-heading font-bold text-[#173E3B]">
                MANTIENE LA RELACIÓN
              </h3>
              <p className="text-sm text-[#68706E] font-sans leading-relaxed">
                Realiza el seguimiento de los clientes de su cartera y participa de la cobranza de las cuotas abonadas.
              </p>
            </div>

          </div>

        </div>
      </section>

      {/* 3. SECCIÓN 3: "Cómo funciona" (PROCESO VISUAL DE 5 PASOS EN SUPERFICIE #FFFDFC) */}
      <section className="py-20 lg:py-28 bg-[#FFFDFC] border-b border-[#DED8CF]">
        <div className="max-w-6xl mx-auto px-6 space-y-16">
          
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <h2 className="text-3xl sm:text-4xl font-heading font-extrabold text-[#173E3B]">
              Cómo funciona
            </h2>
            <p className="text-[#68706E] text-base font-sans">
              El circuito operativo de trabajo diario en 5 pasos claros
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
            
            <div className="bg-[#F7F3EC] border border-[#DED8CF] p-6 rounded-2xl flex flex-col justify-between space-y-4">
              <div>
                <div className="text-2xl font-heading font-extrabold text-[#B44E2A] mb-3">01</div>
                <h4 className="font-heading font-bold text-[#173E3B] text-base mb-2">Detecta una necesidad</h4>
                <p className="text-xs text-[#68706E] font-sans leading-relaxed">
                  El vendedor afiliado conversa con el cliente y transmite a Cuenta Hogar qué producto necesita.
                </p>
              </div>
            </div>

            <div className="bg-[#F7F3EC] border border-[#DED8CF] p-6 rounded-2xl flex flex-col justify-between space-y-4">
              <div>
                <div className="text-2xl font-heading font-extrabold text-[#B44E2A] mb-3">02</div>
                <h4 className="font-heading font-bold text-[#173E3B] text-base mb-2">Cuenta Hogar analiza la solicitud</h4>
                <p className="text-xs text-[#68706E] font-sans leading-relaxed">
                  Con la información disponible y las referencias aportadas, Cuenta Hogar evalúa si puede avanzar con la operación.
                </p>
              </div>
            </div>

            <div className="bg-[#F7F3EC] border border-[#DED8CF] p-6 rounded-2xl flex flex-col justify-between space-y-4">
              <div>
                <div className="text-2xl font-heading font-extrabold text-[#B44E2A] mb-3">03</div>
                <h4 className="font-heading font-bold text-[#173E3B] text-base mb-2">Gestionamos la compra</h4>
                <p className="text-xs text-[#68706E] font-sans leading-relaxed">
                  Una vez aceptada la propuesta y formalizado el mandato de compra, Cuenta Hogar gestiona la adquisición solicitada en Capital Federal.
                </p>
              </div>
            </div>

            <div className="bg-[#F7F3EC] border border-[#DED8CF] p-6 rounded-2xl flex flex-col justify-between space-y-4">
              <div>
                <div className="text-2xl font-heading font-extrabold text-[#B44E2A] mb-3">04</div>
                <h4 className="font-heading font-bold text-[#173E3B] text-base mb-2">Acompaña al cliente</h4>
                <p className="text-xs text-[#68706E] font-sans leading-relaxed">
                  El vendedor afiliado mantiene el vínculo local y realiza el seguimiento durante el período acordado.
                </p>
              </div>
            </div>

            <div className="bg-[#F7F3EC] border border-[#DED8CF] p-6 rounded-2xl flex flex-col justify-between space-y-4">
              <div>
                <div className="text-2xl font-heading font-extrabold text-[#B44E2A] mb-3">05</div>
                <h4 className="font-heading font-bold text-[#173E3B] text-base mb-2">Comisiones por cuotas cobradas</h4>
                <p className="text-xs text-[#68706E] font-sans leading-relaxed">
                  Las comisiones del vendedor afiliado se generan sobre las cuotas efectivamente cobradas.
                </p>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* 4. SECCIÓN 4: INSTITUCIONAL Y SELECTIVA (SIN FORMULARIO NI POSTULACIÓN) */}
      <section className="py-20 lg:py-24 bg-[#173E3B] text-[#FFFDFC] border-b border-[#173E3B]">
        <div className="max-w-4xl mx-auto px-6 text-center space-y-6">
          
          <span className="inline-flex items-center gap-2 bg-[#FFFDFC]/10 border border-[#FFFDFC]/20 text-[#E7B86A] px-4 py-1.5 rounded-full text-xs font-heading font-bold uppercase tracking-widest">
            <ShieldCheck className="w-4 h-4 text-[#E7B86A]" /> INCORPORACIÓN RESPONSABLE
          </span>

          <h2 className="text-3xl sm:text-4xl lg:text-[42px] font-heading font-extrabold tracking-tight leading-tight text-[#FFFDFC]">
            No buscamos vendedores masivamente.<br />
            <span className="text-[#E7B86A]">Buscamos personas de confianza.</span>
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
      <section className="py-20 lg:py-28 bg-[#F7F3EC] border-b border-[#DED8CF]">
        <div className="max-w-6xl mx-auto px-6 space-y-14">
          
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <h2 className="text-3xl sm:text-4xl font-heading font-extrabold text-[#173E3B] leading-tight">
              Vos construís la relación local.<br />
              <span className="text-[#B44E2A]">Cuenta Hogar organiza la operación.</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            
            <div className="bg-[#FFFDFC] border border-[#DED8CF] p-6 rounded-2xl space-y-3 shadow-xs">
              <div className="w-10 h-10 bg-[#F7F3EC] border border-[#DED8CF] rounded-xl flex items-center justify-center text-[#173E3B]">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <h4 className="font-heading font-bold text-[#173E3B] text-base">GESTIÓN DE COMPRA</h4>
              <p className="text-xs text-[#68706E] font-sans leading-relaxed">
                Procesamos las solicitudes y, cuando corresponde, realizamos la compra por mandato del cliente.
              </p>
            </div>

            <div className="bg-[#FFFDFC] border border-[#DED8CF] p-6 rounded-2xl space-y-3 shadow-xs">
              <div className="w-10 h-10 bg-[#F7F3EC] border border-[#DED8CF] rounded-xl flex items-center justify-center text-[#173E3B]">
                <Building2 className="w-5 h-5" />
              </div>
              <h4 className="font-heading font-bold text-[#173E3B] text-base">CENTRO LOGÍSTICO EN CABA</h4>
              <p className="text-xs text-[#68706E] font-sans leading-relaxed">
                Recibimos y organizamos los productos antes de cada recorrido.
              </p>
            </div>

            <div className="bg-[#FFFDFC] border border-[#DED8CF] p-6 rounded-2xl space-y-3 shadow-xs">
              <div className="w-10 h-10 bg-[#F7F3EC] border border-[#DED8CF] rounded-xl flex items-center justify-center text-[#173E3B]">
                <Truck className="w-5 h-5" />
              </div>
              <h4 className="font-heading font-bold text-[#173E3B] text-base">TRANSPORTE PROPIO</h4>
              <p className="text-xs text-[#68706E] font-sans leading-relaxed">
                Coordinamos el traslado y la entrega en las localidades atendidas.
              </p>
            </div>

            <div className="bg-[#FFFDFC] border border-[#DED8CF] p-6 rounded-2xl space-y-3 shadow-xs">
              <div className="w-10 h-10 bg-[#F7F3EC] border border-[#DED8CF] rounded-xl flex items-center justify-center text-[#173E3B]">
                <Smartphone className="w-5 h-5" />
              </div>
              <h4 className="font-heading font-bold text-[#173E3B] text-base">HERRAMIENTAS DIGITALES</h4>
              <p className="text-xs text-[#68706E] font-sans leading-relaxed">
                El vendedor afiliado puede gestionar su cartera y seguimiento desde su panel.
              </p>
            </div>

          </div>

        </div>
      </section>

      {/* 6. SECCIÓN 6: PANEL DE AFILIADO */}
      <section className="py-20 lg:py-24 bg-[#FFFDFC]">
        <div className="max-w-4xl mx-auto px-6 text-center space-y-8">
          
          <div className="space-y-3 max-w-2xl mx-auto">
            <span className="text-xs font-heading font-bold text-[#B44E2A] uppercase tracking-widest">
              PLATAFORMA EXCLUSIVA
            </span>
            <h2 className="text-3xl sm:text-4xl font-heading font-extrabold text-[#173E3B]">
              Todo tu seguimiento en un solo lugar
            </h2>
            <p className="text-base text-[#68706E] font-sans leading-relaxed">
              Desde tu panel podés consultar solicitudes, seguimiento de clientes, cuotas cobradas y liquidaciones.
            </p>
          </div>

          <div className="pt-2">
            <Link 
              href="/login-afiliado" 
              className="inline-flex items-center justify-center gap-2.5 bg-[#173E3B] hover:bg-[#123230] text-white font-heading font-bold px-10 py-5 rounded-2xl text-xs uppercase tracking-wider transition-all shadow-md"
            >
              <UserCheck className="w-5 h-5 text-white" />
              Ingresar a mi panel
            </Link>
          </div>

        </div>
      </section>

      <Footer />

    </div>
  );
}
