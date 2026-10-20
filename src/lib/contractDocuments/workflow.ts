export const documentPolicy = Object.freeze({ productiveFreeze: 'DISABLED', legalApproval: 'PENDING', issuance: 'REVIEW_ONLY', formalization: 'DISABLED' } as const);
export const documentStages = ['DRAFT', 'TECHNICAL_REVIEW', 'TERMS_FROZEN', 'FORMALIZED'] as const;
export type DocumentStage = typeof documentStages[number];
export type DocumentKind = 'mandate' | 'promissoryNote';
export interface DocumentArtifact {
  kind: DocumentKind; sha256: string; size: number; pages: number;
  templateId: string; templateVersion: string; templateHash: string;
  rendererBundleHash: string; storagePath: string; generation: string | null;
}
export interface DocumentArchiveRecord {
  schemaVersion: 'CONTRACT_DOCUMENT_ARCHIVE_V1'; executionMode: 'EMULATOR_ONLY';
  documentSetId: string; snapshotId: string; snapshotHash: string; contractNumber: string;
  manifest: ReturnType<typeof import('./pdf').generateContractReviewPair>['manifest'];
  manifestHash: string; state: 'PENDING' | 'COMPLETE'; legalApproval: 'PENDING'; issuance: 'REVIEW_ONLY';
  artifacts: DocumentArtifact[];
}
export interface PrivateDocumentArchive<S> {
  preserve(snapshot: S): Promise<DocumentArchiveRecord>;
  read(snapshotId: string, documentSetId: string, kind: DocumentKind): Promise<Uint8Array>;
  list(snapshotId: string): Promise<DocumentArchiveRecord[]>;
  close(): Promise<void>;
}
export const pendingLegalRequirements = [
  'Identidad documental y representación de LOOP GESTIÓN INTEGRAL S.R.L.',
  'Texto jurídico: armonizar SEGUNDA, TERCERA y referencias a gestión/financiación.',
  'Importe exigible, vencimiento, lugar y restantes condiciones del pagaré.',
  'Firmas físicas verificadas del contrato de mandato y del pagaré.',
] as const;
/** No command in this module can authorize issuance or physical formalization.
 * Signature evidence must eventually bind both signed originals to their approved versions.
 * Merely changing a state field, supplying a scan ID or a boolean is never sufficient. */
export function assertReviewTransition(target: DocumentStage, evidence?: unknown): never {
  void evidence;
  throw new Error(target === 'FORMALIZED' ? 'LEGAL_APPROVAL_AND_VERIFIED_PHYSICAL_SIGNATURES_REQUIRED' : 'DOCUMENT_STATE_MUTATION_DISABLED');
}
export interface ContractDocumentDossier {
  budgetId: string; budgetVersion: number; acceptedOptionId: string;
  acceptedAt: string; referenceName: string; offeredPlans: number[];
  draftRevision: number; stage: Exclude<DocumentStage, 'FORMALIZED'>;
  readiness: { reviewedAt: string; reviewedBy: string; termsDigest: string; evidenceHash: string } | null;
  documentation: { type: string; status: string; count: number; required: false }[];
  snapshot: { snapshotId: string; snapshotHash: string; contractNumber: string; templateVersions: string[] } | null;
  archives: (Pick<DocumentArchiveRecord, 'documentSetId' | 'state' | 'manifestHash' | 'snapshotHash'> & {artifacts: Pick<DocumentArtifact,'kind'|'sha256'|'pages'|'templateVersion'>[]})[];
  sampleAvailable: boolean;
  policy: typeof documentPolicy;
}
