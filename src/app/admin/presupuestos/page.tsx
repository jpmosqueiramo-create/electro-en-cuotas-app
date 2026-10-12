"use client";

import { AdminNav } from "@/components/AdminNav";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { AdminProtectedRoute } from "@/components/AdminProtectedRoute";
import { db, auth } from "@/lib/firebase";
import { collection, getDocs, doc, getDoc, updateDoc, addDoc, serverTimestamp } from "firebase/firestore";
import { generarPdfPresupuesto } from "@/lib/pdfGenerator";
import { 
  resolveLegacyAlertSolicitud, 
  SolicitudCandidate 
} from "@/lib/budgetAlertRouting";
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
  RefreshCw
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
  producto: string;
  contado?: number;
  costoProveedor?: number;
  cuotas?: number;
  factor?: number;
  valorCuota?: number;
  capitalCentavos?: number;
  totalCentavos?: number;
}

interface PresupuestoRecord {
  id: string;
  pricingSchemaVersion?: "CANONICAL_V1";
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
}

function PresupuestosContent() {
  const searchParams = useSearchParams();
  const [presupuestos, setPresupuestos] = useState<PresupuestoRecord[]>([]);
  const [solicitudesPool, setSolicitudesPool] = useState<SolicitudCandidate[]>([]);
  const [catalogoProductos, setCatalogoProductos] = useState<CatalogProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroEstado, setFiltroEstado] = useState<string>("TODOS");
  const [busqueda, setBusqueda] = useState<string>("");

  // Estado del Modal de Confección
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [calculandoPricing, setCalculandoPricing] = useState(false);
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

  // Vinculación determinística de solicitud
  const [resolvedSolicitudId, setResolvedSolicitudId] = useState<string | null>(null);
  const [resolvedCollection, setResolvedCollection] = useState<"solicitudes_cuenta" | "solicitudes" | null>(null);
  const [candidatosVinculacion, setCandidatosVinculacion] = useState<SolicitudCandidate[]>([]);
  const [confirmarCrearNueva, setConfirmarCrearNueva] = useState(false);

  // Selección de Producto y Pricing Canónico
  const [selectedProductoId, setSelectedProductoId] = useState<string>("");
  const [selectedPlazo, setSelectedPlazo] = useState<number>(0);
  const [senaPesos, setSenaPesos] = useState<string>("0");
  const [pricingResult, setPricingResult] = useState<CanonicalPricingSnapshot | null>(null);
  const [persistedBudget, setPersistedBudget] = useState<PresupuestoRecord | null>(null);

  const fetchPresupuestos = async () => {
    setLoading(true);
    try {
      const allPresupuestos: PresupuestoRecord[] = [];
      const pool: SolicitudCandidate[] = [];

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
              pricingSchemaVersion: p.pricingSchemaVersion === "CANONICAL_V1" ? "CANONICAL_V1" : undefined,
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
              pricingSchemaVersion: p.pricingSchemaVersion === "CANONICAL_V1" ? "CANONICAL_V1" : undefined,
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
        const plazos = Array.isArray(rawPlazos) 
          ? rawPlazos.map(Number).filter((n: number) => !isNaN(n) && n > 0)
          : [];
        prods.push({
          id: d.id,
          nombre: String(pData.nombre || ""),
          costoProducto: Number(pData.costoProducto) || 0,
          plazosHabilitados: plazos
        });
      });
      setCatalogoProductos(prods);

      allPresupuestos.sort((a, b) => (b.fechaObjeto?.getTime() ?? 0) - (a.fechaObjeto?.getTime() ?? 0));
      setPresupuestos(allPresupuestos);
      setSolicitudesPool(pool);
    } catch (e: unknown) {
      console.error("Error al cargar presupuestos:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPresupuestos();
  }, []);

  // Procesar Query Parameters de Alerta y Resolver Vinculación Determinística
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

    if (nom || prodVal || solId || altId) {
      const incomingLead: LeadData = {
        solicitudId: solId,
        alertaId: altId,
        nombre: nom,
        dni: dniVal,
        telefono: telVal,
        localidad: locVal,
        producto: prodVal,
        notas: notasVal
      };

      setLeadData(incomingLead);
      setPricingResult(null);
      setPersistedBudget(null);
      setSelectedPlazo(0);
      setSenaPesos("0");
      setConfirmarCrearNueva(false);

      // Resolución determinística de vinculación
      if (solId) {
        // 1. Buscar en solicitudesPool por ID y utilizar sourceCollection
        const matchPool = solicitudesPool.find((s) => s.id === solId);
        if (matchPool) {
          setResolvedSolicitudId(matchPool.id);
          setResolvedCollection(matchPool.sourceCollection);
          setCandidatosVinculacion([matchPool]);
        } else {
          // 2. Si no está en el pool cargado, verificar Firestore explícitamente
          (async () => {
            try {
              const snapCuenta = await getDoc(doc(db, "solicitudes_cuenta", solId));
              if (snapCuenta.exists()) {
                setResolvedSolicitudId(solId);
                setResolvedCollection("solicitudes_cuenta");
                return;
              }
              const snapStd = await getDoc(doc(db, "solicitudes", solId));
              if (snapStd.exists()) {
                setResolvedSolicitudId(solId);
                setResolvedCollection("solicitudes");
                return;
              }
              // 3. No existe en ninguna colección: fail closed
              setResolvedSolicitudId(null);
              setResolvedCollection(null);
              setCandidatosVinculacion([]);
            } catch {
              setResolvedSolicitudId(null);
              setResolvedCollection(null);
              setCandidatosVinculacion([]);
            }
          })();
        }
      } else if (altId) {
        // Alerta con ID: recuperar fechaCreacion real de Firestore (NUNCA timestamp ficticio)
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
          const resolution = resolveLegacyAlertSolicitud(
            {
              id: altId,
              tipo: "NUEVO_PRESUPUESTO",
              mensaje: notasVal,
              clienteEmail: telVal || nom,
              fechaCreacion: realFechaCreacion
            },
            solicitudesPool
          );

          if (resolution.matched && resolution.resolvedSolicitudId) {
            setResolvedSolicitudId(resolution.resolvedSolicitudId);
            setResolvedCollection(resolution.sourceCollection);
            setCandidatosVinculacion(resolution.candidates);
          } else {
            setResolvedSolicitudId(null);
            setResolvedCollection(null);
            setCandidatosVinculacion(resolution.candidates);
          }
        })();
      } else {
        // Alerta sin ID: sin fecha ficticia
        const resolution = resolveLegacyAlertSolicitud(
          {
            tipo: "NUEVO_PRESUPUESTO",
            mensaje: notasVal,
            clienteEmail: telVal || nom,
            fechaCreacion: null
          },
          solicitudesPool
        );

        if (resolution.matched && resolution.resolvedSolicitudId) {
          setResolvedSolicitudId(resolution.resolvedSolicitudId);
          setResolvedCollection(resolution.sourceCollection);
          setCandidatosVinculacion(resolution.candidates);
        } else {
          setResolvedSolicitudId(null);
          setResolvedCollection(null);
          setCandidatosVinculacion(resolution.candidates);
        }
      }

      // Intentar pre-seleccionar producto del catálogo si coincide exactamente
      const matchCatalog = catalogoProductos.find(
        (cp) => cp.nombre.toLowerCase().trim() === prodVal.toLowerCase().trim()
      );
      if (matchCatalog) {
        setSelectedProductoId(matchCatalog.id);
      } else {
        setSelectedProductoId("");
      }

      setModalOpen(true);
    }
  }, [searchParams, solicitudesPool, catalogoProductos, busqueda]);

  const abrirModalNuevo = () => {
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
    setResolvedSolicitudId(null);
    setResolvedCollection(null);
    setCandidatosVinculacion([]);
    setSelectedProductoId("");
    setSelectedPlazo(0);
    setSenaPesos("0");
    setPricingResult(null);
    setPersistedBudget(null);
    setConfirmarCrearNueva(true);
    setModalOpen(true);
  };

  const abrirModalConfeccion = (item: PresupuestoRecord) => {
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

    setResolvedSolicitudId(item.solicitudId || null);
    setResolvedCollection((item.solicitudTipo === "estandar" ? "solicitudes" : "solicitudes_cuenta"));
    setCandidatosVinculacion([]);
    setConfirmarCrearNueva(false);

    // Si ya tiene un snapshot canónico previo, conservarlo
    if (item.pricingSchemaVersion === "CANONICAL_V1" && item.snapshotCanonico) {
      setPricingResult(item.snapshotCanonico);
      setPersistedBudget(item);
    } else {
      setPricingResult(null);
      setPersistedBudget(null);
    }

    const matchCatalog = catalogoProductos.find(
      (cp) => cp.nombre.toLowerCase().trim() === (item.producto || "").toLowerCase().trim()
    );
    if (matchCatalog) {
      setSelectedProductoId(matchCatalog.id);
    } else {
      setSelectedProductoId("");
    }

    setSelectedPlazo(item.cuotas || 0);
    setSenaPesos("0");
    setModalOpen(true);
  };

  const selectedProductoObj = catalogoProductos.find((p) => p.id === selectedProductoId);
  const isProductoConfigurado = Boolean(
    selectedProductoObj && 
    selectedProductoObj.costoProducto > 0 && 
    selectedProductoObj.plazosHabilitados.length > 0
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
        setPricingResult(null);
        return;
      }

      setPricingResult(data.resultado);
      // Resetear presupuesto persistido si se recalculó
      setPersistedBudget(null);
    } catch (err: unknown) {
      console.error("Error al calcular pricing:", err);
      alert("Error de conexión al servidor de pricing.");
    } finally {
      setCalculandoPricing(false);
    }
  };

  const handleGuardarPresupuesto = async () => {
    if (!pricingResult) {
      alert("Debe calcular el pricing canónico antes de guardar el presupuesto.");
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
      const nuevoPresupuesto: PresupuestoRecord = {
        id: "pres_" + Date.now(),
        pricingSchemaVersion: "CANONICAL_V1",
        producto: selectedProductoObj?.nombre || leadData.producto,
        solicitudId: resolvedSolicitudId || undefined,
        clienteNombre: leadData.nombre || "Cliente Sin Nombre",
        clienteDni: leadData.dni || "-",
        clienteWhatsapp: leadData.telefono || "-",
        clienteLocalidad: leadData.localidad || "-",
        costoProveedor: Math.round(pricingResult.capitalCompraCentavos / 100),
        capitalCompraCentavos: pricingResult.capitalCompraCentavos,
        plazoMeses: pricingResult.plazoMeses,
        cuotas: pricingResult.plazoMeses,
        valorCuota: Math.round(pricingResult.cuotaMensualBaseCentavos / 100),
        cuotaMensualBaseCentavos: pricingResult.cuotaMensualBaseCentavos,
        valorTotalContractualCentavos: pricingResult.valorTotalContractualCentavos,
        contado: Math.round(pricingResult.capitalCompraCentavos / 100),
        tnaInternaAplicada: pricingResult.tnaInternaAplicada,
        alicuotaIvaAplicada: pricingResult.alicuotaIvaAplicada,
        factorDerivado: pricingResult.factorDerivado,
        items: [
          {
            producto: selectedProductoObj?.nombre || leadData.producto,
            contado: Math.round(pricingResult.capitalCompraCentavos / 100),
            costoProveedor: Math.round(pricingResult.capitalCompraCentavos / 100),
            cuotas: pricingResult.plazoMeses,
            valorCuota: Math.round(pricingResult.cuotaMensualBaseCentavos / 100),
            capitalCentavos: pricingResult.capitalCompraCentavos,
            totalCentavos: pricingResult.valorTotalContractualCentavos
          }
        ],
        snapshotCanonico: pricingResult,
        notas: leadData.notas || "",
        fechaObjeto: new Date(),
        estado: "Generado"
      };

      let persistSuccess = false;
      let targetDocId: string | null = resolvedSolicitudId;
      let targetCollection = resolvedCollection;

      if (!targetDocId && confirmarCrearNueva) {
        // Creación explícita autorizada
        const newRef = await addDoc(collection(db, "solicitudes_cuenta"), {
          tipo: "contacto_rapido",
          nombreCompleto: leadData.nombre,
          numeroDni: leadData.dni || "",
          whatsapp: leadData.telefono || "",
          direccion: leadData.localidad || "",
          localidad: leadData.localidad || "",
          productoNombre: selectedProductoObj?.nombre || leadData.producto,
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
          // Documento desaparece entre apertura y guardado => FAIL CLOSED
          setPersistedBudget(null);
          alert("Error: La solicitud vinculada ya no existe o no pudo verificarse.");
          return;
        }
        const data = snap.data();
        const existingPresup = data.presupuestos || [];
        await updateDoc(docRef, {
          presupuestos: [...existingPresup, nuevoPresupuesto],
          estado: "Presupuestado"
        });
        persistSuccess = true;
      } else {
        setPersistedBudget(null);
        alert("Error: La solicitud vinculada ya no existe o no pudo verificarse.");
        return;
      }

      if (!persistSuccess) {
        setPersistedBudget(null);
        alert("Error: No se pudo confirmar la persistencia del presupuesto.");
        return;
      }

      nuevoPresupuesto.solicitudId = targetDocId || undefined;
      setPersistedBudget(nuevoPresupuesto);
      setResolvedSolicitudId(targetDocId);
      setResolvedCollection(targetCollection);
      await fetchPresupuestos();
      alert("¡Presupuesto guardado exitosamente con pricing canónico CANONICAL_V1! Ahora puede descargar el PDF o enviar por WhatsApp.");
    } catch (err: unknown) {
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

    const cuotaStr = (persistedBudget.valorCuota || 0).toLocaleString("es-AR");
    const msg = `Hola ${leadData.nombre || "estimado/a"}, ya armamos tu presupuesto a medida en Cuenta Hogar para *${persistedBudget.producto}*:\n\n- ${persistedBudget.cuotas} cuotas fijas de *$${cuotaStr}* (Total financiado: $${((persistedBudget.valorTotalContractualCentavos || 0) / 100).toLocaleString("es-AR")})\n\nSi estás de acuerdo avisame y coordinamos la entrega!`;
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
          setPersistedBudget({ ...persistedBudget, estado: "Enviado" });
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
        <AdminNav title="Historial de Presupuestos" subtitle="Gestión comercial de cotizaciones con motor de pricing canónico inmutable" />

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
                            <span className="font-heading font-bold text-[#173E3B]">{it.producto}</span>
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
                              Costo Prov: ${it.costoProveedor}
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
                      <span className="text-[10px] text-[#68706E] font-heading uppercase tracking-wider font-bold block">Cuota Mensual</span>
                      <span className="text-xl font-heading font-extrabold text-[#173E3B] font-mono">
                        {totalCuota > 0 ? `$${totalCuota.toLocaleString("es-AR")}` : "--"} <span className="text-xs font-normal text-[#68706E] font-sans">/ mes</span>
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                      <button
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
            <div className="bg-[#FFFDFC] border border-[#DED8CF] rounded-3xl max-w-3xl w-full p-6 shadow-2xl space-y-6 my-8 max-h-[90vh] overflow-y-auto">
              
              {/* Header Modal */}
              <div className="flex items-center justify-between border-b border-[#DED8CF] pb-4">
                <div>
                  <h2 className="text-lg font-heading font-bold text-[#173E3B]">
                    Confeccionar Presupuesto Canónico
                  </h2>
                  <p className="text-xs text-[#68706E] font-sans">
                    Cálculo matemático inmutable mediante motor oficial CANONICAL_V1
                  </p>
                </div>
                <button
                  onClick={() => setModalOpen(false)}
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

                {/* GESTIÓN DE VINCULACIÓN DETERMINÍSTICA / CANDIDATOS LEGACY */}
                {!resolvedSolicitudId && (
                  <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl space-y-2">
                    <p className="text-xs font-heading font-bold text-amber-900 flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                      Solicitud original no vinculada automáticamente.
                    </p>
                    <p className="text-[11px] text-amber-800 font-sans">
                      No se encontró un candidato unívoco inequívoco. Seleccione una solicitud candidata o confirme la creación explícita para evitar duplicados silenciosos.
                    </p>

                    {candidatosVinculacion.length > 0 && (
                      <div>
                        <label className="block text-[10px] font-bold text-amber-900 mb-1">Candidatos identificados ({candidatosVinculacion.length}):</label>
                        <select
                          value={resolvedSolicitudId || ""}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val) {
                              setResolvedSolicitudId(val);
                              const c = candidatosVinculacion.find((cand) => cand.id === val);
                              if (c) setResolvedCollection(c.sourceCollection);
                            } else {
                              setResolvedSolicitudId(null);
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
                        onChange={(e) => setConfirmarCrearNueva(e.target.checked)}
                        className="rounded border-amber-400 text-[#173E3B] focus:ring-[#173E3B]"
                      />
                      <label htmlFor="checkNueva" className="text-xs font-bold text-amber-900 cursor-pointer">
                        Confirmar explícitamente creación de una nueva solicitud para este lead
                      </label>
                    </div>
                  </div>
                )}
              </div>

              {/* SECCIÓN 2: CONDICIONES COMERCIALES Y PRICING CANÓNICO */}
              <div className="bg-[#FFFDFC] border border-[#DED8CF] p-4 rounded-2xl space-y-4">
                <span className="text-[11px] font-heading font-bold uppercase tracking-wider text-[#173E3B] flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-[#B44E2A]" /> Condiciones Comerciales y Motor Canónico
                </span>

                {/* Selección de Producto del Catálogo */}
                <div>
                  <label className="block text-[10px] font-heading font-bold text-[#68706E] mb-1">
                    Producto del Catálogo {leadData.producto ? `(Solicitado por lead: "${leadData.producto}")` : ""}
                  </label>
                  <select
                    value={selectedProductoId}
                    onChange={(e) => {
                      setSelectedProductoId(e.target.value);
                      setSelectedPlazo(0);
                      setPricingResult(null);
                      setPersistedBudget(null);
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

                {/* FAIL-CLOSED: Si el producto no está configurado */}
                {!isProductoConfigurado ? (
                  <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl text-center space-y-1">
                    <p className="text-xs font-heading font-bold text-amber-900">
                      ⚠️ Producto pendiente de configuración de condiciones comerciales.
                    </p>
                    <p className="text-[11px] text-amber-800 font-sans">
                      El producto seleccionado no posee costo de compra positivo o plazos habilitados en el catálogo. Configure el producto antes de calcular cuotas. No se generan cuotas ficticias por defecto.
                    </p>
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
                            setSelectedPlazo(Number(e.target.value));
                            setPricingResult(null);
                            setPersistedBudget(null);
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
                            setSenaPesos(e.target.value);
                            setPricingResult(null);
                            setPersistedBudget(null);
                          }}
                          placeholder="0"
                          className="w-full bg-[#FFFDFC] border border-[#DED8CF] px-3 py-2 rounded-xl text-xs font-mono text-[#1F2928] outline-none focus:border-[#173E3B]"
                        />
                      </div>
                    </div>

                    {/* Botón de cálculo canónico */}
                    <div className="flex justify-end">
                      <button
                        type="button"
                        disabled={calculandoPricing || selectedPlazo === 0}
                        onClick={handleCalcularPricing}
                        className="inline-flex items-center gap-1.5 bg-[#173E3B] hover:bg-[#123230] text-white px-4 py-2 rounded-xl text-xs font-heading font-bold transition shadow-xs disabled:opacity-50 cursor-pointer"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${calculandoPricing ? "animate-spin" : ""}`} />
                        {calculandoPricing ? "Calculando..." : "Calcular Pricing Canónico (CANONICAL_V1)"}
                      </button>
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
              </div>

              {/* SECCIÓN 3: BOTONES DE ACCIÓN Y PERSISTENCIA OBLIGATORIA */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-[#DED8CF]">
                {/* Botones de Envío y PDF: BLOQUEADOS ANTES DE PERSISTIR */}
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <div className="relative group">
                    <button
                      type="button"
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
                    onClick={() => setModalOpen(false)}
                    className="flex-1 sm:flex-none bg-[#FFFDFC] border border-[#DED8CF] hover:border-[#173E3B] text-[#68706E] px-4 py-2.5 rounded-xl text-xs font-heading font-bold transition cursor-pointer"
                  >
                    Cerrar
                  </button>

                  <button
                    type="button"
                    disabled={saving || !pricingResult}
                    onClick={handleGuardarPresupuesto}
                    className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 bg-[#173E3B] hover:bg-[#123230] text-white px-5 py-2.5 rounded-xl text-xs font-heading font-bold transition shadow-xs disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {saving ? "Guardando..." : "💾 Guardar Presupuesto (CANONICAL_V1)"}
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
