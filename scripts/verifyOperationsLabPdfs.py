"""Read-only verification of synthetic laboratory PDFs against their persisted source export."""
import hashlib
import json
import re
import sys
from pathlib import Path
from pypdf import PdfReader

folder = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("docs/operations-lab/evidence")
source = json.loads((folder / "persisted-economics.json").read_text())
checks = 0


def check(condition, label):
    global checks
    assert condition, label
    checks += 1


def ars(value):
    return f"{value:,.2f}".replace(",", "_").replace(".", ",").replace("_", ".")


terms = source["terms"]
rows = source["schedule"]
check(terms["capitalAmount"] == 580000, "capital")
check(terms["serviceAmount"] == 1160000, "services gross")
check(terms["contractTotal"] == 1740000, "total")
check(len(rows) == 12, "installment count")
check(sum(row["amount"] for row in rows) == terms["contractTotal"], "persisted schedule total")
results = []
origins = {}
revisions = {}
for name in ["MANDATE", "PAGARE", "REMITO", "RECIBO"]:
    path = folder / f"{name}.pdf"
    reader = PdfReader(path)
    texts = [page.extract_text() for page in reader.pages]
    text = "\n".join(texts)
    images = sum(
        sum(1 for value in page.get("/Resources", {}).get("/XObject", {}).values()
            if value.get_object().get("/Subtype") == "/Image")
        for page in reader.pages
    )
    for index, page_text in enumerate(texts):
        check("DOCUMENTO DE PRUEBA" in page_text, f"{name} page {index + 1} test mark")
        check("SIN VALIDEZ CONTRACTUAL O FISCAL" in page_text, f"{name} page {index + 1} disclaimer")
        check(len(page_text.strip()) > 100, f"{name} page {index + 1} native selectable text")
    check(images == 0 if name == "PAGARE" else images > 0, f"{name} logo policy")
    if name in ["MANDATE", "PAGARE"]:
        for expected in ["LOOP GESTIÓN INTEGRAL S.R.L.", "30-71962686-2", "Caracas 1101", "BORRADOR — NO VÁLIDO PARA FIRMA", ars(terms["contractTotal"])]:
            check(expected in text, f"{name} {expected}")
    if name in ["MANDATE", "PAGARE"]:
        origins[name] = set(re.findall(r"Origen ([a-f0-9]{20})", text))
        revisions[name] = set(re.findall(r"Revisión ([0-9]+)", text))
    if name == "MANDATE":
        for expected in [ars(terms["capitalAmount"]), ars(terms["serviceAmount"]), "Nuevo"]:
            check(expected in text, f"mandate {expected}")
        for row in rows:
            check(ars(row["amount"]) in text, f"installment {row['installmentNumber']} amount")
            check("/".join(reversed(row["dueDate"].split("-"))) in text, f"installment {row['installmentNumber']} date")
    if name == "RECIBO":
        check(ars(145000) in text, "receipt paid amount")
        check("Sin pago real, CAE ni comunicación con ARCA" in text, "receipt no fiscal effect")
    results.append({"file": path.name, "pages": len(reader.pages), "imagePlacements": images, "sha256": hashlib.sha256(path.read_bytes()).hexdigest()})
check(len(origins["MANDATE"]) == 1 and origins["MANDATE"] == origins["PAGARE"], "same operation source hash")
check(len(revisions["MANDATE"]) == 1 and revisions["MANDATE"] == revisions["PAGARE"], "same draft revision")
print(json.dumps({"result": "LAB_PDF_PASS", "checks": checks, "files": results}, ensure_ascii=False, indent=2))
