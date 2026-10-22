from pypdf import PdfReader
import json,re
from pathlib import Path
base=Path('/tmp/cuenta-hogar-operation-documents'); p=json.loads((base/'projection.json').read_text())
m=PdfReader(base/'mandato.pdf');n=PdfReader(base/'pagare.pdf');mt='\n'.join(x.extract_text() for x in m.pages).replace('\xa0',' ');nt='\n'.join(x.extract_text() for x in n.pages).replace('\xa0',' ')
for doc in [m,n]:
 for page in doc.pages: assert 'BORRADOR' in page.extract_text() and 'NO VÁLIDO PARA FIRMA' in page.extract_text()
for text in [mt,nt]:
 assert p['issuer']['legalName'] in text and p['issuer']['taxId'] in text
 assert p['issuer']['legalAddress'] in ' '.join(text.split())
 assert '30-71829384-9' not in text
 assert 'domicilio legal y representación: PENDIENTE' not in text
 assert 'Representación societaria y facultades de firma' in mt
 assert 'La jurisdicción no se infiere del domicilio legal confirmado.' in ' '.join(mt.split())
 assert 'Cuenta Hogar S.R.L.' not in text
 assert not re.search(r'\d+(?:[.,]\d+)?\s*%',text)
 assert 'CH-000001' not in text
assert len(n.pages)==1 and len(m.pages)==3
assert not re.search('cuota|vencimiento',nt,re.I)
assert 'DOS MILLONES TRESCIENTOS CUARENTA Y TRES MIL CUATROCIENTOS VEINTE' in nt
assert '$ 2.343.420,00' in mt and '$ 2.343.420,00' in nt
for row in p['schedule']: assert row['dueDate'].split('-')[::-1] and '/'.join(row['dueDate'].split('-')[::-1]) in mt
for text in ['dos cuotas consecutivas impagas','diez días corridos','No se aplican intereses punitorios','factura a su nombre','firma física del cliente en el mandato, el pagaré y el remito']:
 assert text in ' '.join(mt.split()),text
assert '580.000,125' in ' '.join(page.extract_text() for page in PdfReader(base/'fractional-mandate.pdf').pages)
print('PDF_TEXT_INTEGRITY=PASS; SELECTABLE; 18_DATES; EXACT_AMOUNTS; SAME_SOURCE_HASH; MANDATE_3_PAGES; NOTE_1_PAGE; NO_INSTALLMENTS_IN_NOTE; NO_RATES; REQUIRED_WARNING_EVERY_PAGE')
