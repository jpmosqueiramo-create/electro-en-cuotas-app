"""QA de PDFs sintéticos: requiere pypdf, no usa Firebase ni datos productivos."""
import json
import re
import sys
from pathlib import Path
from pypdf import PdfReader

folder = Path(sys.argv[1])
expected = json.loads((folder / 'expected.json').read_text())
warning = 'BORRADOR — NO VÁLIDO PARA FIRMA — PENDIENTE DE REVISIÓN LEGAL.'
for name in ['mandato', 'pagare']:
    reader = PdfReader(folder / (name + '.pdf'))
    assert len(reader.pages) >= 1, 'Missing pages'
    pages = [' '.join(page.extract_text().split()) for page in reader.pages]
    for index, text in enumerate(pages):
        assert warning in text, 'Missing legal warning on page'
        assert expected['contractNumber'] in text, 'Missing contract number on page'
        assert f'{index+1} / {len(pages)}' in text, 'Invalid pagination'
    full = ' '.join(pages)
    for value in expected['required']:
        assert value in full, 'Missing expected snapshot or review content'
    for value in expected['forbidden']:
        assert value not in full, 'Sensitive field leaked'
    # Each materialized row appears in order, with the original amount.
    cursor = 0
    for row in expected['rows']:
        found = re.search(r'(?<!\d)' + re.escape(str(row['number'])) + r'\s+' + re.escape(row['date']) + r'\s+' + re.escape(row['amount']), full[cursor:])
        assert found, 'Missing or altered schedule row'
        cursor += found.end()
    assert 'NO FIRMAR' in full, 'Missing signature restriction'
    assert not reader.get_fields(), 'Unexpected interactive signature/form fields'
print('DOCUMENT_PDF_TEXT_SCHEDULE_PAGINATION_PRIVACY = PASS')
