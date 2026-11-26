// Turns the client guides in backend/*.md into simple, printable PDFs next to them:
//
//   npm run docs
//
// The Markdown files stay the source. Run this after editing them (npm run package does it too).
import { readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
export const DOCS = ['START-HERE', 'SECURITY'].map((name) => ({
  md: join(root, 'backend', `${name}.md`),
  pdf: join(root, 'backend', `${name}.pdf`),
}));

// ---- A small Markdown reader for the subset these guides use -------------------------------
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const inline = (text) => {
  const codes = [];
  let s = text.replace(/`([^`]+)`/g, (_m, c) => `\u0000${codes.push(c) - 1}\u0000`);
  s = esc(s)
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^\w*])\*([^*\s][^*]*)\*/g, '$1<em>$2</em>');
  return s.replace(/\u0000(\d+)\u0000/g, (_m, i) => `<code>${esc(codes[+i])}</code>`);
};
const LIST = /^([-*]|\d+\.)\s+/;
const isBlockStart = (l) => /^(#{1,6}\s|```|>|\||---\s*$)/.test(l) || LIST.test(l);

function render(lines) {
  const out = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }
    if (line.startsWith('```')) {
      const body = [];
      for (i++; i < lines.length && !lines[i].startsWith('```'); i++) body.push(lines[i]);
      i++;
      out.push(`<pre><code>${esc(body.join('\n'))}</code></pre>`);
      continue;
    }
    const h = line.match(/^(#{1,6})\s+(.*)$/);
    if (h) {
      const level = h[1].length;
      const step = level === 3 && h[2].match(/^Step (\d+)\.\s*(.*)$/);
      out.push(step
        ? `<h3 class="step"><span class="num">${step[1]}</span><span>${inline(step[2])}</span></h3>`
        : `<h${level}>${inline(h[2])}</h${level}>`);
      i++;
      continue;
    }
    if (/^---\s*$/.test(line)) { out.push('<hr>'); i++; continue; }
    if (line.startsWith('|')) {
      const rows = [];
      for (; i < lines.length && lines[i].startsWith('|'); i++) rows.push(lines[i]);
      const cells = (r) => r.trim().replace(/^\||\|$/g, '').split('|').map((c) => inline(c.trim()));
      const [head, , ...body] = rows;
      out.push(`<table><thead><tr>${cells(head).map((c) => `<th>${c}</th>`).join('')}</tr></thead><tbody>${
        body.map((r) => `<tr>${cells(r).map((c) => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table>`);
      continue;
    }
    if (line.startsWith('>')) {
      const body = [];
      for (; i < lines.length && lines[i].startsWith('>'); i++) body.push(lines[i].replace(/^>\s?/, ''));
      const kind = /^\*\*Tip/.test(body[0]) ? 'tip' : 'note';
      out.push(`<aside class="${kind}">${render(body)}</aside>`);
      continue;
    }
    const m = line.match(LIST);
    if (m) {
      const ordered = m[1] !== '-' && m[1] !== '*';
      const items = [];
      while (i < lines.length) {
        const mm = lines[i].match(LIST);
        if (!mm || (mm[1] === '-' || mm[1] === '*') === ordered) break;
        const indent = mm[0].length;
        const body = [lines[i].slice(indent)];
        for (i++; i < lines.length; i++) {
          const l = lines[i];
          if (l.trim() && !/^\s/.test(l)) break;
          if (!l.trim() && (i + 1 >= lines.length || (lines[i + 1].trim() && !/^\s/.test(lines[i + 1])))) break;
          body.push(l.slice(Math.min(indent, l.length - l.trimStart().length)));
        }
        items.push(body);
      }
      const start = ordered ? parseInt(m[1], 10) : 1;
      const lis = items.map((body) => {
        const task = body[0].match(/^\[( |x)\]\s+/);
        if (task) body[0] = body[0].slice(task[0].length);
        const html = render(body);
        return task ? `<li class="task"><span class="box" aria-hidden="true"></span><div>${html}</div></li>` : `<li>${html}</li>`;
      });
      const tasks = items.length && lis.every((l) => l.startsWith('<li class="task"'));
      out.push(ordered
        ? `<ol${start !== 1 ? ` start="${start}"` : ''}>${lis.join('')}</ol>`
        : `<ul${tasks ? ' class="tasks"' : ''}>${lis.join('')}</ul>`);
      continue;
    }
    const para = [];
    for (; i < lines.length && lines[i].trim() && !(para.length && isBlockStart(lines[i])); i++) para.push(lines[i].trim());
    out.push(`<p>${inline(para.join(' '))}</p>`);
  }
  return out.join('\n');
}

const CSS = `
@page { size: A4; margin: 18mm 16mm 20mm; }
* { box-sizing: border-box; }
html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
body { margin: 0; font: 11pt/1.5 "Segoe UI", Arial, Helvetica, sans-serif; color: #172033; }
h1 { margin: 0 0 4mm; padding: 9mm 8mm 8mm; background: #0b1730; color: #fff; border-radius: 4mm;
     font-size: 25pt; line-height: 1.15; letter-spacing: -0.01em; }
h1 + p { font-size: 13pt; color: #3a4a66; margin: 0 0 5mm; }
h2 { font-size: 16pt; margin: 9mm 0 3mm; padding-bottom: 1.5mm; border-bottom: 0.6mm solid #2563eb; color: #0b1730; break-after: avoid; }
h3 { font-size: 13pt; margin: 6mm 0 2mm; color: #0b1730; break-after: avoid; }
h3.step { display: flex; align-items: center; gap: 3mm; margin-top: 8mm; }
h3.step .num { flex: none; width: 9mm; height: 9mm; border-radius: 50%; background: #2563eb; color: #fff;
               display: grid; place-items: center; font-size: 12pt; font-weight: 700; }
p { margin: 0 0 3mm; }
hr { border: 0; margin: 2mm 0; }
strong { color: #0b1730; }
code { font-family: Consolas, "Courier New", monospace; font-size: 0.92em; background: #eef2f8; border: 0.2mm solid #d6deea;
       border-radius: 1mm; padding: 0 1.2mm; white-space: nowrap; }
pre { background: #0b1730; color: #e6edf7; border-radius: 2mm; padding: 3.5mm 4mm; margin: 2mm 0 4mm; break-inside: avoid;
      white-space: pre-wrap; word-break: break-word; }
pre code { background: none; border: 0; padding: 0; color: inherit; font-size: 11pt; white-space: pre-wrap; }
ul, ol { margin: 0 0 3mm; padding-left: 7mm; }
li { margin: 0 0 1.6mm; }
li > p { margin: 0 0 1.2mm; }
ol > li::marker { font-weight: 700; color: #2563eb; }
ul.tasks { list-style: none; padding-left: 0; }
li.task { display: flex; gap: 3mm; align-items: flex-start; }
li.task .box { flex: none; width: 4.4mm; height: 4.4mm; margin-top: 1mm; border: 0.45mm solid #2563eb; border-radius: 0.8mm; }
table { width: 100%; border-collapse: collapse; margin: 2mm 0 4mm; font-size: 10.5pt; }
tr { break-inside: avoid; }
p:has(+ table), p:has(+ pre) { break-after: avoid; }
th { background: #0b1730; color: #fff; text-align: left; font-weight: 600; }
th, td { padding: 2mm 3mm; vertical-align: top; border-bottom: 0.2mm solid #d6deea; }
tbody tr:nth-child(even) td { background: #f4f7fb; }
td:first-child { font-weight: 600; color: #0b1730; width: 34%; }
td code { white-space: normal; }
th code { background: rgba(255,255,255,.14); border-color: rgba(255,255,255,.3); color: #fff; }
aside { border-left: 1.4mm solid #2563eb; background: #eaf1ff; border-radius: 0 2mm 2mm 0; padding: 3mm 4mm; margin: 3mm 0 4mm; break-inside: avoid; }
aside.tip { border-color: #16a34a; background: #eaf8ef; }
aside p:last-child { margin: 0; }
`;

const page = (title, body) => `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${esc(title)}</title><style>${CSS}</style></head><body>${body}</body></html>`;

export async function buildDocs() {
  const browser = await chromium.launch();
  try {
    const tab = await browser.newPage();
    for (const doc of DOCS) {
      const md = readFileSync(doc.md, 'utf8').replace(/\r\n/g, '\n');
      const title = (md.match(/^# (.*)$/m) ?? [, 'Digiinn360'])[1];
      await tab.setContent(page(title, render(md.split('\n'))), { waitUntil: 'load' });
      await tab.pdf({
        path: doc.pdf,
        format: 'A4',
        printBackground: true,
        displayHeaderFooter: true,
        headerTemplate: '<span></span>',
        footerTemplate: `<div style="width:100%;font:8pt Segoe UI,Arial,sans-serif;color:#7a879c;padding:0 16mm;display:flex;justify-content:space-between"><span>${esc(title)}</span><span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span></div>`,
        margin: { top: '18mm', bottom: '20mm', left: '16mm', right: '16mm' },
      });
      console.log(`Wrote ${doc.pdf.slice(root.length + 1)} (${Math.round(statSync(doc.pdf).size / 1024)} KB)`);
    }
  } finally {
    await browser.close();
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) await buildDocs();
