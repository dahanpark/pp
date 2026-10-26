"""Build lossless screen-preserving PDFs and a separate A4 fit copy without reflow."""
from pathlib import Path
import json,sys
from pypdf import PdfReader
from reportlab.lib.pagesizes import A4,landscape
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader
from PIL import Image

root=Path(__file__).resolve().parents[1]
stem=sys.argv[1] if len(sys.argv)>1 else '261026_프라이어팰리스 리노베이션 공감리포트_26년 11월_Rev10'
stage=root/'tmp/pdfs/rev10'
output=root/'releases/2026-11'/f'{stem}.pdf'
captures=json.loads((stage/'captures.json').read_text(encoding='utf-8'))
if len(captures)!=20:raise RuntimeError('Expected 20 approved screen captures')
exact=canvas.Canvas(str(output),pageCompression=1)
exact.setTitle('프라이어팰리스 2026년 11월 공감리포트 - Rev08 HTML 화면 보존본')
exact.setSubject('Rev08 화면을 288dpi 무손실 이미지로 보존; 재배치 및 글씨 크기 조정 없음')
a4out=output.with_name(f'{stem}_A4가로_화면비유지.pdf')
fit=canvas.Canvas(str(a4out),pagesize=landscape(A4),pageCompression=1)
fit.setTitle('프라이어팰리스 2026년 11월 공감리포트 - A4 가로 화면비 유지')
width,height=landscape(A4)
scales=[]
for capture in captures:
    image=stage/capture['file']
    with Image.open(image) as raster: pixelwidth,pixelheight=raster.size
    pagewidth=pixelwidth/capture['deviceScaleFactor']*.75
    pageheight=pixelheight/capture['deviceScaleFactor']*.75
    exact.setPageSize((pagewidth,pageheight))
    exact.drawImage(ImageReader(str(image)),0,0,pagewidth,pageheight)
    exact.showPage()
    scale=min(width/pagewidth,height/pageheight)
    fit.drawImage(ImageReader(str(image)),(width-pagewidth*scale)/2,(height-pageheight*scale)/2,pagewidth*scale,pageheight*scale)
    fit.showPage()
    scales.append(scale)
exact.save();fit.save()

reader=PdfReader(output)
auditfile=output.with_name(f'{stem}-layout-check.json')
audit=json.loads(auditfile.read_text(encoding='utf-8'))
comparison=stage.parent/'rev08-vs-local.json'
if comparison.exists():
    audit['approvedRev08Comparison']=json.loads(comparison.read_text(encoding='utf-8'))
audit['pdf']={'pages':len(reader.pages),'method':'Lossless screen capture, 288 dpi, original CSS pixel size','originalTextSizesRetained':True,'textSelectability':False,'a4UniformScales':scales,'a4Reflow':False}
auditfile.write_text(json.dumps(audit,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({'screenPDF':str(output),'a4PDF':str(a4out),'pages':len(reader.pages),'a4ScaleRange':[min(scales),max(scales)]},ensure_ascii=False))
