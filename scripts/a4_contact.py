"""Make diagnostic screen/print contact sheets; these are not release artifacts."""
import math
import sys
from pathlib import Path
from PIL import Image, ImageOps, ImageDraw

folder=Path(sys.argv[1])
for prefix,target in [('screen','contact.png'),('print','contact-print.png')]:
    files=sorted(folder.glob(f'{prefix}-[0-9][0-9].png'))
    if not files:
        continue
    canvas=Image.new('RGB',(1440,math.ceil(len(files)/4)*280),'#e2e8f0')
    draw=ImageDraw.Draw(canvas)
    for i,file in enumerate(files):
        thumb=ImageOps.contain(Image.open(file).convert('RGB'),(350,250))
        x=(i%4)*360+5
        y=(i//4)*280+5
        canvas.paste(thumb,(x,y))
        draw.text((x,y+253),f'{prefix.upper()} PAGE {i+1:02}',fill='#0f172a')
    canvas.save(folder/target)
