"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Send, Sparkles } from "lucide-react";
import { db } from "@/lib/firebase";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";

export default function ArrepentimientoPage() {
  const router = useRouter();
  const [nombreCompleto, setNombreCompleto] = useState("");
  const [dni, setDni] = useState("");
  const [email, setEmail] = useState("");
  const [telefono, setTelefono] = useState("");
  const [producto, setProducto] = useState("");
  const [fechaCompra, setFechaCompra] = useState("");
  const [mensaje, setMensaje] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [ticketId, setTicketId] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombreCompleto || !dni || !email || !telefono || !producto) {
      alert("Por favor completa todos los campos obligatorios.");
      return;
    }

    setSubmitting(true);
    try {
      const docRef = await addDoc(collection(db, "arrepentimientos"), {
        nombreCompleto,
        dni: dni.replace(/\D/g, ""),
        email: email.trim().toLowerCase(),
        telefono: telefono.trim(),
        producto,
        fechaCompra,
        mensaje,
        estado: "PENDIENTE",
        fechaCreacion: serverTimestamp(),
      });
      setTicketId(docRef.id);
    } catch (err) {
      console.error(err);
      alert("Ocurrió un error al procesar tu solicitud. Por favor intenta de nuevo.");
    } finally {
      setSubmitting(false);
    }
  };

  if (ticketId) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-zinc-900/50 border border-yellow-500/20 p-8 rounded-3xl text-center space-y-6 shadow-2xl backdrop-blur-md">
          <div className="text-6xl">📥</div>
          <div className="space-y-2">
            <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-amber-500 uppercase tracking-wide">
              Solicitud Recibida
            </h2>
            <p className="text-zinc-400 text-xs leading-relaxed">
              De conformidad con el Art. 34 de la Ley N° 24.240 de Defensa del Consumidor, se ha registrado formalmente tu revocación de aceptación.
            </p>
          </div>

          <div className="bg-zinc-950/80 p-4 rounded-xl border border-zinc-850 font-mono text-xs text-left space-y-2.5">
            <div className="flex justify-between border-b border-zinc-900 pb-2">
              <span className="text-zinc-500">Nro. de Gestión:</span>
              <span className="text-yellow-400 font-bold">{ticketId}</span>
            </div>
            <div className="flex justify-between border-b border-zinc-900 pb-2">
              <span className="text-zinc-500">Cliente:</span>
              <span className="text-white font-bold">{nombreCompleto}</span>
            </div>
            <div className="flex justify-between border-b border-zinc-900 pb-2">
              <span className="text-zinc-500">DNI:</span>
              <span className="text-white font-bold">{dni}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Producto:</span>
              <span className="text-white font-bold truncate max-w-[180px]">{producto}</span>
            </div>
          </div>

          <div className="text-xs text-zinc-500 italic bg-yellow-500/5 p-3.5 rounded-lg border border-yellow-500/10 text-left">
            🚩 <strong>Información importante:</strong> Nos contactaremos con vos dentro de las próximas 24 a 48 horas hábiles para coordinar la rescisión del plan y la entrega/devolución del equipo sin cargo.
          </div>

          <button
            onClick={() => router.push("/")}
            className="w-full bg-yellow-500 hover:bg-yellow-400 text-black py-3.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all duration-300 hover:shadow-lg"
          >
            Volver al inicio
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-yellow-500 selection:text-black">
      
      {/* NAVBAR */}
      <nav className="sticky top-0 z-50 bg-zinc-900/90 backdrop-blur-xl border-b border-zinc-850">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link href="/" className="text-zinc-400 hover:text-yellow-400 flex items-center gap-2 text-sm transition-colors font-bold">
            <ArrowLeft className="w-5 h-5" /> Volver al inicio
          </Link>
          <div className="flex items-center gap-2">
            <img src="https://storage.googleapis.com/negocio-facil-page.firebasestorage.app/Logos/LOGO%20SIN%20NOMBRE%20-%20CUENTA%20HOGAR.png" alt="Cuenta Hogar Logo" className="h-10 w-auto object-contain" />
            <span className="font-mono text-xs uppercase tracking-widest font-black text-zinc-500 hidden sm:inline">Portal Legal</span>
          </div>
        </div>
      </nav>

      {/* HEADER SECTION */}
      <div className="max-w-3xl mx-auto px-6 pt-12 pb-24 space-y-12">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 bg-yellow-500/15 text-yellow-400 px-3.5 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" /> Defensa del Consumidor
          </div>
          <h1 className="text-4xl sm:text-5xl font-black uppercase tracking-tight text-white leading-none">
            Botón de <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-amber-500">Arrepentimiento</span>
          </h1>
          <p className="text-zinc-400 text-sm max-w-xl mx-auto leading-relaxed">
            De acuerdo con la legislación argentina, podés revocar la aceptación del servicio dentro de los 10 días corridos contados a partir de la firma del contrato o de la entrega del producto.
          </p>
        </div>

        {/* FORM */}
        <div className="bg-zinc-900/30 backdrop-blur-xl border border-zinc-850 rounded-3xl p-6 sm:p-10 shadow-2xl space-y-8">
          <div>
            <h2 className="text-lg font-black text-white uppercase tracking-wider">Formulario de Revocación</h2>
            <p className="text-zinc-500 text-xs mt-1">Completa los datos de tu legajo para procesar la baja inmediata.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">Nombre y Apellido *</label>
                <input
                  type="text"
                  required
                  value={nombreCompleto}
                  onChange={e => setNombreCompleto(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3.5 text-white focus:border-yellow-500 outline-none text-sm font-bold transition-all"
                  placeholder="Ej: Juan Pérez"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">Número de DNI / CUIL *</label>
                <input
                  type="text"
                  required
                  value={dni}
                  onChange={e => setDni(e.target.value.replace(/\D/g, ""))}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3.5 text-white focus:border-yellow-500 outline-none text-sm font-bold transition-all font-mono"
                  placeholder="Solo números"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">Correo Electrónico *</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3.5 text-white focus:border-yellow-500 outline-none text-sm font-bold transition-all"
                  placeholder="tu@correo.com"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">Teléfono de Contacto (WhatsApp) *</label>
                <input
                  type="tel"
                  required
                  value={telefono}
                  onChange={e => setTelefono(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3.5 text-white focus:border-yellow-500 outline-none text-sm font-bold transition-all"
                  placeholder="Ej: +54 9 11 2345 6789"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">Producto o Plan *</label>
                <input
                  type="text"
                  required
                  value={producto}
                  onChange={e => setProducto(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3.5 text-white focus:border-yellow-500 outline-none text-sm font-bold transition-all"
                  placeholder="Ej: Samsung Galaxy S23"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">Fecha Aproximada de Compra</label>
                <input
                  type="date"
                  value={fechaCompra}
                  onChange={e => setFechaCompra(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3.5 text-white focus:border-yellow-500 outline-none text-sm font-bold transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">Comentarios Adicionales (Opcional)</label>
              <textarea
                value={mensaje}
                onChange={e => setMensaje(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-white focus:border-yellow-500 outline-none text-sm font-bold transition-all h-28 resize-none"
                placeholder="Indica cualquier detalle adicional relevante..."
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-yellow-500 hover:bg-yellow-400 disabled:opacity-50 text-black py-4 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2.5 transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5"
              >
                <Send className="w-4 h-4" />
                {submitting ? "Procesando..." : "Confirmar Arrepentimiento"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
