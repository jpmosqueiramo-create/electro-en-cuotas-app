import Link from "next/link";
import { ArrowLeft, Handshake, CreditCard, ShieldAlert } from "lucide-react";

export default function NosotrosPage() {
  return (
    <div className="min-h-screen bg-[#FAFAFA] text-zinc-900 font-sans">
      
      {/* NAVBAR SIMPLE */}
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-xl border-b border-yellow-500/10">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center">
          <Link href="/" className="text-gray-600 hover:text-yellow-500 flex items-center gap-2 text-sm transition-colors font-bold">
            <ArrowLeft className="w-5 h-5" /> Volver al inicio
          </Link>
        </div>
      </nav>

      <section className="pt-20 pb-20 max-w-7xl mx-auto px-6">
        <div className="text-center mb-20">
          <h1 className="text-5xl md:text-6xl font-black tracking-tighter mb-6 text-zinc-900">¿En qué te ayudamos?</h1>
          <p className="text-xl md:text-2xl text-yellow-500 font-light max-w-3xl mx-auto">
            No somos un banco ni una cadena de electrodomésticos; somos tus gestores de confianza.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          
          {/* Columna 1 */}
          <div className="bg-gray-50 border border-gray-200 p-8 rounded-3xl flex flex-col items-start hover:border-yellow-500/30 transition-colors">
            <div className="bg-yellow-500/10 p-4 rounded-2xl mb-6">
              <Handshake className="w-10 h-10 text-yellow-500" />
            </div>
            <h3 className="text-2xl font-black mb-4">Gestión de Compra</h3>
            <p className="text-gray-600 leading-relaxed">
              Compramos por vos. Vos nos decís qué equipo querés y nosotros ponemos el capital para comprarlo a tu nombre. Lo buscamos, lo pagamos y te lo llevamos a tu casa.
            </p>
          </div>

          {/* Columna 2 */}
          <div className="bg-gray-50 border border-gray-200 p-8 rounded-3xl flex flex-col items-start hover:border-yellow-500/30 transition-colors">
            <div className="bg-yellow-500/10 p-4 rounded-2xl mb-6">
              <CreditCard className="w-10 h-10 text-yellow-500" />
            </div>
            <h3 className="text-2xl font-black mb-4">Financiación Propia</h3>
            <p className="text-gray-600 leading-relaxed">
              Te damos la facilidad. Analizamos tu situación a sola firma y te armamos un plan de cuotas fijas en pesos. Tu palabra es tu crédito.
            </p>
          </div>

          {/* Columna 3 */}
          <div className="bg-gray-50 border border-gray-200 p-8 rounded-3xl flex flex-col items-start hover:border-yellow-500/30 transition-colors">
            <div className="bg-yellow-500/10 p-4 rounded-2xl mb-6">
              <ShieldAlert className="w-10 h-10 text-yellow-500" />
            </div>
            <h3 className="text-2xl font-black mb-4">Gestión de Soporte Técnico</h3>
            <p className="text-gray-600 leading-relaxed">
              Te respaldamos siempre. Si el equipo falla, no renegás solo. No abrimos los equipos ni hacemos reparaciones técnicas, pero actuamos como tus representantes para gestionar la garantía y mediar directamente con el fabricante o vendedor original.
            </p>
          </div>

        </div>

        <div className="mt-20 max-w-4xl mx-auto bg-[#FAFAFA] border border-yellow-500/20 p-8 md:p-12 rounded-3xl text-center">
          <h4 className="text-2xl font-bold mb-6 text-zinc-900">Nuestro Compromiso:</h4>
          <ul className="text-left md:text-center text-gray-700 space-y-4 font-medium text-lg">
            <li>✓ <strong className="text-yellow-500">Trato directo:</strong> hablás con nuestra Red de Afiliados Independientes, no con máquinas.</li>
            <li>✓ <strong className="text-yellow-500">Sin sorpresas:</strong> cuotas fijas, claras y en pesos desde el primer día.</li>
            <li>✓ <strong className="text-yellow-500">Servicio puerta a puerta:</strong> gestionamos, llevamos y resolvemos sin que salgas de tu casa.</li>
          </ul>
        </div>
      </section>

    </div>
  );
}
