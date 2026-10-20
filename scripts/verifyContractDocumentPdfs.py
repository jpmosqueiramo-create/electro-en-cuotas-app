"""QA del formato confirmado, contenido sintético e integridad de cronograma."""
import json
import hashlib
import os
import re
import sys
from pathlib import Path
from pypdf import PdfReader

folder = Path(sys.argv[1])
expected = json.loads((folder / 'expected.json').read_text())
warning = 'BORRADOR — NO VÁLIDO PARA FIRMA — PENDIENTE DE REVISIÓN LEGAL.'
normalize = lambda text: ' '.join(text.split())
copy_source = Path('src/lib/contractDocuments/templates.ts').read_text()
# The reference clauses are versioned as a literal, independently of the renderer.
copy = json.loads(copy_source.split('export const referenceCopy = ', 1)[1].split(' as const;', 1)[0])
for name, page_count in [('mandato', 2), ('pagare', 1)]:
    reader = PdfReader(folder / (name + '.pdf'))
    assert len(reader.pages) == page_count, 'Reference page count changed'
    assert all(abs(float(page.mediabox.width)-595.28) < 0.1 and abs(float(page.mediabox.height)-841.89) < 0.1 for page in reader.pages), 'Not A4'
    pages = [normalize(page.extract_text()) for page in reader.pages]
    for index, text in enumerate(pages):
        assert warning in text, 'Missing legal warning on page'
        assert expected['contractNumber'] in text, 'Missing snapshot contract number'
        assert f'{index+1} / {len(pages)}' in text, 'Invalid pagination'
    full = ' '.join(pages)
    for value in expected['required']:
        assert value in full, 'Missing expected snapshot or review content'
    for value in expected['forbidden'] + ['BFRL6UJU']:
        assert value not in full, 'Reference personal/internal data leaked'
    assert 'NO FIRMAR' in full and not reader.get_fields(), 'Signature restriction violated'
    if name == 'mandato':
        economic_block = full.split(copy['clauses']['2']['heading'], 1)[1].split(copy['clauses']['3']['heading'], 1)[0]
        for label, field in [('Capital aplicado a la compra','capital'),('Servicios de Cuenta Hogar','service'),('Total contractual','total')]:
            assert economic_block.count(label) == 1 and f"{label} {expected['economics'][field]}" in economic_block, 'Approved snapshot breakdown changed'
        for legacy in ['Valor Neto del Bien', 'Gastos de logística + Servicio de Soporte técnico:', 'Costo Financiero Total (CFT)', 'VALOR TOTAL A FINANCIAR', 'Datos V2 del snapshot']:
            assert legacy not in economic_block, 'Legacy breakdown still present'
        cursor = 0
        for row in expected['rows']:
            found = re.search(r'(?<!\d)' + str(row['number']) + r':\s+' + re.escape(row['date']), full[cursor:])
            assert found, 'Missing or altered materialized date/order'
            cursor += found.end()
            assert row['amount'] in full, 'Materialized amount changed'
        assert len(re.findall(r'\d+: \d{2}/\d{2}/\d{4}', full)) == len(expected['rows']), 'Extra/missing schedule dates'
        # Verify actual PDF coordinates, not just equivalent extracted text.
        labels, dates, segments = {}, {}, []
        # Read the literal operators: extraction can report a synthetic (0,0)
        # position for the first text run after vector borders.
        state = {'x':0, 'y':0, 'size':0}
        def line_operator(op, args, cm, tm):
            if op == b'm':
                line_operator.pen = tuple(float(n)*25.4/72 for n in args)
            elif op == b'l' and hasattr(line_operator, 'pen'):
                segments.append((line_operator.pen, tuple(float(n)*25.4/72 for n in args)))
            elif op == b'BT':
                state.update(x=0, y=0)
            elif op == b'Tf':
                state['size'] = float(args[1])
            elif op == b'Td':
                state['x'] += float(args[0])
                state['y'] += float(args[1])
            elif op == b'Tm':
                state.update(x=float(args[4]), y=float(args[5]))
            elif op == b'Tj':
                value = (args[0].decode('latin1') if isinstance(args[0], bytes) else str(args[0])).strip()
                point = (state['x']*25.4/72, (841.89-state['y'])*25.4/72, state['size'])
                if re.fullmatch(r'\d+:', value):
                    assert value not in labels, 'Duplicate installment label'
                    labels[value] = point
                if re.fullmatch(r'\d{2}/\d{2}/\d{4}', value):
                    assert value not in dates, 'Duplicate grid date'
                    dates[value] = point
        reader.pages[0].extract_text(visitor_operand_before=line_operator)
        remaining = expected['rows'][1:]
        assert len(labels) == len(dates) == len(remaining), 'Grid lost or duplicated installments'
        if remaining:
            split = (len(remaining)+1)//2
            height = max(6, split*3.5)
            step = height/split
            baseline_offset = min(4, step-0.9)
            top = labels[f"{remaining[0]['number']}:"][1]-baseline_offset
            for index, row in enumerate(remaining):
                column, line = divmod(index, split)
                x, y, size = labels[f"{row['number']}:"]
                dx, dy, date_size = dates[row['date']]
                assert abs(x-(142+column*27.5)) < 0.01, 'Misaligned installment column'
                assert abs(dx-(x+6)) < 0.01 and abs(dy-y) < 0.01, 'Number/date misalignment'
                assert size == date_size == 7.5, 'Grid font changed'
                assert abs(y-(top+line*step+baseline_offset)) < 0.01, 'Uneven grid row height'
                assert step >= 3.5, 'Insufficient line separation'
            def has_line(x1, y1, x2, y2):
                target = (x1,y1,x2,y2)
                return any(all(abs(actual-wanted)<0.02 for actual,wanted in zip((a[0],841.89*25.4/72-a[1],b[0],841.89*25.4/72-b[1]),target)) for a,b in segments)
            assert has_line(167.5,top,167.5,top+height), 'Missing internal column divider'
            for x in [85,140]:
                assert has_line(x,top-12,x,top+height), 'Main table column border changed'
            for row in range(1,split):
                assert has_line(140,top+row*step,195,top+row*step), 'Missing grid row border'
        assert 'N° de Contrato / Legajo:' in pages[0]
        assert copy['clauses']['5']['heading'] in pages[0] and copy['clauses']['6']['heading'] in pages[1], 'Clause page break changed'
        for clause in copy['clauses'].values():
            assert normalize(clause['heading']) in full and normalize(clause['text']) in full, 'Reference clause changed'
        for key in ['billing', 'intermediary', 'guarantee']:
            assert normalize(copy[key]) in full, 'Reference wording changed'
    else:
        for key in ['notePromise', 'noteReason', 'noteArrears']:
            assert normalize(copy[key]) in full, 'Promissory note wording changed'
        assert 'Importe propuesto del pagaré' in full and 'referencia técnica pendiente de aprobación jurídica' in full, 'Missing proposed, non-enforceable amount warning'
        assert 'POR $ [PENDIENTE]' in full and '[IMPORTE PENDIENTE]' in full, 'Unapproved note amount assigned'
        assert f"Contrato N° {expected['contractNumber']}" in full
        if 'unchangedNoteStreamHash' in expected:
            assert hashlib.sha256(reader.pages[0].get_contents().get_data()).hexdigest() == expected['unchangedNoteStreamHash'], 'Promissory note presentation/content changed'
    # Physical anchors from the confirmed original, in PDF points (bottom origin).
    anchors = {}
    def visit(text, cm, tm, font, size):
        for title in ['CONTRATO DE MANDATO COMERCIAL Y', 'GESTIÓN DE COMPRA', 'PAGARÉ A LA VISTA Y SIN PROTESTO']:
            if text.strip() == title:
                anchors[title] = (tm[4], tm[5], size)
    reader.pages[0].extract_text(visitor_text=visit)
    if name == 'mandato':
        positions = {}
        def clause_position(text, cm, tm, font, size):
            for label in ['SÉPTIMA:', 'OCTAVA:', 'NOVENA:', 'DÉCIMA:', 'Firma y Aclaración MANDANTE']:
                if text.startswith(label):
                    positions[label] = (841.89-tm[5])*25.4/72
        reader.pages[1].extract_text(visitor_text=clause_position)
        for label, at in [('SÉPTIMA:',74.8),('OCTAVA:',100),('NOVENA:',129),('DÉCIMA:',154.2),('Firma y Aclaración MANDANTE',202.2)]:
            assert abs(positions[label]-at) < 0.01, 'Reference page two geometry changed'
    targets = {'CONTRATO DE MANDATO COMERCIAL Y': (15, 17, 13), 'GESTIÓN DE COMPRA': (15, 23, 13)} if name == 'mandato' else {'PAGARÉ A LA VISTA Y SIN PROTESTO': (None, 22, 14)}
    for title, (x, y, size) in targets.items():
        ax, ay, actual_size = anchors[title]
        assert (x is None or abs(ax-x*72/25.4) < 0.1) and abs(ay-(841.89-y*72/25.4)) < 0.1 and actual_size == size, 'Reference header geometry changed'

