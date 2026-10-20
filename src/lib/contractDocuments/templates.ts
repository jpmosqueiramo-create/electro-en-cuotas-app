// Review copy only: none of these strings are approved contractual clauses.
export const REVIEW_WARNING = 'BORRADOR — NO VÁLIDO PARA FIRMA — PENDIENTE DE REVISIÓN LEGAL.';
export const REVIEW_VERSION = 'LEGAL_REVIEW_V1';
export const templates = Object.freeze({
  mandate: Object.freeze({
    id:'synthetic-mandate-review',version:REVIEW_VERSION,title:'Contrato de mandato',
    legalHeading:'Texto del mandato pendiente de aprobación jurídica',
    legalText:'Este espacio está reservado para el texto del mandato que apruebe la revisión jurídica. No se incorporan cláusulas legacy, facultades, obligaciones, tasas ni jurisdicciones por omisión.',
    pending:'Objeto y alcance del mandato, obligaciones de las partes, remuneración, tratamiento del cronograma, incumplimiento, jurisdicción y demás condiciones: pendientes de revisión y aprobación jurídica.',
  }),
  promissoryNote: Object.freeze({
    id:'synthetic-promissory-note-review',version:REVIEW_VERSION,title:'Pagaré',
    legalHeading:'Texto del pagaré pendiente de aprobación jurídica',
    legalText:'Este espacio está reservado para el texto y los requisitos del pagaré que determine la revisión jurídica. El total contractual se presenta como dato de referencia; no se redacta aquí una promesa de pago ni se define el importe del título.',
    pending:'Beneficiario, importe del título, vencimiento o exigibilidad, lugar de pago, texto, formalidades y firmas: pendientes de definición y aprobación jurídica.',
  }),
});
export type ReviewDocumentKind = keyof typeof templates;
