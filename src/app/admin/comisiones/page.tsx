"use client";

import { AdminNav } from "@/components/AdminNav";
import { LOGO_BASE64 } from "@/lib/logoBase64";
import { AdminProtectedRoute } from "@/components/AdminProtectedRoute";
import { db } from "@/lib/firebase";
import { obtenerVendedores, crearVendedor, actualizarVendedor, eliminarVendedor, Vendedor } from "@/lib/vendedoresManager";
import { calcularOperacionFinanciera } from "@/lib/financialEngine";
import { collection, getDocs, updateDoc, deleteDoc, addDoc, doc, query, where } from "firebase/firestore";
import { useEffect, useState } from "react";
import Link from "next/link";
import { DollarSign, CheckCircle2, AlertCircle, FileText, ChevronDown, ChevronUp, Trash2, RefreshCw, TrendingUp, Users, UserCheck } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface Props {
  initialTab?: "comisiones" | "rendiciones" | "resumen";
}

export default function AdminComisionesPage({ initialTab = "comisiones" }: Props) {
  const [activeTab, setActiveTab] = useState<"comisiones" | "rendiciones" | "resumen">(initialTab);
  
  // States for Comisiones & Vendedores
  const [comisiones, setComisiones] = useState<any[]>([]);
  const [historialPagos, setHistorialPagos] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);
  const [expandedEmail, setExpandedEmail] = useState<string | null>(null);
  const [vendedoresList, setVendedoresList] = useState<Vendedor[]>([]);
  
  const [modalAgregarVendedorOpen, setModalAgregarVendedorOpen] = useState(false);
  const [nuevoVendedorNombre, setNuevoVendedorNombre] = useState("");
  const [nuevoVendedorEmail, setNuevoVendedorEmail] = useState("");
  const [nuevoVendedorLocalidad, setNuevoVendedorLocalidad] = useState("");
  const [nuevoVendedorPorcentaje, setNuevoVendedorPorcentaje] = useState("15");
  const [guardandoVendedor, setGuardandoVendedor] = useState(false);
  
  const [vendedorAEditar, setVendedorAEditar] = useState<Vendedor | null>(null);
  const [editNombre, setEditNombre] = useState("");
  const [editLocalidad, setEditLocalidad] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPorcentaje, setEditPorcentaje] = useState("");

  // Modal de Pago de Comisiones
  const [modalPagoOpen, setModalPagoOpen] = useState(false);
  const [pagoAfiliadoEmail, setPagoAfiliadoEmail] = useState("");
  const [pagoTipo, setPagoTipo] = useState<"TOTAL" | "PARCIAL">("TOTAL");
  const [pagoMontoInput, setPagoMontoInput] = useState("");
  const [pagoMetodo, setPagoMetodo] = useState("Transferencia Bancaria");
  const [pagoCuentaOrigen, setPagoCuentaOrigen] = useState("Banco Galicia");
  const [pagoComprobanteNum, setPagoComprobanteNum] = useState("");
  const [pagoObservaciones, setPagoObservaciones] = useState("");
  const [procesandoPago, setProcesandoPago] = useState(false);

  // States for Rendiciones de Cobranza
  const [pendientesRendicion, setPendientesRendicion] = useState<any[]>([]);
  const [historialRendicion, setHistorialRendicion] = useState<any[]>([]);
  const [modalRendicionOpen, setModalRendicionOpen] = useState(false);
  const [solicitudSeleccionada, setSolicitudSeleccionada] = useState<any>(null);
  const [fechaCobroReal, setFechaCobroReal] = useState(new Date().toISOString().split('T')[0]);
  const [procesandoRendicion, setProcesandoRendicion] = useState(false);

  const fetchData = async () => {
    try {
      setCargando(true);
      
      // 1. Cargar Comisiones (notificaciones de comisión > 0)
      const qCom = query(collection(db, "notificaciones"), where("comisionAsociada", ">", 0));
      const snapCom = await getDocs(qCom);
      const itemsCom: any[] = [];
      snapCom.forEach(d => {
        itemsCom.push({ id: d.id, ...d.data() });
      });
      itemsCom.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
      setComisiones(itemsCom);

      // 2. Cargar Vendedores
      try { const vends = await obtenerVendedores(); setVendedoresList(vends); } catch(e){}

      // 3. Cargar Historial de Pagos de Comisiones
      try {
        const snapPagos = await getDocs(collection(db, "pagos_comisiones"));
        const itemsPagos: any[] = [];
        snapPagos.forEach(d => {
          itemsPagos.push({ id: d.id, ...d.data() });
        });
        itemsPagos.sort((a, b) => new Date(b.fechaPago).getTime() - new Date(a.fechaPago).getTime());
        setHistorialPagos(itemsPagos);
      } catch (e) {
        console.log("Sin historial previo de pagos comisiones.");
      }

      // 4. Cargar Rendiciones de Cobranza (solicitudes entregadas)
      try {
        const qRend = query(collection(db, "solicitudes"), where("estadoEntrega", "==", "ENTREGADO"));
        const snapRend = await getDocs(qRend);
        const pRend: any[] = [];
        const hRend: any[] = [];

        snapRend.forEach(doc => {
          const data = doc.data();
          if (data.estadoRendicion === "PENDIENTE") {
            pRend.push({ id: doc.id, ...data });
          } else if (data.estadoRendicion === "CONFIRMADO") {
            hRend.push({ id: doc.id, ...data });
          }
        });
        hRend.sort((a, b) => (b.fechaCreacion?.toMillis ? b.fechaCreacion.toMillis() : 0) - (a.fechaCreacion?.toMillis ? a.fechaCreacion.toMillis() : 0));

        setPendientesRendicion(pRend);
        setHistorialRendicion(hRend);
      } catch (e) {
        console.error("Error cargando rendiciones:", e);
      }

    } catch (error) {
      console.error(error);
      alert("Error al cargar datos financieros.");
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Handlers para Limpieza / Eliminación de Pruebas
  const handleEliminarRegistroComisionPrueba = async (notifId: string) => {
    if (!window.confirm("¿Estás seguro de ELIMINAR esta notificación de comisión de prueba?")) return;
    try {
      await deleteDoc(doc(db, "notificaciones", notifId));
      alert("Registro de comisión de prueba eliminado.");
      fetchData();
    } catch (e: any) {
      alert("Error al eliminar: " + e.message);
    }
  };

  const handleEliminarPagoComisionPrueba = async (pagoId: string) => {
    if (!window.confirm("¿Estás seguro de ELIMINAR este recibo/pago de comisión de prueba?")) return;
    try {
      await deleteDoc(doc(db, "pagos_comisiones", pagoId));
      alert("Pago de comisión de prueba eliminado.");
      fetchData();
    } catch (e: any) {
      alert("Error al eliminar: " + e.message);
    }
  };

  const handleEliminarRendicionPrueba = async (solId: string) => {
    if (!window.confirm("¿Estás seguro de REINICIAR / ELIMINAR este registro de rendición de prueba?")) return;
    try {
      await updateDoc(doc(db, "solicitudes", solId), {
        estadoRendicion: "PENDIENTE",
        historialRendicion: null
      });
      alert("Rendición restablecida a estado PENDIENTE para corrección o prueba.");
      fetchData();
    } catch (e: any) {
      alert("Error al modificar rendición: " + e.message);
    }
  };

  const handleEliminarVendedor = async (v: Vendedor) => {
    if (!v.id) return;
    if (!window.confirm(`¿Estás seguro de ELIMINAR el punto de venta / vendedor '${v.nombre}' (${v.localidad})?`)) return;
    try {
      await eliminarVendedor(v.id);
      alert("Punto de venta / vendedor eliminado exitosamente.");
      const updated = await obtenerVendedores();
      setVendedoresList(updated);
    } catch (err: any) {
      console.error(err);
      alert("Error al eliminar vendedor: " + err.message);
    }
  };

  const handleAbrirEdicionVendedor = (v: Vendedor) => {
    setVendedorAEditar(v);
    setEditNombre(v.nombre || "");
    setEditLocalidad(v.localidad || "");
    setEditEmail(v.email || "");
    setEditPorcentaje(String(v.porcentajeComision || 15));
  };

  const handleGuardarEdicionVendedor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendedorAEditar || !vendedorAEditar.id) return;
    const pct = Number(editPorcentaje);
    if (isNaN(pct) || pct < 0 || pct > 100) return alert("Porcentaje de comisión inválido.");

    try {
      await actualizarVendedor(vendedorAEditar.id, {
        nombre: editNombre.trim(),
        localidad: editLocalidad.trim(),
        email: editEmail.trim(),
        porcentajeComision: pct
      });
      alert("Punto de venta / vendedor actualizado exitosamente.");
      setVendedorAEditar(null);
      const updated = await obtenerVendedores();
      setVendedoresList(updated);
    } catch (err: any) {
      console.error(err);
      alert("Error al actualizar vendedor: " + err.message);
    }
  };

  const handleGuardarNuevoVendedor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoVendedorNombre.trim()) return alert("Ingresa el nombre del vendedor.");
    if (!nuevoVendedorLocalidad.trim()) return alert("Ingresa la localidad.");
    const pct = Number(nuevoVendedorPorcentaje);
    if (isNaN(pct) || pct < 0 || pct > 100) return alert("Porcentaje de comisión inválido.");

    setGuardandoVendedor(true);
    try {
      await crearVendedor({
        nombre: nuevoVendedorNombre.trim(),
        email: nuevoVendedorEmail.trim() || `${nuevoVendedorNombre.toLowerCase().replace(/\s+/g, '')}@cuentahogar.com`,
        localidad: nuevoVendedorLocalidad.trim(),
        porcentajeComision: pct,
        activo: true
      });
      alert("Vendedor registrado exitosamente.");
      setNuevoVendedorNombre("");
      setNuevoVendedorEmail("");
      setNuevoVendedorLocalidad("");
      setNuevoVendedorPorcentaje("15");
      setModalAgregarVendedorOpen(false);
      const updated = await obtenerVendedores();
      setVendedoresList(updated);
    } catch (err: any) {
      console.error(err);
      alert("Error al guardar vendedor: " + err.message);
    } finally {
      setGuardandoVendedor(false);
    }
  };

  const handleAbrirModalPago = (email: string, totalPendiente: number, tipo: "TOTAL" | "PARCIAL") => {
    setPagoAfiliadoEmail(email);
    setPagoTipo(tipo);
    setPagoMontoInput(tipo === "TOTAL" ? String(totalPendiente) : "");
    setPagoMetodo("Transferencia Bancaria");
    setPagoCuentaOrigen("Banco Galicia");
    setPagoComprobanteNum("");
    setPagoObservaciones("");
    setModalPagoOpen(true);
  };

  const generarComprobantePDF = (
    email: string,
    pagoData: any,
    itemsAfectados: any[]
  ) => {
    const docPdf = new jsPDF();
    docPdf.setFillColor(15, 23, 42);
    docPdf.rect(15, 12, 180, 28, "F");

    try {
      docPdf.addImage(LOGO_BASE64, "PNG", 17, 14, 24, 24);
    } catch(e){}

    docPdf.setFont("helvetica", "bold");
    docPdf.setFontSize(14);
    docPdf.setTextColor(234, 179, 8);
    docPdf.text("CUENTA HOGAR", 45, 22);

    docPdf.setFontSize(9);
    docPdf.setTextColor(255, 255, 255);
    docPdf.text(
      pagoData.tipoPago === "TOTAL" ? "LIQUIDACIÓN TOTAL DE COMISIONES" : "COMPROBANTE DE PAGO PARCIAL DE COMISIONES",
      190, 22, { align: "right" }
    );

    docPdf.setFontSize(8);
    docPdf.setTextColor(156, 163, 175);
    docPdf.text("Lo que te haga falta, te lo llevamos y financiamos.", 45, 28);

    docPdf.setFontSize(9);
    docPdf.setTextColor(50, 50, 50);
    docPdf.setFont("helvetica", "normal");
    docPdf.text("Beneficiario (Vendedor/Afiliado): " + email, 20, 46);
    docPdf.text("Fecha y Hora de Operación: " + new Date(pagoData.fechaPago).toLocaleString("es-AR"), 20, 52);
    docPdf.text("Método de Pago: " + pagoData.metodoPago + " (" + (pagoData.cuentaOrigen || "Caja General") + ")", 20, 58);
    docPdf.text("N° de Comprobante / Transacción: " + (pagoData.numeroComprobante || "N/A"), 20, 64);

    docPdf.setFillColor(245, 247, 250);
    docPdf.rect(120, 44, 75, 26, "F");
    docPdf.setFont("helvetica", "bold");
    docPdf.setTextColor(22, 163, 74);
    docPdf.text("MONTO ABONADO: $" + (pagoData.montoPagado || 0).toLocaleString("es-AR"), 124, 52);
    docPdf.setTextColor(100, 116, 139);
    docPdf.setFontSize(8);
    docPdf.text("Saldo Anterior: $" + (pagoData.saldoAnterior || 0).toLocaleString("es-AR"), 124, 60);
    docPdf.text("Saldo Restante Pendiente: $" + (pagoData.saldoRestante || 0).toLocaleString("es-AR"), 124, 66);

    if (pagoData.observaciones) {
      docPdf.setFontSize(8);
      docPdf.setFont("helvetica", "italic");
      docPdf.setTextColor(80, 80, 80);
      docPdf.text("Observaciones de la Operación: " + pagoData.observaciones, 20, 74);
    }

    docPdf.setFont("helvetica", "bold");
    docPdf.setFontSize(10);
    docPdf.setTextColor(30, 41, 59);
    const startYTable = pagoData.observaciones ? 80 : 75;
    docPdf.text("Detalle de Operación / Registro de Pago:", 20, startYTable);

    const bodyData = itemsAfectados.length > 0 
      ? itemsAfectados.map(item => [
          new Date(item.fecha).toLocaleDateString("es-AR"),
          item.clienteNombre || "Cliente General",
          item.cuotaAsociada ? "Cuota " + item.cuotaAsociada : "Venta Directa",
          "$" + (item.comisionAsociada || 0).toLocaleString("es-AR"),
          "$" + (item.montoAbonadoEnOperacion || item.comisionAsociada || 0).toLocaleString("es-AR")
        ])
      : [[
          new Date(pagoData.fechaPago).toLocaleDateString("es-AR"),
          "Transacción General",
          pagoData.tipoPago === "TOTAL" ? "Liquidación Total" : "Pago Parcial",
          "$" + (pagoData.montoPagado || 0).toLocaleString("es-AR"),
          "$" + (pagoData.montoPagado || 0).toLocaleString("es-AR")
        ]];

    autoTable(docPdf, {
      startY: startYTable + 3,
      head: [["Fecha", "Cliente", "Concepto", "Comisión Total", "Monto Imputado"]],
      body: bodyData,
      theme: "grid",
      headStyles: { fillColor: [234, 179, 8], textColor: [0, 0, 0], fontStyle: "bold" },
      styles: { fontSize: 8 }
    });

    const finalY = (docPdf as any).lastAutoTable.finalY || 120;
    docPdf.setFont("helvetica", "italic");
    docPdf.setFontSize(8);
    docPdf.setTextColor(100, 100, 100);
    docPdf.text("Este comprobante constituye certificado de pago oficial registrado en Cuenta Hogar.", 105, finalY + 15, { align: "center" });
    docPdf.text("Firma Autorizada: Loop Gestión Integral S.R.L. — Gerente Juan Pablo Mosqueira (Nombre de Fantasía: Cuenta Hogar)", 105, finalY + 25, { align: "center" });

    docPdf.save("Recibo_Comisiones_" + email.split("@")[0] + "_" + Date.now() + ".pdf");
  };

  const handleEjecutarPagoComisiones = async (e: React.FormEvent) => {
    e.preventDefault();
    const monto = Number(pagoMontoInput);
    if (!monto || monto <= 0) return alert("Ingresa un monto válido a pagar.");

    const itemsAfiliado = comisiones.filter(c => c.afiliadoEmail === pagoAfiliadoEmail);
    const pendientes = itemsAfiliado.filter(c => c.estadoPago !== "PAGADA");
    const totalPendiente = pendientes.reduce((acc, curr) => {
      const cobradoPrev = curr.montoPagadoAcumulado || 0;
      return acc + ((curr.comisionAsociada || 0) - cobradoPrev);
    }, 0);

    if (monto > totalPendiente + 0.01) {
      return alert("El monto a pagar ($" + monto + ") no puede superar el saldo pendiente ($" + totalPendiente + ").");
    }

    setProcesandoPago(true);

    try {
      const pendientesOrdenados = [...pendientes].sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());
      let montoRestante = monto;
      const itemsAfectados: any[] = [];
      const fechaOperacion = new Date().toISOString();

      for (const item of pendientesOrdenados) {
        if (montoRestante <= 0) break;

        const comisionTotal = item.comisionAsociada || 0;
        const cobradoPrevio = item.montoPagadoAcumulado || 0;
        const saldoItem = comisionTotal - cobradoPrevio;

        if (montoRestante >= saldoItem) {
          const nuevoAcum = comisionTotal;
          montoRestante -= saldoItem;

          await updateDoc(doc(db, "notificaciones", item.id), {
            estadoPago: "PAGADA",
            montoPagadoAcumulado: nuevoAcum,
            fechaUltimoPago: fechaOperacion
          });

          itemsAfectados.push({
            ...item,
            montoAbonadoEnOperacion: saldoItem
          });
        } else {
          const nuevoAcum = cobradoPrevio + montoRestante;

          await updateDoc(doc(db, "notificaciones", item.id), {
            estadoPago: "PARCIAL",
            montoPagadoAcumulado: nuevoAcum,
            fechaUltimoPago: fechaOperacion
          });

          itemsAfectados.push({
            ...item,
            montoAbonadoEnOperacion: montoRestante
          });

          montoRestante = 0;
        }
      }

      const pagoRecord = {
        afiliadoEmail: pagoAfiliadoEmail,
        montoPagado: monto,
        saldoAnterior: totalPendiente,
        saldoRestante: totalPendiente - monto,
        tipoPago: pagoTipo,
        metodoPago: pagoMetodo,
        cuentaOrigen: pagoCuentaOrigen,
        numeroComprobante: pagoComprobanteNum.trim() || null,
        observaciones: pagoObservaciones.trim() || null,
        fechaPago: fechaOperacion,
        itemsAfectadosIds: itemsAfectados.map(i => i.id)
      };

      await addDoc(collection(db, "pagos_comisiones"), pagoRecord);

      generarComprobantePDF(pagoAfiliadoEmail, pagoRecord, itemsAfectados);

      alert("¡Pago registrado exitosamente y Comprobante PDF emitido!");
      setModalPagoOpen(false);
      fetchData();
    } catch (err: any) {
      console.error("Error al registrar pago:", err);
      alert("Error al registrar operación de pago: " + err.message);
    } finally {
      setProcesandoPago(false);
    }
  };

  const handleConfirmarRendicion = async () => {
    if (!solicitudSeleccionada) return;
    setProcesandoRendicion(true);
    
    try {
      await updateDoc(doc(db, "solicitudes", solicitudSeleccionada.id), {
        estadoRendicion: "CONFIRMADO",
        fechaRendicionReal: fechaCobroReal,
        historialRendicion: `Verificado por el admin indicando fecha de cobro: ${fechaCobroReal}`
      });
      alert("Comprobante de rendición guardado exitosamente.");
      setModalRendicionOpen(false);
      setSolicitudSeleccionada(null);
      fetchData();
    } catch (error: any) {
      console.error("Firebase Update Error:", error);
      alert(`No se pudo guardar la confirmación: ${error.message || "Error desconocido"}`);
    } finally {
      setProcesandoRendicion(false);
    }
  };

  const afiliadosMap: Record<string, any[]> = {};
  comisiones.forEach(c => {
    if (!afiliadosMap[c.afiliadoEmail]) afiliadosMap[c.afiliadoEmail] = [];
    afiliadosMap[c.afiliadoEmail].push(c);
  });
  const afiliadosEmails = Object.keys(afiliadosMap);

  return (
    <AdminProtectedRoute>
      <div className="min-h-screen bg-[#F7F3EC] text-[#1F2928] p-4 md:p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          
          <AdminNav 
            title="Centro de Rendiciones y Comisiones" 
            subtitle="Control integral de cobranzas rendidas, liquidación de comisiones a vendedores y administración de puntos de venta" 
          />

          {/* BARRA DE NAVEGACIÓN UNIFICADA DE PESTAÑAS */}
          <div className="flex flex-wrap items-center gap-2 bg-[#FFFDFC] p-2 rounded-2xl border border-[#DED8CF] shadow-xs">
            <button
              onClick={() => setActiveTab("comisiones")}
              className={`flex-1 sm:flex-none px-5 py-3 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 uppercase tracking-wider ${activeTab === "comisiones" ? "bg-[#173E3B] text-white shadow-md" : "text-[#68706E] hover:text-[#173E3B] hover:bg-[#F7F3EC]"}`}
            >
              <UserCheck className="w-4 h-4" /> 💳 Liquidación de Comisiones & Vendedores
            </button>
            <button
              onClick={() => setActiveTab("rendiciones")}
              className={`flex-1 sm:flex-none px-5 py-3 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 uppercase tracking-wider ${activeTab === "rendiciones" ? "bg-[#173E3B] text-white shadow-md" : "text-[#68706E] hover:text-[#173E3B] hover:bg-[#F7F3EC]"}`}
            >
              <DollarSign className="w-4 h-4" /> 📥 Rendiciones de Cobranza ({pendientesRendicion.length} Pend.)
            </button>
            <button
              onClick={() => setActiveTab("resumen")}
              className={`flex-1 sm:flex-none px-5 py-3 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 uppercase tracking-wider ${activeTab === "resumen" ? "bg-[#173E3B] text-white shadow-md" : "text-[#68706E] hover:text-[#173E3B] hover:bg-[#F7F3EC]"}`}
            >
              <TrendingUp className="w-4 h-4" /> 📊 Resumen Financiero 360°
            </button>

            <button
              onClick={fetchData}
              title="Actualizar datos"
              className="p-3 text-[#68706E] hover:text-[#173E3B] hover:bg-[#F7F3EC] rounded-xl transition ml-auto"
            >
              <RefreshCw className={`w-4 h-4 ${cargando ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {cargando ? (
            <div className="bg-[#FFFDFC] border border-[#DED8CF] p-12 rounded-2xl text-center shadow-xs">
              <p className="text-sm text-[#68706E] animate-pulse font-bold">Cargando base de rendiciones y comisiones...</p>
            </div>
          ) : (
            <>
              {/* TAB 1: COMISIONES Y VENDEDORES */}
              {activeTab === "comisiones" && (
                <div className="space-y-6">
                  {/* BASE DE VENDEDORES Y AFILIADOS */}
                  <div className="bg-[#FFFDFC] border border-[#DED8CF] rounded-2xl p-6 shadow-xs space-y-4">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[#DED8CF] pb-4">
                      <div>
                        <h2 className="text-lg font-black text-[#173E3B] uppercase tracking-wider flex items-center gap-2">
                          👥 Base de Vendedores / Puntos de Venta
                        </h2>
                        <p className="text-xs text-[#68706E]">
                          Fuerza de ventas, localidades y porcentaje de comisión pactada
                        </p>
                      </div>
                      <button
                        onClick={() => setModalAgregarVendedorOpen(true)}
                        className="bg-[#173E3B] hover:bg-[#2F7D5C] text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-2 uppercase tracking-wider"
                      >
                        <span>➕</span> Nuevo Vendedor / Afiliado
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {/* Administrador / Propietario */}
                      <div className="bg-[#F7F3EC] border border-[#DED8CF] p-4 rounded-xl flex justify-between items-center">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-base">👑</span>
                            <h4 className="font-bold text-[#173E3B] text-sm">Administrador / Dueño</h4>
                          </div>
                          <p className="text-[11px] text-[#68706E]">Cobranza Directa Central</p>
                        </div>
                        <div className="text-right">
                          <span className="bg-[#173E3B]/10 text-[#173E3B] text-xs font-black px-2.5 py-1 rounded-full border border-[#173E3B]/20">
                            0% Com.
                          </span>
                        </div>
                      </div>

                      {vendedoresList.map((v) => (
                        <div key={v.id} className="bg-[#FFFDFC] border border-[#DED8CF] p-4 rounded-xl flex flex-col justify-between shadow-xs space-y-3">
                          <div className="flex justify-between items-start gap-2">
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-base">📍</span>
                                <h4 className="font-bold text-[#1F2928] text-sm">{v.nombre}</h4>
                              </div>
                              <p className="text-[11px] text-[#B44E2A] font-bold mt-0.5 flex items-center gap-1">
                                <span>🏙️ Localidad:</span> <span className="bg-orange-100 text-orange-900 px-2 py-0.5 rounded border border-orange-200">{v.localidad || 'Sin Loc.'}</span>
                              </p>
                              <p className="text-[10px] text-[#68706E] mt-0.5">{v.email}</p>
                            </div>
                            <span className="bg-amber-100 text-amber-900 text-xs font-black px-2.5 py-1 rounded-full border border-amber-300">
                              {v.porcentajeComision}% Com.
                            </span>
                          </div>

                          <div className="flex justify-end gap-2 border-t border-[#F7F3EC] pt-2">
                            <button
                              onClick={() => handleAbrirEdicionVendedor(v)}
                              className="bg-[#F7F3EC] hover:bg-[#FFFDFC] text-[#173E3B] px-3 py-1 rounded-lg text-xs font-bold border border-[#DED8CF] transition-colors flex items-center gap-1"
                            >
                              ✏️ Editar Localidad / Datos
                            </button>
                            <button
                              onClick={() => handleEliminarVendedor(v)}
                              className="bg-red-50 hover:bg-red-100 text-red-600 px-2.5 py-1 rounded-lg text-xs font-bold border border-red-200 transition-colors"
                              title="Eliminar punto de venta o vendedor"
                            >
                              🗑️
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* LISTADO DE COMISIONES POR AFILIADO */}
                  <div className="space-y-4">
                    <h2 className="text-lg font-black text-[#173E3B] uppercase tracking-wider border-b border-[#DED8CF] pb-2">
                      💰 Comisiones Ganadas por Fuerza de Ventas
                    </h2>

                    {afiliadosEmails.length === 0 ? (
                      <div className="bg-[#FFFDFC] border border-[#DED8CF] p-8 rounded-2xl text-center shadow-xs">
                        <p className="text-[#68706E] text-xs">No existen registros de comisiones vigentes.</p>
                      </div>
                    ) : (
                      afiliadosEmails.map(email => {
                        const items = afiliadosMap[email];
                        const pendientes = items.filter(i => i.estadoPago !== "PAGADA");
                        const pagosPreviosAfiliado = historialPagos.filter(p => p.afiliadoEmail === email);

                        const totalPendiente = pendientes.reduce((acc, curr) => {
                          const cobrado = curr.montoPagadoAcumulado || 0;
                          return acc + ((curr.comisionAsociada || 0) - cobrado);
                        }, 0);

                        const totalPagadoHistorico = items.reduce((acc, curr) => {
                          return acc + (curr.montoPagadoAcumulado || (curr.estadoPago === "PAGADA" ? curr.comisionAsociada : 0));
                        }, 0);

                        const isExpanded = expandedEmail === email;

                        return (
                          <div key={email} className="bg-[#FFFDFC] border border-[#DED8CF] rounded-2xl shadow-xs overflow-hidden transition-all">
                            <div onClick={() => setExpandedEmail(isExpanded ? null : email)} className="cursor-pointer p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 hover:bg-[#F7F3EC]/40 transition-colors">
                              <div className="flex items-center gap-3.5">
                                <div className="bg-[#F7F3EC] border border-[#DED8CF] p-3 rounded-2xl text-2xl shadow-inner">👤</div>
                                <div>
                                  <h3 className="font-bold text-[#173E3B] text-base flex items-center gap-2">{email}</h3>
                                  <p className="text-xs text-[#68706E] mt-0.5">{items.length} comisiones registradas</p>
                                </div>
                              </div>

                              <div className="flex items-center gap-6 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 border-[#DED8CF] pt-3 md:pt-0">
                                <div className="text-left md:text-right">
                                  <p className="text-[10px] text-[#68706E] font-bold uppercase tracking-widest">Saldo Pendiente</p>
                                  <p className={`text-xl font-black ${totalPendiente > 0 ? "text-red-500" : "text-[#68706E]"}`}>
                                    ${totalPendiente.toLocaleString("es-AR")}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <p className="text-[10px] text-[#68706E] font-bold uppercase tracking-widest">Total Abonado</p>
                                  <p className="text-lg font-bold text-[#2F7D5C]">${totalPagadoHistorico.toLocaleString("es-AR")}</p>
                                </div>
                                <div className="text-[#68706E]">
                                  {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                                </div>
                              </div>
                            </div>

                            {isExpanded && (
                              <div className="p-5 border-t border-[#DED8CF] bg-[#F7F3EC]/50 space-y-6">
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-[#FFFDFC] p-4 rounded-xl border border-[#DED8CF]">
                                  <div>
                                    <h4 className="font-black text-sm text-[#173E3B] uppercase tracking-wider flex items-center gap-2">
                                      💳 Registrar Liquidación / Pago
                                    </h4>
                                    <p className="text-xs text-[#68706E]">Elegí cancelar la totalidad o realizar entregas a cuenta</p>
                                  </div>

                                  {totalPendiente > 0 ? (
                                    <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                                      <button 
                                        onClick={() => handleAbrirModalPago(email, totalPendiente, "PARCIAL")}
                                        className="flex-1 sm:flex-none bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/40 text-[#B44E2A] px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5"
                                      >
                                        ✏️ Pago Parcial / A Cuenta
                                      </button>
                                      
                                      <button 
                                        onClick={() => handleAbrirModalPago(email, totalPendiente, "TOTAL")}
                                        className="flex-1 sm:flex-none bg-green-600 hover:bg-green-500 text-white px-5 py-2.5 rounded-xl text-xs font-black transition-all shadow-xs flex items-center justify-center gap-1.5 uppercase tracking-wider"
                                      >
                                        <CheckCircle2 className="w-4 h-4" /> Liquidar Total (${totalPendiente.toLocaleString("es-AR")})
                                      </button>
                                    </div>
                                  ) : (
                                    <span className="bg-green-100 text-green-800 text-xs font-bold px-3 py-1.5 rounded-lg border border-green-200">
                                      ✓ Al Día (Sin saldo pendiente)
                                    </span>
                                  )}
                                </div>

                                {/* TABLA DE DETALLE DE COMISIONES (CON BORRADO DE PRUEBAS) */}
                                <div className="bg-[#FFFDFC] rounded-xl overflow-hidden border border-[#DED8CF]">
                                  <div className="p-3 bg-[#F7F3EC] border-b border-[#DED8CF] flex justify-between items-center">
                                    <h5 className="font-bold text-xs text-[#173E3B] uppercase">Detalle de Registros de Comisión</h5>
                                    <span className="text-[10px] text-[#68706E]">💡 Podes eliminar registros viejos de prueba con el botón de basura</span>
                                  </div>
                                  <div className="overflow-x-auto">
                                    <table className="w-full text-left text-xs">
                                      <thead className="bg-[#FFFDFC] text-[#68706E] font-bold uppercase border-b border-[#DED8CF]">
                                        <tr>
                                          <th className="p-3">Fecha</th>
                                          <th className="p-3">Cliente</th>
                                          <th className="p-3">Concepto</th>
                                          <th className="p-3">Comisión</th>
                                          <th className="p-3">Estado</th>
                                          <th className="p-3 text-right">Limpiar / Borrar</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-[#DED8CF]">
                                        {items.map(item => (
                                          <tr key={item.id} className="hover:bg-[#F7F3EC]/40">
                                            <td className="p-3 text-[#68706E]">{new Date(item.fecha).toLocaleDateString("es-AR")}</td>
                                            <td className="p-3 font-bold text-[#1F2928]">{item.clienteNombre || 'General'}</td>
                                            <td className="p-3 text-[#68706E]">{item.cuotaAsociada ? `Cuota ${item.cuotaAsociada}` : 'Venta'}</td>
                                            <td className="p-3 font-mono font-bold text-[#173E3B]">${(item.comisionAsociada || 0).toLocaleString("es-AR")}</td>
                                            <td className="p-3">
                                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${item.estadoPago === 'PAGADA' ? 'bg-green-100 text-green-800' : item.estadoPago === 'PARCIAL' ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'}`}>
                                                {item.estadoPago || 'PENDIENTE'}
                                              </span>
                                            </td>
                                            <td className="p-3 text-right">
                                              <button
                                                onClick={() => handleEliminarRegistroComisionPrueba(item.id)}
                                                className="text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 p-1.5 rounded-lg border border-red-200 transition"
                                                title="Borrar registro de prueba"
                                              >
                                                <Trash2 className="w-3.5 h-3.5" />
                                              </button>
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>

                                {/* HISTORIAL DE RECIBOS/PAGOS DE COMISIÓN */}
                                {pagosPreviosAfiliado.length > 0 && (
                                  <div className="bg-[#FFFDFC] rounded-xl overflow-hidden border border-[#DED8CF]">
                                    <div className="p-3 bg-[#F7F3EC] border-b border-[#DED8CF]">
                                      <h5 className="font-bold text-xs text-[#173E3B] uppercase">Recibos y Comprobantes de Pago Emitidos</h5>
                                    </div>
                                    <div className="divide-y divide-[#DED8CF]">
                                      {pagosPreviosAfiliado.map(pago => (
                                        <div key={pago.id} className="p-3 flex justify-between items-center text-xs hover:bg-[#F7F3EC]/30">
                                          <div>
                                            <span className="font-mono font-bold text-[#2F7D5C]">${pago.montoPagado.toLocaleString("es-AR")}</span>
                                            <span className="text-[#68706E] ml-2">• {new Date(pago.fechaPago).toLocaleString("es-AR")} ({pago.metodoPago})</span>
                                          </div>
                                          <div className="flex items-center gap-2">
                                            <button
                                              onClick={() => generarComprobantePDF(pago.afiliadoEmail, pago, [])}
                                              className="text-[10px] bg-[#173E3B] text-white px-2.5 py-1 rounded-md font-bold hover:bg-[#2F7D5C] transition"
                                            >
                                              📄 PDF
                                            </button>
                                            <button
                                              onClick={() => handleEliminarPagoComisionPrueba(pago.id)}
                                              className="text-red-500 hover:text-red-700 bg-red-50 p-1 rounded border border-red-200"
                                              title="Borrar pago de prueba"
                                            >
                                              <Trash2 className="w-3 h-3" />
                                            </button>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {/* TAB 2: RENDICIONES DE COBRANZA */}
              {activeTab === "rendiciones" && (
                <div className="space-y-6">
                  {/* SECCIÓN PENDIENTES */}
                  <div className="space-y-4">
                    <h2 className="text-lg font-black text-[#173E3B] uppercase tracking-wider flex items-center gap-2 border-b border-[#DED8CF] pb-2">
                      <AlertCircle className="w-5 h-5 text-[#B44E2A]" /> Rendiciones Pendientes de Ingreso a Caja ({pendientesRendicion.length})
                    </h2>

                    {pendientesRendicion.length === 0 ? (
                      <div className="bg-[#FFFDFC] border border-[#DED8CF] p-8 rounded-2xl text-center shadow-xs space-y-2">
                        <CheckCircle2 className="w-10 h-10 text-[#2F7D5C] mx-auto" />
                        <h3 className="text-base font-bold text-[#173E3B]">Sin Rendiciones Pendientes</h3>
                        <p className="text-xs text-[#68706E]">No hay cobros de vendedores pendientes de confirmación en este momento.</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {pendientesRendicion.map(sol => (
                          <div key={sol.id} className="bg-[#FFFDFC] border border-[#DED8CF] rounded-2xl p-6 shadow-xs relative overflow-hidden flex flex-col justify-between hover:border-[#173E3B]/60 transition-all">
                            <div className="space-y-4">
                              <div className="flex justify-between items-start border-b border-[#DED8CF] pb-3">
                                <h3 className="text-base font-bold text-[#173E3B] truncate max-w-[200px]">{sol.productoDeseado}</h3>
                                <span className="bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                                  PENDIENTE ARCA
                                </span>
                              </div>

                              <div className="space-y-2 text-xs">
                                <div className="flex justify-between p-2.5 bg-[#F7F3EC] rounded-xl border border-[#DED8CF]">
                                  <span className="text-[#68706E]">👤 Vendedor/Afiliado:</span>
                                  <span className="text-[#1F2928] font-bold truncate max-w-[180px]">{sol.afiliadoEmail || 'Sin Afiliado'}</span>
                                </div>
                                <div className="flex justify-between p-2.5 bg-[#F7F3EC] rounded-xl border border-[#DED8CF]">
                                  <span className="text-[#68706E]">💵 Cobro Reportado:</span>
                                  <span className="text-[#B44E2A] text-sm font-extrabold font-mono">${sol.montoAbonado}</span>
                                </div>
                                <div className="flex justify-between p-2.5 bg-[#F7F3EC] rounded-xl border border-[#DED8CF]">
                                  <span className="text-[#68706E]">💳 Modalidad:</span>
                                  <span className="text-[#173E3B] font-bold uppercase">{sol.metodoPago || 'Efectivo'}</span>
                                </div>
                              </div>
                            </div>

                            <button
                              onClick={() => { setSolicitudSeleccionada(sol); setModalRendicionOpen(true); }}
                              className="w-full mt-6 bg-[#2F7D5C] hover:bg-[#256449] text-white font-bold text-xs uppercase tracking-wider py-3 rounded-xl transition-all shadow-xs flex items-center justify-center gap-2"
                            >
                              <CheckCircle2 className="w-4 h-4" /> Confirmar Ingreso a Caja Central
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* SECCIÓN HISTORIAL DE RENDICIONES CONFIRMADAS (CON OPCION DE LIMPIAR PRUEBAS) */}
                  <div className="space-y-4 pt-4">
                    <h2 className="text-lg font-black text-[#173E3B] uppercase tracking-wider border-b border-[#DED8CF] pb-2 flex justify-between items-center">
                      <span>Historial de Rendiciones (Caja Confirmada)</span>
                      <span className="text-xs text-[#68706E] font-normal">💡 Botón 🗑️ borra registros de prueba</span>
                    </h2>

                    {historialRendicion.length === 0 ? (
                      <div className="bg-[#FFFDFC] border border-[#DED8CF] p-6 rounded-2xl text-center">
                        <p className="text-[#68706E] text-xs">No existen rendiciones aprobadas aún en el historial.</p>
                      </div>
                    ) : (
                      <div className="bg-[#FFFDFC] rounded-2xl overflow-hidden border border-[#DED8CF] shadow-xs">
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-[#F7F3EC] text-[#173E3B] font-bold uppercase border-b border-[#DED8CF]">
                              <tr>
                                <th className="p-4">Producto</th>
                                <th className="p-4">Cliente</th>
                                <th className="p-4">Vendedor / Afiliado</th>
                                <th className="p-4">Importe Cobrado</th>
                                <th className="p-4">Método</th>
                                <th className="p-4">Auditoría Institucional</th>
                                <th className="p-4 text-right">Limpiar Pruebas</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-[#DED8CF]">
                              {historialRendicion.map(sol => (
                                <tr key={sol.id} className="hover:bg-[#F7F3EC]/50 transition text-[#1F2928]">
                                  <td className="p-4 font-bold text-[#173E3B] max-w-[200px] truncate">{sol.productoDeseado}</td>
                                  <td className="p-4 text-[#1F2928]">{sol.datosPersonales?.nombreCompleto || sol.clienteEmail || '-'}</td>
                                  <td className="p-4 text-[#1F2928]">{sol.afiliadoEmail || 'Venta Directa'}</td>
                                  <td className="p-4 font-bold text-[#2F7D5C] font-mono text-sm">${sol.montoAbonado}</td>
                                  <td className="p-4">
                                    <span className="bg-[#F7F3EC] border border-[#DED8CF] px-2.5 py-1 rounded-md text-[10px] font-bold text-[#173E3B] uppercase">
                                      {sol.metodoPago || 'Efectivo'}
                                    </span>
                                  </td>
                                  <td className="p-4 text-[11px] text-[#68706E] italic max-w-[250px]">{sol.historialRendicion || "Confirmado en caja"}</td>
                                  <td className="p-4 text-right">
                                    <button
                                      onClick={() => handleEliminarRendicionPrueba(sol.id)}
                                      className="text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 p-1.5 rounded-lg border border-red-200 transition"
                                      title="Restablecer / Borrar de prueba"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 3: RESUMEN FINANCIERO 360° */}
              {activeTab === "resumen" && (
                <div className="space-y-6">
                  <div className="bg-[#FFFDFC] border border-[#DED8CF] rounded-2xl p-6 shadow-xs space-y-4">
                    <h2 className="text-lg font-black text-[#173E3B] uppercase tracking-wider border-b border-[#DED8CF] pb-3">
                      📊 Control Financiero Integral por Vendedor / Afiliado
                    </h2>
                    <p className="text-xs text-[#68706E]">
                      Comparativa entre cobranzas ingresadas a la caja central (Rendiciones) y comisiones liquidadas/pendientes (Comisiones).
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-2">
                      {vendedoresList.map(v => {
                        const emailVend = v.email;
                        const rendsVend = historialRendicion.filter(r => r.afiliadoEmail === emailVend);
                        const totalRendido = rendsVend.reduce((acc, curr) => acc + (Number(curr.montoAbonado) || 0), 0);

                        const comsVend = comisiones.filter(c => c.afiliadoEmail === emailVend);
                        const totalComisiones = comsVend.reduce((acc, curr) => acc + (Number(curr.comisionAsociada) || 0), 0);
                        const comisionesPagadas = comsVend.reduce((acc, curr) => acc + (Number(curr.montoPagadoAcumulado) || (curr.estadoPago === 'PAGADA' ? curr.comisionAsociada : 0)), 0);
                        const comisionesPendientes = totalComisiones - comisionesPagadas;

                        return (
                          <div key={v.id} className="bg-[#F7F3EC] border border-[#DED8CF] rounded-2xl p-5 space-y-4 shadow-xs">
                            <div className="border-b border-[#DED8CF] pb-3 flex justify-between items-start">
                              <div>
                                <h3 className="font-bold text-[#173E3B] text-base">{v.nombre}</h3>
                                <span className="text-xs text-[#B44E2A] font-bold">📍 {v.localidad}</span>
                              </div>
                              <span className="bg-amber-100 text-amber-900 text-xs font-black px-2.5 py-1 rounded-full border border-amber-300">
                                {v.porcentajeComision}% Com.
                              </span>
                            </div>

                            <div className="space-y-2 text-xs">
                              <div className="flex justify-between bg-[#FFFDFC] p-2.5 rounded-xl border border-[#DED8CF]">
                                <span className="text-[#68706E]">📥 Cobrado & Rendido a Caja:</span>
                                <span className="font-mono font-bold text-[#2F7D5C]">${totalRendido.toLocaleString("es-AR")}</span>
                              </div>
                              <div className="flex justify-between bg-[#FFFDFC] p-2.5 rounded-xl border border-[#DED8CF]">
                                <span className="text-[#68706E]">💰 Comisiones Totales Acumuladas:</span>
                                <span className="font-mono font-bold text-[#173E3B]">${totalComisiones.toLocaleString("es-AR")}</span>
                              </div>
                              <div className="flex justify-between bg-[#FFFDFC] p-2.5 rounded-xl border border-[#DED8CF]">
                                <span className="text-[#68706E]">💳 Comisiones Liquidadas:</span>
                                <span className="font-mono font-bold text-green-700">${comisionesPagadas.toLocaleString("es-AR")}</span>
                              </div>
                              <div className="flex justify-between bg-[#FFFDFC] p-2.5 rounded-xl border border-[#DED8CF]">
                                <span className="text-[#68706E]">⏳ Comisiones Pendientes:</span>
                                <span className={`font-mono font-bold ${comisionesPendientes > 0 ? 'text-red-600' : 'text-gray-500'}`}>
                                  ${comisionesPendientes.toLocaleString("es-AR")}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

        </div>
      </div>

      {/* MODAL NUEVO VENDEDOR */}
      {modalAgregarVendedorOpen && (
        <div className="fixed inset-0 bg-[#121316]/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#FFFDFC] border border-[#DED8CF] rounded-3xl w-full max-w-md p-6 space-y-5 shadow-xl">
            <div className="flex justify-between items-center border-b border-[#DED8CF] pb-3">
              <h3 className="text-sm font-black text-[#173E3B] uppercase tracking-wider">
                ➕ Alta de Nuevo Vendedor / Afiliado
              </h3>
              <button onClick={() => setModalAgregarVendedorOpen(false)} className="text-[#68706E] font-bold text-sm">✕</button>
            </div>
            <form onSubmit={handleGuardarNuevoVendedor} className="space-y-4 text-xs">
              <div>
                <label className="block text-[10px] text-[#68706E] font-bold uppercase mb-1">Nombre Completo</label>
                <input
                  type="text"
                  required
                  value={nuevoVendedorNombre}
                  onChange={e => setNuevoVendedorNombre(e.target.value)}
                  placeholder="Ej: Maria Gonzalez"
                  className="w-full bg-[#F7F3EC] border border-[#DED8CF] p-2.5 rounded-xl text-[#1F2928] font-bold outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] text-[#68706E] font-bold uppercase mb-1">Localidad Asignada</label>
                <input
                  type="text"
                  required
                  value={nuevoVendedorLocalidad}
                  onChange={e => setNuevoVendedorLocalidad(e.target.value)}
                  placeholder="Ej: Junín / Lincoln / Bragado"
                  className="w-full bg-[#F7F3EC] border border-[#DED8CF] p-2.5 rounded-xl text-[#1F2928] font-bold outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] text-[#68706E] font-bold uppercase mb-1">Email de Contacto (Opcional)</label>
                <input
                  type="email"
                  value={nuevoVendedorEmail}
                  onChange={e => setNuevoVendedorEmail(e.target.value)}
                  placeholder="vendedor@cuentahogar.com"
                  className="w-full bg-[#F7F3EC] border border-[#DED8CF] p-2.5 rounded-xl text-[#1F2928] font-bold outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] text-[#68706E] font-bold uppercase mb-1">Porcentaje de Comisión Acordado (%)</label>
                <input
                  type="number"
                  required
                  min="0"
                  max="100"
                  value={nuevoVendedorPorcentaje}
                  onChange={e => setNuevoVendedorPorcentaje(e.target.value)}
                  className="w-full bg-[#F7F3EC] border border-[#DED8CF] p-2.5 rounded-xl text-[#1F2928] font-black text-sm outline-none"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalAgregarVendedorOpen(false)}
                  className="flex-1 bg-[#F7F3EC] text-[#68706E] font-bold py-2.5 rounded-xl uppercase text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardandoVendedor}
                  className="flex-1 bg-[#173E3B] hover:bg-[#2F7D5C] text-white font-bold py-2.5 rounded-xl uppercase text-xs shadow-xs"
                >
                  {guardandoVendedor ? "Guardando..." : "Guardar Vendedor"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL EDITAR VENDEDOR Y LOCALIDAD */}
      {vendedorAEditar && (
        <div className="fixed inset-0 bg-[#121316]/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#FFFDFC] border border-[#DED8CF] rounded-3xl w-full max-w-md p-6 space-y-5 shadow-xl">
            <div className="flex justify-between items-center border-b border-[#DED8CF] pb-3">
              <h3 className="text-sm font-black text-[#173E3B] uppercase tracking-wider flex items-center gap-2">
                ✏️ Configurar Punto de Venta / Vendedor
              </h3>
              <button onClick={() => setVendedorAEditar(null)} className="text-[#68706E] font-bold text-sm">✕</button>
            </div>
            <form onSubmit={handleGuardarEdicionVendedor} className="space-y-4 text-xs">
              <div>
                <label className="block text-[10px] text-[#68706E] font-bold uppercase mb-1">Nombre Completo / Sucursal</label>
                <input
                  type="text"
                  required
                  value={editNombre}
                  onChange={e => setEditNombre(e.target.value)}
                  placeholder="Ej: Sucursal Nueve de Julio / Vendedor Junín"
                  className="w-full bg-[#F7F3EC] border border-[#DED8CF] p-2.5 rounded-xl text-[#1F2928] font-bold outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] text-[#B44E2A] font-bold uppercase mb-1">Localidad Asignada</label>
                <input
                  type="text"
                  required
                  value={editLocalidad}
                  onChange={e => setEditLocalidad(e.target.value)}
                  placeholder="Ej: 9 de Julio / Lincoln / Pehuajó"
                  className="w-full bg-[#F7F3EC] border border-[#DED8CF] p-2.5 rounded-xl text-[#1F2928] font-bold outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] text-[#68706E] font-bold uppercase mb-1">Email de Contacto</label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={e => setEditEmail(e.target.value)}
                  placeholder="vendedor@cuentahogar.com"
                  className="w-full bg-[#F7F3EC] border border-[#DED8CF] p-2.5 rounded-xl text-[#1F2928] font-bold outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] text-[#68706E] font-bold uppercase mb-1">Porcentaje de Comisión Acordado (%)</label>
                <input
                  type="number"
                  required
                  min="0"
                  max="100"
                  value={editPorcentaje}
                  onChange={e => setEditPorcentaje(e.target.value)}
                  className="w-full bg-[#F7F3EC] border border-[#DED8CF] p-2.5 rounded-xl text-[#1F2928] font-black text-sm outline-none"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setVendedorAEditar(null)}
                  className="flex-1 bg-[#F7F3EC] text-[#68706E] font-bold py-2.5 rounded-xl uppercase text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-green-600 hover:bg-green-500 text-white font-bold py-2.5 rounded-xl uppercase text-xs shadow-xs"
                >
                  💾 Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMACIÓN DE RENDICIÓN */}
      {modalRendicionOpen && solicitudSeleccionada && (
        <div className="fixed inset-0 bg-[#1F2928]/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#FFFDFC] border border-[#DED8CF] p-6 sm:p-8 rounded-2xl shadow-xl max-w-md w-full space-y-5">
            <div>
              <h2 className="text-lg font-bold text-[#173E3B]">Confirmar Recepción de Fondos</h2>
              <p className="text-[#68706E] text-xs font-sans mt-1">
                Verificá el pago de <strong className="text-[#B44E2A] font-mono text-sm">${solicitudSeleccionada.montoAbonado}</strong> reportado por <strong className="text-[#173E3B]">{solicitudSeleccionada.afiliadoEmail || 'Afiliado'}</strong>.
              </p>
            </div>
            
            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[10px] text-[#68706E] font-bold uppercase mb-1">Fecha Real de Ingreso a Caja</label>
                <input
                  type="date"
                  value={fechaCobroReal}
                  onChange={e => setFechaCobroReal(e.target.value)}
                  className="w-full bg-[#F7F3EC] border border-[#DED8CF] p-2.5 rounded-xl font-mono text-[#1F2928] outline-none"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => { setModalRendicionOpen(false); setSolicitudSeleccionada(null); }}
                className="flex-1 bg-[#F7F3EC] text-[#68706E] font-bold py-2.5 rounded-xl uppercase text-xs"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmarRendicion}
                disabled={procesandoRendicion}
                className="flex-1 bg-green-600 hover:bg-green-500 text-white font-bold py-2.5 rounded-xl uppercase text-xs shadow-xs"
              >
                {procesandoRendicion ? "Procesando..." : "✓ Confirmar Ingreso"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE PAGO DE COMISIONES */}
      {modalPagoOpen && (
        <div className="fixed inset-0 bg-[#121316]/85 backdrop-blur-md flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-[#FFFDFC] border border-[#DED8CF] rounded-3xl w-full max-w-lg p-6 md:p-8 space-y-6 shadow-xs relative">
            
            <div className="flex justify-between items-center border-b border-[#DED8CF] pb-4">
              <div>
                <span className="text-[9px] bg-orange-100 text-[#B44E2A] font-black uppercase px-2.5 py-1 rounded border border-orange-200 inline-block mb-1">
                  REGISTRO DE LIQUIDACIÓN
                </span>
                <h3 className="text-lg font-bold text-[#173E3B]">
                  {pagoTipo === "TOTAL" ? "Liquidación Total de Comisiones" : "Pago Parcial a Cuenta"}
                </h3>
                <p className="text-xs text-[#68706E] font-bold mt-0.5">Vendedor: {pagoAfiliadoEmail}</p>
              </div>
              <button 
                onClick={() => setModalPagoOpen(false)} 
                className="text-[#68706E] hover:text-[#173E3B] font-bold text-sm bg-[#F7F3EC] p-2 rounded-xl"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleEjecutarPagoComisiones} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-2 bg-[#F7F3EC] p-1.5 rounded-xl border border-[#DED8CF]">
                <button
                  type="button"
                  onClick={() => {
                    setPagoTipo("TOTAL");
                    const itemsAf = comisiones.filter(c => c.afiliadoEmail === pagoAfiliadoEmail && c.estadoPago !== "PAGADA");
                    const tot = itemsAf.reduce((acc, curr) => acc + ((curr.comisionAsociada || 0) - (curr.montoPagadoAcumulado || 0)), 0);
                    setPagoMontoInput(String(tot));
                  }}
                  className={`py-2 rounded-lg font-bold text-xs transition-all ${pagoTipo === "TOTAL" ? "bg-green-600 text-white shadow-md font-black" : "text-[#68706E] hover:text-[#173E3B]"}`}
                >
                  💚 Liquidación Total
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setPagoTipo("PARCIAL");
                    setPagoMontoInput("");
                  }}
                  className={`py-2 rounded-lg font-bold text-xs transition-all ${pagoTipo === "PARCIAL" ? "bg-[#173E3B] text-white font-bold shadow-md font-black" : "text-[#68706E] hover:text-[#173E3B]"}`}
                >
                  ✏️ Pago Parcial
                </button>
              </div>

              <div>
                <label className="block text-[10px] text-[#B44E2A] font-bold uppercase mb-1">
                  💵 Monto a Transferir / Abonar ($)
                </label>
                <input 
                  type="number" 
                  required
                  value={pagoMontoInput} 
                  onChange={e => setPagoMontoInput(e.target.value)} 
                  placeholder="Ej: 45000" 
                  className="w-full bg-[#F7F3EC] border border-[#DED8CF] p-3 rounded-xl text-[#1F2928] font-mono font-black text-base outline-none focus:border-yellow-500 shadow-inner"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-[#68706E] font-bold uppercase mb-1">
                    💳 Método de Pago
                  </label>
                  <select 
                    value={pagoMetodo} 
                    onChange={e => setPagoMetodo(e.target.value)}
                    className="w-full bg-[#F7F3EC] border border-[#DED8CF] p-2.5 rounded-xl text-[#173E3B] font-bold outline-none focus:border-yellow-500"
                  >
                    <option value="Transferencia Bancaria">Transferencia Bancaria</option>
                    <option value="Efectivo en Mano">Efectivo en Mano</option>
                    <option value="MercadoPago">MercadoPago / CVU</option>
                    <option value="Cheque">Cheque</option>
                    <option value="Otro">Otro Método</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] text-[#68706E] font-bold uppercase mb-1">
                    🏦 Cuenta / Caja de Origen
                  </label>
                  <input 
                    type="text" 
                    value={pagoCuentaOrigen} 
                    onChange={e => setPagoCuentaOrigen(e.target.value)} 
                    placeholder="Ej: Banco Galicia / Caja Central" 
                    className="w-full bg-[#F7F3EC] border border-[#DED8CF] p-2.5 rounded-xl text-[#1F2928] outline-none font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] text-[#68706E] font-bold uppercase mb-1">
                  🧾 N° de Comprobante / Transacción / Ref
                </label>
                <input 
                  type="text" 
                  value={pagoComprobanteNum} 
                  onChange={e => setPagoComprobanteNum(e.target.value)} 
                  placeholder="Ej: Transferencia N° 9812401294" 
                  className="w-full bg-[#F7F3EC] border border-[#DED8CF] p-2.5 rounded-xl text-[#1F2928] font-mono outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] text-[#68706E] font-bold uppercase mb-1">
                  📝 Observaciones o Notas de Pago
                </label>
                <textarea 
                  value={pagoObservaciones} 
                  onChange={e => setPagoObservaciones(e.target.value)} 
                  placeholder="Ej: Pago a cuenta correspondiente al mes de Septiembre..." 
                  className="w-full bg-[#F7F3EC] border border-[#DED8CF] p-2.5 rounded-xl text-[#1F2928] outline-none resize-none h-16"
                />
              </div>

              <div className="pt-2 border-t border-[#DED8CF] flex gap-2">
                <button 
                  type="submit" 
                  disabled={procesandoPago}
                  className="flex-1 bg-amber-500 hover:bg-amber-400 text-black font-black py-3 rounded-xl text-xs uppercase tracking-wider transition-all shadow-xs disabled:opacity-50"
                >
                  {procesandoPago ? "Procesando..." : "✅ Registrar Pago y Emitir Comprobante PDF"}
                </button>
                
                <button 
                  type="button" 
                  onClick={() => setModalPagoOpen(false)}
                  className="bg-[#F7F3EC] hover:bg-[#FFFDFC] text-[#68706E] font-bold px-4 py-3 rounded-xl text-xs"
                >
                  Cancelar
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </AdminProtectedRoute>
  );
}
