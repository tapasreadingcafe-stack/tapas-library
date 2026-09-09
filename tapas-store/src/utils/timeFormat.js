/* Event time display for the storefront.
 *
 * Supabase hands back `start_time` / `end_time` as "HH:MM:SS". Visitors read
 * these on a phone at a glance, so everything public is 12-hour. The style —
 * zero-padded hour, lowercase meridiem, "01:00 pm" — is the one the events
 * listing already set, and every other surface now follows it.
 */

/** "17:00:00" → "05:00 pm". Returns '' for anything unparseable. */
export function formatTime12h(t) {
  if (!t) return '';
  const m = /^(\d{1,2}):(\d{2})/.exec(String(t).trim());
  if (!m) return '';
  const h24 = Number(m[1]);
  if (!Number.isInteger(h24) || h24 > 23) return '';
  const meridiem = h24 < 12 ? 'am' : 'pm';
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${String(h12).padStart(2, '0')}:${m[2]} ${meridiem}`;
}

/** "17:00:00", "18:00:00" → "05:00 pm - 06:00 pm" (start alone if there's no end). */
export function formatTimeRange12h(start, end) {
  const a = formatTime12h(start);
  const b = formatTime12h(end);
  if (!a) return '';
  return b ? `${a} - ${b}` : a;
}
