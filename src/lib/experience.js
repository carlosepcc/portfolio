// Years of professional experience, computed — never hardcoded.
//
// Single anchor: the first development work — university projects and the
// thesis, with VueJS and Quasar, April 2020. The page summary and the CV
// both render this value, so the number can never drift between them again.
// It is computed at build time from the build date, so every rebuild/deploy
// shows the current value.
//
// The value is whole months elapsed, truncated to one decimal: April 2020
// to November 2026 is 79 months = 6.5 years. When the count lands on a
// whole number (e.g. 7.0) the label drops the ".0".

/** First month of software development work (YYYY-MM-DD). */
export const EXPERIENCE_START = '2020-04-01';

/** Completed years of experience as a number with one decimal. */
export function yearsOfExperience(refDate = new Date()) {
  const start = new Date(`${EXPERIENCE_START}T00:00:00Z`);
  const ref = new Date(refDate);
  let months =
    (ref.getUTCFullYear() - start.getUTCFullYear()) * 12 +
    (ref.getUTCMonth() - start.getUTCMonth());
  if (ref.getUTCDate() < start.getUTCDate()) months -= 1;
  return Math.floor((months / 12) * 10) / 10;
}

/** "3.5 years", "4 years", … — the label as it appears in prose. */
export function yearsLabel(refDate = new Date()) {
  const y = yearsOfExperience(refDate);
  const n = Number.isInteger(y) ? String(y) : y.toFixed(1);
  return `${n} years`;
}
