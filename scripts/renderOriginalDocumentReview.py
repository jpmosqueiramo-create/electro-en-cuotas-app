"""Offline layout of unapproved original-text proposals. Never emits final instruments.
Requires reportlab and pypdf. Input is created by prepareOriginalDocumentReview.ts.
All monetary values and due dates are read verbatim from the synthetic input.
"""
import argparse
import hashlib
import json
import re
from pathlib import Path
from xml.sax.saxutils import escape
import reportlab
from reportlab.pdfgen import canvas
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.utils import ImageReader
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether
from pypdf import PdfReader
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
PAPER = (595.2756, 841.8898)
GOLD = colors.HexColor('#EAB308')
INK = colors.HexColor('#18212D')
GRAY = colors.HexColor('#536071')
LIGHT = colors.HexColor('#F5F6F8')
WIDTH = PAPER[0] - 88
STYLES = {
    'body': ParagraphStyle('body', fontName='Helvetica', fontSize=10, leading=14.2, textColor=INK, spaceAfter=8),
    'title': ParagraphStyle('title', fontName='Helvetica-Bold', fontSize=16, leading=20, textColor=INK, spaceAfter=13),
    'heading': ParagraphStyle('heading', fontName='Helvetica-Bold', fontSize=10.8, leading=14, textColor=INK, spaceBefore=8, spaceAfter=7, keepWithNext=True),
    'small': ParagraphStyle('small', fontName='Helvetica', fontSize=8.5, leading=11.4, textColor=GRAY, spaceAfter=7),
    'cell': ParagraphStyle('cell', fontName='Helvetica', fontSize=9, leading=12, textColor=INK),
    'headcell': ParagraphStyle('headcell', fontName='Helvetica-Bold', fontSize=9, leading=12, textColor=INK),
    'sign': ParagraphStyle('sign', fontName='Helvetica', fontSize=8.5, leading=12, alignment=TA_CENTER, textColor=INK),
}
def para(text, style='body'):
    return Paragraph(escape(text).replace('\n', '<br/>'), STYLES[style])
def table(rows, widths, header=True):
    cells = [[para(str(v), 'headcell' if header and n == 0 else 'cell') for v in row] for n, row in enumerate(rows)]
    t = Table(cells, colWidths=widths, repeatRows=1 if header else 0, hAlign='LEFT')
    commands = [('VALIGN', (0,0),(-1,-1),'TOP'), ('LEFTPADDING',(0,0),(-1,-1),8),('RIGHTPADDING',(0,0),(-1,-1),8),('TOPPADDING',(0,0),(-1,-1),6),('BOTTOMPADDING',(0,0),(-1,-1),6),('LINEBELOW',(0,0),(-1,-1),0.35,colors.HexColor('#D7DCE2'))]
    if header: commands += [('BACKGROUND',(0,0),(-1,0),LIGHT),('LINEBELOW',(0,0),(-1,0),1,GOLD)]
    t.setStyle(TableStyle(commands))
    return t

def signatures(labels):
    # Empty spaces; the fixture contains no signatures or completed delivery.
    t = Table([[para('______________________________\n' + x, 'sign') for x in labels]], colWidths=[WIDTH/len(labels)]*len(labels))
    t.setStyle(TableStyle([('VALIGN',(0,0),(-1,-1),'TOP'), ('TOPPADDING',(0,0),(-1,-1),40),('BOTTOMPADDING',(0,0),(-1,-1),12)]))
    return t

class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, data, kind, **kwargs):
        kwargs['invariant'] = 1
        super().__init__(*args, **kwargs)
        self.data, self.kind, self.saved = data, kind, []
    def showPage(self):
        self.saved.append(dict(self.__dict__))
        self._startPage()
    def save(self):
        for state in self.saved:
            self.__dict__.update(state)
            self.decoration(len(self.saved))
            super().showPage()
        super().save()
    def decoration(self, total):
        self.saveState()
        self.setFillColor(INK)
        self.setFont('Helvetica-Bold',8)
        self.drawString(44,806,'BORRADOR — NO VÁLIDO PARA FIRMA')
        self.setFont('Helvetica',7.4)
        self.setFillColor(GRAY)
        self.drawString(44,793,'PROPUESTA DOCUMENTAL / DATOS FICTICIOS / SIN EMISIÓN REAL')
        if self.kind != 'PAGARE':
            with Image.open(ROOT/'public/logo-cuenta-hogar-oficial.png') as im:
                # Same crop geometry as existing pdfBranding; original file unchanged.
                cropped = im.crop((450,450,1550,1550)).copy()
            self.drawImage(ImageReader(cropped),509,785,40,40,mask='auto')
        self.setStrokeColor(GOLD if self.kind != 'PAGARE' else colors.HexColor('#A3AAB2'))
        self.line(44,778,551,778)
        self.line(44,53,551,53)
        self.setFillColor(GRAY)
        self.setFont('Helvetica',7)
        self.drawString(44,40,self.data['documents'][self.kind]['version'] + ' | Ejemplo rev. 1 | SIN NÚMERO CH')
        self.drawRightString(551,40,f'{self._pageNumber} / {total}')
        self.drawString(44,28,'Referencia del paquete: ' + self.data['digests']['candidate'][:24] + ' | Aprobación exacta pendiente')
        self.restoreState()

