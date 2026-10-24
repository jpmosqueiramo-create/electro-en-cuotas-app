/** Original clause data shared by the production renderer and read-only review.
 * This factory neither installs a package nor records a legal approval. */
import candidate from './proposedPackages/originals-v1.json';
import { contractLegalEntity } from '../contractDocuments/legalEntity';
import { contractValueHash } from '../contractIntegrityV2';
import { templateHash, finalDocumentKinds, type FinalTemplate, type OriginalBlock } from './catalog';
export const ORIGINALS_VERSION = 'OWNER_ORIGINALS_INTEGRATION_V1';
export const originalTokenNames = ['issuer.legalName','issuer.taxId','issuer.legalAddress','representative.capacity','representative.fullName','client.fullName','client.dni','client.cuil','client.address','client.locality','client.province','client.paymentAddress','client.email','client.phone','issue.contract.place','issue.contract.day','issue.contract.month','issue.contract.year','issue.note.place','issue.note.day','issue.note.month','issue.note.year','economy.totalDisplay','economy.totalWordsWithoutCurrency','policy.penaltyMonthlyPercent','policy.notePaymentPlace','policy.noteJurisdiction'] as const;
export function originalTemplates(): Record<typeof finalDocumentKinds[number], FinalTemplate> {
    return Object.fromEntries(finalDocumentKinds.map(kind => {
        const source = candidate.documents[kind];
        const blocks: OriginalBlock[] = source.blocks.map(b => ({ id: b.id, type: b.type, text: b.text
            .replace('[PENDIENTE DE VALIDACIÓN]%', '{{policy.penaltyMonthlyPercent}}%')
            .replace('[LUGAR DE PAGO PENDIENTE DE VALIDACIÓN]', '{{policy.notePaymentPlace}}')
            .replace('[COMPETENCIA DEL PAGARÉ PENDIENTE DE VALIDACIÓN]', '{{policy.noteJurisdiction}}') }));
        const value = { kind, id: `loop-original-${kind.toLowerCase()}`, version: ORIGINALS_VERSION, title: source.title, layout: 'OWNER_ORIGINALS_V1' as const, blocks, paragraphs: blocks.map(b => b.text) };
        return [kind, { ...value, sha256: templateHash(value) }];
    })) as unknown as Record<typeof finalDocumentKinds[number], FinalTemplate>;
}
export function originalIssuer() {
    const value = { profileId: 'loop-owner-confirmed', profileVersion: contractLegalEntity.version,
        legalName: contractLegalEntity.legalName, tradeName: contractLegalEntity.tradeName, taxId: contractLegalEntity.taxId, legalAddress: contractLegalEntity.legalAddress,
        representative: { fullName: candidate.representative.fullName, capacity: candidate.representative.capacity } };
    return { ...value, profileHash: contractValueHash(value) };
}
