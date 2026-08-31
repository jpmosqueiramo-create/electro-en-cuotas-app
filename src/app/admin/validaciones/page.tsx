"use client";

import { AdminProtectedRoute } from "@/components/AdminProtectedRoute";
import { FACTORES_PREDETERMINADOS, calcularOperacionFinanciera, calcularTablaTodosLosPlanes } from "@/lib/financialEngine";
import { db, storage } from "@/lib/firebase";
import { collection, getDocs, getDoc, updateDoc, deleteDoc, doc, query, orderBy, addDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { generarContratoModelo, generarPagareModelo, generarRemitoModelo, generarRemitoTipoR, generarPdfPresupuesto, generarComprobantePago, generarEstadoCuenta } from "@/lib/pdfGenerator";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronUp, Search, Filter, AlertCircle, CheckCircle2, Truck, DollarSign, Archive, UserPlus, Trash2 } from "lucide-react";

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
    cuil?: string;
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
  comisionistaNombre?: string;
  comisionistaCosto?: number;
  comisionistaFechaEnvio?: string;
  vinculoProductoId?: string;
  vinculoUnidadId?: string;
  sucursalDestino?: string;
  comisionistaFechaRecepcion?: string;
};

const sucursalesDisponibles = [
  "Depósito Central",
  "Lincoln",
  "Junín",
  "Chivilcoy",
  "Bragado",
  "Pehuajó",
  "9 de Julio"
];

