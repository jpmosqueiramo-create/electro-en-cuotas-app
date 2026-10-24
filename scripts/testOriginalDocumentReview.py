"""Checks only offline review artifacts. No Firebase or production credentials."""
import argparse
import hashlib
import json
import re
import subprocess
import sys
import tempfile
from pathlib import Path
import pdfplumber
from pypdf import PdfReader

ROOT=Path(__file__).resolve().parents[1]
COUNT=0
def check(condition, label):
    global COUNT
    assert condition, label
    COUNT+=1
    print('PASS '+label)
def normal(s):return re.sub(r'\s+',' ',s).strip()
def digest(path):return hashlib.sha256(Path(path).read_bytes()).hexdigest()
def images(page):
    resources=page['/Resources'].get_object(); objects=resources.get('/XObject',{})
    return sum(o.get_object().get('/Subtype')=='/Image' for o in objects.values())
def main():
    parser=argparse.ArgumentParser();parser.add_argument('input');parser.add_argument('pdf_dir');args=parser.parse_args()
    data=json.loads(Path(args.input).read_text());folder=Path(args.pdf_dir)
    manifest=json.loads((folder/'manifest.json').read_text())
    check(manifest['status']=='PROPOSED_NOT_APPROVED' and manifest['installable'] is False,'candidate not approved or installable')
    check(json.loads((ROOT/'src/lib/productionV2/finalPackages.json').read_text())==[],'installed final catalog remains empty')
    texts={}
    for kind, info in manifest['pdfs'].items():
        p=folder/info['path'];reader=PdfReader(p)
        check(digest(p)==info['sha256'],kind+' exact artifact hash')
        check(len(reader.pages)==info['pages'],kind+' page count')
        text=normal(' '.join(page.extract_text() for page in reader.pages));texts[kind]=text
        check(all(normal(data['warning']) in normal(page.extract_text()) for page in reader.pages),kind+' warning on every page')
        check(data['fixture']['client']['fullName'] in text and data['issuer']['legalName'] in text and data['issuer']['taxId'] in text,kind+' selectable names and company data')
        check(not re.search(r'\bCH-\d',text) and 'SIN NÚMERO CH' in text and '30-71829384-9' not in text,kind+' no CH number or obsolete tax ID')
        check(all(images(page)==0 for page in reader.pages) if kind=='PAGARE' else all(images(page)>0 for page in reader.pages),kind+' correct logo presence')
        for b in data['documents'][kind]['blocks']:
            if b['type'] in ('paragraph','heading'):
                check(normal(b['text']) in text,kind+' full native text '+b['id'])
        with pdfplumber.open(p) as doc:
            check(all(39<=w['x0']<w['x1']<=556 and 10<=w['top']<w['bottom']<=824 for page in doc.pages for w in page.extract_words()),kind+' text within page bounds')
    check(data['display']['total'] in texts['MANDATE'] and data['display']['total'] in texts['PAGARE'],'mandate and note same saved total')
    check(data['display']['capital'] in texts['MANDATE'] and data['display']['services'] in texts['MANDATE'],'capital and gross services unchanged')
    for i in data['display']['schedule']:
        check(normal(f"{i['number']} {i['dueDate']} {i['amountDisplay']}") in texts['MANDATE'],'exact saved installment '+str(i['number']))
    check('tribunales competentes correspondientes al domicilio del cliente' in texts['MANDATE'] and 'COMPETENCIA DEL PAGARÉ PENDIENTE DE VALIDACIÓN' in texts['PAGARE'],'separate mandate and note jurisdiction')
    check('capitalizará mensualmente' in texts['PAGARE'] and '[PENDIENTE DE VALIDACIÓN]%' in texts['PAGARE'],'original capitalization preserved; no invented penalty')
    check('PENDIENTE: correspondencia con el modelo vigente' in texts['MANDATE'],'original cost allocation not fabricated')
    with tempfile.TemporaryDirectory(prefix='ch-review-repro-') as second:
        subprocess.run([sys.executable,str(ROOT/'scripts/renderOriginalDocumentReview.py'),args.input,'--output',second],check=True,stdout=subprocess.DEVNULL)
        check(all(digest(Path(second)/i['path'])==i['sha256'] for i in manifest['pdfs'].values()),'all three PDFs byte-reproducible in independent second directory')
        check((Path(second)/'manifest.json').read_bytes()==(folder/'manifest.json').read_bytes(),'manifest byte-reproducible')
    print(json.dumps({'status':'PASS','checks':COUNT,'productionWrites':0,'scope':'offline artifacts only'}))
if __name__=='__main__':main()
