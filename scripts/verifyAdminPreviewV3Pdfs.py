"""Verify PDFs returned by the real HTTP preview in the local browser test."""
import hashlib
import json
import re
from pathlib import Path
from pypdf import PdfReader
import pdfplumber

root = Path('/tmp/cuenta-hogar-operation-documents')
checks = 0

def check(condition, label):
    global checks
    assert condition, label
    checks += 1

def normalized(text):
    return re.sub(r'\s+', ' ', text).strip()

def money(value):
    return '$ ' + format(value, ',').replace(',', '.') + ',00'

for case in ['pending-fields', 'conformed']:
    payload = json.loads((root / (case + '.json')).read_text())
    p = payload['projection']
    check(payload['available'] and p['issuance'] == 'DRAFT_REVIEW_ONLY' and p['number'] is None, case + ' draft only')
    for kind in ['mandate', 'promissoryNote', 'remito']:
        path = root / f'{case}-{kind}.pdf'
        check(hashlib.sha256(path.read_bytes()).hexdigest() == payload[kind]['sha256'], kind + ' response digest')
        pages = PdfReader(path).pages
        text = normalized(' '.join(page.extract_text() for page in pages))
        check(all('BORRADOR — NO VÁLIDO PARA FIRMA' in normalized(page.extract_text()) for page in pages), kind + ' warning')
        check(not re.search(r'CH-\d{6}', text), kind + ' no number')
        check(all(x in text for x in ['LOOP GESTIÓN INTEGRAL S.R.L.', '30-71962686-2', 'Caracas 1101']), kind + ' issuer')
        check(all(x not in text for x in ['capitalizará mensualmente', 'interés punitorio del', 'intereses punitorios del', 'o donde la acreedora lo indique']), kind + ' no obsolete clauses')
        if kind != 'remito':
            check('No se cobrarán intereses punitorios ni recargos adicionales por atraso, ni se capitalizarán intereses punitorios.' in text, kind + ' zero penalties')
        image_count = sum(v.get_object().get('/Subtype') == '/Image' for page in pages for v in page['/Resources'].get_object().get('/XObject', {}).values())
        check(image_count == 0 if kind == 'promissoryNote' else image_count > 0, kind + ' branding')
        if kind == 'promissoryNote':
            c = p['customer']
            check(f"en el domicilio del suscriptor situado en {c['address']}, {c['locality']}, {c['province']}, CP {c['postalCode']}" in text, 'exact conformed address')
            check('Tribunales Ordinarios de la ciudad de [PENDIENTE DE VALIDACIÓN]' in text, 'note jurisdiction independent')
        if p['economics'] and kind != 'remito':
            e = p['economics']
            check(money(e['total']) in text, kind + ' persisted total')
            check(e['capital'] + e['service'] == e['total'] == sum(r['amount'] for r in p['schedule']), 'no economic change')
            if kind == 'mandate':
                for row in p['schedule']:
                    check(normalized(f"{row['installmentNumber']} {money(row['amount'])} {row['dueDate']}") in text, 'exact saved installment')
        with pdfplumber.open(path) as pdf:
            check(all(39 <= w['x0'] < w['x1'] <= 558 and 10 <= w['top'] < w['bottom'] <= 824 for page in pdf.pages for w in page.extract_words()), kind + ' no clipping')
print(json.dumps({'status': 'PASS', 'checks': checks, 'pdfs': 6, 'source': 'actual local HTTP preview', 'productionWrites': 0}))
