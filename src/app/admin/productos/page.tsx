"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminProtectedRoute } from "@/components/AdminProtectedRoute";
import { CatalogVisibilityControl } from "@/components/admin/catalog/CatalogVisibilityControl";
import { CatalogReferenceWorkspace } from "@/components/admin/catalog/CatalogReferenceWorkspace";
import type { Producto, UnidadStock } from "@/components/admin/catalog/catalogStockTypes";
import { db } from "@/lib/firebase";
import { collection, getDocs, getDoc, doc, updateDoc } from "firebase/firestore";
import { generarRemitoMultiProducto } from "@/lib/pdfGenerator";

type LineaTraslado = { id: string; productoId: string; cantidad: number; selectedUnitIds: string[]; nseries: string[]; isManual: boolean; manualNombre: string; manualSerialsText: string };
const LOCALIDADES_STOCK = ["Buenos Aires", "Lincoln", "Chivilcoy", "Los Toldos", "O'Brien", "Zavalia"];

export default function AdminProductosPage() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loadError, setLoadError] = useState("");
  const [fetching, setFetching] = useState(true);
  const fetchProductos = useCallback(async () => {
    setLoadError("");
    setFetching(true);
    try {
      const snapshot = await getDocs(collection(db, "productos"));
      setProductos(snapshot.docs.map(document => ({ ...document.data(), id: document.id }) as Producto));
    } catch { setLoadError("No pudimos cargar las referencias. Reintentá la consulta."); }
    finally { setFetching(false); }
  }, []);
  useEffect(() => { void fetchProductos(); }, [fetchProductos]);
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
  const [trasladoLineas, setTrasladoLineas] = useState<LineaTraslado[]>([
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

  const handleUpdateLineaTraslado = (id: string, updates: Partial<LineaTraslado>) => {
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
              const updatedStock = (pData.stock || []).map((u: UnidadStock) => {
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


  return <AdminProtectedRoute>
    <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6"><CatalogVisibilityControl /></div>
    <CatalogReferenceWorkspace productos={productos} fetching={fetching} loadError={loadError} onRefresh={fetchProductos} onStock={setStockProducto} onTransfer={() => setMostrarTrasladoModal(true)} />
      {/* MODAL GESTOR DE STOCK */}
      {stockProducto && (
        <div className="fixed inset-0 bg-[#FFFDFC]/80 backdrop-blur-md flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div role="dialog" aria-modal="true" aria-label="Stock / unidades" className="bg-[#FFFDFC] border border-[#DED8CF] rounded-3xl w-full max-w-2xl p-6 md:p-8 max-h-[90vh] overflow-y-auto space-y-6 custom-scrollbar shadow-xs">

            <div className="flex justify-between items-center border-b border-[#DED8CF] pb-4">
              <div>
                <h2 className="text-xl font-black text-[#B44E2A]">Control de Inventario por Localidades</h2>
                <p className="text-xs text-[#68706E]">{stockProducto.nombre}</p>
              </div>
              <button onClick={() => setStockProducto(null)} className="min-h-11 px-3 text-[#68706E] hover:text-brand-primary font-black text-sm">
                ✕ Cerrar
              </button>
            </div>

            {/* Formulario de carga de unidad */}
            <form onSubmit={handleAgregarUnidadStock} className="bg-[#F7F3EC] border border-[#DED8CF] p-4 rounded-xl space-y-4">
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
          <div role="dialog" aria-modal="true" aria-label="Traslado interno" className="bg-[#FFFDFC] border border-[#DED8CF] rounded-3xl w-full max-w-4xl p-6 md:p-8 max-h-[90vh] overflow-y-auto space-y-6 custom-scrollbar shadow-xs">

            <div className="flex justify-between items-center border-b border-[#DED8CF] pb-4">
              <div>
                <h2 className="text-xl font-black text-[#B44E2A]">Generar Remito de Traslado Interno</h2>
                <p className="text-xs text-[#68706E]">Organizá el traslado interno de unidades entre ubicaciones</p>
              </div>
              <button
                onClick={() => setMostrarTrasladoModal(false)}
                className="min-h-11 px-3 text-[#68706E] hover:text-brand-primary font-black text-sm"
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
                      className="bg-[#F7F3EC] hover:bg-[#F7F3EC] text-[#B44E2A] border border-[#DED8CF] hover:border-[#fe5000] px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors"
                    >
                      + Catálogo
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAgregarLineaTraslado(true)}
                      className="bg-[#F7F3EC] hover:bg-[#F7F3EC] text-blue-400 border border-[#DED8CF] hover:border-blue-500 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors"
                    >
                      + Producto Manual
                    </button>
                  </div>
                </div>

                <div className="space-y-4 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
                  {trasladoLineas.map((line, idx) => {
                    const matchedProd = productos.find(p => p.id === line.productoId);
                    // Filter available units at chosen origin
                    const availableUnits = matchedProd ? (matchedProd.stock || []).filter((u: UnidadStock) => u.localidad === trasladoOrigen && u.estado === "Disponible") : [];

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
                                className="w-full bg-[#FFFDFC] border border-[#DED8CF] p-2 rounded text-xs text-[#1F2928] outline-none focus:border-blue-500 font-bold"
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
                                className="w-full bg-[#FFFDFC] border border-[#DED8CF] p-2 rounded text-xs text-[#1F2928] outline-none focus:border-blue-500 font-bold font-mono"
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
                                  className="w-full bg-[#FFFDFC] border border-[#DED8CF] p-2 rounded text-xs text-[#1F2928] outline-none focus:border-[#fe5000] font-bold"
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
                                    {availableUnits.map((u: UnidadStock) => {
                                      const isChecked = line.selectedUnitIds?.includes(u.id);
                                      return (
                                        <label
                                          key={u.id}
                                          className={`flex items-center gap-2 p-1.5 rounded border transition-colors cursor-pointer text-xs ${
                                            isChecked
                                              ? 'bg-[#fe5000]/10 border-[#fe5000]/40 text-[#B44E2A]'
                                              : 'bg-[#F7F3EC] border-[#DED8CF] text-[#68706E] hover:border-[#DED8CF]'
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
                  className="w-full bg-[#F7F3EC] border border-[#DED8CF] p-2.5 rounded-lg text-[#1F2928] text-xs focus:border-[#fe5000] outline-none"
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
  </AdminProtectedRoute>;
}
