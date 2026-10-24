/** Proposed text only: no catalog installation or legal approval. */
import amendment from './proposedPackages/client-payment-place-v3.json';
import { zeroPenaltyReviewTemplates } from './zeroPenaltyProposal';
import { templateHash } from './catalog';

export function clientPaymentPlaceReviewTemplates() {
    const templates = zeroPenaltyReviewTemplates(), base = templates.PAGARE;
    if (base.sha256 !== amendment.baseTemplateHash || base.blocks?.filter(b => b.id === amendment.blockId).length !== 1)
        throw Error('PROPOSED_AMENDMENT_BASE_MISMATCH');
    const blocks = base.blocks.map(b => b.id === amendment.blockId ? { ...b, text: amendment.text } : { ...b });
    const { sha256: previousHash, ...body } = base;
    void previousHash;
    const next = { ...body, version: amendment.templateVersion, blocks, paragraphs: blocks.map(b => b.text) };
    return { ...templates, PAGARE: { ...next, sha256: templateHash(next) } };
}
