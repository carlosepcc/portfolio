// @ts-check
import { defineConfig } from 'astro/config';
import { DEFAULT_LOCALE, LOCALE_CODES } from './src/lib/locales.js';

// Static output: `astro build` emits a plain static site to dist/,
// served as-is by Cloudflare Workers Static Assets (see wrangler.jsonc).
// No adapter is needed.
//
// i18n: the default locale (English) has no URL prefix (/), every other
// locale lives at /<locale>/ (e.g. /es/). The locale list is the single
// source in src/lib/locales.js; pages are built only for locales with
// complete translations in src/data/cv.json (see src/pages/[locale]/).
export default defineConfig({
  site: 'https://carlosepc.hivepen.com',
  output: 'static',
  i18n: {
    defaultLocale: DEFAULT_LOCALE,
    locales: LOCALE_CODES,
    routing: {
      prefixDefaultLocale: false,
    },
  },
});
