"""Offline text, totals, branding and layout checks for the unapproved proposal."""
import hashlib
import json
import re
import sys
from pathlib import Path

import pdfplumber
from pypdf import PdfReader

ROOT = Path(__file__).resolve().parents[1]
assert sys.argv[1:] in ([], ['--client-payment-place'])
client_payment_place = bool(sys.argv[1:])
folder = ROOT / ('output/pdf/document-review-client-payment-place-v3' if client_payment_place
                 else 'output/pdf/document-review-zero-penalties-v2')
manifest = json.loads((folder / 'manifest.json').read_text())
count = 0


def check(ok, label):
    global count
    assert ok, label
    count += 1
    print('PASS ' + label)


def norm(text):
    return re.sub(r'\s+', ' ', text).strip()


def images(page):
    return sum(value.get_object().get('/Subtype') == '/Image'
               for value in page['/Resources'].get_object().get('/XObject', {}).values())


check(manifest['status'] == 'PROPOSED_NOT_APPROVED' and not manifest['installable']
      and manifest['professionalValidation'] is None, 'professional approval still pending')
texts = {}
for kind, info in manifest['pdfs'].items():
    path = folder / info['path']
    reader = PdfReader(path)
    texts[kind] = text = norm(' '.join(page.extract_text() for page in reader.pages))
    check(hashlib.sha256(path.read_bytes()).hexdigest() == info['sha256'], kind + ' exact PDF hash')
    check(len(reader.pages) == info['pages'], kind + ' page count')
    check(all('BORRADOR — NO VÁLIDO PARA FIRMA' in norm(page.extract_text()) for page in reader.pages), kind + ' watermark every page')
    check(all(images(page) == 0 for page in reader.pages) if kind == 'PAGARE'
          else all(images(page) > 0 for page in reader.pages), kind + ' correct branding')
    check(all(value in text for value in ['LOOP GESTIÓN INTEGRAL S.R.L.', '30-71962686-2', 'Caracas 1101', manifest['projection']['customer']['fullName']]), kind + ' selectable identity')
    check(not re.search(r'\bCH-\d', text) and 'Sin numeración definitiva' in text, kind + ' no CH allocation')
    for block in manifest['templates'][kind]['blocks']:
        if block['type'] in ['paragraph', 'heading'] and '{{' not in block['text']:
            check(norm(block['text']) in text, kind + ' complete clause ' + block['id'])
    with pdfplumber.open(path) as pdf:
        check(all(39 <= word['x0'] < word['x1'] <= 558 and 10 <= word['top'] < word['bottom'] <= 824
                  for page in pdf.pages for word in page.extract_words()), kind + ' text within page bounds')

for kind in ['MANDATE', 'PAGARE']:
    check('No se cobrarán intereses punitorios ni recargos adicionales por atraso, ni se capitalizarán intereses punitorios.' in texts[kind], kind + ' explicit zero penalties and no capitalization')
    check('capitalizará mensualmente' not in texts[kind] and '[PENDIENTE DE VALIDACIÓN]%' not in texts[kind], kind + ' no old penalty rate or compounding')
check('La mora se producirá de pleno derecho.' in texts['MANDATE'] and 'exigir el pago íntegro del saldo adeudado.' in texts['MANDATE'], 'mandate other default consequences preserved')
check('la mora de pleno derecho y la caducidad de todos los plazos, haciéndose exigible la presentación y cobro del presente documento.' in texts['PAGARE'], 'note other default consequences preserved')


def money(value):
    return '$ ' + format(value, ',').replace(',', '.') + ',00'


p = manifest['projection']
e = p['economics']
check(e['capital'] + e['service'] == e['total'] == sum(row['amount'] for row in p['schedule']), 'saved amounts reconcile')
check(money(e['total']) in texts['MANDATE'] and money(e['total']) in texts['PAGARE'], 'mandate and note same contractual total')
check(money(e['capital']) in texts['MANDATE'] and money(e['service']) in texts['MANDATE'], 'capital and gross services unchanged')
for row in p['schedule']:
    check(norm(f"{row['installmentNumber']} {money(row['amount'])} {row['dueDate']}") in texts['MANDATE'], 'saved installment ' + str(row['installmentNumber']))
check('Costo Financiero Total (CFT) [PENDIENTE DE VALIDACIÓN]' in texts['MANDATE'], 'no invented CFT')
check('Tribunales Ordinarios de la ciudad de [PENDIENTE DE VALIDACIÓN]' in texts['PAGARE'], 'note jurisdiction independently pending')
if client_payment_place:
    check('en el domicilio del suscriptor situado en ' + manifest['paymentAddress']['display'] in texts['PAGARE'], 'payment place exactly client address, locality, province and postal code')
    check('o donde la acreedora lo indique' not in texts['PAGARE'], 'no unilateral payment place replacement')
    check('en el domicilio del suscriptor situado en Caracas 1101' not in texts['PAGARE'], 'no issuer address payment fallback')
    check(manifest['syntheticConformity']['confirmedPaymentAddressHash'] == manifest['paymentAddress']['hash'], 'explicit synthetic address conformity')
    previous = json.loads((ROOT / 'output/pdf/document-review-zero-penalties-v2/manifest.json').read_text())
    for kind in ['MANDATE', 'REMITO']:
        check(manifest['templates'][kind] == previous['templates'][kind]
              and manifest['pdfs'][kind]['sha256'] == previous['pdfs'][kind]['sha256'], kind + ' prior proposal unchanged')
else:
    check('en el domicilio de [PENDIENTE DE VALIDACIÓN]' in texts['PAGARE'], 'note payment place still pending')
baseline = json.loads((ROOT / 'output/pdf/document-review-v1/manifest.json').read_text())
check(manifest['templates']['REMITO']['sha256'] == baseline['templateVersions']['REMITO']['sha256']
      and manifest['pdfs']['REMITO']['sha256'] == baseline['pdfs']['REMITO']['sha256'], 'remito text and bytes unchanged')
print(json.dumps({'status': 'PASS', 'checks': count, 'productionWrites': 0}))
