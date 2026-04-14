import { supabase } from './supabase';

/**
 * Send an email notification via Supabase Edge Function.
 * Requires SMTP settings configured in app_settings.
 */
export async function sendEmail({ to, subject, html, type = 'general' }) {
  if (!to) return { success: false, error: 'No recipient email' };

  // Fetch SMTP settings
  const { data: settings } = await supabase
    .from('app_settings')
    .select('key, value')
    .in('key', ['smtp_email', 'smtp_password', 'email_notifications_enabled', 'library_name']);

  const cfg = {};
  (settings || []).forEach(r => { cfg[r.key] = r.value; });

  if (cfg.email_notifications_enabled === 'false') {
    return { success: false, error: 'Email notifications disabled' };
  }
  if (!cfg.smtp_email || !cfg.smtp_password) {
    return { success: false, error: 'SMTP not configured. Go to Settings → Email.' };
  }

  const libraryName = cfg.library_name || 'Tapas Reading Cafe';

  try {
    const { data, error } = await supabase.functions.invoke('send-notification-email', {
      body: {
        to,
        subject,
        html,
        type,
        smtp_email: cfg.smtp_email,
        smtp_password: cfg.smtp_password,
        library_name: libraryName,
      },
    });
    if (error) return { success: false, error: error.message };
    return { success: true, data };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// --- Email Templates ---

export function overdueEmailHtml({ memberName, bookTitle, dueDate, daysOverdue, fineAmount, libraryName }) {
  return `
    <div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto;padding:20px;">
      <h2 style="color:#e74c3c;">📚 Overdue Book Reminder</h2>
      <p>Dear <strong>${memberName}</strong>,</p>
      <p>Your borrowed book is overdue:</p>
      <div style="background:#fff3cd;padding:15px;border-radius:8px;margin:15px 0;">
        <p style="margin:5px 0;"><strong>Book:</strong> ${bookTitle}</p>
        <p style="margin:5px 0;"><strong>Due Date:</strong> ${dueDate}</p>
        <p style="margin:5px 0;"><strong>Days Overdue:</strong> ${daysOverdue} days</p>
        ${fineAmount > 0 ? `<p style="margin:5px 0;color:#e74c3c;"><strong>Fine:</strong> ₹${fineAmount}</p>` : ''}
      </div>
      <p>Please return the book at your earliest convenience to avoid additional fines.</p>
      <p style="color:#888;font-size:12px;margin-top:20px;">— ${libraryName || 'Tapas Reading Cafe'}</p>
    </div>
  `;
}

export function membershipExpiryEmailHtml({ memberName, plan, expiryDate, libraryName }) {
  return `
    <div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto;padding:20px;">
      <h2 style="color:#f39c12;">🔔 Membership Expiring Soon</h2>
      <p>Dear <strong>${memberName}</strong>,</p>
      <p>Your membership is expiring soon:</p>
      <div style="background:#fff3cd;padding:15px;border-radius:8px;margin:15px 0;">
        <p style="margin:5px 0;"><strong>Plan:</strong> ${plan}</p>
        <p style="margin:5px 0;"><strong>Expires:</strong> ${expiryDate}</p>
      </div>
      <p>Please visit us to renew your membership and continue enjoying our library services.</p>
      <p style="color:#888;font-size:12px;margin-top:20px;">— ${libraryName || 'Tapas Reading Cafe'}</p>
    </div>
  `;
}

export function fineAlertEmailHtml({ memberName, bookTitle, fineAmount, libraryName }) {
  return `
    <div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto;padding:20px;">
      <h2 style="color:#e74c3c;">💰 Fine Applied</h2>
      <p>Dear <strong>${memberName}</strong>,</p>
      <p>A fine has been applied to your account:</p>
      <div style="background:#f8d7da;padding:15px;border-radius:8px;margin:15px 0;">
        <p style="margin:5px 0;"><strong>Book:</strong> ${bookTitle}</p>
        <p style="margin:5px 0;"><strong>Fine Amount:</strong> ₹${fineAmount}</p>
      </div>
      <p>Please visit us to clear your fine at your convenience.</p>
      <p style="color:#888;font-size:12px;margin-top:20px;">— ${libraryName || 'Tapas Reading Cafe'}</p>
    </div>
  `;
}
