"use client";

import { AdminNav } from "@/components/AdminNav";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { AdminProtectedRoute } from "@/components/AdminProtectedRoute";
import { db } from "@/lib/firebase";
import { collection, getDocs, doc, getDoc, updateDoc, addDoc, serverTimestamp } from "firebase/firestore";
import { generarPdfPresupuesto } from "@/lib/pdfGenerator";
import { FACTORES_PREDETERMINADOS } from "@/lib/financialEngine";
import { 
  FileText, 
  Search, 
  Filter, 
  Download, 
  ExternalLink, 
  Plus, 
  X, 
  Send, 
  Trash2,
  User,
  Tag
} from "lucide-react";

interface PresupuestoOpcion {
  producto: string;
  contado?: number;
  costoProveedor?: number;
  cuotas?: number;
  factor?: number;
  valorCuota?: number;
}

interface PresupuestoRecord {
  id: string;
  solicitudId?: string;
  solicitudTipo?: string;
  clienteNombre: string;
  clienteDni: string;
  clienteWhatsapp: string;
  clienteLocalidad: string;
  producto?: string;
  items?: PresupuestoOpcion[];
  estado?: string;
  notas?: string;
  contado?: number;
  cuotas?: number;
  valorCuota?: number;
  costoProveedor?: number;
  factor?: number;
  fechaObjeto?: Date;
}

function parseAnyDate(val: unknown): Date {
  if (!val) return new Date(0);
  if (val instanceof Date) return val;
  if (typeof val === "string" || typeof val === "number") {
    const d = new Date(val);
    if (!isNaN(d.getTime())) return d;
  }
  const obj = val as { toDate?: () => Date; seconds?: number };
  if (obj.toDate && typeof obj.toDate === "function") return obj.toDate();
  if (obj.seconds) return new Date(obj.seconds * 1000);
  return new Date();
}

interface DraftItem {
  producto: string;
  costoProveedor: number;
  contado: number;
  cuotas: number;
  factor: number;
  valorCuota: number;
}

interface LeadData {
  solicitudId: string;
  alertaId: string;
  nombre: string;
  dni: string;
  telefono: string;
  localidad: string;
  producto: string;
  notas: string;
}

