/**
 * Controlador de Ciclo de Vida del Editor de Presupuestos
 * Cuenta Hogar - Root Monitoring Center & Budget Flow
 * 
 * Regla de Oro:
 * - Una navegación de alerta inicializa el editor UNA SOLA VEZ por query key.
 * - Los refetch internos de datos (solicitudesPool, catalogoProductos) NO reinicializan el formulario.
 * - Después de guardar exitosamente, persistedBudget y pricingResult permanecen intactos
 *   permitiendo la descarga de PDF y envío por WhatsApp.
 * - Solo se reinicializa cuando el usuario cambia a una nueva query/alerta distinta,
 *   abre otra solicitud o crea un nuevo presupuesto explícito.
 * - Control estricto contra condiciones de carrera asíncronas (stale async resolution guard).
 * - Control de fallo en carga de datos (dataLoaded failure guard).
 * - Soporte nativo para múltiples opciones (1..N BudgetItems) de origen CATALOGO (CANONICAL_V1)
 *   y MANUAL_PRESUPUESTO (MANUAL_FACTOR_V1).
 */

import { 
  SolicitudCandidate, 
  resolveLegacyAlertSolicitud, 
  ParsedLead 
} from "./budgetAlertRouting";
import {
  BudgetItemSource,
  InternalBudgetItem,
  ManualProductInput,
  createInitialManualProductDraft,
  createManualBudgetItem,
  duplicateBudgetItem,
  extractManualInputFromItem,
  getDefaultManualFactores,
  getDefaultPlanesActivos,
} from "./manualBudgetProduct";

export interface CatalogProductItem {
  id: string;
  nombre: string;
  costoProducto: number;
  plazosHabilitados: number[];
  codigoProducto?: string | null;
  descripcion?: string;
  imagenUrl?: string;
  proveedor?: string;
}

export interface BudgetEditorState {
  modalOpen: boolean;
  leadData: ParsedLead & { alertaId: string };
  resolvedSolicitudId: string | null;
  resolvedCollection: "solicitudes_cuenta" | "solicitudes" | null;
  candidatosVinculacion: SolicitudCandidate[];
  selectedProductoId: string;
  selectedPlazo: number;
  senaPesos: string;
  pricingResult: unknown | null;
  persistedBudget: unknown | null;
  confirmarCrearNueva: boolean;
  // --- Extensión Productos Fuera de Catálogo y Multi-Opción ---
  sourceMode: BudgetItemSource;
  manualDraft: ManualProductInput;
  manualPlazoSeleccionado: number;
  manualAnticipoPesos: string;
  budgetItems: InternalBudgetItem[];
  editingItemId: string | null;
}

export function createInitialBudgetEditorState(): BudgetEditorState {
  return {
    modalOpen: false,
    leadData: {
      solicitudId: "",
      alertaId: "",
      nombre: "",
      dni: "",
      telefono: "",
      localidad: "",
      producto: "",
      notas: ""
    },
    resolvedSolicitudId: null,
    resolvedCollection: null,
    candidatosVinculacion: [],
    selectedProductoId: "",
    selectedPlazo: 0,
    senaPesos: "0",
    pricingResult: null,
    persistedBudget: null,
    confirmarCrearNueva: false,
    sourceMode: "CATALOGO",
    manualDraft: createInitialManualProductDraft(""),
    manualPlazoSeleccionado: 12,
    manualAnticipoPesos: "0",
    budgetItems: [],
    editingItemId: null,
  };
}

export class BudgetEditorLifecycleController {
  private initializedKey: string | null = null;
  private activeAsyncQueryKey: string | null = null;
  private state: BudgetEditorState;
  private listeners: Array<(state: BudgetEditorState) => void> = [];

  constructor(initialState?: BudgetEditorState) {
    this.state = initialState ? { ...initialState } : createInitialBudgetEditorState();
  }

  public getState(): BudgetEditorState {
    return this.state;
  }

  public getInitializedKey(): string | null {
    return this.initializedKey;
  }

  public resetInitializedKey(newKey: string | null = null): void {
    this.initializedKey = newKey;
    this.activeAsyncQueryKey = null;
  }

