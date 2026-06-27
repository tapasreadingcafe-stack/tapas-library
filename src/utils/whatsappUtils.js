import { supabase } from './supabase';

/**
 * Clean phone number and format for WhatsApp (Indian numbers)
 * Strips spaces, dashes, +91 prefix, leading 0 → returns 10-digit number
 */
function cleanPhone(phone) {
  if (!phone) return '';
  let p = phone.replace(/[\s\-()]/g, '');
  if (p.startsWith('+91')) p = p.slice(3);
  if (p.startsWith('91') && p.length === 12) p = p.slice(2);
  if (p.startsWith('0')) p = p.slice(1);
  return p.length === 10 ? p : '';
}

/**
 * Generate a wa.me link that opens WhatsApp with pre-filled message
 * Works on desktop (WhatsApp Web) and mobile (WhatsApp app)
 */
export function generateWhatsAppLink(phone, message) {
  const clean = cleanPhone(phone);
  if (!clean) return null;
  return `https://wa.me/91${clean}?text=${encodeURIComponent(message)}`;
}

/**
 * Open WhatsApp link in new tab (wa.me mode)
 */
export function openWhatsApp(phone, message) {
  const link = generateWhatsAppLink(phone, message);
  if (link) window.open(link, '_blank');
  return !!link;
}

/**
 * Send WhatsApp via Business API (edge function)
 */
export async function sendWhatsAppAPI(phone, message) {
  const clean = cleanPhone(phone);
  if (!clean) return { success: false, error: 'Invalid phone number' };

  // Fetch WhatsApp API settings
  const { data: settings } = await supabase
    .from('app_settings')
    .select('key, value')
    .in('key', ['whatsapp_mode', 'whatsapp_api_key', 'whatsapp_phone_id']);

  const cfg = {};
  (settings || []).forEach(r => { cfg[r.key] = r.value; });

  if (cfg.whatsapp_mode !== 'api') {
    return { success: false, error: 'WhatsApp API mode not enabled' };
  }
  if (!cfg.whatsapp_api_key || !cfg.whatsapp_phone_id) {
    return { success: false, error: 'WhatsApp API not configured. Go to Settings.' };
  }

  try {
    const { data, error } = await supabase.functions.invoke('send-whatsapp', {
      body: {
        phone: `91${clean}`,
        message,
        whatsapp_api_key: cfg.whatsapp_api_key,
        whatsapp_phone_id: cfg.whatsapp_phone_id,
      },
    });
    if (error) return { success: false, error: error.message };
    return { success: true, data };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Smart send: uses wa.me link mode or API mode based on settings
 * Returns { success, mode } where mode is 'link' or 'api'
 */
export async function sendWhatsApp(phone, message, toast) {
  // Check mode from settings
  const { data } = await supabase
    .from('app_settings')
    .select('value')
    .eq('key', 'whatsapp_mode')
    .single();

  const mode = data?.value || 'link';

  if (mode === 'api') {
    const result = await sendWhatsAppAPI(phone, message);
    return { ...result, mode: 'api' };
  } else {
    const opened = openWhatsApp(phone, message);
    return { success: opened, mode: 'link', error: opened ? null : 'Invalid phone number' };
  }
}

// ── WhatsApp Message Templates (plain text, no HTML) ──

export function overdueWhatsAppMsg({ memberName, bookTitle, dueDate, daysOverdue, fineAmount, libraryName }) {
  return `📚 *Overdue Book Reminder*

Dear ${memberName},

Your book "${bookTitle}" was due on ${dueDate} and is now *${daysOverdue} days overdue*.${fineAmount > 0 ? `\n\n💰 Current fine: ₹${fineAmount}` : ''}

Please return it at your earliest convenience to avoid additional fines.

— ${libraryName || 'Tapas Reading Cafe'}`;
}

export function membershipExpiryWhatsAppMsg({ memberName, plan, expiryDate, libraryName }) {
  const planLabel = plan === 'individual_monthly' ? 'Monthly' : plan === 'individual_annual' ? 'Annual' : plan || 'library';
  return `*Membership Expiring Soon*
Hi *${memberName}*!
Your *${planLabel}* membership expires on *${expiryDate}*.
Renew now to keep borrowing books without interruption.
Visit us or call to renew!
— ${libraryName || 'Tapas Reading Cafe'}`;
}

export function reservationReadyWhatsAppMsg({ memberName, bookTitle, libraryName }) {
  return `📖 *Your Reserved Book is Ready!*

Dear ${memberName},

Great news! "${bookTitle}" is now available for pickup.

⏰ Please collect it within *48 hours* before it goes to the next person.

— ${libraryName || 'Tapas Reading Cafe'}`;
}

export function checkoutWhatsAppMsg({ memberName, bookTitle, copyCode, checkoutDate, membershipEnd, libraryName }) {
  return `📚 *Book Checked Out — ${libraryName || 'Tapas Reading Cafe'}*

Hi ${memberName}!

You've borrowed *"${bookTitle}"*
Copy: ${copyCode}

📅 Checkout: ${checkoutDate}
🎫 Return by: *${membershipEnd}* (when your membership ends)

Enjoy your read! 😊`;
}

export function membershipDetailsWhatsAppMsg({ memberName, memberId, plan, expiryDate, borrowLimit, discount, libraryName }) {
  const planLabel = plan === 'individual_monthly' ? 'Monthly' : plan === 'individual_annual' ? 'Annual' : plan || 'Standard';
  return `Welcome to ${libraryName || 'Tapas Reading Cafe'}!

Hi ${memberName}!

Your membership is now active.

Member ID: ${memberId || '—'}
Plan: ${planLabel}
Valid until: ${expiryDate}
Books you can borrow at a time: ${borrowLimit}
Book discount: ${discount}%

Visit us anytime to borrow books. Happy reading!
— ${libraryName || 'Tapas Reading Cafe'}`;
}

export function membershipBillWhatsAppMsg({ memberName, items, total, paymentMethod, txnRef, date, libraryName }) {
  const itemLines = items.map(i => `  • ${i.name} × ${i.qty} — ₹${i.price * i.qty}`).join('\n');
  return `🧾 *Payment Receipt — ${libraryName || 'Tapas Reading Cafe'}*

Hi ${memberName},

Date: ${date}
Receipt #: ${txnRef}

${itemLines}

💰 *Total: ₹${total}*
Payment: ${paymentMethod?.toUpperCase() || 'CASH'}

Thank you! 🙏

— ${libraryName || 'Tapas Reading Cafe'}`;
}

export function fineAlertWhatsAppMsg({ memberName, bookTitle, fineAmount, libraryName }) {
  return `💰 *Fine Applied*

Dear ${memberName},

A fine of *₹${fineAmount}* has been applied for the book "${bookTitle}".

Please visit us to clear your fine.

— ${libraryName || 'Tapas Reading Cafe'}`;
}
