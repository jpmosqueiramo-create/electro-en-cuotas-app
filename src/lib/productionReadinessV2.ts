/** Read-only production assessment. This is not an authorization/capability. */
import { type LegalApprovalRecord, type LegalArtifact } from './legalApprovalV2';

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
  employmentComplete?: boolean;
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
/** Read-only presentation of the owner's five preparation steps.
 * This function grants no capability and does not change any issuance, credit,
 * legal-package, delivery, invitation or financial validation in the adapters.
 */
export function assessProductionReadiness(f: ProductionReadinessFacts): ReadinessItem[] {
  const row=(key:string,label:string,valid:boolean,detail:string):ReadinessItem=>({key,label,state:valid?'READY':'PENDING',detail:valid?'Completo en los datos guardados.':detail,owner:'Administración',section:'contract'});
  return [
    row('ORIGIN','1. Solicitud y aceptación',f.sourceValid&&f.productComplete&&f.conformityCurrent,!f.sourceValid?'Revisar la solicitud de origen y el presupuesto aceptado.':!f.productComplete?'Completar cantidad y condición del producto aceptado.':'Registrar la conformidad con las condiciones guardadas.'),
    row('PERSONAL','2. Datos personales',f.personalComplete,'Completar y guardar los datos personales, recibidos del cliente o cargados por Administración.'),
    row('EMPLOYMENT','3. Datos laborales',f.employmentComplete===true,'Revisar los datos laborales. Los campos opcionales pueden quedar vacíos.'),
    row('ECONOMICS','4. Condiciones económicas',f.economicComplete,'Seleccionar y guardar el plan contractual.'),
    row('SCHEDULE','5. Cronograma contractual',f.scheduleComplete,'Guardar la primera fecha, el día habitual y el cronograma que concilie con el total.'),
  ];
}
