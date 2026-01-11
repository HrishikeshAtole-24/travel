/**
 * Email Service using Nodemailer
 * Sends emails via Gmail with App Password
 */

const nodemailer = require('nodemailer');
const logger = require('../config/winstonLogger');

// Email configuration from environment variables
const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASSWORD = process.env.EMAIL_PASSWORD;
const EMAIL_FROM = process.env.EMAIL_FROM || process.env.EMAIL_USER;

// Create transporter
let transporter = null;

/**
 * Initialize email transporter
 */
function initializeTransporter() {
  if (!EMAIL_USER || !EMAIL_PASSWORD) {
    logger.warn('⚠️  Email credentials not configured. Email sending disabled.');
    logger.warn('💡 To enable emails, set EMAIL_USER and EMAIL_PASSWORD in .env');
    return null;
  }

  try {
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: EMAIL_USER,
        pass: EMAIL_PASSWORD
      }
    });

    logger.info('✅ Email service initialized with Gmail');
    return transporter;
  } catch (error) {
    logger.error('❌ Failed to initialize email service:', error.message);
    return null;
  }
}

/**
 * Send email
 */
async function sendEmail({ to, subject, html, text }) {
  // Initialize transporter if not already done
  if (!transporter) {
    transporter = initializeTransporter();
  }

  // If no transporter, log and return (fallback mode)
  if (!transporter) {
    logger.warn(`[Email] Would send to ${to}: ${subject}`);
    logger.warn('[Email] Email service not configured - check .env file');
    return { success: false, message: 'Email service not configured' };
  }

  try {
    const mailOptions = {
      from: `Travel Booking <${EMAIL_FROM}>`,
      to,
      subject,
      text,
      html
    };

    const info = await transporter.sendMail(mailOptions);
    logger.info(`✅ Email sent to ${to}: ${subject}`);
    logger.info(`📧 Message ID: ${info.messageId}`);
    
    return { success: true, messageId: info.messageId };
  } catch (error) {
    logger.error(`❌ Failed to send email to ${to}:`, error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Send OTP email
 */
async function sendOTPEmail(email, otp, expiryMinutes = 10) {
  const subject = 'Your Verification Code - Travel Booking';
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .container {
          background-color: #f9f9f9;
          border-radius: 10px;
          padding: 30px;
          border: 1px solid #ddd;
        }
        .header {
          text-align: center;
          margin-bottom: 30px;
        }
        .otp-box {
          background-color: #fff;
          border: 2px dashed #4CAF50;
          border-radius: 8px;
          padding: 20px;
          text-align: center;
          margin: 25px 0;
        }
        .otp-code {
          font-size: 32px;
          font-weight: bold;
          color: #4CAF50;
          letter-spacing: 5px;
          margin: 10px 0;
        }
        .warning {
          background-color: #fff3cd;
          border-left: 4px solid #ffc107;
          padding: 12px;
          margin: 20px 0;
        }
        .footer {
          text-align: center;
          margin-top: 30px;
          font-size: 12px;
          color: #666;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>✈️ Travel Booking</h1>
          <h2>Email Verification</h2>
        </div>
        
        <p>Hello,</p>
        <p>Thank you for registering with Travel Booking! To complete your registration, please use the verification code below:</p>
        
        <div class="otp-box">
          <p style="margin: 0; color: #666;">Your Verification Code</p>
          <div class="otp-code">${otp}</div>
          <p style="margin: 0; color: #666; font-size: 14px;">Valid for ${expiryMinutes} minutes</p>
        </div>
        
        <div class="warning">
          <strong>⚠️ Security Notice:</strong>
          <ul style="margin: 10px 0;">
            <li>Never share this code with anyone</li>
            <li>Our team will never ask for your verification code</li>
            <li>If you didn't request this code, please ignore this email</li>
          </ul>
        </div>
        
        <p>If you have any questions, feel free to contact our support team.</p>
        
        <div class="footer">
          <p>© 2025 Travel Booking. All rights reserved.</p>
          <p>This is an automated email. Please do not reply to this message.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
    Travel Booking - Email Verification
    
    Your verification code is: ${otp}
    
    This code is valid for ${expiryMinutes} minutes.
    
    Never share this code with anyone.
    
    If you didn't request this code, please ignore this email.
  `;

  return sendEmail({ to: email, subject, html, text });
}

/**
 * Send Welcome Email
 */
async function sendWelcomeEmail(email, firstName) {
  const subject = 'Welcome to Travel Booking! 🎉';
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .container {
          background-color: #f9f9f9;
          border-radius: 10px;
          padding: 30px;
          border: 1px solid #ddd;
        }
        .header {
          text-align: center;
          margin-bottom: 30px;
          color: #4CAF50;
        }
        .feature-box {
          background-color: #fff;
          padding: 15px;
          margin: 15px 0;
          border-left: 4px solid #4CAF50;
          border-radius: 4px;
        }
        .footer {
          text-align: center;
          margin-top: 30px;
          font-size: 12px;
          color: #666;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>✈️ Welcome to Travel Booking!</h1>
        </div>
        
        <p>Hi ${firstName},</p>
        
        <p>Welcome aboard! Your account has been successfully verified and you're all set to start booking your dream destinations.</p>
        
        <h3>What you can do now:</h3>
        
        <div class="feature-box">
          <strong>🔍 Search Flights</strong><br>
          Browse thousands of flights from top airlines worldwide
        </div>
        
        <div class="feature-box">
          <strong>💰 Best Prices</strong><br>
          Compare prices and find the best deals for your travel
        </div>
        
        <div class="feature-box">
          <strong>📱 Easy Booking</strong><br>
          Book your flights in just a few clicks
        </div>
        
        <div class="feature-box">
          <strong>🔒 Secure Payments</strong><br>
          Multiple payment options with secure checkout
        </div>
        
        <p>Start planning your next adventure today!</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="http://localhost:3000" style="background-color: #4CAF50; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">Start Booking</a>
        </div>
        
        <div class="footer">
          <p>© 2025 Travel Booking. All rights reserved.</p>
          <p>Need help? Contact us at support@travelbooking.com</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
    Welcome to Travel Booking!
    
    Hi ${firstName},
    
    Welcome aboard! Your account has been successfully verified.
    
    Start exploring and booking your dream destinations today!
    
    © 2025 Travel Booking. All rights reserved.
  `;

  return sendEmail({ to: email, subject, html, text });
}

module.exports = {
  initializeTransporter,
  sendEmail,
  sendOTPEmail,
  sendWelcomeEmail
};
