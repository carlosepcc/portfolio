// Locale configuration — the single place the locale list lives.
//
// Add a locale here AND its translations in src/data/cv.json; nothing else
// needs to change (Astro i18n config, the language switcher, the CV
// generator and the [locale] route all read this list).
//
// Shipped today: en, es. Planned next: pt, fr, de, it, zh. Japanese is
// deliberately NOT in this list.
export const DEFAULT_LOCALE = 'en';

export const LOCALES = [
  { code: 'en', label: 'EN', name: 'English' },
  { code: 'es', label: 'ES', name: 'Español' },
  { code: 'pt', label: 'PT', name: 'Português' },
  { code: 'fr', label: 'FR', name: 'Français' },
  { code: 'de', label: 'DE', name: 'Deutsch' },
  { code: 'it', label: 'IT', name: 'Italiano' },
  { code: 'zh', label: '中文', name: '中文' },
];

/** Locale codes in order. */
export const LOCALE_CODES = LOCALES.map((l) => l.code);

/** Look a locale entry up by code. */
export function localeEntry(code) {
  return LOCALES.find((l) => l.code === code);
}
