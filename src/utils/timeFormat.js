/* Display helpers for the TIME columns coming out of Postgres.
 *
 * Supabase hands back `start_time` / `end_time` as "HH:MM:SS" strings. Staff
 * read these on the floor, so everything user-facing is 12-hour with am/pm;
 * the raw 24-hour value stays untouched in the database and in the <input
 * type="time"> fields that write it.
 */

/** "17:00:00" → "5:00 PM". Returns '' for anything unparseable. */
export function formatTime12h(t) {
  if (!t) return '';
  const m = /^(\d{1,2}):(\d{2})/.exec(String(t).trim());
  if (!m) return '';
  const h24 = Number(m[1]);
  if (!Number.isInteger(h24) || h24 > 23) return '';
  const suffix = h24 < 12 ? 'AM' : 'PM';
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${m[2]} ${suffix}`;
}

/** "17:00:00", "18:00:00" → "5:00 PM – 6:00 PM" (start alone if there's no end). */
export function formatTimeRange12h(start, end) {
  const a = formatTime12h(start);
  const b = formatTime12h(end);
  if (!a) return '';
  return b ? `${a} – ${b}` : a;
}
