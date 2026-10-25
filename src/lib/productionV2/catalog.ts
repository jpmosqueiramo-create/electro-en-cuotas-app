import installedFinalPackages from './finalPackages.json';
import type { ContractSnapshotV2, ContractLegalContextV2 } from '../contractSnapshotV2';
import { contractValueHash } from '../contractIntegrityV2';
export type FinalDocumentKind = 'MANDATE' | 'PAGARE' | 'REMITO';
export const finalDocumentKinds: readonly FinalDocumentKind[] = ['MANDATE', 'PAGARE', 'REMITO'];
/** Legal text is immutable data, not code supplied by a browser. Variables are allowlisted by the renderer. */
export interface OriginalBlock { id: string; type: string; text: string }
export interface OriginalsPolicy {
    version: 'OWNER_ORIGINALS_V1';
    mandateJurisdiction: 'CLIENT_DOMICILE_COMPETENT_COURTS';
    noteJurisdiction: string;
    notePaymentPlace: string;
    penaltyMonthlyPercent: string;
    corporatePowersReference: string;
    addressAmendmentReference: string;
    economicAllocationPolicy: 'EXPLICIT_RECONCILED_CLIENT_CONFORMITY';
}
export interface FinalTemplate {
    layout?: 'OWNER_ORIGINALS_V1';
    blocks?: readonly OriginalBlock[];
    kind: FinalDocumentKind;
    id: string;
    version: string;
    title: string;
    paragraphs: readonly string[];
    sha256: string;
}
export const EXTERNAL_DELIVERY_POLICY = 'EXTERNAL_TRANSFER_AND_RECEIPT_V1' as const;
export function issuedDocumentKinds(p: FinalPackage): readonly FinalDocumentKind[] {
    return p.deliveryDocumentPolicy === EXTERNAL_DELIVERY_POLICY ? ['MANDATE', 'PAGARE'] : finalDocumentKinds;
}
export interface FinalPackage {
    /** Missing means the immutable historical three-document package. */
    deliveryDocumentPolicy?: typeof EXTERNAL_DELIVERY_POLICY;
    id: string;
    version: string;
    issuer: ContractLegalContextV2['issuer'];
    jurisdiction: string;
    originalsPolicy?: OriginalsPolicy;
    templates: Readonly<Record<FinalDocumentKind, FinalTemplate>>;
    rendererHash: string;
    resourcesHash: string;
    sha256: string;
}
export function templateHash(t: Omit<FinalTemplate, 'sha256'>) { return contractValueHash(t); }
export function packageHash(p: Omit<FinalPackage, 'sha256'>) { return contractValueHash(p); }
export function validateFinalPackage(p: FinalPackage) {
    const { sha256, ...payload } = p;
    if (p.deliveryDocumentPolicy !== undefined && p.deliveryDocumentPolicy !== EXTERNAL_DELIVERY_POLICY) throw Error('FINAL_DELIVERY_POLICY_INVALID');
    if (!p.jurisdiction?.trim() || !p.issuer?.representative.fullName.trim() || !p.issuer.representative.capacity.trim())
        throw Error('FINAL_FORMAL_DATA_REQUIRED');
    if (!/^[a-f0-9]{64}$/.test(sha256) || sha256 !== packageHash(payload) || !p.id || !p.version || !/^[a-f0-9]{64}$/.test(p.rendererHash) || !/^[a-f0-9]{64}$/.test(p.resourcesHash))
        throw Error('FINAL_PACKAGE_INVALID');
    if (p.originalsPolicy) {
        const x = p.originalsPolicy;
        if (x.version !== 'OWNER_ORIGINALS_V1' || x.mandateJurisdiction !== 'CLIENT_DOMICILE_COMPETENT_COURTS' || x.economicAllocationPolicy !== 'EXPLICIT_RECONCILED_CLIENT_CONFORMITY' ||
            !/^(?:0|[1-9]\d?)(?:\.\d{1,4})?$/.test(x.penaltyMonthlyPercent) ||
            [x.noteJurisdiction,x.notePaymentPlace,x.corporatePowersReference,x.addressAmendmentReference].some(v => typeof v !== 'string' || !v.trim() || v.length > 500 || /[\x00-\x1f]/.test(v))) throw Error('ORIGINALS_APPROVED_POLICY_REQUIRED');
    }
    for (const kind of finalDocumentKinds) {
        const t = p.templates[kind];
        if (!t || t.kind !== kind || !t.id || !t.version || !t.title || !t.paragraphs.length || t.paragraphs.some(s => typeof s !== 'string' || !s.trim()))
            throw Error('FINAL_TEMPLATE_INVALID');
        if (t.layout || t.blocks || p.originalsPolicy) {
            if (!p.originalsPolicy || t.layout !== 'OWNER_ORIGINALS_V1' || !t.blocks?.length || t.blocks.some(b => !b.id || !b.type || !b.text) ||
                new Set(t.blocks.map(b => b.id)).size !== t.blocks.length || contractValueHash(t.paragraphs) !== contractValueHash(t.blocks.map(b => b.text))) throw Error('ORIGINALS_LAYOUT_INVALID');
        }
        const { sha256: hash, ...text } = t;
        if (hash !== templateHash(text))
            throw Error('FINAL_TEMPLATE_HASH_MISMATCH');
    }
}
// No approved final derived text has been identified. Installing a reviewed package
// is a code-reviewed release; neither a flag nor an administrative declaration can add one.
// Data is hashed by packageHash, independently of the renderer source manifest.
// Keeping reviewed packages in a separate non-executable file avoids a hash cycle.
export const approvedFinalPackages: readonly FinalPackage[] = Object.freeze(installedFinalPackages as readonly FinalPackage[]);
export type FinalSnapshot = ContractSnapshotV2 & {
    freeze: Extract<ContractSnapshotV2['freeze'], {
        readinessPolicyVersion: 'CONTRACT_PRODUCTION_APPROVAL_V1';
    }>;
};
