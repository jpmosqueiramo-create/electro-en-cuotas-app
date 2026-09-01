"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { AdminProtectedRoute } from "@/components/AdminProtectedRoute";
import { db } from "@/lib/firebase";
import { collection, getDocs } from "firebase/firestore";
import { Users, Search, ArrowLeft, MessageCircle, MapPin, Briefcase, FileText, Phone, Mail, UserCheck, ShieldCheck } from "lucide-react";

export default function ClientesPage() {
  const [clientes, setClientes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState<string>("");

  const fetchClientes = async () => {
    setLoading(true);
    try {
      const mapClientes = new Map<string, any>();

      // 1. Cargar desde solicitudes_cuenta (Aperturas de Cuenta)
      const snapAperturas = await getDocs(collection(db, "solicitudes_cuenta"));
      snapAperturas.forEach((d) => {
        const data = d.data();
        const dni = (data.numeroDni || data.dni || "").toString().replace(/\D/g, "");
        const email = (data.email || data.clienteEmail || "").toLowerCase().trim();
        const key = dni || email || d.id;

        if (key) {
          mapClientes.set(key, {
            id: d.id,
            nombreCompleto: data.nombreCompleto || data.nombre || "Sin Nombre",
            dni: dni || "S/D",
            cuil: data.cuil || "S/D",
            email: data.email || data.clienteEmail || "S/D",
            whatsapp: data.whatsapp || data.telefono || "S/D",
            direccion: data.direccion || data.localidad || "S/D",
            ocupacion: data.ocupacion || "S/D",
            antiguedadLaboral: data.antiguedadLaboral || "S/D",
            nombreAfiliado: data.nombreAfiliado || data.referidoPor || "Directo",
            estado: data.estado || "Aperturado",
            solicitudesCount: 1,
            presupuestosCount: (data.presupuestos || []).length,
            fechaAlta: data.fechaIso || new Date().toISOString()
          });
        }
      });

      // 2. Cargar/Enriquecer desde solicitudes (Solicitudes Estándar)
      const snapSolicitudes = await getDocs(collection(db, "solicitudes"));
      snapSolicitudes.forEach((d) => {
        const data = d.data();
        const dni = (data.numeroDni || data.dni || data.datosPersonales?.numeroDni || "").toString().replace(/\D/g, "");
        const email = (data.email || data.clienteEmail || data.datosPersonales?.email || "").toLowerCase().trim();
        const key = dni || email || d.id;

        if (key) {
          const existing = mapClientes.get(key);
          if (existing) {
            existing.solicitudesCount += 1;
            existing.presupuestosCount += (data.presupuestos || []).length;
            if (data.estadoEntrega === "ENTREGADO" || data.nroContrato) {
              existing.estado = "Con Contrato Activo";
            }
          } else {
            mapClientes.set(key, {
              id: d.id,
              nombreCompleto: data.nombreCompleto || data.nombre || data.datosPersonales?.nombreCompleto || "Sin Nombre",
              dni: dni || "S/D",
              cuil: data.cuil || data.datosPersonales?.cuil || "S/D",
              email: email || "S/D",
              whatsapp: data.whatsapp || data.telefono || "S/D",
              direccion: data.direccion || data.localidad || data.datosPersonales?.direccion || "S/D",
              ocupacion: data.ocupacion || data.datosPersonales?.ocupacion || "S/D",
              antiguedadLaboral: data.antiguedadLaboral || "S/D",
              nombreAfiliado: data.nombreAfiliado || data.referidoPor || "Directo",
              estado: data.estadoEntrega === "ENTREGADO" ? "Con Contrato Activo" : (data.estado || "Solicitante"),
              solicitudesCount: 1,
              presupuestosCount: (data.presupuestos || []).length,
              fechaAlta: data.fechaCreacion || new Date().toISOString()
            });
          }
        }
      });

      const listFinal = Array.from(mapClientes.values());
      // Sort chronologically (newest first)
      listFinal.sort((a, b) => new Date(b.fechaAlta).getTime() - new Date(a.fechaAlta).getTime());

      setClientes(listFinal);
    } catch (e) {
      console.error("Error al cargar base de clientes:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClientes();
  }, []);

  // Filter clients by search query
  const clientesFiltrados = clientes.filter((c) => {
    const q = busqueda.toLowerCase().trim();
    if (!q) return true;
    return (
      (c.nombreCompleto || "").toLowerCase().includes(q) ||
      (c.dni || "").toString().includes(q) ||
      (c.cuil || "").toString().includes(q) ||
      (c.whatsapp || "").toString().includes(q) ||
      (c.email || "").toLowerCase().includes(q) ||
      (c.direccion || "").toLowerCase().includes(q)
    );
  });

  return (
    <AdminProtectedRoute>
      <div className="min-h-screen bg-[#121316] text-zinc-100 p-4 md:p-8 font-sans">
        <div className="max-w-7xl mx-auto space-y-6">

          {/* HEADER */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-[#181920] border border-zinc-800 p-6 rounded-3xl shadow-xl">
            <div className="flex items-center gap-4">
              <Link href="/admin" className="p-2.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-xl border border-zinc-800 transition">
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                <h1 className="text-2xl md:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-[#fe5000] to-amber-500">
                  Base de Datos de Clientes
                </h1>
                <p className="text-xs text-zinc-400 font-medium mt-0.5">
                  Directorio unificado de clientes registrados, datos personales, laborales e historial comercial
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 bg-zinc-900/80 px-4 py-2 rounded-2xl border border-zinc-800">
              <Users className="w-4 h-4 text-[#fe5000]" />
              <span className="text-xs font-bold text-zinc-300">Total: <strong className="text-white font-mono">{clientes.length}</strong> Clientes</span>
            </div>
          </div>

          {/* BARRA DE BÚSQUEDA */}
          <div className="bg-[#181920] border border-zinc-800 p-4 rounded-2xl shadow-lg">
            <div className="relative">
              <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3.5" />
              <input
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar cliente por Nombre, DNI, CUIL, WhatsApp, Email o Localidad..."
                className="w-full bg-zinc-950 border border-zinc-800 pl-10 pr-4 py-3 rounded-xl text-xs text-white placeholder-zinc-500 outline-none focus:border-[#fe5000] transition"
              />
            </div>
          </div>

          {/* LISTADO DE CLIENTES */}
          {loading ? (
            <div className="bg-[#181920] border border-zinc-800 p-12 rounded-3xl text-center">
              <p className="text-sm text-zinc-400 animate-pulse font-medium">Cargando base de datos de clientes...</p>
            </div>
          ) : clientesFiltrados.length === 0 ? (
            <div className="bg-[#181920] border border-zinc-800 p-12 rounded-3xl text-center space-y-3">
              <Users className="w-12 h-12 text-zinc-600 mx-auto" />
              <p className="text-base text-zinc-300 font-bold">No se encontraron clientes</p>
              <p className="text-xs text-zinc-500 max-w-md mx-auto">
                No hay registros que coincidan con la búsqueda.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {clientesFiltrados.map((c, idx) => {
                const cleanPhone = (c.whatsapp || "").replace(/\D/g, "");
                const waUrl = cleanPhone ? `https://wa.me/549${cleanPhone}?text=${encodeURIComponent(`Hola ${c.nombreCompleto}, te contactamos de Cuenta Hogar.`)}` : null;

                return (
                  <div key={idx} className="bg-[#181920] border border-zinc-850 hover:border-zinc-750 p-6 rounded-3xl space-y-4 shadow-lg transition-all">
                    
                    {/* ENCABEZADO CLIENTE */}
                    <div className="flex justify-between items-start border-b border-zinc-850 pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-black text-white">{c.nombreCompleto}</h3>
                          <span className="text-[10px] bg-amber-500/10 text-amber-400 font-bold px-2 py-0.5 rounded border border-amber-500/20">
                            {c.estado}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-400 font-medium mt-0.5">
                          Alta: {c.fechaAlta ? new Date(c.fechaAlta).toLocaleDateString("es-AR") : "No disp."}
                        </p>
                      </div>

                      {waUrl && (
                        <a
                          href={waUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition"
                        >
                          <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
                        </a>
                      )}
                    </div>

                    {/* DATOS DE IDENTIFICACIÓN */}
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="bg-zinc-950/80 p-2.5 rounded-xl border border-zinc-850">
                        <span className="text-[10px] text-zinc-500 font-bold uppercase block">DNI / CUIL</span>
                        <span className="font-mono font-bold text-zinc-200">{c.dni}</span>
                        {c.cuil && c.cuil !== "S/D" && <span className="block text-[10px] text-zinc-400 font-mono">{c.cuil}</span>}
                      </div>

                      <div className="bg-zinc-950/80 p-2.5 rounded-xl border border-zinc-850">
                        <span className="text-[10px] text-zinc-500 font-bold uppercase block">Teléfono / WhatsApp</span>
                        <span className="font-mono font-bold text-zinc-200">{c.whatsapp}</span>
                      </div>

                      <div className="bg-zinc-950/80 p-2.5 rounded-xl border border-zinc-850 col-span-2">
                        <span className="text-[10px] text-zinc-500 font-bold uppercase block flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-[#fe5000]" /> Domicilio / Localidad
                        </span>
                        <span className="font-medium text-zinc-200">{c.direccion}</span>
                      </div>
                    </div>

                    {/* INFORMACIÓN LABORAL Y ASESOR */}
                    <div className="bg-zinc-950/40 p-3 rounded-2xl border border-zinc-850/80 text-xs space-y-1.5">
                      <div className="flex items-center justify-between text-zinc-400">
                        <span className="flex items-center gap-1">
                          <Briefcase className="w-3 h-3 text-amber-400" /> Ocupación:
                        </span>
                        <strong className="text-zinc-200">{c.ocupacion}</strong>
                      </div>

                      <div className="flex items-center justify-between text-zinc-400">
                        <span>Antigüedad Laboral:</span>
                        <strong className="text-zinc-200">{c.antiguedadLaboral}</strong>
                      </div>

                      <div className="flex items-center justify-between text-zinc-400 pt-1 border-t border-zinc-850">
                        <span>Asesor / Referente:</span>
                        <strong className="text-amber-400 font-bold">{c.nombreAfiliado}</strong>
                      </div>
                    </div>

                    {/* RESUMEN COMERCIAL Y BOTÓN LEGAJO */}
                    <div className="flex justify-between items-center pt-1 text-xs">
                      <div className="flex gap-3 text-zinc-400 text-[11px]">
                        <span>Solicitudes: <strong className="text-white font-mono">{c.solicitudesCount}</strong></span>
                        <span>Presupuestos: <strong className="text-amber-400 font-mono">{c.presupuestosCount}</strong></span>
                      </div>

                      <Link
                        href={`/admin/validaciones`}
                        className="bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-bold px-3 py-1.5 rounded-xl text-xs border border-zinc-800 transition"
                      >
                        📋 Ver Legajo
                      </Link>
                    </div>

                  </div>
                );
              })}
            </div>
          )}

        </div>
      </div>
    </AdminProtectedRoute>
  );
}
