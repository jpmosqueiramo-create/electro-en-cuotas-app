"use client";

import { AdminProtectedRoute } from "@/components/AdminProtectedRoute";
import { db } from "@/lib/firebase";
import { collection, getDocs, getDoc, updateDoc, deleteDoc, doc, query, orderBy, addDoc, serverTimestamp } from "firebase/firestore";
import { generarContratoModelo, generarPagareModelo, generarRemitoModelo, generarPdfPresupuesto } from "@/lib/pdfGenerator";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronUp, Search, Filter, AlertCircle, CheckCircle2, Truck, DollarSign, Archive, UserPlus } from "lucide-react";

type Solicitud = {
  id: string;
  clienteId?: string;
  clienteEmail: string;
  cargadoPorAfiliado?: boolean;
  afiliadoEmail?: string;
  estado: string;
  mensajeAdmin: string;
  fechaCreacion: any;
  productoDeseado: string;
  datosPersonales?: {
    nombreCompleto: string;
    numeroDni: string;
    telefono: string;
    direccion: string;
    localidad: string;
    email?: string;
    antiguedadLaboral?: string;
  };
  documentos: {
    dniFrente: string;
    dniDorso: string;
    reciboSueldo: string;
    servicio: string;
  };
  planElegido?: string;
  montoCuota?: number;
  historialRecepcion?: string;
  estadoProducto?: string;
  estadoEntrega?: string;
  numeroSerie?: string;
  montoAbonado?: number;
  metodoPago?: string;
  comentarioEntrega?: string;
  fechaEntrega?: string;
  planPagos?: any[];
};

