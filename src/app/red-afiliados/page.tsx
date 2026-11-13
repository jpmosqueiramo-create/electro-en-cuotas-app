import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Image from "next/image";
import {
  Users,
  UserCheck,
  MessageSquareText,
  FileSearch,
  ShoppingCart,
  Coins,
  ShieldCheck,
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
    <div className="public-site">

      <Header />
      <main id="contenido">

      {/* 1. HERO DE LA RED DE AFILIADOS */}
      <section className="public-hero public-warm">
          <div className="public-container public-split">
            <div className="public-stack">
              <p className="public-kicker">Red de afiliados</p>
              <h1>Un vínculo local para acercar necesidades a Cuenta Hogar.</h1>
              <p className="public-copy">El vendedor afiliado conoce su localidad, acerca solicitudes y acompaña al cliente. Cuenta Hogar evalúa cada caso, gestiona la compra y organiza la operación.</p>
              <div className="public-actions">
                <a className="public-button" href="#como-funciona">Conocé cómo funciona</a>
                <Link className="public-link" href="/login-afiliado">Ingresar al panel de afiliados</Link>
              </div>
            </div>
            <Image className="public-photo" src="/vendedor-afiliado-atencion.jpg" alt="Atención de la red de vendedores afiliados" width={1024} height={768} sizes="(max-width: 767px) 100vw, 50vw" preload />
          </div>
        </section>

      {/* 2. TU ROL + EL ROL DE CUENTA HOGAR (EXCLUSIVAMENTE DOS BLOQUES CLAROS) */}
      <section className="public-section">
        <div className="public-container space-y-10">

          <div className="text-center max-w-2xl mx-auto space-y-3">
            <h2 className="text-3xl lg:text-4xl font-semibold text-[var(--public-ink)] tracking-tight">
              Vos construís el vínculo local.<br />
              <span className="text-[var(--public-ink)] block mt-1">
                Nosotros resolvemos la operación.
              </span>
            </h2>
            <p className="text-sm sm:text-base text-[var(--public-ink)] leading-relaxed">
              El modelo funciona porque cada parte tiene un rol claro.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 items-stretch">

            {/* BLOQUE 1: EL VENDEDOR AFILIADO */}
            <div className="bg-[var(--public-warm)] border border-[var(--public-line)] hover:border-[var(--public-line)] p-6 sm:p-8 rounded-md space-y-6 duration-200 flex flex-col justify-between">
              <div className="space-y-5">
                <div className="flex items-center gap-3 border-b border-[var(--public-line)] pb-4">
                  <div className="w-10 h-10 bg-transparent border border-[var(--public-line)] rounded-md flex items-center justify-center text-[var(--public-ink)]">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[.875rem] font-bold text-[var(--public-ink)]">ROL LOCAL</span>
                    <h3 className="text-xl font-semibold text-[var(--public-ink)]">El vendedor afiliado</h3>
                  </div>
                </div>

                <ul className="space-y-3.5 text-[.875rem] sm:text-sm text-[var(--public-ink)] font-sans">
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-4 h-4 text-[var(--public-ink)] shrink-0 mt-0.5" />
                    <span>Conoce al cliente y su contexto local.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-4 h-4 text-[var(--public-ink)] shrink-0 mt-0.5" />
                    <span>Detecta la necesidad y acerca la solicitud a Cuenta Hogar.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-4 h-4 text-[var(--public-ink)] shrink-0 mt-0.5" />
                    <span>Mantiene el contacto y la relación de cercanía durante toda la operación.</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* BLOQUE 2: CUENTA HOGAR */}
            <div className="bg-[var(--public-warm)] border border-[var(--public-line)] hover:border-[var(--public-line)] p-6 sm:p-8 rounded-md space-y-6 duration-200 flex flex-col justify-between">
              <div className="space-y-5">
                <div className="flex items-center gap-3 border-b border-[var(--public-line)] pb-4">
                  <div className="w-10 h-10 bg-transparent border border-[var(--public-line)] rounded-md flex items-center justify-center text-[var(--public-ink)]">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[.875rem] font-bold text-[var(--public-ink)]">OPERACIÓN CENTRAL</span>
                    <h3 className="text-xl font-semibold text-[var(--public-ink)]">Cuenta Hogar</h3>
                  </div>
                </div>

                <ul className="space-y-3.5 text-[.875rem] sm:text-sm text-[var(--public-ink)] font-sans">
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-4 h-4 text-[var(--public-ink)] shrink-0 mt-0.5" />
                    <span>Evalúa la solicitud y las referencias disponibles.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-4 h-4 text-[var(--public-ink)] shrink-0 mt-0.5" />
                    <span>Presenta la propuesta comercial y gestiona la compra por mandato en CABA.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-4 h-4 text-[var(--public-ink)] shrink-0 mt-0.5" />
                    <span>Organiza la recepción, logística, entrega en domicilio y administración del plan.</span>
                  </li>
                </ul>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* 3. CÓMO FUNCIONA (TIMELINE DE 5 PASOS SIMPLIFICADA) */}
      <section id="como-funciona" className="public-section scroll-mt-16">
        <div className="public-container space-y-10">

          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <span className="inline-block bg-[var(--public-warm)] border border-[var(--public-line)] text-[var(--public-ink)] text-[.875rem] font-bold px-3.5 py-1.5 rounded-md">
              CÓMO FUNCIONA
            </span>
            <h2 className="text-3xl lg:text-4xl font-semibold text-[var(--public-ink)]">
              De una necesidad a una operación gestionada
            </h2>
            <p className="text-sm sm:text-base text-[var(--public-muted)]">
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
                  <div className={`w-full h-full bg-[var(--public-warm)] border p-4.5 rounded-2xl flex flex-col items-center justify-between space-y-3 transition-all ${
                    item.destacado
                      ? 'border-[#FFD21A]/80 shadow-lg shadow-[#FFD21A]/10'
                      : 'border-[#252A32] group-hover:border-[#FFD21A]/40'
                  }`}>
                    <div className="w-10 h-10 rounded-md bg-[var(--public-warm)] border border-[var(--public-line)] flex items-center justify-center text-[var(--public-ink)] shrink-0">
                      <IconComp className="w-5 h-5" />
                    </div>

                    <div className="space-y-1.5">
                      <h3 className="text-[.875rem] sm:text-sm font-bold text-[var(--public-ink)] leading-snug">
                        {item.titulo}
                      </h3>
                      <p className="text-[.875rem] sm:text-[.875rem] text-[var(--public-muted)] font-sans leading-relaxed">
                        {item.texto}
                      </p>
                    </div>

                    <span className="text-[.875rem] text-[#56616E] pt-2 border-t border-[var(--public-line)] w-full">
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
              return (
                <div key={idx} className={`p-4 sm:p-5 rounded-xl border bg-[var(--public-warm)] flex items-start gap-4 ${
                  item.destacado ? 'border-[#FFD21A]' : 'border-[#252A32]'
                }`}>
                  <div className={`w-9 h-9 rounded-full font-mono font-bold text-xs flex items-center justify-center border shrink-0 ${
                    item.destacado ? 'bg-[#FFD21A] text-[#111318] border-[#FFD21A]' : 'bg-[#161922] text-[#FFD21A] border-[#FFD21A]/40'
                  }`}>
                    {item.paso}
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-[var(--public-ink)] flex items-center gap-2">
                      <span>{item.titulo}</span>
                    </h3>
                    <p className="text-[.875rem] text-[var(--public-muted)] leading-relaxed">
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
      <section className="public-section">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 space-y-10">

          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <span className="inline-block bg-transparent border border-[var(--public-line)] text-[var(--public-ink)] text-[.875rem] font-bold px-3.5 py-1.5 rounded-md">
              RED DE AFILIADOS
            </span>
            <h2 className="text-3xl lg:text-4xl font-semibold text-[var(--public-ink)] tracking-tight">
              Una red que crece a partir de la confianza.
            </h2>
            <p className="text-sm sm:text-base text-[var(--public-ink)] leading-relaxed">
              La incorporación de nuevos vendedores afiliados se evalúa de manera personalizada y generalmente surge de referencias de personas vinculadas a nuestra red.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 items-stretch">

            {/* TARJETA 1: YA SOS VENDEDOR AFILIADO */}
            <div className="bg-[var(--public-warm)] border border-[var(--public-line)] p-6 sm:p-8 rounded-md space-y-6 flex flex-col justify-between">
              <div className="space-y-3">
                <span className="text-[.875rem] font-bold text-[var(--public-ink)] block">
                  YA SOS VENDEDOR AFILIADO
                </span>
                <h3 className="text-xl font-bold text-[var(--public-ink)]">Todo tu seguimiento en un solo lugar</h3>
                <p className="text-[.875rem] sm:text-sm text-[var(--public-muted)] leading-relaxed font-sans">
                  Desde tu panel podés gestionar solicitudes, seguir tu cartera y consultar cuotas abonadas y liquidaciones.
                </p>
              </div>
              <div className="pt-2">
                <Link
                  href="/login-afiliado"
                  className="w-full inline-flex items-center justify-center gap-2 bg-[var(--public-yellow)] hover:bg-[#f2c300] text-[var(--public-black)] font-semibold text-[.875rem] py-4 rounded-md"
                >
                  <UserCheck className="w-4 h-4 text-[var(--public-ink)]" />
                  <span>INGRESAR A MI PANEL</span>
                </Link>
              </div>
            </div>

            {/* TARJETA 2: NUEVAS INCORPORACIONES */}
            <div className="bg-[var(--public-warm)] border border-[var(--public-line)] p-6 sm:p-8 rounded-md space-y-6 flex flex-col justify-between">
              <div className="space-y-3">
                <span className="text-[.875rem] font-bold text-[var(--public-ink)] block">
                  NUEVAS INCORPORACIONES
                </span>
                <h3 className="text-xl font-bold text-[var(--public-ink)]">¿Te recomendaron para incorporarte?</h3>
                <p className="text-[.875rem] sm:text-sm text-[var(--public-muted)] leading-relaxed font-sans">
                  Si llegaste a Cuenta Hogar por recomendación de alguien vinculado a nuestra red, podemos conversar sobre una posible incorporación en tu localidad.
                </p>
              </div>
              <div className="pt-2">
                <a
                  href="https://wa.me/5491125659686?text=Hola%2C%20fui%20recomendado%20por%20un%20integrante%20de%20Cuenta%20Hogar%20y%20me%20gustar%C3%ADa%20conversar%20sobre%20la%20Red%20de%20Vendedores%20Afiliados."
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full inline-flex items-center justify-center gap-2 bg-[var(--public-warm)] hover:bg-[var(--public-warm)] text-[var(--public-ink)] hover:text-[var(--public-ink)] border border-[var(--public-line)] hover:border-[var(--public-line)] font-bold text-[.875rem] py-4 rounded-md"
                >
                  <MessageSquareText className="w-4 h-4 text-[var(--public-ink)]" />
                  <span>CONTACTAR A CUENTA HOGAR</span>
                </a>
              </div>
            </div>

          </div>

          <p className="text-center text-[.875rem] font-sans text-[var(--public-muted)] pt-2">
            La incorporación no es automática y depende de la evaluación de cada caso y localidad.
          </p>

        </div>
      </section>

      </main>
      <Footer />

    </div>
  );
}
