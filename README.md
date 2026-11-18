# carlosepc-portfolio

Personal portfolio of Carlos Enrique Piñeiro — Software Engineer, Santa Clara, Cuba.

Static Astro site (plain CSS, no JavaScript, system light/dark theme via
`prefers-color-scheme`). Published at **carlosepc.hivepen.com** (production)
and **dev.hivepen.com** (staging) on Cloudflare Workers Static Assets.

## Commands

```sh
npm install      # install dependencies
npm run dev      # local dev server (http://localhost:4321)
npm run build    # static build → dist/
npm run preview  # serve dist/ locally
npm run cv       # regenerate the downloadable CV (see below)
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

## The CV — one source of truth

The CV has **one** source: [`src/content/cv.md`](src/content/cv.md).

The site serves it two ways, both generated from that file:

- `/cv.md` — the Markdown itself, copied to `public/cv.md`
- `/cv.pdf` — an A4 PDF, rendered from the Markdown and committed to `public/cv.pdf`

The site build itself needs **no browser**: the PDF is generated ahead of time
by `npm run cv` and committed like any other static file.

**To update the CV:**

1. Edit `src/content/cv.md` (and the matching copy on the page, if the same
   fact appears in `src/pages/index.astro`).
2. Run `npm run cv` — it renders the Markdown to print HTML and prints it to
   PDF with headless Chrome, then copies the Markdown to `public/cv.md`.
3. Run `npm run build` and deploy.

`npm run cv` finds Chrome in this order: the `CHROME_PATH` environment
variable, `google-chrome` / `chromium` on PATH, Google Chrome on macOS
(`/Applications/Google Chrome.app`), or the Puppeteer Chrome cache
(`~/.cache/puppeteer/chrome/...`). If it cannot find Chrome it exits with an
error instead of writing a stale PDF.

A `<!-- page-break -->` line on its own in `cv.md` forces a page break in the
PDF (the CV is two A4 pages: header + experience, then projects + skills).

Years of experience are computed at build time, never hardcoded: the anchor
is April 2020 (first development work — university projects and thesis, VueJS
and Quasar) in
[`src/lib/experience.js`](src/lib/experience.js). The page renders it via
`yearsLabel()` and the CV writes `{{YEARS}}` in `cv.md`, which `npm run cv`
substitutes with the same value — so the number can never drift between the
page, the PDF, and the downloadable Markdown, and it updates on every
rebuild.

## Structure

```
src/
  content/cv.md        CV source of truth (Markdown)
  lib/experience.js    years of experience, computed from April 2023 (shared by the page and the CV script)
  pages/index.astro    the single-page portfolio
  styles/global.css    plain CSS, light/dark via prefers-color-scheme
scripts/cv.mjs         CV → PDF (headless Chrome) + CV → public/cv.md
public/
  cv.md                generated from src/content/cv.md (do not edit by hand)
  cv.pdf               generated from src/content/cv.md (do not edit by hand)
  favicon.svg
wrangler.jsonc         Workers Static Assets config (assets.directory ./dist)
```

## Content notes

- Language is English, matching the existing portfolio draft.
- Carlito is listed **in beta (0.x), sole developer**, published on Apklis
  (315 CUP) and Zapstore. Its feature list is Pizarra, Banca, Mensajes —
  Resumen was retired and is deliberately not listed. Nauta Hogar is upcoming.
- Miazucar is labelled client work (built on commission, APK delivered).
- The backend contract client is labelled "Independent client, US-based".
- No invented metrics, titles, or dates. If a fact is unverified, it is left
  out rather than guessed.