export default function AdminValidacionesPage() {
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([]);
  const [cargando, setCargando] = useState(true);

  const [nuevosEstados, setNuevosEstados] = useState<Record<string, string>>({});
  const [nuevosMensajes, setNuevosMensajes] = useState<Record<string, string>>({});
  const [guardandoId, setGuardandoId] = useState<string | null>(null);
  const [entregaActiva, setEntregaActiva] = useState<string | null>(null);
  const [nserie, setNserie] = useState("");
  const [montoAbonado, setMontoAbonado] = useState("");
  const [metodoPago, setMetodoPago] = useState("Efectivo");
  const [comentarioEntrega, setComentarioEntrega] = useState("");
  const [activeTab, setActiveTab] = useState<"analisis" | "logistica" | "cobranzas" | "historial" | "aperturas">("analisis");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [aperturas, setAperturas] = useState<any[]>([]);
  const [contratoAEditar, setContratoAEditar] = useState<any | null>(null);

  // States for custom budget drafting for quick contact special requests
  const [budgetProd, setBudgetProd] = useState("");
  const [budgetContado, setBudgetContado] = useState("");
  const [budgetCuotas, setBudgetCuotas] = useState("12");
  const [budgetCuotaValor, setBudgetCuotaValor] = useState("");
  const [budgetTna, setBudgetTna] = useState("60");
  const [budgetMora, setBudgetMora] = useState("0.5");
  const [budgetNotas, setBudgetNotas] = useState("");
  const [budgetProveedor, setBudgetProveedor] = useState("");
  const [budgetLinkProveedor, setBudgetLinkProveedor] = useState("");
  const [budgetCostoProveedor, setBudgetCostoProveedor] = useState("");
  const [draftItems, setDraftItems] = useState<any[]>([]);
  const [editandoPresupuestoId, setEditandoPresupuestoId] = useState<string | null>(null);

  const calcularTnaDesdeCuota = (contado: number, cuota: number, n: number): number => {
    if (contado <= 0 || cuota <= 0 || n <= 0) return 0;
    if (cuota * n <= contado) return 0; // No interest
    
    let low = 0;
    let high = 5.0; // Up to 500% monthly rate
    let r = 0;
    for (let i = 0; i < 100; i++) {
      r = (low + high) / 2;
      const factor = r === 0 ? 1 / n : (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
      const calcCuota = contado * factor;
      if (calcCuota > cuota) {
        high = r;
      } else {
        low = r;
      }
    }
    const tna = r * 12 * 100;
    return Math.round(tna * 10) / 10; // Round to 1 decimal place
  };

  const calcularCuotaDesdeTna = (contado: number, tna: number, n: number): number => {
    if (contado <= 0 || n <= 0) return 0;
    if (tna <= 0) return Math.round(contado / n);
    const r = tna / 1200;
    const factor = (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
    return Math.round(contado * factor);
  };

  const handleManualCalcularCuota = () => {
    const contado = Number(budgetContado) || 0;
    const cuotas = Number(budgetCuotas) || 12;
    const tna = Number(budgetTna) || 0;
    if (contado <= 0) {
      alert("Debes ingresar un Monto Referencia Contado válido.");
      return;
    }
    const cuota = calcularCuotaDesdeTna(contado, tna, cuotas);
    setBudgetCuotaValor(cuota > 0 ? String(cuota) : "");
  };

  const handleManualCalcularTna = () => {
    const contado = Number(budgetContado) || 0;
    const cuotas = Number(budgetCuotas) || 12;
    const cuota = Number(budgetCuotaValor) || 0;
    if (contado <= 0 || cuota <= 0) {
      alert("Debes ingresar Monto Contado y Valor de la Cuota para calcular la TNA.");
      return;
    }
    const calculatedTna = calcularTnaDesdeCuota(contado, cuota, cuotas);
    setBudgetTna(calculatedTna > 0 ? String(calculatedTna) : "0");
  };

  const handleAgregarItemAlBorrador = () => {
    if (!budgetProd.trim()) return alert("Debes ingresar el producto propuesto.");
    if (!budgetCuotaValor || isNaN(Number(budgetCuotaValor))) return alert("Debes ingresar un valor de cuota válido.");

    const nuevoItem = {
      id: "item_" + Date.now(),
      producto: budgetProd.trim(),
      contado: Number(budgetContado) || 0,
      cuotas: Number(budgetCuotas) || 12,
      valorCuota: Number(budgetCuotaValor),
      costoProveedor: Number(budgetCostoProveedor) || 0,
      proveedor: budgetProveedor.trim() || null,
      linkProveedor: budgetLinkProveedor.trim() || null
    };

    setDraftItems([...draftItems, nuevoItem]);

    // Reset product specific fields
    setBudgetProd("");
    setBudgetContado("");
    setBudgetCostoProveedor("");
    setBudgetProveedor("");
    setBudgetLinkProveedor("");
    setBudgetCuotaValor("");
  };

  const handleQuitarItemDelBorrador = (itemId: string) => {
    setDraftItems(draftItems.filter(item => item.id !== itemId));
  };

  const handleCargarPresupuestoParaEditar = (sol: any, pres: any) => {
    setEditandoPresupuestoId(pres.id);
    setDraftItems(pres.items || []);
    setBudgetTna(String(pres.tna || 60));
    setBudgetMora(String(pres.mora || 0.5));
    setBudgetNotas(pres.notas || "");
    // Clear product specific inputs
    setBudgetProd("");
    setBudgetContado("");
    setBudgetCuotaValor("");
    setBudgetCostoProveedor("");
    setBudgetProveedor("");
    setBudgetLinkProveedor("");
    
    alert(`Cargado presupuesto ${pres.id.replace("pres_", "").substring(0, 8).toUpperCase()} para edición. Modifica los ítems y guarda.`);
  };

  const handleCancelarEdicionPresupuesto = () => {
    setEditandoPresupuestoId(null);
    setDraftItems([]);
    setBudgetTna("60");
    setBudgetMora("0.5");
    setBudgetNotas("");
    setBudgetProd("");
    setBudgetContado("");
    setBudgetCuotaValor("");
    setBudgetCostoProveedor("");
    setBudgetProveedor("");
    setBudgetLinkProveedor("");
  };

  const handleEnviarPresupuesto = async (sol: any) => {
    if (draftItems.length === 0) return alert("Debes agregar al menos un producto al presupuesto.");

    let updatedPresupuestos = [];
    if (editandoPresupuestoId) {
      // Update existing budget
      updatedPresupuestos = (sol.presupuestos || []).map((p: any) => {
        if (p.id === editandoPresupuestoId) {
          return {
            ...p,
            items: draftItems,
            tna: Number(budgetTna) || 60,
            mora: Number(budgetMora) || 0.5,
            notas: budgetNotas.trim(),
            fecha: new Date().toISOString(),
            estado: "Enviado" // reset status
          };
        }
        return p;
      });
    } else {
      // Add new budget
      const nuevoPresupuesto = {
        id: "pres_" + Date.now(),
        items: draftItems,
        tna: Number(budgetTna) || 60,
        mora: Number(budgetMora) || 0.5,
        notas: budgetNotas.trim(),
        fecha: new Date().toISOString(),
        estado: "Enviado"
      };
      updatedPresupuestos = [...(sol.presupuestos || []), nuevoPresupuesto];
    }

    try {
      await updateDoc(doc(db, "solicitudes_cuenta", sol.id), {
        presupuestos: updatedPresupuestos
      });
      
      // WhatsApp text generation
      const tel = sol.whatsapp.replace(/[^0-9]/g, "");
      let itemsListText = "";
      draftItems.forEach((item) => {
        itemsListText += `\n- *${item.producto}*: ${item.cuotas} cuotas de $${item.valorCuota}`;
      });
      const msg = `Hola ${sol.nombre || sol.nombreCompleto}, ya armamos tu presupuesto a medida:${itemsListText}\n\nSi estás de acuerdo o querés cambiar algo avisame y lo coordinamos!`;
      const wame = `https://wa.me/${tel}?text=${encodeURIComponent(msg)}`;
      window.open(wame, "_blank");

      alert(editandoPresupuestoId ? "Presupuesto actualizado e invitación de WhatsApp generada." : "Presupuesto guardado e invitación de WhatsApp generada.");
      
      // Reset form and draft
      setEditandoPresupuestoId(null);
      setDraftItems([]);
      setBudgetProd("");
      setBudgetContado("");
      setBudgetCuotaValor("");
      setBudgetNotas("");
      setBudgetProveedor("");
      setBudgetLinkProveedor("");
      
      await fetchAperturas();
    } catch (err) {
      console.error(err);
      alert("Error al guardar presupuesto.");
    }
  };

  const handleDescargarPdfPresupuestoBorrador = (sol: any) => {
    if (draftItems.length === 0) return alert("Debes agregar al menos un producto al presupuesto.");
    const nroPres = sol.id.substring(0, 6).toUpperCase() + "-" + Math.floor(100 + Math.random() * 900);
    generarPdfPresupuesto({
      nroPresupuesto: nroPres,
      fecha: new Date().toLocaleDateString("es-AR"),
      clienteNombre: sol.nombreCompleto || sol.nombre || "Cliente",
      clienteDni: sol.numeroDni || sol.dni || "S/D",
      clienteWhatsapp: sol.whatsapp || "S/D",
      clienteLocalidad: sol.localidad || "S/D",
      items: draftItems,
      notas: budgetNotas.trim() || undefined
    });
  };

  const handleDescargarPdfPresupuestoHistorial = (sol: any, pres: any) => {
    generarPdfPresupuesto({
      nroPresupuesto: pres.id.replace("pres_", "").substring(0, 8).toUpperCase(),
      fecha: new Date(pres.fecha).toLocaleDateString("es-AR"),
      clienteNombre: sol.nombreCompleto || sol.nombre || "Cliente",
      clienteDni: sol.numeroDni || sol.dni || "S/D",
      clienteWhatsapp: sol.whatsapp || "S/D",
      clienteLocalidad: sol.localidad || "S/D",
      items: pres.items || (pres.producto ? [{
        producto: pres.producto,
        contado: pres.contado || 0,
        cuotas: pres.cuotas || 12,
        valorCuota: pres.valorCuota
      }] : []),
      notas: pres.notas || undefined
    });
  };

  const handleAceptarPresupuesto = async (sol: any, presId: string) => {
    if (!confirm("¿Marcar este presupuesto como aceptado por el cliente?")) return;
    const updatedPresupuestos = (sol.presupuestos || []).map((p: any) => {
      if (p.id === presId) {
        return { ...p, estado: "Aceptado" };
      }
      return { ...p, estado: "Rechazado" };
    });

    try {
      await updateDoc(doc(db, "solicitudes_cuenta", sol.id), {
        presupuestos: updatedPresupuestos,
        estado: "Aprobado_Presupuesto" // Special state to signify it's ready for legal contract
      });
      alert("Presupuesto aceptado. Listo para confeccionar contrato.");
      await fetchAperturas();
    } catch (err) {
      console.error(err);
      alert("Error al actualizar presupuesto.");
    }
  };

  const handleRechazarPresupuesto = async (sol: any, presId: string) => {
    if (!confirm("¿Marcar este presupuesto como rechazado?")) return;
    const updatedPresupuestos = (sol.presupuestos || []).map((p: any) => {
      if (p.id === presId) {
        return { ...p, estado: "Rechazado" };
      }
      return p;
    });

    try {
      await updateDoc(doc(db, "solicitudes_cuenta", sol.id), {
        presupuestos: updatedPresupuestos
      });
      alert("Presupuesto rechazado.");
      await fetchAperturas();
    } catch (err) {
      console.error(err);
      alert("Error al actualizar presupuesto.");
    }
  };

  // Stock states for delivery confirmation
  const [productos, setProductos] = useState<any[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [selectedProductStock, setSelectedProductStock] = useState<any | null>(null);
  const [selectedStockUnitId, setSelectedStockUnitId] = useState<string>("");

  const fetchProductos = async () => {
    try {
      const snap = await getDocs(collection(db, "productos"));
      const results: any[] = [];
      snap.forEach(d => results.push({ id: d.id, ...d.data() }));
      setProductos(results);
    } catch (e) {
      console.error("Error cargando productos para stock", e);
    }
  };

  const handleOpenEntregaModal = (sol: any) => {
    setNserie("");
    setMontoAbonado(sol.montoCuota?.toString() || "");
    setMetodoPago("Efectivo");
    setComentarioEntrega("");
    setEntregaActiva(sol.id);

    // Try to auto-match product from inventory
    const searchName = (sol.productoDeseado || "").toLowerCase();
    const matched = productos.find((p: any) => 
      p.nombre.toLowerCase().includes(searchName) || 
      searchName.includes(p.nombre.toLowerCase())
    );

    if (matched) {
      setSelectedProductId(matched.id);
      setSelectedProductStock(matched);
      // Pre-select first available stock unit if any
      const available = (matched.stock || []).filter((u: any) => u.estado === "Disponible");
      if (available.length > 0) {
        setSelectedStockUnitId(available[0].id);
        setNserie(available[0].nserie || "");
      } else {
        setSelectedStockUnitId("manual");
      }
    } else {
      setSelectedProductId("");
      setSelectedProductStock(null);
      setSelectedStockUnitId("manual");
    }
  };

  const handleOpenContratoEditor = (sol: any) => {
    let planCuotasList = [];
    let planElegido = sol.planElegido || "12";
    let montoCuota = sol.montoCuota || 0;
    let tna = sol.tasaInteresTna || 60;
    let mora = sol.tasaMora || 0.5;
    let prod = sol.productoDeseado || sol.productoNombre || "";

    // If it is a quick contact request, load details from the accepted budget!
    if (sol.tipo === "contacto_rapido") {
      const acceptedBudget = (sol.presupuestos || []).find((p: any) => p.estado === "Aceptado");
      if (acceptedBudget) {
        const items = acceptedBudget.items || [];
        if (items.length > 0) {
          prod = items.map((it: any) => it.producto).join(" + ");
          planElegido = String(items[0].cuotas);
          montoCuota = items.reduce((sum: number, it: any) => sum + it.valorCuota, 0);
          tna = acceptedBudget.tna || 60;
          mora = acceptedBudget.mora || 0.5;
        } else if (acceptedBudget.producto) {
          // Fallback for single item budget
          planElegido = String(acceptedBudget.cuotas);
          montoCuota = acceptedBudget.valorCuota;
          tna = acceptedBudget.tna || 60;
          mora = acceptedBudget.mora || 0.5;
          prod = acceptedBudget.producto;
        }
      }
    }

    const vc = montoCuota;

    if (sol.planPagos && sol.planPagos.length > 0) {
      planCuotasList = sol.planPagos.filter((c: any) => c.numero > 0).map((c: any) => ({
        numero: c.numero,
        vencimiento: c.vencimiento ? (c.vencimiento.includes("T") ? c.vencimiento.split("T")[0] : c.vencimiento) : "",
        montoOriginal: c.montoOriginal,
        observacion: c.notaAcumulacion || "Cuota mensual ordinaria"
      }));
    } else {
      const cant = parseInt(planElegido);
      const bDate = new Date();
      for(let i = 1; i <= cant; i++) {
        const nd = new Date(bDate);
        nd.setMonth(nd.getMonth() + i);
        planCuotasList.push({
          numero: i,
          vencimiento: nd.toISOString().split('T')[0],
          montoOriginal: vc,
          observacion: "Cuota mensual ordinaria"
        });
      }
    }

    const nombre = sol.datosPersonales?.nombreCompleto || sol.nombreCompleto || sol.nombre || "";
    const dni = sol.datosPersonales?.numeroDni || sol.numeroDni || sol.dni || "";
    const dom = sol.datosPersonales?.direccion 
      ? `${sol.datosPersonales.direccion}, ${sol.datosPersonales.localidad || ""}` 
      : (sol.direccion || "");
    const tel = sol.datosPersonales?.telefono || sol.whatsapp || "";

    // Reverse-calculate cash price (precioContado) from TNA, plan duration, and installment amount
    let calculatedContado = 0;
    if (sol.precioContado) {
      calculatedContado = Number(sol.precioContado);
    } else {
      const n = parseInt(planElegido);
      if (tna > 0) {
        const r = tna / 1200;
        const factor = (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
        calculatedContado = Math.round(montoCuota / factor);
      } else {
        calculatedContado = montoCuota * n;
      }
    }

    const totalFinanciadoVal = parseInt(planElegido) * vc;
    const factorVal = calculatedContado > 0 ? (totalFinanciadoVal / calculatedContado).toFixed(4) : "1.0000";

    setContratoAEditar({
      solId: sol.id,
      isApertura: true,
      originalSolicitud: sol,
      nroContrato: sol.id.substring(0, 8).toUpperCase(),
      nombreComprador: nombre,
      dni: dni,
      domicilio: dom,
      email: sol.clienteEmail || sol.email || sol.datosPersonales?.email || "",
      whatsapp: tel,
      producto: prod,
      nserie: sol.numeroSerie || "",
      precioContado: String(calculatedContado),
      factorFinanciado: factorVal,
      totalFinanciado: String(totalFinanciadoVal),
      cuotas: planElegido,
      importeCuota: String(vc),
      primeraCuota: planCuotasList[0]?.vencimiento || "",
      tnaComp: String(tna),
      tnaPun: String(sol.tasaMora || 0.5),
      cftEa: "75",
      lugarFecha: `Buenos Aires, ${new Date().toLocaleDateString("es-AR")}`,
      cuotasPlan: planCuotasList
    });
  };

  const handleConfirmarYEnviarWhatsApp = async (c: any) => {
    if (!c.nroContrato || !c.nombreComprador || !c.dni || !c.whatsapp) {
      alert("Por favor complete los datos obligatorios del comprador (Nombre, DNI, WhatsApp, Nro de Contrato).");
      return;
    }

    try {
      const numCuotas = parseInt(c.cuotas) || 12;
      const numImp = parseFloat(c.importeCuota) || 0;
      
      const planPagosMapped = c.cuotasPlan.map((cuota: any) => ({
        numero: cuota.numero,
        montoOriginal: Number(cuota.montoOriginal),
        montoAbonado: 0,
        estado: "PENDIENTE",
        vencimiento: new Date(cuota.vencimiento).toISOString(),
        fechaPago: null,
        metodoPago: null,
        comprobanteUrl: null
      }));

      if (c.isApertura) {
        // 1. Create request in solicitudes collection
        await addDoc(collection(db, "solicitudes"), {
          clienteId: "aperturado_" + c.solId,
          clienteEmail: c.email || "no-email@cuenta-hogar.com",
          datosPersonales: {
            nombreCompleto: c.nombreComprador,
            numeroDni: c.dni,
            telefono: c.whatsapp,
            direccion: c.domicilio,
            localidad: ""
          },
          documentos: {
            dniFrente: "",
            dniDorso: "",
            reciboSueldo: c.originalSolicitud.comprobanteURL || "",
            servicio: ""
          },
          productoDeseado: c.producto,
          montoCuota: numImp,
          planElegido: String(numCuotas),
          tasaInteresTna: Number(c.tnaComp),
          tasaMora: Number(c.tnaPun),
          estado: "PENDIENTE_FIRMA",
          estadoEntrega: "PENDIENTE_ENTREGA",
          fechaCreacion: serverTimestamp(),
          cargadoPorAfiliado: false,
          afiliadoEmail: c.originalSolicitud.referente || null,
          planPagos: planPagosMapped
        });

        // 2. Mark account request as approved
        await updateDoc(doc(db, "solicitudes_cuenta", c.solId), { estado: "Aprobado" });
      } else {
        // 1. Update existing request
        await updateDoc(doc(db, "solicitudes", c.solId), {
          estado: "PENDIENTE_FIRMA",
          montoCuota: numImp,
          planElegido: String(numCuotas),
          tasaInteresTna: Number(c.tnaComp),
          tasaMora: Number(c.tnaPun),
          datosPersonales: {
            ...c.originalSolicitud.datosPersonales,
            nombreCompleto: c.nombreComprador,
            numeroDni: c.dni,
            telefono: c.whatsapp,
            direccion: c.domicilio
          },
          planPagos: planPagosMapped
        });
      }

      // 3. Send WhatsApp
      const tel = c.whatsapp.replace(/[^0-9]/g, "");
      const mensaje = `${c.nombreComprador}, ya aprobamos tu solicitud de gestión de compra por ${c.producto}, pronto nos pondremos en contacto para coordinar entrega. Si tienes alguna consulta escribinos, e intentaremos responderte lo antes posible`;
      const wame = `https://wa.me/${tel}?text=${encodeURIComponent(mensaje)}`;
      
      alert("¡Formularios guardados exitosamente! Redirigiendo a WhatsApp...");
      window.open(wame, "_blank");
      
      // Close editor and reload data
      setContratoAEditar(null);
      await fetchSolicitudes();
      await fetchAperturas();
    } catch (err) {
      console.error(err);
      alert("Ocurrió un error al guardar los formularios y cambiar el estado.");
    }
  };

  const fetchAperturas = async () => {
    try {
      const q = query(collection(db, "solicitudes_cuenta"), orderBy("fecha", "desc"));
      const snap = await getDocs(q);
      const results: any[] = [];
      snap.forEach(d => results.push({ id: d.id, ...d.data() }));
      setAperturas(results);
    } catch (error) {
      console.error(error);
      try {
        const snap2 = await getDocs(collection(db, "solicitudes_cuenta"));
        const results: any[] = [];
        snap2.forEach(d => results.push({ id: d.id, ...d.data() }));
        results.sort((a,b) => (b.fecha?.seconds || 0) - (a.fecha?.seconds || 0));
        setAperturas(results);
      } catch (e) {
        console.error("Fallo doble en aperturas", e);
      }
    }
  };

  const handleActualizarEstadoApertura = async (id: string, nuevoEstado: string) => {
    let motivoRechazo = "";
    if (nuevoEstado === "Rechazado") {
      const motivo = prompt("Por favor, ingresa el motivo del rechazo de esta solicitud de apertura:");
      if (motivo === null) {
        // User clicked cancel, abort
        alert("Actualización cancelada.");
        return;
      }
      if (!motivo.trim()) {
        alert("Debes indicar un motivo de rechazo.");
        return;
      }
      motivoRechazo = motivo.trim();
    }

    try {
      const updateData: any = { estado: nuevoEstado };
      if (nuevoEstado === "Rechazado") {
        updateData.motivoRechazo = motivoRechazo;
      }
      await updateDoc(doc(db, "solicitudes_cuenta", id), updateData);
      alert("Estado de la solicitud de apertura actualizado.");
      await fetchAperturas();
    } catch (e) {
      console.error(e);
      alert("Error al actualizar la solicitud.");
    }
  };

  const handleEliminarApertura = async (id: string) => {
    if (!window.confirm("¿Estás seguro de eliminar esta solicitud de apertura?")) return;
    try {
      await deleteDoc(doc(db, "solicitudes_cuenta", id));
      alert("Solicitud eliminada.");
      await fetchAperturas();
    } catch (e) {
      console.error(e);
      alert("Error al eliminar.");
    }
  };
  const [searchTerm, setSearchTerm] = useState("");

  const fetchSolicitudes = async () => {
    try {
      const q = query(collection(db, "solicitudes"), orderBy("fechaCreacion", "desc"));
      const snap = await getDocs(q);
      const results: Solicitud[] = [];
      snap.forEach(d => results.push({ id: d.id, ...d.data() } as Solicitud));
      setSolicitudes(results);
    } catch (error) {
      console.error(error);
      alert("Error cargando solicitudes. Asegúrate de tener los índices o reglas correctas.");
      try {
        const snap2 = await getDocs(collection(db, "solicitudes"));
        const results: Solicitud[] = [];
        snap2.forEach(d => results.push({ id: d.id, ...d.data() } as Solicitud));
        results.sort((a,b) => b.fechaCreacion?.seconds - a.fechaCreacion?.seconds);
        setSolicitudes(results);
      } catch (e) {
        console.error("Doble fallo", e);
      }
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    fetchSolicitudes();
    fetchAperturas();
    fetchProductos();
  }, []);

  
  
  const handleActualizarEstadoProducto = async (id: string, nuevoEstado: string) => {
    try {
      await updateDoc(doc(db, "solicitudes", id), { estadoProducto: nuevoEstado });
      await fetchSolicitudes();
    } catch (e) { console.error(e); }
  };

  const handleConfirmarEntregaAdmin = async (id: string, nuevoEstado: string, esDirecto: boolean = false, selectedProdId: string = "", selectedUnitId: string = "") => {
    try {
      const dataToUpdate: any = { estadoEntrega: nuevoEstado };
      if (nuevoEstado === "ENTREGADO" && !esDirecto) {
        if (!nserie || nserie.trim().length < 3) return alert("ADMIN: Debes ingresar un número de serie válido.");
        if (!montoAbonado || isNaN(Number(montoAbonado))) return alert("ADMIN: Debes ingresar un monto válido.");
        dataToUpdate.numeroSerie = nserie.trim();
        dataToUpdate.montoAbonado = Number(montoAbonado);
        dataToUpdate.metodoPago = metodoPago;
        if (comentarioEntrega) dataToUpdate.comentarioEntrega = comentarioEntrega;
        dataToUpdate.fechaEntrega = new Date().toISOString();
        if (Number(montoAbonado) > 0) {
           dataToUpdate.estadoRendicion = "CONFIRMADO";
           dataToUpdate.fechaRendicionReal = new Date().toISOString().split('T')[0];
           dataToUpdate.historialRendicion = "Auditoría Automática Administrador Central";
        }

        // Update product stock if a specific unit was selected
        if (selectedProdId && selectedUnitId && selectedUnitId !== "manual") {
          const prodRef = doc(db, "productos", selectedProdId);
          const prodSnap = await getDoc(prodRef);
          if (prodSnap.exists()) {
            const pData = prodSnap.data();
            const updatedStock = (pData.stock || []).map((u: any) => {
              if (u.id === selectedUnitId) {
                return { ...u, estado: "Vendido" };
              }
              return u;
            });
            await updateDoc(prodRef, { stock: updatedStock });
            await fetchProductos();
          }
        }
        
        const solObj = solicitudes.find((s: any) => s.id === id);
        if (solObj && solObj.planElegido) {
           const cant = parseInt(solObj.planElegido);
           const vc = solObj.montoCuota || 0;
           const planArr = [];
           const bDate = new Date();
           
           if (Number(montoAbonado) > 0) {
              planArr.push({
                 numero: 0,
                 montoOriginal: Number(montoAbonado),
                 montoAbonado: Number(montoAbonado),
                 estado: "PAGADO",
                 vencimiento: new Date().toISOString(),
                 fechaPago: new Date().toISOString(),
                 metodoPago: metodoPago,
                 comprobanteUrl: null,
                 notaAcumulacion: "Adelanto Inicial"
              });
           }

           for(let i = 1; i <= cant; i++) {
              const nd = new Date(bDate);
              nd.setMonth(nd.getMonth() + i);
              planArr.push({
                 numero: i,
                 montoOriginal: vc,
                 montoAbonado: 0,
                 estado: "PENDIENTE",
                 vencimiento: nd.toISOString(),
                 fechaPago: null,
                 metodoPago: null,
                 comprobanteUrl: null
              });
           }
           dataToUpdate.planPagos = planArr;
        }
      }
      await updateDoc(doc(db, "solicitudes", id), dataToUpdate);
      alert("Estado de logística actualizado exitosamente");
      setEntregaActiva(null);
      await fetchSolicitudes();
    } catch (e) { alert("Error al actualizar logística"); }
  };

const handleAsignarAfiliado = async (id: string, email: string) => {
    if (email && !email.includes("@")) return alert("Por favor ingresa un email válido para el afiliado.");
    try {
      await updateDoc(doc(db, "solicitudes", id), { afiliadoEmail: email ? email.toLowerCase().trim() : null });
      alert(email ? "Solicitud asignada exitosamente al afiliado: " + email : "Asignación removida");
      await fetchSolicitudes();
    } catch (error) {
      console.error(error);
      alert("Error al asignar afiliado");
    }
  };

  const handleEstadoChange = (id: string, val: string) => {
    setNuevosEstados(prev => ({ ...prev, [id]: val }));
  };
  const handleMensajeChange = (id: string, val: string) => {
    setNuevosMensajes(prev => ({ ...prev, [id]: val }));
  };

  const guardarCambios = async (sol: Solicitud) => {
    const estadoToSave = nuevosEstados[sol.id] || sol.estado;
    const mensajeToSave = nuevosMensajes[sol.id] !== undefined ? nuevosMensajes[sol.id] : (sol.mensajeAdmin || "");
    
    if (estadoToSave === "REQUIERE_INFO" && !mensajeToSave.trim()) {
      return alert("¡Debes escribir un mensaje explicando qué información falta para poder requerirla!");
    }
    if (estadoToSave === "RECHAZADO" && !mensajeToSave.trim()) {
      return alert("¡Debes escribir un motivo de rechazo en el mensaje al usuario para registrar el dictamen!");
    }

    setGuardandoId(sol.id);
    try {
      await updateDoc(doc(db, "solicitudes", sol.id), {
        estado: estadoToSave,
        mensajeAdmin: mensajeToSave
      });
      alert("¡Solicitud actualizada exitosamente!");
      await fetchSolicitudes();
    } catch (error) {
      console.error(error);
      alert("Ocurrió un error al actualizar la solicitud.");
    } finally {
      setGuardandoId(null);
    }
  };

  if (cargando) {
    return <div className="min-h-screen flex items-center justify-center bg-zinc-900/80 text-zinc-100">Cargando base de datos...</div>;
  }

  const combinedRequests = [
    ...aperturas
      .filter((ap: any) => ap.estado === "Pendiente" || ap.estado === "Aprobado_Presupuesto")
      .map((ap: any) => {
        if (ap.tipo === "contacto_rapido") {
          return {
            ...ap,
            isApertura: true,
            nombreCompleto: ap.nombre,
            numeroDni: ap.dni,
            whatsapp: ap.whatsapp,
            localidad: ap.localidad,
            productoNombre: ap.necesidad,
            fechaSort: ap.fecha?.seconds ? ap.fecha.seconds * 1000 : 0
          };
        }
        return { 
          ...ap, 
          isApertura: true, 
          fechaSort: ap.fecha?.seconds ? ap.fecha.seconds * 1000 : 0 
        };
      }),
    ...solicitudes
      .filter((sol: any) => sol.estado === "PENDIENTE" || sol.estado === "REQUIERE_INFO" || sol.estado === "PENDIENTE_FIRMA")
      .map((sol: any) => ({ ...sol, isApertura: false, fechaSort: sol.fechaCreacion?.seconds ? sol.fechaCreacion.seconds * 1000 : 0 }))
  ];
  combinedRequests.sort((a, b) => b.fechaSort - a.fechaSort);

  const filteredCombined = combinedRequests.filter((req: any) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    if (req.isApertura) {
      const searchStr = `${req.nombreCompleto || ''} ${req.numeroDni || ''} ${req.whatsapp || ''} ${req.productoNombre || ''}`.toLowerCase();
      return searchStr.includes(term);
    } else {
      const searchStr = `${req.datosPersonales?.nombreCompleto || ''} ${req.datosPersonales?.numeroDni || ''} ${req.clienteEmail || ''} ${req.productoDeseado || ''}`.toLowerCase();
      return searchStr.includes(term);
    }
  });

  const afiliadoesActivos = Array.from(new Set(["jpmosqueira@hotmail.com", ...solicitudes.map((s: any) => s.afiliadoEmail).filter(Boolean)]));

  return (
    <AdminProtectedRoute>
      <div className="min-h-screen bg-zinc-950 text-zinc-100 p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          
          <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 border-b border-zinc-800 pb-6">
            <div className="flex items-center gap-4">
              <img src="https://storage.googleapis.com/negocio-facil-page.firebasestorage.app/Logos/LOGO%20SIN%20NOMBRE%20-%20CUENTA%20HOGAR.png" alt="Cuenta Hogar Logo" className="h-10 w-auto object-contain" />
              <div>
                <h1 className="text-2xl font-black text-yellow-400">Panel de Control General</h1>
                <p className="text-zinc-500 text-sm">Gestión de créditos, entregas y cobranzas</p>
              </div>
            </div>
            <Link href="/admin" className="text-sm border border-yellow-500/50 hover:bg-yellow-500 hover:text-black px-4 py-2 rounded transition-colors font-bold whitespace-nowrap">
              ← Volver Atrás
            </Link>
          </header>

          {/* TABS NAVIGATION */}
          <div className="flex flex-wrap gap-2 mb-6 bg-zinc-950/50 p-2 rounded-xl border border-zinc-850">
            <button onClick={() => setActiveTab('analisis')} className={`flex-1 min-w-[150px] py-3 px-4 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all ${activeTab === 'analisis' ? 'bg-yellow-500 text-black shadow-2xl shadow-black/60 scale-[1.02]' : 'text-zinc-500 hover:bg-zinc-800/80'}`}>
              <AlertCircle className="w-4 h-4" /> Análisis Crediticio y Solicitudes
            </button>
            <button onClick={() => setActiveTab('logistica')} className={`flex-1 min-w-[150px] py-3 px-4 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all ${activeTab === 'logistica' ? 'bg-blue-600 text-white shadow-2xl shadow-black/60 scale-[1.02]' : 'text-zinc-500 hover:bg-zinc-800/80'}`}>
              <Truck className="w-4 h-4" /> Logística y Entregas
            </button>
            <button onClick={() => setActiveTab('cobranzas')} className={`flex-1 min-w-[150px] py-3 px-4 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all ${activeTab === 'cobranzas' ? 'bg-green-600 text-white shadow-2xl shadow-black/60 scale-[1.02]' : 'text-zinc-500 hover:bg-zinc-800/80'}`}>
              <DollarSign className="w-4 h-4" /> Cobranza de Cuotas
            </button>
            <button onClick={() => setActiveTab('historial')} className={`flex-1 min-w-[150px] py-3 px-4 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all ${activeTab === 'historial' ? 'bg-zinc-700 text-white shadow-2xl shadow-black/60 scale-[1.02]' : 'text-zinc-500 hover:bg-zinc-800/80'}`}>
              <Archive className="w-4 h-4" /> Archivo Completo
            </button>
          </div>

          {/* SEARCH BAR */}
          <div className="mb-6 relative">
             <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
             <input 
               type="text" 
               placeholder="Buscar por DNI, Nombre o Email del cliente..." 
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
               className="w-full bg-zinc-950 border border-zinc-800 text-white pl-12 pr-4 py-4 rounded-xl focus:outline-none focus:border-yellow-500 transition-colors font-medium shadow-inner"
             />
          </div>

          {/* LISTADO DE SOLICITUDES (ACORDEÓN) */}
          <div className="space-y-4">
            {activeTab === 'analisis' ? (
              filteredCombined.length === 0 ? (
                <p className="text-zinc-500 italic text-center py-10">No se encontraron solicitudes pendientes en evaluación.</p>
              ) : (
                filteredCombined.map((req: any) => {
                  const isExpanded = expandedId === req.id;
                  
                  if (req.isApertura) {
                    // Render Apertura Accordion Item
                    return (
                      <div key={req.id} className={`bg-zinc-950 border ${isExpanded ? 'border-amber-500/50 shadow-[0_0_20px_rgba(245,158,11,0.15)]' : 'border-zinc-800 hover:border-amber-500/40'} rounded-xl transition-all overflow-hidden`}>
                        <div 
                          onClick={() => { setExpandedId(isExpanded ? null : req.id); setDraftItems([]); }}
                          className="p-4 md:p-6 cursor-pointer flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-1">
                              {req.tipo === "contacto_rapido" ? (
                                <span className="text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded font-black uppercase tracking-wider">
                                  Producto Especial
                                </span>
                              ) : (
                                <span className="text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded font-black uppercase tracking-wider">
                                  Apertura de Cuenta
                                </span>
                              )}
                              <h3 className="font-bold text-white text-lg">{req.nombreCompleto || "Cliente Sin Nombre"}</h3>
                            </div>
                            <p className="text-sm text-zinc-400 mt-1">DNI: {req.numeroDni || "S/D"} | WhatsApp: {req.whatsapp || "S/D"}</p>
                            {req.fecha && (
                              <p className="text-xs text-zinc-500 mt-1">Recibido el {req.fecha.toDate ? req.fecha.toDate().toLocaleString("es-AR") : new Date(req.fecha?.seconds * 1000).toLocaleString()}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-400 border border-amber-500/50">
                              {req.estado || "Pendiente"}
                            </span>
                            {isExpanded ? <ChevronUp className="w-5 h-5 text-zinc-400" /> : <ChevronDown className="w-5 h-5 text-zinc-400" />}
                          </div>
                        </div>
                        {isExpanded && (
                          <div className="p-6 border-t border-zinc-900 bg-zinc-900/20 space-y-6">
                            {req.estado === "Rechazado" && (
                              <div className="bg-red-950/30 border border-red-500/30 p-4 rounded-xl text-red-400 text-xs flex flex-col gap-1 w-full">
                                <span className="font-black text-red-500 uppercase tracking-widest text-[10px]">❌ Solicitud de Apertura Rechazada</span>
                                <p className="font-mono text-zinc-300">{req.motivoRechazo || "No se especificó un motivo."}</p>
                              </div>
                            )}
                            {req.tipo === "contacto_rapido" ? (
                              // RENDER SECCIÓN ESPECIAL CONTACTO RÁPIDO / PRESUPUESTOS A MEDIDA
                              <div className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                  <div className="space-y-3 bg-zinc-950 p-4 rounded-xl border border-zinc-900">
                                    <h4 className="text-sm font-black text-yellow-400 uppercase tracking-wider border-b border-zinc-900 pb-2 mb-2">Producto Solicitado (Especial)</h4>
                                    <p className="text-sm text-zinc-300 font-bold bg-zinc-900 p-3 rounded-lg border border-zinc-850"><strong className="text-zinc-500 block text-xs uppercase mb-1 font-black">Necesidad del cliente:</strong> {req.necesidad}</p>
                                    <p className="text-sm text-zinc-300"><strong className="text-zinc-500">Localidad:</strong> {req.localidad}</p>
                                    <p className="text-sm text-zinc-300"><strong className="text-zinc-500">Referido por:</strong> {req.referente || "Ninguno"}</p>
                                    <p className="text-sm text-zinc-300"><strong className="text-zinc-500">WhatsApp:</strong> {req.whatsapp}</p>
                                  </div>

                                  {/* Formulario para cargar nuevo presupuesto */}
                                  <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-900 space-y-3">
                                    <h4 className="text-sm font-black text-yellow-400 uppercase tracking-wider border-b border-zinc-900 pb-2">
                                      {editandoPresupuestoId ? `Editar Presupuesto (${editandoPresupuestoId.replace("pres_", "").substring(0, 8).toUpperCase()})` : "Armar Presupuesto Combinado"}
                                    </h4>
                                    <div className="grid grid-cols-2 gap-3">
                                      <div className="col-span-2">
                                        <label className="block text-[10px] text-zinc-500 font-bold mb-1">Producto Propuesto</label>
                                        <input type="text" value={budgetProd} onChange={e=>setBudgetProd(e.target.value)} placeholder="Ej: Samsung S24 Ultra - 256GB" className="bg-zinc-900 border border-zinc-800 p-2 rounded text-xs text-white w-full outline-none focus:border-yellow-500" />
                                      </div>
                                      <div>
                                        <label className="block text-[10px] text-zinc-500 font-bold mb-1">Monto Referencia Contado ($)</label>
                                        <input type="number" value={budgetContado} onChange={e=>setBudgetContado(e.target.value)} placeholder="Opcional" className="bg-zinc-900 border border-zinc-800 p-2 rounded text-xs text-white w-full outline-none focus:border-yellow-500 font-mono" />
                                      </div>
                                      <div>
                                        <label className="block text-[10px] text-zinc-500 font-bold mb-1">Valor de la Cuota ($)</label>
                                        <input type="number" value={budgetCuotaValor} onChange={e=>setBudgetCuotaValor(e.target.value)} placeholder="Ej: 18000" className="bg-zinc-900 border border-zinc-800 p-2 rounded text-xs text-white w-full outline-none focus:border-yellow-500 font-bold font-mono" />
                                      </div>
                                      <div>
                                        <label className="block text-[10px] text-zinc-500 font-bold mb-1">Cantidad de Cuotas</label>
                                        <select value={budgetCuotas} onChange={e=>setBudgetCuotas(e.target.value)} className="bg-zinc-900 border border-zinc-800 p-2 rounded text-xs text-white w-full outline-none focus:border-yellow-500">
                                          <option value="12">12 Cuotas</option>
                                          <option value="8">8 Cuotas</option>
                                          <option value="6">6 Cuotas</option>
                                          <option value="18">18 Cuotas</option>
                                        </select>
                                      </div>
                                      <div>
                                        <label className="block text-[10px] text-zinc-500 font-bold mb-1">TNA Interés (%)</label>
                                        <input type="number" value={budgetTna} onChange={e=>setBudgetTna(e.target.value)} className="bg-zinc-900 border border-zinc-800 p-2 rounded text-xs text-white w-full outline-none focus:border-yellow-500 font-mono" />
                                      </div>
                                      
                                      {/* BOTONES DE CALCULO MANUAL */}
                                      <div className="col-span-2 grid grid-cols-2 gap-2 mt-1">
                                        <button
                                          type="button"
                                          onClick={handleManualCalcularCuota}
                                          className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold py-1.5 px-3 rounded text-[10px] uppercase tracking-wider transition-all shadow-md active:scale-95 text-center flex items-center justify-center gap-1.5 font-sans"
                                        >
                                          🧮 Calcular Cuota
                                        </button>
                                        <button
                                          type="button"
                                          onClick={handleManualCalcularTna}
                                          className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold py-1.5 px-3 rounded text-[10px] uppercase tracking-wider transition-all border border-zinc-700 active:scale-95 text-center flex items-center justify-center gap-1.5 font-sans"
                                        >
                                          🧮 Calcular TNA
                                        </button>
                                      </div>
                                      
                                      {/* NUEVOS CAMPOS EXCLUSIVOS USO INTERNO */}
                                      <div>
                                        <label className="block text-[10px] text-amber-500 font-bold mb-1">🔒 Costo Proveedor ($)</label>
                                        <input type="number" value={budgetCostoProveedor} onChange={e=>setBudgetCostoProveedor(e.target.value)} placeholder="Ej: 80000" className="bg-zinc-900 border border-amber-950/40 p-2 rounded text-xs text-white w-full outline-none focus:border-amber-500 font-mono" />
                                      </div>
                                      <div>
                                        <label className="block text-[10px] text-amber-500 font-bold mb-1">🔒 Proveedor (Uso Interno)</label>
                                        <input type="text" value={budgetProveedor} onChange={e=>setBudgetProveedor(e.target.value)} placeholder="Ej: Distribuidora BA" className="bg-zinc-900 border border-amber-950/40 p-2 rounded text-xs text-white w-full outline-none focus:border-amber-500" />
                                      </div>
                                      <div className="col-span-2">
                                        <label className="block text-[10px] text-amber-500 font-bold mb-1">🔒 Link Proveedor (Uso Interno)</label>
                                        <input type="text" value={budgetLinkProveedor} onChange={e=>setBudgetLinkProveedor(e.target.value)} placeholder="Ej: mercadolibre.com.ar/..." className="bg-zinc-900 border border-amber-950/40 p-2 rounded text-xs text-white w-full outline-none focus:border-amber-500" />
                                      </div>
                                    </div>
                                    <button 
                                      type="button" 
                                      onClick={handleAgregarItemAlBorrador}
                                      className="w-full bg-zinc-800 hover:bg-zinc-700 text-yellow-400 py-2.5 rounded font-bold text-xs uppercase tracking-wider transition-colors mt-2 border border-zinc-700"
                                    >
                                      ＋ Agregar Producto al Presupuesto
                                    </button>

                                    {/* LISTADO DE ITEMS AGREGADOS (BORRADOR) */}
                                    <div className="mt-4 border-t border-zinc-900 pt-3 space-y-2">
                                      <h5 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Borrador del Presupuesto ({draftItems.length})</h5>
                                      {draftItems.length === 0 ? (
                                        <p className="text-[11px] text-zinc-600 italic">No hay productos en el borrador.</p>
                                      ) : (
                                        <div className="space-y-2">
                                          {draftItems.map((item) => (
                                            <div key={item.id} className="flex justify-between items-center bg-zinc-900/60 p-2.5 rounded-lg border border-zinc-850">
                                              <div className="flex-1">
                                                <p className="text-xs text-white font-bold">{item.producto}</p>
                                                <p className="text-[10px] text-zinc-400">{item.cuotas} cuotas de ${item.valorCuota}</p>
                                                {(item.proveedor || item.costoProveedor) && (
                                                  <p className="text-[9px] text-amber-500 italic mt-0.5">🔒 Prov: {item.proveedor || "S/D"} (Costo: ${item.costoProveedor || 0})</p>
                                                )}
                                              </div>
                                              <button type="button" onClick={() => handleQuitarItemDelBorrador(item.id)} className="text-red-500 hover:text-red-400 p-1">
                                                ✕
                                              </button>
                                            </div>
                                          ))}

                                          <div className="pt-2">
                                            <label className="block text-[10px] text-zinc-500 font-bold mb-1">Notas / Detalles Adicionales</label>
                                            <input type="text" value={budgetNotas} onChange={e=>setBudgetNotas(e.target.value)} placeholder="Ej: Vidrio templado y funda de regalo." className="bg-zinc-900 border border-zinc-800 p-2 rounded text-xs text-white w-full outline-none focus:border-yellow-500" />
                                          </div>

                                          <div className="grid grid-cols-2 gap-2 pt-2">
                                            <button 
                                              type="button" 
                                              onClick={() => handleEnviarPresupuesto(req)}
                                              className="bg-yellow-500 hover:bg-yellow-400 text-black py-2 rounded font-black text-[10px] uppercase tracking-wider transition-colors"
                                            >
                                              {editandoPresupuestoId ? "💾 Guardar Cambios" : "💾 Guardar y Enviar"}
                                            </button>
                                            {editandoPresupuestoId ? (
                                              <button 
                                                type="button" 
                                                onClick={handleCancelarEdicionPresupuesto}
                                                className="bg-red-950/40 hover:bg-red-900/60 text-red-400 py-2 rounded font-black text-[10px] uppercase tracking-wider transition-colors border border-red-900/30"
                                              >
                                                ✕ Cancelar Edición
                                              </button>
                                            ) : (
                                              <button 
                                                type="button" 
                                                onClick={() => handleDescargarPdfPresupuestoBorrador(req)}
                                                className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 py-2 rounded font-black text-[10px] uppercase tracking-wider transition-colors border border-zinc-700"
                                              >
                                                📄 Descargar PDF
                                              </button>
                                            )}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                {/* Historial de presupuestos enviados */}
                                <div className="space-y-3">
                                  <h4 className="text-xs font-black text-zinc-400 uppercase tracking-widest border-b border-zinc-800 pb-2">Historial de Presupuestos Enviados</h4>
                                  <div className="space-y-2">
                                    {(!req.presupuestos || req.presupuestos.length === 0) ? (
                                      <p className="text-xs text-zinc-500 italic text-center py-4">No se han enviado presupuestos todavía para esta solicitud especial.</p>
                                    ) : (
                                      req.presupuestos.map((p: any) => (
                                        <div key={p.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-zinc-950 p-4 rounded-xl border border-zinc-850 gap-4">
                                          <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                              <span className="font-bold text-sm text-white">Presupuesto {p.id.replace("pres_", "").substring(0, 8).toUpperCase()}</span>
                                              <span className={`text-[9px] px-2 py-0.5 rounded font-black uppercase ${
                                                p.estado === "Aceptado" ? "bg-green-500/10 text-green-400 border border-green-500/20" :
                                                p.estado === "Rechazado" ? "bg-red-500/10 text-red-400 border border-red-500/20" :
                                                "bg-zinc-850 text-zinc-400 border border-zinc-800"
                                              }`}>
                                                {p.estado}
                                              </span>
                                            </div>

                                            {p.items && p.items.length > 0 ? (
                                              <div className="space-y-1.5 mt-1 border-l-2 border-yellow-500/30 pl-3">
                                                {p.items.map((item: any, idx: number) => (
                                                  <div key={idx} className="text-xs text-zinc-300">
                                                    <span className="font-bold text-white">{item.producto}</span>: {item.cuotas} cuotas de <span className="text-yellow-400 font-mono font-bold">${item.valorCuota}</span>
                                                    {item.contado > 0 && ` (Ref. Contado: $${item.contado})`}
                                                    
                                                    {/* INTERNAL USE FIELDS */}
                                                    {(item.proveedor || item.costoProveedor || item.linkProveedor) && (
                                                      <div className="text-[10px] text-amber-400/80 mt-0.5 bg-amber-500/5 px-2 py-0.5 rounded border border-amber-500/10 inline-block block">
                                                        🔒 Uso Interno: {item.proveedor ? `Prov: ${item.proveedor}` : "Prov: S/D"}
                                                        {item.costoProveedor > 0 && ` (Costo: $${item.costoProveedor})`}
                                                        {item.linkProveedor && (
                                                          <>
                                                            {" | "}
                                                            <a href={item.linkProveedor.startsWith("http") ? item.linkProveedor : `https://${item.linkProveedor}`} target="_blank" rel="noopener noreferrer" className="underline hover:text-amber-300">
                                                              Ver Link del Proveedor ↗
                                                            </a>
                                                          </>
                                                        )}
                                                      </div>
                                                    )}
                                                  </div>
                                                ))}
                                                
                                                {/* SUM OF SUPPLIER COST */}
                                                {p.items.some((it: any) => it.costoProveedor > 0) && (
                                                  <div className="text-[10px] text-amber-400 font-bold mt-2">
                                                    🔒 Costo Proveedor Total: ${p.items.reduce((sum: number, it: any) => sum + (it.costoProveedor || 0), 0)}
                                                  </div>
                                                )}
                                              </div>
                                            ) : (
                                              // Fallback for old single budgets
                                              <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                  <span className="font-bold text-sm text-white">{p.producto}</span>
                                                </div>
                                                <p className="text-xs text-zinc-400">
                                                  Plan: <span className="font-black text-yellow-400 font-mono">{p.cuotas} cuotas de ${p.valorCuota}</span>
                                                  {p.contado > 0 && ` | Ref. Contado: $${p.contado}`}
                                                </p>
                                              </div>
                                            )}

                                            <p className="text-xs text-zinc-400 mt-2 font-bold">
                                              TNA: {p.tna}% | Mora: {p.mora || 0.5}% diaria
                                            </p>
                                            {p.notas && <p className="text-[11px] text-zinc-500 italic mt-1">Notas: {p.notas}</p>}
                                            <p className="text-[9px] text-zinc-600 mt-1">Enviado: {new Date(p.fecha).toLocaleString("es-AR")}</p>
                                          </div>
                                          
                                          <div className="flex items-center gap-2">
                                            <button 
                                              onClick={() => handleDescargarPdfPresupuestoHistorial(req, p)}
                                              className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold px-3 py-1.5 rounded text-xs transition-colors flex items-center gap-1"
                                            >
                                              📄 PDF
                                            </button>
                                            {p.estado === "Enviado" && (
                                              <>
                                                <button 
                                                  onClick={() => handleAceptarPresupuesto(req, p.id)} 
                                                  className="bg-green-600 hover:bg-green-500 text-white font-bold px-3 py-1.5 rounded text-xs transition-colors"
                                                >
                                                  ✓ Aceptar
                                                </button>
                                                <button 
                                                  onClick={() => handleRechazarPresupuesto(req, p.id)} 
                                                  className="bg-transparent hover:bg-red-950/20 text-red-500 hover:text-red-400 font-bold px-3 py-1.5 rounded text-xs transition-colors border border-transparent hover:border-red-900/30"
                                                >
                                                  ✕ Rechazar
                                                </button>
                                                <button 
                                                  onClick={() => handleCargarPresupuestoParaEditar(req, p)} 
                                                  className="bg-blue-650 hover:bg-blue-500 text-white font-bold px-3 py-1.5 rounded text-xs transition-colors"
                                                >
                                                  ✏️ Editar
                                                </button>
                                              </>
                                            )}
                                          </div>
                                        </div>
                                      ))
                                    )}
                                  </div>
                                </div>

                                {/* Acciones de cierre del asesoramiento */}
                                <div className="border-t border-zinc-900 pt-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                  <div>
                                    <a href={`https://wa.me/${req.whatsapp.replace(/[^0-9]/g, "")}`} target="_blank" rel="noopener noreferrer" className="bg-green-600 hover:bg-green-500 text-white font-bold px-4 py-2.5 rounded-lg text-xs transition-colors inline-flex items-center gap-2">
                                      💬 Continuar Asesoramiento WhatsApp
                                    </a>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    {(req.presupuestos || []).some((p: any) => p.estado === "Aceptado") ? (
                                      <button 
                                        onClick={() => handleOpenContratoEditor(req)} 
                                        className="bg-yellow-500 hover:bg-yellow-400 text-black font-black px-5 py-2.5 rounded-lg text-xs uppercase tracking-wider transition-colors shadow-lg"
                                      >
                                        ✍️ Confeccionar Contrato y Pagaré
                                      </button>
                                    ) : (
                                      <span className="text-zinc-500 italic text-xs">Espera a que el cliente acepte un presupuesto para confeccionar formularios.</span>
                                    )}
                                    <button 
                                      onClick={() => handleEliminarApertura(req.id)}
                                      className="text-red-500 hover:text-red-400 text-xs font-bold px-3 py-2 rounded hover:bg-red-950/20 transition-all"
                                    >
                                      🗑️ Rechazar y Archivar
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              // RENDER SECCIÓN ESTÁNDAR DE APERTURA DE CUENTA
                              <>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                  <div className="space-y-3">
                                    <h4 className="text-sm font-bold text-yellow-400 uppercase tracking-wider">Datos Personales</h4>
                                    <p className="text-sm text-zinc-300"><strong className="text-zinc-500">Fecha Nacimiento:</strong> {req.fechaNacimiento || "S/D"}</p>
                                    <p className="text-sm text-zinc-300"><strong className="text-zinc-500">Ocupación:</strong> {req.ocupacion || "S/D"}</p>
                                    <p className="text-sm text-zinc-300"><strong className="text-zinc-500">Dirección y Localidad:</strong> {req.direccion || "S/D"}</p>
                                  </div>
                                  <div className="space-y-3">
                                    <h4 className="text-sm font-bold text-yellow-400 uppercase tracking-wider">Detalles de Scoring</h4>
                                    <p className="text-sm text-zinc-300"><strong className="text-zinc-500">Producto Interés:</strong> {req.productoNombre || "S/D"}</p>
                                    <p className="text-sm text-zinc-300"><strong className="text-zinc-500">TNA Asociada:</strong> {req.tasaInteresTna ? `${req.tasaInteresTna}%` : "No especificada"}</p>
                                    <p className="text-sm text-zinc-300"><strong className="text-zinc-500">Mora Asociada:</strong> {req.tasaMora ? `${req.tasaMora}% diaria` : "No especificada"}</p>
                                    <p className="text-sm text-zinc-300"><strong className="text-zinc-500">Asesor/Afiliado:</strong> {req.nombreAfiliado || "S/D"}</p>
                                    <p className="text-sm text-zinc-300"><strong className="text-zinc-500">Referido por:</strong> {req.referidoPor || "S/D"}</p>
                                    <p className="text-sm text-zinc-300"><strong className="text-zinc-500">Email:</strong> {req.email || "S/D"}</p>
                                    <p className="text-sm text-zinc-300"><strong className="text-zinc-500">Antigüedad Laboral:</strong> {req.antiguedadLaboral ? new Date(req.antiguedadLaboral).toLocaleDateString("es-AR") : "S/D"}</p>
                                  </div>
                                </div>

                                <div className="border-t border-zinc-900 pt-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                  <div>
                                    {req.comprobanteURL && req.comprobanteURL !== "Pendiente envío WhatsApp" ? (
                                      <a href={req.comprobanteURL} target="_blank" rel="noopener noreferrer" className="text-yellow-400 hover:text-yellow-300 font-bold underline flex items-center gap-2">
                                        📄 Ver Comprobante de Ingresos
                                      </a>
                                    ) : (
                                      <span className="text-zinc-500 italic">Sin comprobante subido en web (Pendiente de envío por WhatsApp)</span>
                                    )}
                                  </div>
                                  <div className="flex flex-wrap items-center gap-3">
                                    <a href={`https://wa.me/${(req.whatsapp || "").replace(/[^0-9]/g, "")}`} target="_blank" rel="noopener noreferrer" className="bg-green-600 hover:bg-green-500 text-white font-bold px-4 py-2 rounded-lg text-xs transition-colors">
                                      💬 Hablar por WhatsApp
                                    </a>
                                    <select 
                                      value={req.estado || "Pendiente"} 
                                      onChange={(e) => handleActualizarEstadoApertura(req.id, e.target.value)}
                                      className="bg-zinc-800 text-white border border-zinc-700 px-3 py-1.5 rounded-lg text-xs font-bold outline-none focus:border-yellow-500"
                                    >
                                      <option value="Pendiente">Pendiente</option>
                                      <option value="Aprobado">Aprobado</option>
                                      <option value="Rechazado">Rechazado</option>
                                    </select>
                                    <button onClick={() => handleOpenContratoEditor(req)} className="bg-yellow-500 hover:bg-yellow-400 text-black font-black px-4 py-2 rounded-lg text-xs uppercase tracking-wider transition-colors shadow-lg">
                                      ✍️ Confeccionar Contrato
                                    </button>
                                    <button onClick={() => handleEliminarApertura(req.id)} className="text-red-500 hover:text-red-400 text-xs font-bold px-3 py-2 rounded hover:bg-red-950/20 transition-all">
                                      Borrar
                                    </button>
                                  </div>
                                </div>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  } else {
                    // Render standard Solicitud card
                    const currentEstado = nuevosEstados[req.id] || req.estado;
                    const currentMensaje = nuevosMensajes[req.id] !== undefined ? nuevosMensajes[req.id] : (req.mensajeAdmin || "");
                    
                    return (
                      <div key={req.id} className={`bg-zinc-950 border ${isExpanded ? 'border-yellow-500/50 shadow-[0_0_20px_rgba(234,179,8,0.15)]' : 'border-zinc-800 hover:border-yellow-500/40'} rounded-xl transition-all overflow-hidden`}>
                        {/* CARD HEADER */}
                        <div 
                          onClick={() => setExpandedId(isExpanded ? null : req.id)}
                          className="p-4 md:p-6 cursor-pointer flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative"
                        >
                          {req.cargadoPorAfiliado && (
                            <div className="absolute top-0 left-0 bg-blue-600 text-white text-[10px] font-black px-3 py-1 rounded-br-lg uppercase tracking-widest">
                              Carga Afiliado
                            </div>
                          )}
                          
                          <div className="flex-1 mt-2 md:mt-0">
                            <div className="flex items-center gap-3 mb-1">
                              <span className="text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded font-black uppercase tracking-wider">
                                Solicitud de Producto
                              </span>
                              <h2 className="text-xl font-bold text-white">{req.datosPersonales?.nombreCompleto || "Cliente Sin Nombre"}</h2>
                              <span className="text-sm text-zinc-500 font-medium">DNI: {req.datosPersonales?.numeroDni || "N/A"}</span>
                            </div>
                            <p className="text-yellow-400 font-bold flex items-center gap-2">
                              {req.productoDeseado}
                              <span className="text-xs font-normal text-zinc-500 px-2 py-0.5 bg-zinc-900 rounded">
                                {req.fechaCreacion ? new Date(req.fechaCreacion.seconds * 1000).toLocaleDateString() : ''}
                              </span>
                            </p>
                          </div>

                          <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
                            <div className="flex flex-col items-end">
                              <span className={`px-3 py-1 rounded-full text-xs font-black tracking-widest uppercase border ${
                                  req.estado === "PENDIENTE" ? "bg-blue-500/20 text-blue-400 border-blue-500/50" :
                                  req.estado === "PENDIENTE_FIRMA" ? "bg-cyan-500/20 text-cyan-400 border-cyan-500/50" :
                                  req.estado === "APROBADO" ? "bg-green-500/20 text-green-400 border-green-500/50" :
                                  req.estado === "RECHAZADO" ? "bg-red-500/20 text-red-400 border-red-500/50" :
                                  "bg-orange-500/20 text-orange-400 border-orange-500/50"
                                }`}>
                                {req.estado === "PENDIENTE_FIRMA" ? "Pendiente de Firma" : req.estado}
                              </span>
                              {req.estado === 'APROBADO' && (
                                 <span className="text-[10px] text-zinc-500 mt-1">
                                   Logística: {req.estadoEntrega === 'ENTREGADO' ? '✅ Entregado' : '⏳ Pendiente'}
                                 </span>
                              )}
                            </div>
                            <div className="text-zinc-500 bg-zinc-900 p-2 rounded-full">
                              {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                            </div>
                          </div>
                        </div>

                        {/* CARD BODY */}
                        {isExpanded && (
                          <div className="p-4 md:p-6 border-t border-zinc-800 bg-zinc-900/40">
                            {req.estado === "RECHAZADO" && (
                              <div className="mb-6 bg-red-950/30 border border-red-500/30 p-4 rounded-xl text-red-400 text-xs flex flex-col gap-1 w-full">
                                <span className="font-black text-red-500 uppercase tracking-widest text-[10px]">❌ Solicitud de Producto Rechazada</span>
                                <p className="font-mono text-zinc-300">{req.mensajeAdmin || "No se especificó un motivo."}</p>
                              </div>
                            )}
                            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                              
                              {/* COLUMNA 1 */}
                              <div className="flex flex-col gap-6">
                                 <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-xl shadow-inner">
                                   <h3 className="text-sm font-black text-yellow-400 mb-3 uppercase tracking-widest border-b border-zinc-800 pb-2">Perfil Crediticio</h3>
                                   <div className="space-y-2 text-sm text-zinc-400">
                                     <p><strong className="text-white">Email:</strong> {req.clienteEmail}</p>
                                     <p><strong className="text-white">Teléfono:</strong> {req.datosPersonales?.telefono}</p>
                                     <p><strong className="text-white">Domicilio:</strong> {req.datosPersonales?.direccion}, {req.datosPersonales?.localidad}</p>
                                     <p><strong className="text-white">TNA Pactada:</strong> {req.tasaInteresTna ? `${req.tasaInteresTna}%` : "No especificada"}</p>
                                     <p><strong className="text-white">Mora Pactada:</strong> {req.tasaMora ? `${req.tasaMora}% diaria` : "No especificada"}</p>
                                   </div>
                                 </div>

                                 <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-xl shadow-inner">
                                   <h3 className="text-sm font-black text-yellow-400 mb-3 uppercase tracking-widest border-b border-zinc-800 pb-2">Documentos Adjuntos</h3>
                                   <div className="grid grid-cols-2 gap-3">
                                     <a href={req.documentos?.dniFrente} target="_blank" rel="noreferrer" className="flex items-center justify-center bg-zinc-950 border border-zinc-800 hover:border-yellow-500 text-yellow-400 p-2 rounded-lg text-xs font-bold transition-colors">📷 DNI Frente</a>
                                     <a href={req.documentos?.dniDorso} target="_blank" rel="noreferrer" className="flex items-center justify-center bg-zinc-950 border border-zinc-800 hover:border-yellow-500 text-yellow-400 p-2 rounded-lg text-xs font-bold transition-colors">📷 DNI Dorso</a>
                                     <a href={req.documentos?.reciboSueldo} target="_blank" rel="noreferrer" className="flex items-center justify-center bg-zinc-950 border border-zinc-800 hover:border-yellow-500 text-yellow-400 p-2 rounded-lg text-xs font-bold transition-colors">📄 Recibo Sueldo</a>
                                     <a href={req.documentos?.servicio} target="_blank" rel="noreferrer" className="flex items-center justify-center bg-zinc-950 border border-zinc-800 hover:border-yellow-500 text-yellow-400 p-2 rounded-lg text-xs font-bold transition-colors">📄 Impuesto/Serv.</a>
                                   </div>
                                 </div>

                                 <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-xl shadow-inner">
                                    <h3 className="text-sm font-black text-yellow-400 mb-3 uppercase tracking-widest border-b border-zinc-800 pb-2">Asignación de Afiliado</h3>
                                    {req.afiliadoEmail ? (
                                      <div className="flex flex-col gap-2">
                                        <p className="text-sm text-white font-bold bg-zinc-950 p-2 rounded border border-zinc-850">👤 {req.afiliadoEmail}</p>
                                        <button onClick={() => handleAsignarAfiliado(req.id, "")} className="text-xs text-red-500 hover:text-red-400 font-bold self-start mt-1">✕ Remover Asignación</button>
                                      </div>
                                    ) : (
                                      <div className="flex flex-col gap-2">
                                        <p className="text-xs text-zinc-500 mb-2">Ningún afiliado está a cargo del seguimiento de este cliente.</p>
                                        <select id={`seller_${req.id}`} className="bg-zinc-950 border border-zinc-800 text-xs p-2.5 rounded text-white focus:border-yellow-500 w-full outline-none">
                                          <option value="">-- Asignar Afiliado --</option>
                                          {afiliadoesActivos.map(v => <option key={v} value={v}>{v}</option>)}
                                          <option value="NUEVO" className="font-bold text-yellow-400">+ Escribir correo manualmente...</option>
                                        </select>
                                        <button onClick={() => {
                                           const el = document.getElementById(`seller_${req.id}`) as HTMLSelectElement;
                                           let email = el.value;
                                           if (email === "NUEVO") email = prompt("Escribe el correo exacto del afiliado:") || "";
                                           if (email) handleAsignarAfiliado(req.id, email);
                                        }} className="bg-yellow-500 hover:bg-yellow-400 text-black px-4 py-2 rounded text-xs font-bold transition-colors shadow-md w-full">Delegar Legajo</button>
                                      </div>
                                    )}
                                 </div>
                              </div>

                              {/* COLUMNA 2 */}
                              <div className="flex flex-col gap-6">
                                 <div className="bg-zinc-950 border-2 border-zinc-800 p-5 rounded-xl shadow-2xl shadow-black/60">
                                   <h3 className="text-sm font-black text-yellow-400 mb-4 uppercase tracking-widest flex items-center gap-2"><CheckCircle2 className="w-4 h-4"/> Dictamen Crediticio</h3>
                                   <div className="space-y-4">
                                     <div>
                                       <label className="block text-xs font-bold text-zinc-500 mb-2">Resolución Oficial:</label>
                                       <select 
                                        value={currentEstado} 
                                        onChange={(e) => handleEstadoChange(req.id, e.target.value)}
                                        className={`w-full bg-zinc-900 border-2 rounded-lg p-3 text-sm font-bold focus:outline-none transition-colors ${
                                          currentEstado === 'PENDIENTE' ? 'border-blue-500/50 text-blue-400' :
                                          currentEstado === 'APROBADO' ? 'border-green-500 text-green-400' :
                                          currentEstado === 'RECHAZADO' ? 'border-red-500 text-red-500' :
                                          'border-orange-500 text-orange-400'
                                        }`}
                                       >
                                        <option value="PENDIENTE" className="text-blue-400 font-bold">● PENDIENTE</option>
                                        <option value="APROBADO" className="text-green-400 font-bold">● APROBAR VENTA</option>
                                        <option value="RECHAZADO" className="text-red-500 font-bold">● RECHAZAR SOLICITUD</option>
                                        <option value="REQUIERE_INFO" className="text-orange-400 font-bold">● REQUERIR NUEVA INFO</option>
                                       </select>
                                     </div>
                                     <div>
                                       <label className="block text-xs font-bold text-zinc-500 mb-2">Devolución / Mensaje al Usuario:</label>
                                       <textarea 
                                        value={currentMensaje}
                                        onChange={(e) => handleMensajeChange(req.id, e.target.value)}
                                        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-white focus:border-yellow-500 focus:outline-none text-sm resize-none min-h-[80px]"
                                        placeholder="Escribe un comentario..."
                                       />
                                     </div>
                                     <button 
                                      onClick={() => guardarCambios(req)}
                                      disabled={guardandoId === req.id || (currentEstado === req.estado && currentMensaje === (req.mensajeAdmin||""))}
                                      className="w-full bg-yellow-500 text-black py-3 rounded-lg font-black uppercase tracking-widest text-xs hover:bg-yellow-400 transition-colors shadow-2xl shadow-black/60 disabled:opacity-50 disabled:shadow-none"
                                     >
                                      {guardandoId === req.id ? "Guardando..." : "Registrar Dictamen"}
                                     </button>
                                   </div>
                                 </div>

                                 {/* DOCUMENTACIÓN LEGAL */}
                                 <div className="bg-zinc-950 border border-zinc-850 p-4 rounded-xl">
                                   <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest text-center mb-3">Generación Legal (PDF)</h3>
                                   <div className="grid grid-cols-2 gap-3">
                                     <button onClick={() => handleOpenContratoEditor(req)} className="bg-zinc-950 border border-zinc-800 hover:border-yellow-500 text-zinc-400 hover:text-yellow-400 py-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2">📄 Editar Contrato</button>
                                     <button onClick={() => handleOpenContratoEditor(req)} className="bg-zinc-950 border border-zinc-800 hover:border-yellow-500 text-zinc-400 hover:text-yellow-400 py-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2">📄 Editar Pagaré</button>
                                   </div>
                                 </div>
                              </div>

                              {/* COLUMNA 3 */}
                              <div className="flex flex-col gap-6">
                                 <div className="bg-zinc-950 border border-zinc-850 p-6 rounded-xl flex items-center justify-center text-center h-full">
                                    <p className="text-zinc-500 text-sm">El plan de cuotas y la logística se habilitan una vez firmado el contrato.</p>
                                 </div>
                              </div>
                              
                            </div>

                            {/* PENDIENTE DE FIRMA ACTION CARD */}
                            {req.estado === "PENDIENTE_FIRMA" && (
                              <div className="mt-6 p-5 bg-cyan-950/20 border-2 border-cyan-500/30 rounded-2xl flex flex-col md:flex-row justify-between items-center gap-4 relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/10 rounded-full blur-2xl -mr-10 -mt-10" />
                                <div className="relative z-10">
                                  <h4 className="font-black text-cyan-400 text-base uppercase tracking-wider flex items-center gap-2">✍️ Pendiente de firma del contrato</h4>
                                  <p className="text-xs text-zinc-400 mt-1 max-w-xl">El Contrato y Pagaré fueron generados y la notificación enviada al cliente. Una vez firmados, confirmá la recepción para derivar automáticamente a Logística y despacho del producto.</p>
                                </div>
                                <button 
                                  onClick={async () => {
                                    if (!window.confirm(`¿Confirmas que el cliente ${req.datosPersonales?.nombreCompleto || ''} ya firmó el Contrato y Pagaré?`)) return;
                                    try {
                                      await updateDoc(doc(db, "solicitudes", req.id), { estado: "APROBADO" });
                                      alert("¡Excelente! Contrato firmado. La solicitud ha sido enviada a Logística y Entregas.");
                                      await fetchSolicitudes();
                                    } catch(e) {
                                      alert("Error al confirmar firma.");
                                    }
                                  }}
                                  className="relative z-10 bg-cyan-600 hover:bg-cyan-500 text-white font-black text-xs uppercase tracking-widest px-6 py-3.5 rounded-xl transition-all shadow-xl hover:-translate-y-0.5 active:scale-95"
                                >
                                  ✓ Confirmar Firma y Enviar a Logística
                                </button>
                              </div>
                            )}

                          </div>
                        )}
                      </div>
                    );
                  }
                })
              )
            ) : (
              solicitudes.filter(sol => {
                const searchStr = `${sol.datosPersonales?.nombreCompleto || ''} ${sol.datosPersonales?.numeroDni || ''} ${sol.clienteEmail || ''} ${sol.productoDeseado || ''}`.toLowerCase();
                if (searchTerm && !searchStr.includes(searchTerm.toLowerCase())) return false;
                
                if (activeTab === 'logistica') return sol.estado === 'APROBADO' && sol.estadoEntrega !== 'ENTREGADO';
                if (activeTab === 'cobranzas') return sol.estado === 'APROBADO' && sol.estadoEntrega === 'ENTREGADO' && sol.planPagos && sol.planPagos.some(p => p.estado === 'EN_REVISION' || p.estado === 'PENDIENTE');
                return true; // Historial
              }).map(sol => {
                const currentEstado = nuevosEstados[sol.id] || sol.estado;
                const currentMensaje = nuevosMensajes[sol.id] !== undefined ? nuevosMensajes[sol.id] : (sol.mensajeAdmin || "");
                const isExpanded = expandedId === sol.id;
                
                return (
                  <div key={sol.id} className={`bg-zinc-950 border ${isExpanded ? 'border-yellow-500/50 shadow-[0_0_20px_rgba(234,179,8,0.15)]' : 'border-zinc-800 hover:border-yellow-500/40'} rounded-xl transition-all overflow-hidden`}>
                    
                    {/* CARD HEADER (COMPACT VIEW) */}
                    <div 
                      onClick={() => setExpandedId(isExpanded ? null : sol.id)}
                      className="p-4 md:p-6 cursor-pointer flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative"
                    >
                      {sol.cargadoPorAfiliado && (
                        <div className="absolute top-0 left-0 bg-blue-600 text-white text-[10px] font-black px-3 py-1 rounded-br-lg uppercase tracking-widest">
                          Carga Afiliado
                        </div>
                      )}
                      
                      <div className="flex-1 mt-2 md:mt-0">
                        <div className="flex items-center gap-3 mb-1">
                          <h2 className="text-xl font-bold text-white">{sol.datosPersonales?.nombreCompleto || "Cliente Sin Nombre"}</h2>
                          <span className="text-sm text-zinc-500 font-medium">DNI: {sol.datosPersonales?.numeroDni || "N/A"}</span>
                        </div>
                        <p className="text-yellow-400 font-bold flex items-center gap-2">
                          {sol.productoDeseado}
                          <span className="text-xs font-normal text-zinc-500 px-2 py-0.5 bg-zinc-900 rounded">
                            {sol.fechaCreacion ? new Date(sol.fechaCreacion.seconds * 1000).toLocaleDateString() : ''}
                          </span>
                        </p>
                      </div>

                      <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
                        <div className="flex flex-col items-end">
                          <span className={`px-3 py-1 rounded-full text-xs font-black tracking-widest uppercase border ${
                              sol.estado === "PENDIENTE" ? "bg-blue-500/20 text-blue-400 border-blue-500/50" :
                              sol.estado === "PENDIENTE_FIRMA" ? "bg-cyan-500/20 text-cyan-400 border-cyan-500/50" :
                              sol.estado === "APROBADO" ? "bg-green-500/20 text-green-400 border-green-500/50" :
                              sol.estado === "RECHAZADO" ? "bg-red-500/20 text-red-400 border-red-500/50" :
                              "bg-orange-500/20 text-orange-400 border-orange-500/50"
                            }`}>
                            {sol.estado === "PENDIENTE_FIRMA" ? "Pendiente de Firma" : sol.estado}
                          </span>
                          {sol.estado === 'APROBADO' && (
                             <span className="text-[10px] text-zinc-500 mt-1">
                               Logística: {sol.estadoEntrega === 'ENTREGADO' ? '✅ Entregado' : '⏳ Pendiente'}
                             </span>
                          )}
                        </div>
                        <div className="text-zinc-500 bg-zinc-900 p-2 rounded-full">
                          {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                        </div>
                      </div>
                    </div>

                    {/* CARD BODY (EXPANDED VIEW) */}
                    {isExpanded && (
                      <div className="p-4 md:p-6 border-t border-zinc-800 bg-zinc-900/40">
                        
                        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                          
                          {/* COLUMNA 1: PERFIL Y DOCS */}
                          <div className="flex flex-col gap-6">
                             <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-xl shadow-inner">
                               <h3 className="text-sm font-black text-yellow-400 mb-3 uppercase tracking-widest border-b border-zinc-800 pb-2">Perfil Crediticio</h3>
                               <div className="space-y-2 text-sm text-zinc-400">
                                 <p><strong className="text-white">Email:</strong> {sol.clienteEmail}</p>
                                 <p><strong className="text-white">Teléfono:</strong> {sol.datosPersonales?.telefono}</p>
                                 <p><strong className="text-white">Domicilio:</strong> {sol.datosPersonales?.direccion}, {sol.datosPersonales?.localidad}</p>
                                 <p><strong className="text-white">TNA Pactada:</strong> {(sol as any).tasaInteresTna ? `${(sol as any).tasaInteresTna}%` : "No especificada"}</p>
                                 <p><strong className="text-white">Mora Pactada:</strong> {(sol as any).tasaMora ? `${(sol as any).tasaMora}% diaria` : "No especificada"}</p>
                                 {sol.datosPersonales?.email && <p><strong className="text-white">Email Formulario:</strong> {sol.datosPersonales.email}</p>}
                                 {sol.datosPersonales?.antiguedadLaboral && (
                                   <p><strong className="text-white">Antigüedad Laboral:</strong> {new Date(sol.datosPersonales.antiguedadLaboral).toLocaleDateString("es-AR")}</p>
                                 )}
                               </div>
                             </div>

                             <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-xl shadow-inner">
                               <h3 className="text-sm font-black text-yellow-400 mb-3 uppercase tracking-widest border-b border-zinc-800 pb-2">Documentos Adjuntos</h3>
                               <div className="grid grid-cols-2 gap-3">
                                 <a href={sol.documentos?.dniFrente} target="_blank" rel="noreferrer" className="flex items-center justify-center bg-zinc-950 border border-zinc-800 hover:border-yellow-500 text-yellow-400 p-2 rounded-lg text-xs font-bold transition-colors">📷 DNI Frente</a>
                                 <a href={sol.documentos?.dniDorso} target="_blank" rel="noreferrer" className="flex items-center justify-center bg-zinc-950 border border-zinc-800 hover:border-yellow-500 text-yellow-400 p-2 rounded-lg text-xs font-bold transition-colors">📷 DNI Dorso</a>
                                 <a href={sol.documentos?.reciboSueldo} target="_blank" rel="noreferrer" className="flex items-center justify-center bg-zinc-950 border border-zinc-800 hover:border-yellow-500 text-yellow-400 p-2 rounded-lg text-xs font-bold transition-colors">📄 Recibo Sueldo</a>
                                 <a href={sol.documentos?.servicio} target="_blank" rel="noreferrer" className="flex items-center justify-center bg-zinc-950 border border-zinc-800 hover:border-yellow-500 text-yellow-400 p-2 rounded-lg text-xs font-bold transition-colors">📄 Impuesto/Serv.</a>
                               </div>
                             </div>

                             <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-xl shadow-inner">
                                <h3 className="text-sm font-black text-yellow-400 mb-3 uppercase tracking-widest border-b border-zinc-800 pb-2">Asignación de Afiliado</h3>
                                {sol.afiliadoEmail ? (
                                  <div className="flex flex-col gap-2">
                                    <p className="text-sm text-white font-bold bg-zinc-950 p-2 rounded border border-zinc-850">👤 {sol.afiliadoEmail}</p>
                                    <button onClick={() => handleAsignarAfiliado(sol.id, "")} className="text-xs text-red-500 hover:text-red-400 font-bold self-start mt-1">✕ Remover Asignación</button>
                                  </div>
                                ) : (
                                  <div className="flex flex-col gap-2">
                                    <p className="text-xs text-zinc-500 mb-2">Ningún afiliado está a cargo del seguimiento de este cliente.</p>
                                    <select id={`seller_${sol.id}`} className="bg-zinc-950 border border-zinc-800 text-xs p-2.5 rounded text-white focus:border-yellow-500 w-full outline-none">
                                      <option value="">-- Asignar Afiliado --</option>
                                      {afiliadoesActivos.map(v => <option key={v as string} value={v as string}>{v as string}</option>)}
                                      <option value="NUEVO" className="font-bold text-yellow-400">+ Escribir correo manualmente...</option>
                                    </select>
                                    <button onClick={() => {
                                       const el = document.getElementById(`seller_${sol.id}`) as HTMLSelectElement;
                                       let email = el.value;
                                       if (email === "NUEVO") email = prompt("Escribe el correo exacto del afiliado:") || "";
                                       if (email) handleAsignarAfiliado(sol.id, email);
                                    }} className="bg-yellow-500 hover:bg-yellow-400 text-black px-4 py-2 rounded text-xs font-bold transition-colors shadow-md w-full">Delegar Legajo</button>
                                  </div>
                                )}
                             </div>
                          </div>

                          {/* COLUMNA 2: ADMINISTRACIÓN Y LOGÍSTICA */}
                          <div className="flex flex-col gap-6">
                             
                             {/* DICTAMEN CREDITICIO */}
                             <div className="bg-zinc-950 border-2 border-zinc-800 p-5 rounded-xl shadow-2xl shadow-black/60">
                               <h3 className="text-sm font-black text-yellow-400 mb-4 uppercase tracking-widest flex items-center gap-2"><CheckCircle2 className="w-4 h-4"/> Dictamen Crediticio</h3>
                               <div className="space-y-4">
                                 <div>
                                   <label className="block text-xs font-bold text-zinc-500 mb-2">Resolución Oficial:</label>
                                   <select 
                                    value={currentEstado} 
                                    onChange={(e) => handleEstadoChange(sol.id, e.target.value)}
                                    className={`w-full bg-zinc-900 border-2 rounded-lg p-3 text-sm font-bold focus:outline-none transition-colors ${
                                      currentEstado === 'PENDIENTE' ? 'border-blue-500/50 text-blue-400' :
                                      currentEstado === 'APROBADO' ? 'border-green-500 text-green-400' :
                                      currentEstado === 'RECHAZADO' ? 'border-red-500 text-red-500' :
                                      'border-orange-500 text-orange-400'
                                    }`}
                                   >
                                    <option value="PENDIENTE" className="text-blue-400 font-bold">● PENDIENTE</option>
                                    <option value="APROBADO" className="text-green-400 font-bold">● APROBAR VENTA</option>
                                    <option value="RECHAZADO" className="text-red-500 font-bold">● RECHAZAR SOLICITUD</option>
                                    <option value="REQUIERE_INFO" className="text-orange-400 font-bold">● REQUERIR NUEVA INFO</option>
                                   </select>
                                 </div>
                                 <div>
                                   <label className="block text-xs font-bold text-zinc-500 mb-2">Devolución / Mensaje al Usuario:</label>
                                   <textarea 
                                    value={currentMensaje}
                                    onChange={(e) => handleMensajeChange(sol.id, e.target.value)}
                                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-white focus:border-yellow-500 focus:outline-none text-sm resize-none min-h-[80px]"
                                    placeholder="Escribe un comentario si rechazás o pedís más info..."
                                   />
                                 </div>
                                 <button 
                                  onClick={() => guardarCambios(sol)}
                                  disabled={guardandoId === sol.id || (currentEstado === sol.estado && currentMensaje === (sol.mensajeAdmin||""))}
                                  className="w-full bg-yellow-500 text-black py-3 rounded-lg font-black uppercase tracking-widest text-xs hover:bg-yellow-400 transition-colors shadow-2xl shadow-black/60 disabled:opacity-50 disabled:shadow-none"
                                 >
                                  {guardandoId === sol.id ? "Guardando..." : "Registrar Dictamen"}
                                 </button>
                               </div>
                             </div>

                             {/* LOGÍSTICA (SOLO SI ESTÁ APROBADO) */}
                             {(sol.estado === "APROBADO" || currentEstado === "APROBADO") && (
                               <div className="bg-blue-950/20 border-2 border-blue-500/30 p-5 rounded-xl shadow-2xl shadow-black/60 relative overflow-hidden">
                                 <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl -mr-10 -mt-10" />
                                 <h3 className="text-sm font-black text-blue-400 mb-4 uppercase tracking-widest flex items-center gap-2"><Truck className="w-4 h-4"/> Logística y Entrega</h3>
                                 
                                 <div className="space-y-4 relative z-10">
                                   <div>
                                      <label className="block text-xs font-bold text-blue-300/70 mb-2">Ubicación Física del Inventario:</label>
                                      <select 
                                        value={sol.estadoProducto || "En depósito (Central)"}
                                        onChange={e => handleActualizarEstadoProducto(sol.id, e.target.value)}
                                        className="bg-zinc-900 text-sm p-3 rounded-lg text-white font-medium outline-none border border-blue-900 focus:border-blue-500 w-full"
                                      >
                                         <option value="En depósito (Central)">🏢 En depósito (Central)</option>
                                         <option value="En stock (Afiliado)">👤 En manos del Afiliado</option>
                                         <option value="En viaje">🚚 En viaje al Cliente</option>
                                         <option value="Encargado a proveedor">📦 Encargado a proveedor</option>
                                      </select>
                                      {sol.historialRecepcion && (
                                        <p className="text-[10px] text-green-400 mt-2 bg-green-900/20 px-2 py-1.5 rounded-md border border-green-500/10 flex items-center gap-1">
                                          <CheckCircle2 className="w-3 h-3"/> {sol.historialRecepcion}
                                        </p>
                                      )}
                                   </div>

                                   <div className="pt-2 border-t border-blue-900/50">
                                      <label className="block text-xs font-bold text-blue-300/70 mb-2">Estado Final de Entrega al Cliente:</label>
                                      {entregaActiva === sol.id ? (
                                        <div className="bg-zinc-900 border border-blue-500 p-4 rounded-xl flex flex-col gap-3 shadow-2xl">
                                           <h4 className="text-blue-400 font-bold text-xs uppercase text-center border-b border-blue-900 pb-2 mb-1">Confirmar Cierre y Adelanto</h4>
                                           
                                           {/* Selector de Producto de Inventario */}
                                           <div>
                                             <label className="block text-[10px] text-zinc-500 mb-1 font-bold">Producto en Catálogo</label>
                                             <select 
                                               value={selectedProductId}
                                               onChange={(e) => {
                                                 const pId = e.target.value;
                                                 setSelectedProductId(pId);
                                                 const prodObj = productos.find(p => p.id === pId);
                                                 setSelectedProductStock(prodObj || null);
                                                 setSelectedStockUnitId("manual");
                                                 setNserie("");
                                               }}
                                               className="bg-zinc-950 text-zinc-100 px-3 py-2 rounded-lg text-xs border border-zinc-800 w-full focus:border-blue-500 outline-none"
                                             >
                                               <option value="">-- No vincular a catálogo --</option>
                                               {productos.map(p => (
                                                 <option key={p.id} value={p.id}>{p.nombre}</option>
                                               ))}
                                             </select>
                                           </div>

                                           {/* Selector de Unidad de Stock */}
                                           {selectedProductStock && (
                                             <div>
                                               <label className="block text-[10px] text-zinc-500 mb-1 font-bold">Unidad de Stock Disponible</label>
                                               <select 
                                                 value={selectedStockUnitId}
                                                 onChange={(e) => {
                                                   const unitId = e.target.value;
                                                   setSelectedStockUnitId(unitId);
                                                   if (unitId === "manual") {
                                                     setNserie("");
                                                   } else {
                                                     const unit = (selectedProductStock?.stock || []).find((u: any) => u.id === unitId);
                                                     setNserie(unit?.nserie || "");
                                                   }
                                                 }}
                                                 className="bg-zinc-950 text-zinc-100 px-3 py-2 rounded-lg text-xs border border-zinc-800 w-full focus:border-blue-500 outline-none"
                                               >
                                                 <option value="manual">Cargar manualmente (Sin stock / Otro)</option>
                                                 {(selectedProductStock.stock || []).filter((u: any) => u.estado === "Disponible").map((u: any) => (
                                                   <option key={u.id} value={u.id}>
                                                     [{u.localidad}] - {u.nserie ? `IMEI/Serie: ${u.nserie}` : "Sin número registrado"}
                                                   </option>
                                                 ))}
                                               </select>
                                             </div>
                                           )}

                                           <div>
                                             <label className="block text-[10px] text-zinc-500 mb-1 font-bold">Nº de Serie / IMEI del Producto</label>
                                             <input type="text" value={nserie} onChange={e=>setNserie(e.target.value)} placeholder="Ej: SN-12345" className="bg-zinc-950 text-zinc-100 px-3 py-2.5 rounded-lg text-sm border border-zinc-800 w-full focus:border-blue-500 outline-none font-mono" />
                                           </div>

                                           {/* Botón de Generación de Remito */}
                                           {selectedStockUnitId && selectedStockUnitId !== "manual" && (
                                             <button
                                               type="button"
                                               onClick={() => {
                                                 const unit = (selectedProductStock?.stock || []).find((u: any) => u.id === selectedStockUnitId);
                                                 if (!unit) return;
                                                 
                                                 const rDatos = {
                                                   nroRemito: `R-${sol.id.substring(0, 6).toUpperCase()}`,
                                                   fecha: new Date().toLocaleDateString("es-AR"),
                                                   clienteNombre: sol.datosPersonales?.nombreCompleto || "",
                                                   clienteDni: sol.datosPersonales?.numeroDni || "",
                                                   clienteDireccion: `${sol.datosPersonales?.direccion || ''}, ${sol.datosPersonales?.localidad || ''}`,
                                                   clienteTelefono: sol.datosPersonales?.telefono || "",
                                                   productoNombre: selectedProductStock.nombre,
                                                   nserie: nserie || unit.nserie || "",
                                                   origen: unit.localidad,
                                                   destino: sol.datosPersonales?.localidad || "Lincoln",
                                                   afiliadoEmail: sol.afiliadoEmail || ""
                                                 };
                                                 generarRemitoModelo(rDatos);
                                               }}
                                               className="w-full bg-amber-600 hover:bg-amber-500 text-white font-bold py-2.5 rounded-lg text-xs transition-colors flex items-center justify-center gap-2 shadow-md"
                                             >
                                               📄 Generar Remito de Envío (PDF)
                                             </button>
                                           )}

                                           <div className="grid grid-cols-2 gap-3">
                                             <div>
                                               <label className="block text-[10px] text-zinc-500 mb-1 font-bold">Adelanto Abonado ($)</label>
                                               <input type="number" value={montoAbonado} onChange={e=>setMontoAbonado(e.target.value)} className="bg-zinc-950 text-zinc-100 px-3 py-2.5 rounded-lg text-sm border border-zinc-800 w-full focus:border-yellow-500 outline-none font-black" />
                                             </div>
                                             <div>
                                               <label className="block text-[10px] text-zinc-500 mb-1 font-bold">Método Pago</label>
                                               <select value={metodoPago} onChange={e=>setMetodoPago(e.target.value)} className="bg-zinc-950 text-zinc-100 px-3 py-2.5 rounded-lg text-sm border border-zinc-800 w-full focus:border-blue-500 outline-none">
                                                 <option value="Efectivo">💵 Efectivo</option>
                                                 <option value="Transferencia">📱 Transf.</option>
                                               </select>
                                             </div>
                                           </div>
                                           <div>
                                             <label className="block text-[10px] text-zinc-500 mb-1 font-bold">Nota Logística (Opcional)</label>
                                             <input type="text" value={comentarioEntrega} onChange={e=>setComentarioEntrega(e.target.value)} placeholder="..." className="bg-zinc-950 text-zinc-100 px-3 py-2.5 rounded-lg text-sm border border-zinc-800 w-full focus:border-blue-500 outline-none" />
                                           </div>
                                           <div className="flex gap-2 mt-3">
                                             <button onClick={() => setEntregaActiva(null)} className="flex-1 bg-zinc-800/80 text-zinc-400 py-2.5 rounded-lg text-xs font-bold hover:bg-gray-200 transition">Cancelar</button>
                                             <button onClick={() => handleConfirmarEntregaAdmin(sol.id, "ENTREGADO", false, selectedProductId, selectedStockUnitId)} className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg text-xs font-black hover:bg-blue-500 transition shadow-2xl shadow-black/60">✓ GUARDAR CIERRE</button>
                                           </div>
                                        </div>
                                      ) : (
                                        <select 
                                           value={sol.estadoEntrega || "PENDIENTE_ENTREGA"}
                                           onChange={e => {
                                              const val = e.target.value;
                                              if (val === "ENTREGADO") {
                                                 handleOpenEntregaModal(sol);
                                              } else {
                                                 handleConfirmarEntregaAdmin(sol.id, val, true);
                                              }
                                           }}
                                           className={`w-full text-sm p-3 rounded-lg font-bold outline-none transition-colors border-2 ${sol.estadoEntrega === 'ENTREGADO' ? 'bg-green-900/30 border-green-500/50 text-green-400' : 'bg-zinc-900 border-blue-900 text-white focus:border-blue-500'}`}
                                        >
                                           <option value="PENDIENTE_ENTREGA">⏳ Pendiente de entrega</option>
                                           <option value="ENTREGADO">✅ ENTREGADO Y CERRADO</option>
                                           <option value="ANULADO">❌ Anuló compra / Falló</option>
                                        </select>
                                      )}

                                      {sol.estadoEntrega === "ENTREGADO" && !entregaActiva && (
                                        <div className="bg-zinc-900/50 border border-green-500/10 p-3 rounded-lg mt-3">
                                          <div className="grid grid-cols-2 gap-2 text-xs">
                                            <p className="text-zinc-400"><span className="text-zinc-500 font-bold block text-[10px]">Nº SERIE:</span> {sol.numeroSerie || "N/A"}</p>
                                            <p className="text-zinc-400"><span className="text-zinc-500 font-bold block text-[10px]">ANTICIPO ABONADO:</span> <span className="text-green-400 font-black">${sol.montoAbonado || 0}</span> ({sol.metodoPago || "N/A"})</p>
                                          </div>
                                          {sol.comentarioEntrega && <p className="text-[10px] text-zinc-500 italic mt-2 border-t border-zinc-850 pt-2">&quot;{sol.comentarioEntrega}&quot;</p>}
                                        </div>
                                      )}
                                   </div>
                                 </div>
                               </div>
                             )}

                             {/* DOCUMENTACIÓN LEGAL */}
                             {(currentEstado === "APROBADO" || sol.estado === "APROBADO") && (
                               <div className="bg-zinc-950 border border-zinc-850 p-4 rounded-xl">
                                 <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest text-center mb-3">Generación Legal (PDF)</h3>
                                 <div className="grid grid-cols-2 gap-3">
                                   <button onClick={() => handleOpenContratoEditor(sol)} className="bg-zinc-950 border border-zinc-800 hover:border-yellow-500 text-zinc-400 hover:text-yellow-400 py-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2">📄 Editar Contrato</button>
                                   <button onClick={() => handleOpenContratoEditor(sol)} className="bg-zinc-950 border border-zinc-800 hover:border-yellow-500 text-zinc-400 hover:text-yellow-400 py-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2">📄 Editar Pagaré</button>
                                 </div>
                               </div>
                             )}
                          </div>

                          {/* COLUMNA 3: COBRANZA Y CUOTAS (SOLO SI TIENE PLAN) */}
                          <div className="flex flex-col gap-6">
                            {sol.planPagos ? (
                              <div className="bg-green-950/10 border-2 border-green-500/20 p-5 rounded-xl shadow-2xl shadow-black/60 h-full">
                                <h3 className="text-sm font-black text-green-400 mb-4 uppercase tracking-widest flex items-center gap-2"><DollarSign className="w-4 h-4"/> Auditoría de Cuotas</h3>
                                <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                                  {sol.planPagos.map((cuota: any, idx: number) => (
                                    <div key={idx} className="bg-zinc-900 border border-green-900/50 p-4 rounded-lg flex flex-col gap-3">
                                      <div className="flex justify-between items-start border-b border-green-900/30 pb-2">
                                        <div>
                                          <p className="text-white font-black text-sm">Cuota {cuota.numero} <span className="text-green-400">${cuota.montoOriginal}</span></p>
                                          <p className="text-[10px] text-zinc-500 font-medium">Vence: {new Date(cuota.vencimiento).toLocaleDateString()}</p>
                                        </div>
                                        <div className="text-right">
                                          {cuota.estado === "PAGADO" && <span className="bg-green-500/20 text-green-400 px-2.5 py-1 rounded border border-green-500/10 text-[10px] font-black uppercase tracking-widest">Acreditado</span>}
                                          {cuota.estado === "PENDIENTE" && <span className="bg-orange-500/10 text-orange-500 px-2.5 py-1 rounded border border-orange-500/20 text-[10px] font-black uppercase tracking-widest">Pendiente</span>}
                                          {cuota.estado === "EN_REVISION" && <span className="bg-blue-500/20 text-blue-400 px-2.5 py-1 rounded border border-blue-500/50 text-[10px] font-black uppercase tracking-widest animate-pulse">Revisar Pago</span>}
                                        </div>
                                      </div>
                                      
                                      {cuota.estado === "PAGADO" && cuota.comprobanteUrl && (
                                         <div className="flex justify-end">
                                            <a href={cuota.comprobanteUrl} target="_blank" rel="noreferrer" className="text-[10px] text-zinc-500 hover:text-white transition-colors underline">Ver Recibo Guardado</a>
                                         </div>
                                      )}

                                      {cuota.estado === "EN_REVISION" && (
                                         <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-800 flex flex-col gap-3">
                                            <a href={cuota.comprobanteUrl} target="_blank" rel="noreferrer" className="bg-blue-600/20 text-blue-400 border border-blue-500/50 text-xs font-bold py-2 rounded text-center hover:bg-blue-600 hover:text-white transition-colors">📄 Abrir Comprobante Adjunto</a>
                                            <div className="flex gap-2">
                                              <button onClick={async () => {
                                                  const m = prompt("Motivo de rechazo (Ej: borroso, falso):");
                                                  if (m === null) return;
                                                  const newPlan = [...(sol.planPagos || [])];
                                                  newPlan[idx].estado = "PENDIENTE";
                                                  newPlan[idx].comprobanteUrl = null;
                                                  await updateDoc(doc(db, "solicitudes", sol.id), { planPagos: newPlan });
                                                  await fetchSolicitudes();
                                                  alert("Pago Rechazado.");
                                              }} className="flex-1 bg-red-900/40 text-red-400 border border-red-500/10 hover:bg-red-600 hover:text-white py-2 rounded text-xs font-bold transition">Rechazar</button>
                                              <button onClick={async () => {
                                                  const newPlan = [...(sol.planPagos || [])];
                                                  newPlan[idx].estado = "PAGADO";
                                                  newPlan[idx].fechaPago = new Date().toISOString();
                                                  await updateDoc(doc(db, "solicitudes", sol.id), { planPagos: newPlan });
                                                  if (sol.afiliadoEmail) {
                                                     await addDoc(collection(db, "notificaciones"), {
                                                        afiliadoEmail: sol.afiliadoEmail,
                                                        mensaje: '¡Excelente! Se aprobó el recibo de ' + (sol.datosPersonales?.nombreCompleto || 'cliente') + ' por $' + cuota.montoOriginal + '. Ya tenés la comisión ganada.',
                                                        fecha: new Date().toISOString(),
                                                        leida: false,
                                                        comisionAsociada: cuota.montoOriginal * 0.15,
                                                        estadoPago: "PENDIENTE",
                                                        cuotaAsociada: cuota.numero || idx + 1,
                                                        clienteNombre: sol.datosPersonales?.nombreCompleto || 'Desconocido'
                                                     });
                                                  }
                                                  await fetchSolicitudes();
                                              }} className="flex-1 bg-green-600 hover:bg-green-500 text-white py-2 rounded text-xs font-black transition shadow-2xl shadow-black/60">✓ Aprobar</button>
                                            </div>
                                         </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ) : (
                              <div className="bg-zinc-950 border border-zinc-850 p-6 rounded-xl flex items-center justify-center text-center h-full">
                                 <p className="text-zinc-500 text-sm">Aún no hay plan de cuotas o no se registró la entrega física.</p>
                              </div>
                            )}
                          </div>

                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
             {/* MODAL EDITOR DE CONTRATO */}
             {contratoAEditar && (
               <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4 overflow-y-auto">
                 <div className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-4xl p-6 md:p-8 max-h-[90vh] overflow-y-auto space-y-6 custom-scrollbar shadow-2xl">
                   
                   <div className="flex justify-between items-center border-b border-zinc-800 pb-4">
                     <div>
                       <h2 className="text-xl font-black text-yellow-400">Editor Legal de Contrato / Pagaré</h2>
                       <p className="text-xs text-zinc-500">Revise y modifique los valores antes de exportar a PDF</p>
                     </div>
                     <button onClick={() => setContratoAEditar(null)} className="text-zinc-400 hover:text-white font-black text-sm">
                       ✕ Cerrar
                     </button>
                   </div>

                   <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                     {/* Campos personales */}
                     <div className="md:col-span-3 border-b border-zinc-800/80 pb-2">
                       <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Datos del Comprador</h3>
                     </div>
                     <div>
                       <label className="block text-xs font-bold text-zinc-400 mb-1">Nombre Completo</label>
                       <input type="text" value={contratoAEditar.nombreComprador} onChange={e => setContratoAEditar({...contratoAEditar, nombreComprador: e.target.value})} className="w-full bg-zinc-950 border border-zinc-800 p-2.5 rounded-lg text-white text-xs font-bold focus:border-yellow-500 outline-none" />
                     </div>
                     <div>
                       <label className="block text-xs font-bold text-zinc-400 mb-1">DNI</label>
                       <input type="text" value={contratoAEditar.dni} onChange={e => setContratoAEditar({...contratoAEditar, dni: e.target.value})} className="w-full bg-zinc-950 border border-zinc-800 p-2.5 rounded-lg text-white text-xs font-bold focus:border-yellow-500 outline-none" />
                     </div>
                     <div>
                       <label className="block text-xs font-bold text-zinc-400 mb-1">Domicilio (PBA)</label>
                       <input type="text" value={contratoAEditar.domicilio} onChange={e => setContratoAEditar({...contratoAEditar, domicilio: e.target.value})} className="w-full bg-zinc-950 border border-zinc-800 p-2.5 rounded-lg text-white text-xs font-bold focus:border-yellow-500 outline-none" />
                     </div>
                     <div>
                       <label className="block text-xs font-bold text-zinc-400 mb-1">Email</label>
                       <input type="text" value={contratoAEditar.email} onChange={e => setContratoAEditar({...contratoAEditar, email: e.target.value})} className="w-full bg-zinc-950 border border-zinc-800 p-2.5 rounded-lg text-white text-xs font-bold focus:border-yellow-500 outline-none" />
                     </div>
                     <div>
                       <label className="block text-xs font-bold text-zinc-400 mb-1">WhatsApp</label>
                       <input type="text" value={contratoAEditar.whatsapp} onChange={e => setContratoAEditar({...contratoAEditar, whatsapp: e.target.value})} className="w-full bg-zinc-950 border border-zinc-800 p-2.5 rounded-lg text-white text-xs font-bold focus:border-yellow-500 outline-none" />
                     </div>
                     <div>
                       <label className="block text-xs font-bold text-zinc-400 mb-1">N° de Legajo / Contrato</label>
                       <input type="text" value={contratoAEditar.nroContrato} onChange={e => setContratoAEditar({...contratoAEditar, nroContrato: e.target.value})} className="w-full bg-zinc-950 border border-zinc-800 p-2.5 rounded-lg text-white text-xs font-bold focus:border-yellow-500 outline-none" />
                     </div>

                     {/* Campos del bien */}
                     <div className="md:col-span-3 border-b border-zinc-800/80 pb-2 pt-2">
                       <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Detalles del Bien</h3>
                     </div>
                     <div className="md:col-span-2">
                       <label className="block text-xs font-bold text-zinc-400 mb-1">Producto / Modelo</label>
                       <input type="text" value={contratoAEditar.producto} onChange={e => setContratoAEditar({...contratoAEditar, producto: e.target.value})} className="w-full bg-zinc-950 border border-zinc-800 p-2.5 rounded-lg text-white text-xs font-bold focus:border-yellow-500 outline-none" />
                     </div>
                     <div>
                       <label className="block text-xs font-bold text-zinc-400 mb-1">IMEI / N° de Serie</label>
                       <input type="text" value={contratoAEditar.nserie} onChange={e => setContratoAEditar({...contratoAEditar, nserie: e.target.value})} className="w-full bg-zinc-950 border border-zinc-800 p-2.5 rounded-lg text-white text-xs font-bold focus:border-yellow-500 outline-none" />
                     </div>

                     {/* Financiacion */}
                     <div className="md:col-span-3 border-b border-zinc-800/80 pb-2 pt-2">
                       <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Estructura Financiera</h3>
                     </div>
                     <div>
                       <label className="block text-xs font-bold text-zinc-400 mb-1">Precio Contado ($)</label>
                       <input type="text" value={contratoAEditar.precioContado} onChange={e => {
                          const newPC = e.target.value;
                          const numContado = parseFloat(newPC.replace(/[^0-9.-]/g, "")) || 0;
                          const numTotal = parseFloat(contratoAEditar.totalFinanciado.replace(/[^0-9.-]/g, "")) || 0;
                          const factor = numContado > 0 ? (numTotal / numContado).toFixed(4) : "1.0000";
                          setContratoAEditar({
                            ...contratoAEditar,
                            precioContado: newPC,
                            factorFinanciado: factor
                          });
                        }} className="w-full bg-zinc-950 border border-zinc-800 p-2.5 rounded-lg text-white text-xs font-bold focus:border-yellow-500 outline-none" />
                     </div>
                     <div>
                       <label className="block text-xs font-bold text-zinc-400 mb-1">Factor Financiado</label>
                       <input type="text" value={contratoAEditar.factorFinanciado} onChange={e => setContratoAEditar({...contratoAEditar, factorFinanciado: e.target.value})} className="w-full bg-zinc-950 border border-zinc-800 p-2.5 rounded-lg text-zinc-500 text-xs font-bold focus:border-yellow-500 outline-none bg-zinc-900/50" disabled />
                     </div>
                     <div>
                       <label className="block text-xs font-bold text-zinc-400 mb-1">Total Financiado ($)</label>
                       <input type="text" value={contratoAEditar.totalFinanciado} onChange={e => {
                          const newTF = e.target.value;
                          const numTotal = parseFloat(newTF.replace(/[^0-9.-]/g, "")) || 0;
                          const numContado = parseFloat(contratoAEditar.precioContado.replace(/[^0-9.-]/g, "")) || 0;
                          const factor = numContado > 0 ? (numTotal / numContado).toFixed(4) : "1.0000";
                          setContratoAEditar({
                            ...contratoAEditar,
                            totalFinanciado: newTF,
                            factorFinanciado: factor
                          });
                        }} className="w-full bg-zinc-950 border border-zinc-800 p-2.5 rounded-lg text-white text-xs font-bold focus:border-yellow-500 outline-none" />
                     </div>
                     <div>
                       <label className="block text-xs font-bold text-zinc-400 mb-1">Cantidad de Cuotas</label>
                       <input type="text" value={contratoAEditar.cuotas} onChange={e => {
                          const newCuotas = e.target.value;
                          const numCuotas = parseInt(newCuotas) || 0;
                          const numImp = parseFloat(contratoAEditar.importeCuota.replace(/[^0-9.-]/g, "")) || 0;
                          const newTotal = numCuotas * numImp;
                          const numContado = parseFloat(contratoAEditar.precioContado.replace(/[^0-9.-]/g, "")) || 0;
                          const factor = numContado > 0 ? (newTotal / numContado).toFixed(4) : "1.0000";
                          
                          let newPlan = [...contratoAEditar.cuotasPlan];
                          if (numCuotas > 0) {
                            if (newPlan.length < numCuotas) {
                              const diff = numCuotas - newPlan.length;
                              const bDate = new Date();
                              for (let i = 1; i <= diff; i++) {
                                const nd = new Date(bDate);
                                nd.setMonth(nd.getMonth() + newPlan.length + i);
                                newPlan.push({
                                  numero: newPlan.length + 1,
                                  vencimiento: nd.toISOString().split('T')[0],
                                  montoOriginal: numImp,
                                  observacion: "Cuota mensual ordinaria"
                                });
                              }
                            } else if (newPlan.length > numCuotas) {
                              newPlan = newPlan.slice(0, numCuotas);
                            }
                          }
                          
                          setContratoAEditar({
                            ...contratoAEditar,
                            cuotas: newCuotas,
                            totalFinanciado: String(newTotal),
                            factorFinanciado: factor,
                            cuotasPlan: newPlan
                          });
                        }} className="w-full bg-zinc-950 border border-zinc-800 p-2.5 rounded-lg text-white text-xs font-bold focus:border-yellow-500 outline-none" />
                     </div>
                     <div>
                       <label className="block text-xs font-bold text-zinc-400 mb-1">Importe por Cuota ($)</label>
                       <input type="text" value={contratoAEditar.importeCuota} onChange={e => {
                          const newImp = e.target.value;
                          const numImp = parseFloat(newImp.replace(/[^0-9.-]/g, "")) || 0;
                          const numCuotas = parseInt(contratoAEditar.cuotas) || 0;
                          const newTotal = numCuotas * numImp;
                          const numContado = parseFloat(contratoAEditar.precioContado.replace(/[^0-9.-]/g, "")) || 0;
                          const factor = numContado > 0 ? (newTotal / numContado).toFixed(4) : "1.0000";
                          
                          const newPlan = contratoAEditar.cuotasPlan.map((c: any) => ({
                            ...c,
                            montoOriginal: numImp
                          }));
                          
                          setContratoAEditar({
                            ...contratoAEditar,
                            importeCuota: newImp,
                            totalFinanciado: String(newTotal),
                            factorFinanciado: factor,
                            cuotasPlan: newPlan
                          });
                        }} className="w-full bg-zinc-950 border border-zinc-800 p-2.5 rounded-lg text-white text-xs font-bold focus:border-yellow-500 outline-none" />
                     </div>
                     <div>
                       <label className="block text-xs font-bold text-zinc-400 mb-1">TNA Compensatoria (%)</label>
                       <input type="text" value={contratoAEditar.tnaComp} onChange={e => setContratoAEditar({...contratoAEditar, tnaComp: e.target.value})} className="w-full bg-zinc-950 border border-zinc-800 p-2.5 rounded-lg text-white text-xs font-bold focus:border-yellow-500 outline-none" />
                     </div>
                     <div>
                       <label className="block text-xs font-bold text-zinc-400 mb-1">TNA Punitoria (Mora %)</label>
                       <input type="text" value={contratoAEditar.tnaPun} onChange={e => setContratoAEditar({...contratoAEditar, tnaPun: e.target.value})} className="w-full bg-zinc-950 border border-zinc-800 p-2.5 rounded-lg text-white text-xs font-bold focus:border-yellow-500 outline-none" />
                     </div>
                     <div>
                       <label className="block text-xs font-bold text-zinc-400 mb-1">CFT EA (%)</label>
                       <input type="text" value={contratoAEditar.cftEa} onChange={e => setContratoAEditar({...contratoAEditar, cftEa: e.target.value})} className="w-full bg-zinc-950 border border-zinc-800 p-2.5 rounded-lg text-white text-xs font-bold focus:border-yellow-500 outline-none" />
                     </div>
                     <div>
                       <label className="block text-xs font-bold text-zinc-400 mb-1">Lugar y Fecha Firma</label>
                       <input type="text" value={contratoAEditar.lugarFecha} onChange={e => setContratoAEditar({...contratoAEditar, lugarFecha: e.target.value})} className="w-full bg-zinc-950 border border-zinc-800 p-2.5 rounded-lg text-white text-xs font-bold focus:border-yellow-500 outline-none" />
                     </div>
                   </div>

                   {/* Vencimiento de cuotas */}
                   <div className="space-y-3">
                     <div className="border-b border-zinc-800/80 pb-2">
                       <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Cronograma de Cuotas (Anexo I)</h3>
                     </div>
                     <div className="max-h-[250px] overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                       {contratoAEditar.cuotasPlan.map((c: any, index: number) => (
                         <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-zinc-950 p-3 rounded-lg border border-zinc-850 items-center">
                           <span className="text-xs font-bold text-yellow-400">Cuota N° {c.numero}</span>
                           <div>
                             <label className="block text-[10px] text-zinc-500 font-bold uppercase mb-1">Vencimiento</label>
                             <input type="date" value={c.vencimiento} onChange={e => {
                               const newPlan = [...contratoAEditar.cuotasPlan];
                               newPlan[index].vencimiento = e.target.value;
                               setContratoAEditar({...contratoAEditar, cuotasPlan: newPlan});
                             }} className="w-full bg-zinc-900 border border-zinc-800 p-2 rounded text-xs text-white outline-none" />
                           </div>
                           <div>
                             <label className="block text-[10px] text-zinc-500 font-bold uppercase mb-1">Monto ($)</label>
                             <input type="number" value={c.montoOriginal} onChange={e => {
                               const newPlan = [...contratoAEditar.cuotasPlan];
                               newPlan[index].montoOriginal = Number(e.target.value);
                               setContratoAEditar({...contratoAEditar, cuotasPlan: newPlan});
                             }} className="w-full bg-zinc-900 border border-zinc-800 p-2 rounded text-xs text-white outline-none" />
                           </div>
                           <div>
                             <label className="block text-[10px] text-zinc-500 font-bold uppercase mb-1">Observación</label>
                             <input type="text" value={c.observacion} onChange={e => {
                               const newPlan = [...contratoAEditar.cuotasPlan];
                               newPlan[index].observacion = e.target.value;
                               setContratoAEditar({...contratoAEditar, cuotasPlan: newPlan});
                             }} className="w-full bg-zinc-900 border border-zinc-800 p-2 rounded text-xs text-white outline-none" />
                           </div>
                         </div>
                       ))}
                     </div>
                   </div>

                   {/* Botones de acción */}
                   <div className="flex flex-col gap-4 pt-4 border-t border-zinc-800">
                     <button 
                       onClick={() => handleConfirmarYEnviarWhatsApp(contratoAEditar)} 
                       className="w-full bg-green-600 hover:bg-green-500 text-white py-4 rounded-xl font-black text-sm uppercase tracking-widest transition-colors shadow-xl flex items-center justify-center gap-2"
                     >
                       💬 Confirmar Legajo, Enviar WhatsApp y pasar a "Pendiente de firma"
                     </button>
                     <div className="flex flex-col md:flex-row gap-3">
                       <button onClick={() => generarContratoModelo(contratoAEditar)} className="flex-1 bg-yellow-500 hover:bg-yellow-400 text-black py-3.5 rounded-xl font-black text-xs uppercase tracking-wider transition-colors shadow-lg">
                         📥 Generar Contrato (PDF)
                       </button>
                       <button onClick={() => generarPagareModelo(contratoAEditar)} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-3.5 rounded-xl font-black text-xs uppercase tracking-wider transition-colors shadow-lg">
                         📥 Generar Pagaré (PDF)
                       </button>
                       <button onClick={() => setContratoAEditar(null)} className="bg-transparent border border-zinc-700 text-zinc-400 hover:text-white py-3.5 px-6 rounded-xl font-bold text-xs uppercase tracking-wider transition-colors">
                         Cancelar
                       </button>
                     </div>
                   </div>

                 </div>
               </div>
             )}
        </div>
      </div>
    </AdminProtectedRoute>
  );
}
