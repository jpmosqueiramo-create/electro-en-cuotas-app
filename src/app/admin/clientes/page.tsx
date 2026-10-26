"use client";

import { AdminNav } from "@/components/AdminNav";
import { useState, useEffect } from "react";
import Link from "next/link";
import { AdminProtectedRoute } from "@/components/AdminProtectedRoute";
import {useAuth} from "@/components/AuthProvider";
import {loadAuthorizedRequestPage,mergeAuthorizedRequestPages} from "@/lib/adminSolicitudesHttpReader";
import type {AdminSolicitudListItem} from "@/lib/adminSolicitudesReadModel";
import { Users, Search, MessageCircle, MapPin, Briefcase } from "lucide-react";

export default function ClientesPage() {
  const {user}=useAuth();
  const [loaded,setLoaded]=useState<{uid:string;items:AdminSolicitudListItem[]}|null>(null);
  const [failed,setFailed]=useState(false);
  const [attempt,setAttempt]=useState(0);
  const [busqueda,setBusqueda]=useState("");
  const loading=!!user&&loaded?.uid!==user.uid&&!failed;
  // Same authorized sources and removal state as Solicitudes. Never merge people
  // by DNI/email or recreate a customer profile just by opening this directory.
  const clientes=(loaded?.uid===user?.uid?loaded?.items??[]:[]).filter(item=>!item.administrativeState||item.administrativeState.state==='ACTIVE').map(item=>({
    id:item.recordKey,nombreCompleto:item.nombreCliente??"Sin nombre",dni:item.dni??"S/D",cuil:item.cuil??"S/D",email:item.email??"S/D",whatsapp:item.telefono??"S/D",direccion:item.domicilio??item.localidad??"S/D",ocupacion:item.ocupacion??"S/D",antiguedadLaboral:item.antiguedadLaboral??"S/D",nombreAfiliado:item.nombreAfiliado??"No registrado",estado:item.estadoOriginal??"Sin estado",solicitudesCount:1,fechaAlta:item.fechaCreacion?new Date(item.fechaSort!).toISOString():null,
    href:`/admin/solicitudes/${item.sourceCollection}/${encodeURIComponent(item.documentId)}`,
  }));
  useEffect(()=>{
    const controller=new AbortController();
    if(!user)return()=>controller.abort();
    async function load(){
      try{
        let page=await loadAuthorizedRequestPage(user!,{},controller.signal);
        if(Object.keys(page.errors).length)throw Error('DIRECTORY_UNAVAILABLE');
        while(Object.values(page.cursors).some(Boolean)){
          const next=await loadAuthorizedRequestPage(user!,page.cursors,controller.signal);
          if(Object.keys(next.errors).length)throw Error('DIRECTORY_UNAVAILABLE');
          page=mergeAuthorizedRequestPages(page,next);
        }
        if(!controller.signal.aborted){setLoaded({uid:user!.uid,items:page.items});setFailed(false);}
      }catch{if(!controller.signal.aborted){setLoaded(null);setFailed(true);}}
    }
    setFailed(false);void load();return()=>controller.abort();
  },[user,attempt]);

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
      <div className="min-h-screen bg-[#F7F3EC] text-[#1F2928] p-4 md:p-8 font-sans selection:bg-[#173E3B] selection:text-white">
        <div className="max-w-7xl mx-auto space-y-6" data-testid="clients-directory" data-loaded={loaded?.uid===user?.uid&&!!loaded} aria-busy={loading}>

          {/* HEADER PRINCIPAL */}
          <AdminNav title="Base de Datos de Clientes" subtitle="Datos de las solicitudes vigentes. Los registros retirados no aparecen en este directorio." />

          {/* BARRA DE BÚSQUEDA */}
          <div className="bg-[#FFFDFC] border border-[#DED8CF] p-4 rounded-2xl shadow-xs">
            <div className="relative">
              <Search className="w-4 h-4 text-[#68706E] absolute left-3.5 top-3.5" />
              <input
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar cliente por Nombre, DNI, CUIL, WhatsApp, Email o Localidad..."
                className="w-full bg-[#FFFDFC] border border-[#DED8CF] pl-10 pr-4 py-3 rounded-xl text-xs text-[#1F2928] placeholder-[#68706E] outline-none focus:border-[#173E3B] focus:ring-1 focus:ring-[#173E3B] font-sans transition"
              />
            </div>
          </div>

          {failed&&<div role="alert" className="rounded-xl border border-[#DED8CF] p-4"><p>No pudimos cargar el directorio. No se muestran datos incompletos.</p><button type="button" className="min-h-11 underline" onClick={()=>{setLoaded(null);setFailed(false);setAttempt(value=>value+1);}}>Reintentar</button></div>}
          {/* LISTADO DE CLIENTES */}
          {loading ? (
            <div className="bg-[#FFFDFC] border border-[#DED8CF] p-12 rounded-2xl text-center shadow-xs">
              <p className="text-sm text-[#68706E] animate-pulse font-heading font-semibold">Cargando base de datos de clientes...</p>
            </div>
          ) : clientesFiltrados.length === 0 ? (
            <div className="bg-[#FFFDFC] border border-[#DED8CF] p-12 rounded-2xl text-center space-y-3 shadow-xs">
              <Users className="w-12 h-12 text-[#68706E]/60 mx-auto" />
              <p className="text-base text-[#173E3B] font-heading font-bold">No se encontraron clientes</p>
              <p className="text-xs text-[#68706E] font-sans max-w-md mx-auto">
                No hay registros que coincidan con los términos de búsqueda ingresados.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {clientesFiltrados.map((c) => {
                const cleanPhone = (c.whatsapp || "").replace(/\D/g, "");
                const waUrl = cleanPhone ? `https://wa.me/549${cleanPhone}?text=${encodeURIComponent(`Hola ${c.nombreCompleto}, te contactamos de Cuenta Hogar.`)}` : null;

                return (
                  <div key={c.id} className="bg-[#FFFDFC] border border-[#DED8CF] hover:border-[#173E3B]/60 p-6 rounded-2xl space-y-4 shadow-xs transition-all flex flex-col justify-between">
                    
                    <div>
                      {/* ENCABEZADO CLIENTE */}
                      <div className="flex justify-between items-start border-b border-[#DED8CF] pb-3 mb-4">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-base font-heading font-bold text-[#173E3B]">{c.nombreCompleto}</h3>
                            <span className="text-[10px] bg-[#E7B86A]/20 text-[#8F6211] font-heading font-bold px-2.5 py-0.5 rounded-full border border-[#E7B86A]/50 uppercase tracking-wider">
                              {c.estado}
                            </span>
                          </div>
                          <p className="text-xs text-[#68706E] font-sans mt-1">
                            Fecha Alta: {c.fechaAlta ? new Date(c.fechaAlta).toLocaleDateString("es-AR") : "No disponible"}
                          </p>
                        </div>

                        {waUrl && (
                          <a
                            href={waUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-[#2F7D5C]/10 hover:bg-[#2F7D5C]/20 text-[#2F7D5C] border border-[#2F7D5C]/30 px-3 py-1.5 rounded-xl text-xs font-heading font-bold flex items-center gap-1.5 transition shrink-0"
                          >
                            <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
                          </a>
                        )}
                      </div>

                      {/* DATOS DE IDENTIFICACIÓN */}
                      <div className="grid grid-cols-2 gap-3 text-xs mb-3">
                        <div className="bg-[#F7F3EC] p-3 rounded-xl border border-[#DED8CF]">
                          <span className="text-[10px] text-[#68706E] font-heading font-bold uppercase block mb-0.5">DNI / CUIL</span>
                          <span className="font-mono font-bold text-[#1F2928] text-xs">{c.dni}</span>
                          {c.cuil && c.cuil !== "S/D" && <span className="block text-[10px] text-[#68706E] font-mono mt-0.5">{c.cuil}</span>}
                        </div>

                        <div className="bg-[#F7F3EC] p-3 rounded-xl border border-[#DED8CF]">
                          <span className="text-[10px] text-[#68706E] font-heading font-bold uppercase block mb-0.5">Teléfono / WhatsApp</span>
                          <span className="font-mono font-bold text-[#1F2928] text-xs">{c.whatsapp}</span>
                        </div>

                        <div className="bg-[#F7F3EC] p-3 rounded-xl border border-[#DED8CF] col-span-2">
                          <span className="text-[10px] text-[#68706E] font-heading font-bold uppercase block flex items-center gap-1 mb-0.5">
                            <MapPin className="w-3 h-3 text-[#B44E2A]" /> Domicilio / Localidad
                          </span>
                          <span className="font-sans font-medium text-[#1F2928] text-xs">{c.direccion}</span>
                        </div>
                      </div>

                      {/* INFORMACIÓN LABORAL Y ASESOR */}
                      <div className="bg-[#F7F3EC] p-3 rounded-xl border border-[#DED8CF] text-xs space-y-1.5">
                        <div className="flex items-center justify-between text-[#68706E]">
                          <span className="flex items-center gap-1 font-sans">
                            <Briefcase className="w-3 h-3 text-[#B44E2A]" /> Ocupación:
                          </span>
                          <strong className="text-[#1F2928] font-heading font-semibold">{c.ocupacion}</strong>
                        </div>

                        <div className="flex items-center justify-between text-[#68706E]">
                          <span className="font-sans">Antigüedad Laboral:</span>
                          <strong className="text-[#1F2928] font-heading font-semibold">{c.antiguedadLaboral}</strong>
                        </div>

                        <div className="flex items-center justify-between text-[#68706E] pt-1 border-t border-[#DED8CF]">
                          <span className="font-sans">Asesor / Referente:</span>
                          <strong className="text-[#B44E2A] font-heading font-bold">{c.nombreAfiliado}</strong>
                        </div>
                      </div>
                    </div>

                    {/* RESUMEN COMERCIAL Y BOTÓN LEGAJO */}
                    <div className="flex justify-between items-center pt-3 border-t border-[#DED8CF] text-xs mt-3">
                      <div className="flex gap-4 text-[#68706E] text-xs">
                        <span>Solicitudes: <strong className="text-[#173E3B] font-mono font-bold">{c.solicitudesCount}</strong></span>
                      </div>

                      <Link
                        href={c.href}
                        className="bg-[#FFFDFC] hover:bg-[#F7F3EC] text-[#173E3B] font-heading font-bold px-3.5 py-2 rounded-xl text-xs border border-[#DED8CF] hover:border-[#173E3B] transition shadow-xs"
                      >
                        📋 Ver solicitudes
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