def body_mandate(data):
    f, display = data['fixture'], data['display']
    story = [para(data['documents']['MANDATE']['title'],'title')]
    for b in data['documents']['MANDATE']['blocks']:
        kind, bid = b['type'], b['id']
        if bid == 'clause-2-heading' or bid == 'clause-4-heading': story.append(PageBreak())
        if kind in ('paragraph','heading'): story.append(para(b['text'], 'heading' if kind=='heading' else 'body'))
        elif kind == 'productTable':
            story += [table([['Cantidad','Descripción del Bien (Marca, Modelo, Color)','Estado (Nuevo/Usado)'],[f['product']['quantity'],f['product']['name'],f['product']['condition']]], [55,WIDTH-150,95]),Spacer(1,10)]
        elif kind == 'originalEconomy':
            story += [table([['Concepto del original','Valor'],['Valor Neto del Bien + Gastos de Gestión y Logística','PENDIENTE: correspondencia con el modelo vigente'],['Costo Financiero Total (CFT)','PENDIENTE DE VALIDACIÓN'],['VALOR TOTAL A FINANCIAR',display['total']]], [WIDTH-150,150]),Spacer(1,9),
                para('Nota de revisión (no es una cláusula): el ejemplo conserva capital ' + display['capital'] + ', servicios brutos con IVA incluido ' + display['services'] + ' y total ' + display['total'] + '. No se equiparan los servicios al CFT ni se inventa una distribución de gestión/logística. Véase el control de importes al final.','small')]
        elif kind == 'originalSchedule':
            story += [table([['Anticipo / Cuota N°','Monto ($)','Fecha de Vencimiento'],['Anticipo (si lo hubiere)','No previsto en el ejemplo','No aplica'],['Cuota 1',display['schedule'][0]['amountDisplay'],display['schedule'][0]['dueDate']],['Cuota 2 a 12',display['schedule'][1]['amountDisplay'],'Del 1 al 10 de cada mes.']], [155,125,WIDTH-280]),Spacer(1,10)]
        elif kind == 'mandateSignatures':
            story += [signatures(['Firma y Aclaración MANDANTE','Firma por '+data['issuer']['legalName']]),
                para('Control de revisión: representante y cargo confirmados por el titular; documentación societaria de designación y facultades pendiente. La jurisdicción del mandato reproduce la decisión del titular, pendiente de validación de esta versión exacta.','small')]
    story += [PageBreak(),para('Control de importes y vencimientos','title'),para('Anexo de revisión técnica. No incorpora cláusulas ni acredita aceptación, firma, entrega o deuda. Los valores se transcriben del único ejemplo sintético; no se recalculan en el PDF.','small'),
        table([['Dato del expediente de ejemplo','Valor guardado'],['Capital aplicado',display['capital']],['Servicios brutos con IVA incluido',display['services']],['Total contractual / total del pagaré',display['total']],['Cantidad de cuotas',12]], [WIDTH-155,155]),Spacer(1,14),
        table([['Cuota','Fecha de vencimiento','Importe guardado']]+[[i['number'],i['dueDate'],i['amountDisplay']] for i in display['schedule']],[65,WIDTH-220,155]),Spacer(1,12),
        para('No se agrega IVA al total ni a las cuotas. No hay anticipo, punitorio aplicado ni desglose de servicios inventado. Los lugares y fechas consignados son únicamente variables de un caso ficticio; deberán provenir del expediente validado en una futura emisión autorizada.','small')]
    return story

