#!/usr/bin/env node
/**
 * Build the downloadable CV from its single source of truth.
 *
 *   npm run cv
 *
 * Reads src/content/cv.md, renders it to print HTML, prints it to PDF with
 * headless Chrome, and copies the Markdown to public/cv.md. Both outputs
 * are committed under public/ so `astro build` needs no browser.
 *
 * To update the CV: edit src/content/cv.md, run `npm run cv`, then build.
 *
 * Chrome is located in this order:
 *   1. CHROME_PATH environment variable
 *   2. google-chrome / chromium on PATH
 *   3. macOS: /Applications/Google Chrome.app
 *   4. Puppeteer's Chrome cache (~/.cache/puppeteer/chrome/...)
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { globSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { marked } from 'marked';
import { yearsLabel } from '../src/lib/experience.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const cvMdPath = join(root, 'src', 'content', 'cv.md');
const outMdPath = join(root, 'public', 'cv.md');
const outPdfPath = join(root, 'public', 'cv.pdf');

const PRINT_CSS = `
@page { size: A4; margin: 0; }
* { box-sizing: border-box; print-color-adjust: exact; -webkit-print-color-adjust: exact; }
body { margin: 0; font-family: 'Liberation Sans', 'Noto Sans', 'Inter', system-ui, sans-serif; color: #1a2027; font-size: 10.5pt; line-height: 1.38; }
.page { min-height: 296mm; padding: 13mm 17mm 11mm 17mm; background: #fff; }
h1 { font-size: 24pt; line-height: 1.1; margin: 0 0 2mm 0; color: #0f2a3d; letter-spacing: -0.2pt; }
.role { font-size: 12.5pt; color: #0e6b6e; font-weight: 700; margin: 0 0 3mm 0; }
.contact { font-size: 9.5pt; color: #44515c; margin: 0 0 4mm 0; }
.rule { border: none; border-top: 2.2pt solid #0e6b6e; margin: 0 0 5mm 0; }
h2 { font-size: 11pt; text-transform: uppercase; letter-spacing: 1.1pt; color: #0f2a3d; border-bottom: 0.6pt solid #cbd5db; padding-bottom: 1.2mm; margin: 3mm 0 2.2mm 0; }
h2:first-of-type { margin-top: 0; }
h3 { font-size: 10.8pt; margin: 2.2mm 0 0.6mm 0; color: #16232e; }
h3 + p { font-size: 9.5pt; color: #5a6a75; margin: 0 0 1mm 0; }
p { margin: 0 0 2.2mm 0; }
ul { margin: 0.6mm 0 2mm 0; padding-left: 4.5mm; }
li { margin-bottom: 0.9mm; }
.job { break-inside: avoid; page-break-inside: avoid; }
strong { color: #0f2a3d; }
.footer { margin-top: 2mm; font-size: 8.5pt; color: #7a8791; border-top: 0.6pt solid #e1e7eb; padding-top: 2mm; }
a { color: #0e6b6e; text-decoration: none; }
`;

/** Split marked HTML into top-level blocks so h3-led groups can be wrapped. */
function topLevelBlocks(html) {
  const re = /<(h[123]|p|ul|ol|hr)(?:\s[^>]*)?>(?:[\s\S]*?<\/\1>|)/g;
  const blocks = [];
  let m;
  while ((m = re.exec(html)) !== null) blocks.push(m[0]);
  return blocks;
}

/** Wrap each h3 + its following blocks (until the next h2/h3) in a .job div
 *  so a job/project entry never splits across pages. */
function groupEntries(html) {
  const blocks = topLevelBlocks(html);
  let out = '';
  let open = false;
  for (const b of blocks) {
    const tag = b.match(/^<(h[123]|p|ul|ol|hr)/)?.[1];
    if (tag === 'h3') {
      if (open) out += '</div>';
      out += '<div class="job">';
      open = true;
    } else if (tag === 'h2' && open) {
      out += '</div>';
      open = false;
    }
    out += b;
  }
  if (open) out += '</div>';
  return out;
}

function findChrome() {
  if (process.env.CHROME_PATH && existsSync(process.env.CHROME_PATH)) {
    return process.env.CHROME_PATH;
  }
  const candidates = [];
  for (const bin of ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser']) {
    try {
      const p = execFileSync('which', [bin], { encoding: 'utf8' }).trim();
      if (p) candidates.push(p);
    } catch { /* not on PATH */ }
  }
  candidates.push('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome');
  const home = process.env.HOME || '';
  if (home) {
    candidates.push(
      ...globSync(join(home, '.cache', 'puppeteer', 'chrome', '*', 'chrome-linux*', 'chrome')),
    );
  }
  return candidates.find((p) => existsSync(p));
}

function main() {
  // The years of experience are computed at build time, never hardcoded:
  // `{{YEARS}}` in cv.md becomes e.g. "3.5 years" in both the PDF and the
  // downloadable Markdown, matching the page (see src/lib/experience.js).
  const md = readFileSync(cvMdPath, 'utf8').replaceAll('{{YEARS}}', yearsLabel());
  const pages = md.split(/^[ \t]*<!-- page-break -->[ \t]*$/m);
  const body = pages.map((page) => `<div class="page">${groupEntries(marked.parse(page))}</div>`).join('\n');
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>CV - Carlos Enrique Piñeiro - Software Engineer</title>
<style>${PRINT_CSS}</style>
</head>
<body>
${body}
</body>
</html>`;

  const chrome = findChrome();
  if (!chrome) {
    console.error('cv: no headless Chrome found. Set CHROME_PATH or install Chrome/Chromium.');
    process.exit(1);
  }

  const dir = mkdtempSync(join(tmpdir(), 'cv-'));
  try {
    const htmlPath = join(dir, 'cv.html');
    writeFileSync(htmlPath, html);
    execFileSync(
      chrome,
      [
        '--headless',
        '--disable-gpu',
        '--no-sandbox',
        '--hide-scrollbars',
        `--print-to-pdf=${outPdfPath}`,
        '--no-pdf-header-footer',
        '--virtual-time-budget=8000',
        `file://${htmlPath}`,
      ],
      { stdio: 'pipe', timeout: 60000 },
    );
    // The downloadable Markdown is the same source, minus the
    // `<!-- page-break -->` marker lines (a print-only instruction).
    const cleanMd = md.replace(/^[ \t]*<!-- page-break -->[ \t]*\r?\n/gm, '');
    writeFileSync(outMdPath, cleanMd);
    console.log(`cv: wrote ${outPdfPath}`);
    console.log(`cv: wrote ${outMdPath} (${pages.length} print page(s) from cv.md)`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

main();
