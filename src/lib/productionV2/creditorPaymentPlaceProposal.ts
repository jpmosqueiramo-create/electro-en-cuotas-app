import {contractValueHash} from '../contractIntegrityV2';
import {originalIssuer} from './originals';
/** Owner-directed proposal; not an installed or professionally approved package. */
import { zeroPenaltyReviewTemplates } from './zeroPenaltyProposal';
import { templateHash, type FinalDocumentKind } from './catalog';
export const creditorPaymentProposal = {
    version: 'OWNER_CREDITOR_PAYMENT_EXTERNAL_DELIVERY_V4',
    deliveryDocumentPolicy: 'EXTERNAL_TRANSFER_AND_RECEIPT_V1',
    status: 'PROPOSED_NOT_APPROVED', installable: false, professionalValidation: null,
    paymentPlace: 'Caracas 1101, Ciudad Autónoma de Buenos Aires, CP 1431',
    acceleration: 'TWO_CONSECUTIVE_UNPAID_MONTHLY_INSTALLMENTS',
    notePresentment: 'AT_SIGHT_WITHOUT_TWO_INSTALLMENT_PRECONDITION', internalRemito: false,
} as const;
export function creditorPaymentPlaceReviewTemplates() {
    const templates = zeroPenaltyReviewTemplates();
    const changes: {kind: FinalDocumentKind; blockId: string; text: string}[] = [
        {kind:'MANDATE', blockId:'default', text:'La mora se producirá de pleno derecho. La falta de pago de dos (2) cuotas mensuales consecutivas facultará a la EMPRESA a exigir el pago íntegro del saldo adeudado. No se cobrarán intereses punitorios ni recargos adicionales por atraso, ni se capitalizarán intereses punitorios.'},
        {kind:'PAGARE', blockId:'promise', text:'A LA VISTA , pagaré sin protesto (Art. 50 Dec. Ley 5965/63) a la orden de {{issuer.legalName}} (CUIT N° {{issuer.taxId}}), o a quien ésta designe, en el domicilio de Caracas 1101, Ciudad Autónoma de Buenos Aires, CP 1431, la suma de PESOS {{economy.totalWordsWithoutCurrency}} (Monto en letras), por igual valor recibido en servicios de gestión y financiación a mi entera satisfacción.'},
    ];
    for (const change of changes) {
        const base = templates[change.kind];
        if(base.blocks?.filter(b=>b.id===change.blockId).length!==1) throw Error('PROPOSED_AMENDMENT_BASE_MISMATCH');
        const {sha256: oldHash,...body}=base;
        const expected=change.kind==='MANDATE'?'ca1a5657f0023dff55ca9c0181571fe08d205f2b2e14bf7bc2a8c3b158b0f054':'4429925fbcc6d179595ac2f71b8a66fdc45e785fe9bf3a4bcbf715051e38f18a';
        if(oldHash!==expected||oldHash!==templateHash(body)) throw Error('PROPOSED_AMENDMENT_BASE_MISMATCH');
        const blocks=base.blocks.map(b=>b.id===change.blockId?{...b,text:change.text}:{...b});
        const next={...body,version:creditorPaymentProposal.version,blocks,paragraphs:blocks.map(b=>b.text)};
        templates[change.kind]={...next,sha256:templateHash(next)};
    }
    return templates;
}

export function creditorPaymentReviewIssuer(){const {profileHash:old,...issuer}=originalIssuer();void old;const value={...issuer,profileVersion:'LOOP_GERENTE_TITULAR_REVIEW_V4',representative:{...issuer.representative,capacity:'Gerente Titular'}};return {...value,profileHash:contractValueHash(value)};}
