import { supabase } from './supabase';

const LIBRARY_NAME = 'Tapas Library';

export const sendEmailNotification = async (toEmail, subject, htmlContent) => {
  try {
    const { data, error } = await supabase.functions.invoke('send-email', {
      body: {
        toEmail: toEmail,
        subject: subject,
        htmlContent: htmlContent,
      },
    });

    if (error) throw error;

    return {
      success: true,
      messageId: data.messageId,
      toEmail: toEmail,
      subject: subject,
      sentAt: new Date().toISOString(),
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
        .book-card { background-color: #f9f9f9; padding: 15px; border-left: 4px solid #667eea; margin: 15px 0; border-radius: 4px; }
        .book-title { font-size: 16px; font-weight: bold; color: #333; margin: 0; }
        .book-detail { font-size: 14px; color: #666; margin: 5px 0; }
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
          <div class="book-card">
            <p class="book-title">${bookTitle}</p>
            <p class="book-detail">📅 Due Date: ${new Date(dueDate).toLocaleDateString('en-IN')}</p>
            <p class="book-detail">⏰ Days Left: <strong>${daysUntilDue} days</strong></p>
          </div>
        </div>
        <div style="text-align: center; margin-top: 30px;">
          <a href="https://tapas-library.vercel.app" class="button">📚 View Your Account</a>
        </div>
        <div class="footer">
          <p>📬 ${LIBRARY_NAME} Notification System</p>
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
          <div class="book-card">
            <p class="book-title">${bookTitle}</p>
            <p class="book-detail">🚨 Status: <strong>${daysOverdue} days overdue</strong></p>
          </div>
          <p>Please return the book as soon as possible.</p>
        </div>
        <div style="text-align: center; margin-top: 30px;">
          <a href="https://tapas-library.vercel.app" class="button">📚 View Your Account</a>
        </div>
        <div class="footer">
          <p>📬 ${LIBRARY_NAME} Notification System</p>
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
          <div class="book-card">
            <p class="book-title">${bookTitle}</p>
            <p class="book-detail">📅 Due Date: ${new Date(dueDate).toLocaleDateString('en-IN')}</p>
          </div>
          <p>Enjoy your reading! 📖</p>
        </div>
        <div style="text-align: center; margin-top: 30px;">
          <a href="https://tapas-library.vercel.app" class="button">📚 View Your Account</a>
        </div>
        <div class="footer">
          <p>📬 ${LIBRARY_NAME} Notification System</p>
        </div>
      </div>
    </body>
    </html>
  `;
  
  return sendEmailNotification(memberEmail, `✓ Checkout Confirmed: "${bookTitle}"`, htmlContent);
};