import { issuedDocumentKinds } from './catalog';
import { assertOriginalTemplate, renderOriginalFinal } from './originalPdf';
import { jsPDF } from 'jspdf';
import rendererManifest from './rendererManifest.json';
import autoTable from 'jspdf-autotable';
import { createHash } from 'node:crypto';
import { drawCuentaHogarLogo, PDF_BRAND_RESOURCE_HASH } from '../pdfBranding';
import { formatDraftAmount, amountWords } from '../contractDocuments/amountWords';
import { contractValueHash } from '../contractIntegrityV2';
import { validateContractSnapshot } from '../contractSnapshotV2';
import { validateFinalPackage, type FinalPackage, type FinalSnapshot, type FinalDocumentKind } from './catalog';
const tokens = ['CLIENT_NAME', 'CLIENT_DNI', 'CLIENT_ADDRESS', 'CLIENT_LOCALITY', 'CLIENT_PROVINCE', 'CLIENT_POSTAL_CODE', 'ISSUER_NAME', 'ISSUER_CUIT', 'ISSUER_ADDRESS', 'REPRESENTATIVE', 'CAPACITY', 'JURISDICTION', 'ISSUE_DATE', 'ISSUE_PLACE', 'CONTRACT_NUMBER', 'PRODUCT', 'QUANTITY', 'CONDITION', 'CAPITAL', 'SERVICES_GROSS', 'TOTAL', 'TOTAL_WORDS', 'INSTALLMENT_COUNT', 'INSTALLMENT_AMOUNT'] as const;
function display(text: string) { const s = text.normalize('NFC').replace(/\r\n?/g, '\n').replace(/\t/g, '    '); if (/[^\x20-\xff\n\u0152\u0153\u0160\u0161\u0178\u017d\u017e\u0192\u02c6\u02dc\u2013\u2014\u2018\u2019\u201a\u201c\u201d\u201e\u2020\u2021\u2022\u2026\u2030\u2039\u203a\u20ac\u2122]/u.test(s))
    throw Error('FINAL_DOCUMENT_UNSUPPORTED_TEXT'); return s; }
