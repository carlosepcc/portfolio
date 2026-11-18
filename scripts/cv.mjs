#!/usr/bin/env node
/**
 * Build the downloadable CVs from their single source of truth.
 *
 *   npm run cv
 *
 * Reads src/data/cv.json and, for every locale with complete translations
 * (today: en, es), renders the CV to print HTML, prints it to PDF with
 * headless Chrome, and writes the Markdown. Outputs are committed under
 * public/ so `astro build` needs no browser:
 *
 *   public/cv.md, public/cv.pdf       English (default locale, no prefix)
 *   public/cv-es.md, public/cv-es.pdf Spanish (cv-<locale>.md/.pdf)
 *
 * To update the CV: edit src/data/cv.json, run `npm run cv`, then build.
 * To add a language: add its translations to src/data/cv.json and its
 * code to src/lib/locales.js — no other changes needed.
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
import { getAvailableLocales, L, cvFileName, t } from '../src/lib/i18n.js';
import { DEFAULT_LOCALE } from '../src/lib/locales.js';
import cvData from '../src/data/cv.json' with { type: 'json' };

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const publicDir = join(root, 'public');

// Print CSS — tuned so each PDF stays at exactly 1 A4 page. Do not touch
// these values without re-checking pdfinfo on every locale: h2 margin-top
// 1.8mm, h3 margin-top 1.4mm, .footer margin-top 1mm, .page min-height
// 296mm.
const PRINT_CSS = `
@page { size: A4; margin: 0; }
* { box-sizing: border-box; print-color-adjust: exact; -webkit-print-color-adjust: exact; }
body { margin: 0; font-family: 'Liberation Sans', 'Noto Sans', 'Inter', system-ui, sans-serif; color: #1a2027; font-size: 9pt; line-height: 1.2; }
.page { min-height: 296mm; padding: 7mm 14mm 5mm 14mm; background: #fff; }
h1 { font-size: 20pt; line-height: 1.1; margin: 0 0 2mm 0; color: #0f2a3d; letter-spacing: -0.2pt; }
.role { font-size: 11pt; color: #0e6b6e; font-weight: 700; margin: 0 0 3mm 0; }
.contact { font-size: 9pt; color: #44515c; margin: 0 0 4mm 0; }
.rule { border: none; border-top: 2.2pt solid #0e6b6e; margin: 0 0 5mm 0; }
h2 { font-size: 10.5pt; text-transform: uppercase; letter-spacing: 1.1pt; color: #0f2a3d; border-bottom: 0.6pt solid #cbd5db; padding-bottom: 1.2mm; margin: 1.8mm 0 1.5mm 0; }
h2:first-of-type { margin-top: 0; }
h3 { font-size: 10.5pt; margin: 1.4mm 0 0.6mm 0; color: #16232e; }
h3 + p { font-size: 9pt; color: #5a6a75; margin: 0 0 1mm 0; }
p { margin: 0 0 1.4mm 0; }
ul { margin: 0.3mm 0 1mm 0; padding-left: 4.5mm; }
li { margin-bottom: 0.5mm; }
.job { break-inside: avoid; page-break-inside: avoid; }
strong { color: #0f2a3d; }
.footer { margin-top: 1mm; font-size: 8pt; color: #7a8791; border-top: 0.6pt solid #e1e7eb; padding-top: 1mm; }
a { color: #0e6b6e; text-decoration: none; }
`;

// Per-locale print-CSS overrides, appended after PRINT_CSS. Longer
// languages may need small spacing tweaks to stay at exactly 1 A4 page —
// add an entry here ONLY when a locale is measured overflowing.
// es overflows by one line (the footer) at the shared values, so it gets a
// slightly tighter line-height; en fits as-is.
const PRINT_CSS_OVERRIDES = {
  es: 'body { font-size: 8.8pt; line-height: 1.16; }',
};

/** Build the CV Markdown for one locale — same structure the PDF pipeline
 *  and the downloadable file share. {{YEARS}} is substituted by the caller. */
