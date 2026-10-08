"""Render relevant source pages without editing the supplied PDFs."""
from pathlib import Path
import pypdfium2 as pdfium
OUT=Path(__file__).resolve().parent/'pdf-pages'
OUT.mkdir(exist_ok=True)
sources=[(Path('F:/Downloads/XAG_P150_MAX_презентация.pdf'),'presentation',[9,17]),
         (Path(__file__).resolve().parent/'manuals/revocast-5-user-manual.pdf','manual',None),
         (Path(__file__).resolve().parent/'manuals/revocast-p5-specifications.pdf','spec',None)]
for path,prefix,pages in sources:
    if not path.exists(): continue
    doc=pdfium.PdfDocument(str(path))
    for n in pages or range(1,len(doc)+1):
        page=doc[n-1]
        page.render(scale=2.4).to_pil().save(OUT/f'{prefix}-{n:02}.png')
    print(prefix,len(doc),'pages')
