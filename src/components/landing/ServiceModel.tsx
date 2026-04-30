"use client";
import { MessageSquare, ShoppingBag, Truck } from "lucide-react";

export default function ServiceModel() {
  const steps = [
    {
      icon: <MessageSquare className="w-8 h-8 opacity-80" />,
      title: "1. Vos nos decís qué necesitás",
      desc: "Nos contactás y nos contás qué producto estás buscando gestionar. Sin vueltas."
    },
    {
      icon: <ShoppingBag className="w-8 h-8 opacity-80" />,
      title: "2. Nosotros gestionamos y financiamos",
      desc: "Nos encargamos del trámite de compra y ponemos el capital inicial. Vos solo firmás tu compromiso."
    },
    {
      icon: <Truck className="w-8 h-8 opacity-80" />,
      title: "3. Recibís y disfrutás con respaldo",
      desc: "Te llevamos el equipo a tu casa con nuestro Plan de Soporte Integral incluido. Estamos con vos."
    }
  ];

  return (
    <section className="py-24 bg-white text-[#002B5B]">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-black tracking-tight mb-4">Nuestro Modelo de Mandato</h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">Nosotros nos encargamos del trámite y el respaldo técnico, vos de disfrutarlo.</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          {steps.map((step, i) => (
            <div key={i} className="flex flex-col items-center text-center group">
              <div className="w-20 h-20 rounded-3xl bg-[#002B5B]/5 flex items-center justify-center text-[#002B5B] mb-6 group-hover:bg-[#002B5B] group-hover:text-white transition-all duration-500">
                {step.icon}
              </div>
              <h3 className="text-xl font-bold mb-3">{step.title}</h3>
              <p className="text-gray-600 leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
