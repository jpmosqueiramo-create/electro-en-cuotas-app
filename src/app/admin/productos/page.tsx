"use client";

import { calcularOperacionFinanciera, FACTORES_PREDETERMINADOS, calcularTablaTodosLosPlanes } from "@/lib/financialEngine";
import { useState, useEffect } from "react";
import { AdminProtectedRoute } from "@/components/AdminProtectedRoute";
import { db, storage } from "@/lib/firebase";
import { collection, addDoc, getDocs, getDoc, deleteDoc, doc, updateDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { generarRemitoMultiProducto } from "@/lib/pdfGenerator";

type UnidadStock = {
  id: string;
  localidad: string;
  nserie: string;
  estado: "Disponible" | "Reservado" | "Vendido" | "En Tránsito";
  fechaIngreso: string;
};

type Producto = {
  id: string;
  codigoProducto?: string;
  nombre: string;
  precioAnterior: number | null;
  cuota12: number;
  cuota8: number;
  costoProducto: number | null;
  precioContado: number | null;
  tasaInteresTna: number | null;
  tasaMora: number | null;
  proveedor: string;
  descripcion: string;
  imagenUrl: string;
  imagenUrls?: string[];
  stock?: UnidadStock[];
  activo?: boolean;
  publicado?: boolean;
};

const LOCALIDADES_STOCK = [
  "Buenos Aires",
  "Lincoln",
  "Chivilcoy",
  "Los Toldos",
  "O'Brien",
  "Zavalia"
];

export default function AdminProductosPage() {
  const [productos, setProductos] = useState<Producto[]>([]);
  
  const [editandoId, setEditandoId] = useState<string | null>(null);

  const [codigoProducto, setCodigoProducto] = useState("");
  const [nombre, setNombre] = useState("");
  const [precioAnterior, setPrecioAnterior] = useState("");
  const [cuota12, setCuota12] = useState("");
  const [cuota8, setCuota8] = useState("");
  const [costoProducto, setCostoProducto] = useState("");
  const [multiplicador, setMultiplicador] = useState("2.5");
  const [factoresPlanes, setFactoresPlanes] = useState<Record<number, number>>(FACTORES_PREDETERMINADOS);
  const [planesActivos, setPlanesActivos] = useState<Record<number, boolean>>({
    1: true, 2: true, 3: true, 4: true, 5: true, 6: true, 7: true, 8: true, 9: true, 10: true, 11: true, 12: true
  });
  const [precioContado, setPrecioContado] = useState("");
  const [tasaInteresTna, setTasaInteresTna] = useState("");
  const [tasaMora, setTasaMora] = useState("");
  const [proveedor, setProveedor] = useState("");

  const calcularCuota = (principal: number, tnaPct: number, meses: number) => {
    if (!principal || !meses) return 0;
    if (!tnaPct) return Math.round(principal / meses);
    const r = (tnaPct / 100) / 12; // tasa mensual
    const cuota = (principal * r * Math.pow(1 + r, meses)) / (Math.pow(1 + r, meses) - 1);
    return Math.round(cuota);
  };

  const calcularTnaDesdeCuota = (contado: number, cuota: number, n: number): number => {
    if (contado <= 0 || cuota <= 0 || n <= 0) return 0;
    if (cuota * n <= contado) return 0; // No interest or negative rate
    
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
  
  const [descripcion, setDescripcion] = useState("");
  const [existingImagenUrls, setExistingImagenUrls] = useState<string[]>([]);
  const [imagenes, setImagenes] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);

  // Stock management states
  const [stockProducto, setStockProducto] = useState<Producto | null>(null);
  const [nuevaUnidadLocalidad, setNuevaUnidadLocalidad] = useState("Buenos Aires");
  const [nuevaUnidadNserie, setNuevaUnidadNserie] = useState("");

  // Internal Transfer States
  const [mostrarTrasladoModal, setMostrarTrasladoModal] = useState(false);
  const [trasladoOrigen, setTrasladoOrigen] = useState("Buenos Aires");
  const [trasladoDestino, setTrasladoDestino] = useState("Lincoln");
  const [trasladoComentario, setTrasladoComentario] = useState("");
  // type LineaTraslado = { id: string; productoId: string; cantidad: number; selectedUnitIds: string[]; nseries: string[]; isManual: boolean; manualNombre: string; manualSerialsText: string; }
  const [trasladoLineas, setTrasladoLineas] = useState<any[]>([
    { id: "row_" + Date.now(), productoId: "", cantidad: 1, selectedUnitIds: [], nseries: [], isManual: false, manualNombre: "", manualSerialsText: "" }
  ]);

  const handleAgregarLineaTraslado = (isManual: boolean) => {
    setTrasladoLineas(prev => [
      ...prev,
      {
        id: "row_" + Date.now() + "_" + Math.random(),
        productoId: "",
        cantidad: 1,
        selectedUnitIds: [],
        nseries: [],
        isManual,
        manualNombre: "",
        manualSerialsText: ""
      }
    ]);
  };

  const handleQuitarLineaTraslado = (id: string) => {
    setTrasladoLineas(prev => prev.filter(l => l.id !== id));
  };

  const handleUpdateLineaTraslado = (id: string, updates: any) => {
    setTrasladoLineas(prev => prev.map(l => l.id === id ? { ...l, ...updates } : l));
  };

  const handleToggleSeleccionUnidadStock = (lineId: string, unit: UnidadStock) => {
    const line = trasladoLineas.find(l => l.id === lineId);
    if (!line) return;
    
    let updatedUnitIds = [...(line.selectedUnitIds || [])];
    let updatedNseries = [...(line.nseries || [])];

    if (updatedUnitIds.includes(unit.id)) {
      updatedUnitIds = updatedUnitIds.filter(id => id !== unit.id);
      updatedNseries = updatedNseries.filter(s => s !== unit.nserie);
    } else {
      updatedUnitIds.push(unit.id);
      if (unit.nserie) {
        updatedNseries.push(unit.nserie);
      }
    }

    handleUpdateLineaTraslado(lineId, {
      selectedUnitIds: updatedUnitIds,
      nseries: updatedNseries,
      cantidad: Math.max(1, updatedUnitIds.length)
    });
  };

  const handleGenerarTrasladoYActualizarDb = async (e: React.FormEvent) => {
    e.preventDefault();
    if (trasladoOrigen === trasladoDestino) {
      return alert("El origen y destino no pueden ser iguales.");
    }
    
    const linesToProcess = trasladoLineas.filter(l => (l.isManual && l.manualNombre.trim()) || (!l.isManual && l.productoId));
    if (linesToProcess.length === 0) {
      return alert("Debes cargar al menos una línea válida con producto.");
    }

    try {
      const lineasRemitoFormatted = [];

      for (const line of linesToProcess) {
        if (line.isManual) {
          const manualSerials = line.manualSerialsText ? line.manualSerialsText.split(",").map((s: string) => s.trim()).filter(Boolean) : [];
          lineasRemitoFormatted.push({
            productoNombre: line.manualNombre.trim(),
            cantidad: Number(line.cantidad) || 1,
            nseries: manualSerials
          });
        } else {
          const prodObj = productos.find(p => p.id === line.productoId);
          if (!prodObj) continue;

          lineasRemitoFormatted.push({
            productoNombre: prodObj.nombre,
            cantidad: line.cantidad,
            nseries: line.nseries || []
          });

          // Actualizar ubicación en la base de datos para las unidades físicas seleccionadas
          if (line.selectedUnitIds && line.selectedUnitIds.length > 0) {
            const prodRef = doc(db, "productos", line.productoId);
            const snap = await getDoc(prodRef);
            if (snap.exists()) {
              const pData = snap.data();
              const updatedStock = (pData.stock || []).map((u: any) => {
                if (line.selectedUnitIds.includes(u.id)) {
                  return { ...u, localidad: trasladoDestino };
                }
                return u;
              });
              await updateDoc(prodRef, { stock: updatedStock });
            }
          }
        }
      }

      // Generar PDF
      const datosRemito = {
        nroRemito: `T-${Date.now().toString().substring(7)}`,
        fecha: new Date().toLocaleDateString("es-AR"),
        origen: trasladoOrigen,
        destino: trasladoDestino,
        lineas: lineasRemitoFormatted,
        comentario: trasladoComentario.trim()
      };

      generarRemitoMultiProducto(datosRemito);

      alert("¡Remito de traslado generado exitosamente! Se han actualizado las ubicaciones de stock en la base de datos.");
      setMostrarTrasladoModal(false);
      setTrasladoComentario("");
      setTrasladoLineas([
        { id: "row_" + Date.now(), productoId: "", cantidad: 1, selectedUnitIds: [], nseries: [], isManual: false, manualNombre: "", manualSerialsText: "" }
      ]);
      await fetchProductos();
    } catch (err) {
      console.error(err);
      alert("Error al procesar el traslado de mercadería.");
    }
  };

  const handleAgregarUnidadStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stockProducto) return;
    
    const nuevaUnidad: UnidadStock = {
      id: "unit_" + Date.now(),
      localidad: nuevaUnidadLocalidad,
      nserie: nuevaUnidadNserie.trim(),
      estado: "Disponible",
      fechaIngreso: new Date().toISOString()
    };

    const updatedStock = [...(stockProducto.stock || []), nuevaUnidad];
    try {
      await updateDoc(doc(db, "productos", stockProducto.id), {
        stock: updatedStock
      });
      
      const updatedProduct = { ...stockProducto, stock: updatedStock };
      setStockProducto(updatedProduct);
      setProductos(prev => prev.map(p => p.id === stockProducto.id ? updatedProduct : p));
      setNuevaUnidadNserie("");
      alert("Unidad de stock agregada exitosamente.");
    } catch (err) {
      console.error(err);
      alert("Error al agregar unidad de stock.");
    }
  };

  const handleQuitarUnidadStock = async (unitId: string) => {
    if (!stockProducto || !confirm("¿Seguro que deseas remover esta unidad del stock?")) return;
    
    const updatedStock = (stockProducto.stock || []).filter(u => u.id !== unitId);
    try {
      await updateDoc(doc(db, "productos", stockProducto.id), {
        stock: updatedStock
      });
      
      const updatedProduct = { ...stockProducto, stock: updatedStock };
      setStockProducto(updatedProduct);
      setProductos(prev => prev.map(p => p.id === stockProducto.id ? updatedProduct : p));
      alert("Unidad removida del stock.");
    } catch (err) {
      console.error(err);
      alert("Error al remover unidad de stock.");
    }
  };

    const handleTogglePublicar = async (p: Producto) => {
    const nuevoEstado = !(p.activo !== false && p.publicado !== false);
    try {
      await updateDoc(doc(db, "productos", p.id), {
        activo: nuevoEstado,
        publicado: nuevoEstado
      });
      setProductos(prev => prev.map(item => item.id === p.id ? { ...item, activo: nuevoEstado, publicado: nuevoEstado } : item));
      alert(nuevoEstado ? "¡Producto publicado y visible en el sitio web!" : "Producto desactivado (Oculto del sitio web).");
    } catch (err: any) {
      console.error(err);
      alert("Error al cambiar estado de publicación: " + err.message);
    }
  };

  const fetchProductos = async () => {
    const querySnapshot = await getDocs(collection(db, "productos"));
    const prods: Producto[] = [];
    querySnapshot.forEach((doc) => {
      prods.push({ id: doc.id, ...doc.data() } as Producto);
    });
    setProductos(prods);
  };

  useEffect(() => {
    fetchProductos();
  }, []);

  const handleEditar = (p: any) => {
    setEditandoId(p.id);
    setCodigoProducto(p.codigoProducto || "");
    setNombre(p.nombre);
    setPrecioAnterior(p.precioAnterior?.toString() || "");
    setCuota12(p.cuota12 ? p.cuota12.toString() : "");
    setCuota8(p.cuota8 ? p.cuota8.toString() : "");
    setCostoProducto(p.costoProducto?.toString() || "");
    setPrecioContado(p.precioContado?.toString() || "");
    setTasaInteresTna(p.tasaInteresTna?.toString() || "");
    setTasaMora(p.tasaMora?.toString() || "");
    setProveedor(p.proveedor || "");
    setDescripcion(p.descripcion);
    setExistingImagenUrls(p.imagenUrls || (p.imagenUrl ? [p.imagenUrl] : []));
    setImagenes([]);

    if (p.factoresPlanes) {
      setFactoresPlanes(p.factoresPlanes);
    } else {
      setFactoresPlanes(FACTORES_PREDETERMINADOS);
    }

    if (p.planesActivos) {
      setPlanesActivos(p.planesActivos);
    } else {
      setPlanesActivos({
        1: false, 2: false, 3: false, 4: false, 5: false, 6: false, 7: false,
        8: Boolean(p.cuota8 && p.cuota8 > 0),
        9: false, 10: false, 11: false,
        12: Boolean(p.cuota12 && p.cuota12 > 0)
      });
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCancelarEdicion = () => {
    setEditandoId(null);
    setCodigoProducto("");
    setNombre("");
    setPrecioAnterior("");
    setCuota12("");
    setCuota8("");
    setCostoProducto("");
    setPrecioContado("");
    setTasaInteresTna("");
    setTasaMora("");
    setProveedor("");
    setDescripcion("");
    setExistingImagenUrls([]);
    setImagenes([]);
    setFactoresPlanes(FACTORES_PREDETERMINADOS);
    setPlanesActivos({
      1: true, 2: true, 3: true, 4: true, 5: true, 6: true, 7: true, 8: true, 9: true, 10: true, 11: true, 12: true
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      const totalCount = existingImagenUrls.length + imagenes.length + filesArray.length;
      if (totalCount > 4) {
        alert("Puedes subir hasta 4 fotos en total por producto.");
        return;
      }
      setImagenes(prev => [...prev, ...filesArray]);
    }
  };



  const handleSubirProducto = async (e: React.FormEvent) => {
    e.preventDefault();
    const totalImages = existingImagenUrls.length + imagenes.length;
    if (totalImages === 0) {
      return alert("Por favor selecciona al menos una imagen para el producto");
    }
    setLoading(true);

    try {
      const nuevasUrls: string[] = [];
      for (const imgFile of imagenes) {
        const pathStr = "productos/" + Date.now() + "_" + imgFile.name;
        const imageRef = ref(storage, pathStr);
        await uploadBytes(imageRef, imgFile);
        const url = await getDownloadURL(imageRef);
        nuevasUrls.push(url);
      }

      const totalUrls = [...existingImagenUrls, ...nuevasUrls];

      const payload: any = {
        codigoProducto: codigoProducto.trim() || null,
        nombre,
        precioAnterior: precioAnterior ? Number(precioAnterior) : null,
        cuota12: Number(cuota12) || 0,
        cuota8: Number(cuota8) || 0,
        costoProducto: costoProducto ? Number(costoProducto) : null,
        precioContado: precioContado ? Number(precioContado) : null,
        tasaInteresTna: tasaInteresTna ? Number(tasaInteresTna) : null,
        tasaMora: tasaMora ? Number(tasaMora) : null,
        proveedor,
        descripcion,
        imagenUrl: totalUrls[0] || "",
        imagenUrls: totalUrls,
        factoresPlanes: factoresPlanes,
        planesActivos: planesActivos,
      };

      if (editandoId) {
        await updateDoc(doc(db, "productos", editandoId), payload);
        alert("¡Producto actualizado con éxito!");
      } else {
        payload.fechaCreacion = new Date();
        await addDoc(collection(db, "productos"), payload);
        alert("¡Producto creado con éxito!");
      }

      handleCancelarEdicion();
      await fetchProductos();
    } catch (error) {
      console.error(error);
      alert("Error al guardar producto");
    } finally {
      setLoading(false);
    }
  };

  const handleEliminar = async (id: string) => {
    if (!confirm("¿Seguro que deseas eliminar permanentemente este producto?")) return;
    try {
      await deleteDoc(doc(db, "productos", id));
      if (editandoId === id) handleCancelarEdicion(); // Si borra lo que está editando
      await fetchProductos();
    } catch (error) {
      console.error(error);
      alert("Error eliminando producto");
    }
  };

  return (
    <AdminProtectedRoute>
      <div className="min-h-screen bg-[#F7F3EC] text-[#1F2928] p-4 sm:p-8 font-sans selection:bg-[#173E3B] selection:text-white">
        <div className="max-w-7xl mx-auto">
          <header className="flex justify-between items-center mb-8 border-b border-[#DED8CF] pb-4">
            <div className="flex items-center gap-4">
              <img src="/logo-cuenta-hogar-oficial.png" alt="Cuenta Hogar Logo" className="h-12 w-auto object-contain bg-[#173E3B] p-1.5 rounded-xl shadow-xs" />
              <h1 className="text-2xl sm:text-3xl font-heading font-extrabold text-[#173E3B]">Catálogo de Productos e Inventario</h1>
            </div>
            <a href="/admin" className="bg-[#FFFDFC] border border-[#DED8CF] hover:border-[#173E3B] text-[#173E3B] font-heading font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-xs">
              Volver al Panel Admin
            </a>
          </header>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-4 bg-[#FFFDFC] border border-[#DED8CF] rounded-2xl p-6 h-fit shadow-xs transition-all duration-300" style={editandoId ? {boxShadow: "0 0 30px rgba(234,179,8,0.15)", borderColor: "#eab308"} : {}}>
              <h2 className="text-xl mb-6 font-semibold border-b border-[#DED8CF] pb-2 flex items-center gap-2">
                {editandoId ? "✏️ Modificando Producto" : "Añadir Nuevo Producto"}
              </h2>
              
              <form onSubmit={handleSubirProducto} className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-[#173E3B] mb-1">Código de Producto (EAN / SKU)</label>
                    <input 
                      value={codigoProducto} 
                      onChange={e=>setCodigoProducto(e.target.value)} 
                      type="text" 
                      placeholder="Ej: 7796885403083" 
                      className="w-full bg-[#F7F3EC]/80 border border-amber-500/40 rounded p-2 text-[#1F2928] font-mono text-xs font-bold focus:border-[#173E3B] focus:outline-none" 
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-[#173E3B] mb-1">Nombre del equipo</label>
                    <input 
                      required 
                      value={nombre} 
                      onChange={e=>setNombre(e.target.value)} 
                      type="text" 
                      placeholder="Ej: Samsung Galaxy A55 5G"
                      className="w-full bg-[#F7F3EC]/80 border border-[#DED8CF] rounded p-2 text-[#1F2928] text-xs font-bold focus:border-[#173E3B] focus:outline-none" 
                    />
                  </div>
                </div>
                
                {/* MOTOR FINANCIERO CON SELECTOR Y FACTORES MODIFICABLES DE 1 A 12 CUOTAS */}
                <div className="p-5 bg-[#F7F3EC] border border-[#DED8CF] rounded-2xl space-y-4 shadow-xs">
                   <div className="flex justify-between items-center border-b border-[#DED8CF] pb-3">
                     <div>
                       <h3 className="text-xs font-black text-[#B44E2A] uppercase tracking-widest flex items-center gap-1.5">
                         💰 Motor Financiero Mandato Comercial
                       </h3>
                       <p className="text-[11px] text-[#68706E] mt-0.5">Ingresá el Costo del Proveedor para calcular automáticamente los 12 planes.</p>
                     </div>
                     <span className="text-[10px] bg-[#fe5000]/10 text-[#B44E2A] font-mono font-bold px-2 py-1 rounded-full border border-[#fe5000]/30">Planes 1 a 12</span>
                   </div>

                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                     <div>
                       <label className="block text-xs font-bold text-[#2F7D5C] mb-1">
                         Costo del Producto del Proveedor ($) <span className="text-emerald-500 text-[10px]">(Capital Exento)</span>
                       </label>
                       <input 
                         value={costoProducto} 
                         onChange={e=> {
                           const cVal = Number(e.target.value) || 0;
                           setCostoProducto(e.target.value);
                           
                           const f12 = factoresPlanes[12] || 2.5;
                           const f8 = factoresPlanes[8] || 2.12;

                           setCuota12(cVal > 0 ? Math.round((cVal * f12) / 12).toString() : "");
                           setCuota8(cVal > 0 ? Math.round((cVal * f8) / 8).toString() : "");
                           setPrecioContado(cVal > 0 ? Math.round(cVal * f12).toString() : "");
                         }} 
                         type="number" 
                         placeholder="Ej: 400000" 
                         className="w-full bg-[#FFFDFC] border border-emerald-500/50 rounded-xl p-3 text-[#1F2928] text-sm font-black focus:border-[#173E3B] focus:outline-none shadow-inner" 
                         required
                       />
                     </div>

                     <div>
                       <label className="block text-xs font-bold text-[#68706E] mb-1">Nombre del Proveedor (Opcional)</label>
                       <input value={proveedor} onChange={e=>setProveedor(e.target.value)} type="text" placeholder="Ej: Distribuidora Oficial" className="w-full bg-[#FFFDFC] border border-[#DED8CF] rounded-xl p-3 text-[#1F2928] text-xs font-bold focus:border-[#173E3B] focus:outline-none" />
                     </div>
                   </div>
                </div>

                {/* TABLA INTERACTIVA DE PLANES DE 1 A 12 CUOTAS CON TILDE Y FACTORES MODIFICABLES */}
                <div className="p-5 bg-[#F7F3EC] border border-[#DED8CF] rounded-2xl space-y-4">
                   <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-[#DED8CF] pb-3 gap-2">
                     <div>
                       <h3 className="text-xs font-black text-[#B44E2A] uppercase tracking-wider flex items-center gap-1.5">
                         📊 Habilitación de Planes (1 a 12 Cuotas)
                       </h3>
                       <p className="text-[11px] text-[#68706E] mt-0.5 font-normal">Marcá con tilde (☑️) las cuotas activas que se exhibirán en el catálogo público.</p>
                     </div>
                     <div className="flex flex-wrap items-center gap-1.5">
                       <button 
                         type="button" 
                         onClick={() => {
                           const todos: Record<number, boolean> = {};
                           for (let i = 1; i <= 12; i++) todos[i] = true;
                           setPlanesActivos(todos);
                         }}
                         className="text-[10px] bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 px-2.5 py-1 rounded-lg border border-emerald-500/40 font-black transition active:scale-95 flex items-center gap-1"
                       >
                         ☑️ Seleccionar Todos
                       </button>

                       <button 
                         type="button" 
                         onClick={() => {
                           const ninguno: Record<number, boolean> = {};
                           for (let i = 1; i <= 12; i++) ninguno[i] = false;
                           setPlanesActivos(ninguno);
                         }}
                         className="text-[10px] bg-rose-950/80 hover:bg-rose-900 text-rose-300 px-2.5 py-1 rounded-lg border border-rose-500/40 font-black transition active:scale-95 flex items-center gap-1"
                       >
                         ☐ Deseleccionar Todos
                       </button>

                       <button 
                         type="button" 
                         onClick={() => {
                           setFactoresPlanes(FACTORES_PREDETERMINADOS);
                         }}
                         className="text-[10px] bg-[#F7F3EC] hover:bg-[#FFFDFC] text-[#1F2928] px-2 py-1 rounded-lg border border-[#DED8CF] font-bold transition"
                       >
                         Resetear Factores
                       </button>
                     </div>
                   </div>

                   <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                     {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => {
                       const isActivo = planesActivos[n] !== false;
                       const factor = factoresPlanes[n] !== undefined ? factoresPlanes[n] : (FACTORES_PREDETERMINADOS[n] || 2.5);
                       const cProd = Number(costoProducto) || 0;
                       const valorTotal = Math.round(cProd * factor);
                       const cuotaMensual = n > 0 ? Math.round(valorTotal / n) : 0;
                       const exento = n > 0 ? Math.round(cProd / n) : 0;
                        const gravado = n > 0 ? Math.round(Math.max(0, valorTotal - cProd) / n) : 0;
                        const neto = n > 0 ? Math.round(gravado / 1.21) : 0;
                        const iva21 = Math.max(0, gravado - neto);

                       return (
                         <div 
                           key={n} 
                           className={`p-3 rounded-xl border transition-all ${
                             isActivo 
                               ? "bg-[#FFFDFC] border-[#DED8CF] hover:border-amber-500/50 shadow-md" 
                               : "bg-[#F7F3EC] border-[#DED8CF] opacity-60"
                           }`}
                         >
                           <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                             <div className="flex items-center gap-3">
                               <input 
                                 type="checkbox"
                                 checked={isActivo}
                                 onChange={(e) => {
                                   setPlanesActivos({ ...planesActivos, [n]: e.target.checked });
                                 }}
                                 className="w-4 h-4 accent-[#fe5000] rounded cursor-pointer"
                               />
                               <span className="text-xs font-heading font-bold text-[#173E3B] w-20">
                                 {n} {n === 1 ? "Cuota" : "Cuotas"}
                               </span>
                             </div>

                             <div className="flex items-center gap-2">
                               <span className="text-[10px] text-[#68706E] font-mono font-bold">Factor:</span>
                               <input 
                                 type="number"
                                 step="0.05"
                                 value={factor}
                                 disabled={!isActivo}
                                 onChange={(e) => {
                                   const val = parseFloat(e.target.value) || 1.0;
                                   const updated = { ...factoresPlanes, [n]: val };
                                   setFactoresPlanes(updated);

                                   if (n === 12) {
                                     setMultiplicador(val.toString());
                                     if (cProd > 0) setCuota12(Math.round((cProd * val) / 12).toString());
                                   }
                                   if (n === 8 && cProd > 0) {
                                     setCuota8(Math.round((cProd * val) / 8).toString());
                                   }
                                 }}
                                 className="w-20 bg-[#FFFDFC] border border-[#DED8CF] rounded-lg p-1.5 text-center text-[#1F2928] font-mono text-xs font-bold outline-none focus:border-amber-400"
                               />
                             </div>

                             <div className="text-right flex-1 sm:flex-none">
                               <span className="text-xs font-black text-[#B44E2A]">
                                 ${cuotaMensual.toLocaleString("es-AR")} <span className="text-[10px] font-normal text-[#68706E]">/ mes</span>
                               </span>
                               <div className="text-[9px] text-[#68706E] font-mono mt-0.5">
                                <div className="text-[9px] text-[#68706E] font-mono mt-0.5">
                                  🟢 Recibo X: ${exento.toLocaleString("es-AR")} | 🔵 Fact B: ${gravado.toLocaleString("es-AR")} <span className="text-blue-300/80">(Neto: ${neto.toLocaleString("es-AR")} + IVA 21%: ${iva21.toLocaleString("es-AR")})</span>
                                </div>
                               </div>
                             </div>
                           </div>
                         </div>
                       );
                     })}
                   </div>
                </div>
                <div className="p-4 bg-[#F7F3EC] border border-[#DED8CF] rounded-2xl space-y-3 shadow-xs">
                   <div className="flex justify-between items-center border-b border-[#DED8CF] pb-2">
                     <label className="block text-xs font-black text-[#173E3B] uppercase tracking-wider flex items-center gap-1.5">
                       📝 Descripción corta y Ficha Técnica
                     </label>
                   </div>
                   <textarea 
                     required 
                     value={descripcion} 
                     onChange={e=>setDescripcion(e.target.value)} 
                     placeholder="Ej: Ficha técnica detallada del equipo, pantalla, almacenamiento, procesador y garantía..." 
                     className="w-full bg-[#FFFDFC] border border-[#DED8CF] rounded-xl p-3 text-[#1F2928] text-xs font-mono focus:border-[#173E3B] focus:outline-none leading-relaxed shadow-inner" 
                     rows={6} 
                   />
                </div>
                <div>
                  <label className="block text-sm mb-2 text-[#173E3B]">
                    Imágenes del Producto (Máximo 4)
                  </label>
                  
                  <div className="grid grid-cols-4 gap-2 mb-3">
                    {existingImagenUrls.map((url, idx) => (
                      <div key={`existing-${idx}`} className="relative aspect-square bg-[#FFFDFC] border border-[#DED8CF] rounded-lg overflow-hidden flex items-center justify-center group">
                        <img src={url} alt={`Imagen ${idx + 1}`} className="w-full h-full object-contain" />
                        <button
                          type="button"
                          onClick={() => {
                            setExistingImagenUrls(prev => prev.filter((_, i) => i !== idx));
                          }}
                          className="absolute inset-0 bg-red-600/85 text-white font-bold opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-xs"
                        >
                          Eliminar
                        </button>
                      </div>
                    ))}
                    
                    {imagenes.map((file, idx) => {
                      const previewUrl = URL.createObjectURL(file);
                      return (
                        <div key={`new-${idx}`} className="relative aspect-square bg-[#FFFDFC] border border-[#DED8CF] rounded-lg overflow-hidden flex items-center justify-center group">
                          <img src={previewUrl} alt={`Nueva Imagen ${idx + 1}`} className="w-full h-full object-contain" />
                          <button
                            type="button"
                            onClick={() => {
                              setImagenes(prev => prev.filter((_, i) => i !== idx));
                            }}
                            className="absolute inset-0 bg-red-600/85 text-white font-bold opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-xs"
                          >
                            Eliminar
                          </button>
                        </div>
                      );
                    })}
                    
                    {Array.from({ length: Math.max(0, 4 - (existingImagenUrls.length + imagenes.length)) }).map((_, idx) => (
                      <div key={`empty-${idx}`} className="aspect-square bg-[#FFFDFC]/40 border border-dashed border-[#DED8CF] rounded-lg flex items-center justify-center text-zinc-600 text-xs">
                        Vacío
                      </div>
                    ))}
                  </div>

                  {existingImagenUrls.length + imagenes.length < 4 && (
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleFileChange}
                      className="w-full bg-[#F7F3EC]/80 border border-[#DED8CF] rounded p-2 text-[#1F2928] file:mr-4 file:py-1 file:px-4 file:rounded file:border-0 file:text-sm file:bg-yellow-500 file:text-black hover:file:bg-yellow-400 transition-colors cursor-pointer text-xs"
                    />
                  )}
                </div>
                
                <div className="pt-4 flex flex-col gap-3">
                  <button disabled={loading} type="submit" className={`w-full text-white py-3.5 rounded-xl font-heading font-bold uppercase tracking-wider transition-all shadow-xs ${editandoId ? 'bg-blue-600 hover:bg-blue-500' : 'bg-[#173E3B] hover:bg-[#123230]'} disabled:opacity-50`}>
                    {loading ? "Guardando..." : (editandoId ? "💾 Guardar Cambios" : "Crear Producto")}
                  </button>
                  
                  {editandoId && (
                    <button type="button" onClick={handleCancelarEdicion} className="w-full bg-transparent border border-gray-600 text-[#68706E] py-2 rounded hover:text-white hover:bg-gray-800 transition-colors text-sm">
                      Cancelar Edición
                    </button>
                  )}
                </div>
              </form>
            </div>

            <div className="lg:col-span-8 bg-[#FFFDFC] border border-[#DED8CF] rounded-2xl p-6 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center border-b border-[#DED8CF] pb-3 mb-6 gap-3">
                <h2 className="text-xl font-semibold">Inventario General ({productos.length})</h2>
                <button
                  onClick={() => setMostrarTrasladoModal(true)}
                  className="bg-[#173E3B] hover:bg-[#123230] text-white px-4 py-2.5 rounded-xl font-heading font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2 shadow-xs"
                >
                  🚚 Nuevo Remito de Traslado
                </button>
              </div>
              {productos.length === 0 ? (
                <p className="text-[#173E3B]/50 italic">No hay productos en tu base de datos todavía.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                  {productos.map(p => (
                    <AdminProductCard
                      key={p.id}
                      p={p}
                      editandoId={editandoId}
                      handleEditar={handleEditar}
                      handleEliminar={handleEliminar}
                      handleOpenStockManager={setStockProducto}
                      handleTogglePublicar={handleTogglePublicar}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* MODAL GESTOR DE STOCK */}
      {stockProducto && (
        <div className="fixed inset-0 bg-[#FFFDFC]/80 backdrop-blur-md flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-[#FFFDFC] border border-[#DED8CF] rounded-3xl w-full max-w-2xl p-6 md:p-8 max-h-[90vh] overflow-y-auto space-y-6 custom-scrollbar shadow-xs">
            
            <div className="flex justify-between items-center border-b border-[#DED8CF] pb-4">
              <div>
                <h2 className="text-xl font-black text-[#B44E2A]">Control de Inventario por Localidades</h2>
                <p className="text-xs text-[#68706E]">{stockProducto.nombre}</p>
              </div>
              <button onClick={() => setStockProducto(null)} className="text-[#68706E] hover:text-white font-black text-sm">
                ✕ Cerrar
              </button>
            </div>

            {/* Formulario de carga de unidad */}
            <form onSubmit={handleAgregarUnidadStock} className="bg-[#121316] border border-[#DED8CF] p-4 rounded-xl space-y-4">
              <h3 className="text-xs font-black text-[#B44E2A] uppercase tracking-widest border-b border-[#DED8CF] pb-2">Ingresar Nueva Unidad Física</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#68706E] mb-1">Localidad del Stock</label>
                  <select 
                    value={nuevaUnidadLocalidad} 
                    onChange={e => setNuevaUnidadLocalidad(e.target.value)} 
                    className="w-full bg-[#FFFDFC] border border-[#DED8CF] p-2.5 rounded-lg text-[#1F2928] text-xs font-bold focus:border-[#173E3B] outline-none"
                  >
                    {LOCALIDADES_STOCK.map(loc => (
                      <option key={loc} value={loc}>{loc}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#68706E] mb-1">N° de Serie / IMEI (Opcional)</label>
                  <input 
                    type="text" 
                    value={nuevaUnidadNserie} 
                    onChange={e => setNuevaUnidadNserie(e.target.value)} 
                    placeholder="Ej: SN-492849204" 
                    className="w-full bg-[#FFFDFC] border border-[#DED8CF] p-2.5 rounded-lg text-[#1F2928] text-xs font-bold focus:border-[#173E3B] outline-none font-mono" 
                  />
                </div>
              </div>
              <button 
                type="submit" 
                className="w-full bg-[#173E3B] hover:bg-[#123230] text-white py-3 rounded-xl font-heading font-bold text-xs uppercase tracking-wider transition-all shadow-xs"
              >
                + Agregar Unidad a Stock
              </button>
            </form>

            {/* Listado de unidades actuales */}
            <div className="space-y-3">
              <h3 className="text-xs font-black text-[#68706E] uppercase tracking-widest border-b border-[#DED8CF] pb-2">Legajos de Unidades Registradas</h3>
              <div className="max-h-[300px] overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                {(stockProducto.stock || []).length === 0 ? (
                  <p className="text-xs text-[#68706E] italic text-center py-6">No hay unidades cargadas en stock para este producto.</p>
                ) : (
                  (stockProducto.stock || []).map((u: UnidadStock) => (
                    <div key={u.id} className="flex justify-between items-center bg-[#F7F3EC] p-3 rounded-xl border border-[#DED8CF]">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] bg-[#FFFDFC] text-[#B44E2A] px-2 py-0.5 rounded font-black border border-[#DED8CF]">
                            {u.localidad}
                          </span>
                          <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                            u.estado === "Disponible" ? "bg-green-500/10 text-[#2F7D5C] border border-green-500/20" :
                            u.estado === "Vendido" ? "bg-red-500/10 text-red-400 border-red-500/20" :
                            "bg-blue-500/10 text-blue-400 border-blue-500/20"
                          }`}>
                            {u.estado}
                          </span>
                        </div>
                        {u.nserie && (
                          <p className="text-xs text-[#68706E] font-mono">IMEI/Serie: {u.nserie}</p>
                        )}
                        <p className="text-[9px] text-[#68706E]">Ingreso: {new Date(u.fechaIngreso).toLocaleString("es-AR")}</p>
                      </div>
                      {u.estado === "Disponible" && (
                        <button 
                          type="button" 
                          onClick={() => handleQuitarUnidadStock(u.id)} 
                          className="text-xs text-red-500 hover:text-red-400 font-bold px-3 py-1 rounded hover:bg-red-950/20 border border-transparent hover:border-red-900/30 transition-all"
                        >
                          🗑️ Remover
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* MODAL REMITO DE TRASLADO INTERNO MULTIPRODUCTO */}
      {mostrarTrasladoModal && (
        <div className="fixed inset-0 bg-[#FFFDFC]/85 backdrop-blur-md flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-[#FFFDFC] border border-[#DED8CF] rounded-3xl w-full max-w-4xl p-6 md:p-8 max-h-[90vh] overflow-y-auto space-y-6 custom-scrollbar shadow-xs">
            
            <div className="flex justify-between items-center border-b border-[#DED8CF] pb-4">
              <div>
                <h2 className="text-xl font-black text-[#B44E2A]">Generar Remito de Traslado Interno</h2>
                <p className="text-xs text-[#68706E]">Mover stock entre sucursales y nutrir puntos de venta</p>
              </div>
              <button 
                onClick={() => setMostrarTrasladoModal(false)} 
                className="text-[#68706E] hover:text-white font-black text-sm"
              >
                ✕ Cerrar
              </button>
            </div>

            <form onSubmit={handleGenerarTrasladoYActualizarDb} className="space-y-6">
              
              {/* Origen y Destino */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-[#F7F3EC] p-4 rounded-xl border border-[#DED8CF]">
                <div>
                  <label className="block text-xs font-bold text-[#68706E] mb-1">Localidad de Origen (Despacho)</label>
                  <select 
                    value={trasladoOrigen} 
                    onChange={e => {
                      setTrasladoOrigen(e.target.value);
                      // Clear line selections since origin changed
                      setTrasladoLineas(prev => prev.map(l => ({ ...l, selectedUnitIds: [], nseries: [], cantidad: 1 })));
                    }}
                    className="w-full bg-[#FFFDFC] border border-[#DED8CF] p-2.5 rounded-lg text-[#1F2928] text-xs font-bold focus:border-[#173E3B] outline-none"
                  >
                    {LOCALIDADES_STOCK.map(loc => (
                      <option key={loc} value={loc}>{loc}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#68706E] mb-1">Localidad de Destino (Recepción)</label>
                  <select 
                    value={trasladoDestino} 
                    onChange={e => setTrasladoDestino(e.target.value)} 
                    className="w-full bg-[#FFFDFC] border border-[#DED8CF] p-2.5 rounded-lg text-[#1F2928] text-xs font-bold focus:border-[#173E3B] outline-none"
                  >
                    {LOCALIDADES_STOCK.map(loc => (
                      <option key={loc} value={loc}>{loc}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Listado de Productos */}
              <div className="space-y-4">
                <div className="flex justify-between items-center border-b border-[#DED8CF] pb-2">
                  <h3 className="text-xs font-black text-[#68706E] uppercase tracking-widest">Productos a Enviar</h3>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleAgregarLineaTraslado(false)}
                      className="bg-[#121316] hover:bg-[#F7F3EC] text-[#B44E2A] border border-[#DED8CF] hover:border-[#fe5000] px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors"
                    >
                      + Catálogo
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAgregarLineaTraslado(true)}
                      className="bg-[#121316] hover:bg-[#F7F3EC] text-blue-400 border border-[#DED8CF] hover:border-blue-500 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors"
                    >
                      + Producto Manual
                    </button>
                  </div>
                </div>

                <div className="space-y-4 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
                  {trasladoLineas.map((line, idx) => {
                    const matchedProd = productos.find(p => p.id === line.productoId);
                    // Filter available units at chosen origin
                    const availableUnits = matchedProd ? (matchedProd.stock || []).filter((u: any) => u.localidad === trasladoOrigen && u.estado === "Disponible") : [];

                    return (
                      <div key={line.id} className="bg-[#F7F3EC] p-4 rounded-xl border border-[#DED8CF] space-y-3 relative">
                        <button
                          type="button"
                          onClick={() => handleQuitarLineaTraslado(line.id)}
                          className="absolute right-3 top-3 text-red-500 hover:text-red-400 text-xs font-bold"
                        >
                          Remover Fila
                        </button>

                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-[9px] bg-[#FFFDFC] border border-[#DED8CF] text-[#68706E] px-2 py-0.5 rounded font-black uppercase">
                            Ítem #{idx + 1}
                          </span>
                          <span className={`text-[9px] px-2 py-0.5 rounded font-black uppercase ${line.isManual ? 'bg-blue-900/30 text-blue-400 border border-blue-900/40' : 'bg-yellow-900/30 text-[#B44E2A] border border-yellow-900/40'}`}>
                            {line.isManual ? "Manual" : "Catálogo"}
                          </span>
                        </div>

                        {line.isManual ? (
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div className="md:col-span-2">
                              <label className="block text-[10px] text-[#68706E] mb-1 font-bold">Nombre del Producto / Insumo</label>
                              <input 
                                type="text"
                                required
                                value={line.manualNombre}
                                onChange={e => handleUpdateLineaTraslado(line.id, { manualNombre: e.target.value })}
                                placeholder="Ej: Fundas protectoras, cables, etc."
                                className="w-full bg-[#FFFDFC] border border-[#DED8CF] p-2 rounded text-xs text-white outline-none focus:border-blue-500 font-bold"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] text-[#68706E] mb-1 font-bold">Cantidad</label>
                              <input 
                                type="number"
                                min={1}
                                required
                                value={line.cantidad}
                                onChange={e => handleUpdateLineaTraslado(line.id, { cantidad: Math.max(1, Number(e.target.value)) })}
                                className="w-full bg-[#FFFDFC] border border-[#DED8CF] p-2 rounded text-xs text-white outline-none focus:border-blue-500 font-bold font-mono"
                              />
                            </div>
                            <div className="md:col-span-3">
                              <label className="block text-[10px] text-[#68706E] mb-1 font-bold">Números de Serie / IMEIs (Opcional, separados por comas)</label>
                              <input 
                                type="text"
                                value={line.manualSerialsText}
                                onChange={e => handleUpdateLineaTraslado(line.id, { manualSerialsText: e.target.value })}
                                placeholder="Ej: SN-9284201, SN-9284202"
                                className="w-full bg-[#FFFDFC] border border-[#DED8CF] p-2 rounded text-xs text-[#1F2928] outline-none focus:border-blue-500 font-mono"
                              />
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                              <div className="md:col-span-2">
                                <label className="block text-[10px] text-[#68706E] mb-1 font-bold">Seleccionar Producto del Catálogo</label>
                                <select 
                                  value={line.productoId}
                                  onChange={e => {
                                    handleUpdateLineaTraslado(line.id, {
                                      productoId: e.target.value,
                                      selectedUnitIds: [],
                                      nseries: [],
                                      cantidad: 1
                                    });
                                  }}
                                  className="w-full bg-[#FFFDFC] border border-[#DED8CF] p-2 rounded text-xs text-white outline-none focus:border-[#fe5000] font-bold"
                                >
                                  <option value="">-- Seleccionar --</option>
                                  {productos.map(p => (
                                    <option key={p.id} value={p.id}>{p.nombre}</option>
                                  ))}
                                </select>
                              </div>
                              <div>
                                <label className="block text-[10px] text-[#68706E] mb-1 font-bold">Cantidad a Trasladar</label>
                                <div className="w-full bg-[#FFFDFC] border border-[#DED8CF] p-2 rounded text-xs text-[#68706E] font-black font-mono">
                                  {line.selectedUnitIds?.length || 0} unidades
                                </div>
                              </div>
                            </div>

                            {line.productoId && (
                              <div className="bg-[#FFFDFC] border border-[#DED8CF] p-3 rounded-lg space-y-2">
                                <p className="text-[10px] text-[#68706E] font-bold border-b border-[#DED8CF] pb-1">
                                  Unidades disponibles en {trasladoOrigen} ({availableUnits.length}):
                                </p>
                                {availableUnits.length === 0 ? (
                                  <p className="text-xs text-red-400 italic">No hay stock disponible en el origen seleccionado para este producto.</p>
                                ) : (
                                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-[100px] overflow-y-auto custom-scrollbar">
                                    {availableUnits.map((u: any) => {
                                      const isChecked = line.selectedUnitIds?.includes(u.id);
                                      return (
                                        <label 
                                          key={u.id} 
                                          className={`flex items-center gap-2 p-1.5 rounded border transition-colors cursor-pointer text-xs ${
                                            isChecked 
                                              ? 'bg-[#fe5000]/10 border-[#fe5000]/40 text-[#B44E2A]' 
                                              : 'bg-[#121316] border-[#DED8CF] text-[#68706E] hover:border-[#DED8CF]'
                                          }`}
                                        >
                                          <input 
                                            type="checkbox"
                                            checked={isChecked}
                                            onChange={() => handleToggleSeleccionUnidadStock(line.id, u)}
                                            className="accent-yellow-500"
                                          />
                                          <span className="font-mono text-[10px] truncate">
                                            {u.nserie ? `Serie: ${u.nserie}` : "Sin N° Serie"}
                                          </span>
                                        </label>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Observaciones */}
              <div>
                <label className="block text-xs font-bold text-[#68706E] mb-1">Observaciones / Comentario</label>
                <textarea 
                  value={trasladoComentario} 
                  onChange={e => setTrasladoComentario(e.target.value)} 
                  placeholder="Ej: Traslado interno para reabastecer stock de sucursal por alta demanda." 
                  className="w-full bg-[#121316] border border-[#DED8CF] p-2.5 rounded-lg text-white text-xs focus:border-[#fe5000] outline-none" 
                  rows={2}
                />
              </div>

              <div className="flex gap-3 pt-3 border-t border-[#DED8CF]">
                <button 
                  type="button" 
                  onClick={() => setMostrarTrasladoModal(false)}
                  className="flex-1 bg-[#F7F3EC] hover:bg-[#FFFDFC] text-[#1F2928] py-3 rounded-lg font-bold text-xs uppercase tracking-wider transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="flex-1 bg-[#173E3B] hover:bg-[#123230] text-white py-3 rounded-xl font-heading font-bold text-xs uppercase tracking-wider transition-all shadow-xs"
                >
                  🚚 Generar Remito y Procesar Traslado
                </button>
              </div>

            </form>
          </div>
        </div>
      )}
    </AdminProtectedRoute>
  );
}

function AdminProductCard({ 
  p, 
  editandoId, 
  handleEditar, 
  handleEliminar,
  handleOpenStockManager,
  handleTogglePublicar
}: { 
  p: Producto; 
  editandoId: string | null; 
  handleEditar: (p: Producto) => void; 
  handleEliminar: (id: string) => void; 
  handleOpenStockManager: (p: Producto) => void; 
  handleTogglePublicar: (p: Producto) => void;
}) {
  const [activeIdx, setActiveIdx] = useState(0);
  const images = p.imagenUrls && p.imagenUrls.length > 0 ? p.imagenUrls : (p.imagenUrl ? [p.imagenUrl] : []);

  const handleNext = (e: React.MouseEvent) => {
    e.preventDefault();
    setActiveIdx((prev) => (prev + 1) % images.length);
  };

  const handlePrev = (e: React.MouseEvent) => {
    e.preventDefault();
    setActiveIdx((prev) => (prev - 1 + images.length) % images.length);
  };

  return (
    <div className={`border rounded-xl bg-[#FFFDFC] flex flex-col shadow-xs overflow-hidden transition-all ${editandoId === p.id ? 'border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.5)]' : 'border-[#DED8CF]'}`}>
      <div className="h-40 relative bg-[#F7F3EC] p-2 flex items-center justify-center group">
        {images.length > 0 ? (
          <img src={images[activeIdx]} alt={p.nombre} className="max-w-full max-h-full object-contain" />
        ) : (
          <span className="text-zinc-600 text-xs italic">Sin imagen</span>
        )}
        
        {images.length > 1 && (
          <>
            {/* Flecha Izquierda */}
            <button
              onClick={handlePrev}
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-[#FFFDFC]/60 hover:bg-[#FFFDFC]/80 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity z-10 w-6 h-6 flex items-center justify-center font-bold"
            >
              &larr;
            </button>
            
            {/* Flecha Derecha */}
            <button
              onClick={handleNext}
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-[#FFFDFC]/60 hover:bg-[#FFFDFC]/80 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity z-10 w-6 h-6 flex items-center justify-center font-bold"
            >
              &rarr;
            </button>

            {/* Dots */}
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1 z-10">
              {images.map((_, i) => (
                <span
                  key={i}
                  className={`w-1.5 h-1.5 rounded-full ${
                    i === activeIdx ? 'bg-yellow-400' : 'bg-zinc-500'
                  }`}
                />
              ))}
            </div>
          </>
        )}

        {editandoId === p.id && <div className="absolute inset-0 bg-blue-500/10 backdrop-blur-[1px] flex items-center justify-center z-10"><span className="bg-blue-600 text-white font-bold px-3 py-1 rounded-full text-xs shadow-xs">EDITANDO</span></div>}
      </div>
      <div className="p-4 flex-1 flex flex-col">
        <div className="flex justify-between items-center mb-2">
          <span className={`text-[10px] px-2 py-0.5 rounded font-black uppercase shadow-sm ${
            (p.activo !== false && p.publicado !== false) 
              ? "bg-green-500/20 text-[#2F7D5C] border border-green-500/30" 
              : "bg-red-500/20 text-red-400 border border-red-500/30"
          }`}>
            {(p.activo !== false && p.publicado !== false) ? "🟢 Publicado en Tienda" : "🔴 Borrador (Oculto)"}
          </span>

          <button
            type="button"
            onClick={() => handleTogglePublicar(p)}
            className={`text-[10px] font-bold px-2 py-0.5 rounded transition-all ${
              (p.activo !== false && p.publicado !== false)
                ? "bg-red-950/40 hover:bg-red-900/60 text-red-300 border border-red-800/50"
                : "bg-green-950/40 hover:bg-green-900/60 text-green-300 border border-green-800/50"
            }`}
          >
            {(p.activo !== false && p.publicado !== false) ? "✕ Ocultar" : "👁️ Publicar"}
          </button>
        </div>
        <h3 className="font-bold text-md mb-4 line-clamp-2 leading-tight">{p.nombre}</h3>
        
        {/* Datos Internos Admin */}
        <div className="bg-[#F7F3EC] border border-[#DED8CF] p-3 rounded-xl mb-3 text-xs flex flex-col gap-1">
          <p className="text-[#68706E] font-bold uppercase mb-1 border-b border-[#DED8CF] pb-1">Administrativo</p>
          <p className="text-[#68706E]">Costo: <span className="font-mono">${p.costoProducto || 0}</span></p>
          <p className="text-[#68706E]">Contado: <span className="text-[#2F7D5C] font-mono font-bold">${p.precioContado || 0}</span></p>
          <p className="text-[#68706E]">TNA: <span className="font-mono">{p.tasaInteresTna || 0}%</span></p>
          <p className="text-[#68706E]">Mora: <span className="font-mono">{p.tasaMora || 0}% diaria</span></p>
          <p className="text-[#68706E] line-clamp-1">Provee: <span className="text-yellow-100">{p.proveedor || "No indicado"}</span></p>
        </div>

        {/* Resumen de Stock por Localidad */}
        <div className="bg-[#F7F3EC] border border-[#DED8CF] p-3 rounded-xl mb-3 text-xs flex flex-col gap-1">
          <p className="text-[#68706E] font-bold uppercase mb-1 border-b border-[#DED8CF] pb-1">Stock Disponible</p>
          {LOCALIDADES_STOCK.map(loc => {
            const count = (p.stock || []).filter(u => u.localidad === loc && u.estado === "Disponible").length;
            if (count === 0) return null;
            return (
              <p key={loc} className="text-[#1F2928] flex justify-between">
                <span>{loc}:</span>
                <span className="font-bold text-[#B44E2A] font-mono">{count} u.</span>
              </p>
            );
          })}
          {(!p.stock || p.stock.filter(u => u.estado === "Disponible").length === 0) && (
            <p className="text-zinc-600 italic">Sin unidades disponibles</p>
          )}
        </div>

        {/* Datos Publicos Cuotas */}
        <div className="bg-[#FFFDFC] border border-[#DED8CF] p-3 rounded-lg mb-5 text-xs">
          <p className="text-[#B44E2A] font-bold uppercase mb-1 border-b border-[#DED8CF] pb-1">Público</p>
          {p.precioAnterior && <p className="text-[#68706E] line-through mb-1">Antes: ${p.precioAnterior}</p>}
          <p className="text-[#B44E2A] font-bold text-sm mb-1">12 x ${p.cuota12}</p>
          <p className="text-[#B44E2A] font-bold text-sm">8 x ${p.cuota8}</p>
        </div>

        <button 
          onClick={() => handleOpenStockManager(p)}
          className="w-full text-xs bg-[#121316] border border-[#DED8CF] hover:border-[#fe5000] text-[#B44E2A] py-2 rounded-lg font-black uppercase tracking-widest transition-all mb-3 flex items-center justify-center gap-2"
        >
          📦 Gestionar Stock
        </button>
        
        <div className="mt-auto flex gap-2 w-full">
          <button onClick={() => handleEditar(p)} className="flex-1 text-sm bg-[#F7F3EC]/80 text-blue-400 border border-[#DED8CF] hover:bg-gray-200 hover:text-blue-300 hover:border-blue-500 py-2.5 rounded-lg text-center transition-all font-bold tracking-widest uppercase">
            Editar
          </button>
          <button onClick={() => handleEliminar(p.id)} className="flex-1 text-sm bg-[#F7F3EC]/80 text-red-500/80 border border-[#DED8CF] hover:bg-red-900/50 hover:text-red-400 hover:border-red-900 py-2.5 rounded-lg text-center transition-all font-bold tracking-widest uppercase">
            Borrar
          </button>
        </div>
      </div>
    </div>
  );
}
