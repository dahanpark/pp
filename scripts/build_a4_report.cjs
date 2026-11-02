/* Build A4 HTML; keep the unconfirmed rationale only in the local review copy. */
const fs=require('fs');const path=require('path');const {pathToFileURL,fileURLToPath}=require('url');
let chromium;try{({chromium}=require('playwright'));}catch{({chromium}=require('C:/Users/user/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));}
const repo=path.resolve(__dirname,'..');
const project=path.resolve(repo,'../..');
const workspace=path.join(project,'_workspace/20261102_01');
const approved=process.argv.includes('--approved')||process.argv.includes('--publish');
const omitRationale=process.argv.includes('--omit-rationale');
const revision=process.env.REPORT_REVISION||'Rev11';
const issueDate=process.env.REPORT_DATE||'2026-11-03';
const displayDate=issueDate.replaceAll('-','.');
const dateStamp=issueDate.replaceAll('-','').slice(2);
const outputDir=path.join(project,'output/2026-11');
const stem=`${dateStamp}_프라이어팰리스 리노베이션 공감리포트_26년 11월_${revision}`;
const timelineArgument=process.argv.find(a=>a.startsWith('--timeline='));
const timelineFile=timelineArgument?path.resolve(timelineArgument.slice(11)):fs.existsSync(path.join(repo,'data/renovation-progress.json'))?path.join(repo,'data/renovation-progress.json'):path.join(workspace,'output/timeline-copy.json');
const timeline=JSON.parse(fs.readFileSync(timelineFile,'utf8'));
const rationaleArgument=process.argv.find(a=>a.startsWith('--rationale='));
const lawFile=rationaleArgument?path.resolve(rationaleArgument.slice(12)):fs.existsSync(path.join(repo,'data/report-rationale.json'))?path.join(repo,'data/report-rationale.json'):path.join(workspace,'output/rationale-copy.json');
const rationale=fs.existsSync(lawFile)?JSON.parse(fs.readFileSync(lawFile,'utf8')):null;
if(approved&&!omitRationale&&!rationale)throw Error('Approved rationale copy is required before publication');
if(approved&&!omitRationale&&!process.argv.includes('--approved'))throw Error('User wording approval is required to publish the rationale page; use --omit-rationale while awaiting the reply');
const mime={'.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.svg':'image/svg+xml','.woff2':'font/woff2','.woff':'font/woff','.ttf':'font/ttf','.otf':'font/otf'};
function dataURI(relative,base){
 if(/^(?:data:|https?:|#)/.test(relative))return relative;
 const file=fileURLToPath(new URL(relative,pathToFileURL(base)));
 return `data:${mime[path.extname(file).toLowerCase()]||'application/octet-stream'};base64,${fs.readFileSync(file).toString('base64')}`;
}
function inlineCSS(css,base){return css.replace(/url\((?:"([^"]+)"|'([^']+)'|([^)]*))\)/g,(_,a,b,c)=>`url("${dataURI((a||b||c).trim(),base)}")`);}
function standalone(html){
 const base=path.join(repo,'src/report-a4-review.html');
 html=html.replace(/<link\b[^>]*href="([^\"]+\.css(?:\?[^\"]*)?)"[^>]*>/g,(_,href)=>{
  const cssfile=fileURLToPath(new URL(href,pathToFileURL(base)));
  return `<style>\n${inlineCSS(fs.readFileSync(cssfile,'utf8'),cssfile)}\n</style>`;
 });
 html=html.replace(/<script\b[^>]*src="([^\"]+)"[^>]*><\/script>/g,(_,src)=>`<script>\n${fs.readFileSync(fileURLToPath(new URL(src,pathToFileURL(base))),'utf8')}\n</script>`);
 html=html.replace(/<style>([\s\S]*?)<\/style>/g,(_,css)=>`<style>${inlineCSS(css,base)}</style>`);
 html=html.replace(/(<img\b[^>]*\bsrc=")([^\"]+)(")/g,(_,a,src,c)=>a+dataURI(src,base)+c);
 return html;
}
(async()=>{
 fs.mkdirSync(outputDir,{recursive:true});fs.mkdirSync(path.join(repo,'data'),{recursive:true});
 const publicTimeline=JSON.parse(JSON.stringify(timeline));for(const event of publicTimeline.events)if(event.source)delete event.source.text;
 fs.writeFileSync(path.join(repo,'data/renovation-progress.json'),JSON.stringify(publicTimeline,null,2));
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe'});
 const page=await browser.newPage({viewport:{width:1280,height:1000}});
 await page.route(/^https?:/,r=>r.abort());
 await page.goto(pathToFileURL(path.join(repo,'src/report.html')).href,{waitUntil:'load'});
 let rendered=await page.evaluate(({timeline,rationale,approved,omitRationale,revision,displayDate})=>{
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function removePrintRules(css){
   css=css.replace(/\/\* PAGE_GEOMETRY_START \*\/[\s\S]*?\/\* PAGE_GEOMETRY_END \*\//g,'');
   let found;while((found=css.match(/@media\s+print\s*\{/))){let start=found.index,at=start+found[0].length,depth=1;while(depth&&at<css.length){if(css[at]==='{')depth++;if(css[at]==='}')depth--;at++;}css=css.slice(0,start)+css.slice(at);}
   return css.replaceAll('max-width:640px','max-width:767px');
  }
  for(const style of document.querySelectorAll('style'))style.textContent=removePrintRules(style.textContent);
  document.body.dataset.reportRevision=revision;
  document.body.dataset.reviewState=approved?'approved':'wording-pending';
  document.querySelectorAll('.ppt-slide').forEach((slide,i)=>{if(!slide.dataset.originalPage&&!slide.classList.contains('slide-rationale')&&!slide.classList.contains('slide-timeline'))slide.dataset.originalPage=String(i+1);});
  document.querySelector('.slide-rationale')?.remove();document.querySelector('.slide-timeline')?.remove();
  const make=(className,content)=>{const a=document.createElement('article');a.className='ppt-slide '+className;a.innerHTML=content;return a;};
  const head=(eyebrow,title)=>`<header class="a4-page-head flex justify-between items-end border-b border-slate-200"><div><span class="text-xs font-bold text-blue-700 block">${esc(eyebrow)}</span><h3 class="font-extrabold">${esc(title)}</h3></div><span class="page-number">SLIDE 00</span></header>`;
  const foot=()=>'<footer class="report-page-foot a4-page-foot"><span>프라이어팰리스 리노베이션 소유주 토론방</span><span>SLIDE 00 / 22</span></footer>';
  const law=rationale||{title:'왜 대수선을 우선 검토하는가',lead:'사용자와 문구를 협의하기 위한 페이지입니다.',cards:[{title:'근거 검토 중',body:'법령·사업성·주거 불편·재원 조건을 구분한 문구안을 준비하고 있습니다.'}],conclusion:'문구 확인 후 본문을 확정합니다.',sources:[]};
  const keywordRows=(law.cards||[]).length===5;
  const lawCards=(law.cards||law.sections||[]).map((c,i)=>keywordRows?`<section class="rationale-card"><div class="keyword-heading"><span>${String(i+1).padStart(2,'0')}</span><h4>${esc(c.title.replace(/^\d+\.\s*/,''))}</h4></div><div class="keyword-copy"><p>${esc(c.body||c.text)}</p>${c.note?`<small>${esc(c.note)}</small>`:''}</div></section>`:`<section class="rationale-card"><h4>${esc(c.title)}</h4><p>${esc(c.body||c.text)}</p>${c.note?`<small>${esc(c.note)}</small>`:''}</section>`).join('');
  const sources=(law.sources||[]).map(s=>`<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.label||s.title)}</a>`).join(' · ');
  const lawSlide=make('slide-rationale'+(keywordRows?' keyword-rationale':''),head('검토 방향 · 제도와 단지 여건',law.title)+`<p class="rationale-lead">${esc(law.lead)}</p><div class="rationale-grid">${lawCards}</div><p class="rationale-conclusion">${esc(law.conclusion)}</p><p class="rationale-sources">${sources}${sources?' · ':''}법령·상품 확인: ${displayDate}${!approved?' · 문구 협의용':''}</p>`+foot());
  if(!omitRationale)document.querySelector('[data-original-page="3"]').after(lawSlide);
  const events=timeline.events.filter(e=>e.status!=='가결조건부');
  const conditional=timeline.events.find(e=>e.status==='가결조건부');
  const eventHTML=events.map(e=>`<section class="timeline-event"><div class="timeline-date">${esc(e.dateLabel)}<small>${esc(e.status==='논의방향'?'논의 방향':e.status==='의결예정'?'의결 예정':e.status)}</small></div><div><h4>${esc(e.title)}</h4><p>${esc(e.summary)}</p><ul>${e.points.map(p=>`<li>${esc(p)}</li>`).join('')}</ul></div></section>`).join('');
  const progress=make('slide-timeline',head('추진 경과 · 날짜순 누적 기록',timeline.title)+`<div class="timeline-status"><b>${esc(timeline.currentStatus.title)}</b><span>2026.10.28 논의 기준</span></div><div class="timeline-layout"><div class="timeline-list">${eventHTML}</div><aside class="timeline-aside"><section class="timeline-box is-pending"><h4>${esc(conditional.dateLabel)}</h4><p>${esc(conditional.summary)}</p><ul>${conditional.points.map(p=>`<li>${esc(p)}</li>`).join('')}</ul></section><section class="timeline-box"><h4>${esc(timeline.participation.title)}</h4><p>${esc(timeline.participation.text)}</p></section></aside></div><p class="timeline-source">${esc(timeline.footerNote)}<br>${esc(timeline.sourceLabel)}</p>`+foot());
  document.querySelector('[data-original-page="5"]').after(progress);
  const cost=document.querySelector('[data-original-page="4"] .cost-hero b');
  if(!cost)throw Error('Cost note not found');cost.textContent=cost.textContent.replace('500억원','300억원');
  const costTable=cost.closest('article').querySelector('table');
  const columnHeaders=[...costTable.querySelectorAll('thead th')];
  columnHeaders.forEach((th,i)=>{th.id=`cost-column-${i}`;th.scope='col';});
  for(const row of costTable.querySelectorAll('tbody tr'))[...row.cells].forEach((cell,i)=>{cell.setAttribute('headers',columnHeaders[i].id);if(i>0)cell.dataset.label=columnHeaders[i].textContent.trim();});
  const roadmap=document.querySelector('[data-original-page="5"]');const updates=timeline.roadmapUpdates;
  roadmap.querySelector('.roadmap-progress').setAttribute('aria-label',updates.currentAriaLabel);
  roadmap.querySelector('.roadmap-progress > small').textContent=updates.currentLabel;
  if(updates.steps){
   roadmap.querySelector('.roadmap-list').innerHTML=updates.steps.map(step=>`<div class="roadmap-step${step.number===updates.currentStep?' is-current':step.number===1?' is-start':step.number<updates.currentStep?' is-done':''}" role="listitem"><span class="roadmap-number">${String(step.number).padStart(2,'0')}</span><div class="roadmap-step-copy"><div class="roadmap-step-heading"><b>${esc(step.title)}</b>${step.dateBadge?`<span class="roadmap-date-badge">${esc(step.dateBadge)}</span>`:''}</div><small>${esc(step.detail)}</small></div></div>`).join('');
   roadmap.querySelector('.roadmap-panel h4').innerHTML=roadmap.querySelector('.roadmap-panel h4').innerHTML.replace(/\d+단계/,`${updates.stepCount}단계`);
   roadmap.querySelector('.roadmap-progress strong span').textContent=updates.currentProgressLabel;
   roadmap.querySelector('.roadmap-progress-track i').style.width=`${updates.currentStep/updates.stepCount*100}%`;
  }else{
   for(const [index,data] of [[1,updates.step2],[2,updates.step3]]){const copy=roadmap.querySelectorAll('.roadmap-step-copy')[index];copy.querySelector('b').innerHTML=esc(data.title)+(index===1?' <em>현재</em>':'');copy.querySelector('small').textContent=data.detail;}
  }
  roadmap.querySelector('.roadmap-qualification').textContent=updates.qualification;
  const agenda=roadmap.querySelector('.space-y-4').children[2];agenda.querySelector('strong').textContent=updates.administrativeAgenda3.title;agenda.querySelector('p').textContent=updates.administrativeAgenda3.text;
  const reportSlides=[...document.querySelectorAll('.ppt-slide')];
  reportSlides.forEach((slide,i)=>{
   slide.id=`report-page-${i+1}`;
   if(slide.firstElementChild?.querySelector('h3'))slide.firstElementChild.classList.add('a4-page-head');
   slide.lastElementChild.classList.add('a4-page-foot');
   const walker=document.createTreeWalker(slide,NodeFilter.SHOW_TEXT);let node;while(node=walker.nextNode()){node.textContent=node.textContent.replace(/SLIDE\s+\d+(?:\s*\/\s*\d+)?/g,match=>`SLIDE ${String(i+1).padStart(2,'0')}`+(match.includes('/')?` / ${reportSlides.length}`:''));}
  });
  for(const grid of document.querySelectorAll('[id^="report-survey-grid-"]'))grid.innerHTML='';
  const toolbar=document.querySelector('header.no-print');
  toolbar.querySelector('p').textContent=approved?'A4 가로 · 화면과 인쇄에 같은 레이아웃을 사용합니다.':'문구 협의용 · 대수선 우선 검토 페이지 확인 후 확정합니다.';
  const buttons=toolbar.querySelector('button').parentElement;
  buttons.innerHTML='<button onclick="printReport()" class="px-3.5 py-2 bg-slate-100 text-slate-700 rounded-xl font-bold text-xs flex items-center gap-1.5"><i class="fa-solid fa-print"></i><span>A4 가로 인쇄</span></button><button onclick="copyCurrentLink()" class="px-4 py-2 bg-blue-700 text-white rounded-xl font-bold text-xs">링크 복사</button>';
  for(const script of document.querySelectorAll('script:not([src])'))if(script.textContent.includes('function printReport('))script.textContent=script.textContent.replace(/(?:async\s+)?function printReport\([^]*?\n    }/,'async function printReport() {\n      await document.fonts.ready;\n      await Promise.all([...document.images].map(image => image.decode().catch(() => {})));\n      window.print();\n    }');
  document.querySelector('link[data-a4]')?.remove();const link=document.createElement('link');link.rel='stylesheet';link.href=`./report-a4.css?v=${revision}`;link.dataset.a4='true';document.head.append(link);
  for(const old of document.querySelectorAll('script:not([src])'))if(old.textContent.includes('function syncA4Scale()'))old.remove();
  const script=document.createElement('script');script.dataset.a4Preview='true';script.textContent="function syncA4Scale(){const scale=innerWidth>=768?Math.min(1,(innerWidth-24)/(297/25.4*96)):1;document.documentElement.style.setProperty('--a4-preview-scale',String(scale));}addEventListener('resize',syncA4Scale);syncA4Scale();";document.body.append(script);
  return '<!DOCTYPE html>\n'+document.documentElement.outerHTML;
 },{timeline,rationale,approved,omitRationale,revision,displayDate});
 rendered=rendered.replace(/^[ \t]+$/gm,'');
 await browser.close();
 const source=path.join(repo,approved?'src/report.html':'src/report-a4-review.html');fs.writeFileSync(source,rendered);
 const pageCount=(rendered.match(/<article\b/g)||[]).length;
 const result=standalone(rendered).replace(/\r\n?/g,'\n');
 const name=stem+(approved?'':'_문구협의용')+'.html';const output=path.join(outputDir,name);fs.writeFileSync(output,result);
 let wordingPreview=null;
 if(rationale&&!approved){
  const head=rendered.match(/<head>[\s\S]*?<\/head>/)[0].replace(/url\((?:"([^"]+)"|'([^']+)'|([^)]*))\)/g,(all,a,b,c)=>/\.(png|jpe?g|webp|gif)$/i.test(a||b||c)?'none':all);
  const article=rendered.match(/<article\b[^>]*class="[^\"]*\bslide-rationale\b[^\"]*"[^>]*>[\s\S]*?<\/article>/)[0];
  const one='<!DOCTYPE html>\n<html lang="ko">'+head+'<body data-review-state="wording-pending">'+article+'<script>function syncA4Scale(){document.documentElement.style.setProperty("--a4-preview-scale",String(innerWidth>=768?Math.min(1,(innerWidth-24)/(297/25.4*96)):1));}addEventListener("resize",syncA4Scale);syncA4Scale();</script></body></html>';
  wordingPreview=path.join(outputDir,`${dateStamp}_대수선 우선 검토_문구협의용.html`);fs.writeFileSync(wordingPreview,standalone(one).replace(/\r\n?/g,'\n'));
 }
 if(approved){fs.writeFileSync(path.join(repo,'releases/2026-11',stem+'.html'),result);fs.writeFileSync(path.join(project,'output/최신_공감리포트.html'),result);if(!omitRationale)fs.writeFileSync(path.join(repo,'data/report-rationale.json'),JSON.stringify(rationale,null,2));fs.writeFileSync(path.join(repo,'data/report-build.json'),JSON.stringify({revision,asOf:issueDate,format:'A4 landscape HTML',pages:pageCount,rationaleStatus:omitRationale?'awaiting user wording confirmation; excluded from publication':'user revision instructions implemented after source verification; included',latestOutput:'output/2026-11/'+name},null,2));}
 console.log(JSON.stringify({output,source,wordingPreview,pages:pageCount,approved,bytes:Buffer.byteLength(result),rationaleCopyReady:!!rationale}));
})().catch(e=>{console.error(e);process.exit(1)});