def body_note(data):
    f = data['fixture']; c=f['client']
    story=[para(data['documents']['PAGARE']['title'],'title')]
    for b in data['documents']['PAGARE']['blocks']:
        if b['type']=='debtorAndSignature':
            story += [para('DATOS DEL DEUDOR:','heading'),table([['Nombre y Apellido',c['fullName']],['D.N.I. / CUIT',c['dni']+' / '+c['cuil']],['Domicilio',c['address']],['Localidad',c['locality']+', '+c['province']],['Teléfono',c['phone']]], [115,WIDTH-115],False),signatures(['FIRMA DEL DEUDOR'])]
        else: story.append(para(b['text']))
    story += [Spacer(1,8),para('Control de revisión (no integra la promesa): domicilio legal de la beneficiaria: '+data['issuer']['legalAddress']+'. Este dato no define el lugar de pago ni la competencia judicial del pagaré. Ambos quedan pendientes, junto con el punitorio y la validación del texto exacto.','small')]
    return story

def body_delivery(data):
    f=data['fixture']; c=f['client']; p=f['product']
    story=[para(data['documents']['REMITO']['title'],'title'),para(data['issuer']['legalName']+' | CUIT '+data['issuer']['taxId'],'heading'),para('Cuenta Hogar, nombre comercial. '+data['issuer']['legalAddress'],'small'),
      table([['Remito N°','Fecha de emisión'],['SIN ASIGNAR - EJEMPLO DE REVISIÓN',f['issue']['delivery']['date']]], [WIDTH/2]*2),Spacer(1,12),
      table([['Origen de Stock (Despacho)','Destino (Localidad del Cliente)'],[f['logistics']['origin'],f['logistics']['destination']]], [WIDTH/2]*2),Spacer(1,12),para('Datos del Destinatario','heading'),
      table([['Destinatario (Nombre / Vendedor / Afiliado)',c['fullName']],['DNI / CUIT',c['dni']+' / '+c['cuil']],['Teléfono / WhatsApp',c['phone']],['Dirección de Entrega',f['logistics']['address']]], [205,WIDTH-205],False),Spacer(1,12),para('Detalle del Producto a Entregar','heading'),
      table([['Producto / Modelo','IMEI / N° Serie'],[p['name'],p['serial']]], [WIDTH-155,155]),Spacer(1,12)]
    story += [para(b['text']) for b in data['documents']['REMITO']['blocks']]
    story += [signatures(['Firma Despachante\n'+data['issuer']['legalName']+'\nAclaración: ____________________\nDNI/Legajo: ____________________','Firma de Conformidad Cliente\nAclaración: ____________________\nDNI: ____________________']),
        para('Control de revisión (no acredita entrega): no hay firmas ni movimientos físicos en este ejemplo. La entrega real conserva los controles vigentes de tres firmas, custodia de originales e incidencias; este archivo no activa ninguna transición. No se atribuyen al despachante facultades societarias por defecto.','small')]
    return story

NAMES={'MANDATE':'mandato-propuesto-revision.pdf','PAGARE':'pagare-propuesto-revision.pdf','REMITO':'remito-propuesto-revision.pdf'}
def main():
    parser=argparse.ArgumentParser(); parser.add_argument('input'); parser.add_argument('--output',default=str(ROOT/'output/pdf/document-review-v1')); args=parser.parse_args()
    data=json.loads(Path(args.input).read_text()); assert data['reviewOnly'] is True and data['fixture']['synthetic'] is True
    assert data['fixture']['contractNumber'] is None and data['fixture']['signatures']==[]
    out=Path(args.output); out.mkdir(parents=True,exist_ok=True)
    manifest={'status':'PROPOSED_NOT_APPROVED','installable':False,'reportlabVersion':reportlab.Version,'digests':data['digests'],'pdfs':{}}
    for kind, builder in [('MANDATE',body_mandate),('PAGARE',body_note),('REMITO',body_delivery)]:
        target=out/NAMES[kind]
        doc=SimpleDocTemplate(str(target),pagesize=PAPER,leftMargin=44,rightMargin=44,topMargin=78,bottomMargin=70,title=data['documents'][kind]['title']+' - propuesta no aprobada',author='Cuenta Hogar',subject='Datos sintéticos. BORRADOR — NO VÁLIDO PARA FIRMA',pageCompression=1)
        doc.build(builder(data),canvasmaker=lambda *a, _kind=kind, **kw:NumberedCanvas(*a,data=data,kind=_kind,**kw))
        reader=PdfReader(target); pages=len(reader.pages)
        manifest['pdfs'][kind]={'path':NAMES[kind],'sha256':hashlib.sha256(target.read_bytes()).hexdigest(),'pages':pages}
    (out/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps(manifest['pdfs'],ensure_ascii=False,indent=2))
if __name__=='__main__':main()
