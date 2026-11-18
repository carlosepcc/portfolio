// i18n helpers shared by the Astro component and the CV generator.
//
// Every translatable string in src/data/cv.json is either a plain string
// (locale-independent: names, URLs, emails) or a translation map keyed by
// locale code: { "en": "...", "es": "..." }.
import { DEFAULT_LOCALE, LOCALES } from './locales.js';
import { yearsLabel } from './experience.js';

/** Localize a value: plain strings pass through, translation maps resolve. */
export function t(value, locale, fallback = DEFAULT_LOCALE) {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object') return value[locale] ?? value[fallback] ?? '';
  return String(value);
}

/** Replace the {{YEARS}} token with the computed, locale-formatted label
 *  (English "6.5 years", Spanish "6,5 años" — decimal separator localized). */
export function substituteYears(text, locale) {
  return String(text).replaceAll('{{YEARS}}', yearsLabel(locale));
}

/** Localize a value and substitute {{YEARS}} in one step. */
export function L(value, locale) {
  return substituteYears(t(value, locale), locale);
}

/** True when a node is a translation map: an object whose keys are locale
 *  codes and whose values are all strings. */
function isTranslationMap(node) {
  if (!node || typeof node !== 'object' || Array.isArray(node)) return false;
  const keys = Object.keys(node);
  return keys.includes('en') && keys.every((k) => typeof node[k] === 'string');
}

/** True when every translation map in the tree has `locale`. */
function hasLocale(node, locale) {
  if (Array.isArray(node)) return node.every((n) => hasLocale(n, locale));
  if (node && typeof node === 'object') {
    if (isTranslationMap(node)) return locale in node;
    return Object.values(node).every((v) => hasLocale(v, locale));
  }
  return true;
}

/** Locale codes that have complete translations in the data, in configured
 *  order. A locale joins this list by gaining translations — no code change. */
export function getAvailableLocales(data) {
  return LOCALES.filter(
    ({ code }) => code === DEFAULT_LOCALE || hasLocale(data, code),
  ).map((l) => l.code);
}

/** Download filename for a locale's CV: the default locale has no prefix. */
export function cvFileName(locale, ext) {
  return locale === DEFAULT_LOCALE ? `cv.${ext}` : `cv-${locale}.${ext}`;
}