  public subscribe(listener: (state: BudgetEditorState) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify(): void {
    for (const listener of this.listeners) {
      listener({ ...this.state });
    }
  }

  // --- Stale Async Resolution Guards ---

  public beginAsyncResolution(queryKey: string): void {
    this.activeAsyncQueryKey = queryKey;
  }

  public isAsyncQueryValid(queryKey: string): boolean {
    return (
      Boolean(queryKey) &&
      this.activeAsyncQueryKey === queryKey &&
      this.initializedKey === queryKey &&
      this.state.modalOpen
    );
  }

  public applyAsyncSolicitudResolution(
    queryKey: string,
    resolvedId: string | null,
    collection: "solicitudes_cuenta" | "solicitudes" | null,
    candidates: SolicitudCandidate[] = []
  ): boolean {
    if (!this.isAsyncQueryValid(queryKey)) {
      return false;
    }
    this.state.resolvedSolicitudId = resolvedId;
    this.state.resolvedCollection = collection;
    this.state.candidatosVinculacion = candidates;
    this.notify();
    return true;
  }

  public applyAsyncLegacyAlertResolution(
    queryKey: string,
    realFechaCreacion: unknown,
    pool: SolicitudCandidate[]
  ): boolean {
    if (!this.isAsyncQueryValid(queryKey)) {
      return false;
    }
    const resolution = resolveLegacyAlertSolicitud(
      {
        id: this.state.leadData.alertaId || undefined,
        tipo: "NUEVO_PRESUPUESTO",
        mensaje: this.state.leadData.notas,
        clienteEmail: this.state.leadData.telefono || this.state.leadData.nombre,
        fechaCreacion: realFechaCreacion
      },
      pool
    );

    if (resolution.matched && resolution.resolvedSolicitudId) {
      this.state.resolvedSolicitudId = resolution.resolvedSolicitudId;
      this.state.resolvedCollection = resolution.sourceCollection;
      this.state.candidatosVinculacion = resolution.candidates;
    } else {
      this.state.resolvedSolicitudId = null;
      this.state.resolvedCollection = null;
      this.state.candidatosVinculacion = resolution.candidates;
    }
    this.notify();
    return true;
  }

  // --- Modificaciones de Estado del Formulario ---

  public updateLeadData(partial: Partial<BudgetEditorState["leadData"]>): void {
    this.state.leadData = { ...this.state.leadData, ...partial };
    this.notify();
  }

  public setSelectedProductoId(productId: string): void {
    this.state.selectedProductoId = productId;
    this.state.selectedPlazo = 0;
    this.state.pricingResult = null;
    this.state.persistedBudget = null;
    this.notify();
  }

  public setSelectedPlazo(plazo: number): void {
    this.state.selectedPlazo = plazo;
    this.state.pricingResult = null;
    this.state.persistedBudget = null;
    this.notify();
  }

  public setSenaPesos(sena: string): void {
    this.state.senaPesos = sena;
    this.state.pricingResult = null;
    this.state.persistedBudget = null;
    this.notify();
  }

  public setConfirmarCrearNueva(val: boolean): void {
    this.state.confirmarCrearNueva = val;
    this.notify();
  }

  public setResolvedCandidate(
    id: string | null,
    collection?: "solicitudes_cuenta" | "solicitudes" | null,
    candidates?: SolicitudCandidate[]
  ): void {
    this.state.resolvedSolicitudId = id;
    if (collection !== undefined) {
      this.state.resolvedCollection = collection;
    }
    if (candidates !== undefined) {
      this.state.candidatosVinculacion = candidates;
    }
    this.notify();
  }

  public setPricingResult(res: unknown | null): void {
    this.state.pricingResult = res;
    if (!res) {
      this.state.persistedBudget = null;
    }
    this.notify();
  }

  public setPersistedBudget(b: unknown | null): void {
    this.state.persistedBudget = b;
    this.notify();
  }

  public setSelectedProductAndTerm(productId: string, plazo: number, sena: string = "0"): void {
    this.state.selectedProductoId = productId;
    this.state.selectedPlazo = plazo;
    this.state.senaPesos = sena;
    this.notify();
  }

  // --- Métodos para Productos Fuera de Catálogo (MANUAL_PRESUPUESTO) y Multi-Item ---

  public setSourceMode(mode: BudgetItemSource, prefillFromLead = true): void {
    this.state.sourceMode = mode;
    if (mode === "MANUAL_PRESUPUESTO" && prefillFromLead && !this.state.manualDraft.nombre.trim()) {
      const prefill = this.state.budgetItems.length === 0 ? this.state.leadData.producto : "";
      this.state.manualDraft = {
        ...this.state.manualDraft,
        nombre: prefill.trim(),
      };
    }
    this.state.persistedBudget = null;
    this.notify();
  }

  public openManualProductEntry(prefillNombre?: string): void {
    const defaultName =
      prefillNombre !== undefined
        ? prefillNombre
        : this.state.budgetItems.length === 0
          ? this.state.leadData.producto
          : "";
    this.state.sourceMode = "MANUAL_PRESUPUESTO";
    this.state.editingItemId = null;
    this.state.manualDraft = createInitialManualProductDraft(defaultName);
    this.state.manualPlazoSeleccionado = 12;
    this.state.manualAnticipoPesos = "0";
    this.state.persistedBudget = null;
    this.notify();
  }

  public updateManualDraft(partial: Partial<ManualProductInput>): void {
    this.state.manualDraft = {
      ...this.state.manualDraft,
      ...partial,
      factoresPlanes: partial.factoresPlanes
        ? { ...partial.factoresPlanes }
        : { ...this.state.manualDraft.factoresPlanes },
      planesActivos: partial.planesActivos
        ? { ...partial.planesActivos }
        : { ...this.state.manualDraft.planesActivos },
    };
    this.state.persistedBudget = null;
    this.notify();
  }

  public setManualFactorForPlan(cuotas: number, factor: number): void {
    this.state.manualDraft = {
      ...this.state.manualDraft,
      factoresPlanes: {
        ...this.state.manualDraft.factoresPlanes,
        [cuotas]: factor,
      },
    };
    this.state.persistedBudget = null;
    this.notify();
  }

  public toggleManualPlanActivo(cuotas: number, activo?: boolean): void {
    const current = this.state.manualDraft.planesActivos[cuotas] !== false;
    const next = activo !== undefined ? activo : !current;
    this.state.manualDraft = {
      ...this.state.manualDraft,
      planesActivos: {
        ...this.state.manualDraft.planesActivos,
        [cuotas]: next,
      },
    };
    this.state.persistedBudget = null;
    this.notify();
  }

  public resetManualFactoresToDefault(): void {
    this.state.manualDraft = {
      ...this.state.manualDraft,
      factoresPlanes: getDefaultManualFactores(),
      planesActivos: getDefaultPlanesActivos(),
    };
    this.state.persistedBudget = null;
    this.notify();
  }

  public setManualPlazoSeleccionado(plazo: number): void {
    this.state.manualPlazoSeleccionado = plazo;
    this.state.persistedBudget = null;
    this.notify();
  }

  public setManualAnticipoPesos(anticipo: string): void {
    this.state.manualAnticipoPesos = anticipo;
    this.state.persistedBudget = null;
    this.notify();
  }

  public commitManualDraftToBudgetItems(startNewAfter = false): InternalBudgetItem | null {
    const draft = this.state.manualDraft;
    if (!draft.nombre.trim() || !(Number(draft.costoProducto) > 0)) {
      return null;
    }

    const anticipoNum = Math.max(0, Math.round(Number(this.state.manualAnticipoPesos) || 0));
    const item = createManualBudgetItem({
      itemId: this.state.editingItemId || undefined,
      input: draft,
      plazoSeleccionado: this.state.manualPlazoSeleccionado,
      anticipo: anticipoNum,
      cantidad: 1,
    });

    if (this.state.editingItemId) {
      this.state.budgetItems = this.state.budgetItems.map((existing) =>
        existing.itemId === this.state.editingItemId ? item : existing
      );
    } else {
      this.state.budgetItems = [...this.state.budgetItems, item];
    }

    this.state.persistedBudget = null;

    if (startNewAfter) {
      this.state.editingItemId = null;
      this.state.manualDraft = createInitialManualProductDraft("");
      this.state.manualPlazoSeleccionado = 12;
      this.state.manualAnticipoPesos = "0";
    } else {
      this.state.editingItemId = item.itemId;
    }

    this.notify();
    return item;
  }

  public addOrUpdateBudgetItem(item: InternalBudgetItem, resetDraftAfter = true): void {
    const targetId = this.state.editingItemId || item.itemId;
    const exists = this.state.budgetItems.some((b) => b.itemId === targetId);
    if (exists) {
      this.state.budgetItems = this.state.budgetItems.map((b) =>
        b.itemId === targetId ? { ...item, itemId: targetId } : b
      );
    } else {
      this.state.budgetItems = [...this.state.budgetItems, item];
    }
    this.state.editingItemId = null;
    this.state.persistedBudget = null;

    if (resetDraftAfter) {
      if (item.source === "MANUAL_PRESUPUESTO") {
        this.state.manualDraft = createInitialManualProductDraft("");
        this.state.manualPlazoSeleccionado = 12;
        this.state.manualAnticipoPesos = "0";
      } else {
        this.state.selectedProductoId = "";
        this.state.selectedPlazo = 0;
        this.state.senaPesos = "0";
        this.state.pricingResult = null;
      }
    }

    this.notify();
  }

  public editBudgetItem(itemId: string): void {
    const found = this.state.budgetItems.find((b) => b.itemId === itemId);
    if (!found) return;

    this.state.editingItemId = found.itemId;
    this.state.persistedBudget = null;

    if (found.source === "MANUAL_PRESUPUESTO") {
      const extracted = extractManualInputFromItem(found);
      this.state.sourceMode = "MANUAL_PRESUPUESTO";
      this.state.manualDraft = extracted.input;
      this.state.manualPlazoSeleccionado = extracted.plazoSeleccionado;
      this.state.manualAnticipoPesos = String(extracted.anticipo || 0);
    } else {
      this.state.sourceMode = "CATALOGO";
      this.state.selectedProductoId = found.productoId || "";
      this.state.selectedPlazo = found.cuotas || 0;
      this.state.senaPesos = String(found.anticipo || 0);
      this.state.pricingResult = found.pricingSnapshot || null;
    }

    this.notify();
  }

  public duplicateOption(itemId: string): InternalBudgetItem | null {
    const found = this.state.budgetItems.find((b) => b.itemId === itemId);
    if (!found) return null;

    const duplicated = duplicateBudgetItem(found);
    this.state.budgetItems = [...this.state.budgetItems, duplicated];
    this.state.persistedBudget = null;
    this.notify();
    return duplicated;
  }

  public removeBudgetItem(itemId: string): void {
    this.state.budgetItems = this.state.budgetItems.filter((b) => b.itemId !== itemId);
    if (this.state.editingItemId === itemId) {
      this.state.editingItemId = null;
    }
    this.state.persistedBudget = null;
    this.notify();
  }

  public startAddingAnotherProduct(mode?: BudgetItemSource): void {
    const targetMode = mode || this.state.sourceMode;
    this.state.editingItemId = null;
    this.state.sourceMode = targetMode;
    if (targetMode === "MANUAL_PRESUPUESTO") {
      this.state.manualDraft = createInitialManualProductDraft("");
      this.state.manualPlazoSeleccionado = 12;
      this.state.manualAnticipoPesos = "0";
    } else {
      this.state.selectedProductoId = "";
      this.state.selectedPlazo = 0;
      this.state.senaPesos = "0";
      this.state.pricingResult = null;
    }
    this.state.persistedBudget = null;
    this.notify();
  }

  public setBudgetItems(items: InternalBudgetItem[]): void {
    this.state.budgetItems = [...items];
    this.notify();
  }

  public closeModal(): void {
    this.state.modalOpen = false;
    this.initializedKey = null;
    this.activeAsyncQueryKey = null;
    this.notify();
  }

  public openNewManual(): void {
    this.initializedKey = "__manual_nuevo__";
    this.activeAsyncQueryKey = null;
    this.state = {
      ...createInitialBudgetEditorState(),
      modalOpen: true,
      confirmarCrearNueva: true
    };
    this.notify();
  }

  public openExistingBudget(
    params: {
      id: string;
      solicitudId?: string;
      solicitudTipo?: string;
      clienteNombre?: string;
      clienteDni?: string;
      clienteWhatsapp?: string;
      clienteLocalidad?: string;
      producto?: string;
      notas?: string;
      cuotas?: number;
      pricingSchemaVersion?: string;
      snapshotCanonico?: unknown;
      catalogoProductos?: CatalogProductItem[];
      items?: InternalBudgetItem[];
    },
    originalRecord?: unknown
  ): void {
    this.initializedKey = "__edit_" + params.id;
    this.activeAsyncQueryKey = null;
    const existingItems = Array.isArray(params.items) ? [...params.items] : [];
    const firstManual = existingItems.find((i) => i.source === "MANUAL_PRESUPUESTO");

    this.state = {
      ...createInitialBudgetEditorState(),
      modalOpen: true,
      leadData: {
        solicitudId: params.solicitudId || "",
        alertaId: "",
        nombre: params.clienteNombre && params.clienteNombre !== "Cliente Sin Nombre" ? params.clienteNombre : "",
        dni: params.clienteDni && params.clienteDni !== "-" ? params.clienteDni : "",
        telefono: params.clienteWhatsapp && params.clienteWhatsapp !== "-" ? params.clienteWhatsapp : "",
        localidad: params.clienteLocalidad && params.clienteLocalidad !== "-" ? params.clienteLocalidad : "",
        producto: params.producto || "",
        notas: params.notas || ""
      },
      resolvedSolicitudId: params.solicitudId || null,
      resolvedCollection: params.solicitudTipo === "estandar" ? "solicitudes" : "solicitudes_cuenta",
      candidatosVinculacion: [],
      confirmarCrearNueva: false,
      selectedPlazo: params.cuotas || 0,
      senaPesos: "0",
      pricingResult:
        (params.pricingSchemaVersion === "CANONICAL_V1" ||
          params.pricingSchemaVersion === "MANUAL_FACTOR_V1" ||
          params.pricingSchemaVersion === "MIXED_V1") &&
        params.snapshotCanonico
          ? params.snapshotCanonico
          : existingItems.length > 0
            ? existingItems[0].pricingSnapshot || existingItems[0].manualProductSnapshot || null
            : null,
      persistedBudget:
        params.pricingSchemaVersion === "CANONICAL_V1" ||
        params.pricingSchemaVersion === "MANUAL_FACTOR_V1" ||
        params.pricingSchemaVersion === "MIXED_V1" ||
        existingItems.length > 0
          ? originalRecord || null
          : null,
      sourceMode: firstManual && existingItems.length === 1 ? "MANUAL_PRESUPUESTO" : "CATALOGO",
      manualDraft:
        firstManual && existingItems.length === 1
          ? extractManualInputFromItem(firstManual).input
          : createInitialManualProductDraft(existingItems.length === 0 ? params.producto || "" : ""),
      manualPlazoSeleccionado:
        firstManual && existingItems.length === 1
          ? extractManualInputFromItem(firstManual).plazoSeleccionado
          : params.cuotas || 12,
      manualAnticipoPesos:
        firstManual && existingItems.length === 1
          ? String(extractManualInputFromItem(firstManual).anticipo || 0)
          : "0",
      budgetItems: existingItems,
      editingItemId: firstManual && existingItems.length === 1 ? firstManual.itemId : null,
    };

    if (params.catalogoProductos && params.producto) {
      const matchCatalog = params.catalogoProductos.find(
        (cp) => cp.nombre.toLowerCase().trim() === (params.producto || "").toLowerCase().trim()
      );
      if (matchCatalog) {
        this.state.selectedProductoId = matchCatalog.id;
      }
    }

    this.notify();
  }

  /**
   * Procesa la navegación o actualización de datos.
   * Regla crítica: Si dataLoaded es true y la query es idéntica a la ya inicializada,
   * NO reinicializa el editor (preserva persistedBudget, pricingResult, selecciones).
   */
  public handleQueryOrDataChange(params: {
    queryKey: string;
    searchParams: URLSearchParams;
    dataLoaded: boolean;
    solicitudesPool: SolicitudCandidate[];
    catalogoProductos: CatalogProductItem[];
    realFechaCreacion?: unknown;
  }): boolean {
    const { queryKey, searchParams, dataLoaded, solicitudesPool, catalogoProductos, realFechaCreacion } = params;

    const solId = searchParams.get("solicitudId") || "";
    const altId = searchParams.get("alertaId") || "";
    const nom = searchParams.get("nombre") || "";
    const dniVal = searchParams.get("dni") || "";
    const telVal = searchParams.get("telefono") || "";
    const locVal = searchParams.get("localidad") || "";
    const prodVal = searchParams.get("producto") || "";
    const notasVal = searchParams.get("notas") || "";

    const hasIncomingLead = Boolean(nom || prodVal || solId || altId);
    if (!hasIncomingLead) {
      return false;
    }

    // 1. ESPERAR A QUE LOS DATOS ESTÉN CARGADOS (DATA LOADED)
    if (!dataLoaded) {
      return false;
    }

    // 2. IDEMPOTENCIA POR QUERY KEY: Si ya fue inicializado para esta query exacta, NO REINICIALIZAR
    if (this.initializedKey === queryKey) {
      return false;
    }

    // 3. Inicializar editor para esta nueva query
    this.state.leadData = {
      solicitudId: solId,
      alertaId: altId,
      nombre: nom,
      dni: dniVal,
      telefono: telVal,
      localidad: locVal,
      producto: prodVal,
      notas: notasVal
    };
    this.state.pricingResult = null;
    this.state.persistedBudget = null;
    this.state.selectedPlazo = 0;
    this.state.senaPesos = "0";
    this.state.confirmarCrearNueva = false;
    this.state.sourceMode = "CATALOGO";
    this.state.manualDraft = createInitialManualProductDraft(prodVal);
    this.state.manualPlazoSeleccionado = 12;
    this.state.manualAnticipoPesos = "0";
    this.state.budgetItems = [];
    this.state.editingItemId = null;

    // 4. Resolución determinística de vinculación
    if (solId) {
      const matchPool = solicitudesPool.find((s) => s.id === solId);
      if (matchPool) {
        this.state.resolvedSolicitudId = matchPool.id;
        this.state.resolvedCollection = matchPool.sourceCollection;
        this.state.candidatosVinculacion = [matchPool];
      } else {
        this.state.resolvedSolicitudId = null;
        this.state.resolvedCollection = null;
        this.state.candidatosVinculacion = [];
      }
    } else {
      const resolution = resolveLegacyAlertSolicitud(
        {
          id: altId || undefined,
          tipo: "NUEVO_PRESUPUESTO",
          mensaje: notasVal,
          clienteEmail: telVal || nom,
          fechaCreacion: realFechaCreacion || null
        },
        solicitudesPool
      );
      if (resolution.matched && resolution.resolvedSolicitudId) {
        this.state.resolvedSolicitudId = resolution.resolvedSolicitudId;
        this.state.resolvedCollection = resolution.sourceCollection;
        this.state.candidatosVinculacion = resolution.candidates;
      } else {
        this.state.resolvedSolicitudId = null;
        this.state.resolvedCollection = null;
        this.state.candidatosVinculacion = resolution.candidates;
      }
    }

    // 5. Match con catálogo si coincide nombre
    const matchCatalog = catalogoProductos.find(
      (cp) => cp.nombre.toLowerCase().trim() === prodVal.toLowerCase().trim()
    );
    if (matchCatalog) {
      this.state.selectedProductoId = matchCatalog.id;
    } else {
      this.state.selectedProductoId = "";
    }

    this.state.modalOpen = true;
    this.initializedKey = queryKey;
    this.notify();
    return true;
  }
}
