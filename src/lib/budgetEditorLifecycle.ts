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
 */

import { 
  SolicitudCandidate, 
  resolveLegacyAlertSolicitud, 
  ParsedLead 
} from "./budgetAlertRouting";

export interface CatalogProductItem {
  id: string;
  nombre: string;
  costoProducto: number;
  plazosHabilitados: number[];
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
    confirmarCrearNueva: false
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
    },
    originalRecord?: unknown
  ): void {
    this.initializedKey = "__edit_" + params.id;
    this.activeAsyncQueryKey = null;
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
      pricingResult: params.pricingSchemaVersion === "CANONICAL_V1" && params.snapshotCanonico ? params.snapshotCanonico : null,
      persistedBudget: params.pricingSchemaVersion === "CANONICAL_V1" && params.snapshotCanonico ? (originalRecord || null) : null
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
