"use client";

import { AdminNav } from "@/components/AdminNav";
import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { AdminProtectedRoute } from "@/components/AdminProtectedRoute";
import { db, auth } from "@/lib/firebase";
import { collection, getDocs, doc, getDoc, updateDoc, addDoc, serverTimestamp } from "firebase/firestore";
import { generarPdfPresupuesto } from "@/lib/pdfGenerator";
import { 
  SolicitudCandidate 
} from "@/lib/budgetAlertRouting";
import {
  BudgetEditorLifecycleController,
  BudgetEditorState
} from "@/lib/budgetEditorLifecycle";
import {
  getAvailableManualPlazos,
  findExistingCatalogDuplicate,
  InternalBudgetItem,
  ManualProductInput,
  ManualProductSnapshot,
  calculateManualProductPricing,
  buildCatalogPayloadFromManualProduct,
  createManualBudgetItem,
  createCatalogBudgetItem,
  toClientBudgetPayload,
  buildClientWhatsAppMessage,
  buildSanitizedPdfDatosFromBudget,
} from "@/lib/manualBudgetProduct";
import { 
  FileText, 
  Search, 
  Filter, 
  Download, 
  ExternalLink, 
  Plus, 
  X, 
  Send, 
  User, 
  AlertTriangle,
  CheckCircle2,
  Lock,
  RefreshCw,
  Copy,
  Trash2,
  Edit3,
  PackagePlus,
  Layers
} from "lucide-react";

function parseAnyDate(val: unknown): Date {
  if (!val) return new Date(0);
  if (val instanceof Date) return val;
  if (typeof val === "string" || typeof val === "number") {
    const d = new Date(val);
    if (!isNaN(d.getTime())) return d;
  }
  const obj = val as { toDate?: () => Date; seconds?: number };
  if (obj && typeof obj.toDate === "function") return obj.toDate();
  if (obj && typeof obj.seconds === "number") return new Date(obj.seconds * 1000);
  return new Date();
}

interface PresupuestoOpcion {
  itemId?: string;
  source?: "CATALOGO" | "MANUAL_PRESUPUESTO";
  pricingMode?: "CANONICAL_V1" | "MANUAL_FACTOR_V1";
  productoId?: string | null;
  producto: string;
  nombre?: string;
  codigo?: string | null;
  marca?: string | null;
  modelo?: string | null;
  categoria?: string | null;
  descripcion?: string;
  imagenUrl?: string;
  imagenUrls?: string[];
  cantidad?: number;
  contado?: number;
  precioContado?: number;
  costoProveedor?: number | null;
  proveedor?: string | null;
  cuotas?: number;
  factor?: number | null;
  factorAplicado?: number | null;
  valorCuota?: number;
  anticipo?: number;
  totalFinanciado?: number;
  margenEstimado?: number | null;
  tnaInternaAplicada?: number | null;
  observacionesComerciales?: string | null;
  observacionesInternas?: string | null;
  guardarEnCatalogo?: boolean;
  capitalCentavos?: number;
  totalCentavos?: number;
  pricingSnapshot?: Record<string, unknown> | null;
  manualProductSnapshot?: ManualProductSnapshot | null;
}

