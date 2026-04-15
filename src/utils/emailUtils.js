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

export function dailyReportEmailHtml({ date, dueTodayCount, overdueCount, outstandingFines, yesterdayRevenue, expiringMembers, activeCheckouts, libraryName }) {
  return `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
      <h2 style="color:#333;">📊 Daily Report — ${date}</h2>
      <p style="color:#666;">Good morning! Here's your library summary:</p>
      <table style="width:100%;border-collapse:collapse;margin:15px 0;">
        <tr style="background:#f8f9fa;"><td style="padding:12px;border:1px solid #eee;font-weight:600;">📅 Books Due Today</td><td style="padding:12px;border:1px solid #eee;font-size:20px;font-weight:700;color:#3498db;">${dueTodayCount}</td></tr>
        <tr><td style="padding:12px;border:1px solid #eee;font-weight:600;">⚠️ Overdue Books</td><td style="padding:12px;border:1px solid #eee;font-size:20px;font-weight:700;color:${overdueCount > 0 ? '#e74c3c' : '#27ae60'};">${overdueCount}</td></tr>
        <tr style="background:#f8f9fa;"><td style="padding:12px;border:1px solid #eee;font-weight:600;">💰 Outstanding Fines</td><td style="padding:12px;border:1px solid #eee;font-size:20px;font-weight:700;color:#e74c3c;">₹${outstandingFines}</td></tr>
        <tr><td style="padding:12px;border:1px solid #eee;font-weight:600;">📖 Active Checkouts</td><td style="padding:12px;border:1px solid #eee;font-size:20px;font-weight:700;">${activeCheckouts}</td></tr>
        <tr style="background:#f8f9fa;"><td style="padding:12px;border:1px solid #eee;font-weight:600;">💵 Yesterday's Revenue</td><td style="padding:12px;border:1px solid #eee;font-size:20px;font-weight:700;color:#27ae60;">₹${yesterdayRevenue}</td></tr>
        <tr><td style="padding:12px;border:1px solid #eee;font-weight:600;">🔔 Memberships Expiring This Week</td><td style="padding:12px;border:1px solid #eee;font-size:20px;font-weight:700;color:#f39c12;">${expiringMembers}</td></tr>
      </table>
      <p style="color:#888;font-size:12px;margin-top:20px;">— ${libraryName || 'Tapas Reading Cafe'}</p>
    </div>
  `;
}

export function reservationReadyEmailHtml({ memberName, bookTitle, expiryDate, libraryName }) {
  return `
    <div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto;padding:20px;">
      <h2 style="color:#2196F3;">📖 Your Reserved Book is Ready!</h2>
      <p>Dear <strong>${memberName}</strong>,</p>
      <p>Great news! The book you reserved is now available for pickup:</p>
      <div style="background:#e3f2fd;padding:15px;border-radius:8px;margin:15px 0;">
        <p style="margin:5px 0;"><strong>Book:</strong> ${bookTitle}</p>
        <p style="margin:5px 0;"><strong>Pickup Deadline:</strong> ${expiryDate}</p>
      </div>
      <p>Please pick it up within <strong>48 hours</strong> before it becomes available to the next person in queue.</p>
      <p style="color:#888;font-size:12px;margin-top:20px;">— ${libraryName || 'Tapas Reading Cafe'}</p>
    </div>
  `;
}
