/* Admin date overrides — letting an admin record something on a day other than
 * today, and correct the day on records already saved.
 *
 * Every date this dashboard stores is a local calendar day for the cafe. None
 * of the conversions here go through `new Date().toISOString().split('T')[0]`,
 * which is UTC: at 9pm IST that returns tomorrow, so a bill rung in the evening
 * would land on the wrong day's books. The round trip is always local.
 */

/** Today as YYYY-MM-DD in the cafe's own timezone. */
export function todayYmd(d = new Date()) {
  return ymdOf(d);
}

/** Local YYYY-MM-DD of a Date / timestamp / date string. '' when absent. */
export function tsToYmd(value) {
  if (!value) return '';
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return ymdOf(d);
}

/** A timestamp for YYYY-MM-DD, keeping the clock time of `timeSource`.
 *
 * The clock time matters: bills, orders and fines are listed and numbered by
 * `created_at`, so a backdated bill has to sit at a plausible hour inside its
 * day rather than at midnight, and re-dating an existing row must not shuffle
 * it against the others already on that day.
 */
export function ymdToTs(ymd, timeSource = new Date()) {
  if (!ymd) return null;
  const [y, m, d] = ymd.split('-').map(Number);
  if (!y || !m || !d) return null;
  const t = timeSource instanceof Date ? timeSource : new Date(timeSource);
  const clock = Number.isNaN(t.getTime()) ? new Date() : t;
  return new Date(
    y, m - 1, d,
    clock.getHours(), clock.getMinutes(), clock.getSeconds(), clock.getMilliseconds()
  ).toISOString();
}

/** True when `ymd` is any day other than today. */
export function isBackdated(ymd) {
  return !!ymd && ymd !== todayYmd();
}

/** How far off today, in days — negative for the past. */
export function daysFromToday(ymd) {
  if (!ymd) return 0;
  const [y, m, d] = ymd.split('-').map(Number);
  const then = new Date(y, m - 1, d);
  const now = new Date();
  return Math.round((then - new Date(now.getFullYear(), now.getMonth(), now.getDate())) / 86400000);
}

/** "12 Jan 2026" — for confirmations and audit notes. */
export function prettyYmd(ymd) {
  if (!ymd) return '-';
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** Add days to a YYYY-MM-DD, staying on local calendar days. */
export function addDaysYmd(ymd, days) {
  if (!ymd) return '';
  const [y, m, d] = ymd.split('-').map(Number);
  return ymdOf(new Date(y, m - 1, d + Number(days || 0)));
}

function ymdOf(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
