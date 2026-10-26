"""Verify the final PDF embeds the exact approved screen pixels and page ratios."""
from pathlib import Path
import json,sys
import numpy as np
from PIL import Image
import pypdfium2 as pdfium
from pypdf import PdfReader

root=Path(__file__).resolve().parents[1]
stem=sys.argv[1] if len(sys.argv)>1 else '261026_프라이어팰리스 리노베이션 공감리포트_26년 11월_Rev10'
stage=root/'tmp/pdfs/rev10'
auditfile=root/'releases/2026-11'/f'{stem}-layout-check.json'
audit=json.loads(auditfile.read_text(encoding='utf-8'))
captures=json.loads((stage/'captures.json').read_text(encoding='utf-8'))
source=root/'releases/2026-11'/f'{stem}.pdf'
reader=PdfReader(source)
doc=pdfium.PdfDocument(source)
if len(reader.pages)!=20 or len(doc)!=20:raise RuntimeError('PDF must contain 20 pages')
results=[]
for i,capture in enumerate(captures):
    reference=Image.open(stage/capture['file']).convert('RGB')
    images=list(reader.pages[i].images)
    if len(images)!=1:raise RuntimeError(f'Page {i+1} must contain one unaltered screen image')
    embedded=images[0].image.convert('RGB')
    sameSize=reference.size==embedded.size
    samePixels=sameSize and np.array_equal(np.asarray(reference),np.asarray(embedded))
    expectedWidth=reference.width/capture['deviceScaleFactor']*.75
    expectedHeight=reference.height/capture['deviceScaleFactor']*.75
    page=reader.pages[i]
    sizeDelta=max(abs(float(page.mediabox.width)-expectedWidth),abs(float(page.mediabox.height)-expectedHeight))
    raster=doc[i].render(scale=96/72).to_pil().convert('RGB')
    raster.save(stage/f'final-{i+1:02}.png')
    result={'page':i+1,'capturePixels':list(reference.size),'embeddedImagePixels':list(embedded.size),
        'embeddedPixelsIdentical':samePixels,'pageDimensionDeltaPt':round(sizeDelta,6),'captureDpi':288,
        'pdfRasterSaved':f'final-{i+1:02}.png'}
    if not samePixels or sizeDelta>.001:raise RuntimeError(f'Page {i+1} no longer matches the HTML screen capture')
    results.append(result)
    print(json.dumps(result),flush=True)
doc.close()
comparison=stage.parent/'rev08-vs-local.json'
if comparison.exists():audit['approvedRev08Comparison']=json.loads(comparison.read_text(encoding='utf-8'))
audit['renderedPdfComparison']=results
audit['verificationSummary']={'pages':20,'approvedRev08TextAndGeometryMatch':all(p['maxGeometryDelta']==0 and p['fontChanges']==0 and p['colorChanges']==0 and p['textSame'] for p in audit['approvedRev08Comparison']),
    'maxExportGeometryDeltaPx':max(p['maxGeometryDeltaPx'] for p in audit['pages']),
    'fontChangesDuringExport':sum(p['fontChanges'] for p in audit['pages']),
    'all20EmbeddedImagesPixelIdentical':all(p['embeddedPixelsIdentical'] for p in results),
    'screenPdfHasVariablePageHeights':True,'textSelectability':False,'captureDpi':288}
auditfile.write_text(json.dumps(audit,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(audit['verificationSummary']),flush=True)
