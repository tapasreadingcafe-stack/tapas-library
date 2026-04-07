import { supabase } from './supabase';

/**
 * Log an activity to the activity_log table.
 * @param {string} action - e.g. 'member_added', 'book_issued', 'order_placed'
 * @param {string} description - Human-readable description
 * @param {object} metadata - Optional extra data (member_id, book_id, etc.)
 */
export async function logActivity(action, description, metadata = {}) {
  try {
    await supabase.from('activity_log').insert([{
      action,
      description,
      metadata,
    }]);
  } catch (err) {
    // Silently fail — don't break the app if logging fails
    console.warn('Activity log failed:', err.message);
  }
}

// Common action types
export const ACTIONS = {
  MEMBER_ADDED: 'member_added',
  MEMBER_UPDATED: 'member_updated',
  MEMBER_DELETED: 'member_deleted',
  BOOK_ADDED: 'book_added',
  BOOK_UPDATED: 'book_updated',
  BOOK_ISSUED: 'book_issued',
  BOOK_RETURNED: 'book_returned',
  BOOK_RENEWED: 'book_renewed',
  FINE_PAID: 'fine_paid',
  FINE_WAIVED: 'fine_waived',
  ORDER_PLACED: 'cafe_order_placed',
  EVENT_CREATED: 'event_created',
  EVENT_REGISTRATION: 'event_registration',
  POS_SALE: 'pos_sale',
  SETTINGS_UPDATED: 'settings_updated',
};
