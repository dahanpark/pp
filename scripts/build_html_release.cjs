const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const stem = process.argv[2] || '261026_프라이어팰리스 리노베이션 공감리포트_26년 11월_Rev10';
let html = fs.readFileSync(path.join(root, 'src/report.html'), 'utf8');
for (const name of ['utilities.css','survey-charts.css','report-fonts.css','report-icons.css','report-utilities.css']) {
  const css = fs.readFileSync(path.join(root, 'src', name), 'utf8');
  html = html.replace(`<link rel="stylesheet" href="./${name}">`, `<style>\n${css}\n</style>`);
}
const renderer = fs.readFileSync(path.join(root, 'src/survey-renderer.js'), 'utf8');
html = html.replace('<script src="./survey-renderer.js"></script>', `<script>\n${renderer}\n</script>`);
html = html.replaceAll('../assets/', '../../assets/');
html = html.replaceAll('../releases/2026-11/', './');
const output = path.join(root, 'releases/2026-11', `${stem}.html`);
fs.writeFileSync(output, html, 'utf8');
console.log(output);
