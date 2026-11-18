# carlosepc-portfolio

Personal portfolio of Carlos Enrique Piñeiro — Software Engineer, Santa Clara, Cuba.

Static Astro site (plain CSS, no JavaScript, system light/dark theme via
`prefers-color-scheme`). Published at **carlosepc.hivepen.com** (production)
and **dev.hivepen.com** (staging) on Cloudflare Workers Static Assets.

The site is bilingual (English + Spanish) and built to grow to more
languages: every page and every CV download is generated from one data file
(see below). Planned locales: English, Spanish, Portuguese, French, German,
Italian, Mandarin Chinese.

## Commands

```sh
npm install      # install dependencies
npm run dev      # local dev server (http://localhost:4321)
npm run build    # static build → dist/
npm run preview  # serve dist/ locally
npm run cv       # regenerate the downloadable CVs (see below)
```

## Deploy

```sh
npm run build
npx wrangler deploy
```

`wrangler.jsonc` serves `./dist` as static assets. No adapter, no server code.

Staging/production split: `dev.hivepen.com` serves a preview deployment,
`carlosepc.hivepen.com` serves production. (DNS + Worker routes are set up in
the Cloudflare dashboard; this repo only holds the site.)

## Content — one source of truth

All content lives in [`src/data/cv.json`](src/data/cv.json): profile, summary,
experience, featured project, more projects, skills, education, languages,
and every UI string (section headings, download labels, footer).

Every translatable string is an object keyed by locale code:

```json
{ "en": "Software Engineer — Full-Stack", "es": "Ingeniero de software — Full-Stack" }
```

Locale-independent values (names, URLs, emails) are plain strings. The site
pages and the CV downloads are both generated from this one file, so a fact
can never drift between them.

The locale list lives in [`src/lib/locales.js`](src/lib/locales.js) — the
single place it is defined. Astro's i18n config, the language switcher, the
`[locale]` route and the CV generator all read it. A locale gets a page and
CV downloads as soon as its translations in `cv.json` are complete.

**To update the content:**

1. Edit `src/data/cv.json` (in every shipped language).
2. Run `npm run cv` — it regenerates the downloadable CVs.
3. Run `npm run build` and deploy.

**To add a language:**

1. Add its code to `src/lib/locales.js`.
2. Add its translations to `src/data/cv.json` (every translatable string).
3. Run `npm run cv` and `npm run build`. No other changes needed — the
   switcher, the route and the downloads appear on their own.

No placeholders, no machine-translated filler: a language ships only when its
translations are complete.

## The CVs — generated per locale

The site serves each CV two ways, both generated from `src/data/cv.json`:

| File | Language |
| --- | --- |
| `/cv.md`, `/cv.pdf` | English (default locale, no prefix) |
| `/cv-es.md`, `/cv-es.pdf` | Spanish (`cv-<locale>.md/.pdf`) |

The Markdown is generated from the data and the A4 PDF is rendered from it;
both are committed under `public/` so the site build itself needs **no
browser**. `npm run cv` regenerates all of them.

`npm run cv` finds Chrome in this order: the `CHROME_PATH` environment
variable, `google-chrome` / `chromium` on PATH, Google Chrome on macOS
(`/Applications/Google Chrome.app`), or the Puppeteer Chrome cache
(`~/.cache/puppeteer/chrome/...`). If it cannot find Chrome it exits with an
error instead of writing a stale PDF.

Each PDF is one A4 page. The print CSS in `scripts/cv.mjs`
is tuned to that length — do not change its spacing values without
re-checking `pdfinfo` on every locale. Longer languages may need a small
per-locale override; `PRINT_CSS_OVERRIDES` in the same script exists for
exactly that — Spanish currently uses one (slightly tighter type), because
it overflows by a line at the shared values.

Years of experience are computed at build time, never hardcoded: the anchor
is April 2020 (first development work — university projects and thesis, VueJS
and Quasar) in
[`src/lib/experience.js`](src/lib/experience.js). The summary in `cv.json`
writes `{{YEARS}}`, which is substituted with the same value everywhere —
the page, the PDF and the downloadable Markdown — and it updates on every
rebuild. The decimal separator is localized: English "6.5 years", Spanish
"6,5 años".

## Pages — Astro i18n routing

- `/` — English (default locale, no prefix)
- `/es/` — Spanish, `/<locale>/` for later locales

Both routes render the same component,
[`src/components/Portfolio.astro`](src/components/Portfolio.astro), from
`cv.json` + the locale. The language switcher in the header is rendered
from the configured locale list (current locale as plain text, the rest as
links), and the header offers the CV downloads of every shipped language,
labelled by language.

## Design

The pages are deliberately minimalist: single column, generous whitespace,
hairline dividers only — no cards, boxes, shadows, gradients or badges. The
language switcher and the CV downloads are plain text links; the only accent
is the quiet teal used for links. The CV PDFs keep their own print design
(see `scripts/cv.mjs`).

## Structure

```
src/
  data/cv.json         content source of truth (all locales)
  lib/locales.js       locale list (single source) + labels
  lib/i18n.js          t() / getAvailableLocales() / cvFileName()
  lib/experience.js    years of experience, computed from April 2020 (shared by the page and the CV script)
  components/Portfolio.astro   the page, rendered per locale
  pages/index.astro    English at /
  pages/[locale]/index.astro   other locales at /<locale>/
  styles/global.css    plain CSS, light/dark via prefers-color-scheme
scripts/cv.mjs         CV data → Markdown + PDF (headless Chrome) per locale
public/
  cv.md / cv.pdf       generated English CV (do not edit by hand)
  cv-es.md / cv-es.pdf generated Spanish CV (do not edit by hand)
  favicon.svg
wrangler.jsonc         Workers Static Assets config (assets.directory ./dist)
astro.config.mjs       static output + i18n (defaultLocale en, prefixDefaultLocale false)
```

## Content notes

- Carlito is listed **in beta (0.x), sole developer**, published on Apklis
  (315 CUP) and Zapstore. Its feature list is Pizarra, Banca, Mensajes —
  Resumen was retired and is deliberately not listed. Nauta Hogar is upcoming.
- Miazucar is labelled client work (built on commission, APK delivered).
- The backend contract client is labelled "Independent client, US-based".
- No invented metrics, titles, or dates. If a fact is unverified, it is left
  out rather than guessed.
