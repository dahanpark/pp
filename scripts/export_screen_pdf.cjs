/* Prepare screen-only export geometry; VECTOR_REFERENCE=1 also writes vector diagnostics. */
const fs = require('fs');
const path = require('path');
const {pathToFileURL} = require('url');
let chromium;
try { ({chromium} = require('playwright')); }
catch { ({chromium} = require('C:/Users/user/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')); }
const root = path.resolve(__dirname, '..');
const stem = process.argv[2] || '261026_프라이어팰리스 리노베이션 공감리포트_26년 11월_Rev10';
const stage = path.join(root, 'tmp/pdfs/rev10');
fs.mkdirSync(stage, {recursive:true});

function metrics() {
  return [...document.querySelectorAll('.ppt-slide')].map((slide,index)=>{
    const box = slide.getBoundingClientRect();
    return {n:index+1,width:box.width,height:box.height,text:slide.innerText,
      elements:[...slide.querySelectorAll('*')].map(el=>{
        const rect=el.getBoundingClientRect(), css=getComputedStyle(el);
        return {tag:el.tagName,x:rect.x-box.x,y:rect.y-box.y,w:rect.width,h:rect.height,font:css.fontSize,line:css.lineHeight};
      })};
  });
}

(async()=>{
  const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe'});
  const page=await browser.newPage({viewport:{width:1200,height:1000},deviceScaleFactor:2});
  const external=[];
  await page.route(/^https?:/,route=>{external.push(route.request().url());return route.abort();});
  await page.emulateMedia({media:'screen'});
  await page.goto(pathToFileURL(path.join(root,'src/report.html')).href,{waitUntil:'load'});
  await page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].map(i=>i.decode()));});
  if(external.length) throw new Error('External dependencies remain: '+external.join(', '));
  const approved=await page.evaluate(metrics);
  if(approved.length!==20) throw new Error('Expected 20 report pages');
  const originalHeights=approved.map(p=>p.height);
  for(let i=0;i<20;i++) await page.locator('.ppt-slide').nth(i).screenshot({path:path.join(stage,`screen-${String(i+1).padStart(2,'0')}.png`),animations:'disabled'});

  // Each CSS page has its original width and height, not an A4-sized replacement.
  const geometry=approved.map(p=>`@page report${p.n} { size:${p.width}px ${Math.ceil(p.height)+2}px; margin:0; }\n@media print { #report-page-${p.n} { page:report${p.n}; height:${p.height}px !important; min-height:${p.height}px !important; } }`).join('\n');
  const sourceFile=path.join(root,'src/report.html');
  let html=fs.readFileSync(sourceFile,'utf8');
  html=html.replace(/\/\* PAGE_GEOMETRY_START \*\/[\s\S]*?\/\* PAGE_GEOMETRY_END \*\//,`/* PAGE_GEOMETRY_START */\n${geometry}\n/* PAGE_GEOMETRY_END */`);
  fs.writeFileSync(sourceFile,html);

  await page.addStyleTag({content:`html,body{width:1060px!important;margin:0!important;padding:0!important} .no-print{display:none!important} .ppt-slide{margin:0!important;box-shadow:none!important;break-before:auto!important;break-after:auto!important;page-break-after:auto!important} .ppt-slide:not(.pdf-export-target){display:none!important}`});
  const audit=[];
  for(let i=0;i<20;i++){
    await page.evaluate(index=>{
      document.querySelector('.pdf-export-target')?.classList.remove('pdf-export-target');
      document.querySelectorAll('.ppt-slide')[index].classList.add('pdf-export-target');
      window.scrollTo(0,0);
    },i);
    const current=(await page.evaluate(metrics))[i];
    const before=approved[i];
    let maxGeometryDelta=0, fontChanges=0;
    current.elements.forEach((el,j)=>{
      const original=before.elements[j];
      for(const key of ['x','y','w','h']) maxGeometryDelta=Math.max(maxGeometryDelta,Math.abs(el[key]-original[key]));
      if(el.font!==original.font||el.line!==original.line) fontChanges++;
    });
    if(maxGeometryDelta>.1||fontChanges||Math.abs(current.height-originalHeights[i])>.1) throw new Error(`Page ${i+1} changed during screen export: ${maxGeometryDelta}px / ${fontChanges} fonts`);
    if(process.env.VECTOR_REFERENCE==='1') await page.pdf({path:path.join(stage,`page-${String(i+1).padStart(2,'0')}.pdf`),width:`${before.width}px`,height:`${Math.ceil(before.height)+2}px`,margin:{top:0,right:0,bottom:0,left:0},scale:1,printBackground:true,preferCSSPageSize:false,displayHeaderFooter:false});
    audit.push({page:i+1,widthCssPx:before.width,heightCssPx:before.height,elements:before.elements.length,maxGeometryDeltaPx:maxGeometryDelta,fontChanges});
  }
  fs.writeFileSync(path.join(stage,'screen-metrics.json'),JSON.stringify(approved,null,2));
  const report={basis:'User-approved Rev08 desktop HTML at 1060 CSS px width',media:'screen',externalRequests:external,pages:audit,fonts:await page.evaluate(()=>[...new Set([...document.fonts].filter(f=>f.status==='loaded').map(f=>f.family))])};
  fs.writeFileSync(path.join(root,'releases/2026-11',`${stem}-layout-check.json`),JSON.stringify(report,null,2));
  console.log(JSON.stringify({pages:audit.length,maxGeometryDeltaPx:Math.max(...audit.map(p=>p.maxGeometryDeltaPx)),fontChanges:audit.reduce((s,p)=>s+p.fontChanges,0),externalRequests:external.length,heights:approved.map(p=>p.height)}));
  await browser.close();
})().catch(error=>{console.error(error);process.exit(1)});
