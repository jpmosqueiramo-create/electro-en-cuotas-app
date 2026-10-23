import type { ContractSnapshotV2, ContractLegalContextV2 } from '../contractSnapshotV2';
import { contractValueHash } from '../contractIntegrityV2';
export type FinalDocumentKind = 'MANDATE' | 'PAGARE' | 'REMITO';
export const finalDocumentKinds: readonly FinalDocumentKind[] = ['MANDATE', 'PAGARE', 'REMITO'];
/** Legal text is immutable data, not code supplied by a browser. Variables are allowlisted by the renderer. */
export interface FinalTemplate {
    kind: FinalDocumentKind;
    id: string;
    version: string;
    title: string;
    paragraphs: readonly string[];
    sha256: string;
}
export interface FinalPackage {
    id: string;
    version: string;
    issuer: ContractLegalContextV2['issuer'];
    jurisdiction: string;
    templates: Readonly<Record<FinalDocumentKind, FinalTemplate>>;
    rendererHash: string;
    resourcesHash: string;
    sha256: string;
}
export function templateHash(t: Omit<FinalTemplate, 'sha256'>) { return contractValueHash(t); }
export function packageHash(p: Omit<FinalPackage, 'sha256'>) { return contractValueHash(p); }
export function validateFinalPackage(p: FinalPackage) {
    const { sha256, ...payload } = p;
    if (!p.jurisdiction?.trim() || !p.issuer?.representative.fullName.trim() || !p.issuer.representative.capacity.trim())
        throw Error('FINAL_FORMAL_DATA_REQUIRED');
    if (!/^[a-f0-9]{64}$/.test(sha256) || sha256 !== packageHash(payload) || !p.id || !p.version || !/^[a-f0-9]{64}$/.test(p.rendererHash) || !/^[a-f0-9]{64}$/.test(p.resourcesHash))
        throw Error('FINAL_PACKAGE_INVALID');
    for (const kind of finalDocumentKinds) {
        const t = p.templates[kind];
        if (!t || t.kind !== kind || !t.id || !t.version || !t.title || !t.paragraphs.length || t.paragraphs.some(s => typeof s !== 'string' || !s.trim()))
            throw Error('FINAL_TEMPLATE_INVALID');
        const { sha256: hash, ...text } = t;
        if (hash !== templateHash(text))
            throw Error('FINAL_TEMPLATE_HASH_MISMATCH');
    }
}
// No approved final derived text has been identified. Installing a reviewed package
// is a code-reviewed release; neither a flag nor an administrative declaration can add one.
export const approvedFinalPackages: readonly FinalPackage[] = Object.freeze([]);
export type FinalSnapshot = ContractSnapshotV2 & {
    freeze: Extract<ContractSnapshotV2['freeze'], {
        readinessPolicyVersion: 'CONTRACT_PRODUCTION_APPROVAL_V1';
    }>;
};
