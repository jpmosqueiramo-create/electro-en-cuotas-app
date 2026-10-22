from pathlib import Path
from pypdf import PdfReader

folder = Path('/tmp/cuenta-hogar-preview-409')
texts = []
for filename in ['mandato.pdf', 'pagare.pdf']:
    reader = PdfReader(folder / filename)
    text = '\n'.join(page.extract_text() for page in reader.pages)
    flat = ' '.join(text.split())
    assert 'María Muñoz' in flat
    assert 'Dirección sintética Nº 10' in flat
    assert 'LOOP GESTIÓN INTEGRAL S.R.L.' in flat
    assert '30-71962686-2' in flat
    assert 'Caracas 1101, Ciudad Autónoma de Buenos Aires, CP 1431' in flat
    assert 'PENDIENTE DE REVISIÓN' in flat
    assert 'CH-000001' not in flat
    for page in reader.pages:
        assert 'BORRADOR' in page.extract_text()
        assert 'NO VÁLIDO PARA FIRMA' in page.extract_text()
    texts.append(text)
assert '• Capacidad de prueba' in ' '.join(texts[0].split())
assert '• Garantía y gestión' in ' '.join(texts[0].split())
assert len(PdfReader(folder / 'pagare.pdf').pages) == 1
print('PREVIEW_409_PDF_TEXT=PASS; SELECTABLE_BULLETS_ACCENTS; PENDING_VALUES; LEGAL_ENTITY; NO_NUMBERING; WARNING_ALL_PAGES')