export default function AdminValidacionesPage() {
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([]);
  const [empresaRemitosConfig, setEmpresaRemitosConfig] = useState<any>(null);
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
  const [budgetFactor, setBudgetFactor] = useState("2.5");
  const [mostrarTabla12Cuotas, setMostrarTabla12Cuotas] = useState(false);
  const [budgetCuotaValor, setBudgetCuotaValor] = useState("");
  const [budgetTna, setBudgetTna] = useState("60");
  const [budgetMora, setBudgetMora] = useState("0.5");
  const [budgetNotas, setBudgetNotas] = useState("");
  const [budgetProveedor, setBudgetProveedor] = useState("");
  const [budgetLinkProveedor, setBudgetLinkProveedor] = useState("");
  const [budgetCostoProveedor, setBudgetCostoProveedor] = useState("");
  const [draftItems, setDraftItems] = useState<any[]>([]);
  const [editandoPresupuestoId, setEditandoPresupuestoId] = useState<string | null>(null);
  const [comisionistaEditId, setComisionistaEditId] = useState<string | null>(null);
  const [proveedorEditId, setProveedorEditId] = useState<string | null>(null);
  const [proveedorNombre, setProveedorNombre] = useState("");
  const [proveedorGuia, setProveedorGuia] = useState("");
  const [proveedorCosto, setProveedorCosto] = useState("");
  const [proveedorFechaPedido, setProveedorFechaPedido] = useState("");
  const [proveedorFechaEstimada, setProveedorFechaEstimada] = useState("");
  const [proveedorEstado, setProveedorEstado] = useState("SOLICITADO");
  const [proveedorFacturaTicket, setProveedorFacturaTicket] = useState("");

  // States for Etapa 2: Remito & Despacho Local / Afiliado
  const [remitoEditId, setRemitoEditId] = useState<string | null>(null);
  const [remitoTransporte, setRemitoTransporte] = useState("");
  const [remitoGuiaLocal, setRemitoGuiaLocal] = useState("");
  const [remitoCostoLocal, setRemitoCostoLocal] = useState("");
  const [remitoFechaSalida, setRemitoFechaSalida] = useState("");
  const [remitoEstadoEnvio, setRemitoEstadoEnvio] = useState("REMITO_EMITIDO");

  // State maps for auto-populating and editing Remito Destinatario per order
  const [remitoNombreMap, setRemitoNombreMap] = useState<Record<string, string>>({});
  const [remitoDocMap, setRemitoDocMap] = useState<Record<string, string>>({});
  const [remitoTelMap, setRemitoTelMap] = useState<Record<string, string>>({});
  const [remitoDireccionMap, setRemitoDireccionMap] = useState<Record<string, string>>({});

  const getDestinatarioNombre = (sol: any) => {
    if (remitoNombreMap[sol.id] !== undefined) return remitoNombreMap[sol.id];
    return sol.remitoDespachoDestinatario || sol.datosPersonales?.nombreCompleto || sol.nombreCompleto || "";
  };

  const getDestinatarioDoc = (sol: any) => {
    if (remitoDocMap[sol.id] !== undefined) return remitoDocMap[sol.id];
    return sol.remitoDespachoDoc || sol.datosPersonales?.numeroDni || sol.numeroDni || sol.dni || "";
  };

  const getDestinatarioTel = (sol: any) => {
    if (remitoTelMap[sol.id] !== undefined) return remitoTelMap[sol.id];
    return sol.remitoDespachoTel || sol.datosPersonales?.telefono || sol.whatsapp || "";
  };

  const getDestinatarioDireccion = (sol: any) => {
    if (remitoDireccionMap[sol.id] !== undefined) return remitoDireccionMap[sol.id];
    return sol.remitoDespachoDireccion || sol.datosPersonales?.direccion || sol.direccion || sol.localidad || "";
  };
  const [comisionistaNombre, setComisionistaNombre] = useState("");
  const [comisionistaCosto, setComisionistaCosto] = useState("");
  const [comisionistaFechaEnvio, setComisionistaFechaEnvio] = useState("");
  const [selectedDestino, setSelectedDestino] = useState("Lincoln");
  const [remitoDestinatarioNombre, setRemitoDestinatarioNombre] = useState("");
  const [remitoDestinatarioDireccion, setRemitoDestinatarioDireccion] = useState("");
  const [remitoDestinatarioDoc, setRemitoDestinatarioDoc] = useState("");
  const [remitoDestinatarioTel, setRemitoDestinatarioTel] = useState("");
  const [pagoAConfirmar, setPagoAConfirmar] = useState<any | null>(null);
  const [pagoMonto, setPagoMonto] = useState("");
  const [pagoComprobante, setPagoComprobante] = useState("");
  const [pagoCuentaDestino, setPagoCuentaDestino] = useState("Caja Efectivo");
  const [activeProductSolId, setActiveProductSolId] = useState<Record<string, string>>({});

  const groupSolicitudes = (items: any[]) => {
    const groups: Record<string, { key: string; name: string; dni: string; cuil: string; items: any[] }> = {};
    items.forEach(item => {
      const dni = (item.datosPersonales?.numeroDni || item.numeroDni || item.dni || "").trim().replace(/\D/g, "");
      const cuil = (item.cuil || item.datosPersonales?.cuil || "").trim().replace(/\D/g, "");
      const key = dni || cuil || item.id;
      if (!groups[key]) {
        groups[key] = {
          key,
          name: item.datosPersonales?.nombreCompleto || item.nombreCompleto || item.clienteNombre || "Cliente Sin Nombre",
          dni: item.datosPersonales?.numeroDni || item.numeroDni || item.dni || "N/A",
          cuil: item.cuil || item.datosPersonales?.cuil || "N/A",
          items: []
        };
      }
      groups[key].items.push(item);
    });
    return Object.values(groups);
  };
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFields, setEditFields] = useState<any>({
    nombreCompleto: "",
    numeroDni: "",
    cuil: "",
    email: "",
    telefono: "",
    direccion: "",
    localidad: ""
  });

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

  
  // MOTOR DE CÁLCULO FINANCIERO UNIFICADO CON CATÁLOGO
  const handleRecalcularDesdeCosto = (costoVal?: number, cuotasVal?: number, factorVal?: number) => {
    const costo = costoVal !== undefined ? costoVal : (Number(budgetCostoProveedor) || 0);
    const cuotas = cuotasVal !== undefined ? cuotasVal : (Number(budgetCuotas) || 12);
    const factor = factorVal !== undefined ? factorVal : (Number(budgetFactor) || (FACTORES_PREDETERMINADOS[cuotas] || 2.5));

    if (costo <= 0) return;

    const valorTotal = Math.round(costo * factor);
    const cuotaMensual = Math.round(valorTotal / cuotas);
    const contadoRef = Math.round(costo * (FACTORES_PREDETERMINADOS[12] || 2.5));

    setBudgetCuotaValor(cuotaMensual > 0 ? String(cuotaMensual) : "");
    setBudgetContado(contadoRef > 0 ? String(contadoRef) : "");
  };

  const handleCambiarCostoProveedor = (costoStr: string) => {
    setBudgetCostoProveedor(costoStr);
    const costo = Number(costoStr) || 0;
    const cuotas = Number(budgetCuotas) || 12;
    const factor = Number(budgetFactor) || (FACTORES_PREDETERMINADOS[cuotas] || 2.5);

    if (costo > 0) {
      const valorTotal = Math.round(costo * factor);
      const cuotaMensual = Math.round(valorTotal / cuotas);
      const contadoRef = Math.round(costo * (FACTORES_PREDETERMINADOS[12] || 2.5));
      setBudgetCuotaValor(cuotaMensual > 0 ? String(cuotaMensual) : "");
      setBudgetContado(contadoRef > 0 ? String(contadoRef) : "");
    } else {
      setBudgetCuotaValor("");
      setBudgetContado("");
    }
  };

  const handleCambiarCuotas = (nuevasCuotasStr: string) => {
    const nCuotas = Number(nuevasCuotasStr) || 12;
    setBudgetCuotas(nuevasCuotasStr);
    const nuevoFactor = FACTORES_PREDETERMINADOS[nCuotas] || (nCuotas === 18 ? 3.25 : 2.5);
    setBudgetFactor(String(nuevoFactor));
    
    const costo = Number(budgetCostoProveedor) || 0;
    if (costo > 0) {
      const valorTotal = Math.round(costo * nuevoFactor);
      const cuotaMensual = Math.round(valorTotal / nCuotas);
      setBudgetCuotaValor(cuotaMensual > 0 ? String(cuotaMensual) : "");
    }
  };

  const handleCambiarFactor = (factorStr: string) => {
    setBudgetFactor(factorStr);
    const factor = Number(factorStr) || 2.5;
    const costo = Number(budgetCostoProveedor) || 0;
    const cuotas = Number(budgetCuotas) || 12;
    if (costo > 0) {
      const valorTotal = Math.round(costo * factor);
      const cuotaMensual = Math.round(valorTotal / cuotas);
      setBudgetCuotaValor(cuotaMensual > 0 ? String(cuotaMensual) : "");
    }
  };

  const handleCambiarCuotaDirecta = (cuotaStr: string) => {
    setBudgetCuotaValor(cuotaStr);
    const cuota = Number(cuotaStr) || 0;
    const cuotas = Number(budgetCuotas) || 12;
    const factor = Number(budgetFactor) || (FACTORES_PREDETERMINADOS[cuotas] || 2.5);

    if (cuota > 0 && factor > 0) {
      const valorTotal = cuota * cuotas;
      const costoCalculado = Math.round(valorTotal / factor);
      const contadoRef = Math.round(costoCalculado * (FACTORES_PREDETERMINADOS[12] || 2.5));
      setBudgetCostoProveedor(costoCalculado > 0 ? String(costoCalculado) : "");
      setBudgetContado(contadoRef > 0 ? String(contadoRef) : "");
    }
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

  const startEditing = (req: any) => {
    setEditingId(req.id);
    if (req.isApertura) {
      setEditFields({
        nombreCompleto: req.nombreCompleto || req.nombre || "",
        numeroDni: req.numeroDni || req.dni || "",
        cuil: req.cuil || "",
        email: req.email || "",
        telefono: req.whatsapp || "",
        direccion: req.direccion || "",
        localidad: req.localidad || ""
      });
    } else {
      setEditFields({
        nombreCompleto: req.datosPersonales?.nombreCompleto || "",
        numeroDni: req.datosPersonales?.numeroDni || "",
        cuil: req.datosPersonales?.cuil || "",
        email: req.clienteEmail || "",
        telefono: req.datosPersonales?.telefono || "",
        direccion: req.datosPersonales?.direccion || "",
        localidad: req.datosPersonales?.localidad || ""
      });
    }
  };

  const handleEditCuilChange = (val: string) => {
    const clean = val.replace(/\D/g, "").slice(0, 11);
    let formatted = clean;
    if (clean.length > 2) {
      formatted = `${clean.slice(0, 2)}-${clean.slice(2)}`;
    }
    if (clean.length > 10) {
      formatted = `${clean.slice(0, 2)}-${clean.slice(2, 10)}-${clean.slice(10)}`;
    }
    setEditFields((prev: any) => ({ ...prev, cuil: formatted }));
  };

  const handleGuardarDatosEditados = async (req: any) => {
    if (!editFields.nombreCompleto.trim() || !editFields.numeroDni.trim()) {
      alert("Nombre y DNI son campos obligatorios.");
      return;
    }
    const cuilRegex = /^\d{2}-\d{8}-\d{1}$/;
    if (editFields.cuil && !cuilRegex.test(editFields.cuil)) {
      alert("El CUIL debe tener el formato válido: XX-XXXXXXXX-X");
      return;
    }

    try {
      if (req.isApertura) {
        const docRef = doc(db, "solicitudes_cuenta", req.id);
        const updates: any = {
          nombreCompleto: editFields.nombreCompleto,
          numeroDni: editFields.numeroDni,
          cuil: editFields.cuil,
          email: editFields.email,
          whatsapp: editFields.telefono,
          direccion: editFields.direccion,
          localidad: editFields.localidad
        };
        if (req.tipo === "contacto_rapido") {
          updates.nombre = editFields.nombreCompleto;
          updates.dni = editFields.numeroDni;
          updates.whatsapp = editFields.telefono;
          updates.localidad = editFields.localidad;
        }
        await updateDoc(docRef, updates);
      } else {
        const docRef = doc(db, "solicitudes", req.id);
        await updateDoc(docRef, {
          clienteEmail: editFields.email,
          "datosPersonales.nombreCompleto": editFields.nombreCompleto,
          "datosPersonales.numeroDni": editFields.numeroDni,
          "datosPersonales.cuil": editFields.cuil,
          "datosPersonales.telefono": editFields.telefono,
          "datosPersonales.direccion": editFields.direccion,
          "datosPersonales.localidad": editFields.localidad
        });
      }
      alert("Datos actualizados con éxito.");
      setEditingId(null);
      await fetchSolicitudes();
      await fetchAperturas();
    } catch (err: any) {
      console.error("Error al guardar cambios de edición:", err);
      alert("Error al guardar cambios: " + err.message);
    }
  };

  const handleSubirDocumentoManual = async (req: any, file: File, tipoDoc: "domicilio" | "ingresos") => {
    const confirm = window.confirm(`¿Estás seguro de subir y adjuntar este archivo como comprobante de ${tipoDoc === "domicilio" ? "domicilio" : "ingresos"}?`);
    if (!confirm) return;

    try {
      // 1. Upload to Storage in the authorized 'comprobantes' bucket folder
      const storageRef = ref(storage, `comprobantes/cuenta_solicitudes/${Date.now()}_manual_${tipoDoc}_${file.name}`);
      await uploadBytes(storageRef, file);
      const downloadUrl = await getDownloadURL(storageRef);

      // 2. Update Firestore
      if (req.isApertura) {
        const docRef = doc(db, "solicitudes_cuenta", req.id);
        if (tipoDoc === "domicilio") {
          await updateDoc(docRef, { comprobanteDomicilioURL: downloadUrl });
        } else {
          await updateDoc(docRef, { comprobanteURL: downloadUrl });
        }
      } else {
        const docRef = doc(db, "solicitudes", req.id);
        if (tipoDoc === "domicilio") {
          await updateDoc(docRef, { "documentos.servicio": downloadUrl });
        } else {
          await updateDoc(docRef, { "documentos.reciboSueldo": downloadUrl });
        }
      }

      alert("¡Comprobante subido y guardado exitosamente en el legajo!");
      await fetchSolicitudes();
      await fetchAperturas();
    } catch (err: any) {
      console.error("Error al subir archivo manual:", err);
      alert("Error al subir archivo: " + (err.message || err.toString()));
    }
  };

  const handleGuardarComisionista = async (solId: string) => {
    try {
      const docRef = doc(db, "solicitudes", solId);
      await updateDoc(docRef, {
        comisionistaNombre: comisionistaNombre,
        comisionistaCosto: Number(comisionistaCosto) || 0,
        comisionistaFechaEnvio: comisionistaFechaEnvio
      });
      alert("Datos de comisionista y envío actualizados exitosamente.");
      setComisionistaEditId(null);
      await fetchSolicitudes();
    } catch (err: any) {
      console.error("Error al guardar comisionista:", err);
      alert("Error al guardar comisionista: " + err.message);
    }
  };

  const handleTransferirStockUnidad = async (prodId: string, unitId: string, nuevaSucursal: string, solId: string) => {
    try {
      const prodRef = doc(db, "productos", prodId);
      const currentProd = productos.find(p => p.id === prodId);
      if (!currentProd) return;
      
      let origen = "";
      const updatedStock = (currentProd.stock || []).map((u: any) => {
        if (u.id === unitId) {
          origen = u.localidad || "Depósito Central";
          return { ...u, localidad: nuevaSucursal };
        }
        return u;
      });
      
      await updateDoc(prodRef, { stock: updatedStock });
      
      // Also update request details to reflect the transfer
      const msg = `Traslado de Stock en tránsito: de sucursal ${origen} a sucursal ${nuevaSucursal}.`;
      await updateDoc(doc(db, "solicitudes", solId), {
        estadoProducto: "Traslado entre Puntos de Venta",
        historialRecepcion: msg
      });

      alert(`¡Unidad transferida con éxito a la sucursal ${nuevaSucursal}!`);
      
      // Update local states
      await fetchProductos();
      await fetchSolicitudes();
      
      // Update selected product stock reference in memory
      const updatedProdObj = { ...currentProd, stock: updatedStock };
      setSelectedProductStock(updatedProdObj);
    } catch (e: any) {
      console.error(e);
      alert("Error al transferir stock: " + e.message);
    }
  };

  const handleReservarStock = async (solId: string, prodId: string, unitId: string, numSerie: string, destino: string) => {
    try {
      if (!prodId) return alert("Debes seleccionar un producto del catálogo.");
      if (!destino) return alert("Debes seleccionar una sucursal de destino.");
      
      const prodRef = doc(db, "productos", prodId);
      const currentProd = productos.find(p => p.id === prodId);
      if (!currentProd) return;

      let origen = "Depósito Central";
      let updatedStock = currentProd.stock || [];

      if (unitId && unitId !== "manual") {
        updatedStock = (currentProd.stock || []).map((u: any) => {
          if (u.id === unitId) {
            origen = u.localidad || "Depósito Central";
            return { ...u, estado: "Reservado" };
          }
          return u;
        });
      }

      await updateDoc(prodRef, { stock: updatedStock });

      const msg = origen === destino 
        ? `Reserva de stock realizada: Unidad con Serie/IMEI ${numSerie} asignada localmente en ${destino}.`
        : `Reserva de stock realizada: Unidad con Serie/IMEI ${numSerie} asignada en origen ${origen} con destino a sucursal ${destino}.`;

      await updateDoc(doc(db, "solicitudes", solId), {
        vinculoProductoId: prodId,
        vinculoUnidadId: unitId,
        numeroSerie: numSerie,
        sucursalDestino: destino,
        estadoProducto: origen === destino ? "En stock (Afiliado)" : "En viaje",
        historialRecepcion: msg
      });

      alert("¡Unidad reservada temporalmente con éxito en el stock!");
      await fetchProductos();
      await fetchSolicitudes();
    } catch (e: any) {
      console.error(e);
      alert("Error al reservar stock: " + e.message);
    }
  };

  const handleLiberarReserva = async (solId: string, prodId: string, unitId: string) => {
    try {
      if (!prodId) return;
      
      const prodRef = doc(db, "productos", prodId);
      const currentProd = productos.find(p => p.id === prodId);
      if (currentProd && unitId && unitId !== "manual") {
        const updatedStock = (currentProd.stock || []).map((u: any) => {
          if (u.id === unitId) {
            return { ...u, estado: "Disponible" };
          }
          return u;
        });
        await updateDoc(prodRef, { stock: updatedStock });
      }

      await updateDoc(doc(db, "solicitudes", solId), {
        vinculoProductoId: "",
        vinculoUnidadId: "",
        numeroSerie: "",
        sucursalDestino: "",
        estadoProducto: "En depósito (Central)",
        historialRecepcion: "Reserva de stock liberada. Unidad devuelta a disponibles."
      });

      alert("¡Reserva liberada! La unidad está disponible nuevamente.");
      await fetchProductos();
      await fetchSolicitudes();
    } catch (e: any) {
      console.error(e);
      alert("Error al liberar reserva: " + e.message);
    }
  };

  const handleConfirmarArriboSucursal = async (solId: string, prodId: string, unitId: string, destino: string) => {
    try {
      const prodRef = doc(db, "productos", prodId);
      const currentProd = productos.find(p => p.id === prodId);
      if (!currentProd) return;

      const updatedStock = (currentProd.stock || []).map((u: any) => {
        if (u.id === unitId) {
          return { ...u, localidad: destino }; // physically update stock location to destination sucursal
        }
        return u;
      });

      await updateDoc(prodRef, { stock: updatedStock });

      await updateDoc(doc(db, "solicitudes", solId), {
        estadoProducto: "En stock (Afiliado)",
        comisionistaFechaRecepcion: new Date().toISOString(),
        historialRecepcion: `El comisionista entregó el producto al afiliado en la sucursal de destino: ${destino}. Ruteo interno finalizado.`
      });

      alert(`¡Llegada confirmada! La unidad física ahora se encuentra en ${destino} en manos del afiliado local.`);
      await fetchProductos();
      await fetchSolicitudes();
    } catch (e: any) {
      console.error(e);
      alert("Error al confirmar arribo: " + e.message);
    }
  };

  const handleProcesarPagoFinal = async () => {
    if (!pagoAConfirmar) return;
    const { solId, idx, metodo, originalAmount, isClientApprove } = pagoAConfirmar;
    
    const amountPaid = Number(pagoMonto);
    if (isNaN(amountPaid) || amountPaid < 0) {
      alert("Por favor, ingrese un monto válido.");
      return;
    }

    try {
      const sol = solicitudes.find(s => s.id === solId);
      if (!sol) return;

      const newPlan = [...(sol.planPagos || [])];
      const cuota = newPlan[idx];

      newPlan[idx].estado = "PAGADO";
      newPlan[idx].montoAbonado = amountPaid;
      newPlan[idx].fechaPago = new Date().toISOString();
      newPlan[idx].nroComprobante = pagoComprobante.trim();
      newPlan[idx].cuentaDestino = pagoCuentaDestino.trim();
      if (!isClientApprove) {
        newPlan[idx].metodoPagoManual = metodo;
      }

      const difference = originalAmount - amountPaid;
      let nextCuotaVal: number | undefined = undefined;
      let nextCuotaNum: number | undefined = undefined;
      let feedbackMsg = "Pago registrado y acreditado con éxito.";

      if (difference !== 0) {
        const nextPendingIdx = newPlan.findIndex((c, i) => i > idx && c.estado === "PENDIENTE");
        if (nextPendingIdx !== -1) {
          const oldVal = newPlan[nextPendingIdx].montoOriginal;
          const newVal = Math.max(0, oldVal + difference);
          newPlan[nextPendingIdx].montoOriginal = newVal;
          nextCuotaVal = newVal;
          nextCuotaNum = newPlan[nextPendingIdx].numero;
          feedbackMsg = `Pago registrado. Diferencia de $${difference > 0 ? '+' : ''}${difference} trasladada a la Cuota ${newPlan[nextPendingIdx].numero} (Nuevo valor: $${newVal}).`;
        } else {
          feedbackMsg = `Pago registrado. Diferencia residual de $${difference} asentada en la cuota final del plan.`;
        }
      }

      // Guardar en Firebase
      await updateDoc(doc(db, "solicitudes", solId), { planPagos: newPlan });

      // Generar Comprobante en PDF e iniciar descarga automática
      const receiptId = `REC-${solId.substring(0, 5).toUpperCase()}-${cuota.numero}`;
      const numCuotasTotal = sol.planPagos?.length || parseInt(sol.planElegido || "12") || 12;
      const cProdVal = Number((sol as any).precioContado || (sol as any).costoProducto || (sol as any).costoBien) || 0;
      const totalFinVal = Number((sol as any).totalFinanciado) || (amountPaid * numCuotasTotal);
      const baseGravVal = Math.max(0, totalFinVal - cProdVal);
      
      const mExentoCuota = numCuotasTotal > 0 ? Math.round(cProdVal / numCuotasTotal) : 0;
      const mGravadoCuota = numCuotasTotal > 0 ? Math.round(baseGravVal / numCuotasTotal) : 0;

      generarComprobantePago({
        nroContrato: (sol as any).nroContrato || `CH-${sol.id.substring(0, 8).toUpperCase()}`,
        nroRecibo: receiptId,
        fecha: new Date().toLocaleDateString("es-AR"),
        clienteNombre: sol.datosPersonales?.nombreCompleto || (sol as any).nombreCompleto || "Cliente",
        clienteDni: sol.datosPersonales?.numeroDni || (sol as any).numeroDni || "-",
        cuotaNumero: cuota.numero,
        cuotasTotal: numCuotasTotal,
        montoAbonado: amountPaid,
        montoExento: mExentoCuota,
        montoGravado: mGravadoCuota,
        metodoPago: isClientApprove ? "Aprobación Recibo Online" : metodo,
        nroComprobante: pagoComprobante.trim() || undefined,
        cuentaDestino: pagoCuentaDestino.trim() || undefined,
        proximaCuotaValor: nextCuotaVal,
        proximaCuotaNumero: nextCuotaNum,
        esPagoParcial: difference !== 0
      });

      // Enviar Notificación al Afiliado
      if (sol.afiliadoEmail) {
        await addDoc(collection(db, "notificaciones"), {
          afiliadoEmail: sol.afiliadoEmail,
          mensaje: `Se acreditó el pago de cuota ${cuota.numero} de ${sol.datosPersonales?.nombreCompleto || 'cliente'} por $${amountPaid}. Comisión ganada.`,
          fecha: new Date().toISOString(),
          leida: false,
          comisionAsociada: amountPaid * 0.15,
          estadoPago: "PENDIENTE",
          cuotaAsociada: cuota.numero || idx + 1,
          clienteNombre: sol.datosPersonales?.nombreCompleto || 'Desconocido'
        });
      }

      await fetchSolicitudes();
      setPagoAConfirmar(null);
      alert(`${feedbackMsg}\n\n¡El comprobante de pago PDF ha sido generado y descargado!`);
    } catch (e: any) {
      console.error(e);
      alert("Error al procesar el pago: " + e.message);
    }
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

  const handleGuardarEdicionContrato = async () => {
    if (!contratoAEditar) return;
    try {
      const solId = contratoAEditar.solId;
      const isAp = aperturas.some((a) => a.id === solId);
      const colName = isAp ? "solicitudes_cuenta" : "solicitudes";

      const numContado = parseFloat(contratoAEditar.precioContado?.toString().replace(/[^0-9.-]/g, "") || "0") || 0;
      const numTotal = parseFloat(contratoAEditar.totalFinanciado?.toString().replace(/[^0-9.-]/g, "") || "0") || 0;
      const numCuotas = parseInt(contratoAEditar.cuotas) || 12;
      const numImp = parseFloat(contratoAEditar.importeCuota?.toString().replace(/[^0-9.-]/g, "") || "0") || 0;

      const payload: any = {
        nroContrato: contratoAEditar.nroContrato,
        nombreCompleto: contratoAEditar.nombreComprador,
        numeroDni: contratoAEditar.dni,
        direccion: contratoAEditar.domicilio,
        email: contratoAEditar.email,
        whatsapp: contratoAEditar.whatsapp,
        productoDeseado: contratoAEditar.producto,
        numeroSerie: contratoAEditar.nserie,
        precioContado: numContado,
        costoProducto: numContado,
        costoBien: numContado,
        totalFinanciado: numTotal,
        planElegido: String(numCuotas),
        montoCuota: numImp,
        tasaInteresTna: parseFloat(contratoAEditar.tnaComp) || 60,
        tasaMora: parseFloat(contratoAEditar.tnaPun) || 0.5,
        lugarFechaFirma: contratoAEditar.lugarFecha,
        planPagos: contratoAEditar.cuotasPlan || []
      };

      await updateDoc(doc(db, colName, solId), payload);

      if (isAp) {
        const solSnap = await getDocs(collection(db, "solicitudes"));
        solSnap.forEach((d) => {
          if (d.data().clienteId === "aperturado_" + solId) {
            updateDoc(doc(db, "solicitudes", d.id), payload).catch(console.error);
          }
        });
      } else if (contratoAEditar.originalSolicitud?.clienteId?.startsWith("aperturado_")) {
        const apId = contratoAEditar.originalSolicitud.clienteId.replace("aperturado_", "");
        updateDoc(doc(db, "solicitudes_cuenta", apId), payload).catch(console.error);
      }

      setSolicitudes((prev) =>
        prev.map((s) => (s.id === solId || s.clienteId === "aperturado_" + solId ? { ...s, ...payload } : s))
      );
      setAperturas((prev) =>
        prev.map((a) => (a.id === solId || "aperturado_" + a.id === contratoAEditar.originalSolicitud?.clienteId ? { ...a, ...payload } : a))
      );

      alert("✅ Modificaciones del Contrato y Pagaré guardadas con éxito en la base de datos.");
      await fetchSolicitudes();
      await fetchAperturas();
    } catch (err: any) {
      console.error("Error al guardar cambios de contrato:", err);
      alert("Error al guardar modificaciones: " + (err.message || err.toString()));
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

    // Default "Precio Producto" to supplier product cost (Costo del Producto en Proveedor)
    const numCuotasNum = parseInt(planElegido) || 12;
    const totalFinanciadoVal = numCuotasNum * vc;

    let calculatedContado = 0;
    if (sol.costoProducto && Number(sol.costoProducto) > 0) {
      calculatedContado = Number(sol.costoProducto);
    } else if (sol.costoProveedor && Number(sol.costoProveedor) > 0) {
      calculatedContado = Number(sol.costoProveedor);
    } else if (sol.precioContado && Number(sol.precioContado) > 0 && Number(sol.precioContado) < totalFinanciadoVal) {
      calculatedContado = Number(sol.precioContado);
    } else {
      const solProdName = (sol.productoDeseado || sol.productoNombre || "").toLowerCase().trim();
      const prodMatch = (productos || []).find((p: any) => {
        if (!p.nombre) return false;
        const pName = p.nombre.toLowerCase().trim();
        return pName === solProdName || pName.includes(solProdName) || solProdName.includes(pName);
      });

      if (prodMatch) {
        if (prodMatch.costoProducto && Number(prodMatch.costoProducto) > 0) {
          calculatedContado = Number(prodMatch.costoProducto);
        } else if (prodMatch.precioContado && Number(prodMatch.precioContado) > 0 && Number(prodMatch.precioContado) < totalFinanciadoVal) {
          calculatedContado = Number(prodMatch.precioContado);
        }
      }
    }

    if (calculatedContado <= 0 || calculatedContado >= totalFinanciadoVal) {
      const defaultFactor = numCuotasNum === 12 ? 1.5873 : (numCuotasNum === 8 ? 1.35 : 1.5);
      calculatedContado = Math.round(totalFinanciadoVal / defaultFactor);
    }

    const factorVal = calculatedContado > 0 ? (totalFinanciadoVal / calculatedContado).toFixed(4) : "1.5873";

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
            dniFrente: c.originalSolicitud.dniFrenteURL || "",
            dniDorso: c.originalSolicitud.dniDorsoURL || "",
            reciboSueldo: "",
            servicio: ""
          },
          productoDeseado: c.producto,
          costoProducto: Number(c.precioContado),
          precioContado: Number(c.precioContado),
          factorFinanciado: Number(c.factorFinanciado),
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
          costoProducto: Number(c.precioContado),
          precioContado: Number(c.precioContado),
          factorFinanciado: Number(c.factorFinanciado),
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
      // Fetch current solicitudes to check for duplicates and prevent race conditions
      const solSnap = await getDocs(collection(db, "solicitudes"));
      const currentSols: any[] = [];
      solSnap.forEach(d => currentSols.push({ id: d.id, ...d.data() }));

      const snap = await getDocs(collection(db, "solicitudes_cuenta"));
      const results: any[] = [];
      snap.forEach(d => results.push({ id: d.id, ...d.data() }));
      results.sort((a: any, b: any) => {
        const timeA = a.fecha?.seconds || a.fechaCreacion?.seconds || 0;
        const timeB = b.fecha?.seconds || b.fechaCreacion?.seconds || 0;
        return timeB - timeA;
      });
      setAperturas(results);

      // Legacy auto-migration for approved accounts that have not been replicated in solicitudes
      let hasMigrated = false;
      for (const req of results) {
        if (req.estado === "Aprobado") {
          const exists = currentSols.some((s: any) => s.clienteId === "aperturado_" + req.id);
          if (!exists) {
            console.log("Migrating legacy approved account:", req.id);
            const planCuotasList = [];
            const planElegidoVal = req.planElegido || "12";
            const montoCuotaVal = req.montoCuota || 0;
            const cant = parseInt(planElegidoVal) || 12;
            const bDate = new Date();
            for(let i = 1; i <= cant; i++) {
              const nd = new Date(bDate);
              nd.setMonth(nd.getMonth() + i);
              planCuotasList.push({
                numero: i,
                vencimiento: nd.toISOString().split('T')[0],
                montoOriginal: montoCuotaVal,
                observacion: "Cuota mensual ordinaria",
                estado: "PENDIENTE"
              });
            }

            await addDoc(collection(db, "solicitudes"), {
              clienteId: "aperturado_" + req.id,
              clienteEmail: req.email || "no-email@cuenta-hogar.com",
              datosPersonales: {
                nombreCompleto: req.nombreCompleto || req.nombre || "",
                numeroDni: req.numeroDni || req.dni || "",
                telefono: req.whatsapp || "",
                direccion: req.direccion || "",
                localidad: req.localidad || "",
                cuil: req.cuil || ""
              },
              documentos: {
                dniFrente: req.dniFrenteURL || "",
                dniDorso: req.dniDorsoURL || "",
                reciboSueldo: req.comprobanteURL || "",
                servicio: req.comprobanteDomicilioURL || ""
              },
              productoDeseado: req.productoNombre || req.necesidad || "A definir",
              montoCuota: montoCuotaVal,
              planElegido: planElegidoVal,
              tasaInteresTna: req.tasaInteresTna || 60,
              tasaMora: req.tasaMora || 0.5,
              estado: "APROBADO",
              estadoEntrega: "PENDIENTE_ENTREGA",
              fechaCreacion: serverTimestamp(),
              cargadoPorAfiliado: false,
              afiliadoEmail: req.referidoPor || req.afiliadoEmail || null,
              planPagos: planCuotasList
            });
            hasMigrated = true;
          }
        }
      }

      if (hasMigrated) {
        // Refresh local solicitudes state
        const q2 = query(collection(db, "solicitudes"), orderBy("fechaCreacion", "desc"));
        const snap2 = await getDocs(q2);
        const results2: Solicitud[] = [];
        snap2.forEach(d => results2.push({ id: d.id, ...d.data() } as Solicitud));
        setSolicitudes(results2);
      }
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

      // Auto-create in solicitudes collection if approved so it immediately enters Logística
      if (nuevoEstado === "Aprobado") {
        const reqObj = aperturas.find((ap: any) => ap.id === id);
        if (reqObj) {
          const exists = solicitudes.some((s: any) => s.clienteId === "aperturado_" + id);
          if (!exists) {
            const planCuotasList = [];
            const planElegidoVal = reqObj.planElegido || "12";
            const montoCuotaVal = reqObj.montoCuota || 0;
            const cant = parseInt(planElegidoVal) || 12;
            const bDate = new Date();
            for(let i = 1; i <= cant; i++) {
              const nd = new Date(bDate);
              nd.setMonth(nd.getMonth() + i);
              planCuotasList.push({
                numero: i,
                vencimiento: nd.toISOString().split('T')[0],
                montoOriginal: montoCuotaVal,
                observacion: "Cuota mensual ordinaria",
                estado: "PENDIENTE"
              });
            }

            await addDoc(collection(db, "solicitudes"), {
              clienteId: "aperturado_" + id,
              clienteEmail: reqObj.email || "no-email@cuenta-hogar.com",
              datosPersonales: {
                nombreCompleto: reqObj.nombreCompleto || reqObj.nombre || "",
                numeroDni: reqObj.numeroDni || reqObj.dni || "",
                telefono: reqObj.whatsapp || "",
                direccion: reqObj.direccion || "",
                localidad: reqObj.localidad || "",
                cuil: reqObj.cuil || ""
              },
              documentos: {
                dniFrente: reqObj.dniFrenteURL || "",
                dniDorso: reqObj.dniDorsoURL || "",
                reciboSueldo: reqObj.comprobanteURL || "",
                servicio: reqObj.comprobanteDomicilioURL || ""
              },
              productoDeseado: reqObj.productoNombre || reqObj.necesidad || "A definir",
              montoCuota: montoCuotaVal,
              planElegido: planElegidoVal,
              tasaInteresTna: reqObj.tasaInteresTna || 60,
              tasaMora: reqObj.tasaMora || 0.5,
              estado: "APROBADO",
              estadoEntrega: "PENDIENTE_ENTREGA",
              fechaCreacion: serverTimestamp(),
              cargadoPorAfiliado: false,
              afiliadoEmail: reqObj.referidoPor || reqObj.afiliadoEmail || null,
              planPagos: planCuotasList
            });
            await fetchSolicitudes();
          }
        }
      }

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

  const handleActualizarEstadoDespachoRemito = async (sol: any, nuevoEstado: string) => {
    try {
      const solId = sol.id;
      const isAp = aperturas.some((a) => a.id === solId);
      const colName = isAp ? "solicitudes_cuenta" : "solicitudes";

      const payload: any = {
        remitoDespachoEstado: nuevoEstado,
        remitoDespachoTransporte: (remitoEditId === solId ? remitoTransporte : sol.remitoDespachoTransporte) || null,
        remitoDespachoGuia: (remitoEditId === solId ? remitoGuiaLocal : sol.remitoDespachoGuia) || null,
        remitoDespachoCosto: (remitoEditId === solId ? (parseFloat(remitoCostoLocal) || 0) : (sol.remitoDespachoCosto || 0)),
        remitoDespachoFecha: (remitoEditId === solId ? remitoFechaSalida : sol.remitoDespachoFecha) || new Date().toISOString().split("T")[0]
      };

      await updateDoc(doc(db, colName, solId), payload);

      if (isAp) {
        const solSnap = await getDocs(collection(db, "solicitudes"));
        solSnap.forEach((d) => {
          if (d.data().clienteId === "aperturado_" + solId) {
            updateDoc(doc(db, "solicitudes", d.id), payload).catch(console.error);
          }
        });
      } else if (sol.clienteId && sol.clienteId.startsWith("aperturado_")) {
        const apId = sol.clienteId.replace("aperturado_", "");
        updateDoc(doc(db, "solicitudes_cuenta", apId), payload).catch(console.error);
      }

      setSolicitudes((prev) =>
        prev.map((s) => (s.id === solId || s.clienteId === "aperturado_" + solId ? { ...s, ...payload } : s))
      );
      setAperturas((prev) =>
        prev.map((a) => (a.id === solId || "aperturado_" + a.id === sol.clienteId ? { ...a, ...payload } : a))
      );

      alert("✅ Estado de Despacho al Destinatario actualizado correctamente.");
      await fetchSolicitudes();
      await fetchAperturas();
    } catch (err: any) {
      console.error("Error al actualizar estado de despacho:", err);
      alert("Error al actualizar estado de despacho: " + (err.message || err.toString()));
    }
  };

  const handleGuardarDespachoRemito = async (sol: any) => {
    try {
      const solId = sol.id;
      const isAp = aperturas.some((a) => a.id === solId);
      const colName = isAp ? "solicitudes_cuenta" : "solicitudes";

      const nroRemitoGenerado = sol.remitoDespachoNro || `7777-${solId.substring(0, 8).toUpperCase()}`;

      const destNombre = getDestinatarioNombre(sol);
      const destDoc = getDestinatarioDoc(sol);
      const destTel = getDestinatarioTel(sol);
      const destDireccion = getDestinatarioDireccion(sol);

      const payloadDespacho: any = {
        remitoDespachoNro: nroRemitoGenerado,
        remitoDespachoDestinatario: destNombre,
        remitoDespachoDoc: destDoc,
        remitoDespachoDireccion: destDireccion,
        remitoDespachoTel: destTel,
        remitoDespachoTransporte: (remitoEditId === solId ? remitoTransporte : sol.remitoDespachoTransporte) || null,
        remitoDespachoGuia: (remitoEditId === solId ? remitoGuiaLocal : sol.remitoDespachoGuia) || null,
        remitoDespachoCosto: (remitoEditId === solId ? (parseFloat(remitoCostoLocal) || 0) : (sol.remitoDespachoCosto || 0)),
        remitoDespachoFecha: (remitoEditId === solId ? remitoFechaSalida : sol.remitoDespachoFecha) || new Date().toISOString().split("T")[0],
        remitoDespachoEstado: (remitoEditId === solId ? remitoEstadoEnvio : (sol.remitoDespachoEstado || "REMITO_EMITIDO"))
      };

      await updateDoc(doc(db, colName, solId), payloadDespacho);

      if (isAp) {
        const solSnap = await getDocs(collection(db, "solicitudes"));
        solSnap.forEach((d) => {
          if (d.data().clienteId === "aperturado_" + solId) {
            updateDoc(doc(db, "solicitudes", d.id), payloadDespacho).catch(console.error);
          }
        });
      } else if (sol.clienteId && sol.clienteId.startsWith("aperturado_")) {
        const apId = sol.clienteId.replace("aperturado_", "");
        updateDoc(doc(db, "solicitudes_cuenta", apId), payloadDespacho).catch(console.error);
      }

      await addDoc(collection(db, "remitos"), {
        nroRemito: nroRemitoGenerado,
        fechaEmision: new Date().toLocaleDateString("es-AR"),
        fechaCreacion: serverTimestamp(),
        tipoRemito: "REMITO_TIPO_R",
        nroContratoInterno: sol.nroContrato || `CH-${solId.substring(0, 6).toUpperCase()}`,
        clienteNombre: payloadDespacho.remitoDespachoDestinatario,
        clienteDni: payloadDespacho.remitoDespachoDoc,
        clienteDomicilio: payloadDespacho.remitoDespachoDireccion,
        clienteTelefono: payloadDespacho.remitoDespachoTel,
        transporteLocal: payloadDespacho.remitoDespachoTransporte,
        costoLocal: payloadDespacho.remitoDespachoCosto,
        guiaLocal: payloadDespacho.remitoDespachoGuia,
        estadoEnvio: payloadDespacho.remitoDespachoEstado,
        productoDescripcion: sol.productoDeseado || sol.productoNombre || "Producto",
        nserie: sol.numeroSerie || "",
        cantidad: 1
      });

      alert("✅ Seguimiento de Despacho por Remito registrado y guardado exitosamente.");
      setRemitoEditId(null);
      await fetchSolicitudes();
      await fetchAperturas();
    } catch (err: any) {
      console.error("Error al guardar despacho de remito:", err);
      alert("Error al guardar despacho de remito: " + (err.message || err.toString()));
    }
  };

  const handleGuardarPedidoProveedor = async (solId: string) => {
    try {
      const isAp = aperturas.some((a) => a.id === solId);
      const colName = isAp ? "solicitudes_cuenta" : "solicitudes";

      const payload: any = {
        proveedorNombre: proveedorNombre.trim() || null,
        proveedorGuia: proveedorGuia.trim() || null,
        proveedorCosto: parseFloat(proveedorCosto) || 0,
        proveedorFechaPedido: proveedorFechaPedido || new Date().toISOString().split("T")[0],
        proveedorFechaEstimada: proveedorFechaEstimada || null,
        proveedorEstado: proveedorEstado || "SOLICITADO",
        proveedorFacturaTicket: proveedorFacturaTicket.trim() || null,
        facturaProveedorOriginal: proveedorFacturaTicket.trim() || null
      };

      if (proveedorEstado === "RECIBIDO") {
        payload.proveedorFechaRecepcion = new Date().toISOString();
      }

      await updateDoc(doc(db, colName, solId), payload);

      if (isAp) {
        const solSnap = await getDocs(collection(db, "solicitudes"));
        solSnap.forEach((d) => {
          if (d.data().clienteId === "aperturado_" + solId) {
            updateDoc(doc(db, "solicitudes", d.id), payload).catch(console.error);
          }
        });
      } else {
        const solObj = solicitudes.find((s) => s.id === solId);
        if (solObj?.clienteId && solObj.clienteId.startsWith("aperturado_")) {
          const apId = solObj.clienteId.replace("aperturado_", "");
          updateDoc(doc(db, "solicitudes_cuenta", apId), payload).catch(console.error);
        }
      }

      alert("✅ Pedido a Proveedor registrado exitosamente.");
      setProveedorEditId(null);
      await fetchSolicitudes();
      await fetchAperturas();
    } catch (err: any) {
      console.error("Error al guardar pedido a proveedor:", err);
      alert("Error al guardar pedido a proveedor: " + (err.message || err.toString()));
    }
  };

  const handleEliminarPedido = async (e: React.MouseEvent, sol: any) => {
    e.stopPropagation();
    const clienteNombre = sol.nombreCompleto || sol.datosPersonales?.nombreCompleto || "este cliente";
    const productoNombre = sol.productoNombre || sol.productoDeseado || sol.producto || "Producto";
    
    const confirmacion = window.confirm(
      `⚠️ ¿Estás seguro de eliminar el pedido / venta de ${clienteNombre} (${productoNombre})?\n\n` +
      `Se borrará la solicitud de forma permanente de la base de datos en todas las colecciones.`
    );
    if (!confirmacion) return;

    try {
      // 1. Borrar de ambas colecciones (solicitudes y solicitudes_cuenta) para evitar que la auto-migración lo recree
      if (sol.isApertura) {
        await deleteDoc(doc(db, "solicitudes_cuenta", sol.id)).catch(console.error);

        // Borrar cualquier réplica asociada en solicitudes (clienteId: "aperturado_" + id)
        const solSnap = await getDocs(collection(db, "solicitudes"));
        solSnap.forEach((d) => {
          const data = d.data();
          if (data.clienteId === "aperturado_" + sol.id || d.id === sol.id) {
            deleteDoc(doc(db, "solicitudes", d.id)).catch(console.error);
          }
        });
      } else {
        await deleteDoc(doc(db, "solicitudes", sol.id)).catch(console.error);

        // Si provenía de una apertura vinculada
        if (sol.clienteId && sol.clienteId.startsWith("aperturado_")) {
          const aperturaId = sol.clienteId.replace("aperturado_", "");
          await deleteDoc(doc(db, "solicitudes_cuenta", aperturaId)).catch(console.error);
        }
        await deleteDoc(doc(db, "solicitudes_cuenta", sol.id)).catch(() => {});
      }

      // 2. Liberar reserva de stock si tenía una unidad vinculada
      if (sol.vinculoProductoId && sol.vinculoUnidadId) {
        try {
          const prodRef = doc(db, "productos", sol.vinculoProductoId);
          const prodSnap = await getDoc(prodRef);
          if (prodSnap.exists()) {
            const pData = prodSnap.data();
            const stockActual = pData.stock || [];
            const stockModificado = stockActual.map((u: any) => {
              if (u.id === sol.vinculoUnidadId) {
                return { ...u, estado: "Disponible", asignadoA: null, fechaAsignacion: null };
              }
              return u;
            });
            await updateDoc(prodRef, { stock: stockModificado });
          }
        } catch (errStock) {
          console.error("Error al liberar stock:", errStock);
        }
      }

      // 3. Limpiar estado local optimista
      setSolicitudes((prev) => prev.filter((s) => s.id !== sol.id && s.clienteId !== "aperturado_" + sol.id));
      setAperturas((prev) => prev.filter((a) => a.id !== sol.id && "aperturado_" + a.id !== sol.clienteId));

      alert("✅ Pedido / Venta eliminado permanentemente.");
      await fetchSolicitudes();
      await fetchAperturas();
    } catch (err: any) {
      console.error("Error al eliminar pedido:", err);
      alert("Error al eliminar pedido: " + (err.message || err.toString()));
    }
  };
  const [searchTerm, setSearchTerm] = useState("");

  const fetchSolicitudes = async () => {
    try {
      const snap = await getDocs(collection(db, "solicitudes"));
      const results: Solicitud[] = [];
      snap.forEach(d => results.push({ id: d.id, ...d.data() } as Solicitud));
      results.sort((a: any, b: any) => {
        const timeA = a.fechaCreacion?.seconds || a.fechaCreacion?.toMillis?.() || 0;
        const timeB = b.fechaCreacion?.seconds || b.fechaCreacion?.toMillis?.() || 0;
        return timeB - timeA;
      });
      setSolicitudes(results);
    } catch (error) {
      console.error("Error cargando solicitudes:", error);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    fetchSolicitudes();
    getDoc(doc(db, "configuraciones", "empresa_remitos")).then(snap => {
      if (snap.exists()) setEmpresaRemitosConfig(snap.data());
    }).catch(console.error);
    fetchAperturas();
    fetchProductos();
  }, []);

  useEffect(() => {
    if (expandedId) {
      const sol = solicitudes.find(s => s.id === expandedId);
      if (sol) {
        // Find product with name matching sol.productoDeseado case-insensitively
        const match = productos.find(p => p.nombre.toLowerCase().trim() === (sol.productoDeseado || "").toLowerCase().trim());
        if (match) {
          setSelectedProductId(match.id);
          setSelectedProductStock(match);
          if (sol.vinculoUnidadId) {
            setSelectedStockUnitId(sol.vinculoUnidadId);
            setNserie(sol.numeroSerie || "");
          } else {
            setSelectedStockUnitId("");
            setNserie("");
          }
        } else {
          setSelectedProductId("");
          setSelectedProductStock(null);
          setSelectedStockUnitId("");
          setNserie("");
        }

        // Auto-select sucursalDestino
        const dest = sol.sucursalDestino || sol.datosPersonales?.localidad || "Lincoln";
        setSelectedDestino(dest);
        setRemitoDestinatarioNombre(sol.afiliadoEmail || "");
        setRemitoDestinatarioDireccion(dest);
        setRemitoDestinatarioDoc("");
        setRemitoDestinatarioTel("");
      }
    }
  }, [expandedId, solicitudes, productos]);

  
  
  const handleActualizarEstadoProducto = async (id: string, nuevoEstado: string) => {
    try {
      await updateDoc(doc(db, "solicitudes", id), { estadoProducto: nuevoEstado });
      await fetchSolicitudes();
    } catch (e) { console.error(e); }
  };

  const handleConfirmarEntregaAdmin = async (id: string, nuevoEstado: string, esDirecto: boolean = false, selectedProdId: string = "", selectedUnitId: string = "") => {
    try {
      const solObj = solicitudes.find((s: any) => s.id === id);
      const dataToUpdate: any = { estadoEntrega: nuevoEstado };
      if (nuevoEstado === "ENTREGADO" && !esDirecto) {
        const finalNserie = solObj?.numeroSerie || "";
        dataToUpdate.numeroSerie = finalNserie;
        if (!montoAbonado || isNaN(Number(montoAbonado))) return alert("ADMIN: Debes ingresar un monto válido.");
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
        if (solObj && solObj.planElegido) {
           const cant = parseInt(solObj.planElegido);
           const vc = solObj.montoCuota || 0;
           const planArr = [];
           const bDate = new Date();
           
           const hasAbonado = Number(montoAbonado) > 0;
           
           for (let i = 1; i <= cant; i++) {
              const nd = new Date(bDate);
              nd.setMonth(nd.getMonth() + i);
              
              if (i === 1 && hasAbonado) {
                 planArr.push({
                    numero: 1,
                    montoOriginal: Number(montoAbonado),
                    montoAbonado: Number(montoAbonado),
                    estado: "PAGADO",
                    vencimiento: new Date().toISOString(),
                    fechaPago: new Date().toISOString(),
                    metodoPago: metodoPago,
                    comprobanteUrl: null,
                    notaAcumulacion: "Cobrada en Entrega"
                 });
              } else {
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
        let sortTime = Date.now();
        if (ap.fecha?.seconds) sortTime = ap.fecha.seconds * 1000;
        else if (ap.fechaCreacion?.seconds) sortTime = ap.fechaCreacion.seconds * 1000;
        else if (ap.fechaIso) sortTime = new Date(ap.fechaIso).getTime();
        else if (ap.fecha && typeof ap.fecha === "string") sortTime = new Date(ap.fecha).getTime();

        if (ap.tipo === "contacto_rapido") {
          return {
            ...ap,
            isApertura: true,
            nombreCompleto: ap.nombre,
            numeroDni: ap.dni,
            whatsapp: ap.whatsapp,
            localidad: ap.localidad,
            productoNombre: ap.necesidad,
            fechaSort: sortTime
          };
        }
        return { 
          ...ap, 
          isApertura: true, 
          fechaSort: sortTime 
        };
      }),
    ...solicitudes
      .filter((sol: any) => sol.estado === "PENDIENTE" || sol.estado === "REQUIERE_INFO" || sol.estado === "PENDIENTE_FIRMA")
      .map((sol: any) => {
        let sortTime = Date.now();
        if (sol.fechaCreacion?.seconds) sortTime = sol.fechaCreacion.seconds * 1000;
        else if (sol.fecha?.seconds) sortTime = sol.fecha.seconds * 1000;
        else if (sol.fechaIso) sortTime = new Date(sol.fechaIso).getTime();

        return { ...sol, isApertura: false, fechaSort: sortTime };
      })
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
              groupSolicitudes(filteredCombined).length === 0 ? (
                <p className="text-zinc-500 italic text-center py-10">No se encontraron solicitudes pendientes en evaluación.</p>
              ) : (
                groupSolicitudes(filteredCombined).map((group: any) => {
                  const isExpanded = expandedId === group.key;
                  const activeId = activeProductSolId[group.key] || group.items[0].id;
                  const req = group.items.find((x: any) => x.id === activeId) || group.items[0];
                  
                  if (req.isApertura) {
                    // Render Apertura Accordion Item
                    return (
                      <div key={group.key} className={`bg-zinc-950 border ${isExpanded ? 'border-amber-500/50 shadow-[0_0_20px_rgba(245,158,11,0.15)]' : 'border-zinc-800 hover:border-amber-500/40'} rounded-xl transition-all overflow-hidden`}>
                        <div 
                          onClick={() => { setExpandedId(isExpanded ? null : group.key); setDraftItems([]); }}
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
                            {group.items.length > 1 && (
                              <div className="flex flex-wrap gap-2 border-b border-zinc-800 pb-4 mb-4">
                                <span className="text-zinc-500 text-[10px] font-black uppercase self-center mr-2">Ver Producto:</span>
                                {group.items.map((item: any) => {
                                   const isActive = item.id === req.id;
                                   return (
                                     <button
                                       key={item.id}
                                       type="button"
                                       onClick={(e) => {
                                         e.stopPropagation();
                                         setActiveProductSolId(prev => ({ ...prev, [group.key]: item.id }));
                                       }}
                                       className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${isActive ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20' : 'bg-zinc-950 text-zinc-400 border border-zinc-850 hover:bg-zinc-900'}`}
                                     >
                                       🛍️ {item.productoDeseado || item.producto || "Apertura"} ({item.estado})
                                     </button>
                                   );
                                })}
                              </div>
                            )}
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

                                  {/* Formulario para cargar nuevo presupuesto con Motor Financiero Unificado */}
                                  <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-900 space-y-3">
                                    <div className="flex justify-between items-center border-b border-zinc-900 pb-2">
                                      <h4 className="text-sm font-black text-yellow-400 uppercase tracking-wider">
                                        {editandoPresupuestoId ? `Editar Presupuesto (${editandoPresupuestoId.replace("pres_", "").substring(0, 8).toUpperCase()})` : "Armar Presupuesto Combinado"}
                                      </h4>
                                      <span className="text-[9px] bg-amber-500/10 text-amber-400 font-mono font-bold px-2 py-0.5 rounded border border-amber-500/30">
                                        Mismos Factores que Catálogo
                                      </span>
                                    </div>
                                    
                                    <div className="grid grid-cols-2 gap-3">
                                      <div className="col-span-2">
                                        <label className="block text-[10px] text-zinc-400 font-bold mb-1">Producto Propuesto</label>
                                        <input 
                                          type="text" 
                                          value={budgetProd} 
                                          onChange={e=>setBudgetProd(e.target.value)} 
                                          placeholder="Ej: HELADERA GAFA 280 L" 
                                          className="bg-zinc-900 border border-zinc-800 p-2 rounded text-xs text-white w-full outline-none focus:border-yellow-500 font-bold" 
                                        />
                                      </div>
                                      
                                      {/* COSTO PROVEEDOR - CAPITAL EXENTO (CAMPO CLAVE) */}
                                      <div>
                                        <label className="block text-[10px] text-emerald-400 font-bold mb-1">🔒 Costo Proveedor ($) <span className="text-emerald-500 text-[9px]">(Capital Exento)</span></label>
                                        <input 
                                          type="number" 
                                          value={budgetCostoProveedor} 
                                          onChange={e=>handleCambiarCostoProveedor(e.target.value)} 
                                          placeholder="Ej: 400000" 
                                          className="bg-zinc-900 border border-emerald-500/40 p-2 rounded text-xs text-white w-full outline-none focus:border-emerald-400 font-mono font-black" 
                                        />
                                      </div>

                                      {/* CANTIDAD DE CUOTAS (1 A 12 CUOTAS) */}
                                      <div>
                                        <label className="block text-[10px] text-zinc-400 font-bold mb-1">Cantidad de Cuotas</label>
                                        <select 
                                          value={budgetCuotas} 
                                          onChange={e=>handleCambiarCuotas(e.target.value)} 
                                          className="bg-zinc-900 border border-zinc-800 p-2 rounded text-xs text-white w-full outline-none focus:border-yellow-500 font-bold"
                                        >
                                          {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
                                            <option key={n} value={n}>
                                              {n} {n === 1 ? "Cuota" : "Cuotas"} (Factor {FACTORES_PREDETERMINADOS[n] || 2.5})
                                            </option>
                                          ))}
                                          <option value="18">18 Cuotas (Factor 3.25)</option>
                                        </select>
                                      </div>

                                      {/* FACTOR FINANCIADO APLICADO */}
                                      <div>
                                        <label className="block text-[10px] text-amber-400 font-bold mb-1">Factor Financiación</label>
                                        <input 
                                          type="number" 
                                          step="0.01" 
                                          value={budgetFactor} 
                                          onChange={e=>handleCambiarFactor(e.target.value)} 
                                          className="bg-zinc-900 border border-amber-500/40 p-2 rounded text-xs text-white w-full outline-none focus:border-amber-400 font-mono font-bold" 
                                        />
                                      </div>

                                      {/* VALOR DE LA CUOTA CALCULADO */}
                                      <div>
                                        <label className="block text-[10px] text-yellow-300 font-bold mb-1">Valor Cuota Mensual ($)</label>
                                        <input 
                                          type="number" 
                                          value={budgetCuotaValor} 
                                          onChange={e=>handleCambiarCuotaDirecta(e.target.value)} 
                                          placeholder="Ej: 83333" 
                                          className="bg-zinc-900 border border-yellow-500/50 p-2 rounded text-xs text-yellow-300 w-full outline-none focus:border-yellow-400 font-black font-mono shadow-inner" 
                                        />
                                      </div>

                                      {/* MONTO REFERENCIA CONTADO / TOTAL */}
                                      <div className="col-span-2">
                                        <label className="block text-[10px] text-zinc-500 font-bold mb-1">Monto Referencia Contado / Total Financiado ($)</label>
                                        <div className="flex gap-2">
                                          <input 
                                            type="number" 
                                            value={budgetContado} 
                                            onChange={e=>setBudgetContado(e.target.value)} 
                                            placeholder="Calculado automáticamente" 
                                            className="bg-zinc-900 border border-zinc-800 p-2 rounded text-xs text-zinc-300 w-full outline-none focus:border-yellow-500 font-mono" 
                                          />
                                          <button
                                            type="button"
                                            onClick={() => handleRecalcularDesdeCosto()}
                                            className="bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-[10px] font-bold px-3 py-1 rounded transition text-nowrap"
                                          >
                                            🔄 Recalcular
                                          </button>
                                        </div>
                                      </div>
                                      
                                      {/* DATOS PROVEEDOR USO INTERNO */}
                                      <div>
                                        <label className="block text-[10px] text-zinc-500 font-bold mb-1">🔒 Proveedor (Uso Interno)</label>
                                        <input type="text" value={budgetProveedor} onChange={e=>setBudgetProveedor(e.target.value)} placeholder="Ej: Distribuidora BA" className="bg-zinc-900 border border-zinc-800 p-2 rounded text-xs text-white w-full outline-none focus:border-yellow-500" />
                                      </div>
                                      <div>
                                        <label className="block text-[10px] text-zinc-500 font-bold mb-1">🔒 Link Proveedor (Uso Interno)</label>
                                        <input type="text" value={budgetLinkProveedor} onChange={e=>setBudgetLinkProveedor(e.target.value)} placeholder="Ej: mercadolibre.com.ar/..." className="bg-zinc-900 border border-zinc-800 p-2 rounded text-xs text-white w-full outline-none focus:border-yellow-500" />
                                      </div>
                                    </div>

                                    {/* BOTÓN PARA DESPLEGAR DESGLOSE DE TABLA DE LOS 12 PLANES */}
                                    {Number(budgetCostoProveedor) > 0 && (
                                      <div className="pt-2">
                                        <button
                                          type="button"
                                          onClick={() => setMostrarTabla12Cuotas(!mostrarTabla12Cuotas)}
                                          className="w-full bg-zinc-900 hover:bg-zinc-850 text-amber-400 border border-amber-500/30 py-1.5 px-3 rounded text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition"
                                        >
                                          {mostrarTabla12Cuotas ? "🙈 Ocultar Tabla de Planes 1 a 12" : "👁️ Ver Tabla Completa de Cuotas (1 a 12 Planes)"}
                                        </button>

                                        {mostrarTabla12Cuotas && (
                                          <div className="mt-2 bg-zinc-900/90 border border-amber-500/30 p-3 rounded-xl space-y-2 max-h-60 overflow-y-auto">
                                            <p className="text-[10px] text-zinc-400 font-bold">Planes calculados para Costo ${Number(budgetCostoProveedor).toLocaleString("es-AR")}:</p>
                                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[10px]">
                                              {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => {
                                                const factor = FACTORES_PREDETERMINADOS[n] || 2.5;
                                                const vTotal = Math.round(Number(budgetCostoProveedor) * factor);
                                                const vCuota = Math.round(vTotal / n);
                                                const isSelected = Number(budgetCuotas) === n;
                                                return (
                                                  <button
                                                    type="button"
                                                    key={n}
                                                    onClick={() => {
                                                      setBudgetCuotas(String(n));
                                                      setBudgetFactor(String(factor));
                                                      setBudgetCuotaValor(String(vCuota));
                                                    }}
                                                    className={`p-2 rounded border text-left font-mono transition ${
                                                      isSelected ? "bg-amber-500 text-black border-amber-400 font-bold" : "bg-zinc-950 text-zinc-300 border-zinc-800 hover:border-amber-500/50"
                                                    }`}
                                                  >
                                                    <span className="block font-black">{n} {n === 1 ? "Cuota" : "Cuotas"}</span>
                                                    <span className="block font-bold text-[11px]">${vCuota.toLocaleString("es-AR")}/mes</span>
                                                    <span className="text-[8px] opacity-80 block">Total: ${vTotal.toLocaleString("es-AR")} (F: {factor})</span>
                                                  </button>
                                                );
                                              })}
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    )}

                                    <button 
                                      type="button" 
                                      onClick={handleAgregarItemAlBorrador}
                                      className="w-full bg-yellow-500 hover:bg-yellow-400 text-black py-2.5 rounded font-black text-xs uppercase tracking-wider transition-all shadow-md active:scale-95 mt-2"
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
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                   <div className="space-y-3 bg-zinc-900/30 border border-zinc-850 p-4 rounded-xl shadow-inner">
                                     <div className="flex justify-between items-center border-b border-zinc-800 pb-2 mb-2">
                                       <h4 className="text-sm font-bold text-yellow-400 uppercase tracking-wider">Datos Personales</h4>
                                       {editingId !== req.id && (
                                         <button 
                                           onClick={() => startEditing(req)}
                                           className="text-[10px] bg-zinc-850 hover:bg-zinc-800 text-yellow-500 font-bold px-2 py-0.5 rounded transition-all border border-zinc-800"
                                         >
                                           ✏️ Editar
                                         </button>
                                       )}
                                     </div>

                                     {editingId === req.id ? (
                                       <div className="space-y-3 text-xs text-zinc-300">
                                         <div>
                                           <label className="block text-[10px] text-zinc-500 font-bold uppercase mb-1">Nombre Completo</label>
                                           <input type="text" value={editFields.nombreCompleto} onChange={e => setEditFields({...editFields, nombreCompleto: e.target.value})} className="w-full bg-zinc-950 border border-zinc-800 p-2 rounded text-white outline-none focus:border-yellow-500" />
                                         </div>
                                         <div className="grid grid-cols-2 gap-2">
                                           <div>
                                             <label className="block text-[10px] text-zinc-500 font-bold uppercase mb-1">DNI</label>
                                             <input type="text" value={editFields.numeroDni} onChange={e => setEditFields({...editFields, numeroDni: e.target.value})} className="w-full bg-zinc-950 border border-zinc-800 p-2 rounded text-white outline-none focus:border-yellow-500" />
                                           </div>
                                           <div>
                                             <label className="block text-[10px] text-zinc-500 font-bold uppercase mb-1">CUIL</label>
                                             <input type="text" value={editFields.cuil} onChange={e => handleEditCuilChange(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 p-2 rounded text-white outline-none focus:border-yellow-500 font-mono" />
                                           </div>
                                         </div>
                                         <div>
                                           <label className="block text-[10px] text-zinc-500 font-bold uppercase mb-1">Email</label>
                                           <input type="email" value={editFields.email} onChange={e => setEditFields({...editFields, email: e.target.value})} className="w-full bg-zinc-950 border border-zinc-800 p-2 rounded text-white outline-none focus:border-yellow-500" />
                                         </div>
                                         <div>
                                           <label className="block text-[10px] text-zinc-500 font-bold uppercase mb-1">Teléfono (WhatsApp)</label>
                                           <input type="text" value={editFields.telefono} onChange={e => setEditFields({...editFields, telefono: e.target.value})} className="w-full bg-zinc-950 border border-zinc-800 p-2 rounded text-white outline-none focus:border-yellow-500" />
                                         </div>
                                         <div>
                                           <label className="block text-[10px] text-zinc-500 font-bold uppercase mb-1">Dirección y Localidad</label>
                                           <input type="text" value={editFields.direccion} onChange={e => setEditFields({...editFields, direccion: e.target.value})} className="w-full bg-zinc-950 border border-zinc-800 p-2 rounded text-white outline-none focus:border-yellow-500" />
                                         </div>
                                         <div className="flex gap-2 pt-2">
                                           <button onClick={() => handleGuardarDatosEditados(req)} className="flex-1 bg-green-600 hover:bg-green-500 text-white font-bold py-2 rounded text-xs transition-all uppercase tracking-wider">💾 Guardar</button>
                                           <button onClick={() => setEditingId(null)} className="bg-transparent border border-zinc-700 hover:text-white text-zinc-400 font-bold py-2 px-4 rounded text-xs transition-all">✕ Cancelar</button>
                                         </div>
                                       </div>
                                     ) : (
                                       <div className="space-y-2 text-sm text-zinc-400">
                                         <p className="text-sm text-zinc-300"><strong className="text-zinc-500">DNI:</strong> {req.numeroDni || req.dni || "S/D"}</p>
                                         {req.cuil && <p className="text-sm text-zinc-300"><strong className="text-zinc-500">CUIL:</strong> {req.cuil}</p>}
                                         <p className="text-sm text-zinc-300"><strong className="text-zinc-500">Fecha Nacimiento:</strong> {req.fechaNacimiento || "S/D"}</p>
                                         <p className="text-sm text-zinc-300"><strong className="text-zinc-500">Ocupación:</strong> {req.ocupacion || "S/D"}</p>
                                         <p className="text-sm text-zinc-300"><strong className="text-zinc-500">Dirección y Localidad:</strong> {req.direccion || "S/D"}</p>
                                       </div>
                                     )}
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
                                   <div className="space-y-3">
                                     <BcraScoringPanel cuit={req.cuil || req.numeroDni || req.dni || ""} />
                                     <h4 className="text-sm font-bold text-yellow-400 uppercase tracking-wider">Consultas Scoring Crediticio</h4>
                                     <div className="bg-zinc-900 border border-zinc-850 p-4 rounded-xl space-y-3 shadow-inner">
                                       <p className="text-[11px] text-zinc-400">Acciones rápidas para investigar comportamiento financiero:</p>
                                       <div className="grid grid-cols-1 gap-2">
                                         <button
                                           onClick={() => {
                                             const valToCopy = (req.cuil || req.numeroDni || req.dni || "").replace(/\D/g, "");
                                             if (valToCopy) {
                                               navigator.clipboard.writeText(valToCopy);
                                               alert(`CUIL/DNI ${valToCopy} copiado al portapapeles.`);
                                             }
                                             window.open("https://www.bcra.gob.ar/BCRAyVos/Situacion_Crediticia.asp", "_blank");
                                          }}
                                           className="bg-zinc-950 hover:bg-zinc-900 text-zinc-300 p-2.5 rounded text-xs font-bold text-left border border-zinc-800 transition-all flex items-center justify-between"
                                         >
                                           <span>🏦 Central de Deudores BCRA</span>
                                           <span className="text-[9px] text-zinc-500 font-mono">Pegar (Ctrl+V)</span>
                                         </button>
                                         <button
                                            onClick={() => {
                                              const dniToCopy = (req.numeroDni || req.dni || req.cuil || "").replace(/\D/g, "");
                                              const cleanDni = dniToCopy.length > 8 ? dniToCopy.substring(2, 10) : dniToCopy;
                                              if (cleanDni) {
                                                navigator.clipboard.writeText(cleanDni);
                                                alert(`DNI ${cleanDni} copiado al portapapeles.`);
                                              }
                                              window.open("https://www.padron.gob.ar/", "_blank");
                                            }}
                                            className="bg-zinc-950 hover:bg-zinc-900 text-zinc-300 p-2.5 rounded text-xs font-bold text-left border border-zinc-800 transition-all flex items-center justify-between"
                                          >
                                            <span>🗳️ Padrón Electoral CNE</span>
                                            <span className="text-[9px] text-zinc-500 font-mono">Pegar (Ctrl+V)</span>
                                          </button>
                                         {(req.cuil || "").replace(/\D/g, "") && (
                                           <a
                                             href={`https://www.cuitonline.com/detalle/${(req.cuil || "").replace(/\D/g, "")}/cuit-online.html`}
                                             target="_blank"
                                             rel="noopener noreferrer"
                                             className="bg-zinc-950 hover:bg-zinc-900 text-zinc-300 p-2.5 rounded text-xs font-bold text-left border border-zinc-800 transition-all flex items-center justify-between"
                                           >
                                             <span>📄 CUIT Online</span>
                                             <span className="text-[10px] text-yellow-500 font-black">→</span>
                                           </a>
                                         )}
                                         <a
                                           href={`https://www.google.com/search?q=${(req.cuil || req.numeroDni || req.dni || "").replace(/\D/g, "")}`}
                                           target="_blank"
                                           rel="noopener noreferrer"
                                           className="bg-zinc-950 hover:bg-zinc-900 text-zinc-300 p-2.5 rounded text-xs font-bold text-left border border-zinc-800 transition-all flex items-center justify-between"
                                         >
                                           <span>🌐 Buscar en Google</span>
                                           <span className="text-[10px] text-zinc-500">→</span>
                                         </a>
                                         {(req.cuil || "").replace(/\D/g, "") && (
                                           <a
                                             href={`https://www.dateas.com/es/consulta_cuit_cuil?cuit=${(req.cuil || "").replace(/\D/g, "")}`}
                                             target="_blank"
                                             rel="noopener noreferrer"
                                             className="bg-zinc-950 hover:bg-zinc-900 text-zinc-300 p-2.5 rounded text-xs font-bold text-left border border-zinc-800 transition-all flex items-center justify-between"
                                           >
                                             <span>📊 Consultar Dateas</span>
                                             <span className="text-[10px] text-zinc-500">→</span>
                                           </a>
                                         )}
                                       </div>
                                     </div>
                                   </div>
                                 </div>

                                <div className="border-t border-zinc-900 pt-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                  <div className="flex flex-col gap-2 bg-zinc-900 border border-zinc-850 p-4 rounded-xl shadow-inner mt-4 w-full md:w-auto min-w-[280px]">
                                    <span className="text-[10px] text-zinc-500 font-bold uppercase border-b border-zinc-800 pb-1 mb-1">Legajo de Documentos</span>
                                    {req.dniFrenteURL && req.dniFrenteURL !== "Pendiente envío WhatsApp" ? (
                                      <a href={req.dniFrenteURL} target="_blank" rel="noopener noreferrer" className="text-yellow-400 hover:text-yellow-300 font-bold underline text-xs flex items-center gap-1.5 py-0.5">
                                        📷 DNI Frente
                                      </a>
                                    ) : null}
                                    {req.dniDorsoURL && req.dniDorsoURL !== "Pendiente envío WhatsApp" ? (
                                      <a href={req.dniDorsoURL} target="_blank" rel="noopener noreferrer" className="text-yellow-400 hover:text-yellow-300 font-bold underline text-xs flex items-center gap-1.5 py-0.5">
                                        📷 DNI Dorso
                                      </a>
                                    ) : null}
                                    {req.comprobanteURL && req.comprobanteURL !== "Pendiente envío WhatsApp" && (
                                      <a href={req.comprobanteURL} target="_blank" rel="noopener noreferrer" className="text-yellow-400 hover:text-yellow-300 font-bold underline text-xs flex items-center gap-1.5 py-0.5">
                                        📄 Comprobante de Ingresos
                                      </a>
                                    )}
                                    {req.comprobanteDomicilioURL && req.comprobanteDomicilioURL !== "Pendiente envío WhatsApp" && (
                                      <a href={req.comprobanteDomicilioURL} target="_blank" rel="noopener noreferrer" className="text-yellow-400 hover:text-yellow-300 font-bold underline text-xs flex items-center gap-1.5 py-0.5">
                                        📄 Comprobante de Domicilio
                                      </a>
                                    )}
                                    {(!req.dniFrenteURL && !req.dniDorsoURL && !req.comprobanteURL && !req.comprobanteDomicilioURL) || 
                                     (req.dniFrenteURL === "Pendiente envío WhatsApp" && req.dniDorsoURL === "Pendiente envío WhatsApp" && req.comprobanteURL === "Pendiente envío WhatsApp") ? (
                                      <span className="text-zinc-650 italic text-[10px]">Sin archivos (Pendiente WhatsApp)</span>
                                    ) : null}

                                    <div className="border-t border-zinc-800 pt-2.5 mt-1 space-y-1.5">
                                      <span className="text-[9px] text-zinc-500 font-black uppercase">Cargar Manualmente</span>
                                      <div className="flex flex-col gap-1.5">
                                        <label className="flex items-center justify-between bg-zinc-950 border border-zinc-800 hover:border-yellow-500/50 p-1.5 rounded text-[9px] font-bold text-zinc-400 cursor-pointer transition-colors">
                                          <span>🏠 Domicilio (Servicio)</span>
                                          <input 
                                            type="file" 
                                            accept="image/*,application/pdf" 
                                            onChange={async (e) => {
                                              if (e.target.files && e.target.files[0]) {
                                                await handleSubirDocumentoManual(req, e.target.files[0], "domicilio");
                                              }
                                            }} 
                                            className="hidden" 
                                          />
                                        </label>
                                        <label className="flex items-center justify-between bg-zinc-950 border border-zinc-800 hover:border-yellow-500/50 p-1.5 rounded text-[9px] font-bold text-zinc-400 cursor-pointer transition-colors">
                                          <span>💵 Ingresos (Recibo)</span>
                                          <input 
                                            type="file" 
                                            accept="image/*,application/pdf" 
                                            onChange={async (e) => {
                                              if (e.target.files && e.target.files[0]) {
                                                await handleSubirDocumentoManual(req, e.target.files[0], "ingresos");
                                              }
                                            }} 
                                            className="hidden" 
                                          />
                                        </label>
                                      </div>
                                    </div>
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
                      <div key={group.key} className={`bg-zinc-950 border ${isExpanded ? 'border-yellow-500/50 shadow-[0_0_20px_rgba(234,179,8,0.15)]' : 'border-zinc-800 hover:border-yellow-500/40'} rounded-xl transition-all overflow-hidden`}>
                        {/* CARD HEADER */}
                        <div 
                          onClick={() => setExpandedId(isExpanded ? null : group.key)}
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
                            <p className="text-yellow-400 font-bold flex flex-wrap items-center gap-2">
                              {group.items.map((x: any) => x.productoDeseado || x.producto || "Apertura").join(" + ")}
                              <span className="text-xs font-normal text-zinc-500 px-2 py-0.5 bg-zinc-900 rounded">
                                {req.fechaCreacion ? new Date(req.fechaCreacion.seconds * 1000).toLocaleDateString() : ''}
                              </span>
                              {group.items.length > 1 && (
                                <span className="text-[9px] bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 px-2 py-0.5 rounded font-black uppercase tracking-wider">
                                  📦 {group.items.length} Productos
                                </span>
                              )}
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
                            {group.items.length > 1 && (
                              <div className="flex flex-wrap gap-2 border-b border-zinc-800 pb-4 mb-4">
                                <span className="text-zinc-500 text-[10px] font-black uppercase self-center mr-2">Ver Producto:</span>
                                {group.items.map((item: any) => {
                                   const isActive = item.id === req.id;
                                   return (
                                     <button
                                       key={item.id}
                                       type="button"
                                       onClick={(e) => {
                                         e.stopPropagation();
                                         setActiveProductSolId(prev => ({ ...prev, [group.key]: item.id }));
                                       }}
                                       className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${isActive ? 'bg-yellow-500 text-black shadow-lg shadow-yellow-500/20' : 'bg-zinc-950 text-zinc-400 border border-zinc-850 hover:bg-zinc-900'}`}
                                     >
                                       🛍️ {item.productoDeseado || item.producto || "Solicitud"} ({item.estado})
                                     </button>
                                   );
                                })}
                              </div>
                            )}
                            {req.estado === "RECHAZADO" && (
                              <div className="mb-6 bg-red-950/30 border border-red-500/30 p-4 rounded-xl text-red-400 text-xs flex flex-col gap-1 w-full">
                                <span className="font-black text-red-500 uppercase tracking-widest text-[10px]">❌ Solicitud de Producto Rechazada</span>
                                <p className="font-mono text-zinc-300">{req.mensajeAdmin || "No se especificó un motivo."}</p>
                              </div>
                            )}
                            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                              
                              {/* COLUMNA 1 */}
                              <div className="flex flex-col gap-6">
                                 <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-xl shadow-inner space-y-4">
                                   <div className="flex justify-between items-center border-b border-zinc-800 pb-2 mb-1">
                                     <h3 className="text-sm font-black text-yellow-400 uppercase tracking-widest">Perfil Crediticio</h3>
                                     {editingId !== req.id && (
                                       <button 
                                         onClick={() => startEditing(req)}
                                         className="text-xs bg-zinc-850 hover:bg-zinc-800 text-yellow-500 font-bold px-2 py-1 rounded transition-all border border-zinc-800"
                                       >
                                         ✏️ Editar Datos
                                       </button>
                                     )}
                                   </div>

                                   {editingId === req.id ? (
                                     <div className="space-y-3 text-xs text-zinc-300">
                                       <div>
                                         <label className="block text-[10px] text-zinc-500 font-bold uppercase mb-1">Nombre Completo</label>
                                         <input type="text" value={editFields.nombreCompleto} onChange={e => setEditFields({...editFields, nombreCompleto: e.target.value})} className="w-full bg-zinc-950 border border-zinc-800 p-2 rounded text-white outline-none focus:border-yellow-500" />
                                       </div>
                                       <div className="grid grid-cols-2 gap-2">
                                         <div>
                                           <label className="block text-[10px] text-zinc-500 font-bold uppercase mb-1">DNI</label>
                                           <input type="text" value={editFields.numeroDni} onChange={e => setEditFields({...editFields, numeroDni: e.target.value})} className="w-full bg-zinc-950 border border-zinc-800 p-2 rounded text-white outline-none focus:border-yellow-500" />
                                         </div>
                                         <div>
                                           <label className="block text-[10px] text-zinc-500 font-bold uppercase mb-1">CUIL</label>
                                           <input type="text" value={editFields.cuil} onChange={e => handleEditCuilChange(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 p-2 rounded text-white outline-none focus:border-yellow-500 font-mono" />
                                         </div>
                                       </div>
                                       <div>
                                         <label className="block text-[10px] text-zinc-500 font-bold uppercase mb-1">Email</label>
                                         <input type="email" value={editFields.email} onChange={e => setEditFields({...editFields, email: e.target.value})} className="w-full bg-zinc-950 border border-zinc-800 p-2 rounded text-white outline-none focus:border-yellow-500" />
                                       </div>
                                       <div>
                                         <label className="block text-[10px] text-zinc-500 font-bold uppercase mb-1">Teléfono</label>
                                         <input type="text" value={editFields.telefono} onChange={e => setEditFields({...editFields, telefono: e.target.value})} className="w-full bg-zinc-950 border border-zinc-800 p-2 rounded text-white outline-none focus:border-yellow-500" />
                                       </div>
                                       <div className="grid grid-cols-2 gap-2">
                                         <div>
                                           <label className="block text-[10px] text-zinc-500 font-bold uppercase mb-1">Dirección</label>
                                           <input type="text" value={editFields.direccion} onChange={e => setEditFields({...editFields, direccion: e.target.value})} className="w-full bg-zinc-950 border border-zinc-800 p-2 rounded text-white outline-none focus:border-yellow-500" />
                                         </div>
                                         <div>
                                           <label className="block text-[10px] text-zinc-500 font-bold uppercase mb-1">Localidad</label>
                                           <input type="text" value={editFields.localidad} onChange={e => setEditFields({...editFields, localidad: e.target.value})} className="w-full bg-zinc-950 border border-zinc-800 p-2 rounded text-white outline-none focus:border-yellow-500" />
                                         </div>
                                       </div>
                                       <div className="flex gap-2 pt-2">
                                         <button onClick={() => handleGuardarDatosEditados(req)} className="flex-1 bg-green-600 hover:bg-green-500 text-white font-bold py-2 rounded text-xs transition-all uppercase tracking-wider">💾 Guardar</button>
                                         <button onClick={() => setEditingId(null)} className="bg-transparent border border-zinc-700 hover:text-white text-zinc-400 font-bold py-2 px-4 rounded text-xs transition-all">✕ Cancelar</button>
                                       </div>
                                     </div>
                                   ) : (
                                     <div className="space-y-2 text-sm text-zinc-400">
                                       <p><strong className="text-white">DNI:</strong> {req.datosPersonales?.numeroDni || "S/D"}</p>
                                       {req.datosPersonales?.cuil && <p><strong className="text-white">CUIL:</strong> {req.datosPersonales.cuil}</p>}
                                       <p><strong className="text-white">Email:</strong> {req.clienteEmail}</p>
                                       <p><strong className="text-white">Teléfono:</strong> {req.datosPersonales?.telefono}</p>
                                       <p><strong className="text-white">Domicilio:</strong> {req.datosPersonales?.direccion}, {req.datosPersonales?.localidad}</p>
                                       <p><strong className="text-white">TNA Pactada:</strong> {req.tasaInteresTna ? `${req.tasaInteresTna}%` : "No especificada"}</p>
                                       <p><strong className="text-white">Mora Pactada:</strong> {req.tasaMora ? `${req.tasaMora}% diaria` : "No especificada"}</p>
                                     </div>
                                   )}
                                 </div>

                                 <BcraScoringPanel cuit={req.datosPersonales?.cuil || req.datosPersonales?.numeroDni || ""} />

                                 <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-xl shadow-inner space-y-3">
                                   <h3 className="text-xs font-black text-yellow-500 uppercase tracking-widest border-b border-zinc-800 pb-2">Consultas Crediticias</h3>
                                   <div className="grid grid-cols-1 gap-2">
                                     <button
                                       onClick={() => {
                                         const valToCopy = (req.datosPersonales?.cuil || req.datosPersonales?.numeroDni || "").replace(/\D/g, "");
                                         if (valToCopy) {
                                           navigator.clipboard.writeText(valToCopy);
                                           alert(`CUIL/DNI ${valToCopy} copiado al portapapeles.`);
                                         }
                                         window.open("https://www.bcra.gob.ar/BCRAyVos/Situacion_Crediticia.asp", "_blank");
                                       }}
                                       className="bg-zinc-950 hover:bg-zinc-900 text-zinc-300 p-2.5 rounded text-xs font-bold text-left border border-zinc-850 transition-all flex items-center justify-between"
                                     >
                                       <span>🏦 Central BCRA</span>
                                       <span className="text-[9px] text-zinc-500 font-mono">Pegar (Ctrl+V)</span>
                                     </button>
                                     <button
                                       onClick={() => {
                                         const dniToCopy = (req.datosPersonales?.numeroDni || req.datosPersonales?.cuil || "").replace(/\D/g, "");
                                         const cleanDni = dniToCopy.length > 8 ? dniToCopy.substring(2, 10) : dniToCopy;
                                         if (cleanDni) {
                                           navigator.clipboard.writeText(cleanDni);
                                           alert(`DNI ${cleanDni} copiado al portapapeles.`);
                                         }
                                         window.open("https://www.padron.gob.ar/", "_blank");
                                       }}
                                       className="bg-zinc-950 hover:bg-zinc-900 text-zinc-300 p-2.5 rounded text-xs font-bold text-left border border-zinc-850 transition-all flex items-center justify-between"
                                     >
                                       <span>🗳️ Padrón Electoral CNE</span>
                                       <span className="text-[9px] text-zinc-500 font-mono">Pegar (Ctrl+V)</span>
                                     </button>
                                     {(req.datosPersonales?.cuil || "").replace(/\D/g, "") && (
                                       <a
                                         href={`https://www.cuitonline.com/detalle/${(req.datosPersonales?.cuil || "").replace(/\D/g, "")}/cuit-online.html`}
                                         target="_blank"
                                         rel="noopener noreferrer"
                                         className="bg-zinc-950 hover:bg-zinc-900 text-zinc-300 p-2.5 rounded text-xs font-bold text-left border border-zinc-850 transition-all flex items-center justify-between"
                                       >
                                         <span>📄 CUIT Online</span>
                                         <span className="text-[10px] text-yellow-500">→</span>
                                       </a>
                                     )}
                                     <a
                                       href={`https://www.google.com/search?q=${(req.datosPersonales?.cuil || req.datosPersonales?.numeroDni || "").replace(/\D/g, "")}`}
                                       target="_blank"
                                       rel="noopener noreferrer"
                                       className="bg-zinc-950 hover:bg-zinc-900 text-zinc-300 p-2.5 rounded text-xs font-bold text-left border border-zinc-850 transition-all flex items-center justify-between"
                                     >
                                       <span>🌐 Buscar Google</span>
                                       <span className="text-[10px] text-zinc-500">→</span>
                                     </a>
                                     {(req.datosPersonales?.cuil || "").replace(/\D/g, "") && (
                                       <a
                                         href={`https://www.dateas.com/es/consulta_cuit_cuil?cuit=${(req.datosPersonales?.cuil || "").replace(/\D/g, "")}`}
                                         target="_blank"
                                         rel="noopener noreferrer"
                                         className="bg-zinc-950 hover:bg-zinc-900 text-zinc-300 p-2.5 rounded text-xs font-bold text-left border border-zinc-850 transition-all flex items-center justify-between"
                                       >
                                         <span>📊 Consultar Dateas</span>
                                         <span className="text-[10px] text-zinc-500">→</span>
                                       </a>
                                     )}
                                   </div>
                                 </div>

                                 <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-xl shadow-inner space-y-4">
                                   <h3 className="text-sm font-black text-yellow-400 mb-3 uppercase tracking-widest border-b border-zinc-800 pb-2">Documentos Adjuntos</h3>
                                   <div className="grid grid-cols-2 gap-3">
                                     {req.documentos?.dniFrente ? (
                                       <a href={req.documentos.dniFrente} target="_blank" rel="noreferrer" className="flex items-center justify-center bg-zinc-950 border border-zinc-800 hover:border-yellow-500 text-yellow-400 p-2 rounded-lg text-xs font-bold transition-colors">📷 DNI Frente</a>
                                     ) : <span className="text-[10px] text-zinc-600 italic text-center p-2 border border-zinc-850 rounded">Sin DNI Frente</span>}
                                     {req.documentos?.dniDorso ? (
                                       <a href={req.documentos.dniDorso} target="_blank" rel="noreferrer" className="flex items-center justify-center bg-zinc-950 border border-zinc-800 hover:border-yellow-500 text-yellow-400 p-2 rounded-lg text-xs font-bold transition-colors">📷 DNI Dorso</a>
                                     ) : <span className="text-[10px] text-zinc-600 italic text-center p-2 border border-zinc-850 rounded">Sin DNI Dorso</span>}
                                     {req.documentos?.reciboSueldo ? (
                                       <a href={req.documentos.reciboSueldo} target="_blank" rel="noreferrer" className="flex items-center justify-center bg-zinc-950 border border-zinc-800 hover:border-yellow-500 text-yellow-400 p-2 rounded-lg text-xs font-bold transition-colors">📄 Recibo Sueldo</a>
                                     ) : <span className="text-[10px] text-zinc-600 italic text-center p-2 border border-zinc-850 rounded">Sin Recibo</span>}
                                     {req.documentos?.servicio ? (
                                       <a href={req.documentos.servicio} target="_blank" rel="noreferrer" className="flex items-center justify-center bg-zinc-950 border border-zinc-800 hover:border-yellow-500 text-yellow-400 p-2 rounded-lg text-xs font-bold transition-colors">📄 Impuesto/Serv.</a>
                                     ) : <span className="text-[10px] text-zinc-600 italic text-center p-2 border border-zinc-850 rounded">Sin Impuesto</span>}
                                   </div>
                                   
                                   <div className="border-t border-zinc-800 pt-3 space-y-3">
                                     <p className="text-[10px] text-zinc-500 font-bold uppercase">Subir Documentación (Manual)</p>
                                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                       <label className="flex items-center justify-between bg-zinc-950 border border-zinc-800 hover:border-yellow-500/50 p-2 rounded-lg text-[10px] font-bold text-zinc-400 cursor-pointer transition-colors">
                                         <span>🏠 Cargar Domicilio (Servicio)</span>
                                         <input 
                                           type="file" 
                                           accept="image/*,application/pdf" 
                                           onChange={async (e) => {
                                             if (e.target.files && e.target.files[0]) {
                                               await handleSubirDocumentoManual(req, e.target.files[0], "domicilio");
                                             }
                                           }} 
                                           className="hidden" 
                                         />
                                       </label>
                                       <label className="flex items-center justify-between bg-zinc-950 border border-zinc-800 hover:border-yellow-500/50 p-2 rounded-lg text-[10px] font-bold text-zinc-400 cursor-pointer transition-colors">
                                         <span>💵 Cargar Ingresos (Recibo)</span>
                                         <input 
                                           type="file" 
                                           accept="image/*,application/pdf" 
                                           onChange={async (e) => {
                                             if (e.target.files && e.target.files[0]) {
                                               await handleSubirDocumentoManual(req, e.target.files[0], "ingresos");
                                             }
                                           }} 
                                           className="hidden" 
                                         />
                                       </label>
                                     </div>
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
              groupSolicitudes(solicitudes.filter(sol => {
                const searchStr = `${sol.datosPersonales?.nombreCompleto || ''} ${sol.datosPersonales?.numeroDni || ''} ${sol.clienteEmail || ''} ${sol.productoDeseado || ''}`.toLowerCase();
                if (searchTerm && !searchStr.includes(searchTerm.toLowerCase())) return false;
                
                const estadoUpper = (sol.estado || "").toUpperCase();
                if (activeTab === 'logistica') return estadoUpper === 'APROBADO' && sol.estadoEntrega !== 'ENTREGADO';
                if (activeTab === 'cobranzas') return estadoUpper === 'APROBADO' && sol.estadoEntrega === 'ENTREGADO' && sol.planPagos && sol.planPagos.some(p => p.estado === 'EN_REVISION' || p.estado === 'PENDIENTE');
                return true; // Historial
              })).map((group: any) => {
                const isExpanded = expandedId === group.key;
                const activeId = activeProductSolId[group.key] || group.items[0].id;
                const sol = group.items.find((x: any) => x.id === activeId) || group.items[0];
                
                const currentEstado = (nuevosEstados[sol.id] || sol.estado || "").toUpperCase();
                const currentMensaje = nuevosMensajes[sol.id] !== undefined ? nuevosMensajes[sol.id] : (sol.mensajeAdmin || "");
                
                return (
                  <div key={group.key} className={`bg-zinc-950 border ${isExpanded ? 'border-yellow-500/50 shadow-[0_0_20px_rgba(234,179,8,0.15)]' : 'border-zinc-800 hover:border-yellow-500/40'} rounded-xl transition-all overflow-hidden`}>
                    
                    {/* CARD HEADER (COMPACT VIEW) */}
                    <div 
                      onClick={() => setExpandedId(isExpanded ? null : group.key)}
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
                        <p className="text-yellow-400 font-bold flex flex-wrap items-center gap-2">
                          {group.items.map((x: any) => x.productoDeseado || x.producto || "Apertura").join(" + ")}
                          <span className="text-xs font-normal text-zinc-500 px-2 py-0.5 bg-zinc-900 rounded">
                            {sol.fechaCreacion ? new Date(sol.fechaCreacion.seconds * 1000).toLocaleDateString() : ''}
                          </span>
                          {group.items.length > 1 && (
                            <span className="text-[9px] bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 px-2 py-0.5 rounded font-black uppercase tracking-wider">
                              📦 {group.items.length} Productos
                            </span>
                          )}
                        </p>
                      </div>

                      <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
                        <div className="flex flex-col items-end">
                          <span className={`px-3 py-1 rounded-full text-xs font-black tracking-widest uppercase border ${
                              currentEstado === "PENDIENTE" ? "bg-blue-500/20 text-blue-400 border-blue-500/50" :
                              currentEstado === "PENDIENTE_FIRMA" ? "bg-cyan-500/20 text-cyan-400 border-cyan-500/50" :
                              currentEstado === "APROBADO" ? "bg-green-500/20 text-green-400 border-green-500/50" :
                              currentEstado === "RECHAZADO" ? "bg-red-500/20 text-red-400 border-red-500/50" :
                              "bg-orange-500/20 text-orange-400 border-orange-500/50"
                            }`}>
                            {currentEstado === "PENDIENTE_FIRMA" ? "Pendiente de Firma" : currentEstado}
                          </span>
                          {currentEstado === 'APROBADO' && (
                             <span className="text-[10px] text-zinc-500 mt-1">
                               Logística: {sol.estadoEntrega === 'ENTREGADO' ? '✅ Entregado' : '⏳ Pendiente'}
                             </span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={(e) => handleEliminarPedido(e, sol)}
                          title="Eliminar pedido / solicitud"
                          className="text-red-500/80 hover:text-red-400 hover:bg-red-500/10 p-2 rounded-full transition-all border border-transparent hover:border-red-500/30 mr-1"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <div className="text-zinc-500 bg-zinc-900 p-2 rounded-full">
                          {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                        </div>
                      </div>
                    </div>

                    {/* CARD BODY (EXPANDED VIEW) */}
                    {isExpanded && (
                      <div className="p-4 md:p-6 border-t border-zinc-800 bg-zinc-900/40">
                        {group.items.length > 1 && (
                          <div className="flex flex-wrap gap-2 border-b border-zinc-800 pb-4 mb-4">
                            <span className="text-zinc-500 text-[10px] font-black uppercase self-center mr-2">Ver Producto:</span>
                            {group.items.map((item: any) => {
                               const isActive = item.id === sol.id;
                               return (
                                 <button
                                   key={item.id}
                                   type="button"
                                   onClick={(e) => {
                                     e.stopPropagation();
                                     setActiveProductSolId(prev => ({ ...prev, [group.key]: item.id }));
                                   }}
                                   className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${isActive ? 'bg-yellow-500 text-black shadow-lg shadow-yellow-500/20' : 'bg-zinc-950 text-zinc-400 border border-zinc-850 hover:bg-zinc-900'}`}
                                 >
                                   🛍️ {item.productoDeseado || item.producto || "Solicitud"} ({item.estado})
                                 </button>
                               );
                            })}
                          </div>
                        )}
                        
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
                             {currentEstado === "APROBADO" && (
                               <div className="bg-blue-950/20 border-2 border-blue-500/30 p-5 rounded-xl shadow-2xl shadow-black/60 relative overflow-hidden">
                                 <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl -mr-10 -mt-10" />
                                 <div className="flex items-center justify-between mb-4 border-b border-blue-900/40 pb-3">
                                    <h3 className="text-sm font-black text-blue-400 uppercase tracking-widest flex items-center gap-2"><Truck className="w-4 h-4"/> Logística y Entrega</h3>
                                    <button
                                      type="button"
                                      onClick={(e) => handleEliminarPedido(e, sol)}
                                      className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" /> Eliminar Pedido
                                    </button>
                                  </div>
                                 
                                 <div className="space-y-4 relative z-10">
                                   {/* SECCIÓN 1: ASIGNACIÓN DE STOCK Y RUTEO */}
                                   <div className="bg-zinc-950 p-4 border border-zinc-850 rounded-xl space-y-3 relative z-10">
                                     <h4 className="text-xs font-black text-blue-400 uppercase tracking-wider flex items-center gap-1.5 border-b border-zinc-900 pb-2">
                                       📦 Asignación de Stock y Reserva
                                     </h4>

                                     {sol.vinculoUnidadId ? (
                                       // YA TIENE RESERVA
                                       <div className="space-y-3">
                                         {(() => {
                                           // Find unit in selected product stock or general catalog
                                           const unit = selectedProductStock
                                             ? (selectedProductStock.stock || []).find((u: any) => u.id === sol.vinculoUnidadId)
                                             : null;
                                           const origen = unit?.localidad || "Depósito Central";
                                           const destino = sol.sucursalDestino || "Lincoln";
                                           const requiereTransito = origen !== destino;

                                           return (
                                             <div className="space-y-3">
                                               <div className="bg-blue-950/30 border border-blue-500/30 p-3 rounded-lg text-xs space-y-1.5">
                                                 <p className="text-zinc-300 font-bold flex items-center gap-1.5 text-blue-300">
                                                   📌 ¡Stock Reservado con éxito!
                                                 </p>
                                                 <p className="text-zinc-400">
                                                   <strong className="text-zinc-500">Producto:</strong> {sol.productoDeseado}
                                                 </p>
                                                 <p className="text-zinc-400 font-mono">
                                                   <strong className="text-zinc-500 font-sans">IMEI/Serie:</strong> {sol.numeroSerie || "Sin serie registrada"}
                                                 </p>
                                                 <p className="text-zinc-400">
                                                   <strong className="text-zinc-500">Origen (Stock):</strong> <span className="bg-zinc-900 text-zinc-300 px-2 py-0.5 rounded text-[10px] font-bold border border-zinc-800">{origen}</span>
                                                 </p>
                                                 <p className="text-zinc-400">
                                                   <strong className="text-zinc-500">Destino (Entrega):</strong> <span className="bg-zinc-900 text-zinc-300 px-2 py-0.5 rounded text-[10px] font-bold border border-zinc-800">{destino}</span>
                                                 </p>
                                                 <p className="text-zinc-400">
                                                   <strong className="text-zinc-500">Estado de Ruteo:</strong> <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${requiereTransito ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" : "bg-green-500/20 text-green-400 border border-green-500/30"}`}>{requiereTransito ? "Tránsito Requerido" : "Listo para entrega"}</span>
                                                 </p>
                                               </div>

                                               {/* ETAPA 2: CONFECCIÓN DE REMITO Y SEGUIMIENTO DE DESPACHO LOCAL */}
                                               <div className="bg-zinc-900/90 p-3.5 rounded-xl border border-amber-500/30 space-y-3 text-[11px] mb-3">
                                                 <div className="flex justify-between items-center border-b border-zinc-800 pb-2">
                                                   <h5 className="text-[10px] font-black text-amber-400 uppercase tracking-widest flex items-center gap-1.5">
                                                     👤 ETAPA 2: Despacho por Remito al Destinatario (Punto de Venta ➔ Afiliado / Cliente)
                                                   </h5>
                                                   {sol.remitoDespachoEstado && (
                                                     <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase border ${
                                                       sol.remitoDespachoEstado === "ENTREGADO_CONFORME" ? "bg-green-500/20 text-green-400 border-green-500/30" :
                                                       sol.remitoDespachoEstado === "EN_CAMINO" ? "bg-blue-500/20 text-blue-400 border-blue-500/30" :
                                                       "bg-amber-500/20 text-amber-400 border-amber-500/30"
                                                     }`}>
                                                       {sol.remitoDespachoEstado === "ENTREGADO_CONFORME" ? "✅ Entregado" : sol.remitoDespachoEstado === "EN_CAMINO" ? "🚚 En Camino" : "📜 Remito Emitido"}
                                                     </span>
                                                   )}
                                                 </div>

                                                 {/* Si ya hay un seguimiento de despacho local emitido */}
                                                 {(sol.remitoDespachoNro || sol.remitoDespachoTransporte || sol.remitoDespachoGuia) && (
                                                   <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-800 space-y-1.5 text-xs">
                                                     <p className="text-amber-400 font-bold text-[10px] uppercase tracking-wider">
                                                       📌 Ficha de Seguimiento del Despacho Local
                                                     </p>
                                                     {sol.remitoDespachoNro && <p><strong className="text-zinc-500">Nº Remito:</strong> <span className="text-white font-mono font-bold">{sol.remitoDespachoNro}</span></p>}
                                                     {sol.remitoDespachoDestinatario && <p><strong className="text-zinc-500">Destinatario:</strong> <span className="text-zinc-200">{sol.remitoDespachoDestinatario} (DNI: {sol.remitoDespachoDoc})</span></p>}
                                                     {sol.remitoDespachoDireccion && <p><strong className="text-zinc-500">Dirección de Entrega:</strong> <span className="text-zinc-300">{sol.remitoDespachoDireccion}</span></p>}
                                                     {sol.remitoDespachoTransporte && <p><strong className="text-zinc-500">Flete / Transporte Local:</strong> <span className="text-blue-300 font-bold">{sol.remitoDespachoTransporte}</span></p>}
                                                     {sol.remitoDespachoGuia && <p><strong className="text-zinc-500">Guía / Tracking Interno:</strong> <span className="text-amber-300 font-mono">{sol.remitoDespachoGuia}</span></p>}
                                                     {sol.remitoDespachoCosto > 0 && <p><strong className="text-zinc-500">Costo Envío Local:</strong> <span className="text-green-400 font-bold">${sol.remitoDespachoCosto.toLocaleString("es-AR")}</span></p>}
                                                     {sol.remitoDespachoFecha && <p><strong className="text-zinc-500">Fecha de Salida:</strong> {new Date(sol.remitoDespachoFecha).toLocaleDateString("es-AR")}</p>}

                                                     <button
                                                       type="button"
                                                       onClick={() => {
                                                         setRemitoEditId(sol.id);
                                                         setRemitoTransporte(sol.remitoDespachoTransporte || "");
                                                         setRemitoGuiaLocal(sol.remitoDespachoGuia || "");
                                                         setRemitoCostoLocal(sol.remitoDespachoCosto ? String(sol.remitoDespachoCosto) : "");
                                                         setRemitoFechaSalida(sol.remitoDespachoFecha || "");
                                                         setRemitoEstadoEnvio(sol.remitoDespachoEstado || "REMITO_EMITIDO");
                                                       }}
                                                       className="text-[10px] text-amber-400 hover:text-amber-300 font-bold underline pt-1 block"
                                                     >
                                                       ✏️ Editar Seguimiento de Despacho Local
                                                     </button>
                                                   </div>
                                                 )}

                                                 {/* Formulario de Confección y Actualización de Despacho */}
                                                 <div className="space-y-2 pt-1 border-t border-zinc-800">
                                                   <p className="text-[9px] font-bold text-zinc-400 uppercase">1. Confeccionar Destinatario del Remito:</p>
                                                   <div>
                                                     <label className="block text-[9px] text-amber-400 font-bold uppercase mb-0.5">Nombre Destinatario (Auto-completado / Editable)</label>
                                                     <input 
                                                       type="text"
                                                       value={getDestinatarioNombre(sol)}
                                                       onChange={e => setRemitoNombreMap(prev => ({ ...prev, [sol.id]: e.target.value }))}
                                                       placeholder="Nombre del Destinatario"
                                                       className="w-full bg-zinc-950 border border-zinc-850 p-1.5 rounded text-[11px] text-white outline-none focus:border-amber-500 font-bold"
                                                     />
                                                   </div>
                                                   <div className="grid grid-cols-2 gap-2">
                                                     <div>
                                                       <label className="block text-[9px] text-amber-400 font-bold uppercase mb-0.5">DNI / CUIT</label>
                                                       <input 
                                                         type="text"
                                                         value={getDestinatarioDoc(sol)}
                                                         onChange={e => setRemitoDocMap(prev => ({ ...prev, [sol.id]: e.target.value }))}
                                                         placeholder="Documento / CUIT"
                                                         className="w-full bg-zinc-950 border border-zinc-850 p-1.5 rounded text-[11px] text-white outline-none focus:border-amber-500 font-mono"
                                                       />
                                                     </div>
                                                     <div>
                                                       <label className="block text-[9px] text-amber-400 font-bold uppercase mb-0.5">Teléfono</label>
                                                       <input 
                                                         type="text"
                                                         value={getDestinatarioTel(sol)}
                                                         onChange={e => setRemitoTelMap(prev => ({ ...prev, [sol.id]: e.target.value }))}
                                                         placeholder="Teléfono"
                                                         className="w-full bg-zinc-950 border border-zinc-850 p-1.5 rounded text-[11px] text-white outline-none focus:border-amber-500"
                                                       />
                                                     </div>
                                                   </div>
                                                   <div>
                                                     <label className="block text-[9px] text-amber-400 font-bold uppercase mb-0.5">Dirección de Entrega / Sucursal</label>
                                                     <input 
                                                       type="text"
                                                       value={getDestinatarioDireccion(sol)}
                                                       onChange={e => setRemitoDireccionMap(prev => ({ ...prev, [sol.id]: e.target.value }))}
                                                       placeholder="Sucursal o domicilio del cliente/afiliado"
                                                       className="w-full bg-zinc-950 border border-zinc-850 p-1.5 rounded text-[11px] text-white outline-none focus:border-amber-500"
                                                     />
                                                   </div>

                                                   <p className="text-[9px] font-bold text-zinc-400 uppercase pt-2 border-t border-zinc-850">2. Datos del Transporte / Flete Local:</p>
                                                   <div>
                                                     <label className="block text-[8px] text-zinc-500 font-bold uppercase mb-0.5">Chofer / Comisionista / Flete Local</label>
                                                     <input 
                                                       type="text"
                                                       value={remitoEditId === sol.id ? remitoTransporte : ""}
                                                       onChange={e => { setRemitoEditId(sol.id); setRemitoTransporte(e.target.value); }}
                                                       placeholder="Ej: Flete Expreso Junín, Moto Mensajería, etc."
                                                       className="w-full bg-zinc-950 border border-zinc-850 p-1.5 rounded text-[11px] text-white outline-none focus:border-amber-500"
                                                     />
                                                   </div>
                                                   <div className="grid grid-cols-2 gap-2">
                                                     <div>
                                                       <label className="block text-[8px] text-zinc-500 font-bold uppercase mb-0.5">Costo Envío Local ($)</label>
                                                       <input 
                                                         type="number"
                                                         value={remitoEditId === sol.id ? remitoCostoLocal : ""}
                                                         onChange={e => { setRemitoEditId(sol.id); setRemitoCostoLocal(e.target.value); }}
                                                         placeholder="ARS"
                                                         className="w-full bg-zinc-950 border border-zinc-850 p-1.5 rounded text-[11px] text-white outline-none focus:border-amber-500 font-mono"
                                                       />
                                                     </div>
                                                     <div>
                                                       <label className="block text-[8px] text-zinc-500 font-bold uppercase mb-0.5">Guía / Tracking Interno</label>
                                                       <input 
                                                         type="text"
                                                         value={remitoEditId === sol.id ? remitoGuiaLocal : ""}
                                                         onChange={e => { setRemitoEditId(sol.id); setRemitoGuiaLocal(e.target.value); }}
                                                         placeholder="Ej: GUIA-94812"
                                                         className="w-full bg-zinc-950 border border-zinc-850 p-1.5 rounded text-[11px] text-white outline-none focus:border-amber-500 font-mono"
                                                       />
                                                     </div>
                                                   </div>
                                                    <div>
                                                      <label className="block text-[8px] text-zinc-500 font-bold uppercase mb-0.5">Estado del Despacho al Destinatario</label>
                                                      <select
                                                        value={remitoEditId === sol.id ? remitoEstadoEnvio : (sol.remitoDespachoEstado || "REMITO_EMITIDO")}
                                                        onChange={e => {
                                                          const val = e.target.value;
                                                          setRemitoEditId(sol.id);
                                                          setRemitoEstadoEnvio(val);
                                                          handleActualizarEstadoDespachoRemito(sol, val);
                                                        }}
                                                        className="w-full bg-zinc-950 border border-zinc-850 p-1.5 rounded text-[11px] text-amber-300 font-bold outline-none focus:border-amber-500 cursor-pointer"
                                                      >
                                                        <option value="REMITO_EMITIDO">📜 REMITO EMITIDO (EN PREPARACIÓN)</option>
                                                        <option value="EN_CAMINO">🚚 EN CAMINO AL AFILIADO / CLIENTE</option>
                                                        <option value="ENTREGADO_CONFORME">✅ ENTREGADO EN DESTINO (CONFORME)</option>
                                                      </select>
                                                    </div>

                                                   <div className="flex flex-col sm:flex-row gap-2 pt-2">
                                                     <button
                                                       type="button"
                                                       onClick={() => {
                                                         const st = remitoEditId === sol.id ? remitoEstadoEnvio : (sol.remitoDespachoEstado || "REMITO_EMITIDO");
                                                         handleActualizarEstadoDespachoRemito(sol, st);
                                                       }}
                                                       className="flex-1 bg-amber-600 hover:bg-amber-500 text-white font-bold py-2.5 rounded-lg text-xs transition-colors flex items-center justify-center gap-1.5 uppercase tracking-wider"
                                                     >
                                                       💾 Guardar Estado y Datos de Despacho
                                                     </button>
                                                     <button
                                                       type="button"
                                                       onClick={() => {
                                                         const unit = selectedProductStock
                                                           ? (selectedProductStock.stock || []).find((u: any) => u.id === sol.vinculoUnidadId)
                                                           : null;
                                                         
                                                         generarRemitoTipoR({
                                                           empresaConfig: empresaRemitosConfig,
                                                           facturaProveedorOriginal: sol.proveedorFacturaTicket || sol.facturaProveedorOriginal || "",
                                                           codigoProducto: selectedProductStock?.codigoProducto || sol.codigoProducto || "",
                                                           nroRemito: sol.remitoDespachoNro || `7777-${sol.id.substring(0, 8).toUpperCase()}`,
                                                           fechaEmision: new Date().toLocaleDateString("es-AR"),
                                                           nroContratoInterno: sol.nroContrato || `CH-${sol.id.substring(0, 6).toUpperCase()}`,
                                                           clienteNombre: remitoDestinatarioNombre || sol.datosPersonales?.nombreCompleto || sol.nombreCompleto || "Cliente",
                                                           clienteDni: remitoDestinatarioDoc || sol.datosPersonales?.numeroDni || sol.numeroDni || "-",
                                                           clienteDomicilio: remitoDestinatarioDireccion || sol.datosPersonales?.direccion || sol.direccion || "Lincoln",
                                                           clienteTelefono: remitoDestinatarioTel || sol.datosPersonales?.telefono || sol.whatsapp || "-",
                                                           productoDescripcion: sol.productoDeseado || sol.productoNombre || (selectedProductStock?.nombre || "Producto"),
                                                           nserie: sol.numeroSerie || unit?.nserie || "",
                                                           cantidad: 1
                                                         });
                                                         handleGuardarDespachoRemito(sol);
                                                       }}
                                                       className="flex-1 bg-[#fe5000] hover:bg-[#fe5000]/90 text-white font-black py-2.5 rounded-lg text-xs transition-colors flex items-center justify-center gap-1.5 shadow-md uppercase tracking-wider"
                                                     >
                                                       📄 Generar Remito PDF
                                                     </button>
                                                   </div>
                                                 </div>
                                               </div>

                                               {/* RUTEO POR COMISIONISTA (SOLO SI ORIGEN !== DESTINO) */}
                                               {requiereTransito ? (
                                                 <div className="bg-zinc-900 border border-blue-900/30 p-3.5 rounded-lg space-y-3">
                                                   <h5 className="text-[10px] font-black text-blue-400 uppercase tracking-widest flex items-center gap-1">
                                                     🚚 Ruteo Interno (Comisionista a Sucursal)
                                                   </h5>
                                                   <p className="text-[9px] text-zinc-500 italic">
                                                     El comisionista transportará la unidad asignada desde {origen} y la entregará al afiliado local en {destino}.
                                                   </p>

                                                   {sol.comisionistaNombre || sol.comisionistaCosto || sol.comisionistaFechaEnvio ? (
                                                     <div className="bg-zinc-950 p-2.5 rounded border border-zinc-850 text-[11px] space-y-1">
                                                       {sol.comisionistaNombre && <p className="text-zinc-300"><strong className="text-zinc-500">Comisionista:</strong> {sol.comisionistaNombre}</p>}
                                                       {sol.comisionistaCosto !== undefined && <p className="text-zinc-300"><strong className="text-zinc-500">Costo Envío:</strong> <span className="text-green-400 font-bold">${sol.comisionistaCosto}</span></p>}
                                                       {sol.comisionistaFechaEnvio && <p className="text-zinc-300"><strong className="text-zinc-500">Fecha Salida:</strong> {new Date(sol.comisionistaFechaEnvio).toLocaleDateString("es-AR")}</p>}
                                                       
                                                       <div className="flex gap-2 pt-2 border-t border-zinc-900 mt-2">
                                                         <button 
                                                           onClick={() => {
                                                             setComisionistaNombre(sol.comisionistaNombre || "");
                                                             setComisionistaCosto(sol.comisionistaCosto ? String(sol.comisionistaCosto) : "");
                                                             setComisionistaFechaEnvio(sol.comisionistaFechaEnvio || "");
                                                             setComisionistaEditId(sol.id);
                                                           }}
                                                           className="text-[9px] text-yellow-500 hover:text-yellow-400 font-bold underline"
                                                         >
                                                           ✏️ Editar envío
                                                         </button>
                                                         
                                                         <button 
                                                           onClick={() => handleConfirmarArriboSucursal(sol.id, sol.vinculoProductoId || selectedProductId, sol.vinculoUnidadId || "", destino)}
                                                           className="ml-auto bg-blue-600 hover:bg-blue-500 text-white font-black text-[9px] uppercase tracking-widest px-2.5 py-1 rounded transition-colors"
                                                         >
                                                           📥 Confirmar Arribo a Sucursal
                                                         </button>
                                                       </div>
                                                     </div>
                                                   ) : null}

                                                   {(comisionistaEditId === sol.id || (!sol.comisionistaNombre && !sol.comisionistaCosto && !sol.comisionistaFechaEnvio)) && (
                                                     <div className="bg-zinc-950 p-2.5 border border-zinc-850 rounded-lg space-y-2">
                                                       <div>
                                                         <label className="block text-[8px] text-zinc-500 font-bold uppercase mb-0.5">Nombre Comisionista</label>
                                                         <input 
                                                           type="text" 
                                                           value={comisionistaEditId === sol.id ? comisionistaNombre : ""} 
                                                           onChange={e => { setComisionistaEditId(sol.id); setComisionistaNombre(e.target.value); }} 
                                                           placeholder="Ej: Comisionista Junín" 
                                                           className="w-full bg-zinc-900 border border-zinc-800 p-1.5 rounded text-[11px] text-white outline-none focus:border-blue-500" 
                                                         />
                                                       </div>
                                                       <div className="grid grid-cols-2 gap-2">
                                                         <div>
                                                           <label className="block text-[8px] text-zinc-500 font-bold uppercase mb-0.5">Costo ($)</label>
                                                           <input 
                                                             type="number" 
                                                             value={comisionistaEditId === sol.id ? comisionistaCosto : ""} 
                                                             onChange={e => { setComisionistaEditId(sol.id); setComisionistaCosto(e.target.value); }} 
                                                             placeholder="ARS" 
                                                             className="w-full bg-zinc-900 border border-zinc-800 p-1.5 rounded text-[11px] text-white outline-none focus:border-blue-500" 
                                                           />
                                                         </div>
                                                         <div>
                                                           <label className="block text-[8px] text-zinc-500 font-bold uppercase mb-0.5">Fecha Envío</label>
                                                           <input 
                                                             type="date" 
                                                             value={comisionistaEditId === sol.id ? comisionistaFechaEnvio : ""} 
                                                             onChange={e => { setComisionistaEditId(sol.id); setComisionistaFechaEnvio(e.target.value); }} 
                                                             className="w-full bg-zinc-900 border border-zinc-800 p-1.5 rounded text-[11px] text-white outline-none focus:border-blue-500" 
                                                           />
                                                         </div>
                                                       </div>
                                                       <button 
                                                         onClick={() => handleGuardarComisionista(sol.id)} 
                                                         className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-1 rounded text-[9px] transition-all uppercase tracking-wider"
                                                       >
                                                         💾 Registrar Salida Comisionista
                                                       </button>
                                                     </div>
                                                   )}
                                                 </div>
                                               ) : (
                                                 <div className="bg-green-950/20 border border-green-500/20 p-3 rounded-lg text-xs flex items-start gap-2">
                                                   <span className="text-base">🟢</span>
                                                   <p className="text-green-400">
                                                     <strong>Local listo para entrega:</strong> El producto ya está en sucursal {destino}. El afiliado local puede entregárselo al cliente en el paso final.
                                                   </p>
                                                 </div>
                                               )}

                                               {/* HISTORIAL / AUDITORÍA DE LOGÍSTICA PERSISTENTE */}
                                               {(sol.comisionistaNombre || sol.comisionistaCosto || sol.comisionistaFechaEnvio || sol.comisionistaFechaRecepcion) ? (
                                                 <div className="bg-zinc-900 border border-zinc-800 p-3.5 rounded-lg space-y-2 text-[11px]">
                                                   <h5 className="text-[10px] font-black text-amber-400 uppercase tracking-widest flex items-center gap-1.5 border-b border-zinc-950 pb-1 mb-2">
                                                     📋 Registro de Envío e Internación (Auditoría)
                                                   </h5>
                                                   <div className="space-y-1 text-zinc-300">
                                                     {sol.comisionistaNombre && (
                                                       <p>
                                                         <strong className="text-zinc-500">Comisionista:</strong> {sol.comisionistaNombre}
                                                       </p>
                                                     )}
                                                     {sol.comisionistaCosto !== undefined && (
                                                       <p>
                                                         <strong className="text-zinc-500">Costo de Envío:</strong> <span className="text-green-400 font-bold">${sol.comisionistaCosto}</span>
                                                       </p>
                                                     )}
                                                     {sol.comisionistaFechaEnvio && (
                                                       <p>
                                                         <strong className="text-zinc-500">Fecha de Envío:</strong> {new Date(sol.comisionistaFechaEnvio).toLocaleDateString("es-AR")}
                                                       </p>
                                                     )}
                                                     {sol.comisionistaFechaRecepcion && (
                                                       <p>
                                                         <strong className="text-zinc-500">Fecha de Arribo a Sucursal:</strong> {new Date(sol.comisionistaFechaRecepcion).toLocaleDateString("es-AR")}
                                                       </p>
                                                     )}
                                                   </div>
                                                 </div>
                                               ) : null}

                                               {sol.historialRecepcion && (
                                                 <p className="text-[10px] text-green-400 mt-2 bg-green-900/20 px-2.5 py-1.5 rounded-md border border-green-500/10 flex items-center gap-1.5 font-mono">
                                                   <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0"/> {sol.historialRecepcion}
                                                 </p>
                                               )}

                                               <button
                                                 type="button"
                                                 onClick={() => handleLiberarReserva(sol.id, sol.vinculoProductoId || selectedProductId, sol.vinculoUnidadId || "")}
                                                 className="w-full bg-red-950/20 hover:bg-red-950/40 border border-red-900/50 text-red-400 font-bold py-2 rounded-lg text-[10px] transition-colors uppercase tracking-wider"
                                               >
                                                 ✕ Liberar Reserva (Volver a Disponible)
                                               </button>
                                             </div>
                                           );
                                         })()}
                                       </div>
                                     ) : (
                                       // AÚN NO TIENE RESERVA (SELECCIONAR Y RESERVAR)
                                       <div className="space-y-3">
                                         {/* Selector de Sucursal de Entrega (Destino) */}
                                         <div>
                                           <label className="block text-[10px] text-zinc-500 mb-1 font-bold">Sucursal de Destino / Entrega</label>
                                           <select 
                                             value={selectedDestino}
                                             onChange={e => setSelectedDestino(e.target.value)}
                                             className="bg-zinc-900 text-zinc-100 px-3 py-2 rounded-lg text-xs border border-zinc-800 w-full focus:border-blue-500 outline-none font-bold"
                                           >
                                             {sucursalesDisponibles.map(suc => (
                                               <option key={suc} value={suc}>{suc}</option>
                                             ))}
                                           </select>
                                         </div>

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
                                             className="bg-zinc-900 text-zinc-100 px-3 py-2 rounded-lg text-xs border border-zinc-800 w-full focus:border-blue-500 outline-none"
                                           >
                                             <option value="">-- Seleccionar de catálogo --</option>
                                             {productos.map(p => (
                                               <option key={p.id} value={p.id}>{p.nombre}</option>
                                             ))}
                                           </select>
                                         </div>

                                         {/* Selector de Unidad de Stock */}
                                         {selectedProductStock && (
                                           <div>
                                             <label className="block text-[10px] text-zinc-500 mb-1 font-bold">Unidad de Stock Disponible (Origen)</label>
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
                                               className="bg-zinc-900 text-zinc-100 px-3 py-2 rounded-lg text-xs border border-zinc-800 w-full focus:border-blue-500 outline-none"
                                             >
                                               <option value="manual">Cargar manualmente (Sin stock / Casa Central)</option>
                                               {(selectedProductStock.stock || []).filter((u: any) => u.estado === "Disponible").map((u: any) => (
                                                 <option key={u.id} value={u.id}>
                                                   [{u.localidad}] - {u.nserie ? `IMEI/Serie: ${u.nserie}` : "Sin número registrado"}
                                                 </option>
                                               ))}
                                             </select>
                                           </div>
                                         )}

                                         {/* Informar asignación de venta */}
                                         <div className="text-[9px] text-zinc-500 font-medium bg-zinc-900 p-2 rounded border border-zinc-850">
                                           {!sol.afiliadoEmail ? (
                                             <span className="text-yellow-500">ℹ️ Venta libre: puedes asignar stock de Casa Central o cualquier sucursal.</span>
                                           ) : (
                                             <span>ℹ️ Venta del afiliado: <strong className="text-zinc-300">{sol.afiliadoEmail}</strong>. Se recomienda seleccionar stock local o rutarlo.</span>
                                           )}
                                         </div>

                                         <div>
                                           <label className="block text-[10px] text-zinc-500 mb-1 font-bold">Nº de Serie / IMEI a Asignar</label>
                                           <input 
                                             type="text" 
                                             value={nserie} 
                                             onChange={e=>setNserie(e.target.value)} 
                                             placeholder="Ej: SN-12345" 
                                             className="bg-zinc-900 text-zinc-100 px-3 py-2 border border-zinc-800 rounded-lg text-xs w-full focus:border-blue-500 outline-none font-mono" 
                                           />
                                         </div>

                                         <button
                                           type="button"
                                           onClick={() => handleReservarStock(sol.id, selectedProductId, selectedStockUnitId, nserie, selectedDestino)}
                                           className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 rounded-lg text-xs transition-colors uppercase tracking-wider flex items-center justify-center gap-1.5 active:scale-95"
                                         >
                                           📌 Confirmar Reserva y Ruteo de Stock
                                         </button>
                                       </div>
                                     )}
                                   </div>

                                   {/* SECCIÓN 2: SEGUIMIENTO DE PEDIDO AL PROVEEDOR (PRODUCTO SIN STOCK) */}
                                   <div className="bg-zinc-950 p-4 border border-zinc-850 rounded-xl space-y-3 relative z-10">
                                     <div className="flex justify-between items-center border-b border-zinc-900 pb-2">
                                       <h4 className="text-xs font-black text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                                         🏭 Seguimiento de Pedido al Proveedor (Sin Stock Local)
                                       </h4>
                                       {sol.proveedorEstado && (
                                         <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase border ${
                                           sol.proveedorEstado === "RECIBIDO" ? "bg-green-500/20 text-green-400 border-green-500/30" :
                                           sol.proveedorEstado === "EN_TRANSITO" ? "bg-blue-500/20 text-blue-400 border-blue-500/30" :
                                           "bg-amber-500/20 text-amber-400 border-amber-500/30"
                                         }`}>
                                           {sol.proveedorEstado === "RECIBIDO" ? "✅ Recibido" : sol.proveedorEstado === "EN_TRANSITO" ? "🚚 En Tránsito" : "🛒 Pedido Solicitado"}
                                         </span>
                                       )}
                                     </div>

                                     {/* Si ya hay un pedido registrado al proveedor */}
                                     {(sol.proveedorNombre || sol.proveedorGuia || sol.proveedorCosto || sol.proveedorFechaPedido) ? (
                                       <div className="bg-amber-950/20 border border-amber-500/20 p-3.5 rounded-lg space-y-2 text-xs">
                                         <div className="space-y-1">
                                           {(sol.proveedorFacturaTicket || sol.facturaProveedorOriginal) && <p><strong className="text-zinc-400">Nº Ticket / Factura Proveedor:</strong> <span className="text-amber-400 font-mono font-bold">{sol.proveedorFacturaTicket || sol.facturaProveedorOriginal}</span></p>}
                                           {sol.proveedorNombre && <p><strong className="text-zinc-400">Proveedor / Mayorista:</strong> <span className="text-white font-bold">{sol.proveedorNombre}</span></p>}
                                           {sol.proveedorCosto > 0 && <p><strong className="text-zinc-400">Costo de Compra:</strong> <span className="text-green-400 font-black">${sol.proveedorCosto.toLocaleString("es-AR")}</span></p>}
                                           {sol.proveedorGuia && <p><strong className="text-zinc-400">Nº de Guía / Tracking:</strong> <span className="text-amber-300 font-mono font-bold">{sol.proveedorGuia}</span></p>}
                                           {sol.proveedorFechaPedido && <p><strong className="text-zinc-400">Fecha del Pedido:</strong> {new Date(sol.proveedorFechaPedido).toLocaleDateString("es-AR")}</p>}
                                           {sol.proveedorFechaEstimada && <p><strong className="text-zinc-400">Fecha Estimada Arribo (ETA):</strong> {new Date(sol.proveedorFechaEstimada).toLocaleDateString("es-AR")}</p>}
                                         </div>

                                         <div className="flex gap-2 pt-2 border-t border-zinc-900 mt-2">
                                           <button
                                             type="button"
                                             onClick={() => {
                                               setProveedorEditId(sol.id);
                                               setProveedorNombre(sol.proveedorNombre || "");
                                               setProveedorGuia(sol.proveedorGuia || "");
                                               setProveedorCosto(sol.proveedorCosto ? String(sol.proveedorCosto) : "");
                                               setProveedorFechaPedido(sol.proveedorFechaPedido || "");
                                               setProveedorFechaEstimada(sol.proveedorFechaEstimada || "");
                                               setProveedorEstado(sol.proveedorEstado || "SOLICITADO");
                                             }}
                                             className="text-[10px] text-amber-400 hover:text-amber-300 font-bold underline flex items-center gap-1"
                                           >
                                             ✏️ Editar Pedido a Proveedor
                                           </button>
                                         </div>
                                       </div>
                                     ) : null}

                                     {/* Formulario de Alta / Edición de Pedido a Proveedor */}
                                     {(proveedorEditId === sol.id || (!sol.proveedorNombre && !sol.proveedorGuia && !sol.proveedorCosto)) && (
                                       <div className="bg-zinc-900 p-3 rounded-lg border border-zinc-800 space-y-2.5 text-xs">
                                         <p className="text-[10px] font-bold text-amber-400 uppercase tracking-widest">
                                           📝 Registrar / Actualizar Pedido al Proveedor
                                         </p>

                                         <div>
                                           <label className="block text-[9px] text-zinc-500 font-bold uppercase mb-0.5">Nº de Ticket / Factura de Compra del Proveedor</label>
                                           <input 
                                             type="text"
                                             value={proveedorEditId === sol.id ? proveedorFacturaTicket : (sol.proveedorFacturaTicket || sol.facturaProveedorOriginal || "")}
                                             onChange={e => { setProveedorEditId(sol.id); setProveedorFacturaTicket(e.target.value); }}
                                             placeholder="Ej: FAC-0001-94812 / Ticket #4812"
                                             className="w-full bg-zinc-950 border border-zinc-850 p-2 rounded text-xs text-amber-300 font-mono font-bold outline-none focus:border-amber-500 mb-2"
                                           />
                                         </div>
                                         <div>
                                           <label className="block text-[9px] text-zinc-500 font-bold uppercase mb-0.5">Nombre del Proveedor / Mayorista</label>
                                           <input 
                                             type="text"
                                             value={proveedorEditId === sol.id ? proveedorNombre : ""}
                                             onChange={e => { setProveedorEditId(sol.id); setProveedorNombre(e.target.value); }}
                                             placeholder="Ej: Samsung Arg, Frávega Mayorista, Newsan, etc."
                                             className="w-full bg-zinc-950 border border-zinc-850 p-2 rounded text-xs text-white outline-none focus:border-amber-500 font-bold"
                                           />
                                         </div>

                                         <div className="grid grid-cols-2 gap-2">
                                           <div>
                                             <label className="block text-[9px] text-zinc-500 font-bold uppercase mb-0.5">Costo Compra ($)</label>
                                             <input 
                                               type="number"
                                               value={proveedorEditId === sol.id ? proveedorCosto : ""}
                                               onChange={e => { setProveedorEditId(sol.id); setProveedorCosto(e.target.value); }}
                                               placeholder="Costo abonado"
                                               className="w-full bg-zinc-950 border border-zinc-850 p-2 rounded text-xs text-white outline-none focus:border-amber-500 font-mono"
                                             />
                                           </div>
                                           <div>
                                             <label className="block text-[9px] text-zinc-500 font-bold uppercase mb-0.5">Nº de Guía / Tracking</label>
                                             <input 
                                               type="text"
                                               value={proveedorEditId === sol.id ? proveedorGuia : ""}
                                               onChange={e => { setProveedorEditId(sol.id); setProveedorGuia(e.target.value); }}
                                               placeholder="Ej: Andreani #829148"
                                               className="w-full bg-zinc-950 border border-zinc-850 p-2 rounded text-xs text-white outline-none focus:border-amber-500 font-mono"
                                             />
                                           </div>
                                         </div>

                                         <div className="grid grid-cols-2 gap-2">
                                           <div>
                                             <label className="block text-[9px] text-zinc-500 font-bold uppercase mb-0.5">Fecha del Pedido</label>
                                             <input 
                                               type="date"
                                               value={proveedorEditId === sol.id ? proveedorFechaPedido : ""}
                                               onChange={e => { setProveedorEditId(sol.id); setProveedorFechaPedido(e.target.value); }}
                                               className="w-full bg-zinc-950 border border-zinc-850 p-2 rounded text-xs text-white outline-none focus:border-amber-500"
                                             />
                                           </div>
                                           <div>
                                             <label className="block text-[9px] text-zinc-500 font-bold uppercase mb-0.5">Fecha Estimada Arribo (ETA)</label>
                                             <input 
                                               type="date"
                                               value={proveedorEditId === sol.id ? proveedorFechaEstimada : ""}
                                               onChange={e => { setProveedorEditId(sol.id); setProveedorFechaEstimada(e.target.value); }}
                                               className="w-full bg-zinc-950 border border-zinc-850 p-2 rounded text-xs text-white outline-none focus:border-amber-500"
                                             />
                                           </div>
                                         </div>

                                         <div>
                                           <label className="block text-[9px] text-zinc-500 font-bold uppercase mb-0.5">Estado del Envío Proveedor</label>
                                           <select
                                             value={proveedorEditId === sol.id ? proveedorEstado : "SOLICITADO"}
                                             onChange={e => { setProveedorEditId(sol.id); setProveedorEstado(e.target.value); }}
                                             className="w-full bg-zinc-950 border border-zinc-850 p-2 rounded text-xs text-amber-300 font-bold outline-none focus:border-amber-500"
                                           >
                                             <option value="SOLICITADO">🛒 SOLICITADO AL PROVEEDOR</option>
                                             <option value="EN_TRANSITO">🚚 EN TRÁNSITO (EN CAMINO)</option>
                                             <option value="RECIBIDO">✅ RECIBIDO EN DEPÓSITO CENTRAL</option>
                                           </select>
                                         </div>

                                         <button
                                           type="button"
                                           onClick={() => handleGuardarPedidoProveedor(sol.id)}
                                           className="w-full bg-amber-600 hover:bg-amber-500 text-white font-black py-2 rounded text-xs transition-colors uppercase tracking-wider shadow-md"
                                         >
                                           💾 Guardar Estado del Pedido al Proveedor
                                         </button>
                                       </div>
                                     )}
                                   </div>

                                   <div className="pt-2 border-t border-blue-900/50">
                                      <label className="block text-xs font-bold text-blue-300/70 mb-2">Estado Final de Entrega al Cliente:</label>
                                      {entregaActiva === sol.id ? (
                                        <div className="bg-zinc-900 border border-blue-500 p-4 rounded-xl flex flex-col gap-3 shadow-2xl">
                                           <h4 className="text-blue-400 font-bold text-xs uppercase text-center border-b border-blue-900 pb-2 mb-1">Confirmar Cierre y Adelanto</h4>
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
                                             <button onClick={() => handleConfirmarEntregaAdmin(sol.id, "ENTREGADO", false, sol.vinculoProductoId || "", sol.vinculoUnidadId || "")} className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg text-xs font-black hover:bg-blue-500 transition shadow-2xl shadow-black/60">✓ GUARDAR CIERRE</button>
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
                             {currentEstado === "APROBADO" && (
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
                              <div className="bg-green-950/10 border-2 border-green-500/20 p-5 rounded-xl shadow-2xl shadow-black/60 h-full flex flex-col gap-4">
                                <h3 className="text-sm font-black text-green-400 uppercase tracking-widest flex items-center gap-2 border-b border-green-950/50 pb-3"><DollarSign className="w-4 h-4"/> Auditoría de Cuotas</h3>
                                
                                {/* RESUMEN DE PAGO */}
                                {(() => {
                                   const plan = sol.planPagos || [];
                                   const paidCuotas = plan.filter((c: any) => c.estado === "PAGADO");
                                   const pendingCuotas = plan.filter((c: any) => c.estado === "PENDIENTE" || c.estado === "EN_REVISION");
                                   
                                   const totalAbonado = paidCuotas.reduce((sum: number, c: any) => sum + (c.montoAbonado || c.montoOriginal || 0), 0);
                                   const totalOriginal = plan.reduce((sum: number, c: any) => sum + (c.montoOriginal || 0), 0);
                                   const totalPendiente = pendingCuotas.reduce((sum: number, c: any) => sum + (c.montoOriginal || 0), 0);
                                   
                                   const pct = totalOriginal > 0 ? Math.round((totalAbonado / totalOriginal) * 100) : 0;
                                   
                                   return (
                                      <div className="bg-zinc-950/70 border border-green-500/10 p-4 rounded-xl space-y-3">
                                         <div className="flex justify-between items-center text-xs border-b border-zinc-900 pb-2">
                                            <span className="text-zinc-500 font-bold uppercase tracking-wider">Resumen de Pagos</span>
                                            <span className="text-green-400 font-mono font-black">{paidCuotas.length} / {plan.length} Cuotas</span>
                                         </div>
                                         <div className="grid grid-cols-3 gap-2 text-center">
                                            <div className="bg-zinc-900/50 p-2 rounded border border-zinc-850">
                                               <span className="block text-[8px] text-zinc-500 font-bold uppercase">Total Plan</span>
                                               <span className="text-[11px] text-zinc-300 font-black">${totalOriginal}</span>
                                            </div>
                                            <div className="bg-green-950/20 p-2 rounded border border-green-500/10">
                                               <span className="block text-[8px] text-green-500/60 font-bold uppercase">Abonado</span>
                                               <span className="text-[11px] text-green-400 font-black">${totalAbonado}</span>
                                            </div>
                                            <div className="bg-zinc-900/50 p-2 rounded border border-zinc-850">
                                               <span className="block text-[8px] text-zinc-500 font-bold uppercase">Pendiente</span>
                                               <span className="text-[11px] text-orange-400 font-black">${totalPendiente}</span>
                                            </div>
                                         </div>
                                         <div className="space-y-1 pt-1">
                                            <div className="flex justify-between text-[9px] font-bold text-zinc-500">
                                               <span>PROGRESO DE PAGO</span>
                                               <span>{pct}%</span>
                                            </div>
                                            <div className="w-full bg-zinc-900 h-2 rounded-full overflow-hidden border border-zinc-850">
                                               <div className="bg-green-500 h-full transition-all duration-500" style={{ width: `${pct}%` }}></div>
                                            </div>
                                         </div>
                                          <div className="pt-2 border-t border-zinc-900">
                                            <button
                                               onClick={() => {
                                                  generarEstadoCuenta({
                                                     nroLegajo: sol.id.substring(0, 8).toUpperCase(),
                                                     fechaEmision: new Date().toLocaleDateString("es-AR"),
                                                     clienteNombre: sol.datosPersonales?.nombreCompleto || "",
                                                     clienteDni: sol.datosPersonales?.numeroDni || "",
                                                     productoNombre: sol.productoDeseado || "Producto",
                                                     totalPlan: totalOriginal,
                                                     totalAbonado: totalAbonado,
                                                     totalPendiente: totalPendiente,
                                                     planPagos: plan
                                                  });
                                               }}
                                               className="w-full bg-green-950/20 hover:bg-green-600 border border-green-500/25 text-green-400 hover:text-white font-bold py-2 rounded-lg text-xs transition uppercase tracking-wider flex items-center justify-center gap-1.5 active:scale-95"
                                            >
                                               📥 Descargar Resumen de Cuenta (PDF)
                                            </button>
                                          </div>
                                      </div>
                                   );
                                })()}
                                
                                <div className="space-y-3 max-h-[420px] overflow-y-auto pr-2 custom-scrollbar">
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
                                      
                                      {cuota.estado === "PAGADO" && (
                                         <div className="flex flex-col gap-1.5 mt-1 bg-zinc-950 p-2.5 rounded border border-zinc-900">
                                            <div className="flex justify-between items-center text-[10px]">
                                               <span className="text-zinc-500 font-bold uppercase">Abonado:</span>
                                               <span className="text-green-400 font-black">${cuota.montoAbonado || cuota.montoOriginal}</span>
                                            </div>
                                            {cuota.fechaPago && (
                                               <div className="flex justify-between items-center text-[10px]">
                                                  <span className="text-zinc-500">Fecha de Pago:</span>
                                                  <span className="text-zinc-300">{new Date(cuota.fechaPago).toLocaleDateString("es-AR")}</span>
                                               </div>
                                            )}
                                            {(cuota.cuentaDestino || cuota.metodoPagoManual || cuota.metodoPago) && (
                                               <div className="flex justify-between items-center text-[10px]">
                                                  <span className="text-zinc-500">Medio / Cuenta:</span>
                                                  <span className="text-zinc-300">{cuota.cuentaDestino || cuota.metodoPagoManual || cuota.metodoPago}</span>
                                               </div>
                                            )}
                                            {cuota.nroComprobante && (
                                               <div className="flex justify-between items-center text-[10px]">
                                                  <span className="text-zinc-500">Transacción:</span>
                                                  <span className="text-zinc-300 font-mono">{cuota.nroComprobante}</span>
                                               </div>
                                            )}
                                            <div className="flex gap-2 mt-2 pt-2 border-t border-zinc-900">
                                               {cuota.comprobanteUrl && (
                                                  <a 
                                                    href={cuota.comprobanteUrl} 
                                                    target="_blank" 
                                                    rel="noreferrer" 
                                                    className="flex-1 bg-blue-950/20 text-blue-400 border border-blue-500/20 text-center py-1 rounded text-[9px] font-bold hover:bg-blue-600 hover:text-white transition"
                                                  >
                                                    📄 Ver Adjunto
                                                  </a>
                                               )}
                                               <button
                                                  onClick={() => {
                                                     const isPartial = cuota.montoAbonado !== undefined && cuota.montoAbonado !== cuota.montoOriginal;
                                                     const receiptId = `REC-${sol.id.substring(0, 5).toUpperCase()}-${cuota.numero}`;
                                                     
                                                     generarComprobantePago({
                                                        nroRecibo: receiptId,
                                                        fecha: cuota.fechaPago ? new Date(cuota.fechaPago).toLocaleDateString("es-AR") : new Date().toLocaleDateString("es-AR"),
                                                        clienteNombre: sol.datosPersonales?.nombreCompleto || "",
                                                        clienteDni: sol.datosPersonales?.numeroDni || "",
                                                        productoNombre: sol.productoDeseado || "Producto",
                                                        cuotaNumero: cuota.numero,
                                                        montoAbonado: cuota.montoAbonado || cuota.montoOriginal,
                                                        metodoPago: cuota.metodoPagoManual || cuota.metodoPago || "Acreditado",
                                                        nroComprobante: cuota.nroComprobante,
                                                        cuentaDestino: cuota.cuentaDestino,
                                                        esPagoParcial: isPartial
                                                     });
                                                  }}
                                                  className="flex-1 bg-green-950/20 text-green-400 border border-green-500/20 py-1 rounded text-[9px] font-bold hover:bg-green-600 hover:text-white transition uppercase tracking-wider flex items-center justify-center gap-1"
                                               >
                                                  📥 Descargar Recibo PDF
                                               </button>
                                            </div>
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
                                              <button onClick={() => {
                                                  setPagoAConfirmar({ solId: sol.id, idx, metodo: 'Transferencia', originalAmount: cuota.montoOriginal, isClientApprove: true });
                                                  setPagoMonto(String(cuota.montoOriginal));
                                                  setPagoComprobante(cuota.nroComprobante || "");
                                                  setPagoCuentaDestino(cuota.cuentaDestino || "Mercado Pago (Fintech)");
                                              }} className="flex-1 bg-green-600 hover:bg-green-500 text-white py-2 rounded text-xs font-black transition shadow-2xl shadow-black/60">✓ Aprobar</button>
                                            </div>
                                         </div>
                                      )}

                                       {cuota.estado === "PENDIENTE" && (
                                         <div className="bg-zinc-950/60 p-3 rounded-lg border border-zinc-900/60 flex flex-col gap-2 mt-1">
                                           <p className="text-[10px] text-zinc-500 font-medium">Registrar cobro manual realizado en efectivo o transferencia:</p>
                                           <div className="flex gap-2">
                                             <button
                                               onClick={() => {
                                                 setPagoAConfirmar({ solId: sol.id, idx, metodo: 'Efectivo', originalAmount: cuota.montoOriginal, isClientApprove: false });
                                                 setPagoMonto(String(cuota.montoOriginal));
                                                 setPagoComprobante("");
                                                 setPagoCuentaDestino("Caja Efectivo");
                                               }}
                                               className="flex-1 bg-green-950/30 hover:bg-green-600 border border-green-500/20 text-green-400 hover:text-white py-1.5 rounded text-[10px] font-black transition uppercase tracking-wider"
                                             >
                                               💵 Efectivo
                                             </button>
                                             <button
                                               onClick={() => {
                                                 setPagoAConfirmar({ solId: sol.id, idx, metodo: 'Transferencia', originalAmount: cuota.montoOriginal, isClientApprove: false });
                                                 setPagoMonto(String(cuota.montoOriginal));
                                                 setPagoComprobante("");
                                                 setPagoCuentaDestino("Mercado Pago (Fintech)");
                                               }}
                                               className="flex-1 bg-blue-950/30 hover:bg-blue-650 border border-blue-500/20 text-blue-400 hover:text-white py-1.5 rounded text-[10px] font-black transition uppercase tracking-wider"
                                             >
                                               📱 Transf.
                                             </button>
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
             {/* MODAL DE CONFIRMACIÓN DE COBRO Y EMISIÓN DE COMPROBANTE */}
             {pagoAConfirmar && (
               <div className="fixed inset-0 bg-black/85 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                 <div className="bg-zinc-900 border-2 border-green-500/20 rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-5">
                   <div className="border-b border-zinc-800 pb-3 flex justify-between items-center">
                     <div>
                       <h3 className="text-sm font-black text-green-400 uppercase tracking-widest">💰 Acreditación de Pago</h3>
                       <p className="text-[10px] text-zinc-500">Registre los datos de la transacción para emitir comprobante</p>
                     </div>
                     <button onClick={() => setPagoAConfirmar(null)} className="text-zinc-500 hover:text-white text-xs font-bold">✕</button>
                   </div>
                   
                   <div className="space-y-4 text-xs">
                     <div>
                       <label className="block text-[10px] text-zinc-400 font-bold uppercase mb-1">Monto Real Cobrado ($)</label>
                       <input 
                         type="number" 
                         value={pagoMonto} 
                         onChange={e => setPagoMonto(e.target.value)} 
                         className="w-full bg-zinc-950 border border-zinc-800 p-2.5 rounded-lg text-white font-black text-sm outline-none focus:border-green-500" 
                         placeholder="Monto"
                       />
                     </div>
                     <div>
                       <label className="block text-[10px] text-zinc-400 font-bold uppercase mb-1">Nº Comprobante / Transacción (Opcional)</label>
                       <input 
                         type="text" 
                         value={pagoComprobante} 
                         onChange={e => setPagoComprobante(e.target.value)} 
                         className="w-full bg-zinc-950 border border-zinc-800 p-2.5 rounded-lg text-white font-mono outline-none focus:border-green-500" 
                         placeholder="Ej: TXN-99887766"
                       />
                     </div>
                     <div>
                       <label className="block text-[10px] text-zinc-400 font-bold uppercase mb-1">Cuenta de Destino / Depósito</label>
                       <select 
                         value={pagoCuentaDestino} 
                         onChange={e => setPagoCuentaDestino(e.target.value)} 
                         className="w-full bg-zinc-950 border border-zinc-800 p-2.5 rounded-lg text-white outline-none focus:border-green-500 font-medium"
                       >
                         <option value="Caja Efectivo">💵 Caja Efectivo</option>
                         <option value="Mercado Pago (Fintech)">📱 Mercado Pago (Fintech)</option>
                         <option value="Banco Galicia">🏢 Banco Galicia</option>
                         <option value="Banco Provincia">🏢 Banco Provincia</option>
                         <option value="Ualá">📱 Ualá</option>
                         <option value="Otra Cuenta / Cheque">📄 Otra Cuenta / Cheque</option>
                       </select>
                     </div>
                   </div>

                   <div className="flex gap-3 pt-2">
                     <button 
                       onClick={() => setPagoAConfirmar(null)} 
                       className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold py-2 rounded-lg text-xs transition uppercase tracking-wider"
                     >
                       Cancelar
                     </button>
                     <button 
                       onClick={handleProcesarPagoFinal} 
                       className="flex-1 bg-green-600 hover:bg-green-500 text-white font-black py-2 rounded-lg text-xs transition shadow-lg shadow-green-900/30 uppercase tracking-wider"
                     >
                       💾 Confirmar y Generar PDF
                     </button>
                   </div>
                 </div>
               </div>
             )}

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
                       <label className="block text-xs font-bold text-amber-400 mb-1">Precio Producto ($)</label>
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
                           const newCuotasStr = e.target.value;
                           const numCuotas = parseInt(newCuotasStr) || 0;
                           const numContado = parseFloat(contratoAEditar.precioContado?.toString().replace(/[^0-9.-]/g, "") || "0") || 0;
                           
                           if (numCuotas > 0 && numContado > 0) {
                             const solProdName = (contratoAEditar.producto || "").toLowerCase().trim();
                             const prodMatch = (productos || []).find((p: any) => {
                               if (!p.nombre) return false;
                               const pName = p.nombre.toLowerCase().trim();
                               return pName === solProdName || pName.includes(solProdName) || solProdName.includes(pName);
                             });

                             let factor = 0;
                             const factores = contratoAEditar.originalSolicitud?.factoresPlanes || prodMatch?.factoresPlanes;
                             if (factores && (factores[numCuotas] || factores[String(numCuotas)])) {
                               factor = Number(factores[numCuotas] || factores[String(numCuotas)]);
                             }

                             if (!factor || factor <= 0) {
                               if (numCuotas === 8 && prodMatch?.cuota8 && Number(prodMatch.cuota8) > 0 && numContado > 0) {
                                 factor = (Number(prodMatch.cuota8) * 8) / numContado;
                               } else if (numCuotas === 12 && prodMatch?.cuota12 && Number(prodMatch.cuota12) > 0 && numContado > 0) {
                                 factor = (Number(prodMatch.cuota12) * 12) / numContado;
                               }
                             }

                             if (!factor || factor <= 0) {
                               const r = 0.60 / 12;
                               const formulaFactor = ((r * Math.pow(1 + r, numCuotas)) / (Math.pow(1 + r, numCuotas) - 1)) * numCuotas;
                               if (formulaFactor > 0 && !isNaN(formulaFactor)) {
                                 factor = formulaFactor;
                               } else {
                                 factor = numCuotas === 12 ? 1.5873 : (numCuotas === 8 ? 1.35 : (numCuotas === 6 ? 1.25 : 1.5));
                               }
                             }

                             const newTotal = Math.round(numContado * factor);
                             const newImp = Math.round(newTotal / numCuotas);
                             
                             const bDate = new Date();
                             const newPlan = [];
                             for (let i = 1; i <= numCuotas; i++) {
                               const nd = new Date(bDate);
                               nd.setMonth(nd.getMonth() + i);
                               newPlan.push({
                                 numero: i,
                                 vencimiento: nd.toISOString().split("T")[0],
                                 montoOriginal: newImp,
                                 observacion: "Cuota mensual ordinaria"
                               });
                             }

                             setContratoAEditar({
                               ...contratoAEditar,
                               cuotas: newCuotasStr,
                               totalFinanciado: String(newTotal),
                               importeCuota: String(newImp),
                               factorFinanciado: factor.toFixed(4),
                               cuotasPlan: newPlan
                             });
                           } else {
                             setContratoAEditar({
                               ...contratoAEditar,
                               cuotas: newCuotasStr
                             });
                           }
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

                    {/* CARD DE CLAUSULA SEGUNDA Y DIVISIÓN FISCAL AFIP (SINCRONIZADA) */}
                    <div className="md:col-span-3 bg-[#121316] border border-amber-500/30 p-4 rounded-2xl space-y-3 mt-2 shadow-inner">
                      {(() => {
                        const cProd = Math.round(parseFloat(contratoAEditar.precioContado?.toString().replace(/[^0-9.-]/g, "") || "0") || 0);
                        const totalFin = Math.round(parseFloat(contratoAEditar.totalFinanciado?.toString().replace(/[^0-9.-]/g, "") || "0") || 0);
                        const n = Math.max(1, parseInt(contratoAEditar.cuotas) || 12);

                        const montoGravadoTotal = Math.max(0, totalFin - cProd);
                        const gastosSoporte = Math.round(montoGravadoTotal * 0.60);
                        const costoFinanciero = Math.round(montoGravadoTotal * 0.40);

                        const mExento = Math.round(cProd / n);
                        const mGravado = Math.round(montoGravadoTotal / n);
                        const nGravado = Math.round(mGravado / 1.21);
                        const iva21 = Math.max(0, mGravado - nGravado);

                        return (
                          <div className="space-y-3">
                            <div className="bg-amber-950/20 border border-amber-500/40 p-3 rounded-xl space-y-1.5 text-xs text-amber-200">
                              <p className="text-[10px] font-black uppercase text-amber-400 tracking-wider flex items-center justify-between border-b border-amber-500/30 pb-1">
                                <span>📜 Previsualización Cláusula Segunda (Contrato PDF)</span>
                                <span className="text-[9px] font-mono text-zinc-400">Desglose Mandato Comercial</span>
                              </p>
                              <p className="flex justify-between font-mono"><span>• Valor Neto del Bien (Costo Proveedor):</span> <strong className="text-emerald-400 font-bold">${cProd.toLocaleString("es-AR")}</strong></p>
                              <p className="flex justify-between font-mono"><span>• Gastos de logística + Servicio de Soporte técnico (60%):</span> <strong className="text-white font-bold">${gastosSoporte.toLocaleString("es-AR")}</strong></p>
                              <p className="flex justify-between font-mono"><span>• Costo Financiero Total - CFT (40%):</span> <strong className="text-white font-bold">${costoFinanciero.toLocaleString("es-AR")}</strong></p>
                              <p className="flex justify-between font-sans text-amber-300 font-black pt-1.5 border-t border-amber-500/30 text-sm">
                                <span>• VALOR TOTAL A FINANCIAR:</span>
                                <span className="font-mono text-amber-300">${totalFin.toLocaleString("es-AR")}</span>
                              </p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs pt-1">
                              <div className="bg-[#181920] border border-emerald-500/30 p-3 rounded-xl space-y-1">
                                <p className="text-[10px] text-emerald-400 font-bold uppercase">🟢 Monto Exento por Cuota (Devolución Capital)</p>
                                <p className="text-base font-black text-white font-mono">
                                  ${mExento.toLocaleString("es-AR")} <span className="text-[10px] text-zinc-400 font-normal">/ cuota</span>
                                </p>
                                <p className="text-[10px] text-emerald-300 font-medium">
                                  ⚠️ Acción Alerta: Generar Recibo X (Devolución de Capital Exento por Mandato)
                                </p>
                              </div>

                              <div className="bg-[#181920] border border-blue-500/30 p-3 rounded-xl space-y-1.5">
                                <div className="flex justify-between items-center">
                                  <p className="text-[10px] text-blue-400 font-bold uppercase">🔵 Factura B AFIP por Cuota (Servicios/CFT)</p>
                                  <span className="text-[9px] bg-blue-500/10 text-blue-400 px-1.5 py-0.5 rounded border border-blue-500/20 font-bold">IVA 21% Incorporado</span>
                                </div>
                                <p className="text-base font-black text-white font-mono">
                                  ${mGravado.toLocaleString("es-AR")} <span className="text-[10px] text-zinc-400 font-normal">/ cuota</span>
                                </p>
                                <div className="text-[10px] text-blue-300 font-medium space-y-0.5 pt-1 border-t border-zinc-800/80 font-mono">
                                  <p className="flex justify-between"><span>📄 Base Neta (Honorarios):</span> <span className="font-bold text-white">${nGravado.toLocaleString("es-AR")}</span></p>
                                  <p className="flex justify-between"><span>🏛️ Débito Fiscal IVA 21%:</span> <span className="font-bold text-blue-200">${iva21.toLocaleString("es-AR")}</span></p>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })()}
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
                        type="button"
                        onClick={handleGuardarEdicionContrato} 
                        className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-3.5 rounded-xl font-black text-xs uppercase tracking-widest transition-colors shadow-xl flex items-center justify-center gap-2"
                      >
                        💾 Guardar Modificaciones del Contrato y Pagaré en la Base de Datos
                      </button>
                      <button 
                        onClick={() => handleConfirmarYEnviarWhatsApp(contratoAEditar)}
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

interface BcraScoringPanelProps {
  cuit: string;
}

function BcraScoringPanel({ cuit }: BcraScoringPanelProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const cleanCuit = (cuit || "").replace(/\D/g, "");

  const handleFetch = async () => {
    if (!cleanCuit || cleanCuit.length !== 11) {
      setError("CUIL/CUIT inválido o incompleto.");
      return;
    }
    setLoading(true);
    setError("");
    setData(null);
    try {
      const res = await fetch(`https://api.bcra.gob.ar/centraldedeudores/v1.0/Deudas/${cleanCuit}`);
      if (!res.ok) {
        if (res.status === 503) {
          throw new Error("El servicio oficial del BCRA se encuentra en mantenimiento (Error 503).");
        }
        throw new Error(`Error de conexión con BCRA (Código ${res.status}).`);
      }
      const json = await res.json();
      if (json.status === 200 && json.results) {
        setData(json.results);
      } else {
        throw new Error(json.errorMessages ? json.errorMessages.join(", ") : "Respuesta de API no exitosa.");
      }
    } catch (err: any) {
      console.error("BCRA API Fetch error:", err);
      if (err.message.includes("Failed to fetch") || err.name === "TypeError") {
        setError("Error de CORS / Red: La API del BCRA bloqueó la consulta directa por navegador. Utilizá el botón manual de abajo.");
      } else {
        setError(err.message || "Error al consultar la API del BCRA.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-xl shadow-inner space-y-3">
      <h4 className="text-xs font-black text-yellow-400 uppercase tracking-widest flex items-center gap-1.5 justify-between">
        <span>📊 Scoring BCRA (En App)</span>
        {cleanCuit && cleanCuit.length === 11 && !data && !loading && (
          <button
            onClick={handleFetch}
            className="text-[10px] bg-yellow-500 hover:bg-yellow-400 text-black px-2.5 py-1 rounded font-black transition-all"
          >
            ⚡ Consultar
          </button>
        )}
      </h4>

      {loading && (
        <div className="flex items-center gap-2 text-xs text-zinc-400 font-mono py-1">
          <span className="animate-spin text-yellow-500">⏳</span> Consultando base del BCRA...
        </div>
      )}

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 p-2.5 rounded text-[10px] text-red-400 space-y-1">
          <p className="font-bold">⚠️ Falló la consulta automática:</p>
          <p className="font-mono">{error}</p>
        </div>
      )}

      {data && (
        <div className="space-y-3 text-xs bg-zinc-950 p-3 rounded-lg border border-zinc-850">
          <div>
            <span className="text-[10px] text-zinc-500 font-black block uppercase">Denominación Oficial</span>
            <span className="font-bold text-white uppercase">{data.denominacion || "Sin nombre registrado"}</span>
          </div>

          {data.periodos && data.periodos.length > 0 ? (
            <div className="space-y-2">
              <span className="text-[10px] text-zinc-500 font-black block uppercase">Deudas Consolidadas (Período: {data.periodos[0].periodo})</span>
              <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1">
                {data.periodos[0].entidades.map((ent: any, idx: number) => {
                  const sit = Number(ent.situacion);
                  let badgeColor = "bg-green-500/20 text-green-400 border-green-500/30";
                  if (sit === 2) badgeColor = "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
                  if (sit >= 3) badgeColor = "bg-red-500/20 text-red-400 border-red-500/30";
                  return (
                    <div key={idx} className="bg-zinc-900/60 p-2 rounded border border-zinc-850 flex justify-between items-center text-[10px] gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-zinc-300 truncate" title={ent.entidad}>{ent.entidad}</p>
                        <p className="text-zinc-500 text-[9px]">Monto: ${ent.monto ? ent.monto * 1000 : 0} ARS</p>
                      </div>
                      <span className={`px-2 py-0.5 rounded border text-[9px] font-black ${badgeColor}`}>
                        Sit. {sit}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <p className="text-[10px] text-green-400 font-bold">✓ Sin deudas registradas en el sistema financiero.</p>
          )}
        </div>
      )}
    </div>
  );
}
