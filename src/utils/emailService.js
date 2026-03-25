// Mailgun Configuration
const MAILGUN_DOMAIN = 'MAILGUN_DOMAIN_REMOVED';
const MAILGUN_API_KEY = 'MAILGUN_API_KEY_REMOVED';
const LIBRARY_NAME = 'Tapas Library';

export const sendEmailNotification = async (toEmail, subject, htmlContent) => {
  try {
    const formData = new FormData();
    formData.append('from', `${LIBRARY_NAME} <noreply@${MAILGUN_DOMAIN}>`);
    formData.append('to', toEmail);
    formData.append('subject', subject);
    formData.append('html', htmlContent);

    const response = await fetch(
      `https://api.mailgun.net/v3/${MAILGUN_DOMAIN}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${btoa(`api:${MAILGUN_API_KEY}`)}`
        },
        body: formData
      }
    );

    if (!response.ok) {
      throw new Error(`Email failed: ${response.statusText}`);
    }

    const data = await response.json();

    return {
      success: true,
      messageId: data.id,
      toEmail: toEmail,
      subject: subject,
      sentAt: new Date().toISOString()
    };
  } catch (error) {
    console.error('Email Error:', error);
    throw error;
  }
};

export const sendDueReminderEmail = async (memberName, memberEmail, bookTitle, dueDate) => {
  const daysUntilDue = Math.ceil((new Date(dueDate) - new Date()) / (1000 * 60 * 60 * 24));
  
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; background-color: #f5f5f5; margin: 0; padding: 20px; }
        .container { background-color: white; max-width: 600px; margin: 0 auto; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .header { background-color: #667eea; color: white; padding: 20px; border-radius: 8px; text-align: center; margin-bottom: 30px; }
        .header h1 { margin: 0; font-size: 24px; }
        .content { margin-bottom: 20px; }
        .content h2 { color: #333; font-size: 18px; margin-top: 0; }
        .book-card { background-color: #f9f9f9; padding: 15px; border-left: 4px solid #667eea; margin: 15px 0; border-radius: 4px; }
        .book-title { font-size: 16px; font-weight: bold; color: #333; margin: 0; }
        .book-detail { font-size: 14px; color: #666; margin: 5px 0; }
        .alert { background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px; }
        .alert-title { color: #856404; font-weight: bold; margin: 0 0 8px 0; }
        .button { background-color: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 4px; display: inline-block; }
        .footer { text-align: center; color: #999; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>📚 ${LIBRARY_NAME}</h1>
        </div>
        
        <div class="content">
          <h2>Hi ${memberName}! 👋</h2>
          <p>We're sending you a friendly reminder about your upcoming book due date.</p>
          
          <div class="book-card">
            <p class="book-title">${bookTitle}</p>
            <p class="book-detail">📅 Due Date: ${new Date(dueDate).toLocaleDateString('en-IN')}</p>
            <p class="book-detail">⏰ Days Left: <strong>${daysUntilDue} days</strong></p>
          </div>
          
          ${daysUntilDue <= 3 ? `
            <div class="alert">
              <p class="alert-title">⚠️ Due Soon!</p>
              <p>Your book is due soon. Please return it on time to avoid late fees.</p>
            </div>
          ` : ''}
          
          <p>If you'd like to extend your borrowing period, you can renew this book through our library system.</p>
        </div>
        
        <div style="text-align: center; margin-top: 30px;">
          <a href="https://tapas-library.vercel.app" class="button">📚 View Your Account</a>
        </div>
        
        <div class="footer">
          <p>📬 ${LIBRARY_NAME} Notification System</p>
          <p>© 2024 All rights reserved</p>
        </div>
      </div>
    </body>
    </html>
  `;
  
  return sendEmailNotification(memberEmail, `📚 Reminder: "${bookTitle}" due on ${new Date(dueDate).toLocaleDateString('en-IN')}`, htmlContent);
};

export const sendOverdueAlertEmail = async (memberName, memberEmail, bookTitle, daysOverdue) => {
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; background-color: #f5f5f5; margin: 0; padding: 20px; }
        .container { background-color: white; max-width: 600px; margin: 0 auto; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .header { background-color: #f44336; color: white; padding: 20px; border-radius: 8px; text-align: center; margin-bottom: 30px; }
        .header h1 { margin: 0; font-size: 24px; }
        .content { margin-bottom: 20px; }
        .alert { background-color: #ffebee; border-left: 4px solid #f44336; padding: 15px; margin: 20px 0; border-radius: 4px; }
        .alert-title { color: #c62828; font-weight: bold; font-size: 16px; margin: 0 0 8px 0; }
        .book-card { background-color: #fff5f5; padding: 15px; border-left: 4px solid #f44336; margin: 15px 0; border-radius: 4px; }
        .book-title { font-size: 16px; font-weight: bold; color: #333; margin: 0; }
        .book-detail { font-size: 14px; color: #666; margin: 5px 0; }
        .button { background-color: #f44336; color: white; padding: 12px 30px; text-decoration: none; border-radius: 4px; display: inline-block; }
        .footer { text-align: center; color: #999; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>⚠️ OVERDUE BOOK ALERT</h1>
        </div>
        
        <div class="content">
          <p>Hi ${memberName},</p>
          
          <div class="alert">
            <p class="alert-title">📕 This book is overdue!</p>
            <p>Please return it as soon as possible to avoid additional late fees.</p>
          </div>
          
          <div class="book-card">
            <p class="book-title">${bookTitle}</p>
            <p class="book-detail">🚨 Status: <strong>${daysOverdue} days overdue</strong></p>
            <p class="book-detail">⏰ Action Required: Immediate return needed</p>
          </div>
          
          <p>Please return the book to the library as soon as possible. Late fees may apply for overdue books.</p>
        </div>
        
        <div style="text-align: center; margin-top: 30px;">
          <a href="https://tapas-library.vercel.app" class="button">📚 View Your Account</a>
        </div>
        
        <div class="footer">
          <p>📬 ${LIBRARY_NAME} Notification System</p>
          <p>© 2024 All rights reserved</p>
        </div>
      </div>
    </body>
    </html>
  `;
  
  return sendEmailNotification(memberEmail, `⚠️ URGENT: "${bookTitle}" is ${daysOverdue} days overdue!`, htmlContent);
};

export const sendCheckoutConfirmationEmail = async (memberName, memberEmail, bookTitle, dueDate) => {
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; background-color: #f5f5f5; margin: 0; padding: 20px; }
        .container { background-color: white; max-width: 600px; margin: 0 auto; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .header { background-color: #4CAF50; color: white; padding: 20px; border-radius: 8px; text-align: center; margin-bottom: 30px; }
        .header h1 { margin: 0; font-size: 24px; }
        .success { background-color: #f1f8f5; border-left: 4px solid #4CAF50; padding: 15px; margin: 20px 0; border-radius: 4px; }
        .book-card { background-color: #f9f9f9; padding: 15px; border-left: 4px solid #4CAF50; margin: 15px 0; border-radius: 4px; }
        .book-title { font-size: 16px; font-weight: bold; color: #333; margin: 0; }
        .book-detail { font-size: 14px; color: #666; margin: 5px 0; }
        .button { background-color: #4CAF50; color: white; padding: 12px 30px; text-decoration: none; border-radius: 4px; display: inline-block; }
        .footer { text-align: center; color: #999; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>✓ Checkout Confirmed</h1>
        </div>
        
        <div class="content">
          <h2>Thank you, ${memberName}! 📚</h2>
          <p>Your book has been successfully checked out.</p>
          
          <div class="success">
            <p style="margin: 0; color: #2e7d32; font-weight: bold;">✓ Book successfully checked out</p>
          </div>
          
          <div class="book-card">
            <p class="book-title">${bookTitle}</p>
            <p class="book-detail">📅 Due Date: ${new Date(dueDate).toLocaleDateString('en-IN')}</p>
            <p class="book-detail">⏰ Please return by this date to avoid late fees</p>
          </div>
          
          <p>Enjoy your reading! 📖</p>
        </div>
        
        <div style="text-align: center; margin-top: 30px;">
          <a href="https://tapas-library.vercel.app" class="button">📚 View Your Account</a>
        </div>
        
        <div class="footer">
          <p>📬 ${LIBRARY_NAME} Notification System</p>
          <p>© 2024 All rights reserved</p>
        </div>
      </div>
    </body>
    </html>
  `;
  
  return sendEmailNotification(memberEmail, `✓ Checkout Confirmed: "${bookTitle}"`, htmlContent);
};