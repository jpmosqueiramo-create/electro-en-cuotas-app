import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { drawCuentaHogarLogo } from './pdfBranding';
import type { readFinancialReceipt } from './operationFinancialV2Server';
/** Read projection only. No debt, payment, number or tax document is created. */
export function financialReceiptPdf(source: Awaited<ReturnType<typeof readFinancialReceipt>>) {
    const { receipt: r, issuer, clientName, test } = source, doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
    const money = (c: number) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(c / 100);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.text('Recibo de pago acreditado', 18, 26);
    drawCuentaHogarLogo(doc, 170, 12, 23);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    let y = 42;
    for (const text of [issuer.legalName, `${issuer.taxId} · ${issuer.legalAddress}`, `Cliente: ${clientName}`, `Contrato: ${r.contractNumber}`, `Recibo: ${r.receiptId}`, `Fecha de acreditación: ${r.effectiveDate}`, `Importe: ${money(r.amountCents)} · Medio: ${r.method}`, `Estado: ${r.status}`, r.reversedAt ? `Reversado: ${r.reversedAt}` : '']) {
        if (!text)
            continue;
        const lines = doc.splitTextToSize(text, 174);
        doc.text(lines, 18, y);
        y += lines.length * 5 + 3;
    }
    autoTable(doc, { startY: y, head: [['Cuota', 'Importe imputado']], body: r.allocations.map(a => [String(a.installmentNumber), money(a.amountCents)]), margin: { left: 18, right: 18, bottom: 30 }, styles: { font: 'helvetica', fontSize: 10 } });
    for (let i = 1; i <= doc.getNumberOfPages(); i++) {
        doc.setPage(i);
        doc.setFontSize(9);
        doc.text('Este recibo no es un comprobante fiscal ARCA. Sin CAE.', 18, 276);
        if (test) {
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(8);
            doc.text('DOCUMENTO DE PRUEBA — SIN VALIDEZ CONTRACTUAL O FISCAL', 18, 284);
        }
    }
    return new Uint8Array(doc.output('arraybuffer'));
}
