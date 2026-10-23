/** Read-only production assessment. This is not an authorization/capability. */
import { legalIssuanceAssessment, type LegalApprovalRecord, type LegalArtifact } from './legalApprovalV2';

export const PRODUCTION_READINESS_POLICY = 'PRODUCTION_READINESS_V1' as const;
export type ReadinessState = 'READY' | 'PENDING' | 'BLOCKED';
export interface ReadinessItem {
  key: string;
  label: string;
  state: ReadinessState;
  detail: string;
  owner: 'Administración' | 'Validación jurídica' | 'Implementación técnica';
  section: 'budget' | 'contract' | 'fulfillment' | 'affiliate' | 'financial' | 'legal';
}
export interface ProductionReadiness {
  policy: typeof PRODUCTION_READINESS_POLICY;
  operationId: string;
  revision: number;
  /** Concurrency/read-freshness indicator, never an authorization token. */
  digest: string;
  evaluatedAt: string;
  items: ReadinessItem[];
  nextAction: ReadinessItem;
  finalIssuanceEnabled: false;
  productionDeliveryEnabled: false;
  productionFinancialEnabled: false;
  arcaEnabled: false;
}
export interface ProductionReadinessFacts {
  sourceValid: boolean;
  personalComplete: boolean;
  productComplete: boolean;
  economicComplete: boolean;
  scheduleComplete: boolean;
  identityVerified: boolean;
  creditApproved: boolean;
  conformityCurrent: boolean;
  readyReviewValid: boolean;
  artifacts: readonly LegalArtifact[];
  approvals: readonly LegalApprovalRecord[];
  registryComplete: boolean;
}
/** Never infer readiness from a status flag, owner declaration or Emulator fixture. */
export function assessProductionReadiness(f: ProductionReadinessFacts): ReadinessItem[] {
  const items: ReadinessItem[] = [];
  const add = (key: string, label: string, valid: boolean, detail: string, section: ReadinessItem['section'] = 'contract') => {
    items.push({ key, label, state: valid ? 'READY' : 'PENDING', detail: valid ? 'Comprobado en la revisión actual.' : detail, owner: 'Administración', section });
  };
  add('ORIGIN', 'Solicitud, presupuesto y aceptación', f.sourceValid, 'Revisar los vínculos explícitos de la operación. No se crean ni sustituyen antecedentes.', 'budget');
  add('PERSONAL', 'Datos personales', f.personalComplete, 'Completar y aplicar los datos del cliente.');
  add('PRODUCT', 'Cantidad y condición del producto', f.productComplete, 'Completar cantidad y condición sin modificar la alternativa aceptada.');
  add('ECONOMICS', 'Condiciones económicas', f.economicComplete, 'Guardar capital, servicios con IVA incluido y total mediante el motor vigente.');
  add('SCHEDULE', 'Cronograma contractual', f.scheduleComplete, 'Guardar vencimientos y comprobar la suma de las cuotas. No se agrega IVA al total.');
  add('IDENTITY', 'Identidad documental verificada', f.identityVerified, 'Verificar documentalmente la identidad mediante el circuito existente. No se fusionan personas.');
  add('CREDIT', 'Evaluación crediticia vigente', f.creditApproved, 'Registrar una aprobación manual vigente para esta operación, aun cuando sea histórica.');
  add('CONFORMITY', 'Conformidad vigente del cliente', f.conformityCurrent, 'Registrar evidencia explícita de conformidad con las condiciones y el producto guardados.');
  add('READY_REVIEW', 'Revisión técnica del contrato', f.readyReviewValid, 'Completar la revisión READY. READY no acredita firmas ni aprobación jurídica.');
  const legal = legalIssuanceAssessment(f.artifacts, f.approvals, false);
  for (const kind of ['MANDATE', 'PROMISSORY_NOTE'] as const) {
    const label = kind === 'MANDATE' ? 'Mandato' : 'Pagaré';
    const textPending = legal.reasons.includes(kind + '_TEXT_PENDING') || legal.reasons.includes(kind + '_ARTIFACT_REQUIRED');
    const approvalMissing = legal.reasons.some(r => r.startsWith(kind) && (r.includes('APPROVAL') || r.includes('ARTIFACT')));
    items.push({key: kind + '_LEGAL', label: label + ': versión jurídica exacta', state: textPending || approvalMissing || !f.registryComplete ? 'BLOCKED' : 'READY',
      detail: !f.registryComplete ? 'No se pudo comprobar íntegramente el registro jurídico.' : textPending ? 'La plantilla técnica contiene pendientes. La declaración sobre el original no aprueba automáticamente esta versión derivada.' : approvalMissing ? 'Falta validación profesional identificada para esta versión y hash exactos.' : 'Versión y hash con validación profesional identificada.', owner: 'Validación jurídica', section: 'legal'});
  }
  // Honest implementation inventory: no feature flag can turn these blockers into permission.
  const blocked: Array<[string, string, string, ReadinessItem['owner'], ReadinessItem['section']]> = [
    ['FORMAL_DATA', 'Datos formales de emisión', 'Falta confirmar representación y facultades, jurisdicción, lugar y fecha efectiva de cada instrumento. El domicilio legal no determina la jurisdicción.', 'Validación jurídica', 'legal'],
    ['FINAL_DOCUMENTS', 'Emisión definitiva y numeración única', 'Adaptador separado implementado. Requiere instalar los tres textos finales aprobados por hash, habilitación del servidor, numeración autorizada y permiso explícito para esta operación.', 'Implementación técnica', 'contract'],
    ['DELIVERY', 'Tres firmas, originales y entrega', 'El adaptador real comprueba los tres documentos emitidos, firmas físicas, custodia y ausencia de incidencias. Sin emisión aprobada y autorización permanece bloqueado.', 'Implementación técnica', 'fulfillment'],
    ['FINANCE', 'Activación de cuotas, pagos y recibos', 'El mismo motor FIFO admite evidencia productiva íntegra de emisión y entrega. Su activación requiere autorización independiente y es única; no basta un cambio de bandera.', 'Implementación técnica', 'financial'],
    ['CLIENT_ACCESS', 'Activación del portal del cliente', 'La invitación real exige una cuenta previamente vinculada, entrega acreditada, tres firmas y autorización específica. No se crean ni asignan cuentas automáticamente.', 'Implementación técnica', 'contract'],
    ['EXPLICIT_AUTHORIZATION', 'Autorización de operación real', 'La publicación de código no autoriza emitir instrumentos, asignar roles personales ni crear obligaciones. Requiere autorización expresa posterior.', 'Administración', 'contract'],
    ['ARCA', 'Facturación fiscal real', 'Separada y deshabilitada. Faltan habilitación fiscal y condiciones técnicas; los recibos de pago no son comprobantes ARCA.', 'Administración', 'financial'],
  ];
  for (const [key, label, detail, owner, section] of blocked) items.push({ key, label, detail, owner, section, state: 'BLOCKED' });
  return items;
}
