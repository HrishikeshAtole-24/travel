/**
 * Email Service for SkyWings
 * Handles sending booking confirmations, tickets, and notifications
 */

const nodemailer = require('nodemailer');
const logger = require('../config/winstonLogger');

// Create transporter (use environment variables)
const createTransporter = () => {
  // Check for Gmail credentials first
  if (process.env.EMAIL_USER && process.env.EMAIL_PASSWORD) {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
      }
    });
  }
  
  // Fallback to SMTP settings
  if (process.env.SMTP_HOST) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }

  // Development: use ethereal email (fake SMTP)
  logger.warn('[Email] No email credentials configured. Emails will be logged only.');
  return null;
};

let transporter = null;

const getTransporter = () => {
  if (!transporter) {
    transporter = createTransporter();
  }
  return transporter;
};

/**
 * Generate SkyWings branded email template
 */
const generateEmailTemplate = (content, type = 'success') => {
  const brandColor = type === 'success' ? '#22c55e' : '#ef4444';
  const brandBg = type === 'success' ? '#f0fdf4' : '#fef2f2';
  
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SkyWings</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #f1f5f9; }
  </style>
</head>
<body style="margin: 0; padding: 0; background: #f1f5f9;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background: #f1f5f9; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); padding: 32px; text-align: center;">
              <h1 style="color: white; font-size: 28px; font-weight: 700; margin: 0;">
                ✈️ SkyWings
              </h1>
              <p style="color: rgba(255,255,255,0.8); font-size: 14px; margin-top: 8px;">
                Your Journey Begins Here
              </p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px 32px;">
              ${content}
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background: #f8fafc; padding: 24px 32px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="color: #64748b; font-size: 14px; margin-bottom: 12px;">
                Need help? Contact us at support@skywings.com
              </p>
              <p style="color: #94a3b8; font-size: 12px;">
                © 2026 SkyWings. All rights reserved.
              </p>
              <div style="margin-top: 16px;">
                <a href="#" style="color: #2563eb; text-decoration: none; margin: 0 8px; font-size: 13px;">Terms</a>
                <span style="color: #cbd5e1;">|</span>
                <a href="#" style="color: #2563eb; text-decoration: none; margin: 0 8px; font-size: 13px;">Privacy</a>
                <span style="color: #cbd5e1;">|</span>
                <a href="#" style="color: #2563eb; text-decoration: none; margin: 0 8px; font-size: 13px;">Contact</a>
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
};

/**
 * Generate booking confirmation email content
 */
