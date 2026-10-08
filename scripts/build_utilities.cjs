const fs = require('fs');
const path = require('path');
const {cssFor} = require('./build_pdf.cjs');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'src', 'report.html'), 'utf8');
const tokens = new Set([...html.matchAll(/class="([^"]+)"/g)].flatMap(match => match[1].split(/\s+/)));
const utilities = [...tokens].map(cssFor).filter(Boolean).join('\n');
const extras = `
[class~="border"],[class~="border-2"],[class~="border-t-4"],[class~="border-b"]{border-style:solid}
[class~="border-t-4"]{border-top-width:4px}
[class~="border-b"]{border-bottom-width:1px}
[class~="flex-1"]{flex:1 1 0%}
[class~="absolute"]{position:absolute}
[class~="top-0"]{top:0}[class~="right-0"]{right:0}[class~="bottom-0"]{bottom:0}[class~="left-0"]{left:0}
[class~="z-10"]{z-index:10}[class~="z-30"]{z-index:30}
[class~="space-y-3"]>*+*{margin-top:.75rem}[class~="space-y-4"]>*+*{margin-top:1rem}
.ppt-slide[class*="!bg-slate-900"]{background-color:#0f172a}
.ppt-slide[class*="!border-slate-800"]{border-color:#1e293b}
@media(min-width:768px){
  [class~="md:grid-cols-2"]{grid-template-columns:repeat(2,minmax(0,1fr))}
  [class~="md:grid-cols-3"]{grid-template-columns:repeat(3,minmax(0,1fr))}
  [class~="md:text-xs"]{font-size:.75rem}[class~="md:text-sm"]{font-size:.875rem}
  [class~="md:text-base"]{font-size:1rem}[class~="md:text-lg"]{font-size:1.125rem}
  [class~="md:text-xl"]{font-size:1.25rem}[class~="md:text-2xl"]{font-size:1.5rem}
  [class~="md:text-3xl"]{font-size:1.875rem}[class~="md:text-4xl"]{font-size:2.25rem}
  [class~="md:p-12"]{padding:3rem}[class~="md:p-14"]{padding:3.5rem}
  [class~="md:px-6"]{padding-left:1.5rem;padding-right:1.5rem}
  [class~="md:gap-4"]{gap:1rem}
}
@media(min-width:1024px){[class~="lg:text-5xl"]{font-size:3rem}}
`;
fs.writeFileSync(path.join(root, 'src', 'utilities.css'), utilities + '\n' + extras, 'utf8');
