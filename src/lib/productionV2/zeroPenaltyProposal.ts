/** Offline proposal only. No route installs these templates or records an approval. */
import amendment from './proposedPackages/zero-penalties-v2.json';
import { originalTemplates } from './originals';
import { templateHash, type FinalDocumentKind } from './catalog';

export function zeroPenaltyReviewTemplates() {
    const templates = originalTemplates();
    for (const change of amendment.amendments) {
        const kind = change.kind as FinalDocumentKind;
        const base = templates[kind];
        if (base.sha256 !== change.baseTemplateHash || base.blocks?.filter(b => b.id === change.blockId).length !== 1) {
            throw Error('PROPOSED_AMENDMENT_BASE_MISMATCH');
        }
        const blocks = base.blocks.map(b => b.id === change.blockId ? { ...b, text: change.text } : { ...b });
        const { sha256: previousHash, ...body } = base;
        void previousHash;
        const next = { ...body, version: amendment.templateVersion, blocks, paragraphs: blocks.map(b => b.text) };
        templates[kind] = { ...next, sha256: templateHash(next) };
    }
    return templates;
}