interface PresupuestoRecord {
  id: string;
  pricingSchemaVersion?: "CANONICAL_V1" | "MANUAL_FACTOR_V1" | "MIXED_V1";
  pricingMode?: "CANONICAL_V1" | "MANUAL_FACTOR_V1" | "MIXED_V1";
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
  plazoMeses?: number;
  valorCuota?: number;
  costoProveedor?: number;
  capitalCompraCentavos?: number;
  valorTotalContractualCentavos?: number;
  cuotaMensualBaseCentavos?: number;
  tnaInternaAplicada?: number;
  alicuotaIvaAplicada?: number;
  factorDerivado?: number;
  snapshotCanonico?: CanonicalPricingSnapshot | null;
  fechaObjeto?: Date;
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

interface CanonicalPricingSnapshot {
  pricingSchemaVersion: "CANONICAL_V1";
  capitalCompraCentavos: number;
  plazoMeses: number;
  tnaInternaAplicada: number;
  alicuotaIvaAplicada: number;
  servicioBrutoTotalCentavos: number;
  servicioNetoTotalCentavos: number;
  ivaTotalCentavos: number;
  valorTotalContractualCentavos: number;
  factorDerivado: number;
  cuotaMensualBaseCentavos: number;
  senaMontoCentavos: number;
  cuotas: Array<{
    numero: number;
    montoTotalCentavos: number;
    capitalCentavos: number;
    servicioNetoGravadoCentavos: number;
    ivaCentavos: number;
  }>;
}

interface CatalogProduct {
  id: string;
  nombre: string;
  costoProducto: number;
  plazosHabilitados: number[];
  codigoProducto?: string | null;
  descripcion?: string;
  imagenUrl?: string;
  proveedor?: string;
}

function mapOpcionToInternalBudgetItem(op: PresupuestoOpcion, idx: number): InternalBudgetItem {
  const source =
    op.source === "MANUAL_PRESUPUESTO" || op.pricingMode === "MANUAL_FACTOR_V1" || op.manualProductSnapshot
      ? "MANUAL_PRESUPUESTO"
      : "CATALOGO";
  const pricingMode = source === "MANUAL_PRESUPUESTO" ? "MANUAL_FACTOR_V1" : "CANONICAL_V1";
  const cuotas = Number(op.cuotas) || 12;
  const valorCuota = Number(op.valorCuota) || 0;
  const anticipo = Number(op.anticipo) || 0;
  const totalFinanciado =
    Number(op.totalFinanciado) ||
    (op.totalCentavos ? Math.round(Number(op.totalCentavos) / 100) : cuotas * valorCuota + anticipo);

  return {
    itemId: op.itemId || `item-hist-${idx}`,
    source,
    pricingMode,
    productoId: op.productoId ?? null,
    nombre: String(op.nombre || op.producto || "Producto"),
    codigo: op.codigo ?? null,
    marca: op.marca ?? null,
    modelo: op.modelo ?? null,
    categoria: op.categoria ?? null,
    descripcion: op.descripcion || "",
    imagenUrl: op.imagenUrl || "",
    imagenUrls: op.imagenUrls || (op.imagenUrl ? [op.imagenUrl] : []),
    cantidad: Number(op.cantidad) || 1,
    precioContado: Number(op.precioContado ?? op.contado ?? totalFinanciado) || 0,
    cuotas,
    valorCuota,
    anticipo,
    totalFinanciado,
    observacionesComerciales: op.observacionesComerciales ?? null,
    costoProveedor: op.costoProveedor ?? null,
    proveedor: op.proveedor ?? null,
    linkProveedor: null,
    factorAplicado: op.factorAplicado ?? op.factor ?? null,
    margenEstimado: op.margenEstimado ?? null,
    tnaInternaAplicada: op.tnaInternaAplicada ?? null,
    observacionesInternas: op.observacionesInternas ?? null,
    guardarEnCatalogo: Boolean(op.guardarEnCatalogo),
    pricingSnapshot: op.pricingSnapshot ?? null,
    manualProductSnapshot: op.manualProductSnapshot ?? null,
  };
}

function PresupuestosContent() {
  const searchParams = useSearchParams();
  const [presupuestos, setPresupuestos] = useState<PresupuestoRecord[]>([]);
  const [solicitudesPool, setSolicitudesPool] = useState<SolicitudCandidate[]>([]);
  const [catalogoProductos, setCatalogoProductos] = useState<CatalogProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [filtroEstado, setFiltroEstado] = useState<string>("TODOS");
  const [busqueda, setBusqueda] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [calculandoPricing, setCalculandoPricing] = useState(false);

  // Controlador Canónico Único de Ciclo de Vida del Editor
  const lifecycleRef = useRef<BudgetEditorLifecycleController>(new BudgetEditorLifecycleController());
  const [editorState, setEditorState] = useState<BudgetEditorState>(() => lifecycleRef.current.getState());

  useEffect(() => {
    return lifecycleRef.current.subscribe((newState) => {
      setEditorState(newState);
    });
  }, []);

  const {
    modalOpen,
    leadData,
    resolvedSolicitudId,
    resolvedCollection,
    candidatosVinculacion,
    selectedProductoId,
    selectedPlazo,
    senaPesos,
    pricingResult,
    persistedBudget,
    confirmarCrearNueva,
    sourceMode,
    manualDraft,
    manualPlazoSeleccionado,
    manualAnticipoPesos,
    budgetItems,
    editingItemId,
  } = editorState as {
    modalOpen: boolean;
    leadData: LeadData;
    resolvedSolicitudId: string | null;
    resolvedCollection: "solicitudes_cuenta" | "solicitudes" | null;
    candidatosVinculacion: SolicitudCandidate[];
    selectedProductoId: string;
    selectedPlazo: number;
    senaPesos: string;
    pricingResult: CanonicalPricingSnapshot | null;
    persistedBudget: PresupuestoRecord | null;
    confirmarCrearNueva: boolean;
    sourceMode: "CATALOGO" | "MANUAL_PRESUPUESTO";
    manualDraft: ManualProductInput;
    manualPlazoSeleccionado: number;
    manualAnticipoPesos: string;
    budgetItems: InternalBudgetItem[];
    editingItemId: string | null;
  };

  const fetchPresupuestos = async () => {
    setLoading(true);
    try {
      const allPresupuestos: PresupuestoRecord[] = [];
      const pool: SolicitudCandidate[] = [];

      const parseSchemaVersion = (
        val: unknown
      ): "CANONICAL_V1" | "MANUAL_FACTOR_V1" | "MIXED_V1" | undefined => {
        if (val === "CANONICAL_V1" || val === "MANUAL_FACTOR_V1" || val === "MIXED_V1") {
          return val;
        }
        return undefined;
      };

      // 1. Fetch de solicitudes_cuenta
      const snapAperturas = await getDocs(collection(db, "solicitudes_cuenta"));
      snapAperturas.forEach((d) => {
        const rawData = (d.data() || {}) as Record<string, unknown>;
        const presupList = (Array.isArray(rawData.presupuestos) ? rawData.presupuestos : []) as Array<Record<string, unknown>>;
        const nombreCliente = String(rawData.nombreCompleto || rawData.nombre || "Cliente Sin Nombre");
        const dniCliente = String(rawData.numeroDni || rawData.dni || "-");
        const telCliente = String(rawData.whatsapp || rawData.telefono || "-");
        const locCliente = String(rawData.direccion || rawData.localidad || "-");

        pool.push({
          id: d.id,
          sourceCollection: "solicitudes_cuenta",
          nombreCompleto: nombreCliente,
          numeroDni: dniCliente !== "-" ? dniCliente : undefined,
          whatsapp: telCliente !== "-" ? telCliente : undefined,
          productoNombre: rawData.productoNombre ? String(rawData.productoNombre) : undefined,
          necesidad: rawData.necesidad ? String(rawData.necesidad) : undefined,
          productoDeseado: rawData.productoDeseado ? String(rawData.productoDeseado) : undefined,
          fechaCreacion: rawData.fechaCreacion || rawData.fecha,
          fechaIso: rawData.fechaIso ? String(rawData.fechaIso) : undefined
        });

        if (presupList.length > 0) {
          presupList.forEach((p) => {
            allPresupuestos.push({
              id: String(p.id || "pres_" + d.id),
              pricingSchemaVersion: parseSchemaVersion(p.pricingSchemaVersion),
              pricingMode: parseSchemaVersion(p.pricingMode ?? p.pricingSchemaVersion),
              solicitudId: d.id,
              solicitudTipo: "apertura",
              clienteNombre: nombreCliente,
              clienteDni: dniCliente,
              clienteWhatsapp: telCliente,
              clienteLocalidad: locCliente,
              producto: p.producto ? String(p.producto) : undefined,
              items: Array.isArray(p.items) ? (p.items as PresupuestoOpcion[]) : undefined,
              estado: p.estado ? String(p.estado) : "Generado",
              notas: p.notas ? String(p.notas) : undefined,
              contado: Number(p.contado) || undefined,
              cuotas: Number(p.cuotas) || undefined,
              valorCuota: Number(p.valorCuota) || undefined,
              costoProveedor: Number(p.costoProveedor) || undefined,
              capitalCompraCentavos: Number(p.capitalCompraCentavos) || undefined,
              valorTotalContractualCentavos: Number(p.valorTotalContractualCentavos) || undefined,
              cuotaMensualBaseCentavos: Number(p.cuotaMensualBaseCentavos) || undefined,
              tnaInternaAplicada: Number(p.tnaInternaAplicada) || undefined,
              alicuotaIvaAplicada: Number(p.alicuotaIvaAplicada) || undefined,
              factorDerivado: Number(p.factorDerivado) || undefined,
              snapshotCanonico: p.snapshotCanonico as CanonicalPricingSnapshot | undefined,
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
            items: [],
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

        pool.push({
          id: d.id,
          sourceCollection: "solicitudes",
          nombreCompleto: nombreCliente,
          numeroDni: dniCliente !== "-" ? dniCliente : undefined,
          whatsapp: telCliente !== "-" ? telCliente : undefined,
          productoNombre: rawData.productoDeseado ? String(rawData.productoDeseado) : undefined,
          necesidad: rawData.necesidad ? String(rawData.necesidad) : undefined,
          fechaCreacion: rawData.fechaCreacion,
          fechaIso: rawData.fechaIso ? String(rawData.fechaIso) : undefined
        });

        presupList.forEach((p) => {
          const pId = String(p.id || "pres_" + d.id);
          if (!allPresupuestos.some((existing) => existing.id === pId && existing.solicitudId === d.id)) {
            allPresupuestos.push({
              id: pId,
              pricingSchemaVersion: parseSchemaVersion(p.pricingSchemaVersion),
              pricingMode: parseSchemaVersion(p.pricingMode ?? p.pricingSchemaVersion),
              solicitudId: d.id,
              solicitudTipo: "estandar",
              clienteNombre: nombreCliente,
              clienteDni: dniCliente,
              clienteWhatsapp: telCliente,
              clienteLocalidad: locCliente,
              producto: p.producto ? String(p.producto) : undefined,
              items: Array.isArray(p.items) ? (p.items as PresupuestoOpcion[]) : undefined,
              estado: p.estado ? String(p.estado) : "Generado",
              notas: p.notas ? String(p.notas) : undefined,
              contado: Number(p.contado) || undefined,
              cuotas: Number(p.cuotas) || undefined,
              valorCuota: Number(p.valorCuota) || undefined,
              costoProveedor: Number(p.costoProveedor) || undefined,
              capitalCompraCentavos: Number(p.capitalCompraCentavos) || undefined,
              valorTotalContractualCentavos: Number(p.valorTotalContractualCentavos) || undefined,
              cuotaMensualBaseCentavos: Number(p.cuotaMensualBaseCentavos) || undefined,
              tnaInternaAplicada: Number(p.tnaInternaAplicada) || undefined,
              alicuotaIvaAplicada: Number(p.alicuotaIvaAplicada) || undefined,
              factorDerivado: Number(p.factorDerivado) || undefined,
              snapshotCanonico: p.snapshotCanonico as CanonicalPricingSnapshot | undefined,
              fechaObjeto: parseAnyDate(p.fechaIso || p.fecha || rawData.fechaCreacion)
            });
          }
        });
      });

      // 3. Fetch de Catálogo de Productos
      const snapProd = await getDocs(collection(db, "productos"));
      const prods: CatalogProduct[] = [];
      snapProd.forEach((d) => {
        const pData = d.data();
        const rawPlazos = pData.plazosHabilitados || pData.plazosHabilitadosProducto;
        let plazos = Array.isArray(rawPlazos) 
          ? rawPlazos.map(Number).filter((n: number) => !isNaN(n) && n > 0)
          : [];
        if (plazos.length === 0 && pData.planesActivos && typeof pData.planesActivos === "object") {
          plazos = Object.entries(pData.planesActivos as Record<string, boolean>)
            .filter(([, act]) => Boolean(act))
            .map(([k]) => Number(k))
            .filter((n) => !isNaN(n) && n > 0)
            .sort((a, b) => a - b);
        }
        prods.push({
          id: d.id,
          nombre: String(pData.nombre || ""),
          costoProducto: Number(pData.costoProducto) || 0,
          plazosHabilitados: plazos,
          codigoProducto: pData.codigoProducto ? String(pData.codigoProducto) : null,
          descripcion: pData.descripcion ? String(pData.descripcion) : "",
          imagenUrl: pData.imagenUrl ? String(pData.imagenUrl) : "",
          proveedor: pData.proveedor ? String(pData.proveedor) : "",
        });
      });
      setCatalogoProductos(prods);

      allPresupuestos.sort((a, b) => (b.fechaObjeto?.getTime() ?? 0) - (a.fechaObjeto?.getTime() ?? 0));
      setPresupuestos(allPresupuestos);
      setSolicitudesPool(pool);
      setDataLoaded(true);
    } catch (e: unknown) {
      console.error("Error al cargar presupuestos:", e);
      setDataLoaded(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPresupuestos();
  }, []);

  // Procesar Query Parameters de Alerta y Resolver Vinculación Determinística mediante Controller Canónico
  useEffect(() => {
    const qParam = searchParams.get("q");
    if (qParam && !busqueda) {
      setBusqueda(qParam);
    }

    const currentQueryKey = searchParams.toString();
    const lifecycle = lifecycleRef.current;

    const initialized = lifecycle.handleQueryOrDataChange({
      queryKey: currentQueryKey,
      searchParams,
      dataLoaded,
      solicitudesPool,
      catalogoProductos
    });

    if (!initialized) {
      return;
    }

    const solId = searchParams.get("solicitudId") || "";
    const altId = searchParams.get("alertaId") || "";

    if (solId) {
      if (!lifecycle.getState().resolvedSolicitudId) {
        lifecycle.beginAsyncResolution(currentQueryKey);
        (async () => {
          try {
            const snapCuenta = await getDoc(doc(db, "solicitudes_cuenta", solId));
            if (!lifecycle.isAsyncQueryValid(currentQueryKey)) return;
            if (snapCuenta.exists()) {
              lifecycle.applyAsyncSolicitudResolution(currentQueryKey, solId, "solicitudes_cuenta");
              return;
            }
            const snapStd = await getDoc(doc(db, "solicitudes", solId));
            if (!lifecycle.isAsyncQueryValid(currentQueryKey)) return;
            if (snapStd.exists()) {
              lifecycle.applyAsyncSolicitudResolution(currentQueryKey, solId, "solicitudes");
              return;
            }
            lifecycle.applyAsyncSolicitudResolution(currentQueryKey, null, null);
          } catch {
            if (!lifecycle.isAsyncQueryValid(currentQueryKey)) return;
            lifecycle.applyAsyncSolicitudResolution(currentQueryKey, null, null);
          }
        })();
      }
    } else if (altId) {
      lifecycle.beginAsyncResolution(currentQueryKey);
      (async () => {
        let realFechaCreacion: unknown = null;
        try {
          const altSnap = await getDoc(doc(db, "alertas_admin", altId));
          if (altSnap.exists()) {
            const altData = altSnap.data();
            realFechaCreacion = altData.fechaCreacion || altData.fecha || null;
          }
        } catch {
          realFechaCreacion = null;
        }
        if (!lifecycle.isAsyncQueryValid(currentQueryKey)) return;
        lifecycle.applyAsyncLegacyAlertResolution(currentQueryKey, realFechaCreacion, solicitudesPool);
      })();
    }
  }, [searchParams, dataLoaded, solicitudesPool, catalogoProductos, busqueda]);

  const handleCerrarModal = () => {
    lifecycleRef.current.closeModal();
    if (typeof window !== "undefined" && window.history && window.history.replaceState) {
      window.history.replaceState({}, "", "/admin/presupuestos");
    }
  };

  const abrirModalNuevo = () => {
    lifecycleRef.current.openNewManual();
  };

  const abrirModalConfeccion = (item: PresupuestoRecord) => {
    const mappedItems = Array.isArray(item.items)
      ? item.items.map((op, i) => mapOpcionToInternalBudgetItem(op, i))
      : [];
    lifecycleRef.current.openExistingBudget({
      id: item.id,
      solicitudId: item.solicitudId || "",
      solicitudTipo: item.solicitudTipo,
      clienteNombre: item.clienteNombre,
      clienteDni: item.clienteDni,
      clienteWhatsapp: item.clienteWhatsapp,
      clienteLocalidad: item.clienteLocalidad,
      producto: item.producto || "",
      notas: item.notas || "",
      cuotas: item.cuotas || 0,
      pricingSchemaVersion: item.pricingSchemaVersion,
      snapshotCanonico: item.snapshotCanonico,
      catalogoProductos: catalogoProductos,
      items: mappedItems,
    }, item);
  };

  const selectedProductoObj = catalogoProductos.find((p) => p.id === selectedProductoId);
  const isProductoConfigurado = Boolean(
    selectedProductoObj && 
    selectedProductoObj.costoProducto > 0 && 
    selectedProductoObj.plazosHabilitados.length > 0
  );

  // Cálculo reactivo para el formulario de producto manual (MANUAL_FACTOR_V1)
  const manualLivePricing = calculateManualProductPricing({
    costoProducto: manualDraft.costoProducto,
    precioContado: manualDraft.precioContado,
    factoresPlanes: manualDraft.factoresPlanes,
    planesActivos: manualDraft.planesActivos,
    plazoSeleccionado: manualPlazoSeleccionado,
    anticipo: Math.max(0, Math.round(Number(manualAnticipoPesos) || 0)),
  });

  const isManualDraftReady = Boolean(
    manualDraft.nombre.trim().length > 0 && Number(manualDraft.costoProducto) > 0
  );

  const canSaveBudget = Boolean(
    budgetItems.length > 0 ||
    (sourceMode === "CATALOGO" && pricingResult) ||
    (sourceMode === "MANUAL_PRESUPUESTO" && isManualDraftReady)
  );

  const handleCalcularPricing = async () => {
    if (!selectedProductoObj || selectedProductoObj.costoProducto <= 0) {
      alert("Debe seleccionar un producto con costo de compra configurado.");
      return;
    }
    if (!selectedPlazo || !selectedProductoObj.plazosHabilitados.includes(selectedPlazo)) {
      alert("Debe seleccionar un plazo de cuotas habilitado para el producto.");
      return;
    }

    setCalculandoPricing(true);
    try {
      const user = auth.currentUser;
      const token = user ? await user.getIdToken() : "";

      const response = await fetch("/api/admin/calcular-pricing", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          productoId: selectedProductoObj.id,
          plazoMeses: selectedPlazo,
          senaMonto: Number(senaPesos) || 0
        })
      });

      const data = await response.json();
      if (!response.ok || !data.ok) {
        alert("Error al calcular pricing canónico: " + (data.error || "Falla de cálculo"));
        lifecycleRef.current.setPricingResult(null);
        return;
      }

      lifecycleRef.current.setPricingResult(data.resultado);
    } catch (err: unknown) {
      console.error("Error al calcular pricing:", err);
      alert("Error de conexión al servidor de pricing.");
    } finally {
      setCalculandoPricing(false);
    }
  };

  const handleIncorporarOpcionCatalogo = () => {
    if (!selectedProductoObj || !pricingResult) {
      alert("Primero calcule el pricing canónico (CANONICAL_V1) para incorporar esta opción.");
      return;
    }
    const item = createCatalogBudgetItem({
      itemId: editingItemId || undefined,
      productoId: selectedProductoObj.id,
      nombre: selectedProductoObj.nombre,
      codigo: selectedProductoObj.codigoProducto || null,
      descripcion: selectedProductoObj.descripcion || "",
      imagenUrl: selectedProductoObj.imagenUrl || "",
      proveedor: selectedProductoObj.proveedor || null,
      costoProveedor: Math.round(pricingResult.capitalCompraCentavos / 100),
      cantidad: 1,
      precioContado: Math.round(pricingResult.capitalCompraCentavos / 100),
      cuotas: pricingResult.plazoMeses,
      valorCuota: Math.round(pricingResult.cuotaMensualBaseCentavos / 100),
      anticipo: Math.round((pricingResult.senaMontoCentavos || 0) / 100),
      totalFinanciado: Math.round(pricingResult.valorTotalContractualCentavos / 100),
      tnaNominalAnual: pricingResult.tnaInternaAplicada,
      pricingSnapshot: pricingResult as unknown as Record<string, unknown>,
    });
    lifecycleRef.current.addOrUpdateBudgetItem(item, true);
  };

  const handleConfirmarOpcionManual = (startNewAfter = true) => {
    if (!isManualDraftReady) {
      alert("Ingrese el nombre del producto y un costo proveedor mayor a $0.");
      return;
    }
    lifecycleRef.current.commitManualDraftToBudgetItems(startNewAfter);
  };

  const buildEffectiveItemsForSave = (): InternalBudgetItem[] => {
    let list = [...budgetItems];

    if (sourceMode === "MANUAL_PRESUPUESTO" && isManualDraftReady) {
      const anticipoNum = Math.max(0, Math.round(Number(manualAnticipoPesos) || 0));
      const draftItem = createManualBudgetItem({
        itemId: editingItemId || undefined,
        input: manualDraft,
        plazoSeleccionado: manualPlazoSeleccionado,
        anticipo: anticipoNum,
        cantidad: 1,
      });

      if (editingItemId) {
        list = list.map((it) => (it.itemId === editingItemId ? draftItem : it));
      } else {
        list.push(draftItem);
      }
    } else if (sourceMode === "CATALOGO" && pricingResult && selectedProductoObj) {
      const catItem = createCatalogBudgetItem({
        itemId: editingItemId || undefined,
        productoId: selectedProductoObj.id,
        nombre: selectedProductoObj.nombre,
        codigo: selectedProductoObj.codigoProducto || null,
        descripcion: selectedProductoObj.descripcion || "",
        imagenUrl: selectedProductoObj.imagenUrl || "",
        proveedor: selectedProductoObj.proveedor || null,
        costoProveedor: Math.round(pricingResult.capitalCompraCentavos / 100),
        cantidad: 1,
        precioContado: Math.round(pricingResult.capitalCompraCentavos / 100),
        cuotas: pricingResult.plazoMeses,
        valorCuota: Math.round(pricingResult.cuotaMensualBaseCentavos / 100),
        anticipo: Math.round((pricingResult.senaMontoCentavos || 0) / 100),
        totalFinanciado: Math.round(pricingResult.valorTotalContractualCentavos / 100),
        tnaNominalAnual: pricingResult.tnaInternaAplicada,
        pricingSnapshot: pricingResult as unknown as Record<string, unknown>,
      });

      if (editingItemId) {
        list = list.map((it) => (it.itemId === editingItemId ? catItem : it));
      } else if (list.length === 0) {
        list.push(catItem);
      }
    }

    return list;
  };

  const handleGuardarPresupuesto = async () => {
    const finalItems = buildEffectiveItemsForSave();

    if (finalItems.length === 0) {
      alert("Debe configurar al menos un producto/opción (de catálogo o manual) antes de guardar el presupuesto.");
      return;
    }
    if (!leadData.nombre && !leadData.telefono) {
      alert("Por favor ingrese al menos el nombre o teléfono del cliente.");
      return;
    }
    if (!resolvedSolicitudId && !confirmarCrearNueva) {
      alert("Solicitud original no vinculada automáticamente. Seleccione una solicitud candidata o confirme la creación explícita.");
      return;
    }

    setSaving(true);
    try {
      // 1. Si algún producto manual tiene `guardarEnCatalogo === true`, crearlo en colección `productos`
      //    usando exactamente el esquema del Gestor de Productos e impidiendo duplicados en reintentos.
      const itemsWithCatalogIds: InternalBudgetItem[] = [];
      let existingCatalogDocsCache: Array<{
        id: string;
        codigoProducto?: string | null;
        nombre?: string | null;
        costoProducto?: number | null;
      }> | null = null;

      for (const item of finalItems) {
        if (item.source === "MANUAL_PRESUPUESTO" && item.guardarEnCatalogo && !item.productoId && item.manualProductSnapshot) {
          const snap = item.manualProductSnapshot;
          const manualInputForCatalog: ManualProductInput = {
            codigoProducto: snap.codigo || "",
            nombre: snap.nombre,
            marca: snap.marca || "",
            modelo: snap.modelo || "",
            categoria: snap.categoria || "",
            descripcion: snap.descripcion || "",
            imagenUrl: snap.imagen || "",
            imagenUrls: snap.imagenUrls || [],
            costoProducto: snap.costoProveedor,
            precioContado: snap.precioContado,
            precioAnterior: snap.precioAnterior,
            tasaInteresTna: snap.tasaInteresTna,
            tasaMora: snap.tasaMora,
            proveedor: snap.proveedor || "",
            factoresPlanes: snap.factoresAplicados,
            planesActivos: snap.planesActivos,
            guardarEnCatalogo: true,
          };

          if (!existingCatalogDocsCache) {
            const pSnap = await getDocs(collection(db, "productos"));
            existingCatalogDocsCache = pSnap.docs.map((d) => ({
              id: d.id,
              ...(d.data() as {
                codigoProducto?: string | null;
                nombre?: string | null;
                costoProducto?: number | null;
              }),
            }));
          }

          const duplicateId = findExistingCatalogDuplicate(existingCatalogDocsCache, manualInputForCatalog);
          if (duplicateId) {
            itemsWithCatalogIds.push({
              ...item,
              productoId: duplicateId,
            });
          } else {
            const catalogPayload = buildCatalogPayloadFromManualProduct(manualInputForCatalog);
            const newProdRef = await addDoc(collection(db, "productos"), catalogPayload);
            existingCatalogDocsCache.push({
              id: newProdRef.id,
              codigoProducto: catalogPayload.codigoProducto,
              nombre: catalogPayload.nombre,
              costoProducto: catalogPayload.costoProducto,
            });
            itemsWithCatalogIds.push({
              ...item,
              productoId: newProdRef.id,
            });
          }
        } else {
          itemsWithCatalogIds.push(item);
        }
      }

      // 2. Determinar modo de pricing explícito sin mezclar silenciosamente con CANONICAL_V1
      const hasCatalog = itemsWithCatalogIds.some((i) => i.pricingMode === "CANONICAL_V1");
      const hasManual = itemsWithCatalogIds.some((i) => i.pricingMode === "MANUAL_FACTOR_V1");
      const schemaVersion: "CANONICAL_V1" | "MANUAL_FACTOR_V1" | "MIXED_V1" =
        hasCatalog && hasManual
          ? "MIXED_V1"
          : hasManual
            ? "MANUAL_FACTOR_V1"
            : "CANONICAL_V1";

      const primaryItem = itemsWithCatalogIds[0];
      const serializedOptions: PresupuestoOpcion[] = itemsWithCatalogIds.map((it) => ({
        itemId: it.itemId,
        source: it.source,
        pricingMode: it.pricingMode,
        productoId: it.productoId,
        producto: it.nombre,
        nombre: it.nombre,
        codigo: it.codigo ?? null,
        marca: it.marca ?? null,
        modelo: it.modelo ?? null,
        categoria: it.categoria ?? null,
        descripcion: it.descripcion || "",
        imagenUrl: it.imagenUrl || "",
        imagenUrls: it.imagenUrls || [],
        cantidad: it.cantidad,
        contado: it.precioContado,
        precioContado: it.precioContado,
        costoProveedor: it.costoProveedor ?? null,
        proveedor: it.proveedor ?? null,
        cuotas: it.cuotas,
        factor: it.factorAplicado ?? null,
        factorAplicado: it.factorAplicado ?? null,
        valorCuota: it.valorCuota,
        anticipo: it.anticipo,
        totalFinanciado: it.totalFinanciado,
        margenEstimado: it.margenEstimado ?? null,
        tnaInternaAplicada: it.tnaInternaAplicada ?? null,
        observacionesComerciales: it.observacionesComerciales ?? null,
        observacionesInternas: it.observacionesInternas ?? null,
        guardarEnCatalogo: Boolean(it.guardarEnCatalogo),
        capitalCentavos: Math.round((it.costoProveedor || 0) * 100),
        totalCentavos: Math.round((it.totalFinanciado || 0) * 100),
        pricingSnapshot: it.pricingSnapshot ?? null,
        manualProductSnapshot: it.manualProductSnapshot ?? null,
      }));

      const resumenProducto =
        itemsWithCatalogIds.length === 1
          ? primaryItem.nombre
          : `${primaryItem.nombre} (+${itemsWithCatalogIds.length - 1} ${itemsWithCatalogIds.length - 1 === 1 ? "opción" : "opciones"})`;

      const nuevoPresupuesto: PresupuestoRecord = {
        id: persistedBudget?.id || "pres_" + Date.now(),
        pricingSchemaVersion: schemaVersion,
        pricingMode: schemaVersion,
        producto: resumenProducto,
        solicitudId: resolvedSolicitudId || undefined,
        clienteNombre: leadData.nombre || "Cliente Sin Nombre",
        clienteDni: leadData.dni || "-",
        clienteWhatsapp: leadData.telefono || "-",
        clienteLocalidad: leadData.localidad || "-",
        costoProveedor: primaryItem.costoProveedor || 0,
        capitalCompraCentavos: Math.round((primaryItem.costoProveedor || 0) * 100),
        plazoMeses: primaryItem.cuotas,
        cuotas: primaryItem.cuotas,
        valorCuota: primaryItem.valorCuota,
        cuotaMensualBaseCentavos: Math.round(primaryItem.valorCuota * 100),
        valorTotalContractualCentavos: Math.round(primaryItem.totalFinanciado * 100),
        contado: primaryItem.precioContado,
        ...(schemaVersion === "CANONICAL_V1" && pricingResult
          ? {
              tnaInternaAplicada: pricingResult.tnaInternaAplicada,
              alicuotaIvaAplicada: pricingResult.alicuotaIvaAplicada,
              factorDerivado: pricingResult.factorDerivado,
              snapshotCanonico: pricingResult,
            }
          : {}),
        items: serializedOptions,
        notas: leadData.notas || "",
        fechaObjeto: new Date(),
        estado: "Generado"
      };

      let persistSuccess = false;
      let targetDocId: string | null = resolvedSolicitudId;
      let targetCollection = resolvedCollection;

      if (!targetDocId && confirmarCrearNueva) {
        const newRef = await addDoc(collection(db, "solicitudes_cuenta"), {
          tipo: "contacto_rapido",
          nombreCompleto: leadData.nombre,
          numeroDni: leadData.dni || "",
          whatsapp: leadData.telefono || "",
          direccion: leadData.localidad || "",
          localidad: leadData.localidad || "",
          productoNombre: resumenProducto,
          estado: "Presupuestado",
          fecha: serverTimestamp(),
          fechaCreacion: serverTimestamp(),
          fechaIso: new Date().toISOString(),
          presupuestos: [nuevoPresupuesto]
        });
        targetDocId = newRef.id;
        targetCollection = "solicitudes_cuenta";
        persistSuccess = true;
      } else if (targetDocId && targetCollection) {
        const docRef = doc(db, targetCollection, targetDocId);
        const snap = await getDoc(docRef);
        if (!snap.exists()) {
          lifecycleRef.current.setPersistedBudget(null);
          alert("Error: La solicitud vinculada ya no existe o no pudo verificarse.");
          return;
        }
        const data = snap.data();
        const existingPresup: PresupuestoRecord[] = data.presupuestos || [];
        const alreadyInList = existingPresup.some((ep) => ep.id === nuevoPresupuesto.id);
        const updatedPresupList = alreadyInList
          ? existingPresup.map((ep) => (ep.id === nuevoPresupuesto.id ? nuevoPresupuesto : ep))
          : [...existingPresup, nuevoPresupuesto];
        await updateDoc(docRef, {
          presupuestos: updatedPresupList,
          estado: "Presupuestado"
        });
        persistSuccess = true;
      } else {
        lifecycleRef.current.setPersistedBudget(null);
        alert("Error: La solicitud vinculada ya no existe o no pudo verificarse.");
        return;
      }

      if (!persistSuccess) {
        lifecycleRef.current.setPersistedBudget(null);
        alert("Error: No se pudo confirmar la persistencia del presupuesto.");
        return;
      }

      nuevoPresupuesto.solicitudId = targetDocId || undefined;
      lifecycleRef.current.startAddingAnotherProduct(sourceMode);
      lifecycleRef.current.setBudgetItems(itemsWithCatalogIds);
      lifecycleRef.current.setPersistedBudget(nuevoPresupuesto);
      lifecycleRef.current.setResolvedCandidate(targetDocId, targetCollection);
      await fetchPresupuestos();
      alert(`¡Presupuesto guardado exitosamente (${schemaVersion})! Ahora puede descargar el PDF o enviar por WhatsApp.`);
    } catch (err: unknown) {
      console.error("Error al guardar presupuesto:", err);
      alert("Error al guardar el presupuesto.");
    } finally {
      setSaving(false);
    }
  };

  /**
   * Genera el PDF del presupuesto pasando EXCLUSIVAMENTE por el mapper allowlist `toClientBudgetPayload`.
   * Ningún dato interno (costoProveedor, proveedor, factor, margen, TNA) puede llegar al PDF.
   */
  const handleDescargarPdf = (p: PresupuestoRecord) => {
    const rawItems =
      p.items && p.items.length > 0
        ? p.items
        : p.producto
          ? [
              {
                nombre: p.producto,
                precioContado: p.contado || 0,
                cuotas: p.cuotas || 12,
                valorCuota: p.valorCuota || 0,
                totalFinanciado: (p.cuotas || 12) * (p.valorCuota || 0),
              },
            ]
          : [];

    const { datosPdf } = buildSanitizedPdfDatosFromBudget({
      nroPresupuesto: p.id ? p.id.replace("pres_", "").substring(0, 8).toUpperCase() : "S/D",
      fechaEmision: p.fechaObjeto
        ? p.fechaObjeto.toLocaleDateString("es-AR")
        : new Date().toLocaleDateString("es-AR"),
      clienteNombre: p.clienteNombre || "Cliente",
      clienteDni: p.clienteDni || "-",
      clienteTelefono: p.clienteWhatsapp || "-",
      clienteLocalidad: p.clienteLocalidad || "-",
      items: rawItems as Array<Record<string, unknown>>,
      notasComercialesPublicas: null,
    });

    generarPdfPresupuesto(datosPdf);
  };

  /**
   * Genera el mensaje de WhatsApp EXCLUSIVAMENTE desde el snapshot público sanitizado (`toClientBudgetPayload`).
   */
  const handleEnviarWhatsApp = async () => {
    if (!persistedBudget) {
      alert("Debe guardar el presupuesto antes de enviarlo por WhatsApp.");
      return;
    }
    const tel = (leadData.telefono || "").replace(/\D/g, "");
    if (!tel) {
      alert("Ingrese un número de teléfono válido para enviar WhatsApp.");
      return;
    }

    const rawItems =
      persistedBudget.items && persistedBudget.items.length > 0
        ? persistedBudget.items
        : persistedBudget.producto
          ? [
              {
                nombre: persistedBudget.producto,
                precioContado: persistedBudget.contado || 0,
                cuotas: persistedBudget.cuotas || 12,
                valorCuota: persistedBudget.valorCuota || 0,
                totalFinanciado:
                  (persistedBudget.cuotas || 12) * (persistedBudget.valorCuota || 0),
              },
            ]
          : [];

    const clientSafePayload = toClientBudgetPayload({
      nroPresupuesto: persistedBudget.id
        ? persistedBudget.id.replace("pres_", "").substring(0, 8).toUpperCase()
        : "S/N",
      fechaEmision: new Date().toLocaleDateString("es-AR"),
      clienteNombre: leadData.nombre || persistedBudget.clienteNombre || "Cliente",
      clienteDni: leadData.dni || persistedBudget.clienteDni || "",
      clienteTelefono: leadData.telefono || persistedBudget.clienteWhatsapp || "",
      clienteLocalidad: leadData.localidad || persistedBudget.clienteLocalidad || "",
      items: rawItems as Array<Record<string, unknown>>,
    });

    const msg = buildClientWhatsAppMessage(clientSafePayload);
    if (typeof window !== "undefined") {
      (window as unknown as Record<string, unknown>).__LAST_WHATSAPP_MESSAGE__ = msg;
    }
    const wame = `https://wa.me/${tel}?text=${encodeURIComponent(msg)}`;

    // Transición de estado a Enviado si está vinculado
    if (resolvedSolicitudId && resolvedCollection) {
      try {
        const docRef = doc(db, resolvedCollection, resolvedSolicitudId);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const presList = (snap.data().presupuestos || []).map((p: PresupuestoRecord) => 
            p.id === persistedBudget.id ? { ...p, estado: "Enviado" } : p
          );
          await updateDoc(docRef, { presupuestos: presList });
          lifecycleRef.current.setPersistedBudget({ ...persistedBudget, estado: "Enviado" });
          fetchPresupuestos();
        }
      } catch { /* ignore */ }
    }

    window.open(wame, "_blank");
  };

  const presupuestosFiltrados = presupuestos.filter((p) => {
    const estadoMatch =
      filtroEstado === "TODOS" ? true :
      filtroEstado === "ACEPTADO" ? (p.estado === "Aceptado" || p.estado === "Aprobado") :
      filtroEstado === "RECHAZADO" ? p.estado === "Rechazado" :
      filtroEstado === "PENDIENTE" ? (p.estado === "Pendiente" || !p.estado || p.estado === "Generado" || p.estado === "Borrador") :
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
        <AdminNav title="Historial de Presupuestos" subtitle="Gestión comercial de cotizaciones de catálogo (CANONICAL_V1) y opciones manuales fuera de catálogo (MANUAL_FACTOR_V1)" />

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
              { key: "PENDIENTE", label: "🟡 Pendientes / Generados" },
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
              className="w-full md:w-auto inline-flex items-center justify-center gap-2 bg-[#173E3B] hover:bg-[#123230] text-white px-4 py-2.5 rounded-xl text-xs font-heading font-bold transition-all shadow-xs cursor-pointer"
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
              const isGenerado = p.estado === "Generado";
              const isEnviado = p.estado === "Enviado";

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

                      {p.pricingSchemaVersion === "CANONICAL_V1" && (
                        <span className="text-[10px] font-heading font-bold px-2 py-0.5 rounded-full uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300">
                          🛡️ CANONICAL_V1
                        </span>
                      )}
                      {p.pricingSchemaVersion === "MANUAL_FACTOR_V1" && (
                        <span className="text-[10px] font-heading font-bold px-2 py-0.5 rounded-full uppercase tracking-wider bg-indigo-100 text-indigo-800 border border-indigo-300">
                          ⚙️ MANUAL_FACTOR_V1
                        </span>
                      )}
                      {p.pricingSchemaVersion === "MIXED_V1" && (
                        <span className="text-[10px] font-heading font-bold px-2 py-0.5 rounded-full uppercase tracking-wider bg-purple-100 text-purple-800 border border-purple-300">
                          🔀 MIXED (CATÁLOGO + MANUAL)
                        </span>
                      )}
                      
                      <span className={`text-[10px] font-heading font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider border ${
                        isAceptado ? "bg-[#2F7D5C]/15 text-[#2F7D5C] border-[#2F7D5C]/30" :
                        isRechazado ? "bg-rose-100 text-rose-700 border-rose-200" :
                        isCancelado ? "bg-gray-100 text-[#68706E] border-gray-200" :
                        isEnviado ? "bg-blue-100 text-blue-800 border-blue-200" :
                        isGenerado ? "bg-amber-100 text-amber-800 border-amber-300" :
                        "bg-[#E7B86A]/20 text-[#8F6211] border-[#E7B86A]/50"
                      }`}>
                        {isAceptado ? "🟢 Aceptado" : isRechazado ? "🔴 Rechazado" : isCancelado ? "🗑️ Cancelado" : isEnviado ? "📤 Enviado" : isGenerado ? "📝 Generado" : "🟡 Pendiente"}
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
                              <span className="text-[10px] font-heading font-bold text-[#B44E2A] mr-1.5">
                                Opción {itemIdx + 1}:
                              </span>
                            )}
                            <span className="font-heading font-bold text-[#173E3B]">{it.producto || it.nombre}</span>
                            {it.cuotas && it.valorCuota && it.valorCuota > 0 ? (
                              <span className="text-[#68706E] ml-2 font-sans">
                                ({it.cuotas} cuotas de <strong className="text-[#2F7D5C] font-mono">${it.valorCuota.toLocaleString("es-AR")}</strong>)
                              </span>
                            ) : (
                              <span className="text-amber-700 ml-2 font-sans italic">
                                (Cotización pendiente)
                              </span>
                            )}
                          </div>
                          {(it.costoProveedor ?? 0) > 0 && (
                            <span className="text-[10px] text-[#68706E] font-mono">
                              Costo Prov: ${it.costoProveedor?.toLocaleString("es-AR")}
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
                      <span className="text-[10px] text-[#68706E] font-heading uppercase tracking-wider font-bold block">
                        {itemsList.length > 1 ? `Cuota Opción 1 (${itemsList.length} opciones)` : "Cuota Mensual"}
                      </span>
                      <span className="text-xl font-heading font-extrabold text-[#173E3B] font-mono">
                        {(itemsList[0]?.valorCuota || totalCuota) > 0 ? `$${(itemsList[0]?.valorCuota || totalCuota).toLocaleString("es-AR")}` : "--"} <span className="text-xs font-normal text-[#68706E] font-sans">/ mes</span>
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                      <button
                        data-testid={`btn-reabrir-presupuesto-idx-${idx}`}
                        onClick={() => abrirModalConfeccion(p)}
                        className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 bg-[#173E3B] hover:bg-[#123230] text-white px-3.5 py-2 rounded-xl text-xs font-heading font-bold transition-all shadow-xs cursor-pointer"
                      >
                        ✏️ {isPendiente ? "Confeccionar" : "Editar"}
                      </button>

                      {itemsList.length > 0 && totalCuota > 0 ? (
                        <button
                          onClick={() => handleDescargarPdf(p)}
                          className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 bg-[#FFFDFC] hover:bg-[#F7F3EC] text-[#B44E2A] border border-[#DED8CF] hover:border-[#B44E2A] px-3.5 py-2 rounded-xl text-xs font-heading font-bold transition-all shadow-xs cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5" /> PDF
                        </button>
                      ) : null}

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

        {/* MODAL DE CONFECCIÓN DE PRESUPUESTO */}
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto">
            <div className="bg-[#FFFDFC] border border-[#DED8CF] rounded-3xl max-w-4xl w-full p-6 shadow-2xl space-y-6 my-8 max-h-[92vh] overflow-y-auto">
              
              {/* Header Modal */}
              <div className="flex items-center justify-between border-b border-[#DED8CF] pb-4">
                <div>
                  <h2 className="text-lg font-heading font-bold text-[#173E3B]">
                    Confeccionar Presupuesto
                  </h2>
                  <p className="text-xs text-[#68706E] font-sans">
                    Catálogo oficial (CANONICAL_V1) o productos a medida fuera de catálogo (MANUAL_FACTOR_V1) · 1..N opciones
                  </p>
                </div>
                <button
                  onClick={handleCerrarModal}
                  className="p-2 text-[#68706E] hover:text-[#173E3B] rounded-xl hover:bg-[#F7F3EC] transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* SECCIÓN 1: DATOS DEL LEAD (SEPARADA DE CONDICIONES FINANCIERAS) */}
              <div className="bg-[#F7F3EC] border border-[#DED8CF] p-4 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-heading font-bold uppercase tracking-wider text-[#173E3B] flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-[#B44E2A]" /> Datos del Lead / Solicitante
                  </span>

                  {resolvedSolicitudId ? (
                    <span className="text-[10px] font-heading font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Solicitud Vinculada ({resolvedSolicitudId.substring(0, 10)})
                    </span>
                  ) : (
                    <span className="text-[10px] font-heading font-bold text-amber-800 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> Sin Vinculación Automática
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[10px] font-heading font-bold text-[#68706E] mb-1">Nombre y Apellido</label>
                    <input
                      type="text"
                      value={leadData.nombre}
                      onChange={(e) => lifecycleRef.current.updateLeadData({ nombre: e.target.value })}
                      placeholder="Ej: Juan Perez"
                      className="w-full bg-[#FFFDFC] border border-[#DED8CF] px-3 py-2 rounded-xl text-xs font-sans text-[#1F2928] outline-none focus:border-[#173E3B]"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-heading font-bold text-[#68706E] mb-1">DNI / CUIL</label>
                    <input
                      type="text"
                      value={leadData.dni}
                      onChange={(e) => lifecycleRef.current.updateLeadData({ dni: e.target.value })}
                      placeholder="Ej: 30123456"
                      className="w-full bg-[#FFFDFC] border border-[#DED8CF] px-3 py-2 rounded-xl text-xs font-mono text-[#1F2928] outline-none focus:border-[#173E3B]"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-heading font-bold text-[#68706E] mb-1">Teléfono / WhatsApp</label>
                    <input
                      type="text"
                      value={leadData.telefono}
                      onChange={(e) => lifecycleRef.current.updateLeadData({ telefono: e.target.value })}
                      placeholder="Ej: 2364123456"
                      className="w-full bg-[#FFFDFC] border border-[#DED8CF] px-3 py-2 rounded-xl text-xs font-mono text-[#1F2928] outline-none focus:border-[#173E3B]"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-heading font-bold text-[#68706E] mb-1">Localidad</label>
                    <input
                      type="text"
                      value={leadData.localidad}
                      onChange={(e) => lifecycleRef.current.updateLeadData({ localidad: e.target.value })}
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
                    onChange={(e) => lifecycleRef.current.updateLeadData({ notas: e.target.value })}
                    placeholder="Detalles provistos por el cliente..."
                    className="w-full bg-[#FFFDFC] border border-[#DED8CF] px-3 py-2 rounded-xl text-xs font-sans text-[#1F2928] outline-none focus:border-[#173E3B]"
                  />
                </div>

                {/* GESTIÓN DE VINCULACIÓN DETERMINÍSTICA / CANDIDATOS LEGACY */}
                {!resolvedSolicitudId && (
                  <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl space-y-2">
                    <p className="text-xs font-heading font-bold text-amber-900 flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                      Solicitud original no vinculada automáticamente.
                    </p>
                    <p className="text-[11px] text-amber-800 font-sans">
                      Puede confeccionar los productos y opciones normalmente. Antes del guardado definitivo seleccione una solicitud candidata o confirme la creación explícita.
                    </p>

                    {candidatosVinculacion.length > 0 && (
                      <div>
                        <label className="block text-[10px] font-bold text-amber-900 mb-1">Candidatos identificados ({candidatosVinculacion.length}):</label>
                        <select
                          value={resolvedSolicitudId || ""}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val) {
                              const c = candidatosVinculacion.find((cand) => cand.id === val);
                              lifecycleRef.current.setResolvedCandidate(val, c?.sourceCollection || null);
                            } else {
                              lifecycleRef.current.setResolvedCandidate(null, null);
                            }
                          }}
                          className="w-full bg-white border border-amber-300 px-3 py-1.5 rounded-lg text-xs font-sans text-gray-900 outline-none"
                        >
                          <option value="">-- Seleccionar solicitud a vincular --</option>
                          {candidatosVinculacion.map((c) => (
                            <option key={c.id} value={c.id}>
                              [{c.sourceCollection}] {c.nombreCompleto || "S/N"} - DNI: {c.numeroDni || "S/D"} - Tel: {c.whatsapp || "S/T"} ({c.productoNombre || "S/P"})
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div className="pt-1 flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="checkNueva"
                        checked={confirmarCrearNueva}
                        onChange={(e) => lifecycleRef.current.setConfirmarCrearNueva(e.target.checked)}
                        className="rounded border-amber-400 text-[#173E3B] focus:ring-[#173E3B]"
                      />
                      <label htmlFor="checkNueva" className="text-xs font-bold text-amber-900 cursor-pointer">
                        Crear nueva solicitud para este lead (Confirmación explícita)
                      </label>
                    </div>
                  </div>
                )}
              </div>

              {/* SECCIÓN 2: OPCIONES YA INCORPORADAS AL PRESUPUESTO (1..N) */}
              {budgetItems.length > 0 && (
                <div className="bg-[#F7F3EC] border border-[#173E3B]/30 p-4 rounded-2xl space-y-3" data-testid="budget-items-list">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-heading font-bold uppercase tracking-wider text-[#173E3B] flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-[#B44E2A]" /> Opciones del Presupuesto ({budgetItems.length})
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        data-testid="btn-nuevo-item-catalogo"
                        onClick={() => lifecycleRef.current.startAddingAnotherProduct("CATALOGO")}
                        className="inline-flex items-center gap-1 bg-[#FFFDFC] hover:bg-white text-[#173E3B] border border-[#DED8CF] px-2.5 py-1.5 rounded-xl text-[11px] font-heading font-bold transition cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" /> + Agregar de Catálogo
                      </button>
                      <button
                        type="button"
                        data-testid="btn-nuevo-item-lista"
                        onClick={() => lifecycleRef.current.openManualProductEntry("")}
                        className="inline-flex items-center gap-1 bg-[#173E3B] hover:bg-[#123230] text-white px-3 py-1.5 rounded-xl text-[11px] font-heading font-bold transition cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" /> + Agregar producto
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {budgetItems.map((bItem, idx) => (
                      <div
                        key={bItem.itemId}
                        data-testid={`budget-option-row-${idx}`}
                        className={`p-3 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                          editingItemId === bItem.itemId
                            ? "bg-amber-50 border-amber-400"
                            : "bg-[#FFFDFC] border-[#DED8CF]"
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[11px] font-heading font-bold text-[#B44E2A] bg-[#B44E2A]/10 px-2 py-0.5 rounded-md">
                              Opción {idx + 1}
                            </span>
                            <span
                              className={`text-[10px] font-heading font-bold px-2 py-0.5 rounded-full uppercase ${
                                bItem.source === "CATALOGO"
                                  ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                                  : "bg-indigo-100 text-indigo-800 border border-indigo-300"
                              }`}
                            >
                              {bItem.source} · {bItem.pricingMode}
                            </span>
                            {bItem.guardarEnCatalogo && (
                              <span className="text-[10px] font-heading font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                                📥 Se guardará en catálogo
                              </span>
                            )}
                          </div>

                          <div className="text-xs font-heading font-bold text-[#173E3B]">
                            {[bItem.nombre, bItem.marca, bItem.modelo].filter(Boolean).join(" ")}
                            <span className="ml-2 font-mono text-[#2F7D5C]">
                              {bItem.cuotas} cuotas de ${bItem.valorCuota.toLocaleString("es-AR")}
                            </span>
                            <span className="ml-2 font-mono text-[11px] text-[#68706E] font-normal">
                              (Total: ${bItem.totalFinanciado.toLocaleString("es-AR")})
                            </span>
                          </div>

                          {/* Datos internos visibles SOLO en panel admin */}
                          <div className="text-[10px] font-mono text-[#68706E] flex flex-wrap gap-3">
                            <span>🔒 Costo Prov: ${(bItem.costoProveedor || 0).toLocaleString("es-AR")}</span>
                            {bItem.factorAplicado && <span>Factor: {bItem.factorAplicado}x</span>}
                            {bItem.proveedor && <span>Prov: {bItem.proveedor}</span>}
                            {typeof bItem.margenEstimado === "number" && (
                              <span>Margen Est: ${bItem.margenEstimado.toLocaleString("es-AR")}</span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 self-end sm:self-center">
                          <button
                            type="button"
                            data-testid={`btn-editar-item-${idx}`}
                            onClick={() => lifecycleRef.current.editBudgetItem(bItem.itemId)}
                            className="inline-flex items-center gap-1 bg-[#F7F3EC] hover:bg-[#DED8CF]/60 text-[#173E3B] px-2.5 py-1.5 rounded-lg text-[11px] font-heading font-bold transition cursor-pointer"
                          >
                            <Edit3 className="w-3 h-3" /> Editar
                          </button>
                          <button
                            type="button"
                            data-testid={`btn-duplicar-item-${idx}`}
                            onClick={() => lifecycleRef.current.duplicateOption(bItem.itemId)}
                            className="inline-flex items-center gap-1 bg-[#F7F3EC] hover:bg-[#DED8CF]/60 text-[#173E3B] px-2.5 py-1.5 rounded-lg text-[11px] font-heading font-bold transition cursor-pointer"
                          >
                            <Copy className="w-3 h-3" /> Duplicar opción
                          </button>
                          <button
                            type="button"
                            data-testid={`btn-eliminar-item-${idx}`}
                            onClick={() => lifecycleRef.current.removeBudgetItem(bItem.itemId)}
                            className="inline-flex items-center gap-1 bg-rose-50 hover:bg-rose-100 text-rose-700 px-2.5 py-1.5 rounded-lg text-[11px] font-heading font-bold transition cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" /> Eliminar
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* SECCIÓN 3: CONDICIONES COMERCIALES (CATÁLOGO O PRODUCTO MANUAL FUERA DE CATÁLOGO) */}
              <div className="bg-[#FFFDFC] border border-[#DED8CF] p-4 rounded-2xl space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#DED8CF] pb-3">
                  <span className="text-[11px] font-heading font-bold uppercase tracking-wider text-[#173E3B] flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-[#B44E2A]" /> Condiciones Comerciales
                    {editingItemId && (
                      <span className="ml-2 text-[10px] bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full">
                        Editando opción seleccionada
                      </span>
                    )}
                  </span>

                  {/* Selector explícito de Origen del Producto */}
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      data-testid="btn-mode-catalogo"
                      onClick={() => lifecycleRef.current.setSourceMode("CATALOGO")}
                      className={`px-3 py-1.5 rounded-xl text-xs font-heading font-bold border transition cursor-pointer ${
                        sourceMode === "CATALOGO"
                          ? "bg-[#173E3B] text-white border-[#173E3B]"
                          : "bg-[#FFFDFC] text-[#173E3B] border-[#DED8CF] hover:border-[#173E3B]"
                      }`}
                    >
                      Seleccionar del catálogo
                    </button>
                    <button
                      type="button"
                      data-testid="btn-mode-manual"
                      onClick={() =>
                        lifecycleRef.current.openManualProductEntry(
                          manualDraft.nombre || leadData.producto || ""
                        )
                      }
                      className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-heading font-bold border transition cursor-pointer ${
                        sourceMode === "MANUAL_PRESUPUESTO"
                          ? "bg-[#B44E2A] text-white border-[#B44E2A]"
                          : "bg-[#FFFDFC] text-[#B44E2A] border-[#B44E2A]/40 hover:border-[#B44E2A]"
                      }`}
                    >
                      <PackagePlus className="w-3.5 h-3.5" /> + Agregar producto al presupuesto
                    </button>
                  </div>
                </div>

                {sourceMode === "CATALOGO" ? (
                  <>
                    {/* Selección de Producto del Catálogo */}
                    <div>
                      <label className="block text-[10px] font-heading font-bold text-[#68706E] mb-1">
                        Producto del Catálogo {leadData.producto ? `(Solicitado por lead: "${leadData.producto}")` : ""}
                      </label>
                      <select
                        value={selectedProductoId}
                        onChange={(e) => {
                          lifecycleRef.current.setSelectedProductoId(e.target.value);
                        }}
                        className="w-full bg-[#FFFDFC] border border-[#DED8CF] px-3 py-2 rounded-xl text-xs font-heading font-bold text-[#1F2928] outline-none focus:border-[#173E3B]"
                      >
                        <option value="">-- Seleccionar producto de catálogo --</option>
                        {catalogoProductos.map((cp) => (
                          <option key={cp.id} value={cp.id}>
                            {cp.nombre} (Costo: ${cp.costoProducto.toLocaleString("es-AR")} | Plazos: {cp.plazosHabilitados.join(", ") || "Sin plazos"})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Si el producto solicitado no está en el catálogo o no se seleccionó aún */}
                    {!selectedProductoId ? (
                      <div className="bg-amber-50/90 border border-amber-200 p-5 rounded-2xl text-center space-y-3" data-testid="missing-catalog-banner">
                        <p className="text-sm font-heading font-bold text-amber-950">
                          No encontramos este producto en el catálogo.
                        </p>
                        <p className="text-xs text-amber-900 font-sans max-w-lg mx-auto">
                          {leadData.producto
                            ? `El cliente solicita "${leadData.producto}". Podés elegir un artículo existente del desplegable superior o cargar una alternativa específica para este presupuesto.`
                            : "Seleccioná un producto existente del catálogo o agregá un producto específico para cotizar en este presupuesto."}
                        </p>
                        <div className="pt-1">
                          <button
                            type="button"
                            data-testid="btn-agregar-producto-manual-lead"
                            onClick={() =>
                              lifecycleRef.current.openManualProductEntry(leadData.producto || "")
                            }
                            className="inline-flex items-center justify-center gap-2 bg-[#173E3B] hover:bg-[#123230] text-white px-5 py-2.5 rounded-xl text-xs font-heading font-bold transition shadow-sm cursor-pointer"
                          >
                            <Plus className="w-4 h-4" /> + Agregar producto al presupuesto
                          </button>
                        </div>
                      </div>
                    ) : !isProductoConfigurado ? (
                      <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl text-center space-y-2">
                        <p className="text-xs font-heading font-bold text-amber-900">
                          ⚠️ Producto pendiente de configuración de condiciones comerciales.
                        </p>
                        <p className="text-[11px] text-amber-800 font-sans">
                          El producto seleccionado no posee costo de compra positivo o plazos habilitados en el catálogo. Configure el producto o cotice como producto manual del presupuesto.
                        </p>
                        <button
                          type="button"
                          onClick={() =>
                            lifecycleRef.current.openManualProductEntry(
                              selectedProductoObj?.nombre || leadData.producto || ""
                            )
                          }
                          className="inline-flex items-center gap-1.5 bg-[#173E3B] text-white px-4 py-2 rounded-xl text-xs font-heading font-bold transition cursor-pointer"
                        >
                          + Agregar producto al presupuesto
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-4 pt-1">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div>
                            <label className="block text-[10px] font-heading font-bold text-[#68706E] mb-1">
                              Costo Proveedor / Capital ($)
                            </label>
                            <input
                              type="text"
                              disabled
                              value={`$ ${selectedProductoObj?.costoProducto.toLocaleString("es-AR")}`}
                              className="w-full bg-[#F7F3EC] border border-[#DED8CF] px-3 py-2 rounded-xl text-xs font-mono font-bold text-[#1F2928]"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-heading font-bold text-[#68706E] mb-1">
                              Plazo de Cuotas Habilitado
                            </label>
                            <select
                              value={selectedPlazo}
                              onChange={(e) => {
                                lifecycleRef.current.setSelectedPlazo(Number(e.target.value));
                              }}
                              className="w-full bg-[#FFFDFC] border border-[#DED8CF] px-3 py-2 rounded-xl text-xs font-heading font-bold text-[#1F2928] outline-none focus:border-[#173E3B]"
                            >
                              <option value={0}>-- Seleccionar plazo --</option>
                              {selectedProductoObj?.plazosHabilitados.map((plazo) => (
                                <option key={plazo} value={plazo}>
                                  {plazo} {plazo === 1 ? "Cuota" : "Cuotas"}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-[10px] font-heading font-bold text-[#68706E] mb-1">
                              Seña Anticipada ($)
                            </label>
                            <input
                              type="number"
                              value={senaPesos}
                              onChange={(e) => {
                                lifecycleRef.current.setSenaPesos(e.target.value);
                              }}
                              placeholder="0"
                              className="w-full bg-[#FFFDFC] border border-[#DED8CF] px-3 py-2 rounded-xl text-xs font-mono text-[#1F2928] outline-none focus:border-[#173E3B]"
                            />
                          </div>
                        </div>

                        {/* Botones de cálculo canónico e incorporación a opciones */}
                        <div className="flex flex-wrap justify-end gap-2">
                          <button
                            type="button"
                            disabled={calculandoPricing || selectedPlazo === 0}
                            onClick={handleCalcularPricing}
                            className="inline-flex items-center gap-1.5 bg-[#173E3B] hover:bg-[#123230] text-white px-4 py-2 rounded-xl text-xs font-heading font-bold transition shadow-xs disabled:opacity-50 cursor-pointer"
                          >
                            <RefreshCw className={`w-3.5 h-3.5 ${calculandoPricing ? "animate-spin" : ""}`} />
                            {calculandoPricing ? "Calculando..." : "Calcular Pricing Canónico (CANONICAL_V1)"}
                          </button>

                          {pricingResult && (
                            <button
                              type="button"
                              data-testid="btn-incorporar-opcion-catalogo"
                              onClick={handleIncorporarOpcionCatalogo}
                              className="inline-flex items-center gap-1.5 bg-[#B44E2A] hover:bg-[#963f20] text-white px-4 py-2 rounded-xl text-xs font-heading font-bold transition shadow-xs cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              {editingItemId ? "Actualizar opción de catálogo" : "+ Incorporar como opción y agregar otro"}
                            </button>
                          )}
                        </div>

                        {/* Snapshot de Resultado Financiero Canónico */}
                        {pricingResult && (
                          <div className="bg-[#173E3B]/5 border border-[#173E3B]/20 p-4 rounded-2xl space-y-3">
                            <div className="flex items-center justify-between border-b border-[#173E3B]/10 pb-2">
                              <span className="text-xs font-heading font-bold text-[#173E3B]">
                                Resultado Financiero Oficial (CANONICAL_V1)
                              </span>
                              <span className="text-[10px] font-mono text-[#68706E]">
                                TNA: {pricingResult.tnaInternaAplicada}% | IVA: {pricingResult.alicuotaIvaAplicada}%
                              </span>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                              <div>
                                <span className="text-[10px] text-[#68706E] block font-heading font-bold">Capital Compra</span>
                                <span className="font-mono font-bold text-[#1F2928]">
                                  ${(pricingResult.capitalCompraCentavos / 100).toLocaleString("es-AR")}
                                </span>
                              </div>

                              <div>
                                <span className="text-[10px] text-[#68706E] block font-heading font-bold">Total Contractual</span>
                                <span className="font-mono font-bold text-[#B44E2A]">
                                  ${(pricingResult.valorTotalContractualCentavos / 100).toLocaleString("es-AR")}
                                </span>
                              </div>

                              <div>
                                <span className="text-[10px] text-[#68706E] block font-heading font-bold">Cuota Mensual ({pricingResult.plazoMeses}x)</span>
                                <span className="font-mono font-extrabold text-[#2F7D5C] text-sm">
                                  ${(pricingResult.cuotaMensualBaseCentavos / 100).toLocaleString("es-AR")}
                                </span>
                              </div>

                              <div>
                                <span className="text-[10px] text-[#68706E] block font-heading font-bold">Factor Derivado</span>
                                <span className="font-mono font-bold text-[#173E3B]">
                                  {pricingResult.factorDerivado}
                                </span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                ) : (
                  /* FORMULARIO DE PRODUCTO MANUAL FUERA DE CATÁLOGO (ESQUEMA GESTOR DE PRODUCTOS + FACTORES PREDETERMINADOS) */
                  <div className="space-y-4" data-testid="manual-product-form">
                    <div className="flex flex-wrap items-center justify-between gap-2 bg-indigo-50/70 border border-indigo-200 px-3.5 py-2.5 rounded-xl">
                      <div>
                        <span className="text-xs font-heading font-bold text-indigo-950 block">
                          Producto Específico del Presupuesto (Origen: MANUAL_PRESUPUESTO · Modo: MANUAL_FACTOR_V1)
                        </span>
                        <span className="text-[11px] text-indigo-800 font-sans">
                          Reutiliza el esquema oficial de Productos y los factores predeterminados de Cuenta Hogar. Los costos, factores y proveedores son estrictamente internos.
                        </span>
                      </div>
                    </div>

                    {/* Fila 1: Nombre, Código/SKU, Marca, Modelo */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="sm:col-span-2">
                        <label className="block text-[10px] font-heading font-bold text-[#68706E] mb-1">
                          Nombre del Producto *
                        </label>
                        <input
                          type="text"
                          data-testid="input-manual-nombre"
                          value={manualDraft.nombre}
                          onChange={(e) => lifecycleRef.current.updateManualDraft({ nombre: e.target.value })}
                          placeholder="Ej: Heladera Cíclica 300 Litros Plata"
                          className="w-full bg-[#FFFDFC] border border-[#DED8CF] px-3 py-2 rounded-xl text-xs font-heading font-bold text-[#1F2928] outline-none focus:border-[#173E3B]"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-heading font-bold text-[#68706E] mb-1">
                          Código / SKU
                        </label>
                        <input
                          type="text"
                          data-testid="input-manual-codigo"
                          value={manualDraft.codigoProducto}
                          onChange={(e) => lifecycleRef.current.updateManualDraft({ codigoProducto: e.target.value })}
                          placeholder="Ej: HEL-300L"
                          className="w-full bg-[#FFFDFC] border border-[#DED8CF] px-3 py-2 rounded-xl text-xs font-mono text-[#1F2928] outline-none focus:border-[#173E3B]"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-heading font-bold text-[#68706E] mb-1">
                          Categoría / Línea
                        </label>
                        <input
                          type="text"
                          data-testid="input-manual-categoria"
                          value={manualDraft.categoria || ""}
                          onChange={(e) => lifecycleRef.current.updateManualDraft({ categoria: e.target.value })}
                          placeholder="Ej: Heladeras"
                          className="w-full bg-[#FFFDFC] border border-[#DED8CF] px-3 py-2 rounded-xl text-xs font-sans text-[#1F2928] outline-none focus:border-[#173E3B]"
                        />
                      </div>
                    </div>

                    {/* Fila 2: Costo Proveedor, Proveedor, Precio Contado, Imagen URL */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                      <div>
                        <label className="block text-[10px] font-heading font-bold text-[#B44E2A] mb-1">
                          🔒 Costo Proveedor ($) *
                        </label>
                        <input
                          type="number"
                          min="0"
                          data-testid="input-manual-costo"
                          value={manualDraft.costoProducto || ""}
                          onChange={(e) =>
                            lifecycleRef.current.updateManualDraft({
                              costoProducto: Math.max(0, Number(e.target.value) || 0),
                            })
                          }
                          placeholder="Ej: 450000"
                          className="w-full bg-[#FFFDFC] border border-[#B44E2A]/40 px-3 py-2 rounded-xl text-xs font-mono font-bold text-[#1F2928] outline-none focus:border-[#B44E2A]"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-heading font-bold text-[#B44E2A] mb-1">
                          🔒 Proveedor (Interno)
                        </label>
                        <input
                          type="text"
                          data-testid="input-manual-proveedor"
                          value={manualDraft.proveedor}
                          onChange={(e) => lifecycleRef.current.updateManualDraft({ proveedor: e.target.value })}
                          placeholder="Ej: Distribuidora Norte S.A."
                          className="w-full bg-[#FFFDFC] border border-[#B44E2A]/40 px-3 py-2 rounded-xl text-xs font-sans text-[#1F2928] outline-none focus:border-[#B44E2A]"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-heading font-bold text-[#68706E] mb-1">
                          Precio Contado ($ opcional)
                        </label>
                        <input
                          type="number"
                          min="0"
                          data-testid="input-manual-contado"
                          value={manualDraft.precioContado ?? ""}
                          onChange={(e) =>
                            lifecycleRef.current.updateManualDraft({
                              precioContado: e.target.value ? Number(e.target.value) : null,
                            })
                          }
                          placeholder={
                            manualLivePricing.precioContadoCalculado > 0
                              ? `Auto: $${manualLivePricing.precioContadoCalculado.toLocaleString("es-AR")}`
                              : "Auto s/factor 12"
                          }
                          className="w-full bg-[#FFFDFC] border border-[#DED8CF] px-3 py-2 rounded-xl text-xs font-mono text-[#1F2928] outline-none focus:border-[#173E3B]"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-heading font-bold text-[#68706E] mb-1">
                          URL de Imagen
                        </label>
                        <input
                          type="text"
                          data-testid="input-manual-imagen"
                          value={manualDraft.imagenUrl}
                          onChange={(e) => lifecycleRef.current.updateManualDraft({ imagenUrl: e.target.value })}
                          placeholder="https://..."
                          className="w-full bg-[#FFFDFC] border border-[#DED8CF] px-3 py-2 rounded-xl text-xs font-sans text-[#1F2928] outline-none focus:border-[#173E3B]"
                        />
                      </div>
                    </div>

                    {/* Fila 3: Descripción Comercial y Observaciones */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-heading font-bold text-[#68706E] mb-1">
                          Descripción Comercial Pública
                        </label>
                        <input
                          type="text"
                          data-testid="input-manual-descripcion"
                          value={manualDraft.descripcion}
                          onChange={(e) => lifecycleRef.current.updateManualDraft({ descripcion: e.target.value })}
                          placeholder="Especificaciones visibles para el cliente..."
                          className="w-full bg-[#FFFDFC] border border-[#DED8CF] px-3 py-2 rounded-xl text-xs font-sans text-[#1F2928] outline-none focus:border-[#173E3B]"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-heading font-bold text-[#B44E2A] mb-1">
                          🔒 Observaciones Internas (Nunca salen al cliente)
                        </label>
                        <input
                          type="text"
                          data-testid="input-manual-obs-internas"
                          value={manualDraft.observacionesInternas || ""}
                          onChange={(e) =>
                            lifecycleRef.current.updateManualDraft({ observacionesInternas: e.target.value })
                          }
                          placeholder="Link de compra, stock proveedor, contacto interno..."
                          className="w-full bg-[#FFFDFC] border border-[#B44E2A]/40 px-3 py-2 rounded-xl text-xs font-sans text-[#1F2928] outline-none focus:border-[#B44E2A]"
                        />
                      </div>
                    </div>

                    {/* Fila 4: Plazo seleccionado para cotizar y Seña */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-[#F7F3EC] p-3 rounded-xl border border-[#DED8CF]">
                      <div>
                        <label className="block text-[10px] font-heading font-bold text-[#173E3B] mb-1">
                          Plazo Seleccionado para esta Opción del Presupuesto
                        </label>
                        <select
                          data-testid="select-manual-plazo"
                          value={manualLivePricing.plazoSeleccionado}
                          onChange={(e) => lifecycleRef.current.setManualPlazoSeleccionado(Number(e.target.value))}
                          className="w-full bg-[#FFFDFC] border border-[#DED8CF] px-3 py-2 rounded-xl text-xs font-heading font-bold text-[#1F2928] outline-none focus:border-[#173E3B]"
                        >
                          {getAvailableManualPlazos(manualDraft.factoresPlanes)
                            .filter((c) => manualDraft.planesActivos[c] !== false)
                            .map((c) => (
                              <option key={c} value={c}>
                                {c} {c === 1 ? "Cuota" : "Cuotas"} (Factor {manualLivePricing.resultadosPorPlan[c]?.factor}x → $
                                {manualLivePricing.resultadosPorPlan[c]?.cuotaMensual.toLocaleString("es-AR")}/mes)
                              </option>
                            ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-heading font-bold text-[#173E3B] mb-1">
                          Seña / Anticipo para esta Opción ($)
                        </label>
                        <input
                          type="number"
                          min="0"
                          data-testid="input-manual-anticipo"
                          value={manualAnticipoPesos}
                          onChange={(e) => lifecycleRef.current.setManualAnticipoPesos(e.target.value)}
                          placeholder="0"
                          className="w-full bg-[#FFFDFC] border border-[#DED8CF] px-3 py-2 rounded-xl text-xs font-mono text-[#1F2928] outline-none focus:border-[#173E3B]"
                        />
                      </div>
                    </div>

                    {/* TABLA DE PLANES Y FACTORES PREDETERMINADOS (DERIVADOS DINÁMICAMENTE DE FACTORES_PREDETERMINADOS) */}
                    <div className="border border-[#DED8CF] rounded-2xl overflow-hidden">
                      <div className="bg-[#F7F3EC] px-4 py-2.5 border-b border-[#DED8CF] flex flex-wrap items-center justify-between gap-2">
                        <span className="text-[11px] font-heading font-bold text-[#173E3B]">
                          🔒 Tabla de Factores por Plan (FACTORES_PREDETERMINADOS: 1..12, 18 y 24 cuotas precargados y editables)
                        </span>
                        <button
                          type="button"
                          data-testid="btn-reset-factores"
                          onClick={() => lifecycleRef.current.resetManualFactoresToDefault()}
                          className="text-[11px] font-heading font-bold text-[#B44E2A] hover:underline cursor-pointer"
                        >
                          Restaurar factores predeterminados
                        </button>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 p-3 bg-[#FFFDFC]">
                        {getAvailableManualPlazos(manualDraft.factoresPlanes).map((cuotas) => {
                          const planRes = manualLivePricing.resultadosPorPlan[cuotas];
                          if (!planRes) return null;
                          const isSelected = manualLivePricing.plazoSeleccionado === cuotas;
                          return (
                            <div
                              key={cuotas}
                              className={`p-2.5 rounded-xl border text-xs transition ${
                                !planRes.activo
                                  ? "bg-gray-50 border-gray-200 opacity-60"
                                  : isSelected
                                    ? "bg-[#173E3B]/10 border-[#173E3B]"
                                    : "bg-[#F7F3EC]/60 border-[#DED8CF]"
                              }`}
                            >
                              <div className="flex items-center justify-between mb-1.5">
                                <label className="flex items-center gap-1.5 font-heading font-bold text-[#173E3B] cursor-pointer">
                                  <input
                                    type="checkbox"
                                    data-testid={`checkbox-plan-activo-${cuotas}`}
                                    checked={planRes.activo}
                                    onChange={(e) =>
                                      lifecycleRef.current.toggleManualPlanActivo(cuotas, e.target.checked)
                                    }
                                    className="rounded border-[#DED8CF] text-[#173E3B]"
                                  />
                                  {cuotas} {cuotas === 1 ? "cuota" : "cuotas"}
                                </label>
                                {planRes.activo && (
                                  <button
                                    type="button"
                                    onClick={() => lifecycleRef.current.setManualPlazoSeleccionado(cuotas)}
                                    className={`text-[10px] font-heading font-bold px-1.5 py-0.5 rounded ${
                                      isSelected
                                        ? "bg-[#173E3B] text-white"
                                        : "bg-white text-[#68706E] border border-[#DED8CF]"
                                    }`}
                                  >
                                    {isSelected ? "Elegido" : "Usar"}
                                  </button>
                                )}
                              </div>

                              <div className="flex items-center gap-1.5 mb-1">
                                <span className="text-[10px] text-[#68706E] font-mono">Factor:</span>
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0.1"
                                  disabled={!planRes.activo}
                                  data-testid={`input-factor-${cuotas}`}
                                  value={manualDraft.factoresPlanes[cuotas] ?? planRes.factor}
                                  onChange={(e) => {
                                    const val = parseFloat(e.target.value);
                                    if (!isNaN(val) && val > 0) {
                                      lifecycleRef.current.setManualFactorForPlan(cuotas, val);
                                    }
                                  }}
                                  className="w-full bg-white border border-[#DED8CF] px-2 py-1 rounded-lg text-xs font-mono font-bold text-[#1F2928] outline-none focus:border-[#173E3B]"
                                />
                              </div>

                              <div className="text-[10px] font-mono text-[#2F7D5C] font-bold">
                                Cuota: ${planRes.cuotaMensual.toLocaleString("es-AR")}
                              </div>
                              <div className="text-[10px] font-mono text-[#68706E]">
                                Total: ${planRes.valorTotal.toLocaleString("es-AR")}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Resumen Financiero de la Opción Manual (MANUAL_FACTOR_V1) */}
                    <div className="bg-indigo-950/5 border border-indigo-900/20 p-4 rounded-2xl space-y-3" data-testid="manual-pricing-summary">
                      <div className="flex flex-wrap items-center justify-between border-b border-indigo-900/10 pb-2">
                        <span className="text-xs font-heading font-bold text-[#173E3B]">
                          Resultado Comercial de la Opción (Modo: MANUAL_FACTOR_V1)
                        </span>
                        <span className="text-[10px] font-mono text-[#68706E]">
                          🔒 Factor Aplicado ({manualLivePricing.plazoSeleccionado}x): {manualLivePricing.factorAplicado}x | Margen Bruto Interno: ${manualLivePricing.margenEstimado.toLocaleString("es-AR")}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                        <div>
                          <span className="text-[10px] text-[#68706E] block font-heading font-bold">🔒 Costo Proveedor</span>
                          <span className="font-mono font-bold text-[#1F2928]" data-testid="summary-manual-costo">
                            ${manualLivePricing.costoProveedor.toLocaleString("es-AR")}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-[#68706E] block font-heading font-bold">Total Financiado</span>
                          <span className="font-mono font-bold text-[#B44E2A]" data-testid="summary-manual-total">
                            ${manualLivePricing.valorTotal.toLocaleString("es-AR")}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-[#68706E] block font-heading font-bold">
                            Cuota Mensual ({manualLivePricing.plazoSeleccionado} cuotas)
                          </span>
                          <span className="font-mono font-extrabold text-[#2F7D5C] text-sm" data-testid="summary-manual-cuota">
                            ${manualLivePricing.cuotaMensual.toLocaleString("es-AR")}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-[#68706E] block font-heading font-bold">Precio Contado Ref.</span>
                          <span className="font-mono font-bold text-[#173E3B]">
                            ${manualLivePricing.precioContadoCalculado.toLocaleString("es-AR")}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Checkbox explícito: Guardar también en catálogo (por defecto NO) y botones de incorporación de opción */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#F7F3EC] p-3.5 rounded-xl border border-[#DED8CF]">
                      <label className="flex items-center gap-2 text-xs font-heading font-bold text-[#173E3B] cursor-pointer">
                        <input
                          type="checkbox"
                          data-testid="checkbox-guardar-en-catalogo"
                          checked={Boolean(manualDraft.guardarEnCatalogo)}
                          onChange={(e) =>
                            lifecycleRef.current.updateManualDraft({ guardarEnCatalogo: e.target.checked })
                          }
                          className="rounded border-[#DED8CF] text-[#173E3B] focus:ring-[#173E3B]"
                        />
                        Guardar también este producto en el catálogo (Por defecto solo vive en este presupuesto)
                      </label>

                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          data-testid="btn-confirmar-opcion-manual"
                          disabled={!isManualDraftReady}
                          onClick={() => handleConfirmarOpcionManual(false)}
                          className="inline-flex items-center gap-1.5 bg-[#173E3B] hover:bg-[#123230] text-white px-4 py-2 rounded-xl text-xs font-heading font-bold transition shadow-xs disabled:opacity-40 cursor-pointer"
                        >
                          {editingItemId ? "✓ Actualizar esta opción" : "✓ Incorporar opción al presupuesto"}
                        </button>

                        <button
                          type="button"
                          data-testid="btn-agregar-otra-opcion"
                          disabled={!isManualDraftReady}
                          onClick={() => handleConfirmarOpcionManual(true)}
                          className="inline-flex items-center gap-1.5 bg-[#B44E2A] hover:bg-[#963f20] text-white px-4 py-2 rounded-xl text-xs font-heading font-bold transition shadow-xs disabled:opacity-40 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" /> + Guardar opción y agregar otra
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* SECCIÓN 4: BOTONES DE ACCIÓN Y PERSISTENCIA OBLIGATORIA */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-[#DED8CF]">
                {/* Botones de Envío y PDF: BLOQUEADOS ANTES DE PERSISTIR */}
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <div className="relative group">
                    <button
                      type="button"
                      data-testid="btn-enviar-whatsapp"
                      disabled={!persistedBudget}
                      onClick={handleEnviarWhatsApp}
                      className="inline-flex items-center justify-center gap-1.5 bg-[#25D366] hover:bg-[#20bd5a] text-white px-4 py-2.5 rounded-xl text-xs font-heading font-bold transition shadow-xs disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" /> Enviar WhatsApp
                    </button>
                    {!persistedBudget && (
                      <span className="absolute bottom-full left-0 mb-1 hidden group-hover:block bg-gray-800 text-white text-[10px] px-2 py-1 rounded shadow-md whitespace-nowrap">
                        Guarde el presupuesto para habilitar el envío
                      </span>
                    )}
                  </div>

                  <div className="relative group">
                    <button
                      type="button"
                      data-testid="btn-descargar-pdf"
                      disabled={!persistedBudget}
                      onClick={() => persistedBudget && handleDescargarPdf(persistedBudget)}
                      className="inline-flex items-center justify-center gap-1.5 bg-[#FFFDFC] hover:bg-[#F7F3EC] text-[#B44E2A] border border-[#DED8CF] hover:border-[#B44E2A] px-4 py-2.5 rounded-xl text-xs font-heading font-bold transition shadow-xs disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" /> Descargar PDF
                    </button>
                    {!persistedBudget && (
                      <span className="absolute bottom-full left-0 mb-1 hidden group-hover:block bg-gray-800 text-white text-[10px] px-2 py-1 rounded shadow-md whitespace-nowrap">
                        Guarde el presupuesto para habilitar la descarga
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  <button
                    type="button"
                    onClick={handleCerrarModal}
                    className="flex-1 sm:flex-none bg-[#FFFDFC] border border-[#DED8CF] hover:border-[#173E3B] text-[#68706E] px-4 py-2.5 rounded-xl text-xs font-heading font-bold transition cursor-pointer"
                  >
                    Cerrar
                  </button>

                  <button
                    type="button"
                    data-testid="btn-guardar-presupuesto"
                    disabled={saving || !canSaveBudget}
                    onClick={handleGuardarPresupuesto}
                    className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 bg-[#173E3B] hover:bg-[#123230] text-white px-5 py-2.5 rounded-xl text-xs font-heading font-bold transition shadow-xs disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
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
