"use client";

import { useEffect, useState } from "react";
import { AdminNav } from "@/components/AdminNav";
import { 
  getShippingDraftConfig, 
  saveShippingDraftConfig, 
  publishShippingConfig, 
  ShippingConfig, 
  ShippingDestination, 
  ShippingLoadType, 
  ShippingRate,
  DEFAULT_SHIPPING_SETTINGS
} from "@/lib/shippingManager";
import { 
  Truck, MapPin, Package, DollarSign, Save, Send, Eye, Settings, 
  Plus, Edit, Check, X, AlertCircle, CheckCircle2, ShieldCheck, Sparkles, RefreshCw
} from "lucide-react";

export default function AdminEnviosPage() {
  const [config, setConfig] = useState<ShippingConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [activeTab, setActiveTab] = useState<"destinations" | "loadTypes" | "rates" | "preview" | "settings">("destinations");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Active Selected Destination for Rates Matrix
  const [matrixDestId, setMatrixDestId] = useState<string>("");

  // Modal / Form States for Destinations
  const [editDestModal, setEditDestModal] = useState<boolean>(false);
  const [currentDest, setCurrentDest] = useState<Partial<ShippingDestination>>({});

  // Modal / Form States for Load Types
  const [editLoadModal, setEditLoadModal] = useState<boolean>(false);
  const [currentLoad, setCurrentLoad] = useState<Partial<ShippingLoadType>>({});

  // Preview State
  const [prevDestId, setPrevDestId] = useState<string>("");
  const [prevLoadId, setPrevLoadId] = useState<string>("");
  const [prevBultos, setPrevBultos] = useState<number>(1);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    setLoading(true);
    const data = await getShippingDraftConfig();
    setConfig(data);
    if (data.destinations && data.destinations.length > 0) {
      setMatrixDestId(data.destinations[0].id);
      setPrevDestId(data.destinations[0].id);
    }
    if (data.loadTypes && data.loadTypes.length > 0) {
      setPrevLoadId(data.loadTypes[0].id);
    }
    setLoading(false);
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleSaveDraft = async () => {
    if (!config) return;
    setSaving(true);
    try {
      await saveShippingDraftConfig(config);
      setHasUnsavedChanges(false);
      showToast("✅ Borrador de Envíos Low Cost guardado exitosamente.");
    } catch (err) {
      alert("Error al guardar el borrador.");
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!config) return;
    if (!confirm("¿Confirma que desea publicar la configuración de Envíos Low Cost a producción?")) return;
    setPublishing(true);
    try {
      await publishShippingConfig(config);
      setHasUnsavedChanges(false);
      showToast("🚀 Configuración publicada exitosamente a producción.");
      await loadConfig();
    } catch (err) {
      alert("Error al publicar la configuración.");
    } finally {
      setPublishing(false);
    }
  };

  // DESTINATIONS CRUD
  const handleSaveDestination = () => {
    if (!config || !currentDest.name || !currentDest.id) {
      alert("Por favor complete los campos obligatorios.");
      return;
    }
    const cleanId = currentDest.id.trim().toLowerCase().replace(/\s+/g, "_");
    const existingIdx = config.destinations.findIndex(d => d.id === cleanId);
    
    let updatedDestinations = [...config.destinations];
    const newDestObj: ShippingDestination = {
      id: cleanId,
      name: currentDest.name.trim(),
      code: (currentDest.code || cleanId.slice(0, 3)).toUpperCase(),
      timeframe: currentDest.timeframe || "Recorrido programado",
      order: Number(currentDest.order) || (updatedDestinations.length + 1),
      active: currentDest.active !== false,
      visible: currentDest.visible !== false,
      manualQuote: Boolean(currentDest.manualQuote),
      estimatedBase: Number(currentDest.estimatedBase) || 12000,
      notes: currentDest.notes || "",
    };

    if (existingIdx >= 0) {
      updatedDestinations[existingIdx] = newDestObj;
    } else {
      updatedDestinations.push(newDestObj);
    }

    updatedDestinations.sort((a, b) => a.order - b.order);

    const updatedRates = { ...config.rates };
    for (const load of config.loadTypes) {
      for (let q = 1; q <= 5; q++) {
        const rateId = `${cleanId}_${load.id}_${q}`;
        if (!updatedRates[rateId]) {
          const calcPrice = Math.round(newDestObj.estimatedBase * load.multiplier * (1 + (q - 1) * 0.4));
          updatedRates[rateId] = {
            id: rateId,
            destinationId: cleanId,
            loadTypeId: load.id,
            quantity: q,
            price: calcPrice,
            manualQuote: newDestObj.manualQuote || load.manualQuote || q === 5,
            active: true
          };
        }
      }
    }

    setConfig({
      ...config,
      destinations: updatedDestinations,
      rates: updatedRates
    });
    setHasUnsavedChanges(true);
    setEditDestModal(false);
    setCurrentDest({});
  };

  const handleToggleDestActive = (id: string) => {
    if (!config) return;
    const updated = config.destinations.map(d => d.id === id ? { ...d, active: !d.active } : d);
    setConfig({ ...config, destinations: updated });
    setHasUnsavedChanges(true);
  };

  const handleToggleDestVisible = (id: string) => {
    if (!config) return;
    const updated = config.destinations.map(d => d.id === id ? { ...d, visible: !d.visible } : d);
    setConfig({ ...config, destinations: updated });
    setHasUnsavedChanges(true);
  };

  // LOAD TYPES CRUD
  const handleSaveLoadType = () => {
    if (!config || !currentLoad.name || !currentLoad.id) {
      alert("Por favor complete los campos obligatorios.");
      return;
    }
    const cleanId = currentLoad.id.trim().toLowerCase().replace(/\s+/g, "_");
    const existingIdx = config.loadTypes.findIndex(l => l.id === cleanId);

    let updatedLoadTypes = [...config.loadTypes];
    const newLoadObj: ShippingLoadType = {
      id: cleanId,
      name: currentLoad.name.trim(),
      desc: currentLoad.desc || "",
      icon: currentLoad.icon || "📦",
      multiplier: Number(currentLoad.multiplier) || 1.0,
      order: Number(currentLoad.order) || (updatedLoadTypes.length + 1),
      active: currentLoad.active !== false,
      visible: currentLoad.visible !== false,
      manualQuote: Boolean(currentLoad.manualQuote),
      notes: currentLoad.notes || "",
    };

    if (existingIdx >= 0) {
      updatedLoadTypes[existingIdx] = newLoadObj;
    } else {
      updatedLoadTypes.push(newLoadObj);
    }

    updatedLoadTypes.sort((a, b) => a.order - b.order);

    const updatedRates = { ...config.rates };
    for (const dest of config.destinations) {
      for (let q = 1; q <= 5; q++) {
        const rateId = `${dest.id}_${cleanId}_${q}`;
        if (!updatedRates[rateId]) {
          const calcPrice = Math.round(dest.estimatedBase * newLoadObj.multiplier * (1 + (q - 1) * 0.4));
          updatedRates[rateId] = {
            id: rateId,
            destinationId: dest.id,
            loadTypeId: cleanId,
            quantity: q,
            price: calcPrice,
            manualQuote: dest.manualQuote || newLoadObj.manualQuote || q === 5,
            active: true
          };
        }
      }
    }

    setConfig({
      ...config,
      loadTypes: updatedLoadTypes,
      rates: updatedRates
    });
    setHasUnsavedChanges(true);
    setEditLoadModal(false);
    setCurrentLoad({});
  };

  const handleToggleLoadActive = (id: string) => {
    if (!config) return;
    const updated = config.loadTypes.map(l => l.id === id ? { ...l, active: !l.active } : l);
    setConfig({ ...config, loadTypes: updated });
    setHasUnsavedChanges(true);
  };

  // RATES MATRIX UPDATE
  const handleUpdateRate = (destinationId: string, loadTypeId: string, quantity: number, field: "price" | "manualQuote" | "active", value: any) => {
    if (!config) return;
    const rateId = `${destinationId}_${loadTypeId}_${quantity}`;
    const existingRate = config.rates[rateId] || {
      id: rateId,
      destinationId,
      loadTypeId,
      quantity,
      price: 0,
      manualQuote: false,
      active: true
    };

    let updatedValue = value;
    if (field === "price") {
      const num = Number(value);
      updatedValue = isNaN(num) || num < 0 ? 0 : num;
    }

    const updatedRates = {
      ...config.rates,
      [rateId]: {
        ...existingRate,
        [field]: updatedValue
      }
    };

    setConfig({ ...config, rates: updatedRates });
    setHasUnsavedChanges(true);
  };

  if (loading || !config) {
    return (
      <div className="min-h-screen bg-[#F7F3EC] p-4 sm:p-8 space-y-6">
        <AdminNav title="Configuración Envíos Low Cost" subtitle="Cargando módulo de envíos..." />
        <div className="bg-[#FFFDFC] border border-[#DED8CF] rounded-2xl p-12 text-center text-[#68706E]">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-[#173E3B] mb-3" />
          <p className="font-heading font-bold">Cargando configuración de Envíos Low Cost...</p>
        </div>
      </div>
    );
  }

  // Preview Calculation logic
  const selectedPreviewRate = config.rates[`${prevDestId}_${prevLoadId}_${prevBultos}`];
  const currentPreviewDest = config.destinations.find(d => d.id === prevDestId);
  const currentPreviewLoad = config.loadTypes.find(l => l.id === prevLoadId);
  const isPreviewManual = Boolean(
    selectedPreviewRate?.manualQuote || 
    currentPreviewDest?.manualQuote || 
    currentPreviewLoad?.manualQuote || 
    prevBultos >= 5 || 
    !selectedPreviewRate
  );
  const previewPrice = selectedPreviewRate?.price || 0;

  return (
    <div className="min-h-screen bg-[#F7F3EC] p-4 sm:p-8 space-y-6">
      
      {/* NAVEGACION ADMIN */}
      <AdminNav 
        title="Configuración Envíos Low Cost" 
        subtitle="Administración de tarifas, localidades, bultos y matriz de cotización" 
      />

      {/* TOAST NOTIFICATION */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-[#173E3B] text-white px-5 py-3 rounded-xl shadow-xl border border-[#FFD21A] flex items-center gap-3 text-xs font-bold animate-bounce">
          <CheckCircle2 className="w-5 h-5 text-[#FFD21A]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* BARRA DE ESTADO & PUBLICACION */}
      <div className="bg-[#FFFDFC] border border-[#DED8CF] rounded-2xl p-4 sm:p-6 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${hasUnsavedChanges ? "bg-amber-500 animate-pulse" : "bg-emerald-500"}`} />
            <h2 className="text-base font-heading font-extrabold text-[#173E3B]">
              {hasUnsavedChanges ? "Borrador con cambios pendientes" : "Borrador sincronizado"}
            </h2>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-xs text-[#68706E] font-sans mt-1">
            <span>Última edición borrador: <strong>{config.draftUpdatedAt ? new Date(config.draftUpdatedAt).toLocaleString("es-AR") : "No registrada"}</strong></span>
            <span>•</span>
            <span>Última publicación: <strong>{config.publishedAt ? new Date(config.publishedAt).toLocaleString("es-AR") : "Sin publicar"}</strong></span>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <button
            onClick={handleSaveDraft}
            disabled={saving}
            className="flex-1 md:flex-initial inline-flex items-center justify-center gap-2 bg-[#F7F3EC] hover:bg-[#EAE4D9] text-[#173E3B] border border-[#DED8CF] font-heading font-bold px-4 py-2.5 rounded-xl text-xs transition-all shadow-xs cursor-pointer"
          >
            <Save className="w-4 h-4 text-[#B44E2A]" />
            <span>{saving ? "Guardando..." : "Guardar Borrador"}</span>
          </button>

          <button
            onClick={handlePublish}
            disabled={publishing}
            className="flex-1 md:flex-initial inline-flex items-center justify-center gap-2 bg-[#173E3B] hover:bg-[#12312F] text-white font-heading font-bold px-5 py-2.5 rounded-xl text-xs transition-all shadow-md cursor-pointer"
          >
            <Send className="w-4 h-4 text-[#FFD21A]" />
            <span>{publishing ? "Publicando..." : "Publicar a Producción"}</span>
          </button>
        </div>
      </div>

      {/* PESTAÑAS DE NAVEGACION INTERNA DEL MODULO */}
      <div className="bg-[#FFFDFC] border border-[#DED8CF] rounded-2xl p-1.5 shadow-xs flex items-center gap-1 overflow-x-auto">
        <button
          onClick={() => setActiveTab("destinations")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-heading font-bold transition-all shrink-0 cursor-pointer ${
            activeTab === "destinations" ? "bg-[#173E3B] text-white shadow-xs" : "text-[#1F2928] hover:bg-[#F7F3EC]"
          }`}
        >
          <MapPin className="w-4 h-4 text-[#FFD21A]" />
          <span>Localidades ({config.destinations.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("loadTypes")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-heading font-bold transition-all shrink-0 cursor-pointer ${
            activeTab === "loadTypes" ? "bg-[#173E3B] text-white shadow-xs" : "text-[#1F2928] hover:bg-[#F7F3EC]"
          }`}
        >
          <Package className="w-4 h-4 text-[#FFD21A]" />
          <span>Tipos de Carga ({config.loadTypes.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("rates")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-heading font-bold transition-all shrink-0 cursor-pointer ${
            activeTab === "rates" ? "bg-[#173E3B] text-white shadow-xs" : "text-[#1F2928] hover:bg-[#F7F3EC]"
          }`}
        >
          <DollarSign className="w-4 h-4 text-[#FFD21A]" />
          <span>Matriz de Tarifas</span>
        </button>

        <button
          onClick={() => setActiveTab("preview")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-heading font-bold transition-all shrink-0 cursor-pointer ${
            activeTab === "preview" ? "bg-[#173E3B] text-white shadow-xs" : "text-[#1F2928] hover:bg-[#F7F3EC]"
          }`}
        >
          <Eye className="w-4 h-4 text-[#FFD21A]" />
          <span>Vista Previa de Cotización</span>
        </button>

        <button
          onClick={() => setActiveTab("settings")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-heading font-bold transition-all shrink-0 cursor-pointer ${
            activeTab === "settings" ? "bg-[#173E3B] text-white shadow-xs" : "text-[#1F2928] hover:bg-[#F7F3EC]"
          }`}
        >
          <Settings className="w-4 h-4 text-[#FFD21A]" />
          <span>Configuración General</span>
        </button>
      </div>

      {/* CONTENIDO TAB 1: LOCALIDADES */}
      {activeTab === "destinations" && (
        <div className="bg-[#FFFDFC] border border-[#DED8CF] rounded-2xl p-6 space-y-6 shadow-xs">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[#DED8CF] pb-4">
            <div>
              <h3 className="text-lg font-heading font-extrabold text-[#173E3B]">Administración de Localidades</h3>
              <p className="text-xs text-[#68706E]">Creá, editá y configurá visibilidad, código interno y recorridos de cada destino.</p>
            </div>
            <button
              onClick={() => {
                setCurrentDest({
                  id: "",
                  name: "",
                  code: "",
                  timeframe: "Recorrido programado",
                  order: config.destinations.length + 1,
                  active: true,
                  visible: true,
                  manualQuote: false,
                  estimatedBase: 12000
                });
                setEditDestModal(true);
              }}
              className="inline-flex items-center gap-2 bg-[#173E3B] text-white font-heading font-bold px-4 py-2 rounded-xl text-xs hover:bg-[#12312F] transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4 text-[#FFD21A]" />
              <span>Nueva Localidad</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#F7F3EC] border-b border-[#DED8CF] text-[#173E3B] font-heading font-extrabold uppercase">
                  <th className="p-3">Orden</th>
                  <th className="p-3">Código</th>
                  <th className="p-3">Nombre Localidad</th>
                  <th className="p-3">Recorrido / Frecuencia</th>
                  <th className="p-3">Base Ref.</th>
                  <th className="p-3">Cotiz. Manual</th>
                  <th className="p-3">Estado</th>
                  <th className="p-3">Visibilidad</th>
                  <th className="p-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DED8CF]">
                {config.destinations.map((d) => (
                  <tr key={d.id} className="hover:bg-[#F9F7F2] transition-colors">
                    <td className="p-3 font-mono font-bold text-[#68706E]">{d.order}</td>
                    <td className="p-3 font-mono font-bold text-[#B44E2A]">{d.code}</td>
                    <td className="p-3 font-bold text-[#111318]">{d.name}</td>
                    <td className="p-3 text-[#68706E]">{d.timeframe}</td>
                    <td className="p-3 font-mono font-bold text-[#173E3B]">${d.estimatedBase.toLocaleString("es-AR")}</td>
                    <td className="p-3">
                      {d.manualQuote ? (
                        <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-300">Manual</span>
                      ) : (
                        <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-300">Auto</span>
                      )}
                    </td>
                    <td className="p-3">
                      <button
                        onClick={() => handleToggleDestActive(d.id)}
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold cursor-pointer transition ${
                          d.active ? "bg-emerald-600 text-white" : "bg-zinc-200 text-zinc-600"
                        }`}
                      >
                        {d.active ? "Activa" : "Inactiva"}
                      </button>
                    </td>
                    <td className="p-3">
                      <button
                        onClick={() => handleToggleDestVisible(d.id)}
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold cursor-pointer transition ${
                          d.visible ? "bg-blue-600 text-white" : "bg-zinc-200 text-zinc-600"
                        }`}
                      >
                        {d.visible ? "Visible" : "Oculta"}
                      </button>
                    </td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => {
                          setCurrentDest(d);
                          setEditDestModal(true);
                        }}
                        className="p-1.5 text-[#173E3B] hover:bg-[#EAE4D9] rounded-lg transition"
                        title="Editar Localidad"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CONTENIDO TAB 2: TIPOS DE CARGA */}
      {activeTab === "loadTypes" && (
        <div className="bg-[#FFFDFC] border border-[#DED8CF] rounded-2xl p-6 space-y-6 shadow-xs">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[#DED8CF] pb-4">
            <div>
              <h3 className="text-lg font-heading font-extrabold text-[#173E3B]">Administración de Tipos de Carga</h3>
              <p className="text-xs text-[#68706E]">Configurá nombres, descripciones, íconos y multiplicadores de referencia.</p>
            </div>
            <button
              onClick={() => {
                setCurrentLoad({
                  id: "",
                  name: "",
                  desc: "",
                  icon: "📦",
                  multiplier: 1.0,
                  order: config.loadTypes.length + 1,
                  active: true,
                  visible: true,
                  manualQuote: false
                });
                setEditLoadModal(true);
              }}
              className="inline-flex items-center gap-2 bg-[#173E3B] text-white font-heading font-bold px-4 py-2 rounded-xl text-xs hover:bg-[#12312F] transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4 text-[#FFD21A]" />
              <span>Nuevo Tipo de Carga</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#F7F3EC] border-b border-[#DED8CF] text-[#173E3B] font-heading font-extrabold uppercase">
                  <th className="p-3">Orden</th>
                  <th className="p-3">Ícono</th>
                  <th className="p-3">Nombre</th>
                  <th className="p-3">Ejemplos / Descripción</th>
                  <th className="p-3">Multiplicador</th>
                  <th className="p-3">Cotiz. Manual</th>
                  <th className="p-3">Estado</th>
                  <th className="p-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DED8CF]">
                {config.loadTypes.map((l) => (
                  <tr key={l.id} className="hover:bg-[#F9F7F2] transition-colors">
                    <td className="p-3 font-mono font-bold text-[#68706E]">{l.order}</td>
                    <td className="p-3 text-xl">{l.icon}</td>
                    <td className="p-3 font-bold text-[#111318]">{l.name}</td>
                    <td className="p-3 text-[#68706E] max-w-xs truncate">{l.desc}</td>
                    <td className="p-3 font-mono font-bold text-[#173E3B]">{l.multiplier}x</td>
                    <td className="p-3">
                      {l.manualQuote ? (
                        <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-300">Manual</span>
                      ) : (
                        <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-300">Auto</span>
                      )}
                    </td>
                    <td className="p-3">
                      <button
                        onClick={() => handleToggleLoadActive(l.id)}
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold cursor-pointer transition ${
                          l.active ? "bg-emerald-600 text-white" : "bg-zinc-200 text-zinc-600"
                        }`}
                      >
                        {l.active ? "Activo" : "Inactivo"}
                      </button>
                    </td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => {
                          setCurrentLoad(l);
                          setEditLoadModal(true);
                        }}
                        className="p-1.5 text-[#173E3B] hover:bg-[#EAE4D9] rounded-lg transition"
                        title="Editar Tipo de Carga"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CONTENIDO TAB 3: MATRIZ DE TARIFAS */}
      {activeTab === "rates" && (
        <div className="bg-[#FFFDFC] border border-[#DED8CF] rounded-2xl p-6 space-y-6 shadow-xs">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[#DED8CF] pb-4">
            <div>
              <h3 className="text-lg font-heading font-extrabold text-[#173E3B]">Matriz de Tarifas por Bultos</h3>
              <p className="text-xs text-[#68706E]">Definí el precio en pesos o marcá cotización manual para cada combinación de localidad, carga y bultos.</p>
            </div>
            
            {/* SELECTOR DE LOCALIDAD */}
            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-[#173E3B] whitespace-nowrap">Seleccionar Localidad:</label>
              <select
                value={matrixDestId}
                onChange={(e) => setMatrixDestId(e.target.value)}
                className="bg-[#F7F3EC] border border-[#DED8CF] rounded-xl px-3 py-2 text-xs font-bold text-[#173E3B] outline-none"
              >
                {config.destinations.map(d => (
                  <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
                ))}
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#F7F3EC] border-b border-[#DED8CF] text-[#173E3B] font-heading font-extrabold uppercase">
                  <th className="p-3 min-w-[200px]">Tipo de Carga</th>
                  {[1, 2, 3, 4, 5].map(q => (
                    <th key={q} className="p-3 text-center min-w-[140px]">
                      {q === 5 ? "5 o más Bultos" : `${q} ${q === 1 ? "Bulto" : "Bultos"}`}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DED8CF]">
                {config.loadTypes.map(load => (
                  <tr key={load.id} className="hover:bg-[#F9F7F2] transition-colors">
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{load.icon}</span>
                        <div>
                          <span className="font-bold text-[#111318] block">{load.name}</span>
                          <span className="text-[10px] text-[#68706E] block">{load.desc}</span>
                        </div>
                      </div>
                    </td>
                    {[1, 2, 3, 4, 5].map(q => {
                      const rateId = `${matrixDestId}_${load.id}_${q}`;
                      const rate = config.rates[rateId] || {
                        id: rateId,
                        destinationId: matrixDestId,
                        loadTypeId: load.id,
                        quantity: q,
                        price: 0,
                        manualQuote: q === 5,
                        active: true
                      };

                      return (
                        <td key={q} className="p-2 text-center bg-[#FFFDFC]">
                          <div className="space-y-1.5 p-2 bg-[#F7F3EC] border border-[#DED8CF] rounded-xl">
                            {/* CAMPO DE PRECIO */}
                            <div className="relative">
                              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-[#68706E] font-bold">$</span>
                              <input
                                type="number"
                                min="0"
                                disabled={rate.manualQuote}
                                value={rate.manualQuote ? "" : rate.price}
                                onChange={(e) => handleUpdateRate(matrixDestId, load.id, q, "price", e.target.value)}
                                placeholder={rate.manualQuote ? "Manual" : "0"}
                                className={`w-full text-right pl-6 pr-2 py-1.5 text-xs font-mono font-bold rounded-lg border outline-none ${
                                  rate.manualQuote 
                                    ? "bg-amber-50 text-amber-800 border-amber-300 italic" 
                                    : "bg-white text-[#173E3B] border-[#DED8CF] focus:border-[#173E3B]"
                                }`}
                              />
                            </div>

                            {/* CHECKBOX COTIZACIÓN MANUAL */}
                            <label className="flex items-center justify-center gap-1 text-[10px] font-bold text-[#68706E] cursor-pointer select-none">
                              <input
                                type="checkbox"
                                checked={rate.manualQuote}
                                onChange={(e) => handleUpdateRate(matrixDestId, load.id, q, "manualQuote", e.target.checked)}
                                className="rounded border-gray-300 text-[#173E3B] focus:ring-0"
                              />
                              <span>Manual</span>
                            </label>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CONTENIDO TAB 4: VISTA PREVIA */}
      {activeTab === "preview" && (
        <div className="bg-[#FFFDFC] border border-[#DED8CF] rounded-2xl p-6 space-y-6 shadow-xs">
          <div className="border-b border-[#DED8CF] pb-4">
            <h3 className="text-lg font-heading font-extrabold text-[#173E3B]">Vista Previa de Cotización (Borrador)</h3>
            <p className="text-xs text-[#68706E]">Proba la combinación exacta que verá el cliente antes de publicar los cambios.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
            
            {/* SELECTORES DE SIMULACIÓN */}
            <div className="md:col-span-7 bg-[#F7F3EC] border border-[#DED8CF] p-6 rounded-2xl space-y-5">
              <div className="space-y-2">
                <label className="block text-xs font-bold text-[#173E3B]">1. Localidad de Destino:</label>
                <select
                  value={prevDestId}
                  onChange={(e) => setPrevDestId(e.target.value)}
                  className="w-full bg-white border border-[#DED8CF] rounded-xl p-3 text-xs font-bold text-[#111318]"
                >
                  {config.destinations.map(d => (
                    <option key={d.id} value={d.id}>{d.name} ({d.code}) - {d.timeframe}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold text-[#173E3B]">2. Tipo de Carga:</label>
                <select
                  value={prevLoadId}
                  onChange={(e) => setPrevLoadId(e.target.value)}
                  className="w-full bg-white border border-[#DED8CF] rounded-xl p-3 text-xs font-bold text-[#111318]"
                >
                  {config.loadTypes.map(l => (
                    <option key={l.id} value={l.id}>{l.icon} {l.name} ({l.desc})</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold text-[#173E3B]">3. Cantidad de Bultos:</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map(n => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setPrevBultos(n)}
                      className={`flex-1 py-2.5 rounded-xl text-xs font-mono font-bold border transition ${
                        prevBultos === n 
                          ? "bg-[#173E3B] text-white border-[#173E3B]" 
                          : "bg-white text-[#68706E] border-[#DED8CF] hover:border-[#173E3B]"
                      }`}
                    >
                      {n === 5 ? "5+" : n}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* TARJETA RESULTADO SIMULADO */}
            <div className="md:col-span-5 bg-[#111318] text-white p-6 rounded-2xl border-2 border-[#173E3B] space-y-5 shadow-xl">
              <div className="flex items-center justify-between border-b border-[#222530] pb-3">
                <span className="text-xs font-mono font-bold text-[#FFD21A] uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-[#FFD21A]" /> Resultado Simulado
                </span>
                <span className="text-[10px] bg-[#173E3B] text-white px-2 py-0.5 rounded-full font-bold">
                  Borrador
                </span>
              </div>

              <div className="space-y-2 text-xs text-[#D1D5DB]">
                <div className="flex justify-between py-1 border-b border-[#222530]">
                  <span className="text-[#9CA3AF]">Destino:</span>
                  <strong className="text-white">{currentPreviewDest?.name}</strong>
                </div>
                <div className="flex justify-between py-1 border-b border-[#222530]">
                  <span className="text-[#9CA3AF]">Categoría:</span>
                  <strong className="text-white">{currentPreviewLoad?.name}</strong>
                </div>
                <div className="flex justify-between py-1 border-b border-[#222530]">
                  <span className="text-[#9CA3AF]">Bultos:</span>
                  <strong className="text-white">{prevBultos === 5 ? "5 o más" : prevBultos}</strong>
                </div>
              </div>

              <div className="bg-[#161922] border border-[#173E3B] p-5 rounded-xl text-center space-y-1">
                <span className="text-[10px] font-mono uppercase text-[#9CA3AF] font-bold">Costo Estimado Calculado</span>
                {isPreviewManual ? (
                  <div className="py-2">
                    <span className="inline-block bg-amber-500/20 text-amber-400 border border-amber-500/40 text-sm font-bold px-4 py-2 rounded-xl">
                      Cotización Manual Requerida
                    </span>
                    <p className="text-[10px] text-[#9CA3AF] mt-2">Requiere confirmación personalizada por WhatsApp.</p>
                  </div>
                ) : (
                  <div className="text-3xl font-heading font-extrabold text-[#FFD21A] font-mono">
                    ~${previewPrice.toLocaleString("es-AR")}
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* CONTENIDO TAB 5: CONFIGURACION GENERAL */}
      {activeTab === "settings" && (
        <div className="bg-[#FFFDFC] border border-[#DED8CF] rounded-2xl p-6 space-y-6 shadow-xs max-w-3xl">
          <div className="border-b border-[#DED8CF] pb-4">
            <h3 className="text-lg font-heading font-extrabold text-[#173E3B]">Configuración General del Módulo</h3>
            <p className="text-xs text-[#68706E]">Parámetros globales de la calculadora de envíos.</p>
          </div>

          <div className="space-y-4 text-xs">
            <div className="flex items-center justify-between p-4 bg-[#F7F3EC] border border-[#DED8CF] rounded-xl">
              <div>
                <span className="font-bold text-[#173E3B] block">Calculadora Activa en la Web</span>
                <span className="text-[#68706E] block text-[11px]">Habilita o deshabilita la calculadora pública.</span>
              </div>
              <input
                type="checkbox"
                checked={config.settings.calculatorActive}
                onChange={(e) => {
                  setConfig({
                    ...config,
                    settings: { ...config.settings, calculatorActive: e.target.checked }
                  });
                  setHasUnsavedChanges(true);
                }}
                className="w-5 h-5 rounded border-gray-300 text-[#173E3B] focus:ring-0"
              />
            </div>

            <div className="flex items-center justify-between p-4 bg-[#F7F3EC] border border-[#DED8CF] rounded-xl">
              <div>
                <span className="font-bold text-[#173E3B] block">Moneda de Despliegue</span>
                <span className="text-[#68706E] block text-[11px]">Formato monetario aplicado en cotizaciones.</span>
              </div>
              <span className="font-mono font-bold bg-white px-3 py-1.5 rounded-lg border border-[#DED8CF]">ARS ($)</span>
            </div>

            <div className="flex items-center justify-between p-4 bg-[#F7F3EC] border border-[#DED8CF] rounded-xl">
              <div>
                <span className="font-bold text-[#173E3B] block">Cotización Automática Máxima</span>
                <span className="text-[#68706E] block text-[11px]">Bultos a partir de los cuales se fuerza cotización manual.</span>
              </div>
              <span className="font-mono font-bold bg-white px-3 py-1.5 rounded-lg border border-[#DED8CF]">4 Bultos (5+ Manual)</span>
            </div>
          </div>
        </div>
      )}

      {/* MODAL EDITAR LOCALIDAD */}
      {editDestModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-[#FFFDFC] border border-[#DED8CF] rounded-2xl p-6 w-full max-w-lg space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-[#DED8CF] pb-3">
              <h3 className="font-heading font-extrabold text-base text-[#173E3B]">
                {currentDest.id ? "Editar Localidad" : "Nueva Localidad"}
              </h3>
              <button onClick={() => setEditDestModal(false)} className="text-zinc-500 hover:text-zinc-800">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-[#173E3B] mb-1">ID Único / Slug (ej: lincoln):</label>
                <input
                  type="text"
                  disabled={Boolean(currentDest.id && config.destinations.some(d => d.id === currentDest.id))}
                  value={currentDest.id || ""}
                  onChange={(e) => setCurrentDest({ ...currentDest, id: e.target.value })}
                  className="w-full bg-[#F7F3EC] border border-[#DED8CF] rounded-xl p-2.5 font-mono text-xs"
                />
              </div>

              <div>
                <label className="block font-bold text-[#173E3B] mb-1">Nombre de la Localidad:</label>
                <input
                  type="text"
                  value={currentDest.name || ""}
                  onChange={(e) => setCurrentDest({ ...currentDest, name: e.target.value })}
                  placeholder="ej: Lincoln"
                  className="w-full bg-[#F7F3EC] border border-[#DED8CF] rounded-xl p-2.5 font-bold text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#173E3B] mb-1">Código Interno:</label>
                  <input
                    type="text"
                    value={currentDest.code || ""}
                    onChange={(e) => setCurrentDest({ ...currentDest, code: e.target.value })}
                    placeholder="LIN"
                    className="w-full bg-[#F7F3EC] border border-[#DED8CF] rounded-xl p-2.5 font-mono uppercase text-xs"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#173E3B] mb-1">Orden de Aparición:</label>
                  <input
                    type="number"
                    value={currentDest.order || 1}
                    onChange={(e) => setCurrentDest({ ...currentDest, order: Number(e.target.value) })}
                    className="w-full bg-[#F7F3EC] border border-[#DED8CF] rounded-xl p-2.5 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-[#173E3B] mb-1">Frecuencia / Recorrido:</label>
                <input
                  type="text"
                  value={currentDest.timeframe || ""}
                  onChange={(e) => setCurrentDest({ ...currentDest, timeframe: e.target.value })}
                  placeholder="ej: Recorrido semanal"
                  className="w-full bg-[#F7F3EC] border border-[#DED8CF] rounded-xl p-2.5 text-xs"
                />
              </div>

              <div>
                <label className="block font-bold text-[#173E3B] mb-1">Precio Base de Referencia ($):</label>
                <input
                  type="number"
                  value={currentDest.estimatedBase || 12000}
                  onChange={(e) => setCurrentDest({ ...currentDest, estimatedBase: Number(e.target.value) })}
                  className="w-full bg-[#F7F3EC] border border-[#DED8CF] rounded-xl p-2.5 font-mono text-xs"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <label className="flex items-center gap-2 font-bold text-[#173E3B]">
                  <input
                    type="checkbox"
                    checked={currentDest.manualQuote !== false ? Boolean(currentDest.manualQuote) : false}
                    onChange={(e) => setCurrentDest({ ...currentDest, manualQuote: e.target.checked })}
                    className="rounded text-[#173E3B]"
                  />
                  <span>Requiere Cotización Manual</span>
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-[#DED8CF]">
              <button
                onClick={() => setEditDestModal(false)}
                className="px-4 py-2 bg-[#F7F3EC] text-[#68706E] font-bold rounded-xl text-xs"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveDestination}
                className="px-5 py-2 bg-[#173E3B] text-white font-bold rounded-xl text-xs hover:bg-[#12312F]"
              >
                Guardar Localidad
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL EDITAR TIPO DE CARGA */}
      {editLoadModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-[#FFFDFC] border border-[#DED8CF] rounded-2xl p-6 w-full max-w-lg space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-[#DED8CF] pb-3">
              <h3 className="font-heading font-extrabold text-base text-[#173E3B]">
                {currentLoad.id ? "Editar Tipo de Carga" : "Nuevo Tipo de Carga"}
              </h3>
              <button onClick={() => setEditLoadModal(false)} className="text-zinc-500 hover:text-zinc-800">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-[#173E3B] mb-1">ID Único / Slug (ej: electro_grande):</label>
                <input
                  type="text"
                  disabled={Boolean(currentLoad.id && config.loadTypes.some(l => l.id === currentLoad.id))}
                  value={currentLoad.id || ""}
                  onChange={(e) => setCurrentLoad({ ...currentLoad, id: e.target.value })}
                  className="w-full bg-[#F7F3EC] border border-[#DED8CF] rounded-xl p-2.5 font-mono text-xs"
                />
              </div>

              <div className="grid grid-cols-4 gap-3">
                <div className="col-span-1">
                  <label className="block font-bold text-[#173E3B] mb-1">Ícono Emoji:</label>
                  <input
                    type="text"
                    value={currentLoad.icon || "📦"}
                    onChange={(e) => setCurrentLoad({ ...currentLoad, icon: e.target.value })}
                    className="w-full bg-[#F7F3EC] border border-[#DED8CF] rounded-xl p-2.5 text-center text-lg"
                  />
                </div>
                <div className="col-span-3">
                  <label className="block font-bold text-[#173E3B] mb-1">Nombre de la Carga:</label>
                  <input
                    type="text"
                    value={currentLoad.name || ""}
                    onChange={(e) => setCurrentLoad({ ...currentLoad, name: e.target.value })}
                    placeholder="ej: Electrodoméstico Grande"
                    className="w-full bg-[#F7F3EC] border border-[#DED8CF] rounded-xl p-2.5 font-bold text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-[#173E3B] mb-1">Ejemplos / Descripción:</label>
                <input
                  type="text"
                  value={currentLoad.desc || ""}
                  onChange={(e) => setCurrentLoad({ ...currentLoad, desc: e.target.value })}
                  placeholder="ej: Heladera, Lavarropas, Cocina, Freezer"
                  className="w-full bg-[#F7F3EC] border border-[#DED8CF] rounded-xl p-2.5 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#173E3B] mb-1">Multiplicador Base:</label>
                  <input
                    type="number"
                    step="0.1"
                    value={currentLoad.multiplier || 1.0}
                    onChange={(e) => setCurrentLoad({ ...currentLoad, multiplier: Number(e.target.value) })}
                    className="w-full bg-[#F7F3EC] border border-[#DED8CF] rounded-xl p-2.5 font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#173E3B] mb-1">Orden de Aparición:</label>
                  <input
                    type="number"
                    value={currentLoad.order || 1}
                    onChange={(e) => setCurrentLoad({ ...currentLoad, order: Number(e.target.value) })}
                    className="w-full bg-[#F7F3EC] border border-[#DED8CF] rounded-xl p-2.5 text-xs"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <label className="flex items-center gap-2 font-bold text-[#173E3B]">
                  <input
                    type="checkbox"
                    checked={Boolean(currentLoad.manualQuote)}
                    onChange={(e) => setCurrentLoad({ ...currentLoad, manualQuote: e.target.checked })}
                    className="rounded text-[#173E3B]"
                  />
                  <span>Requiere Cotización Manual</span>
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-[#DED8CF]">
              <button
                onClick={() => setEditLoadModal(false)}
                className="px-4 py-2 bg-[#F7F3EC] text-[#68706E] font-bold rounded-xl text-xs"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveLoadType}
                className="px-5 py-2 bg-[#173E3B] text-white font-bold rounded-xl text-xs hover:bg-[#12312F]"
              >
                Guardar Tipo de Carga
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
