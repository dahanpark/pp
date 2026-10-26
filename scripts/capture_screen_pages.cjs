/* Lossless 288 dpi captures of the approved 1060px desktop page canvas. */
const fs=require('fs');const path=require('path');const {pathToFileURL}=require('url');
let chromium;try{({chromium}=require('playwright'));}catch{({chromium}=require('C:/Users/user/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));}
const root=path.resolve(__dirname,'..');const stage=path.join(root,'tmp/pdfs/rev10');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe'});
 const page=await browser.newPage({viewport:{width:1200,height:1000},deviceScaleFactor:3});
 await page.route(/^https?:/,r=>r.abort());await page.emulateMedia({media:'screen'});
 await page.goto(pathToFileURL(path.join(root,'src/report.html')).href,{waitUntil:'load'});
 await page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].map(i=>i.decode()));});
 const sizes=await page.locator('.ppt-slide').evaluateAll(slides=>slides.map(s=>({width:s.getBoundingClientRect().width,height:s.getBoundingClientRect().height})));
 await page.addStyleTag({content:'html,body{width:1060px!important;margin:0!important;padding:0!important}.no-print{display:none!important}.ppt-slide{margin:0!important}.ppt-slide:not(.capture-target){display:none!important}'});
 const captures=[];
 for(let i=0;i<20;i++){
  await page.evaluate(index=>{document.querySelector('.capture-target')?.classList.remove('capture-target');document.querySelectorAll('.ppt-slide')[index].classList.add('capture-target');window.scrollTo(0,0);},i);
  const slide=page.locator('.ppt-slide').nth(i);const box=await slide.boundingBox();
  if(Math.abs(box.width-sizes[i].width)>.1||Math.abs(box.height-sizes[i].height)>.1)throw Error('Capture size changed on page '+(i+1));
  const filename=`screen-${String(i+1).padStart(2,'0')}.png`;
  await slide.screenshot({path:path.join(stage,filename),animations:'disabled'});
  captures.push({page:i+1,file:filename,widthCssPx:box.width,heightCssPx:box.height,deviceScaleFactor:3});
 }
 fs.writeFileSync(path.join(stage,'captures.json'),JSON.stringify(captures,null,2));
 console.log(JSON.stringify({pages:captures.length,dpi:288,media:'screen',externalDependencies:0}));await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
