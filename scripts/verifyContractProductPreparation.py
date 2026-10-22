"""Read-only checks for the synthetic pair produced by the Emulator runner."""
import json
import re
from pathlib import Path
from pypdf import PdfReader

folder = Path('/tmp/cuenta-hogar-contract-preparation')
p = json.loads((folder / 'projection.json').read_text())
mandate = PdfReader(folder / 'mandato.pdf')
note = PdfReader(folder / 'pagare.pdf')
texts = [' '.join(page.extract_text() for page in pdf.pages) for pdf in (mandate, note)]
assert p['product']['quantity'] == 2 and p['product']['condition'] == 'NEW'
assert not any(item['section'] == 'product' for item in p['pending'])
assert 'Nuevo' in texts[0] and re.search(r'Cantidad\s+Bien solicitado\s+Condición\s+2\b', texts[0])
for pdf, text in zip((mandate, note), texts):
    assert p['sourceHash'][:20] in text
    assert f"Revisión {p['draftRevision']}" in text
    assert p['issuer']['taxId'] in text
    for page in pdf.pages:
        assert 'BORRADOR — NO VÁLIDO PARA FIRMA' in page.extract_text()
        assert abs(float(page.mediabox.width) - 595.28) < 1
    assert '$ 1.339.920,00' in text
assert len(note.pages) == 1
assert not re.search(r'cuota|vencimiento', texts[1], re.I)
for row in p['schedule']:
    assert '/'.join(row['dueDate'].split('-')[::-1]) in texts[0]
assert sum(row['amount'] for row in p['schedule']) == p['economics']['total']
assert p['number'] is None and p['legalApproval'] == 'PENDING'
print('PRODUCT_PDF_INTEGRITY=PASS; QUANTITY_CONDITION; SAME_SOURCE_REVISION; EXACT_TOTAL_SCHEDULE; DRAFT_ONLY')
