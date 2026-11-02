const fs=require('fs');const path=require('path');const {pathToFileURL}=require('url');
let chromium;try{({chromium}=require('playwright'));}catch{({chromium}=require('C:/Users/user/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));}
const repo=path.resolve(__dirname,'..');const out=process.env.A4_QA_DIR||path.join(repo,'tmp/a4-review');fs.mkdirSync(out,{recursive:true});
const source=process.env.A4_HTML||path.join(repo,'src/report-a4-review.html');
async function inspect(page){return page.evaluate(()=>{
 const round=n=>Math.round(n*100)/100;const problems=[];const samples=[];
 const pages=[...document.querySelectorAll('.ppt-slide')].map((slide,index)=>{
  const box=slide.getBoundingClientRect();const footer=slide.lastElementChild;const foot=footer.getBoundingClientRect();let textCount=0;
  const nodes=document.createTreeWalker(slide,NodeFilter.SHOW_TEXT);let node;
  while(node=nodes.nextNode()){
   const el=node.parentElement;if(!node.textContent.trim()||!el.checkVisibility({checkVisibilityCSS:true,checkOpacity:true}))continue;
   const range=document.createRange();range.selectNodeContents(node);let rects=[...range.getClientRects()].filter(r=>r.width>0&&r.height>0);textCount++;
   for(const r of rects){
    const keywordCard=el.closest('.keyword-rationale .rationale-card');if(keywordCard){const c=keywordCard.getBoundingClientRect();if(r.left<c.left-1||r.right>c.right+1||r.top<c.top-1||r.bottom>c.bottom+1)problems.push({page:index+1,kind:'keyword-card-overflow',text:node.textContent.trim().slice(0,70)});}
    if(r.left<box.left-2||r.right>box.right+2||r.top<box.top-2||r.bottom>box.bottom+2)problems.push({page:index+1,kind:'page-text-overflow',text:node.textContent.trim().slice(0,70),x:round(r.x-box.x),y:round(r.y-box.y),bottom:round(r.bottom-box.y),right:round(r.right-box.x)});
    let parent=el;while(parent&&parent!==slide){const style=getComputedStyle(parent);if(['hidden','clip','auto','scroll'].includes(style.overflowY)||['hidden','clip','auto','scroll'].includes(style.overflowX)){const clip=parent.getBoundingClientRect();if(r.left<clip.left-2.5||r.right>clip.right+2.5||r.top<clip.top-2.5||r.bottom>clip.bottom+2.5){problems.push({page:index+1,kind:'container-text-clip',parent:parent.className,text:node.textContent.trim().slice(0,65)});break;}}parent=parent.parentElement;}
    if(!footer.contains(el)&&r.bottom>foot.top+2&&r.top<foot.bottom-2)problems.push({page:index+1,kind:'footer-overlap',text:node.textContent.trim().slice(0,60)});
   }
  }
  [...slide.querySelectorAll('*')].forEach((el,i)=>{if(!el.checkVisibility({checkVisibilityCSS:true,checkOpacity:true}))return;const r=el.getBoundingClientRect();const style=getComputedStyle(el);samples.push({key:`${index+1}:${i}`,x:round(r.x-box.x),y:round(r.y-box.y),w:round(r.width),h:round(r.height),font:style.fontSize,line:style.lineHeight,weight:style.fontWeight});});
  return {page:index+1,title:slide.querySelector('h3,h2')?.textContent.trim(),width:round(box.width),height:round(box.height),scrollHeight:slide.scrollHeight,clientHeight:slide.clientHeight,footerBottom:round(foot.bottom-box.top),textCount};
 });
 return {pages,problems,samples,fontsReady:document.fonts.status,images:[...document.images].filter(i=>!i.complete||!i.naturalWidth).map(i=>i.src)};
});}
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
 const page=await browser.newPage({viewport:{width:1280,height:1000},deviceScaleFactor:1,reducedMotion:'reduce'});const requests=[];const errors=[];
 await page.route(/^https?:/,r=>{requests.push(r.request().url());return r.abort();});page.on('pageerror',error=>errors.push(error.message));
 await page.goto(pathToFileURL(source).href,{waitUntil:'load'});await page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].map(i=>i.decode().catch(()=>{})));});
 await page.waitForFunction(()=>document.querySelector('#report-survey-grid-4')?.children.length>0);
 const screen=await inspect(page);
 if(process.argv.includes('--screens'))for(let i=0;i<screen.pages.length;i++)await page.locator('.ppt-slide').nth(i).screenshot({path:path.join(out,`screen-${String(i+1).padStart(2,'0')}.png`),animations:'disabled'});
 await page.emulateMedia({media:'print'});const print=await inspect(page);
 const printMap=new Map(print.samples.map(e=>[e.key,e]));const deltas=[];
 for(const s of screen.samples){const p=printMap.get(s.key);if(!p){deltas.push({key:s.key,missing:true});continue;}const values=['x','y','w','h'].filter(k=>Math.abs(s[k]-p[k])>.6);const fonts=['font','line','weight'].filter(k=>s[k]!==p[k]);if(values.length||fonts.length)deltas.push({key:s.key,geometry:values,font:fonts,screen:s,print:p});}
 if(process.argv.includes('--pdf'))await page.pdf({path:path.join(out,'print-check.pdf'),preferCSSPageSize:true,printBackground:true,displayHeaderFooter:false,scale:1});
 await page.emulateMedia({media:'screen'});await page.setViewportSize({width:390,height:844});await page.evaluate(()=>syncA4Scale());await page.evaluate(()=>document.fonts.ready);
 const mobile=await page.evaluate(()=>({width:innerWidth,documentWidth:document.documentElement.scrollWidth,bodyWidth:document.body.scrollWidth,costLabels:[...document.querySelectorAll('.slide-cost td[data-label]')].map(c=>({expected:c.dataset.label,content:getComputedStyle(c,'::before').content,display:getComputedStyle(c,'::before').display})),pages:[...document.querySelectorAll('.ppt-slide')].map((s,i)=>({page:i+1,width:s.getBoundingClientRect().width,scrollWidth:s.scrollWidth,clientWidth:s.clientWidth}))}));
 if(process.argv.includes('--screens'))for(const index of [...new Set([0,2,3,4,5,6,9,14,16,screen.pages.length-1])])await page.locator('.ppt-slide').nth(index).screenshot({path:path.join(out,`mobile-${String(index+1).padStart(2,'0')}.png`),animations:'disabled'});
 const summary={source,pages:screen.pages.length,screenProblems:screen.problems,printProblems:print.problems,screenPrintDeltas:deltas,mobile,requests,errors,images:screen.images,fontsReady:screen.fontsReady};
 fs.writeFileSync(path.join(out,'check.json'),JSON.stringify({summary,screen,print},null,2));
 console.log(JSON.stringify({pages:summary.pages,screenProblems:summary.screenProblems,printProblems:summary.printProblems,screenPrintDeltas:deltas.slice(0,12),deltaCount:deltas.length,mobile:{width:mobile.width,documentWidth:mobile.documentWidth,bodyWidth:mobile.bodyWidth,costLabelCount:mobile.costLabels.length,costLabelsVisible:mobile.costLabels.every(c=>c.content.includes(c.expected)&&c.display!=='none'),pageOverflowCount:mobile.pages.filter(p=>p.scrollWidth>p.clientWidth).length},externalRequests:requests.length,errors,brokenImages:screen.images.length,details:path.join(out,'check.json')},null,2));
 await browser.close();
 if(screen.problems.length||print.problems.length||deltas.length||errors.length||requests.length||screen.images.length||mobile.documentWidth>mobile.width||mobile.pages.some(p=>p.scrollWidth>p.clientWidth)||mobile.costLabels.length!==12||mobile.costLabels.some(c=>!c.content.includes(c.expected)||c.display==='none'))process.exitCode=1;
})().catch(e=>{console.error(e);process.exit(1)});