/** Values only; never supplier, margin, credit notes or a recomputed amount. */
function variables(s: FinalSnapshot, kind: FinalDocumentKind) {
    const c = s.personalData, e = s.economicTerms, n = kind === 'PAGARE', d = s.documentContext;
    return { CLIENT_NAME: c.fullName, CLIENT_DNI: c.dni, CLIENT_ADDRESS: c.address, CLIENT_LOCALITY: c.locality, CLIENT_PROVINCE: s.addressInterpretation.provinceDisplayName, CLIENT_POSTAL_CODE: c.postalCode,
        ISSUER_NAME: s.issuer.legalName, ISSUER_CUIT: s.issuer.taxId, ISSUER_ADDRESS: s.issuer.legalAddress, REPRESENTATIVE: s.issuer.representative.fullName, CAPACITY: s.issuer.representative.capacity, JURISDICTION: String(d.parameters.jurisdiction), ISSUE_DATE: n ? d.promissoryNoteIssueDate : d.contractIssueDate, ISSUE_PLACE: n ? d.promissoryNoteIssuePlace : d.contractIssuePlace, CONTRACT_NUMBER: s.contractNumber, PRODUCT: s.acceptedReference.nombre, QUANTITY: String(s.productDetails?.quantity ?? ''), CONDITION: s.productDetails?.condition === 'NEW' ? 'NUEVO' : s.productDetails?.condition === 'USED' ? 'USADO' : '', CAPITAL: formatDraftAmount(e.capitalAmount), SERVICES_GROSS: formatDraftAmount(e.serviceAmount), TOTAL: formatDraftAmount(e.contractTotal), TOTAL_WORDS: amountWords(e.contractTotal), INSTALLMENT_COUNT: String(e.contractPlanCuotas), INSTALLMENT_AMOUNT: formatDraftAmount(e.contractInstallmentAmount) };
}
// A checked, source-controlled manifest is stable across tsx and Next minification.
// npm prebuild verifies its source/dependency bytes; never regenerate it at runtime.
export const FINAL_RESOURCES_HASH = contractValueHash({ ...rendererManifest.resources, brand: PDF_BRAND_RESOURCE_HASH });
export const FINAL_RENDERER_HASH = contractValueHash(rendererManifest);
export function assertFinalRenderer(p: FinalPackage) { validateFinalPackage(p); if (jsPDF.version !== rendererManifest.resources.packages.jspdf.version)
    throw Error('FINAL_RENDERER_DEPENDENCY_MISMATCH'); if (p.rendererHash !== FINAL_RENDERER_HASH || p.resourcesHash !== FINAL_RESOURCES_HASH)
    throw Error('APPROVED_RENDERER_VERSION_MISMATCH'); for (const t of Object.values(p.templates)) {
    display(t.title);
    if (t.layout === 'OWNER_ORIGINALS_V1') { assertOriginalTemplate(t); continue; }
    for (const paragraph of t.paragraphs) {
        display(paragraph);
        for (const m of paragraph.matchAll(/\{\{([^}]+)\}\}/g))
            if (!tokens.includes(m[1] as typeof tokens[number]))
                throw Error('FINAL_TEMPLATE_UNKNOWN_VARIABLE');
    }
} }
export function renderFinalDocument(snapshot: FinalSnapshot, p: FinalPackage, kind: FinalDocumentKind, test: boolean) {
    if (!issuedDocumentKinds(p).includes(kind)) throw Error('INTERNAL_REMITO_DISABLED');
    validateContractSnapshot(snapshot);
    assertFinalRenderer(p);
    if (snapshot.freeze.legalPackageHash !== p.sha256 || snapshot.freeze.executionMode !== 'PRODUCTION' || !snapshot.productDetails?.quantity || !snapshot.productDetails.condition)
        throw Error('FINAL_DOCUMENT_CONTEXT_MISMATCH');
    if (p.templates[kind].layout === 'OWNER_ORIGINALS_V1') return renderOriginalFinal(snapshot,p,kind,test);
    const t = p.templates[kind], values = variables(snapshot, kind), doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true, putOnlyUsedFonts: true });
    let y = 31;
    doc.setCreationDate('D:' + snapshot.freeze.termsFrozenAt.slice(0, 19).replace(/\D/g, '') + "+00'00'");
    doc.setFileId(contractValueHash({ snapshot: snapshot.integrity.payloadHash, package: p.sha256, kind, test }).slice(0, 32));
    doc.setProperties({ title: t.title + (test ? ' — PRUEBA' : ''), author: 'Cuenta Hogar', subject: test ? 'DOCUMENTO DE PRUEBA — SIN VALIDEZ CONTRACTUAL O FISCAL' : snapshot.contractNumber });
    function line(text: string, bold = false) { doc.setFont('helvetica', bold ? 'bold' : 'normal'); doc.setFontSize(bold ? 12 : 10); for (const l of doc.splitTextToSize(display(text), 174) as string[]) {
        if (y > 267) {
            doc.addPage();
            y = 30;
        }
        doc.text(l, 18, y);
        y += bold ? 6 : 5;
    } y += 3; }
    line(t.title, true);
    for (const paragraph of t.paragraphs) {
        const text = paragraph.replace(/\{\{([^}]+)\}\}/g, (_, token: string) => { const v = values[token as keyof typeof values]; if (!v)
            throw Error('FINAL_DOCUMENT_VALUE_REQUIRED'); return v; });
        if (text.includes('{{') || text.includes('}}'))
            throw Error('FINAL_TEMPLATE_UNKNOWN_VARIABLE');
        line(text);
    }
    // These presentation tables are part of the approved renderer hash. Amounts are
    // read from the frozen snapshot, never recomputed or augmented with VAT.
    if (kind === 'MANDATE') {
        line('Condiciones y cronograma guardados', true);
        line(`Capital aplicado: ${values.CAPITAL} · Servicios brutos con IVA incluido: ${values.SERVICES_GROSS} · Total: ${values.TOTAL}`);
        autoTable(doc, { startY: y, head: [['Cuota', 'Vencimiento', 'Importe']], body: snapshot.paymentSchedule.installments.map(i => [String(i.installmentNumber), i.dueDate, formatDraftAmount(i.amount)]), margin: { top: 30, bottom: 28, left: 18, right: 18 }, styles: { font: 'helvetica', fontSize: 10, overflow: 'linebreak' } });
    }
    const pages = doc.getNumberOfPages();
    for (let page = 1; page <= pages; page++) {
        doc.setPage(page);
        if (kind !== 'PAGARE')
            drawCuentaHogarLogo(doc, 175, 4, 16);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(test ? 150 : 60, 30, 30);
        if (test)
            doc.text('DOCUMENTO DE PRUEBA — SIN VALIDEZ CONTRACTUAL O FISCAL', 18, 12);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.text(`${snapshot.contractNumber} · ${t.version} · ${page}/${pages}`, 18, 282);
        doc.text(`Revisión ${snapshot.sourceDraft.revision} · ${snapshot.integrity.payloadHash.slice(0, 24)}`, 18, 288);
    }
    const bytes = Buffer.from(doc.output('arraybuffer'));
    return { bytes, sha256: createHash('sha256').update(bytes).digest('hex'), pages };
}
