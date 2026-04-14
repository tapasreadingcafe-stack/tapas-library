import { supabase } from './supabase';

// Cache settings for 5 minutes to avoid repeated DB calls
let _cache = null;
let _cacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000;

/**
 * Fetch fine settings from app_settings table.
 * Returns: { ratePerDay, gracePeriod, maxFine }
 */
export async function getFineSettings() {
  if (_cache && Date.now() - _cacheTime < CACHE_TTL) return _cache;

  const keys = ['fine_rate_per_day', 'fine_grace_period_days', 'max_fine_cap'];
  const { data } = await supabase
    .from('app_settings')
    .select('key, value')
    .in('key', keys);

  const settings = {};
  (data || []).forEach(row => { settings[row.key] = row.value; });

  _cache = {
    ratePerDay: Number(settings.fine_rate_per_day) || 10,
    gracePeriod: Number(settings.fine_grace_period_days) || 0,
    maxFine: Number(settings.max_fine_cap) || 0, // 0 = no cap
  };
  _cacheTime = Date.now();
  return _cache;
}

/**
 * Calculate days overdue from a due date.
 */
export function daysOverdue(dueDate) {
  if (!dueDate) return 0;
  const diff = Math.floor((new Date() - new Date(dueDate)) / 86400000);
  return diff > 0 ? diff : 0;
}

/**
 * Calculate fine amount with grace period and max cap.
 * @param {string} dueDate - The due date of the book
 * @param {object} settings - From getFineSettings()
 * @returns {{ daysOverdue, daysCharged, fineAmount }}
 */
export function calculateFine(dueDate, settings) {
  const { ratePerDay = 10, gracePeriod = 0, maxFine = 0 } = settings || {};
  const overdue = daysOverdue(dueDate);
  const charged = Math.max(0, overdue - gracePeriod);
  let amount = charged * ratePerDay;
  if (maxFine > 0) amount = Math.min(amount, maxFine);
  return { daysOverdue: overdue, daysCharged: charged, fineAmount: amount };
}
