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
  private state: BudgetEditorState;

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
  }

  public setPricingResult(res: unknown | null): void {
    this.state.pricingResult = res;
    if (!res) {
      this.state.persistedBudget = null;
    }
  }

  public setPersistedBudget(b: unknown | null): void {
    this.state.persistedBudget = b;
  }

  public setSelectedProductAndTerm(productId: string, plazo: number, sena: string = "0"): void {
    this.state.selectedProductoId = productId;
    this.state.selectedPlazo = plazo;
    this.state.senaPesos = sena;
  }

  public closeModal(): void {
    this.state.modalOpen = false;
  }

  public openNewManual(): void {
    this.initializedKey = "__manual_nuevo__";
    this.state = {
      ...createInitialBudgetEditorState(),
      modalOpen: true
    };
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
    return true;
  }
}
