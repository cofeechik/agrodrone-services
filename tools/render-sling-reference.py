from pathlib import Path
import pypdfium2 as pdf
p=Path(__file__).resolve().parents[1]/'design-references/revosling'
doc=pdf.PdfDocument(str(p/'manual.pdf'))
for i in [5,6,7,8,9]:
    doc[i].render(scale=1.7).to_pil().save(p/f'manual-{i+1}.png')
print('Rendered',len(doc),'pages')