function buildCvMarkdown(locale) {
  const { profile, ui } = cvData;
  const c = profile.contact;
  const lines = [];

  lines.push(`# ${profile.name}`, '');
  lines.push(`<p class="role">${t(profile.role, locale)}</p>`, '');
  lines.push(
    `<p class="contact">${profile.location} &nbsp;·&nbsp; ${c.email} &nbsp;·&nbsp; ${c.phone}<br>${c.github.label} &nbsp;·&nbsp; ${c.website.label} &nbsp;·&nbsp; ${c.hivepen.label} &nbsp;·&nbsp; ${c.x.label}</p>`,
    '',
  );
  lines.push('<hr class="rule">', '');
  lines.push(`## ${t(ui.professionalSummary, locale)}`, '');
  lines.push(t(cvData.summary, locale), '');
  lines.push(`## ${t(ui.experience, locale)}`, '');

  for (const job of cvData.experience) {
    const heading = job.company
      ? `${t(job.role, locale)} — ${t(job.company, locale)}`
      : t(job.role, locale);
    lines.push(`### ${heading}`, '');
    const meta = job.dates
      ? `${t(job.location, locale)} · ${t(job.dates, locale)}`
      : t(job.location, locale);
    lines.push(meta, '');
    for (const bullet of job.bullets) lines.push(`- ${t(bullet, locale)}`);
    lines.push('');
  }

  lines.push(`## ${t(ui.featuredProject, locale)}`, '');
  const fp = cvData.featuredProject;
  lines.push(`### ${t(fp.title, locale)}`, '');
  lines.push(t(fp.meta, locale), '');
  lines.push(t(fp.intro, locale), '');
  for (const b of fp.bullets) lines.push(`- **${b.label}:** ${t(b.text, locale)}`);
  lines.push('');
  lines.push(t(fp.outro, locale), '');
  // One line, names only — the portfolio page carries the descriptions.
  // No section heading: it closes the featured project as a plain line.
  lines.push(
    `**${t(ui.moreProjects, locale)}:** ${cvData.projects.map((p) => p.title).join(' · ')} — ${t({ en: 'details at carlosepc.hivepen.com', es: 'detalles en carlosepc.hivepen.com' }, locale)}`,
    '',
  );

  lines.push(`## ${t(ui.skills, locale)}`, '');
  for (const group of cvData.skills) {
    lines.push(`**${t(group.label, locale)}:** ${t(group.items, locale)}`, '');
  }

  const edu = cvData.education;
  lines.push(`## ${t(ui.education, locale)}`, '');
  lines.push(
    `**${t(edu.degree, locale)}** — ${t(edu.school, locale)} · ${edu.years}`,
    '',
  );

  lines.push(`## ${t(ui.languages, locale)}`, '');
  lines.push(
    cvData.languages
      .map((lang) => `**${t(lang.name, locale)}:** ${t(lang.level, locale)}`)
      .join(' &nbsp;·&nbsp; '),
    '',
  );

  lines.push(
    `<p class="footer">${profile.name} · ${t(profile.shortRole, locale)} · ${profile.location} · ${t(ui.footerDate, locale)}</p>`,
  );
  return lines.join('\n');
}

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

function buildLocale(locale, chrome) {
  // The years of experience are computed at build time, never hardcoded:
  // `{{YEARS}}` becomes e.g. "6.5 years" (en) or "6,5 años" (es) in both
  // the PDF and the downloadable Markdown, matching the page
  // (see src/lib/experience.js).
  const md = L(buildCvMarkdown(locale), locale);
  const outMdPath = join(publicDir, cvFileName(locale, 'md'));
  const outPdfPath = join(publicDir, cvFileName(locale, 'pdf'));

  const pages = md.split(/^[ \t]*<!-- page-break -->[ \t]*$/m);
  const body = pages
    .map((page) => `<div class="page">${groupEntries(marked.parse(page))}</div>`)
    .join('\n');
  const html = `<!DOCTYPE html>
<html lang="${locale}">
<head>
<meta charset="utf-8">
<title>CV - ${cvData.profile.name} - ${t(cvData.profile.shortRole, locale)}</title>
<style>${PRINT_CSS}${PRINT_CSS_OVERRIDES[locale] ?? ''}</style>
</head>
<body>
${body}
</body>
</html>`;

  const dir = mkdtempSync(join(tmpdir(), 'cv-'));
  try {
    const htmlPath = join(dir, `cv-${locale}.html`);
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
    console.log(`cv: wrote ${outMdPath} (${pages.length} print page(s))`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

function main() {
  const locales = getAvailableLocales(cvData);
  if (!locales.includes(DEFAULT_LOCALE)) {
    console.error(`cv: default locale ${DEFAULT_LOCALE} has no translations.`);
    process.exit(1);
  }
  const chrome = findChrome();
  if (!chrome) {
    console.error('cv: no headless Chrome found. Set CHROME_PATH or install Chrome/Chromium.');
    process.exit(1);
  }
  for (const locale of locales) buildLocale(locale, chrome);
}

main();