function PresupuestosContent() {
  const searchParams = useSearchParams();
  const [presupuestos, setPresupuestos] = useState<PresupuestoRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroEstado, setFiltroEstado] = useState<string>("TODOS");
  const [busqueda, setBusqueda] = useState<string>("");

  // Estado del Modal de Confección
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [leadData, setLeadData] = useState<LeadData>({
    solicitudId: "",
    alertaId: "",
    nombre: "",
    dni: "",
    telefono: "",
    localidad: "",
    producto: "",
    notas: ""
  });
  const [draftItems, setDraftItems] = useState<DraftItem[]>([]);

  const fetchPresupuestos = async () => {
    setLoading(true);
    try {
      const allPresupuestos: PresupuestoRecord[] = [];

      // 1. Fetch de solicitudes_cuenta (Aperturas de Cuenta / Contactos Rápidos)
      const snapAperturas = await getDocs(collection(db, "solicitudes_cuenta"));
      snapAperturas.forEach((d) => {
        const rawData = (d.data() || {}) as Record<string, unknown>;
        const presupList = (Array.isArray(rawData.presupuestos) ? rawData.presupuestos : []) as Array<Record<string, unknown>>;
        const nombreCliente = String(rawData.nombreCompleto || rawData.nombre || "Cliente Sin Nombre");
        const dniCliente = String(rawData.numeroDni || rawData.dni || "-");
        const telCliente = String(rawData.whatsapp || rawData.telefono || "-");
        const locCliente = String(rawData.direccion || rawData.localidad || "-");

        if (presupList.length > 0) {
          presupList.forEach((p) => {
            allPresupuestos.push({
              id: String(p.id || "pres_" + d.id),
              solicitudId: d.id,
              solicitudTipo: "apertura",
              clienteNombre: nombreCliente,
              clienteDni: dniCliente,
              clienteWhatsapp: telCliente,
              clienteLocalidad: locCliente,
              producto: p.producto ? String(p.producto) : undefined,
              items: Array.isArray(p.items) ? (p.items as PresupuestoOpcion[]) : undefined,
              estado: p.estado ? String(p.estado) : "Pendiente",
              notas: p.notas ? String(p.notas) : undefined,
              contado: Number(p.contado) || undefined,
              cuotas: Number(p.cuotas) || undefined,
              valorCuota: Number(p.valorCuota) || undefined,
              costoProveedor: Number(p.costoProveedor) || undefined,
              factor: Number(p.factor) || undefined,
              fechaObjeto: parseAnyDate(p.fechaIso || p.fecha || rawData.fechaIso || rawData.fecha)
            });
          });
        } else if (rawData.necesidad || rawData.productoDeseado || rawData.productoNombre) {
          const prodName = String(rawData.necesidad || rawData.productoDeseado || rawData.productoNombre);
          allPresupuestos.push({
            id: "pres_pend_" + d.id,
            solicitudId: d.id,
            solicitudTipo: "apertura",
            clienteNombre: nombreCliente,
            clienteDni: dniCliente,
            clienteWhatsapp: telCliente,
            clienteLocalidad: locCliente,
            producto: prodName,
            items: [{ producto: prodName, contado: 0, cuotas: 12, valorCuota: 0 }],
            estado: "Pendiente",
            notas: "Solicitud recibida desde portada ('Buscás algo especial'). Pendiente de armar cotización por el administrador.",
            fechaObjeto: parseAnyDate(rawData.fechaIso || rawData.fecha || rawData.fechaCreacion)
          });
        }
      });

      // 2. Fetch de solicitudes (Solicitudes Especiales / Estándar)
      const snapSolicitudes = await getDocs(collection(db, "solicitudes"));
      snapSolicitudes.forEach((d) => {
        const rawData = (d.data() || {}) as Record<string, unknown>;
        const presupList = (Array.isArray(rawData.presupuestos) ? rawData.presupuestos : []) as Array<Record<string, unknown>>;
        const datosPersonales = (rawData.datosPersonales || {}) as Record<string, unknown>;
        const nombreCliente = String(rawData.nombreCompleto || rawData.nombre || datosPersonales.nombreCompleto || "Cliente Sin Nombre");
        const dniCliente = String(rawData.numeroDni || rawData.dni || datosPersonales.numeroDni || "-");
        const telCliente = String(rawData.whatsapp || rawData.telefono || "-");
        const locCliente = String(rawData.direccion || rawData.localidad || "-");

        presupList.forEach((p) => {
          const pId = String(p.id || "pres_" + d.id);
          if (!allPresupuestos.some((existing) => existing.id === pId && existing.solicitudId === d.id)) {
            allPresupuestos.push({
              id: pId,
              solicitudId: d.id,
              solicitudTipo: "estandar",
              clienteNombre: nombreCliente,
              clienteDni: dniCliente,
              clienteWhatsapp: telCliente,
              clienteLocalidad: locCliente,
              producto: p.producto ? String(p.producto) : undefined,
              items: Array.isArray(p.items) ? (p.items as PresupuestoOpcion[]) : undefined,
              estado: p.estado ? String(p.estado) : "Pendiente",
              notas: p.notas ? String(p.notas) : undefined,
              contado: Number(p.contado) || undefined,
              cuotas: Number(p.cuotas) || undefined,
              valorCuota: Number(p.valorCuota) || undefined,
              costoProveedor: Number(p.costoProveedor) || undefined,
              factor: Number(p.factor) || undefined,
              fechaObjeto: parseAnyDate(p.fechaIso || p.fecha || rawData.fechaCreacion)
            });
          }
        });
      });

      allPresupuestos.sort((a, b) => (b.fechaObjeto?.getTime() ?? 0) - (a.fechaObjeto?.getTime() ?? 0));
      setPresupuestos(allPresupuestos);
    } catch (e: unknown) {
      console.error("Error al cargar presupuestos:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPresupuestos();
  }, []);

  // Procesar Query Parameters de Alerta o Navegación Externa
  useEffect(() => {
    const qParam = searchParams.get("q");
    if (qParam && !busqueda) {
      setBusqueda(qParam);
    }

    const solId = searchParams.get("solicitudId") || "";
    const altId = searchParams.get("alertaId") || "";
    const nom = searchParams.get("nombre") || "";
    const dniVal = searchParams.get("dni") || "";
    const telVal = searchParams.get("telefono") || "";
    const locVal = searchParams.get("localidad") || "";
    const prodVal = searchParams.get("producto") || "";
    const notasVal = searchParams.get("notas") || "";

    // Si viene desde una alerta con datos de lead, abrir el modal pre-cargado
    if (nom || prodVal || solId || altId) {
      const defaultFactor = FACTORES_PREDETERMINADOS[12] || 2.5;
      setLeadData({
        solicitudId: solId,
        alertaId: altId,
        nombre: nom,
        dni: dniVal,
        telefono: telVal,
        localidad: locVal,
        producto: prodVal,
        notas: notasVal
      });
      setDraftItems([
        {
          producto: prodVal || "Producto a cotizar",
          costoProveedor: 0,
          contado: 0,
          cuotas: 12,
          factor: defaultFactor,
          valorCuota: 0
        }
      ]);
      setModalOpen(true);
    }
  }, [searchParams, busqueda]);

  const abrirModalNuevo = () => {
    const defaultFactor = FACTORES_PREDETERMINADOS[12] || 2.5;
    setLeadData({
      solicitudId: "",
      alertaId: "",
      nombre: "",
      dni: "",
      telefono: "",
      localidad: "",
      producto: "",
      notas: ""
    });
    setDraftItems([
      {
        producto: "",
        costoProveedor: 0,
        contado: 0,
        cuotas: 12,
        factor: defaultFactor,
        valorCuota: 0
      }
    ]);
    setModalOpen(true);
  };

  const abrirModalConfeccion = (item: PresupuestoRecord) => {
    const defaultFactor = FACTORES_PREDETERMINADOS[12] || 2.5;
    setLeadData({
      solicitudId: item.solicitudId || "",
      alertaId: "",
      nombre: item.clienteNombre !== "Cliente Sin Nombre" ? item.clienteNombre : "",
      dni: item.clienteDni !== "-" ? item.clienteDni : "",
      telefono: item.clienteWhatsapp !== "-" ? item.clienteWhatsapp : "",
      localidad: item.clienteLocalidad !== "-" ? item.clienteLocalidad : "",
      producto: item.producto || "",
      notas: item.notas || ""
    });

    const initialItems = item.items && item.items.length > 0
      ? item.items.map((it: PresupuestoOpcion) => ({
          producto: it.producto || item.producto || "",
          costoProveedor: Number(it.costoProveedor) || 0,
          contado: Number(it.contado) || 0,
          cuotas: Number(it.cuotas) || 12,
          factor: Number(it.factor) || (FACTORES_PREDETERMINADOS[Number(it.cuotas) || 12] || 2.5),
          valorCuota: Number(it.valorCuota) || 0
        }))
      : [
          {
            producto: item.producto || "",
            costoProveedor: 0,
            contado: 0,
            cuotas: 12,
            factor: defaultFactor,
            valorCuota: 0
          }
        ];

    setDraftItems(initialItems);
    setModalOpen(true);
  };

  const handleItemChange = (index: number, field: keyof DraftItem, value: string | number) => {
    setDraftItems((prev) => {
      const next = [...prev];
      const item = { ...next[index], [field]: value };

      if (field === "cuotas") {
        const nCuotas = Number(value) || 12;
        const newFactor = FACTORES_PREDETERMINADOS[nCuotas] || (nCuotas === 18 ? 3.25 : 2.5);
        item.factor = newFactor;
        if (item.costoProveedor > 0) {
          const totalFinanciado = Math.round(item.costoProveedor * newFactor);
          item.valorCuota = Math.round(totalFinanciado / nCuotas);
        } else if (item.contado > 0) {
          const totalFinanciado = Math.round(item.contado * newFactor);
          item.valorCuota = Math.round(totalFinanciado / nCuotas);
        }
      } else if (field === "costoProveedor") {
        const costo = Number(value) || 0;
        if (costo > 0) {
          const factor = item.factor || (FACTORES_PREDETERMINADOS[item.cuotas] || 2.5);
          item.contado = Math.round(costo * 1.5);
          const totalFinanciado = Math.round(costo * factor);
          item.valorCuota = Math.round(totalFinanciado / item.cuotas);
        }
      } else if (field === "contado") {
        const contado = Number(value) || 0;
        if (contado > 0 && item.costoProveedor === 0) {
          const factor = item.factor || (FACTORES_PREDETERMINADOS[item.cuotas] || 2.5);
          const totalFinanciado = Math.round(contado * factor);
          item.valorCuota = Math.round(totalFinanciado / item.cuotas);
        }
      } else if (field === "factor") {
        const factor = Number(value) || 2.5;
        const base = item.costoProveedor > 0 ? item.costoProveedor : item.contado;
        if (base > 0) {
          item.valorCuota = Math.round((base * factor) / item.cuotas);
        }
      }

      next[index] = item;
      return next;
    });
  };

  const handleAgregarOpcion = () => {
    const defaultFactor = FACTORES_PREDETERMINADOS[12] || 2.5;
    setDraftItems((prev) => [
      ...prev,
      {
        producto: "",
        costoProveedor: 0,
        contado: 0,
        cuotas: 12,
        factor: defaultFactor,
        valorCuota: 0
      }
    ]);
  };

  const handleEliminarOpcion = (index: number) => {
    if (draftItems.length <= 1) return;
    setDraftItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleGuardarPresupuesto = async () => {
    if (!leadData.nombre && !leadData.telefono) {
      alert("Por favor ingrese al menos el nombre o teléfono del cliente.");
      return;
    }
    if (draftItems.length === 0 || !draftItems[0].producto) {
      alert("Por favor ingrese al menos un producto para cotizar.");
      return;
    }

    setSaving(true);
    try {
      const nuevoPresupuesto = {
        id: "pres_" + Date.now(),
        items: draftItems,
        producto: draftItems[0].producto,
        cuotas: draftItems[0].cuotas,
        valorCuota: draftItems[0].valorCuota,
        contado: draftItems[0].contado,
        costoProveedor: draftItems[0].costoProveedor,
        factor: draftItems[0].factor,
        tna: 60,
        mora: 0.5,
        notas: leadData.notas || "",
        fecha: new Date().toISOString(),
        fechaIso: new Date().toISOString(),
        estado: "Enviado"
      };

      if (leadData.solicitudId) {
        let found = false;
        try {
          const docRef = doc(db, "solicitudes_cuenta", leadData.solicitudId);
          const snap = await getDoc(docRef);
          if (snap.exists()) {
            const data = snap.data();
            const existingPresup = data.presupuestos || [];
            await updateDoc(docRef, {
              presupuestos: [...existingPresup, nuevoPresupuesto],
              estado: "Presupuestado"
            });
            found = true;
          }
        } catch { /* ignore */ }

        if (!found) {
          try {
            const docRef = doc(db, "solicitudes", leadData.solicitudId);
            const snap = await getDoc(docRef);
            if (snap.exists()) {
              const data = snap.data();
              const existingPresup = data.presupuestos || [];
              await updateDoc(docRef, {
                presupuestos: [...existingPresup, nuevoPresupuesto],
                estado: "Presupuestado"
              });
              found = true;
            }
          } catch { /* ignore */ }
        }

        if (!found) {
          await addDoc(collection(db, "solicitudes_cuenta"), {
            tipo: "contacto_rapido",
            nombreCompleto: leadData.nombre,
            numeroDni: leadData.dni || "",
            whatsapp: leadData.telefono || "",
            direccion: leadData.localidad || "",
            localidad: leadData.localidad || "",
            productoNombre: draftItems[0].producto,
            estado: "Presupuestado",
            fecha: serverTimestamp(),
            fechaCreacion: serverTimestamp(),
            fechaIso: new Date().toISOString(),
            presupuestos: [nuevoPresupuesto]
          });
        }
      } else {
        await addDoc(collection(db, "solicitudes_cuenta"), {
          tipo: "contacto_rapido",
          nombreCompleto: leadData.nombre,
          numeroDni: leadData.dni || "",
          whatsapp: leadData.telefono || "",
          direccion: leadData.localidad || "",
          localidad: leadData.localidad || "",
          productoNombre: draftItems[0].producto,
          estado: "Presupuestado",
          fecha: serverTimestamp(),
          fechaCreacion: serverTimestamp(),
          fechaIso: new Date().toISOString(),
          presupuestos: [nuevoPresupuesto]
        });
      }

      await fetchPresupuestos();
      alert("¡Presupuesto guardado exitosamente!");
      setModalOpen(false);
    } catch (err) {
      console.error("Error al guardar presupuesto:", err);
      alert("Error al guardar el presupuesto.");
    } finally {
      setSaving(false);
    }
  };

  const handleDescargarPdf = (p: PresupuestoRecord) => {
    const itemsList = p.items && p.items.length > 0 
      ? p.items.map((it: PresupuestoOpcion) => ({
          producto: it.producto,
          contado: it.contado || 0,
          cuotas: it.cuotas || 12,
          valorCuota: it.valorCuota || 0
        }))
      : (p.producto ? [{
          producto: p.producto,
          contado: p.contado || 0,
          cuotas: p.cuotas || 12,
          valorCuota: p.valorCuota || 0
        }] : []);

    generarPdfPresupuesto({
      nroPresupuesto: p.id ? p.id.replace("pres_", "").substring(0, 8).toUpperCase() : "S/D",
      fecha: p.fechaObjeto ? p.fechaObjeto.toLocaleDateString("es-AR") : new Date().toLocaleDateString("es-AR"),
      clienteNombre: p.clienteNombre || "Cliente",
      clienteDni: p.clienteDni || "-",
      clienteWhatsapp: p.clienteWhatsapp || "-",
      clienteLocalidad: p.clienteLocalidad || "-",
      items: itemsList,
      notas: p.notas || ""
    });
  };

  const handleEnviarWhatsApp = () => {
    const tel = (leadData.telefono || "").replace(/[^0-9]/g, "");
    if (!tel) {
      alert("Ingrese un número de teléfono válido para enviar WhatsApp.");
      return;
    }
    let itemsListText = "";
    draftItems.forEach((item, idx) => {
      itemsListText += `\n${draftItems.length > 1 ? `*Opción ${idx + 1}*: ` : ""}- *${item.producto}*: ${item.cuotas} cuotas de $${item.valorCuota.toLocaleString("es-AR")}`;
    });
    const msg = `Hola ${leadData.nombre || "estimado/a"}, ya armamos tu presupuesto a medida en Cuenta Hogar:${itemsListText}\n\nSi estás de acuerdo o querés cambiar la cantidad de cuotas avisame y lo coordinamos!`;
    const wame = `https://wa.me/${tel}?text=${encodeURIComponent(msg)}`;
    window.open(wame, "_blank");
  };

  const presupuestosFiltrados = presupuestos.filter((p) => {
    const estadoMatch =
      filtroEstado === "TODOS" ? true :
      filtroEstado === "ACEPTADO" ? (p.estado === "Aceptado" || p.estado === "Aprobado") :
      filtroEstado === "RECHAZADO" ? p.estado === "Rechazado" :
      filtroEstado === "PENDIENTE" ? (p.estado === "Pendiente" || !p.estado) :
      filtroEstado === "ELIMINADO" ? (p.estado === "Eliminado" || p.estado === "Cancelado") : true;

    const queryClean = busqueda.toLowerCase().trim();
    if (!queryClean) return estadoMatch;

    const matchNombre = (p.clienteNombre || "").toLowerCase().includes(queryClean);
    const matchDni = (p.clienteDni || "").toString().includes(queryClean);
    const matchId = (p.id || "").toLowerCase().includes(queryClean);
    const matchProd = (p.producto || "").toLowerCase().includes(queryClean) ||
      (p.items || []).some((it: PresupuestoOpcion) => (it.producto || "").toLowerCase().includes(queryClean));

    return estadoMatch && (matchNombre || matchDni || matchId || matchProd);
  });

  return (
    <div className="min-h-screen bg-[#F7F3EC] text-[#1F2928] p-4 md:p-8 font-sans selection:bg-[#173E3B] selection:text-white">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* HEADER PRINCIPAL */}
        <AdminNav title="Historial de Presupuestos" subtitle="Gestión comercial de cotizaciones, solicitudes de compra y presupuestos a medida" />

        {/* BARRA DE CONTROLES: FILTROS, BUSCADOR Y BOTÓN NUEVO */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 bg-[#FFFDFC] border border-[#DED8CF] p-5 rounded-2xl shadow-xs items-center">
          
          {/* Buscador */}
          <div className="md:col-span-5 relative">
            <Search className="w-4 h-4 text-[#68706E] absolute left-3.5 top-3.5" />
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por Nombre, DNI, N° de Presupuesto o Producto..."
              className="w-full bg-[#FFFDFC] border border-[#DED8CF] pl-10 pr-4 py-2.5 rounded-xl text-xs text-[#1F2928] placeholder-[#68706E] outline-none focus:border-[#173E3B] focus:ring-1 focus:ring-[#173E3B] font-sans transition"
            />
          </div>

          {/* Filtros por Estado */}
          <div className="md:col-span-4 flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-heading font-bold text-[#68706E] mr-1 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" /> Estado:
            </span>
            {[
              { key: "TODOS", label: "Todos" },
              { key: "ACEPTADO", label: "🟢 Aceptados" },
              { key: "PENDIENTE", label: "🟡 Pendientes" },
              { key: "RECHAZADO", label: "🔴 Rechazados" },
              { key: "ELIMINADO", label: "🗑️ Cancelados" }
            ].map((f) => (
              <button
                key={f.key}
                onClick={() => setFiltroEstado(f.key)}
                className={`text-xs font-heading font-bold px-2.5 py-1.5 rounded-xl border transition-all ${
                  filtroEstado === f.key
                    ? "bg-[#173E3B] text-white border-[#173E3B] shadow-xs"
                    : "bg-[#FFFDFC] text-[#68706E] border-[#DED8CF] hover:border-[#173E3B]"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Botón Nuevo Presupuesto */}
          <div className="md:col-span-3 flex justify-end">
            <button
              onClick={abrirModalNuevo}
              className="w-full md:w-auto inline-flex items-center justify-center gap-2 bg-[#173E3B] hover:bg-[#123230] text-white px-4 py-2.5 rounded-xl text-xs font-heading font-bold transition-all shadow-xs"
            >
              <Plus className="w-4 h-4" /> Nuevo Presupuesto
            </button>
          </div>

        </div>

        {/* LISTADO DE PRESUPUESTOS */}
        {loading ? (
          <div className="bg-[#FFFDFC] border border-[#DED8CF] p-12 rounded-2xl text-center shadow-xs">
            <p className="text-sm text-[#68706E] animate-pulse font-heading font-semibold">Cargando historial maestro de presupuestos...</p>
          </div>
        ) : presupuestosFiltrados.length === 0 ? (
          <div className="bg-[#FFFDFC] border border-[#DED8CF] p-12 rounded-2xl text-center space-y-3 shadow-xs">
            <FileText className="w-12 h-12 text-[#68706E]/60 mx-auto" />
            <p className="text-base text-[#173E3B] font-heading font-bold">No se encontraron presupuestos</p>
            <p className="text-xs text-[#68706E] font-sans max-w-md mx-auto">
              No hay presupuestos registrados que coincidan con la búsqueda o el filtro seleccionado.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {presupuestosFiltrados.map((p, idx) => {
              const isAceptado = p.estado === "Aceptado" || p.estado === "Aprobado";
              const isRechazado = p.estado === "Rechazado";
              const isCancelado = p.estado === "Eliminado" || p.estado === "Cancelado";
              const isPendiente = p.estado === "Pendiente" || !p.estado;

              const itemsList = p.items && p.items.length > 0 ? p.items : (p.producto ? [{ producto: p.producto, contado: p.contado || 0, cuotas: p.cuotas || 12, valorCuota: p.valorCuota }] : []);
              const totalCuota = itemsList.reduce((sum: number, it: PresupuestoOpcion) => sum + (Number(it.valorCuota) || 0), 0);

              return (
                <div
                  key={p.id + "_" + idx}
                  className="bg-[#FFFDFC] border border-[#DED8CF] hover:border-[#173E3B]/60 p-5 rounded-2xl transition-all shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
                >
                  {/* Info Cliente y Fecha */}
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[11px] font-heading font-bold text-[#B44E2A] font-mono bg-[#B44E2A]/10 px-2.5 py-0.5 rounded-md border border-[#B44E2A]/20">
                        N° {p.id ? p.id.replace("pres_", "").substring(0, 8).toUpperCase() : "S/D"}
                      </span>
                      
                      <span className={`text-[10px] font-heading font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider border ${
                        isAceptado ? "bg-[#2F7D5C]/15 text-[#2F7D5C] border-[#2F7D5C]/30" :
                        isRechazado ? "bg-rose-100 text-rose-700 border-rose-200" :
                        isCancelado ? "bg-gray-100 text-[#68706E] border-gray-200" :
                        "bg-[#E7B86A]/20 text-[#8F6211] border-[#E7B86A]/50"
                      }`}>
                        {isAceptado ? "🟢 Aceptado" : isRechazado ? "🔴 Rechazado" : isCancelado ? "🗑️ Cancelado" : "🟡 Pendiente"}
                      </span>

                      <span className="text-xs text-[#68706E] font-sans">
                        {p.fechaObjeto ? p.fechaObjeto.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "Fecha no disponible"}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-base font-heading font-bold text-[#173E3B]">{p.clienteNombre}</h3>
                      <p className="text-xs text-[#68706E] font-sans mt-0.5">
                        DNI: <span className="font-mono font-bold text-[#1F2928]">{p.clienteDni}</span> | WhatsApp: <span className="font-mono text-[#1F2928]">{p.clienteWhatsapp}</span> | Localidad: <span className="text-[#1F2928]">{p.clienteLocalidad}</span>
                      </p>
                    </div>

                    {/* Listado de Productos / Opciones */}
                    <div className="pt-2 space-y-1.5">
                      {itemsList.map((it: PresupuestoOpcion, itemIdx: number) => (
                        <div key={itemIdx} className="text-xs bg-[#F7F3EC] p-2.5 rounded-xl border border-[#DED8CF] flex items-center justify-between">
                          <div>
                            {itemsList.length > 1 && (
                              <span className="text-[9px] font-heading font-bold uppercase text-[#B44E2A] bg-[#B44E2A]/10 px-1.5 py-0.5 rounded border border-[#B44E2A]/20 mr-1.5">
                                Opción {itemIdx + 1}
                              </span>
                            )}
                            <span className="font-heading font-bold text-[#173E3B]">{it.producto}</span>
                            <span className="text-[#68706E] ml-2 font-sans">({it.cuotas} cuotas de <strong className="text-[#2F7D5C] font-mono">${(it.valorCuota || 0).toLocaleString("es-AR")}</strong>)</span>
                          </div>
                          {(it.costoProveedor ?? 0) > 0 && (
                            <span className="text-[10px] text-[#68706E] font-mono">
                              Prov: ${it.costoProveedor}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>

                    {p.notas && (
                      <p className="text-xs text-[#68706E] font-sans italic pt-1">
                        Notas: {p.notas}
                      </p>
                    )}
                  </div>

                  {/* Resumen Financiero y Acciones */}
                  <div className="flex flex-col sm:flex-row md:flex-col items-start sm:items-center md:items-end gap-3 flex-shrink-0 w-full md:w-auto border-t md:border-t-0 border-[#DED8CF] pt-3 md:pt-0">
                    <div className="text-left md:text-right">
                      <span className="text-[10px] text-[#68706E] font-heading uppercase tracking-wider font-bold block">Cuota Mensual Total</span>
                      <span className="text-xl font-heading font-extrabold text-[#173E3B] font-mono">
                        ${totalCuota.toLocaleString("es-AR")} <span className="text-xs font-normal text-[#68706E] font-sans">/ mes</span>
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                      <button
                        onClick={() => abrirModalConfeccion(p)}
                        className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 bg-[#173E3B] hover:bg-[#123230] text-white px-3.5 py-2 rounded-xl text-xs font-heading font-bold transition-all shadow-xs"
                      >
                        ✏️ {isPendiente ? "Confeccionar" : "Editar"}
                      </button>

                      <button
                        onClick={() => handleDescargarPdf(p)}
                        className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 bg-[#FFFDFC] hover:bg-[#F7F3EC] text-[#B44E2A] border border-[#DED8CF] hover:border-[#B44E2A] px-3.5 py-2 rounded-xl text-xs font-heading font-bold transition-all shadow-xs"
                      >
                        <Download className="w-3.5 h-3.5" /> PDF
                      </button>

                      <Link
                        href={`/admin/validaciones`}
                        className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 bg-[#FFFDFC] hover:bg-[#F7F3EC] text-[#173E3B] border border-[#DED8CF] hover:border-[#173E3B] px-3.5 py-2 rounded-xl text-xs font-heading font-bold transition-all shadow-xs"
                      >
                        <ExternalLink className="w-3.5 h-3.5" /> Legajo
                      </Link>
                    </div>
                  </div>

                </div>
              );
            })}
          </div>
        )}

        {/* MODAL / DRAWER DE CONFECCIÓN DE PRESUPUESTO */}
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto">
            <div className="bg-[#FFFDFC] border border-[#DED8CF] rounded-3xl max-w-3xl w-full p-6 shadow-2xl space-y-6 my-8 max-h-[90vh] overflow-y-auto">
              
              {/* Header Modal */}
              <div className="flex items-center justify-between border-b border-[#DED8CF] pb-4">
                <div>
                  <h2 className="text-lg font-heading font-bold text-[#173E3B]">
                    Confeccionar Presupuesto a Medida
                  </h2>
                  <p className="text-xs text-[#68706E] font-sans">
                    Armado de propuesta económica para cliente prospecto
                  </p>
                </div>
                <button
                  onClick={() => setModalOpen(false)}
                  className="p-2 text-[#68706E] hover:text-[#173E3B] rounded-xl hover:bg-[#F7F3EC] transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Sección Datos del Lead / Prospecto */}
              <div className="bg-[#F7F3EC] border border-[#DED8CF] p-4 rounded-2xl space-y-3">
                <span className="text-[11px] font-heading font-bold uppercase tracking-wider text-[#173E3B] flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-[#B44E2A]" /> Datos del Lead / Cliente
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[10px] font-heading font-bold text-[#68706E] mb-1">Nombre y Apellido</label>
                    <input
                      type="text"
                      value={leadData.nombre}
                      onChange={(e) => setLeadData({ ...leadData, nombre: e.target.value })}
                      placeholder="Ej: Juan Perez"
                      className="w-full bg-[#FFFDFC] border border-[#DED8CF] px-3 py-2 rounded-xl text-xs font-sans text-[#1F2928] outline-none focus:border-[#173E3B]"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-heading font-bold text-[#68706E] mb-1">DNI / CUIL</label>
                    <input
                      type="text"
                      value={leadData.dni}
                      onChange={(e) => setLeadData({ ...leadData, dni: e.target.value })}
                      placeholder="Ej: 30123456"
                      className="w-full bg-[#FFFDFC] border border-[#DED8CF] px-3 py-2 rounded-xl text-xs font-mono text-[#1F2928] outline-none focus:border-[#173E3B]"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-heading font-bold text-[#68706E] mb-1">Teléfono / WhatsApp</label>
                    <input
                      type="text"
                      value={leadData.telefono}
                      onChange={(e) => setLeadData({ ...leadData, telefono: e.target.value })}
                      placeholder="Ej: 2364123456"
                      className="w-full bg-[#FFFDFC] border border-[#DED8CF] px-3 py-2 rounded-xl text-xs font-mono text-[#1F2928] outline-none focus:border-[#173E3B]"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-heading font-bold text-[#68706E] mb-1">Localidad</label>
                    <input
                      type="text"
                      value={leadData.localidad}
                      onChange={(e) => setLeadData({ ...leadData, localidad: e.target.value })}
                      placeholder="Ej: Lincoln"
                      className="w-full bg-[#FFFDFC] border border-[#DED8CF] px-3 py-2 rounded-xl text-xs font-sans text-[#1F2928] outline-none focus:border-[#173E3B]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-heading font-bold text-[#68706E] mb-1">Notas / Origen de la Solicitud</label>
                  <textarea
                    rows={2}
                    value={leadData.notas}
                    onChange={(e) => setLeadData({ ...leadData, notas: e.target.value })}
                    placeholder="Detalles provistos por el cliente..."
                    className="w-full bg-[#FFFDFC] border border-[#DED8CF] px-3 py-2 rounded-xl text-xs font-sans text-[#1F2928] outline-none focus:border-[#173E3B]"
                  />
                </div>
              </div>

              {/* Sección Opciones de Cotización */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-heading font-bold uppercase tracking-wider text-[#173E3B] flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-[#B44E2A]" /> Opciones del Presupuesto ({draftItems.length})
                  </span>
                  <button
                    type="button"
                    onClick={handleAgregarOpcion}
                    className="text-xs font-heading font-bold text-[#B44E2A] hover:text-[#933D20] flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Agregar Opción
                  </button>
                </div>

                <div className="space-y-3">
                  {draftItems.map((item, idx) => (
                    <div key={idx} className="bg-[#FFFDFC] border border-[#DED8CF] p-4 rounded-2xl space-y-3 shadow-2xs relative">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-heading font-bold uppercase tracking-wider bg-[#B44E2A]/10 text-[#B44E2A] px-2 py-0.5 rounded">
                          Opción {idx + 1}
                        </span>
                        {draftItems.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleEliminarOpcion(idx)}
                            className="text-rose-500 hover:text-rose-700 text-xs font-heading font-bold flex items-center gap-1 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Quitar
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-3">
                        <div className="md:col-span-2">
                          <label className="block text-[10px] font-heading font-bold text-[#68706E] mb-1">Producto / Modelo</label>
                          <input
                            type="text"
                            value={item.producto}
                            onChange={(e) => handleItemChange(idx, "producto", e.target.value)}
                            placeholder="Ej: Heladera Drean 300L"
                            className="w-full bg-[#FFFDFC] border border-[#DED8CF] px-3 py-2 rounded-xl text-xs font-sans text-[#1F2928] outline-none focus:border-[#173E3B]"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-heading font-bold text-[#68706E] mb-1">Costo Prov. ($)</label>
                          <input
                            type="number"
                            value={item.costoProveedor || ""}
                            onChange={(e) => handleItemChange(idx, "costoProveedor", e.target.value)}
                            placeholder="Ej: 500000"
                            className="w-full bg-[#FFFDFC] border border-[#DED8CF] px-3 py-2 rounded-xl text-xs font-mono text-[#1F2928] outline-none focus:border-[#173E3B]"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-heading font-bold text-[#68706E] mb-1">Cuotas</label>
                          <select
                            value={item.cuotas}
                            onChange={(e) => handleItemChange(idx, "cuotas", Number(e.target.value))}
                            className="w-full bg-[#FFFDFC] border border-[#DED8CF] px-3 py-2 rounded-xl text-xs font-heading font-bold text-[#1F2928] outline-none focus:border-[#173E3B]"
                          >
                            {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
                              <option key={n} value={n}>
                                {n} {n === 1 ? "Cuota" : "Cuotas"} (Factor {FACTORES_PREDETERMINADOS[n] || 2.5})
                              </option>
                            ))}
                            <option value={18}>18 Cuotas (Factor 3.25)</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[10px] font-heading font-bold text-[#B44E2A] mb-1">Factor</label>
                          <input
                            type="number"
                            step="0.01"
                            value={item.factor}
                            onChange={(e) => handleItemChange(idx, "factor", Number(e.target.value))}
                            className="w-full bg-[#FFFDFC] border border-[#DED8CF] px-3 py-2 rounded-xl text-xs font-mono font-bold text-[#B44E2A] outline-none focus:border-[#173E3B]"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-heading font-bold text-[#2F7D5C] mb-1">Cuota Final ($)</label>
                          <input
                            type="number"
                            value={item.valorCuota || ""}
                            onChange={(e) => handleItemChange(idx, "valorCuota", Number(e.target.value))}
                            placeholder="Ej: 85000"
                            className="w-full bg-[#FFFDFC] border border-[#2F7D5C] px-3 py-2 rounded-xl text-xs font-mono font-bold text-[#2F7D5C] outline-none focus:border-[#173E3B]"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Botones de Acción */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-[#DED8CF]">
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={handleEnviarWhatsApp}
                    className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 bg-[#25D366] hover:bg-[#20bd5a] text-white px-4 py-2.5 rounded-xl text-xs font-heading font-bold transition shadow-xs cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" /> Enviar WhatsApp
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDescargarPdf({
                      id: "pres_" + Date.now(),
                      clienteNombre: leadData.nombre || "Cliente",
                      clienteDni: leadData.dni || "-",
                      clienteWhatsapp: leadData.telefono || "-",
                      clienteLocalidad: leadData.localidad || "-",
                      items: draftItems,
                      notas: leadData.notas || ""
                    })}
                    className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 bg-[#FFFDFC] hover:bg-[#F7F3EC] text-[#B44E2A] border border-[#DED8CF] hover:border-[#B44E2A] px-4 py-2.5 rounded-xl text-xs font-heading font-bold transition shadow-xs cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" /> Descargar PDF
                  </button>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="flex-1 sm:flex-none bg-[#FFFDFC] border border-[#DED8CF] hover:border-[#173E3B] text-[#68706E] px-4 py-2.5 rounded-xl text-xs font-heading font-bold transition cursor-pointer"
                  >
                    Cerrar
                  </button>

                  <button
                    type="button"
                    disabled={saving}
                    onClick={handleGuardarPresupuesto}
                    className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 bg-[#173E3B] hover:bg-[#123230] text-white px-5 py-2.5 rounded-xl text-xs font-heading font-bold transition shadow-xs disabled:opacity-50 cursor-pointer"
                  >
                    {saving ? "Guardando..." : "💾 Guardar Presupuesto"}
                  </button>
                </div>
              </div>

            </div>
          </div>
        )}

      </div>
    </div>
  );
}

export default function PresupuestosPage() {
  return (
    <AdminProtectedRoute>
      <Suspense fallback={
        <div className="min-h-screen bg-[#F7F3EC] p-8 text-center">
          <p className="text-sm font-heading font-semibold text-[#68706E] animate-pulse">Cargando módulo de presupuestos...</p>
        </div>
      }>
        <PresupuestosContent />
      </Suspense>
    </AdminProtectedRoute>
  );
}