# Optional independent audit against the actual supplied PDFs. Never copies PII.
reference_dir = os.environ.get('PDF_REVIEW_REFERENCE_DIR')
if reference_dir:
    hashes = json.loads(copy_source.split('export const referencePdfHashes = ', 1)[1].split(' as const;', 1)[0])
    for kind, filename in [('mandate', 'CONTRATO_BFRL6UJU_JUAN_PABLO_MOSQUEIRA.pdf'), ('promissoryNote', 'PAGARE_BFRL6UJU_JUAN_PABLO_MOSQUEIRA.pdf')]:
        assert hashlib.sha256((Path(reference_dir) / filename).read_bytes()).hexdigest() == hashes[kind], 'Original reference changed'
    original = normalize(PdfReader(Path(reference_dir) / 'CONTRATO_BFRL6UJU_JUAN_PABLO_MOSQUEIRA.pdf').pages[0].extract_text())
    original += ' ' + normalize(PdfReader(Path(reference_dir) / 'CONTRATO_BFRL6UJU_JUAN_PABLO_MOSQUEIRA.pdf').pages[1].extract_text())
    generated = ' '.join(normalize(page.extract_text()) for kind in ['mandato','pagare'] for page in PdfReader(folder / (kind + '.pdf')).pages)
    for pattern in [r'D\.N\.I\. N° (\d+)', r'CUIT N° ([0-9-]+)', r'correo electrónico ([^ ,]+)']:
        for value in re.findall(pattern, original):
            assert value not in generated, 'Original personal/fiscal data leaked'
    note = normalize(PdfReader(Path(reference_dir) / 'PAGARE_BFRL6UJU_JUAN_PABLO_MOSQUEIRA.pdf').pages[0].extract_text())
    for clause in copy['clauses'].values():
        assert normalize(clause['text']) in original and clause['heading'] in original, 'Transcription differs from original'
    for key in ['billing', 'intermediary', 'guarantee']:
        assert normalize(copy[key]) in original, 'Transcription differs from original'
    for key in ['notePromise', 'noteReason', 'noteArrears']:
        assert normalize(copy[key]) in note, 'Transcription differs from original'
    print('ORIGINAL_REFERENCE_CLAUSES_VERBATIM = PASS')
print('DOCUMENT_PDF_REFERENCE_LAYOUT_CONTENT_SCHEDULE_PRIVACY = PASS')