const generateBookingConfirmationContent = (booking) => {
  const flightData = booking.flight_data || booking.flightData;
  const outboundSegment = flightData?.itineraries?.[0]?.segments?.[0];
  
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };
  
  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const travelers = booking.travelers || [];
  const travelersList = travelers.map(t => 
    `<li style="padding: 8px 0; border-bottom: 1px solid #f1f5f9;">
      ${t.title || ''} ${t.first_name} ${t.last_name} 
      <span style="color: #64748b; font-size: 13px;">(${t.traveler_type || 'Adult'})</span>
    </li>`
  ).join('');

  return `
    <!-- Success Badge -->
    <div style="text-align: center; margin-bottom: 32px;">
      <div style="display: inline-block; background: #f0fdf4; border: 2px solid #22c55e; border-radius: 50%; width: 80px; height: 80px; line-height: 76px; margin-bottom: 16px;">
        <span style="font-size: 40px;">✓</span>
      </div>
      <h2 style="color: #22c55e; font-size: 24px; font-weight: 700; margin-bottom: 8px;">
        Booking Confirmed!
      </h2>
      <p style="color: #64748b; font-size: 16px;">
        Thank you for choosing SkyWings
      </p>
    </div>

    <!-- Booking Reference -->
    <div style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
      <p style="color: rgba(255,255,255,0.8); font-size: 14px; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 1px;">
        Booking Reference
      </p>
      <p style="color: white; font-size: 32px; font-weight: 700; letter-spacing: 3px; margin: 0;">
        ${booking.booking_reference}
      </p>
      <p style="color: rgba(255,255,255,0.7); font-size: 12px; margin-top: 8px;">
        Please save this for check-in and support
      </p>
    </div>

    <!-- Flight Details -->
    <div style="background: #f8fafc; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
      <h3 style="color: #1e293b; font-size: 18px; margin-bottom: 20px; display: flex; align-items: center;">
        ✈️ Flight Details
      </h3>
      
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="text-align: center; padding: 16px;">
            <p style="font-size: 28px; font-weight: 700; color: #1e293b; margin: 0;">
              ${outboundSegment?.departure?.iataCode || flightData?.origin || 'DEP'}
            </p>
            <p style="color: #2563eb; font-weight: 600; margin: 8px 0 4px;">
              ${formatTime(outboundSegment?.departure?.at)}
            </p>
            <p style="color: #64748b; font-size: 13px; margin: 0;">
              ${formatDate(outboundSegment?.departure?.at)}
            </p>
          </td>
          <td style="text-align: center; padding: 16px;">
            <p style="font-size: 24px; margin: 0;">✈️</p>
            <p style="color: #64748b; font-size: 12px; margin-top: 4px;">
              ${outboundSegment?.duration?.replace('PT', '').replace('H', 'h ').replace('M', 'm') || 'Direct'}
            </p>
          </td>
          <td style="text-align: center; padding: 16px;">
            <p style="font-size: 28px; font-weight: 700; color: #1e293b; margin: 0;">
              ${outboundSegment?.arrival?.iataCode || flightData?.destination || 'ARR'}
            </p>
            <p style="color: #2563eb; font-weight: 600; margin: 8px 0 4px;">
              ${formatTime(outboundSegment?.arrival?.at)}
            </p>
            <p style="color: #64748b; font-size: 13px; margin: 0;">
              ${formatDate(outboundSegment?.arrival?.at)}
            </p>
          </td>
        </tr>
      </table>

      ${outboundSegment?.carrierCode ? `
        <div style="border-top: 1px solid #e5e7eb; margin-top: 16px; padding-top: 16px; display: flex; justify-content: space-between;">
          <span style="color: #64748b; font-size: 14px;">Flight:</span>
          <span style="color: #1e293b; font-weight: 600;">${outboundSegment.carrierCode} ${outboundSegment.number}</span>
        </div>
      ` : ''}
      
      ${booking.pnr ? `
        <div style="display: flex; justify-content: space-between; margin-top: 12px;">
          <span style="color: #64748b; font-size: 14px;">PNR:</span>
          <span style="color: #2563eb; font-weight: 700; font-family: monospace; background: #eff6ff; padding: 4px 12px; border-radius: 4px;">${booking.pnr}</span>
        </div>
      ` : ''}
    </div>

    <!-- Passengers -->
    ${travelers.length > 0 ? `
      <div style="background: #f8fafc; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
        <h3 style="color: #1e293b; font-size: 18px; margin-bottom: 16px;">
          👥 Passengers
        </h3>
        <ul style="list-style: none; padding: 0; margin: 0;">
          ${travelersList}
        </ul>
      </div>
    ` : ''}

    <!-- Total Price -->
    <div style="background: #f0fdf4; border: 1px solid #86efac; border-radius: 12px; padding: 20px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: center;">
      <span style="color: #166534; font-size: 16px; font-weight: 500;">Total Amount Paid</span>
      <span style="color: #22c55e; font-size: 24px; font-weight: 700;">
        ${booking.currency} ${parseFloat(booking.total_price).toLocaleString()}
      </span>
    </div>

    <!-- Important Info -->
    <div style="background: #eff6ff; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
      <h3 style="color: #1e293b; font-size: 16px; margin-bottom: 16px;">
        📋 Important Information
      </h3>
      <ul style="color: #475569; font-size: 14px; line-height: 1.8; padding-left: 20px; margin: 0;">
        <li>Web check-in opens <strong>48 hours</strong> before departure</li>
        <li>Carry a valid photo ID for domestic flights</li>
        <li>Carry your passport for international flights</li>
        <li>Reach the airport at least <strong>2 hours</strong> before departure</li>
      </ul>
    </div>

    <!-- CTA Buttons -->
    <div style="text-align: center;">
      <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/my-bookings" 
         style="display: inline-block; background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: white; padding: 16px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px; margin: 8px;">
        View My Bookings
      </a>
    </div>
  `;
};

/**
 * Generate payment failed email content
 */
const generatePaymentFailedContent = (booking, reason = 'Payment was declined') => {
  return `
    <!-- Failed Badge -->
    <div style="text-align: center; margin-bottom: 32px;">
      <div style="display: inline-block; background: #fef2f2; border: 2px solid #ef4444; border-radius: 50%; width: 80px; height: 80px; line-height: 76px; margin-bottom: 16px;">
        <span style="font-size: 40px;">✕</span>
      </div>
      <h2 style="color: #ef4444; font-size: 24px; font-weight: 700; margin-bottom: 8px;">
        Payment Failed
      </h2>
      <p style="color: #64748b; font-size: 16px;">
        We couldn't process your payment
      </p>
    </div>

    <!-- Error Details -->
    <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
      <p style="color: #dc2626; font-size: 14px; margin: 0;">
        <strong>Reason:</strong> ${reason}
      </p>
    </div>

    <!-- Booking Reference -->
    <div style="background: #f8fafc; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
      <p style="color: #64748b; font-size: 14px; margin-bottom: 8px;">
        Booking Reference
      </p>
      <p style="color: #1e293b; font-size: 24px; font-weight: 700; letter-spacing: 2px; margin: 0;">
        ${booking.booking_reference}
      </p>
      <p style="color: #64748b; font-size: 13px; margin-top: 12px;">
        Your booking is still reserved. Please try again.
      </p>
    </div>

    <!-- What You Can Do -->
    <div style="background: #f8fafc; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
      <h3 style="color: #1e293b; font-size: 16px; margin-bottom: 16px;">
        💡 What you can do:
      </h3>
      <ul style="color: #475569; font-size: 14px; line-height: 1.8; padding-left: 20px; margin: 0;">
        <li>Check your card details and try again</li>
        <li>Use a different payment method</li>
        <li>Ensure sufficient balance in your account</li>
        <li>Contact your bank if the issue persists</li>
      </ul>
    </div>

    <!-- CTA Buttons -->
    <div style="text-align: center;">
      <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/my-bookings" 
         style="display: inline-block; background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: white; padding: 16px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px; margin: 8px;">
        Try Payment Again
      </a>
      <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/contact" 
         style="display: inline-block; background: white; color: #2563eb; padding: 16px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px; margin: 8px; border: 2px solid #2563eb;">
        Contact Support
      </a>
    </div>
  `;
};

/**
 * Send booking confirmation email
 */
const sendBookingConfirmation = async (booking, email) => {
  try {
    const transport = getTransporter();
    
    if (!transport) {
      logger.info(`[Email] Would send confirmation to ${email} for booking ${booking.booking_reference}`);
      return { success: true, message: 'Email logged (no transport configured)' };
    }

    const content = generateBookingConfirmationContent(booking);
    const html = generateEmailTemplate(content, 'success');

    const mailOptions = {
      from: `"SkyWings" <${process.env.EMAIL_USER || process.env.SMTP_USER || 'noreply@skywings.com'}>`,
      to: email,
      subject: `✈️ Booking Confirmed - ${booking.booking_reference} | SkyWings`,
      html: html
    };

    const info = await transport.sendMail(mailOptions);
    logger.info(`[Email] Confirmation sent to ${email} for booking ${booking.booking_reference}`);
    
    return { success: true, messageId: info.messageId };
  } catch (error) {
    logger.error('[Email] Failed to send confirmation:', error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Send payment failed email
 */
const sendPaymentFailed = async (booking, email, reason) => {
  try {
    const transport = getTransporter();
    
    if (!transport) {
      logger.info(`[Email] Would send payment failed to ${email} for booking ${booking.booking_reference}`);
      return { success: true, message: 'Email logged (no transport configured)' };
    }

    const content = generatePaymentFailedContent(booking, reason);
    const html = generateEmailTemplate(content, 'failed');

    const mailOptions = {
      from: `"SkyWings" <${process.env.EMAIL_USER || process.env.SMTP_USER || 'noreply@skywings.com'}>`,
      to: email,
      subject: `⚠️ Payment Failed - ${booking.booking_reference} | SkyWings`,
      html: html
    };

    const info = await transport.sendMail(mailOptions);
    logger.info(`[Email] Payment failed email sent to ${email} for booking ${booking.booking_reference}`);
    
    return { success: true, messageId: info.messageId };
  } catch (error) {
    logger.error('[Email] Failed to send payment failed email:', error.message);
    return { success: false, error: error.message };
  }
};

module.exports = {
  sendBookingConfirmation,
  sendPaymentFailed,
  generateEmailTemplate,
  generateBookingConfirmationContent,
  generatePaymentFailedContent
};
